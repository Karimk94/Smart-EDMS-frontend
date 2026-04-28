import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';

function parseDownloadFilename(contentDisposition: string | null, fallback: string) {
    if (!contentDisposition) {
        return fallback;
    }

    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
        try {
            return decodeURIComponent(utf8Match[1]);
        } catch {
            // Fall through to the plain filename parser.
        }
    }

    const plainMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
    if (plainMatch?.[1]) {
        return plainMatch[1];
    }

    return fallback;
}

function triggerBrowserDownload(url: string, filename?: string) {
    const link = document.createElement('a');
    link.href = url;
    if (filename) {
        link.setAttribute('download', filename);
    }
    document.body.appendChild(link);
    link.click();
    link.remove();
}

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
            let downloadUrl = `/api/share/download/${token}?viewer_email=${encodeURIComponent(viewerEmail)}`;

            // Append doc_id if available (crucial for folder shares)
            if (document?.id || document?.doc_id) {
                downloadUrl += `&doc_id=${document.id || document.doc_id}`;
            }

            // Handle video streaming
            if (document?.media_type === 'video' || document?.mime_type?.startsWith('video/')) {
                let streamUrl = `/api/share/stream/${token}?viewer_email=${encodeURIComponent(viewerEmail)}`;
                if (document?.id || document?.doc_id) {
                    streamUrl += `&doc_id=${document.id || document.doc_id}`;
                }

                return {
                    fileUrl: streamUrl,
                    fileName: document.docname || 'video.mp4',
                    fileType: 'video/mp4'
                };
            }

            // Handle regular file download
            const downloadResponse = await apiClient.raw(downloadUrl);

            const blob = await downloadResponse.blob();
            const fileUrl = URL.createObjectURL(blob);

            // Determine effective fileType
            let fileType = downloadResponse.headers.get('Content-Type') || 'application/octet-stream';
            // Only use document.mime_type if it looks like a valid mime type (contains '/')
            if (document?.mime_type && document.mime_type.includes('/')) {
                fileType = document.mime_type;
            }

            return {
                fileUrl,
                fileName: document?.docname || 'file',
                fileType,
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
                const initialResponse = await apiClient.raw(downloadUrl, {
                    method: 'GET',
                    headers: { 'Range': 'bytes=0-0' }
                });
                const contentType = initialResponse.headers.get('Content-Type') || 'application/octet-stream';

                if (contentType.startsWith('video/')) {
                    const streamUrl = `/api/share/stream/${token}?viewer_email=${encodeURIComponent(viewerEmail)}`;
                    return {
                        fileUrl: streamUrl,
                        fileName: 'video',
                        fileType: contentType
                    };
                } else {
                    const fullResponse = await apiClient.raw(downloadUrl);
                    const blob = await fullResponse.blob();
                    return {
                        fileUrl: URL.createObjectURL(blob),
                        fileName: 'document',
                        fileType: contentType,
                        blob
                    };
                }
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
    const downloadMutation = useMutation<{ url: string; filename: string }, Error, { token: string; viewerEmail: string; itemId: string; itemName: string }>({
        mutationFn: async ({ token, viewerEmail, itemId, itemName }) => {
            const downloadUrl = `/api/share/download/${token}?viewer_email=${encodeURIComponent(viewerEmail)}&doc_id=${itemId}`;
            return { url: downloadUrl, filename: itemName };
        },
        onSuccess: ({ url, filename }) => {
            triggerBrowserDownload(url, filename || 'download');
        }
    });

    return {
        downloadItem: downloadMutation.mutate,
        downloadItemAsync: downloadMutation.mutateAsync,
        isDownloading: downloadMutation.isPending,
        downloadError: downloadMutation.error
    };
}
