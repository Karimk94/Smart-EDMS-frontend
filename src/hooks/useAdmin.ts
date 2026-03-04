
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
            const response = await fetch("/api/admin/check-access");
            if (response.status === 401) {
                throw new Error("Unauthorized");
            }
            if (!response.ok) {
                throw new Error("Failed to check access");
            }
            return response.json();
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
            const response = await fetch(`/api/admin/users?${params}`);
            if (!response.ok) {
                throw new Error("Failed to load users");
            }
            return response.json();
        },
        enabled,
        placeholderData: (previousData) => previousData, // Keep previous data while fetching new page
    });

    const useSecurityLevels = (enabled: boolean = true) => useQuery({
        queryKey: ['securityLevels'],
        queryFn: async (): Promise<SecurityLevel[]> => {
            const response = await fetch("/api/admin/security-levels");
            if (!response.ok) {
                throw new Error("Failed to load security levels");
            }
            return response.json();
        },
        enabled,
    });

    const useSearchPeople = (query: string, enabled: boolean = false) => useQuery({
        queryKey: ['peopleSearch', query],
        queryFn: async (): Promise<PersonResult[]> => {
            if (query.length < 2) return [];
            const response = await fetch(`/api/admin/search-people?search=${encodeURIComponent(query)}`);
            if (!response.ok) {
                throw new Error("Search failed");
            }
            return response.json();
        },
        enabled: enabled && query.length >= 2,
    });

    // Mutations
    const addUserMutation = useMutation({
        mutationFn: async (params: AddUserParams) => {
            const response = await fetch("/api/admin/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(params),
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || "Failed to add user");
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });

    const updateUserMutation = useMutation({
        mutationFn: async (params: UpdateUserParams) => {
            const { edms_user_id, ...body } = params;
            const response = await fetch(`/api/admin/users/${edms_user_id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || "Failed to update user");
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });

    const deleteUserMutation = useMutation({
        mutationFn: async (userId: number) => {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: "DELETE",
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || "Failed to delete user");
            }
            return response.json();
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
            const response = await fetch(`/api/admin/tab-permissions/${userId}`);
            if (!response.ok) {
                throw new Error("Failed to load tab permissions");
            }
            const data = await response.json();
            return data.permissions;
        },
        enabled: enabled && !!userId,
    });

    const upsertTabPermissionMutation = useMutation({
        mutationFn: async (params: { user_id: number; tab_key: string; can_read: boolean; can_write: boolean }) => {
            const response = await fetch("/api/admin/tab-permissions", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(params),
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || "Failed to update tab permission");
            }
            return response.json();
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
            const response = await fetch(`/api/admin/tab-permissions/init/${userId}`, {
                method: "POST",
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || "Failed to init tab permissions");
            }
            return response.json();
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
