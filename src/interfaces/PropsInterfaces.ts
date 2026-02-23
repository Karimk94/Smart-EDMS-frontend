import { Document } from "../models/Document";
import { UploadableFile } from "./UploadableFile";
import { PersonOption } from "../models/PersonOption";

export interface UploadModalProps {
    onClose: () => void;
    apiURL: string;
    onAnalyze: (uploadedFiles: UploadableFile[]) => void;
    theme: 'light' | 'dark';
    t: Function;
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

export interface PdfModalProps {
    doc: Document;
    onClose: () => void;
    apiURL: string;
    onUpdateAbstractSuccess: () => void;

    isEditor: boolean;
    t: Function;
    lang: 'en' | 'ar';
    theme: 'light' | 'dark';
}

export interface ImageModalProps {
    doc: Document;
    onClose: () => void;
    apiURL: string;
    onUpdateAbstractSuccess: () => void;

    isEditor: boolean;
    t: Function;
    lang: 'en' | 'ar';
    theme: 'light' | 'dark';
}

export interface VideoModalProps {
    doc: Document;
    onClose: () => void;
    apiURL: string;
    onUpdateAbstractSuccess: () => void;

    isEditor: boolean;
    t: Function;
    lang: 'en' | 'ar';
    theme: 'light' | 'dark';
}

export interface PersonSelectorProps {
    apiURL: string;
    value: string;
    onChange: (name: string) => void;
    lang: 'en' | 'ar';
    theme: 'light' | 'dark';
    fetchUrl?: string;
    headers?: Record<string, string>;
    onSelect?: (person: { USER_ID: string; FULL_NAME: string }) => void;
}

export interface YearFilterProps {
    selectedYears: number[];
    setSelectedYears: (years: number[]) => void;
    t: Function;
}

// ... (Removing duplicates and updating)

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
    t: Function
}



export interface TxtModalProps {
    doc: Document;
    onClose: () => void;
    apiURL: string;
    onUpdateAbstractSuccess: () => void;

    isEditor: boolean;
    t: Function;
    lang: 'en' | 'ar';
    theme: 'light' | 'dark';
}

export interface FileModalProps {
    doc: Document;
    onClose: () => void;
    apiURL: string;
    onUpdateAbstractSuccess: () => void;

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

    isEditor: boolean;
    t: Function;
    lang: 'en' | 'ar';
    theme: 'light' | 'dark';
}

export interface WordModalProps {
    doc: Document;
    onClose: () => void;
    apiURL: string;
    onUpdateAbstractSuccess: () => void;

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

    isEditor: boolean;
    t: Function;
    lang: 'en' | 'ar';
    theme: 'light' | 'dark';
}

export interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    documentId?: string;
    folderId?: string;
    documentName: string;
    itemType?: 'file' | 'folder';
    t: Function;
}

export interface Trustee {
    username: string;
    rights: number;
    flag: number;
}

export interface SecurityModalProps {
    isOpen: boolean;
    onClose: () => void;
    docId: string;
    library: string;
    itemName: string;
    t: Function;
}

export interface FolderUploadModalProps {
    onClose: () => void;
    apiURL: string;
    theme: 'light' | 'dark';
    parentId: string | null;
    parentName: string;
    onUploadComplete: () => void;
}

export interface TagEditorProps {
    docId: number;
    apiURL: string;
    lang: 'en' | 'ar';
    theme: 'light' | 'dark';
    t: Function;
}



export interface DateRangePickerProps {
    dateFrom: Date | null;
    setDateFrom: (date: Date | null) => void;
    dateTo: Date | null;
    setDateTo: (date: Date | null) => void;
    t: Function;
}

export interface CreateFolderModalProps {
    onClose: () => void;
    apiURL: string;
    onFolderCreated: () => void;
    t: Function;
    initialParentId?: string;
}

export interface AdvancedFiltersProps {
    dateFrom: Date | null;
    setDateFrom: (date: Date | null) => void;
    dateTo: Date | null;
    setDateTo: (date: Date | null) => void;
    selectedPerson: PersonOption[] | null;
    setSelectedPerson: (person: PersonOption[] | null) => void;
    personCondition: 'any' | 'all';
    setPersonCondition: (condition: 'any' | 'all') => void;
    mediaType: 'image' | 'video' | 'pdf' | null;
    setMediaType: (type: 'image' | 'video' | 'pdf' | null) => void;
    apiURL: string;
    t: Function;
    lang: 'en' | 'ar';
    theme: 'light' | 'dark';
}

export interface DocumentListProps {
    documents: Document[];
    onDocumentClick: (doc: Document) => void;
    apiURL: string;
    onTagSelect: (tag: string) => void;
    isLoading: boolean;
    processingDocs: number[];

    lang: 'en' | 'ar';
    t: Function;
}

export interface DocumentItemProps {
    doc: Document;
    onDocumentClick: (doc: Document) => void;
    apiURL: string;
    onTagSelect: (tag: string) => void;
    isProcessing: boolean;

    lang: 'en' | 'ar';
    t: Function;
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

export interface HeaderProps {
    onSearch: (searchTerm: string) => void;
    onClearCache: () => void;
    t: Function;
    apiURL: string;
    onOpenUploadModal: () => void;
    isProcessing: boolean;
    isEditor: boolean;
    isSidebarOpen: boolean;
    toggleSidebar: () => void;
    activeSection?: 'recent' | 'favorites' | 'folders' | 'researcher';
}

export interface SidebarProps {
    isSidebarOpen: boolean;
    activeSection: 'recent' | 'favorites' | 'folders' | 'researcher';
    handleSectionChange: (section: 'recent' | 'favorites' | 'folders' | 'researcher') => void;
    isShowingFullMemories: boolean;
    t: Function;
    lang: 'en' | 'ar';
    hiddenSections?: ('recent' | 'favorites' | 'folders' | 'researcher')[];
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
    forceDir?: 'ltr' | 'rtl';
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
    t: Function;
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
    skip_otp?: boolean; // true for restricted shares (specific email) - skip OTP verification
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