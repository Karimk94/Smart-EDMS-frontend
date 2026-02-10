"use client";

import { useQueryClient } from '@tanstack/react-query';
import { enGB } from 'date-fns/locale/en-GB';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { registerLocale } from 'react-datepicker';
import { useDocuments } from '../../hooks/useDocuments';
import { UploadableFile } from '../../interfaces';
import { Document } from '../../models/Document';
import { PersonOption } from '../../models/PersonOption';
import { User } from '../../models/User';
import { useToast } from '../context/ToastContext';
import { useUser } from '../context/UserContext';
import { useTranslations } from '../hooks/useTranslations';
import { useClearCache, useProcessDocuments } from '../../hooks/useSystemOperations';
import { AdvancedFilters } from './AdvancedFilters';
import { DocumentItemSkeleton } from './DocumentItemSkeleton';
import { DocumentList } from './DocumentList';
import { ExcelModal } from './ExcelModal';
import { FileModal } from './FileModal';
import { Folders } from './Folders';
import { FolderUploadModal } from './FolderUploadModal';
import { Header } from './Header';
import HtmlLangUpdater from './HtmlLangUpdater';
import { ImageModal } from './ImageModal';
import { Pagination } from './Pagination';
import { PdfModal } from './PdfModal';
import { PowerPointModal } from './PowerPointModal';
import { Sidebar } from './Sidebar';
import { TagFilter } from './TagFilter';
import { TxtModal } from './TxtModal';
import { UploadModal } from './UploadModal';
import { VideoModal } from './VideoModal';
import { WordModal } from './WordModal';
import { YearFilter } from './YearFilter';

type ActiveSection = 'recent' | 'favorites' | 'folders';

const formatToApiDateTime = (date: Date | null): string => {
    if (!date) return '';
    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
        date.getDate()
    )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
        date.getSeconds()
    )}`;
};

registerLocale('en-GB', enGB);

interface MainDashboardProps {
    initialSection?: ActiveSection;
    initialFolderId?: string | null;
    hiddenSections?: ('recent' | 'favorites' | 'folders')[];
}

export function MainDashboard({ initialSection = 'recent', initialFolderId = null, hiddenSections = [] }: MainDashboardProps) {
    const { user, logout, isAuthenticated, isLoading: isLoadingUser } = useUser();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [activeSection, setActiveSection] = useState<ActiveSection>(initialSection);
    const [activeFolder, setActiveFolder] = useState<'images' | 'videos' | 'files' | null>(null);

    // React Query
    const queryClient = useQueryClient();

    // Filters & Pagination State
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [dateFrom, setDateFrom] = useState<Date | null>(null);
    const [dateTo, setDateTo] = useState<Date | null>(null);
    const [selectedPerson, setSelectedPerson] = useState<PersonOption[] | null>(
        null
    );
    const [personCondition, setPersonCondition] = useState<'any' | 'all'>('any');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [selectedYears, setSelectedYears] = useState<number[]>([]);
    const [filterMediaType, setFilterMediaType] = useState<'image' | 'video' | 'pdf' | null>(null);

    // Lang & Theme (User Prefs)
    const lang = user?.lang || 'en';
    const theme = user?.theme || 'light';
    const t = useTranslations(lang);

    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [initialLoadDone, setInitialLoadDone] = useState(false);

    // Documents Hook
    const {
        data: documentsData,
        isLoading: isDocumentsLoading,
        error: documentsError
    } = useDocuments({
        activeSection,
        activeFolder,
        currentPage,
        searchTerm,
        dateFrom,
        dateTo,
        selectedPerson,
        personCondition,
        selectedTags,
        selectedYears,
        filterMediaType,
        lang,
        isEnabled: !!user
    });

    const documents = documentsData?.documents || [];
    const totalPages = documentsData?.total_pages || 1;
    const isLoading = isDocumentsLoading; // Mapped for compatibility
    const error = documentsError instanceof Error ? documentsError.message : (documentsError ? String(documentsError) : null);

    const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
    const [selectedVideo, setSelectedVideo] = useState<Document | null>(null);
    const [selectedPdf, setSelectedPdf] = useState<Document | null>(null);
    const [selectedFile, setSelectedFile] = useState<Document | null>(null);
    const [selectedTxt, setSelectedTxt] = useState<Document | null>(null);
    const [selectedExcel, setSelectedExcel] = useState<Document | null>(null);
    const [selectedPPT, setSelectedPPT] = useState<Document | null>(null);
    const [selectedWord, setSelectedWord] = useState<Document | null>(null);

    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isFolderUploadModalOpen, setIsFolderUploadModalOpen] = useState(false);
    const [uploadParentId, setUploadParentId] = useState<string | null>(null);
    const [uploadParentName, setUploadParentName] = useState<string>('');
    const [processingDocs, setProcessingDocs] = useState<number[]>([]);

    const [isClearCacheModalOpen, setIsClearCacheModalOpen] = useState(false);

    const [refreshFoldersKey, setRefreshFoldersKey] = useState(0);

    const clearCacheMutation = useClearCache();
    const processDocumentsMutation = useProcessDocuments();

    const API_PROXY_URL = '/api';
    const { showToast, removeToast } = useToast();

    useEffect(() => {
        setActiveSection(initialSection);
    }, [initialSection]);

    useEffect(() => {
        if (!isAuthenticated && !isLoadingUser) {
            const currentLang = searchParams.get('lang');
            const currentTheme = searchParams.get('theme');
            const params = new URLSearchParams();
            if (currentLang) params.set('lang', currentLang);
            if (currentTheme) params.set('theme', currentTheme);
            params.set('redirect', window.location.pathname);

            const queryString = params.toString();
            router.push(queryString ? `/login?${queryString}` : '/login');
        }
    }, [isAuthenticated, isLoadingUser, router, searchParams]);


    // UseEffect for initial load done is handled by query success effectively, but we can keep sidebar logic if needed
    useEffect(() => {
        if (!initialLoadDone && !isDocumentsLoading) {
            // Logic to close sidebar on mobile if needed, or just set initial load done
            if (!isDocumentsLoading) {
                // Original logic: setIsSidebarOpen(false); setInitialLoadDone(true);
                // We'll just set it to avoid issues, though sidebar logic seems to want to close it? 
                // Actually the original logic closed sidebar on first load completion.
                setIsSidebarOpen(false);
                setInitialLoadDone(true);
            }
        }
    }, [isDocumentsLoading, initialLoadDone]);

    useEffect(() => {
        if (user) {
            const storedProcessingDocs = localStorage.getItem('processingDocs');
            if (storedProcessingDocs) {
                try {
                    const parsedDocs = JSON.parse(storedProcessingDocs);
                    if (Array.isArray(parsedDocs)) {
                        setProcessingDocs(parsedDocs);
                    } else {
                        localStorage.removeItem('processingDocs');
                    }
                } catch (e) {
                    localStorage.removeItem('processingDocs');
                }
            }
        }
    }, [user?.username]);

    useEffect(() => {
        if (user) {
            if (processingDocs.length === 0) {
                localStorage.removeItem('processingDocs');
                return;
            }
            localStorage.setItem('processingDocs', JSON.stringify(processingDocs));
            const interval = setInterval(async () => {
                try {
                    const response = await fetch(`${API_PROXY_URL}/processing_status`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ docnumbers: processingDocs }),
                    });
                    if (!response.ok) {
                        return;
                    }
                    const data = await response.json();
                    const stillProcessing = data.processing || [];

                    if (
                        JSON.stringify(stillProcessing.sort()) !==
                        JSON.stringify(processingDocs.sort())
                    ) {
                        setProcessingDocs(stillProcessing);
                        if (stillProcessing.length === 0) {
                            clearInterval(interval);
                            if (activeSection === 'recent' || (activeSection === 'folders' && activeFolder)) {
                                queryClient.invalidateQueries({ queryKey: ['documents'] });
                            }
                            if (activeSection === 'folders' && !activeFolder) {
                                setRefreshFoldersKey(prev => prev + 1);
                            }
                        }
                    } else if (stillProcessing.length === 0) {
                        clearInterval(interval);
                        setProcessingDocs([]);
                    }
                } catch (error) {
                    console.error('Error checking processing status:', error);
                }
            }, 7000);
            return () => clearInterval(interval);
        }
    }, [
        processingDocs,
        activeSection,
        activeFolder,
        user?.username,
        queryClient
    ]);

    const handleSearch = (newSearchTerm: string) => {
        setSearchTerm(newSearchTerm);
        setCurrentPage(1);
    };

    const handleClearFilters = () => {
        setDateFrom(null);
        setDateTo(null);
        setSelectedPerson(null);
        setSelectedTags([]);
        setSelectedYears([]);
        setFilterMediaType(null);
        setCurrentPage(1);
    };

    const handleClearCacheClick = () => {
        setIsClearCacheModalOpen(true);
    };

    const confirmClearCache = async () => {
        setIsClearCacheModalOpen(false);
        try {
            await clearCacheMutation.mutateAsync({ apiURL: API_PROXY_URL });
            showToast(t('ThumbnailCacheCleared'), 'success');
        } catch (err: any) {
            console.error('Cache clear error:', err);
            showToast(`${t('FailedToClearCache')}: ${err.message}`, 'error');
        }
    };

    const handleFolderUploadClick = (parentId: string | null, parentName: string) => {
        setUploadParentId(parentId);
        setUploadParentName(parentName);
        setIsFolderUploadModalOpen(true);
    };

    const handleFolderUploadComplete = () => {
        setIsFolderUploadModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ['folders'] });
        setRefreshFoldersKey(prev => prev + 1);
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    const handleSectionChange = (section: ActiveSection) => {
        if (section === 'recent') {
            router.push('/dashboard');
        } else if (section === 'favorites') {
            router.push('/favorites');
        } else if (section === 'folders') {
            router.push('/folders');
        }
    };

    const handleFolderClick = (folder: 'images' | 'videos' | 'files') => {
        setActiveFolder(folder);
        setCurrentPage(1);
    };

    const handleDocumentClick = (doc: Document) => {
        if (doc.media_type === 'video') {
            setSelectedVideo(doc);
        } else if (doc.media_type === 'image') {
            setSelectedDoc(doc);
        } else if (doc.media_type === 'pdf') {
            setSelectedPdf(doc);
        } else if (doc.media_type === 'text') {
            setSelectedTxt(doc);
        } else if (doc.media_type === 'excel') {
            setSelectedExcel(doc);
        } else if (doc.media_type === 'powerpoint') {
            setSelectedPPT(doc);
        } else if (doc.media_type === 'word') {
            setSelectedWord(doc);
        } else {
            const ext = doc.docname.split('.').pop()?.toLowerCase();
            const textExtensions = ['txt', 'csv', 'json', 'xml', 'log', 'md', 'yml', 'yaml', 'ini', 'conf'];

            if ((ext && textExtensions.includes(ext)) || !ext) {
                setSelectedTxt(doc);
            } else {
                setSelectedFile(doc);
            }
        }
    };

    const handleTagSelect = (tag: string) => {
        if (!selectedTags.includes(tag)) {
            setSelectedTags([...selectedTags, tag]);
        }
        setCurrentPage(1);
    };

    const handleYearSelect = (years: number[]) => {
        setSelectedYears(years);
        setCurrentPage(1);
    };

    const handleUpdateMetadataSuccess = () => {
        queryClient.invalidateQueries({ queryKey: ['documents'] });
        const updatedDocId = selectedDoc?.doc_id || selectedVideo?.doc_id || selectedPdf?.doc_id;

        setSelectedDoc(null);
        setSelectedVideo(null);
        setSelectedPdf(null);
        setSelectedFile(null);
        setSelectedTxt(null);
        setSelectedExcel(null);
        setSelectedPPT(null);
        setSelectedWord(null);
    };

    const handleAnalyze = (uploadedFiles: UploadableFile[]) => {
        const docnumbers = uploadedFiles.map((f) => f.docnumber!).filter(Boolean);
        setIsUploadModalOpen(false);
        const newProcessingDocs = Array.from(new Set([...processingDocs, ...docnumbers]));
        setProcessingDocs(newProcessingDocs);

        if (activeSection === 'folders' && !activeFolder) {
            setRefreshFoldersKey(prev => prev + 1);
        } else if (activeSection === 'recent') {
            setCurrentPage(1);
            queryClient.invalidateQueries({ queryKey: ['documents'] });
        }

        processDocumentsMutation.mutate(
            { docnumbers, apiURL: API_PROXY_URL },
            {
                onError: (error) => {
                    console.error('Error initiating processing:', error);
                    setProcessingDocs((prev) => prev.filter((d) => !docnumbers.includes(d)));
                }
            }
        );
    };





    const hasActiveFilters = Boolean(
        dateFrom || dateTo || selectedPerson?.length || selectedTags.length || selectedYears.length
    );

    const renderContent = () => {
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
                        key={refreshFoldersKey}
                        onFolderClick={handleFolderClick}
                        onDocumentClick={handleDocumentClick}
                        onUploadClick={handleFolderUploadClick}
                        t={t}
                        apiURL={API_PROXY_URL}
                        isEditor={user?.security_level === 'Editor'}
                        initialFolderId={initialFolderId}
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
                    <p className="text-center text-gray-500 dark:text-gray-400 py-10">
                        {t('noDocumentsFound')}
                    </p>
                </>
            );
        }
        return (
            <>
                {backButton}
                <DocumentList
                    documents={documents}
                    onDocumentClick={handleDocumentClick}
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
            <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
                <div>{t('loading')}</div>
            </div>
        );
    }

    const rtlMainClass = lang === 'ar' ? 'rtl' : 'ltr';

    return (
        <>
            <HtmlLangUpdater lang={lang} />
            <div className={`flex flex-col h-screen ${rtlMainClass}`}>
                <Header
                    onSearch={handleSearch}
                    onClearCache={handleClearCacheClick}
                    apiURL={API_PROXY_URL}
                    onOpenUploadModal={() => setIsUploadModalOpen(true)}
                    isProcessing={processingDocs.length > 0}
                    isEditor={user.security_level === 'Editor'}
                    t={t}
                    isSidebarOpen={isSidebarOpen}
                    toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                    activeSection={activeSection}
                />

                <div className={`flex flex-1 overflow-hidden ${lang === 'ar' ? 'flex-row-reverse' : ''}`}>
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
                            <div className={`flex items-center gap-4 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700 justify-end ${lang === 'ar' ? 'flex-row-reverse' : ''}`}>
                                <TagFilter
                                    apiURL={API_PROXY_URL}
                                    selectedTags={selectedTags}
                                    setSelectedTags={(tags) => {
                                        setSelectedTags(tags);
                                        setCurrentPage(1);
                                    }}
                                    t={t}
                                    lang={lang}
                                />
                                <YearFilter
                                    selectedYears={selectedYears}
                                    setSelectedYears={(years) => {
                                        setSelectedYears(years);
                                        setCurrentPage(1);
                                    }}
                                    t={t}
                                />
                                <AdvancedFilters
                                    dateFrom={dateFrom}
                                    setDateFrom={(date) => {
                                        setDateFrom(date);
                                        setCurrentPage(1);
                                    }}
                                    dateTo={dateTo}
                                    setDateTo={(date) => {
                                        setDateTo(date);
                                        setCurrentPage(1);
                                    }}
                                    selectedPerson={selectedPerson}
                                    setSelectedPerson={(person) => {
                                        setSelectedPerson(person);
                                        setCurrentPage(1);
                                    }}
                                    personCondition={personCondition}
                                    setPersonCondition={(condition) => {
                                        setPersonCondition(condition);
                                        setCurrentPage(1);
                                    }}
                                    mediaType={filterMediaType}
                                    setMediaType={(type) => {
                                        setFilterMediaType(type);
                                        setCurrentPage(1);
                                    }}
                                    apiURL={API_PROXY_URL}
                                    t={t}
                                    lang={lang}
                                    theme={theme}
                                />
                                {hasActiveFilters && (
                                    <button
                                        onClick={handleClearFilters}
                                        className="px-3 py-2 bg-gray-200 text-gray-700 text-xs font-medium rounded-md hover:bg-red-100 hover:text-red-700 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-red-900 dark:hover:text-red-300 transition flex items-center gap-1"
                                        title="Clear all active filters"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        {t('clearFilters')}
                                    </button>
                                )}
                            </div>
                        )}



                        {renderContent()}

                        {((activeSection !== 'folders') || activeFolder) && !isLoading && totalPages > 1 && (
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={handlePageChange}
                                t={t}
                            />
                        )}
                    </main>
                </div>

                {selectedDoc && <ImageModal doc={selectedDoc} onClose={() => setSelectedDoc(null)} apiURL={API_PROXY_URL} onUpdateAbstractSuccess={handleUpdateMetadataSuccess} isEditor={user?.security_level === 'Editor'} t={t} lang={lang} theme={theme} />}
                {selectedVideo && <VideoModal doc={selectedVideo} onClose={() => setSelectedVideo(null)} apiURL={API_PROXY_URL} onUpdateAbstractSuccess={handleUpdateMetadataSuccess} isEditor={user?.security_level === 'Editor'} t={t} lang={lang} theme={theme} />}
                {selectedPdf && <PdfModal doc={selectedPdf} onClose={() => setSelectedPdf(null)} apiURL={API_PROXY_URL} onUpdateAbstractSuccess={handleUpdateMetadataSuccess} isEditor={user?.security_level === 'Editor'} t={t} lang={lang} theme={theme} />}
                {selectedFile && <FileModal doc={selectedFile} onClose={() => setSelectedFile(null)} apiURL={API_PROXY_URL} onUpdateAbstractSuccess={handleUpdateMetadataSuccess} isEditor={user?.security_level === 'Editor'} t={t} lang={lang} theme={theme} />}
                {selectedTxt && <TxtModal doc={selectedTxt} onClose={() => setSelectedTxt(null)} apiURL={API_PROXY_URL} onUpdateAbstractSuccess={handleUpdateMetadataSuccess} isEditor={user?.security_level === 'Editor'} t={t} lang={lang} theme={theme} />}

                {selectedExcel && (
                    <ExcelModal
                        doc={selectedExcel}
                        onClose={() => setSelectedExcel(null)}
                        apiURL={API_PROXY_URL}
                        onUpdateAbstractSuccess={handleUpdateMetadataSuccess}

                        isEditor={user?.security_level === 'Editor'}
                        t={t}
                        lang={lang}
                        theme={theme}
                    />
                )}

                {selectedPPT && (
                    <PowerPointModal
                        doc={selectedPPT}
                        onClose={() => setSelectedPPT(null)}
                        apiURL={API_PROXY_URL}
                        onUpdateAbstractSuccess={handleUpdateMetadataSuccess}

                        isEditor={user?.security_level === 'Editor'}
                        t={t}
                        lang={lang}
                        theme={theme}
                    />
                )}

                {selectedWord && (
                    <WordModal
                        doc={selectedWord}
                        onClose={() => setSelectedWord(null)}
                        apiURL={API_PROXY_URL}
                        onUpdateAbstractSuccess={handleUpdateMetadataSuccess}

                        isEditor={user?.security_level === 'Editor'}
                        t={t}
                        lang={lang}
                        theme={theme}
                    />
                )}

                {isUploadModalOpen && user?.security_level === 'Editor' && (
                    <UploadModal
                        onClose={() => setIsUploadModalOpen(false)}
                        apiURL={API_PROXY_URL}
                        onAnalyze={handleAnalyze}
                        theme={theme}
                        t={t}
                    />
                )}

                {isFolderUploadModalOpen && user?.security_level === 'Editor' && (
                    <FolderUploadModal
                        onClose={() => setIsFolderUploadModalOpen(false)}
                        apiURL={API_PROXY_URL}
                        theme={theme}
                        parentId={uploadParentId}
                        parentName={uploadParentName}
                        onUploadComplete={handleFolderUploadComplete}
                    />
                )}

                {/* Clear Cache Confirmation Modal */}
                {isClearCacheModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4 animate-fade-in">
                        <div className="bg-white dark:bg-[#333] rounded-lg p-6 max-w-sm w-full shadow-xl border border-gray-200 dark:border-gray-600">
                            <div className="flex items-center gap-3 mb-4 text-amber-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <h3 className="text-lg font-bold dark:text-white">Clear Cache</h3>
                            </div>

                            <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">
                                Are you sure you want to clear the thumbnail cache? This may affect loading performance temporarily.
                            </p>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setIsClearCacheModalOpen(false)}
                                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmClearCache}
                                    className="px-4 py-2 text-sm bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors shadow-sm"
                                >
                                    Yes, Clear Cache
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
