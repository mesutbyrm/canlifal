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
  },
  openGraph: {
    title: 'FALCI - Yapay Zeka Fal Platformu',
    description: 'Yapay zeka destekli fal platformu ile geleceğinizi keşfedin',
    images: ['/og-image.png'],
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
        <script src="https://apps.abacus.ai/chatllm/appllm-lib.js" async />
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
