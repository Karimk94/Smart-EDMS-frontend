"use client";

import { enGB } from 'date-fns/locale/en-GB';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { SearchCriterion, SearchType, useProfileMultiSearch, useProfileSearchScopes, useProfileSearchTypes } from '../../hooks/useProfileSearch';
import { useDocumentGroups } from '../../hooks/useDocumentGroups';
import { useUserPreferences } from '../../hooks/useUserPreferences';
import { Document } from '../../models/Document';
import { DocumentItemSkeleton } from '../components/DocumentItemSkeleton';
import { DocumentList } from '../components/DocumentList';
import { Header } from '../components/Header';
import { Pagination } from '../components/Pagination';
import { Sidebar } from '../components/Sidebar';
import { PageSpinner, Spinner } from '../components/Spinner';
import { useUser } from '../context/UserContext';
import { useTranslations } from '../hooks/useTranslations';

// Lazy-loaded modal components — only loaded when a user opens a document
const ExcelModal = React.lazy(() => import('../components/ExcelModal').then(m => ({ default: m.ExcelModal })));
const FileModal = React.lazy(() => import('../components/FileModal').then(m => ({ default: m.FileModal })));
const ImageModal = React.lazy(() => import('../components/ImageModal').then(m => ({ default: m.ImageModal })));
const PdfModal = React.lazy(() => import('../components/PdfModal').then(m => ({ default: m.PdfModal })));
const PowerPointModal = React.lazy(() => import('../components/PowerPointModal').then(m => ({ default: m.PowerPointModal })));
const TxtModal = React.lazy(() => import('../components/TxtModal').then(m => ({ default: m.TxtModal })));
const VideoModal = React.lazy(() => import('../components/VideoModal').then(m => ({ default: m.VideoModal })));
const WordModal = React.lazy(() => import('../components/WordModal').then(m => ({ default: m.WordModal })));

const ModalLoadingFallback = () => (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
        <Spinner size="lg" />
    </div>
);

registerLocale('en-GB', enGB);

/**
 * Derives the default match type from the EXACT field in LKP_MAIN_FIELDS.
 * '*T*' → contains (like), 'T' → exact, 'T*' → startsWith
 */
const STANDARD_COLUMNS = [
    { id: 'name', label: 'Name', arLabel: 'الاسم' },
    { id: 'doc_id', label: 'Doc #', arLabel: 'رقم المستند' },
    { id: 'type', label: 'Type', arLabel: 'النوع' },
    { id: 'date', label: 'Date', arLabel: 'التاريخ' },
    { id: 'typist', label: 'Typist', arLabel: 'الكاتب' },
];

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

function ProfileSearchPageContent() {
    const { user, logout, isAuthenticated, isLoading: isLoadingUser, currentLang, currentTheme, allowedSections, writableSections } = useUser();
    const router = useRouter();
    const searchParams = useSearchParams();
    const lang = currentLang;
    const theme = currentTheme;
    const t = useTranslations(lang);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isClient, setIsClient] = useState(false);

    // Compute hidden sections from allowed sections
    const allSections: ('recent' | 'favorites' | 'folders' | 'profilesearch')[] = ['recent', 'favorites', 'folders', 'profilesearch'];
    const hiddenSections = allSections.filter(s => !allowedSections.includes(s));

    // Determine if profilesearch is writable
    const isEditor = writableSections.includes('profilesearch');

    useEffect(() => {
        setIsClient(true);
    }, []);

    // Route guard: if profilesearch is not allowed for user, redirect to portal
    useEffect(() => {
        if (user && !isLoadingUser && !allowedSections.includes('profilesearch')) {
            router.push('/');
        }
    }, [user, isLoadingUser, allowedSections, router]);

    // View Mode Preference (Grid vs List) with DB persistence (separate for Profile Search)
    const { updateProfileViewMode, isUpdatingProfileViewMode } = useUserPreferences();
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    useEffect(() => {
        if (user?.profile_view_mode) {
            setViewMode(user.profile_view_mode as 'grid' | 'list');
        } else {
            const saved = localStorage.getItem('profile_view_mode') as 'grid' | 'list';
            if (saved) setViewMode(saved);
        }
    }, [user?.profile_view_mode]);

    const handleToggleViewMode = async (mode: 'grid' | 'list') => {
        setViewMode(mode);
        try {
            await updateProfileViewMode(mode);
        } catch (error) {
            console.error("Failed to update profile view mode:", error);
        }
    };

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
    const { data: scopesData, isLoading: isScopesLoading } = useProfileSearchScopes();
    const { data: typesData, isLoading: isTypesLoading } = useProfileSearchTypes(searchScope || undefined);

    // Merge duplicate scopes by label, combining their values
    const mergedScopes = useMemo(() => {
        if (!scopesData) return [];
        const scopeMap = scopesData.reduce((acc, scope) => {
            if (acc[scope.label]) {
                // Combine and deduplicate values
                const existingValues = acc[scope.label].value.split(',');
                const newValues = scope.value.split(',');
                const combined = [...new Set([...existingValues, ...newValues])];
                acc[scope.label].value = combined.join(',');
            } else {
                acc[scope.label] = { ...scope };
            }
            return acc;
        }, {} as Record<string, { label: string; value: string }>);
        return Object.values(scopeMap);
    }, [scopesData]);

    // Column Customization State (similar to eDocs DM Explorer)
    const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({});
    const [isColumnPickerOpen, setIsColumnPickerOpen] = useState(false);
    const columnPickerRef = useRef<HTMLDivElement>(null);

    // Available form columns from typesData
    const formAvailableColumns = useMemo(() => {
        if (!typesData) return [];
        return typesData
            .filter(t => !['DOCNUMBER', 'DOCNAME'].includes(t.value.field_name.toUpperCase()))
            .map(t => ({
                id: t.value.display_field || t.value.field_name,
                fieldName: t.value.field_name,
                displayField: t.value.display_field || t.value.field_name,
                label: t.value.type_name_en || t.label,
                arLabel: t.label,
            }));
    }, [typesData]);

    // Load persisted column selections when scope changes
    useEffect(() => {
        const storageKey = `ps_cols_${searchScope || 'all'}`;
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            try {
                setVisibleColumns(JSON.parse(saved));
            } catch {
                setVisibleColumns({});
            }
        } else {
            setVisibleColumns({});
        }
    }, [searchScope]);

    // Close column picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (columnPickerRef.current && !columnPickerRef.current.contains(e.target as Node)) {
                setIsColumnPickerOpen(false);
            }
        };
        if (isColumnPickerOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isColumnPickerOpen]);

    const toggleColumn = (colId: string, isChecked: boolean) => {
        setVisibleColumns(prev => {
            const updated = { ...prev, [colId]: isChecked };
            const storageKey = `ps_cols_${searchScope || 'all'}`;
            localStorage.setItem(storageKey, JSON.stringify(updated));
            return updated;
        });
    };

    const resetColumnsToDefault = () => {
        setVisibleColumns({});
        const storageKey = `ps_cols_${searchScope || 'all'}`;
        localStorage.removeItem(storageKey);
    };

    const isColumnVisible = useCallback((colId: string, isStandard = true) => {
        if (visibleColumns[colId] !== undefined) {
            return visibleColumns[colId];
        }
        if (isStandard) return true;
        // Form columns: show if in active search criteria
        return committedParams?.criteria?.some(c => 
            c.type?.value.field_name === colId || c.type?.value.display_field === colId
        ) ?? false;
    }, [visibleColumns, committedParams?.criteria]);

    const visibleFormColumns = useMemo(() => {
        return formAvailableColumns.filter(col => isColumnVisible(col.id, false));
    }, [formAvailableColumns, isColumnVisible]);

    const requestedExtraColumns = useMemo(() => {
        return visibleFormColumns.map(col => col.displayField);
    }, [visibleFormColumns]);

    const { data: searchData, isFetching: isSearchLoading, error: searchError } = useProfileMultiSearch({
        scope: committedParams?.scope || '',
        criteria: committedParams?.criteria || [],
        dateFrom: committedParams?.dateFrom,
        dateTo: committedParams?.dateTo,
        page: committedParams?.page || 1,
        extraColumns: requestedExtraColumns,
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

    // Route protection: redirect if user doesn't have access to profilesearch
    useEffect(() => {
        if (user && !isLoadingUser && !allowedSections.includes('profilesearch')) {
            router.push('/dashboard');
        }
    }, [user, isLoadingUser, allowedSections, router]);

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
        const ext = doc.docname.split('.').pop()?.toLowerCase();
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'heic', 'heif'];
        const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'hevc', 'm4v'];

        if (doc.media_type === 'video' || (ext && videoExtensions.includes(ext))) setSelectedVideo(doc);
        else if (doc.media_type === 'image' || (ext && imageExtensions.includes(ext))) setSelectedDoc(doc);
        else if (doc.media_type === 'pdf' || ext === 'pdf') setSelectedPdf(doc);
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

    // Document groups for collage/navigation support
    const { getNextDocumentInGroup, getPreviousDocumentInGroup, getDocumentIndexInGroup, isGrouped } = useDocumentGroups(documents);

    // Navigation helpers for modals
    const createNavigationHandlers = (selectedDoc: Document | null, setSelectedDoc: (doc: Document | null) => void) => {
        if (!selectedDoc) {
            return {
                onNavigateNext: undefined,
                onNavigatePrevious: undefined,
                canNavigateNext: false,
                canNavigatePrevious: false,
                currentDocIndex: 0,
                totalInGroup: 1,
                isGrouped: false,
            };
        }

        const nextDoc = getNextDocumentInGroup(selectedDoc.docname, selectedDoc.doc_id);
        const prevDoc = getPreviousDocumentInGroup(selectedDoc.docname, selectedDoc.doc_id);
        const currentIndex = getDocumentIndexInGroup(selectedDoc.docname, selectedDoc.doc_id);
        const groupDocs = documents.filter(d => d.docname === selectedDoc.docname);

        return {
            onNavigateNext: nextDoc ? () => setSelectedDoc(nextDoc) : undefined,
            onNavigatePrevious: prevDoc ? () => setSelectedDoc(prevDoc) : undefined,
            canNavigateNext: !!nextDoc,
            canNavigatePrevious: !!prevDoc,
            currentDocIndex: currentIndex >= 0 ? currentIndex : 0,
            totalInGroup: groupDocs.length,
            isGrouped: isGrouped(selectedDoc.docname),
        };
    };

    // Get search term for highlighting (first active criterion)
    const getSearchContext = (doc?: Document | null) => {
        if (!committedParams || committedParams.criteria.length === 0) {
            return { searchTerm: undefined, searchMatchType: undefined, searchMatchField: undefined, searchFieldValue: undefined };
        }
        
        const firstCriterion = committedParams.criteria.find(c => c.type && c.keyword);
        if (!firstCriterion) {
            return { searchTerm: undefined, searchMatchType: undefined, searchMatchField: undefined, searchFieldValue: undefined };
        }

        return {
            searchTerm: doc?.searchMatchValue || firstCriterion.keyword,
            searchMatchType: firstCriterion.matchType,
            searchMatchField: doc?.searchMatchField || firstCriterion.type?.value.display_field || undefined,
            searchFieldValue: doc?.searchFieldValue || undefined,
        };
    };

    // Extract dynamic form-specific columns from committed search criteria
    const formCriteriaFields = useMemo(() => {
        if (!committedParams?.criteria) return [];
        return committedParams.criteria
            .filter(c => c.type && c.type.value.field_name && !['DOCNUMBER', 'DOCNAME'].includes(c.type.value.field_name.toUpperCase()))
            .map(c => ({
                fieldName: c.type!.value.field_name,
                displayField: c.type!.value.display_field || c.type!.value.field_name,
                label: c.type!.label,
                englishLabel: c.type!.value.type_name_en,
            }));
    }, [committedParams?.criteria]);

    // Active form scope label for header display
    const activeScopeLabel = useMemo(() => {
        if (!committedParams?.scope || committedParams.scope === '0') return '';
        const found = mergedScopes.find(s => s.value === committedParams.scope);
        return found ? found.label : committedParams.scope;
    }, [committedParams?.scope, mergedScopes]);

    const renderDocumentIcon = (mediaType: string, customSize = 20) => {
        const iconMap: Record<string, string> = {
            image: '/file-image.svg',
            video: '/file-video.svg',
            excel: '/file-excel.svg',
            pdf: '/file-pdf.svg',
            powerpoint: '/file-powerpoint.svg',
            word: '/file-word.svg',
            zip: '/file-zip.svg',
            audio: '/file-audio.svg',
            cad: '/file-cad.svg',
            code: '/file-code.svg',
            email: '/file-email.svg',
            font: '/file-font.svg',
            database: '/file-database.svg',
            vector: '/file-vector.svg',
            archive: '/file-archive.svg',
            executable: '/file-executable.svg',
            disc: '/file-disc.svg',
            visio: '/file-visio.svg',
            onenote: '/file-onenote.svg',
            text: '/file-document.svg',
            file: '/file-document.svg',
        };
        const src = iconMap[mediaType] || '/file-document.svg';
        return <Image src={src} alt={mediaType} width={customSize} height={customSize} className="flex-shrink-0" />;
    };

    const getMediaTypeBadge = (mediaType: string) => {
        const colorMap: Record<string, string> = {
            pdf: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800',
            word: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800',
            excel: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
            powerpoint: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800',
            image: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800',
            video: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-400 dark:border-pink-800',
            zip: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
        };
        const badgeClass = colorMap[mediaType] || 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
        return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border uppercase tracking-wider ${badgeClass}`}>
                {mediaType}
            </span>
        );
    };

    const API_PROXY_URL = '/api';
    const hasValidRow = searchRows.some(r => r.type !== null && r.keyword.trim().length > 0);

    if (!isClient) {
        return <div className="min-h-screen flex flex-col h-screen ltr bg-gray-50 dark:bg-gray-900" />;
    }

    if (!isAuthenticated && !isLoadingUser) {
        return null;
    }

    // Show loader while user data is loading (avoids blank screen on refresh)
    if (isLoadingUser || !user) {
        return (
            <PageSpinner />
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
                    isEditor={isEditor}
                    t={t}
                    isSidebarOpen={isSidebarOpen}
                    toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                    activeSection="profilesearch"
                />

                <div className={`flex flex-1 overflow-hidden`}>
                    <Sidebar
                        isSidebarOpen={isSidebarOpen}
                        activeSection="profilesearch"
                        handleSectionChange={handleSectionChange}
                        isShowingFullMemories={false}
                        t={t}
                        lang={lang}
                        hiddenSections={hiddenSections}
                    />

                    <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#1f1f1f] text-gray-900 dark:text-gray-100 p-4 sm:p-6 lg:p-8 min-w-0">
                        <div dir="ltr">
                            <h1 className="text-2xl font-bold mb-6">{t('profilesearch') || 'Profile Search'}</h1>

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
                                                {mergedScopes?.map((scope, idx) => (
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
                                                    <Image src="/icons/trash.svg" alt="" width={20} height={20} className="h-5 w-5 dark:invert" />
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
                                                <Image src="/icons/plus.svg" alt="" width={16} height={16} className="h-4 w-4 dark:invert" />
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

                            {/* Results Header: Count + Active Form Scope + Column Chooser + View Mode Toggles */}
                            {documents.length > 0 && !isSearchLoading && (
                                <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-white dark:bg-[#333] p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <div className="flex items-center gap-2 flex-wrap text-sm text-gray-600 dark:text-gray-300">
                                        <span>
                                            {lang === 'ar' ? 'تم العثور على' : 'Found'} <strong className="text-gray-900 dark:text-white font-semibold">{documents.length}</strong> {lang === 'ar' ? 'مستند' : 'documents'}
                                        </span>
                                        {activeScopeLabel && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                                <span className="opacity-75 mr-1 font-normal">{lang === 'ar' ? 'النموذج:' : 'Form:'}</span> {activeScopeLabel}
                                            </span>
                                        )}
                                    </div>

                                    {/* Action buttons: Customize Columns (List view) + View Mode Toggle */}
                                    <div className="flex items-center gap-2">
                                        {/* Column Chooser Popover (like eDocs DM Explorer) */}
                                        {viewMode === 'list' && (
                                            <div className="relative" ref={columnPickerRef}>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsColumnPickerOpen(prev => !prev)}
                                                    className={`px-2.5 py-1.5 rounded-md transition flex items-center gap-1.5 text-xs font-medium border ${isColumnPickerOpen ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border-blue-400 dark:border-blue-600 shadow-sm' : 'bg-white dark:bg-[#444] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                                    title={lang === 'ar' ? 'إضافة أو إزالة الأعمدة' : 'Add or remove columns'}
                                                >
                                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7m0-18H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7m0-18v18"/></svg>
                                                    <span>{lang === 'ar' ? 'الأعمدة' : 'Columns'}</span>
                                                    <span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                                                        {STANDARD_COLUMNS.filter(c => isColumnVisible(c.id, true)).length + visibleFormColumns.length}
                                                    </span>
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                                </button>

                                                {isColumnPickerOpen && (
                                                    <div 
                                                        className="absolute right-0 mt-2 w-72 bg-white dark:bg-[#2a2a2a] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-3 px-4 z-40"
                                                    >
                                                        <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-gray-200 dark:border-gray-700">
                                                            <div className="flex items-center gap-1.5">
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7m0-18H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7m0-18v18"/></svg>
                                                                <span className="font-semibold text-xs text-gray-800 dark:text-gray-200">
                                                                    {lang === 'ar' ? 'تخصيص الأعمدة' : 'Customize Columns'}
                                                                </span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={resetColumnsToDefault}
                                                                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 font-medium hover:underline"
                                                            >
                                                                {lang === 'ar' ? 'إعادة ضبط' : 'Reset'}
                                                            </button>
                                                        </div>

                                                        {/* Standard Columns */}
                                                        <div className="mb-3">
                                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                                                                {lang === 'ar' ? 'الخصائص القياسية (Standard)' : 'Standard Properties'}
                                                            </span>
                                                            <div className="space-y-1">
                                                                {STANDARD_COLUMNS.map(col => (
                                                                    <label key={col.id} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/60 px-2 py-1 rounded transition select-none">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isColumnVisible(col.id, true)}
                                                                            onChange={(e) => toggleColumn(col.id, e.target.checked)}
                                                                            className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer"
                                                                        />
                                                                        <span>{lang === 'ar' ? col.arLabel : col.label}</span>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Form-Specific Columns */}
                                                        {formAvailableColumns.length > 0 && (
                                                            <div>
                                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                                                                    {lang === 'ar' ? 'حقول النموذج (Form Fields)' : 'Form Fields'}
                                                                </span>
                                                                <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                                                    {formAvailableColumns.map(col => (
                                                                        <label key={col.id} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/60 px-2 py-1 rounded transition select-none">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isColumnVisible(col.id, false)}
                                                                                onChange={(e) => toggleColumn(col.id, e.target.checked)}
                                                                                className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer"
                                                                            />
                                                                            <span className="truncate" title={lang === 'ar' ? col.arLabel : col.label}>
                                                                                {lang === 'ar' ? col.arLabel : col.label}
                                                                            </span>
                                                                        </label>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* View Mode Toggle (Grid vs List) */}
                                        <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1 border border-gray-200 dark:border-gray-600">
                                            <button
                                                type="button"
                                                onClick={() => handleToggleViewMode('grid')}
                                                disabled={isUpdatingProfileViewMode}
                                                className={`p-1.5 rounded-md transition flex items-center gap-1.5 text-xs font-medium ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
                                                title={t('gridView') || 'Grid View'}
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                                                <span className="hidden sm:inline">{t('gridView') || 'Grid'}</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleToggleViewMode('list')}
                                                disabled={isUpdatingProfileViewMode}
                                                className={`p-1.5 rounded-md transition flex items-center gap-1.5 text-xs font-medium ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
                                                title={t('listView') || 'List View'}
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                                                <span className="hidden sm:inline">{t('listView') || 'List'}</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Results */}
                            {isSearchLoading ? (
                                viewMode === 'grid' ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8">
                                        {Array.from({ length: 10 }).map((_, index) => (
                                            <DocumentItemSkeleton key={index} />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-[#1a1a1a] p-12 items-center justify-center">
                                        <Spinner size="lg" />
                                        <span className="text-sm text-gray-500 dark:text-gray-400 mt-3">{t('searching') || 'Searching...'}</span>
                                    </div>
                                )
                            ) : documents.length > 0 ? (
                                <>
                                    {viewMode === 'grid' ? (
                                        <DocumentList
                                            documents={documents}
                                            onDocumentClick={handleDocumentClick}
                                            apiURL={API_PROXY_URL}
                                            onTagSelect={() => { }}
                                            isLoading={false}
                                            processingDocs={[]}
                                            enableCollage={true}
                                            showFavoriteButton={false}
                                            lang={lang}
                                            t={t}
                                        />
                                    ) : (
                                        <div className="flex flex-col border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-[#1a1a1a] shadow-sm mb-6">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left border-collapse text-sm">
                                                    <thead className="bg-gray-50 dark:bg-[#252525] border-b border-gray-200 dark:border-gray-700">
                                                        <tr>
                                                            {isColumnVisible('name', true) && (
                                                                <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">{lang === 'ar' ? 'الاسم' : 'Name'}</th>
                                                            )}
                                                            {isColumnVisible('doc_id', true) && (
                                                                <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 w-28">{lang === 'ar' ? 'رقم المستند' : 'Doc #'}</th>
                                                            )}
                                                            {isColumnVisible('type', true) && (
                                                                <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 w-28">{lang === 'ar' ? 'النوع' : 'Type'}</th>
                                                            )}
                                                            {isColumnVisible('date', true) && (
                                                                <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 w-36">{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                                                            )}
                                                            {isColumnVisible('typist', true) && (
                                                                <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 w-32">{lang === 'ar' ? 'الكاتب' : 'Typist'}</th>
                                                            )}
                                                            {/* Dynamic Form-Specific Columns */}
                                                            {visibleFormColumns.map((col) => (
                                                                <th key={col.id} className="px-4 py-3 font-semibold text-blue-600 dark:text-blue-400 w-44 whitespace-nowrap">
                                                                    {lang === 'ar' ? col.arLabel : col.label}
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                                        {documents.map((doc) => {
                                                            const displayName = doc.docname || doc.title || `Document ${doc.doc_id}`;
                                                            return (
                                                                <tr
                                                                    key={doc.doc_id}
                                                                    onClick={() => handleDocumentClick(doc)}
                                                                    className="group cursor-pointer hover:bg-blue-50/50 dark:hover:bg-[#2c2c2c] transition-colors"
                                                                >
                                                                    {isColumnVisible('name', true) && (
                                                                        <td className="px-4 py-3 flex items-center gap-3">
                                                                            <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                                                                                {renderDocumentIcon(doc.media_type)}
                                                                            </div>
                                                                            <span className="font-medium text-gray-800 dark:text-gray-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" title={displayName}>
                                                                                {displayName}
                                                                            </span>
                                                                        </td>
                                                                    )}
                                                                    {isColumnVisible('doc_id', true) && (
                                                                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap font-mono text-xs">
                                                                            #{doc.doc_id}
                                                                        </td>
                                                                    )}
                                                                    {isColumnVisible('type', true) && (
                                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                                            {getMediaTypeBadge(doc.media_type)}
                                                                        </td>
                                                                    )}
                                                                    {isColumnVisible('date', true) && (
                                                                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">
                                                                            {doc.date || '--'}
                                                                        </td>
                                                                    )}
                                                                    {isColumnVisible('typist', true) && (
                                                                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">
                                                                            {doc.typist || '--'}
                                                                        </td>
                                                                    )}
                                                                    {/* Dynamic Form Values */}
                                                                    {visibleFormColumns.map((col) => {
                                                                        const val = doc.form_values?.[col.displayField] 
                                                                            || doc.form_values?.[col.fieldName] 
                                                                            || (doc.display_value && (committedParams?.criteria?.[0]?.type?.value.field_name === col.fieldName || committedParams?.criteria?.[0]?.type?.value.display_field === col.displayField) ? doc.display_value : undefined);
                                                                        return (
                                                                            <td key={col.id} className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap text-xs">
                                                                                {val || '--'}
                                                                            </td>
                                                                        );
                                                                    })}
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
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
                                    <Image src="/search-icon.svg" width={64} height={64} className="mb-4 opacity-50 dark:invert" alt="" />
                                    <p>{t('startSearchPrompt') || 'Select a scope and type to begin searching.'}</p>
                                </div>
                            )}
                        </div>
                    </main>
                </div>

                {/* Modals — lazy-loaded with Suspense */}
                <Suspense fallback={<ModalLoadingFallback />}>
                {selectedDoc && (() => {
                    const navHandlers = createNavigationHandlers(selectedDoc, setSelectedDoc);
                    const searchContext = getSearchContext(selectedDoc);
                    return <ImageModal 
                        doc={selectedDoc} 
                        onClose={() => setSelectedDoc(null)} 
                        apiURL={API_PROXY_URL} 
                        onUpdateAbstractSuccess={() => { }} 
                        isEditor={isEditor} 
                        t={t} 
                        lang={lang} 
                        theme={theme}
                        {...navHandlers}
                        {...searchContext}
                    />;
                })()}
                {selectedVideo && (() => {
                    const navHandlers = createNavigationHandlers(selectedVideo, setSelectedVideo);
                    const searchContext = getSearchContext(selectedVideo);
                    return <VideoModal 
                        doc={selectedVideo} 
                        onClose={() => setSelectedVideo(null)} 
                        apiURL={API_PROXY_URL} 
                        onUpdateAbstractSuccess={() => { }} 
                        isEditor={isEditor} 
                        t={t} 
                        lang={lang} 
                        theme={theme}
                        {...navHandlers}
                        {...searchContext}
                    />;
                })()}
                {selectedPdf && (() => {
                    const navHandlers = createNavigationHandlers(selectedPdf, setSelectedPdf);
                    const searchContext = getSearchContext(selectedPdf);
                    return <PdfModal 
                        doc={selectedPdf} 
                        onClose={() => setSelectedPdf(null)} 
                        apiURL={API_PROXY_URL} 
                        onUpdateAbstractSuccess={() => { }} 
                        isEditor={isEditor} 
                        t={t} 
                        lang={lang} 
                        theme={theme}
                        {...navHandlers}
                        {...searchContext}
                    />;
                })()}
                {selectedFile && (() => {
                    const navHandlers = createNavigationHandlers(selectedFile, setSelectedFile);
                    const searchContext = getSearchContext(selectedFile);
                    return <FileModal 
                        doc={selectedFile} 
                        onClose={() => setSelectedFile(null)} 
                        apiURL={API_PROXY_URL} 
                        onUpdateAbstractSuccess={() => { }} 
                        isEditor={isEditor} 
                        t={t} 
                        lang={lang} 
                        theme={theme}
                        {...navHandlers}
                        {...searchContext}
                    />;
                })()}
                {selectedTxt && (() => {
                    const navHandlers = createNavigationHandlers(selectedTxt, setSelectedTxt);
                    const searchContext = getSearchContext(selectedTxt);
                    return <TxtModal 
                        doc={selectedTxt} 
                        onClose={() => setSelectedTxt(null)} 
                        apiURL={API_PROXY_URL} 
                        onUpdateAbstractSuccess={() => { }} 
                        isEditor={isEditor} 
                        t={t} 
                        lang={lang} 
                        theme={theme}
                        {...navHandlers}
                        {...searchContext}
                    />;
                })()}
                {selectedExcel && (() => {
                    const navHandlers = createNavigationHandlers(selectedExcel, setSelectedExcel);
                    const searchContext = getSearchContext(selectedExcel);
                    return <ExcelModal 
                        doc={selectedExcel} 
                        onClose={() => setSelectedExcel(null)} 
                        apiURL={API_PROXY_URL} 
                        onUpdateAbstractSuccess={() => { }} 
                        isEditor={isEditor} 
                        t={t} 
                        lang={lang} 
                        theme={theme}
                        {...navHandlers}
                        {...searchContext}
                    />;
                })()}
                {selectedPPT && (() => {
                    const navHandlers = createNavigationHandlers(selectedPPT, setSelectedPPT);
                    const searchContext = getSearchContext(selectedPPT);
                    return <PowerPointModal 
                        doc={selectedPPT} 
                        onClose={() => setSelectedPPT(null)} 
                        apiURL={API_PROXY_URL} 
                        onUpdateAbstractSuccess={() => { }} 
                        isEditor={isEditor} 
                        t={t} 
                        lang={lang} 
                        theme={theme}
                        {...navHandlers}
                        {...searchContext}
                    />;
                })()}
                {selectedWord && (() => {
                    const navHandlers = createNavigationHandlers(selectedWord, setSelectedWord);
                    const searchContext = getSearchContext(selectedWord);
                    return <WordModal 
                        doc={selectedWord} 
                        onClose={() => setSelectedWord(null)} 
                        apiURL={API_PROXY_URL} 
                        onUpdateAbstractSuccess={() => { }} 
                        isEditor={isEditor} 
                        t={t} 
                        lang={lang} 
                        theme={theme}
                        {...navHandlers}
                        {...searchContext}
                    />;
                })()}
                </Suspense>
            </div>
        </>
    );
}

export default function ProfileSearchPage() {
    return (
        <Suspense>
            <ProfileSearchPageContent />
        </Suspense>
    );
}
