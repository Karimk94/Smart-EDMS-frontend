'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '../../context/ToastContext';
import { useTranslations } from '../../hooks/useTranslations';
import { enGB } from 'date-fns/locale/en-GB';
import { registerLocale } from 'react-datepicker';
import HtmlLangUpdater from '../../components/HtmlLangUpdater';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';

registerLocale('en-GB', enGB);

const SESSION_KEY_PREFIX = 'share_session_';

interface SlideData {
  id: number;
  title: string;
  content: string[];
}

interface ShareInfo {
  is_restricted: boolean;
  target_email: string | null;
  target_email_hint: string | null;
  expiry_date: string | null;
  share_type: 'file' | 'folder';
}

interface FolderItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  media_type: string;
}

interface BreadcrumbItem {
  id: string;
  name: string;
}

interface StoredSession {
  email: string;
  verifiedAt: number;
  shareType: 'file' | 'folder';
  folderId?: string;
}

export default function SharedDocumentPage() {
  const params = useParams();
  const token = params.token as string;
  
  // Language State
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const t = useTranslations(lang);
  const { showToast } = useToast();

  // Share Info State
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [isLoadingShareInfo, setIsLoadingShareInfo] = useState(true);
  const [shareInfoError, setShareInfoError] = useState<string | null>(null);

  // Session Restoration State
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [autoOtpSent, setAutoOtpSent] = useState(false);

  // Flow State
  const [step, setStep] = useState<'email_input' | 'otp_input' | 'success'>('email_input');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [documentData, setDocumentData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Folder State (for folder shares)
  const [folderContents, setFolderContents] = useState<FolderItem[]>([]);
  const [rootFolderId, setRootFolderId] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [currentFolderName, setCurrentFolderName] = useState<string>('Shared Folder');
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [isLoadingFolder, setIsLoadingFolder] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FolderItem | null>(null);

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

  // Session Storage Helpers
  const getSessionKey = () => `${SESSION_KEY_PREFIX}${token}`;

  const saveSession = (email: string, shareType: 'file' | 'folder', folderId?: string) => {
    const session: StoredSession = {
      email,
      verifiedAt: Date.now(),
      shareType,
      folderId
    };
    try {
      localStorage.setItem(getSessionKey(), JSON.stringify(session));
    } catch (e) {
      console.warn('Could not save session to localStorage:', e);
    }
  };

  const getStoredSession = (): StoredSession | null => {
    try {
      const stored = localStorage.getItem(getSessionKey());
      if (stored) {
        const session: StoredSession = JSON.parse(stored);
        // Session valid for 24 hours
        const sessionAge = Date.now() - session.verifiedAt;
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        if (sessionAge < maxAge) {
          return session;
        }
        // Session expired, remove it
        localStorage.removeItem(getSessionKey());
      }
    } catch (e) {
      console.warn('Could not read session from localStorage:', e);
    }
    return null;
  };

  const clearSession = () => {
    try {
      localStorage.removeItem(getSessionKey());
    } catch (e) {
      console.warn('Could not clear session from localStorage:', e);
    }
  };

  // Try to restore session and load content
  const tryRestoreSession = async (session: StoredSession, shareInfoData: ShareInfo) => {
    setEmail(session.email);
    
    try {
      if (shareInfoData.share_type === 'folder') {
        // For folder shares, try to load folder contents directly
        const params = new URLSearchParams({ viewer_email: session.email });
        const response = await fetch(`/api/share/folder-contents/${token}?${params.toString()}`);
        
        if (response.ok) {
          const data = await response.json();
          setFolderContents(data.contents || []);
          setCurrentFolderName(data.folder_name || 'Shared Folder');
          setBreadcrumbs(data.breadcrumbs || []);
          setCurrentFolderId(data.folder_id);
          setRootFolderId(data.root_folder_id);
          setStep('success');
          return true;
        }
      } else {
        // For file shares, try to download the file
        const downloadResponse = await fetch(
          `/api/share/download/${token}?viewer_email=${encodeURIComponent(session.email)}`
        );
        
        if (downloadResponse.ok) {
          // Get filename from Content-Disposition header
          const contentDisposition = downloadResponse.headers.get('Content-Disposition');
          let downloadFileName = 'document';
          if (contentDisposition) {
            const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
            if (match && match[1]) {
              downloadFileName = match[1];
            }
          }
          
          const contentType = downloadResponse.headers.get('Content-Type') || 'application/octet-stream';
          const blob = await downloadResponse.blob();
          const blobUrl = URL.createObjectURL(blob);
          
          setFileUrl(blobUrl);
          setFileName(downloadFileName);
          setFileType(contentType);
          
          // Parse Excel/PowerPoint if needed
          if (isExcel(contentType, downloadFileName)) {
            await parseExcelFile(blob);
          }
          if (isPowerPoint(contentType, downloadFileName)) {
            await parsePowerPointFile(blob);
          }
          
          setStep('success');
          return true;
        }
      }
    } catch (err) {
      console.warn('Session restoration failed:', err);
    }
    
    // Session invalid on server side, clear it
    clearSession();
    return false;
  };

  // Auto-send OTP for restricted shares
  const autoSendOtp = async (targetEmail: string) => {
    if (autoOtpSent) return; // Prevent duplicate sends
    
    setAutoOtpSent(true);
    setEmail(targetEmail);
    setStatus('loading');
    setErrorMessage(null);
    
    try {
      const response = await fetch(`/api/share/request-access/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viewer_email: targetEmail })
      });
      
      const data = await parseResponse(response);
      
      if (!response.ok) {
        throw new Error(JSON.stringify(data));
      }
      
      setStep('otp_input');
      setStatus('idle');
      showToast(t('OtpSentAutomatically'), 'success');
    } catch (err: any) {
      console.error("Auto OTP Request Error:", err);
      setErrorMessage(extractErrorMessage(err));
      setStatus('error');
      setStep('email_input');
    }
  };

  // Main initialization effect
  useEffect(() => {
    const initialize = async () => {
      if (!token) return;
      
      setIsLoadingShareInfo(true);
      setIsRestoringSession(true);
      
      try {
        // Step 1: Fetch share info
        const response = await fetch(`/api/share/info/${token}`);
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          setShareInfoError(errData.detail || t('linkExpired') || 'This link is invalid or has expired.');
          setIsLoadingShareInfo(false);
          setIsRestoringSession(false);
          return;
        }
        
        const shareInfoData = await response.json();
        setShareInfo(shareInfoData);
        setIsLoadingShareInfo(false);
        
        // Step 2: Check for existing session
        const storedSession = getStoredSession();
        if (storedSession) {
          const restored = await tryRestoreSession(storedSession, shareInfoData);
          if (restored) {
            setIsRestoringSession(false);
            return;
          }
        }
        
        // Step 3: If restricted share, auto-send OTP to the target email
        if (shareInfoData.is_restricted && shareInfoData.target_email) {
          setIsRestoringSession(false);
          await autoSendOtp(shareInfoData.target_email);
          return;
        }
        
        setIsRestoringSession(false);
        
      } catch (err) {
        console.error('Error during initialization:', err);
        setShareInfoError(t('errorLoadingShare') || 'Error loading share information.');
        setIsLoadingShareInfo(false);
        setIsRestoringSession(false);
      }
    };

    initialize();
  }, [token]);

  const parseResponse = async (response: Response) => {
    const text = await response.text();
    try {
      return JSON.parse(text.trim());
    } catch (e) {
      if (!response.ok) {
         return { detail: text || response.statusText };
      }
      throw new Error("Invalid server response format");
    }
  };

  const extractErrorMessage = (err: any) => {
    let msg = err?.message || String(err);

    try {
      let attempts = 0;
      while (typeof msg === 'string' && (msg.trim().startsWith('{') || msg.trim().startsWith('[')) && attempts < 5) {
        attempts++;
        try {
            const parsed = JSON.parse(msg);
            
            if (parsed.detail && Array.isArray(parsed.detail) && parsed.detail.length > 0) {
              const firstError = parsed.detail[0];
              if (firstError.msg) {
                msg = firstError.msg.replace(/^Value error,\s*/i, '');
                break;
              }
            }
            
            const extracted = parsed.detail || parsed.error || parsed.message;
            
            if (extracted) {
                if (typeof extracted === 'string') {
                  msg = extracted;
                } else if (Array.isArray(extracted) && extracted.length > 0 && extracted[0].msg) {
                  msg = extracted[0].msg.replace(/^Value error,\s*/i, '');
                } else {
                  msg = JSON.stringify(extracted);
                }
            } else {
                break;
            }
        } catch (jsonError) {
            const patterns = [
                /"detail"\s*:\s*"([^"]*)"/,
                /"error"\s*:\s*"([^"]*)"/,
                /"message"\s*:\s*"([^"]*)"/,
                /"msg"\s*:\s*"([^"]*)"/
            ];

            let found = false;
            for (const pattern of patterns) {
                const match = msg.match(pattern);
                if (match && match[1]) {
                    msg = match[1].replace(/^Value error,\s*/i, '');
                    found = true;
                    break;
                }
            }
            break; 
        }
      }
    } catch (e) {
    }
    
    return msg;
  };

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

  // Get media type from file extension for folder items
  const getMediaTypeFromName = (name: string): string => {
    const ext = getFileExtension(name);
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) return 'image';
    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return 'video';
    if (['pdf'].includes(ext)) return 'pdf';
    if (['doc', 'docx'].includes(ext)) return 'document';
    if (['xls', 'xlsx', 'xlsm', 'ods'].includes(ext)) return 'excel';
    if (['ppt', 'pptx', 'pps', 'ppsx', 'odp'].includes(ext)) return 'powerpoint';
    if (['txt', 'csv', 'json', 'xml', 'log', 'md'].includes(ext)) return 'text';
    return 'file';
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

  // Fetch folder contents
  const fetchFolderContents = async (folderId: string | null) => {
    if (!folderId) return;
    
    setIsLoadingFolder(true);
    try {
      const params = new URLSearchParams({
        viewer_email: email,
        ...(folderId !== rootFolderId && { parent_id: folderId })
      });
      
      const response = await fetch(`/api/share/folder-contents/${token}?${params.toString()}`);
      
      if (!response.ok) {
        const errData = await parseResponse(response);
        throw new Error(errData.detail || 'Failed to load folder contents');
      }
      
      const data = await response.json();
      
      setFolderContents(data.contents || []);
      setCurrentFolderName(data.folder_name || 'Shared Folder');
      setBreadcrumbs(data.breadcrumbs || []);
      setCurrentFolderId(data.folder_id);
      
      if (!rootFolderId) {
        setRootFolderId(data.root_folder_id);
      }
    } catch (err: any) {
      console.error('Error loading folder contents:', err);
      showToast(extractErrorMessage(err), 'error');
    } finally {
      setIsLoadingFolder(false);
    }
  };

  // Navigate to a folder
  const navigateToFolder = (folder: FolderItem) => {
    setCurrentFolderId(folder.id);
    fetchFolderContents(folder.id);
  };

  // Handle breadcrumb click
  const handleBreadcrumbClick = (item: BreadcrumbItem) => {
    setCurrentFolderId(item.id);
    fetchFolderContents(item.id);
  };

  // Go back to parent folder
  const goBack = () => {
    if (breadcrumbs.length > 1) {
      const parentBreadcrumb = breadcrumbs[breadcrumbs.length - 2];
      handleBreadcrumbClick(parentBreadcrumb);
    }
  };

  // Open file from folder
  const openFileFromFolder = async (file: FolderItem) => {
    setSelectedFile(file);
    setIsLoadingFolder(true);
    
    try {
      const downloadResponse = await fetch(
        `/api/share/download/${token}?viewer_email=${encodeURIComponent(email)}&doc_id=${file.id}`
      );

      if (!downloadResponse.ok) {
        const errorData = await parseResponse(downloadResponse);
        throw new Error(errorData.detail || 'Failed to download file');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = downloadResponse.headers.get('Content-Disposition');
      let downloadFileName = file.name;
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

      // Reset previous preview data
      setExcelData([]);
      setSheetNames([]);
      setSlides([]);
      setPptThumbnailUrl(null);
      setPptParseError(null);

      // Parse Excel files
      if (isExcel(contentType, downloadFileName)) {
        await parseExcelFile(blob);
      }

      // Parse PowerPoint files
      if (isPowerPoint(contentType, downloadFileName)) {
        await parsePowerPointFile(blob);
      }

    } catch (err: any) {
      console.error('Error opening file:', err);
      showToast(extractErrorMessage(err), 'error');
      setSelectedFile(null);
    } finally {
      setIsLoadingFolder(false);
    }
  };

  // Close file preview and go back to folder view
  const closeFilePreview = () => {
    if (fileUrl) {
      URL.revokeObjectURL(fileUrl);
    }
    setSelectedFile(null);
    setFileUrl(null);
    setFileName('document');
    setFileType('application/octet-stream');
    setExcelData([]);
    setSheetNames([]);
    setSlides([]);
    setPptThumbnailUrl(null);
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
        body: JSON.stringify({ viewer_email: email.trim().toLowerCase() })
      });

      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(JSON.stringify(data));
      }

      setStep('otp_input');
      setStatus('idle');
    } catch (err: any) {
      console.error("OTP Request Error:", err);
      setErrorMessage(extractErrorMessage(err));
      setStatus('error');
    }
  };

  // Step 2: Verify OTP and Load Content
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage(null);

    try {
      // First verify the OTP
      const verifyResponse = await fetch(`/api/share/verify-access/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viewer_email: email.trim().toLowerCase(), otp: otp })
      });

      const verifyData = await parseResponse(verifyResponse);

      if (!verifyResponse.ok) {
        throw new Error(JSON.stringify(verifyData));
      }

      // Check if this is a folder share
      if (verifyData.share_type === 'folder') {
        // Save session for future visits
        saveSession(email.trim().toLowerCase(), 'folder', verifyData.folder_id);
        
        // Set folder ID and fetch contents
        setRootFolderId(verifyData.folder_id);
        setCurrentFolderId(verifyData.folder_id);
        setStep('success');
        setStatus('idle');
        
        // Fetch folder contents
        await fetchFolderContents(verifyData.folder_id);
        return;
      }

      // Handle file share (existing logic)
      setDocumentData(verifyData.document);

      // Now download the actual file
      const downloadResponse = await fetch(
        `/api/share/download/${token}?viewer_email=${encodeURIComponent(email.trim().toLowerCase())}`
      );

      if (!downloadResponse.ok) {
        const errorData = await parseResponse(downloadResponse);
        throw new Error(JSON.stringify(errorData));
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

      // Save session for future visits
      saveSession(email.trim().toLowerCase(), 'file');

      setStep('success');
      setStatus('idle');

    } catch (err: any) {
      console.error("OTP Verify/Download Error:", err);
      setErrorMessage(extractErrorMessage(err));
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

  // Render file icon based on media type
  const renderFileIcon = (item: FolderItem) => {
    const mediaType = item.media_type || getMediaTypeFromName(item.name);
    
    if (item.type === 'folder') {
      return (
        <svg className="w-12 h-12 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
        </svg>
      );
    }

    switch (mediaType) {
      case 'image':
        return (
          <svg className="w-12 h-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'video':
        return (
          <svg className="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        );
      case 'pdf':
        return (
          <svg className="w-12 h-12 text-red-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM6 4h7v5h5v11H6V4z"/>
            <path d="M8 12h8v1H8zm0 2h8v1H8zm0 2h5v1H8z"/>
          </svg>
        );
      case 'excel':
        return (
          <svg className="w-12 h-12 text-green-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM13 4l5 5h-5V4zM8 17l2-3.5L8 10h1.5l1.5 2.5L12.5 10H14l-2 3.5 2 3.5h-1.5L11 14.5 9.5 17H8z"/>
          </svg>
        );
      case 'powerpoint':
        return (
          <svg className="w-12 h-12 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM13 4l5 5h-5V4zM9 10h3.5a2.5 2.5 0 010 5H11v2H9v-7zm2 4h1.5a.5.5 0 000-1H11v1z"/>
          </svg>
        );
      case 'text':
        return (
          <svg className="w-12 h-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
    }
  };

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

  // Render folder contents view
  const renderFolderContents = () => {
    // If a file is selected, show file preview
    if (selectedFile && fileUrl) {
      return (
        <div className="w-full max-w-4xl bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          {/* File Header with Back Button */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-4">
            <button
              onClick={closeFilePreview}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title={t('back') || 'Back'}
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                {selectedFile.name}
              </h1>
            </div>
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

          {/* File Preview */}
          <div className="p-6 flex flex-col items-center justify-center min-h-[400px] bg-gray-50 dark:bg-gray-900/50">
            <div className="w-full max-h-[600px] overflow-auto mb-6">
              {isImage(fileType) && (
                <img 
                  src={fileUrl} 
                  alt={fileName}
                  className="max-w-full max-h-[500px] mx-auto rounded shadow-lg object-contain"
                />
              )}

              {isPdf(fileType) && (
                <iframe
                  src={fileUrl}
                  className="w-full h-[500px] rounded shadow-lg"
                  title={fileName}
                />
              )}

              {isVideo(fileType) && (
                <video 
                  src={fileUrl} 
                  controls
                  className="max-w-full max-h-[500px] mx-auto rounded shadow-lg"
                >
                  Your browser does not support the video tag.
                </video>
              )}

              {isExcel(fileType, fileName) && (
                <div className="w-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  {renderExcelContent()}
                </div>
              )}

              {isPowerPoint(fileType, fileName) && (
                <div className="w-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  {renderPowerPointContent()}
                </div>
              )}

              {isText(fileType, fileName) && (
                <div className="w-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  {renderTextContent()}
                </div>
              )}

              {!isPreviewable(fileType, fileName) && (
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
          </div>
        </div>
      );
    }

    // Show folder browser
    return (
      <div className="w-full max-w-4xl bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        {/* Folder Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 mb-2 overflow-x-auto">
            <svg className="w-5 h-5 text-yellow-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
            </svg>
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={crumb.id}>
                {index > 0 && <span className="text-gray-400">/</span>}
                <button
                  onClick={() => handleBreadcrumbClick(crumb)}
                  className={`text-sm whitespace-nowrap hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${
                    index === breadcrumbs.length - 1
                      ? 'font-bold text-gray-900 dark:text-white'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Folder name and back button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {breadcrumbs.length > 1 && (
                <button
                  onClick={goBack}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  title={t('back') || 'Back'}
                >
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {currentFolderName}
              </h1>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {folderContents.length} {t('items') || 'items'}
            </span>
          </div>
        </div>

        {/* Folder Contents */}
        <div className="p-6 min-h-[400px]">
          {isLoadingFolder ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
          ) : folderContents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <p>{t('emptyFolder') || 'This folder is empty'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {folderContents.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.type === 'folder') {
                      navigateToFolder(item);
                    } else {
                      openFileFromFolder(item);
                    }
                  }}
                  className="group flex flex-col items-center p-4 rounded-xl cursor-pointer transition-all duration-200 border border-transparent hover:bg-gray-50 hover:border-gray-200 hover:shadow-sm dark:hover:bg-gray-700 dark:hover:border-gray-600"
                >
                  <div className="mb-3 transform group-hover:scale-105 transition-transform duration-200">
                    {renderFileIcon(item)}
                  </div>
                  <span className="text-sm font-medium text-center text-gray-700 dark:text-gray-300 break-words w-full line-clamp-2">
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with access info */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <div className="flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{t('VerifiedAccessFor')} <strong>{email}</strong></span>
          </div>
        </div>
      </div>
    );
  };

  if (isLoadingShareInfo || isRestoringSession) {
    return (
      <>
        <HtmlLangUpdater lang={lang} />
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">
              {isRestoringSession 
                ? (t('restoringSession')) 
                : (t('loading') || 'Loading...')}
            </p>
          </div>
        </div>
      </>
    );
  }

  if (shareInfoError) {
    return (
      <>
        <HtmlLangUpdater lang={lang} />
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={toggleLanguage}
            className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded shadow hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium border border-gray-200 dark:border-gray-700"
          >
            {lang === 'en' ? 'عربي' : 'English'}
          </button>
        </div>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {t('linkInvalid') || 'Link Invalid'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {shareInfoError}
            </p>
          </div>
        </div>
      </>
    );
  }

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

      {step === 'success' ? (
        // Determine if this is a folder share or file share
        shareInfo?.share_type === 'folder' || rootFolderId ? (
          // Folder Share View
          <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6 flex flex-col items-center">
            {renderFolderContents()}
          </div>
        ) : documentData ? (
          // File Share View (existing behavior)
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
        ) : null
      ) : (
        // View: Auth / OTP Forms
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
            
            <div className="flex justify-center mb-6">
              <img 
                src="/icon.ico" 
                alt="Logo" 
                className="h-20 w-auto object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>

            <h2 className="text-2xl font-bold text-center mb-4 text-gray-900 dark:text-white">
              {shareInfo?.share_type === 'folder' 
                ? (t('SecureFolderAccess') || 'Secure Folder Access')
                : t('SecureDocAccess')
              }
            </h2>

            {/* Share Type Indicator */}
            {shareInfo?.share_type === 'folder' && (
              <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-center">
                <div className="flex items-center justify-center gap-2 text-yellow-700 dark:text-yellow-300">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                  </svg>
                  <span className="font-medium text-sm">{t('sharedFolder') || 'Shared Folder'}</span>
                </div>
              </div>
            )}

            {/* Restricted Access Notice */}
            {shareInfo?.is_restricted && (
              <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="font-medium text-orange-700 dark:text-orange-300 text-sm">
                    {t('restrictedLink') || 'Restricted Access'}
                  </span>
                </div>
                <p className="text-sm text-orange-600 dark:text-orange-400">
                  {t('restrictedLinkDesc') || 'This link can only be accessed by:'} <strong>{shareInfo.target_email_hint}</strong>
                </p>
              </div>
            )}

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
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t('rtaEmailOnly') || 'Only @rta.ae emails are allowed'}
                    </p>
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