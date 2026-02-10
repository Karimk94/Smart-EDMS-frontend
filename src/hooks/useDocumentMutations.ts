import { useMutation, useQueryClient } from '@tanstack/react-query';

interface UpdateMetadataParams {
    doc_id: number;
    abstract?: string;
    date_taken?: string | null;
}

interface ToggleFavoriteParams {
    docId: number;
    isFavorite: boolean;
}

export function useDocumentMutations() {
    const queryClient = useQueryClient();

    const updateMetadataMutation = useMutation({
        mutationFn: async (params: UpdateMetadataParams) => {
            const response = await fetch(`/api/update_metadata`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update metadata');
            }
            return response.json();
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['documents'] });
            // Invalidate shared content as well if applicable, though less likely for editing metadata
        },
    });

    const toggleFavoriteMutation = useMutation({
        mutationFn: async ({ docId, isFavorite }: ToggleFavoriteParams) => {
            const response = await fetch(`/api/favorites/${docId}`, {
                method: isFavorite ? 'POST' : 'DELETE',
            });
            if (!response.ok) {
                throw new Error('Failed to update favorite status');
            }
            return response.json();
        },
        onMutate: async ({ docId, isFavorite }) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['documents'] });

            // Snapshot the previous value
            const previousDocuments = queryClient.getQueriesData({ queryKey: ['documents'] });

            // Optimistically update all document queries
            queryClient.setQueriesData({ queryKey: ['documents'] }, (old: any) => {
                if (!old) return old;

                // Handle different response structures
                if (old.documents && Array.isArray(old.documents)) {
                    return {
                        ...old,
                        documents: old.documents.map((doc: any) =>
                            doc.doc_id === docId ? { ...doc, is_favorite: isFavorite } : doc
                        ),
                    };
                }

                return old;
            });

            // Return context with previous data for rollback
            return { previousDocuments };
        },
        onError: (err, variables, context) => {
            // Rollback on error
            if (context?.previousDocuments) {
                context.previousDocuments.forEach(([queryKey, data]) => {
                    queryClient.setQueryData(queryKey, data);
                });
            }
        },
        onSettled: () => {
            // Always refetch after error or success to ensure consistency
            queryClient.invalidateQueries({ queryKey: ['documents'] });
        }
    });

    return {
        updateMetadata: updateMetadataMutation.mutateAsync,
        isUpdatingMetadata: updateMetadataMutation.isPending,
        toggleFavorite: toggleFavoriteMutation.mutateAsync,
        isTogglingFavorite: toggleFavoriteMutation.isPending
    };
}
