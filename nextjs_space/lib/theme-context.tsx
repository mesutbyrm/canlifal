"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type SiteTheme = 'mystical' | 'facebook' | 'cosmic' | 'falci' | 'falclub';

const ALL_THEMES: SiteTheme[] = ['mystical', 'cosmic', 'facebook', 'falci', 'falclub'];

interface ThemeContextType {
  theme: SiteTheme;
  setTheme: (theme: SiteTheme) => void;
  isLoading: boolean;
  enabledThemes: SiteTheme[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function SiteThemeProvider({ children, defaultTheme = 'falclub' }: { children: React.ReactNode; defaultTheme?: SiteTheme }) {
  const [theme, setThemeState] = useState<SiteTheme>(defaultTheme);
  const [isLoading, setIsLoading] = useState(true);
  const [enabledThemes, setEnabledThemes] = useState<SiteTheme[]>(ALL_THEMES);

  // Fetch platform settings - Admin's theme choice applies to ALL users
  useEffect(() => {
    const fetchPlatformSettings = async () => {
      try {
        const res = await fetch('/api/settings/themes');
        if (res.ok) {
          const data = await res.json();
          if (data.enabled_themes && Array.isArray(data.enabled_themes)) {
            setEnabledThemes(data.enabled_themes as SiteTheme[]);
          }
          // Use admin's default theme for everyone
          if (data.default_theme && ALL_THEMES.includes(data.default_theme)) {
            setThemeState(data.default_theme as SiteTheme);
          }
        }
      } catch (error) {
        console.error('Error fetching platform settings:', error);
      }
      setIsLoading(false);
    };
    fetchPlatformSettings();
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);

  // setTheme is kept for compatibility but won't persist - admin controls theme
  const setTheme = useCallback((newTheme: SiteTheme) => {
    // Theme is controlled by admin, individual users cannot change it
    console.log('Theme is controlled by admin settings');
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isLoading, enabledThemes }}>
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
