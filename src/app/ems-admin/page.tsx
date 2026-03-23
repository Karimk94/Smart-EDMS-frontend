'use client';

import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import { useTranslations } from '../hooks/useTranslations';

export default function EmsAdminHome() {
    const { user } = useAuth();
    const lang = user?.lang || 'en';
    const t = useTranslations(lang);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#1f1f1f]">
            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                        {t('emsAdminManagement')}
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400">
                        {t('emsAdminDescription')}
                    </p>
                </div>

                {/* Action Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                    {/* Companies Management */}
                    <Link href="/ems-admin/companies">
                        <div className="h-full p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition cursor-pointer border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 flex flex-col">
                            <div className="text-center flex flex-col items-center justify-center h-full">
                                <div className="text-5xl mb-4">🏢</div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                    {t('companies')}
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">
                                    {t('companiesDescription')}
                                </p>
                            </div>
                        </div>
                    </Link>

                    {/* Departments Management */}
                    <Link href="/ems-admin/departments">
                        <div className="h-full p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition cursor-pointer border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 flex flex-col">
                            <div className="text-center flex flex-col items-center justify-center h-full">
                                <div className="text-5xl mb-4">🏛️</div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                    {t('departments')}
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">
                                    {t('departmentsDescription')}
                                </p>
                            </div>
                        </div>
                    </Link>

                    {/* EMS Sections Management */}
                    <Link href="/ems-admin/sections">
                        <div className="h-full p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition cursor-pointer border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 flex flex-col">
                            <div className="text-center flex flex-col items-center justify-center h-full">
                                <div className="text-5xl mb-4">📋</div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                    {t('emsSections')}
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">
                                    {t('emsSectionsDescription')}
                                </p>
                            </div>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
