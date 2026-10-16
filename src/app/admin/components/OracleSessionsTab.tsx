"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useAdmin, OracleSession } from "../../../hooks/useAdmin";
import { useAuth } from "../../../hooks/useAuth";
import { useToast } from "../../context/ToastContext";
import { Spinner } from "../../components/Spinner";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function IdleBadge({ minutes }: { minutes: number | null }) {
    const m = minutes ?? 0;
    let bg = "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
    if (m >= 180) {
        bg = "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 font-bold ring-1 ring-red-400/50";
    } else if (m >= 60) {
        bg = "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-bold ring-1 ring-amber-400/50";
    } else if (m >= 15) {
        bg = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
    }
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono ${bg}`}>
            {m.toFixed(1)} min
        </span>
    );
}

function StatusPill({ status }: { status: string | null }) {
    const s = (status || "").toUpperCase();
    const active = s === "ACTIVE";
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
            active
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
        }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-gray-400"}`} />
            {s || "INACTIVE"}
        </span>
    );
}

// ─── Column Definitions for Resizing ──────────────────────────────────────────

interface ColumnDef {
    key: string;
    label: string;
    defaultWidth: number;
    minWidth: number;
    align?: "left" | "right" | "center";
}

const COLUMNS: ColumnDef[] = [
    { key: "SELECT", label: "", defaultWidth: 44, minWidth: 44, align: "center" },
    { key: "SID", label: "SID", defaultWidth: 80, minWidth: 60 },
    { key: "USERNAME", label: "Username", defaultWidth: 140, minWidth: 90 },
    { key: "STATUS", label: "Status", defaultWidth: 110, minWidth: 85 },
    { key: "MINUTES_IDLE", label: "Idle Time", defaultWidth: 120, minWidth: 90 },
    { key: "MINUTES_CONNECTED", label: "Connected", defaultWidth: 120, minWidth: 90 },
    { key: "MACHINE", label: "Machine", defaultWidth: 260, minWidth: 120 },
    { key: "PROGRAM", label: "Program", defaultWidth: 190, minWidth: 100 },
    { key: "SQL_ID", label: "SQL ID", defaultWidth: 120, minWidth: 80 },
    { key: "EVENT", label: "Wait Event", defaultWidth: 260, minWidth: 120 },
    { key: "LOGON_TIME", label: "Logon Time", defaultWidth: 165, minWidth: 130 },
    { key: "ACTION", label: "Action", defaultWidth: 90, minWidth: 75, align: "right" },
];

const DEFAULT_COL_WIDTHS: Record<string, number> = Object.fromEntries(
    COLUMNS.map(c => [c.key, c.defaultWidth])
);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OracleSessionsTab() {
    const { user } = useAuth();
    const { showToast } = useToast();

    const {
        useOracleSessions,
        killOracleSession,
        isKillingOracleSession,
        killOracleSessionsBatch,
        isKillingBatch,
        useOracleKillLog,
    } = useAdmin();

    // ── Primary View Tabs ─────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<"sessions" | "killlog">("sessions");

    // ── Professional Multi-Filter State ───────────────────────────────────────
    const [search, setSearch] = useState("");
    const [selectedMachine, setSelectedMachine] = useState<string>("all");
    const [selectedUser, setSelectedUser] = useState<string>("all");
    const [selectedStatus, setSelectedStatus] = useState<string>("all");
    const [selectedProgram, setSelectedProgram] = useState<string>("all");
    const [minIdleMinutes, setMinIdleMinutes] = useState<number>(0);

    // ── Sorting State ─────────────────────────────────────────────────────────
    const [sortKey, setSortKey] = useState<string>("MINUTES_IDLE");
    const [sortAsc, setSortAsc] = useState(false);

    // ── Selection State ───────────────────────────────────────────────────────
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

    // ── Modal State ───────────────────────────────────────────────────────────
    const [confirmKill, setConfirmKill] = useState<OracleSession | null>(null);
    const [confirmBatchKill, setConfirmBatchKill] = useState<OracleSession[] | null>(null);

    // ── Pagination State ──────────────────────────────────────────────────────
    const [page, setPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(25);

    // ── Resizable Columns State ───────────────────────────────────────────────
    const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
        if (typeof window !== "undefined") {
            try {
                const saved = localStorage.getItem("edms_oracle_session_col_widths_v2");
                if (saved) {
                    const parsed = JSON.parse(saved);
                    return { ...DEFAULT_COL_WIDTHS, ...parsed };
                }
            } catch {}
        }
        return DEFAULT_COL_WIDTHS;
    });

    const resizingRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

    const handleMouseDown = (e: React.MouseEvent, key: string) => {
        e.preventDefault();
        e.stopPropagation();

        const startWidth = colWidths[key] ?? DEFAULT_COL_WIDTHS[key] ?? 120;
        resizingRef.current = { key, startX: e.clientX, startWidth };

        const colDef = COLUMNS.find(c => c.key === key);
        const minW = colDef?.minWidth ?? 50;

        let latestWidth = startWidth;

        const onMouseMove = (moveEvent: MouseEvent) => {
            if (!resizingRef.current) return;
            const delta = moveEvent.clientX - resizingRef.current.startX;
            latestWidth = Math.max(minW, resizingRef.current.startWidth + delta);
            setColWidths(prev => ({ ...prev, [key]: latestWidth }));
        };

        const onMouseUp = () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
            resizingRef.current = null;
            try {
                setColWidths(current => {
                    localStorage.setItem("edms_oracle_session_col_widths_v2", JSON.stringify(current));
                    return current;
                });
            } catch {}
        };

        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
    };

    const handleResetColWidths = () => {
        setColWidths(DEFAULT_COL_WIDTHS);
        try {
            localStorage.removeItem("edms_oracle_session_col_widths_v2");
        } catch {}
    };

    // ── Data Fetching ─────────────────────────────────────────────────────────
    const { data: sessionsData, isLoading, refetch, isFetching } = useOracleSessions();
    const { data: killLogData, refetch: refetchKillLog } = useOracleKillLog(activeTab === "killlog");

    const sessions: OracleSession[] = useMemo(
        () => sessionsData?.sessions ?? [],
        [sessionsData?.sessions]
    );
    const killLog = killLogData?.log ?? [];

    // ── Extract Unique Filter Facets ──────────────────────────────────────────
    const machineOptions = useMemo(() => {
        const counts: Record<string, number> = {};
        sessions.forEach(s => {
            const m = s.MACHINE || "Unknown";
            counts[m] = (counts[m] || 0) + 1;
        });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]);
    }, [sessions]);

    const userOptions = useMemo(() => {
        const counts: Record<string, number> = {};
        sessions.forEach(s => {
            const u = s.USERNAME || "Unknown";
            counts[u] = (counts[u] || 0) + 1;
        });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]);
    }, [sessions]);

    const programOptions = useMemo(() => {
        const counts: Record<string, number> = {};
        sessions.forEach(s => {
            const p = s.PROGRAM || "Unknown";
            counts[p] = (counts[p] || 0) + 1;
        });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]);
    }, [sessions]);

    // Count of high-idle inactive sessions (idle >= 60 min)
    const totalHighIdleInactive = useMemo(
        () => sessions.filter(s => (s.MINUTES_IDLE ?? 0) >= 60 && (s.STATUS || "").toUpperCase() === "INACTIVE").length,
        [sessions]
    );

    // ── Filtering Logic ───────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        return sessions.filter(s => {
            // Status filter
            if (selectedStatus !== "all") {
                if ((s.STATUS || "").toUpperCase() !== selectedStatus) return false;
            }
            // Machine filter (supports exact match or partial/case-insensitive matching)
            if (selectedMachine !== "all" && selectedMachine.trim() !== "") {
                const sMachine = (s.MACHINE || "Unknown").toLowerCase();
                const filterMachine = selectedMachine.trim().toLowerCase();
                if (sMachine !== filterMachine && !sMachine.includes(filterMachine)) return false;
            }
            // User filter
            if (selectedUser !== "all") {
                if ((s.USERNAME || "Unknown") !== selectedUser) return false;
            }
            // Program filter
            if (selectedProgram !== "all") {
                if ((s.PROGRAM || "Unknown") !== selectedProgram) return false;
            }
            // Min Idle Inactivity filter
            if (minIdleMinutes > 0) {
                if ((s.MINUTES_IDLE ?? 0) < minIdleMinutes) return false;
            }
            // Search text filter
            if (search.trim()) {
                const q = search.toLowerCase();
                const match = [s.SID, s.USERNAME, s.MACHINE, s.PROGRAM, s.SQL_ID, s.EVENT, s.STATUS]
                    .filter(Boolean).join(" ").toLowerCase().includes(q);
                if (!match) return false;
            }
            return true;
        }).sort((a, b) => {
            const av = (a as any)[sortKey] ?? "";
            const bv = (b as any)[sortKey] ?? "";
            if (typeof av === "number" && typeof bv === "number") return sortAsc ? av - bv : bv - av;
            return sortAsc
                ? String(av).localeCompare(String(bv))
                : String(bv).localeCompare(String(av));
        });
    }, [sessions, selectedStatus, selectedMachine, selectedUser, selectedProgram, minIdleMinutes, search, sortKey, sortAsc]);

    // Active filters flag
    const hasActiveFilters = selectedMachine !== "all" || selectedUser !== "all" || selectedStatus !== "all" || selectedProgram !== "all" || minIdleMinutes > 0 || search.trim() !== "";

    const resetFilters = () => {
        setSelectedMachine("all");
        setSelectedUser("all");
        setSelectedStatus("all");
        setSelectedProgram("all");
        setMinIdleMinutes(0);
        setSearch("");
    };

    // Reset pagination to page 1 on filter or pageSize change
    useEffect(() => {
        setPage(1);
    }, [search, selectedMachine, selectedUser, selectedStatus, selectedProgram, minIdleMinutes, pageSize]);

    // ── Selection Derived Data ────────────────────────────────────────────────
    const selectedRows = useMemo(
        () => filtered.filter(s => selectedKeys.has(`${s.SID}-${s["SERIAL#"]}`)),
        [filtered, selectedKeys]
    );

    const toggleSelectRow = (key: string) => {
        setSelectedKeys(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const toggleSelectAllFiltered = () => {
        if (selectedKeys.size === filtered.length && filtered.length > 0) {
            setSelectedKeys(new Set());
        } else {
            setSelectedKeys(new Set(filtered.map(s => `${s.SID}-${s["SERIAL#"]}`)));
        }
    };

    // ── Pagination Calculation ────────────────────────────────────────────────
    const totalItems = filtered.length;
    const totalPages = pageSize === -1 ? 1 : Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(page, totalPages);

    const paginatedSessions = useMemo(() => {
        if (pageSize === -1) return filtered;
        const start = (safePage - 1) * pageSize;
        return filtered.slice(start, start + pageSize);
    }, [filtered, safePage, pageSize]);

    const startItem = totalItems === 0 ? 0 : (safePage - 1) * (pageSize === -1 ? totalItems : pageSize) + 1;
    const endItem = pageSize === -1 ? totalItems : Math.min(safePage * pageSize, totalItems);

    // ── Sorting Handler ───────────────────────────────────────────────────────
    const handleSort = (key: string) => {
        if (sortKey === key) setSortAsc(v => !v);
        else { setSortKey(key); setSortAsc(false); }
    };

    // ── Kill Execution Handlers ───────────────────────────────────────────────
    const handleKillSingleConfirmed = async () => {
        if (!confirmKill) return;
        const target = confirmKill;
        setConfirmKill(null);
        try {
            await killOracleSession({ sid: target.SID, serial: target["SERIAL#"] });
            showToast(`Session SID=${target.SID} (${target.USERNAME}) killed successfully`, "success");
            refetch();
            refetchKillLog();
        } catch (err: any) {
            showToast(err.message || "Failed to kill session", "error");
        }
    };

    const handleBatchKillConfirmed = async () => {
        if (!confirmBatchKill || confirmBatchKill.length === 0) return;
        const targets = confirmBatchKill.map(s => ({
            sid: s.SID,
            serial: s["SERIAL#"],
            username: s.USERNAME,
            machine: s.MACHINE,
            program: s.PROGRAM,
            minutes_idle: s.MINUTES_IDLE,
            minutes_connected: s.MINUTES_CONNECTED,
        }));
        setConfirmBatchKill(null);
        setSelectedKeys(new Set());

        try {
            const reason = selectedRows.length > 0
                ? "checkbox-selected-kill"
                : hasActiveFilters
                    ? `filtered-kill (${selectedMachine !== 'all' ? selectedMachine : ''} idle>=${minIdleMinutes}m)`
                    : "bulk-idle-kill";

            const res = await killOracleSessionsBatch({ targets, reason });
            showToast(res.message, res.killed > 0 ? "success" : "info");
            refetch();
            refetchKillLog();
        } catch (err: any) {
            showToast(err.message || "Failed to execute batch kill", "error");
        }
    };

    // Initiate Batch Kill (Selected OR All Filtered)
    const handleTriggerBatchKill = () => {
        if (selectedRows.length > 0) {
            setConfirmBatchKill(selectedRows);
        } else if (hasActiveFilters && filtered.length > 0) {
            setConfirmBatchKill(filtered);
        } else {
            // Default to high-idle inactive sessions
            const idleCandidates = sessions.filter(s => (s.MINUTES_IDLE ?? 0) >= 60 && (s.STATUS || "").toUpperCase() === "INACTIVE");
            if (idleCandidates.length > 0) {
                setConfirmBatchKill(idleCandidates);
            }
        }
    };

    // Helper for generating page numbers with ellipsis
    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (safePage > 3) pages.push("...");
            const start = Math.max(2, safePage - 1);
            const end = Math.min(totalPages - 1, safePage + 1);
            for (let i = start; i <= end; i++) pages.push(i);
            if (safePage < totalPages - 2) pages.push("...");
            pages.push(totalPages);
        }
        return pages;
    };

    // Determine the text and state of the main Kill action button
    const killButtonConfig = useMemo(() => {
        if (selectedRows.length > 0) {
            return {
                label: `⚡ Kill Selected (${selectedRows.length})`,
                enabled: true,
                count: selectedRows.length,
            };
        }
        if (hasActiveFilters) {
            return {
                label: `⚡ Kill Filtered (${filtered.length})`,
                enabled: filtered.length > 0,
                count: filtered.length,
            };
        }
        return {
            label: `⚡ Kill Abandoned Idle (${totalHighIdleInactive})`,
            enabled: totalHighIdleInactive > 0,
            count: totalHighIdleInactive,
        };
    }, [selectedRows.length, hasActiveFilters, filtered.length, totalHighIdleInactive]);

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden flex flex-col w-full min-h-[calc(100vh-220px)]">

            {/* ── Top Header Bar ── */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <span>🔍</span> Oracle Session Monitor
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Live Oracle V$SESSION — {sessions.length} total · <span className="font-semibold text-amber-600 dark:text-amber-400">{totalHighIdleInactive} idle ≥ 60m</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-2 ml-auto flex-wrap">
                        {/* Dynamic Kill Action Button */}
                        <button
                            onClick={handleTriggerBatchKill}
                            disabled={!killButtonConfig.enabled || isKillingBatch}
                            title="Kill matching or selected sessions"
                            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                        >
                            {isKillingBatch ? (
                                <><Spinner size="sm" /> Terminating…</>
                            ) : (
                                <>{killButtonConfig.label}</>
                            )}
                        </button>

                        {/* Refresh */}
                        <button
                            onClick={() => { refetch(); refetchKillLog(); }}
                            disabled={isFetching}
                            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors shadow-sm flex items-center gap-1"
                        >
                            {isFetching ? "Refreshing…" : "⟳ Refresh"}
                        </button>
                    </div>
                </div>

                {/* ── Sub-tabs ── */}
                <div className="flex gap-1 mt-3">
                    {(["sessions", "killlog"] as const).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                                activeTab === tab
                                    ? "bg-blue-600 text-white shadow-sm"
                                    : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                            }`}
                        >
                            {tab === "sessions" ? `Sessions (${sessions.length})` : `Kill Log (${killLog.length})`}
                        </button>
                    ))}
                </div>
            </div>

            {/* ══ SESSIONS TAB ══════════════════════════════════════════════ */}
            {activeTab === "sessions" && (
                <div className="flex-1 flex flex-col min-h-0">

                    {/* ── Professional Multi-Column Filter Toolbar ── */}
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/90 dark:bg-gray-800 flex flex-wrap items-center gap-2.5 text-xs">

                        {/* 1. Global Search */}
                        <div className="relative min-w-[200px] flex-1 max-w-[320px]">
                            <input
                                type="text"
                                placeholder="Search user, machine, program, SQL ID…"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md pl-3 pr-7 py-1.5 text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm"
                            />
                            {search && (
                                <button
                                    onClick={() => setSearch("")}
                                    className="absolute right-2 top-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-bold"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* 2. Machine Filter (Filter by specific machine, highlights when active) */}
                        <div className="flex items-center gap-1.5">
                            <span className="text-gray-600 dark:text-gray-300 font-medium">Machine:</span>
                            <div className="relative flex items-center">
                                <select
                                    value={selectedMachine}
                                    onChange={e => setSelectedMachine(e.target.value)}
                                    className={`border rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm max-w-[210px] truncate transition-colors ${
                                        selectedMachine !== "all"
                                            ? "bg-blue-50 dark:bg-blue-900/40 border-blue-400 text-blue-900 dark:text-blue-100 font-semibold"
                                            : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-200"
                                    }`}
                                >
                                    <option value="all" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                                        All Machines ({sessions.length})
                                    </option>
                                    {machineOptions.map(([m, cnt]) => (
                                        <option key={m} value={m} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                                            {m} ({cnt})
                                        </option>
                                    ))}
                                </select>
                                {selectedMachine !== "all" && (
                                    <button
                                        onClick={() => setSelectedMachine("all")}
                                        title="Clear machine filter"
                                        className="text-gray-400 hover:text-red-500 text-xs font-bold ml-1 px-0.5"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* 3. User Filter */}
                        <div className="flex items-center gap-1.5">
                            <span className="text-gray-600 dark:text-gray-300 font-medium">User:</span>
                            <div className="relative flex items-center">
                                <select
                                    value={selectedUser}
                                    onChange={e => setSelectedUser(e.target.value)}
                                    className={`border rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm max-w-[150px] truncate transition-colors ${
                                        selectedUser !== "all"
                                            ? "bg-purple-50 dark:bg-purple-900/40 border-purple-400 text-purple-900 dark:text-purple-100 font-semibold"
                                            : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-200"
                                    }`}
                                >
                                    <option value="all" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">All Users</option>
                                    {userOptions.map(([u, cnt]) => (
                                        <option key={u} value={u} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                                            {u} ({cnt})
                                        </option>
                                    ))}
                                </select>
                                {selectedUser !== "all" && (
                                    <button
                                        onClick={() => setSelectedUser("all")}
                                        title="Clear user filter"
                                        className="text-gray-400 hover:text-red-500 text-xs font-bold ml-1 px-0.5"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* 4. Status Filter */}
                        <div className="flex items-center gap-1.5">
                            <span className="text-gray-600 dark:text-gray-300 font-medium">Status:</span>
                            <div className="relative flex items-center">
                                <select
                                    value={selectedStatus}
                                    onChange={e => setSelectedStatus(e.target.value)}
                                    className={`border rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm transition-colors ${
                                        selectedStatus !== "all"
                                            ? "bg-amber-50 dark:bg-amber-900/40 border-amber-400 text-amber-900 dark:text-amber-100 font-semibold"
                                            : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-200"
                                    }`}
                                >
                                    <option value="all" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">All Statuses</option>
                                    <option value="INACTIVE" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">INACTIVE only (Safe to clean)</option>
                                    <option value="ACTIVE" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">ACTIVE only (In-flight)</option>
                                </select>
                                {selectedStatus !== "all" && (
                                    <button
                                        onClick={() => setSelectedStatus("all")}
                                        title="Clear status filter"
                                        className="text-gray-400 hover:text-red-500 text-xs font-bold ml-1 px-0.5"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* 5. Minimum Idle Inactivity Filter */}
                        <div className="flex items-center gap-1.5" title="Filters sessions by how many minutes they have been sitting idle since their last SQL query">
                            <span className="text-gray-600 dark:text-gray-300 font-medium">Min Idle:</span>
                            <div className="relative flex items-center">
                                <select
                                    value={minIdleMinutes}
                                    onChange={e => setMinIdleMinutes(Number(e.target.value))}
                                    className={`border rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm font-medium transition-colors ${
                                        minIdleMinutes > 0
                                            ? "bg-orange-50 dark:bg-orange-900/40 border-orange-400 text-orange-900 dark:text-orange-100 font-semibold"
                                            : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-200"
                                    }`}
                                >
                                    <option value={0} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">Any Idle Time</option>
                                    <option value={15} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">≥ 15 min idle</option>
                                    <option value={30} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">≥ 30 min idle</option>
                                    <option value={60} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">≥ 1 hour idle (60m)</option>
                                    <option value={120} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">≥ 2 hours idle (120m)</option>
                                    <option value={180} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">≥ 3 hours idle (180m)</option>
                                    <option value={360} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">≥ 6 hours idle (360m)</option>
                                </select>
                                {minIdleMinutes > 0 && (
                                    <button
                                        onClick={() => setMinIdleMinutes(0)}
                                        title="Clear idle filter"
                                        className="text-gray-400 hover:text-red-500 text-xs font-bold ml-1 px-0.5"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Reset Filters Button */}
                        {hasActiveFilters && (
                            <button
                                onClick={resetFilters}
                                className="px-2.5 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded border border-red-200 dark:border-red-800 font-semibold transition-colors"
                            >
                                Clear All Filters ✕
                            </button>
                        )}

                        {/* Reset Column Sizes */}
                        <button
                            onClick={handleResetColWidths}
                            title="Reset column widths to default size"
                            className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline decoration-dotted ml-auto transition-colors"
                        >
                            Reset Widths
                        </button>
                    </div>

                    {/* ── Active Filter / Selection Summary Banner ── */}
                    <div className="px-4 py-2 bg-blue-50/50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between text-xs text-gray-600 dark:text-gray-300 gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span>
                                Showing <strong className="text-gray-900 dark:text-white">{filtered.length}</strong> of <strong className="text-gray-900 dark:text-white">{sessions.length}</strong> sessions
                                {hasActiveFilters && " (Filtered)"}
                            </span>

                            {/* Active Filter Badges */}
                            {selectedMachine !== "all" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 border border-blue-200 dark:border-blue-700">
                                    <span>🖥️ {selectedMachine}</span>
                                    <button onClick={() => setSelectedMachine("all")} title="Remove machine filter" className="hover:text-red-500 font-bold ml-0.5">✕</button>
                                </span>
                            )}
                            {selectedUser !== "all" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200 border border-purple-200 dark:border-purple-700">
                                    <span>👤 {selectedUser}</span>
                                    <button onClick={() => setSelectedUser("all")} title="Remove user filter" className="hover:text-red-500 font-bold ml-0.5">✕</button>
                                </span>
                            )}
                            {selectedStatus !== "all" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 border border-amber-200 dark:border-amber-700">
                                    <span>Status: {selectedStatus}</span>
                                    <button onClick={() => setSelectedStatus("all")} title="Remove status filter" className="hover:text-red-500 font-bold ml-0.5">✕</button>
                                </span>
                            )}
                            {minIdleMinutes > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-200 border border-orange-200 dark:border-orange-700">
                                    <span>⏱️ Idle ≥ {minIdleMinutes}m</span>
                                    <button onClick={() => setMinIdleMinutes(0)} title="Remove idle filter" className="hover:text-red-500 font-bold ml-0.5">✕</button>
                                </span>
                            )}
                            {search.trim() && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600">
                                    <span>🔍 &quot;{search}&quot;</span>
                                    <button onClick={() => setSearch("")} title="Clear search" className="hover:text-red-500 font-bold ml-0.5">✕</button>
                                </span>
                            )}

                            {selectedKeys.size > 0 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-600 text-white shadow-sm">
                                    {selectedKeys.size} selected
                                </span>
                            )}
                        </div>

                        {selectedKeys.size > 0 && (
                            <button
                                onClick={() => setSelectedKeys(new Set())}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                            >
                                Deselect all
                            </button>
                        )}
                    </div>

                    {/* ── Table Container - Stretched to fill page with Horizontal & Vertical Scrolling ── */}
                    <div className="flex-1 overflow-x-auto overflow-y-auto w-full min-w-full">
                        <table className="w-full min-w-full text-sm border-separate border-spacing-0 table-fixed">
                            {/* Proportional Colgroup for Width Allocation */}
                            <colgroup>
                                {COLUMNS.map(col => (
                                    <col key={col.key} style={{ width: `${colWidths[col.key]}px` }} />
                                ))}
                            </colgroup>

                            <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-20 select-none shadow-sm">
                                <tr>
                                    {COLUMNS.map(col => {
                                        if (col.key === "SELECT") {
                                            const allSelected = filtered.length > 0 && selectedKeys.size === filtered.length;
                                            return (
                                                <th
                                                    key="SELECT"
                                                    style={{ width: `${colWidths.SELECT}px` }}
                                                    className="px-2 py-3 text-center align-middle border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={allSelected}
                                                        onChange={toggleSelectAllFiltered}
                                                        title="Select all filtered sessions"
                                                        className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer w-3.5 h-3.5"
                                                    />
                                                </th>
                                            );
                                        }

                                        // Pinned Action column header (Sticky top AND right)
                                        if (col.key === "ACTION") {
                                            return (
                                                <th
                                                    key="ACTION"
                                                    style={{ width: `${colWidths.ACTION}px` }}
                                                    className="sticky top-0 right-0 z-30 px-3 py-3 text-[11px] font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider text-right bg-gray-50 dark:bg-gray-700 border-b border-l border-gray-200 dark:border-gray-600 shadow-[-5px_0_8px_-2px_rgba(0,0,0,0.12)] select-none"
                                                >
                                                    Action
                                                </th>
                                            );
                                        }

                                        return (
                                            <th
                                                key={col.key}
                                                style={{ width: `${colWidths[col.key]}px` }}
                                                className={`relative px-3 py-3 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider group hover:bg-gray-100 dark:hover:bg-gray-600/60 transition-colors border-b border-gray-200 dark:border-gray-700 ${
                                                    col.align === "right" ? "text-right" : "text-left"
                                                }`}
                                            >
                                                <div
                                                    onClick={() => handleSort(col.key)}
                                                    className={`flex items-center gap-1 cursor-pointer ${col.align === "right" ? "justify-end" : "justify-start"}`}
                                                >
                                                    <span>{col.label}</span>
                                                    {col.key === "MACHINE" && selectedMachine !== "all" && (
                                                        <span
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedMachine("all");
                                                            }}
                                                            title="Machine filter is active. Click to clear"
                                                            className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/80 dark:text-blue-200 text-[10px] rounded normal-case font-normal hover:bg-red-100 hover:text-red-600"
                                                        >
                                                            filtered ✕
                                                        </span>
                                                    )}
                                                    {sortKey === col.key && (
                                                        <span className="text-blue-500 font-bold ml-1">{sortAsc ? "↑" : "↓"}</span>
                                                    )}
                                                </div>

                                                {/* Drag Handle for Resizing */}
                                                <div
                                                    onMouseDown={e => handleMouseDown(e, col.key)}
                                                    onDoubleClick={() => setColWidths(prev => ({ ...prev, [col.key]: col.defaultWidth }))}
                                                    title="Drag to resize column, double-click to reset"
                                                    className="absolute top-0 right-0 bottom-0 w-3 cursor-col-resize flex items-center justify-center hover:bg-blue-500/20 active:bg-blue-600 transition-colors z-20"
                                                >
                                                    <div className="w-[1.5px] h-4 bg-gray-300 dark:bg-gray-500 group-hover:bg-blue-500" />
                                                </div>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>

                            <tbody className="bg-white dark:bg-gray-800">
                                {isLoading && (
                                    <tr>
                                        <td colSpan={COLUMNS.length} className="px-4 py-16 text-center border-b border-gray-100 dark:border-gray-700">
                                            <Spinner size="md" center />
                                            <p className="text-xs text-gray-400 mt-2">Loading Oracle sessions…</p>
                                        </td>
                                    </tr>
                                )}
                                {!isLoading && totalItems === 0 && (
                                    <tr>
                                        <td colSpan={COLUMNS.length} className="px-4 py-16 text-center text-sm text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-700">
                                            No sessions match your filter criteria.
                                            {hasActiveFilters && (
                                                <button
                                                    onClick={resetFilters}
                                                    className="ml-2 text-blue-600 dark:text-blue-400 underline font-medium"
                                                >
                                                    Clear filters
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                )}
                                {!isLoading && paginatedSessions.map(s => {
                                    const rowKey = `${s.SID}-${s["SERIAL#"]}`;
                                    const isSelected = selectedKeys.has(rowKey);
                                    const isHighIdle = (s.MINUTES_IDLE ?? 0) >= 60 && (s.STATUS || "").toUpperCase() === "INACTIVE";

                                    return (
                                        <tr key={rowKey}
                                            className={`group transition-colors ${
                                                isSelected
                                                    ? "bg-blue-50/70 dark:bg-blue-900/30"
                                                    : isHighIdle
                                                        ? "bg-red-50/40 dark:bg-red-900/20"
                                                        : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                            }`}
                                        >
                                            {/* Checkbox column */}
                                            <td className="px-2 py-2.5 text-center align-middle border-b border-gray-100 dark:border-gray-700">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelectRow(rowKey)}
                                                    className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer w-3.5 h-3.5"
                                                />
                                            </td>

                                            <td className="px-3 py-2.5 font-mono text-xs text-blue-600 dark:text-blue-400 overflow-hidden text-ellipsis whitespace-nowrap border-b border-gray-100 dark:border-gray-700">
                                                {s.SID}
                                            </td>
                                            <td className="px-3 py-2.5 font-medium text-gray-900 dark:text-white text-xs overflow-hidden text-ellipsis whitespace-nowrap border-b border-gray-100 dark:border-gray-700" title={s.USERNAME ?? ""}>
                                                {s.USERNAME ?? "—"}
                                            </td>
                                            <td className="px-3 py-2.5 whitespace-nowrap border-b border-gray-100 dark:border-gray-700">
                                                <StatusPill status={s.STATUS} />
                                            </td>
                                            <td className="px-3 py-2.5 whitespace-nowrap border-b border-gray-100 dark:border-gray-700">
                                                <IdleBadge minutes={s.MINUTES_IDLE} />
                                            </td>
                                            <td className="px-3 py-2.5 whitespace-nowrap border-b border-gray-100 dark:border-gray-700">
                                                <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                                                    {(s.MINUTES_CONNECTED ?? 0).toFixed(1)} min
                                                </span>
                                            </td>
                                            {/* Machine Column: clickable to quick filter */}
                                            <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-300 overflow-hidden text-ellipsis whitespace-nowrap border-b border-gray-100 dark:border-gray-700" title={`Click to filter machine: ${s.MACHINE ?? "—"}`}>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedMachine(s.MACHINE || "Unknown");
                                                    }}
                                                    className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline font-mono text-left truncate max-w-full"
                                                >
                                                    {s.MACHINE ?? "—"}
                                                </button>
                                            </td>
                                            <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-300 overflow-hidden text-ellipsis whitespace-nowrap border-b border-gray-100 dark:border-gray-700" title={s.PROGRAM ?? ""}>
                                                {s.PROGRAM ?? "—"}
                                            </td>
                                            <td className="px-3 py-2.5 font-mono text-xs text-gray-500 dark:text-gray-400 overflow-hidden text-ellipsis whitespace-nowrap border-b border-gray-100 dark:border-gray-700" title={s.SQL_ID ?? ""}>
                                                {s.SQL_ID ?? "—"}
                                            </td>
                                            <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-300 overflow-hidden text-ellipsis whitespace-nowrap border-b border-gray-100 dark:border-gray-700" title={s.EVENT ?? ""}>
                                                {s.EVENT ?? "—"}
                                            </td>
                                            <td className="px-3 py-2.5 text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap overflow-hidden text-ellipsis border-b border-gray-100 dark:border-gray-700" title={s.LOGON_TIME ?? ""}>
                                                {s.LOGON_TIME ?? "—"}
                                            </td>
                                            {/* Pinned Action Column (Sticky right, fixed regardless of column width) */}
                                            <td
                                                className={`sticky right-0 z-10 px-3 py-2.5 text-right whitespace-nowrap border-b border-l border-gray-200 dark:border-gray-700 shadow-[-5px_0_8px_-2px_rgba(0,0,0,0.08)] transition-colors ${
                                                    isSelected
                                                        ? "bg-blue-50 dark:bg-[#1a2c49]"
                                                        : isHighIdle
                                                            ? "bg-red-50/90 dark:bg-[#2c1d1d]"
                                                            : "bg-white dark:bg-gray-800 group-hover:bg-gray-50 dark:group-hover:bg-gray-700"
                                                }`}
                                            >
                                                <button
                                                    onClick={() => setConfirmKill(s)}
                                                    disabled={isKillingOracleSession}
                                                    className="px-2.5 py-1 bg-red-100 hover:bg-red-600 text-red-700 hover:text-white dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-600 dark:hover:text-white text-xs font-semibold rounded transition-colors disabled:opacity-40 shadow-sm inline-flex items-center gap-1"
                                                >
                                                    Kill
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* ── Pager / Pagination Footer ── */}
                    <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800 flex flex-wrap items-center justify-between gap-3 text-xs mt-auto">
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-gray-500 dark:text-gray-400">
                                Showing <strong className="text-gray-900 dark:text-white font-semibold">{startItem}</strong> to{" "}
                                <strong className="text-gray-900 dark:text-white font-semibold">{endItem}</strong> of{" "}
                                <strong className="text-gray-900 dark:text-white font-semibold">{totalItems}</strong> sessions
                            </span>

                            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                                <span>Per page:</span>
                                <select
                                    value={pageSize}
                                    onChange={e => setPageSize(Number(e.target.value))}
                                    className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-xs text-gray-800 dark:text-gray-200 outline-none focus:border-blue-500 shadow-sm"
                                >
                                    <option value={15}>15</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                    <option value={-1}>All ({totalItems})</option>
                                </select>
                            </div>
                        </div>

                        {/* Page Navigation Buttons */}
                        {totalPages > 1 && (
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setPage(1)}
                                    disabled={safePage === 1}
                                    title="First Page"
                                    className="px-2 py-1 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 dark:text-gray-200 font-semibold"
                                >
                                    «
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={safePage === 1}
                                    title="Previous Page"
                                    className="px-2.5 py-1 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 dark:text-gray-200 font-semibold"
                                >
                                    ‹
                                </button>

                                {getPageNumbers().map((p, idx) =>
                                    p === "..." ? (
                                        <span key={`ellipsis-${idx}`} className="px-2 py-1 text-gray-400">…</span>
                                    ) : (
                                        <button
                                            key={`page-${p}`}
                                            onClick={() => setPage(Number(p))}
                                            className={`min-w-[28px] px-2 py-1 rounded text-xs font-medium transition-colors ${
                                                safePage === p
                                                    ? "bg-blue-600 text-white font-bold shadow-sm"
                                                    : "border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                                            }`}
                                        >
                                            {p}
                                        </button>
                                    )
                                )}

                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={safePage === totalPages}
                                    title="Next Page"
                                    className="px-2.5 py-1 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 dark:text-gray-200 font-semibold"
                                >
                                    ›
                                </button>
                                <button
                                    onClick={() => setPage(totalPages)}
                                    disabled={safePage === totalPages}
                                    title="Last Page"
                                    className="px-2 py-1 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 dark:text-gray-200 font-semibold"
                                >
                                    »
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ══ KILL LOG TAB ══════════════════════════════════════════════ */}
            {activeTab === "killlog" && (
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="p-3 bg-gray-50/80 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
                        <span>
                            Persistent Audit Log — <strong>{killLog.length}</strong> termination record(s) loaded
                        </span>
                        <button
                            onClick={() => refetchKillLog()}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                            Refresh Log
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                        {killLog.length === 0 && (
                            <div className="px-6 py-16 text-center text-sm text-gray-400 dark:text-gray-500">
                                📋 No sessions have been terminated yet. Any sessions killed via the Web Admin or Scheduler Job will be permanently logged here.
                            </div>
                        )}
                        {killLog.map((entry: any, i: number) => (
                            <div key={i} className="flex items-start gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/40 text-sm transition-colors">
                                <div className="min-w-[150px]">
                                    <div className="font-mono text-xs text-gray-500 dark:text-gray-400">{entry.timestamp}</div>
                                </div>
                                <div className="min-w-[80px]">
                                    <div className="font-mono text-xs text-blue-600 dark:text-blue-400 font-semibold">SID={entry.sid}</div>
                                    <div className="font-mono text-xs text-gray-400">S#={entry.serial}</div>
                                </div>
                                <div className="flex-1">
                                    <div className="font-medium text-gray-800 dark:text-white text-xs">
                                        {entry.username ?? "?"} @ {entry.machine ?? "?"}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        Program: <strong>{entry.program ?? "?"}</strong> ·
                                        {entry.minutes_idle != null && ` Idle: ${Number(entry.minutes_idle).toFixed(1)}m ·`}
                                        {entry.minutes_connected != null && ` Connected: ${Number(entry.minutes_connected).toFixed(1)}m ·`}
                                        Reason: <strong>{entry.reason}</strong> ·
                                        By: <strong>{entry.killed_by}</strong>
                                    </div>
                                    <div className={`text-xs mt-1 font-medium ${entry.success ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                                        {entry.success ? "✓" : "✗"} {entry.message}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Confirm: Kill Single Modal ── */}
            {confirmKill && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 border border-gray-200 dark:border-gray-700">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">Kill Oracle Session?</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            You are about to terminate:<br />
                            <strong className="text-gray-800 dark:text-white">SID {confirmKill.SID} / SERIAL# {confirmKill["SERIAL#"]}</strong><br />
                            User: <strong className="text-gray-800 dark:text-white">{confirmKill.USERNAME}</strong> on {confirmKill.MACHINE}<br />
                            Status: <strong className="text-gray-800 dark:text-white">{confirmKill.STATUS}</strong><br />
                            Idle Time: <strong className="text-amber-600 dark:text-amber-400">{(confirmKill.MINUTES_IDLE ?? 0).toFixed(1)} minutes</strong><br />
                            Connected for: <strong>{(confirmKill.MINUTES_CONNECTED ?? 0).toFixed(1)} minutes</strong>.<br /><br />
                            Uncommitted transactions will be rolled back.
                        </p>
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setConfirmKill(null)}
                                className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleKillSingleConfirmed}
                                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition-colors shadow-sm">
                                Kill Session
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Confirm: Batch / Filtered Kill Modal ── */}
            {confirmBatchKill && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-lg w-full mx-4 border border-gray-200 dark:border-gray-700">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">
                            Kill {confirmBatchKill.length} Session(s)?
                        </h3>

                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-4 space-y-2">
                            <p>
                                You are about to kill <strong className="text-red-600 font-bold">{confirmBatchKill.length} session(s)</strong> matching your current filter/selection:
                            </p>

                            {/* Applied Criteria Summary */}
                            <div className="bg-gray-50 dark:bg-gray-700/60 p-2.5 rounded-lg border border-gray-200 dark:border-gray-600 space-y-1">
                                {selectedMachine !== "all" && <div>• Machine: <strong>{selectedMachine}</strong></div>}
                                {selectedUser !== "all" && <div>• User: <strong>{selectedUser}</strong></div>}
                                {selectedStatus !== "all" && <div>• Status: <strong>{selectedStatus}</strong></div>}
                                {minIdleMinutes > 0 && <div>• Min Idle: <strong>≥ {minIdleMinutes} minutes</strong></div>}
                                {selectedRows.length > 0 && <div>• Mode: <strong>Manual Checkbox Selection ({selectedRows.length})</strong></div>}
                            </div>

                            {/* Preview list of targets */}
                            <div className="max-h-36 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded divide-y divide-gray-100 dark:divide-gray-700 text-[11px] bg-white dark:bg-gray-800">
                                {confirmBatchKill.slice(0, 50).map(s => (
                                    <div key={`${s.SID}-${s["SERIAL#"]}`} className="px-2 py-1 flex items-center justify-between">
                                        <span>SID {s.SID} ({s.USERNAME})</span>
                                        <span className="text-gray-400">{s.MACHINE} · {Number(s.MINUTES_IDLE || 0).toFixed(0)}m idle</span>
                                    </div>
                                ))}
                                {confirmBatchKill.length > 50 && (
                                    <div className="px-2 py-1 text-center text-gray-400 italic">
                                        + {confirmBatchKill.length - 50} more sessions
                                    </div>
                                )}
                            </div>

                            <p className="text-red-500 dark:text-red-400 font-medium">
                                ⚠ Uncommitted transactions on these sessions will be rolled back immediately.
                            </p>
                        </div>

                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setConfirmBatchKill(null)}
                                className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleBatchKillConfirmed}
                                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition-colors shadow-sm">
                                Kill {confirmBatchKill.length} Session(s)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
