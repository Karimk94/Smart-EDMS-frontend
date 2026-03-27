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
            return apiClient.get('/api/admin/check-access') as Promise<EmsAdminAccessResponse>;
        },
        retry: false,
    });

    return {
        useCheckAccess,
    };
}

