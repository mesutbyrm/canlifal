"use client";

import { SiteThemeProvider, SiteTheme } from '@/lib/theme-context';
import { useEffect, useState } from 'react';

interface SiteThemeWrapperProps {
  children: React.ReactNode;
}

export default function SiteThemeWrapper({ children }: SiteThemeWrapperProps) {
  const [defaultTheme, setDefaultTheme] = useState<SiteTheme>('mystical');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Fetch default theme from platform settings
    const fetchDefaultTheme = async () => {
      try {
        const res = await fetch('/api/admin/settings');
        if (res.ok) {
          const data = await res.json();
          const themeSetting = data.settings?.find((s: { key: string; value: string }) => s.key === 'default_theme');
          if (themeSetting?.value === 'facebook' || themeSetting?.value === 'mystical') {
            setDefaultTheme(themeSetting.value as SiteTheme);
          }
        }
      } catch (error) {
        console.error('Error fetching default theme:', error);
      }
      setIsReady(true);
    };

    fetchDefaultTheme();
  }, []);

  // Apply initial theme to prevent flash
  useEffect(() => {
    if (typeof document !== 'undefined' && isReady) {
      // Check if user has preference in localStorage
      const savedTheme = localStorage.getItem('site-theme') as SiteTheme;
      const initialTheme = savedTheme || defaultTheme;
      document.documentElement.setAttribute('data-theme', initialTheme);
    }
  }, [defaultTheme, isReady]);

  return (
    <SiteThemeProvider defaultTheme={defaultTheme}>
      {children}
    </SiteThemeProvider>
  );
}
