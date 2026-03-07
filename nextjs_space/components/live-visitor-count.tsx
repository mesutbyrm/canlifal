'use client';

import { useEffect, useState, useCallback } from 'react';
import { Users, Eye } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/lib/language-context';

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
  const pathname = usePathname();
  const { language } = useLanguage();

  // Generate or get visitor ID
  const getVisitorId = useCallback(() => {
    if (typeof window === 'undefined') return null;
    
    let visitorId = localStorage.getItem('falci_visitor_id');
    if (!visitorId) {
      visitorId = `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('falci_visitor_id', visitorId);
    }
    return visitorId;
  }, []);

  // Update presence and get count
  const updatePresence = useCallback(async () => {
    const visitorId = getVisitorId();
    if (!visitorId) return;

    try {
      const response = await fetch('/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId, path: pathname }),
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
  }, [updatePresence]);

  if (variant === 'admin') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <span className="text-green-400 font-bold text-4xl font-serif">
          {isLoading ? '...' : count}
        </span>
        <span className="text-green-400/70 text-sm">
          {language === 'tr' ? 'kişi şu an sitede' : 'people online now'}
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
