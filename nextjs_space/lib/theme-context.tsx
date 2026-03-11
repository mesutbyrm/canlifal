"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

export type SiteTheme = 'mystical' | 'facebook';

interface ThemeContextType {
  theme: SiteTheme;
  setTheme: (theme: SiteTheme) => void;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function SiteThemeProvider({ children, defaultTheme = 'mystical' }: { children: React.ReactNode; defaultTheme?: SiteTheme }) {
  const { data: session, status } = useSession() || {};
  const [theme, setThemeState] = useState<SiteTheme>(defaultTheme);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user's theme preference
  useEffect(() => {
    const fetchTheme = async () => {
      if (status === 'loading') return;
      
      if (status === 'authenticated' && session?.user) {
        try {
          const res = await fetch('/api/user/theme');
          if (res.ok) {
            const data = await res.json();
            if (data.theme === 'mystical' || data.theme === 'facebook') {
              setThemeState(data.theme);
            }
          }
        } catch (error) {
          console.error('Error fetching theme:', error);
        }
      } else {
        // For non-authenticated users, use default or localStorage
        const savedTheme = typeof window !== 'undefined' ? localStorage.getItem('site-theme') as SiteTheme : null;
        if (savedTheme === 'mystical' || savedTheme === 'facebook') {
          setThemeState(savedTheme);
        } else {
          setThemeState(defaultTheme);
        }
      }
      setIsLoading(false);
    };

    fetchTheme();
  }, [status, session, defaultTheme]);

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
    <ThemeContext.Provider value={{ theme, setTheme, isLoading }}>
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
