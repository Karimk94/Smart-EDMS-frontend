import { useMutation, useQueryClient } from '@tanstack/react-query';

interface CreateFolderParams {
    name: string;
    parent_id: string | null;
    description?: string;
    apiURL?: string;
}

interface RenameFolderParams {
    id: string;
    name: string;
    system_id: string;
    apiURL?: string;
}

interface DeleteFolderParams {
    id: string;
    force?: boolean;
    apiURL?: string;
}

export function useCreateFolder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ name, parent_id, description, apiURL = '/api' }: CreateFolderParams) => {
            const response = await fetch(`${apiURL}/folders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, parent_id, description })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || err.error || 'Failed to create folder');
            }

            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['folders'] });
        }
    });
}

export function useRenameFolder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, name, system_id, apiURL = '/api' }: RenameFolderParams) => {
            const response = await fetch(`${apiURL}/folders/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, system_id })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || err.error || 'Failed to rename folder');
            }

            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['folders'] });
            queryClient.invalidateQueries({ queryKey: ['documents'] });
        }
    });
}

export function useDeleteFolder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, force = false, apiURL = '/api' }: DeleteFolderParams) => {
            const response = await fetch(`${apiURL}/folders/${id}${force ? '?force=true' : ''}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                // Return error object to handle 409 specifically in component
                try {
                    const text = await response.text();
                    let err;
                    try {
                        err = JSON.parse(text);
                    } catch {
                        err = { detail: text };
                    }
                    // Attach status to error object for component handling
                    const errorObj: any = new Error(err.detail || err.error || response.statusText);
                    errorObj.status = response.status;
                    errorObj.data = err;
                    throw errorObj;
                } catch (e) {
                    throw new Error('Failed to delete folder');
                }
            }

            return true;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['folders'] });
            queryClient.invalidateQueries({ queryKey: ['documents'] });
        }
    });
}
