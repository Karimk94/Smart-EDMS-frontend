import { useMutation, useQueryClient } from '@tanstack/react-query';

interface ProcessingStatusParams {
    docnumbers: number[];
    apiURL: string;
}

interface ProcessingStatusResponse {
    processing: number[];
}

interface ClearCacheParams {
    apiURL: string;
}

interface ProcessDocumentsParams {
    docnumbers: number[];
    apiURL: string;
}

export function useProcessingStatus() {
    return useMutation<ProcessingStatusResponse, Error, ProcessingStatusParams>({
        mutationFn: async ({ docnumbers, apiURL }) => {
            const response = await fetch(`${apiURL}/processing_status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ docnumbers }),
            });
            if (!response.ok) {
                throw new Error('Failed to fetch processing status');
            }
            return response.json();
        },
    });
}

export function useClearCache() {
    const queryClient = useQueryClient();

    return useMutation<void, Error, ClearCacheParams>({
        mutationFn: async ({ apiURL }) => {
            const response = await fetch(`${apiURL}/clear_cache`, {
                method: 'POST',
            });
            if (!response.ok) {
                throw new Error(`Cache clear failed: ${response.statusText}`);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['documents'] });
        },
    });
}

export function useProcessDocuments() {
    return useMutation<void, Error, ProcessDocumentsParams>({
        mutationFn: async ({ docnumbers, apiURL }) => {
            const response = await fetch(`${apiURL}/process_uploaded_documents`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ docnumbers }),
            });
            if (!response.ok) {
                throw new Error('Failed to process documents');
            }
        },
    });
}
