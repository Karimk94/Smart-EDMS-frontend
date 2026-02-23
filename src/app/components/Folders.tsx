import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';
import { FolderItem, useFolderContents } from '../../hooks/useFolderContents';
import { useDeleteFolder, useRenameFolder } from '../../hooks/useFolderMutations';
import { useDownload } from '../../hooks/useDownload';
import { Document } from '../../models/Document';
import { useToast } from '../context/ToastContext';
import { CreateFolderModal } from './CreateFolderModal';
import SecurityModal from './SecurityModal';
import ShareModal from './ShareModal';


interface FoldersProps {
  onFolderClick: (folderId: 'images' | 'videos' | 'files') => void;
  onDocumentClick?: (doc: Document) => void;
  onUploadClick: (parentId: string | null, parentName: string) => void;
  t: Function;
  apiURL: string;
  isEditor: boolean;
  initialFolderId?: string | null;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  item: FolderItem | null;
}

export const Folders: React.FC<FoldersProps> = ({ onFolderClick, onDocumentClick, onUploadClick, t, apiURL, isEditor, initialFolderId }) => {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(initialFolderId || null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: t('home') || 'Home' }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  const { data, isLoading: isFetching } = useFolderContents({
    parentId: currentFolderId,
    searchTerm: debouncedSearchTerm,
    apiURL
  });

  const items = data?.contents || [];
  const [isOperationLoading, setIsOperationLoading] = useState(false);
  const isLoading = isFetching || isOperationLoading;

  const [showCreateModal, setShowCreateModal] = useState(false);

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, item: null });
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [selectedSecurityItem, setSelectedSecurityItem] = useState<FolderItem | null>(null);

  // Share Modal State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [itemToShare, setItemToShare] = useState<FolderItem | null>(null);

  const deleteFolderMutation = useDeleteFolder();
  const renameFolderMutation = useRenameFolder();
  const { download } = useDownload();

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<FolderItem | null>(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [deleteMode, setDeleteMode] = useState<'standard' | 'force'>('standard');

  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [itemToRename, setItemToRename] = useState<FolderItem | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  const { showToast, removeToast } = useToast();

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Sync breadcrumbs from backend data if available
  useEffect(() => {
    if (data?.breadcrumbs && Array.isArray(data.breadcrumbs)) {
      setBreadcrumbs([{ id: null, name: t('home') || 'Home' }, ...data.breadcrumbs]);
    }
  }, [data, t]);

  useEffect(() => {
    // Sync breadcrumbs from URL if present
    if (!searchParams) return;
    const breadcrumbsParam = searchParams.get('breadcrumbs');
    if (breadcrumbsParam) {
      try {
        const parsed = JSON.parse(breadcrumbsParam);
        if (Array.isArray(parsed)) {
          setBreadcrumbs(parsed);
        }
      } catch (e) { console.error("Error parsing breadcrumbs", e); }
    }
  }, [searchParams]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Close Context Menu
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu({ ...contextMenu, visible: false });
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [contextMenu]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmModalOpen) {
          setConfirmModalOpen(false);
          setItemToDelete(null);
        }
        if (isRenameModalOpen) {
          setIsRenameModalOpen(false);
        }
        if (isShareModalOpen) {
          setIsShareModalOpen(false);
        }
      }
    };

    if (confirmModalOpen || isRenameModalOpen || isShareModalOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [confirmModalOpen, isRenameModalOpen, isShareModalOpen]);

  useEffect(() => {
    if (initialFolderId !== undefined) {
      setCurrentFolderId(initialFolderId);
    }
  }, [initialFolderId]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const searchParamsObj = new URLSearchParams(window.location.search);

      if (path === '/folders') {
        // Root folders view
        setCurrentFolderId(null);
        setBreadcrumbs([{ id: null, name: t('home') || 'Home' }]);
      } else if (path.startsWith('/folder/')) {
        // Extract folder ID from path
        const folderId = path.split('/folder/')[1]?.split('?')[0];
        if (folderId) {
          setCurrentFolderId(folderId);

          // Try to restore breadcrumbs from URL
          const breadcrumbsParam = searchParamsObj.get('breadcrumbs');
          if (breadcrumbsParam) {
            try {
              const parsed = JSON.parse(breadcrumbsParam);
              if (Array.isArray(parsed)) {
                setBreadcrumbs(parsed);
              }
            } catch (e) {
              // Fallback breadcrumbs
              const folderName = searchParamsObj.get('name') || folderId;
              setBreadcrumbs([{ id: null, name: t('home') || 'Home' }, { id: folderId, name: folderName }]);
            }
          } else {
            // Standard folder or no breadcrumbs in URL
            if (['images', 'videos', 'files'].includes(folderId)) {
              setBreadcrumbs([{ id: null, name: t('home') || 'Home' }, { id: folderId, name: t(folderId) || folderId }]);
            } else {
              const folderName = searchParamsObj.get('name') || folderId;
              setBreadcrumbs([{ id: null, name: t('home') || 'Home' }, { id: folderId, name: folderName }]);
            }
          }
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [t]);

  // Error handling for 404 is now easier if we want to redirect, 
  // but React Query handles errors via 'error' object or onError callbacks.
  // For now, we rely on the component rendering empty or error state if needed,
  // roughly mirroring the specialized 404 redirect if absolutely necessary.
  /*
    The previous fetchContents had a specific 404 redirect. 
    If we want to maintain exactly that, we can use the 'error' from the hook.
    But usually, simple error UI is better than redirect.
  */

  const getFolderHref = (item: FolderItem) => {
    if (item.is_standard) {
      return `/folder/${item.id}`;
    }
    const newBreadcrumbs = [...breadcrumbs, { id: item.id, name: item.name }];
    const json = JSON.stringify(newBreadcrumbs);
    // Include name param as backup
    return `/folder/${item.id}?breadcrumbs=${encodeURIComponent(json)}&name=${encodeURIComponent(item.name)}`;
  };

  const renderIcon = (item: FolderItem, isStandard = false) => {
    let iconSrc = '/folder-icon.svg';
    let altText = 'Folder';
    let className = "h-14 w-14";
    let invertClass = "";

    let type: string = 'folder';
    if (isStandard) {
      if (item.id === 'images') type = 'image';
      else if (item.id === 'videos') type = 'video';
      else type = 'file';
    } else {
      if (item.type === 'file') {
        const mType = getMediaType(item);
        type = mType;
      }
    }

    if (isStandard) {
      className = "h-6 w-6";
      invertClass = "";

      if (type === 'image') { iconSrc = '/file-image.svg'; altText = 'Images'; }
      else if (type === 'video') { iconSrc = '/file-video.svg'; altText = 'Videos'; }
      else { iconSrc = '/file-document.svg'; altText = 'Files'; }
    } else {
      if (type === 'image') {
        iconSrc = '/file-image.svg';
        altText = 'Image';
        invertClass = "";
      }
      else if (type === 'video') {
        iconSrc = '/file-video.svg';
        altText = 'Video';
        invertClass = "";
      }
      else if (type === 'excel') {
        iconSrc = '/file-excel.svg';
        altText = 'Excel';
        invertClass = "";
      }
      else if (type === 'pdf') {
        iconSrc = '/file-pdf.svg';
        altText = 'PDF';
        invertClass = "";
      }
      else if (type === 'powerpoint') {
        iconSrc = '/file-powerpoint.svg';
        altText = 'PowerPoint';
        invertClass = "";
      }
      else if (type === 'word') {
        iconSrc = '/file-word.svg';
        altText = 'Word';
        invertClass = "";
      }
      else if (type === 'text' || type === 'file') {
        iconSrc = '/file-document.svg';
        altText = 'File';
        invertClass = "";
      }
      else {
        iconSrc = '/folder-icon.svg';
        altText = 'Folder';
        invertClass = "";
      }
    }

    return <img src={iconSrc} alt={altText} className={`${className} ${invertClass}`} />;
  };

  const getMediaType = (item: FolderItem) => {
    // If backend already resolved it to a specific type, rely on it
    if (item.media_type && item.media_type !== 'folder' && item.media_type !== 'file') {
      // Normalize docx to word if needed
      if (item.media_type === 'docx' as any) return 'word';
      return item.media_type;
    }

    const ext = item.name.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext || '')) return 'image';
    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext || '')) return 'video';
    if (['pdf'].includes(ext || '')) return 'pdf';
    if (['doc', 'docx'].includes(ext || '')) return 'word';
    if (['txt', 'csv', 'json', 'xml', 'log', 'md'].includes(ext || '')) return 'text';
    if (['xls', 'xlsx', 'ods', 'xlsm'].includes(ext || '')) return 'excel';
    if (['ppt', 'pptx', 'odp', 'pps', 'ppsx'].includes(ext || '')) return 'powerpoint';
    return 'file';
  };

  // Helper function to update URL without full page reload (shallow routing)
  const updateUrlShallow = (folderId: string | null, newBreadcrumbs: { id: string | null; name: string }[]) => {
    if (folderId === null) {
      window.history.pushState(null, '', '/folders');
    } else if (['images', 'videos', 'files'].includes(folderId)) {
      window.history.pushState(null, '', `/folder/${folderId}`);
    } else {
      const breadcrumbsJson = JSON.stringify(newBreadcrumbs);
      const folderName = newBreadcrumbs.length > 0 ? newBreadcrumbs[newBreadcrumbs.length - 1].name : '';
      window.history.pushState(null, '', `/folder/${folderId}?breadcrumbs=${encodeURIComponent(breadcrumbsJson)}&name=${encodeURIComponent(folderName)}`);
    }
  };

  const handleNavigate = (folder: FolderItem) => {
    if (folder.name.toLowerCase().endsWith('.zip') || folder.media_type === 'file') {
      showToast(t('contentCannotBeDisplayed') || "Content cannot be displayed", 'info');
      return;
    }
    if (folder.is_standard) {
      // For standard folders (images, videos, files), use internal state update
      setCurrentFolderId(folder.id);
      setBreadcrumbs([{ id: null, name: t('home') || 'Home' }, { id: folder.id, name: t(folder.id) || folder.name }]);
      updateUrlShallow(folder.id, [{ id: null, name: t('home') || 'Home' }, { id: folder.id, name: t(folder.id) || folder.name }]);
      return;
    }

    if (folder.type === 'file' || (folder.type !== 'folder' && folder.node_type !== 'N' && folder.node_type !== 'F')) {
      if (onDocumentClick) {
        let mediaType: any = 'file';
        const detectedType = getMediaType(folder);

        if (detectedType === 'image') mediaType = 'image';
        else if (detectedType === 'video') mediaType = 'video';
        else if (detectedType === 'pdf') mediaType = 'pdf';
        else if (detectedType === 'text') mediaType = 'text';
        else if (detectedType === 'excel') mediaType = 'excel';
        else if (detectedType === 'powerpoint') mediaType = 'powerpoint';
        else if (detectedType === 'word') mediaType = 'word';
        else mediaType = 'file';

        const doc = new Document({
          doc_id: parseInt(folder.id),
          docname: folder.name,
          title: folder.name,
          media_type: mediaType,
          date: new Date().toISOString(),
          thumbnail_url: folder.thumbnail_url || `cache/${folder.id}.jpg`
        });
        onDocumentClick(doc);
      }
      return;
    }

    // Internal state navigation for dynamic folders (no full page reload)
    const newBreadcrumbs = [...breadcrumbs, { id: folder.id, name: folder.name }];
    setCurrentFolderId(folder.id);
    setBreadcrumbs(newBreadcrumbs);
    updateUrlShallow(folder.id, newBreadcrumbs);
  };

  const handleBreadcrumbClick = (index: number) => {
    const target = breadcrumbs[index];
    if (target.id === null) {
      // Navigate back to root folders
      setCurrentFolderId(null);
      setBreadcrumbs([{ id: null, name: t('home') || 'Home' }]);
      updateUrlShallow(null, [{ id: null, name: t('home') || 'Home' }]);
    } else {
      // Navigate back to a specific folder in the breadcrumb trail
      const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
      setCurrentFolderId(target.id);
      setBreadcrumbs(newBreadcrumbs);
      updateUrlShallow(target.id, newBreadcrumbs);
    }
  };

  const refreshCurrentView = () => {
    queryClient.invalidateQueries({ queryKey: ['folders'] });
    // Also invalidate 'documents' if needed, since folders affect documents view potentially
    queryClient.invalidateQueries({ queryKey: ['documents'] });
  };

  const handleRightClick = (e: React.MouseEvent, item: FolderItem) => {
    e.preventDefault();
    if (!isEditor) return;
    if (item.is_standard) return;

    setContextMenu({
      visible: true,
      x: e.pageX,
      y: e.pageY,
      item: item
    });
  };

  const handleBackgroundContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isEditor) return;
    if (e.target !== e.currentTarget) return;

    setContextMenu({
      visible: true,
      x: e.pageX,
      y: e.pageY,
      item: null
    });
  };

  const getCurrentFolderName = () => {
    if (breadcrumbs.length > 0) {
      return breadcrumbs[breadcrumbs.length - 1].name;
    }
    return t('home') || 'Home';
  };

  const handleContextMenuAction = async (action: string) => {
    if (action === 'upload' && !contextMenu.item) {
      setContextMenu({ ...contextMenu, visible: false });
      onUploadClick(currentFolderId, getCurrentFolderName());
      return;
    }

    if (!contextMenu.item) return;
    const targetItem = contextMenu.item;

    setContextMenu({ ...contextMenu, visible: false });

    if (action === 'createChild' && targetItem.type === 'folder') {
      handleNavigate(targetItem);
      setShowCreateModal(true);
    }
    else if (action === 'rename') {
      setItemToRename(targetItem);
      setRenameValue(targetItem.name);
      setIsRenameModalOpen(true);
    }
    else if (action === 'delete') {
      setItemToDelete(targetItem);
      setDeleteMode('standard');
      setConfirmMessage(`${t('confirmDelete') || "Are you sure you want to delete"} "${targetItem.name}"?`);
      setConfirmModalOpen(true);
    }
    else if (action === 'security') {
      setSelectedSecurityItem(targetItem);
      setIsSecurityModalOpen(true);
    }
    else if (action === 'share') {
      setItemToShare(targetItem);
      setIsShareModalOpen(true);
    }
    else if (action === 'download') {
      handleDownload(targetItem);
    }
  };

  const handleDownload = (item: FolderItem) => {
    const toastId = showToast(t('downloading') || "Downloading...", 'info', 'subtle', 0);
    download(
      { docId: item.id, docname: item.name, apiURL },
      {
        onSuccess: () => {
          removeToast(toastId);
        },
        onError: () => {
          removeToast(toastId);
          showToast(t('errorDownloading') || "Error downloading file.", 'error');
        }
      }
    );
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemToRename || !renameValue || renameValue === itemToRename.name) {
      setIsRenameModalOpen(false);
      return;
    }

    setIsRenaming(true);
    try {
      await renameFolderMutation.mutateAsync({
        id: itemToRename.id,
        name: renameValue,
        system_id: itemToRename.system_id,
        apiURL
      });

      showToast(t('successRenaming'), 'success');
      setIsRenameModalOpen(false);
      setItemToRename(null);
    } catch (e: any) {
      console.error("Rename error:", e);
      showToast(t('errorRenaming') || `Error: ${e.message}`, 'error');
    } finally {
      setIsRenaming(false);
    }
  };

  const processDelete = async () => {
    if (!itemToDelete) return;

    setIsOperationLoading(true);

    if (deleteMode === 'standard') {
      setConfirmModalOpen(false);
    }

    try {
      await deleteFolderMutation.mutateAsync({
        id: itemToDelete.id,
        force: deleteMode === 'force',
        apiURL
      });

      setItemToDelete(null);
      setConfirmModalOpen(false);
      showToast(t('successDeleting'), 'success');

    } catch (e: any) {
      let errMsg = "";
      let errDetail = "";

      if (e.data) {
        errMsg = (e.data.detail || e.data.error || "").toLowerCase();
        errDetail = e.data.detail || e.data.error;
      } else {
        errMsg = e.message.toLowerCase();
        errDetail = e.message;
      }

      if (deleteMode === 'standard' && (e.status === 409 || errMsg.includes("referenced") || errMsg.includes("folder") || errMsg.includes("unable to locate"))) {
        setDeleteMode('force');
        setConfirmMessage(t('referencedItemError') || "This item is currently referenced by other records or is not empty.");
        setConfirmModalOpen(true);
      } else {
        showToast(t('errorDeleting') || `Error: ${errDetail || 'Unknown error'}`, 'error');
        if (deleteMode === 'force') {
          setConfirmModalOpen(false);
        }
      }
    } finally {
      setIsOperationLoading(false);
    }
  };

  const getStandardFolderColor = (id: string) => {
    return 'bg-gray-50 dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-700';
  };

  const getFileColorClass = (item: FolderItem) => {
    const type = getMediaType(item);
    if (type === 'image') return 'text-blue-500 dark:text-blue-400';
    if (type === 'video') return 'text-red-500 dark:text-red-400';
    if (type === 'excel') return 'text-green-500 dark:text-green-400';
    if (type === 'powerpoint') return 'text-orange-500 dark:text-orange-400';
    if (type === 'word') return 'text-blue-700 dark:text-blue-500'; // Darker blue for Word
    return 'text-yellow-500 dark:text-yellow-400';
  };

  const isInsideStandardFolder = ['images', 'videos', 'files'].includes(currentFolderId || '');

  const standardItems = items.filter(item => item.is_standard && !isInsideStandardFolder);

  const userItems = items
    .filter(item => !item.is_standard)
    .sort((a, b) => {
      const aIsFolder = a.type === 'folder';
      const bIsFolder = b.type === 'folder';

      if (aIsFolder && !bIsFolder) return -1;
      if (!aIsFolder && bIsFolder) return 1;

      return a.name.localeCompare(b.name);
    });

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#1e1e1e] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden relative">

      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#252525]">
        <nav className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300 overflow-x-auto no-scrollbar flex-grow">
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center whitespace-nowrap">
              {index > 0 && <span className="mx-2 text-gray-400">/</span>}
              {/* Use Link or clickable element for breadcrumbs (could use Link for optimisation, but button with router.push acts similar for now) */}
              <button
                onClick={() => handleBreadcrumbClick(index)}
                className={`hover:text-blue-500 hover:underline transition-colors ${index === breadcrumbs.length - 1 ? 'font-bold text-gray-900 dark:text-white' : ''
                  }`}
              >
                {crumb.name}
              </button>
            </div>
          ))}
        </nav>

        <div className="flex items-center space-x-3 ml-4">
          <div className="relative">
            <input
              type="text"
              placeholder={t('search') || "Search in folder..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#333] text-sm text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none w-48 transition-all focus:w-64"
            />
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <button onClick={refreshCurrentView} className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition" title={t('refresh')}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {isEditor && (<button
            onClick={() => onUploadClick(currentFolderId, getCurrentFolderName())}
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition shadow-sm text-sm font-medium"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {t('upload')}
          </button>
          )}

          {isEditor && (
            <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md text-sm font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('createFolder')}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6" onContextMenu={handleBackgroundContextMenu}>
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="flex flex-col gap-8">

            {standardItems.length > 0 && !searchTerm && (
              <div className="animate-fade-in">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">
                  {t('libraries') || 'Quick Access'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {standardItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleNavigate(item)}
                      className={`group flex items-center p-4 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md ${getStandardFolderColor(item.id)}`}
                    >
                      <div className="flex-shrink-0 p-2 bg-white dark:bg-[#333] rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                        {renderIcon(item, true)}
                      </div>
                      <div className="ml-4 flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800 dark:text-white truncate">{t(item.id)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.count !== undefined ? `${item.count} ${t('items')}` : ''}</p>
                      </div>
                      <div className="text-gray-300 dark:text-gray-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex-1">
              {(standardItems.length > 0 && userItems.length > 0 && !searchTerm) && (
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">{t('folders') || 'Folders'}</h3>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {userItems.map((item) => {
                  const isFile = item.type === 'file';

                  if (!isFile && item.type === 'folder') {
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleNavigate(item)}
                        onContextMenu={(e) => handleRightClick(e, item)}
                        className={`group relative flex flex-col items-center p-4 rounded-xl cursor-pointer transition-all duration-200 border border-transparent hover:bg-gray-50 hover:border-gray-200 hover:shadow-sm dark:hover:bg-[#2c2c2c] dark:hover:border-gray-700`}
                      >
                        <div className="mb-3 transform group-hover:scale-105 transition-transform duration-200 text-gray-400 group-hover:text-blue-500">
                          {renderIcon(item, false)}
                        </div>
                        <span className="text-sm font-medium text-center text-gray-700 dark:text-gray-300 break-words w-full line-clamp-2 px-1">
                          {item.name}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleNavigate(item)}
                      onContextMenu={(e) => handleRightClick(e, item)}
                      className={`group relative flex flex-col items-center p-4 rounded-xl cursor-pointer transition-all duration-200 border border-transparent hover:bg-gray-50 hover:border-gray-200 hover:shadow-sm dark:hover:bg-[#2c2c2c] dark:hover:border-gray-700`}
                    >
                      <div className={`mb-3 transform group-hover:scale-105 transition-transform duration-200 ${isFile ? getFileColorClass(item) : 'text-gray-400 group-hover:text-blue-500'}`}>
                        {renderIcon(item, false)}
                      </div>
                      <span className="text-sm font-medium text-center text-gray-700 dark:text-gray-300 break-words w-full line-clamp-2 px-1">
                        {item.name}
                      </span>
                    </div>
                  );
                })}
              </div>

              {items.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <p>{searchTerm ? t('noDocumentsFound') : (t('emptyFolder') || "This folder is empty.")}</p>
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {contextMenu.visible && (
        <div
          ref={contextMenuRef}
          className="absolute z-50 bg-white dark:bg-[#333] border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl w-48 py-1"
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px`, position: 'fixed' }}
        >
          {contextMenu.item ? (
            <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {contextMenu.item.name}
            </div>
          ) : (
            <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {t('folderActions') || 'Folder Actions'}
            </div>
          )}

          {!contextMenu.item && (
            <button
              onClick={() => handleContextMenuAction('upload')}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              {t('upload')}
            </button>
          )}

          {contextMenu.item?.type === 'folder' && (
            <button
              onClick={() => handleContextMenuAction('createChild')}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              {t('createSubfolder') || 'Create Subfolder'}
            </button>
          )}

          {contextMenu.item && (
            <>
              {contextMenu.item.type !== 'folder' && (
                <button
                  onClick={() => handleContextMenuAction('download')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
                >
                  <img src="/download.svg" className="w-4 h-4 dark:invert" alt="" />
                  {t('download') || 'Download'}
                </button>
              )}

              <button
                onClick={() => handleContextMenuAction('share')}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                {t('share') || 'Share'}
              </button>

              <button
                onClick={() => handleContextMenuAction('rename')}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                {t('rename') || 'Rename'}
              </button>

              <button
                onClick={() => handleContextMenuAction('security')}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                {t('permissions') || 'Permissions'}
              </button>

              <button
                onClick={() => handleContextMenuAction('delete')}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                {t('delete') || 'Delete'}
              </button>
            </>
          )}
        </div>
      )}

      {showCreateModal && (
        <CreateFolderModal
          onClose={() => setShowCreateModal(false)}
          apiURL={apiURL}
          t={t}
          initialParentId={currentFolderId || ''}
          onFolderCreated={refreshCurrentView}
        />
      )}

      {isSecurityModalOpen && selectedSecurityItem && (
        <SecurityModal
          isOpen={isSecurityModalOpen}
          onClose={() => setIsSecurityModalOpen(false)}
          docId={selectedSecurityItem.id}
          library="RTA_MAIN"
          itemName={selectedSecurityItem.name}
          t={t}
        />
      )}

      {isShareModalOpen && itemToShare && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => {
            setIsShareModalOpen(false);
            setItemToShare(null);
          }}
          documentId={itemToShare.type !== 'folder' ? itemToShare.id : undefined}
          folderId={itemToShare.type === 'folder' ? itemToShare.id : undefined}
          documentName={itemToShare.name}
          itemType={itemToShare.type === 'folder' ? 'folder' : 'file'}
          t={t}
        />
      )}

      {confirmModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setConfirmModalOpen(false);
              setItemToDelete(null);
            }
          }}
        >
          <div className="bg-white dark:bg-[#333] rounded-lg p-6 max-w-md w-full shadow-xl border border-gray-200 dark:border-gray-600">
            <div className={`flex items-center gap-3 mb-4 ${deleteMode === 'force' ? 'text-amber-500' : 'text-red-500'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {deleteMode === 'force' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                )}
              </svg>
              <h3 className="text-lg font-bold dark:text-white">
                {deleteMode === 'force' ? (t('warning') || 'Warning') : (t('delete') || 'Delete Item')}
              </h3>
            </div>

            <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm whitespace-pre-wrap">
              {confirmMessage}
              {deleteMode === 'force' && (
                <>
                  <br /><br />
                  {t('confirmForceDelete') || "Do you want to delete it anyway? This will remove all contents and references."}
                </>
              )}
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setConfirmModalOpen(false);
                  setItemToDelete(null);
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                {t('cancel') || 'Cancel'}
              </button>
              <button
                onClick={processDelete}
                className={`px-4 py-2 text-sm text-white rounded transition-colors shadow-sm flex items-center gap-2 ${deleteMode === 'force' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-600 hover:bg-red-700'}`}
                disabled={isLoading}
              >
                {isLoading && <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>}
                {deleteMode === 'force' ? (t('yesDelete') || 'Yes, Delete') : (t('delete') || 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {isRenameModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsRenameModalOpen(false);
          }}
        >
          <div className="bg-white dark:bg-[#333] rounded-lg p-6 max-w-sm w-full shadow-xl border border-gray-200 dark:border-gray-600">
            <h3 className="text-lg font-bold dark:text-white mb-4">{t('rename') || 'Rename'}</h3>
            <form onSubmit={handleRenameSubmit}>
              <div className="mb-4">
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsRenameModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  {t('cancel') || 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isRenaming || !renameValue.trim()}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  {isRenaming ? 'Saving...' : (t('save') || 'Save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};