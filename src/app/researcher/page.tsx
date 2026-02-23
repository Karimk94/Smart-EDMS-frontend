"use client";

import { useQueryClient } from '@tanstack/react-query';
import { enGB } from 'date-fns/locale/en-GB';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { registerLocale } from 'react-datepicker';
import { useResearcherSearch, useSearchTypes, SearchType } from '../../hooks/useResearcher';
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
import HtmlThemeUpdater from '../components/HtmlThemeUpdater';
import HtmlLangUpdater from '../components/HtmlLangUpdater';

registerLocale('en-GB', enGB);

export default function ResearcherPage() {
    const { user, logout, isAuthenticated, isLoading: isLoadingUser } = useUser();
    const router = useRouter();
    const searchParams = useSearchParams();
    const lang = user?.lang || 'en';
    const theme = user?.theme || 'light';
    const t = useTranslations(lang);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Search State
    const [selectedType, setSelectedType] = useState<SearchType | null>(null);
    const [keyword, setKeyword] = useState("");
    const [matchType, setMatchType] = useState<"like" | "exact" | "startsWith">("like");
    const [searchScope, setSearchScope] = useState<string>(""); // Empty indicates 'auto' backend routing
    const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
    const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
    const [currentPage, setCurrentPage] = useState(1);
    const [isSearchTriggered, setIsSearchTriggered] = useState(false);

    // Document Modal State (Copied from MainDashboard)
    const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
    const [selectedVideo, setSelectedVideo] = useState<Document | null>(null);
    const [selectedPdf, setSelectedPdf] = useState<Document | null>(null);
    const [selectedFile, setSelectedFile] = useState<Document | null>(null);
    const [selectedTxt, setSelectedTxt] = useState<Document | null>(null);
    const [selectedExcel, setSelectedExcel] = useState<Document | null>(null);
    const [selectedPPT, setSelectedPPT] = useState<Document | null>(null);
    const [selectedWord, setSelectedWord] = useState<Document | null>(null);

    // Data Fetching
    const { data: typesData, isLoading: isTypesLoading } = useSearchTypes();

    const { data: searchData, isLoading: isSearchLoading, error: searchError } = useResearcherSearch({
        keyword: keyword,
        matchType: matchType,
        formName: searchScope || selectedType?.value.form || '',
        fieldName: selectedType?.value.field_name || '',
        searchForm: selectedType?.value.search_form || '',
        searchField: selectedType?.value.search_field || '',
        displayField: selectedType?.value.display_field || '',
        dateFrom: dateFrom,
        dateTo: dateTo,
        page: currentPage,
        enabled: isSearchTriggered && !!selectedType
    });

    const documents = searchData?.documents || [];
    const totalPages = searchData?.total_pages || 1;

    // Authentication Check
    useEffect(() => {
        if (!isAuthenticated && !isLoadingUser) {
            router.push('/login');
        }
    }, [isAuthenticated, isLoadingUser, router]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setCurrentPage(1);
        setIsSearchTriggered(true);
    };

    const handleSectionChange = (section: string) => {
        if (section === 'recent') router.push('/dashboard');
        if (section === 'favorites') router.push('/favorites');
        if (section === 'folders') router.push('/folders');
    };

    const handleDocumentClick = (doc: Document) => {
        // Logic copied from MainDashboard
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

    // API URL for modals
    const API_PROXY_URL = '/api';

    return (
        <>
            <HtmlThemeUpdater theme={theme} />
            <HtmlLangUpdater lang={lang} />
            <div className={`flex flex-col h-screen ltr`}>
                <Header
                    onSearch={() => { }} // Researcher has its own search
                    onClearCache={() => { }}
                    apiURL={API_PROXY_URL}
                    onOpenUploadModal={() => { }} // Disable upload here?
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
                            <h1 className="text-2xl font-bold mb-6">{t('researcher') || 'Researcher Search'}</h1>

                            {/* Search Form */}
                            <div className="bg-white dark:bg-[#333] p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
                                <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">

                                    {/* Search Type (Forms) */}
                                    <div className="flex flex-col gap-1">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('searchType') || 'Search Type'}
                                        </label>
                                        <select
                                            className="p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#444] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={selectedType ? JSON.stringify(selectedType) : ""}
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    setSelectedType(JSON.parse(e.target.value));
                                                } else {
                                                    setSelectedType(null);
                                                }
                                            }}
                                        >
                                            <option value="">{t('selectType') || 'Select Type'}</option>
                                            {typesData?.map((type, idx) => (
                                                <option key={idx} value={JSON.stringify(type)}>
                                                    {type.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Search Scope (Form Override) */}
                                    <div className="flex flex-col gap-1">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('searchScope') || 'Search Scope'}
                                        </label>
                                        <select
                                            className="p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#444] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={searchScope}
                                            onChange={(e) => setSearchScope(e.target.value)}
                                            title={t('searchScopeHint') || "Leave as 'Auto (Intelligent)' to use the default optimized table"}
                                        >
                                            <option value="">{t('scopeAuto') || 'Auto (Intelligent)'}</option>
                                            <option value="0">{t('scopeGlobal') || 'Global (All Tables)'}</option>
                                            <option value="3799">Form 3799 (Vehicles & General)</option>
                                            <option value="2572">Form 2572 (Files)</option>
                                            <option value="4239">Form 4239 (Projects / Ref)</option>
                                            <option value="23947035">Form 23947035</option>
                                            <option value="3878">Form 3878</option>
                                            <option value="2740">Form 2740 (Metro/Recents)</option>
                                        </select>
                                    </div>

                                    {/* Keyword */}
                                    <div className="flex flex-col gap-1">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('keyword') || 'Keyword'}
                                        </label>
                                        <input
                                            type="text"
                                            className="p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#444] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder={t('enterKeyword') || 'Enter keyword...'}
                                            value={keyword}
                                            onChange={(e) => setKeyword(e.target.value)}
                                        />
                                    </div>

                                    {/* Match Type */}
                                    <div className="flex flex-col gap-1">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('matchType') || 'Match Type'}
                                        </label>
                                        <select
                                            className="p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#444] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={matchType}
                                            onChange={(e) => setMatchType(e.target.value as any)}
                                        >
                                            <option value="like">{t('matchContains') || 'Contains'}</option>
                                            <option value="exact">{t('matchExact') || 'Exact Match'}</option>
                                            <option value="startsWith">{t('matchStartsWith') || 'Starts With'}</option>
                                        </select>
                                    </div>

                                    {/* Date Range */}
                                    <div className="flex flex-col gap-1">
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

                                    {/* Search Button */}
                                    <button
                                        type="submit"
                                        disabled={!selectedType || isSearchLoading}
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition disabled:opacity-50 disabled:cursor-not-allowed h-10"
                                    >
                                        {isSearchLoading ? (t('searching') || 'Searching...') : (t('search') || 'Search')}
                                    </button>

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
                                        onTagSelect={() => { }} // No tag filtering in results yet
                                        isLoading={false}
                                        processingDocs={[]}
                                        lang={lang}
                                        t={t}
                                    />
                                    {totalPages > 1 && (
                                        <Pagination
                                            currentPage={currentPage}
                                            totalPages={totalPages}
                                            onPageChange={setCurrentPage}
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
                                    <img src="/file-document.svg" className="w-16 h-16 mb-4 opacity-50 dark:invert" alt="" />
                                    <p>{t('startSearchPrompt') || 'Select a type and enter criteria to search.'}</p>
                                </div>
                            )}
                        </div>
                    </main>
                </div>

                {/* Modals from MainDashboard */}
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
