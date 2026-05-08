import { createContext, useContext } from 'react';
import { SearchCriterion } from './useProfileSearch';

export interface SearchContext {
  criteria: SearchCriterion[];
  scope: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface HighlightConfig {
  searchTerm: string;
  matchType: 'like' | 'exact' | 'startsWith';
  className?: string; // Custom class to apply to highlights
}

/**
 * Creates a React Context for search context
 */
export const ProfileSearchContextProvider = createContext<SearchContext | null>(null);

/**
 * Hook to access the current search context (criteria that were searched for)
 */
export function useSearchContext() {
  const context = useContext(ProfileSearchContextProvider);
  return context;
}

/**
 * Highlights search terms in text by wrapping them in span tags with a specific class
 * @param text - The text to highlight
 * @param config - Configuration for highlighting
 * @returns JSX with highlighted text
 */
export function highlightSearchTerm(
  text: string | undefined,
  config: HighlightConfig
): string {
  if (!text) return '';

  const { searchTerm, matchType, className = 'bg-yellow-200 dark:bg-yellow-700 font-semibold' } = config;

  let regex: RegExp;
  try {
    if (matchType === 'exact') {
      regex = new RegExp(`\\b${escapeRegExp(searchTerm)}\\b`, 'gi');
    } else if (matchType === 'startsWith') {
      regex = new RegExp(`\\b${escapeRegExp(searchTerm)}`, 'gi');
    } else {
      // 'like' - contains
      regex = new RegExp(escapeRegExp(searchTerm), 'gi');
    }
  } catch {
    return text;
  }

  // Split text by matches and preserve case
  const parts = text.split(regex);
  const matches = text.match(regex) || [];

  let result = '';
  for (let i = 0; i < parts.length; i++) {
    result += parts[i];
    if (i < matches.length) {
      result += `<mark class="${className}">${matches[i]}</mark>`;
    }
  }

  return result;
}

/**
 * Returns the highlight positions in text for the search term
 * Useful for highlighting in PDF viewers or other contexts
 */
export function getHighlightPositions(
  text: string | undefined,
  config: HighlightConfig
): Array<{ start: number; end: number; text: string }> {
  if (!text) return [];

  const { searchTerm, matchType } = config;
  const positions: Array<{ start: number; end: number; text: string }> = [];

  let regex: RegExp;
  try {
    if (matchType === 'exact') {
      regex = new RegExp(`\\b${escapeRegExp(searchTerm)}\\b`, 'gi');
    } else if (matchType === 'startsWith') {
      regex = new RegExp(`\\b${escapeRegExp(searchTerm)}`, 'gi');
    } else {
      // 'like' - contains
      regex = new RegExp(escapeRegExp(searchTerm), 'gi');
    }
  } catch {
    return [];
  }

  let match;
  while ((match = regex.exec(text)) !== null) {
    positions.push({
      start: match.index,
      end: match.index + match[0].length,
      text: match[0],
    });
  }

  return positions;
}

/**
 * Escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Highlights text in HTML content while preserving markup
 * Returns HTML string with <mark> tags around matches
 */
export function highlightInHtml(
  html: string | undefined,
  config: HighlightConfig
): string {
  if (!html) return '';

  const { searchTerm, matchType, className = 'bg-yellow-200 dark:bg-yellow-700 font-semibold' } = config;

  let regex: RegExp;
  try {
    if (matchType === 'exact') {
      regex = new RegExp(`\\b${escapeRegExp(searchTerm)}\\b`, 'gi');
    } else if (matchType === 'startsWith') {
      regex = new RegExp(`\\b${escapeRegExp(searchTerm)}`, 'gi');
    } else {
      // 'like' - contains
      regex = new RegExp(escapeRegExp(searchTerm), 'gi');
    }
  } catch {
    return html;
  }

  // Simple HTML-aware highlighting (doesn't highlight inside tags)
  return html.replace(
    /(?:([^<]*(?:<[^>]*>[^<]*)*))(?=[^<]*(?:<|$))/g,
    (match) => {
      return match.replace(regex, `<mark class="${className}">$&</mark>`);
    }
  );
}
