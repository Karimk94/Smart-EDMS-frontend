
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
            // Persist to localStorage for instant restore on refresh
            localStorage.setItem('lang', newLang);
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
            const response = await fetch('/api/user/theme', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ theme }),
            });
            if (!response.ok) {
                throw new Error('Failed to update theme');
            }
            return theme;
        },
        onSuccess: (newTheme) => {
            // Persist to localStorage for instant restore on refresh
            localStorage.setItem('theme', newTheme);
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
