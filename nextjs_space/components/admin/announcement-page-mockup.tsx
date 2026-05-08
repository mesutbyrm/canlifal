'use client'

/**
 * Mini visual mockup of a page showing where the announcement banner would appear.
 * Used in admin/announcement-settings → Page Placements tab.
 */

import { motion } from 'framer-motion'

interface Props {
  pageType: 'home' | 'voice' | 'live' | 'default'
  position: string  // e.g. 'top', 'over-streams', 'below-announcement', etc.
  effect: string    // animation effect key
  selected: boolean
  onClick: () => void
  label: string
  desc: string
}

// Animation classes based on effect
function getEffectAnimation(effect: string) {
  switch (effect) {
    case 'slide': return 'mockup-slide-down'
    case 'slideLeft': return 'mockup-slide-left'
    case 'slideRight': return 'mockup-slide-right'
    case 'fade': return 'mockup-fade'
    case 'flash': return 'mockup-flash'
    case 'zoom': return 'mockup-zoom'
    case 'bounce': return 'mockup-bounce'
    case 'glow': return 'mockup-glow'
    case 'shake': return 'mockup-shake'
    case 'wave': return 'mockup-wave'
    case 'flipX': return 'mockup-flipx'
    case 'elastic': return 'mockup-elastic'
    case 'typewriter': return 'mockup-fade'
    default: return 'mockup-fade'
  }
}

export default function AnnouncementPageMockup({ pageType, position, effect, selected, onClick, label, desc }: Props) {
  const effectClass = getEffectAnimation(effect)

  // Banner position styles based on `position`
  const bannerStyles = (() => {
    switch (position) {
      case 'top': return { top: '14%', left: 0, right: 0 }
      case 'over-streams': return { top: '32%', left: 0, right: 0 }
      case 'middle': return { top: '24%', left: 0, right: 0 }
      case 'below-announcement': return { top: '24%', left: 0, right: 0 }
      case 'above-input': return { bottom: '14%', left: 0, right: 0 }
      case 'over-video': return { top: '30%', left: 0, right: 0, opacity: 0.85 }
      case 'above-comments': return { top: '52%', left: 0, right: 0 }
      case 'page-top': return { top: '14%', left: 0, right: 0 }
      case 'page-bottom': return { bottom: '8%', left: 0, right: 0 }
      default: return { top: '14%', left: 0, right: 0 }
    }
  })()

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative rounded-xl border-2 overflow-hidden transition-all text-left ${
        selected
          ? 'border-fuchsia-500 shadow-xl shadow-fuchsia-500/30 scale-[1.02]'
          : 'border-white/10 hover:border-white/30'
      }`}
      style={{ background: selected ? 'rgba(168,85,247,0.08)' : 'rgba(255,255,255,0.03)' }}
    >
      {/* Phone-like mockup frame */}
      <div className="relative mx-auto mt-3 mb-2 w-[140px] h-[200px] rounded-[18px] border-2 border-white/20 bg-gradient-to-b from-[#0d0420] to-[#1a0a30] overflow-hidden shadow-inner" style={{ boxShadow: 'inset 0 0 12px rgba(0,0,0,0.6)' }}>
        {/* Notch */}
        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-10 h-1.5 rounded-full bg-black/60" />

        {/* Navbar */}
        <div className="absolute top-0 left-0 right-0 h-[14%] bg-gradient-to-r from-purple-900/60 to-fuchsia-900/60 border-b border-white/10 flex items-center px-1.5">
          <div className="w-3 h-3 rounded bg-fuchsia-400/60" />
          <div className="flex-1" />
          <div className="w-2 h-2 rounded-full bg-white/30" />
        </div>

        {/* Content area - varies by page type */}
        <div className="absolute top-[14%] bottom-0 left-0 right-0 p-1.5 space-y-1">
          {pageType === 'home' && (
            <>
              {/* Action buttons row */}
              <div className="grid grid-cols-4 gap-1">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-3 rounded bg-purple-500/30" />
                ))}
              </div>
              {/* Live streams label */}
              <div className="h-2 w-1/2 rounded bg-red-500/50" />
              {/* Live streams grid */}
              <div className="grid grid-cols-3 gap-1">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="aspect-[3/4] rounded bg-gradient-to-br from-pink-500/30 to-purple-500/30 border border-white/10" />
                ))}
              </div>
            </>
          )}

          {pageType === 'voice' && (
            <>
              {/* Room announcement */}
              <div className="h-4 rounded bg-amber-400/30 border border-amber-300/30 flex items-center justify-center">
                <div className="w-12 h-1 bg-amber-200/60 rounded" />
              </div>
              {/* Voice tiles */}
              <div className="grid grid-cols-4 gap-1">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="aspect-square rounded-full bg-cyan-400/30 border border-cyan-300/30" />
                ))}
              </div>
              {/* Chat messages */}
              <div className="space-y-0.5">
                <div className="h-1.5 w-3/4 rounded bg-white/15" />
                <div className="h-1.5 w-2/3 rounded bg-white/15" />
                <div className="h-1.5 w-4/5 rounded bg-white/15" />
              </div>
              {/* Input bar at bottom */}
              <div className="absolute bottom-1 left-1.5 right-1.5 h-3 rounded-full bg-white/10 border border-white/20" />
            </>
          )}

          {pageType === 'live' && (
            <>
              {/* Big video area */}
              <div className="h-[60%] rounded bg-gradient-to-br from-pink-600/40 to-fuchsia-700/40 border border-pink-400/30 relative overflow-hidden">
                <div className="absolute top-1 left-1 px-1 py-0.5 bg-red-500 rounded text-[6px] text-white font-bold">LIVE</div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-white/20" />
                </div>
              </div>
              {/* Comments */}
              <div className="space-y-0.5 mt-1">
                <div className="h-1.5 w-4/5 rounded bg-white/15" />
                <div className="h-1.5 w-3/4 rounded bg-white/15" />
                <div className="h-1.5 w-5/6 rounded bg-white/15" />
              </div>
            </>
          )}

          {pageType === 'default' && (
            <>
              {/* Generic page content */}
              <div className="h-3 w-1/2 rounded bg-white/30" />
              <div className="space-y-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-2 rounded bg-white/15" />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-1 mt-1">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="aspect-video rounded bg-purple-500/20 border border-white/10" />
                ))}
              </div>
            </>
          )}
        </div>

        {/* The animated banner */}
        <div
          className={`absolute z-20 ${effectClass}`}
          style={{
            ...bannerStyles,
            height: '12px',
          }}
        >
          <div
            className="mx-2 h-full rounded-md flex items-center justify-center px-1 overflow-hidden"
            style={{
              background: 'linear-gradient(90deg, #c8102e 0%, #1a0000 50%, #c8102e 100%)',
              backgroundSize: '200% 100%',
              animation: 'mockupBgShift 3s linear infinite',
              boxShadow: '0 0 8px rgba(236,72,153,0.5)',
              border: '0.5px solid rgba(255,215,0,0.4)',
            }}
          >
            <div className="text-[5px] text-white font-bold whitespace-nowrap">📢 Duyuru</div>
          </div>
        </div>
      </div>

      {/* Label */}
      <div className="px-2 pb-2 text-center">
        <p className={`text-xs font-semibold ${selected ? 'text-fuchsia-300' : 'text-white'}`}>{label}</p>
        <p className="text-[9px] text-purple-400 mt-0.5 leading-tight">{desc}</p>
      </div>

      {/* Selected indicator */}
      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-fuchsia-500 flex items-center justify-center shadow-lg">
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
        </div>
      )}

      {/* Animations CSS (global keyframes via plain style tag) */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes mockupBgShift { 0% { background-position: 0% 0; } 100% { background-position: 200% 0; } }
        .mockup-fade { animation: mockupFade 2.5s ease-in-out infinite; }
        .mockup-slide-down { animation: mockupSlideDown 2.5s ease-in-out infinite; }
        .mockup-slide-left { animation: mockupSlideLeft 2.5s ease-in-out infinite; }
        .mockup-slide-right { animation: mockupSlideRight 2.5s ease-in-out infinite; }
        .mockup-flash { animation: mockupFlash 2s ease-in-out infinite; }
        .mockup-zoom { animation: mockupZoom 2.5s ease-in-out infinite; }
        .mockup-bounce { animation: mockupBounce 2.5s ease-in-out infinite; }
        .mockup-glow { animation: mockupGlow 2.5s ease-in-out infinite; }
        .mockup-shake { animation: mockupShake 2.5s ease-in-out infinite; }
        .mockup-wave { animation: mockupWave 2.5s ease-in-out infinite; }
        .mockup-flipx { animation: mockupFlipX 2.5s ease-in-out infinite; }
        .mockup-elastic { animation: mockupElastic 2.5s ease-in-out infinite; }
        @keyframes mockupFade { 0%,100% { opacity: 0.3; } 50% { opacity: 1; } }
        @keyframes mockupSlideDown { 0%,100% { transform: translateY(-100%); opacity: 0; } 30%,70% { transform: translateY(0); opacity: 1; } }
        @keyframes mockupSlideLeft { 0%,100% { transform: translateX(-100%); opacity: 0; } 30%,70% { transform: translateX(0); opacity: 1; } }
        @keyframes mockupSlideRight { 0%,100% { transform: translateX(100%); opacity: 0; } 30%,70% { transform: translateX(0); opacity: 1; } }
        @keyframes mockupFlash { 0%,100% { opacity: 0; filter: brightness(1); } 25%,75% { opacity: 1; filter: brightness(1.5); } 50% { opacity: 1; filter: brightness(2); } }
        @keyframes mockupZoom { 0%,100% { transform: scale(0); opacity: 0; } 30%,70% { transform: scale(1); opacity: 1; } }
        @keyframes mockupBounce { 0%,100% { transform: translateY(-50%); opacity: 0; } 30% { transform: translateY(8%); opacity: 1; } 50% { transform: translateY(-3%); } 70% { transform: translateY(0); opacity: 1; } }
        @keyframes mockupGlow { 0%,100% { opacity: 0.4; filter: drop-shadow(0 0 0 transparent); } 50% { opacity: 1; filter: drop-shadow(0 0 6px rgba(236,72,153,0.9)); } }
        @keyframes mockupShake { 0%,100% { transform: translateX(0); opacity: 1; } 25% { transform: translateX(-2px); } 75% { transform: translateX(2px); } }
        @keyframes mockupWave { 0%,100% { transform: translateY(0) rotate(0deg); opacity: 0.4; } 25% { transform: translateY(-2px) rotate(-1deg); } 50% { transform: translateY(0) rotate(0); opacity: 1; } 75% { transform: translateY(-2px) rotate(1deg); } }
        @keyframes mockupFlipX { 0%,100% { transform: rotateX(90deg); opacity: 0; } 30%,70% { transform: rotateX(0); opacity: 1; } }
        @keyframes mockupElastic { 0%,100% { transform: scaleX(0); opacity: 0; } 25% { transform: scaleX(1.2); opacity: 1; } 50% { transform: scaleX(0.95); } 75% { transform: scaleX(1); opacity: 1; } }
      ` }} />
    </button>
  )
}

// Export the page placement options
export const PAGE_PLACEMENTS = {
  home: {
    label: '🏠 Ana Sayfa',
    desc: 'Anasayfada duyuru bandının görüneceği yer',
    options: [
      { key: 'top', label: 'Navbar Altı', desc: 'Üstte, navbar altında' },
      { key: 'over-streams', label: 'Canlı Yayınlar Üzerinde', desc: 'Yayın listesinin üzerinden geçer' },
      { key: 'middle', label: 'Aksiyon Butonları Altı', desc: 'Buton sırasının altında' },
    ]
  },
  voice: {
    label: '🎙️ Sesli Sohbet',
    desc: 'Sesli sohbet odalarında duyuru konumu',
    options: [
      { key: 'top', label: 'Navbar Altı', desc: 'En üstte, sabit' },
      { key: 'below-announcement', label: 'Oda Duyurusu Altı', desc: 'Oda duyurusunun hemen altı' },
      { key: 'above-input', label: 'Mesaj Kutusu Üstü', desc: 'Mesaj yazma alanının üstü' },
    ]
  },
  live: {
    label: '📹 Canlı Yayın',
    desc: 'Canlı video yayınlarında duyuru konumu',
    options: [
      { key: 'top', label: 'Navbar Altı', desc: 'En üstte, video üstü' },
      { key: 'over-video', label: 'Video Üstü Yarı-Saydam', desc: 'Video üzerinden saydam geçer' },
      { key: 'above-comments', label: 'Yorumlar Üstü', desc: 'Yorum bölümünün üstü' },
    ]
  },
  default: {
    label: '📄 Diğer Sayfalar',
    desc: 'Profil, blog, ayarlar ve diğer sayfalar',
    options: [
      { key: 'top', label: 'Navbar Altı (Önerilen)', desc: 'Standart konum' },
      { key: 'page-top', label: 'Sayfa Başı', desc: 'İçeriğin en üstü' },
      { key: 'page-bottom', label: 'Sayfa Sonu', desc: 'Sayfanın altında sabit' },
    ]
  },
} as const

export type PageType = keyof typeof PAGE_PLACEMENTS