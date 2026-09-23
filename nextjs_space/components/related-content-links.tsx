'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Sparkles } from 'lucide-react'

interface RelatedLink {
  href: string
  title: string
  description: string
  image: string
}

const ALL_FORTUNE_LINKS: Record<string, RelatedLink> = {
  'kahve-fali': {
    href: '/fallar/kahve-fali',
    title: 'Kahve Falı',
    description: 'Türk kahvesi fincanınızdan geleceğinizi okuyun',
    image: '/fortunes/coffee.webp',
  },
  'tarot-fali': {
    href: '/fallar/tarot-fali',
    title: 'Tarot Falı',
    description: '78 kartla hayatınızın gizemlerini keşfedin',
    image: '/fortunes/tarot.webp',
  },
  'el-fali': {
    href: '/fallar/el-fali',
    title: 'El Falı',
    description: 'Avuç içinizdeki çizgilerle kaderinizi öğrenin',
    image: '/fortunes/palm.webp',
  },
  'ruya-yorumu': {
    href: '/fallar/ruya-yorumu',
    title: 'Rüya Yorumu',
    description: 'Rüyalarınızın anlamını yapay zeka ile çözümleyin',
    image: '/fortunes/dream.webp',
  },
  'burc-yorumu': {
    href: '/fallar/burc-yorumu',
    title: 'Günlük Burç Yorumu',
    description: 'Bugün yıldızlar sizin için ne söylüyor?',
    image: '/fortunes/horoscope.webp',
  },
  'numeroloji': {
    href: '/fallar/numeroloji',
    title: 'Numeroloji',
    description: 'Doğum tarihiniz ve isminizle sayıların gücünü keşfedin',
    image: '/fortunes/numerology.webp',
  },
  'ask-uyumu': {
    href: '/fallar/ask-uyumu',
    title: 'Aşk Uyumu',
    description: 'Sevgilinizle burç uyumunuzu öğrenin',
    image: '/fortunes/love.webp',
  },
  'aura-analizi': {
    href: '/fallar/aura-analizi',
    title: 'Aura Analizi',
    description: 'Enerji alanınızın renklerini ve anlamlarını keşfedin',
    image: '/fortunes/aura.webp',
  },
  'melek-kartlari': {
    href: '/fallar/melek-kartlari',
    title: 'Melek Kartları',
    description: 'Meleklerden size gelen mesajları okuyun',
    image: '/fortunes/angel.webp',
  },
  'dogum-haritasi': {
    href: '/fallar/dogum-haritasi',
    title: 'Doğum Haritası',
    description: 'Doğum anınızdaki gezegen konumlarıyla kişiliğinizi analiz edin',
    image: '/fortunes/birthchart.webp',
  },
  'evet-hayir': {
    href: '/fallar/evet-hayir',
    title: 'Evet / Hayır Falı',
    description: 'Aklınızdaki soruya hemen cevap alın',
    image: '/fortunes/yesno.webp',
  },
  'katina': {
    href: '/fallar/katina',
    title: 'Katina Falı',
    description: 'Geleneksel katina kartlarıyla geleceğe bakın',
    image: '/fortunes/katina.webp',
  },
  'kursundokme': {
    href: '/fallar/kursundokme',
    title: 'Kurşun Dökme',
    description: 'Nazar ve kötü enerjileri kurşun dökerek temizleyin',
    image: '/fortunes/dream.webp',
  },
  'istihare': {
    href: '/fallar/istihare',
    title: 'İstihare',
    description: 'Karar vermekte zorlandığınız konularda ilahi rehberlik alın',
    image: '/fortunes/angel.webp',
  },
  'ruya': {
    href: '/ruya',
    title: 'Rüya Tabirleri',
    description: 'Binlerce rüya sembolünü keşfedin ve rüyanızı yorumlayın',
    image: '/fortunes/dream.webp',
  },
  'ruya-sozlugu': {
    href: '/ruya-sozlugu',
    title: 'Rüya Sözlüğü',
    description: 'A\'dan Z\'ye tüm rüya sembollerini ve anlamlarını bulun',
    image: '/fortunes/dream.webp',
  },
}

interface RelatedContentLinksProps {
  /** Current page slug to exclude from related links */
  currentSlug: string
  /** Slugs of related pages to show (from ALL_FORTUNE_LINKS keys) */
  relatedSlugs: string[]
  /** Optional introductory paragraph text */
  introText?: string
}

export default function RelatedContentLinks({ currentSlug, relatedSlugs, introText }: RelatedContentLinksProps) {
  const links = relatedSlugs
    .filter(slug => slug !== currentSlug && ALL_FORTUNE_LINKS[slug])
    .map(slug => ALL_FORTUNE_LINKS[slug])
    .slice(0, 6)

  if (links.length === 0) return null

  return (
    <section className="mt-10 mb-6">
      <h2 className="text-xl font-serif text-gold-400 mb-3 flex items-center gap-2">
        <Sparkles className="w-5 h-5" />
        İlgili Fal Yorumları
      </h2>

      {introText && (
        <p className="text-purple-200/80 text-sm mb-4 leading-relaxed">
          {introText}
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {links.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className="group bg-purple-900/30 border border-purple-500/20 rounded-xl overflow-hidden hover:border-gold-500/40 transition-all hover:scale-[1.02]"
          >
            <div className="relative aspect-[16/9] bg-purple-900/50">
              <Image
                src={link.image}
                alt={link.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 640px) 50vw, 33vw"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <span className="absolute bottom-1.5 left-2 text-white text-xs font-semibold drop-shadow-lg">
                {link.title}
              </span>
            </div>
            <p className="text-[11px] text-purple-300/70 px-2 py-1.5 line-clamp-2">
              {link.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  )
}
