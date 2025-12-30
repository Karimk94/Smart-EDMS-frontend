import React, { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';

interface CreateFolderModalProps {
  onClose: () => void;
  apiURL: string;
  onFolderCreated: () => void;
  t: Function;
  initialParentId?: string; 
}

export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({ onClose, apiURL, onFolderCreated, t, initialParentId = '' }) => {
  const [folderName, setFolderName] = useState('');
  const [description, setDescription] = useState('');
  const parentId = initialParentId; 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`${apiURL}/folders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: folderName,
          description: description,
          parent_id: parentId.trim() || null, 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast(t('folderCreated'), 'success');
        onFolderCreated();
        onClose();
      } else {
        showToast(data.error || t('errorCreatingFolder'), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(t('errorCreatingFolder'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-[60] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#282828] rounded-xl p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('createFolder')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-2xl">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('folderName')}</label>
            <input
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              placeholder={t('enterFolderName')}
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('folderDescription')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors min-h-[80px] resize-none"
              placeholder={t('enterFolderDescription')}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition"
              disabled={isSubmitting}
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30"
              disabled={isSubmitting}
            >
              {isSubmitting ? t('processing') : t('create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};