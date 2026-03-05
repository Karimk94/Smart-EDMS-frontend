"use client";

import { Document } from '../../models/Document';
import { ExcelModal } from './ExcelModal';
import { FileModal } from './FileModal';
import { ImageModal } from './ImageModal';
import { PdfModal } from './PdfModal';
import { PowerPointModal } from './PowerPointModal';
import { TxtModal } from './TxtModal';
import { VideoModal } from './VideoModal';
import { WordModal } from './WordModal';
import { TFunction } from '../hooks/useTranslations';

interface DocumentModalsProps {
    selectedDoc: Document | null;
    selectedVideo: Document | null;
    selectedPdf: Document | null;
    selectedFile: Document | null;
    selectedTxt: Document | null;
    selectedExcel: Document | null;
    selectedPPT: Document | null;
    selectedWord: Document | null;
    onCloseDoc: () => void;
    onCloseVideo: () => void;
    onClosePdf: () => void;
    onCloseFile: () => void;
    onCloseTxt: () => void;
    onCloseExcel: () => void;
    onClosePPT: () => void;
    onCloseWord: () => void;
    onUpdateSuccess: () => void;
    apiURL: string;
    isEditor: boolean;
    t: Function;
    lang: 'en' | 'ar';
    theme: 'light' | 'dark';
}

/**
 * Renders all document preview modals (Image, Video, PDF, File, Txt, Excel, PPT, Word).
 * Only the active modal is rendered.
 */
export function DocumentModals({
    selectedDoc, selectedVideo, selectedPdf, selectedFile,
    selectedTxt, selectedExcel, selectedPPT, selectedWord,
    onCloseDoc, onCloseVideo, onClosePdf, onCloseFile,
    onCloseTxt, onCloseExcel, onClosePPT, onCloseWord,
    onUpdateSuccess, apiURL, isEditor, t, lang, theme
}: DocumentModalsProps) {
    return (
        <>
            {selectedDoc && <ImageModal doc={selectedDoc} onClose={onCloseDoc} apiURL={apiURL} onUpdateAbstractSuccess={onUpdateSuccess} isEditor={isEditor} t={t} lang={lang} theme={theme} />}
            {selectedVideo && <VideoModal doc={selectedVideo} onClose={onCloseVideo} apiURL={apiURL} onUpdateAbstractSuccess={onUpdateSuccess} isEditor={isEditor} t={t} lang={lang} theme={theme} />}
            {selectedPdf && <PdfModal doc={selectedPdf} onClose={onClosePdf} apiURL={apiURL} onUpdateAbstractSuccess={onUpdateSuccess} isEditor={isEditor} t={t} lang={lang} theme={theme} />}
            {selectedFile && <FileModal doc={selectedFile} onClose={onCloseFile} apiURL={apiURL} onUpdateAbstractSuccess={onUpdateSuccess} isEditor={isEditor} t={t} lang={lang} theme={theme} />}
            {selectedTxt && <TxtModal doc={selectedTxt} onClose={onCloseTxt} apiURL={apiURL} onUpdateAbstractSuccess={onUpdateSuccess} isEditor={isEditor} t={t} lang={lang} theme={theme} />}
            {selectedExcel && <ExcelModal doc={selectedExcel} onClose={onCloseExcel} apiURL={apiURL} onUpdateAbstractSuccess={onUpdateSuccess} isEditor={isEditor} t={t} lang={lang} theme={theme} />}
            {selectedPPT && <PowerPointModal doc={selectedPPT} onClose={onClosePPT} apiURL={apiURL} onUpdateAbstractSuccess={onUpdateSuccess} isEditor={isEditor} t={t} lang={lang} theme={theme} />}
            {selectedWord && <WordModal doc={selectedWord} onClose={onCloseWord} apiURL={apiURL} onUpdateAbstractSuccess={onUpdateSuccess} isEditor={isEditor} t={t} lang={lang} theme={theme} />}
        </>
    );
}
