"use client";

import React, { useState, useEffect } from 'react';
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
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [lang, setLang] = useState<'en' | 'ar'>('en');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const storedTheme = (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
        const storedLang = (localStorage.getItem('lang') as 'en' | 'ar') || 'en';
        
        setTheme(storedTheme);
        setLang(storedLang);

        if (storedTheme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');

        document.documentElement.lang = storedLang;
        document.documentElement.dir = 'ltr'; // Consider updating this based on RTL languages if necessary
    }, []);
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
