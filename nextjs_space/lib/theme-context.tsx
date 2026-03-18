"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('canlifal-color-mode') as ColorMode | null;
      if (saved === 'light' || saved === 'dark') {
        setColorMode(saved);
      }
    }
    setIsLoading(false);
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

  const toggleColorMode = () => {
    const next = colorMode === 'dark' ? 'light' : 'dark';
    setColorMode(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('canlifal-color-mode', next);
    }
  };

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