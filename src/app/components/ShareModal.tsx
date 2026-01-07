import React, { useState } from 'react';
import { useToast } from '../context/ToastContext';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentName: string;
  t: Function
}

type ShareMode = 'open' | 'restricted';
const ALLOWED_DOMAIN = '@rta.ae';

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, documentId, documentName, t }) => {
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { showToast } = useToast();

  const [shareMode, setShareMode] = useState<ShareMode>('open');
  const [targetEmail, setTargetEmail] = useState('');
  
  const [expiryDate, setExpiryDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });

  if (!isOpen) return null;

  const validateEmail = (email: string): boolean => {
    const trimmed = email.trim().toLowerCase();
    return trimmed.endsWith(ALLOWED_DOMAIN.toLowerCase()) && trimmed.length >= 8;
  };

  const handleGenerateLink = async () => {
    if (shareMode === 'restricted') {
      if (!targetEmail.trim()) {
        setError(t('targetEmailRequired'));
        return;
      }
      if (!validateEmail(targetEmail)) {
        setError(t('invalidTargetEmail') || `Email must be from ${ALLOWED_DOMAIN} domain`);
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      const payload: any = {
        document_id: parseInt(documentId),
        expiry_date: expiryDate ? new Date(expiryDate).toISOString() : null
      };

      if (shareMode === 'restricted' && targetEmail.trim()) {
        payload.target_email = targetEmail.trim().toLowerCase();
      }

      const response = await fetch('/api/share/generate', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json' 
        },
        body: JSON.stringify(payload)
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

  const handleClose = () => {
    setGeneratedLink(null);
    setError(null);
    setShareMode('open');
    setTargetEmail('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          {t('share') || 'Share'} "{documentName}"
        </h2>
        
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          {t('shareDescription')}
        </p>

        {!generatedLink ? (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('shareMode')}
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShareMode('open')}
                  className={`flex-1 px-3 py-2 text-sm rounded-md border transition-colors ${
                    shareMode === 'open'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="font-medium">{t('openAccess')}</div>
                  <div className="text-xs opacity-75 mt-0.5">{t('anyRtaEmail') || `Any ${ALLOWED_DOMAIN}`}</div>
                </button>
                <button
                  type="button"
                  onClick={() => setShareMode('restricted')}
                  className={`flex-1 px-3 py-2 text-sm rounded-md border transition-colors ${
                    shareMode === 'restricted'
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
                      : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="font-medium">{t('restrictedAccess') || 'Specific Person'}</div>
                  <div className="text-xs opacity-75 mt-0.5">{t('oneEmailOnly') || 'One email only'}</div>
                </button>
              </div>
            </div>

            {/* NEW: Target Email Input (only for restricted mode) */}
            {shareMode === 'restricted' && (
              <div className="mb-4">
                <label htmlFor="target-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('recipientEmail')} <span className="text-red-500">*</span>
                </label>
                <input
                  id="target-email"
                  type="email"
                  value={targetEmail}
                  onChange={(e) => setTargetEmail(e.target.value)}
                  placeholder={`name${ALLOWED_DOMAIN}`}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm ${
                    targetEmail && !validateEmail(targetEmail)
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {t('targetEmailHint') || `Only emails ending with ${ALLOWED_DOMAIN} are allowed`}
                </p>
              </div>
            )}

            <div className="mb-4">
              <label htmlFor="expiry-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('expiryDate')}
              </label>
              <input
                id="expiry-date"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>

            {error && (
              <p className="mb-4 text-sm text-red-500">{error}</p>
            )}

            <div className="flex justify-end">
              <button
                onClick={handleClose}
                className="mr-3 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900"
              >
                {t('cancel') || 'Cancel'}
              </button>
              <button
                onClick={handleGenerateLink}
                disabled={loading || (shareMode === 'restricted' && !validateEmail(targetEmail))}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (t('generating')) : (t('generateLink'))}
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className={`p-3 rounded-md text-sm ${
              shareMode === 'restricted' 
                ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800'
                : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
            }`}>
              {shareMode === 'restricted' 
                ? `${t('restrictedTo')} ${targetEmail}`
                : (t('openAccessInfo') || `Any ${ALLOWED_DOMAIN} email can access this link`)
              }
            </div>

            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 break-all text-sm text-gray-800 dark:text-gray-200">
              {generatedLink}
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300"
              >
                {t('close')}
              </button>
              <button
                onClick={copyToClipboard}
                className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
              >
                {t('copyLink')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShareModal;