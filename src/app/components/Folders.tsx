import React, { useEffect, useState, useRef } from 'react';
import { CreateFolderModal } from './CreateFolderModal';
import { Document } from '../../models/Document';

interface FolderItem {
  id: string;
  name: string;
  type: 'folder' | 'item' | 'file';
  node_type?: string;
  media_type?: 'image' | 'video' | 'pdf' | 'folder';
  is_standard?: boolean;
  count?: number;
}

interface FoldersProps {
  onFolderClick: (folderId: 'images' | 'videos' | 'files') => void;
  onDocumentClick?: (doc: Document) => void;
  t: (key: string) => string;
  apiURL: string;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  item: FolderItem | null;
}

export const Folders: React.FC<FoldersProps> = ({ onFolderClick, onDocumentClick, t, apiURL }) => {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: t('home') || 'Home' }
  ]);
  const [items, setItems] = useState<FolderItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, item: null });
  const contextMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchContents(currentFolderId);
  }, [currentFolderId]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu({ ...contextMenu, visible: false });
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [contextMenu]);

  const fetchContents = async (parentId: string | null) => {
    setIsLoading(true);
    try {
      const query = parentId ? `?parent_id=${parentId}` : '';
      const response = await fetch(`${apiURL}/folders${query}`);

      if (response.ok) {
        const data = await response.json();
        setItems(data.contents || []);
      }
    } catch (error) {
      console.error('Failed to fetch folder contents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getMediaType = (item: FolderItem) => {
    if (item.media_type && item.media_type !== 'folder') return item.media_type;
    const ext = item.name.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext || '')) return 'image';
    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext || '')) return 'video';
    if (['pdf', 'doc', 'docx', 'txt'].includes(ext || '')) return 'pdf';
    return 'unknown';
  };

  const handleNavigate = (folder: FolderItem) => {
    if (folder.is_standard) {
      onFolderClick(folder.id as 'images' | 'videos' | 'files');
      return;
    }

    if (folder.type === 'file' || (folder.type !== 'folder' && folder.node_type !== 'N' && folder.node_type !== 'F')) {
      if (onDocumentClick) {
        let mediaType: 'image' | 'video' | 'pdf' = 'image';
        const detectedType = getMediaType(folder);
        if (detectedType === 'video') mediaType = 'video';
        else if (detectedType === 'pdf') mediaType = 'pdf';

        const doc = new Document({
          doc_id: parseInt(folder.id),
          docname: folder.name,
          title: folder.name,
          media_type: mediaType,
          date: new Date().toISOString(),
          thumbnail_url: `cache/${folder.id}.jpg`
        });
        onDocumentClick(doc);
      }
      return;
    }

    setCurrentFolderId(folder.id);
    setBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }]);
  };

  const handleBreadcrumbClick = (index: number) => {
    const target = breadcrumbs[index];
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(newBreadcrumbs);
    setCurrentFolderId(target.id);
  };

  const refreshCurrentView = () => {
    fetchContents(currentFolderId);
  };

  const handleRightClick = (e: React.MouseEvent, item: FolderItem) => {
    e.preventDefault();
    if (item.is_standard) return;

    setContextMenu({
      visible: true,
      x: e.pageX,
      y: e.pageY,
      item: item
    });
  };

  const handleContextMenuAction = async (action: string) => {
    if (!contextMenu.item) return;
    const targetItem = contextMenu.item;

    setContextMenu({ ...contextMenu, visible: false });

    if (action === 'createChild' && targetItem.type === 'folder') {
      handleNavigate(targetItem);
      setShowCreateModal(true);
    }
    else if (action === 'rename') {
      const newName = prompt(t('enterNewName') || "Enter new name:", targetItem.name);
      if (newName && newName !== targetItem.name) {
        setIsLoading(true);
        try {
          const res = await fetch(`${apiURL}/folders/${targetItem.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName })
          });

          if (res.ok) {
            refreshCurrentView();
          } else {
            const err = await res.json();
            alert(t('errorRenaming') || `Error: ${err.error}`);
          }
        } catch (e) {
          console.error("Rename error:", e);
          alert(t('errorRenaming') || "Error renaming folder.");
        } finally {
          setIsLoading(false);
        }
      }
    }
    else if (action === 'delete') {
      if (confirm(`${t('confirmDelete') || "Are you sure you want to delete"} "${targetItem.name}"?`)) {
        setIsLoading(true);
        try {
          const res = await fetch(`${apiURL}/folders/${targetItem.id}`, {
            method: 'DELETE'
          });

          if (res.ok) {
            refreshCurrentView();
          } else {
            const err = await res.json();
            const errMsg = (err.error || "").toLowerCase();
            if (errMsg.includes("referenced") || errMsg.includes("folder")) {
              if (confirm(t('folderReferencedWarning'))) {
                setIsLoading(true);
                const forceRes = await fetch(`${apiURL}/folders/${targetItem.id}?force=true`, {
                  method: 'DELETE'
                });

                if (forceRes.ok) {
                  refreshCurrentView();
                } else {
                  const forceErr = await forceRes.json();
                  alert(t('errorDeleting') || `Error: ${forceErr.error}`);
                }
              }
            } else {
              alert(t('errorDeleting') || `Error: ${err.error}`);
            }
          }
        } catch (e) {
          console.error("Delete error:", e);
          alert(t('errorDeleting') || "Error deleting folder.");
        } finally {
          setIsLoading(false);
        }
      }
    }
  };

  const renderIcon = (type: 'image' | 'video' | 'file' | 'folder', isStandard = false) => {
    let iconSrc = '/folder-icon.svg'; 
    let altText = 'Folder';
    
    let className = "h-14 w-14"; 
    let invertClass = ""; 

    if (isStandard) {
        className = "h-6 w-6";
        invertClass = "dark:invert";
        
        if (type === 'image') { iconSrc = '/file-image.svg'; altText = 'Images'; }
        else if (type === 'video') { iconSrc = '/file-video.svg'; altText = 'Videos'; }
        else { iconSrc = '/file-document.svg'; altText = 'Files'; }
    } else {
        if (type === 'image') { 
            iconSrc = '/file-image.svg'; 
            altText = 'Image'; 
            invertClass = "dark:invert";
        }
        else if (type === 'video') { 
            iconSrc = '/file-video.svg'; 
            altText = 'Video'; 
            invertClass = "dark:invert";
        }
        else if (type === 'file') { 
            iconSrc = '/file-document.svg'; 
            altText = 'File'; 
            invertClass = "dark:invert";
        }
        else {
            iconSrc = '/folder-icon.svg';
            altText = 'Folder';
            invertClass = ""; 
        }
    }

    return <img src={iconSrc} alt={altText} className={`${className} ${invertClass}`} />;
  };

  const getStandardFolderColor = (id: string) => {
    return 'bg-gray-50 dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-700';
  };

  const getFileColorClass = (item: FolderItem) => {
    const type = getMediaType(item);
    if (type === 'image') return 'text-blue-500 dark:text-blue-400';
    if (type === 'video') return 'text-red-500 dark:text-red-400';
    return 'text-yellow-500 dark:text-yellow-400';
  };

  const standardItems = items.filter(item => item.is_standard);
  
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
        <nav className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300 overflow-x-auto no-scrollbar">
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center whitespace-nowrap">
              {index > 0 && <span className="mx-2 text-gray-400">/</span>}
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

        <div className="flex items-center space-x-3">
          <button onClick={refreshCurrentView} className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition" title={t('refresh')}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md text-sm font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('createFolder')}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6" onContextMenu={(e) => e.preventDefault()}>
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            
            {/* --- Standard Folders --- */}
            {standardItems.length > 0 && (
              <div className="animate-fade-in">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">
                  {t('libraries') || 'Quick Access'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {standardItems.map((item) => {
                    let type: 'image' | 'video' | 'file' = 'file';
                    if (item.id === 'images') type = 'image';
                    if (item.id === 'videos') type = 'video';

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleNavigate(item)}
                        className={`group flex items-center p-4 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md ${getStandardFolderColor(item.id)}`}
                      >
                        <div className="flex-shrink-0 p-2 bg-white dark:bg-[#333] rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                          {renderIcon(type, true)}
                        </div>
                        <div className="ml-4 flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-800 dark:text-white truncate">{t(item.id)}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.count !== undefined ? `${item.count} items` : ''}</p>
                        </div>
                        <div className="text-gray-300 dark:text-gray-600">
                            <svg className="w-5 h-5 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* --- User Folders & Files --- */}
            <div className="flex-1">
               {standardItems.length > 0 && userItems.length > 0 && (
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">{t('folders') || 'Folders'}</h3>
               )}
               
               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                 {userItems.map((item) => {
                    const isFile = item.type === 'file';
                    let fileType: 'image' | 'video' | 'file' | 'folder' = 'folder';
                    
                    if (isFile) {
                       const mediaType = getMediaType(item);
                       if (mediaType === 'image') fileType = 'image';
                       else if (mediaType === 'video') fileType = 'video';
                       else fileType = 'file';
                    }

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleNavigate(item)}
                        onContextMenu={(e) => handleRightClick(e, item)}
                        className="group flex flex-col items-center p-4 rounded-xl cursor-pointer transition-all duration-200 border border-transparent hover:bg-gray-50 hover:border-gray-200 hover:shadow-sm dark:hover:bg-[#2c2c2c] dark:hover:border-gray-700"
                      >
                        <div className={`mb-3 transform group-hover:scale-105 transition-transform duration-200 ${isFile ? getFileColorClass(item) : 'text-gray-400 group-hover:text-blue-500'}`}>
                          {renderIcon(fileType, false)}
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
                      <p>{t('emptyFolder') || "This folder is empty."}</p>
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
          <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {contextMenu.item?.name}
          </div>

          {contextMenu.item?.type === 'folder' && (
            <button
              onClick={() => handleContextMenuAction('createChild')}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              {t('createSubfolder') || 'Create Subfolder'}
            </button>
          )}

          <button
            onClick={() => handleContextMenuAction('rename')}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            {t('rename') || 'Rename'}
          </button>

          <button
            onClick={() => handleContextMenuAction('delete')}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            {t('delete') || 'Delete'}
          </button>
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
    </div>
  );
};