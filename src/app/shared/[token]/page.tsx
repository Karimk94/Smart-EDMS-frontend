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

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/share/verify-access/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viewer_email: email, otp: otp })
      });

      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(data.detail || data.error || t('FailedVerifyOtp'));
      }

      setDocumentData(data.document);
      setStep('success');
      setStatus('idle');
    } catch (err: any) {
      console.error("OTP Verify Error:", err);
      setErrorMessage(err.message);
      setStatus('error');
    }
  };

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
                {documentData.docname || documentData.title}
              </h1>
              <a 
                href={documentData.path || '#'}
                download
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm flex items-center gap-2"
                onClick={(e) => {
                   if (!documentData.path) {
                      e.preventDefault();
                      showToast(t('DownloadFunctionality'), 'info');
                   }
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {t('Download')}
              </a>
            </div>
            
            <div className="p-10 flex flex-col items-center justify-center min-h-[400px] bg-gray-50 dark:bg-gray-900/50">
               <div className="text-center">
                  <div className="mb-6">
                      {documentData.thumbnail_url ? (
                          <img src={documentData.thumbnail_url} alt="Preview" className="max-h-64 mx-auto rounded shadow" />
                      ) : (
                          <div className="h-32 w-32 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto flex items-center justify-center">
                              <span className="text-4xl">📄</span>
                          </div>
                      )}
                  </div>
                  <div className="border border-green-300 dark:border-green-600 rounded-lg p-4 bg-green-50 dark:bg-green-900/20 inline-block text-green-800 dark:text-green-200">
                      {t('VerifiedAccessFor')} <strong>{email}</strong>
                      <br/>
                      <span className="text-xs opacity-75">{t('AccessLoggedAt')} {new Date().toLocaleTimeString()}</span>
                  </div>
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
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} // Only allow numbers
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