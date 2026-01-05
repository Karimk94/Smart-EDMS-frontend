import React, { useState } from 'react';
import { useToast } from '../context/ToastContext';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentName: string;
  t: Function
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, documentId, documentName, t }) => {
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
    const { showToast } = useToast();
  
  const [expiryDate, setExpiryDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });

  if (!isOpen) return null;

  const handleGenerateLink = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/share/generate', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
            document_id: parseInt(documentId),
            expiry_date: expiryDate ? new Date(expiryDate).toISOString() : null
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to generate link');
      }
      
      const data = await response.json();
      
      const origin = window.location.origin;
      const fullLink = `${origin}/shared/${data.token}`;
      setGeneratedLink(fullLink);
      
    } catch (err: any) {
      setError(err.message || 'Could not generate share link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      showToast(t('LinkCopied'), 'success');

    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          Share "{documentName}"
        </h2>
        
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Generate a secure link to share this file with other employees or external partners. 
          Access will be logged.
        </p>

        {!generatedLink ? (
          <>
            <div className="mb-4">
              <label htmlFor="expiry-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Expiry Date
              </label>
              <input
                id="expiry-date"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="mr-3 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateLink}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate Link'}
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 break-all text-sm text-gray-800 dark:text-gray-200">
              {generatedLink}
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300"
              >
                Close
              </button>
              <button
                onClick={copyToClipboard}
                className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
              >
                Copy Link
              </button>
            </div>
          </div>
        )}
        
        {error && (
            <p className="mt-4 text-sm text-red-500">{error}</p>
        )}
      </div>
    </div>
  );
};

export default ShareModal;