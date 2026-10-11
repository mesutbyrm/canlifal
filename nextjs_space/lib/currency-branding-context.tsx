'use client'

/**
 * BÖLÜM 8 — Para birimi markalamasının istemci tarafına bağlanması.
 *
 * Yönetici panelinden değiştirilen Jeton/CFC adı, ikonu ve rengi
 * `/api/currency-branding` ucundan okunur ve tüm bakiye yüzeylerinde
 * kullanılabilir hale getirilir.
 *
 * SSR güvenliği: sunucuda ve ilk render'da her zaman varsayılan değerler
 * kullanılır; gerçek değerler `useEffect` içinde yüklenir.
 */

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'

export interface CurrencyBrand {
  key: 'jeton' | 'cfc'
  name: string
  nameEn: string
  icon: string
  color: string
  convertible: boolean
}

export interface CurrencyBrandingValue {
  jeton: CurrencyBrand
  cfc: CurrencyBrand
  loaded: boolean
  refresh: () => void
}

export const DEFAULT_BRANDING: { jeton: CurrencyBrand; cfc: CurrencyBrand } = {
  jeton: {
    key: 'jeton',
    name: 'Jeton',
    nameEn: 'Jeton',
    icon: '/currency/jeton.svg',
    color: '#F5C542',
    convertible: true,
  },
  cfc: {
    key: 'cfc',
    name: 'CFC',
    nameEn: 'CFC',
    icon: '/currency/cfc.svg',
    color: '#A78BFA',
    convertible: false,
  },
}

const CACHE_KEY = 'canlifal:currency-branding'

const CurrencyBrandingContext = createContext<CurrencyBrandingValue>({
  ...DEFAULT_BRANDING,
  loaded: false,
  refresh: () => {},
})

function sanitize(raw: any, fallback: CurrencyBrand): CurrencyBrand {
  if (!raw || typeof raw !== 'object') return fallback
  return {
    key: fallback.key,
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : fallback.name,
    nameEn: typeof raw.nameEn === 'string' && raw.nameEn.trim() ? raw.nameEn.trim() : fallback.nameEn,
    icon: typeof raw.icon === 'string' && raw.icon.trim() ? raw.icon.trim() : fallback.icon,
    color: typeof raw.color === 'string' && raw.color.trim() ? raw.color.trim() : fallback.color,
    convertible: fallback.convertible,
  }
}

export function CurrencyBrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState(DEFAULT_BRANDING)
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/currency-branding')
      if (!res.ok) return
      const data = await res.json()
      const next = {
        jeton: sanitize(data?.jeton, DEFAULT_BRANDING.jeton),
        cfc: sanitize(data?.cfc, DEFAULT_BRANDING.cfc),
      }
      setBranding(next)
      setLoaded(true)
      try {
        window.localStorage.setItem(CACHE_KEY, JSON.stringify(next))
      } catch {}
    } catch {
      /* varsayılanlarla devam */
    }
  }, [])

  useEffect(() => {
    // Önce önbellekten anında göster, sonra tazele
    try {
      const cached = window.localStorage.getItem(CACHE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached)
        setBranding({
          jeton: sanitize(parsed?.jeton, DEFAULT_BRANDING.jeton),
          cfc: sanitize(parsed?.cfc, DEFAULT_BRANDING.cfc),
        })
        setLoaded(true)
      }
    } catch {}
    load()
  }, [load])

  return (
    <CurrencyBrandingContext.Provider value={{ ...branding, loaded, refresh: load }}>
      {children}
    </CurrencyBrandingContext.Provider>
  )
}

export function useCurrencyBranding(): CurrencyBrandingValue {
  return useContext(CurrencyBrandingContext)
}

/** Tek bir para biriminin markasını döndürür */
export function useCurrencyBrand(currency: 'jeton' | 'cfc' | 'credits' | string): CurrencyBrand {
  const branding = useCurrencyBranding()
  const key = String(currency || '').toLowerCase()
  if (key === 'jeton') return branding.jeton
  return branding.cfc
}
