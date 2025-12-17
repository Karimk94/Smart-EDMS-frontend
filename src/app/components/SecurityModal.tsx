import React, { useState, useEffect } from 'react';
import { PersonSelector } from './PersonSelector'; 

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

export default function SecurityModal({ isOpen, onClose, docId, library, itemName, t }: SecurityModalProps) {
  const PersonSelectorAny = PersonSelector as any;

  const [trustees, setTrustees] = useState<Trustee[]>([]);
  const [loading, setLoading] = useState(false); // Added loading state
  const [saving, setSaving] = useState(false);
  const [isPersonSelectorOpen, setIsPersonSelectorOpen] = useState(false);

  useEffect(() => {
    if (isOpen && docId) {
      fetchTrustees();
    } else {
      setTrustees([]);
    }
  }, [isOpen, docId]);

  const fetchTrustees = async () => {
    setLoading(true); // Set loading true
    try {
      const res = await fetch(`/api/document/${docId}/trustees`);
      if (res.ok) {
        const data = await res.json();
        setTrustees(data);
      }
    } catch (err) {
      console.error('Failed to fetch trustees', err);
    } finally {
      setLoading(false); // Set loading false
    }
  };

  const handleAddPerson = (person: any) => {
    if (!trustees.find(t => t.username === person.USER_ID)) {
      setTrustees([...trustees, { 
        username: person.USER_ID, 
        rights: 63, 
        flag: 2 
      }]);
    }
    setIsPersonSelectorOpen(false);
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
      onClose();
    } catch (error) {
      console.error(error);
      alert('Failed to update permissions');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 dark:text-blue-400">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <h2 className="text-lg font-semibold dark:text-white">
              {t('security_permissions')} - {itemName}
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
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('trustees_list')}
            </h3>
            <button
              onClick={() => setIsPersonSelectorOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 transition-colors text-sm font-medium"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="8.5" cy="7" r="4"></circle>
                <line x1="20" y1="8" x2="20" y2="14"></line>
                <line x1="23" y1="11" x2="17" y2="11"></line>
              </svg>
              {t('add_user')}
            </button>
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-medium">{t('user')}</th>
                  <th className="px-4 py-3 font-medium">{t('access_level')}</th>
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
                      {t('no_trustees_assigned')}
                    </td>
                  </tr>
                ) : (
                  trustees.map((trustee) => (
                    <tr key={trustee.username} className="bg-white dark:bg-gray-800">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                        {trustee.username}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={trustee.rights}
                          onChange={(e) => handleRightsChange(trustee.username, e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-0 text-gray-600 dark:text-gray-300 text-sm"
                        >
                          <option value="255">{t('full_control')}</option>
                          <option value="63">{t('read_write')}</option>
                          <option value="1">{t('read_only')}</option>
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
            {t('save_permissions')}
          </button>
        </div>
      </div>

      {isPersonSelectorOpen && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
             <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h3 className="font-medium dark:text-white">{t('select_person')}</h3>
                <button onClick={() => setIsPersonSelectorOpen(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
             </div>
             <div className="p-2 flex-1 overflow-y-auto">
               <PersonSelectorAny 
                  apiURL="/api"
                  value=""
                  onChange={() => {}} 
                  onSelect={handleAddPerson}
                  fetchUrl="/api/groups/search_members"
                  lang="en"
                  theme="light"
               />
             </div>
          </div>
        </div>
      )}
    </div>
  );
}