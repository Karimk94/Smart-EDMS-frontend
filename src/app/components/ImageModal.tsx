import React, { useState, useEffect, useRef } from 'react';
import { Document } from '../../models/Document';
import { AnalysisView } from './AnalysisView';
import { TagEditor } from './TagEditor';
import { CollapsibleSection } from './CollapsibleSection';
import DatePicker from 'react-datepicker';
import { ReadOnlyTagDisplay } from './ReadOnlyTagDisplay';

interface ImageModalProps {
  doc: Document;
  onClose: () => void;
  apiURL: string;
  onUpdateAbstractSuccess: () => void;
  onToggleFavorite: (docId: number, isFavorite: boolean) => void;
  isEditor: boolean;
  t: Function;
  lang: 'en' | 'ar';
  theme: 'light' | 'dark';
}

const safeParseDate = (dateString: string): Date | null => {
  if (!dateString || dateString === "N/A") return null;
  const dateTimeParts = dateString.split(' ');
  if (dateTimeParts.length === 2) {
    const dateParts = dateTimeParts[0].split('-');
    const timeParts = dateTimeParts[1].split(':');
    if (dateParts.length === 3 && timeParts.length === 3) {
      const year = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1;
      const day = parseInt(dateParts[2], 10);
      const hours = parseInt(timeParts[0], 10);
      const minutes = parseInt(timeParts[1], 10);
      const seconds = parseInt(timeParts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day) && !isNaN(hours) && !isNaN(minutes) && !isNaN(seconds)) {
        const date = new Date(year, month, day, hours, minutes, seconds);
        if (!isNaN(date.getTime())) return date;
      }
    }
  }
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
};


const formatToApiDate = (date: Date | null): string | null => {
  if (!date) return null;
  const pad = (num: number) => num.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

export const ImageModal: React.FC<ImageModalProps> = ({ doc, onClose, apiURL, onUpdateAbstractSuccess, onToggleFavorite, isEditor, t, lang, theme }) => {
  const [view, setView] = useState<'image' | 'analysis'>('image');
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const originalImageBlob = useRef<Blob | null>(null);

  const [isEditingDate, setIsEditingDate] = useState(false);
  const [documentDate, setDocumentDate] = useState<Date | null>(safeParseDate(doc.date));
  const [initialDate, setInitialDate] = useState<Date | null>(safeParseDate(doc.date));

  const [isEditingAbstract, setIsEditingAbstract] = useState(false);
  const [abstract, setAbstract] = useState(doc.title || '');
  const [initialAbstract, setInitialAbstract] = useState(doc.title || '');

  const [isFavorite, setIsFavorite] = useState(doc.is_favorite);

  useEffect(() => {
    const fetchImage = async () => {
      setIsLoading(true);
      setError(null);
      setView('image');
      setAnalysisResult(null);
      originalImageBlob.current = null;
      if (imageSrc) {
        URL.revokeObjectURL(imageSrc);
        setImageSrc(null);
      }
      try {
        const response = await fetch(`${apiURL}/image/${doc.doc_id}`);
        if (!response.ok) throw new Error('Image not found in EDMS.');
        const blob = await response.blob();
        originalImageBlob.current = blob;
        setImageSrc(URL.createObjectURL(blob));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchImage();

    return () => {
      if (imageSrc) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [doc.doc_id, apiURL]);

  useEffect(() => {
    setIsFavorite(doc.is_favorite);
  }, [doc.is_favorite]);

  useEffect(() => {
    setAbstract(doc.title || '');
    setInitialAbstract(doc.title || '');
    const newDate = safeParseDate(doc.date);
    setDocumentDate(newDate);
    setInitialDate(newDate);
    setIsEditingAbstract(false);
    setIsEditingDate(false);
  }, [doc.title, doc.date]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleAnalyze = async () => {
    if (!originalImageBlob.current) return;
    setIsAnalyzing(true);
    setError(null);
    const formData = new FormData();
    formData.append('image_file', originalImageBlob.current, `${doc.doc_id}.jpg`);

    try {
      const response = await fetch(`${apiURL}/analyze_image`, { method: 'POST', body: formData });
      if (!response.ok) throw new Error((await response.json()).error || 'Analysis failed.');
      setAnalysisResult(await response.json());
      setView('analysis');
    } catch (err: any) {
      setError(`Face Service Error: ${err.message}`);
      setView('image');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDateChange = (date: Date | null) => {
    setDocumentDate(date);
  };

  const handleEditDate = () => {
    setInitialDate(documentDate);
    setIsEditingDate(true);
  };

  const handleCancelEditDate = () => {
    setDocumentDate(initialDate);
    setIsEditingDate(false);
  };

  const handleEditAbstract = () => {
    setInitialAbstract(abstract);
    setIsEditingAbstract(true);
  };

  const handleCancelEditAbstract = () => {
    setAbstract(initialAbstract);
    setIsEditingAbstract(false);
  };

  const handleUpdateMetadata = async () => {
    const payload: { doc_id: number; abstract?: string; date_taken?: string | null } = {
      doc_id: doc.doc_id,
    };
    let needsUpdate = false;

    if (isEditingAbstract && abstract !== initialAbstract) {
      payload.abstract = abstract;
      needsUpdate = true;
    }
    if (isEditingDate) {
      const formattedNewDate = formatToApiDate(documentDate);
      const formattedInitialDate = formatToApiDate(initialDate);
      if (formattedNewDate !== formattedInitialDate) {
        payload.date_taken = formattedNewDate;
        needsUpdate = true;
      }
    }

    if (!needsUpdate) {
      setIsEditingDate(false);
      setIsEditingAbstract(false);
      return;
    }

    try {
      const response = await fetch(`${apiURL}/update_metadata`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Failed to update metadata');
      const resultMessage = await response.json();

      if (payload.abstract !== undefined) setInitialAbstract(payload.abstract);
      if (payload.date_taken !== undefined) setInitialDate(documentDate);

      setIsEditingDate(false);
      setIsEditingAbstract(false);
      onUpdateAbstractSuccess();
    } catch (err: any) {
    }
  };

  const handleToggleFavorite = () => {
    const newFavoriteStatus = !isFavorite;
    setIsFavorite(newFavoriteStatus);
    onToggleFavorite(doc.doc_id, newFavoriteStatus);
  };

  const handleDownload = () => {
    window.open(`${apiURL}/download_watermarked/${doc.doc_id}`, '_blank');
  };

  const modalBg = theme === 'dark' ? 'bg-[#282828]' : 'bg-white';
  const textPrimary = theme === 'dark' ? 'text-gray-200' : 'text-gray-900';
  const textSecondary = theme === 'dark' ? 'text-gray-300' : 'text-gray-700';
  const textMuted = theme === 'dark' ? 'text-gray-400' : 'text-gray-600';
  const textHeader = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const inputBg = theme === 'dark' ? 'bg-[#121212]' : 'bg-white';
  const borderSecondary = theme === 'dark' ? 'border-gray-600' : 'border-gray-300';
  const buttonBg = theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200';
  const buttonHoverBg = theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-300';
  const buttonText = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const imageContainerBg = theme === 'dark' ? 'bg-black' : 'bg-gray-100';


  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className={`${modalBg} ${textPrimary} rounded-xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden`} onClick={e => e.stopPropagation()}>

        {/* --- Header --- */}
        <div className="flex flex-row items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-inherit z-10 flex-shrink-0">
          <div className="flex flex-row items-center gap-3 min-w-0 overflow-hidden">
            {/* Favorite Button */}
            <button
              onClick={handleToggleFavorite}
              className="flex-shrink-0 p-1.5 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <svg className={`w-5 h-5 ${isFavorite ? 'text-yellow-400 fill-current' : 'text-gray-400 dark:text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isFavorite ? 0 : 2} d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01 .321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5Z" />
              </svg>
            </button>
            {/* Title */}
            <h2 className={`text-lg md:text-xl font-bold ${textHeader} m-0`} title={doc.docname.replace(/\.[^/.]+$/, "")}>{doc.docname.replace(/\.[^/.]+$/, "")}</h2>
          </div>

          {/* Actions Group */}
          <div className="flex flex-row items-center gap-2 flex-shrink-0 ml-4">
            <button
              onClick={handleDownload}
              className="flex items-center justify-center p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              title="Download"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M12 12.75l-3-3m3 3 3-3m-3 3V3" />
              </svg>
            </button>
            <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors text-2xl leading-none rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
              &times;
            </button>
          </div>
        </div>
        {/* --- End Header --- */}

        <div className="p-6 overflow-y-auto flex-grow">
          {isLoading && (
            <div className="flex flex-col justify-center items-center h-64 gap-4">
              <div className="w-full h-48 skeleton-loader rounded-lg"></div>
              <div className="w-3/4 h-6 skeleton-loader rounded"></div>
              <div className="w-1/2 h-4 skeleton-loader rounded"></div>
            </div>
          )}
          {error && <p className="text-center p-10 text-red-400">{error}</p>}

          {view === 'image' && imageSrc && !error && (
            <div>
              <div className={`text-center ${imageContainerBg} rounded-lg flex items-center justify-center min-h-[40vh]`}>
                <img src={imageSrc}
                  alt={doc.docname.replace(/\.[^/.]+$/, "")}
                  className="max-w-full max-h-[60vh] mx-auto rounded-lg object-contain"
                  draggable={false} />
              </div>
              <div className="mt-4">
                <CollapsibleSection title={t('details')} theme={theme}>
                  {/* Abstract Section */}
                  {(isEditor || abstract) && (
                    <div className="mb-4">
                      <h3 className={`font-semibold ${textSecondary} mb-1`}>{t('aiDescription')}</h3>
                      {isEditor ? (
                        isEditingAbstract ? (
                          <div className="flex flex-col gap-2">
                            <textarea
                              value={abstract}
                              onChange={(e) => setAbstract(e.target.value)}
                              className={`w-full h-24 px-3 py-2 ${inputBg} ${textPrimary} border ${borderSecondary} rounded-md focus:ring-2 focus:ring-red-500 focus:outline-none`}
                            />
                            <div className="flex justify-end gap-2">
                              <button onClick={handleUpdateMetadata} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">{t('save')}</button>
                              <button onClick={handleCancelEditAbstract} className="px-4 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700">{t('cancel')}</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between">
                            <p className={`text-sm ${textMuted} mt-1 pr-4`}>{abstract || t('noAbstract')}</p>
                            <button onClick={handleEditAbstract} className={`px-4 py-1 ${buttonBg} ${buttonText} text-xs rounded-md ${buttonHoverBg} flex-shrink-0`}>{t('edit')}</button>
                          </div>
                        )
                      ) : (
                        <p className={`text-sm ${textMuted} mt-1 pr-4`}>{abstract}</p>
                      )}
                    </div>
                  )}

                  {/* Date Taken Section */}
                  <div className="mb-4">
                    <h3 className={`font-semibold ${textSecondary} mb-1`}>{t('dateTaken')}</h3>
                    {isEditor ? (
                      isEditingDate ? (
                        <div className="flex items-center gap-2">
                          <DatePicker
                            selected={documentDate}
                            onChange={handleDateChange}
                            dateFormat="dd/MM/yyyy"
                            className={`w-full px-3 py-2 ${inputBg} ${textPrimary} border ${borderSecondary} rounded-md focus:ring-2 focus:ring-red-500 focus:outline-none`}
                            wrapperClassName="w-full"
                            isClearable
                            placeholderText="Click to select date"
                            autoComplete='off'
                            locale="en-GB"
                          />
                          <button onClick={handleUpdateMetadata} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 flex-shrink-0">{t('save')}</button>
                          <button onClick={handleCancelEditDate} className="px-4 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 flex-shrink-0">{t('cancel')}</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className={`text-sm ${textMuted} p-2 flex-grow`}>
                            {documentDate ? documentDate.toLocaleDateString('en-GB') : t('noDateSet')}
                          </p>
                          <button onClick={handleEditDate} className={`px-4 py-1 ${buttonBg} ${buttonText} text-xs rounded-md ${buttonHoverBg} flex-shrink-0`}>{t('edit')}</button>
                        </div>
                      )
                    ) : (
                      <p className={`text-sm ${textMuted} p-2 flex-grow`}>
                        {documentDate ? documentDate.toLocaleDateString('en-GB') : t('noDateSet')}
                      </p>
                    )}
                  </div>

                  {isEditor ? (
                    <TagEditor docId={doc.doc_id} apiURL={apiURL} lang={lang} theme={theme} t={t} />
                  ) : (
                    <ReadOnlyTagDisplay docId={doc.doc_id} apiURL={apiURL} lang={lang} t={t} />
                  )}
                </CollapsibleSection>
              </div>
              {doc.media_type === 'image' && isEditor && (
                <div className="text-center">
                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="mt-6 px-8 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition w-64 h-14 flex items-center justify-center mx-auto disabled:bg-red-800 disabled:cursor-not-allowed"
                  >
                    {isAnalyzing ? (
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      t('analyzeForFaces')
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {view === 'analysis' && analysisResult && !error && isEditor && (
            <AnalysisView
              result={analysisResult}
              docId={doc.doc_id}
              apiURL={apiURL}
              onUpdateAbstractSuccess={() => {
                onUpdateAbstractSuccess();
                setView('image');
                setAnalysisResult(null);
                setError(null);
              }}
              lang={lang}
              theme={theme}
            />
          )}
        </div>
      </div>
    </div>
  );
};