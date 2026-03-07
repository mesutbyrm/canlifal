import type { Metadata } from 'next'
import { Inter, Cinzel } from 'next/font/google'
import './globals.css'
import SessionProviderWrapper from '@/components/session-provider-wrapper'
import { LanguageProvider } from '@/lib/language-context'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const cinzel = Cinzel({ subsets: ['latin'], variable: '--font-cinzel' })

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
  title: 'FALCI - Yapay Zeka Fal Platformu',
  description: 'Yapay zeka destekli fal platformu ile geleceğinizi keşfedin - Kahve Falı, Tarot, Kurşun Dökme ve daha fazlası',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/icons/icon-192x192.png',
  },
  openGraph: {
    title: 'FALCI - Yapay Zeka Fal Platformu',
    description: 'Yapay zeka destekli fal platformu ile geleceğinizi keşfedin',
    images: ['/og-image.png'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FALCI',
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'application-name': 'FALCI',
    'apple-mobile-web-app-title': 'FALCI',
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
        <meta name="theme-color" content="#d4af37" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <link rel="manifest" href="/manifest.json" crossOrigin="use-credentials" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <script src="https://apps.abacus.ai/chatllm/appllm-lib.js" async />
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(function(registration) {
                  console.log('ServiceWorker registration successful');
                }, function(err) {
                  console.log('ServiceWorker registration failed: ', err);
                });
              });
            }
          `
        }} />
      </head>
      <body>
        <SessionProviderWrapper>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  )
}
// PostgreSQL v2 - Fixed DATABASE_URL
