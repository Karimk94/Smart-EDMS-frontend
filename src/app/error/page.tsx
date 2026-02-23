"use client";

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from '../hooks/useTranslations';

function ErrorContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Simple language detection (fallback to 'en')
    const [lang, setLang] = useState<'en' | 'ar'>('en');

    useEffect(() => {
        const storedLang = localStorage.getItem('language') as 'en' | 'ar';
        if (storedLang) {
            setLang(storedLang);
        }
    }, []);

    const t = useTranslations(lang);

    const rawCode = searchParams.get('code');
    const rawMessage = searchParams.get('message');

    // Try to translate if the param is a key, otherwise use it as is
    const code = rawCode ? t(rawCode as any) : t('error');
    const message = rawMessage ? t(rawMessage as any) : t('somethingWentWrong');
    const retryPath = searchParams.get('retry');

    const handleRetry = () => {
        if (retryPath) {
            router.push(retryPath);
        } else {
            router.back();
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-[#121212] p-4 text-center" dir="ltr">
            <div className="bg-white dark:bg-[#1e1e1e] p-8 rounded-2xl shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-800">
                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>

                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">{code}</h1>
                <p className="text-gray-600 dark:text-gray-300 mb-8">{message}</p>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={handleRetry}
                        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {t('retry')}
                    </button>

                    <button
                        onClick={() => router.push('/')}
                        className="w-full py-3 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-medium transition-colors"
                    >
                        {t('goHome')}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function ErrorPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-[#121212] text-gray-500">Loading...</div>}>
            <ErrorContent />
        </Suspense>
    );
}
