# Smart EDMS — Frontend

**Smart EDMS** is a modern, full-featured **Electronic Document Management System** frontend built with **Next.js 15**, **React 19**, and **TypeScript**. It provides a rich, responsive interface for browsing, searching, uploading, organizing, sharing, and analyzing documents and media stored in an enterprise DMS. The application supports **bilingual UI** (English/Arabic), **dark/light themes**, **AI-powered document analysis**, **semantic search**, **document sharing with OTP verification**, **EDMS user provisioning**, **document activity history**, and comprehensive **admin panels** for system and organizational management.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Features](#features)
  - [Document Management](#document-management)
  - [Document Collage & Grouping](#document-collage--grouping)
  - [Media Viewing](#media-viewing)
  - [Folder Management](#folder-management)
  - [Search](#search)
  - [AI-Powered Analysis](#ai-powered-analysis)
  - [Tags & Persons](#tags--persons)
  - [Events](#events)
  - [Favorites & Memories](#favorites--memories)
  - [Document Sharing](#document-sharing)
  - [Admin Panel](#admin-panel)
  - [EMS Admin](#ems-admin)
  - [EDMS People Management](#edms-people-management)
  - [Profile Search](#profile-search)
  - [User Preferences](#user-preferences)
  - [Security & Permissions](#security--permissions)
- [Pages & Routing](#pages--routing)
- [Component Library](#component-library)
- [Custom Hooks](#custom-hooks)
- [State Management](#state-management)
- [Internationalization (i18n)](#internationalization-i18n)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Build & Deployment](#build--deployment)
- [Backend API Dependency](#backend-api-dependency)

---

## Architecture Overview

```
┌───────────────────────────────────────────────────────────┐
│                    Smart EDMS Frontend                     │
│                   (Next.js 15 + React 19)                 │
│                                                           │
│  ┌──────────┐  ┌──────────┐  ┌─────────────────────────┐ │
│  │  Pages   │  │Components│  │   Custom Hooks           │ │
│  │          │  │ (56)     │  │   (29 + 1 app-level)    │ │
│  │ /login   │  │ Header   │  │                           │ │
│  │ /dash    │  │ Sidebar  │  │ useAuth, useDocuments    │ │
│  │ /admin   │  │ Modals   │  │ useFolderContents        │ │
│  │ /shared  │  │ Filters  │  │ useUpload, useDownload   │ │
│  │ /profile │  │ Editors  │  │ useTags, usePersons      │ │
│  │ /ems-adm │  │ Viewers  │  │ useSharedAuth            │ │
│  │ /folders │  │ Collage  │  │ useDocumentGroups        │ │
│  │          │  │ History  │  │ useSearchContext         │ │
│  └──────────┘  └──────────┘  └─────────────────────────┘ │
│                      │                                     │
│            ┌─────────▼──────────┐                         │
│            │   API Client       │  React Query             │
│            │  (apiClient.ts)    │  (TanStack Query v5)     │
│            └─────────┬──────────┘                         │
│                      │ REST                                │
└──────────────────────┼────────────────────────────────────┘
                       │
              ┌────────▼────────┐
              │  Smart EDMS API │
              │  (FastAPI)      │
              │  Port 5000      │
              └─────────────────┘
```

---

## Technology Stack

| Component | Technology |
|---|---|
| **Framework** | Next.js 15 (App Router, Turbopack) |
| **UI Library** | React 19 |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS 3.4 |
| **State Management** | TanStack React Query v5 (server state), React Context (client state) |
| **Forms & Selects** | react-select, react-select-async-paginate, react-datepicker |
| **Document Rendering** | docx-preview (Word), xlsx (Excel) |
| **File Handling** | JSZip, ExifReader |
| **Spreadsheet Export** | xlsx (used for EDMS People export) |
| **Build Tooling** | PostCSS, Autoprefixer, env-cmd, archiver |
| **Linting** | ESLint (Next.js config) |
| **Deployment** | iisnode (IIS), create-bundle.js |

---

## Project Structure

```
Smart EDMS/
├── src/
│   ├── app/                          # Next.js App Router pages & components
│   │   ├── layout.tsx                # Root layout: providers, theme/lang detection, global security
│   │   ├── page.tsx                  # Root redirect (→ /dashboard)
│   │   ├── providers.tsx             # React Query client setup & error boundary
│   │   ├── globals.css               # Global styles, CSS variables, dark mode, RTL support
│   │   ├── not-found.tsx             # 404 page
│   │   ├── icon.ico                  # Favicon
│   │   │
│   │   ├── login/                    # Login page
│   │   │   └── page.tsx
│   │   │
│   │   ├── dashboard/                # Main dashboard page (document grid)
│   │   │   └── page.tsx
│   │   │
│   │   ├── folders/                  # Folder browser page
│   │   │   └── page.tsx
│   │   │
│   │   ├── folder/                   # Individual folder view
│   │   │   └── [id]/page.tsx
│   │   │
│   │   ├── favorites/                # Favorites page
│   │   │   └── page.tsx
│   │   │
│   │   ├── profilesearch/            # Advanced profile search page
│   │   │   └── page.tsx
│   │   │
│   │   ├── admin/                    # Admin panel (user management, queue dashboard, EDMS people)
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── components/
│   │   │       ├── EdmsUsersTab.tsx   # EDMS user provisioning (create, update, export to Excel)
│   │   │       └── ProfilesTab.tsx   # DMS profiles/groups browser (3-column drill-down)
│   │   │
│   │   ├── ems-admin/                # EMS organizational admin
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── companies/            # Companies (sections) management
│   │   │   ├── departments/          # Departments management
│   │   │   └── sections/             # EMS sections management
│   │   │
│   │   ├── shared/                   # Shared document/folder viewer (public, OTP-gated)
│   │   │   └── [token]/page.tsx
│   │   │
│   │   ├── error/                    # Error page
│   │   │   └── page.tsx
│   │   │
│   │   ├── api/                      # Next.js API routes (if any)
│   │   │
│   │   ├── context/                  # React Context providers
│   │   │   ├── UserContext.tsx        # User session, auth state, language/theme
│   │   │   └── ToastContext.tsx       # Toast notification system
│   │   │
│   │   ├── hooks/                    # Page-level hooks (co-located with pages)
│   │   │   └── useTranslations.ts    # Translation loader for i18n JSON files
│   │   │
│   │   └── components/               # Shared UI components (56 components)
│   │       ├── Header.tsx            # Top navigation bar with search, language, theme, user menu
│   │       ├── Sidebar.tsx           # Navigation sidebar with section links
│   │       ├── SidebarSkeleton.tsx   # Loading skeleton for sidebar while auth loads
│   │       ├── MainDashboard.tsx     # Document grid with infinite scroll & filtering
│   │       ├── PortalLanding.tsx     # Landing/home page component
│   │       │
│   │       ├── DocumentItem.tsx      # Document card (thumbnail, title, tags, actions)
│   │       ├── DocumentList.tsx      # Document list layout
│   │       ├── DocumentModals.tsx    # Modal orchestrator for document viewing
│   │       ├── DocumentItemSkeleton.tsx  # Loading skeleton for document cards
│   │       ├── DocumentCollage.tsx   # Stacked collage display for same-name documents (up to 3 thumbnails with count badge)
│   │       │
│   │       ├── ImageModal.tsx        # Full-screen image viewer with zoom, pan, analysis
│   │       ├── VideoModal.tsx        # Video player modal
│   │       ├── PdfModal.tsx          # PDF viewer modal
│   │       ├── ExcelModal.tsx        # Excel spreadsheet viewer modal (parsed via xlsx)
│   │       ├── WordModal.tsx         # Word document viewer modal (rendered via docx-preview)
│   │       ├── PowerPointModal.tsx   # PowerPoint viewer modal
│   │       ├── TxtModal.tsx          # Text file viewer modal
│   │       ├── FileModal.tsx         # Generic file viewer/download modal
│   │       ├── GalleryModal.tsx      # Photo gallery modal
│   │       ├── ModalNavigationBar.tsx # Navigation bar for grouped/collaged documents (position indicator, prev/next, search context)
│   │       │
│   │       ├── Folders.tsx           # Folder browser component (tree nav, breadcrumbs, grid, context menu, drag & drop)
│   │       ├── CreateFolderModal.tsx  # New folder dialog
│   │       ├── FolderUploadModal.tsx  # Upload to folder dialog (drag & drop, multi-file)
│   │       ├── FolderSkeleton.tsx    # Loading skeleton for folders
│   │       │
│   │       ├── UploadModal.tsx       # Document upload modal (drag & drop, queue)
│   │       ├── UploadFileItem.tsx    # Individual file in upload queue
│   │       │
│   │       ├── SearchBar.tsx         # Search input with debounce
│   │       ├── FilterBar.tsx         # Active filter chips display
│   │       ├── AdvancedFilters.tsx   # Expandable advanced filter panel
│   │       ├── TagFilter.tsx         # Tag filter multi-select
│   │       ├── YearFilter.tsx        # Year filter selector
│   │       ├── DateRangePicker.tsx   # Date range picker (react-datepicker)
│   │       ├── PersonSelector.tsx    # Person/VIP async search selector
│   │       │
│   │       ├── TagEditor.tsx         # Add/remove tags on documents
│   │       ├── ReadOnlyTagDisplay.tsx # Read-only tag badge display
│   │       │
│   │       ├── AnalysisView.tsx      # AI analysis panel (captions, OCR, faces, status)
│   │       ├── SecurityModal.tsx     # Document security/trustee management modal
│   │       ├── ShareModal.tsx        # Share link generation modal (single/multi-recipient)
│   │       ├── HistoryModal.tsx      # Document activity history modal (versioning, audit log)
│   │       │
│   │       ├── InfiniteSelect.tsx    # Custom infinite-scroll dropdown (used for group/agency/department selection)
│   │       ├── LoadingButton.tsx     # Button with integrated spinner and loading state (aria-busy)
│   │       ├── Pagination.tsx        # Page navigation component
│   │       ├── Loader.tsx            # Loading indicator
│   │       ├── Spinner.tsx           # Animated spinner (xs/sm/md/lg sizes)
│   │       ├── ErrorBoundary.tsx     # React error boundary with fallback UI
│   │       │
│   │       ├── ClearCacheModal.tsx   # Cache clearing confirmation dialog
│   │       ├── CollapsibleSection.tsx # Accordion/collapsible UI section
│   │       ├── GlobalSecurity.tsx    # Client-side security context injection
│   │       ├── HtmlLangUpdater.tsx   # Updates <html lang> attribute reactively
│   │       ├── HtmlThemeUpdater.tsx  # Updates <html> dark class reactively
│   │       │
│   │       ├── AdminNavButton.tsx    # Admin panel navigation button
│   │       ├── AdminSidebarItem.tsx  # Admin sidebar with sub-navigation
│   │       ├── EmsAdminSidebarItem.tsx # EMS admin sidebar entry
│   │       │
│   │       ├── QuotaAccessBadge.tsx  # Storage quota usage badge
│   │       ├── QuotaPieChart.tsx     # Quota usage pie chart visualization
│   │       └── UserAccessBadge.tsx   # User role/access level badge
│   │
│   ├── hooks/                        # Global custom hooks (29 hooks)
│   │   ├── useAuth.ts                # Authentication: login, logout, session check
│   │   ├── useDocuments.ts           # Document fetching, filtering, pagination
│   │   ├── useDocumentContent.ts     # Document content loading for modals
│   │   ├── useDocumentModals.ts      # Modal state management (open/close/type)
│   │   ├── useDocumentMutations.ts   # Document update mutations (metadata, abstract)
│   │   ├── useDocumentTagsBatch.ts   # Batch tag fetching for document lists
│   │   ├── useDocumentGroups.ts      # Document grouping by filename for collage display & intra-group navigation
│   │   ├── useDownload.ts            # Watermarked document download
│   │   ├── useUpload.ts              # Document upload with progress tracking
│   │   ├── useFolderContents.ts      # Folder contents fetching
│   │   ├── useFolderMutations.ts     # Folder CRUD operations (create, rename, delete, move)
│   │   ├── useMoveModalFolders.ts    # Move-to-folder modal folder tree navigation
│   │   ├── useTags.ts                # Tag CRUD operations and shortlist toggle
│   │   ├── usePersons.ts             # Person search (async paginated)
│   │   ├── useProcessingStatus.ts    # Polls AI processing status for recently uploaded docs
│   │   ├── useProfileSearch.ts       # Profile search scopes, types, and query execution
│   │   ├── useSearchContext.ts       # Search context provider & search term highlighting (text, HTML-aware, position-based)
│   │   ├── useAnalysis.ts            # Triggers AI face analysis on a document
│   │   ├── useSecurity.ts            # Document security/trustee management
│   │   ├── useSharedAuth.ts          # Shared document OTP authentication flow
│   │   ├── useSharedContent.ts       # Shared document/folder content loading
│   │   ├── useSharedFileDownload.ts  # Shared file download with watermark
│   │   ├── useAdmin.ts               # Admin panel data and mutations (users, queue, EDMS people, profiles, document history)
│   │   ├── useEmsAdminAuth.ts        # EMS admin access check
│   │   ├── useQuota.ts               # User storage quota query
│   │   ├── useSystemOperations.ts    # System-level operations (cache clear)
│   │   ├── useUserPreferences.ts     # Language and theme preferences
│   │   ├── useDebouncedValue.ts      # Debounced value hook for search inputs
│   │   └── useFocusTrap.ts           # Focus trap for accessible modal dialogs
│   │
│   ├── lib/                          # Library utilities
│   │   ├── apiClient.ts              # Centralized fetch wrapper: auth headers, error handling, session expiry detection, auto-redirect
│   │   └── toastBridge.ts            # Event-based toast notification bridge (decouples React Query from Toast context)
│   │
│   ├── interfaces/                   # TypeScript interfaces
│   │   ├── PropsInterfaces.ts        # Component prop types (modal props, filter props, etc.)
│   │   ├── TagObject.ts              # Tag data interface
│   │   ├── UploadableFile.ts         # File upload interface
│   │   └── index.ts                  # Barrel export
│   │
│   ├── models/                       # TypeScript data models
│   │   ├── Document.ts               # Document model with all metadata fields
│   │   ├── User.ts                   # User model (username, security, language, theme, permissions)
│   │   └── PersonOption.ts           # Person search result model
│   │
│   └── locales/                      # i18n translation files
│       ├── en.json                   # English translations (~600+ keys)
│       └── ar.json                   # Arabic translations (~600+ keys)
│
├── public/                           # Static assets
├── package.json                      # Dependencies and scripts
├── next.config.mjs                   # Next.js configuration (remote image patterns)
├── tailwind.config.ts                # Tailwind CSS configuration
├── postcss.config.ts                 # PostCSS configuration
├── postcss.config.mjs                # PostCSS configuration (alternative)
├── tsconfig.json                     # TypeScript configuration
├── eslint.config.mjs                 # ESLint configuration
├── create-bundle.js                  # Build bundler: npm install → build → zip .next/ for deployment
├── create_archive.bat                # Creates a timestamped project ZIP (respects .gitignore)
├── web.config                        # IIS deployment configuration (iisnode + URL rewrite)
├── .env.local                        # Local development environment variables
└── .env.production                   # Production environment variables
```

---

## Features

### Document Management

- **Paginated Document Grid**: Scrollable, dynamically-loading grid of document cards showing thumbnails, titles, dates, and tags
- **Multi-Format Upload**: Drag-and-drop or file picker upload with:
  - Automatic EXIF date extraction from photos
  - File quota validation per user
  - Progress tracking per file
  - Auto-triggers AI processing after upload
- **Document Metadata Editing**: Update document name, abstract, and date taken inline
- **Watermarked Downloads**: All downloaded documents are watermarked with the user's system ID, document ID, and timestamp
- **Document Deletion**: Delete documents and folders with automatic quota restoration
- **Security/Trustees**: Set per-document access control lists (ACLs) via the DMS trustee system
- **Activity History**: View document activity history (versioning, audit trail) via the HistoryModal

### Document Collage & Grouping

Documents with the same filename are automatically grouped and displayed as a visual "collage" — a stacked card effect showing up to 3 overlapping thumbnails with a count badge. This feature enables:

- **Visual grouping**: Multiple versions or copies of the same document appear as a single stacked card
- **Intra-group navigation**: When viewing a grouped document in a modal, the `ModalNavigationBar` shows position (e.g., "2 of 5") with previous/next buttons
- **Search context display**: When opened from profile search, the navigation bar shows the matched search term and field
- **Powered by `useDocumentGroups` hook**: Manages grouping by filename, navigation state, and group membership checks

### Media Viewing

The application includes **8 specialized modal viewers**, each tailored for its file type:

| Viewer | Features |
|---|---|
| **ImageModal** | Full-screen view, zoom, pan, download, AI analysis trigger, tag editing, security management, sharing, activity history |
| **VideoModal** | HTML5 video player, streaming with Range requests, download, tag editing |
| **PdfModal** | Embedded PDF viewer (iframe), page navigation, download |
| **ExcelModal** | Parsed spreadsheet rendering (via `xlsx`), multi-sheet support, table view |
| **WordModal** | DOCX rendering (via `docx-preview`), styled preview |
| **PowerPointModal** | PowerPoint file preview and download |
| **TxtModal** | Plain text viewer with monospace rendering |
| **FileModal** | Generic file download modal for unsupported types |

All modals support the `ModalNavigationBar` for navigating between grouped documents and displaying search context information.

### Folder Management

- **Hierarchical Folder Browser**: Tree navigation with breadcrumb trail and context menus
- **Folder Operations**: Create, rename, delete (recursive), move items between folders
- **Folder Upload**: Upload multiple files into a specific folder (drag & drop support)
- **Folder Download**: Download all files in a folder as a ZIP archive (300 MB limit)
- **Security Inheritance**: New folders and uploads inherit parent folder's security trustees
- **Folder Sharing**: Share entire folders via shareable links
- **Document History**: View activity history for any document within a folder

### Search

- **Global Search**: Free-text search across document titles and abstracts
- **Semantic Vector Search**: AI-powered similarity search using ChromaDB embeddings (transparent to user — results are merged with keyword results)
- **Search Term Highlighting**: When viewing profile search results, matched terms are highlighted in document content using `useSearchContext` — supports exact, startsWith, and contains (like) matching, with HTML-aware highlighting
- **Advanced Filters**:
  - Date range (from/to)
  - Person/VIP filter (multi-select, async paginated)
  - Tag filter (multi-select with shortlisted favorites)
  - Year filter
  - Media type filter (images, videos, files)
  - Sort options (newest, oldest, relevance)
  - Scope filter (all documents vs. user's documents)

### AI-Powered Analysis

- **Image Captioning**: View AI-generated descriptions for images
- **OCR Text**: View extracted text from images and PDFs
- **Face Recognition**: Detect and identify known individuals. Update document abstract with identified VIP names
- **Processing Status**: Real-time polling shows processing progress for newly uploaded documents
- **Analysis View**: Dedicated panel showing all AI analysis results per document

### Tags & Persons

- **Tag System**: Documents are tagged with bilingual keywords (English + Arabic)
- **Tag Filtering**: Filter the document grid by tags
- **Tag Editor**: Add/remove tags on documents (auto-translates between EN↔AR)
- **Person Management**: Add new persons to the lookup table (auto-translated names)
- **Shortlisted Tags**: Editors can pin frequently-used tags to the top of filters

### Events

- **Event System**: Create and manage named events
- **Document-Event Linking**: Associate documents with events for organizational grouping
- **Event Gallery**: Browse documents by event with paginated navigation

### Favorites & Memories

- **Favorites**: Bookmark documents for quick access. Dedicated favorites page with full filtering
- **Memories ("On This Day")**: Browse photos and videos from the same day in previous years — generates nostalgia-driven re-discovery of historical content

### Document Sharing

- **Share Link Generation**: Generate shareable links for individual documents or entire folders
- **Two Sharing Modes**:
  - **Open**: Any user with a `@rta.ae` email can access via OTP
  - **Restricted**: Only specified email addresses can access (link sent via email automatically)
- **OTP Verification**: 6-digit code sent to the viewer's email for identity verification
- **Shared Document Viewer**: Standalone page (`/shared/[token]`) for viewing shared content without login
- **Shared Folder Navigation**: Browse shared folder contents with subfolder navigation and breadcrumbs
- **Watermarked Downloads**: Shared downloads are watermarked with the viewer's email
- **Multi-Recipient Sharing**: Share with multiple email addresses simultaneously (each gets a unique link)

### Admin Panel

Accessible only to users on the admin allowlist. Located at `/admin`. Contains multiple tabs:

#### Smart EDMS Users Tab
- View all Smart EDMS users with search and pagination
- Add new users from the corporate directory (PEOPLE table)
- Edit user security level, language, theme, and storage quota
- Delete users from the system
- View and manage per-user tab permissions (which UI sections each user can see)
- Storage quota visualization (pie chart)

#### EDMS People (Users) Tab
Full EDMS user provisioning directly from the admin panel:
- **Browse EDMS Users**: Paginated list of all PEOPLE table users with HR hierarchy data, group counts, and status
- **Search HR Employees**: Find employees in the HR system not yet provisioned in EDMS
- **Create New Users**: Full user creation form with:
  - Username, full name, email, password
  - Primary group selection (via `InfiniteSelect` dropdown)
  - Additional group assignment (multi-select)
  - Network alias management
  - HR linkage (auto-populates from HR employee selection with cascading agency → department → section dropdowns)
  - Login and disabled status toggles
- **Edit Existing Users**: Update any user field including optional password reset, group rebuilds, and alias management
- **Export to Excel**: Download filtered user list as an Excel file with full details (username, name, email, HR hierarchy, groups, last login)

#### DMS Profiles Tab
Three-column drill-down browser for DMS security profiles:
- **Profiles Column**: Lists all DMS security profiles
- **Groups Column**: Shows groups within the selected profile
- **Users Column**: Shows users within the selected group

#### Processing Queue Dashboard
- Real-time status: queued, in-progress, completed, failed job counts
- Oracle staging queue preview (upstream pending documents)
- Recent failure list with error details
- Worker controls: Pause, Resume, Drain
- Retry failed jobs (bulk or selective by document number)
- Purge completed jobs older than N hours
- Worker mode audit log (who changed what, when)

### EMS Admin

Accessible to users in the `EMS_ADMIN` DMS group or with Editor+ security. Located at `/ems-admin`.

Manages the **organizational hierarchy**:
- **Companies/Sections**: Create and edit organizational sections
- **Departments**: Create departments under agencies, with bilingual names
- **EMS Sections**: Hierarchical sections within departments, each with an EMS code
- All entries support enable/disable toggling and bilingual names (English + Arabic)

### EDMS People Management

The EDMS People management feature (accessed via the Admin Panel's EDMS Users tab) provides full lifecycle management for DMS user accounts:

- **User Provisioning**: Create new DMS users from HR employee records with automatic group assignment and DOCS_USERS auto-enrollment
- **HR Integration**: Cascading agency → department → section selection that mirrors the HR organizational structure
- **Group Management**: Assign primary group and multiple additional groups per user
- **Network Aliases**: Configure network aliases for SSO/domain authentication
- **Password Management**: Set initial passwords on creation, optional password reset on updates (MD5 Base64 hashing for DMS compatibility)
- **Bulk Export**: Export all active users to Excel with complete details including group memberships and HR hierarchy
- **Status Management**: Toggle allow_login and disabled flags per user

### Profile Search

Located at `/profilesearch`. An advanced document search system that queries the Oracle database using dynamically-configured search forms and fields.

- **Search Scopes**: Control which Oracle tables to query:
  - **Auto**: Automatically routes based on search type configuration
  - **Global**: Cross-table search (slower, comprehensive)
  - **Specific Forms**: Targeted queries against specific Oracle forms (fast)
- **Multi-Criteria Search**: Up to 6 search criteria combined with AND logic
- **Match Types**: `like`, `exact`, `startsWith`
- **Date Range Filter**: Filter by document date
- **Paginated Results**: Navigate through large result sets
- **Search Term Highlighting**: Matched terms are highlighted in results using `useSearchContext`, with support for HTML-aware highlighting that preserves markup

### User Preferences

- **Language Toggle**: Switch between English (LTR) and Arabic (RTL) — persisted to database
- **Theme Toggle**: Switch between light and dark mode — persisted to database
- **Preferences are remembered**: Language and theme are stored both in `localStorage` (for instant flash-free loading) and in the database (for cross-device persistence)

### Security & Permissions

- **Session-Based Authentication**: Login via DMS SOAP service, session stored in HTTP-only cookies
- **Automatic Session Detection**: On page load, the app checks for an existing session and redirects to login if expired
- **Three Security Levels**: Admin, Editor, Viewer — determines what actions are available
- **Tab Permissions**: Per-user visibility control for sidebar navigation sections (e.g., admin, ems-admin, profile search, favorites)
- **Document-Level Security**: ACL management via a dedicated Security Modal (set trustees with read/write/delete granularity)

---

## Pages & Routing

| Path | Page | Auth Required | Description |
|---|---|---|---|
| `/` | Root | Yes | Redirects to `/dashboard` |
| `/login` | Login | No | Username/password login form |
| `/dashboard` | Dashboard | Yes | Main document grid with all filters |
| `/folders` | Folders | Yes | Root folder browser |
| `/folder/[id]` | Folder View | Yes | Browse a specific folder's contents |
| `/favorites` | Favorites | Yes | User's favorited documents |
| `/profilesearch` | Profile Search | Yes | Multi-criteria advanced search |
| `/admin` | Admin Panel | Yes (Allowlist) | User management, EDMS people provisioning, profiles browser, & queue dashboard |
| `/ems-admin` | EMS Admin | Yes (EMS Group) | Organizational hierarchy management |
| `/ems-admin/companies` | Companies | Yes (EMS Group) | Company/section management |
| `/ems-admin/departments` | Departments | Yes (EMS Group) | Department management |
| `/ems-admin/sections` | EMS Sections | Yes (EMS Group) | EMS section management |
| `/shared/[token]` | Shared View | OTP | OTP-gated document/folder viewer |

---

## Component Library

The application contains **56 dedicated React components** in `src/app/components/` plus **2 admin sub-components** in `src/app/admin/components/`. Key architectural patterns:

- **Modal System**: Type-specific viewers (Image, Video, PDF, Excel, Word, PowerPoint, Text, File, Gallery) orchestrated by `DocumentModals.tsx`, with `ModalNavigationBar` for group navigation
- **Collage System**: `DocumentCollage` renders stacked thumbnails for same-name documents, with `ModalNavigationBar` providing intra-group navigation within modals
- **Filter System**: Composable filters (`AdvancedFilters`, `TagFilter`, `YearFilter`, `DateRangePicker`, `PersonSelector`) that sync with URL-driven state
- **Form Components**: `InfiniteSelect` for scrollable dropdowns with search, `LoadingButton` for async-aware buttons with spinner states
- **Skeleton Loading**: `DocumentItemSkeleton`, `FolderSkeleton`, and `SidebarSkeleton` provide shimmer loading states
- **Error Handling**: `ErrorBoundary` catches React rendering errors with a user-friendly fallback
- **Accessibility**: `useFocusTrap` ensures keyboard navigation stays within open modals; `LoadingButton` sets `aria-busy`
- **Admin Components**: `EdmsUsersTab` for full EDMS user CRUD with HR integration and Excel export; `ProfilesTab` for three-column DMS profile/group/user drill-down

---

## Custom Hooks

The application uses **29 global custom hooks** in `src/hooks/` plus **1 app-level hook** (`useTranslations` in `src/app/hooks/`) to encapsulate all data fetching and mutation logic. Every hook uses **TanStack React Query v5** for:

- **Automatic caching** (1 minute stale time, 5 minute garbage collection)
- **Background refetching** on mutation success
- **Optimistic updates** where applicable
- **Error handling** with automatic toast notifications
- **Query invalidation** for cross-component data consistency

Notable patterns:
- `useDocuments` — Complex query with 10+ filter parameters, debounced search, and pagination
- `useDocumentGroups` — Groups documents by filename to support collage display and intra-group modal navigation (next/previous within group)
- `useSearchContext` — React Context + utilities for highlighting matched search terms in profile search results. Provides `highlightSearchTerm()` for plain text, `highlightInHtml()` for HTML-aware highlighting, and `getHighlightPositions()` for position-based highlighting
- `useProcessingStatus` — Auto-polling hook that checks every 5s if documents are still being AI-processed, then refreshes the document list on completion
- `useSharedAuth` — Manages the full OTP flow: request access → verify code → load document
- `useProfileSearch` — Dynamic search with scope/type/criteria management
- `useAdmin` — Comprehensive admin hook providing: user CRUD, tab permissions, processing queue control, EDMS people management (create/update/export), DMS profiles browsing, and document history queries

---

## State Management

| Layer | Technology | Purpose |
|---|---|---|
| **Server State** | TanStack React Query v5 | All API data: documents, folders, tags, events, users, EDMS people, profiles, etc. |
| **User State** | React Context (`UserContext`) | Authenticated user session, security level, language, theme, tab permissions |
| **UI Notifications** | React Context (`ToastContext`) | Global toast notification queue (success, error, warning, info) |
| **Search State** | React Context (`ProfileSearchContextProvider`) | Current search criteria for result highlighting |
| **Local Persistence** | `localStorage` | Language and theme for flash-free initial load |

---

## Internationalization (i18n)

- **Supported Languages**: English (`en`), Arabic (`ar`)
- **Translation Files**: `src/locales/en.json` and `src/locales/ar.json` — 600+ translation keys each
- **Coverage**: All UI labels, error messages, tooltips, form placeholders, confirmation dialogs, admin panel labels, and EDMS people management forms are fully translated
- **RTL Support**: Arabic mode automatically switches the document direction to RTL
- **Dynamic Switching**: Language changes are applied instantly without page reload
- **Translation Hook**: `useTranslations(lang)` in `src/app/hooks/useTranslations.ts` loads the correct locale file based on user language preference

---

## Environment Variables

### `.env.local` (Development)
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### `.env.production` (Production)
```
NEXT_PUBLIC_API_URL=https://your-production-api.example.com
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the Smart EDMS backend API |

---

## Getting Started

### Prerequisites
- **Node.js 18+**
- **npm** or another package manager
- **Smart EDMS API** running (see the EDMS API README for setup)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd "Smart EDMS"
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   # Create local environment file
   cp .env.production .env.local
   # Edit .env.local to point to your API
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

---

## Build & Deployment

### Development
```bash
npm run dev        # Starts Next.js dev server with Turbopack
```

### Production Build
```bash
npm run build      # Creates optimized production build (uses .env.production)
npm run start      # Starts production server
```

### Deployment Bundle
```bash
npm run bundle     # Runs create-bundle.js: installs, builds, then zips .next/ into deploy.zip
```

### Project Archive
```bash
create_archive.bat   # Creates a timestamped ZIP of the project (respects .gitignore, excludes venv/.git)
```

### Offline Deployment
The `files to install/` directory and `files to install.zip` contain pre-built packages for air-gapped server deployment.

### IIS Deployment
The `web.config` file is pre-configured for deployment on Windows IIS:
- Uses **iisnode** to run the Next.js server
- URL rewrite rules route all requests through `server.js`
- Security headers: `Referrer-Policy`, `X-Content-Type-Options`
- Node.js production mode with logging enabled
- Excludes the `/PTAEDMS` sub-application path from rewrites

---

## Backend API Dependency

This frontend requires the **Smart EDMS API** (FastAPI backend) to be running. The backend provides:

- Document CRUD and streaming from the enterprise DMS
- User authentication via SOAP DMS
- AI processing pipeline (captioning, OCR, face recognition, video summarization)
- Semantic vector search (ChromaDB)
- Document sharing with OTP verification
- Admin operations (user management, queue control)
- EDMS user provisioning (PEOPLE table CRUD, group management, HR linkage)
- DMS profile and group browsing
- Document activity history
- Organizational management (agencies, departments, sections)
- eDOCS server cache management

**Default backend URL:** `http://localhost:5000`

Make sure the backend API is running and accessible before starting the frontend. Refer to the [EDMS API README](../EDMS%20API/readme.md) for backend setup instructions.

---

## External AI Services

The following AI microservices are accessed through the backend API (not directly from the frontend):

| Service | Port | Purpose |
|---|---|---|
| Image Captioning | 5001 | Generates descriptions and tags for images |
| Face Recognition | 5002 | Detects and identifies known individuals |
| Text Embedding | 5003 | Generates vector embeddings for semantic search |
| OCR | 5004 | Extracts text from images and PDFs |
| Translator/Rephraser | 5005 | Translates text between English and Arabic |
| Video Summarizer | 5008 | Analyzes video: objects, transcript, faces, OCR |