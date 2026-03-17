'use client';

import { useEffect, useState, useCallback } from 'react';
import { Users } from 'lucide-react';
import { usePathname } from 'next/navigation';

interface LiveVisitorCountProps {
  showIcon?: boolean;
  showLabel?: boolean;
  className?: string;
  variant?: 'default' | 'admin';
}

export function LiveVisitorCount({ 
  showIcon = true, 
  showLabel = false, 
  className = '',
  variant = 'default'
}: LiveVisitorCountProps) {
  const [count, setCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  
  // Detect language from pathname
  const language = pathname?.startsWith('/en') ? 'en' : 'tr';

  // Generate or get visitor ID and check if new session
  const getVisitorId = useCallback((): { visitorId: string | null; isNewSession: boolean } => {
    if (typeof window === 'undefined') return { visitorId: null, isNewSession: false };
    
    let visitorId = localStorage.getItem('falci_visitor_id');
    let isNewSession = false;
    
    if (!visitorId) {
      visitorId = `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('falci_visitor_id', visitorId);
      isNewSession = true;
    }
    
    // Check if it's a new day (for daily unique visits)
    const lastVisitDate = localStorage.getItem('falci_last_visit_date');
    const today = new Date().toDateString();
    if (lastVisitDate !== today) {
      localStorage.setItem('falci_last_visit_date', today);
      isNewSession = true;
    }
    
    return { visitorId, isNewSession };
  }, []);

  // Update presence and get count
  const updatePresence = useCallback(async (forceNewSession = false) => {
    const { visitorId, isNewSession } = getVisitorId();
    if (!visitorId) return;

    try {
      const response = await fetch('/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          visitorId, 
          path: pathname,
          isNewSession: forceNewSession || isNewSession
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setCount(data.count || 0);
      }
    } catch (error) {
      console.error('Presence update error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [getVisitorId, pathname]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    // Initial update
    updatePresence();

    // Update every 30 seconds
    const interval = setInterval(updatePresence, 30000);

    // Update on visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updatePresence();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [mounted, updatePresence]);

  // Don't render until mounted to prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  if (variant === 'admin') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <span className="text-green-400 font-bold text-4xl font-serif">
          {isLoading ? '...' : count}
        </span>
        <span className="text-green-400/70 text-sm">
          {'kişi şu an sitede'}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {showIcon && (
        <div className="relative">
          <Users className="w-4 h-4 text-green-400" />
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
        </div>
      )}
      <span className="text-green-400 font-medium text-sm">
        {isLoading ? '...' : count}
      </span>
      {showLabel && (
        <span className="text-green-400/70 text-xs hidden sm:inline">
          online
        </span>
      )}
    </div>
  );
}
