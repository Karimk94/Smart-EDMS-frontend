import { useQuery, keepPreviousData } from '@tanstack/react-query';

export interface FolderItem {
    id: string;
    system_id: string
    name: string;
    type: 'folder' | 'item' | 'file';
    node_type?: string;
    media_type?: 'image' | 'video' | 'pdf' | 'text' | 'file' | 'folder' | 'excel' | 'powerpoint' | 'word';
    is_standard?: boolean;
    count?: number;
    thumbnail_url?: string;
}

interface FoldersResponse {
    contents: FolderItem[];
    breadcrumbs?: { id: string | null; name: string }[];
}

interface UseFolderContentsParams {
    parentId: string | null;
    searchTerm: string;
    apiURL: string; // Passed from component to keep flexibility or could be hardcoded
    isEnabled?: boolean;
}

export function useFolderContents({
    parentId,
    searchTerm,
    apiURL = '/api',
    isEnabled = true
}: UseFolderContentsParams) {
    return useQuery({
        queryKey: ['folders', parentId, searchTerm],
        queryFn: async (): Promise<FoldersResponse> => {
            const params = new URLSearchParams();
            if (parentId) params.append('parent_id', parentId);

            params.append('scope', 'folders');

            if (parentId === 'images') params.append('media_type', 'image');
            else if (parentId === 'videos') params.append('media_type', 'video');
            else if (parentId === 'files') params.append('media_type', 'pdf');

            if (searchTerm) params.append('search', searchTerm);

            const response = await fetch(`${apiURL}/folders?${params.toString()}`);

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Folder not found');
                }
                throw new Error('Failed to fetch folder contents');
            }

            return response.json();
        },
        enabled: isEnabled,
        // placeholderData: keepPreviousData, // Removed to show loading state
        staleTime: 1000 * 60, // 1 minute
    });
}
