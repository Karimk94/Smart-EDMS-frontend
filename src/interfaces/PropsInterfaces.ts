import { Document } from "../models/Document";

export interface UploadModalProps {
    onClose: () => void;
    apiURL: string;
    onAnalyze: (uploadedFiles: any[]) => void;
    theme: 'light' | 'dark';
}

export interface FolderUploadModalProps {
    onClose: () => void;
    apiURL: string;
    theme: 'light' | 'dark';
    parentId: string | null;
    parentName: string;
    onUploadComplete: () => void;
}

export interface UploadFileItemProps {
    uploadableFile: any;
    onRemove: () => void;
    onUpdateFileName: (id: string, newName: string) => void;
    onUpdateDateTaken: (id: string, newDate: Date | null) => void;
}

export interface EventStackProps {
    event: any;
    apiURL: string;
    onClick: (eventId: number) => void;
}

export interface EventEditorProps {
    docId?: number;
    apiURL: string;
    selectedEvent: any | null;
    setSelectedEvent: (event: any | null) => void;
    onEventChange?: (docId: number, eventId: number | null) => Promise<boolean>;
    theme: 'light' | 'dark';
}

export interface EventDocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialEventId: number | null;
    initialEventName: string;
    apiURL: string;
    theme: 'light' | 'dark';
}

export interface ReadOnlyEventDisplayProps {
    event: any | null;
    t: Function;
}

export interface ImageModalProps {
    doc: any;
    onClose: () => void;
    apiURL: string;
    onUpdateAbstractSuccess: () => void;
    onToggleFavorite: (docId: number, isFavorite: boolean) => void;
    isEditor: boolean;
    t: Function;
    lang: 'en' | 'ar';
    theme: 'light' | 'dark';
}

export interface VideoModalProps {
    doc: any;
    onClose: () => void;
    apiURL: string;
    onUpdateAbstractSuccess: () => void;
    onToggleFavorite: (docId: number, isFavorite: boolean) => void;
    isEditor: boolean;
    t: Function;
    lang: 'en' | 'ar';
    theme: 'light' | 'dark';
}

export interface PdfModalProps {
    doc: any;
    onClose: () => void;
    apiURL: string;
    onUpdateAbstractSuccess: () => void;
    onToggleFavorite: (docId: number, isFavorite: boolean) => void;
    isEditor: boolean;
    t: Function;
    lang: 'en' | 'ar';
    theme: 'light' | 'dark';
}

export interface TextModalProps {
    doc: any;
    onClose: () => void;
    apiURL: string;
    onUpdateAbstractSuccess: () => void;
    onToggleFavorite: (docId: number, isFavorite: boolean) => void;
    isEditor: boolean;
    t: Function;
    lang: 'en' | 'ar';
    theme: 'light' | 'dark';
}

export interface FileModalProps {
    doc: any;
    onClose: () => void;
    apiURL: string;
    onUpdateAbstractSuccess: () => void;
    onToggleFavorite: (docId: number, isFavorite: boolean) => void;
    isEditor: boolean;
    t: Function;
    lang: 'en' | 'ar';
    theme: 'light' | 'dark';
}

export interface GalleryModalProps {
    title: string;
    images: string[];
    startIndex: number;
    onClose: () => void;
}

export interface ExcelModalProps {
  doc: Document;
  onClose: () => void;
  apiURL: string;
  onUpdateAbstractSuccess: () => void;
  onToggleFavorite: (docId: number, isFavorite: boolean) => void;
  isEditor: boolean;
  t: Function;
  lang: 'en' | 'ar';
  theme: 'light' | 'dark';
}

export interface PowerPointModalProps {
  doc: Document;
  onClose: () => void;
  apiURL: string;
  onUpdateAbstractSuccess: () => void;
  onToggleFavorite: (docId: number, isFavorite: boolean) => void;
  isEditor: boolean;
  t: Function;
  lang: 'en' | 'ar';
  theme: 'light' | 'dark';
}

export interface TagEditorProps {
    docId: number;
    apiURL: string;
    lang: 'en' | 'ar';
    theme: 'light' | 'dark';
    t: Function;
}

export interface TagFilterProps {
    apiURL: string;
    selectedTags: string[];
    setSelectedTags: (tags: string[]) => void;
    t: Function;
    lang: 'en' | 'ar';
}

export interface ReadOnlyTagDisplayProps {
    docId: number;
    apiURL: string;
    lang: 'en' | 'ar';
    t: Function;
}

export interface YearFilterProps {
    selectedYears: number[];
    setSelectedYears: (years: number[]) => void;
    t: Function;
}

export interface DateRangePickerProps {
    dateFrom: string;
    setDateFrom: (date: string) => void;
    dateTo: string;
    setDateTo: (date: string) => void;
}

export interface AdvancedFiltersProps {
    dateFrom: string;
    setDateFrom: (date: string) => void;
    dateTo: string;
    setDateTo: (date: string) => void;
    selectedYears: number[];
    setSelectedYears: (years: number[]) => void;
    selectedTags: string[];
    setSelectedTags: (tags: string[]) => void;
    selectedPerson: string | null;
    setSelectedPerson: (person: string | null) => void;
    t: Function;
    apiURL: string;
    lang: 'en' | 'ar';
    theme: 'light' | 'dark';
}

export interface DocumentListProps {
    documents: any[];
    onDocumentClick: (doc: any) => void;
    apiURL: string;
    onTagSelect: (tag: string) => void;
    isLoading: boolean;
    processingDocs: number[];
    onToggleFavorite: (docId: number, isFavorite: boolean) => void;
    lang: 'en' | 'ar';
}

export interface DocumentItemProps {
    doc: any;
    onDocumentClick: (doc: any) => void;
    apiURL: string;
    onTagSelect: (tag: string) => void;
    isProcessing: boolean;
    onToggleFavorite: (docId: number, isFavorite: boolean) => void;
    lang: 'en' | 'ar';
}

export interface JourneyProps {
    apiURL: string;
    t: Function;
}

export interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    t: Function;
}

export interface PersonSelectorProps {
    apiURL: string;
    value: string | null;
    onChange: (value: string) => void;
    lang: 'en' | 'ar';
    theme: 'light' | 'dark';
}

export interface HeaderProps {
    onSearch: (searchTerm: string) => void;
    onClearCache: () => void;
    lang: 'en' | 'ar';
    setLang: (lang: 'en' | 'ar') => void;
    theme: 'light' | 'dark';
    onThemeChange: (theme: 'light' | 'dark') => void;
    t: Function;
    apiURL: string;
    onOpenUploadModal: () => void;
    isProcessing: boolean;
    onLogout: () => void;
    isEditor: boolean;
    isSidebarOpen: boolean;
    toggleSidebar: () => void;
}

export interface SidebarProps {
    isSidebarOpen: boolean;
    activeSection: 'recent' | 'favorites' | 'folders';
    handleSectionChange: (section: 'recent' | 'favorites' | 'folders') => void;
    isShowingFullMemories: boolean;
    t: Function;
    lang: 'en' | 'ar';
}

export interface SearchBarProps {
    onSearch: (searchTerm: string) => void;
    t: Function;
    lang: 'en' | 'ar';
}

export interface CollapsibleSectionProps {
    title: string;
    children: React.ReactNode;
    theme: 'light' | 'dark';
}

export interface HtmlThemeUpdaterProps {
    theme: 'light' | 'dark';
}

export interface HtmlLangUpdaterProps {
    lang: 'en' | 'ar';
}

export interface MemoriesStackProps {
    memories: any[];
    apiURL: string;
    onClick: () => void;
}

export interface AnalysisViewProps {
    result: any;
    docId: number;
    apiURL: string;
    onUpdateAbstractSuccess: () => void;
    lang: 'en' | 'ar';
    theme: 'light' | 'dark';
}

export interface SlideData {
  id: number;
  title: string;
  content: string[];
}

export interface ShareInfo {
  is_restricted: boolean;
  target_email: string | null;
  target_email_hint: string | null;
  expiry_date: string | null;
  share_type: 'file' | 'folder';
}

export interface FolderItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  media_type: string;
}

export interface BreadcrumbItem {
  id: string;
  name: string;
}

export interface StoredSession {
  email: string;
  verifiedAt: number;
  shareType: 'file' | 'folder';
  folderId?: string;
}