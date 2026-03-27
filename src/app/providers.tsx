'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ApiError } from '../lib/apiClient';
import { emitToast } from '../lib/toastBridge';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        // With SSR, we usually want to set some default staleTime
                        // above 0 to avoid refetching immediately on the client
                        staleTime: 60 * 1000, // 1 minute
                        gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
                        retry: 1, // Retry failed requests once
                        refetchOnWindowFocus: false, // Don't refetch on window focus for better UX
                    },
                    mutations: {
                        retry: 0, // Don't retry mutations by default
                        onError: (error) => {
                            // Show a toast for every failed mutation
                            const message =
                                error instanceof ApiError
                                    ? error.data?.detail || error.data?.error || error.message
                                    : error.message || 'An unexpected error occurred';
                            emitToast(message, 'error');
                        },
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            <ErrorBoundary>
                {children}
            </ErrorBoundary>
        </QueryClientProvider>
    );
}

