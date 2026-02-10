
import { useQuery } from '@tanstack/react-query';

interface UseDocumentContentOptions {
    responseType?: 'blob' | 'text' | 'arraybuffer';
    enabled?: boolean;
}

export function useDocumentContent(docId: string | number | undefined, options: UseDocumentContentOptions = {}) {
    const { responseType = 'blob', enabled = true } = options;

    return useQuery({
        queryKey: ['documentContent', docId, responseType],
        queryFn: async () => {
            if (!docId) throw new Error("No Doc ID");
            // Determine endpoint based on type or just use standard download
            // Using /document/{id} usually returns bytes
            const response = await fetch(`/api/document/${docId}`);
            if (!response.ok) throw new Error('Failed to fetch document content');

            if (responseType === 'blob') return response.blob();
            if (responseType === 'text') return response.text();
            if (responseType === 'arraybuffer') return response.arrayBuffer();
            return response.blob();
        },
        enabled: !!docId && enabled,
        staleTime: Infinity, // Content shouldn't change often
        gcTime: 1000 * 60 * 10, // Keep in cache for 10 mins
    });
}
