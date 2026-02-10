import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { FolderItem, BreadcrumbItem } from '../interfaces';

interface UseSharedContentParams {
    token: string;
    folderId: string | null;
    viewerEmail: string | null;
    isEnabled: boolean;
    rootFolderId?: string | null;
}

interface SharedFolderResponse {
    contents: FolderItem[];
    folder_name: string;
    breadcrumbs: BreadcrumbItem[];
    folder_id: string;
    root_folder_id: string;
}

export function useSharedContent({
    token,
    folderId,
    viewerEmail,
    isEnabled,
    rootFolderId
}: UseSharedContentParams) {
    return useQuery({
        queryKey: ['sharedContent', token, folderId],
        queryFn: async (): Promise<SharedFolderResponse> => {
            if (!viewerEmail) throw new Error('Viewer email required');

            const params = new URLSearchParams({
                viewer_email: viewerEmail
            });

            if (folderId && folderId !== rootFolderId) {
                params.append('parent_id', folderId);
            }

            const response = await fetch(`/api/share/folder-contents/${token}?${params.toString()}`);

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || 'Failed to load folder contents');
            }

            return response.json();
        },
        enabled: isEnabled && !!viewerEmail,
        placeholderData: keepPreviousData,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}
