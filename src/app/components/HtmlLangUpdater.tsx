"use client";

import { useEffect } from 'react';

import { HtmlLangUpdaterProps } from '../../interfaces/PropsInterfaces';

const HtmlLangUpdater: React.FC<HtmlLangUpdaterProps> = ({ lang, forceDir }) => {
  useEffect(() => {
    document.documentElement.lang = lang;
    if (forceDir) {
      document.documentElement.dir = forceDir;
    } else {
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    }
  }, [lang, forceDir]);

  return null; // This component does not render anything
};

export default HtmlLangUpdater;