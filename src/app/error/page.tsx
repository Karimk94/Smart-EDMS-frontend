"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Suspense, useState } from 'react';
import { PageSpinner } from '../components/Spinner';
import { useTranslations } from '../hooks/useTranslations';

function ErrorContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Simple language detection (fallback to 'en')
    const [lang, setLang] = useState<'en' | 'ar'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('lang') as 'en' | 'ar') || 'en';
        }
        return 'en';
    });

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
                    <Image src="/icons/warning.svg" alt="" width={40} height={40} className="h-10 w-10" />
                </div>

                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">{code}</h1>
                <p className="text-gray-600 dark:text-gray-300 mb-8">{message}</p>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={handleRetry}
                        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                    >
                        <Image src="/icons/refresh.svg" alt="" width={20} height={20} className="invert" />
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
        <Suspense fallback={<PageSpinner />}>
            <ErrorContent />
        </Suspense>
    );
}
