'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { Spinner } from '../../components/Spinner';
import { useToast } from '../../context/ToastContext';
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
    AGENCY_NAME?: string;
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

    // Language from user context
    const { user } = useAuth();
    const lang = user?.lang || 'en';
    const t = useTranslations(lang);

    // State for agency selection (same as EMS Sections Management tab)
    const [selectedAgencyId, setSelectedAgencyId] = useState<number | null>(null);

    // State for add modal
    const [showAddModal, setShowAddModal] = useState(false);
    const [addName, setAddName] = useState('');
    const [addTranslation, setAddTranslation] = useState('');
    const [addShort, setAddShort] = useState('');
    const [modalAgencyId, setModalAgencyId] = useState<number | null>(null);

    // State for search & pagination
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage] = useState(10);

    // State for edit modal
    const [editDepartment, setEditDepartment] = useState<Department | null>(null);
    const [editName, setEditName] = useState('');
    const [editTranslation, setEditTranslation] = useState('');

    // Copy to clipboard helper
    const handleCopyId = (id: string | number) => {
        navigator.clipboard.writeText(String(id)).then(() => {
            showToast(t('idCopied'), 'success');
        });
    };

    // Fetch active agencies
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

    // Handle agency change from dropdown
    const handleAgencyChange = (agencyId: number | null) => {
        setSelectedAgencyId(agencyId);
        setSearchQuery('');
        setCurrentPage(1);
    };

    // Fetch departments filtered by agency and/or search query
    const { data: departmentsData, isLoading: isLoadingDepartments } = useQuery({
        queryKey: ['departments', currentPage, searchQuery, selectedAgencyId],
        queryFn: async (): Promise<DepartmentsResponse> => {
            const params = new URLSearchParams();
            if (searchQuery) {
                if (searchQuery.length >= 2) {
                    params.append('name', searchQuery);
                }
            }
            if (selectedAgencyId !== null) {
                params.append('agency_id', String(selectedAgencyId));
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
    });

    // Add department mutation (department code is auto-generated and identical to department id)
    const addMutation = useMutation({
        mutationFn: async () => {
            const agencyIdToUse = modalAgencyId || selectedAgencyId;
            if (!agencyIdToUse) {
                throw new Error('Please select an agency');
            }

            const response = await fetch('/api/departments/add', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: addName.trim(),
                    translation: addTranslation.trim(),
                    short: addShort.trim().toUpperCase(),
                    agency_system_id: agencyIdToUse,
                }),
            });
            let data;
            try {
                data = await response.json();
            } catch (e) {
                throw new Error('Invalid server response');
            }
            if (!response.ok) {
                throw new Error(data?.error || data?.detail || 'Failed to add department');
            }
            if (data?.success === false) {
                throw new Error(data?.error || data?.message || 'Failed to add department');
            }
            return data;
        },
        onSuccess: (data) => {
            showToast(t('departmentAddedSuccess'), 'success');
            setAddName('');
            setAddTranslation('');
            setAddShort('');
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
                    system_id: editDepartment.SYSTEM_ID,
                    name: editName.trim(),
                    translation: editTranslation.trim(),
                }),
            });
            let data;
            try {
                data = await response.json();
            } catch (e) {
                throw new Error('Invalid server response');
            }
            if (!response.ok) {
                throw new Error(data?.error || data?.detail || 'Failed to update department');
            }
            if (data?.success === false) {
                throw new Error(data?.error || data?.message || 'Failed to update department');
            }
            return data;
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
        setEditName(dept.NAME || '');
        setEditTranslation(dept.TRANSLATION || '');
    };

    const handleOpenAddModal = () => {
        setModalAgencyId(selectedAgencyId);
        setAddName('');
        setAddTranslation('');
        setAddShort('');
        setShowAddModal(true);
    };

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const agencyIdToUse = modalAgencyId || selectedAgencyId;
        if (!addName.trim() || !addTranslation.trim() || !addShort.trim() || !agencyIdToUse) {
            showToast(t('fillAllFields'), 'error');
            return;
        }
        if (addShort.trim().length > 5) {
            showToast(t('emsDeptIdHint'), 'error');
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

    const selectedAgency = agencies.find((a) => a.SYSTEM_ID === selectedAgencyId);
    const totalPages = departmentsData?.total_pages || 1;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#1f1f1f]">
            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Back Button */}
                <Link href="/ems-admin" className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4">
                    <Image src="/icons/chevron-left.svg" alt="" width={16} height={16} className="h-4 w-4 dark:invert" />
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

                {/* Selection Section — same way as in EMS Sections Management tab */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('selectAgency')}</h2>

                    {agenciesError && (
                        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
                            <p className="font-semibold">{t('errorLoadingAgencies')}</p>
                            <p className="text-sm mt-1">{agenciesError instanceof Error ? agenciesError.message : 'Failed to load agencies'}</p>
                        </div>
                    )}

                    {isLoadingAgencies && (
                        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-700 dark:text-blue-400">
                            {t('loadingAgencies')}
                        </div>
                    )}

                    {!isLoadingAgencies && !agenciesError && agencies.length === 0 && (
                        <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-yellow-700 dark:text-yellow-400">
                            <p className="font-semibold">{t('noAgenciesFound')}</p>
                            <p className="text-sm mt-1">{t('noAgenciesFoundDesc')}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t('agency')}
                            </label>
                            <select
                                value={selectedAgencyId || ''}
                                onChange={(e) => handleAgencyChange(e.target.value ? parseInt(e.target.value) : null)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                                <option value="">{t('allAgencies')}</option>
                                {agencies.map((agency) => (
                                    <option key={agency.SYSTEM_ID} value={agency.SYSTEM_ID}>
                                        [{agency.SYSTEM_ID}] {agency.NAME}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Quick Stats or Actions */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleOpenAddModal}
                                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition flex items-center gap-2 shadow-sm"
                            >
                                <span>+</span>
                                <span>{t('addDepartment')}</span>
                            </button>
                            {selectedAgency && (
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    Selected: <strong>{selectedAgency.NAME}</strong>
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Add Department Modal */}
                {showAddModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                {t('addNewDepartment')}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                Department Code is auto-generated and identical to Department ID. A security group <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">EMS_DPT_&#123;EMS_ID&#125;</code> and default child section <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">N/A</code> will also be created automatically.
                            </p>

                            <form onSubmit={handleAddSubmit} className="space-y-4">
                                {/* Parent Agency Dropdown / Display */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('agency')} *
                                    </label>
                                    <select
                                        value={modalAgencyId || selectedAgencyId || ''}
                                        onChange={(e) => setModalAgencyId(e.target.value ? parseInt(e.target.value) : null)}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        required
                                    >
                                        <option value="">{t('selectAnAgency')}</option>
                                        {agencies.map((agency) => (
                                            <option key={agency.SYSTEM_ID} value={agency.SYSTEM_ID}>
                                                [{agency.SYSTEM_ID}] {agency.NAME}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Department Name (English) */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('departmentEnglishName')} *
                                    </label>
                                    <input
                                        type="text"
                                        value={addName}
                                        onChange={(e) => setAddName(e.target.value)}
                                        placeholder="e.g., Human Resources"
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        required
                                        minLength={2}
                                    />
                                </div>

                                {/* Department Name (Arabic / Translation) */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('departmentArabicName')} *
                                    </label>
                                    <input
                                        type="text"
                                        dir="rtl"
                                        value={addTranslation}
                                        onChange={(e) => setAddTranslation(e.target.value)}
                                        placeholder="مثال: الموارد البشرية"
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right"
                                        required
                                        minLength={2}
                                    />
                                </div>

                                {/* EMS Department ID (SHORT) */}
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('emsDepartmentId')} (EMS_ID) *
                                        </label>
                                        <span className={`text-xs ${addShort.length > 5 ? 'text-red-500 font-bold' : 'text-gray-500 dark:text-gray-400'}`}>
                                            ({addShort.length}/5)
                                        </span>
                                    </div>
                                    <input
                                        type="text"
                                        value={addShort}
                                        onChange={(e) => setAddShort(e.target.value.toUpperCase())}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                                        required
                                        minLength={1}
                                        maxLength={5}
                                        placeholder="e.g., HR01"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Security group will be created as: <strong className="font-mono text-blue-600 dark:text-blue-400">EMS_DPT_{addShort || '???'}</strong>
                                    </p>
                                </div>

                                <div className="flex gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <button
                                        type="submit"
                                        disabled={addMutation.isPending}
                                        className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 transition"
                                    >
                                        {addMutation.isPending ? t('adding') : t('add')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="flex-1 px-4 py-2.5 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg font-medium transition"
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
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t('enterAtLeast3Chars')}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
                        >
                            {t('search')}
                        </button>
                    </div>
                </div>

                {/* Results Table */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    {isLoadingDepartments ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            <Spinner size="md" center />
                        </div>
                    ) : departmentsData?.departments?.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            {searchQuery ? t('noDepartmentsMatch') : 'No departments found.'}
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-100 dark:bg-gray-700/60 border-b border-gray-200 dark:border-gray-700">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">{t('deptId')} / Code</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">{t('departmentEnglishName')}</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">{t('departmentArabicName')}</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">EMS ID</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">{t('agency')}</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">{t('status')}</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">{t('lastUpdate')}</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">{t('actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {departmentsData?.departments.map((dept) => {
                                            const displayId = dept.DEPTID || dept.SYSTEM_ID;
                                            return (
                                                <tr
                                                    key={dept.SYSTEM_ID || dept.DEPTID}
                                                    onDoubleClick={() => handleEditClick(dept)}
                                                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition"
                                                >
                                                    {/* Department ID / Code */}
                                                    <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-white whitespace-nowrap">
                                                        <span className="inline-flex items-center gap-1.5">
                                                            {displayId}
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleCopyId(displayId);
                                                                }}
                                                                className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
                                                                title={t('copyLink')}
                                                            >
                                                                📋
                                                            </button>
                                                        </span>
                                                    </td>

                                                    {/* English Name */}
                                                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                                                        {dept.NAME}
                                                    </td>

                                                    {/* Arabic Name (Translation) */}
                                                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300" dir="rtl">
                                                        {dept.TRANSLATION || '-'}
                                                    </td>

                                                    {/* SHORT (EMS Dept ID) */}
                                                    <td className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                                                            {dept.SHORT}
                                                        </span>
                                                    </td>

                                                    {/* Agency */}
                                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                                                        {dept.AGENCY_NAME ? (
                                                            <span>{dept.AGENCY_NAME}</span>
                                                        ) : (
                                                            <span className="font-mono text-xs">ID: {dept.AGENCYID}</span>
                                                        )}
                                                    </td>

                                                    {/* Status */}
                                                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                                                        <span
                                                            className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${dept.DISABLED === 'Y'
                                                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                                                                    : 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                                                                }`}
                                                        >
                                                            {dept.DISABLED === 'Y' ? t('disabled') : t('active')}
                                                        </span>
                                                    </td>

                                                    {/* Last Update */}
                                                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                        {dept.LAST_UPDATE ? new Date(dept.LAST_UPDATE).toLocaleDateString() : '-'}
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleEditClick(dept);
                                                            }}
                                                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                                                        >
                                                            {t('edit')}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                                    <button
                                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                        disabled={currentPage === 1}
                                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded disabled:opacity-50 transition"
                                    >
                                        {t('previous')}
                                    </button>
                                    <span className="text-sm text-gray-600 dark:text-gray-300">
                                        {t('page')} {currentPage} {t('of')} {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded disabled:opacity-50 transition"
                                    >
                                        {t('next')}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Edit Modal — User cannot update AGENCY_ID or disable it, only name and NAME_ARABIC */}
            {editDepartment && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 sm:p-8 max-w-md w-full">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            {t('editDepartment')}
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
                            Agency and codes are read-only; you can update English name and Arabic name.
                        </p>

                        <form onSubmit={handleUpdateSubmit} className="space-y-4">
                            {/* Read-only details */}
                            <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-xs">
                                <div>
                                    <span className="text-gray-500 dark:text-gray-400">Department ID / Code:</span>
                                    <p className="font-mono font-semibold text-gray-900 dark:text-white">{editDepartment.DEPTID || editDepartment.SYSTEM_ID}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500 dark:text-gray-400">EMS ID (SHORT):</span>
                                    <p className="font-mono font-semibold text-gray-900 dark:text-white">{editDepartment.SHORT}</p>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-gray-500 dark:text-gray-400">Agency:</span>
                                    <p className="font-semibold text-gray-900 dark:text-white truncate">
                                        {editDepartment.AGENCY_NAME || editDepartment.AGENCYID}
                                    </p>
                                </div>
                            </div>

                            {/* Department Name (English) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('departmentEnglishName')} *
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

                            {/* Department Name (Arabic) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('departmentArabicName')} *
                                </label>
                                <input
                                    type="text"
                                    dir="rtl"
                                    value={editTranslation}
                                    onChange={(e) => setEditTranslation(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right"
                                    required
                                    minLength={2}
                                />
                            </div>

                            <div className="flex gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <button
                                    type="submit"
                                    disabled={updateMutation.isPending}
                                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 transition"
                                >
                                    {updateMutation.isPending ? t('saving') : t('save')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditDepartment(null)}
                                    className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg font-medium transition"
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
