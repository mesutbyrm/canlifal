"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type SiteTheme = 'falclub' | 'cosmic' | 'facebook' | 'falci' | 'mystical' | 'canlidark';
export type ColorMode = 'dark' | 'light';

interface ThemeContextType {
  theme: SiteTheme;
  isLoading: boolean;
  colorMode: ColorMode;
  toggleColorMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const VALID_THEMES: SiteTheme[] = ['falclub', 'cosmic', 'facebook', 'falci', 'mystical', 'canlidark'];

export function SiteThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<SiteTheme>('falclub');
  const [isLoading, setIsLoading] = useState(true);
  const [colorMode, setColorMode] = useState<ColorMode>('dark');

  // Load theme + color mode from API (admin-controlled)
  useEffect(() => {
    let cancelled = false;
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings/themes');
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            if (data.default_theme && VALID_THEMES.includes(data.default_theme)) {
              setTheme(data.default_theme as SiteTheme);
            }
            if (data.color_mode === 'light' || data.color_mode === 'dark') {
              setColorMode(data.color_mode);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load theme settings:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    loadSettings();
    return () => { cancelled = true; };
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      if (colorMode === 'light') {
        document.documentElement.classList.add('light-mode');
        document.documentElement.classList.remove('dark-mode');
      } else {
        document.documentElement.classList.add('dark-mode');
        document.documentElement.classList.remove('light-mode');
      }
    }
  }, [theme, colorMode]);

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