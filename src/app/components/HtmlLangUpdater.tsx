"use client";

import { useEffect } from 'react';

import { HtmlLangUpdaterProps } from '../../interfaces/PropsInterfaces';

const HtmlLangUpdater: React.FC<HtmlLangUpdaterProps> = ({ lang }) => {
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  return null; // This component does not render anything
};

export default HtmlLangUpdater;