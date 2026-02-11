import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TagObject } from '../interfaces/TagObject';

interface UseTagsParams {
    lang: 'en' | 'ar';
    docId?: number; // Optional, only needed for document-specific operations
}

interface TagsResponse {
    tags: TagObject[];
}

const EMPTY_ARRAY: any[] = [];

const selectAllTags = (data: string[]) => data || EMPTY_ARRAY;
const selectDocumentTags = (data: TagsResponse) => {
    const tags = data.tags || EMPTY_ARRAY;
    return [...tags].sort((a, b) => a.text.localeCompare(b.text));
};

export function useTags({ lang, docId }: UseTagsParams) {
    const queryClient = useQueryClient();

    // 1. Fetch All Tags (for suggestions and filters)
    const allTagsQuery = useQuery({
        queryKey: ['allTags', lang],
        queryFn: async (): Promise<string[]> => {
            const response = await fetch(`/api/tags?lang=${lang}`);
            if (!response.ok) {
                throw new Error('Failed to fetch tags');
            }
            return response.json();
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        select: selectAllTags,
    });

    // 2. Fetch Document Tags (if docId is provided)
    const documentTagsQuery = useQuery({
        queryKey: ['documentTags', docId, lang],
        queryFn: async (): Promise<TagsResponse> => {
            if (!docId) return { tags: [] };
            const response = await fetch(`/api/tags/${docId}?lang=${lang}`);
            if (!response.ok) {
                throw new Error('Failed to fetch document tags');
            }
            return response.json();
        },
        enabled: !!docId,
        staleTime: 1000 * 60, // 1 minute
        select: selectDocumentTags,
    });

    // 3. Add Tag Mutation
    const addTagMutation = useMutation({
        mutationFn: async (tag: string) => {
            if (!docId) throw new Error('Document ID is required to add a tag');
            const response = await fetch(`/api/tags/${docId}?lang=${lang}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tag }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to add tag');
            }
            return response.json();
        },
        onMutate: async (tag: string) => {
            if (!docId) return;

            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['documentTags', docId] });

            // Snapshot previous value
            const previousTags = queryClient.getQueryData(['documentTags', docId, lang]);

            // Optimistically add the tag
            queryClient.setQueryData(['documentTags', docId, lang], (old: TagObject[] | undefined) => {
                if (!old) return [{ text: tag, shortlisted: false }];
                return [...old, { text: tag, shortlisted: false }].sort((a, b) => a.text.localeCompare(b.text));
            });

            return { previousTags };
        },
        onError: (err, tag, context) => {
            // Rollback on error
            if (context?.previousTags && docId) {
                queryClient.setQueryData(['documentTags', docId, lang], context.previousTags);
            }
        },
        onSettled: () => {
            // Invalidate to ensure consistency
            if (docId) {
                queryClient.invalidateQueries({ queryKey: ['documentTags', docId] });
            }
            queryClient.invalidateQueries({ queryKey: ['allTags'] });
        },
    });

    // 4. Remove Tag Mutation
    const removeTagMutation = useMutation({
        mutationFn: async (tagToRemove: string) => {
            if (!docId) throw new Error('Document ID is required to remove a tag');
            const response = await fetch(`/api/tags/${docId}/${encodeURIComponent(tagToRemove)}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete tag');
            }
            return response.json();
        },
        onMutate: async (tagToRemove: string) => {
            if (!docId) return;

            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['documentTags', docId] });

            // Snapshot previous value
            const previousTags = queryClient.getQueryData(['documentTags', docId, lang]);

            // Optimistically remove the tag
            queryClient.setQueryData(['documentTags', docId, lang], (old: TagObject[] | undefined) => {
                if (!old) return [];
                return old.filter(tag => tag.text !== tagToRemove);
            });

            return { previousTags };
        },
        onError: (err, tagToRemove, context) => {
            // Rollback on error
            if (context?.previousTags && docId) {
                queryClient.setQueryData(['documentTags', docId, lang], context.previousTags);
            }
        },
        onSettled: () => {
            if (docId) {
                queryClient.invalidateQueries({ queryKey: ['documentTags', docId] });
            }
        },
    });

    // 5. Toggle Shortlist Mutation
    const toggleShortlistMutation = useMutation({
        mutationFn: async (tagText: string) => {
            const response = await fetch(`/api/tags/shortlist`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tag: tagText }),
            });
            if (!response.ok) throw new Error('Failed to toggle shortlist');
            return response.json();
        },
        onMutate: async (tagText: string) => {
            if (!docId) return;

            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['documentTags', docId] });

            // Snapshot previous value
            const previousTags = queryClient.getQueryData(['documentTags', docId, lang]);

            // Optimistically toggle shortlist status
            queryClient.setQueryData(['documentTags', docId, lang], (old: TagObject[] | undefined) => {
                if (!old) return [];
                return old.map(tag =>
                    tag.text === tagText
                        ? { ...tag, shortlisted: tag.shortlisted ? 0 : 1 }
                        : tag
                );
            });

            return { previousTags };
        },
        onError: (err, tagText, context) => {
            // Rollback on error
            if (context?.previousTags && docId) {
                queryClient.setQueryData(['documentTags', docId, lang], context.previousTags);
            }
        },
        onSettled: () => {
            // Invalidate all related queries to reflect the shortlist status change across the app
            queryClient.invalidateQueries({ queryKey: ['documentTags'] });
        },
    });



    return {
        allTags: allTagsQuery.data || EMPTY_ARRAY,
        isLoadingAllTags: allTagsQuery.isLoading,
        documentTags: documentTagsQuery.data || EMPTY_ARRAY,
        isLoadingDocumentTags: documentTagsQuery.isLoading,
        addTag: addTagMutation.mutateAsync,
        isAddingTag: addTagMutation.isPending,
        removeTag: removeTagMutation.mutateAsync,
        isRemovingTag: removeTagMutation.isPending,
        toggleShortlist: toggleShortlistMutation.mutateAsync,
        isTogglingShortlist: toggleShortlistMutation.isPending,
    };
}
