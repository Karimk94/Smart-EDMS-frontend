'use client';

import { useEmsAdminAuth } from '@/hooks/useEmsAdminAuth';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useUserPreferences } from '../../hooks/useUserPreferences';
import { PageSpinner } from '../components/Spinner';
import { UserAccessBadge } from '../components/UserAccessBadge';
import { useTranslations } from '../hooks/useTranslations';

interface EmsAdminLayoutProps {
    children: ReactNode;
}

export default function EmsAdminLayout({ children }: EmsAdminLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { useCheckAccess } = useEmsAdminAuth();
    const { data: accessData, isLoading, isError } = useCheckAccess();
    const { user, logout, isLoggingOut } = useAuth();
    const { updateLanguage, updateTheme } = useUserPreferences();

    const lang = user?.lang || 'en';
    const theme = user?.theme || 'light';
    const t = useTranslations(lang);

    const handleLanguageChange = async () => {
        const newLang = lang === 'en' ? 'ar' : 'en';
        try {
            await updateLanguage(newLang);
        } catch (error) {
            console.error('Failed to update language', error);
        }
    };

    const tabs = [
        { name: t('overview'), href: '/ems-admin', icon: '🏠', exact: true },
        { name: t('companies'), href: '/ems-admin/companies', icon: '🏢' },
        { name: t('departments'), href: '/ems-admin/departments', icon: '🏛️' },
        { name: t('emsSections'), href: '/ems-admin/sections', icon: '📋' },
    ];

    const isTabActive = (tab: { href: string; exact?: boolean }) => {
        if (tab.exact) {
            return pathname === tab.href;
        }
        return pathname.startsWith(tab.href);
    };

    if (isLoading) {
        return (
            <PageSpinner />
        );
    }

    if (isError) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
                <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
                    <h1 className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mb-4">Unable to Verify Access</h1>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">Could not connect to the server. Please try again.</p>
                    <button
                        onClick={() => router.push("/dashboard")}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        {t('backToDashboard')}
                    </button>
                </div>
            </div>
        );
    }

    if (!accessData?.has_access) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
                <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
                    <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Access Denied</h1>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">You do not have permission to access this section.</p>
                    <button
                        onClick={() => router.push("/dashboard")}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        {t('backToDashboard')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 ltr" dir="ltr">
            {/* Top Header Bar — matches dashboard Header style */}
            <header className="sticky top-0 z-40 bg-[var(--color-bg-header)] border-b border-[var(--color-border-primary)] px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Left: Back to Dashboard + Title */}
                    <div className="flex-shrink-0 flex items-center">
                        <Link
                            href="/dashboard"
                            className="p-2 rounded-full text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                            aria-label={t('backToDashboard')}
                        >
                            <Image src="/icons/chevron-left.svg" alt="" width={24} height={24} className="w-6 h-6 dark:invert" />
                        </Link>
                        <Link href="/ems-admin">
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white ml-4 cursor-pointer">
                                EMS <span className="text-red-500">Admin</span>
                            </h1>
                        </Link>
                        {/* Language Toggle — same style as dashboard */}
                        <button
                            onClick={handleLanguageChange}
                            className="px-3 py-1.5 bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-white text-sm font-medium rounded-md hover:bg-gray-300 dark:hover:bg-gray-700 ml-4"
                        >
                            {lang === 'en' ? 'العربية' : 'English'}
                        </button>
                        {/* Theme Toggle — same icons as dashboard */}
                        <button
                            onClick={() => updateTheme(theme === 'light' ? 'dark' : 'light')}
                            className="p-2 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 ml-4"
                            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                        >
                            {theme === 'light' ? (
                                <Image src="/moon.svg" alt="Dark Mode" width={20} height={20} />
                            ) : (
                                <Image src="/sun.svg" alt="Light Mode" width={20} height={20} className="invert" />
                            )}
                        </button>
                    </div>

                    {/* Right: User Badge */}
                    <div className="flex items-center gap-4 ml-auto">
                        <UserAccessBadge user={user} lang={lang} onLogout={logout} logoutText={t('logout')} isLoggingOut={isLoggingOut} loggingOutText={t('loggingOut')} />
                    </div>
                </div>
            </header>

            {/* EMS Admin Navigation Tabs Bar */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <nav className="flex space-x-4 sm:space-x-8 overflow-x-auto" aria-label="EMS Admin Tabs">
                        {tabs.map((tab) => {
                            const active = isTabActive(tab);
                            return (
                                <Link
                                    key={tab.href}
                                    href={tab.href}
                                    className={`inline-flex items-center gap-2 py-3 px-3 border-b-2 font-medium text-sm transition whitespace-nowrap ${active
                                            ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-semibold'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600'
                                        }`}
                                >
                                    <span>{tab.icon}</span>
                                    <span>{tab.name}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </div>

            {children}
        </div>
    );
}
