import type { Metadata } from 'next'
import { Inter, Cinzel } from 'next/font/google'
import './globals.css'
import SessionProviderWrapper from '@/components/session-provider-wrapper'
import OneSignalProvider from '@/components/onesignal-provider'
import { LanguageProvider } from '@/lib/language-context'
import SiteThemeWrapper from '@/components/site-theme-wrapper'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const cinzel = Cinzel({ subsets: ['latin'], variable: '--font-cinzel' })

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
  title: {
    default: 'Canlifal - Canlı Fal Platformu | Canlı Falcılar, Kahve Falı, Tarot',
    template: '%s | Canlifal'
  },
  description: 'Canlı falcılarla birebir görüşme ve yapay zeka destekli fal platformu. Kahve Falı, Tarot, Burç Yorumu, Rüya Tabiri, El Falı ve daha fazlası. Geleceğinizi keşfedin!',
  keywords: [
    'canlı fal', 'fal', 'kahve falı', 'tarot', 'burç yorumu', 'rüya tabiri', 'el falı',
    'online fal', 'ücretsiz fal', 'yapay zeka fal', 'günlük burç',
    'aşk falı', 'melek kartları', 'numeroloji', 'astroloji',
    'fortune telling', 'coffee reading', 'horoscope', 'tarot reading'
  ],
  authors: [{ name: 'Canlifal', url: 'https://canlifal.com' }],
  creator: 'Canlifal',
  publisher: 'Canlifal',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/icons/icon-192x192.png',
  },
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    alternateLocale: 'en_US',
    siteName: 'Canlifal - Canlı Fal Platformu',
    title: 'Canlifal - Canlı Fal Platformu',
    description: 'Canlı falcılarla birebir görüşme ve yapay zeka destekli fal platformu. Kahve Falı, Tarot, Burç Yorumu ve daha fazlası.',
    images: [
      {
        url: '/canlifal-logo.png',
        width: 1200,
        height: 630,
        alt: 'Canlifal - Canlı Fal Platformu',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Canlifal - Canlı Fal Platformu',
    description: 'Canlı falcılarla birebir görüşme ve yapay zeka destekli fal platformu. Geleceğinizi keşfedin!',
    images: ['/canlifal-logo.png'],
    creator: '@canlifal',
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || '',
  },
  alternates: {
    canonical: 'https://canlifal.com',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Canlifal',
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'application-name': 'Canlifal',
    'apple-mobile-web-app-title': 'Canlifal',
    'msapplication-TileColor': '#0a0118',
    'msapplication-tap-highlight': 'no',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" className={`${inter.variable} ${cinzel.variable}`}>
      <head>
        <meta name="theme-color" content="#1a0a2e" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <link rel="manifest" href="/manifest.json" crossOrigin="use-credentials" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <script src="https://apps.abacus.ai/chatllm/appllm-lib.js" async />
        {/* OneSignal Web SDK - loaded dynamically by OneSignalProvider component */}
        {/* Google AdSense */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7118653507313494"
          crossOrigin="anonymous"
        />
        {/* Organization Structured Data for Google */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Canlifal",
              "alternateName": "Canlifal Canlı Fal Platformu",
              "url": "https://canlifal.com",
              "logo": "https://canlifal.com/canlifal-logo.png",
              "description": "Canlı falcılarla birebir görüşme ve yapay zeka destekli fal platformu. Kahve Falı, Tarot, Burç Yorumu ve daha fazlası.",
              "sameAs": [
                "https://twitter.com/canlifal",
                "https://facebook.com/canlifal"
              ],
              "contactPoint": {
                "@type": "ContactPoint",
                "contactType": "customer service",
                "availableLanguage": ["Turkish", "English"]
              }
            })
          }}
        />
        {/* WebSite Structured Data for Google Search */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Canlifal",
              "alternateName": "Canlifal - Canlı Fal Platformu",
              "url": "https://canlifal.com",
              "potentialAction": {
                "@type": "SearchAction",
                "target": {
                  "@type": "EntryPoint",
                  "urlTemplate": "https://canlifal.com/sosyal?search={search_term_string}"
                },
                "query-input": "required name=search_term_string"
              },
              "inLanguage": ["tr", "en"]
            })
          }}
        />
        {/* Service Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Service",
              "serviceType": "Online Fal Bakma",
              "provider": {
                "@type": "Organization",
                "name": "Canlifal",
                "url": "https://canlifal.com"
              },
              "name": "Canlı Fal Platformu",
              "description": "Canlı falcılarla birebir görüntülü görüşme, yapay zeka destekli kahve falı, tarot, burç yorumu, rüya tabiri ve daha fazlası.",
              "areaServed": { "@type": "Country", "name": "Turkey" },
              "availableChannel": {
                "@type": "ServiceChannel",
                "serviceUrl": "https://canlifal.com",
                "serviceType": "Online"
              },
              "hasOfferCatalog": {
                "@type": "OfferCatalog",
                "name": "Fal Türleri",
                "itemListElement": [
                  { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Kahve Falı", "url": "https://canlifal.com/fallar/kahve-fali" }},
                  { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Tarot Falı", "url": "https://canlifal.com/fallar/tarot-fali" }},
                  { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Rüya Tabiri", "url": "https://canlifal.com/fallar/ruya-yorumu" }},
                  { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Burç Yorumu", "url": "https://canlifal.com/fallar/burc-yorumu" }},
                  { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "El Falı", "url": "https://canlifal.com/fallar/el-fali" }},
                  { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Numeroloji", "url": "https://canlifal.com/fallar/numeroloji" }}
                ]
              }
            })
          }}
        />
        {/* FAQPage Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": [
                {
                  "@type": "Question",
                  "name": "Canlifal nedir?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Canlifal, canlı falcılarla birebir görüntülü görüşme yapabileceğiniz ve yapay zeka destekli fal baktırabileceğiniz online bir platformdur."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Hangi fal türleri mevcut?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Kahve falı, tarot, el falı, rüya tabiri, burç yorumu, numeroloji, aura okuma, melek kartları ve daha birçok fal türü mevcuttur."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Ücretsiz fal baktırabilir miyim?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Evet! Canlifal'de yapay zeka destekli fallar tamamen ücretsiz olarak kullanılabilir. Ayrıca canlı falcılarla da görüşebilirsiniz."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Canlı falcılarla nasıl görüşebilirim?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Ücretsiz hesap oluşturarak online falcıları görebilir ve istediğiniz falcıyla birebir görüntülü görüşme başlatabilirsiniz."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Rüya tabiri nasıl yapılır?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Rüyanızı yazılı olarak girin, yapay zeka destekli sistemimiz detaylı rüya tabiri sunar. Ayrıca rüya sözlüğümüzden sembol anlamlarını öğrenebilirsiniz."
                  }
                }
              ]
            })
          }}
        />
        {/* Service worker registration is handled by OneSignal SDK (OneSignalSDKWorker.js) */}
      </head>
      <body>
        <SessionProviderWrapper>
          <SiteThemeWrapper>
            <LanguageProvider>
              <OneSignalProvider />
              {children}
            </LanguageProvider>
          </SiteThemeWrapper>
        </SessionProviderWrapper>
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(()=>{})})}` }} />
      </body>
    </html>
  )
}
// PostgreSQL v2 - Fixed DATABASE_URL
