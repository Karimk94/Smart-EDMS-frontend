'use client';

import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useState } from 'react';

/**
 * Admin Navigation Button - Shows link to EMS Admin if user has access
 */
export const AdminNavButton: React.FC = () => {
    const [hasAdminAccess, setHasAdminAccess] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        const checkAdminAccess = async () => {
            try {
                const response = await fetch('/api/admin/check-access', {
                    credentials: 'include'
                });
                if (response.ok) {
                    const data = await response.json();
                    setHasAdminAccess(data.has_access === true);
                }
            } catch (error) {
                console.error('Failed to check admin access:', error);
            } finally {
                setIsChecking(false);
            }
        };

        checkAdminAccess();
    }, []);

    if (isChecking || !hasAdminAccess) {
        return null;
    }

    return (
        <Link
            href="/ems-admin"
            className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 transition flex items-center gap-2"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
            >
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5.951-1.488 5.951 1.488a1 1 0 001.169-1.409l-7-14z" />
            </svg>
            <span>EMS Admin</span>
        </Link>
    );
};
