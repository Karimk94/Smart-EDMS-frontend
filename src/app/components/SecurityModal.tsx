import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../context/ToastContext';

interface Trustee {
  username: string;
  rights: number;
  flag: number;
}

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  docId: string;
  library: string;
  itemName: string;
  t: Function;
}

const InfiniteSelect = ({ 
  options, 
  value, 
  onChange, 
  placeholder, 
  onLoadMore, 
  isLoading, 
  disabled,
  onSearch,
  searchValue
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
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 20 && !isLoading && onLoadMore) {
      onLoadMore();
    }
  };

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-left shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className="block truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </span>
      </button>

      {isOpen && (
        <div 
          className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm dark:bg-gray-700 custom-scrollbar"
          onScroll={handleScroll}
        >
          {onSearch && (
            <div className="sticky top-0 z-20 bg-white dark:bg-gray-700 p-2 border-b border-gray-100 dark:border-gray-600">
              <input
                type="text"
                value={searchValue || ''}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="Search..."
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
          )}

          {options.length === 0 && !isLoading ? (
             <div className="relative cursor-default select-none py-2 px-4 text-gray-700 dark:text-gray-400 italic">
               No options found
             </div>
          ) : (
             options.map((option, index) => (
              <div
                key={index}
                className={`relative cursor-pointer select-none py-2 pl-3 pr-9 ${
                  option.value === value 
                    ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100' 
                    : 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                <span className={`block truncate ${option.value === value ? 'font-semibold' : 'font-normal'}`}>
                  {option.label}
                </span>
                {option.value === value ? (
                  <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-blue-600 dark:text-blue-400">
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                ) : null}
              </div>
            ))
          )}
          {isLoading && (
            <div className="relative cursor-default select-none py-2 px-4 text-gray-700 dark:text-gray-400 text-center">
              <svg className="animate-spin h-4 w-4 mx-auto text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function SecurityModal({ isOpen, onClose, docId, library, itemName, t }: SecurityModalProps) {
  const [trustees, setTrustees] = useState<Trustee[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  
  const [memberPage, setMemberPage] = useState(1);
  const [hasMoreMembers, setHasMoreMembers] = useState(true);

  const { showToast } = useToast();

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
    if (isOpen && docId) {
      fetchTrustees();
      fetchGroups();
    } else {
      setTrustees([]);
      setGroups([]);
      setGroupMembers([]);
      setSelectedGroupId('');
      setSelectedMemberId('');
      setMemberPage(1);
      setMemberSearch('');
      setHasMoreMembers(true);
    }
  }, [isOpen, docId]);

  useEffect(() => {
    if (selectedGroupId) {
      const delayDebounceFn = setTimeout(() => {
        setMemberPage(1);
        setHasMoreMembers(true);
        fetchGroupMembers(selectedGroupId, 1, memberSearch);
      }, 300);

      return () => clearTimeout(delayDebounceFn);
    } else {
      setGroupMembers([]);
      setSelectedMemberId('');
    }
  }, [selectedGroupId, memberSearch]);

  const fetchTrustees = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/document/${docId}/trustees`);
      if (res.ok) {
        const data = await res.json();
        setTrustees(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch trustees', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/groups'); 
      if (res.ok) {
        const data = await res.json();
        setGroups(Array.isArray(data) ? data : []);
      } else {
        setGroups([]);
      }
    } catch (err) {
      console.error('Failed to fetch groups', err);
      setGroups([]);
    }
  };

  const fetchGroupMembers = async (groupId: string, page: number, search: string = '') => {
    setIsLoadingMembers(true);
    try {
      const res = await fetch(`/api/groups/search_members?page=${page}&search=${encodeURIComponent(search)}&group_id=${groupId}`);
      if (res.ok) {
        const data = await res.json();
        const newMembers = (data && Array.isArray(data.options)) ? data.options : [];
        
        if (newMembers.length === 0) {
           setHasMoreMembers(false);
        }

        if (page === 1) {
           setGroupMembers(newMembers);
        } else {
           setGroupMembers(prev => [...prev, ...newMembers]);
        }
      } else {
         if (page === 1) setGroupMembers([]);
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
        fetchGroupMembers(selectedGroupId, nextPage, memberSearch);
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
    setTrustees(trustees.filter(t => t.username !== username));
  };

  const handleRightsChange = (username: string, newRights: string) => {
    setTrustees(trustees.map(t => 
      t.username === username ? { ...t, rights: parseInt(newRights) } : t
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/document/${docId}/security`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          library: library || 'RTA_MAIN',
          trustees: trustees,
          security_enabled: '1'
        })
      });

      if (!response.ok) throw new Error('Failed to update security');
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
      className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 dark:text-blue-400">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <h2 className="text-lg font-semibold dark:text-white">
              {t('securityPermissions')} - {itemName}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          
          <div className="mb-6 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('addUserGroup') || "Add User from Group"}
            </h3>
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Group Selector */}
              <div className="flex-1">
                <InfiniteSelect 
                    options={groups.map((g: any) => ({
                        label: g.group_name || g.name,
                        value: g.group_id || g.id
                    }))}
                    value={selectedGroupId}
                    onChange={(val) => {
                      setSelectedGroupId(val);
                      setMemberSearch('');
                    }}
                    placeholder={t('selectGroup') || "Select Group..."}
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
                />
              </div>

              {/* Add Button */}
              <button
                onClick={handleAddSelectedMember}
                disabled={!selectedMemberId}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed h-10"
              >
                {t('add') || "Add"}
              </button>
            </div>
          </div>

          {/* Trustees List */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('trusteesList')}
            </h3>
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-medium">{t('user')}</th>
                  <th className="px-4 py-3 font-medium">{t('accessLevel')}</th>
                  <th className="px-4 py-3 font-medium w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                      <svg className="animate-spin h-5 w-5 mx-auto text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
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
                          className="w-full bg-transparent border-none focus:ring-0 text-gray-600 dark:text-gray-300 text-sm"
                        >
                          <option value="255">{t('fullControl')}</option>
                          <option value="63">{t('readWrite')}</option>
                          <option value="45">{t('readOnly')}</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleRemoveTrustee(trustee.username)}
                          className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving && (
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {t('savePermissions')}
          </button>
        </div>
      </div>
    </div>
  );
}