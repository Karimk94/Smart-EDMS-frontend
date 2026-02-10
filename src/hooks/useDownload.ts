import { useMutation } from '@tanstack/react-query';

interface DownloadParams {
    docId: number | string;
    docname: string;
    apiURL: string;
}

export function useDownload() {
    const downloadMutation = useMutation({
        mutationFn: async ({ docId, docname, apiURL }: DownloadParams) => {
            const response = await fetch(`${apiURL}/download_watermarked/${docId}`);
            if (!response.ok) {
                throw new Error('Download failed');
            }
            const blob = await response.blob();
            return { blob, docname };
        },
        onSuccess: ({ blob, docname }) => {
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', docname || 'download');
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
