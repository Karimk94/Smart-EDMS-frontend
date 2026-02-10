"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';
type ToastVariant = 'solid' | 'subtle' | 'left-accent';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  variant?: ToastVariant;
}

interface ToastContextType {
  showToast: (message: string, type: ToastType, variant?: ToastVariant, duration?: number) => string;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  // CONFIG: Change this to 'solid', 'subtle', or 'left-accent' to switch designs globally
  const defaultVariant: ToastVariant = 'subtle';

  const showToast = useCallback((message: string, type: ToastType, variant: ToastVariant = defaultVariant, duration: number = 3000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, variant }]);

    // Auto remove if duration is greater than 0
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const getToastStyles = (type: ToastType, variant: ToastVariant = defaultVariant) => {
    const baseStyles = "min-w-[300px] max-w-md p-4 rounded-lg shadow-lg cursor-pointer transform transition-all duration-300 ease-in-out hover:scale-105 flex items-center gap-3";

    // 1. Solid Design (High Contrast)
    if (variant === 'solid') {
      const bgColors = {
        success: 'bg-green-600 text-white',
        error: 'bg-red-600 text-white',
        warning: 'bg-yellow-500 text-white',
        info: 'bg-blue-600 text-white',
      };
      return `${baseStyles} ${bgColors[type]}`;
    }

    // 2. Subtle Design (Modern, Soft Backgrounds)
    if (variant === 'subtle') {
      const subtleColors = {
        success: 'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800',
        error: 'bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800',
        warning: 'bg-yellow-100 text-yellow-800 border border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-800',
        info: 'bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800',
      };
      return `${baseStyles} ${subtleColors[type]}`;
    }

    // 3. Left Accent Design (Professional, White with Color Strip)
    const accentColors = {
      success: 'border-l-4 border-green-500',
      error: 'border-l-4 border-red-500',
      warning: 'border-l-4 border-yellow-500',
      info: 'border-l-4 border-blue-500',
    };
    return `${baseStyles} bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 ${accentColors[type]}`;
  };

  const getIconColor = (type: ToastType, variant: ToastVariant = defaultVariant) => {
    if (variant === 'solid') return 'text-white';
    if (variant === 'subtle') return 'currentColor';

    const colors = {
      success: 'text-green-500',
      error: 'text-red-500',
      warning: 'text-yellow-500',
      info: 'text-blue-500',
    };
    return colors[type];
  }

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}

      {/* Animation Styles */}
      <style jsx global>{`
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-toast-entry {
          animation: slideUpFade 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Toast Container - Positioned Bottom Right */}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            className={`${getToastStyles(toast.type, toast.variant)} animate-toast-entry pointer-events-auto backdrop-blur-sm`}
          >
            {/* Icon */}
            <div className={`flex-shrink-0 ${getIconColor(toast.type, toast.variant)}`}>
              {toast.type === 'success' && (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              )}
              {toast.type === 'error' && (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              )}
              {toast.type === 'warning' && (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              )}
              {toast.type === 'info' && (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              )}
            </div>

            {/* Message */}
            <p className="text-sm font-medium leading-snug">{toast.message}</p>

            {/* Close Icon (Subtle) */}
            <div className="ml-auto pl-2">
              <svg className={`w-4 h-4 opacity-40 hover:opacity-100 ${getIconColor(toast.type, toast.variant)}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};