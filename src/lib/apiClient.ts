/**
 * Centralized API client with:
 * - Auto 401 → redirect to /login
 * - Consistent error extraction from API responses
 * - Default credentials: 'include'
 */

export class ApiError extends Error {
    status: number;
    data: any;

    constructor(message: string, status: number, data?: any) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}

async function handleResponse(response: Response): Promise<any> {
    if (response.status === 401) {
        // Auto-redirect to login on 401
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/shared')) {
            window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        }
        throw new ApiError('Unauthorized', 401);
    }

    if (!response.ok) {
        let data: any = {};
        try {
            data = await response.json();
        } catch {
            // Response body is not JSON
        }
        const message = data?.detail || data?.error || data?.message || `Request failed (${response.status})`;
        throw new ApiError(message, response.status, data);
    }

    // Handle empty responses (204 No Content, etc.)
    const contentType = response.headers.get('content-type');
    if (response.status === 204 || !contentType?.includes('application/json')) {
        return response;
    }

    return response.json();
}

export const apiClient = {
    async get(url: string, options?: RequestInit): Promise<any> {
        const response = await fetch(url, {
            ...options,
            method: 'GET',
            credentials: 'include',
        });
        return handleResponse(response);
    },

    async post(url: string, body?: any, options?: RequestInit): Promise<any> {
        const isFormData = body instanceof FormData;
        const response = await fetch(url, {
            ...options,
            method: 'POST',
            credentials: 'include',
            headers: isFormData
                ? { ...(options?.headers || {}) }
                : { 'Content-Type': 'application/json', ...(options?.headers || {}) },
            body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
        });
        return handleResponse(response);
    },

    async put(url: string, body?: any, options?: RequestInit): Promise<any> {
        const response = await fetch(url, {
            ...options,
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
            body: body ? JSON.stringify(body) : undefined,
        });
        return handleResponse(response);
    },

    async delete(url: string, options?: RequestInit): Promise<any> {
        const response = await fetch(url, {
            ...options,
            method: 'DELETE',
            credentials: 'include',
        });
        return handleResponse(response);
    },

    /**
     * Raw fetch with credentials — for blob/stream downloads where
     * we don't want JSON parsing. Still does 401 redirect.
     */
    async raw(url: string, options?: RequestInit): Promise<Response> {
        const response = await fetch(url, {
            ...options,
            credentials: 'include',
        });
        if (response.status === 401) {
            if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
                window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
            }
            throw new ApiError('Unauthorized', 401);
        }
        if (!response.ok) {
            throw new ApiError(`Request failed (${response.status})`, response.status);
        }
        return response;
    },
};
