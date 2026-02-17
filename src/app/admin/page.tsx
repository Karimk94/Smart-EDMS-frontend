"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "../context/ToastContext";
import QuotaPieChart from "../components/QuotaPieChart";
import { useAdmin, EdmsUser, SecurityLevel, PersonResult } from "../../hooks/useAdmin";

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

    // Queries & Mutations from hook
    const {
        useCheckAccess,
        useUsers,
        useSecurityLevels,
        useSearchPeople,
        addUser,
        isAddingUser,
        updateUser,
        isUpdatingUser,
        deleteUser,
        isDeletingUser
    } = useAdmin();

    const { data: accessData, isLoading: checkingAccess } = useCheckAccess();

    // Server-side pagination and search
    const [userFilter, setUserFilter] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

    // Users Query
    const { data: usersData, isLoading: isLoadingUsers } = useUsers(currentPage, userFilter, !!hasAccess);
    const users = usersData?.users || [];
    const totalUsers = usersData?.total || 0;
    const hasMore = usersData?.has_more || false;

    // Security Levels Query
    const { data: securityLevels = [] } = useSecurityLevels(!!hasAccess);

    // Add user modal
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedPerson, setSelectedPerson] = useState<PersonResult | null>(null);
    const [selectedSecurityLevel, setSelectedSecurityLevel] = useState<number | null>(null);
    const [selectedLang, setSelectedLang] = useState("en");
    const [selectedTheme, setSelectedTheme] = useState("light");

    // People Search Query
    const { data: searchResults = [], isLoading: isSearching } = useSearchPeople(searchQuery, showAddModal);

    // Edit user modal
    const [editTarget, setEditTarget] = useState<EdmsUser | null>(null);
    const [editSecurityLevel, setEditSecurityLevel] = useState<number | null>(null);
    const [editLang, setEditLang] = useState("en");
    const [editTheme, setEditTheme] = useState("light");
    const [editQuota, setEditQuota] = useState<number | null>(null);
    const [editTotalQuota, setEditTotalQuota] = useState<number | null>(null);

    // Format quota helper
    const formatQuota = (bytes: number) => {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    // Delete confirmation
    const [deleteTarget, setDeleteTarget] = useState<EdmsUser | null>(null);

    const router = useRouter();
    const { showToast } = useToast();

    // Calculate total pages
    const totalPages = Math.ceil(totalUsers / ITEMS_PER_PAGE);

    // Check access side effect
    useEffect(() => {
        if (accessData) {
            setHasAccess(accessData.has_access);
            setIsLoading(false);
            if (!accessData.has_access) {
                // Optional: redirect logic could go here, but let's keep the error UI
            }
        } else if (!checkingAccess && !accessData) {
            setIsLoading(false); // Finished checking, no data (error handled by query)
        }
    }, [accessData, checkingAccess]);

    // Handle Access Error Redirect (optional, based on requirement)
    // useEffect(() => { ... }, [accessError]); 

    // Debounced search for user list - reset to page 1
    useEffect(() => {
        const timer = setTimeout(() => {
            setCurrentPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [userFilter]);

    const handleAddUser = async () => {
        if (!selectedPerson || !selectedSecurityLevel) {
            showToast("Please select a user and security level", "error");
            return;
        }

        try {
            await addUser({
                user_system_id: selectedPerson.system_id,
                security_level_id: selectedSecurityLevel,
                lang: selectedLang,
                theme: selectedTheme,
            });

            showToast("User added successfully", "success");
            closeAddModal();
        } catch (err: any) {
            showToast(err.message || "Failed to add user", "error");
        }
    };

    const closeAddModal = () => {
        setShowAddModal(false);
        setSelectedPerson(null);
        setSelectedSecurityLevel(null);
        setSelectedLang("en");
        setSelectedTheme("light");
        setSearchQuery("");
        // searchResults is derived from query, so clearing query clears results
    };

    const openEditModal = (user: EdmsUser) => {
        setEditTarget(user);
        setEditSecurityLevel(user.security_level_id);
        setEditLang(user.lang);
        setEditTheme(user.theme);
        setEditQuota(user.remaining_quota);
        setEditTotalQuota(user.quota);
    };

    const closeEditModal = () => {
        setEditTarget(null);
        setEditSecurityLevel(null);
        setEditLang("en");
        setEditTheme("light");
        setEditTheme("light");
        setEditQuota(null);
        setEditTotalQuota(null);
    };

    const handleEditUser = async () => {
        if (!editTarget || !editSecurityLevel) {
            showToast("Please select a security level", "error");
            return;
        }

        try {
            await updateUser({
                edms_user_id: editTarget.edms_user_id,
                security_level_id: editSecurityLevel,
                lang: editLang,
                theme: editTheme,
                remaining_quota: editQuota,
                quota: editTotalQuota,
            });

            showToast("User updated successfully", "success");
            closeEditModal();
        } catch (err: any) {
            showToast(err.message || "Failed to update user", "error");
        }
    };

    const handleDeleteUser = async () => {
        if (!deleteTarget) return;

        try {
            await deleteUser(deleteTarget.edms_user_id);

            showToast("User deleted successfully", "success");
            setDeleteTarget(null);
        } catch (err: any) {
            showToast(err.message || "Failed to delete user", "error");
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Quota (Usage)
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {users.map((user) => (
                                <tr key={user.edms_user_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
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
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 font-mono">
                                        <QuotaPieChart remaining={user.remaining_quota} total={user.quota} />
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
                                                    setSearchQuery(""); // Clear query to hide results
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
                                disabled={isAddingUser}
                                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddUser}
                                disabled={!selectedPerson || !selectedSecurityLevel || isAddingUser}
                                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center gap-2"
                            >
                                {isAddingUser ? (
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

                            {/* Quota Edit */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Remaining Quota (bytes)
                                </label>
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="number"
                                        value={editQuota ?? ""}
                                        onChange={(e) => setEditQuota(Number(e.target.value))}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                        {formatQuota(editQuota || 0)}
                                    </span>
                                </div>
                            </div>

                            {/* Total Quota Edit */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Total Quota (bytes)
                                </label>
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="number"
                                        value={editTotalQuota ?? ""}
                                        onChange={(e) => setEditTotalQuota(Number(e.target.value))}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                        {formatQuota(editTotalQuota || 0)}
                                    </span>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Default 1GB = 1073741824 bytes</p>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-lg">
                            <button
                                onClick={closeEditModal}
                                disabled={isUpdatingUser}
                                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEditUser}
                                disabled={!editSecurityLevel || isUpdatingUser}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center gap-2"
                            >
                                {isUpdatingUser ? (
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
            )
            }

            {/* Delete Confirmation Modal */}
            {
                deleteTarget && (
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
                                    disabled={isDeletingUser}
                                    className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteUser}
                                    disabled={isDeletingUser}
                                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
                                >
                                    {isDeletingUser ? "Deleting..." : "Delete"}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
