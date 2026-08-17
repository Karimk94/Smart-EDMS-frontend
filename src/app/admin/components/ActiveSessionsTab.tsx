"use client";

import React from "react";
import Image from "next/image";
import { useAdmin, ActiveSession } from "../../../hooks/useAdmin";
import { useAuth } from "../../../hooks/useAuth";
import { useTranslations } from "../../hooks/useTranslations";
import { useToast } from "../../context/ToastContext";
import { Spinner } from "../../components/Spinner";

function formatDate(value: string | null): string {
    if (!value) return "-";
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleString();
}

function SecurityLevelBadge({ level }: { level: string | null }) {
    const normalized = (level || "Viewer").toLowerCase();

    let classes =
        "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    if (normalized === "admin") {
        classes = "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    } else if (normalized === "editor") {
        classes = "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    }

    return (
        <span className={`px-2 py-1 rounded text-xs font-medium w-fit ${classes}`}>
            {level || "Viewer"}
        </span>
    );
}

export default function ActiveSessionsTab() {
    const { user } = useAuth();
    const lang = user?.lang || "en";
    const t = useTranslations(lang as "en" | "ar");
    const { showToast } = useToast();

    const { useActiveSessions, terminateSession, isTerminatingSession } = useAdmin();

    const { data: sessions = [], isLoading, refetch } = useActiveSessions();

    const handleTerminate = async (session: ActiveSession) => {
        if (!confirm(`${t("confirmTerminateSession") || "Terminate session for"} ${session.username}?`)) {
            return;
        }

        try {
            await terminateSession(session.session_id);
            showToast(`${t("sessionTerminated") || "Session terminated for"} ${session.username}`, "success");
        } catch (err: any) {
            showToast(err.message || "Failed to terminate session", "error");
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t("activeSessions") || "Active Sessions"}
                    </h2>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        ({sessions.length} {t("total") || "total"})
                    </span>
                </div>
                <button
                    onClick={() => refetch()}
                    disabled={isLoading}
                    className="px-3 py-1.5 rounded-md text-xs font-medium bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? t("loading") || "Loading..." : t("refresh") || "Refresh"}
                </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full table-fixed divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                {t("username") || "Username"}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                {t("fullName") || "Full Name"}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                {t("securityLevel") || "Security Level"}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                {t("appSource") || "App Source"}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                {t("ipAddress") || "IP Address"}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                {t("loginDate") || "Login Date"}
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                {t("actions") || "Actions"}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {sessions.map((session) => {
                            const thisSession = user?.session_id === session.session_id;
                            return (
                                <tr key={session.session_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="px-6 py-4 break-words text-sm font-medium text-gray-900 dark:text-white">
                                        {session.username}
                                        {thisSession && (
                                            <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                                {t("currentSession") || "Current"}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 break-words text-sm text-gray-500 dark:text-gray-300">
                                        {session.full_name || session.username}
                                    </td>
                                    <td className="px-6 py-4 break-words text-sm text-gray-500 dark:text-gray-300">
                                        <SecurityLevelBadge level={session.security_level} />
                                    </td>
                                    <td className="px-6 py-4 break-words text-sm text-gray-500 dark:text-gray-300">
                                        {session.app_source || "-"}
                                    </td>
                                    <td className="px-6 py-4 break-words text-sm text-gray-500 dark:text-gray-300 font-mono">
                                        {session.ip_address || "-"}
                                    </td>
                                    <td className="px-6 py-4 break-words text-sm text-gray-500 dark:text-gray-300">
                                        {formatDate(session.login_date)}
                                    </td>
                                    <td className="px-6 py-4 break-words text-right text-sm font-medium">
                                        {thisSession ? (
                                            <span className="text-xs text-gray-400 dark:text-gray-500">
                                                {t("yourSession") || "You"}
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => handleTerminate(session)}
                                                disabled={isTerminatingSession}
                                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {t("terminate") || "Terminate"}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        {sessions.length === 0 && !isLoading && (
                            <tr>
                                <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                    {t("noActiveSessions") || "No active sessions"}
                                </td>
                            </tr>
                        )}
                        {isLoading && sessions.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                    <Spinner size="sm" center />
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}