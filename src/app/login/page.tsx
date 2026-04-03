"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Suspense, useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { PageSpinner } from '../components/Spinner';
import { useToast } from '../context/ToastContext';
import { useTranslations } from '../hooks/useTranslations';

const SECTION_ROUTES: Record<string, string> = {
  recent: '/dashboard',
  favorites: '/favorites',
  folders: '/folders',
  profilesearch: '/profilesearch',
};

// Derive the default landing route from tab_permissions, falling back to /dashboard
function getDefaultRoute(tabPermissions?: { tab_key: string; can_read: boolean }[]): string {
  if (!tabPermissions || tabPermissions.length === 0) return '/dashboard';
  const order = ['recent', 'favorites', 'folders', 'profilesearch'];
  for (const key of order) {
    const perm = tabPermissions.find(p => p.tab_key === key);
    if (perm?.can_read) return SECTION_ROUTES[key];
  }
  return '/dashboard';
}

// Safe redirect: only allow relative paths starting with /
function getSafeRedirect(url: string | null, tabPermissions?: { tab_key: string; can_read: boolean }[]): string {
  if (!url) return getDefaultRoute(tabPermissions);
  // Block absolute URLs, protocol-relative URLs, and data URIs
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(url) || url.startsWith('//')) return getDefaultRoute(tabPermissions);
  // Must start with /
  if (!url.startsWith('/')) return getDefaultRoute(tabPermissions);
  return url;
}

function LoginContent() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const searchParams = useSearchParams();
  const initialLang = (searchParams.get('lang') as 'en' | 'ar') || 'en';

  const [lang, setLang] = useState<'en' | 'ar'>(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('lang') as 'en' | 'ar';
      const paramLang = searchParams.get('lang') as 'en' | 'ar';
      return paramLang || savedLang || initialLang;
    }
    return initialLang;
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
      const paramTheme = searchParams.get('theme') as 'light' | 'dark';
      return paramTheme || savedTheme || 'light';
    }
    return 'light';
  });

  const t = useTranslations(lang);

  const router = useRouter();
  const { showToast } = useToast();
  const { login, isLoggingIn, isAuthenticated, isLoadingUser, user } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoadingUser) {
      const redirectPath = getSafeRedirect(searchParams.get('redirect'), user?.tab_permissions);
      // If we have user preferences, apply them before redirecting
      // This is crucial because the layout/context might be using these values
      if (user) {
        if (user.lang && user.lang !== lang) {
          setLang(user.lang);
        }
        if (user.theme && user.theme !== theme) {
          setTheme(user.theme);
        }
      }
      router.push(redirectPath);
    }
  }, [isAuthenticated, isLoadingUser, router, searchParams, user, lang, theme, getSafeRedirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const data = await login({ username, password });
      if (data?.user) {
        if (data.user.lang) setLang(data.user.lang);
        if (data.user.theme) setTheme(data.user.theme);
      }

      const redirectPath = getSafeRedirect(searchParams.get('redirect'), data?.user?.tab_permissions);
      router.push(redirectPath);
    } catch (err: any) {
      console.error('Login exception:', err);
      showToast(err.message || t('loginFailed'), 'error');
    }
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

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', next);
      if (next === 'dark') document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
      return next;
    });
  };

  // If we are checking auth status, show loading
  if (isLoadingUser) {
    return (
      <PageSpinner />
    );
  }

  // If authenticated, we are redirecting, so maybe show loading or nothing
  if (isAuthenticated) {
    return (
      <PageSpinner />
    );
  }

  return (
    <>
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white relative">
        {/* Toggle Buttons */}
        <div className="absolute top-4 right-4 flex gap-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? (
              <Image src="/moon.svg" alt="Dark Mode" width={20} height={20} className="w-5 h-5" />
            ) : (
              <Image src="/sun.svg" alt="Light Mode" width={20} height={20} className="w-5 h-5 invert" />
            )}
          </button>
          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium text-sm"
          >
            {lang === 'en' ? 'العربية' : 'English'}
          </button>
        </div>

        <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-center">{t('loginTitle')}</h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="username"
                className="block mb-2 text-sm font-medium text-gray-600 dark:text-gray-400"
              >
                {t('username')}
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-red-500 focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block mb-2 text-sm font-medium text-gray-600 dark:text-gray-400"
              >
                {t('password')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-red-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 rounded-md font-semibold text-white disabled:bg-red-800"
            >
              {isLoggingIn ? t('loggingIn') : t('login')}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <LoginContent />
    </Suspense>
  );
}