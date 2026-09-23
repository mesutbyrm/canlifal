'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

type Language = 'tr'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const translations: Record<string, Record<string, string>> = {}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language] = useState<Language>('tr')
  const [isLoaded, setIsLoaded] = useState(false)

  // Load translations
  useEffect(() => {
    async function loadTranslations() {
      try {
        const response = await fetch('/api/translations')
        if (response?.ok) {
          const data = await response.json()
          Object.assign(translations, data || {})
        }
      } catch (error) {
        console.error('Failed to load translations:', error)
      } finally {
        setIsLoaded(true)
      }
    }
    loadTranslations()
  }, [])

  const setLanguage = (_lang: Language) => {
    // Single language mode - Turkish only
  }

  const t = (key: string): string => {
    return translations?.['tr']?.[key] || key
  }

  if (!isLoaded) {
    return <div className="min-h-screen bg-[#0a0118] flex items-center justify-center">
      <div className="text-gold-400 text-xl">Yükleniyor...</div>
    </div>
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}