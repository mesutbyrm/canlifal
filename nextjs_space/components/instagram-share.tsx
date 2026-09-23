'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Copy, Download, ExternalLink, Check, Instagram, Sparkles, Image as ImageIcon } from 'lucide-react'

interface InstagramShareProps {
  sharerName: string
  resultMessage: string
  fortuneType?: string
  siteUrl?: string
  instagramHandle?: string
  logoSrc?: string
  iconSrc?: string
  onClose?: () => void
  trigger?: React.ReactNode
  autoOpen?: boolean
}

const DEFAULT_SITE_URL = 'canlifal.com'
const DEFAULT_IG_HANDLE = '@canlifal0'
const DEFAULT_LOGO = '/canlifal-logo.png'
const DEFAULT_ICON = '/canlifal-logo.png'

// Fortune type labels
const FORTUNE_LABELS: Record<string, string> = {
  coffee: 'Kahve Falı',
  tarot: 'Tarot Falı',
  dream: 'Rüya Yorumu',
  horoscope: 'Burç Yorumu',
  love: 'Aşk Falı',
  angel: 'Melek Kartları',
  palm: 'El Falı',
  numerology: 'Numeroloji',
  aura: 'Aura Analizi',
  astrology: 'Astroloji',
  katina: 'Katina Falı',
  yesno: 'Evet/Hayır',
  istihare: 'İstihare',
  ruya: 'Rüya Yorumu',
  blog: 'Blog Yazısı',
  'dream-dictionary': 'Rüya Sözlüğü',
  'dream-detail': 'Rüya Tabiri',
  'fortune-detail': 'Fal Paylaşımı',
}

// Truncate text to fit canvas
function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.substring(0, maxLen - 3) + '...'
}

// Word wrap for canvas
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }
  if (currentLine) lines.push(currentLine)
  return lines
}

// Draw rounded rectangle
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

// Draw decorative corner ornaments
function drawCornerOrnaments(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, size: number) {
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.6)'
  ctx.lineWidth = 2
  const s = size
  // Top-left
  ctx.beginPath(); ctx.moveTo(x, y + s); ctx.lineTo(x, y); ctx.lineTo(x + s, y); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x + 4, y + s - 4); ctx.quadraticCurveTo(x + 4, y + 4, x + s - 4, y + 4); ctx.stroke()
  // Top-right
  ctx.beginPath(); ctx.moveTo(x + w - s, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + s); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x + w - s + 4, y + 4); ctx.quadraticCurveTo(x + w - 4, y + 4, x + w - 4, y + s - 4); ctx.stroke()
  // Bottom-left
  ctx.beginPath(); ctx.moveTo(x, y + h - s); ctx.lineTo(x, y + h); ctx.lineTo(x + s, y + h); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x + 4, y + h - s + 4); ctx.quadraticCurveTo(x + 4, y + h - 4, x + s - 4, y + h - 4); ctx.stroke()
  // Bottom-right
  ctx.beginPath(); ctx.moveTo(x + w - s, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - s); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x + w - s + 4, y + h - 4); ctx.quadraticCurveTo(x + w - 4, y + h - 4, x + w - 4, y + h - s + 4); ctx.stroke()
}

// Draw stars/sparkles
function drawSparkles(ctx: CanvasRenderingContext2D, width: number, height: number, count: number) {
  for (let i = 0; i < count; i++) {
    const x = Math.random() * width
    const y = Math.random() * height
    const size = Math.random() * 3 + 1
    const alpha = Math.random() * 0.8 + 0.2
    ctx.save()
    ctx.globalAlpha = alpha
    // Star glow
    const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 3)
    glow.addColorStop(0, 'rgba(255, 215, 0, 0.8)')
    glow.addColorStop(0.5, 'rgba(212, 175, 55, 0.3)')
    glow.addColorStop(1, 'rgba(212, 175, 55, 0)')
    ctx.fillStyle = glow
    ctx.fillRect(x - size * 3, y - size * 3, size * 6, size * 6)
    // Star core
    ctx.fillStyle = '#FFD700'
    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

// Draw background gradient
function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Main gradient
  const bg = ctx.createLinearGradient(0, 0, w, h)
  bg.addColorStop(0, '#0a0118')
  bg.addColorStop(0.3, '#1a0533')
  bg.addColorStop(0.6, '#12002e')
  bg.addColorStop(1, '#050010')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)

  // Purple nebula glow
  const glow1 = ctx.createRadialGradient(w * 0.3, h * 0.4, 0, w * 0.3, h * 0.4, w * 0.5)
  glow1.addColorStop(0, 'rgba(139, 92, 246, 0.15)')
  glow1.addColorStop(0.5, 'rgba(88, 28, 135, 0.08)')
  glow1.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = glow1
  ctx.fillRect(0, 0, w, h)

  // Gold glow bottom
  const glow2 = ctx.createRadialGradient(w * 0.5, h * 0.9, 0, w * 0.5, h * 0.9, w * 0.6)
  glow2.addColorStop(0, 'rgba(212, 175, 55, 0.08)')
  glow2.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = glow2
  ctx.fillRect(0, 0, w, h)
}

// Load image as promise
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

// Draw circular image
function drawCircularImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, radius: number) {
  ctx.save()
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()
  ctx.drawImage(img, x - radius, y - radius, radius * 2, radius * 2)
  ctx.restore()
  // Gold ring
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.8)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(x, y, radius + 2, 0, Math.PI * 2)
  ctx.stroke()
}

export default function InstagramShare({
  sharerName,
  resultMessage,
  fortuneType = 'coffee',
  siteUrl = DEFAULT_SITE_URL,
  instagramHandle = DEFAULT_IG_HANDLE,
  logoSrc = DEFAULT_LOGO,
  iconSrc = DEFAULT_ICON,
  onClose,
  trigger,
  autoOpen = false,
}: InstagramShareProps) {
  const [isOpen, setIsOpen] = useState(false)
  const autoOpenedRef = useRef(false)
  const [copied, setCopied] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState<'post' | 'story'>('post')
  const postCanvasRef = useRef<HTMLCanvasElement>(null)
  const storyCanvasRef = useRef<HTMLCanvasElement>(null)
  const [postReady, setPostReady] = useState(false)
  const [storyReady, setStoryReady] = useState(false)

  const fortuneLabel = FORTUNE_LABELS[fortuneType] || 'Fal Yorumu'
  const shortMessage = truncateText(resultMessage, 200)

  const captionText = `🔮 ${sharerName} için özel ${fortuneLabel.toLowerCase()} yorumu\n\n"${shortMessage}"\n\n✨ Sen de falına baktırmak istersen:\n🌐 ${siteUrl}\n\n#canlifal #fal #${fortuneType === 'coffee' ? 'kahvefali' : fortuneType === 'tarot' ? 'tarotfali' : fortuneType === 'dream' || fortuneType === 'ruya' ? 'ruyatabiri' : 'astroloji'} #falci #mistik #${fortuneType} #burc #kehanet`

  const handleOpen = () => {
    setIsOpen(true)
    setCopied(false)
    setPostReady(false)
    setStoryReady(false)
    // Generate images after modal opens
    setTimeout(() => {
      generatePost()
      generateStory()
    }, 100)
  }

  // Auto-open support for external state control
  useEffect(() => {
    if (autoOpen && !autoOpenedRef.current) {
      autoOpenedRef.current = true
      handleOpen()
    }
  }, [autoOpen])

  const handleClose = () => {
    setIsOpen(false)
    onClose?.()
  }

  const handleCopy = () => {
    navigator.clipboard?.writeText(captionText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleDownload = (type: 'post' | 'story') => {
    const canvas = type === 'post' ? postCanvasRef.current : storyCanvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `canlifal-${type}-${sharerName.toLowerCase().replace(/\s/g, '-')}.png`
    link.href = canvas.toDataURL('image/png', 1.0)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleOpenInstagram = () => {
    window.open('https://www.instagram.com/', '_blank')
  }

  // Generate 1080x1080 Instagram Post
  const generatePost = useCallback(async () => {
    const canvas = postCanvasRef.current
    if (!canvas) return
    canvas.width = 1080
    canvas.height = 1080
    const ctx = canvas.getContext('2d')!
    const W = 1080, H = 1080

    // Background
    drawBackground(ctx, W, H)
    drawSparkles(ctx, W, H, 80)

    // Gold border frame
    const pad = 40
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)'
    ctx.lineWidth = 1.5
    roundRect(ctx, pad, pad, W - pad * 2, H - pad * 2, 16)
    ctx.stroke()
    drawCornerOrnaments(ctx, pad, pad, W - pad * 2, H - pad * 2, 50)

    // Load logo
    try {
      const logo = await loadImage(logoSrc)
      // Draw logo at top center
      const logoSize = 80
      drawCircularImage(ctx, logo, W / 2, 120, logoSize / 2)
    } catch { /* fallback without logo */ }

    // Brand name
    ctx.textAlign = 'center'
    ctx.fillStyle = '#FFD700'
    ctx.font = 'bold 36px "Segoe UI", system-ui, sans-serif'
    ctx.fillText('CANLIFAL', W / 2, 190)

    // Decorative line
    const lineY = 210
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(W / 2 - 120, lineY); ctx.lineTo(W / 2 - 20, lineY); ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(W / 2 + 20, lineY); ctx.lineTo(W / 2 + 120, lineY); ctx.stroke()
    // Diamond in center
    ctx.fillStyle = '#FFD700'
    ctx.beginPath()
    ctx.moveTo(W / 2, lineY - 5); ctx.lineTo(W / 2 + 5, lineY); ctx.lineTo(W / 2, lineY + 5); ctx.lineTo(W / 2 - 5, lineY); ctx.closePath(); ctx.fill()

    // "Name için özel yorum"
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
    ctx.font = '24px "Segoe UI", system-ui, sans-serif'
    ctx.fillText(`— ${sharerName} için özel yorum —`, W / 2, 260)

    // Main fortune message
    ctx.fillStyle = '#FFD700'
    ctx.font = 'italic bold 38px "Georgia", "Times New Roman", serif'
    const msgLines = wrapText(ctx, shortMessage, W - 160)
    const msgStartY = 360
    const msgLineHeight = 52
    // Center vertically
    const totalMsgH = msgLines.length * msgLineHeight
    const adjustedStartY = Math.max(320, (H / 2) - totalMsgH / 2 + 30)
    msgLines.slice(0, 6).forEach((line, i) => {
      ctx.fillText(line, W / 2, adjustedStartY + i * msgLineHeight)
    })

    // Quote marks
    ctx.fillStyle = 'rgba(212, 175, 55, 0.3)'
    ctx.font = 'bold 100px Georgia, serif'
    ctx.fillText('"', 80, adjustedStartY - 10)
    ctx.fillText('"', W - 80, adjustedStartY + totalMsgH + 20)

    // Bottom section
    // IG handle
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.font = '22px "Segoe UI", system-ui, sans-serif'
    ctx.fillText(instagramHandle, W / 2, H - 120)

    // Site URL
    ctx.fillStyle = '#FFD700'
    ctx.font = 'bold 28px "Segoe UI", system-ui, sans-serif'
    ctx.fillText(siteUrl, W / 2, H - 80)

    setPostReady(true)
  }, [sharerName, shortMessage, logoSrc, siteUrl, instagramHandle])

  // Generate 1080x1920 Instagram Story
  const generateStory = useCallback(async () => {
    const canvas = storyCanvasRef.current
    if (!canvas) return
    canvas.width = 1080
    canvas.height = 1920
    const ctx = canvas.getContext('2d')!
    const W = 1080, H = 1920

    // Background
    drawBackground(ctx, W, H)
    drawSparkles(ctx, W, H, 150)

    // Extra golden glow at bottom
    const bottomGlow = ctx.createRadialGradient(W / 2, H * 0.85, 0, W / 2, H * 0.85, W * 0.7)
    bottomGlow.addColorStop(0, 'rgba(212, 175, 55, 0.12)')
    bottomGlow.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = bottomGlow
    ctx.fillRect(0, 0, W, H)

    // Frame border
    const pad = 40
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)'
    ctx.lineWidth = 1.5
    roundRect(ctx, pad, 100, W - pad * 2, H - 200, 20)
    ctx.stroke()
    drawCornerOrnaments(ctx, pad, 100, W - pad * 2, H - 200, 60)

    // Load logo/icon
    try {
      const icon = await loadImage(iconSrc)
      const iconSize = 80
      drawCircularImage(ctx, icon, W / 2, 180, iconSize / 2)
    } catch { /* fallback */ }

    // "Bu Fal Sana Mesaj Veriyor" header
    ctx.textAlign = 'center'
    ctx.fillStyle = '#FFD700'
    ctx.font = 'bold 42px "Segoe UI", system-ui, sans-serif'
    ctx.fillText('Bu Fal Sana Mesaj Veriyor', W / 2, 290)

    // Decorative separator
    const sepY = 320
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(W / 2 - 150, sepY); ctx.lineTo(W / 2 - 20, sepY); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(W / 2 + 20, sepY); ctx.lineTo(W / 2 + 150, sepY); ctx.stroke()
    ctx.fillStyle = '#FFD700'
    ctx.font = '20px "Segoe UI", system-ui, sans-serif'
    ctx.fillText('✦', W / 2, sepY + 6)

    // Sharer name
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.font = '28px "Segoe UI", system-ui, sans-serif'
    ctx.fillText(`— ${sharerName} —`, W / 2, 400)

    // Main fortune message (bigger for story)
    ctx.fillStyle = '#FFD700'
    ctx.font = 'italic bold 46px "Georgia", "Times New Roman", serif'
    const storyMsg = truncateText(resultMessage, 250)
    const storyLines = wrapText(ctx, storyMsg, W - 160)
    const storyLineH = 62
    const storyTotalH = storyLines.length * storyLineH
    const storyStartY = Math.max(520, 700 - storyTotalH / 2)
    
    // Quote marks
    ctx.fillStyle = 'rgba(212, 175, 55, 0.25)'
    ctx.font = 'bold 120px Georgia, serif'
    ctx.fillText('"', 80, storyStartY - 20)

    ctx.fillStyle = '#FFD700'
    ctx.font = 'italic bold 46px "Georgia", "Times New Roman", serif'
    storyLines.slice(0, 6).forEach((line, i) => {
      ctx.fillText(line, W / 2, storyStartY + i * storyLineH)
    })

    ctx.fillStyle = 'rgba(212, 175, 55, 0.25)'
    ctx.font = 'bold 120px Georgia, serif'
    ctx.fillText('"', W - 80, storyStartY + storyTotalH + 30)

    // Crystal ball emoji
    ctx.font = '60px serif'
    ctx.fillText('🔮', W / 2, storyStartY + storyTotalH + 120)

    // Bottom section - CTA area
    const ctaY = H - 500

    // "Detaylı yorum için"
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.font = '26px "Segoe UI", system-ui, sans-serif'
    ctx.fillText('Detaylı yorum için', W / 2, ctaY)

    // Site URL
    ctx.fillStyle = '#FFD700'
    ctx.font = 'bold 44px "Segoe UI", system-ui, sans-serif'
    ctx.fillText(siteUrl, W / 2, ctaY + 60)

    // Separator
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)'
    ctx.beginPath(); ctx.moveTo(W / 2 - 100, ctaY + 100); ctx.lineTo(W / 2 + 100, ctaY + 100); ctx.stroke()

    // "Paylaş → Bonus Kazan!"
    ctx.fillStyle = '#FFD700'
    ctx.font = 'bold 34px "Segoe UI", system-ui, sans-serif'
    ctx.fillText('Paylaş ➤ Bonus Kazan!', W / 2, ctaY + 160)

    // IG handle
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.font = '24px "Segoe UI", system-ui, sans-serif'
    ctx.fillText(instagramHandle, W / 2, ctaY + 210)

    setStoryReady(true)
  }, [sharerName, resultMessage, iconSrc, siteUrl, instagramHandle])

  return (
    <>
      {/* Trigger */}
      {trigger ? (
        <div onClick={handleOpen} className="cursor-pointer">{trigger}</div>
      ) : (
        <button
          onClick={handleOpen}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 hover:from-purple-500 hover:via-pink-400 hover:to-orange-300 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30"
        >
          <Instagram size={18} />
          <span>Instagram&apos;da Paylaş</span>
        </button>
      )}

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto py-4 px-4"
            onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-gradient-to-b from-[#1a0533] to-[#0a0118] border border-purple-500/20 rounded-2xl w-full max-w-lg shadow-2xl shadow-purple-500/10 my-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center">
                    <Instagram size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">Fal sonucunu Instagram&apos;da paylaş ✨</h3>
                    <p className="text-white/40 text-xs">Sonucunu beğendiysen görseli indir ve paylaş</p>
                  </div>
                </div>
                <button onClick={handleClose} className="text-white/40 hover:text-white p-1 transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Tab Switcher */}
              <div className="flex gap-1 p-3 pb-0">
                <button
                  onClick={() => setActiveTab('post')}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'post'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'bg-white/5 text-white/40 border border-transparent hover:bg-white/10'
                  }`}
                >
                  📷 Post (1:1)
                </button>
                <button
                  onClick={() => setActiveTab('story')}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'story'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'bg-white/5 text-white/40 border border-transparent hover:bg-white/10'
                  }`}
                >
                  📱 Story (9:16)
                </button>
              </div>

              {/* Canvas Preview */}
              <div className="p-3">
                <div className={`relative rounded-xl overflow-hidden border border-white/10 bg-black ${
                  activeTab === 'post' ? 'aspect-square' : 'aspect-[9/16] max-h-[400px]'
                }`}>
                  <canvas
                    ref={postCanvasRef}
                    className={`w-full h-full object-contain ${activeTab === 'post' ? '' : 'hidden'}`}
                  />
                  <canvas
                    ref={storyCanvasRef}
                    className={`w-full h-full object-contain ${activeTab === 'story' ? '' : 'hidden'}`}
                  />
                  {((activeTab === 'post' && !postReady) || (activeTab === 'story' && !storyReady)) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                      <div className="flex flex-col items-center gap-2">
                        <Sparkles className="animate-pulse text-purple-400" size={24} />
                        <span className="text-white/50 text-xs">Görsel oluşturuluyor...</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Caption Box */}
              <div className="px-3 pb-3">
                <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/40 text-xs">Paylaşım Açıklaması</span>
                    <button
                      onClick={handleCopy}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        copied
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-white/10 text-white/60 hover:text-white border border-white/10 hover:border-white/20'
                      }`}
                    >
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                      {copied ? 'Kopyalandı!' : 'Kopyala'}
                    </button>
                  </div>
                  <div className="text-white/60 text-xs leading-relaxed max-h-24 overflow-y-auto whitespace-pre-line scrollbar-thin">
                    {captionText}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="px-3 pb-3 flex gap-2">
                <button
                  onClick={handleCopy}
                  className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/10 text-white/80 hover:text-white py-2.5 rounded-xl text-xs font-medium transition-all"
                >
                  <Copy size={14} /> Açıklamayı Kopyala
                </button>
                <button
                  onClick={() => handleDownload(activeTab)}
                  disabled={activeTab === 'post' ? !postReady : !storyReady}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 disabled:opacity-50 text-white py-2.5 rounded-xl text-xs font-medium transition-all shadow-lg shadow-purple-500/20"
                >
                  <Download size={14} /> Görseli İndir
                </button>
                <button
                  onClick={handleOpenInstagram}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-400 hover:to-pink-400 text-white py-2.5 rounded-xl text-xs font-medium transition-all"
                >
                  <ExternalLink size={14} /> Instagram
                </button>
              </div>

              {/* Steps */}
              <div className="px-3 pb-4">
                <div className="flex items-center gap-2 justify-center">
                  {[
                    { num: 1, text: 'Metni kopyala' },
                    { num: 2, text: 'Görseli indir' },
                    { num: 3, text: 'Instagram\'da paylaş' },
                  ].map((step, i) => (
                    <div key={step.num} className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center text-[10px] font-bold">{step.num}</span>
                      <span className="text-white/40 text-[10px]">{step.text}</span>
                      {i < 2 && <span className="text-white/20 text-xs mx-1">›</span>}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
