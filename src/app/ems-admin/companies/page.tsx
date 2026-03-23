'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../../hooks/useAuth';
import { useTranslations } from '../../hooks/useTranslations';

interface Company {
    SECID: string;
    NAME: string;
    TRANSLATION: string;
    DISABLED: string;
    LAST_UPDATE: string;
    SYSTEM_ID: number;
}

interface CompaniesResponse {
    sections: Company[];
    total_records: number;
    total_pages: number;
    current_page: number;
    per_page: number;
}

export default function CompaniesPage() {
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

    // State for search
    const [searchQuery, setSearchQuery] = useState('');
    const [showDisabledOnly, setShowDisabledOnly] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage] = useState(10);

    // State for edit modal
    const [editCompany, setEditCompany] = useState<Company | null>(null);
    const [editName, setEditName] = useState('');
    const [editTranslation, setEditTranslation] = useState('');
    const [editDisabled, setEditDisabled] = useState('N');

    // Copy to clipboard
    const handleCopyId = (id: string) => {
        navigator.clipboard.writeText(id).then(() => {
            showToast(t('idCopied'), 'success');
        });
    };

    // Fetch companies
    const { data: companiesData, isLoading: isLoadingCompanies } = useQuery({
        queryKey: ['companies', currentPage, searchQuery, showDisabledOnly],
        queryFn: async (): Promise<CompaniesResponse> => {
            const params = new URLSearchParams();
            if (searchQuery) {
                if (searchQuery.length >= 3) {
                    params.append('name', searchQuery);
                }
            }
            if (showDisabledOnly) {
                params.append('disabled', 'Y');
            }
            params.append('page', String(currentPage));
            params.append('per_page', String(perPage));

            const response = await fetch(`/api/sections?${params}`, {
                credentials: 'include'
            });
            if (!response.ok) {
                throw new Error('Failed to fetch companies');
            }
            return response.json();
        },
        enabled: searchQuery.length === 0 || searchQuery.length >= 3,
    });

    // Add company mutation
    const addMutation = useMutation({
        mutationFn: async () => {
            const response = await fetch('/api/sections/add', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: addName,
                    translation: addTranslation,
                }),
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to add company');
            }
            return response.json();
        },
        onSuccess: (data) => {
            showToast(t('companyAddedSuccess'), 'success');
            setAddName('');
            setAddTranslation('');
            setShowAddModal(false);
            queryClient.invalidateQueries({ queryKey: ['companies'] });
        },
        onError: (error: any) => {
            showToast(error.message, 'error');
        },
    });

    // Update company mutation
    const updateMutation = useMutation({
        mutationFn: async () => {
            if (!editCompany) throw new Error('No company selected');
            const response = await fetch('/api/sections/update', {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    secid: editCompany.SECID,
                    name: editName,
                    translation: editTranslation,
                    disabled: editDisabled,
                }),
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update company');
            }
            return response.json();
        },
        onSuccess: () => {
            showToast(t('companyUpdatedSuccess'), 'success');
            setEditCompany(null);
            queryClient.invalidateQueries({ queryKey: ['companies'] });
        },
        onError: (error: any) => {
            showToast(error.message, 'error');
        },
    });

    const handleEditClick = (company: Company) => {
        setEditCompany(company);
        setEditName(company.NAME);
        setEditTranslation(company.TRANSLATION);
        setEditDisabled(company.DISABLED);
    };

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!addName.trim() || !addTranslation.trim()) {
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

    const totalPages = companiesData?.total_pages || 1;

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
                        {t('companiesManagement')}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        {t('companiesDescription')}
                    </p>
                </div>

                {/* Add Company Button */}
                <div className="mb-6">
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition"
                    >
                        + {t('addCompany')}
                    </button>
                </div>

                {/* Add Modal */}
                {showAddModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                                {t('addNewCompany')}
                            </h2>
                            <form onSubmit={handleAddSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {t('companyName')} *
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
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('searchCompanies')}</h2>
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
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="disabled-only"
                                    checked={showDisabledOnly}
                                    onChange={(e) => setShowDisabledOnly(e.target.checked)}
                                    className="rounded"
                                />
                                <label htmlFor="disabled-only" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                    {t('showDisabledOnly')}
                                </label>
                            </div>
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
                    {isLoadingCompanies ? (
                        <div className="p-6 text-center text-gray-500 dark:text-gray-400">{t('loading')}</div>
                    ) : companiesData?.sections?.length === 0 ? (
                        <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                            {searchQuery ? t('noCompaniesMatch') : t('enterSearchCriteria')}
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-100 dark:bg-gray-700">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">{t('code')}</th>
                                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">{t('name')}</th>
                                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">{t('translation')}</th>
                                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">{t('status')}</th>
                                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">{t('lastUpdate')}</th>
                                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">{t('actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {companiesData?.sections.map((company) => (
                                            <tr key={company.SECID} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                                    <span className="inline-flex items-center gap-1.5">
                                                        {company.SECID}
                                                        <button
                                                            onClick={() => handleCopyId(company.SECID)}
                                                            className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
                                                            title={t('copyLink')}
                                                        >
                                                            📋
                                                        </button>
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                                    {company.NAME}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                                    {company.TRANSLATION}
                                                </td>
                                                <td className="px-6 py-4 text-sm">
                                                    <span
                                                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                            company.DISABLED === 'Y'
                                                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                        }`}
                                                    >
                                                        {company.DISABLED === 'Y' ? t('disabled') : t('active')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                                    {new Date(company.LAST_UPDATE).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 text-sm">
                                                    <button
                                                        onClick={() => handleEditClick(company)}
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
            {editCompany && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                            {t('editCompany')}
                        </h2>
                        <form onSubmit={handleUpdateSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t('codeReadOnly')}
                                </label>
                                <input
                                    type="text"
                                    value={editCompany.SECID}
                                    disabled
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white opacity-60"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t('companyName')} *
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
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                                    onClick={() => setEditCompany(null)}
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
