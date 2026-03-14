'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import GiftNotificationBanner from '@/components/gift-notification-banner'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  Heart,
  MessageCircle,
  X,
  Video,
  VideoOff,
  Mic,
  MicOff,
  SwitchCamera,
  Radio,
  Gift,
  Coins,
  Users,
  Send,
  UserPlus,
  VolumeX,
  Volume2,
  Ban,
  MoreVertical,
  Phone,
  PhoneOff
} from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'

interface Comment {
  id: string
  content: string
  user: { name: string; image?: string | null }
}

interface CenterGift {
  id: string
  senderName: string
  senderImage?: string | null
  icon: string
  giftName: string
  targetUserId?: string // Who received the gift (broadcaster or co-broadcaster)
}

interface Viewer {
  id: string
  odUserId?: string
  odUserName?: string
  name: string
  image?: string | null
  hasGifted: boolean
  totalGiftAmount: number
}

interface CoBroadcaster {
  id: string
  userId: string
  status: string
  isMuted: boolean
  isVideoOff: boolean
  user: { id: string; name: string; image?: string | null }
  giftScore?: number
}

interface FloatingHeart {
  id: number
  color: string
  side?: 'left' | 'right'
}

interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
  userName?: string
  userImage?: string | null
}

interface StreamCategory {
  id: string
  name: string
  nameEn: string
  icon: string
  color: string
}

const HEART_COLORS = ['#ff2d55', '#ff375f', '#ff6b6b', '#ff85a1', '#ffa9c1']
const MAX_GUESTS = 4 // Maximum co-broadcasters allowed
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' }
]
const RECONNECT_DELAY = 2000 // ms before attempting reconnect
const MAX_RECONNECT_ATTEMPTS = 5

export default function BroadcastPage() {
  const { data: session } = useSession() || {}
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { language } = useLanguage()
  const streamId = params.streamId as string
  const isCohost = searchParams.get('cohost') === 'true'

  const [viewerCount, setViewerCount] = useState(0)
  const [likeCount, setLikeCount] = useState(0)
  const [totalGiftJetons, setTotalGiftCredits] = useState(0)
  const [comments, setComments] = useState<Comment[]>([])
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [isAudioOn, setIsAudioOn] = useState(true)
  const [streamCategory, setStreamCategory] = useState<StreamCategory | null>(null)
  // Co-broadcast state - supports up to MAX_GUESTS (4) simultaneous guests
  const [activeGuests, setActiveGuests] = useState<CoBroadcaster[]>([])
  // Pending co-broadcast request popup
  const [pendingCoBroadcastRequest, setPendingCoBroadcastRequest] = useState<CoBroadcaster | null>(null)
  // Connection states for reconnection handling
  const [guestConnectionStates, setGuestConnectionStates] = useState<Map<string, RTCPeerConnectionState>>(new Map())
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([])
  const [duration, setDuration] = useState(0)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [connectedViewers, setConnectedViewers] = useState(0)
  const [centerGift, setCenterGift] = useState<CenterGift | null>(null)
  const [viewers, setViewers] = useState<Viewer[]>([])
  const [newComment, setNewComment] = useState('')
  const [showViewers, setShowViewers] = useState(false)
  const [coBroadcasters, setCoBroadcasters] = useState<CoBroadcaster[]>([])
  const [selectedViewer, setSelectedViewer] = useState<Viewer | null>(null)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [remoteAudioEnabled, setRemoteAudioEnabled] = useState(false)
  const [liveBroadcasters, setLiveBroadcasters] = useState<{id: string; userId: string; title: string | null; category: string | null; user: {id: string; name: string | null; image: string | null}; viewerCount: number}[]>([])
  const [showLiveBroadcasters, setShowLiveBroadcasters] = useState(false)


  const localVideoRef = useRef<HTMLVideoElement>(null)
  // Video refs for up to 4 guests (dynamically created in render)
  const guestVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map())
  const broadcasterVideoRef = useRef<HTMLVideoElement>(null) // For co-host to see broadcaster
  const shownNotificationIdsRef = useRef<Set<string>>(new Set())
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  // PeerConnections for each guest (Map: guestId -> RTCPeerConnection)
  const guestPcRefs = useRef<Map<string, RTCPeerConnection>>(new Map())
  const broadcasterPcRef = useRef<RTCPeerConnection | null>(null) // Co-host's connection to broadcaster
  const processedViewersRef = useRef<Set<string>>(new Set())
  const processedGuestsRef = useRef<Set<string>>(new Set())
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidate[]>>(new Map())
  const guestCandidatesRef = useRef<Map<string, RTCIceCandidate[]>>(new Map())
  const broadcasterCandidatesRef = useRef<RTCIceCandidate[]>([]) // For co-host
  const reconnectAttemptsRef = useRef<Map<string, number>>(new Map())
  const heartIdRef = useRef(0)
  const lastGiftIdRef = useRef<string>('')
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isUnmountedRef = useRef(false)

  useEffect(() => {
    if (!session?.user) {
      router.push(`/${language}/login`)
      return
    }
    
    // Load stream category from localStorage
    try {
      const savedCategory = localStorage.getItem('streamCategory')
      if (savedCategory) {
        setStreamCategory(JSON.parse(savedCategory))
      }
    } catch (e) {
      console.error('Error loading stream category:', e)
    }
    
    isUnmountedRef.current = false
    startBroadcast()
    
    const durationInterval = setInterval(() => {
      if (!isUnmountedRef.current) setDuration(prev => prev + 1)
    }, 1000)
    
    pollIntervalRef.current = setInterval(() => {
      if (!isUnmountedRef.current) {
        fetchStats()
        fetchComments()
        fetchGifts()
        fetchViewers()
        fetchCoBroadcasters()
        pollViewerSignals()
        pollCoBroadcasterSignals()
        fetchNotifications()
      }
    }, 1000)

    return () => {
      isUnmountedRef.current = true
      clearInterval(durationInterval)
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      cleanup()
    }
  }, [session])

  // Fetch live broadcasters when modal opens
  useEffect(() => {
    if (showLiveBroadcasters) {
      fetchLiveBroadcasters()
    }
  }, [showLiveBroadcasters])



  const startBroadcast = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode,
          width: { ideal: 720, max: 1280 },
          height: { ideal: 1280, max: 1920 },
          aspectRatio: { ideal: 9/16 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      
      localStreamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
    } catch (error) {
      console.error('Camera error:', error)
      alert(language === 'tr' ? 'Kamera erişimi sağlanamadı' : 'Could not access camera')
      router.back()
    }
  }

  // Co-host: Poll for broadcaster signals and send our stream + receive broadcaster's stream
  // Co-host receives offer from broadcaster and sends answer
  const pollCohostSignals = async () => {
    if (!localStreamRef.current || isUnmountedRef.current || !isCohost) return
    
    try {
      const res = await fetch(`/api/video-streams/signal?streamId=${streamId}&recipientId=${session?.user?.id}&type=cohost`)
      if (!res.ok) return
      const signals = await res.json()

      for (const signal of signals) {
        if (isUnmountedRef.current) break
        
        // Broadcaster sent us an offer
        if (signal.type === 'broadcaster-offer' && signal.data?.offer && signal.data?.broadcasterId) {
          const broadcasterId = signal.data.broadcasterId
          
          // Create peer connection if not exists
          if (!broadcasterPcRef.current) {
            console.log('🎤 Co-host: Creating peer connection for broadcaster', broadcasterId)
            
            const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS, iceCandidatePoolSize: 10 })
            broadcasterPcRef.current = pc

            // Add our local tracks to send video/audio to broadcaster
            localStreamRef.current.getTracks().forEach(track => {
              console.log('🎤 Co-host: Adding track to PC:', track.kind)
              pc.addTrack(track, localStreamRef.current!)
            })
            
            // Handle incoming broadcaster stream
            pc.ontrack = (event) => {
              console.log('🎤 Co-host received broadcaster track:', event.track.kind)
              if (broadcasterVideoRef.current && event.streams[0]) {
                console.log('🎤 Co-host: Setting broadcaster video stream')
                broadcasterVideoRef.current.srcObject = event.streams[0]
                broadcasterVideoRef.current.muted = false
                broadcasterVideoRef.current.volume = 1.0
                broadcasterVideoRef.current.play().then(() => {
                  console.log('🎤 Co-host: Broadcaster video playing with audio')
                  setRemoteAudioEnabled(true)
                }).catch(e => {
                  console.log('🎤 Co-host: Autoplay blocked, trying muted first:', e)
                  if (broadcasterVideoRef.current) {
                    broadcasterVideoRef.current.muted = true
                    broadcasterVideoRef.current.play().catch(() => {})
                  }
                })
              }
            }

            pc.onicecandidate = async (event) => {
              if (event.candidate && !isUnmountedRef.current) {
                console.log('🎤 Co-host: Sending ICE candidate to broadcaster')
                await fetch('/api/video-streams/signal', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    streamId,
                    type: 'cohost-ice-candidate',
                    receiverId: broadcasterId,
                    data: { candidate: event.candidate.toJSON(), fromCohost: true }
                  })
                }).catch(() => {})
              }
            }

            pc.onconnectionstatechange = () => {
              console.log('🎤 Co-host: Connection state:', pc.connectionState)
            }

            // Set remote description (broadcaster's offer) and create answer
            try {
              console.log('🎤 Co-host: Setting remote description (broadcaster offer)')
              await pc.setRemoteDescription(new RTCSessionDescription(signal.data.offer))
              
              // Add any pending ICE candidates
              for (const candidate of broadcasterCandidatesRef.current) {
                try { await pc.addIceCandidate(candidate) } catch (e) {}
              }
              broadcasterCandidatesRef.current = []
              
              // Create and send answer
              const answer = await pc.createAnswer()
              await pc.setLocalDescription(answer)
              
              console.log('🎤 Co-host: Sending answer to broadcaster')
              await fetch('/api/video-streams/signal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  streamId,
                  type: 'cohost-answer',
                  receiverId: broadcasterId,
                  data: { answer: pc.localDescription?.toJSON() }
                })
              })
            } catch (e) {
              console.error('🎤 Co-host: Error handling offer:', e)
            }
          }
        } else if (signal.type === 'cohost-ice-candidate' && signal.data?.candidate && signal.data?.fromBroadcaster && broadcasterPcRef.current) {
          // ICE candidate from broadcaster
          try {
            console.log('🎤 Co-host: Received ICE candidate from broadcaster')
            if (broadcasterPcRef.current.remoteDescription) {
              await broadcasterPcRef.current.addIceCandidate(new RTCIceCandidate(signal.data.candidate))
            } else {
              broadcasterCandidatesRef.current.push(new RTCIceCandidate(signal.data.candidate))
            }
          } catch (e) {}
        }
      }
    } catch (error) {}
  }

  const pollViewerSignals = async () => {
    if (!localStreamRef.current || isUnmountedRef.current) return
    
    // If we are cohost, poll for cohost signals instead
    if (isCohost) {
      await pollCohostSignals()
      return
    }
    
    try {
      const res = await fetch(`/api/video-streams/signal?streamId=${streamId}&recipientId=broadcaster`)
      if (!res.ok) return
      const signals = await res.json()

      for (const signal of signals) {
        if (isUnmountedRef.current) break
        
        const viewerId = signal.data?.viewerId || signal.senderId
        if (!viewerId) continue
        
        if (signal.type === 'viewer-join') {
          if (!processedViewersRef.current.has(viewerId)) {
            processedViewersRef.current.add(viewerId)
            await createConnectionForViewer(viewerId)
          }
        } else if (signal.type === 'answer' && signal.data?.answer) {
          const pc = peerConnectionsRef.current.get(viewerId)
          if (pc && pc.signalingState === 'have-local-offer') {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(signal.data.answer))
              const pending = pendingCandidatesRef.current.get(viewerId) || []
              for (const candidate of pending) {
                try { await pc.addIceCandidate(candidate) } catch (e) {}
              }
              pendingCandidatesRef.current.set(viewerId, [])
            } catch (e) {}
          }
        } else if (signal.type === 'ice-candidate' && signal.data?.candidate) {
          const pc = peerConnectionsRef.current.get(viewerId)
          if (pc) {
            try {
              if (pc.remoteDescription) {
                await pc.addIceCandidate(new RTCIceCandidate(signal.data.candidate))
              } else {
                const pending = pendingCandidatesRef.current.get(viewerId) || []
                pending.push(new RTCIceCandidate(signal.data.candidate))
                pendingCandidatesRef.current.set(viewerId, pending)
              }
            } catch (e) {}
          }
        }
      }
    } catch (error) {}
  }

  const createConnectionForViewer = async (viewerId: string) => {
    if (!localStreamRef.current || isUnmountedRef.current) return
    
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS, iceCandidatePoolSize: 10 })
    peerConnectionsRef.current.set(viewerId, pc)

    localStreamRef.current.getTracks().forEach(track => {
      if (localStreamRef.current) pc.addTrack(track, localStreamRef.current)
    })

    pc.onicecandidate = async (event) => {
      if (event.candidate && !isUnmountedRef.current) {
        await fetch('/api/video-streams/signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            streamId,
            type: 'ice-candidate',
            receiverId: viewerId,
            data: { candidate: event.candidate.toJSON() }
          })
        }).catch(() => {})
      }
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setConnectedViewers(prev => prev + 1)
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setConnectedViewers(prev => Math.max(0, prev - 1))
      }
    }

    try {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      
      await fetch('/api/video-streams/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          streamId,
          type: 'offer',
          receiverId: viewerId,
          data: { offer: pc.localDescription?.toJSON() }
        })
      })
    } catch (e) {}
  }

  const fetchStats = async () => {
    try {
      const res = await fetch(`/api/video-streams/${streamId}`)
      if (res.ok) {
        const data = await res.json()
        setViewerCount(data.viewerCount || 0)
        setLikeCount(data.likeCount || 0)
      }
    } catch (e) {}
  }

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/video-streams/${streamId}/comments`)
      if (res.ok) {
        setComments((await res.json()).slice(0, 8))
      }
    } catch (e) {}
  }

  const fetchViewers = async () => {
    try {
      const res = await fetch(`/api/video-streams/${streamId}/viewers`)
      if (res.ok) {
        setViewers(await res.json())
      }
    } catch (e) {}
  }

  const fetchLiveBroadcasters = async () => {
    try {
      const res = await fetch('/api/video-streams')
      if (res.ok) {
        const streams = await res.json()
        // Filter out current stream and current user's streams
        const otherStreams = streams.filter((s: any) => s.id !== streamId && s.userId !== session?.user?.id)
        setLiveBroadcasters(otherStreams)
      }
    } catch (e) {}
  }

  const fetchCoBroadcasters = async () => {
    try {
      const res = await fetch(`/api/video-streams/${streamId}/co-broadcast`)
      if (res.ok) {
        const data = await res.json()
        setCoBroadcasters(data)
        
        // Check for pending/requested co-broadcast requests and show popup (only first one)
        const pending = data.find((cb: CoBroadcaster) => cb.status === 'requested')
        if (pending && !pendingCoBroadcastRequest) {
          // Only show request if we haven't reached max guests
          if (activeGuests.length < MAX_GUESTS) {
            setPendingCoBroadcastRequest(pending)
          }
        }
        
        // Find all active guests (up to MAX_GUESTS)
        const currentActive: CoBroadcaster[] = data
          .filter((cb: CoBroadcaster) => cb.status === 'active')
          .slice(0, MAX_GUESTS)
        
        // Check for new guests to connect
        for (const guest of currentActive) {
          if (!processedGuestsRef.current.has(guest.userId)) {
            console.log('🎬 New guest joined:', guest.userId)
            processedGuestsRef.current.add(guest.userId)
            setupGuestConnection(guest.userId)
          }
        }
        
        // Check for guests who left
        const currentGuestIds = new Set(currentActive.map(g => g.userId))
        for (const [guestId, pc] of guestPcRefs.current) {
          if (!currentGuestIds.has(guestId)) {
            console.log('🎬 Guest left:', guestId)
            pc.close()
            guestPcRefs.current.delete(guestId)
            guestVideoRefs.current.delete(guestId)
            processedGuestsRef.current.delete(guestId)
            reconnectAttemptsRef.current.delete(guestId)
            guestCandidatesRef.current.delete(guestId)
          }
        }
        
        // Update active guests state
        setActiveGuests(currentActive)
      }
    } catch (e) {}
  }

  // Setup WebRTC connection to exchange streams with a guest (bidirectional)
  // Broadcaster creates offer, guest answers
  // Supports up to MAX_GUESTS simultaneous connections with reconnection
  const setupGuestConnection = async (guestId: string, isReconnect: boolean = false) => {
    if (!localStreamRef.current) return
    
    const attempts = reconnectAttemptsRef.current.get(guestId) || 0
    if (isReconnect && attempts >= MAX_RECONNECT_ATTEMPTS) {
      console.log('🎬 Broadcaster: Max reconnect attempts reached for guest', guestId)
      return
    }
    
    if (isReconnect) {
      reconnectAttemptsRef.current.set(guestId, attempts + 1)
      console.log(`🎬 Broadcaster: Reconnect attempt ${attempts + 1}/${MAX_RECONNECT_ATTEMPTS} for guest`, guestId)
    } else {
      reconnectAttemptsRef.current.set(guestId, 0)
    }
    
    // Close existing connection if any
    const existingPc = guestPcRefs.current.get(guestId)
    if (existingPc) {
      existingPc.close()
      guestPcRefs.current.delete(guestId)
    }
    
    console.log('🎬 Broadcaster: Setting up connection with guest', guestId)
    
    const pc = new RTCPeerConnection({ 
      iceServers: ICE_SERVERS, 
      iceCandidatePoolSize: 10,
      iceTransportPolicy: 'all'
    })
    guestPcRefs.current.set(guestId, pc)

    // Add our local tracks to send video/audio to guest
    localStreamRef.current.getTracks().forEach(track => {
      console.log('🎬 Broadcaster: Adding track to guest PC:', track.kind)
      pc.addTrack(track, localStreamRef.current!)
    })

    // Handle incoming tracks from guest
    pc.ontrack = (event) => {
      console.log('🎬 Broadcaster received guest track:', event.track.kind, 'from', guestId)
      const videoEl = guestVideoRefs.current.get(guestId)
      if (videoEl && event.streams[0]) {
        console.log('🎬 Broadcaster: Setting guest video stream for', guestId)
        videoEl.srcObject = event.streams[0]
        videoEl.muted = false
        videoEl.volume = 1.0
        videoEl.play().then(() => {
          console.log('🎬 Broadcaster: Guest video playing with audio for', guestId)
          setRemoteAudioEnabled(true)
          reconnectAttemptsRef.current.set(guestId, 0) // Reset on successful connection
        }).catch(e => {
          console.log('🎬 Broadcaster: Autoplay blocked for guest, trying muted first:', e)
          videoEl.muted = true
          videoEl.play().catch(() => {})
        })
      }
    }

    pc.onicecandidate = async (event) => {
      if (event.candidate && !isUnmountedRef.current) {
        console.log('🎬 Broadcaster: Sending ICE candidate to guest', guestId)
        await fetch('/api/video-streams/signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            streamId,
            type: 'guest-ice-candidate',
            receiverId: guestId,
            data: { candidate: event.candidate.toJSON(), fromBroadcaster: true, guestId }
          })
        }).catch(() => {})
      }
    }

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState
      console.log('🎬 Broadcaster: Connection state for guest', guestId, ':', state)
      setGuestConnectionStates(prev => new Map(prev).set(guestId, state))
      
      // Handle reconnection
      if (state === 'failed' || state === 'disconnected') {
        console.log('🎬 Broadcaster: Connection lost with guest', guestId, '- attempting reconnect')
        setTimeout(() => {
          if (!isUnmountedRef.current && activeGuests.some(g => g.userId === guestId)) {
            setupGuestConnection(guestId, true)
          }
        }, RECONNECT_DELAY)
      } else if (state === 'connected') {
        reconnectAttemptsRef.current.set(guestId, 0)
      }
    }
    
    pc.oniceconnectionstatechange = () => {
      console.log('🎬 Broadcaster: ICE connection state for guest', guestId, ':', pc.iceConnectionState)
      // ICE restart if needed
      if (pc.iceConnectionState === 'failed') {
        console.log('🎬 Broadcaster: ICE failed, attempting restart for guest', guestId)
        pc.restartIce()
      }
    }

    // Create and send offer to guest
    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      })
      await pc.setLocalDescription(offer)
      
      console.log('🎬 Broadcaster: Sending offer to guest', guestId)
      await fetch('/api/video-streams/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          streamId,
          type: 'broadcaster-offer',
          receiverId: guestId,
          data: { offer: pc.localDescription?.toJSON(), broadcasterId: session?.user?.id, guestId }
        })
      })
    } catch (e) {
      console.error('🎬 Broadcaster: Error creating offer for guest', guestId, ':', e)
    }
  }
  
  // Legacy alias for backward compatibility
  const setupCoBroadcasterConnection = setupGuestConnection

  // Poll for guest signals (broadcaster side) - supports multiple guests
  const pollGuestSignals = async () => {
    if (activeGuests.length === 0 || isUnmountedRef.current || isCohost) return
    
    try {
      const res = await fetch(`/api/video-streams/signal?streamId=${streamId}&recipientId=${session?.user?.id}&type=guest`)
      if (!res.ok) return
      const signals = await res.json()

      for (const signal of signals) {
        if (isUnmountedRef.current) break
        
        const guestId = signal.data?.guestId || signal.senderId
        if (!guestId) continue
        
        const pc = guestPcRefs.current.get(guestId)
        
        // Guest answered our offer
        if (signal.type === 'guest-answer' && signal.data?.answer && pc) {
          try {
            console.log('🎬 Broadcaster: Received answer from guest', guestId)
            if (pc.signalingState === 'have-local-offer') {
              await pc.setRemoteDescription(new RTCSessionDescription(signal.data.answer))
              
              // Add pending ICE candidates for this guest
              const pending = guestCandidatesRef.current.get(guestId) || []
              for (const candidate of pending) {
                try { await pc.addIceCandidate(candidate) } catch (e) {}
              }
              guestCandidatesRef.current.set(guestId, [])
            }
          } catch (e) {
            console.error('🎬 Broadcaster: Error setting answer from guest', guestId, ':', e)
          }
        } else if (signal.type === 'guest-ice-candidate' && signal.data?.candidate && !signal.data?.fromBroadcaster && pc) {
          // ICE candidate from guest (not from broadcaster)
          try {
            console.log('🎬 Broadcaster: Received ICE candidate from guest', guestId)
            if (pc.remoteDescription) {
              await pc.addIceCandidate(new RTCIceCandidate(signal.data.candidate))
            } else {
              const pending = guestCandidatesRef.current.get(guestId) || []
              pending.push(new RTCIceCandidate(signal.data.candidate))
              guestCandidatesRef.current.set(guestId, pending)
            }
          } catch (e) {}
        }
        // Also handle legacy cohost signals for backward compatibility
        else if (signal.type === 'cohost-answer' && signal.data?.answer && pc) {
          try {
            console.log('🎬 Broadcaster: Received legacy answer from guest', guestId)
            if (pc.signalingState === 'have-local-offer') {
              await pc.setRemoteDescription(new RTCSessionDescription(signal.data.answer))
            }
          } catch (e) {}
        } else if (signal.type === 'cohost-ice-candidate' && signal.data?.candidate && !signal.data?.fromBroadcaster && pc) {
          try {
            if (pc.remoteDescription) {
              await pc.addIceCandidate(new RTCIceCandidate(signal.data.candidate))
            }
          } catch (e) {}
        }
      }
    } catch (error) {}
  }
  
  // Legacy alias
  const pollCoBroadcasterSignals = pollGuestSignals

  const addToast = (type: 'success' | 'error' | 'info', message: string, userName?: string, userImage?: string | null) => {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { id, type, message, userName, userImage }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications?limit=10')
      if (res.ok) {
        const notifications = await res.json()
        // Check for co-broadcast accept/reject notifications
        for (const notif of notifications) {
          // Skip if already shown
          if (shownNotificationIdsRef.current.has(notif.id)) continue
          
          // Mark as shown
          shownNotificationIdsRef.current.add(notif.id)
          
          // Only show toast for co-broadcast notifications for this stream
          if (notif.type === 'co_broadcast_accepted' || notif.type === 'co_broadcast_rejected') {
            const data = typeof notif.data === 'string' ? JSON.parse(notif.data) : notif.data
            if (data?.streamId === streamId) {
              addToast(
                notif.type === 'co_broadcast_accepted' ? 'success' : 'info',
                notif.type === 'co_broadcast_accepted' 
                  ? (language === 'tr' ? 'ortak yayın davetini kabul etti!' : 'accepted co-broadcast invite!')
                  : (language === 'tr' ? 'ortak yayın davetini reddetti.' : 'declined co-broadcast invite.'),
                data.userName,
                data.userImage
              )
            }
          }
        }
        
        // Limit the set size to avoid memory issues (keep only recent 100)
        if (shownNotificationIdsRef.current.size > 100) {
          const arr = Array.from(shownNotificationIdsRef.current)
          shownNotificationIdsRef.current = new Set(arr.slice(-50))
        }
      }
    } catch (e) {}
  }

  const fetchGifts = async () => {
    try {
      const res = await fetch(`/api/video-streams/${streamId}/gifts`)
      if (res.ok) {
        const gifts = await res.json()
        const total = gifts.reduce((sum: number, g: any) => sum + Math.floor(g.giftType.price * g.quantity * 0.7), 0)
        setTotalGiftCredits(total)
        
        if (gifts.length > 0 && gifts[0].id !== lastGiftIdRef.current) {
          const newGift = gifts[0]
          lastGiftIdRef.current = newGift.id
          
          setCenterGift({
            id: newGift.id,
            senderName: newGift.sender.name,
            senderImage: newGift.sender.image,
            icon: newGift.giftType.icon,
            giftName: newGift.giftType.name
          })
          
          setTimeout(() => setCenterGift(null), 3000)
          
          for (let i = 0; i < 5; i++) setTimeout(() => addFloatingHeart(), i * 100)
        }
      }
    } catch (e) {}
  }

  const addFloatingHeart = () => {
    const heart = { id: heartIdRef.current++, color: HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)] }
    setFloatingHearts(prev => [...prev, heart])
    setTimeout(() => setFloatingHearts(prev => prev.filter(h => h.id !== heart.id)), 2000)
  }

  const toggleVideo = () => {
    const track = localStreamRef.current?.getVideoTracks()[0]
    if (track) { track.enabled = !track.enabled; setIsVideoOn(track.enabled) }
  }

  const toggleAudio = () => {
    const track = localStreamRef.current?.getAudioTracks()[0]
    if (track) { track.enabled = !track.enabled; setIsAudioOn(track.enabled) }
  }

  // Enable remote audio on user interaction (for browser autoplay policy)
  const enableRemoteAudio = () => {
    // Enable guest audio for broadcaster
    activeGuests.forEach(guest => {
      const videoEl = guestVideoRefs.current.get(guest.userId)
      if (videoEl) {
        videoEl.muted = false
        videoEl.volume = 1.0
        videoEl.play().catch(() => {})
      }
    })
    // Enable broadcaster audio for co-host
    if (broadcasterVideoRef.current) {
      broadcasterVideoRef.current.muted = false
      broadcasterVideoRef.current.volume = 1.0
      broadcasterVideoRef.current.play().catch(() => {})
    }
    setRemoteAudioEnabled(true)
  }

  const switchCamera = async () => {
    const newFacing = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(newFacing)
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacing, width: { ideal: 720, max: 1280 }, height: { ideal: 1280, max: 1920 }, aspectRatio: { ideal: 9/16 } },
        audio: { echoCancellation: true, noiseSuppression: true }
      })
      
      localStreamRef.current?.getTracks().forEach(t => t.stop())
      localStreamRef.current = newStream
      if (localVideoRef.current) localVideoRef.current.srcObject = newStream

      peerConnectionsRef.current.forEach(async (pc) => {
        const senders = pc.getSenders()
        const videoTrack = newStream.getVideoTracks()[0]
        const audioTrack = newStream.getAudioTracks()[0]
        const videoSender = senders.find(s => s.track?.kind === 'video')
        const audioSender = senders.find(s => s.track?.kind === 'audio')
        if (videoSender && videoTrack) await videoSender.replaceTrack(videoTrack)
        if (audioSender && audioTrack) await audioSender.replaceTrack(audioTrack)
      })
    } catch (e) {}
  }

  const handleSendComment = async () => {
    if (!newComment.trim()) return
    try {
      const res = await fetch(`/api/video-streams/${streamId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment })
      })
      if (res.ok) {
        const comment = await res.json()
        setComments(prev => [comment, ...prev].slice(0, 8))
        setNewComment('')
      }
    } catch (e) {}
  }

  const handleInviteCoBroadcast = async (userId: string) => {
    try {
      await fetch(`/api/video-streams/${streamId}/co-broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'invite' })
      })
      fetchCoBroadcasters()
    } catch (e) {}
  }

  // Accept co-broadcast request
  const handleAcceptCoBroadcastRequest = async () => {
    if (!pendingCoBroadcastRequest) return
    try {
      await fetch(`/api/video-streams/${streamId}/co-broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: pendingCoBroadcastRequest.userId, action: 'accept' })
      })
      setPendingCoBroadcastRequest(null)
      fetchCoBroadcasters()
    } catch (e) {}
  }

  // Reject co-broadcast request
  const handleRejectCoBroadcastRequest = async () => {
    if (!pendingCoBroadcastRequest) return
    try {
      await fetch(`/api/video-streams/${streamId}/co-broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: pendingCoBroadcastRequest.userId, action: 'reject' })
      })
      setPendingCoBroadcastRequest(null)
      fetchCoBroadcasters()
    } catch (e) {}
  }

  const handleMuteCoBroadcaster = async (userId: string, mute: boolean) => {
    try {
      await fetch(`/api/video-streams/${streamId}/co-broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: mute ? 'mute' : 'unmute' })
      })
      fetchCoBroadcasters()
    } catch (e) {}
  }

  const handleRemoveCoBroadcaster = async (userId: string) => {
    try {
      await fetch(`/api/video-streams/${streamId}/co-broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'remove' })
      })
      fetchCoBroadcasters()
    } catch (e) {}
  }

  const handleBanUser = async (userId: string) => {
    try {
      await fetch(`/api/video-streams/${streamId}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, reason: 'Yayıncı tarafından engellendi' })
      })
      fetchViewers()
    } catch (e) {}
  }

  const cleanup = () => {
    // Close viewer connections
    peerConnectionsRef.current.forEach(pc => pc.close())
    peerConnectionsRef.current.clear()
    processedViewersRef.current.clear()
    pendingCandidatesRef.current.clear()
    
    // Close all guest connections
    guestPcRefs.current.forEach(pc => pc.close())
    guestPcRefs.current.clear()
    guestVideoRefs.current.clear()
    processedGuestsRef.current.clear()
    guestCandidatesRef.current.clear()
    reconnectAttemptsRef.current.clear()
    
    // Close broadcaster connection (for co-host)
    if (broadcasterPcRef.current) {
      broadcasterPcRef.current.close()
      broadcasterPcRef.current = null
    }
    
    // Stop local stream
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    
    // Update stream status
    fetch(`/api/video-streams/${streamId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ended' })
    }).catch(() => {})
  }

  const handleEndStream = () => {
    cleanup()
    router.push(`/${language}`)
  }

  const formatDuration = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`
  const formatCount = (n: number) => n >= 1000 ? (n/1000).toFixed(1) + 'K' : n.toString()

  const gifters = viewers.filter(v => v.hasGifted).sort((a, b) => b.totalGiftAmount - a.totalGiftAmount)
  
  // Legacy alias for backward compatibility (if needed elsewhere)
  const activeCoBroadcaster = activeGuests[0] || null
  const activeCoBroadcasters = activeGuests

  // Calculate popup positions for guests (positioned in corners/sides)
  const getGuestPopupStyle = (index: number, total: number): React.CSSProperties => {
    // Position: top-right, bottom-right, top-left, bottom-left
    const positions = [
      { top: '80px', right: '12px' },      // Guest 1: top-right
      { bottom: '180px', right: '12px' },  // Guest 2: bottom-right (above controls)
      { top: '80px', left: '12px' },       // Guest 3: top-left
      { bottom: '180px', left: '12px' },   // Guest 4: bottom-left
    ]
    return positions[index] || positions[0]
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Main broadcaster video is always fullscreen */}
      {isCohost ? (
        <>
          {/* Co-host mode: Broadcaster video fullscreen */}
          <video
            ref={broadcasterVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-contain bg-black"
          />
          
          {/* Co-host's own video as PiP popup */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute top-20 right-3 w-28 h-40 sm:w-32 sm:h-44 bg-gray-900 rounded-2xl overflow-hidden border-2 border-purple-500 shadow-2xl z-20"
          >
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain bg-black"
              style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
            />
            {/* My info bar */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
              <div className="flex items-center gap-1.5">
                {session?.user?.image ? (
                  <Image src={session.user.image} alt="" width={20} height={20} className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-white text-[8px] font-bold">{session?.user?.name?.[0]}</span>
                  </div>
                )}
                <p className="text-white text-[10px] font-medium truncate">{session?.user?.name}</p>
                <span className="text-green-400 text-[8px]">●</span>
              </div>
            </div>
            {/* Camera switch button */}
            <button
              onClick={switchCamera}
              className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full hover:bg-black/80 transition-colors"
            >
              <SwitchCamera className="w-3 h-3 text-white" />
            </button>
          </motion.div>
        </>
      ) : (
        <>
          {/* Broadcaster mode: My video fullscreen */}
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-contain bg-black"
            style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
          />

          {/* Gradients for solo mode */}
          <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />
          <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-black/90 to-transparent pointer-events-none" />

          {/* Guest video PiP popups - canlı falcı style */}
          <AnimatePresence>
            {activeGuests.slice(0, MAX_GUESTS).map((guest, index) => {
              const connectionState = guestConnectionStates.get(guest.userId)
              const isConnecting = connectionState === 'connecting' || connectionState === 'new'
              const isDisconnected = connectionState === 'disconnected' || connectionState === 'failed'
              const popupStyle = getGuestPopupStyle(index, activeGuests.length)
              
              return (
                <motion.div
                  key={guest.id}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                  className="absolute w-28 h-40 sm:w-32 sm:h-44 bg-gray-900 rounded-2xl overflow-hidden border-2 border-purple-500 shadow-2xl z-20"
                  style={popupStyle}
                >
                  {/* Guest video */}
                  <video
                    ref={(el) => {
                      if (el) {
                        guestVideoRefs.current.set(guest.userId, el)
                      }
                    }}
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain bg-black"
                  />
                  
                  {/* Connection status overlay */}
                  {(isConnecting || isDisconnected) && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center">
                      {guest.user.image ? (
                        <Image src={guest.user.image} alt="" width={40} height={40} className="w-10 h-10 rounded-full object-cover mb-2" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-2">
                          <span className="text-white text-sm font-bold">{guest.user.name[0]}</span>
                        </div>
                      )}
                      <p className="text-white text-[10px] text-center px-2">
                        {isDisconnected 
                          ? (language === 'tr' ? 'Yeniden bağlanıyor...' : 'Reconnecting...')
                          : (language === 'tr' ? 'Bağlanıyor...' : 'Connecting...')
                        }
                      </p>
                      <div className="mt-1.5 w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    </div>
                  )}
                  
                  {/* Guest info bar */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <div className="flex items-center gap-1.5">
                      {guest.user.image ? (
                        <Image src={guest.user.image} alt="" width={16} height={16} className="w-4 h-4 rounded-full object-cover" />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          <span className="text-white text-[6px] font-bold">{guest.user.name[0]}</span>
                        </div>
                      )}
                      <p className="text-white text-[9px] font-medium truncate flex-1">{guest.user.name}</p>
                      {/* Connection status indicator */}
                      <span className={`text-[8px] ${
                        connectionState === 'connected' ? 'text-green-400' :
                        isDisconnected ? 'text-red-400' :
                        'text-yellow-400'
                      }`}>●</span>
                    </div>
                  </div>

                  {/* Remove guest button */}
                  <button 
                    onClick={() => handleRemoveCoBroadcaster(guest.userId)}
                    className="absolute top-2 right-2 p-1.5 bg-red-500/70 rounded-full hover:bg-red-500 transition-colors z-10"
                    title={language === 'tr' ? 'Çıkar' : 'Remove'}
                  >
                    <PhoneOff className="w-3 h-3 text-white" />
                  </button>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </>
      )}

      {/* Hidden video for co-host mode (to receive broadcaster stream) */}
      {!isCohost && <video ref={broadcasterVideoRef} className="hidden" />}



      {/* Viewer avatars row - always at bottom */}
      <div className="absolute bottom-24 left-2 right-2 z-20 flex items-center gap-1 overflow-x-auto">
        {viewers.slice(0, 6).map((viewer) => (
          <div key={viewer.id} className="flex-shrink-0">
            {viewer.image ? (
              <Image src={viewer.image} alt="" width={24} height={24} className="w-6 h-6 rounded-full object-cover border border-white/20" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center border border-white/20">
                <span className="text-white text-[8px] font-bold">{viewer.name[0]}</span>
              </div>
            )}
          </div>
        ))}
        {viewers.length > 6 && (
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center border border-white/20">
            <span className="text-white text-[8px]">+{viewers.length - 6}</span>
          </div>
        )}
      </div>

      {/* Toast Notifications */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 space-y-2 w-72">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl backdrop-blur-md border ${
                toast.type === 'success' 
                  ? 'bg-green-500/20 border-green-500/30' 
                  : toast.type === 'error'
                  ? 'bg-red-500/20 border-red-500/30'
                  : 'bg-purple-500/20 border-purple-500/30'
              }`}
            >
              {toast.userImage ? (
                <Image src={toast.userImage} alt="" width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
              ) : toast.userName && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <span className="text-white text-sm font-bold">{toast.userName[0]}</span>
                </div>
              )}
              <p className="text-white text-sm flex-1">
                <span className="font-semibold">{toast.userName}</span>{' '}
                {toast.message}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Center Gift Animation */}
      <AnimatePresence>
        {centerGift && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none"
          >
            <motion.div initial={{ y: 50 }} animate={{ y: 0 }} className="text-center">
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: 2, duration: 0.5 }} className="text-8xl mb-4">
                {centerGift.icon}
              </motion.div>
              <div className="flex items-center justify-center gap-3 bg-black/60 backdrop-blur-md px-6 py-3 rounded-full">
                {centerGift.senderImage ? (
                  <Image src={centerGift.senderImage} alt="" width={40} height={40} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-white font-bold">{centerGift.senderName[0]}</span>
                  </div>
                )}
                <div className="text-left">
                  <p className="text-white font-bold text-lg">{centerGift.senderName}</p>
                  <p className="text-yellow-400 text-sm">{centerGift.giftName} {language === 'tr' ? 'gönderdi' : 'sent'}</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top bar - Broadcaster Profile */}
      {!isCohost && (
        <div className="absolute top-4 left-4 right-4 z-10">
          {/* Top Row - Profile, Stats, End Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Profile */}
              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm px-2 py-1.5 rounded-full">
                {session?.user?.image ? (
                  <Image src={session.user.image} alt="" width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{session?.user?.name?.[0]?.toUpperCase()}</span>
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-white text-xs font-medium">{session?.user?.name}</span>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <div className="flex items-center gap-0.5 bg-[#fe2c55] px-1.5 py-0.5 rounded">
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                      <span className="text-white font-bold">LIVE</span>
                    </div>
                    <span className="text-white/60">{formatDuration(duration)}</span>
                  </div>
                </div>
              </div>
              
              {/* Stats */}
              <div className="flex items-center gap-2">
                <button onClick={() => setShowViewers(!showViewers)} className="flex items-center gap-1 bg-black/60 px-2 py-1 rounded-full">
                  <Users className="w-3.5 h-3.5 text-white" />
                  <span className="text-white text-xs">{viewerCount}</span>
                </button>
                <div className="flex items-center gap-1 bg-black/60 px-2 py-1 rounded-full">
                  <Heart className="w-3.5 h-3.5 text-[#fe2c55]" fill="#fe2c55" />
                  <span className="text-white text-xs">{formatCount(likeCount)}</span>
                </div>
                {totalGiftJetons > 0 && (
                  <div className="flex items-center gap-1 bg-yellow-500/30 px-2 py-1 rounded-full">
                    <Coins className="w-3.5 h-3.5 text-yellow-400" />
                    <span className="text-yellow-400 text-xs font-bold">+{totalGiftJetons}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* End Stream Button */}
            <button 
              onClick={() => setShowEndConfirm(true)} 
              className="bg-[#fe2c55] text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1"
            >
              <X className="w-4 h-4" /> 
              {language === 'tr' ? 'Canlı Yayını Kapat' : 'End Live'}
            </button>
          </div>
          
          {/* Stream Category Badge - Below Profile */}
          {streamCategory && (
            <div className={`mt-2 flex items-center gap-1.5 bg-gradient-to-r ${streamCategory.color} px-3 py-1.5 rounded-full w-fit shadow-lg`}>
              <span className="text-base">{streamCategory.icon}</span>
              <span className="text-white font-semibold text-xs">{language === 'tr' ? streamCategory.name : streamCategory.nameEn}</span>
            </div>
          )}

          {/* Big Gift Banner - Below Category Badge */}
          <div className="mt-2 w-[90vw] max-w-[400px] rounded-xl overflow-hidden shadow-[0_0_20px_rgba(255,215,0,0.3)]">
            <GiftNotificationBanner />
          </div>
        </div>
      )}

      {/* Co-host End Button */}
      {isCohost && (
        <div className="absolute top-4 right-4 z-40">
          <button 
            onClick={() => setShowEndConfirm(true)} 
            className="bg-[#fe2c55] text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1"
          >
            <X className="w-4 h-4" /> 
            {language === 'tr' ? 'Bitir' : 'End'}
          </button>
        </div>
      )}

      {/* Right Side - Co-Broadcasters & Viewer List */}
      {!isCohost && (
        <div className="absolute right-3 top-20 z-20 space-y-2">
          {/* Active Co-Broadcasters (as circles, old style) */}
          {activeCoBroadcasters.map(cb => (
            <motion.div
              key={cb.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative"
            >
              <div className="w-16 h-16 rounded-full border-2 border-green-500 overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500">
                {cb.user.image ? (
                  <Image src={cb.user.image} alt="" width={64} height={64} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-white font-bold text-xl">{cb.user.name[0]}</span>
                  </div>
                )}
              </div>
              {cb.isMuted && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                  <VolumeX className="w-3 h-3 text-white" />
                </div>
              )}
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button className="absolute -top-1 -left-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center">
                    <MoreVertical className="w-3 h-3 text-white" />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content className="bg-[#1a1a1a] border border-white/10 rounded-lg p-1 min-w-[140px] z-50">
                    <DropdownMenu.Item
                      onClick={() => handleMuteCoBroadcaster(cb.user.id, !cb.isMuted)}
                      className="flex items-center gap-2 px-3 py-2 text-white text-sm rounded cursor-pointer hover:bg-white/10"
                    >
                      {cb.isMuted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                      {cb.isMuted ? 'Sesi Aç' : 'Sessize Al'}
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      onClick={() => handleRemoveCoBroadcaster(cb.user.id)}
                      className="flex items-center gap-2 px-3 py-2 text-red-400 text-sm rounded cursor-pointer hover:bg-white/10"
                    >
                      <PhoneOff className="w-4 h-4" />
                      Yayından Çıkar
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
              <p className="text-white text-[10px] text-center mt-1 truncate max-w-16">{cb.user.name}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Floating Hearts Animation */}
      <div className="absolute right-20 top-1/3 z-10 pointer-events-none">
        <AnimatePresence>
          {floatingHearts.map(heart => (
            <motion.div
              key={heart.id}
              initial={{ opacity: 1, y: 0, scale: 0.5 }}
              animate={{ opacity: 0, y: -80, scale: 1.2 }}
              className="absolute bottom-0 right-0"
            >
              <Heart className="w-6 h-6" fill={heart.color} color={heart.color} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Gifters - Small badges below top bar */}
      {!isCohost && gifters.length > 0 && (
        <div className="absolute top-20 left-4 z-20">
          <div className="flex flex-wrap gap-1 max-w-[200px]">
            {gifters.slice(0, 3).map((viewer) => (
              <motion.div
                key={viewer.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1 bg-gradient-to-r from-yellow-500/30 to-orange-500/30 backdrop-blur-sm px-1.5 py-0.5 rounded-full"
              >
                {viewer.image ? (
                  <Image src={viewer.image} alt="" width={16} height={16} className="w-4 h-4 rounded-full object-cover" />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                    <span className="text-white text-[8px] font-bold">{viewer.name[0]}</span>
                  </div>
                )}
                <span className="text-yellow-400 text-[10px]">🎁{viewer.totalGiftAmount}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Viewers List Modal */}
      <AnimatePresence>
        {showViewers && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="absolute right-3 top-36 w-64 max-h-80 bg-black/80 backdrop-blur-md rounded-xl z-30 overflow-hidden"
          >
            <div className="p-3 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-white font-medium text-sm flex items-center gap-2">
                <Users className="w-4 h-4" /> {language === 'tr' ? 'İzleyiciler' : 'Viewers'} ({viewers.length})
              </h3>
              <button onClick={() => setShowViewers(false)} className="text-white/60 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {viewers.map(viewer => (
                <div key={viewer.id} className="flex items-center justify-between p-2 hover:bg-white/5">
                  <div className="flex items-center gap-2">
                    {viewer.image ? (
                      <Image src={viewer.image} alt="" width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">{viewer.name[0]}</span>
                      </div>
                    )}
                    <div>
                      <p className="text-white text-xs font-medium">{viewer.name}</p>
                      {viewer.hasGifted && <p className="text-yellow-400 text-[10px]">🎁 {viewer.totalGiftAmount}</p>}
                    </div>
                  </div>
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <button className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content className="bg-[#1a1a1a] border border-white/10 rounded-lg p-1 min-w-[160px] z-50" sideOffset={5}>

                        <DropdownMenu.Item
                          onClick={() => viewer.odUserId && handleBanUser(viewer.odUserId)}
                          className="flex items-center gap-2 px-3 py-2 text-red-400 text-sm rounded cursor-pointer hover:bg-white/10"
                        >
                          <Ban className="w-4 h-4" />
                          {language === 'tr' ? 'Engelle' : 'Ban'}
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                </div>
              ))}
              {viewers.length === 0 && (
                <p className="text-white/40 text-xs text-center py-6">
                  {language === 'tr' ? 'Henüz izleyici yok' : 'No viewers yet'}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Comments floating above input */}
      <div className="absolute left-3 bottom-28 right-20 max-h-32 overflow-hidden z-10 space-y-1">
        {comments.slice(0, 5).map(c => (
          <motion.div key={c.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1.5">
            <span className="text-white/70 text-xs font-medium">{c.user.name}: </span>
            <span className="text-white text-xs">{c.content}</span>
          </motion.div>
        ))}
      </div>

      {/* Bottom controls with message input */}
      <div className="absolute bottom-4 left-3 right-3 z-10">
        {/* Message input */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 flex items-center bg-white/10 backdrop-blur-sm rounded-full overflow-hidden">
            <input
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendComment()}
              placeholder={language === 'tr' ? 'Mesaj yaz...' : 'Write a message...'}
              className="flex-1 bg-transparent text-white text-sm px-4 py-2.5 placeholder:text-white/40 focus:outline-none"
            />
            <button
              onClick={handleSendComment}
              disabled={!newComment.trim()}
              className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-sm font-semibold rounded-full mr-1 flex items-center gap-1.5 disabled:opacity-40 disabled:from-gray-500 disabled:to-gray-600 hover:from-pink-400 hover:to-purple-400 transition-all"
            >
              <Send className="w-4 h-4" />
              <span>{language === 'tr' ? 'Gönder' : 'Send'}</span>
            </button>
          </div>
        </div>
        
        {/* Control buttons */}
        <div className="flex justify-center gap-4">
          <button onClick={toggleVideo} className={`w-12 h-12 rounded-full flex items-center justify-center ${isVideoOn ? 'bg-white/20' : 'bg-[#fe2c55]'}`}>
            {isVideoOn ? <Video className="w-5 h-5 text-white" /> : <VideoOff className="w-5 h-5 text-white" />}
          </button>
          <button onClick={toggleAudio} className={`w-12 h-12 rounded-full flex items-center justify-center ${isAudioOn ? 'bg-white/20' : 'bg-[#fe2c55]'}`}>
            {isAudioOn ? <Mic className="w-5 h-5 text-white" /> : <MicOff className="w-5 h-5 text-white" />}
          </button>
          <button onClick={switchCamera} className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <SwitchCamera className="w-5 h-5 text-white" />
          </button>
          {/* Enable remote audio button - shows when co-broadcast is active and audio not enabled */}
          {(activeCoBroadcaster || isCohost) && !remoteAudioEnabled && (
            <button 
              onClick={enableRemoteAudio} 
              className="w-12 h-12 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center animate-pulse"
              title={language === 'tr' ? 'Sesi Aç' : 'Enable Audio'}
            >
              <Volume2 className="w-5 h-5 text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Co-Broadcast Request Popup */}
      <AnimatePresence>
        {pendingCoBroadcastRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-br from-purple-900/95 to-pink-900/95 backdrop-blur-xl rounded-3xl p-6 w-full max-w-sm text-center border border-white/10"
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
                <UserPlus className="w-10 h-10 text-white" />
              </div>
              
              <h2 className="text-xl font-bold text-white mb-2">
                {language === 'tr' ? 'Ortak Yayın Talebi!' : 'Co-Broadcast Request!'}
              </h2>
              
              <div className="flex items-center justify-center gap-3 mb-4">
                {pendingCoBroadcastRequest.user.image ? (
                  <Image src={pendingCoBroadcastRequest.user.image} alt="" width={48} height={48} className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">{pendingCoBroadcastRequest.user.name[0]}</span>
                  </div>
                )}
                <div className="text-left">
                  <p className="text-white font-semibold">{pendingCoBroadcastRequest.user.name}</p>
                  <p className="text-white/60 text-sm">
                    {language === 'tr' ? 'ortak yayın yapmak istiyor' : 'wants to co-stream with you'}
                  </p>
                </div>
              </div>
              
              <p className="text-white/70 text-sm mb-6">
                {language === 'tr' 
                  ? 'Kabul ederseniz ekran ikiye bölünecek ve birlikte yayın yapacaksınız.'
                  : 'If you accept, the screen will split and you will stream together.'}
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={handleRejectCoBroadcastRequest}
                  className="flex-1 bg-white/10 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-white/20"
                >
                  <X className="w-5 h-5" />
                  {language === 'tr' ? 'Reddet' : 'Decline'}
                </button>
                <button
                  onClick={handleAcceptCoBroadcastRequest}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:from-green-400 hover:to-green-500"
                >
                  <Phone className="w-5 h-5" />
                  {language === 'tr' ? 'Kabul Et' : 'Accept'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* End Modal */}
      <AnimatePresence>
        {showEndConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-[#1a1a1a] rounded-2xl p-6 w-full max-w-xs text-center">
              <Radio className="w-12 h-12 text-[#fe2c55] mx-auto mb-4" />
              <h2 className="text-lg font-bold text-white mb-2">{language === 'tr' ? 'Yayını bitir?' : 'End stream?'}</h2>
              <p className="text-white/60 text-sm mb-3">{formatDuration(duration)}</p>
              {totalGiftJetons > 0 && (
                <div className="flex items-center justify-center gap-2 mb-4 text-yellow-400">
                  <Coins className="w-4 h-4" />
                  <span className="font-bold">+{totalGiftJetons}</span>
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setShowEndConfirm(false)} className="flex-1 bg-white/10 text-white py-2.5 rounded-lg">{language === 'tr' ? 'Devam' : 'Continue'}</button>
                <button onClick={handleEndStream} className="flex-1 bg-[#fe2c55] text-white py-2.5 rounded-lg">{language === 'tr' ? 'Bitir' : 'End'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}