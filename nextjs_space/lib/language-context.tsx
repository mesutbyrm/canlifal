'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

type Language = 'en' | 'tr'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const translations: Record<string, Record<string, string>> = {}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')
  const [isLoaded, setIsLoaded] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

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

  // Detect language from pathname
  useEffect(() => {
    const pathLang = pathname?.split('/')?.[1]
    if (pathLang === 'en' || pathLang === 'tr') {
      setLanguageState(pathLang)
    } else {
      // Default to English if no language in path
      setLanguageState('en')
    }
  }, [pathname])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    // Update pathname with new language
    const currentPath = pathname || '/'
    const pathParts = currentPath.split('/').filter(Boolean)
    const newPath = pathParts?.[0] === 'en' || pathParts?.[0] === 'tr' 
      ? `/${lang}/${pathParts.slice(1).join('/')}` 
      : `/${lang}${currentPath}`
    router.push(newPath)
  }

  const t = (key: string): string => {
    return translations?.[language]?.[key] || key
  }

  if (!isLoaded) {
    return <div className="min-h-screen bg-[#0a0118] flex items-center justify-center">
      <div className="text-gold-400 text-xl">Loading...</div>
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
