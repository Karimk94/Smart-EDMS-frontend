import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { useToast } from '../context/ToastContext';

import { SecurityModalProps, Trustee } from '../../interfaces/PropsInterfaces';
import { useGroups, fetchGroupMembers } from '../../hooks/usePersons';
import { useTrustees, useSecurityMutation } from '../../hooks/useSecurity';
import { useAuth } from '../../hooks/useAuth';

const InfiniteSelect = ({
  options,
  value,
  onChange,
  placeholder,
  onLoadMore,
  isLoading,
  disabled,
  onSearch,
  searchValue,
  t
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  onLoadMore?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  onSearch?: (val: string) => void;
  searchValue?: string;
  t: Function;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<{ top: number; left: number; width: number; maxHeight: number }>({
    top: 0,
    left: 0,
    width: 0,
    maxHeight: 240,
  });
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 20 && !isLoading && onLoadMore) {
      onLoadMore();
    }
  };

  const updateDropdownPosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const viewportPadding = 8;
    const headerHeight = onSearch ? 52 : 0;
    const listMaxHeight = 240;
    const estimatedHeight = headerHeight + listMaxHeight + 10;
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const spaceAbove = rect.top - viewportPadding;
    const shouldOpenUp = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

    const desiredWidth = rect.width;
    const maxWidth = window.innerWidth - viewportPadding * 2;
    const width = Math.min(desiredWidth, maxWidth);
    const left = Math.min(
      Math.max(rect.left, viewportPadding),
      window.innerWidth - width - viewportPadding
    );

    const maxAvailableHeight = shouldOpenUp
      ? Math.max(140, spaceAbove - 8)
      : Math.max(140, spaceBelow - 8);

    const top = shouldOpenUp
      ? Math.max(viewportPadding, rect.top - Math.min(estimatedHeight, maxAvailableHeight + headerHeight + 8))
      : Math.min(window.innerHeight - viewportPadding - 140, rect.bottom + 8);

    setOpenUpward(shouldOpenUp);
    setDropdownStyle({
      top,
      left,
      width,
      maxHeight: Math.min(listMaxHeight, Math.max(120, maxAvailableHeight - headerHeight)),
    });
  }, [onSearch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsideTrigger = containerRef.current?.contains(target);
      const clickedInsideDropdown = dropdownRef.current?.contains(target);
      if (!clickedInsideTrigger && !clickedInsideDropdown) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    updateDropdownPosition();
    window.addEventListener('resize', updateDropdownPosition);
    window.addEventListener('scroll', updateDropdownPosition, true);

    return () => {
      window.removeEventListener('resize', updateDropdownPosition);
      window.removeEventListener('scroll', updateDropdownPosition, true);
    };
  }, [isOpen, options.length, isLoading, updateDropdownPosition]);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`group relative w-full rounded-xl border px-3 py-2.5 text-left shadow-sm transition-all duration-200 sm:text-sm ${disabled
          ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500 opacity-80'
          : 'cursor-pointer border-gray-300 bg-white text-gray-800 hover:border-blue-400 hover:shadow-md focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:border-blue-500'
          }`}
      >
        <span className={`block truncate pr-7 ${selectedOption ? 'font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <Image src="/icons/chevron-down.svg" alt="" width={20} height={20} className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} dark:invert`} />
        </span>
      </button>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[1000] rounded-xl border border-gray-200 bg-white py-1 text-base shadow-2xl ring-1 ring-black/5 focus:outline-none sm:text-sm dark:border-gray-600 dark:bg-gray-700"
          style={{
            top: dropdownStyle.top,
            left: dropdownStyle.left,
            width: dropdownStyle.width,
            transformOrigin: openUpward ? 'bottom left' : 'top left',
          }}
        >
          {onSearch && (
            <div className="relative z-30 bg-white dark:bg-gray-700 p-2 border-b border-gray-100 dark:border-gray-600 shadow-sm rounded-t-xl">
              <input
                type="text"
                value={searchValue || ''}
                onChange={(e) => onSearch(e.target.value)}
                placeholder={t('search')}
                className="w-full rounded-lg px-3 py-2 text-sm border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
          )}
          <div
            className="overflow-auto custom-scrollbar"
            onScroll={handleScroll}
            style={{ maxHeight: dropdownStyle.maxHeight }}
          >
            {options.length === 0 && !isLoading ? (
              <div className="relative cursor-default select-none py-3 px-4 text-gray-500 dark:text-gray-400 italic text-center">
                No options found
              </div>
            ) : (
              <div className={onSearch ? 'pt-1' : ''}>
                {options.map((option, index) => (
                  <div
                    key={index}
                    className={`relative cursor-pointer select-none py-2.5 pl-3 pr-9 transition-colors ${option.value === value
                      ? 'bg-blue-50 text-blue-900 dark:bg-blue-900/30 dark:text-blue-100'
                      : 'text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600/80'
                      }`}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                  >
                    <span className={`block truncate ${option.value === value ? 'font-semibold' : 'font-medium'}`}>
                      {option.label}
                    </span>
                    {option.value === value ? (
                      <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-blue-600 dark:text-blue-400">
                        <Image src="/icons/check.svg" alt="" width={20} height={20} className="dark:invert" />
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
            {isLoading && (
              <div className="relative cursor-default select-none py-3 px-4 text-gray-700 dark:text-gray-400 text-center">
                <Image src="/icons/spinner.svg" alt="" width={16} height={16} className="animate-spin mx-auto" />
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default function SecurityModal({ isOpen, onClose, docId, library, itemName, t }: SecurityModalProps) {
  const { user } = useAuth();
  const currentUsername = user?.username;

  const { data: trusteesData, isLoading: isLoadingTrustees } = useTrustees(parseInt(docId));
  const [trustees, setTrustees] = useState<Trustee[]>([]);
  const [saving, setSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const hasLoadedInitialTrustees = useRef(false);
  const trusteesDataRef = useRef(trusteesData);
  trusteesDataRef.current = trusteesData;
  const currentUsernameRef = useRef(currentUsername);
  currentUsernameRef.current = currentUsername;

  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [groupSearch, setGroupSearch] = useState('');

  const { data: groups, isLoading: isLoadingGroups } = useGroups({ search: groupSearch });

  // Members State
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberPage, setMemberPage] = useState(1);
  const [hasMoreMembers, setHasMoreMembers] = useState(true);
  const [isAddingAllMembers, setIsAddingAllMembers] = useState(false);

  const { showToast } = useToast();
  const { updateSecurity, isUpdatingSecurity } = useSecurityMutation();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    // Run once when the real fetch completes (isLoadingTrustees flips to false)
    if (!isLoadingTrustees && !hasLoadedInitialTrustees.current) {
      const initial = [...(trusteesDataRef.current || [])];
      const username = currentUsernameRef.current;
      // Always ensure the current user (author) is visible immediately
      if (username && !initial.find(t => t.username === username)) {
        initial.unshift({ username, rights: 255, flag: 2 });
      }
      setTrustees(initial);
      hasLoadedInitialTrustees.current = true;
    }
  // Only react to the loading flag — trusteesData/currentUsername are read via refs
  }, [isLoadingTrustees]);

  useEffect(() => {
    if (!isOpen) {
      // Reset local state on close
      setSelectedGroupId('');
      setSelectedMemberId('');
      setMemberPage(1);
      setMemberSearch('');
      setHasMoreMembers(true);
      setGroupSearch('');
      setIsExpanded(false);
      hasLoadedInitialTrustees.current = false;
    }
  }, [isOpen]);

  // No need for separate fetchGroups effect as useGroups handles it

  useEffect(() => {
    if (selectedGroupId) {
      const delayDebounceFn = setTimeout(() => {
        setMemberPage(1);
        setHasMoreMembers(true);
        loadGroupMembers(selectedGroupId, 1, memberSearch);
      }, 300);

      return () => clearTimeout(delayDebounceFn);
    } else {
      setGroupMembers([]);
      setSelectedMemberId('');
    }
  }, [selectedGroupId, memberSearch]);

  const loadGroupMembers = async (groupId: string, page: number, search: string = '') => {
    setIsLoadingMembers(true);
    try {
      const data = await fetchGroupMembers(groupId, page, search);
      const newMembers = (data && Array.isArray(data.options)) ? data.options : [];

      if (newMembers.length === 0) {
        setHasMoreMembers(false);
      } else {
        setHasMoreMembers(data.hasMore);
      }

      if (page === 1) {
        setGroupMembers(newMembers);
      } else {
        setGroupMembers(prev => [...prev, ...newMembers]);
      }

    } catch (err) {
      console.error('Failed to fetch group members', err);
      if (page === 1) setGroupMembers([]);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const loadMoreMembers = () => {
    if (hasMoreMembers && !isLoadingMembers && selectedGroupId) {
      const nextPage = memberPage + 1;
      setMemberPage(nextPage);
      loadGroupMembers(selectedGroupId, nextPage, memberSearch);
    }
  };

  const handleAddSelectedMember = () => {
    if (!selectedMemberId) return;

    const person = groupMembers.find(m => (m.user_id || m.USER_ID || m.id) === selectedMemberId);

    if (!person) {
      console.error("Selected person not found in current list");
      return;
    }

    const userId = person.user_id || person.USER_ID || person.id;

    if (!userId) {
      console.error("Invalid person object selected:", person);
      return;
    }

    if (!trustees.find(t => t.username === userId)) {
      setTrustees([...trustees, {
        username: userId,
        rights: 63,
        flag: 2
      }]);
    }

    setSelectedMemberId('');
  };

  const handleRemoveTrustee = (username: string) => {
    if (username === currentUsername) return;
    setTrustees(trustees.filter(t => t.username !== username));
  };

  const handleRightsChange = (username: string, newRights: string) => {
    setTrustees(trustees.map(t =>
      t.username === username ? { ...t, rights: parseInt(newRights) } : t
    ));
  };

  const handleAddAllGroupMembers = async () => {
    if (!selectedGroupId || isAddingAllMembers) return;
    setIsAddingAllMembers(true);
    try {
      const allMembers: any[] = [];
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const data = await fetchGroupMembers(selectedGroupId, page, '');
        const members = Array.isArray(data?.options) ? data.options : [];
        allMembers.push(...members);
        hasMore = data?.hasMore ?? false;
        page++;
        if (members.length === 0) break;
      }
      setTrustees(prev => {
        const existing = new Set(prev.map(t => t.username));
        const newEntries = allMembers
          .filter(m => {
            const uid = m.user_id || m.USER_ID || m.id;
            return uid && !existing.has(uid);
          })
          .map(m => ({
            username: m.user_id || m.USER_ID || m.id as string,
            rights: 63,
            flag: 2
          }));
        return [...prev, ...newEntries];
      });
    } catch (err) {
      console.error('Failed to fetch all group members', err);
      showToast(t('failedToUpdatePermissions'), 'error');
    } finally {
      setIsAddingAllMembers(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let updatedTrustees = [...trustees];

      // Auto-add member that was selected but not yet clicked Add
      if (selectedMemberId) {
        const person = groupMembers.find(m => (m.user_id || m.USER_ID || m.id) === selectedMemberId);
        if (person) {
          const userId = person.user_id || person.USER_ID || person.id;
          if (userId && !updatedTrustees.find(t => t.username === userId)) {
            updatedTrustees = [...updatedTrustees, { username: userId, rights: 63, flag: 2 }];
          }
        }
      }

      // Ensure the current user (author) is always present with full control
      if (currentUsername && !updatedTrustees.find(t => t.username === currentUsername)) {
        updatedTrustees = [{ username: currentUsername, rights: 255, flag: 2 }, ...updatedTrustees];
      }

      await updateSecurity({
        docId: parseInt(docId),
        library: library || 'RTA_MAIN',
        trustees: updatedTrustees,
        security_enabled: '1'
      });

      showToast(t('permissionsUpdated'), 'success');
      onClose();
    } catch (error) {
      console.error(error);
      showToast(t('failedToUpdatePermissions'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 bg-black/50 z-[60] flex items-center justify-center transition-all duration-300 ${isExpanded ? 'p-2 md:p-3' : 'p-4'}`}
      role="dialog" aria-modal="true" aria-label="Security settings"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col transition-all duration-300 ${isExpanded ? 'w-[99vw] max-w-[1800px] max-h-[96vh]' : 'w-full max-w-3xl max-h-[90vh]'}`}>

        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Image src="/icons/lock.svg" alt="" width={20} height={20} className="dark:invert" />
            <h2 className="text-lg font-semibold dark:text-white">
              {t('securityPermissions')} - {itemName}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(prev => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-white/70 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              title={isExpanded ? 'Shrink view' : 'Expand view'}
            >
              {isExpanded ? (
                <Image src="/icons/chevron-left.svg" alt="" width={14} height={14} className="dark:invert" />
              ) : (
                <Image src="/icons/external-link.svg" alt="" width={14} height={14} className="dark:invert" />
              )}
              {isExpanded ? (t('shrink') || 'Shrink') : (t('expand') || 'Expand')}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700">
              <Image src="/icons/close.svg" alt="" width={20} height={20} className="dark:invert" />
            </button>
          </div>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">

          <div className={`grid gap-6 ${isExpanded ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
            <div className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-700/30 dark:to-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('addUserGroup') || "Add User from Group"}
            </h3>
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Group Selector */}
              <div className="flex-1">
                <InfiniteSelect t={t}
                  options={(groups || []).map((g: any) => ({
                    label: g.group_name || g.name,
                    value: g.group_id || g.id
                  }))}
                  value={selectedGroupId}
                  onChange={(val) => {
                    setSelectedGroupId(val);
                    setMemberSearch('');
                  }}
                  placeholder={t('selectGroup') || "Select Group..."}
                  isLoading={isLoadingGroups}
                  onSearch={setGroupSearch}
                  searchValue={groupSearch}
                />
              </div>

              {/* Member Selector */}
              <div className="flex-1">
                <InfiniteSelect
                  options={groupMembers.map((m: any) => ({
                    label: m.name_english || m.name_arabic || m.user_id,
                    value: m.user_id
                  }))}
                  value={selectedMemberId}
                  onChange={setSelectedMemberId}
                  placeholder={!selectedGroupId
                    ? "Select Group First"
                    : groupMembers.length === 0
                      ? "No members found"
                      : (t('selectUser') || "Select User...")}
                  isLoading={isLoadingMembers}
                  onLoadMore={loadMoreMembers}
                  disabled={!selectedGroupId}
                  onSearch={setMemberSearch}
                  searchValue={memberSearch}
                  t={t}
                />
              </div>

              {/* Add Button */}
              <button
                onClick={handleAddSelectedMember}
                disabled={!selectedMemberId}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed h-11 shadow-sm"
              >
                {t('add') || "Add"}
              </button>
            </div>

            {/* Add All Group Members */}
            {selectedGroupId && (
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleAddAllGroupMembers}
                  disabled={isAddingAllMembers}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed dark:border-blue-600 dark:text-blue-300 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 transition-colors"
                >
                  {isAddingAllMembers ? (
                    <Image src="/icons/spinner.svg" alt="" width={14} height={14} className="animate-spin" />
                  ) : (
                    <Image src="/icons/users-plus.svg" alt="" width={14} height={14} />
                  )}
                  {t('addAllMembers') || 'Add All Members from Group'}
                </button>
              </div>
            )}
            </div>

            {/* Trustees List */}
            <div className={`${isExpanded ? 'lg:col-span-1' : ''}`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('trusteesList')}
                </h3>
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-medium">{t('user')}</th>
                  <th className="px-4 py-3 font-medium">{t('accessLevel')}</th>
                  <th className="px-4 py-3 font-medium w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {isLoadingTrustees ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                      <Image src="/icons/spinner.svg" alt="" width={20} height={20} className="animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : trustees.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      {t('noTrusteesAssigned')}
                    </td>
                  </tr>
                ) : (
                  trustees.map((trustee, index) => (
                    <tr key={`trustee-${index}` || trustee.username} className="bg-white dark:bg-gray-800">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                        {trustee.username}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={trustee.rights}
                          onChange={(e) => handleRightsChange(trustee.username, e.target.value)}
                          className="w-full rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm px-2 py-1 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
                        >
                          <option value="255" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">{t('fullControl')}</option>
                          <option value="63" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">{t('readWrite')}</option>
                          <option value="45" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">{t('readOnly')}</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {trustee.username === currentUsername ? (
                          <span
                            title={t('authorCannotBeRemoved') || 'Author – cannot be removed'}
                            className="inline-flex items-center justify-center p-1 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                          >
                            <Image src="/icons/lock.svg" alt="" width={16} height={16} className="dark:invert" />
                          </span>
                        ) : (
                          <button
                            onClick={() => handleRemoveTrustee(trustee.username)}
                            className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Image src="/icons/trash.svg" alt="" width={16} height={16} className="dark:invert" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || isUpdatingSecurity}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-sm"
          >
            {(saving || isUpdatingSecurity) && (
              <Image src="/icons/spinner.svg" alt="" width={16} height={16} className="animate-spin invert" />
            )}
            {t('savePermissions')}
          </button>
        </div>
      </div>
    </div>
  );
}