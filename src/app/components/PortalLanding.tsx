"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from '../hooks/useTranslations';
import type { TFunction } from '../hooks/useTranslations';

interface SystemCard {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode | string;
    href: string;
    isExternal?: boolean;
    color: string;
}

const getSystems = (t: TFunction): SystemCard[] => [
    {
        id: 'smart-edms',
        title: t('smartEdmsTitle'),
        description: t('smartEdmsDesc'),
        icon: '/smart-edms.svg',
        href: '/dashboard',
        color: 'from-blue-600 to-blue-800',
    },
    {
        id: 'folders',
        title: t('folders') || 'Folders',
        description: t('foldersDesc') || 'Browse all your files and folders',
        icon: '/folders-icon.svg',
        href: '/folders',
        color: 'from-blue-600 to-blue-800',
    },
    {
        id: 'profilesearch',
        title: t('profilesearch') || 'Profile Search',
        description: t('profilesearchDesc') || 'Search document profiles across all forms',
        icon: '/search-icon.svg',
        href: '/profilesearch',
        color: 'from-indigo-600 to-indigo-800',
    },
    {
        id: 'pta-edms',
        title: t('ptaEdmsTitle'),
        description: t('ptaEdmsDesc'),
        icon: '/pta-edms.svg',
        href: '/PTAEDMS',
        isExternal: true,
        color: 'from-blue-500 to-blue-700',
    },
];

export function PortalLanding() {
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
        }
        return 'light';
    });
    const [lang, setLang] = useState<'en' | 'ar'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('lang') as 'en' | 'ar') || 'en';
        }
        return 'en';
    });
    const t = useTranslations(lang);

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

    const systems = getSystems(t);

    return (
        <>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex flex-col">
                {/* Header */}
                <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
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
                                </a>
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
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                                        </svg>
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
                        {systems.map((system) => (
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
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                            </svg>
                                        )}
                                    </div>
                                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                                        {system.description}
                                    </p>
                                </div>

                                {/* Arrow */}
                                <div className="flex-shrink-0 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 group-hover:translate-x-1 transition-transform`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                    </svg>
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
