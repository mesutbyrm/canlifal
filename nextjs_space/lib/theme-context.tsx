"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

export type SiteTheme = 'mystical' | 'facebook' | 'cosmic' | 'falci';

const ALL_THEMES: SiteTheme[] = ['mystical', 'cosmic', 'facebook', 'falci'];

interface ThemeContextType {
  theme: SiteTheme;
  setTheme: (theme: SiteTheme) => void;
  isLoading: boolean;
  enabledThemes: SiteTheme[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function SiteThemeProvider({ children, defaultTheme = 'mystical' }: { children: React.ReactNode; defaultTheme?: SiteTheme }) {
  const { data: session, status } = useSession() || {};
  const [theme, setThemeState] = useState<SiteTheme>(defaultTheme);
  const [isLoading, setIsLoading] = useState(true);
  const [enabledThemes, setEnabledThemes] = useState<SiteTheme[]>(ALL_THEMES);
  const [platformDefaultTheme, setPlatformDefaultTheme] = useState<SiteTheme>(defaultTheme);

  // Fetch platform settings (enabled themes and default theme)
  useEffect(() => {
    const fetchPlatformSettings = async () => {
      try {
        const res = await fetch('/api/settings/themes');
        if (res.ok) {
          const data = await res.json();
          if (data.enabled_themes && Array.isArray(data.enabled_themes)) {
            setEnabledThemes(data.enabled_themes as SiteTheme[]);
          }
          if (data.default_theme && ALL_THEMES.includes(data.default_theme)) {
            setPlatformDefaultTheme(data.default_theme as SiteTheme);
          }
        }
      } catch (error) {
        console.error('Error fetching platform settings:', error);
      }
    };
    fetchPlatformSettings();
  }, []);

  // Fetch user's theme preference
  useEffect(() => {
    const fetchTheme = async () => {
      if (status === 'loading') return;
      
      if (status === 'authenticated' && session?.user) {
        try {
          const res = await fetch('/api/user/theme');
          if (res.ok) {
            const data = await res.json();
            if (ALL_THEMES.includes(data.theme) && enabledThemes.includes(data.theme)) {
              setThemeState(data.theme);
            } else if (enabledThemes.length > 0) {
              // User's theme is disabled, fall back to platform default or first enabled
              const fallback = enabledThemes.includes(platformDefaultTheme) ? platformDefaultTheme : enabledThemes[0];
              setThemeState(fallback);
            }
          }
        } catch (error) {
          console.error('Error fetching theme:', error);
        }
      } else {
        // For non-authenticated users, use localStorage or platform default
        const savedTheme = typeof window !== 'undefined' ? localStorage.getItem('site-theme') as SiteTheme : null;
        if (savedTheme && ALL_THEMES.includes(savedTheme) && enabledThemes.includes(savedTheme)) {
          setThemeState(savedTheme);
        } else {
          setThemeState(platformDefaultTheme);
        }
      }
      setIsLoading(false);
    };

    fetchTheme();
  }, [status, session, enabledThemes, platformDefaultTheme]);

  // Apply theme to document
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);

  const setTheme = useCallback(async (newTheme: SiteTheme) => {
    setThemeState(newTheme);
    
    // Save to localStorage for guests
    if (typeof window !== 'undefined') {
      localStorage.setItem('site-theme', newTheme);
    }

    // Save to database for authenticated users
    if (status === 'authenticated' && session?.user) {
      try {
        await fetch('/api/user/theme', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ theme: newTheme }),
        });
      } catch (error) {
        console.error('Error saving theme:', error);
      }
    }
  }, [status, session]);

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
