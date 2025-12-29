import React, { useState, useEffect } from 'react';
import { PersonSelector } from './PersonSelector';
import { useToast } from '../context/ToastContext';

interface AnalysisViewProps {
  result: any;
  docId: number;
  apiURL: string;
  onUpdateAbstractSuccess: () => void;
  lang: 'en' | 'ar';
  theme: 'light' | 'dark';
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({ result, docId, apiURL, onUpdateAbstractSuccess, lang, theme }) => {
  const [faceNames, setFaceNames] = useState<{ [key: number]: string }>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [savingFaceIndex, setSavingFaceIndex] = useState<number | null>(null);
  const { showToast } = useToast();

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    if (result?.faces) {
      const initialNames: { [key: number]: string } = {};
      result.faces.forEach((face: any) => {
        if (face.name && face.name !== 'Unknown') {
          initialNames[face.index] = face.name.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase());
        }
      });
      setFaceNames(initialNames);
    }
  }, [result]);

  const handleNameChange = (index: number, name: string) => {
    setFaceNames(prev => ({ ...prev, [index]: name }));
  };

  const handleRemoveName = (faceIndexToRemove: number) => {
    setFaceNames(prev => {
      const newFaceNames = { ...prev };
      delete newFaceNames[faceIndexToRemove];
      return newFaceNames;
    });
  };

  const handleSaveFace = async (face: any) => {
    const name = faceNames[face.index];
    if (!name || name.trim() === '') {
      showToast('Please enter a name for this face first.', 'warning');
      return;
    }
    setSavingFaceIndex(face.index);
    try {
      await fetch(`${apiURL}/add_face`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          location: face.location,
          original_image_b64: result.original_image_b64,
        }),
      });
      showToast(`Successfully saved "${name.trim()}" to the known faces database.`, 'success');

      await fetch(`${apiURL}/add_person`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), lang: lang }),
      });

    } catch (error: any) {
      showToast(`Error: ${error.message}`, 'error');
    } finally {
      setSavingFaceIndex(null);
    }
  };
  
  const confirmedNames = Object.entries(faceNames).filter(([_, name]) => name && name.trim() !== '');

  const handleUpdateAbstractClick = () => {
    const namesToSave = confirmedNames.map(([_, name]) => name.trim());
    if (namesToSave.length === 0) {
        showToast("No confirmed names to update.", 'warning');
        return;
    }
    setIsConfirmOpen(true);
  };

  const confirmUpdateAbstract = async () => {
    setIsConfirmOpen(false);
    const namesToSave = confirmedNames.map(([_, name]) => name.trim());
    
    setIsUpdating(true);
    try {
      const response = await fetch(`${apiURL}/update_abstract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc_id: docId, names: namesToSave }),
      });
      if (!response.ok) throw new Error((await response.json()).error);
      
      showToast('Title updated successfully', 'success');
      onUpdateAbstractSuccess();
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const headerColor = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const bgColor = theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-gray-100';
  const subTextColor = theme === 'dark' ? 'text-gray-300' : 'text-gray-700';
  const mutedTextColor = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  const borderColor = theme === 'dark' ? 'border-gray-700' : 'border-gray-200';

  return (
    <div className="space-y-6 p-4 overflow-y-auto h-full relative">
      <img src={`data:image/jpeg;base64,${result.processed_image}`} alt="Processed" className="rounded-lg mx-auto max-w-full" />
      
      <div className="space-y-4">
        <h3 className={`font-bold text-lg ${headerColor}`}>Detected Faces</h3>
        {result.faces?.length > 0 ? (
          result.faces.map((face: any) => (
            <div key={face.index} className={`p-3 ${bgColor} rounded-lg`}>
              <div className="grid grid-cols-[auto,1fr,auto] gap-4 items-center">
                <div className="flex items-center gap-2">
                  {face.thumbnail_b64 && (
                    <img
                      src={`data:image/jpeg;base64,${face.thumbnail_b64}`}
                      alt={`Face #${face.index}`}
                      className="w-16 h-16 rounded-md object-cover"
                    />
                  )}
                  <label className={`font-semibold ${subTextColor}`}>Face #{face.index}</label>
                </div>
                
                <PersonSelector
                  apiURL={apiURL}
                  value={faceNames[face.index] || ''}
                  onChange={(name) => handleNameChange(face.index, name)}
                  lang={lang}
                  theme={theme}
                />

                <button 
                  onClick={() => handleSaveFace(face)}
                  disabled={savingFaceIndex === face.index}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 transition disabled:bg-blue-800 flex items-center justify-center w-24"
                >
                  {savingFaceIndex === face.index ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    'Save Face'
                  )}
                </button>
              </div>
              {face.distance !== null && face.name !== 'Unknown' && (
                <div className={`mt-2 text-right text-xs ${mutedTextColor}`}>
                  Match Distance: <span className="font-mono text-green-400">{face.distance?.toFixed(4)}</span> (lower is better)
                </div>
              )}
            </div>
          ))
        ) : <p className={`${mutedTextColor}`}>No faces were detected in this image.</p>}
      </div>

      {confirmedNames.length > 0 && (
        <div className={`p-4 ${bgColor} rounded-lg`}>
          <h4 className={`font-semibold ${subTextColor} mb-2`}>Confirmed VIPs to be Saved to title:</h4>
          <div className="flex flex-wrap gap-2">
            {confirmedNames.map(([index, name]) => (
              <span key={index} className="flex items-center px-3 py-1 bg-green-600 text-white text-sm font-medium rounded-full">
                {name}
                <button 
                  onClick={() => handleRemoveName(parseInt(index, 10))}
                  className="ml-2 -mr-1 p-0.5 rounded-full hover:bg-green-700 focus:outline-none"
                  aria-label={`Remove ${name}`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className={`pt-4 border-t ${borderColor}`}>
        <button 
          onClick={handleUpdateAbstractClick}
          disabled={confirmedNames.length === 0 || isUpdating}
          className="w-full py-3 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-600 transition disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isUpdating ? (
             <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
          ) : (
            'Save Confirmed Names to Title'
          )}
        </button>
      </div>

      {isConfirmOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`bg-white dark:bg-[#333] rounded-lg p-6 max-w-sm w-full shadow-xl border ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}>
                <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Confirm Update</h3>
                <p className={`mb-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    Update title with: <span className="font-semibold">{confirmedNames.map(([_, name]) => name.trim()).join(', ')}</span>?
                </p>
                <div className="flex justify-end gap-3">
                    <button 
                        onClick={() => setIsConfirmOpen(false)}
                        className={`px-4 py-2 rounded ${theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} transition-colors`}
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={confirmUpdateAbstract}
                        className="px-4 py-2 bg-yellow-500 text-black font-semibold rounded hover:bg-yellow-600 transition-colors"
                    >
                        Yes, Update
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};