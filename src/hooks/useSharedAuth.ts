import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShareInfo, StoredSession } from '../interfaces';

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
            const response = await fetch(`/api/share/info/${token}`);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || 'This link is invalid or has expired.');
            }
            return response.json();
        },
        enabled: !!token,
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: false
    });

    // 2. Request Access (Send OTP)
    const requestAccessMutation = useMutation({
        mutationFn: async ({ viewer_email }: RequestAccessParams) => {
            const response = await fetch(`/api/share/request-access/${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ viewer_email })
            });

            if (!response.ok) {
                const text = await response.text();
                try {
                    const err = JSON.parse(text);
                    throw new Error(err.detail || err.error || 'Failed to request access');
                } catch {
                    throw new Error(text || 'Failed to request access');
                }
            }
            return response.json();
        }
    });

    // 3. Verify Access (Check OTP or Direct Access)
    const verifyAccessMutation = useMutation({
        mutationFn: async ({ viewer_email, otp, skip_otp }: VerifyAccessParams) => {
            const response = await fetch(`/api/share/verify-access/${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ viewer_email, otp, skip_otp })
            });

            if (!response.ok) {
                const text = await response.text();
                try {
                    const err = JSON.parse(text);
                    throw new Error(err.detail || err.error || 'Verification failed');
                } catch {
                    throw new Error(text || 'Verification failed');
                }
            }
            return response.json();
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
