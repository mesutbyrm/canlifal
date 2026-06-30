/**
 * Paylaşılan YouTube stream çözümleyici.
 *
 * ÖNEMLİ MİMARİ NOTU:
 * Üretim (production) ortamı yalnızca Node.js bağımlılıklarını çalıştırır;
 * yt-dlp / ffmpeg gibi sistem binary'leri ORADA YOKTUR. Bu nedenle stream
 * çözümleme, harici HTTP servisleri (Piped + Invidious) üzerinden yapılır.
 * yt-dlp yalnızca yerel/manuel test için kullanılabilir, üretimde değil.
 *
 * Hem `app/api/chat/youtube-stream/route.ts` hem de `lib/chat-dj-events.ts`
 * bu modülü kullanır; böylece çözümleme mantığı tek bir yerde toplanır.
 */

export interface StreamResult {
  audioUrl: string | null
  videoUrl: string | null
  title: string | null
  duration: number | null
  thumbnail: string | null
  source: string
}

// Piped API instance'ları — biri başarısız olursa sıradaki denenir.
const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://pipedapi.in.projectsegfau.lt',
  'https://api.piped.private.coffee',
  'https://pipedapi.reallyaweso.me',
]

// Invidious instance'ları — Piped tamamen başarısız olursa son çare.
const INVIDIOUS_INSTANCES = [
  'https://invidious.nerdvpn.de',
  'https://inv.nadeko.net',
  'https://invidious.jing.rocks',
]

const FETCH_TIMEOUT_MS = 5000

function logFail(stage: string, instance: string, reason: string) {
  console.warn(`[yt-resolver] ${stage} başarısız @ ${instance}: ${reason}`)
}

async function resolveFromPiped(videoId: string, instance: string): Promise<StreamResult | null> {
  try {
    const res = await fetch(`${instance}/streams/${videoId}`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) {
      logFail('piped', instance, `HTTP ${res.status}`)
      return null
    }

    const data = await res.json()

    const audioStreams: any[] = data?.audioStreams || []
    const bestAudio = audioStreams
      .filter((s: any) => s.url && s.mimeType?.startsWith('audio/'))
      .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0]

    const videoStreams: any[] = data?.videoStreams || []
    const bestVideo = videoStreams
      .filter((s: any) => s.url && s.videoOnly === false)
      .sort((a: any, b: any) => {
        const aDiff = Math.abs((a.height || 0) - 720)
        const bDiff = Math.abs((b.height || 0) - 720)
        return aDiff - bDiff
      })[0]

    if (!bestAudio?.url && !bestVideo?.url) {
      logFail('piped', instance, 'kullanılabilir stream yok')
      return null
    }

    return {
      audioUrl: bestAudio?.url || null,
      videoUrl: bestVideo?.url || null,
      title: data.title || null,
      duration: data.duration || null,
      thumbnail: data.thumbnailUrl || `https://i.ytimg.com/vi/EPGrst2nqBQ/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLAg9KsMxR0Foc2apSreSX0VWdTFXA`,
      source: `piped:${instance.replace('https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEioDb_GyvQGqWM-tYXfgUtlQkOcch4O3-e_3oS3CSvXl-bIcDAsA68vRmeXaqbJ24vEIPFz_xeesugVTwvHR_U3KKYiyKcUKbr3qWnsXJ5ReGAiGGQ1A4nCU7Qm1Qd3flFMg7crCpb6WTjU/s1600/get-youtube-data-api-key-3.jpg', '')}`,
    }
  } catch (e: any) {
    logFail('piped', instance, e?.name === 'TimeoutError' ? 'zaman aşımı' : (e?.message || 'bilinmeyen hata'))
    return null
  }
}

async function resolveFromInvidious(videoId: string, instance: string): Promise<StreamResult | null> {
  try {
    const res = await fetch(`${instance}/api/v1/videos/${videoId}?fields=title,lengthSeconds,adaptiveFormats,formatStreams,videoThumbnails`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) {
      logFail('invidious', instance, `HTTP ${res.status}`)
      return null
    }

    const data = await res.json()

    const adaptive: any[] = data?.adaptiveFormats || []
    const bestAudio = adaptive
      .filter((s: any) => s.url && (s.type || '').startsWith('audio/'))
      .sort((a: any, b: any) => (parseInt(b.bitrate || '0') - parseInt(a.bitrate || '0')))[0]

    // formatStreams birleşik (audio+video) akışlardır; oynatıcı için en uyumlusu.
    const combined: any[] = data?.formatStreams || []
    const bestVideo = combined
      .filter((s: any) => s.url)
      .sort((a: any, b: any) => {
        const aDiff = Math.abs(parseInt(a.resolution || '0') - 720)
        const bDiff = Math.abs(parseInt(b.resolution || '0') - 720)
        return aDiff - bDiff
      })[0]

    if (!bestAudio?.url && !bestVideo?.url) {
      logFail('invidious', instance, 'kullanılabilir stream yok')
      return null
    }

    return {
      audioUrl: bestAudio?.url || null,
      videoUrl: bestVideo?.url || null,
      title: data.title || null,
      duration: data.lengthSeconds || null,
      thumbnail: data?.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/2ybiC9EF-oc/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLCDeH2BcYKRPKKt3YI9-qBecZmXnQ`,
      source: `invidious:${instance.replace('https://i.ytimg.com/vi/Sp3dFF-Bts0/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLAiwHsf-5GfQmAAowXi_5ujX-imHA', '')}`,
    }
  } catch (e: any) {
    logFail('invidious', instance, e?.name === 'TimeoutError' ? 'zaman aşımı' : (e?.message || 'bilinmeyen hata'))
    return null
  }
}

/**
 * Bir YouTube video ID'si için çalınabilir stream URL'lerini çözer.
 * Önce tüm Piped instance'larını, sonra Invidious instance'larını dener.
 * Hiçbiri başarılı olmazsa null döner (çağıran taraf YouTube watch URL'sine düşer).
 */
export async function resolveYoutubeStream(videoId: string): Promise<StreamResult | null> {
  for (const instance of PIPED_INSTANCES) {
    const r = await resolveFromPiped(videoId, instance)
    if (r && (r.audioUrl || r.videoUrl)) return r
  }
  for (const instance of INVIDIOUS_INSTANCES) {
    const r = await resolveFromInvidious(videoId, instance)
    if (r && (r.audioUrl || r.videoUrl)) return r
  }
  console.warn(`[yt-resolver] TÜM instance'lar başarısız — videoId=${videoId}, YouTube watch URL'sine düşülüyor`)
  return null
}
