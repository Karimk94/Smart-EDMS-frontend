'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '../../context/ToastContext';
import { useTranslations } from '../../hooks/useTranslations';
import { enGB } from 'date-fns/locale/en-GB';
import { registerLocale } from 'react-datepicker';
import HtmlLangUpdater from '../../components/HtmlLangUpdater';

registerLocale('en-GB', enGB);

export default function SharedDocumentPage() {
  const params = useParams();
  const token = params.token as string;
  
  // Language State
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const t = useTranslations(lang);
  const { showToast } = useToast();

  // Flow State
  const [step, setStep] = useState<'email_input' | 'otp_input' | 'success'>('email_input');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [documentData, setDocumentData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New: Blob URL for displaying/downloading the actual file
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('document');
  const [fileType, setFileType] = useState<string>('application/octet-stream');

  // Toggle Language Helper
  const toggleLanguage = () => {
    setLang(prev => prev === 'en' ? 'ar' : 'en');
  };

  // Helper to safely parse JSON response
  const parseResponse = async (response: Response) => {
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      if (!response.ok) {
         return { detail: text || response.statusText };
      }
      throw new Error("Invalid server response format");
    }
  };

  // Helper to determine if file is previewable
  const isPreviewable = (mimeType: string) => {
    return mimeType.startsWith('image/') || mimeType === 'application/pdf' || mimeType.startsWith('video/');
  };

  const isImage = (mimeType: string) => mimeType.startsWith('image/');
  const isPdf = (mimeType: string) => mimeType === 'application/pdf';
  const isVideo = (mimeType: string) => mimeType.startsWith('video/');

  // Step 1: Request OTP
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/share/request-access/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viewer_email: email })
      });

      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(data.detail || data.error || t('FailedRequestOtp'));
      }

      setStep('otp_input');
      setStatus('idle');
    } catch (err: any) {
      console.error("OTP Request Error:", err);
      setErrorMessage(err.message);
      setStatus('error');
    }
  };

  // Step 2: Verify OTP and Download Document
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage(null);

    try {
      // First verify the OTP
      const verifyResponse = await fetch(`/api/share/verify-access/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viewer_email: email, otp: otp })
      });

      const verifyData = await parseResponse(verifyResponse);

      if (!verifyResponse.ok) {
        throw new Error(verifyData.detail || verifyData.error || t('FailedVerifyOtp'));
      }

      setDocumentData(verifyData.document);

      // Now download the actual file
      const downloadResponse = await fetch(
        `/api/share/download/${token}?viewer_email=${encodeURIComponent(email)}`
      );

      if (!downloadResponse.ok) {
        const errorData = await parseResponse(downloadResponse);
        throw new Error(errorData.detail || 'Failed to download document');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = downloadResponse.headers.get('Content-Disposition');
      let downloadFileName = 'document';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
        if (match && match[1]) {
          downloadFileName = match[1];
        }
      }

      // Get content type
      const contentType = downloadResponse.headers.get('Content-Type') || 'application/octet-stream';

      // Convert response to blob and create URL
      const blob = await downloadResponse.blob();
      const blobUrl = URL.createObjectURL(blob);

      setFileUrl(blobUrl);
      setFileName(downloadFileName);
      setFileType(contentType);
      setStep('success');
      setStatus('idle');

    } catch (err: any) {
      console.error("OTP Verify/Download Error:", err);
      setErrorMessage(err.message);
      setStatus('error');
    }
  };

  // Handle manual download
  const handleDownload = () => {
    if (fileUrl) {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Cleanup blob URL on unmount
  React.useEffect(() => {
    return () => {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [fileUrl]);

  return (
    <>
      <HtmlLangUpdater lang={lang} />
      
      {/* Language Toggle Button (Absolute Position) */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={toggleLanguage}
          className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded shadow hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium border border-gray-200 dark:border-gray-700"
        >
          {lang === 'en' ? 'عربي' : 'English'}
        </button>
      </div>

      {step === 'success' && documentData ? (
        // View: Document Success State
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6 flex flex-col items-center">
          <div className="w-full max-w-4xl bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                {documentData.docname || documentData.title || fileName}
              </h1>
              <button 
                onClick={handleDownload}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {t('Download')}
              </button>
            </div>
            
            <div className="p-6 flex flex-col items-center justify-center min-h-[400px] bg-gray-50 dark:bg-gray-900/50">
              {/* Document Preview */}
              <div className="w-full max-h-[600px] overflow-auto mb-6">
                {fileUrl && isImage(fileType) && (
                  <img 
                    src={fileUrl} 
                    alt={fileName}
                    className="max-w-full max-h-[500px] mx-auto rounded shadow-lg object-contain"
                  />
                )}

                {fileUrl && isPdf(fileType) && (
                  <iframe
                    src={fileUrl}
                    className="w-full h-[500px] rounded shadow-lg"
                    title={fileName}
                  />
                )}

                {fileUrl && isVideo(fileType) && (
                  <video 
                    src={fileUrl}
                    controls
                    className="max-w-full max-h-[500px] mx-auto rounded shadow-lg"
                  >
                    Your browser does not support the video tag.
                  </video>
                )}

                {fileUrl && !isPreviewable(fileType) && (
                  <div className="text-center py-10">
                    <div className="h-24 w-24 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto flex items-center justify-center mb-4">
                      <span className="text-4xl">📄</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-2">
                      {t('PreviewNotAvailable')}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                      {fileName}
                    </p>
                  </div>
                )}
              </div>

              {/* Access Confirmation */}
              <div className="border border-green-300 dark:border-green-600 rounded-lg p-4 bg-green-50 dark:bg-green-900/20 inline-block text-green-800 dark:text-green-200 text-center">
                <svg className="w-6 h-6 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('VerifiedAccessFor')} <strong>{email}</strong>
                <br/>
                <span className="text-xs opacity-75">{t('AccessLoggedAt')} {new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // View: Auth / OTP Forms
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
            <h2 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-white">
              {t('SecureDocAccess')}
            </h2>
            <p className="text-center text-gray-600 dark:text-gray-300 mb-8">
              {step === 'otp_input' 
                ? `${t('OtpSentMessage')} ${email}`
                : t('VerifyIdentityMessage')}
            </p>

            <div className="space-y-4">
              
              {/* Email Input Step */}
              {step === 'email_input' && (
                <form onSubmit={handleRequestOTP} className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('OrgEmail')}
                    </label>
                    <input 
                    type="email" 
                    required
                    placeholder="name@rta.ae"
                    className="w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={status === 'loading'}
                    />
                    <button 
                    type="submit"
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex justify-center"
                    disabled={status === 'loading'}
                    >
                    {status === 'loading' ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                        t('SendVerificationCode')
                    )}
                    </button>
                </form>
              )}

              {/* OTP Input Step */}
              {step === 'otp_input' && (
                 <form onSubmit={handleVerifyOTP} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('EnterOtp')}
                        </label>
                        <input 
                          type="text" 
                          required
                          placeholder="123456"
                          maxLength={6}
                          className="w-full px-4 py-3 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none tracking-[0.5em] text-center text-xl font-mono"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                          disabled={status === 'loading'}
                        />
                    </div>
                    <button 
                      type="submit"
                      className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex justify-center"
                      disabled={status === 'loading'}
                    >
                      {status === 'loading' ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      ) : (
                        t('VerifyAccess')
                      )}
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                          setStep('email_input');
                          setErrorMessage(null);
                          setOtp('');
                      }}
                      className="w-full text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mt-2"
                      disabled={status === 'loading'}
                    >
                      {t('ChangeEmail')}
                    </button>
                 </form>
              )}

              {errorMessage && (
                <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm text-center animate-pulse">
                    {errorMessage}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}