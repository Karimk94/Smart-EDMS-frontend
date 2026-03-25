"use client";

import { useQueryClient } from '@tanstack/react-query';
import { enGB } from 'date-fns/locale/en-GB';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { registerLocale } from 'react-datepicker';
import { useDocuments } from '../../hooks/useDocuments';
import { useDocumentModals } from '../../hooks/useDocumentModals';
import { useProcessingStatus } from '../../hooks/useProcessingStatus';
import { UploadableFile } from '../../interfaces';
import { PersonOption } from '../../models/PersonOption';
import { useToast } from '../context/ToastContext';
import { useUser } from '../context/UserContext';
import { useTranslations } from '../hooks/useTranslations';
import { useClearCache, useProcessDocuments } from '../../hooks/useSystemOperations';
import { ClearCacheModal } from './ClearCacheModal';
import { DocumentItemSkeleton } from './DocumentItemSkeleton';
import { DocumentList } from './DocumentList';
import { DocumentModals } from './DocumentModals';
import { FilterBar } from './FilterBar';
import { Folders } from './Folders';
import { FolderUploadModal } from './FolderUploadModal';
import { Header } from './Header';
import { Pagination } from './Pagination';
import { Sidebar } from './Sidebar';
import { UploadModal } from './UploadModal';

type ActiveSection = 'recent' | 'favorites' | 'folders' | 'profilesearch';

registerLocale('en-GB', enGB);

interface MainDashboardProps {
    initialSection?: ActiveSection;
    initialFolderId?: string | null;
}

export function MainDashboard({ initialSection = 'recent', initialFolderId = null }: MainDashboardProps) {
    const { user, logout, isAuthenticated, isLoading: isLoadingUser, currentLang, currentTheme, allowedSections, writableSections } = useUser();

    // Compute hidden sections from allowed sections
    const allSections: ActiveSection[] = ['recent', 'favorites', 'folders', 'profilesearch'];
    const hiddenSections = allSections.filter(s => !allowedSections.includes(s));

    // Determine if current section is writable
    const isSectionWritable = (section: ActiveSection) => writableSections.includes(section);
    const router = useRouter();
    const searchParams = useSearchParams();

    const [activeSection, setActiveSection] = useState<ActiveSection>(initialSection);
    const [activeFolder, setActiveFolder] = useState<'images' | 'videos' | 'files' | null>(null);

    const queryClient = useQueryClient();

    const [isClient, setIsClient] = useState(false);
    useEffect(() => { setIsClient(true); }, []);

    // Route guard
    useEffect(() => {
        if (user && !isLoadingUser && !allowedSections.includes(initialSection)) {
            router.push('/dashboard');
        }
    }, [user, isLoadingUser, allowedSections, initialSection, router]);

    // --- Filters & Pagination ---
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [dateFrom, setDateFrom] = useState<Date | null>(null);
    const [dateTo, setDateTo] = useState<Date | null>(null);
    const [selectedPerson, setSelectedPerson] = useState<PersonOption[] | null>(null);
    const [personCondition, setPersonCondition] = useState<'any' | 'all'>('any');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [selectedYears, setSelectedYears] = useState<number[]>([]);
    const [filterMediaType, setFilterMediaType] = useState<'image' | 'video' | 'pdf' | null>(null);

    const lang = currentLang;
    const theme = currentTheme;
    const t = useTranslations(lang);

    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [initialLoadDone, setInitialLoadDone] = useState(false);

    // --- Custom Hooks ---
    const API_PROXY_URL = '/api';

    const documentModals = useDocumentModals();

    const { processingDocs, addProcessingDocs, removeProcessingDocs, isProcessing } =
        useProcessingStatus({ user, activeSection, activeFolder, apiURL: API_PROXY_URL });

    // --- Documents ---
    const {
        data: documentsData,
        isLoading: isDocumentsLoading,
        error: documentsError
    } = useDocuments({
        activeSection, activeFolder, currentPage, searchTerm,
        dateFrom, dateTo, selectedPerson, personCondition,
        selectedTags, selectedYears, filterMediaType, lang,
        isEnabled: !!user
    });

    const documents = documentsData?.documents || [];
    const totalPages = documentsData?.total_pages || 1;
    const isLoading = isDocumentsLoading;
    const error = documentsError instanceof Error ? documentsError.message : (documentsError ? String(documentsError) : null);

    // --- Upload & Cache ---
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isFolderUploadModalOpen, setIsFolderUploadModalOpen] = useState(false);
    const [uploadParentId, setUploadParentId] = useState<string | null>(null);
    const [uploadParentName, setUploadParentName] = useState<string>('');
    const [isClearCacheModalOpen, setIsClearCacheModalOpen] = useState(false);
    const [folderRefreshTrigger, setFolderRefreshTrigger] = useState(0);

    const clearCacheMutation = useClearCache();
    const processDocumentsMutation = useProcessDocuments();
    const { showToast } = useToast();

    useEffect(() => { setActiveSection(initialSection); }, [initialSection]);

    // Auth redirect
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

    // Close sidebar on initial load
    useEffect(() => {
        if (!initialLoadDone && !isDocumentsLoading) {
            setIsSidebarOpen(false);
            setInitialLoadDone(true);
        }
    }, [isDocumentsLoading, initialLoadDone]);

    // --- Handlers ---
    const handleSearch = (newSearchTerm: string) => { setSearchTerm(newSearchTerm); setCurrentPage(1); };

    const handleClearFilters = () => {
        setDateFrom(null); setDateTo(null); setSelectedPerson(null);
        setSelectedTags([]); setSelectedYears([]); setFilterMediaType(null); setCurrentPage(1);
    };

    const confirmClearCache = async () => {
        setIsClearCacheModalOpen(false);
        try {
            await clearCacheMutation.mutateAsync({ apiURL: API_PROXY_URL });
            showToast(t('ThumbnailCacheCleared'), 'success');
        } catch (err: any) {
            showToast(`${t('FailedToClearCache')}: ${err.message}`, 'error');
        }
    };

    const handleFolderUploadClick = (parentId: string | null, parentName: string) => {
        setUploadParentId(parentId); setUploadParentName(parentName); setIsFolderUploadModalOpen(true);
    };

    const handleFolderUploadComplete = () => {
        setIsFolderUploadModalOpen(false);
        setFolderRefreshTrigger(prev => prev + 1);
        queryClient.invalidateQueries({ queryKey: ['folders'] });
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage);
    };

    const handleSectionChange = (section: ActiveSection) => {
        if (section === 'recent') router.push('/dashboard');
        else if (section === 'favorites') router.push('/favorites');
        else if (section === 'folders') router.push('/folders');
        else if (section === 'profilesearch') router.push('/profilesearch');
    };

    const handleFolderClick = (folder: 'images' | 'videos' | 'files') => {
        setActiveFolder(folder); setCurrentPage(1);
    };

    const handleTagSelect = (tag: string) => {
        if (!selectedTags.includes(tag)) setSelectedTags([...selectedTags, tag]);
        setCurrentPage(1);
    };

    const handleUpdateMetadataSuccess = () => {
        queryClient.invalidateQueries({ queryKey: ['documents'] });
        documentModals.closeAll();
    };

    const handleAnalyze = (uploadedFiles: UploadableFile[]) => {
        const docnumbers = uploadedFiles.map((f) => f.docnumber!).filter(Boolean);
        setIsUploadModalOpen(false);
        addProcessingDocs(docnumbers);

        if (activeSection === 'folders' && !activeFolder) {
            queryClient.invalidateQueries({ queryKey: ['folders'] });
        } else if (activeSection === 'recent') {
            setCurrentPage(1);
            queryClient.invalidateQueries({ queryKey: ['documents'] });
        }

        processDocumentsMutation.mutate(
            { docnumbers, apiURL: API_PROXY_URL },
            {
                onError: (error) => {
                    console.error('Error initiating processing:', error);
                    removeProcessingDocs(docnumbers);
                }
            }
        );
    };

    const hasActiveFilters = Boolean(
        dateFrom || dateTo || selectedPerson?.length || selectedTags.length || selectedYears.length
    );

    // --- Render ---
    const renderContent = () => {
        if (!isClient) return <div className="min-h-screen bg-gray-50 dark:bg-gray-900" />;

        if (isLoading) {
            return (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8">
                    {Array.from({ length: 15 }).map((_, index) => (
                        <DocumentItemSkeleton key={index} />
                    ))}
                </div>
            );
        }

        if (error) {
            return (
                <div className="text-center text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200 p-4 rounded-md border border-red-300 dark:border-red-700">
                    {error}
                </div>
            );
        }

        if (activeSection === 'folders' && !activeFolder) {
            return (
                <Suspense fallback={
                    <div className="flex justify-center items-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                }>
                    <Folders
                        onFolderClick={handleFolderClick}
                        onDocumentClick={documentModals.handleDocumentClick}
                        onUploadClick={handleFolderUploadClick}
                        t={t}
                        apiURL={API_PROXY_URL}
                        isEditor={isSectionWritable('folders')}
                        initialFolderId={initialFolderId}
                        externalRefreshTrigger={folderRefreshTrigger}
                    />
                </Suspense>
            );
        }

        const backButton = activeSection === 'folders' && activeFolder && (
            <div className="mb-4 flex items-center gap-2">
                <button onClick={() => setActiveFolder(null)} className="text-blue-600 hover:underline flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    {t('backToFolders')}
                </button>
                <span className="text-gray-400">/</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">{t(activeFolder)}</span>
            </div>
        );

        if (documents.length === 0) {
            return (
                <>
                    {backButton}
                    <p className="text-center text-gray-500 dark:text-gray-400 py-10">{t('noDocumentsFound')}</p>
                </>
            );
        }

        return (
            <>
                {backButton}
                <DocumentList
                    documents={documents}
                    onDocumentClick={documentModals.handleDocumentClick}
                    apiURL={API_PROXY_URL}
                    onTagSelect={handleTagSelect}
                    isLoading={false}
                    processingDocs={processingDocs}
                    lang={lang}
                    t={t}
                />
            </>
        );
    };

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-300 dark:border-gray-600 border-t-red-600 dark:border-t-red-600" />
            </div>
        );
    }

    return (
        <>
            <div className="flex flex-col h-screen ltr">
                <Header
                    onSearch={handleSearch}
                    onClearCache={() => setIsClearCacheModalOpen(true)}
                    apiURL={API_PROXY_URL}
                    onOpenUploadModal={() => setIsUploadModalOpen(true)}
                    isProcessing={isProcessing}
                    isEditor={isSectionWritable(activeSection)}
                    t={t}
                    isSidebarOpen={isSidebarOpen}
                    toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                    activeSection={activeSection}
                />

                <div className="flex flex-1 overflow-hidden">
                    <Sidebar
                        isSidebarOpen={isSidebarOpen}
                        activeSection={activeSection}
                        handleSectionChange={handleSectionChange}
                        isShowingFullMemories={false}
                        t={t}
                        lang={lang}
                        hiddenSections={hiddenSections}
                    />

                    <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#1f1f1f] text-gray-900 dark:text-gray-100 p-4 sm:p-6 lg:p-8 min-w-0">
                        {(activeSection !== 'folders' || activeFolder) && (
                            <FilterBar
                                apiURL={API_PROXY_URL}
                                selectedTags={selectedTags} setSelectedTags={setSelectedTags}
                                selectedYears={selectedYears} setSelectedYears={setSelectedYears}
                                dateFrom={dateFrom} setDateFrom={setDateFrom}
                                dateTo={dateTo} setDateTo={setDateTo}
                                selectedPerson={selectedPerson} setSelectedPerson={setSelectedPerson}
                                personCondition={personCondition} setPersonCondition={setPersonCondition}
                                filterMediaType={filterMediaType} setFilterMediaType={setFilterMediaType}
                                hasActiveFilters={hasActiveFilters} onClearFilters={handleClearFilters}
                                onPageReset={() => setCurrentPage(1)}
                                t={t} lang={lang} theme={theme}
                            />
                        )}

                        {renderContent()}

                        {((activeSection !== 'folders') || activeFolder) && !isLoading && totalPages > 1 && (
                            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} t={t} />
                        )}
                    </main>
                </div>

                <DocumentModals
                    selectedDoc={documentModals.selectedDoc}
                    selectedVideo={documentModals.selectedVideo}
                    selectedPdf={documentModals.selectedPdf}
                    selectedFile={documentModals.selectedFile}
                    selectedTxt={documentModals.selectedTxt}
                    selectedExcel={documentModals.selectedExcel}
                    selectedPPT={documentModals.selectedPPT}
                    selectedWord={documentModals.selectedWord}
                    onCloseDoc={() => documentModals.setSelectedDoc(null)}
                    onCloseVideo={() => documentModals.setSelectedVideo(null)}
                    onClosePdf={() => documentModals.setSelectedPdf(null)}
                    onCloseFile={() => documentModals.setSelectedFile(null)}
                    onCloseTxt={() => documentModals.setSelectedTxt(null)}
                    onCloseExcel={() => documentModals.setSelectedExcel(null)}
                    onClosePPT={() => documentModals.setSelectedPPT(null)}
                    onCloseWord={() => documentModals.setSelectedWord(null)}
                    onUpdateSuccess={handleUpdateMetadataSuccess}
                    apiURL={API_PROXY_URL}
                    isEditor={isSectionWritable(activeSection)}
                    t={t} lang={lang} theme={theme}
                />

                {isUploadModalOpen && isSectionWritable(activeSection) && (
                    <UploadModal onClose={() => setIsUploadModalOpen(false)} apiURL={API_PROXY_URL} onAnalyze={handleAnalyze} theme={theme} t={t} />
                )}

                {isFolderUploadModalOpen && isSectionWritable('folders') && (
                    <FolderUploadModal
                        onClose={() => setIsFolderUploadModalOpen(false)} apiURL={API_PROXY_URL} theme={theme}
                        parentId={uploadParentId} parentName={uploadParentName} onUploadComplete={handleFolderUploadComplete}
                    />
                )}

                <ClearCacheModal isOpen={isClearCacheModalOpen} onClose={() => setIsClearCacheModalOpen(false)} onConfirm={confirmClearCache} />
            </div>
        </>
    );
}
