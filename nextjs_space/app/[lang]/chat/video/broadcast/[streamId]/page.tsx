'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  Heart,
  MessageCircle,
  X,
  Send,
  Eye,
  Video,
  VideoOff,
  Mic,
  MicOff,
  SwitchCamera,
  Radio,
  Phone
} from 'lucide-react'

interface Comment {
  id: string
  content: string
  createdAt: string
  user: {
    name: string
    image: string | null
  }
}

interface FloatingHeart {
  id: number
  x: number
}

export default function BroadcastPage() {
  const { data: session } = useSession() || {}
  const router = useRouter()
  const params = useParams()
  const { language } = useLanguage()
  const streamId = params.streamId as string

  const [viewerCount, setViewerCount] = useState(0)
  const [likeCount, setLikeCount] = useState(0)
  const [comments, setComments] = useState<Comment[]>([])
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [isAudioOn, setIsAudioOn] = useState(true)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([])
  const [duration, setDuration] = useState(0)
  const [showEndConfirm, setShowEndConfirm] = useState(false)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const heartIdRef = useRef(0)

  useEffect(() => {
    if (!session?.user) {
      router.push(`/${language}/login`)
      return
    }
    startBroadcast()
    
    // Duration timer
    const durationInterval = setInterval(() => {
      setDuration(prev => prev + 1)
    }, 1000)

    // Poll for stats and comments
    const pollInterval = setInterval(() => {
      fetchStats()
      fetchComments()
    }, 3000)

    return () => {
      clearInterval(durationInterval)
      clearInterval(pollInterval)
      endStream()
    }
  }, [session])

  const startBroadcast = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: 720, height: 1280 },
        audio: true
      })
      localStreamRef.current = stream

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      // Start signaling for viewers
      pollForViewers()
    } catch (error) {
      console.error('Error starting broadcast:', error)
      alert(language === 'tr' ? 'Kamera erişimi sağlanamadı' : 'Could not access camera')
      router.back()
    }
  }

  const pollForViewers = async () => {
    // Poll for new viewer connections
    setInterval(async () => {
      try {
        const res = await fetch(`/api/video-streams/${streamId}/signal`)
        if (res.ok) {
          const signals = await res.json()
          for (const signal of signals) {
            if (signal.type === 'join') {
              await handleViewerJoin(signal.viewerId)
            } else if (signal.type === 'answer') {
              const pc = peerConnectionsRef.current.get(signal.viewerId)
              if (pc) {
                await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp))
              }
            } else if (signal.type === 'ice-candidate' && signal.candidate) {
              const pc = peerConnectionsRef.current.get(signal.viewerId)
              if (pc) {
                await pc.addIceCandidate(new RTCIceCandidate(signal.candidate))
              }
            }
          }
        }
      } catch (error) {
        console.error('Polling error:', error)
      }
    }, 2000)
  }

  const handleViewerJoin = async (viewerId: string) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    })

    peerConnectionsRef.current.set(viewerId, pc)

    // Add local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!)
      })
    }

    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        await fetch(`/api/video-streams/${streamId}/signal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            viewerId,
            type: 'ice-candidate',
            candidate: event.candidate
          })
        })
      }
    }

    // Create offer
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    await fetch(`/api/video-streams/${streamId}/signal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        viewerId,
        type: 'offer',
        sdp: offer
      })
    })
  }

  const fetchStats = async () => {
    try {
      const res = await fetch(`/api/video-streams/${streamId}`)
      if (res.ok) {
        const data = await res.json()
        setViewerCount(data.viewerCount)
        setLikeCount(data.likeCount)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/video-streams/${streamId}/comments`)
      if (res.ok) {
        const data = await res.json()
        setComments(data.slice(0, 20))
      }
    } catch (error) {
      console.error('Error fetching comments:', error)
    }
  }

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoOn(videoTrack.enabled)
      }
    }
  }

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsAudioOn(audioTrack.enabled)
      }
    }
  }

  const switchCamera = async () => {
    const newFacing = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(newFacing)

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacing, width: 720, height: 1280 },
        audio: true
      })

      // Stop old tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop())
      }

      localStreamRef.current = newStream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = newStream
      }

      // Update all peer connections
      const videoTrack = newStream.getVideoTracks()[0]
      peerConnectionsRef.current.forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video')
        if (sender) {
          sender.replaceTrack(videoTrack)
        }
      })
    } catch (error) {
      console.error('Error switching camera:', error)
    }
  }

  const endStream = async () => {
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
    }

    // Close all peer connections
    peerConnectionsRef.current.forEach(pc => pc.close())
    peerConnectionsRef.current.clear()

    // Update stream status
    try {
      await fetch(`/api/video-streams/${streamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ended' })
      })
    } catch (error) {
      console.error('Error ending stream:', error)
    }
  }

  const handleEndStream = async () => {
    await endStream()
    router.push(`/${language}/chat/video`)
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Listen for incoming hearts
  useEffect(() => {
    const interval = setInterval(() => {
      // Randomly add hearts to simulate likes
      if (Math.random() > 0.7 && likeCount > floatingHearts.length) {
        const newHeart: FloatingHeart = {
          id: heartIdRef.current++,
          x: Math.random() * 60 + 20
        }
        setFloatingHearts(prev => [...prev, newHeart])
        setTimeout(() => {
          setFloatingHearts(prev => prev.filter(h => h.id !== newHeart.id))
        }, 1500)
      }
    }, 500)
    return () => clearInterval(interval)
  }, [likeCount])

  return (
    <div className="h-screen bg-black relative overflow-hidden">
      {/* Video */}
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 p-4 safe-area-inset-top z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-red-500/80 px-3 py-1.5 rounded-full">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-white text-sm font-bold">CANLI</span>
            </div>
            <div className="bg-black/50 px-3 py-1.5 rounded-full text-white text-sm">
              {formatDuration(duration)}
            </div>
            <div className="flex items-center gap-1 bg-black/50 px-3 py-1.5 rounded-full">
              <Eye className="w-4 h-4 text-white" />
              <span className="text-white text-sm">{viewerCount}</span>
            </div>
          </div>
          <button
            onClick={() => setShowEndConfirm(true)}
            className="bg-red-500 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-1"
          >
            <Phone className="w-4 h-4 rotate-[135deg]" />
            {language === 'tr' ? 'Bitir' : 'End'}
          </button>
        </div>
      </div>

      {/* Floating hearts */}
      <div className="absolute right-4 bottom-40 z-10">
        <AnimatePresence>
          {floatingHearts.map(heart => (
            <motion.div
              key={heart.id}
              initial={{ opacity: 1, y: 0, scale: 1 }}
              animate={{ opacity: 0, y: -150, scale: 1.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5 }}
              className="absolute bottom-0"
              style={{ right: `${heart.x}%` }}
            >
              <Heart className="w-8 h-8 text-pink-500 fill-pink-500" />
            </motion.div>
          ))}
        </AnimatePresence>
        <div className="flex flex-col items-center">
          <Heart className="w-10 h-10 text-white" />
          <span className="text-white text-sm mt-1">{likeCount}</span>
        </div>
      </div>

      {/* Comments overlay */}
      <div className="absolute left-4 bottom-32 right-20 z-10 max-h-48 overflow-hidden">
        <div className="space-y-2">
          {comments.slice(0, 5).map(comment => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-start gap-2 bg-black/30 backdrop-blur-sm rounded-lg px-3 py-2"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex-shrink-0 flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {comment.user.name[0]}
                </span>
              </div>
              <div>
                <span className="text-pink-400 text-xs font-medium">
                  {comment.user.name}
                </span>
                <p className="text-white text-sm">{comment.content}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4 z-10">
        <button
          onClick={toggleVideo}
          className={`w-14 h-14 rounded-full flex items-center justify-center ${isVideoOn ? 'bg-white/20' : 'bg-red-500'}`}
        >
          {isVideoOn ? (
            <Video className="w-6 h-6 text-white" />
          ) : (
            <VideoOff className="w-6 h-6 text-white" />
          )}
        </button>
        <button
          onClick={toggleAudio}
          className={`w-14 h-14 rounded-full flex items-center justify-center ${isAudioOn ? 'bg-white/20' : 'bg-red-500'}`}
        >
          {isAudioOn ? (
            <Mic className="w-6 h-6 text-white" />
          ) : (
            <MicOff className="w-6 h-6 text-white" />
          )}
        </button>
        <button
          onClick={switchCamera}
          className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center"
        >
          <SwitchCamera className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* End confirmation modal */}
      <AnimatePresence>
        {showEndConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 flex items-center justify-center z-30 p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-[#1a0a2e] rounded-2xl p-6 w-full max-w-sm text-center"
            >
              <h2 className="text-xl font-bold text-white mb-4">
                {language === 'tr' ? 'Yayını bitirmek istiyor musunuz?' : 'End the stream?'}
              </h2>
              <p className="text-purple-300 mb-6">
                {language === 'tr'
                  ? `Yayın süresi: ${formatDuration(duration)}`
                  : `Stream duration: ${formatDuration(duration)}`}
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowEndConfirm(false)}
                  className="flex-1 bg-purple-900/50 text-white font-bold py-3 rounded-xl"
                >
                  {language === 'tr' ? 'Devam Et' : 'Continue'}
                </button>
                <button
                  onClick={handleEndStream}
                  className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl"
                >
                  {language === 'tr' ? 'Bitir' : 'End'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
