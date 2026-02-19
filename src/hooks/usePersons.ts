
import { useQuery } from '@tanstack/react-query';

export interface Person {
    id: string; // or number, based on usage it seems to be string in Option but might be number from API
    name_english: string;
    name_arabic?: string;
    user_id?: string;
}

export interface Group {
    group_id: string;
    group_name: string;
}

export interface PersonOption {
    value: string;
    label: string;
    type?: 'person' | 'group';
    fullData?: any;
    isFixed?: boolean;
}

interface PersonsResponse {
    options: any[]; // The raw person objects from API
    hasMore: boolean;
}

interface GroupsResponse {
    // groups endpoint returns an array directly based on PersonSelector
    [key: string]: any;
}

// Fetchers
export const fetchPersons = async (page: number, search: string, lang: string): Promise<PersonsResponse> => {
    const response = await fetch(`/api/persons?page=${page}&search=${search}&lang=${lang}`);
    if (!response.ok) {
        throw new Error('Failed to fetch persons');
    }
    return response.json();
};

export const fetchGroups = async (): Promise<Group[]> => {
    const response = await fetch(`/api/groups`);
    if (!response.ok) {
        throw new Error('Failed to fetch groups');
    }
    const data = await response.json();

    // Handle different response formats
    if (Array.isArray(data)) {
        return data;
    }

    if (data.groups && Array.isArray(data.groups)) {
        return data.groups;
    }

    if (data.options && Array.isArray(data.options)) {
        return data.options;
    }

    // Attempt to find any array property if the expected ones aren't found
    const arrayProp = Object.values(data).find(val => Array.isArray(val));
    if (arrayProp) {
        return arrayProp as Group[];
    }

    console.warn('fetchGroups: API returned unexpected format, defaulting to empty array', data);
    return [];
};

export const fetchGroupMembers = async (groupId: string, page: number, search: string): Promise<PersonsResponse> => {
    const response = await fetch(`/api/groups/search_members?page=${page}&search=${encodeURIComponent(search)}&group_id=${groupId}`);
    if (!response.ok) {
        throw new Error('Failed to fetch group members');
    }
    return response.json();
};

// Hooks
export function usePersons({ page = 1, search = '', lang = 'en' }: { page?: number; search?: string; lang?: string } = {}) {
    return useQuery({
        queryKey: ['persons', page, search, lang],
        queryFn: () => fetchPersons(page, search, lang),
        placeholderData: (previousData) => previousData,
    });
}

export function useGroups({ search = '' }: { search?: string } = {}) {
    return useQuery({
        queryKey: ['groups', search],
        queryFn: async () => {
            const groups = await fetchGroups();
            if (search) {
                return groups.filter((g: any) =>
                    g.group_name.toLowerCase().includes(search.toLowerCase())
                );
            }
            return groups;
        },
    });
}

export function useGroupMembers({ groupId, page = 1, search = '' }: { groupId: string; page?: number; search?: string }) {
    return useQuery({
        queryKey: ['groupMembers', groupId, page, search],
        queryFn: () => fetchGroupMembers(groupId, page, search),
        enabled: !!groupId,
    });
}
