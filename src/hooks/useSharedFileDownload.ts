import { useMutation } from '@tanstack/react-query';

interface SharedFileDownloadParams {
    token: string;
    viewerEmail: string;
    document?: any;
}

interface SharedFileResult {
    fileUrl: string;
    fileName: string;
    fileType: string;
    blob?: Blob;
}

export function useSharedFileDownload() {
    const downloadMutation = useMutation<SharedFileResult, Error, SharedFileDownloadParams>({
        mutationFn: async ({ token, viewerEmail, document }) => {
            const downloadUrl = `/api/share/download/${token}?viewer_email=${encodeURIComponent(viewerEmail)}`;

            // Handle video streaming
            if (document?.media_type === 'video' || document?.mime_type?.startsWith('video/')) {
                const streamUrl = `/api/share/stream/${token}?viewer_email=${encodeURIComponent(viewerEmail)}`;
                return {
                    fileUrl: streamUrl,
                    fileName: document.docname || 'video.mp4',
                    fileType: 'video/mp4'
                };
            }

            // Handle regular file download
            const downloadResponse = await fetch(downloadUrl);
            if (!downloadResponse.ok) {
                throw new Error('Download failed');
            }

            const blob = await downloadResponse.blob();
            const fileUrl = URL.createObjectURL(blob);

            return {
                fileUrl,
                fileName: document?.docname || 'file',
                fileType: document?.mime_type || downloadResponse.headers.get('Content-Type') || 'application/octet-stream',
                blob
            };
        }
    });

    return {
        downloadFile: downloadMutation.mutate,
        downloadFileAsync: downloadMutation.mutateAsync,
        isDownloading: downloadMutation.isPending,
        downloadError: downloadMutation.error,
        downloadData: downloadMutation.data
    };
}

// Hook for restoring file session
export function useSharedFileRestore() {
    const restoreMutation = useMutation<SharedFileResult, Error, { token: string; viewerEmail: string }>({
        mutationFn: async ({ token, viewerEmail }) => {
            const downloadUrl = `/api/share/download/${token}?viewer_email=${encodeURIComponent(viewerEmail)}`;

            try {
                const initialResponse = await fetch(downloadUrl, {
                    method: 'GET',
                    headers: { 'Range': 'bytes=0-0' }
                });

                if (initialResponse.ok || initialResponse.status === 206) {
                    const contentType = initialResponse.headers.get('Content-Type') || 'application/octet-stream';

                    if (contentType.startsWith('video/')) {
                        const streamUrl = `/api/share/stream/${token}?viewer_email=${encodeURIComponent(viewerEmail)}`;
                        return {
                            fileUrl: streamUrl,
                            fileName: 'video',
                            fileType: contentType
                        };
                    } else {
                        const blob = await (await fetch(downloadUrl)).blob();
                        return {
                            fileUrl: URL.createObjectURL(blob),
                            fileName: 'document',
                            fileType: contentType,
                            blob
                        };
                    }
                }

                throw new Error('Failed to restore file session');
            } catch (error) {
                console.error("Restore file session failed", error);
                throw error;
            }
        }
    });

    return {
        restoreFile: restoreMutation.mutate,
        restoreFileAsync: restoreMutation.mutateAsync,
        isRestoring: restoreMutation.isPending,
        restoreError: restoreMutation.error,
        restoreData: restoreMutation.data
    };
}

// Hook for downloading folder items
export function useSharedFolderItemDownload() {
    const downloadMutation = useMutation<Blob, Error, { token: string; viewerEmail: string; itemId: string; itemName: string }>({
        mutationFn: async ({ token, viewerEmail, itemId }) => {
            const downloadUrl = `/api/share/download/${token}/${itemId}?viewer_email=${encodeURIComponent(viewerEmail)}`;
            const downloadResponse = await fetch(downloadUrl);

            if (!downloadResponse.ok) {
                throw new Error('Download failed');
            }

            return downloadResponse.blob();
        },
        onSuccess: (blob, variables) => {
            // Trigger browser download
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', variables.itemName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        }
    });

    return {
        downloadItem: downloadMutation.mutate,
        downloadItemAsync: downloadMutation.mutateAsync,
        isDownloading: downloadMutation.isPending,
        downloadError: downloadMutation.error
    };
}
