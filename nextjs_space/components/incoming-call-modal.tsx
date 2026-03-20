'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useLanguage } from '@/lib/language-context';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, User, Video, Clock } from 'lucide-react';

interface IncomingSession {
  id: string;
  fortuneType: string;
  status: string;
  maxMinutes: number;
  teller: {
    id: string;
    displayName: string;
    avatar: string | null;
  };
}

export default function IncomingCallModal() {
  const { data: session } = useSession() || {};
  const router = useRouter();
  const params = useParams();
  const { language } = useLanguage();
  
  const [incomingSession, setIncomingSession] = useState<IncomingSession | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [dismissedSessions, setDismissedSessions] = useState<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check if we're already in a live room
  const isInLiveRoom = typeof window !== 'undefined' && 
    window.location.pathname.includes('/canli-oda/');

  useEffect(() => {
    if (!session?.user || isInLiveRoom) return;

    const checkForActiveSessions = async () => {
      try {
        const res = await fetch('/api/user/active-sessions');
        if (!res.ok) return;
        
        const sessions = await res.json();
        
        // Find a session that hasn't been dismissed
        const activeSession = sessions.find(
          (s: IncomingSession) => !dismissedSessions.has(s.id)
        );

        if (activeSession && !incomingSession) {
          setIncomingSession(activeSession);
          setIsVisible(true);
          // Play ringtone
          playRingtone();
        } else if (!activeSession) {
          setIsVisible(false);
          setIncomingSession(null);
          stopRingtone();
        }
      } catch (err) {
        console.error('Error checking sessions:', err);
      }
    };

    // Check immediately
    checkForActiveSessions();
    
    // Poll every 3 seconds
    pollIntervalRef.current = setInterval(checkForActiveSessions, 10000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      stopRingtone();
    };
  }, [session, isInLiveRoom, dismissedSessions, incomingSession]);

  const playRingtone = () => {
    // Simple beep sound using Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 440;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      
      // Create pulsing effect
      const pulseInterval = setInterval(() => {
        gainNode.gain.value = gainNode.gain.value === 0.3 ? 0 : 0.3;
      }, 500);
      
      audioRef.current = {
        pause: () => {
          clearInterval(pulseInterval);
          oscillator.stop();
          audioContext.close();
        }
      } as unknown as HTMLAudioElement;
      
      // Auto-stop after 30 seconds
      setTimeout(() => {
        stopRingtone();
      }, 30000);
    } catch (e) {
      console.error('Error playing ringtone:', e);
    }
  };

  const stopRingtone = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  };

  const handleAccept = () => {
    if (!incomingSession) return;
    stopRingtone();
    setIsVisible(false);
    router.push(`/canli-oda/${incomingSession.id}`);
  };

  const handleDecline = async () => {
    if (!incomingSession) return;
    stopRingtone();
    
    // Add to dismissed sessions so it won't show again
    setDismissedSessions(prev => new Set([...prev, incomingSession.id]));
    setIsVisible(false);
    setIncomingSession(null);
  };

  const handleLater = () => {
    if (!incomingSession) return;
    stopRingtone();
    
    // Add to dismissed sessions temporarily
    setDismissedSessions(prev => new Set([...prev, incomingSession.id]));
    setIsVisible(false);
    setIncomingSession(null);
  };

  if (!isVisible || !incomingSession) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="bg-gradient-to-br from-deep-purple-900 to-deep-purple-950 rounded-2xl p-8 max-w-md w-full mx-4 border border-purple-500/30 shadow-2xl"
        >
          {/* Caller Avatar */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-purple-700 flex items-center justify-center overflow-hidden border-4 border-gold-500 animate-pulse">
                {incomingSession.teller.avatar ? (
                  <img
                    src={incomingSession.teller.avatar}
                    alt={incomingSession.teller.displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12 text-white" />
                )}
              </div>
              {/* Pulsing rings */}
              <div className="absolute inset-0 rounded-full border-4 border-gold-500/50 animate-ping" />
            </div>
            
            <h2 className="mt-4 text-2xl font-bold text-white">
              {incomingSession.teller.displayName}
            </h2>
            <p className="text-purple-300 mt-1 flex items-center gap-2">
              <Video className="w-4 h-4" />
              {'Canlı Seans Başlatmak İstiyor'}
            </p>
            <p className="text-sm text-purple-400 mt-2 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {incomingSession.maxMinutes} {'dakika'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            {/* Accept */}
            <button
              onClick={handleAccept}
              className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl flex items-center justify-center gap-3 transition-all transform hover:scale-105"
            >
              <Phone className="w-6 h-6" />
              {'Kabul Et'}
            </button>

            {/* Later */}
            <button
              onClick={handleLater}
              className="w-full py-4 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded-xl flex items-center justify-center gap-3 transition-all"
            >
              <Clock className="w-6 h-6" />
              {'Beklet'}
            </button>

            {/* Decline */}
            <button
              onClick={handleDecline}
              className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl flex items-center justify-center gap-3 transition-all"
            >
              <PhoneOff className="w-6 h-6" />
              {'Kapat'}
            </button>
          </div>

          <p className="text-center text-sm text-purple-400 mt-4">
            {'Falcı sizi bekliyor. Lütfen bir seçim yapın.'}
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
