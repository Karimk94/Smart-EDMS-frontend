"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "../context/ToastContext";

interface EdmsUser {
    username: string;
    people_system_id: number;
    edms_user_id: number;
    user_ref_id: number;
    security_level: string;
    security_level_id: number;
    lang: string;
    theme: string;
}

interface SecurityLevel {
    id: number;
    name: string;
}

interface PersonResult {
    system_id: number;
    user_id: string;
    name: string;
}

const ITEMS_PER_PAGE = 20;

const LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'ar', name: 'Arabic' }
];

const THEMES = [
    { code: 'light', name: 'Light' },
    { code: 'dark', name: 'Dark' }
];

export default function AdminPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [hasAccess, setHasAccess] = useState(false);
    const [users, setUsers] = useState<EdmsUser[]>([]);
    const [securityLevels, setSecurityLevels] = useState<SecurityLevel[]>([]);

    // Server-side pagination and search
    const [userFilter, setUserFilter] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);

    // Add user modal
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<PersonResult[]>([]);
    const [selectedPerson, setSelectedPerson] = useState<PersonResult | null>(null);
    const [selectedSecurityLevel, setSelectedSecurityLevel] = useState<number | null>(null);
    const [selectedLang, setSelectedLang] = useState("en");
    const [selectedTheme, setSelectedTheme] = useState("light");
    const [isSearching, setIsSearching] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    // Edit user modal
    const [editTarget, setEditTarget] = useState<EdmsUser | null>(null);
    const [editSecurityLevel, setEditSecurityLevel] = useState<number | null>(null);
    const [editLang, setEditLang] = useState("en");
    const [editTheme, setEditTheme] = useState("light");
    const [isEditing, setIsEditing] = useState(false);

    // Delete confirmation
    const [deleteTarget, setDeleteTarget] = useState<EdmsUser | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const router = useRouter();
    const { showToast } = useToast();

    // Calculate total pages
    const totalPages = Math.ceil(totalUsers / ITEMS_PER_PAGE);

    // Check access on mount
    useEffect(() => {
        const checkAccess = async () => {
            try {
                const response = await fetch("/api/admin/check-access");
                if (response.status === 401) {
                    router.push("/login");
                    return;
                }
                if (response.ok) {
                    const data = await response.json();
                    setHasAccess(data.has_access);
                    if (data.has_access) {
                        loadSecurityLevels();
                    }
                }
            } catch (err) {
                console.error("Access check failed:", err);
            } finally {
                setIsLoading(false);
            }
        };
        checkAccess();
    }, [router]);

    // Load users with pagination and search
    const loadUsers = useCallback(async (search: string, page: number) => {
        setIsLoadingUsers(true);
        try {
            const params = new URLSearchParams({
                search,
                page: String(page),
                limit: String(ITEMS_PER_PAGE)
            });
            const response = await fetch(`/api/admin/users?${params}`);
            if (response.ok) {
                const data = await response.json();
                setUsers(data.users);
                setTotalUsers(data.total);
                setHasMore(data.has_more);
            }
        } catch (err) {
            console.error("Failed to load users:", err);
        } finally {
            setIsLoadingUsers(false);
        }
    }, []);

    // Debounced search effect - reset to page 1 when search changes
    useEffect(() => {
        if (!hasAccess) return;
        const timer = setTimeout(() => {
            setCurrentPage(1);
            loadUsers(userFilter, 1);
        }, 300);
        return () => clearTimeout(timer);
    }, [userFilter, hasAccess, loadUsers]);

    // Load users when page changes (but not search - that's handled above)
    useEffect(() => {
        if (!hasAccess) return;
        loadUsers(userFilter, currentPage);
    }, [currentPage, hasAccess]); // eslint-disable-line react-hooks/exhaustive-deps

    const loadSecurityLevels = async () => {
        try {
            const response = await fetch("/api/admin/security-levels");
            if (response.ok) {
                const data = await response.json();
                setSecurityLevels(data);
            }
        } catch (err) {
            console.error("Failed to load security levels:", err);
        }
    };

    const searchPeople = useCallback(async (query: string) => {
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const response = await fetch(`/api/admin/search-people?search=${encodeURIComponent(query)}`);
            if (response.ok) {
                const data = await response.json();
                setSearchResults(data);
            }
        } catch (err) {
            console.error("Search failed:", err);
        } finally {
            setIsSearching(false);
        }
    }, []);

    // Debounced search for add user modal
    useEffect(() => {
        if (!showAddModal) return;
        const timer = setTimeout(() => {
            searchPeople(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, searchPeople, showAddModal]);

    const handleAddUser = async () => {
        if (!selectedPerson || !selectedSecurityLevel) {
            showToast("Please select a user and security level", "error");
            return;
        }

        setIsAdding(true);
        try {
            const response = await fetch("/api/admin/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_system_id: selectedPerson.system_id,
                    security_level_id: selectedSecurityLevel,
                    lang: selectedLang,
                    theme: selectedTheme,
                }),
            });

            if (response.ok) {
                showToast("User added successfully", "success");
                closeAddModal();
                loadUsers(userFilter, currentPage);
            } else {
                const data = await response.json();
                showToast(data.detail || "Failed to add user", "error");
            }
        } catch (err) {
            showToast("Failed to add user", "error");
        } finally {
            setIsAdding(false);
        }
    };

    const closeAddModal = () => {
        setShowAddModal(false);
        setSelectedPerson(null);
        setSelectedSecurityLevel(null);
        setSelectedLang("en");
        setSelectedTheme("light");
        setSearchQuery("");
        setSearchResults([]);
    };

    const openEditModal = (user: EdmsUser) => {
        setEditTarget(user);
        setEditSecurityLevel(user.security_level_id);
        setEditLang(user.lang);
        setEditTheme(user.theme);
    };

    const closeEditModal = () => {
        setEditTarget(null);
        setEditSecurityLevel(null);
        setEditLang("en");
        setEditTheme("light");
    };

    const handleEditUser = async () => {
        if (!editTarget || !editSecurityLevel) {
            showToast("Please select a security level", "error");
            return;
        }

        setIsEditing(true);
        try {
            const response = await fetch(`/api/admin/users/${editTarget.edms_user_id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    security_level_id: editSecurityLevel,
                    lang: editLang,
                    theme: editTheme,
                }),
            });

            if (response.ok) {
                showToast("User updated successfully", "success");
                closeEditModal();
                loadUsers(userFilter, currentPage);
            } else {
                const data = await response.json();
                showToast(data.detail || "Failed to update user", "error");
            }
        } catch (err) {
            showToast("Failed to update user", "error");
        } finally {
            setIsEditing(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!deleteTarget) return;

        setIsDeleting(true);
        try {
            const response = await fetch(`/api/admin/users/${deleteTarget.edms_user_id}`, {
                method: "DELETE",
            });

            if (response.ok) {
                showToast("User deleted successfully", "success");
                setDeleteTarget(null);
                loadUsers(userFilter, currentPage);
            } else {
                const data = await response.json();
                showToast(data.detail || "Failed to delete user", "error");
            }
        } catch (err) {
            showToast("Failed to delete user", "error");
        } finally {
            setIsDeleting(false);
        }
    };

    const goToPage = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
                <div className="text-gray-600 dark:text-gray-300">Loading...</div>
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
                <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
                    <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Access Denied</h1>
                    <p className="text-gray-600 dark:text-gray-300">You do not have permission to access this page.</p>
                    <button
                        onClick={() => router.push("/folders")}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Go to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Panel - User Management</h1>
                    <button
                        onClick={() => router.push("/folders")}
                        className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                    >
                        ← Back to Dashboard
                    </button>
                </div>

                {/* Users Table Card */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    {/* Table Header with Search and Add Button */}
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-3">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">EDMS Users</h2>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                ({totalUsers} total)
                            </span>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                            {/* Search existing users */}
                            <div className="relative">
                                <input
                                    type="text"
                                    value={userFilter}
                                    onChange={(e) => setUserFilter(e.target.value)}
                                    placeholder="Search users..."
                                    className="w-full sm:w-64 px-3 py-2 pl-9 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                />
                                <svg
                                    className="absolute left-3 top-2.5 h-4 w-4 text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                {isLoadingUsers && (
                                    <div className="absolute right-3 top-2.5">
                                        <svg className="animate-spin h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                        </svg>
                                    </div>
                                )}
                            </div>
                            {/* Add User Button */}
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2 text-sm font-medium"
                            >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Add User
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Username
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Security Level
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Language
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Theme
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {users.map((user) => (
                                <tr key={user.edms_user_id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                        {user.username}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${user.security_level === 'Admin' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                            user.security_level === 'Editor' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                            }`}>
                                            {user.security_level}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                        {user.lang.toUpperCase()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 capitalize">
                                        {user.theme}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                                        <button
                                            onClick={() => openEditModal(user)}
                                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => setDeleteTarget(user)}
                                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && !isLoadingUsers && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                        {userFilter ? "No users match your search" : "No users found"}
                                    </td>
                                </tr>
                            )}
                            {isLoadingUsers && users.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                        Loading...
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalUsers)} of {totalUsers}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => goToPage(1)}
                                    disabled={currentPage === 1 || isLoadingUsers}
                                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
                                >
                                    First
                                </button>
                                <button
                                    onClick={() => goToPage(currentPage - 1)}
                                    disabled={currentPage === 1 || isLoadingUsers}
                                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
                                >
                                    Previous
                                </button>
                                <span className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button
                                    onClick={() => goToPage(currentPage + 1)}
                                    disabled={!hasMore || isLoadingUsers}
                                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
                                >
                                    Next
                                </button>
                                <button
                                    onClick={() => goToPage(totalPages)}
                                    disabled={currentPage === totalPages || isLoadingUsers}
                                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
                                >
                                    Last
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Add User Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                                Add New User
                            </h3>
                            <button
                                onClick={closeAddModal}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4">
                            {/* Person Search */}
                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Search People (not yet in Smart EDMS)
                                </label>
                                <input
                                    type="text"
                                    value={selectedPerson ? `${selectedPerson.user_id} - ${selectedPerson.name}` : searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setSelectedPerson(null);
                                    }}
                                    placeholder="Type to search by username or name..."
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                />
                                {isSearching && (
                                    <div className="absolute right-4 top-11 text-gray-400">
                                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                        </svg>
                                    </div>
                                )}
                                {searchResults.length > 0 && !selectedPerson && (
                                    <ul className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto">
                                        {searchResults.map((person) => (
                                            <li
                                                key={person.system_id}
                                                onClick={() => {
                                                    setSelectedPerson(person);
                                                    setSearchResults([]);
                                                }}
                                                className="px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-600 last:border-0"
                                            >
                                                <div className="font-medium">{person.user_id}</div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400">{person.name}</div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && !selectedPerson && (
                                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4 text-center text-gray-500 dark:text-gray-400">
                                        No users found matching your search
                                    </div>
                                )}
                            </div>

                            {/* Selected Person Display */}
                            {selectedPerson && (
                                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
                                    <div>
                                        <div className="font-medium text-green-800 dark:text-green-200">{selectedPerson.user_id}</div>
                                        <div className="text-sm text-green-600 dark:text-green-400">{selectedPerson.name}</div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setSelectedPerson(null);
                                            setSearchQuery("");
                                        }}
                                        className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
                                    >
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            )}

                            {/* Security Level Dropdown */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Security Level
                                </label>
                                <select
                                    value={selectedSecurityLevel || ""}
                                    onChange={(e) => setSelectedSecurityLevel(Number(e.target.value))}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                >
                                    <option value="">Select security level...</option>
                                    {securityLevels.map((level) => (
                                        <option key={level.id} value={level.id}>
                                            {level.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Language and Theme Row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Language
                                    </label>
                                    <select
                                        value={selectedLang}
                                        onChange={(e) => setSelectedLang(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    >
                                        {LANGUAGES.map((lang) => (
                                            <option key={lang.code} value={lang.code}>
                                                {lang.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Theme
                                    </label>
                                    <select
                                        value={selectedTheme}
                                        onChange={(e) => setSelectedTheme(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    >
                                        {THEMES.map((theme) => (
                                            <option key={theme.code} value={theme.code}>
                                                {theme.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-lg">
                            <button
                                onClick={closeAddModal}
                                disabled={isAdding}
                                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddUser}
                                disabled={!selectedPerson || !selectedSecurityLevel || isAdding}
                                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center gap-2"
                            >
                                {isAdding ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                        </svg>
                                        Adding...
                                    </>
                                ) : (
                                    "Add User"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {editTarget && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                                Edit User: {editTarget.username}
                            </h3>
                            <button
                                onClick={closeEditModal}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4">
                            {/* Security Level Dropdown */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Security Level
                                </label>
                                <select
                                    value={editSecurityLevel || ""}
                                    onChange={(e) => setEditSecurityLevel(Number(e.target.value))}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">Select security level...</option>
                                    {securityLevels.map((level) => (
                                        <option key={level.id} value={level.id}>
                                            {level.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Language and Theme Row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Language
                                    </label>
                                    <select
                                        value={editLang}
                                        onChange={(e) => setEditLang(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        {LANGUAGES.map((lang) => (
                                            <option key={lang.code} value={lang.code}>
                                                {lang.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Theme
                                    </label>
                                    <select
                                        value={editTheme}
                                        onChange={(e) => setEditTheme(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        {THEMES.map((theme) => (
                                            <option key={theme.code} value={theme.code}>
                                                {theme.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-lg">
                            <button
                                onClick={closeEditModal}
                                disabled={isEditing}
                                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEditUser}
                                disabled={!editSecurityLevel || isEditing}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center gap-2"
                            >
                                {isEditing ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                        </svg>
                                        Saving...
                                    </>
                                ) : (
                                    "Save Changes"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Confirm Delete
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            Are you sure you want to remove <strong>{deleteTarget.username}</strong> from EDMS access?
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                disabled={isDeleting}
                                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteUser}
                                disabled={isDeleting}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
                            >
                                {isDeleting ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
