
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';

export interface EdmsUser {
    username: string;
    people_system_id: number;
    edms_user_id: number;
    user_ref_id: number;
    security_level: string;
    security_level_id: number;
    lang: string;
    theme: string;
    remaining_quota: number;
    quota: number;
}

export interface SecurityLevel {
    id: number;
    name: string;
}

export interface PersonResult {
    system_id: number;
    user_id: string;
    name: string;
}

interface UsersResponse {
    users: EdmsUser[];
    total: number;
    has_more: boolean;
}

export interface TabPermission {
    id: number;
    tab_key: string;
    can_read: boolean;
    can_write: boolean;
    disabled?: boolean;
}

interface AddUserParams {
    user_system_id: number;
    security_level_id: number;
    lang: string;
    theme: string;
}

interface UpdateUserParams {
    edms_user_id: number;
    security_level_id: number;
    lang: string;
    theme: string;
    remaining_quota: number | null;
    quota: number | null;
}

export function useAdmin() {
    const queryClient = useQueryClient();

    // Queries
    const useCheckAccess = () => useQuery({
        queryKey: ['adminAccess'],
        queryFn: async () => {
            return apiClient.get('/api/admin/check-access');
        },
        retry: false,
    });

    const useUsers = (page: number, search: string, enabled: boolean = true) => useQuery({
        queryKey: ['users', page, search],
        queryFn: async (): Promise<UsersResponse> => {
            const params = new URLSearchParams({
                search,
                page: String(page),
                limit: '20'
            });
            return apiClient.get(`/api/admin/users?${params}`);
        },
        enabled,
        placeholderData: (previousData) => previousData, // Keep previous data while fetching new page
    });

    const useSecurityLevels = (enabled: boolean = true) => useQuery({
        queryKey: ['securityLevels'],
        queryFn: async (): Promise<SecurityLevel[]> => {
            return apiClient.get('/api/admin/security-levels');
        },
        enabled,
    });

    const useSearchPeople = (query: string, enabled: boolean = false) => useQuery({
        queryKey: ['peopleSearch', query],
        queryFn: async (): Promise<PersonResult[]> => {
            if (query.length < 2) return [];
            return apiClient.get(`/api/admin/search-people?search=${encodeURIComponent(query)}`);
        },
        enabled: enabled && query.length >= 2,
    });

    // Mutations
    const addUserMutation = useMutation({
        mutationFn: async (params: AddUserParams) => {
            return apiClient.post('/api/admin/users', params);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });

    const updateUserMutation = useMutation({
        mutationFn: async (params: UpdateUserParams) => {
            const { edms_user_id, ...body } = params;
            return apiClient.put(`/api/admin/users/${edms_user_id}`, body);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });

    const deleteUserMutation = useMutation({
        mutationFn: async (userId: number) => {
            return apiClient.delete(`/api/admin/users/${userId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });

    // Tab Permissions (per-user)
    const useTabPermissions = (userId: number | null, enabled: boolean = true) => useQuery({
        queryKey: ['tabPermissions', userId],
        queryFn: async (): Promise<TabPermission[]> => {
            if (!userId) return [];
            const data = await apiClient.get(`/api/admin/tab-permissions/${userId}`);
            return data.permissions;
        },
        enabled: enabled && !!userId,
    });

    const upsertTabPermissionMutation = useMutation({
        mutationFn: async (params: { user_id: number; tab_key: string; can_read: boolean; can_write: boolean }) => {
            return apiClient.put('/api/admin/tab-permissions', params);
        },
        onMutate: async (variables) => {
            // Cancel outgoing refetches so they don't overwrite our optimistic update
            await queryClient.cancelQueries({ queryKey: ['tabPermissions', variables.user_id] });
            // Snapshot current value for rollback
            const previous = queryClient.getQueryData<TabPermission[]>(['tabPermissions', variables.user_id]);
            // Optimistically update the cache immediately
            queryClient.setQueryData<TabPermission[]>(['tabPermissions', variables.user_id], (old) => {
                if (!old) return old;
                return old.map((p) =>
                    p.tab_key === variables.tab_key
                        ? { ...p, can_read: variables.can_read, can_write: variables.can_write }
                        : p
                );
            });
            return { previous };
        },
        onError: (_err, variables, context) => {
            // Rollback to previous state on error
            if (context?.previous) {
                queryClient.setQueryData(['tabPermissions', variables.user_id], context.previous);
            }
        },
        onSettled: (_data, _error, variables) => {
            // Always refetch after mutation to ensure server consistency
            queryClient.invalidateQueries({ queryKey: ['tabPermissions', variables.user_id] });
        },
    });

    const initTabPermissionsMutation = useMutation({
        mutationFn: async (userId: number) => {
            return apiClient.post(`/api/admin/tab-permissions/init/${userId}`);
        },
    });

    return {
        useCheckAccess,
        useUsers,
        useSecurityLevels,
        useSearchPeople,
        useTabPermissions,
        addUser: addUserMutation.mutateAsync,
        isAddingUser: addUserMutation.isPending,
        updateUser: updateUserMutation.mutateAsync,
        isUpdatingUser: updateUserMutation.isPending,
        deleteUser: deleteUserMutation.mutateAsync,
        isDeletingUser: deleteUserMutation.isPending,
        upsertTabPermission: upsertTabPermissionMutation.mutateAsync,
        isUpsertingTabPermission: upsertTabPermissionMutation.isPending,
        initTabPermissions: initTabPermissionsMutation.mutateAsync,
    };
}
