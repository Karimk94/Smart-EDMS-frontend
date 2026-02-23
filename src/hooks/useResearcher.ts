import { useQuery, keepPreviousData } from '@tanstack/react-query';
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

interface SearchTypesResponse {
    types: SearchType[];
}

interface ResearcherSearchResponse {
    documents: Document[];
    page: number;
    total_pages: number;
    total_documents: number;
}

interface UseResearcherSearchParams {
    formName: string;
    fieldName: string;
    keyword: string;
    searchForm: string;
    searchField: string;
    displayField: string;
    dateFrom: Date | undefined;
    dateTo: Date | undefined;
    page: number;
    enabled?: boolean;
    matchType?: string;
}

const formatToApiDate = (date: Date | undefined): string => {
    if (!date) return '';
    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export function useSearchTypes() {
    return useQuery({
        queryKey: ['researcher', 'types'],
        queryFn: async (): Promise<SearchType[]> => {
            const response = await fetch('/api/researcher/types');
            if (!response.ok) {
                throw new Error('Failed to fetch search types');
            }
            const data = await response.json();
            return data.types || [];
        },
        staleTime: 1000 * 60 * 60, // 1 hour
    });
}

export function useResearcherSearch({
    formName,
    fieldName,
    keyword,
    searchForm,
    searchField,
    displayField,
    dateFrom,
    dateTo,
    page,
    enabled = false,
    matchType = 'like'
}: UseResearcherSearchParams) {
    return useQuery({
        queryKey: [
            'researcher',
            'search',
            formName,
            fieldName,
            keyword,
            searchForm,
            searchField,
            displayField,
            formatToApiDate(dateFrom),
            formatToApiDate(dateTo),
            page,
            matchType
        ],
        queryFn: async (): Promise<ResearcherSearchResponse> => {
            const params = new URLSearchParams();
            params.append('form_name', formName);
            params.append('field_name', fieldName);
            if (keyword) params.append('keyword', keyword);
            if (searchForm) params.append('search_form', searchForm);
            if (searchField) params.append('search_field', searchField);
            if (displayField) params.append('display_field', displayField);
            if (matchType) params.append('match_type', matchType);

            const formattedDateFrom = formatToApiDate(dateFrom);
            if (formattedDateFrom) params.append('date_from', formattedDateFrom);

            const formattedDateTo = formatToApiDate(dateTo);
            if (formattedDateTo) params.append('date_to', formattedDateTo);

            params.append('page', String(page));
            params.append('pageSize', '20');

            const response = await fetch(`/api/researcher/search?${params.toString()}`);
            if (!response.ok) {
                throw new Error('Search failed');
            }
            return await response.json();
        },
        enabled: enabled && !!formName && !!fieldName, // Only run if form/field selected
        placeholderData: keepPreviousData,
    });
}
