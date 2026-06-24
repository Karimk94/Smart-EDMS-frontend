import React, { useState } from 'react';
import { useAdmin } from '../../../hooks/useAdmin';
import { useAuth } from '../../../hooks/useAuth';
import { useTranslations } from '../../hooks/useTranslations';
import { Spinner } from '../../components/Spinner';

export default function ProfilesTab() {
    const { user } = useAuth();
    const lang = user?.lang || 'en';
    const t = useTranslations(lang as 'en' | 'ar');

    const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
    const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

    const { useAdminProfiles, useProfileGroups, useGroupUsers } = useAdmin();

    const { data: profiles, isLoading: isLoadingProfiles } = useAdminProfiles();
    const { data: groups, isLoading: isLoadingGroups } = useProfileGroups(selectedProfileId);
    const { data: users, isLoading: isLoadingUsers } = useGroupUsers(selectedGroupId);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden h-[calc(100vh-200px)] flex flex-col md:flex-row">
            {/* Profiles Column */}
            <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 flex flex-col h-1/3 md:h-full">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{t('adminProfiles')}</h3>
                </div>
                <div className="overflow-y-auto flex-1 p-2 space-y-1">
                    {isLoadingProfiles ? (
                        <div className="p-4 flex justify-center"><Spinner size="sm" center={false} /></div>
                    ) : profiles?.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">{t('noProfilesFound')}</div>
                    ) : (
                        profiles?.map(profile => (
                            <button
                                key={profile.system_id}
                                onClick={() => {
                                    setSelectedProfileId(profile.system_id);
                                    setSelectedGroupId(null);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${selectedProfileId === profile.system_id ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-medium' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                            >
                                <div className="truncate">{profile.form_name}</div>
                                {profile.form_title && <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{profile.form_title}</div>}
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Groups Column */}
            <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 flex flex-col h-1/3 md:h-full">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{t('adminGroups')}</h3>
                </div>
                <div className="overflow-y-auto flex-1 p-2 space-y-1">
                    {!selectedProfileId ? (
                        <div className="p-4 text-center text-gray-500 text-sm">{t('selectProfileToViewGroups')}</div>
                    ) : isLoadingGroups ? (
                        <div className="p-4 flex justify-center"><Spinner size="sm" center={false} /></div>
                    ) : groups?.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">{t('noGroupsFoundForProfile')}</div>
                    ) : (
                        groups?.map(group => (
                            <button
                                key={group.system_id}
                                onClick={() => setSelectedGroupId(group.system_id)}
                                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${selectedGroupId === group.system_id ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-medium' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                            >
                                <div className="truncate">{group.group_name}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">{group.group_id}</div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Users Column */}
            <div className="w-full md:w-1/3 flex flex-col h-1/3 md:h-full">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{t('adminUsers')}</h3>
                </div>
                <div className="overflow-y-auto flex-1 p-2 space-y-1">
                    {!selectedGroupId ? (
                        <div className="p-4 text-center text-gray-500 text-sm">{t('selectGroupToViewUsers')}</div>
                    ) : isLoadingUsers ? (
                        <div className="p-4 flex justify-center"><Spinner size="sm" center={false} /></div>
                    ) : users?.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">{t('noUsersFoundInGroup')}</div>
                    ) : (
                        users?.map(user => (
                            <div
                                key={user.system_id}
                                className="px-3 py-2 rounded-md text-sm bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm mb-1"
                            >
                                <div className="font-medium text-gray-900 dark:text-white truncate">{user.full_name}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">{user.user_id}</div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
