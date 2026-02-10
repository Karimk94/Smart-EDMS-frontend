
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

interface User {
    username: string;
    security_level: string;
    lang: 'en' | 'ar';
    theme: 'light' | 'dark';
    quota: number;
    remaining_quota: number;
}

interface LoginCredentials {
    username: string;
    password: string;
}

interface AuthResponse {
    user?: User;
    detail?: string;
    error?: string;
}

export function useAuth() {
    const queryClient = useQueryClient();
    const router = useRouter();

    const userQuery = useQuery({
        queryKey: ['user'],
        queryFn: async () => {
            const response = await fetch('/api/auth/user');
            if (!response.ok) {
                throw new Error('Not authenticated');
            }
            const data = await response.json();
            return data.user as User;
        },
        retry: false, // Don't retry if 401
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const loginMutation = useMutation({
        mutationFn: async (credentials: LoginCredentials) => {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(credentials),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || data.error || 'Login failed');
            }
            return response.json();
        },
        onSuccess: (data) => {
            queryClient.setQueryData(['user'], data.user); // Optimistically update user
            queryClient.invalidateQueries({ queryKey: ['user'] });
        },
    });

    const logoutMutation = useMutation({
        mutationFn: async () => {
            // Assuming there is a logout endpoint, otherwise just clear client state
            // If no endpoint, we just clear the query cache
            // But usually cookies need to be cleared via server
            try {
                await fetch('/api/auth/logout', { method: 'POST' });
            } catch (e) {
                console.error("Logout failed", e);
            }
        },
        onSuccess: () => {
            queryClient.setQueryData(['user'], null);
            queryClient.clear(); // Clear all data
            router.push('/login');
        },
    });

    return {
        user: userQuery.data,
        isLoadingUser: userQuery.isLoading,
        isAuthenticated: userQuery.isSuccess && !!userQuery.data,
        login: loginMutation.mutateAsync,
        isLoggingIn: loginMutation.isPending,
        logout: logoutMutation.mutateAsync,
        isLoggingOut: logoutMutation.isPending,
    };
}
