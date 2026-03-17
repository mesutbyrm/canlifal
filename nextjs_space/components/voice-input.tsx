'use client'

import { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'

interface VoiceInputProps {
  onTranscript: (text: string) => void
  disabled?: boolean
  className?: string
}

export default function VoiceInput({ onTranscript, disabled, className }: VoiceInputProps) {
  const { language } = useLanguage()
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (!SpeechRecognition) {
        setIsSupported(false)
        return
      }

      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = 'tr-TR'

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' '
          }
        }
        if (finalTranscript) {
          onTranscript(finalTranscript.trim())
        }
      }

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)
      }

      recognitionRef.current.onend = () => {
        if (isListening) {
          recognitionRef.current.start()
        }
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [language, onTranscript, isListening])

  const toggleListening = () => {
    if (!recognitionRef.current) return

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      recognitionRef.current.lang = 'tr-TR'
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  if (!isSupported) {
    return null
  }

  return (
    <button
      type="button"
      onClick={toggleListening}
      disabled={disabled}
      className={`p-3 rounded-full transition-all duration-300 ${className} ${
        isListening 
          ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/50' 
          : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 hover:text-gold-400'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
      title={isListening 
        ? ('Dinlemeyi durdur')
        : ('Sesli giriş')
      }
    >
      {isListening ? (
        <div className="flex items-center gap-2">
          <MicOff className="w-5 h-5" />
          <span className="text-sm hidden sm:inline">
            {'Dinliyor...'}
          </span>
        </div>
      ) : (
        <Mic className="w-5 h-5" />
      )}
    </button>
  )
}
