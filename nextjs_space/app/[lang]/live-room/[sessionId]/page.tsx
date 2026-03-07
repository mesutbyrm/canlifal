'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/language-context';
import { 
  Video, VideoOff, Mic, MicOff, Phone, MessageSquare, 
  Clock, Send, AlertCircle, Plus, User
} from 'lucide-react';

interface RoomData {
  id: string;
  status: string;
  maxMinutes: number;
  minutesUsed: number;
  creditsPerMinute: number;
  isUser: boolean;
  isTeller: boolean;
  peerId: string;
  teller: {
    displayName: string;
    avatar?: string;
    user: { id: string; name: string; image?: string };
  };
  user: {
    id: string;
    name: string;
    image?: string;
    credits: number;
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
  
  // Timer state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showChat, setShowChat] = useState(true);
  
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
          setError(language === 'tr' ? 'Seans bulunamadı' : 'Session not found');
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
      setError(language === 'tr' ? 'Oda bilgisi alınamadı' : 'Failed to get room info');
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
      setConnectionStatus(language === 'tr' ? 'Kamera/mikrofon erişimi isteniyor...' : 'Requesting camera/microphone access...');
      
      // Get local media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      localStreamRef.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      setConnectionStatus(language === 'tr' ? 'Bağlantı kuruluyor...' : 'Establishing connection...');

      // Create peer connection with more STUN/TURN servers
      const configuration: RTCConfiguration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' }
        ],
        iceCandidatePoolSize: 10
      };

      const pc = new RTCPeerConnection(configuration);
      peerConnectionRef.current = pc;

      // Add local tracks to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

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

      pc.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', pc.iceConnectionState);
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          setIsConnected(true);
          setConnectionStatus('');
        } else if (pc.iceConnectionState === 'disconnected') {
          setConnectionStatus(language === 'tr' ? 'Bağlantı kesildi, yeniden bağlanılıyor...' : 'Disconnected, reconnecting...');
        } else if (pc.iceConnectionState === 'failed') {
          setConnectionStatus(language === 'tr' ? 'Bağlantı başarısız' : 'Connection failed');
        }
      };

      pc.onconnectionstatechange = () => {
        console.log('Connection state:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          setIsConnected(true);
          setConnectionStatus('');
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
      setError(language === 'tr' ? 'Kamera/mikrofon erişimi alınamadı. Lütfen izinleri kontrol edin.' : 'Could not access camera/microphone. Please check permissions.');
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

  // Extend session
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
        fetchRoomData();
        alert(language === 'tr' 
          ? `${minutes} dakika eklendi. ${data.creditsUsed} kredi kullanıldı.`
          : `${minutes} minutes added. ${data.creditsUsed} credits used.`);
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      console.error('Extend error:', err);
    }
  };

  // End session
  const endSession = async () => {
    const confirm = window.confirm(
      language === 'tr' 
        ? 'Seansı sonlandırmak istediğinize emin misiniz?'
        : 'Are you sure you want to end the session?'
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
      router.push(`/${language}/dashboard`);
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
        
        // Timer for countdown
        timerRef.current = setInterval(() => {
          setElapsedSeconds(prev => {
            const newElapsed = prev + 1;
            const remaining = maxSecondsRef.current - newElapsed;
            setRemainingSeconds(remaining);
            
            // Auto-end if time is up
            if (remaining <= 0) {
              cleanup();
              router.push(`/${language}/dashboard`);
            }
            return newElapsed;
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
            onClick={() => router.push(`/${language}/dashboard`)}
            className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            {language === 'tr' ? 'Panele Dön' : 'Back to Dashboard'}
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
            {language === 'tr' ? 'Bu seans aktif değil' : 'This session is not active'}
          </p>
          <button
            onClick={() => router.push(`/${language}/dashboard`)}
            className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            {language === 'tr' ? 'Panele Dön' : 'Back to Dashboard'}
          </button>
        </div>
      </div>
    );
  }

  const peerName = roomData.isUser ? roomData.teller.displayName : roomData.user.name;

  return (
    <div className="min-h-screen bg-[#0a0118] flex flex-col">
      {/* Header with timer */}
      <header className="bg-deep-purple-900/80 backdrop-blur-sm border-b border-purple-800 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-purple-700 flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-white font-semibold">{peerName}</h1>
              <p className="text-sm text-gray-400">
                {isConnected 
                  ? (language === 'tr' ? 'Bağlı' : 'Connected')
                  : (language === 'tr' ? 'Bağlanıyor...' : 'Connecting...')
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Timer */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              remainingSeconds < 60 ? 'bg-red-900/50 text-red-400' : 'bg-purple-800/50 text-white'
            }`}>
              <Clock className="w-5 h-5" />
              <span className="font-mono text-lg">{formatTime(remainingSeconds)}</span>
            </div>

            {/* Extend button (only for user) */}
            {roomData.isUser && (
              <div className="relative group">
                <button className="flex items-center gap-2 px-4 py-2 bg-gold-600 text-black rounded-lg hover:bg-gold-500">
                  <Plus className="w-4 h-4" />
                  {language === 'tr' ? 'Süre Ekle' : 'Add Time'}
                </button>
                <div className="absolute right-0 top-full mt-2 bg-deep-purple-800 rounded-lg shadow-xl border border-purple-700 hidden group-hover:block z-10">
                  <button
                    onClick={() => extendSession(5)}
                    className="block w-full px-4 py-2 text-left text-white hover:bg-purple-700"
                  >
                    +5 {language === 'tr' ? 'dk' : 'min'} ({roomData.creditsPerMinute * 5} {language === 'tr' ? 'kredi' : 'credits'})
                  </button>
                  <button
                    onClick={() => extendSession(10)}
                    className="block w-full px-4 py-2 text-left text-white hover:bg-purple-700"
                  >
                    +10 {language === 'tr' ? 'dk' : 'min'} ({roomData.creditsPerMinute * 10} {language === 'tr' ? 'kredi' : 'credits'})
                  </button>
                  <button
                    onClick={() => extendSession(15)}
                    className="block w-full px-4 py-2 text-left text-white hover:bg-purple-700"
                  >
                    +15 {language === 'tr' ? 'dk' : 'min'} ({roomData.creditsPerMinute * 15} {language === 'tr' ? 'kredi' : 'credits'})
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Video area */}
        <div className={`flex-1 p-4 ${showChat ? 'w-2/3' : 'w-full'}`}>
          <div className="relative h-full bg-black rounded-xl overflow-hidden">
            {/* Remote video (full size) */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {/* Local video (picture-in-picture) */}
            <div className="absolute bottom-4 right-4 w-48 h-36 bg-gray-900 rounded-lg overflow-hidden border-2 border-purple-500 shadow-lg">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${!isVideoEnabled ? 'hidden' : ''}`}
              />
              {!isVideoEnabled && (
                <div className="w-full h-full flex items-center justify-center bg-gray-800">
                  <VideoOff className="w-8 h-8 text-gray-500" />
                </div>
              )}
            </div>

            {/* Connection status overlay */}
            {!isConnected && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500 mx-auto mb-4"></div>
                  <p className="text-white">
                    {connectionStatus || (language === 'tr' ? 'Bağlantı kuruluyor...' : 'Establishing connection...')}
                  </p>
                  <p className="text-gray-400 text-sm mt-2">
                    {language === 'tr' 
                      ? 'Diğer tarafın odaya girmesini bekliyorsunuz'
                      : 'Waiting for the other party to join'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat area */}
        {showChat && (
          <div className="w-1/3 border-l border-purple-800 flex flex-col bg-deep-purple-900/50">
            <div className="p-3 border-b border-purple-800">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                {language === 'tr' ? 'Sohbet' : 'Chat'}
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.senderId === session?.user?.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    msg.senderId === session?.user?.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-white'
                  }`}>
                    <p>{msg.message}</p>
                    <p className="text-xs opacity-60 mt-1">
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="p-3 border-t border-purple-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder={language === 'tr' ? 'Mesaj yaz...' : 'Type a message...'}
                  className="flex-1 bg-deep-purple-800 text-white rounded-lg px-4 py-2 border border-purple-700 focus:outline-none focus:border-gold-500"
                />
                <button
                  onClick={sendMessage}
                  className="p-2 bg-gold-600 text-black rounded-lg hover:bg-gold-500"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-deep-purple-900/80 backdrop-blur-sm border-t border-purple-800 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-4">
          <button
            onClick={toggleVideo}
            className={`p-4 rounded-full transition-colors ${
              isVideoEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-500'
            }`}
            title={isVideoEnabled ? (language === 'tr' ? 'Kamerayı Kapat' : 'Turn off camera') : (language === 'tr' ? 'Kamerayı Aç' : 'Turn on camera')}
          >
            {isVideoEnabled ? <Video className="w-6 h-6 text-white" /> : <VideoOff className="w-6 h-6 text-white" />}
          </button>

          <button
            onClick={toggleAudio}
            className={`p-4 rounded-full transition-colors ${
              isAudioEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-500'
            }`}
            title={isAudioEnabled ? (language === 'tr' ? 'Mikrofonu Kapat' : 'Mute') : (language === 'tr' ? 'Mikrofonu Aç' : 'Unmute')}
          >
            {isAudioEnabled ? <Mic className="w-6 h-6 text-white" /> : <MicOff className="w-6 h-6 text-white" />}
          </button>

          <button
            onClick={() => setShowChat(!showChat)}
            className={`p-4 rounded-full transition-colors ${
              showChat ? 'bg-purple-600 hover:bg-purple-500' : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title={language === 'tr' ? 'Sohbet' : 'Chat'}
          >
            <MessageSquare className="w-6 h-6 text-white" />
          </button>

          <button
            onClick={endSession}
            className="p-4 rounded-full bg-red-600 hover:bg-red-500 transition-colors"
            title={language === 'tr' ? 'Seansı Bitir' : 'End Session'}
          >
            <Phone className="w-6 h-6 text-white transform rotate-135" />
          </button>
        </div>
      </div>
    </div>
  );
}
