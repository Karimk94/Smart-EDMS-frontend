"use client";

import { useQueryClient } from '@tanstack/react-query';
import { enGB } from 'date-fns/locale/en-GB';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { registerLocale } from 'react-datepicker';
import { useSearchScopes, useSearchTypes, useResearcherMultiSearch, SearchType, SearchCriterion } from '../../hooks/useResearcher';
import { Document } from '../../models/Document';
import { User } from '../../models/User';
import { useUser } from '../context/UserContext';
import { useTranslations } from '../hooks/useTranslations';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { DocumentList } from '../components/DocumentList';
import { DocumentItemSkeleton } from '../components/DocumentItemSkeleton';
import { Pagination } from '../components/Pagination';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ImageModal } from '../components/ImageModal';
import { VideoModal } from '../components/VideoModal';
import { PdfModal } from '../components/PdfModal';
import { FileModal } from '../components/FileModal';
import { TxtModal } from '../components/TxtModal';
import { ExcelModal } from '../components/ExcelModal';
import { PowerPointModal } from '../components/PowerPointModal';
import { WordModal } from '../components/WordModal';

registerLocale('en-GB', enGB);

/**
 * Derives the default match type from the EXACT field in LKP_MAIN_FIELDS.
 * '*T*' → contains (like), 'T' → exact, 'T*' → startsWith
 */
const getDefaultMatchType = (exact: string | undefined): 'like' | 'exact' | 'startsWith' => {
    if (!exact) return 'like';
    const trimmed = exact.trim();
    if (trimmed === '*T*') return 'like';
    if (trimmed === 'T') return 'exact';
    if (trimmed === 'T*') return 'startsWith';
    // Fallback: if it starts and ends with *, contains
    if (trimmed.startsWith('*') && trimmed.endsWith('*')) return 'like';
    if (trimmed.endsWith('*')) return 'startsWith';
    return 'like';
};

const createEmptyRow = (): SearchCriterion => ({
    type: null,
    keyword: '',
    matchType: 'like',
});

function ResearcherPageContent() {
    const { user, logout, isAuthenticated, isLoading: isLoadingUser, currentLang, currentTheme } = useUser();
    const router = useRouter();
    const searchParams = useSearchParams();
    const lang = currentLang;
    const theme = currentTheme;
    const t = useTranslations(lang);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    // Search Form State
    const [searchScope, setSearchScope] = useState<string>("");
    const [searchRows, setSearchRows] = useState<SearchCriterion[]>([createEmptyRow()]);
    const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
    const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
    const [currentPage, setCurrentPage] = useState(1);
    const [isSearchTriggered, setIsSearchTriggered] = useState(false);

    // Committed Search State (only updates on Search click)
    const [committedParams, setCommittedParams] = useState<{
        scope: string;
        criteria: SearchCriterion[];
        dateFrom: Date | undefined;
        dateTo: Date | undefined;
        page: number;
    } | null>(null);

    // Document Modal State
    const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
    const [selectedVideo, setSelectedVideo] = useState<Document | null>(null);
    const [selectedPdf, setSelectedPdf] = useState<Document | null>(null);
    const [selectedFile, setSelectedFile] = useState<Document | null>(null);
    const [selectedTxt, setSelectedTxt] = useState<Document | null>(null);
    const [selectedExcel, setSelectedExcel] = useState<Document | null>(null);
    const [selectedPPT, setSelectedPPT] = useState<Document | null>(null);
    const [selectedWord, setSelectedWord] = useState<Document | null>(null);

    // Data Fetching
    const { data: scopesData, isLoading: isScopesLoading } = useSearchScopes();
    const { data: typesData, isLoading: isTypesLoading } = useSearchTypes(searchScope || undefined);

    const { data: searchData, isFetching: isSearchLoading, error: searchError } = useResearcherMultiSearch({
        scope: committedParams?.scope || '',
        criteria: committedParams?.criteria || [],
        dateFrom: committedParams?.dateFrom,
        dateTo: committedParams?.dateTo,
        page: committedParams?.page || 1,
        enabled: isSearchTriggered && !!committedParams,
    });

    const documents = isSearchTriggered ? (searchData?.documents || []) : [];
    const totalPages = isSearchTriggered ? (searchData?.total_pages || 1) : 1;

    // Authentication Check
    useEffect(() => {
        if (!isAuthenticated && !isLoadingUser) {
            const currentLang = searchParams.get('lang');
            const currentTheme = searchParams.get('theme');
            const params = new URLSearchParams();
            if (currentLang) params.set('lang', currentLang);
            if (currentTheme) params.set('theme', currentTheme);
            params.set('redirect', window.location.pathname + window.location.search);
            const queryString = params.toString();
            router.push(queryString ? `/login?${queryString}` : '/login');
        }
    }, [isAuthenticated, isLoadingUser, router, searchParams]);

    // When scope changes, reset all rows (types will re-filter automatically)
    const handleScopeChange = (newScope: string) => {
        if (isSearchLoading) {
            setIsSearchTriggered(false);
        }
        setSearchScope(newScope);
        setSearchRows([createEmptyRow()]);
        setCurrentPage(1);
    };

    // Row management
    const addRow = () => {
        setSearchRows(prev => [...prev, createEmptyRow()]);
    };

    const removeRow = (index: number) => {
        if (searchRows.length <= 1) return;
        setSearchRows(prev => prev.filter((_, i) => i !== index));
    };

    const updateRow = (index: number, updates: Partial<SearchCriterion>) => {
        setSearchRows(prev => prev.map((row, i) =>
            i === index ? { ...row, ...updates } : row
        ));
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setCurrentPage(1);
        setCommittedParams({
            scope: searchScope,
            criteria: searchRows,
            dateFrom,
            dateTo,
            page: 1,
        });
        setIsSearchTriggered(true);
    };

    const handleSectionChange = (section: string) => {
        if (section === 'recent') router.push('/dashboard');
        if (section === 'favorites') router.push('/favorites');
        if (section === 'folders') router.push('/folders');
    };

    const handleDocumentClick = (doc: Document) => {
        if (doc.media_type === 'zip') return;
        if (doc.media_type === 'video') setSelectedVideo(doc);
        else if (doc.media_type === 'image') setSelectedDoc(doc);
        else if (doc.media_type === 'pdf') setSelectedPdf(doc);
        else if (doc.media_type === 'text') setSelectedTxt(doc);
        else if (doc.media_type === 'excel') setSelectedExcel(doc);
        else if (doc.media_type === 'powerpoint') setSelectedPPT(doc);
        else if (doc.media_type === 'word') setSelectedWord(doc);
        else {
            const ext = doc.docname.split('.').pop()?.toLowerCase();
            const textExtensions = ['txt', 'csv', 'json', 'xml', 'log', 'md', 'yml', 'yaml', 'ini', 'conf'];
            if ((ext && textExtensions.includes(ext)) || !ext) setSelectedTxt(doc);
            else setSelectedFile(doc);
        }
    };

    const API_PROXY_URL = '/api';
    const hasValidRow = searchRows.some(r => r.type !== null);

    if (!isClient) {
        return <div className="min-h-screen flex flex-col h-screen ltr bg-gray-50 dark:bg-gray-900" />;
    }

    if (!isAuthenticated && !isLoadingUser) {
        return null;
    }

    // Show loader while user data is loading (avoids blank screen on refresh)
    if (isLoadingUser || !user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-300 dark:border-gray-600 border-t-red-600 dark:border-t-red-600" />
            </div>
        );
    }

    return (
        <>
            <div className={`flex flex-col h-screen ltr`}>
                <Header
                    onSearch={() => { }}
                    onClearCache={() => { }}
                    apiURL={API_PROXY_URL}
                    onOpenUploadModal={() => { }}
                    isProcessing={false}
                    isEditor={user?.security_level === 'Editor'}
                    t={t}
                    isSidebarOpen={isSidebarOpen}
                    toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                    activeSection="researcher"
                />

                <div className={`flex flex-1 overflow-hidden`}>
                    <Sidebar
                        isSidebarOpen={isSidebarOpen}
                        activeSection="researcher"
                        handleSectionChange={handleSectionChange}
                        isShowingFullMemories={false}
                        t={t}
                        lang={lang}
                    />

                    <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#1f1f1f] text-gray-900 dark:text-gray-100 p-4 sm:p-6 lg:p-8 min-w-0">
                        <div dir="ltr">
                            <h1 className="text-2xl font-bold mb-6">{t('researcher') || 'Profile Search'}</h1>

                            {/* Search Form */}
                            <div className="bg-white dark:bg-[#333] p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
                                <form onSubmit={handleSearch} className="space-y-5">

                                    {/* Search Scope + Date Range — same row */}
                                    <div className="flex flex-wrap items-end gap-4">
                                        <div className="flex flex-col gap-1 min-w-[200px] flex-1 max-w-xs">
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                {t('searchScope') || 'Search Scope'}
                                            </label>
                                            <select
                                                className="p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#444] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={searchScope}
                                                onChange={(e) => handleScopeChange(e.target.value)}
                                            >
                                                <option value="">{t('selectScope') || 'Select Scope'}</option>
                                                {scopesData?.map((scope, idx) => (
                                                    <option key={idx} value={scope.value}>
                                                        {scope.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="flex flex-col gap-1 ml-auto">
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                {t('dateRange') || 'Date Range'}
                                            </label>
                                            <div className="flex gap-2">
                                                <DatePicker
                                                    selected={dateFrom}
                                                    onChange={(date) => setDateFrom(date ?? undefined)}
                                                    selectsStart
                                                    startDate={dateFrom}
                                                    endDate={dateTo}
                                                    className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#444] text-gray-900 dark:text-white"
                                                    placeholderText={t('fromDate') || 'From'}
                                                    dateFormat="yyyy-MM-dd"
                                                />
                                                <DatePicker
                                                    selected={dateTo}
                                                    onChange={(date) => setDateTo(date ?? undefined)}
                                                    selectsEnd
                                                    startDate={dateFrom}
                                                    endDate={dateTo}
                                                    minDate={dateFrom}
                                                    className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#444] text-gray-900 dark:text-white"
                                                    placeholderText={t('toDate') || 'To'}
                                                    dateFormat="yyyy-MM-dd"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Search Criteria Rows */}
                                    <div className="space-y-3">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('searchCriteria') || 'Search Criteria'}
                                        </label>
                                        {searchRows.map((row, idx) => (
                                            <div key={idx} className="flex flex-wrap items-end gap-3 p-3 bg-gray-50 dark:bg-[#2a2a2a] rounded-lg border border-gray-200 dark:border-gray-600">
                                                {/* Search Type */}
                                                <div className="flex flex-col gap-1 min-w-[200px] flex-1">
                                                    <label className="text-xs text-gray-500 dark:text-gray-400">
                                                        {t('searchType') || 'Search Type'}
                                                    </label>
                                                    <select
                                                        className="p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#444] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                                        value={row.type ? JSON.stringify(row.type) : ""}
                                                        onChange={(e) => {
                                                            if (e.target.value) {
                                                                const parsed = JSON.parse(e.target.value) as SearchType;
                                                                const defaultMatch = getDefaultMatchType(parsed.value.exact);
                                                                updateRow(idx, { type: parsed, matchType: defaultMatch });
                                                            } else {
                                                                updateRow(idx, { type: null, matchType: 'like' });
                                                            }
                                                        }}
                                                        disabled={isTypesLoading}
                                                    >
                                                        <option value="">{t('selectType') || 'Select Type'}</option>
                                                        {typesData
                                                            ?.filter(type => {
                                                                // Exclude types already selected in OTHER rows
                                                                const selectedInOtherRows = searchRows
                                                                    .filter((_, i) => i !== idx)
                                                                    .map(r => r.type?.value.field_name);
                                                                return !selectedInOtherRows.includes(type.value.field_name);
                                                            })
                                                            .map((type, typeIdx) => (
                                                                <option key={typeIdx} value={JSON.stringify(type)}>
                                                                    {type.label}
                                                                </option>
                                                            ))}
                                                    </select>
                                                </div>

                                                {/* Keyword */}
                                                <div className="flex flex-col gap-1 min-w-[180px] flex-1">
                                                    <label className="text-xs text-gray-500 dark:text-gray-400">
                                                        {t('keyword') || 'Keyword'}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#444] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                                        placeholder={t('enterKeyword') || 'Enter keyword...'}
                                                        value={row.keyword}
                                                        onChange={(e) => updateRow(idx, { keyword: e.target.value })}
                                                    />
                                                </div>

                                                {/* Match Type */}
                                                <div className="flex flex-col gap-1 min-w-[130px]">
                                                    <label className="text-xs text-gray-500 dark:text-gray-400">
                                                        {t('matchType') || 'Match Type'}
                                                    </label>
                                                    <select
                                                        className="p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#444] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                                        value={row.matchType}
                                                        onChange={(e) => updateRow(idx, { matchType: e.target.value as any })}
                                                    >
                                                        <option value="like">{t('matchContains') || 'Contains'}</option>
                                                        <option value="exact">{t('matchExact') || 'Exact Match'}</option>
                                                        <option value="startsWith">{t('matchStartsWith') || 'Starts With'}</option>
                                                    </select>
                                                </div>

                                                {/* Remove Row Button */}
                                                <button
                                                    type="button"
                                                    onClick={() => removeRow(idx)}
                                                    disabled={searchRows.length <= 1}
                                                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition disabled:opacity-30 disabled:cursor-not-allowed self-end"
                                                    title={t('removeRow') || 'Remove row'}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}

                                        {/* Add Row + Search Button row */}
                                        <div className="flex items-center justify-between pt-1">
                                            <button
                                                type="button"
                                                onClick={addRow}
                                                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                                </svg>
                                                {t('addSearchRow') || 'Add Search Row'}
                                            </button>

                                            <button
                                                type="submit"
                                                disabled={!hasValidRow || isSearchLoading}
                                                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded transition disabled:opacity-50 disabled:cursor-not-allowed h-10"
                                            >
                                                {isSearchLoading ? (t('searching') || 'Searching...') : (t('search') || 'Search')}
                                            </button>
                                        </div>
                                    </div>

                                </form>
                            </div>

                            {/* Results */}
                            {isSearchLoading ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8">
                                    {Array.from({ length: 10 }).map((_, index) => (
                                        <DocumentItemSkeleton key={index} />
                                    ))}
                                </div>
                            ) : documents.length > 0 ? (
                                <>
                                    <DocumentList
                                        documents={documents}
                                        onDocumentClick={handleDocumentClick}
                                        apiURL={API_PROXY_URL}
                                        onTagSelect={() => { }}
                                        isLoading={false}
                                        processingDocs={[]}
                                        lang={lang}
                                        t={t}
                                    />
                                    {totalPages > 1 && (
                                        <Pagination
                                            currentPage={currentPage}
                                            totalPages={totalPages}
                                            onPageChange={(page: number) => {
                                                setCurrentPage(page);
                                                if (committedParams) {
                                                    setCommittedParams({ ...committedParams, page });
                                                }
                                            }}
                                            t={t}
                                        />
                                    )}
                                </>
                            ) : isSearchTriggered ? (
                                <p className="text-center text-gray-500 dark:text-gray-400 py-10">
                                    {t('noDocumentsFound') || 'No documents found matching your criteria.'}
                                </p>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                    <img src="/search-icon.svg" className="w-16 h-16 mb-4 opacity-50 dark:invert" alt="" />
                                    <p>{t('startSearchPrompt') || 'Select a scope and type to begin searching.'}</p>
                                </div>
                            )}
                        </div>
                    </main>
                </div>

                {/* Modals */}
                {selectedDoc && <ImageModal doc={selectedDoc} onClose={() => setSelectedDoc(null)} apiURL={API_PROXY_URL} onUpdateAbstractSuccess={() => { }} isEditor={user?.security_level === 'Editor'} t={t} lang={lang} theme={theme} />}
                {selectedVideo && <VideoModal doc={selectedVideo} onClose={() => setSelectedVideo(null)} apiURL={API_PROXY_URL} onUpdateAbstractSuccess={() => { }} isEditor={user?.security_level === 'Editor'} t={t} lang={lang} theme={theme} />}
                {selectedPdf && <PdfModal doc={selectedPdf} onClose={() => setSelectedPdf(null)} apiURL={API_PROXY_URL} onUpdateAbstractSuccess={() => { }} isEditor={user?.security_level === 'Editor'} t={t} lang={lang} theme={theme} />}
                {selectedFile && <FileModal doc={selectedFile} onClose={() => setSelectedFile(null)} apiURL={API_PROXY_URL} onUpdateAbstractSuccess={() => { }} isEditor={user?.security_level === 'Editor'} t={t} lang={lang} theme={theme} />}
                {selectedTxt && <TxtModal doc={selectedTxt} onClose={() => setSelectedTxt(null)} apiURL={API_PROXY_URL} onUpdateAbstractSuccess={() => { }} isEditor={user?.security_level === 'Editor'} t={t} lang={lang} theme={theme} />}
                {selectedExcel && <ExcelModal doc={selectedExcel} onClose={() => setSelectedExcel(null)} apiURL={API_PROXY_URL} onUpdateAbstractSuccess={() => { }} isEditor={user?.security_level === 'Editor'} t={t} lang={lang} theme={theme} />}
                {selectedPPT && <PowerPointModal doc={selectedPPT} onClose={() => setSelectedPPT(null)} apiURL={API_PROXY_URL} onUpdateAbstractSuccess={() => { }} isEditor={user?.security_level === 'Editor'} t={t} lang={lang} theme={theme} />}
                {selectedWord && <WordModal doc={selectedWord} onClose={() => setSelectedWord(null)} apiURL={API_PROXY_URL} onUpdateAbstractSuccess={() => { }} isEditor={user?.security_level === 'Editor'} t={t} lang={lang} theme={theme} />}
            </div>
        </>
    );
}

export default function ResearcherPage() {
    return (
        <Suspense>
            <ResearcherPageContent />
        </Suspense>
    );
}
