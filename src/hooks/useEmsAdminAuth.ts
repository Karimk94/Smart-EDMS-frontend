import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '../lib/apiClient';

interface EmsAdminAccessResponse {
    has_access: boolean;
}

export function useEmsAdminAuth() {
    const router = useRouter();

    const useCheckAccess = () => useQuery({
        queryKey: ['emsAdminAccess'],
        queryFn: async () => {
            return apiClient.get('/api/ems-admin/check-access') as Promise<EmsAdminAccessResponse>;
        },
        retry: false,
        staleTime: 0,
        gcTime: 0,
        refetchOnMount: true,
        refetchOnWindowFocus: true,
    });

    return {
        useCheckAccess,
    };
}

