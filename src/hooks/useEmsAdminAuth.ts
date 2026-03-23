import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

interface EmsAdminAccessResponse {
    has_access: boolean;
}

export function useEmsAdminAuth() {
    const router = useRouter();

    const useCheckAccess = () => useQuery({
        queryKey: ['emsAdminAccess'],
        queryFn: async () => {
            const response = await fetch("/api/admin/check-access", {
                credentials: 'include'
            });
            if (response.status === 401) {
                throw new Error("Unauthorized");
            }
            if (!response.ok) {
                throw new Error("Failed to check access");
            }
            return response.json() as Promise<EmsAdminAccessResponse>;
        },
        retry: false,
    });

    return {
        useCheckAccess,
    };
}
