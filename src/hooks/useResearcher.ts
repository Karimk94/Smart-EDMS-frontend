import { useQuery, useMutation, keepPreviousData } from '@tanstack/react-query';
import { Document } from '../models/Document';

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

interface ResearcherSearchResponse {
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

export function useSearchScopes() {
    return useQuery({
        queryKey: ['researcher', 'scopes'],
        queryFn: async (): Promise<SearchScope[]> => {
            const response = await fetch('/api/researcher/scopes');
            if (!response.ok) {
                throw new Error('Failed to fetch search scopes');
            }
            const data = await response.json();
            return data.scopes || [];
        },
        staleTime: 1000 * 60 * 60, // 1 hour
    });
}

export function useSearchTypes(scope?: string) {
    return useQuery({
        queryKey: ['researcher', 'types', scope || 'all'],
        queryFn: async (): Promise<SearchType[]> => {
            const url = scope
                ? `/api/researcher/types?scope=${encodeURIComponent(scope)}`
                : '/api/researcher/types';
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Failed to fetch search types');
            }
            const data = await response.json();
            return data.types || [];
        },
        staleTime: 1000 * 60 * 60,
    });
}

export function useResearcherMultiSearch(params: MultiSearchParams & { enabled?: boolean }) {
    const { scope, criteria, dateFrom, dateTo, page, enabled = false } = params;

    // Build a stable query key from criteria
    const criteriaKey = criteria.map(c => ({
        field: c.type?.value.field_name || '',
        keyword: c.keyword,
        match: c.matchType,
    }));

    return useQuery({
        queryKey: [
            'researcher', 'multi-search',
            scope, JSON.stringify(criteriaKey),
            formatToApiDate(dateFrom), formatToApiDate(dateTo),
            page
        ],
        queryFn: async (): Promise<ResearcherSearchResponse> => {
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

            const response = await fetch('/api/researcher/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                throw new Error('Search failed');
            }
            return await response.json();
        },
        enabled: enabled && criteria.some(c => c.type !== null),
        placeholderData: keepPreviousData,
    });
}
