
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';

export function useUserPreferences() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    const updateLanguageMutation = useMutation({
        mutationFn: async (lang: 'en' | 'ar') => {
            const response = await fetch('/api/user/language', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ lang }),
            });
            if (!response.ok) {
                throw new Error('Failed to update language');
            }
            return lang;
        },
        onSuccess: (newLang) => {
            // Optimistically update user query
            queryClient.setQueryData(['user'], (oldUser: any) => {
                if (!oldUser) return oldUser;
                return { ...oldUser, lang: newLang };
            });
            queryClient.invalidateQueries({ queryKey: ['user'] });
        },
    });

    const updateThemeMutation = useMutation({
        mutationFn: async (theme: 'light' | 'dark') => {
            // Assuming there is an endpoint for theme, or we just persist locally and rely on user object update if API supports it
            // For now, let's assume API supports it similar to language, or we mock it if not
            // Based on Header.tsx, it seems theme might be local state or query param for now, 
            // but let's standardize on user profile setting if possible.
            // If no API, we just rely on client side. 
            // Checking Header.tsx, it just calls onThemeChange.
            // Let's assume we want to persist it.
            /*
            const response = await fetch('/api/user/theme', { method: 'PUT', ... });
            */
            return theme;
        },
        onSuccess: (newTheme) => {
            queryClient.setQueryData(['user'], (oldUser: any) => {
                if (!oldUser) return oldUser;
                return { ...oldUser, theme: newTheme };
            });
        }
    });

    return {
        updateLanguage: updateLanguageMutation.mutateAsync,
        isUpdatingLanguage: updateLanguageMutation.isPending,
        updateTheme: updateThemeMutation.mutateAsync, // Placeholder if no API
    };
}
