import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';

interface DownloadParams {
    docId: number | string;
    docname: string;
    apiURL: string;
}

export function useDownload() {
    const downloadMutation = useMutation({
        mutationFn: async ({ docId, docname, apiURL }: DownloadParams) => {
            const response = await apiClient.raw(`${apiURL}/download_watermarked/${docId}`);
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = docname;
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1];
                }
            }

            const blob = await response.blob();
            return { blob, filename };
        },
        onSuccess: ({ blob, filename }) => {
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename || 'download');
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        },
    });

    return {
        download: downloadMutation.mutate,
        downloadAsync: downloadMutation.mutateAsync,
        isDownloading: downloadMutation.isPending,
        downloadError: downloadMutation.error,
    };
}

