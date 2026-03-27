
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { apiClient } from '../lib/apiClient';

export function useUserPreferences() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    const updateLanguageMutation = useMutation({
        mutationFn: async (lang: 'en' | 'ar') => {
            await apiClient.put('/api/user/language', { lang });
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
            await apiClient.put('/api/user/theme', { theme });
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
