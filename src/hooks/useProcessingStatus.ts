"use client";

import { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface UseProcessingStatusOptions {
    user: any;
    activeSection: string;
    activeFolder: string | null;
    apiURL: string;
}

/**
 * Manages the list of documents currently being AI-processed,
 * persists to localStorage, and polls the backend for completion status.
 */
export function useProcessingStatus({ user, activeSection, activeFolder, apiURL }: UseProcessingStatusOptions) {
    const queryClient = useQueryClient();
    const [processingDocs, setProcessingDocs] = useState<number[]>([]);
    const username = user?.username;

    // Load from localStorage on mount
    useEffect(() => {
        if (username) {
            const stored = localStorage.getItem('processingDocs');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed)) {
                        setProcessingDocs(parsed);
                    } else {
                        localStorage.removeItem('processingDocs');
                    }
                } catch {
                    localStorage.removeItem('processingDocs');
                }
            }
        }
    }, [username]);

    // Polling effect
    useEffect(() => {
        if (username) {
            if (processingDocs.length === 0) {
                localStorage.removeItem('processingDocs');
                return;
            }
            localStorage.setItem('processingDocs', JSON.stringify(processingDocs));
            const interval = setInterval(async () => {
                try {
                    const response = await fetch(`${apiURL}/processing_status`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ docnumbers: processingDocs }),
                    });
                    if (!response.ok) return;
                    const data = await response.json();
                    const stillProcessing = data.processing || [];

                    if (
                        JSON.stringify(stillProcessing.sort()) !==
                        JSON.stringify(processingDocs.sort())
                    ) {
                        setProcessingDocs(stillProcessing);
                        if (stillProcessing.length === 0) {
                            clearInterval(interval);
                            if (activeSection === 'recent' || (activeSection === 'folders' && activeFolder)) {
                                queryClient.invalidateQueries({ queryKey: ['documents'] });
                            }
                            if (activeSection === 'folders' && !activeFolder) {
                                queryClient.invalidateQueries({ queryKey: ['folders'] });
                            }
                        }
                    } else if (stillProcessing.length === 0) {
                        clearInterval(interval);
                        setProcessingDocs([]);
                    }
                } catch (error) {
                    console.error('Error checking processing status:', error);
                }
            }, 7000);
            return () => clearInterval(interval);
        }
    }, [processingDocs, activeSection, activeFolder, username, queryClient, apiURL]);

    const addProcessingDocs = useCallback((docnumbers: number[]) => {
        setProcessingDocs(prev => Array.from(new Set([...prev, ...docnumbers])));
    }, []);

    const removeProcessingDocs = useCallback((docnumbers: number[]) => {
        setProcessingDocs(prev => prev.filter(d => !docnumbers.includes(d)));
    }, []);

    return {
        processingDocs,
        setProcessingDocs,
        addProcessingDocs,
        removeProcessingDocs,
        isProcessing: processingDocs.length > 0,
    };
}
