import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShareInfo, StoredSession } from '../interfaces';
import { apiClient } from '../lib/apiClient';

const SESSION_KEY_PREFIX = 'share_session_';

interface VerifyAccessParams {
    token: string;
    viewer_email: string;
    otp?: string;
    skip_otp?: boolean;
}

interface RequestAccessParams {
    token: string;
    viewer_email: string;
}

export function useSharedAuth(token: string) {
    const queryClient = useQueryClient();

    // Helper to get session key
    const getSessionKey = () => `${SESSION_KEY_PREFIX}${token}`;

    // Helper to get stored session (sync)
    const getStoredSession = (): StoredSession | null => {
        if (typeof window === 'undefined') return null;
        try {
            const stored = localStorage.getItem(getSessionKey());
            if (stored) {
                const session: StoredSession = JSON.parse(stored);
                const sessionAge = Date.now() - session.verifiedAt;
                const maxAge = 24 * 60 * 60 * 1000; // 24 hours
                if (sessionAge < maxAge) {
                    return session;
                }
                localStorage.removeItem(getSessionKey());
            }
        } catch (e) {
            console.warn('Could not read session from localStorage:', e);
        }
        return null;
    };

    const saveSession = (email: string, shareType: 'file' | 'folder', folderId?: string) => {
        const session: StoredSession = {
            email,
            verifiedAt: Date.now(),
            shareType,
            folderId
        };
        try {
            localStorage.setItem(getSessionKey(), JSON.stringify(session));
        } catch (e) {
            console.warn('Could not save session to localStorage:', e);
        }
    };

    const clearSession = () => {
        try {
            localStorage.removeItem(getSessionKey());
        } catch (e) {
            console.warn('Could not clear session from localStorage:', e);
        }
    };

    // 1. Fetch Share Info
    const shareInfoQuery = useQuery({
        queryKey: ['shareInfo', token],
        queryFn: async (): Promise<ShareInfo> => {
            return apiClient.get(`/api/share/info/${token}`);
        },
        enabled: !!token,
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: false
    });

    // 2. Request Access (Send OTP)
    const requestAccessMutation = useMutation({
        mutationFn: async ({ viewer_email }: RequestAccessParams) => {
            return apiClient.post(`/api/share/request-access/${token}`, { viewer_email });
        }
    });

    // 3. Verify Access (Check OTP or Direct Access)
    const verifyAccessMutation = useMutation({
        mutationFn: async ({ viewer_email, otp, skip_otp }: VerifyAccessParams) => {
            return apiClient.post(`/api/share/verify-access/${token}`, { viewer_email, otp, skip_otp });
        },
        onSuccess: (data, variables) => {
            if (data.share_type) {
                saveSession(variables.viewer_email, data.share_type, data.folder_id);
                // We might want to invalidate queries or set query data if needed
            }
        }
    });

    return {
        shareInfo: shareInfoQuery.data,
        isLoadingShareInfo: shareInfoQuery.isLoading,
        shareInfoError: shareInfoQuery.error,
        requestAccess: requestAccessMutation.mutateAsync,
        verifyAccess: verifyAccessMutation.mutateAsync,
        isRequestingAccess: requestAccessMutation.isPending,
        isVerifyingAccess: verifyAccessMutation.isPending,
        getStoredSession,
        saveSession,
        clearSession
    };
}
