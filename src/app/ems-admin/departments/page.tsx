'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../../hooks/useAuth';
import { useTranslations } from '../../hooks/useTranslations';

interface Agency {
    SYSTEM_ID: number;
    NAME: string;
}

interface Department {
    DEPTID: string;
    NAME: string;
    TRANSLATION: string;
    SHORT: string;
    DISABLED: string;
    LAST_UPDATE: string;
    SYSTEM_ID: number;
    AGENCYID: number;
}

interface DepartmentsResponse {
    departments: Department[];
    total_records: number;
    total_pages: number;
    current_page: number;
    per_page: number;
}

export default function DepartmentsPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    // Language from user context (same as dashboard)
    const { user } = useAuth();
    const lang = user?.lang || 'en';
    const t = useTranslations(lang);

    // State for add form
    const [showAddModal, setShowAddModal] = useState(false);
    const [addName, setAddName] = useState('');
    const [addTranslation, setAddTranslation] = useState('');
    const [addShort, setAddShort] = useState('');
    const [addAgencyId, setAddAgencyId] = useState<number | null>(null);

    // State for search
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage] = useState(10);

    // State for edit modal
    const [editDepartment, setEditDepartment] = useState<Department | null>(null);
    const [editName, setEditName] = useState('');
    const [editTranslation, setEditTranslation] = useState('');

    // Copy to clipboard
    const handleCopyId = (id: string) => {
        navigator.clipboard.writeText(id).then(() => {
            showToast(t('idCopied'), 'success');
        });
    };

    // Fetch agencies
    const { data: agencies = [], isLoading: isLoadingAgencies, error: agenciesError } = useQuery({
        queryKey: ['agencies'],
        queryFn: async (): Promise<Agency[]> => {
            try {
                const response = await fetch('/api/departments/agencies', {
                    credentials: 'include'
                });
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    console.error('Agencies API error:', response.status, errorData);
                    throw new Error(errorData.error || `Failed to fetch agencies (${response.status})`);
                }
                const data = await response.json();
                if (data && data.agencies && Array.isArray(data.agencies)) {
                    return data.agencies;
                }
                return Array.isArray(data) ? data : [];
            } catch (error) {
                console.error('Agencies fetch error:', error);
                throw error;
            }
        },
        retry: 1,
    });

    // Fetch departments
    const { data: departmentsData, isLoading: isLoadingDepartments } = useQuery({
        queryKey: ['departments', currentPage, searchQuery],
        queryFn: async (): Promise<DepartmentsResponse> => {
            const params = new URLSearchParams();
            if (searchQuery) {
                if (searchQuery.length >= 3) {
                    params.append('name', searchQuery);
                }
            }
            params.append('page', String(currentPage));
            params.append('per_page', String(perPage));

            const response = await fetch(`/api/departments?${params}`, {
                credentials: 'include'
            });
            if (!response.ok) {
                throw new Error('Failed to fetch departments');
            }
            return response.json();
        },
        enabled: searchQuery.length === 0 || searchQuery.length >= 3,
    });

    // Add department mutation
    const addMutation = useMutation({
        mutationFn: async () => {
            const response = await fetch('/api/departments/add', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: addName,
                    translation: addTranslation,
                    short: addShort,
                    agency_system_id: addAgencyId,
                }),
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to add department');
            }
            return response.json();
        },
        onSuccess: (data) => {
            showToast(t('departmentAddedSuccess'), 'success');
            setAddName('');
            setAddTranslation('');
            setAddShort('');
            setAddAgencyId(null);
            setShowAddModal(false);
            queryClient.invalidateQueries({ queryKey: ['departments'] });
        },
        onError: (error: any) => {
            showToast(error.message, 'error');
        },
    });

    // Update department mutation
    const updateMutation = useMutation({
        mutationFn: async () => {
            if (!editDepartment) throw new Error('No department selected');
            const response = await fetch('/api/departments/update', {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    deptid: editDepartment.DEPTID,
                    name: editName,
                    translation: editTranslation,
                }),
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update department');
            }
            return response.json();
        },
        onSuccess: () => {
            showToast(t('departmentUpdatedSuccess'), 'success');
            setEditDepartment(null);
            queryClient.invalidateQueries({ queryKey: ['departments'] });
        },
        onError: (error: any) => {
            showToast(error.message, 'error');
        },
    });

    const handleEditClick = (dept: Department) => {
        setEditDepartment(dept);
        setEditName(dept.NAME);
        setEditTranslation(dept.TRANSLATION);
    };

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!addName.trim() || !addTranslation.trim() || !addShort.trim() || !addAgencyId) {
            showToast(t('fillAllFields'), 'error');
            return;
        }
        addMutation.mutate();
    };

    const handleUpdateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editName.trim() || !editTranslation.trim()) {
            showToast(t('fillAllFields'), 'error');
            return;
        }
        updateMutation.mutate();
    };

    const handleSearch = () => {
        setCurrentPage(1);
    };

    const totalPages = departmentsData?.total_pages || 1;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#1f1f1f]">
            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Back Button */}
                <Link href="/ems-admin" className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    {t('backToEmsAdmin')}
                </Link>

                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        {t('departmentsManagement')}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        {t('departmentsDescription')}
                    </p>
                </div>

                {/* Add Department Button */}
                <div className="mb-6">
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition"
                    >
                        + {t('addDepartment')}
                    </button>
                </div>

                {/* Add Modal */}
                {showAddModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                                {t('addNewDepartment')}
                            </h2>
                            {agenciesError && (
                                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-400 text-sm">
                                    <p className="font-semibold">{t('errorLoadingAgencies')}</p>
                                    <p className="text-xs mt-1">{agenciesError instanceof Error ? agenciesError.message : 'Failed to load agencies'}</p>
                                </div>
                            )}
                            {isLoadingAgencies && (
                                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-blue-700 dark:text-blue-400 text-sm">
                                    {t('loadingAgencies')}
                                </div>
                            )}
                            {!isLoadingAgencies && !agenciesError && agencies.length === 0 && (
                                <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-yellow-700 dark:text-yellow-400 text-sm">
                                    <p className="font-semibold">{t('noAgenciesFound')}</p>
                                    <p className="text-xs mt-1">{t('noAgenciesFoundDesc')}</p>
                                </div>
                            )}
                            <form onSubmit={handleAddSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {t('agency')} *
                                    </label>
                                    <select
                                        value={addAgencyId || ''}
                                        onChange={(e) => setAddAgencyId(e.target.value ? parseInt(e.target.value) : null)}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        required
                                    >
                                        <option value="">{t('selectAnAgency')}</option>
                                        {agencies.map((agency) => (
                                            <option key={agency.SYSTEM_ID} value={agency.SYSTEM_ID}>
                                                {agency.NAME}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {t('departmentName')} *
                                    </label>
                                    <input
                                        type="text"
                                        value={addName}
                                        onChange={(e) => setAddName(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        required
                                        minLength={2}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {t('translation')} *
                                    </label>
                                    <input
                                        type="text"
                                        value={addTranslation}
                                        onChange={(e) => setAddTranslation(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        required
                                        minLength={2}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {t('emsDepartmentId')} *
                                    </label>
                                    <input
                                        type="text"
                                        value={addShort}
                                        onChange={(e) => setAddShort(e.target.value.toUpperCase())}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        required
                                        minLength={2}
                                        maxLength={10}
                                        placeholder="e.g., EMS01"
                                    />
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="submit"
                                        disabled={addMutation.isPending}
                                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
                                    >
                                        {addMutation.isPending ? t('adding') : t('add')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowAddModal(false);
                                            setAddName('');
                                            setAddTranslation('');
                                            setAddShort('');
                                            setAddAgencyId(null);
                                        }}
                                        className="flex-1 px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-lg font-medium"
                                    >
                                        {t('cancel')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Search Section */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('searchDepartments')}</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t('searchByNameCodeTranslation')}
                            </label>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t('enterAtLeast3Chars')}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                minLength={3}
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            disabled={searchQuery.length > 0 && searchQuery.length < 3}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
                        >
                            {t('search')}
                        </button>
                    </div>
                </div>

                {/* Results */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    {isLoadingDepartments ? (
                        <div className="p-6 text-center text-gray-500 dark:text-gray-400">{t('loading')}</div>
                    ) : departmentsData?.departments?.length === 0 ? (
                        <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                            {searchQuery ? t('noDepartmentsMatch') : t('enterSearchCriteria')}
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-100 dark:bg-gray-700">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">{t('deptId')}</th>
                                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">{t('name')}</th>
                                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">{t('shortCode')}</th>
                                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">{t('status')}</th>
                                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">{t('lastUpdate')}</th>
                                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">{t('actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {departmentsData?.departments.map((dept) => (
                                            <tr key={dept.DEPTID} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                                    <span className="inline-flex items-center gap-1.5">
                                                        {dept.DEPTID}
                                                        <button
                                                            onClick={() => handleCopyId(dept.DEPTID)}
                                                            className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
                                                            title={t('copyLink')}
                                                        >
                                                            📋
                                                        </button>
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                                    {dept.NAME}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                                    {dept.SHORT}
                                                </td>
                                                <td className="px-6 py-4 text-sm">
                                                    <span
                                                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                            dept.DISABLED === 'Y'
                                                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                        }`}
                                                    >
                                                        {dept.DISABLED === 'Y' ? t('disabled') : t('active')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                                    {new Date(dept.LAST_UPDATE).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 text-sm">
                                                    <button
                                                        onClick={() => handleEditClick(dept)}
                                                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                                                    >
                                                        {t('edit')}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                                    <button
                                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                        disabled={currentPage === 1}
                                        className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded disabled:opacity-50"
                                    >
                                        {t('previous')}
                                    </button>
                                    <span className="text-sm text-gray-600 dark:text-gray-300">
                                        {t('page')} {currentPage} {t('of')} {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded disabled:opacity-50"
                                    >
                                        {t('next')}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Edit Modal */}
            {editDepartment && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                            {t('editDepartment')}
                        </h2>
                        <form onSubmit={handleUpdateSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t('deptIdReadOnly')}
                                </label>
                                <input
                                    type="text"
                                    value={editDepartment.DEPTID}
                                    disabled
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white opacity-60"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t('departmentName')} *
                                </label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    required
                                    minLength={2}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t('translation')} *
                                </label>
                                <input
                                    type="text"
                                    value={editTranslation}
                                    onChange={(e) => setEditTranslation(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    required
                                    minLength={2}
                                />
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button
                                    type="submit"
                                    disabled={updateMutation.isPending}
                                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
                                >
                                    {updateMutation.isPending ? t('saving') : t('save')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditDepartment(null)}
                                    className="flex-1 px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-lg font-medium"
                                >
                                    {t('cancel')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
