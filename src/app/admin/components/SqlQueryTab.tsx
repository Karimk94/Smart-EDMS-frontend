"use client";

import { useState, useCallback } from "react";
import Image from 'next/image';
import { useToast } from "../../context/ToastContext";

interface TableColumn {
    name: string;
    type: string;
    length: number | null;
    nullable: boolean;
}

interface TableInfo {
    name: string;
    description: string;
    columns: TableColumn[];
    error?: string;
}

interface QueryTemplate {
    name: string;
    description: string;
    query: string;
}

interface QueryResult {
    columns: string[];
    rows: any[][];
    total_rows: number;
    truncated: boolean;
    max_rows: number;
}

export default function SqlQueryTab() {
    const [query, setQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<QueryResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [tables, setTables] = useState<TableInfo[]>([]);
    const [templates, setTemplates] = useState<QueryTemplate[]>([]);
    const [showSchema, setShowSchema] = useState(false);
    const [expandedTable, setExpandedTable] = useState<string | null>(null);
    const [isLoadingSchema, setIsLoadingSchema] = useState(false);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 50;
    
    const { showToast } = useToast();

    // Fetch table schema
    const fetchSchema = useCallback(async () => {
        setIsLoadingSchema(true);
        try {
            const [tablesRes, templatesRes] = await Promise.all([
                fetch('/api/admin/sql-query/tables'),
                fetch('/api/admin/sql-query/templates')
            ]);
            
            if (tablesRes.ok) {
                const data = await tablesRes.json();
                setTables(data.tables || []);
            }
            
            if (templatesRes.ok) {
                const data = await templatesRes.json();
                setTemplates(data.templates || []);
            }
        } catch (err) {
            console.error('Failed to fetch schema:', err);
        } finally {
            setIsLoadingSchema(false);
        }
    }, []);

    // Execute query
    const executeQuery = async () => {
        if (!query.trim()) {
            showToast("Please enter a SQL query", "error");
            return;
        }

        setIsLoading(true);
        setError(null);
        setResult(null);
        setCurrentPage(1);

        try {
            const cleanQuery = query.trim().replace(/;+\s*$/, '');
            const response = await fetch('/api/admin/sql-query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: cleanQuery })
            });

            // Safely parse JSON or text error response
            let data: any = null;
            const contentType = response.headers.get("content-type") || "";

            if (contentType.includes("application/json")) {
                try {
                    data = await response.json();
                } catch {
                    // Fallback to text parsing below if JSON parsing fails
                }
            }

            if (!data) {
                const text = await response.text().catch(() => "");
                try {
                    data = JSON.parse(text);
                } catch {
                    data = { detail: text };
                }
            }

            if (!response.ok) {
                let errorMessage = data?.detail || data?.error || data?.message;
                if (!errorMessage || errorMessage.trim() === 'Bad Request') {
                    // If generic 400 Bad Request was received, provide an informative explanation
                    errorMessage = 'Table or query error: The requested table does not exist or is not permitted. Please click "Show Schema" to view allowed tables.';
                }
                throw new Error(errorMessage);
            }

            setResult(data);
            
            if (data.truncated) {
                showToast(`Results truncated at ${data.max_rows} rows`, "info");
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
            showToast(err.message || 'Query execution failed', "error");
        } finally {
            setIsLoading(false);
        }
    };

    // Export to CSV
    const exportToCSV = () => {
        if (!result || result.rows.length === 0) {
            showToast("No data to export", "error");
            return;
        }

        const csvContent = [
            result.columns.join(','),
            ...result.rows.map(row => 
                row.map(cell => {
                    // Handle cells that might contain commas or quotes
                    const cellStr = cell === null || cell === undefined ? '' : String(cell);
                    if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                        return `"${cellStr.replace(/"/g, '""')}"`;
                    }
                    return cellStr;
                }).join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `query_result_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showToast("CSV exported successfully", "success");
    };

    // Apply template
    const applyTemplate = (template: QueryTemplate) => {
        setQuery(template.query);
        setResult(null);
        setError(null);
    };

    // Toggle schema viewer
    const toggleSchema = () => {
        setShowSchema(!showSchema);
        if (!showSchema && tables.length === 0) {
            fetchSchema();
        }
    };

    // Calculate pagination
    const totalPages = result ? Math.ceil(result.rows.length / rowsPerPage) : 0;
    const paginatedRows = result 
        ? result.rows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)
        : [];

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">SQL Query</h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleSchema}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium ${showSchema ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}
                        >
                            {showSchema ? 'Hide Schema' : 'Show Schema'}
                        </button>
                    </div>
                </div>

                {/* Templates */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Query Templates
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {templates.map((template, index) => (
                            <button
                                key={index}
                                onClick={() => applyTemplate(template)}
                                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-600"
                                title={template.description}
                            >
                                {template.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Query Editor */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        SQL Query (SELECT only)
                    </label>
                    <textarea
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Enter your SELECT query here..."
                        className="w-full h-32 px-4 py-3 font-mono text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                        spellCheck={false}
                    />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={executeQuery}
                        disabled={isLoading || !query.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
                    >
                        {isLoading ? (
                            <>
                                <Image src="/icons/spinner.svg" alt="" width={16} height={16} className="h-4 w-4 animate-spin" />
                                Executing...
                            </>
                        ) : (
                            <>
                                <Image src="/icons/play.svg" alt="" width={16} height={16} className="h-4 w-4 invert" />
                                Execute Query
                            </>
                        )}
                    </button>
                    
                    {result && result.rows.length > 0 && (
                        <button
                            onClick={exportToCSV}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2 text-sm font-medium"
                        >
                            <Image src="/download.svg" alt="" width={16} height={16} className="h-4 w-4 invert" />
                            Export CSV
                        </button>
                    )}

                    <button
                        onClick={() => { setQuery(''); setResult(null); setError(null); }}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 text-sm font-medium"
                    >
                        Clear
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex">
                {/* Schema Sidebar */}
                {showSchema && (
                    <div className="w-80 border-r border-gray-200 dark:border-gray-700 p-4 max-h-[600px] overflow-y-auto">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Allowed Tables</h3>
                        
                        {isLoadingSchema ? (
                            <div className="flex items-center justify-center py-8">
                                <Image src="/icons/spinner.svg" alt="" width={24} height={24} className="h-6 w-6 animate-spin" />
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {tables.map((table) => (
                                    <div key={table.name} className="border border-gray-200 dark:border-gray-600 rounded-md">
                                        <button
                                            onClick={() => setExpandedTable(expandedTable === table.name ? null : table.name)}
                                            className="w-full px-3 py-2 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700"
                                        >
                                            <span className="font-mono text-sm text-gray-900 dark:text-white">{table.name}</span>
                                            <Image 
                                                src="/icons/chevron-down.svg" 
                                                alt="" 
                                                width={16} 
                                                height={16} 
                                                className={`h-4 w-4 transition-transform ${expandedTable === table.name ? 'rotate-180' : ''} dark:invert`}
                                            />
                                        </button>
                                        
                                        {expandedTable === table.name && (
                                            <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{table.description}</p>
                                                
                                                {table.error ? (
                                                    <p className="text-xs text-red-500">{table.error}</p>
                                                ) : table.columns.length > 0 ? (
                                                    <div className="space-y-1">
                                                        {table.columns.map((col) => (
                                                            <div key={col.name} className="flex items-center justify-between text-xs">
                                                                <span className="font-mono text-gray-700 dark:text-gray-300">{col.name}</span>
                                                                <span className="text-gray-400 dark:text-gray-500">{col.type}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-gray-400">No columns found</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Results Area */}
                <div className="flex-1 p-4">
                    {/* Error Display */}
                    {error && (
                        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                            <div className="flex items-start gap-3">
                                <Image src="/error.svg" alt="" width={20} height={20} className="h-5 w-5 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                    <h4 className="text-sm font-semibold text-red-800 dark:text-red-200">Query Error</h4>
                                    <p className="text-sm text-red-700 dark:text-red-300 mt-1 whitespace-pre-wrap">{error}</p>
                                    <div className="mt-2.5">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowSchema(true);
                                                if (tables.length === 0) fetchSchema();
                                            }}
                                            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                                        >
                                            View allowed tables and schema &rarr;
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Results Table */}
                    {result && (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {result.total_rows} row{result.total_rows !== 1 ? 's' : ''} returned
                                    {result.truncated && <span className="text-amber-600 dark:text-amber-400 ml-2">(truncated at {result.max_rows})</span>}
                                </div>
                            </div>

                            {result.rows.length > 0 ? (
                                <>
                                    <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                            <thead className="bg-gray-50 dark:bg-gray-700">
                                                <tr>
                                                    {result.columns.map((col, index) => (
                                                        <th
                                                            key={index}
                                                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap"
                                                        >
                                                            {col}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                                {paginatedRows.map((row, rowIndex) => (
                                                    <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                        {row.map((cell, cellIndex) => (
                                                            <td
                                                                key={cellIndex}
                                                                className="px-4 py-2 text-sm text-gray-900 dark:text-white whitespace-nowrap max-w-xs truncate"
                                                                title={cell !== null && cell !== undefined ? String(cell) : 'NULL'}
                                                            >
                                                                {cell === null ? (
                                                                    <span className="text-gray-400 italic">NULL</span>
                                                                ) : cell === '' ? (
                                                                    <span className="text-gray-300">-</span>
                                                                ) : (
                                                                    String(cell)
                                                                )}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination */}
                                    {totalPages > 1 && (
                                        <div className="flex items-center justify-between mt-4">
                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, result.rows.length)} of {result.rows.length}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setCurrentPage(1)}
                                                    disabled={currentPage === 1}
                                                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
                                                >
                                                    First
                                                </button>
                                                <button
                                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                    disabled={currentPage === 1}
                                                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
                                                >
                                                    Previous
                                                </button>
                                                <span className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
                                                    Page {currentPage} of {totalPages}
                                                </span>
                                                <button
                                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                    disabled={currentPage === totalPages}
                                                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
                                                >
                                                    Next
                                                </button>
                                                <button
                                                    onClick={() => setCurrentPage(totalPages)}
                                                    disabled={currentPage === totalPages}
                                                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
                                                >
                                                    Last
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    Query returned 0 rows
                                </div>
                            )}
                        </div>
                    )}

                    {/* Empty State */}
                    {!result && !error && (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            <Image src="/icons/database.svg" alt="" width={48} height={48} className="h-12 w-12 mx-auto mb-4 opacity-50 dark:invert" />
                            <p>Enter a SELECT query and click Execute to see results</p>
                            <p className="text-sm mt-2">Use templates above or click &quot;Show Schema&quot; to view available tables</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}