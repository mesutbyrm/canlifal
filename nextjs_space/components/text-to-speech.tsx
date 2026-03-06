'use client'

import { useState, useEffect, useRef } from 'react'
import { Volume2, VolumeX, Pause, Play, RotateCcw } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'

interface TextToSpeechProps {
  text: string
  autoPlay?: boolean
  className?: string
}

export default function TextToSpeech({ text, autoPlay = false, className }: TextToSpeechProps) {
  const { language } = useLanguage()
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const [progress, setProgress] = useState(0)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!window.speechSynthesis) {
        setIsSupported(false)
      }
    }
  }, [])

  useEffect(() => {
    if (autoPlay && text && isSupported) {
      setTimeout(() => speak(), 500)
    }
  }, [text, autoPlay, isSupported])

  const speak = () => {
    if (!isSupported || !text) return

    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = language === 'tr' ? 'tr-TR' : 'en-US'
    utterance.rate = 0.9
    utterance.pitch = 1

    // Get available voices and select appropriate one
    const voices = window.speechSynthesis.getVoices()
    const langVoice = voices.find(v => v.lang.startsWith(language === 'tr' ? 'tr' : 'en'))
    if (langVoice) {
      utterance.voice = langVoice
    }

    utterance.onstart = () => {
      setIsPlaying(true)
      setIsPaused(false)
      // Simulate progress
      const duration = text.length * 50 // Rough estimate
      const startTime = Date.now()
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime
        const prog = Math.min((elapsed / duration) * 100, 100)
        setProgress(prog)
      }, 100)
    }

    utterance.onend = () => {
      setIsPlaying(false)
      setIsPaused(false)
      setProgress(100)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      setTimeout(() => setProgress(0), 1000)
    }

    utterance.onerror = () => {
      setIsPlaying(false)
      setIsPaused(false)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }

  const pause = () => {
    window.speechSynthesis.pause()
    setIsPaused(true)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
  }

  const resume = () => {
    window.speechSynthesis.resume()
    setIsPaused(false)
  }

  const stop = () => {
    window.speechSynthesis.cancel()
    setIsPlaying(false)
    setIsPaused(false)
    setProgress(0)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
  }

  if (!isSupported) {
    return null
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {!isPlaying ? (
        <button
          onClick={speak}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg"
          title={language === 'tr' ? 'Sesli oku' : 'Read aloud'}
        >
          <Volume2 className="w-5 h-5" />
          <span className="text-sm">
            {language === 'tr' ? 'Sesli Dinle' : 'Listen'}
          </span>
        </button>
      ) : (
        <div className="flex items-center gap-2">
          {isPaused ? (
            <button
              onClick={resume}
              className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-all"
              title={language === 'tr' ? 'Devam et' : 'Resume'}
            >
              <Play className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={pause}
              className="p-2 bg-yellow-500 text-white rounded-full hover:bg-yellow-600 transition-all"
              title={language === 'tr' ? 'Duraklat' : 'Pause'}
            >
              <Pause className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={stop}
            className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all"
            title={language === 'tr' ? 'Durdur' : 'Stop'}
          >
            <VolumeX className="w-5 h-5" />
          </button>
          <div className="w-24 h-2 bg-purple-900 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-gold-400 to-gold-500 transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
