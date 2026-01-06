'use client';

import React, { useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '../../context/ToastContext';
import { useTranslations } from '../../hooks/useTranslations';
import { enGB } from 'date-fns/locale/en-GB';
import { registerLocale } from 'react-datepicker';
import HtmlLangUpdater from '../../components/HtmlLangUpdater';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';

registerLocale('en-GB', enGB);

interface SlideData {
  id: number;
  title: string;
  content: string[];
}

export default function SharedDocumentPage() {
  const params = useParams();
  const token = params.token as string;
  
  // Language State
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const t = useTranslations(lang);
  const { showToast } = useToast();

  // Flow State
  const [step, setStep] = useState<'email_input' | 'otp_input' | 'success'>('email_input');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [documentData, setDocumentData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // File URL for displaying/downloading the actual file
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('document');
  const [fileType, setFileType] = useState<string>('application/octet-stream');

  // Excel State
  const [excelData, setExcelData] = useState<any[][]>([]);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [isLoadingExcel, setIsLoadingExcel] = useState(false);
  const workbookRef = useRef<XLSX.WorkBook | null>(null);

  // PowerPoint State
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [pptThumbnailUrl, setPptThumbnailUrl] = useState<string | null>(null);
  const [isLoadingPpt, setIsLoadingPpt] = useState(false);
  const [pptParseError, setPptParseError] = useState<string | null>(null);

  // Toggle Language Helper
  const toggleLanguage = () => {
    setLang(prev => prev === 'en' ? 'ar' : 'en');
  };

  // Helper to safely parse JSON response
  const parseResponse = async (response: Response) => {
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      if (!response.ok) {
         return { detail: text || response.statusText };
      }
      throw new Error("Invalid server response format");
    }
  };

  // File type detection helpers
  const getFileExtension = (name: string): string => {
    return name.split('.').pop()?.toLowerCase() || '';
  };

  const isImage = (mimeType: string) => mimeType.startsWith('image/');
  const isPdf = (mimeType: string) => mimeType === 'application/pdf';
  const isVideo = (mimeType: string) => mimeType.startsWith('video/');
  
  const isExcel = (mimeType: string, name: string): boolean => {
    const ext = getFileExtension(name);
    const excelMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/vnd.oasis.opendocument.spreadsheet'
    ];
    const excelExts = ['xls', 'xlsx', 'xlsm', 'ods'];
    return excelMimes.includes(mimeType) || excelExts.includes(ext);
  };

  const isPowerPoint = (mimeType: string, name: string): boolean => {
    const ext = getFileExtension(name);
    const pptMimes = [
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint',
      'application/vnd.oasis.opendocument.presentation'
    ];
    const pptExts = ['ppt', 'pptx', 'pps', 'ppsx', 'odp'];
    return pptMimes.includes(mimeType) || pptExts.includes(ext);
  };

  const isText = (mimeType: string, name: string): boolean => {
    const ext = getFileExtension(name);
    const textExts = ['txt', 'csv', 'json', 'xml', 'log', 'md', 'yml', 'yaml', 'ini', 'conf'];
    return mimeType.startsWith('text/') || textExts.includes(ext);
  };

  const isPreviewable = (mimeType: string, name: string): boolean => {
    return isImage(mimeType) || 
           isPdf(mimeType) || 
           isVideo(mimeType) || 
           isExcel(mimeType, name) || 
           isPowerPoint(mimeType, name) ||
           isText(mimeType, name);
  };

  // Excel parsing function
  const parseExcelFile = async (blob: Blob) => {
    setIsLoadingExcel(true);
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      workbookRef.current = workbook;
      
      setSheetNames(workbook.SheetNames);
      if (workbook.SheetNames.length > 0) {
        const firstSheet = workbook.SheetNames[0];
        setActiveSheet(firstSheet);
        const worksheet = workbook.Sheets[firstSheet];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        setExcelData(jsonData as any[][]);
      }
    } catch (error) {
      console.error("Error parsing Excel file:", error);
    } finally {
      setIsLoadingExcel(false);
    }
  };

  const handleSheetChange = (sheetName: string) => {
    if (workbookRef.current) {
      setActiveSheet(sheetName);
      const worksheet = workbookRef.current.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      setExcelData(jsonData as any[][]);
    }
  };

  // PowerPoint parsing function
  const parsePowerPointFile = async (blob: Blob) => {
    setIsLoadingPpt(true);
    setPptParseError(null);
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      
      // Try to find a thumbnail
      const thumbFile = zip.file("docProps/thumbnail.jpeg");
      if (thumbFile) {
        const thumbBlob = await thumbFile.async("blob");
        const thumbUrl = URL.createObjectURL(thumbBlob);
        setPptThumbnailUrl(thumbUrl);
      }

      // Extract Slides Text
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
        const slideFileName = slideFiles[i];
        const xmlString = await zip.file(slideFileName)?.async("string");
        
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
              title: `Slide ${i + 1}`,
              content: slideContent
            });
          }
        }
      }
      
      setSlides(extractedSlides);
      if (extractedSlides.length === 0) {
        setPptParseError("No text content found in presentation.");
      }

    } catch (error) {
      console.error("Error parsing PPTX file:", error);
      setPptParseError("Could not preview this PowerPoint file. Please download to view.");
    } finally {
      setIsLoadingPpt(false);
    }
  };

  // Step 1: Request OTP
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/share/request-access/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viewer_email: email })
      });

      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(data.detail || data.error || t('FailedRequestOtp'));
      }

      setStep('otp_input');
      setStatus('idle');
    } catch (err: any) {
      console.error("OTP Request Error:", err);
      setErrorMessage(err.message);
      setStatus('error');
    }
  };

  // Step 2: Verify OTP and Download Document
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage(null);

    try {
      // First verify the OTP
      const verifyResponse = await fetch(`/api/share/verify-access/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viewer_email: email, otp: otp })
      });

      const verifyData = await parseResponse(verifyResponse);

      if (!verifyResponse.ok) {
        throw new Error(verifyData.detail || verifyData.error || t('FailedVerifyOtp'));
      }

      setDocumentData(verifyData.document);

      // Now download the actual file
      const downloadResponse = await fetch(
        `/api/share/download/${token}?viewer_email=${encodeURIComponent(email)}`
      );

      if (!downloadResponse.ok) {
        const errorData = await parseResponse(downloadResponse);
        throw new Error(errorData.detail || 'Failed to download document');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = downloadResponse.headers.get('Content-Disposition');
      let downloadFileName = 'document';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
        if (match && match[1]) {
          downloadFileName = match[1];
        }
      }

      // Get content type
      const contentType = downloadResponse.headers.get('Content-Type') || 'application/octet-stream';

      // Convert response to blob and create URL
      const blob = await downloadResponse.blob();
      const blobUrl = URL.createObjectURL(blob);

      setFileUrl(blobUrl);
      setFileName(downloadFileName);
      setFileType(contentType);

      // Parse Excel files
      if (isExcel(contentType, downloadFileName)) {
        await parseExcelFile(blob);
      }

      // Parse PowerPoint files
      if (isPowerPoint(contentType, downloadFileName)) {
        await parsePowerPointFile(blob);
      }

      setStep('success');
      setStatus('idle');

    } catch (err: any) {
      console.error("OTP Verify/Download Error:", err);
      setErrorMessage(err.message);
      setStatus('error');
    }
  };

  // Handle manual download
  const handleDownload = () => {
    if (fileUrl) {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Cleanup blob URLs on unmount
  React.useEffect(() => {
    return () => {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }
      if (pptThumbnailUrl) {
        URL.revokeObjectURL(pptThumbnailUrl);
      }
    };
  }, [fileUrl, pptThumbnailUrl]);

  // Render Excel Content
  const renderExcelContent = () => {
    if (isLoadingExcel) {
      return (
        <div className="flex flex-col items-center justify-center h-full py-10">
          <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <span className="text-gray-500">Loading spreadsheet...</span>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full max-h-[500px]">
        {/* Sheet Tabs */}
        {sheetNames.length > 0 && (
          <div className="flex bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 overflow-x-auto flex-shrink-0">
            {sheetNames.map((sheet) => (
              <button
                key={sheet}
                onClick={() => handleSheetChange(sheet)}
                className={`px-4 py-2 text-sm font-medium border-r border-gray-200 dark:border-gray-600 whitespace-nowrap
                  ${activeSheet === sheet 
                    ? 'bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 border-b-2 border-b-green-500' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
              >
                {sheet}
              </button>
            ))}
          </div>
        )}

        {/* Data Table */}
        <div className="flex-grow overflow-auto">
          <table className="w-full text-left border-collapse text-sm">
            <tbody>
              {excelData.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                  {/* Row Number Header */}
                  <td className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-mono text-xs px-2 border-r border-gray-200 dark:border-gray-600 w-10 text-center select-none sticky left-0">
                    {rowIndex + 1}
                  </td>
                  {row.map((cell: any, cellIndex: number) => (
                    <td key={cellIndex} className="px-3 py-1.5 border-r border-gray-100 dark:border-gray-700 text-gray-900 dark:text-gray-200 whitespace-nowrap">
                      {cell !== null && cell !== undefined ? String(cell) : ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {excelData.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 py-10">
              <p>Empty Sheet</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render PowerPoint Content
  const renderPowerPointContent = () => {
    if (isLoadingPpt) {
      return (
        <div className="flex flex-col items-center justify-center h-full py-10">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <span className="text-gray-500">Parsing presentation...</span>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full max-h-[500px]">
        {/* Header with thumbnail if available */}
        <div className="bg-orange-50 dark:bg-orange-900/10 p-4 border-b border-orange-100 dark:border-orange-900/30 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white dark:bg-gray-700 rounded-lg shadow-sm">
              <svg className="w-6 h-6 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z"/>
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-gray-800 dark:text-gray-200">Presentation Content</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{slides.length} slides detected</p>
            </div>
          </div>
          {pptThumbnailUrl && (
            <div className="h-16 w-24 bg-gray-200 rounded overflow-hidden shadow-sm border border-gray-300 dark:border-gray-600">
              <img src={pptThumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        {/* Slides Scroll Area */}
        <div className="flex-grow overflow-y-auto p-6 space-y-6 bg-gray-50 dark:bg-gray-800">
          {pptParseError ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <p className="text-gray-500 mb-4">{pptParseError}</p>
              <button onClick={handleDownload} className="text-blue-600 hover:underline text-sm">Download File to View</button>
            </div>
          ) : (
            slides.map((slide) => (
              <div key={slide.id} className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-600">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 dark:border-gray-600">
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
          {slides.length === 0 && !pptParseError && (
            <div className="text-center text-gray-400 py-10">Empty Presentation</div>
          )}
        </div>
      </div>
    );
  };

  // Render Text Content (for txt, csv, json, etc.)
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isLoadingText, setIsLoadingText] = useState(false);

  React.useEffect(() => {
    if (fileUrl && isText(fileType, fileName)) {
      setIsLoadingText(true);
      fetch(fileUrl)
        .then(res => res.text())
        .then(text => setTextContent(text))
        .catch(err => {
          console.error("Error loading text:", err);
          setTextContent("Error loading content preview.");
        })
        .finally(() => setIsLoadingText(false));
    }
  }, [fileUrl, fileType, fileName]);

  const renderTextContent = () => {
    if (isLoadingText) {
      return (
        <div className="flex flex-col items-center justify-center h-full py-10">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <span className="text-gray-500">Loading content...</span>
        </div>
      );
    }

    return (
      <div className="w-full h-full max-h-[500px] p-6 overflow-auto bg-gray-50 dark:bg-gray-800 rounded">
        <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 dark:text-gray-200">
          {textContent || "No content."}
        </pre>
      </div>
    );
  };

  return (
    <>
      <HtmlLangUpdater lang={lang} />
      
      {/* Language Toggle Button (Absolute Position) */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={toggleLanguage}
          className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded shadow hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium border border-gray-200 dark:border-gray-700"
        >
          {lang === 'en' ? 'عربي' : 'English'}
        </button>
      </div>

      {step === 'success' && documentData ? (
        // View: Document Success State
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6 flex flex-col items-center">
          <div className="w-full max-w-4xl bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                {documentData.docname || documentData.title || fileName}
              </h1>
              <button 
                onClick={handleDownload}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {t('Download')}
              </button>
            </div>
            
            <div className="p-6 flex flex-col items-center justify-center min-h-[400px] bg-gray-50 dark:bg-gray-900/50">
              {/* Document Preview */}
              <div className="w-full max-h-[600px] overflow-auto mb-6">
                {/* Image Preview */}
                {fileUrl && isImage(fileType) && (
                  <img 
                    src={fileUrl} 
                    alt={fileName}
                    className="max-w-full max-h-[500px] mx-auto rounded shadow-lg object-contain"
                  />
                )}

                {/* PDF Preview */}
                {fileUrl && isPdf(fileType) && (
                  <iframe
                    src={fileUrl}
                    className="w-full h-[500px] rounded shadow-lg"
                    title={fileName}
                  />
                )}

                {/* Video Preview */}
                {fileUrl && isVideo(fileType) && (
                  <video 
                    src={fileUrl}
                    controls
                    className="max-w-full max-h-[500px] mx-auto rounded shadow-lg"
                  >
                    Your browser does not support the video tag.
                  </video>
                )}

                {/* Excel Preview */}
                {fileUrl && isExcel(fileType, fileName) && (
                  <div className="w-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {renderExcelContent()}
                  </div>
                )}

                {/* PowerPoint Preview */}
                {fileUrl && isPowerPoint(fileType, fileName) && (
                  <div className="w-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {renderPowerPointContent()}
                  </div>
                )}

                {/* Text Preview */}
                {fileUrl && isText(fileType, fileName) && (
                  <div className="w-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {renderTextContent()}
                  </div>
                )}

                {/* Non-previewable files */}
                {fileUrl && !isPreviewable(fileType, fileName) && (
                  <div className="text-center py-10">
                    <div className="h-24 w-24 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto flex items-center justify-center mb-4">
                      <span className="text-4xl">📄</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-2">
                      {t('PreviewNotAvailable')}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                      {fileName}
                    </p>
                  </div>
                )}
              </div>

              {/* Access Confirmation */}
              <div className="border border-green-300 dark:border-green-600 rounded-lg p-4 bg-green-50 dark:bg-green-900/20 inline-block text-green-800 dark:text-green-200 text-center">
                <svg className="w-6 h-6 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('VerifiedAccessFor')} <strong>{email}</strong>
                <br/>
                <span className="text-xs opacity-75">{t('AccessLoggedAt')} {new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // View: Auth / OTP Forms
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
            <h2 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-white">
              {t('SecureDocAccess')}
            </h2>
            <p className="text-center text-gray-600 dark:text-gray-300 mb-8">
              {step === 'otp_input' 
                ? `${t('OtpSentMessage')} ${email}`
                : t('VerifyIdentityMessage')}
            </p>

            <div className="space-y-4">
              
              {/* Email Input Step */}
              {step === 'email_input' && (
                <form onSubmit={handleRequestOTP} className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('OrgEmail')}
                    </label>
                    <input 
                    type="email" 
                    required
                    placeholder="name@rta.ae"
                    className="w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={status === 'loading'}
                    />
                    <button 
                    type="submit"
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex justify-center"
                    disabled={status === 'loading'}
                    >
                    {status === 'loading' ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                        t('SendVerificationCode')
                    )}
                    </button>
                </form>
              )}

              {/* OTP Input Step */}
              {step === 'otp_input' && (
                 <form onSubmit={handleVerifyOTP} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('EnterOtp')}
                        </label>
                        <input 
                          type="text" 
                          required
                          placeholder="123456"
                          maxLength={6}
                          className="w-full px-4 py-3 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none tracking-[0.5em] text-center text-xl font-mono"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                          disabled={status === 'loading'}
                        />
                    </div>
                    <button 
                      type="submit"
                      className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex justify-center"
                      disabled={status === 'loading'}
                    >
                      {status === 'loading' ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      ) : (
                        t('VerifyAccess')
                      )}
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                          setStep('email_input');
                          setErrorMessage(null);
                          setOtp('');
                      }}
                      className="w-full text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mt-2"
                      disabled={status === 'loading'}
                    >
                      {t('ChangeEmail')}
                    </button>
                 </form>
              )}

              {errorMessage && (
                <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm text-center animate-pulse">
                    {errorMessage}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}