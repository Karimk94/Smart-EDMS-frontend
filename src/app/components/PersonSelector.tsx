import React, { useState } from 'react';
import { AsyncPaginate } from 'react-select-async-paginate';
import Creatable from 'react-select/creatable';
import { GroupBase, OptionsOrGroups } from 'react-select';
import { PersonOption } from '../../models/PersonOption';

const AnyAsyncPaginate: any = AsyncPaginate;

import { PersonSelectorProps } from '../../interfaces/PropsInterfaces';

const getSelectStyles = (theme: 'light' | 'dark') => ({
  control: (base: any) => ({
    ...base,
    backgroundColor: theme === 'dark' ? 'var(--color-bg-input)' : 'white',
    borderColor: theme === 'dark' ? 'var(--color-border-secondary)' : 'var(--color-border-secondary)',
    minHeight: '38px',
    height: '38px',
    boxShadow: 'none',
    '&:hover': {
      borderColor: theme === 'dark' ? 'var(--color-border-primary)' : 'var(--color-border-primary)',
    }
  }),
  menuPortal: (base: any) => ({ ...base, zIndex: 99999 }),
  menu: (base: any) => ({
    ...base,
    backgroundColor: theme === 'dark' ? 'var(--color-bg-tertiary)' : 'var(--color-bg-modal)'
  }),
  option: (base: any, { isFocused }: any) => ({
    ...base,
    backgroundColor: isFocused ? (theme === 'dark' ? 'var(--color-border-secondary)' : 'var(--color-bg-secondary)') : (theme === 'dark' ? 'var(--color-bg-tertiary)' : 'var(--color-bg-modal)'),
    color: 'var(--color-text-primary)',
    padding: '8px 12px'
  }),
  singleValue: (base: any) => ({ ...base, color: 'var(--color-text-primary)' }),
  input: (base: any) => ({ ...base, color: 'var(--color-text-primary)', margin: '0px' }),
  valueContainer: (base: any) => ({ ...base, padding: '0 6px' }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: (base: any) => ({ ...base, padding: '4px', color: 'var(--color-text-muted)' }),
  clearIndicator: (base: any) => ({ ...base, padding: '4px', color: 'var(--color-text-muted)' }),
  placeholder: (base: any) => ({ ...base, color: 'var(--color-text-muted)' }),
});

export const PersonSelector: React.FC<PersonSelectorProps> = ({ apiURL, value, onChange, lang, theme, fetchUrl, headers, onSelect }) => {

  const selectStyles = getSelectStyles(theme);
  const [selectedGroup, setSelectedGroup] = useState<{ id: string, name: string } | null>(null);

  const loadPersonOptions = async (
    search: string,
    loadedOptions: OptionsOrGroups<PersonOption, GroupBase<PersonOption>>,
    additional: { page: number } | undefined
  ): Promise<{ options: any[]; hasMore: boolean; additional?: { page: number } }> => {

    if (!selectedGroup) {
      try {
        const response = await fetch(`${apiURL}/groups`, {
          headers: headers || { 'X-Session-ID': localStorage.getItem('dms_session') || '' }
        });
        if (!response.ok) throw new Error('Failed to fetch groups');
        const groups = await response.json();

        const filtered = groups.filter((g: any) =>
          g.group_name.toLowerCase().includes(search.toLowerCase())
        );

        const groupOptions = filtered.map((g: any) => ({
          value: g.group_id,
          label: `📁 ${g.group_name}`,
          type: 'group',
          fullData: g
        }));

        return { options: groupOptions, hasMore: false, additional: undefined };
      } catch (error) {
        console.error("Error loading groups:", error);
        return { options: [], hasMore: false };
      }
    }

    const page = additional?.page || 1;
    const url = `${apiURL}/groups/search_members?page=${page}&search=${encodeURIComponent(search)}&group_id=${selectedGroup.id}`;

    try {
      const response = await fetch(url, {
        headers: headers || (fetchUrl ? { 'X-Session-ID': localStorage.getItem('dms_session') || '' } : {})
      });
      if (!response.ok) throw new Error('Failed to fetch persons');
      const data = await response.json();

      const options = data.options.map((person: any) => {
        const label = (lang === 'ar' && person.name_arabic)
          ? `${person.name_arabic} - ${person.name_english}`
          : `${person.name_english}${person.name_arabic ? ` - ${person.name_arabic}` : ''}`;

        const val = (lang === 'ar' && person.name_arabic) ? person.name_arabic : person.name_english;

        return {
          value: val,
          label,
          type: 'person',
          fullData: { USER_ID: person.user_id || person.name_english, FULL_NAME: person.name_english }
        };
      });

      return {
        options: options,
        hasMore: data.hasMore,
        additional: data.hasMore ? { page: page + 1 } : undefined,
      };
    } catch (error) {
      console.error("Error loading person options:", error);
      return { options: [], hasMore: false };
    }
  };

  const handleChange = (newValue: any | null) => {
    if (newValue) {
      if (newValue.type === 'group') {
        setSelectedGroup({ id: newValue.value, name: newValue.label });
        return;
      }

      onChange(newValue.value);
      if (onSelect && newValue.fullData) {
        onSelect(newValue.fullData);
      }
    } else {
      onChange('');
    }
  };

  const handleCreate = (inputValue: string) => {
    const trimmedName = inputValue.trim();
    if (trimmedName) {
      onChange(trimmedName);
    }
  };

  const currentOption = value ? { value: value, label: value } : null;

  return (
    <div>
      {selectedGroup && (
        <div
          className="flex items-center gap-2 mb-1 px-1 text-sm text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
          onClick={() => setSelectedGroup(null)}
        >
          <span>← Back to Groups</span>
          <span className="text-gray-500 dark:text-gray-400">/ {selectedGroup.name.replace('📁 ', '')}</span>
        </div>
      )}

      <AnyAsyncPaginate
        SelectComponent={Creatable}
        isClearable
        key={selectedGroup ? `members-${selectedGroup.id}` : 'groups'}
        value={!selectedGroup ? null : currentOption}
        loadOptions={loadPersonOptions}
        onChange={handleChange}
        onCreateOption={handleCreate}
        getNewOptionData={(inputValue: string) => ({ value: inputValue, label: inputValue })}
        formatCreateLabel={(inputValue: string) => `Create "${inputValue}"`}
        placeholder={selectedGroup ? "Search person..." : "Select a group..."}
        debounceTimeout={300}
        additional={{
          page: 1,
        }}
        styles={selectStyles}
        menuPlacement="auto"
        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
      />
    </div>
  );
};