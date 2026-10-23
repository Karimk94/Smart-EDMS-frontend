"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Suspense, useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { LoadingButton } from '../components/LoadingButton';
import { PageSpinner } from '../components/Spinner';
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
  if (!url) return '/';
  // Block absolute URLs, protocol-relative URLs, and data URIs
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(url) || url.startsWith('//')) return '/';
  // Must start with /
  if (!url.startsWith('/')) return '/';
  return url;
}

function LoginContent() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const searchParams = useSearchParams();
  const initialLang = (searchParams.get('lang') as 'en' | 'ar') || 'en';

  const [lang, setLang] = useState<'en' | 'ar'>(initialLang);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedLang = localStorage.getItem('lang') as 'en' | 'ar';
    const paramLang = searchParams.get('lang') as 'en' | 'ar';
    const finalLang = paramLang || savedLang || initialLang;
    setLang(finalLang);

    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    const paramTheme = searchParams.get('theme') as 'light' | 'dark';
    const finalTheme = paramTheme || savedTheme || 'light';
    setTheme(finalTheme);

    if (finalTheme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');

    document.documentElement.lang = finalLang;
    document.documentElement.dir = 'ltr';
  }, [initialLang, searchParams]);

  const t = useTranslations(lang);

  const router = useRouter();
  const { login, isLoggingIn, ssoLogin, isSsoLoggingIn, isAuthenticated, isLoadingUser, user } = useAuth();
  const [ssoError, setSsoError] = useState<string | null>(null);

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
  }, [isAuthenticated, isLoadingUser, router, searchParams, user, lang, theme]);

  const handleSsoLogin = async () => {
    setSsoError(null);
    try {
      const data = await ssoLogin();
      if (data?.user) {
        if (data.user.lang) setLang(data.user.lang);
        if (data.user.theme) setTheme(data.user.theme);
      }
      const redirectPath = getSafeRedirect(searchParams.get('redirect'), data?.user?.tab_permissions);
      router.push(redirectPath);
    } catch (err: any) {
      console.error('SSO Login exception:', err);
      const detail = err?.data?.detail || err?.message || t('ssoError');
      setSsoError(detail);
    }
  };

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

        <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <div className="flex justify-center mb-2">
            <Image src="/logo.png" alt="Company Logo" width={140} height={56} className="h-14 w-auto object-contain" priority />
          </div>
          <h1 className="text-2xl font-bold text-center">{t('loginTitle')}</h1>

          {/* SSO / IAM Login */}
          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={handleSsoLogin}
              disabled={isSsoLoggingIn || isLoggingIn}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-md shadow-sm transition duration-150 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSsoLoggingIn ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{t('ssoLoggingIn')}</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>{t('ssoLogin')}</span>
                </>
              )}
            </button>

            {ssoError && (
              <div className="p-3 text-xs text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-400 rounded-md border border-red-200 dark:border-red-800">
                {ssoError}
              </div>
            )}

            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-gray-300 dark:border-gray-600 w-full"></div>
              <span className="bg-white dark:bg-gray-800 px-3 text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
                {t('orDivider')}
              </span>
              <div className="border-t border-gray-300 dark:border-gray-600 w-full"></div>
            </div>
          </div>

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
            <LoadingButton
              type="submit"
              isLoading={isLoggingIn}
              loadingText={t('loggingIn')}
              className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 rounded-md font-semibold text-white disabled:bg-red-800 disabled:cursor-not-allowed"
            >
              {t('login')}
            </LoadingButton>
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