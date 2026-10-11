'use client'

import { useEffect } from 'react'

interface PageMetaTagsProps {
  title: string
  description: string
  canonicalUrl: string
}

/**
 * Sayfa üst bilgisine (document head) meta ve canonical etiketlerini güvenli
 * biçimde ekler.
 *
 * Daha önce bu etiketler bir <div> içindeki <head> bloğuna yazılıyordu; bu
 * geçersiz HTML olduğu için tarayıcı konsolunda hidrasyon hatası üretiyordu.
 * Etiketler artık doğrudan belge başlığına eklenir; SEO çıktısı aynı kalır.
 */
export default function PageMetaTags({ title, description, canonicalUrl }: PageMetaTagsProps) {
  useEffect(() => {
    const fullTitle = `${title} | Canlifal`
    const created: HTMLElement[] = []

    const setMeta = (attr: 'name' | 'property', key: string, content: string) => {
      if (!content) return
      let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute(attr, key)
        document.head.appendChild(el)
        created.push(el)
      }
      el.setAttribute('content', content)
    }

    setMeta('property', 'og:title', fullTitle)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:type', 'website')
    setMeta('property', 'og:url', canonicalUrl)
    setMeta('name', 'twitter:title', fullTitle)
    setMeta('name', 'twitter:description', description)
    setMeta('name', 'description', description)

    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'canonical'
      document.head.appendChild(link)
      created.push(link)
    }
    link.href = canonicalUrl

    return () => {
      created.forEach((el) => el.remove())
    }
  }, [title, description, canonicalUrl])

  return null
}
