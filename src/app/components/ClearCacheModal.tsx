"use client";

interface ClearCacheModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

/**
 * Confirmation dialog for clearing the thumbnail cache.
 */
export function ClearCacheModal({ isOpen, onClose, onConfirm }: ClearCacheModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4 animate-fade-in">
            <div className="bg-white dark:bg-[#333] rounded-lg p-6 max-w-sm w-full shadow-xl border border-gray-200 dark:border-gray-600">
                <div className="flex items-center gap-3 mb-4 text-amber-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <h3 className="text-lg font-bold dark:text-white">Clear Cache</h3>
                </div>

                <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">
                    Are you sure you want to clear the thumbnail cache? This may affect loading performance temporarily.
                </p>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 text-sm bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors shadow-sm"
                    >
                        Yes, Clear Cache
                    </button>
                </div>
            </div>
        </div>
    );
}
