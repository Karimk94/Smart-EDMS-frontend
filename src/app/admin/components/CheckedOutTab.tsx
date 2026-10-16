"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useAdmin } from "../../../hooks/useAdmin";
import { Spinner } from "../../components/Spinner";
import { useToast } from "../../context/ToastContext";

function formatDate(value: string | null): string {
    if (!value) return "-";
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleString();
}

function HoursSince({ dateStr }: { dateStr: string | null }) {
    if (!dateStr) return <span className="text-gray-400">-</span>;
    const diff = Date.now() - new Date(dateStr).getTime();
    const hrs = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const color =
        hrs >= 24
            ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
            : hrs >= 8
            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
            : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";

    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
            {hrs}h {mins}m ago
        </span>
    );
}

export default function CheckedOutTab() {
    const { showToast } = useToast();
    const { useCheckedOutDocuments, bulkCheckin, isBulkCheckingIn } = useAdmin();

    const [filterMode, setFilterMode] = useState<"days" | "range">("days");
    const [days, setDays] = useState(1);
    const [inputDays, setInputDays] = useState("1");
    const [dateFrom, setDateFrom] = useState<string>("");
    const [dateTo, setDateTo] = useState<string>("");
    const [activeDateFrom, setActiveDateFrom] = useState<string | undefined>(undefined);
    const [activeDateTo, setActiveDateTo] = useState<string | undefined>(undefined);

    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [checkinResults, setCheckinResults] = useState<
        { docnumber: number; success: boolean }[] | null
    >(null);

    const { data, isLoading, isFetching, refetch } = useCheckedOutDocuments(
        filterMode === "days" ? days : 1, // days is ignored if activeDateFrom/To are set in the hook
        activeDateFrom,
        activeDateTo,
        true
    );

    const documents = useMemo(() => data?.documents ?? [], [data?.documents]);
    const total = data?.total ?? 0;

    // ---- Selection helpers ----
    const toggleAll = useCallback(() => {
        if (selected.size === documents.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(documents.map((d) => d.docnumber)));
        }
    }, [documents, selected.size]);

    const toggleOne = (docnumber: number) => {
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(docnumber) ? next.delete(docnumber) : next.add(docnumber);
            return next;
        });
    };

    // ---- Apply filters ----
    const applyFilters = () => {
        if (filterMode === "days") {
            const n = parseInt(inputDays, 10);
            if (!isNaN(n) && n >= 1) {
                setDays(n);
                setActiveDateFrom(undefined);
                setActiveDateTo(undefined);
            }
        } else {
            setActiveDateFrom(dateFrom || undefined);
            setActiveDateTo(dateTo || undefined);
        }
        setSelected(new Set());
        setCheckinResults(null);
    };

    // ---- Bulk check-in (from selection) ----
    const handleCheckin = async () => {
        const docnumbers = Array.from(selected);
        if (docnumbers.length === 0) {
            showToast("Please select at least one document", "error");
            return;
        }
        try {
            const result = await bulkCheckin(docnumbers);
            setCheckinResults(result.results);
            setSelected(new Set());

            if (result.failed === 0) {
                showToast(
                    `Successfully checked in ${result.checked_in} document(s)`,
                    "success"
                );
            } else {
                showToast(
                    `Checked in ${result.checked_in} / ${result.total}. ${result.failed} failed.`,
                    "info"
                );
            }
            await refetch();
        } catch (err: any) {
            showToast(err.message || "Bulk check-in failed", "error");
        }
    };

    // ---- Single doc check-in (inline button) ----
    const checkinOne = async (docnumber: number) => {
        try {
            const result = await bulkCheckin([docnumber]);
            setCheckinResults(result.results);
            setSelected((prev) => { const n = new Set(prev); n.delete(docnumber); return n; });
            if (result.failed === 0) {
                showToast(`Document #${docnumber} checked in successfully`, "success");
            } else {
                showToast(`Failed to check in document #${docnumber}`, "error");
            }
            await refetch();
        } catch (err: any) {
            showToast(err.message || `Check-in failed for #${docnumber}`, "error");
        }
    };


    const allSelected =
        documents.length > 0 && selected.size === documents.length;
    const someSelected = selected.size > 0;

    return (
        <div className="space-y-4">
            {/* ── Header card ─────────────────────────────────────── */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        {/* Title + badge */}
                        <div className="flex items-center gap-3">
                            {/* lock icon */}
                            <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                                    Checked-Out Documents
                                </h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Documents locked by users and not yet returned
                                </p>
                            </div>

                            {/* result count badge */}
                            {!isLoading && (
                                <span className={`ml-2 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                    total > 0
                                        ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                                        : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                                }`}>
                                    {total} {total === 1 ? "document" : "documents"}
                                </span>
                            )}
                        </div>

                        {/* Actions right */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => refetch()}
                                disabled={isFetching}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                            >
                                {isFetching ? (
                                    <span className="flex items-center gap-1.5">
                                        <Spinner size="xs" /> Refreshing…
                                    </span>
                                ) : (
                                    "↻ Refresh"
                                )}
                            </button>
                            <button
                                onClick={handleCheckin}
                                disabled={!someSelected || isBulkCheckingIn}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                            >
                                {isBulkCheckingIn ? (
                                    <>
                                        <Spinner size="xs" /> Checking in…
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                        </svg>
                                        Check In Selected
                                        {someSelected && (
                                            <span className="bg-white/20 rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                                                {selected.size}
                                            </span>
                                        )}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Filter controls */}
                    <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-100 dark:border-gray-700/60">
                        {/* Filter Mode Toggle */}
                        <div className="flex p-1 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                            <button
                                onClick={() => setFilterMode("days")}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                                    filterMode === "days"
                                        ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                }`}
                            >
                                Last N Days
                            </button>
                            <button
                                onClick={() => setFilterMode("range")}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                                    filterMode === "range"
                                        ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                }`}
                            >
                                Date Range
                            </button>
                        </div>

                        {/* Filter Inputs based on mode */}
                        {filterMode === "days" ? (
                            <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5">
                                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                    Last
                                </span>
                                <input
                                    type="number"
                                    min={1}
                                    max={365}
                                    value={inputDays}
                                    onChange={(e) => setInputDays(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                                    className="w-14 text-center text-sm font-semibold bg-transparent border-none outline-none text-gray-900 dark:text-white"
                                />
                                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                    {parseInt(inputDays) === 1 ? "day" : "days"}
                                </span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-gray-400 dark:text-gray-500 text-xs">to</span>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        )}

                        <button
                            onClick={applyFilters}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors ml-auto md:ml-0"
                        >
                            Apply Filter
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Last check-in results banner ────────────────────── */}
            {checkinResults && checkinResults.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Last Check-In Results
                        </h3>
                        <button
                            onClick={() => setCheckinResults(null)}
                            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        >
                            Dismiss
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {checkinResults.map((r) => (
                            <span
                                key={r.docnumber}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                                    r.success
                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                        : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                                }`}
                            >
                                {r.success ? (
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : (
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                )}
                                #{r.docnumber}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Documents table ──────────────────────────────────── */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-16 gap-3 text-gray-500 dark:text-gray-400">
                        <Spinner size="md" />
                        <span className="text-sm">Loading checked-out documents…</span>
                    </div>
                ) : documents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-400">
                        <svg className="w-10 h-10 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm font-medium">No checked-out documents</p>
                        <p className="text-xs">
                            {filterMode === "days"
                                ? `All documents have been checked in within the last ${days} ${days === 1 ? "day" : "days"}.`
                                : `No checked out documents found in the selected date range.`}
                        </p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                                <th className="px-4 py-3 text-left">
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        onChange={toggleAll}
                                        className="rounded border-gray-300 dark:border-gray-600 accent-blue-600"
                                    />
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Doc #
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Document Name
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Checked Out By
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Checkout Date
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Duration
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Action
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                            {documents.map((doc) => {
                                const isSelected = selected.has(doc.docnumber);
                                return (
                                    <tr
                                        key={doc.docnumber}
                                        onClick={() => toggleOne(doc.docnumber)}
                                        className={`cursor-pointer transition-colors ${
                                            isSelected
                                                ? "bg-blue-50 dark:bg-blue-900/10"
                                                : "hover:bg-gray-50 dark:hover:bg-gray-700/30"
                                        }`}
                                    >
                                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleOne(doc.docnumber)}
                                                className="rounded border-gray-300 dark:border-gray-600 accent-blue-600"
                                            />
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">
                                            {doc.docnumber}
                                        </td>
                                        <td className="px-4 py-3 max-w-xs">
                                            <span
                                                className="font-medium text-gray-900 dark:text-white truncate block"
                                                title={doc.docname}
                                            >
                                                {doc.docname}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-xs">
                                            {doc.typist ?? "-"}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-xs whitespace-nowrap">
                                            {formatDate(doc.checkout_date)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <HoursSince dateStr={doc.checkout_date} />
                                        </td>
                                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => checkinOne(doc.docnumber)}
                                                disabled={isBulkCheckingIn}
                                                className="px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                                title="Force check in this document"
                                            >
                                                Check In
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
