"use client";

import { SiteThemeProvider } from '@/lib/theme-context';
import { useEffect } from 'react';

interface SiteThemeWrapperProps {
  children: React.ReactNode;
}

export default function SiteThemeWrapper({ children }: SiteThemeWrapperProps) {
  // Apply FalClub theme
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', 'falclub');
    }
  }, []);

  return (
    <SiteThemeProvider>
      {children}
    </SiteThemeProvider>
  );
}
