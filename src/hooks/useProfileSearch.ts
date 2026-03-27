import { useQuery, useMutation, keepPreviousData } from '@tanstack/react-query';
import { Document } from '../models/Document';
import { apiClient } from '../lib/apiClient';

export interface SearchType {
    label: string;
    value: {
        field_name: string;
        form: string;
        search_field: string;
        type_name_en: string;
        system_id: number;
        search_form: string;
        display_field: string;
        exact: string;
    };
}

export interface SearchScope {
    label: string;
    value: string;
}

export interface SearchCriterion {
    type: SearchType | null;
    keyword: string;
    matchType: 'like' | 'exact' | 'startsWith';
}

interface ProfileSearchResponse {
    documents: Document[];
    page: number;
    total_pages: number;
    total_documents: number;
}

interface MultiSearchParams {
    scope: string;
    criteria: SearchCriterion[];
    dateFrom: Date | undefined;
    dateTo: Date | undefined;
    page: number;
}

const formatToApiDate = (date: Date | undefined): string => {
    if (!date) return '';
    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export function useProfileSearchScopes() {
    return useQuery({
        queryKey: ['profilesearch', 'scopes'],
        queryFn: async (): Promise<SearchScope[]> => {
            const data = await apiClient.get('/api/profilesearch/scopes');
            return data.scopes || [];
        },
        staleTime: 1000 * 60 * 60, // 1 hour
    });
}

export function useProfileSearchTypes(scope?: string) {
    return useQuery({
        queryKey: ['profilesearch', 'types', scope || 'all'],
        queryFn: async (): Promise<SearchType[]> => {
            const url = scope
                ? `/api/profilesearch/types?scope=${encodeURIComponent(scope)}`
                : '/api/profilesearch/types';
            const data = await apiClient.get(url);
            return data.types || [];
        },
        staleTime: 1000 * 60 * 60,
    });
}

export function useProfileMultiSearch(params: MultiSearchParams & { enabled?: boolean }) {
    const { scope, criteria, dateFrom, dateTo, page, enabled = false } = params;

    // Build a stable query key from criteria
    const criteriaKey = criteria.map(c => ({
        field: c.type?.value.field_name || '',
        keyword: c.keyword,
        match: c.matchType,
    }));

    return useQuery({
        queryKey: [
            'profilesearch', 'multi-search',
            scope, JSON.stringify(criteriaKey),
            formatToApiDate(dateFrom), formatToApiDate(dateTo),
            page
        ],
        queryFn: async (): Promise<ProfileSearchResponse> => {
            const body = {
                scope,
                criteria: criteria
                    .filter(c => c.type)
                    .map(c => ({
                        field_name: c.type!.value.field_name,
                        keyword: c.keyword,
                        match_type: c.matchType,
                        search_form: c.type!.value.search_form,
                        search_field: c.type!.value.search_field,
                        display_field: c.type!.value.display_field,
                    })),
                date_from: formatToApiDate(dateFrom) || null,
                date_to: formatToApiDate(dateTo) || null,
                page,
                page_size: 20,
            };

            return apiClient.post('/api/profilesearch/search', body);
        },
        enabled: enabled && criteria.some(c => c.type !== null),
        placeholderData: keepPreviousData,
    });
}
