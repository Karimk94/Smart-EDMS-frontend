import React, { useState } from 'react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentName: string;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, documentId, documentName }) => {
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerateLink = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/documents/${documentId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) throw new Error('Failed to generate link');
      
      const data = await response.json();
      
      // Construct the full frontend URL
      const origin = window.location.origin;
      const fullLink = `${origin}/shared/${data.token}`;
      setGeneratedLink(fullLink);
      
    } catch (err) {
      setError('Could not generate share link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      alert('Link copied to clipboard!');
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