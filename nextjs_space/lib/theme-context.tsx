"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type SiteTheme = 'falclub' | 'cosmic' | 'facebook' | 'falci' | 'mystical';
export type ColorMode = 'dark' | 'light';

interface ThemeContextType {
  theme: SiteTheme;
  isLoading: boolean;
  colorMode: ColorMode;
  toggleColorMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function SiteThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme] = useState<SiteTheme>('falclub');
  const [isLoading, setIsLoading] = useState(true);
  const [colorMode, setColorMode] = useState<ColorMode>('dark');

  // Load color mode from API (admin-controlled)
  useEffect(() => {
    let cancelled = false;
    async function loadColorMode() {
      try {
        const res = await fetch('/api/settings/themes');
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && (data.color_mode === 'light' || data.color_mode === 'dark')) {
            setColorMode(data.color_mode);
          }
        }
      } catch (err) {
        console.error('Failed to load color mode:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    loadColorMode();
    return () => { cancelled = true; };
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', 'falclub');
      if (colorMode === 'light') {
        document.documentElement.classList.add('light-mode');
        document.documentElement.classList.remove('dark-mode');
      } else {
        document.documentElement.classList.add('dark-mode');
        document.documentElement.classList.remove('light-mode');
      }
    }
  }, [colorMode]);

  const toggleColorMode = useCallback(() => {
    setColorMode(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, isLoading, colorMode, toggleColorMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useSiteTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useSiteTheme must be used within a SiteThemeProvider');
  }
  return context;
}