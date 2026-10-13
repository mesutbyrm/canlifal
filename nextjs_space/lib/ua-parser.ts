// Lightweight user-agent parser for bot detection and device type

const BOT_PATTERNS: { pattern: RegExp; name: string }[] = [
  { pattern: /Googlebot/i, name: 'Googlebot' },
  { pattern: /Googlebot-Image/i, name: 'Googlebot-Image' },
  { pattern: /Googlebot-News/i, name: 'Googlebot-News' },
  { pattern: /Googlebot-Video/i, name: 'Googlebot-Video' },
  { pattern: /Google-InspectionTool/i, name: 'Google-InspectionTool' },
  { pattern: /AdsBot-Google/i, name: 'AdsBot-Google' },
  { pattern: /Mediapartners-Google/i, name: 'Google-Adsense' },
  { pattern: /Storebot-Google/i, name: 'Storebot-Google' },
  { pattern: /bingbot/i, name: 'Bingbot' },
  { pattern: /Slurp/i, name: 'Yahoo Slurp' },
  { pattern: /DuckDuckBot/i, name: 'DuckDuckBot' },
  { pattern: /Baiduspider/i, name: 'Baiduspider' },
  { pattern: /YandexBot/i, name: 'YandexBot' },
  { pattern: /YandexImages/i, name: 'YandexImages' },
  { pattern: /Sogou/i, name: 'Sogou Bot' },
  { pattern: /facebot|facebookexternalhit/i, name: 'Facebook Bot' },
  { pattern: /Twitterbot/i, name: 'Twitter Bot' },
  { pattern: /LinkedInBot/i, name: 'LinkedIn Bot' },
  { pattern: /WhatsApp/i, name: 'WhatsApp Bot' },
  { pattern: /Telegrambot/i, name: 'Telegram Bot' },
  { pattern: /Discordbot/i, name: 'Discord Bot' },
  { pattern: /Pinterest/i, name: 'Pinterest Bot' },
  { pattern: /Applebot/i, name: 'Applebot' },
  { pattern: /SemrushBot/i, name: 'SemrushBot' },
  { pattern: /AhrefsBot/i, name: 'AhrefsBot' },
  { pattern: /MJ12bot/i, name: 'MajesticBot' },
  { pattern: /DotBot/i, name: 'DotBot' },
  { pattern: /PetalBot/i, name: 'PetalBot' },
  { pattern: /Bytespider/i, name: 'Bytespider' },
  { pattern: /GPTBot/i, name: 'GPTBot' },
  { pattern: /ChatGPT-User/i, name: 'ChatGPT' },
  { pattern: /ClaudeBot/i, name: 'ClaudeBot' },
  { pattern: /anthropic-ai/i, name: 'Anthropic Bot' },
  { pattern: /CCBot/i, name: 'CCBot' },
  { pattern: /Screaming Frog/i, name: 'Screaming Frog' },
  { pattern: /ia_archiver/i, name: 'Alexa Bot' },
  { pattern: /archive\.org_bot/i, name: 'Internet Archive Bot' },
  { pattern: /UptimeRobot/i, name: 'UptimeRobot' },
  { pattern: /StatusCake/i, name: 'StatusCake' },
  { pattern: /HeadlessChrome/i, name: 'Headless Chrome' },
  // Generic bot patterns (last, as fallback)
  { pattern: /bot|crawl|spider|slurp|scraper|fetch|monitor/i, name: 'Unknown Bot' },
]

export interface UAInfo {
  deviceType: 'mobile' | 'tablet' | 'desktop'
  isBot: boolean
  botName: string | null
}

export function parseUserAgent(ua: string | null | undefined): UAInfo {
  if (!ua) {
    return { deviceType: 'desktop', isBot: false, botName: null }
  }

  // Check for bots first
  for (const { pattern, name } of BOT_PATTERNS) {
    if (pattern.test(ua)) {
      return { deviceType: 'desktop', isBot: true, botName: name }
    }
  }

  // Device detection
  const isTablet = /iPad|Android(?!.*Mobile)|Tablet|PlayBook|Silk/i.test(ua)
  const isMobile = /Mobile|iPhone|iPod|Android.*Mobile|Windows Phone|BlackBerry|Opera Mini|IEMobile/i.test(ua)

  let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop'
  if (isTablet) deviceType = 'tablet'
  else if (isMobile) deviceType = 'mobile'

  return { deviceType, isBot: false, botName: null }
}

// Emoji for device type
export function deviceEmoji(deviceType: string | null | undefined): string {
  switch (deviceType) {
    case 'mobile': return '📱'
    case 'tablet': return '📟'
    case 'desktop': return '💻'
    default: return '💻'
  }
}
