import React from 'react';

interface FoldersProps {
  onFolderClick: (folder: 'images' | 'videos' | 'files') => void;
  t: Function;
}

export const Folders: React.FC<FoldersProps> = ({ onFolderClick, t }) => {
  const folders = [
    { id: 'images', label: t('images'), icon: '/image-folder.svg', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' },
    { id: 'videos', label: t('videos'), icon: '/video-folder.svg', color: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300' },
    { id: 'files', label: t('files'), icon: '/file-folder.svg', color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {folders.map((folder) => (
        <button
          key={folder.id}
          onClick={() => onFolderClick(folder.id as 'images' | 'videos' | 'files')}
          className={`flex flex-col items-center justify-center p-8 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 group`}
        >
          <div className={`p-4 rounded-full mb-4 ${folder.color} group-hover:scale-110 transition-transform duration-200`}>
            {/* Placeholder icons if svgs are missing, or use the img tag if you have them. 
                 Using simple SVG icons for now to ensure visibility. */}
            {folder.id === 'images' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
            {folder.id === 'videos' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
            {folder.id === 'files' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            )}
          </div>
          <span className="text-lg font-medium text-gray-900 dark:text-gray-100">{folder.label}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('openFolder')}</span>
        </button>
      ))}
    </div>
  );
};
