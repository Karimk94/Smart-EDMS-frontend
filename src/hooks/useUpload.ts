import { useMutation, useQueryClient } from '@tanstack/react-query';

export interface UploadParams {
    file: File;
    docname: string;
    abstract: string;
    date_taken?: string | null;
    apiURL: string;
    onProgress?: (progress: number) => void;
}

interface UploadResponse {
    success: boolean;
    docnumber?: number;
    error?: string;
}

export function useUpload() {
    const queryClient = useQueryClient();

    const uploadMutation = useMutation({
        mutationFn: async ({ file, docname, abstract, date_taken, apiURL, onProgress }: UploadParams): Promise<UploadResponse> => {
            return new Promise((resolve, reject) => {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('docname', docname);
                formData.append('abstract', abstract);

                if (date_taken) {
                    formData.append('date_taken', date_taken);
                }

                const xhr = new XMLHttpRequest();
                xhr.open('POST', `${apiURL}/upload_document`, true);

                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable && onProgress) {
                        const percentComplete = Math.round((event.loaded / event.total) * 100);
                        onProgress(percentComplete);
                    }
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const response = JSON.parse(xhr.responseText);
                            resolve(response);
                        } catch (e) {
                            reject(new Error('Failed to parse server response.'));
                        }
                    } else {
                        let errorMsg = `Server error: ${xhr.status}`;
                        try {
                            const response = JSON.parse(xhr.responseText);
                            errorMsg = response.error || errorMsg;
                        } catch (e) {
                            // Use default error message
                        }
                        reject(new Error(errorMsg));
                    }
                };

                xhr.onerror = () => {
                    reject(new Error('Network error during upload.'));
                };

                xhr.send(formData);
            });
        },
        onSuccess: () => {
            // Invalidate relevant queries after successful upload
            queryClient.invalidateQueries({ queryKey: ['folders'] });
            queryClient.invalidateQueries({ queryKey: ['documents'] });
            queryClient.invalidateQueries({ queryKey: ['quota'] });
        },
    });

    return {
        upload: uploadMutation.mutate,
        uploadAsync: uploadMutation.mutateAsync,
        isUploading: uploadMutation.isPending,
        uploadError: uploadMutation.error,
        reset: uploadMutation.reset,
    };
}
