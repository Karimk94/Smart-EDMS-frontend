"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

interface User {
    username: string;
    security_level: string;
    lang: 'en' | 'ar';
    theme: 'light' | 'dark';
    quota: number;
    remaining_quota: number;
}

interface UserContextType {
    user: User | undefined;
    isLoading: boolean;
    isAuthenticated: boolean;
    isEditor: boolean;
    login: (credentials: any) => Promise<any>;
    logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
    const { user, isLoadingUser, login, logout, isAuthenticated } = useAuth();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    // Apply theme globally when user is loaded
    useEffect(() => {
        if (user?.theme) {
            if (user.theme === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        }
    }, [user?.theme]);

    // Apply language globally when user is loaded
    useEffect(() => {
        if (user?.lang) {
            document.documentElement.lang = user.lang;
            document.documentElement.dir = 'ltr';
        }
    }, [user?.lang]);

    const value = {
        user,
        isLoading: isLoadingUser,
        isAuthenticated, // Use the one from useAuth which checks query success
        isEditor: user?.security_level === 'Editor',
        login,
        logout
    };

    // Prevent hydration mismatch or flash of wrong theme/content by waiting for client and (optionally) user load
    // But we might want to allow public pages? 
    // For now, strict mode for the dashboard part, but the provider is in root layout.
    // If we block rendering until user is loaded, PortalLanding won't show.
    // So we just provide the context.

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}
