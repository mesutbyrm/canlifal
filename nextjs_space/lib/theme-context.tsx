"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

export type SiteTheme = 'falclub';

interface ThemeContextType {
  theme: SiteTheme;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function SiteThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme] = useState<SiteTheme>('falclub');
  const [isLoading, setIsLoading] = useState(true);

  // Apply theme to document
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', 'falclub');
    }
    setIsLoading(false);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, isLoading }}>
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
