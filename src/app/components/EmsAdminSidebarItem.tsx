'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import Image from 'next/image';


interface EmsAdminSidebarItemProps {
  isSidebarOpen: boolean;
  lang: 'en' | 'ar';
}

export const EmsAdminSidebarItem: React.FC<EmsAdminSidebarItemProps> = ({ isSidebarOpen, lang }) => {
  const router = useRouter();
  const { user, isLoadingUser } = useAuth();

  const hasEmsTabAccess = (user?.tab_permissions || []).some(
    (perm) => perm.tab_key === 'ems_admin' && perm.can_read
  );
  const hasEmsGroupAccess = user?.is_ems_admin_group_member === true;
  const hasAdminLevelAccess = user?.security_level === 'Admin' || user?.security_level === 'Editor';
  const hasEmsAdminAccess = hasEmsTabAccess || hasEmsGroupAccess || hasAdminLevelAccess;

  if (isLoadingUser || !hasEmsAdminAccess) {
    return null;
  }

  const inactiveClass = 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white';

  return (
    <button
      onClick={() => router.push('/ems-admin')}
      className={`relative flex items-center w-full p-3 rounded-lg transition-colors duration-150 ease-in-out group ${inactiveClass} ${!isSidebarOpen ? 'justify-center' : ''} ${isSidebarOpen ? 'gap-4' : ''}`}
    >
      <Image src="/ems-admin-icon.svg" alt="" width={24} height={24} className="h-6 w-6 flex-shrink-0 opacity-80 dark:invert" />
      {isSidebarOpen && <span className="truncate">EMS Admin</span>}

      {!isSidebarOpen && (
        <span
          className={`absolute top-1/2 -translate-y-1/2 z-50
                     bg-white text-gray-900 border border-gray-200 shadow-lg dark:bg-gray-900 dark:text-white dark:border-gray-700 
                     px-3 py-1 rounded-md text-sm font-medium
                     opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100
                     transition-all duration-150 pointer-events-none whitespace-nowrap left-full ml-4
                    `}
        >
          EMS Admin
        </span>
      )}
    </button>
  );
};
