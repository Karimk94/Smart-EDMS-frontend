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
    SYSTEM_ID: number;
    AGENCYID: number;
    NAME: string;
    SHORT: string;
    TRANSLATION?: string;
    DISABLED?: string;
}

interface EmsSection {
    SECID: string;
    NAME: string;
    TRANSLATION: string;
    DISABLED: string;
    LAST_UPDATE: string;
    SYSTEM_ID: number;
    PARENT_DEPT_SYSTEM_ID: number;
    PARENT_DEPT_NAME?: string;
}

interface EmsSectionsResponse {
    sections: EmsSection[];
    total_records: number;
    total_pages: number;
    current_page: number;
    per_page: number;
}

export default function EmsSectionsPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    // Language from user context
    const { user } = useAuth();
    const lang = user?.lang || 'en';
    const t = useTranslations(lang);

    // State for agency / department selection
    const [selectedAgencyId, setSelectedAgencyId] = useState<number | null>(null);
    const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);

    // State for add modal
    const [showAddModal, setShowAddModal] = useState(false);
    const [modalAgencyId, setModalAgencyId] = useState<number | null>(null);
    const [modalDeptId, setModalDeptId] = useState<number | null>(null);
    const [addCode, setAddCode] = useState('');
    const [addName, setAddName] = useState('');
    const [addTranslation, setAddTranslation] = useState('');

    // State for search & pagination
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage] = useState(10);

    // State for edit modal
    const [editSection, setEditSection] = useState<EmsSection | null>(null);
    const [editCode, setEditCode] = useState('');
    const [editName, setEditName] = useState('');
    const [editTranslation, setEditTranslation] = useState('');
    const [editDisabled, setEditDisabled] = useState('N');

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
            const response = await fetch('/api/departments/agencies', {
                credentials: 'include'
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to fetch agencies (${response.status})`);
            }
            const data = await response.json();
            if (data && data.agencies && Array.isArray(data.agencies)) {
                return data.agencies;
            }
            return Array.isArray(data) ? data : [];
        },
        retry: 1,
    });

    // Fetch departments for main page selected agency
    const { data: departments = [], isLoading: isLoadingDepartments } = useQuery({
        queryKey: ['departments-by-agency', selectedAgencyId],
        queryFn: async (): Promise<Department[]> => {
            if (!selectedAgencyId) return [];
            const response = await fetch(`/api/ems_sections/departments_by_agency/${selectedAgencyId}`, {
                credentials: 'include'
            });
            if (!response.ok) {
                throw new Error('Failed to fetch departments');
            }
            const data = await response.json();
            if (data && data.departments && Array.isArray(data.departments)) {
                return data.departments;
            }
            return Array.isArray(data) ? data : [];
        },
        enabled: !!selectedAgencyId,
    });

    // Fetch departments for modal selected agency
    const activeModalAgencyId = modalAgencyId || selectedAgencyId;
    const { data: modalDepartments = [], isLoading: isLoadingModalDepartments } = useQuery({
        queryKey: ['departments-by-agency-modal', activeModalAgencyId],
        queryFn: async (): Promise<Department[]> => {
            if (!activeModalAgencyId) return [];
            const response = await fetch(`/api/ems_sections/departments_by_agency/${activeModalAgencyId}`, {
                credentials: 'include'
            });
            if (!response.ok) {
                throw new Error('Failed to fetch departments');
            }
            const data = await response.json();
            if (data && data.departments && Array.isArray(data.departments)) {
                return data.departments;
            }
            return Array.isArray(data) ? data : [];
        },
        enabled: !!activeModalAgencyId && showAddModal,
    });

    // Fetch EMS sections
    const { data: sectionsData, isLoading: isLoadingSections } = useQuery({
        queryKey: ['ems_sections', currentPage, searchQuery, selectedDeptId],
        queryFn: async (): Promise<EmsSectionsResponse> => {
            const params = new URLSearchParams();
            if (selectedDeptId) {
                params.append('dept_system_id', String(selectedDeptId));
            }
            if (searchQuery.trim().length >= 3) {
                params.append('name', searchQuery.trim());
            }
            params.append('page', String(currentPage));
            params.append('per_page', String(perPage));

            const response = await fetch(`/api/ems_sections?${params}`, {
                credentials: 'include'
            });
            if (!response.ok) {
                throw new Error('Failed to fetch EMS sections');
            }
            return response.json();
        },
        enabled: selectedDeptId !== null || searchQuery.trim().length >= 3,
    });

    // Add EMS section mutation
    const addMutation = useMutation({
        mutationFn: async (payload: { name: string; translation: string; ems_code: string; dept_system_id: number }) => {
            const response = await fetch('/api/ems_sections/add', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            let data;
            try {
                data = await response.json();
            } catch (e) {
                throw new Error('Invalid server response');
            }
            if (!response.ok) {
                throw new Error(data?.error || data?.detail || 'Failed to add EMS section');
            }
            if (data?.success === false) {
                throw new Error(data?.error || data?.message || 'Failed to add EMS section');
            }
            return data;
        },
        onSuccess: (data) => {
            showToast(data?.message || t('emsSectionAddedSuccess'), 'success');
            setAddCode('');
            setAddName('');
            setAddTranslation('');
            setShowAddModal(false);
            queryClient.invalidateQueries({ queryKey: ['ems_sections'] });
        },
        onError: (error: any) => {
            showToast(error.message, 'error');
        },
    });

    // Update EMS section mutation
    const updateMutation = useMutation({
        mutationFn: async () => {
            if (!editSection) throw new Error('No section selected');
            const response = await fetch('/api/ems_sections/update', {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    system_id: editSection.SYSTEM_ID,
                    new_ems_code: editCode.trim().toUpperCase(),
                    name: editName.trim(),
                    translation: editTranslation.trim(),
                    disabled: editDisabled,
                    parent_dept_system_id: editSection.PARENT_DEPT_SYSTEM_ID,
                }),
            });
            let data;
            try {
                data = await response.json();
            } catch (e) {
                throw new Error('Invalid server response');
            }
            if (!response.ok) {
                throw new Error(data?.error || data?.detail || 'Failed to update EMS section');
            }
            if (data?.success === false) {
                throw new Error(data?.error || data?.message || 'Failed to update EMS section');
            }
            return data;
        },
        onSuccess: (data) => {
            showToast(data?.message || t('emsSectionUpdatedSuccess'), 'success');
            setEditSection(null);
            queryClient.invalidateQueries({ queryKey: ['ems_sections'] });
        },
        onError: (error: any) => {
            showToast(error.message, 'error');
        },
    });

    const handleOpenAddModal = () => {
        setModalAgencyId(selectedAgencyId);
        setModalDeptId(selectedDeptId);
        setAddCode('');
        setAddName('');
        setAddTranslation('');
        setShowAddModal(true);
    };

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const targetDeptId = modalDeptId || selectedDeptId;
        if (!targetDeptId) {
            showToast(t('selectADepartment'), 'error');
            return;
        }
        if (!addCode.trim() || !addName.trim() || !addTranslation.trim()) {
            showToast(t('fillAllFields'), 'error');
            return;
        }
        if (addCode.trim().length > 5) {
            showToast(t('emsCodeHint'), 'error');
            return;
        }
        addMutation.mutate({
            name: addName.trim(),
            translation: addTranslation.trim(),
            ems_code: addCode.trim().toUpperCase(),
            dept_system_id: targetDeptId,
        });
    };

    const handleEditClick = (section: EmsSection) => {
        setEditSection(section);
        setEditCode(section.SECID || '');
        setEditName(section.NAME || '');
        setEditTranslation(section.TRANSLATION || '');
        setEditDisabled(section.DISABLED || 'N');
    };

    const handleUpdateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editName.trim() || !editTranslation.trim() || !editCode.trim()) {
            showToast(t('fillAllFields'), 'error');
            return;
        }
        if (editCode.trim().length > 5) {
            showToast(t('emsCodeHint'), 'error');
            return;
        }
        updateMutation.mutate();
    };

    const handleSearch = () => {
        setCurrentPage(1);
    };

    const handleAgencyChange = (agencyId: number | null) => {
        setSelectedAgencyId(agencyId);
        setSelectedDeptId(null);
        setSearchQuery('');
        setCurrentPage(1);
    };

    const handleDeptChange = (deptId: number | null) => {
        setSelectedDeptId(deptId);
        setSearchQuery('');
        setCurrentPage(1);
    };

    const selectedAgency = agencies.find((a) => a.SYSTEM_ID === selectedAgencyId);
    const selectedDept = departments.find((d) => d.SYSTEM_ID === selectedDeptId);
    const totalPages = sectionsData?.total_pages || 1;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#1f1f1f]">
            {/* Main Container */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Back Link */}
                <Link href="/ems-admin" className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4">
                    <Image src="/icons/chevron-left.svg" alt="" width={16} height={16} className="h-4 w-4 dark:invert" />
                    {t('backToEmsAdmin')}
                </Link>

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        {t('emsSectionsManagement')}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        {t('emsSectionsDescription')}
                    </p>
                </div>

                {/* Selection & Add Section Bar */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('selectDepartment')}</h2>

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
                            <p className="text-sm mt-1">{t('noAgenciesFoundDescLong')}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        {/* Agency Dropdown */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t('agency')}
                            </label>
                            <select
                                value={selectedAgencyId || ''}
                                onChange={(e) => handleAgencyChange(e.target.value ? parseInt(e.target.value) : null)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                                <option value="">{t('selectAnAgency')}</option>
                                {agencies.map((agency) => (
                                    <option key={agency.SYSTEM_ID} value={agency.SYSTEM_ID}>
                                        [{agency.SYSTEM_ID}] {agency.NAME}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Department Dropdown */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t('department')}
                            </label>
                            <select
                                value={selectedDeptId || ''}
                                onChange={(e) => handleDeptChange(e.target.value ? parseInt(e.target.value) : null)}
                                disabled={!selectedAgencyId}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                            >
                                <option value="">{t('selectADepartment')}</option>
                                {departments.map((dept) => (
                                    <option key={dept.SYSTEM_ID} value={dept.SYSTEM_ID}>
                                        [{dept.DEPTID || dept.SYSTEM_ID}] {dept.NAME} {dept.SHORT ? `(${dept.SHORT})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Add EMS Section Button */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleOpenAddModal}
                                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition flex items-center gap-2 shadow-sm whitespace-nowrap"
                            >
                                <span>+</span>
                                <span>{t('addEmsSection')}</span>
                            </button>
                            {selectedDept && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {selectedDept.NAME}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Add Section Modal */}
                {showAddModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                {t('addNewEmsSection')}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                {t('addSectionDesc')}{' '}
                                <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded font-mono">
                                    EMS_SEC_{addCode || 'EMS_CODE'}
                                </code>
                            </p>

                            <form onSubmit={handleAddSubmit} className="space-y-4">
                                {/* Agency Selection in Modal */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('agency')} *
                                    </label>
                                    <select
                                        value={modalAgencyId || ''}
                                        onChange={(e) => {
                                            const newAgencyId = e.target.value ? parseInt(e.target.value) : null;
                                            setModalAgencyId(newAgencyId);
                                            setModalDeptId(null);
                                        }}
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

                                {/* Department Selection in Modal */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('department')} *
                                    </label>
                                    <select
                                        value={modalDeptId || ''}
                                        onChange={(e) => setModalDeptId(e.target.value ? parseInt(e.target.value) : null)}
                                        disabled={!modalAgencyId}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                                        required
                                    >
                                        <option value="">{t('selectADepartment')}</option>
                                        {modalDepartments.map((dept) => (
                                            <option key={dept.SYSTEM_ID} value={dept.SYSTEM_ID}>
                                                [{dept.DEPTID || dept.SYSTEM_ID}] {dept.NAME} {dept.SHORT ? `(${dept.SHORT})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Section English Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('sectionEnglishName')} *
                                    </label>
                                    <input
                                        type="text"
                                        value={addName}
                                        onChange={(e) => setAddName(e.target.value)}
                                        placeholder="e.g., Personnel Affairs"
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        required
                                        minLength={2}
                                    />
                                </div>

                                {/* Section Arabic Name (Translation) */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('sectionArabicName')} *
                                    </label>
                                    <input
                                        type="text"
                                        dir="rtl"
                                        value={addTranslation}
                                        onChange={(e) => setAddTranslation(e.target.value)}
                                        placeholder="مثال: شؤون الموظفين"
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right"
                                        required
                                        minLength={2}
                                    />
                                </div>

                                {/* EMS Code (SECID) */}
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('emsCode')} (SECID) *
                                        </label>
                                        <span className={`text-xs ${addCode.length > 5 ? 'text-red-500 font-bold' : 'text-gray-500 dark:text-gray-400'}`}>
                                            ({addCode.length}/5)
                                        </span>
                                    </div>
                                    <input
                                        type="text"
                                        value={addCode}
                                        onChange={(e) => setAddCode(e.target.value.toUpperCase())}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                                        required
                                        minLength={1}
                                        maxLength={5}
                                        placeholder="e.g., SEC01"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {t('emsSecGroupHint')}{' '}
                                        <strong className="font-mono text-blue-600 dark:text-blue-400">
                                            EMS_SEC_{addCode || '???'}
                                        </strong>
                                    </p>
                                </div>

                                {/* Modal Actions */}
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
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('searchEmsSections')}</h2>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                placeholder={t('searchByNameCodeTranslation')}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            disabled={searchQuery.length > 0 && searchQuery.length < 3}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 transition"
                        >
                            {t('search')}
                        </button>
                    </div>
                </div>

                {/* Results Section */}
                {selectedDeptId || searchQuery.trim().length >= 3 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                        {isLoadingSections ? (
                            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                                <Spinner size="sm" center />
                            </div>
                        ) : sectionsData?.sections?.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                                {searchQuery ? t('noSectionsMatch') : t('noSectionsForDept')}
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-100 dark:bg-gray-700">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">{t('code')} (SECID)</th>
                                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">{t('systemId')}</th>
                                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">{t('sectionName')}</th>
                                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">{t('translation')}</th>
                                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">{t('department')}</th>
                                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">{t('status')}</th>
                                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">{t('lastUpdate')}</th>
                                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">{t('actions')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {sectionsData?.sections.map((section) => (
                                                <tr
                                                    key={`${section.SYSTEM_ID}-${section.SECID}`}
                                                    onDoubleClick={() => handleEditClick(section)}
                                                    className="hover:bg-gray-50 dark:hover:bg-gray-700/60 cursor-pointer transition"
                                                >
                                                    {/* Code */}
                                                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                                        <span className="inline-flex items-center gap-1.5 font-mono">
                                                            {section.SECID}
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleCopyId(section.SECID);
                                                                }}
                                                                className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
                                                                title={t('copyLink')}
                                                            >
                                                                📋
                                                            </button>
                                                        </span>
                                                    </td>

                                                    {/* System ID */}
                                                    <td className="px-6 py-4 text-sm">
                                                        <span className="inline-flex items-center gap-1.5 font-mono bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded text-xs">
                                                            {section.SYSTEM_ID}
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleCopyId(section.SYSTEM_ID);
                                                                }}
                                                                className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
                                                                title={t('copyLink')}
                                                            >
                                                                📋
                                                            </button>
                                                        </span>
                                                    </td>

                                                    {/* English Name */}
                                                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-medium">
                                                        {section.NAME}
                                                    </td>

                                                    {/* Arabic Name */}
                                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                                        {section.TRANSLATION}
                                                    </td>

                                                    {/* Department */}
                                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                                        {section.PARENT_DEPT_NAME || selectedDept?.NAME || '-'}
                                                    </td>

                                                    {/* Status Badge */}
                                                    <td className="px-6 py-4 text-sm">
                                                        <span
                                                            className={`px-2.5 py-1 rounded-full text-xs font-medium ${section.DISABLED === 'Y'
                                                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                            }`}
                                                        >
                                                            {section.DISABLED === 'Y' ? t('disabled') : t('active')}
                                                        </span>
                                                    </td>

                                                    {/* Last Update */}
                                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                        {section.LAST_UPDATE ? new Date(section.LAST_UPDATE).toLocaleDateString() : '-'}
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="px-6 py-4 text-sm">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleEditClick(section);
                                                            }}
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
                                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded disabled:opacity-50 transition"
                                        >
                                            {t('previous')}
                                        </button>
                                        <span className="text-sm text-gray-600 dark:text-gray-300">
                                            {t('page')} {currentPage} {t('of')} {totalPages}
                                        </span>
                                        <button
                                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                            disabled={currentPage === totalPages}
                                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded disabled:opacity-50 transition"
                                        >
                                            {t('next')}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                ) : (
                    /* Initial Empty State */
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                        <p className="text-gray-500 dark:text-gray-400">
                            {t('selectAgencyAndDept')}
                        </p>
                    </div>
                )}
            </div>

            {/* Edit Section Modal */}
            {editSection && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 sm:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                            {t('editEmsSection')}
                        </h2>
                        <form onSubmit={handleUpdateSubmit} className="space-y-4">
                            {/* System ID (Read-only) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('systemId')}
                                </label>
                                <input
                                    type="text"
                                    value={editSection.SYSTEM_ID}
                                    disabled
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white opacity-60 font-mono"
                                />
                            </div>

                            {/* EMS Code (SECID) */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {t('emsCode')} (SECID) *
                                    </label>
                                    <span className={`text-xs ${editCode.length > 5 ? 'text-red-500 font-bold' : 'text-gray-500 dark:text-gray-400'}`}>
                                        ({editCode.length}/5)
                                    </span>
                                </div>
                                <input
                                    type="text"
                                    value={editCode}
                                    onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                                    required
                                    minLength={1}
                                    maxLength={5}
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Updating SECID also updates the corresponding security group <code className="font-mono text-blue-600 dark:text-blue-400">EMS_SEC_{editCode || '???'}</code>.
                                </p>
                            </div>

                            {/* Section English Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('sectionEnglishName')} *
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

                            {/* Section Arabic Name (Translation) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('sectionArabicName')} *
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

                            {/* Status */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('status')}
                                </label>
                                <select
                                    value={editDisabled}
                                    onChange={(e) => setEditDisabled(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="N">{t('active')}</option>
                                    <option value="Y">{t('disabled')}</option>
                                </select>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <button
                                    type="submit"
                                    disabled={updateMutation.isPending}
                                    className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 transition"
                                >
                                    {updateMutation.isPending ? t('saving') : t('save')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditSection(null)}
                                    className="flex-1 px-4 py-2.5 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg font-medium transition"
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
