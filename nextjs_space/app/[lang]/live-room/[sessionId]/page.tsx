'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/language-context';
import { 
  Video, VideoOff, Mic, MicOff, Phone, MessageSquare, 
  Clock, Send, AlertCircle, Plus, User, SwitchCamera, ChevronUp, ChevronDown, Play, Timer
} from 'lucide-react';
import {
  getRTCConfiguration,
  getMediaConstraints,
  setPreferredCodec,
  applyInitialBitrate,
  AdaptiveBitrateManager,
  setupConnectionRecovery,
  type VideoQuality,
} from '@/lib/webrtc-config';

interface RoomData {
  id: string;
  status: string;
  maxMinutes: number;
  minutesUsed: number;
  creditsPerMinute: number;
  isUser: boolean;
  isTeller: boolean;
  peerId: string;
  timerStarted: boolean;
  timerStartedAt: string | null;
  teller: {
    displayName: string;
    avatar?: string;
    user: { id: string; name: string; image?: string };
  };
  user: {
    id: string;
    name: string;
    image?: string;
    jetonBalance: number;
    membership: string;
  };
}

interface ChatMessage {
  id: string;
  senderId: string;
  message: string;
  createdAt: string;
}

export default function LiveRoomPage() {
  const { data: session } = useSession() || {};
  const params = useParams();
  const router = useRouter();
  const { language, t } = useLanguage();
  const sessionId = params.sessionId as string;

  // Room state
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // WebRTC state
  const [isConnected, setIsConnected] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isChatExpanded, setIsChatExpanded] = useState(true);
  
  // Timer state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [timerStarted, setTimerStarted] = useState(false);
  const [showStartTimerPopup, setShowStartTimerPopup] = useState(false);
  const [userJetons, setUserJetons] = useState(0);
  const [showAddTimePopup, setShowAddTimePopup] = useState(false);
  const [showUserAddTimePopup, setShowUserAddTimePopup] = useState(false);
  const [myJetons, setMyJetons] = useState(0);
  
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  
  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pingRef = useRef<NodeJS.Timeout | null>(null);
  const signalPollRef = useRef<NodeJS.Timeout | null>(null);
  const messagePollRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageTimeRef = useRef<string | null>(null);
  const messageIdsRef = useRef<Set<string>>(new Set());
  const roomDataRef = useRef<RoomData | null>(null);
  const isInitialized = useRef(false);
  const hasCreatedOffer = useRef(false);

  // Update roomDataRef when roomData changes
  useEffect(() => {
    roomDataRef.current = roomData;
  }, [roomData]);

  // Fetch room data
  const fetchRoomData = useCallback(async () => {
    try {
      const res = await fetch(`/api/room/${sessionId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError('Seans bulunamadı');
        } else {
          throw new Error('Failed to fetch room data');
        }
        return null;
      }
      const data = await res.json();
      setRoomData(data);
      roomDataRef.current = data;
      return data;
    } catch (err) {
      console.error('Error fetching room:', err);
      setError('Oda bilgisi alınamadı');
      return null;
    } finally {
      setLoading(false);
    }
  }, [sessionId, language]);

  // Initialize WebRTC
  const initializeWebRTC = useCallback(async (roomInfo: RoomData) => {
    if (isInitialized.current) return peerConnectionRef.current;
    isInitialized.current = true;
    
    try {
      setConnectionStatus('Kamera/mikrofon erişimi isteniyor...');
      
      // Optimize edilmiş getUserMedia - mobil cihazlarda zoom-out sorununu önler
      const constraints = getMediaConstraints('high', facingMode);
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (mediaErr) {
        // Yüksek kalite başarısız olursa düşük kaliteyle dene
        console.warn('Yüksek kalite başarısız, medium deneniyor:', mediaErr);
        const fallback = getMediaConstraints('medium', facingMode);
        stream = await navigator.mediaDevices.getUserMedia(fallback);
      }
      localStreamRef.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      setConnectionStatus('Bağlantı kuruluyor...');

      // STUN + TURN sunucuları ile RTCPeerConnection
      const configuration = getRTCConfiguration();
      const pc = new RTCPeerConnection(configuration);
      peerConnectionRef.current = pc;

      // Add local tracks to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // H264 codec tercihini ayarla (mobilde donanım hızlandırma desteği)
      setPreferredCodec(pc, 'video/H264');

      // Handle remote stream
      pc.ontrack = (event) => {
        console.log('Received remote track:', event.track.kind);
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
          setIsConnected(true);
          setConnectionStatus('');
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = async (event) => {
        if (event.candidate && roomDataRef.current) {
          console.log('Sending ICE candidate');
          await fetch('/api/room/signal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              receiverId: roomDataRef.current.peerId,
              signalType: 'ice-candidate',
              signalData: event.candidate
            })
          });
        }
      };

      // Otomatik bağlantı kurtarma (ICE restart)
      const cleanupRecovery = setupConnectionRecovery(
        pc,
        () => setConnectionStatus('Bağlantı kesildi, yeniden bağlanılıyor...'),
        () => {
          setIsConnected(true);
          setConnectionStatus('');
        },
        () => setConnectionStatus('Bağlantı başarısız'),
        3
      );

      pc.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', pc.iceConnectionState);
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          setIsConnected(true);
          setConnectionStatus('');
        }
      };

      pc.onconnectionstatechange = () => {
        console.log('Connection state:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          setIsConnected(true);
          setConnectionStatus('');
          // Bağlantı kurulduğunda başlangıç bitrate ve adaptif yönetim başlat
          applyInitialBitrate(pc, 'high');
          const abm = new AdaptiveBitrateManager(pc, (quality) => {
            console.log('📊 Video kalitesi değişti:', quality);
          });
          abm.start(3000);
          // Cleanup'a ekle (pc kapanırken durdurulacak)
          const origClose = pc.close.bind(pc);
          pc.close = () => { abm.stop(); cleanupRecovery(); origClose(); };
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          setIsConnected(false);
        }
      };

      // If user is the initiator (the person who booked), create offer
      if (roomInfo.isUser && !hasCreatedOffer.current) {
        hasCreatedOffer.current = true;
        console.log('Creating offer as user...');
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        await pc.setLocalDescription(offer);
        
        await fetch('/api/room/signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            receiverId: roomInfo.peerId,
            signalType: 'offer',
            signalData: offer
          })
        });
        console.log('Offer sent');
      }

      return pc;
    } catch (err) {
      console.error('WebRTC initialization error:', err);
      isInitialized.current = false;
      setError('Kamera/mikrofon erişimi alınamadı. Lütfen izinleri kontrol edin.');
      return null;
    }
  }, [sessionId, language]);

  // Poll for WebRTC signals
  const pollSignals = useCallback(async () => {
    const pc = peerConnectionRef.current;
    const currentRoomData = roomDataRef.current;
    
    if (!pc || !currentRoomData) return;

    try {
      const res = await fetch(`/api/room/signal?sessionId=${sessionId}`);
      if (!res.ok) return;
      
      const signals = await res.json();

      for (const signal of signals) {
        console.log('Processing signal:', signal.signalType);
        
        if (signal.signalType === 'offer') {
          if (pc.signalingState !== 'stable') {
            console.log('Ignoring offer, not in stable state');
            continue;
          }
          await pc.setRemoteDescription(new RTCSessionDescription(signal.signalData));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          
          await fetch('/api/room/signal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              receiverId: currentRoomData.peerId,
              signalType: 'answer',
              signalData: answer
            })
          });
          console.log('Answer sent');
        } else if (signal.signalType === 'answer') {
          if (pc.signalingState !== 'have-local-offer') {
            console.log('Ignoring answer, not in have-local-offer state');
            continue;
          }
          await pc.setRemoteDescription(new RTCSessionDescription(signal.signalData));
          console.log('Answer received and set');
        } else if (signal.signalType === 'ice-candidate') {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.signalData));
            console.log('ICE candidate added');
          }
        }
      }
    } catch (err) {
      console.error('Signal polling error:', err);
    }
  }, [sessionId]);

  // Fetch messages - fixed to avoid duplicates
  const fetchMessages = useCallback(async () => {
    try {
      const url = lastMessageTimeRef.current 
        ? `/api/room/${sessionId}/messages?after=${encodeURIComponent(lastMessageTimeRef.current)}`
        : `/api/room/${sessionId}/messages`;
      
      const res = await fetch(url);
      if (!res.ok) return;
      
      const newMessages: ChatMessage[] = await res.json();
      
      if (newMessages.length > 0) {
        // Filter out duplicates using messageIdsRef
        const uniqueNewMessages = newMessages.filter(msg => {
          if (messageIdsRef.current.has(msg.id)) {
            return false;
          }
          messageIdsRef.current.add(msg.id);
          return true;
        });
        
        if (uniqueNewMessages.length > 0) {
          // Update last message time
          const lastMsg = uniqueNewMessages[uniqueNewMessages.length - 1];
          lastMessageTimeRef.current = lastMsg.createdAt;
          
          setMessages(prev => [...prev, ...uniqueNewMessages]);
        }
      }
    } catch (err) {
      console.error('Fetch messages error:', err);
    }
  }, [sessionId]);

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const messageToSend = newMessage.trim();
    setNewMessage(''); // Clear immediately

    try {
      const res = await fetch(`/api/room/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageToSend })
      });

      if (res.ok) {
        const msg = await res.json();
        // Add to tracking set to prevent duplicate from polling
        if (!messageIdsRef.current.has(msg.id)) {
          messageIdsRef.current.add(msg.id);
          lastMessageTimeRef.current = msg.createdAt;
          setMessages(prev => [...prev, msg]);
        }
      }
    } catch (err) {
      console.error('Send message error:', err);
    }
  };

  // Ping server to track time
  const pingServer = useCallback(async () => {
    try {
      const res = await fetch(`/api/room/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ping' })
      });
      if (res.ok) {
        const data = await res.json();
        // Refresh room data to get updated minutes
        fetchRoomData();
      }
    } catch (err) {
      console.error('Ping error:', err);
    }
  }, [sessionId, fetchRoomData]);

  // Extend session (for users)
  const extendSession = async (minutes: number) => {
    try {
      const res = await fetch(`/api/room/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'extend', minutes })
      });

      if (res.ok) {
        const data = await res.json();
        // Update max seconds ref
        maxSecondsRef.current += minutes * 60;
        setRemainingSeconds(prev => prev + minutes * 60);
        // Update user's own jetons
        if (data.jetonsRemaining !== undefined) {
          setMyJetons(data.jetonsRemaining);
        } else {
          setMyJetons(prev => prev - (data.jetonsUsed || 0));
        }
        setShowUserAddTimePopup(false);
        fetchRoomData();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      console.error('Extend error:', err);
    }
  };

  // Start timer (only teller can do this)
  const startTimer = async () => {
    try {
      const res = await fetch(`/api/room/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start_timer' })
      });

      if (res.ok) {
        setTimerStarted(true);
        setShowStartTimerPopup(false);
        // Reset timer when starting
        setElapsedSeconds(0);
        setRemainingSeconds(maxSecondsRef.current);
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      console.error('Start timer error:', err);
    }
  };

  // Teller adds time (deducts from user's jetons)
  const tellerAddTime = async (minutes: number) => {
    try {
      const res = await fetch(`/api/room/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'teller_add_time', minutes })
      });

      if (res.ok) {
        const data = await res.json();
        // Update max seconds ref
        maxSecondsRef.current += minutes * 60;
        setRemainingSeconds(prev => prev + minutes * 60);
        setUserJetons(data.userJetonsRemaining);
        setShowAddTimePopup(false);
        fetchRoomData();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      console.error('Teller add time error:', err);
    }
  };

  // End session
  const endSession = async () => {
    const confirm = window.confirm(
      'Seansı sonlandırmak istediğinize emin misiniz?'
    );
    if (!confirm) return;

    try {
      await fetch(`/api/room/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end' })
      });

      // Cleanup
      cleanup();
      router.push(`/dashboard`);
    } catch (err) {
      console.error('End session error:', err);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  // Toggle audio
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  // Switch camera (front/back)
  const switchCamera = async () => {
    if (!localStreamRef.current || !peerConnectionRef.current) return;
    
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    
    try {
      // Stop current video track
      const currentVideoTrack = localStreamRef.current.getVideoTracks()[0];
      if (currentVideoTrack) {
        currentVideoTrack.stop();
      }
      
      // Optimize edilmiş kamera değiştirme
      const switchConstraints = getMediaConstraints('high', newFacingMode);
      // Sadece video al, audio mevcut olanı kullan
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: (switchConstraints.video as MediaTrackConstraints),
        audio: false
      });
      
      const newVideoTrack = newStream.getVideoTracks()[0];
      
      // Replace track in local stream
      if (currentVideoTrack) {
        localStreamRef.current.removeTrack(currentVideoTrack);
      }
      localStreamRef.current.addTrack(newVideoTrack);
      
      // Update local video element
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      
      // Replace track in peer connection
      const senders = peerConnectionRef.current.getSenders();
      const videoSender = senders.find(s => s.track?.kind === 'video');
      if (videoSender) {
        await videoSender.replaceTrack(newVideoTrack);
      }
      
      setFacingMode(newFacingMode);
    } catch (err) {
      console.error('Error switching camera:', err);
    }
  };

  // Cleanup function
  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (pingRef.current) clearInterval(pingRef.current);
    if (signalPollRef.current) clearInterval(signalPollRef.current);
    if (messagePollRef.current) clearInterval(messagePollRef.current);
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
  }, []);

  // Initialize on mount - use ref to prevent double initialization
  const hasInitRef = useRef(false);
  const maxSecondsRef = useRef(0);
  
  useEffect(() => {
    if (hasInitRef.current || !session?.user) return;
    
    const init = async () => {
      hasInitRef.current = true;
      
      const roomInfo = await fetchRoomData();
      if (roomInfo && roomInfo.status === 'active') {
        await initializeWebRTC(roomInfo);
        
        // Set up timers
        const maxSeconds = roomInfo.maxMinutes * 60;
        const usedSeconds = roomInfo.minutesUsed * 60;
        maxSecondsRef.current = maxSeconds;
        setRemainingSeconds(maxSeconds - usedSeconds);
        setElapsedSeconds(usedSeconds);
        setTimerStarted(roomInfo.timerStarted);
        setUserJetons(roomInfo.user.jetonBalance);
        // Set user's own jetons for the extension popup
        if (roomInfo.isUser) {
          setMyJetons(roomInfo.user.jetonBalance);
        }
        
        // If teller and timer not started, show popup
        if (roomInfo.isTeller && !roomInfo.timerStarted) {
          setShowStartTimerPopup(true);
        }
        
        // Timer for countdown - only counts if timerStarted is true
        timerRef.current = setInterval(() => {
          setTimerStarted(started => {
            if (!started) return started; // Don't count if not started
            
            setElapsedSeconds(prev => {
              const newElapsed = prev + 1;
              const remaining = maxSecondsRef.current - newElapsed;
              setRemainingSeconds(remaining);
              
              // Auto-end if time is up
              if (remaining <= 0) {
                cleanup();
                router.push(`/dashboard`);
              }
              return newElapsed;
            });
            return started;
          });
        }, 1000);
        
        // Ping server every minute
        pingRef.current = setInterval(pingServer, 60000);
        
        // Poll for signals every 1.5 seconds
        signalPollRef.current = setInterval(pollSignals, 1500);
        
        // Poll for messages every 3 seconds
        messagePollRef.current = setInterval(fetchMessages, 3000);
        
        // Initial fetch
        fetchMessages();
      }
    };

    init();

    return () => {
      cleanup();
    };
  }, [session, sessionId]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0118] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0118] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-white text-xl">{error}</p>
          <button
            onClick={() => router.push(`/dashboard`)}
            className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            {'Panele Dön'}
          </button>
        </div>
      </div>
    );
  }

  if (!roomData || roomData.status !== 'active') {
    return (
      <div className="min-h-screen bg-[#0a0118] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <p className="text-white text-xl">
            {'Bu seans aktif değil'}
          </p>
          <button
            onClick={() => router.push(`/dashboard`)}
            className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            {'Panele Dön'}
          </button>
        </div>
      </div>
    );
  }

  const peerName = roomData.isUser ? roomData.teller.displayName : roomData.user.name;

  return (
    <div className="h-screen w-screen bg-[#0a0118] flex flex-col overflow-hidden">
      {/* Top bar - minimal */}
      <div className="absolute top-0 left-0 right-0 z-20 p-3 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
        {/* Peer info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-700 flex items-center justify-center border-2 border-white/30">
            <User className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-semibold text-sm">{peerName}</h1>
            <p className="text-xs text-gray-300">
              {isConnected 
                ? ('● Bağlı')
                : ('○ Bağlanıyor...')
              }
            </p>
          </div>
        </div>

        {/* Timer & Extend */}
        <div className="flex items-center gap-2">
          {/* Timer display - shows different status based on timerStarted */}
          {timerStarted ? (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-mono ${
              remainingSeconds < 60 ? 'bg-red-600 text-white animate-pulse' : 'bg-white/20 text-white'
            }`}>
              <Clock className="w-4 h-4" />
              {formatTime(remainingSeconds)}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm bg-yellow-600/80 text-white">
              <Timer className="w-4 h-4" />
              {'Bekleniyor'}
            </div>
          )}
          
          {/* User can extend session - popup button */}
          {roomData.isUser && timerStarted && (
            <button 
              onClick={() => setShowUserAddTimePopup(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-gold-600 text-black rounded-full text-sm font-semibold hover:bg-gold-500"
            >
              <Plus className="w-4 h-4" />
              {'Süre Ekle'}
            </button>
          )}

          {/* Teller can add time (deducts from user) */}
          {roomData.isTeller && timerStarted && (
            <button 
              onClick={() => setShowAddTimePopup(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-full text-sm font-semibold hover:bg-green-500"
            >
              <Plus className="w-4 h-4" />
              {'Süre Ekle'}
            </button>
          )}
        </div>
      </div>

      {/* Main video area - fullscreen */}
      <div className={`flex-1 relative ${isChatExpanded ? 'pb-[140px]' : 'pb-[40px]'}`}>
        {/* Remote video (full size) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-contain bg-black"
        />

        {/* Local video (picture-in-picture) - draggable position */}
        <div className="absolute top-16 right-3 w-28 h-40 sm:w-36 sm:h-48 bg-gray-900 rounded-xl overflow-hidden border-2 border-purple-500 shadow-2xl z-10">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover bg-black ${!isVideoEnabled ? 'hidden' : ''}`}
          />
          {!isVideoEnabled && (
            <div className="w-full h-full flex items-center justify-center bg-gray-800">
              <VideoOff className="w-8 h-8 text-gray-500" />
            </div>
          )}
          
          {/* Camera switch button on local video */}
          <button
            onClick={switchCamera}
            className="absolute bottom-2 right-2 p-2 bg-black/60 rounded-full hover:bg-black/80 transition-colors"
            title={'Kamera Çevir'}
          >
            <SwitchCamera className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Connection status overlay */}
        {!isConnected && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-5">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-gold-500 mx-auto mb-4"></div>
              <p className="text-white text-lg">
                {connectionStatus || ('Bağlantı kuruluyor...')}
              </p>
              <p className="text-gray-400 text-sm mt-2">
                {'Diğer tarafın odaya girmesini bekliyorsunuz'}
              </p>
            </div>
          </div>
        )}

        {/* Control buttons - floating in center-bottom of video */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
          <button
            onClick={toggleVideo}
            className={`p-3 rounded-full transition-colors shadow-lg ${
              isVideoEnabled ? 'bg-white/20 hover:bg-white/30' : 'bg-red-600 hover:bg-red-500'
            }`}
          >
            {isVideoEnabled ? <Video className="w-5 h-5 text-white" /> : <VideoOff className="w-5 h-5 text-white" />}
          </button>

          <button
            onClick={toggleAudio}
            className={`p-3 rounded-full transition-colors shadow-lg ${
              isAudioEnabled ? 'bg-white/20 hover:bg-white/30' : 'bg-red-600 hover:bg-red-500'
            }`}
          >
            {isAudioEnabled ? <Mic className="w-5 h-5 text-white" /> : <MicOff className="w-5 h-5 text-white" />}
          </button>

          <button
            onClick={switchCamera}
            className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors shadow-lg"
            title={'Kamera Çevir'}
          >
            <SwitchCamera className="w-5 h-5 text-white" />
          </button>

          <button
            onClick={endSession}
            className="p-3 rounded-full bg-red-600 hover:bg-red-500 transition-colors shadow-lg"
          >
            <Phone className="w-5 h-5 text-white transform rotate-135" />
          </button>
        </div>
      </div>

      {/* Chat area - bottom panel */}
      <div className={`absolute bottom-0 left-0 right-0 bg-deep-purple-900/95 backdrop-blur-sm border-t border-purple-700 transition-all duration-300 ${
        isChatExpanded ? 'h-[140px]' : 'h-[40px]'
      }`}>
        {/* Chat header with toggle */}
        <button
          onClick={() => setIsChatExpanded(!isChatExpanded)}
          className="w-full px-3 py-1.5 flex items-center justify-between text-white hover:bg-purple-800/50"
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">
              {'Sohbet'}
              {messages.length > 0 && <span className="ml-1 text-gold-400">({messages.length})</span>}
            </span>
          </div>
          {isChatExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>

        {/* Chat content */}
        {isChatExpanded && (
          <div className="flex flex-col h-[calc(100%-32px)]">
            {/* Input - moved to top */}
            <div className="px-2 py-1.5 border-b border-purple-800 flex-shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder={'Mesaj yaz...'}
                  className="flex-1 bg-deep-purple-800 text-white rounded-full px-3 py-1.5 text-xs border border-purple-700 focus:outline-none focus:border-gold-500"
                />
                <button
                  onClick={sendMessage}
                  className="p-1.5 bg-gold-600 text-black rounded-full hover:bg-gold-500"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Messages - flow from top to bottom */}
            <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1 min-h-0">
              {messages.length === 0 ? (
                <p className="text-center text-gray-500 text-xs py-2">
                  {'Henüz mesaj yok'}
                </p>
              ) : (
                messages.map((msg, index) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.senderId === session?.user?.id ? 'justify-end' : 'justify-start'} animate-slideIn`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className={`max-w-[80%] rounded-lg px-2 py-1 text-xs ${
                      msg.senderId === session?.user?.id
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-white'
                    }`}>
                      <p>{msg.message}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Start Timer Popup - Only for Teller */}
      {showStartTimerPopup && roomData.isTeller && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-purple-900 to-deep-purple-900 rounded-2xl p-6 max-w-sm mx-4 border border-purple-600 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Play className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                {'Seansı Başlat'}
              </h3>
              <p className="text-gray-300 text-sm">
                {`${roomData.user.name} bağlandı. Süreyi başlatmak için aşağıdaki butona tıklayın veya önce süre seçin.`}
              </p>
              <p className="text-gold-400 text-sm mt-2">
                {`Kullanıcının jetonu}`
                  : `User jetons: ${userJetons}`
                }
              </p>
            </div>

            {/* Quick start - uses existing maxMinutes */}
            <button
              onClick={startTimer}
              className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl mb-4 hover:from-green-600 hover:to-emerald-600 transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" />
              {'Şimdi Başlat'}
            </button>

            {/* Or select duration and add time first */}
            <div className="border-t border-purple-700 pt-4">
              <p className="text-gray-400 text-xs mb-3 text-center">
                {'veya önce süre ekleyin:'}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[5, 10, 15].map((mins) => {
                  const cost = mins * roomData.creditsPerMinute;
                  const canAfford = userJetons >= cost;
                  return (
                    <button
                      key={mins}
                      onClick={async () => {
                        if (canAfford) {
                          await tellerAddTime(mins);
                          await startTimer();
                        }
                      }}
                      disabled={!canAfford}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                        canAfford 
                          ? 'bg-purple-700 text-white hover:bg-purple-600' 
                          : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <div>{mins} dk</div>
                      <div className="text-xs text-gray-400">{cost} jeton</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Time Popup - Only for Teller */}
      {showAddTimePopup && roomData.isTeller && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-purple-900 to-deep-purple-900 rounded-2xl p-6 max-w-sm mx-4 border border-purple-600 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                {'Süre Ekle'}
              </h3>
              <p className="text-gray-300 text-sm">
                {'Kullanıcının jetonundan düşülecek'
                }
              </p>
              <p className="text-gold-400 text-sm mt-2">
                {`Kullanıcının jetonu}`
                  : `User jetons: ${userJetons}`
                }
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              {[5, 10, 15, 20, 25, 30].map((mins) => {
                const cost = mins * roomData.creditsPerMinute;
                const canAfford = userJetons >= cost;
                return (
                  <button
                    key={mins}
                    onClick={() => canAfford && tellerAddTime(mins)}
                    disabled={!canAfford}
                    className={`py-3 px-2 rounded-xl text-sm font-medium transition-all ${
                      canAfford 
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600' 
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <div className="text-lg font-bold">{mins}</div>
                    <div className="text-xs opacity-80">{'dakika'}</div>
                    <div className="text-xs mt-1 opacity-70">{cost} ₺</div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setShowAddTimePopup(false)}
              className="w-full py-2 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-all"
            >
              {'İptal'}
            </button>
          </div>
        </div>
      )}

      {/* Add Time Popup - Only for User */}
      {showUserAddTimePopup && roomData.isUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-purple-900 to-deep-purple-900 rounded-2xl p-6 max-w-sm mx-4 border border-purple-600 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-gold-500 to-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                {'Süre Ekle'}
              </h3>
              <p className="text-gray-300 text-sm">
                {'Seansa ek süre ekleyin'
                }
              </p>
              <p className="text-gold-400 text-sm mt-2">
                {`Mevcut Jetonunuz}`
                  : `Your Jetons: ${myJetons}`
                }
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { mins: 5, cost: 50 },
                { mins: 10, cost: 100 },
                { mins: 15, cost: 150 },
                { mins: 20, cost: 200 },
                { mins: 25, cost: 250 },
                { mins: 30, cost: 300 }
              ].map(({ mins, cost }) => {
                const canAfford = myJetons >= cost;
                return (
                  <button
                    key={mins}
                    onClick={() => canAfford && extendSession(mins)}
                    disabled={!canAfford}
                    className={`py-3 px-2 rounded-xl text-sm font-medium transition-all ${
                      canAfford 
                        ? 'bg-gradient-to-r from-gold-500 to-yellow-500 text-black hover:from-gold-600 hover:to-yellow-600' 
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <div className="text-lg font-bold">{mins}</div>
                    <div className="text-xs opacity-80">{'dakika'}</div>
                    <div className="text-xs mt-1 font-semibold">{cost} ₺</div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setShowUserAddTimePopup(false)}
              className="w-full py-2 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-all"
            >
              {'İptal'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
