'use client';

import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { useEmsAdminAuth } from '../../hooks/useEmsAdminAuth';

/**
 * Admin Navigation Button - Shows link to EMS Admin if user has access
 */
export const AdminNavButton: React.FC = () => {
    const { useCheckAccess } = useEmsAdminAuth();
    const { data: accessData, isLoading } = useCheckAccess();

    if (isLoading || !accessData?.has_access) {
        return null;
    }

    return (
        <Link
            href="/ems-admin"
            className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 transition flex items-center gap-2"
        >
            <Image src="/ems-admin-icon.svg" alt="" width={20} height={20} className="dark:invert" />
            <span>EMS Admin</span>
        </Link>
    );
};
