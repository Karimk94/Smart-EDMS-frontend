"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslations } from '../hooks/useTranslations';
import type { TFunction } from '../hooks/useTranslations';
import { useUser } from '../context/UserContext';
import { PageSpinner } from './Spinner';
import { useAdmin } from '../../hooks/useAdmin';
import { useEmsAdminAuth } from '../../hooks/useEmsAdminAuth';

interface SystemCard {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode | string;
    href: string;
    tabKey?: 'recent' | 'favorites' | 'folders' | 'profilesearch';
    accessKey?: 'admin' | 'ems-admin';
    isExternal?: boolean;
    color: string;
}

const translateWithFallback = (t: TFunction, key: Parameters<TFunction>[0], fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
};

const getSystems = (t: TFunction): SystemCard[] => [
    {
        id: 'smart-edms',
        title: t('smartEdmsTitle'),
        description: t('smartEdmsDesc'),
        icon: '/smart-edms.svg',
        href: '/dashboard',
        tabKey: 'recent',
        color: 'from-blue-600 to-blue-800',
    },
    {
        id: 'folders',
        title: t('folders') || 'Folders',
        description: t('foldersDesc') || 'Browse all your files and folders',
        icon: '/folders-icon.svg',
        href: '/folders',
        tabKey: 'folders',
        color: 'from-blue-600 to-blue-800',
    },
    {
        id: 'profilesearch',
        title: t('profilesearch') || 'Profile Search',
        description: t('profilesearchDesc') || 'Search document profiles across all forms',
        icon: '/search-icon.svg',
        href: '/profilesearch',
        tabKey: 'profilesearch',
        color: 'from-blue-600 to-blue-800',
    },
    {
        id: 'admin',
        title: translateWithFallback(t, 'admin', 'Admin'),
        description: translateWithFallback(t, 'adminDesc', 'Manage EDMS users, tab permissions, quotas, and processing queues.'),
        icon: '/admin-icon.svg',
        href: '/admin',
        accessKey: 'admin',
        color: 'from-blue-600 to-blue-800',
    },
    {
        id: 'ems-admin',
        title: t('emsAdmin'),
        description: t('emsAdminDescription'),
        icon: '/ems-admin-icon.svg',
        href: '/ems-admin',
        accessKey: 'ems-admin',
        color: 'from-blue-600 to-blue-800',
    },
];

export function PortalLanding() {
    const router = useRouter();
    const { isLoading, isAuthenticated, currentLang, currentTheme, allowedSections } = useUser();
    const { useCheckAccess: useCheckAdminAccess } = useAdmin();
    const { useCheckAccess: useCheckEmsAdminAccess } = useEmsAdminAuth();
    const { data: adminAccessData, isLoading: isCheckingAdminAccess } = useCheckAdminAccess();
    const { data: emsAdminAccessData, isLoading: isCheckingEmsAdminAccess } = useCheckEmsAdminAccess();

    const [theme, setTheme] = useState<'light' | 'dark'>(currentTheme);
    const [lang, setLang] = useState<'en' | 'ar'>(currentLang);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        setLang(currentLang);
        setTheme(currentTheme);
    }, [currentLang, currentTheme]);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            const params = new URLSearchParams({ redirect: '/' });
            if (lang) params.set('lang', lang);
            if (theme) params.set('theme', theme);
            router.push(`/login?${params.toString()}`);
        }
    }, [isAuthenticated, isLoading, lang, theme, router]);

    const t = useTranslations(lang);
    const hasAdminAccess = adminAccessData?.has_access === true;
    const hasEmsAdminAccess = emsAdminAccessData?.has_access === true;

    const toggleTheme = () => {
        setTheme(prev => {
            const next = prev === 'light' ? 'dark' : 'light';
            localStorage.setItem('theme', next);
            if (next === 'dark') document.documentElement.classList.add('dark');
            else document.documentElement.classList.remove('dark');
            return next;
        });
    };

    const toggleLanguage = () => {
        setLang(prev => {
            const next = prev === 'en' ? 'ar' : 'en';
            localStorage.setItem('lang', next);
            document.documentElement.lang = next;
            document.documentElement.dir = 'ltr';
            return next;
        });
    };

    const systems = getSystems(t).filter(system => {
        if (system.tabKey) {
            return allowedSections.includes(system.tabKey);
        }

        if (system.accessKey === 'admin') {
            return hasAdminAccess;
        }

        if (system.accessKey === 'ems-admin') {
            return hasEmsAdminAccess;
        }

        return true;
    });

    if (
        isLoading ||
        (!mounted && !isAuthenticated) ||
        (isAuthenticated && (isCheckingAdminAccess || isCheckingEmsAdminAccess))
    ) {
        return <PageSpinner label={t('loading') || 'Loading...'} />;
    }

    if (!isAuthenticated) {
        return <PageSpinner label="Redirecting to login..." />;
    }

    return (
        <>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex flex-col">
                {/* Header */}
                <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                                    <Image
                                        src="/icon.ico"
                                        alt="EDMS Logo"
                                        width={40}
                                        height={40}
                                        className="rounded-lg"
                                    />
                                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                                        {t('edmsPortal')}
                                    </h1>
                                </Link>
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Language Toggle Button */}
                                <button
                                    onClick={toggleLanguage}
                                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm font-medium"
                                >
                                    {lang === 'en' ? 'العربية' : 'English'}
                                </button>

                                {/* Theme Toggle Button */}
                                <button
                                    onClick={toggleTheme}
                                    className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                    title={theme === 'light' ? t('switchToDark') : t('switchToLight')}
                                >
                                    {theme === 'light' ? (
                                        <Image src="/moon.svg" alt="" width={20} height={20} />
                                    ) : (
                                        <Image src="/sun.svg" alt="" width={20} height={20} className="dark:invert" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
                    <div className="mb-10">
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                            {t('welcomeToEdms')}
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400">
                            {t('selectSystem')}
                        </p>
                    </div>

                    {/* System List - Vertical Layout */}
                    <div className="space-y-4">
                        {systems.length === 0 ? (
                            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center text-slate-700 dark:text-slate-200">
                                You do not have access to any portal sections. Contact your administrator.
                            </div>
                        ) : systems.map((system) => (
                            <Link
                                key={system.id}
                                href={`${system.href}?lang=${lang}&theme=${theme}`}
                                target={system.isExternal ? '_blank' : undefined}
                                rel={system.isExternal ? 'noopener noreferrer' : undefined}
                                className="group flex items-center gap-5 p-5 bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                            >
                                {/* Icon */}
                                <div className={`flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br ${system.color} text-white flex items-center justify-center group-hover:scale-105 transition-transform duration-300`}>
                                    {typeof system.icon === 'string' ? (
                                        <Image
                                            src={system.icon}
                                            alt={system.title}
                                            width={40}
                                            height={40}
                                            className="w-10 h-10 text-white invert"
                                        />
                                    ) : (
                                        system.icon
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                                            {system.title}
                                        </h3>
                                        {system.isExternal && (
                                            <Image src="/icons/external-link.svg" alt="" width={16} height={16} className="dark:invert" />
                                        )}
                                    </div>
                                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                                        {system.description}
                                    </p>
                                </div>

                                {/* Arrow */}
                                <div className="flex-shrink-0 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                                    <Image src="/icons/chevron-right.svg" alt="" width={20} height={20} className="dark:invert group-hover:translate-x-1 transition-transform" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </main>

                {/* Footer */}
                <footer className="py-6 text-center text-slate-500 dark:text-slate-400 text-sm border-t border-slate-200 dark:border-slate-700">
                    <p>&copy; {new Date().getFullYear()} {t('rightsReserved')}</p>
                </footer>
            </div>
        </>
    );
}
