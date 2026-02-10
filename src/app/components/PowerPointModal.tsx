import React, { useState, useEffect } from 'react';
import { Document } from '../../models/Document';
import { TagEditor } from './TagEditor';
import DatePicker from 'react-datepicker';
import { ReadOnlyTagDisplay } from './ReadOnlyTagDisplay';
import { useDocumentMutations } from '../../hooks/useDocumentMutations';
import { useDownload } from '../../hooks/useDownload';
import { useDocumentContent } from '../../hooks/useDocumentContent';
import { CollapsibleSection } from './CollapsibleSection';
import JSZip from 'jszip';

import { PowerPointModalProps, SlideData } from '../../interfaces/PropsInterfaces';

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
  return `${year} -${month} -${day} ${hours}:${minutes}:${seconds} `;
};

export const PowerPointModal: React.FC<PowerPointModalProps> = ({ doc, onClose, apiURL, onUpdateAbstractSuccess, isEditor, t, lang, theme }) => {
  const [isDetailsVisible, setIsDetailsVisible] = useState(true);

  // Content State
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Metadata State
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [documentDate, setDocumentDate] = useState<Date | null>(safeParseDate(doc.date));
  const [initialDate, setInitialDate] = useState<Date | null>(safeParseDate(doc.date));

  const [isEditingAbstract, setIsEditingAbstract] = useState(false);
  const [abstract, setAbstract] = useState(doc.title || '');
  const [initialAbstract, setInitialAbstract] = useState(doc.title || '');

  const [isFavorite, setIsFavorite] = useState(doc.is_favorite);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const { download, isDownloading } = useDownload();

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
    setSlides([]);
    setThumbnailUrl(null);
    setParseError(null);

    setThumbnailUrl(null);
    setParseError(null);
  }, [doc.title, doc.date, doc.docname, doc.doc_id]);

  const { data: arrayBuffer, isLoading: isFetchingContent } = useDocumentContent(doc.doc_id, {
    responseType: 'arraybuffer',
    enabled: !!doc.doc_id
  });

  useEffect(() => {
    // Parse PPTX
    const parsePPTX = async () => {
      if (!arrayBuffer) return;
      setIsLoadingContent(true);
      try {
        const zip = await JSZip.loadAsync(arrayBuffer);

        // 1. Try to find a thumbnail
        // PowerPoint often stores a preview in docProps/thumbnail.jpeg
        const thumbFile = zip.file("docProps/thumbnail.jpeg");
        if (thumbFile) {
          const thumbBlob = await thumbFile.async("blob");
          const thumbUrl = URL.createObjectURL(thumbBlob);
          setThumbnailUrl(thumbUrl);
        }

        // 2. Extract Slides Text
        const slideFiles = Object.keys(zip.files).filter(fileName =>
          fileName.startsWith("ppt/slides/slide") && fileName.endsWith(".xml")
        );

        // Sort slides naturally (slide1, slide2, slide10...)
        slideFiles.sort((a, b) => {
          const numA = parseInt(a.replace(/\D/g, ''));
          const numB = parseInt(b.replace(/\D/g, ''));
          return numA - numB;
        });

        const extractedSlides: SlideData[] = [];

        for (let i = 0; i < slideFiles.length; i++) {
          const fileName = slideFiles[i];
          const xmlString = await zip.file(fileName)?.async("string");

          if (xmlString) {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, "text/xml");

            // Extract text from <a:t> tags (PowerPoint text runs)
            const textNodes = xmlDoc.getElementsByTagName("a:t");
            const slideContent: string[] = [];

            for (let j = 0; j < textNodes.length; j++) {
              const text = textNodes[j].textContent;
              if (text && text.trim().length > 0) {
                slideContent.push(text);
              }
            }

            if (slideContent.length > 0) {
              extractedSlides.push({
                id: i + 1,
                title: `Slide ${i + 1} `,
                content: slideContent
              });
            }
          }
        }

        setSlides(extractedSlides);
        if (extractedSlides.length === 0) {
          setParseError("No text content found in presentation.");
        }

      } catch (error) {
        console.error("Error parsing PPTX file:", error);
        setParseError("Could not preview this PowerPoint file. Please download to view.");
      } finally {
        setIsLoadingContent(false);
      }
    };

    parsePPTX();

    return () => {
      if (thumbnailUrl) URL.revokeObjectURL(thumbnailUrl);
    };

  }, [arrayBuffer]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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

  const { updateMetadata, toggleFavorite } = useDocumentMutations();

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
      await updateMetadata(payload);

      if (payload.abstract !== undefined) setInitialAbstract(payload.abstract);
      if (payload.date_taken !== undefined) setInitialDate(documentDate);

      setIsEditingDate(false);
      setIsEditingAbstract(false);
      onUpdateAbstractSuccess();
    } catch (err: any) {
      console.error("Error updating metadata", err);
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newFavoriteStatus = !isFavorite;
    setIsFavorite(newFavoriteStatus);

    try {
      await toggleFavorite({ docId: doc.doc_id, isFavorite: newFavoriteStatus });
    } catch (error) {
      setIsFavorite(!newFavoriteStatus);
    }
  };

  const handleDownload = () => {
    download({ docId: doc.doc_id, docname: doc.docname, apiURL });
  };

  const modalBg = theme === 'dark' ? 'bg-[#282828]' : 'bg-white';
  const textPrimary = theme === 'dark' ? 'text-gray-200' : 'text-gray-900';
  const closeButtonColor = theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-900';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 md:p-8" onClick={onClose}>
      <div className={`${modalBg} ${textPrimary} rounded - xl w - full max - w - 6xl h - [90vh] flex flex - col`} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="pt-6 pr-6 pl-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-start top-0 z-20 bg-inherit rounded-t-xl">

          {/* Left: Favorite & Title */}
          <div className="flex items-start gap-3 flex-grow min-w-0">
            <button
              onClick={handleToggleFavorite}
              className="text-gray-600 dark:text-white hover:text-yellow-400 p-1 flex-shrink-0 mt-0.5"
              title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <svg className={`w - 6 h - 6 ${isFavorite ? 'text-yellow-400' : 'text-gray-400 dark:text-gray-300'} `} fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isFavorite ? 1 : 2} d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01 .321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5Z" />
              </svg>
            </button>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white break-words pt-1 mt-0.5">
              {doc.docname.replace(/\.[^/.]+$/, "")}
              <span className="ml-2 text-sm font-normal text-gray-400">File preview</span>
            </h2>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            <button onClick={handleDownload} disabled={isDownloading} className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors" title="Download">
              {isDownloading ? (
                <div className="w-6 h-6 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <img src="/download.svg" alt="Download" className="w-6 h-6 dark:invert" />
              )}
            </button>

            <button
              onClick={() => setIsDetailsVisible(!isDetailsVisible)}
              className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
              title={isDetailsVisible ? "Hide Details" : "Show Details"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            <button onClick={onClose} className={`p - 2 rounded - full hover: bg - gray - 100 dark: hover: bg - gray - 700 transition - colors ml - 2 ${closeButtonColor} `}>
              <span className="text-3xl leading-none">&times;</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className={`flex - grow p - 4 grid ${isDetailsVisible ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1'} gap - 4 min - h - 0 transition - all duration - 300`}>

          {/* Main Viewer (PowerPoint Text) */}
          <div className={`md: col - span - 2 col - span - 1 h - full bg - white dark: bg - [#1a1a1a] rounded - lg flex flex - col relative overflow - hidden border border - gray - 200 dark: border - gray - 700`}>

            {isFetchingContent || isLoadingContent ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                <span className="text-gray-500">Parsing presentation...</span>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                {/* Header with thumbnail if available */}
                <div className="bg-orange-50 dark:bg-orange-900/10 p-4 border-b border-orange-100 dark:border-orange-900/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white dark:bg-[#252525] rounded-lg shadow-sm">
                      <img src="/file-document.svg" className="w-6 h-6" style={{ filter: 'invert(52%) sepia(87%) saturate(2336%) hue-rotate(349deg) brightness(98%) contrast(96%)' }} alt="" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 dark:text-gray-200">Presentation Content</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{slides.length} slides detected</p>
                    </div>
                  </div>
                  {thumbnailUrl && (
                    <div className="h-16 w-24 bg-gray-200 rounded overflow-hidden shadow-sm border border-gray-300 dark:border-gray-600">
                      <img src={thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                {/* Slides Scroll Area */}
                <div className="flex-grow overflow-y-auto p-6 space-y-8 bg-gray-50 dark:bg-[#121212]">
                  {parseError ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8">
                      <p className="text-gray-500 mb-4">{parseError}</p>
                      <button onClick={handleDownload} className="text-blue-600 hover:underline text-sm">Download File to View</button>
                    </div>
                  ) : (
                    slides.map((slide) => (
                      <div key={slide.id} className="bg-white dark:bg-[#1e1e1e] p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">
                          <h4 className="font-bold text-lg text-orange-600 dark:text-orange-400">Slide {slide.id}</h4>
                        </div>
                        <div className="space-y-3">
                          {slide.content.map((text, idx) => (
                            <p key={idx} className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm">
                              {text}
                            </p>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                  {slides.length === 0 && !parseError && (
                    <div className="text-center text-gray-400 py-10">Empty Presentation</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Details Panel */}
          <div className={`transition - all duration - 300 ${isDetailsVisible ? 'md:col-span-1 opacity-100' : 'hidden opacity-0'} p - 4 bg - gray - 50 dark: bg - [#1f1f1f] rounded - lg overflow - y - auto`}>
            {/* Abstract Section */}
            {(isEditor || abstract) && (
              <div className="mb-4">
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">{t('aiDescription')}</h3>
                {isEditor ? (
                  isEditingAbstract ? (
                    <div className="flex flex-col gap-2">
                      <textarea
                        value={abstract}
                        onChange={(e) => setAbstract(e.target.value)}
                        className="w-full h-24 px-3 py-2 bg-white dark:bg-[#121212] text-gray-900 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-red-500 focus:outline-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button onClick={handleUpdateMetadata} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">{t('save')}</button>
                        <button onClick={handleCancelEditAbstract} className="px-4 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700">{t('cancel')}</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 pr-4">{abstract || t('noAbstract')}</p>
                      <button onClick={handleEditAbstract} className="px-4 py-1 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white text-xs rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 flex-shrink-0">{t('edit')}</button>
                    </div>
                  )
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 pr-4">{abstract}</p>
                )}
              </div>
            )}
            <div className="mb-4">
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">{t('dateTaken')}</h3>
              {isEditor ? (
                isEditingDate ? (
                  <div className="flex items-center gap-2">
                    <DatePicker
                      selected={documentDate}
                      onChange={handleDateChange}
                      dateFormat="dd/MM/yyyy"
                      className="w-full px-3 py-2 bg-white dark:bg-[#121212] text-gray-900 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-red-500 focus:outline-none"
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
                    <p className="text-sm text-gray-600 dark:text-gray-400 p-2 flex-grow">
                      {documentDate ? documentDate.toLocaleDateString('en-GB') : t('noDateSet')}
                    </p>
                    <button onClick={handleEditDate} className="px-4 py-1 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white text-xs rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 flex-shrink-0">{t('edit')}</button>
                  </div>
                )
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400 p-2 flex-grow">
                  {documentDate ? documentDate.toLocaleDateString('en-GB') : t('noDateSet')}
                </p>
              )}
            </div>

            <CollapsibleSection title={t('tags')} theme={theme}>
              {isEditor ? (
                <TagEditor docId={doc.doc_id} apiURL={apiURL} lang={lang} theme={theme} t={t} />
              ) : (
                <ReadOnlyTagDisplay docId={doc.doc_id} apiURL={apiURL} lang={lang} t={t} />
              )}
            </CollapsibleSection>
          </div>
        </div>
      </div>
    </div>
  );
};