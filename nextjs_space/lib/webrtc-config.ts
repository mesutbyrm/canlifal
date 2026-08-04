/**
 * Centralized WebRTC Configuration & Optimization
 * 
 * Bu modül tüm video/ses bağlantıları için merkezi yapılandırma sağlar.
 * - ICE sunucuları (STUN + TURN)
 * - getUserMedia kısıtlamaları (mobil optimize)
 * - Bitrate yönetimi
 * - Codec tercihleri
 * - Simulcast yapılandırması
 * 
 * Mimari Notu:
 * Mevcut uygulama P2P (peer-to-peer) mimarisindedir.
 * 1:1 falcı görüşmeleri için P2P idealdir.
 * Çok izleyicili yayınlar için Tencent TRTC kullanılmaktadır.
 */

// ============================================================
// ICE Server Configuration
// ============================================================

export interface TurnServerConfig {
  urls: string;
  username: string;
  credential: string;
}

/**
 * STUN sunucuları - NAT arkasındaki public IP'yi keşfetmek için.
 * Birden fazla sağlayıcı kullanarak güvenilirliği artırıyoruz.
 */
const STUN_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
];

/**
 * Ücretsiz TURN sunucuları - Simetrik NAT'ların arkasındaki kullanıcılar için.
 * Bu sunucular relay görevi görerek doğrudan P2P bağlantının mümkün olmadığı
 * durumlarda video/ses trafiğini iletir.
 * 
 * Önemli: Ücretsiz TURN sunucuları sınırlı bant genişliği ve güvenilirlik sunar.
 * Üretim ortamı için Twilio, Metered.ca veya Xirsys gibi ücretli TURN hizmeti önerilir.
 */
const FREE_TURN_SERVERS: RTCIceServer[] = [
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
];

/**
 * Tam ICE sunucu listesi - STUN + TURN
 */
export const ICE_SERVERS: RTCIceServer[] = [
  ...STUN_SERVERS,
  ...FREE_TURN_SERVERS,
];

/**
 * RTCPeerConnection yapılandırması
 */
export function getRTCConfiguration(options?: {
  forceRelay?: boolean; // Sadece TURN relay kullan (debugging için)
}): RTCConfiguration {
  return {
    iceServers: ICE_SERVERS,
    iceCandidatePoolSize: 10,
    iceTransportPolicy: options?.forceRelay ? 'relay' : 'all',
    bundlePolicy: 'max-bundle', // Tek bir bağlantı üzerinden audio+video
    rtcpMuxPolicy: 'require', // RTCP multiplexing zorunlu - port tasarrufu
  };
}

// ============================================================
// Media Constraints - getUserMedia
// ============================================================

export type VideoQuality = 'low' | 'medium' | 'high' | 'hd';

interface VideoConstraintPreset {
  width: { ideal: number; max: number; min?: number };
  height: { ideal: number; max: number; min?: number };
  frameRate: { ideal: number; max: number };
  aspectRatio: { ideal: number };
}

/**
 * Video kalite presetleri - Portrait (9:16) modu
 * Fortune telling uygulaması mobil-öncelikli, dikey video kullanıyor.
 */
const VIDEO_QUALITY_PRESETS: Record<VideoQuality, VideoConstraintPreset> = {
  low: {
    width: { ideal: 360, max: 480 },
    height: { ideal: 640, max: 854 },
    frameRate: { ideal: 15, max: 24 },
    aspectRatio: { ideal: 9 / 16 },
  },
  medium: {
    width: { ideal: 540, max: 720 },
    height: { ideal: 960, max: 1280 },
    frameRate: { ideal: 24, max: 30 },
    aspectRatio: { ideal: 9 / 16 },
  },
  high: {
    width: { ideal: 720, max: 1080 },
    height: { ideal: 1280, max: 1920 },
    frameRate: { ideal: 30, max: 30 },
    aspectRatio: { ideal: 9 / 16 },
  },
  hd: {
    width: { ideal: 1080, max: 1920 },
    height: { ideal: 1920, max: 2560 },
    frameRate: { ideal: 30, max: 30 },
    aspectRatio: { ideal: 9 / 16 },
  },
};

/**
 * Optimize edilmiş audio kısıtlamaları
 */
const OPTIMIZED_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  // Mono yeterli - bant genişliği tasarrufu
  channelCount: { ideal: 1 },
  sampleRate: { ideal: 48000 },
};

/**
 * Mobil cihaz tespiti
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * getUserMedia için optimize edilmiş kısıtlamalar oluşturur.
 * 
 * @param quality - Video kalite seviyesi
 * @param facingMode - Kamera yönü ('user' = ön, 'environment' = arka)
 * @param audioOnly - Sadece ses mi?
 * 
 * Mobil Optimizasyonlar:
 * - Ön kamera için facingMode: 'user' kullanılır (ultra-wide lens'ten kaçınır)
 * - Arka kamera için facingMode: { exact: 'environment' } kullanılır
 * - Mobilde frameRate daha düşük tutulur (pil tasarrufu)
 * - resizeMode: 'none' ile gereksiz zoom-in önlenir
 */
export function getMediaConstraints(
  quality: VideoQuality = 'high',
  facingMode: 'user' | 'environment' = 'user',
  audioOnly = false
): MediaStreamConstraints {
  if (audioOnly) {
    return {
      video: false,
      audio: OPTIMIZED_AUDIO_CONSTRAINTS,
    };
  }

  const preset = VIDEO_QUALITY_PRESETS[quality];
  const mobile = isMobileDevice();

  // Mobilde frame rate'i düşür (pil ömrü ve ısınma)
  const frameRate = mobile
    ? { ideal: Math.min(preset.frameRate.ideal, 24), max: 30 }
    : preset.frameRate;

  const videoConstraints: MediaTrackConstraints = {
    ...preset,
    frameRate,
    facingMode: facingMode === 'environment' 
      ? { exact: 'environment' } 
      : 'user',
    // resizeMode: 'none' - kamera çıktısını olduğu gibi kullan, kırpma yapma
    // crop-and-scale bazı cihazlarda aşırı zoom-in'e sebep olur
    ...(mobile ? { resizeMode: { ideal: 'none' } } : {}),
  };

  return {
    video: videoConstraints,
    audio: OPTIMIZED_AUDIO_CONSTRAINTS,
  };
}

// ============================================================
// Bitrate Configuration
// ============================================================

export interface BitrateConfig {
  video: {
    min: number;  // bps
    max: number;  // bps
    start: number; // bps - başlangıç bitrate
  };
  audio: {
    max: number;  // bps
  };
}

/**
 * Bitrate presetleri - kalite seviyesine göre
 */
export const BITRATE_PRESETS: Record<VideoQuality, BitrateConfig> = {
  low: {
    video: { min: 100_000, max: 500_000, start: 250_000 },
    audio: { max: 32_000 },
  },
  medium: {
    video: { min: 250_000, max: 1_200_000, start: 600_000 },
    audio: { max: 48_000 },
  },
  high: {
    video: { min: 500_000, max: 2_500_000, start: 1_200_000 },
    audio: { max: 64_000 },
  },
  hd: {
    video: { min: 1_000_000, max: 4_000_000, start: 2_000_000 },
    audio: { max: 96_000 },
  },
};

// ============================================================
// Simulcast Configuration
// ============================================================

/**
 * Simulcast encoding katmanları - Canlı yayınlar için
 * 
 * Simulcast, aynı anda birden fazla kalite seviyesinde video gönderir.
 * İzleyiciler ağ durumuna göre en uygun katmanı seçer.
 * 
 * Not: Simulcast yalnızca gönderici tarafında yapılandırılır.
 * P2P'de alıcı otomatik olarak uygun katmanı alır.
 * SFU'da ise sunucu katman seçimi yapar.
 */
export const SIMULCAST_ENCODINGS: RTCRtpEncodingParameters[] = [
  {
    rid: 'low',
    maxBitrate: 200_000,
    scaleResolutionDownBy: 4, // 1/4 çözünürlük
    maxFramerate: 15,
  },
  {
    rid: 'medium',
    maxBitrate: 700_000,
    scaleResolutionDownBy: 2, // 1/2 çözünürlük
    maxFramerate: 24,
  },
  {
    rid: 'high',
    maxBitrate: 2_500_000,
    scaleResolutionDownBy: 1, // Tam çözünürlük
    maxFramerate: 30,
  },
];

// ============================================================
// Codec Preferences
// ============================================================

/**
 * Tercih edilen codec sıralaması (en çok tercih edilen önce):
 * 1. H264 - Donanım hızlandırma desteği en yaygın, mobilde en verimli
 * 2. VP9 - Daha iyi sıkıştırma, orta donanım desteği
 * 3. VP8 - Geniş uyumluluk, temel kalite
 * 4. AV1 - En iyi sıkıştırma, sınırlı donanım desteği (yeni cihazlar)
 */
export function setPreferredCodec(
  pc: RTCPeerConnection,
  preferredCodecMimeType = 'video/H264'
): void {
  try {
    const transceivers = pc.getTransceivers();
    for (const transceiver of transceivers) {
      if (transceiver.receiver?.track?.kind === 'video' || 
          transceiver.sender?.track?.kind === 'video') {
        const codecs = RTCRtpReceiver.getCapabilities?.('video')?.codecs;
        if (!codecs) continue;

        // Tercih edilen codec'i öne al
        const preferred = codecs.filter(c => 
          c.mimeType.toLowerCase() === preferredCodecMimeType.toLowerCase()
        );
        const others = codecs.filter(c => 
          c.mimeType.toLowerCase() !== preferredCodecMimeType.toLowerCase()
        );

        if (preferred.length > 0 && transceiver.setCodecPreferences) {
          transceiver.setCodecPreferences([...preferred, ...others]);
        }
      }
    }
  } catch (e) {
    // setCodecPreferences tüm tarayıcılarda desteklenmiyor
    console.warn('Codec preference ayarlanamadı:', e);
  }
}

// ============================================================
// Bitrate Control via RTCRtpSender.setParameters()
// ============================================================

/**
 * Video sender için bitrate ayarla.
 * RTCRtpSender.setParameters() ile adaptif bitrate kontrolü sağlar.
 * 
 * @param pc - PeerConnection
 * @param maxBitrate - Maksimum video bitrate (bps)
 */
export async function setVideoBitrate(
  pc: RTCPeerConnection,
  maxBitrate: number
): Promise<void> {
  const senders = pc.getSenders();
  const videoSender = senders.find(s => s.track?.kind === 'video');
  if (!videoSender) return;

  try {
    const params = videoSender.getParameters();
    if (!params.encodings || params.encodings.length === 0) {
      params.encodings = [{}];
    }
    
    for (const encoding of params.encodings) {
      encoding.maxBitrate = maxBitrate;
    }

    await videoSender.setParameters(params);
  } catch (e) {
    console.warn('Bitrate ayarlanamadı:', e);
  }
}

/**
 * Audio sender için bitrate ayarla.
 */
export async function setAudioBitrate(
  pc: RTCPeerConnection,
  maxBitrate: number
): Promise<void> {
  const senders = pc.getSenders();
  const audioSender = senders.find(s => s.track?.kind === 'audio');
  if (!audioSender) return;

  try {
    const params = audioSender.getParameters();
    if (!params.encodings || params.encodings.length === 0) {
      params.encodings = [{}];
    }
    params.encodings[0].maxBitrate = maxBitrate;
    await audioSender.setParameters(params);
  } catch (e) {
    console.warn('Audio bitrate ayarlanamadı:', e);
  }
}

// ============================================================
// Network Quality Monitoring
// ============================================================

export interface NetworkStats {
  roundTripTime: number | null;      // ms
  packetsLost: number;                // toplam kayıp paket
  packetsReceived: number;            // toplam alınan paket
  bytesReceived: number;              // toplam alınan byte
  bytesSent: number;                  // toplam gönderilen byte
  currentBitrate: number;             // bps
  availableOutgoingBitrate: number;   // bps - tahmini çıkış bant genişliği
  frameRate: number;                  // fps
  frameWidth: number;                 // px
  frameHeight: number;                // px
  qualityLevel: VideoQuality;         // hesaplanan kalite seviyesi
}

/**
 * PeerConnection istatistiklerini okur ve ağ kalitesini değerlendirir.
 */
export async function getNetworkStats(
  pc: RTCPeerConnection
): Promise<NetworkStats | null> {
  try {
    const stats = await pc.getStats();
    let rtt: number | null = null;
    let packetsLost = 0;
    let packetsReceived = 0;
    let bytesReceived = 0;
    let bytesSent = 0;
    let availableOutgoingBitrate = 0;
    let frameRate = 0;
    let frameWidth = 0;
    let frameHeight = 0;

    stats.forEach((report) => {
      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        rtt = report.currentRoundTripTime ? report.currentRoundTripTime * 1000 : null;
        availableOutgoingBitrate = report.availableOutgoingBitrate || 0;
      }
      if (report.type === 'inbound-rtp' && report.kind === 'video') {
        packetsLost = report.packetsLost || 0;
        packetsReceived = report.packetsReceived || 0;
        bytesReceived = report.bytesReceived || 0;
        frameRate = report.framesPerSecond || 0;
        frameWidth = report.frameWidth || 0;
        frameHeight = report.frameHeight || 0;
      }
      if (report.type === 'outbound-rtp' && report.kind === 'video') {
        bytesSent = report.bytesSent || 0;
        if (!frameRate) frameRate = report.framesPerSecond || 0;
        if (!frameWidth) frameWidth = report.frameWidth || 0;
        if (!frameHeight) frameHeight = report.frameHeight || 0;
      }
    });

    // Kalite seviyesini hesapla
    let qualityLevel: VideoQuality = 'high';
    const lossRate = packetsReceived > 0 ? packetsLost / (packetsLost + packetsReceived) : 0;
    
    if (rtt !== null && rtt > 300 || lossRate > 0.1) {
      qualityLevel = 'low';
    } else if (rtt !== null && rtt > 150 || lossRate > 0.05) {
      qualityLevel = 'medium';
    } else if (availableOutgoingBitrate > 2_000_000) {
      qualityLevel = 'hd';
    }

    return {
      roundTripTime: rtt,
      packetsLost,
      packetsReceived,
      bytesReceived,
      bytesSent,
      currentBitrate: availableOutgoingBitrate,
      availableOutgoingBitrate,
      frameRate,
      frameWidth,
      frameHeight,
      qualityLevel,
    };
  } catch {
    return null;
  }
}

// ============================================================
// Adaptive Bitrate Manager
// ============================================================

/**
 * Adaptif bitrate yöneticisi.
 * Ağ durumunu izler ve bitrate'i otomatik ayarlar.
 * 
 * Kullanım:
 *   const abm = new AdaptiveBitrateManager(pc);
 *   abm.start();
 *   // ... bağlantı kapatılınca:
 *   abm.stop();
 */
export class AdaptiveBitrateManager {
  private pc: RTCPeerConnection;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private currentQuality: VideoQuality = 'high';
  private onQualityChange?: (quality: VideoQuality) => void;
  private consecutivePoorCount = 0;
  private consecutiveGoodCount = 0;

  constructor(
    pc: RTCPeerConnection,
    onQualityChange?: (quality: VideoQuality) => void
  ) {
    this.pc = pc;
    this.onQualityChange = onQualityChange;
  }

  start(intervalMs = 3000): void {
    this.stop();
    this.intervalId = setInterval(() => this.checkAndAdapt(), intervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  getCurrentQuality(): VideoQuality {
    return this.currentQuality;
  }

  private async checkAndAdapt(): Promise<void> {
    const stats = await getNetworkStats(this.pc);
    if (!stats) return;

    const targetQuality = stats.qualityLevel;

    // Kalite düşürme daha hızlı olmalı (2 ardışık kötü ölçüm)
    // Kalite artırma daha yavaş olmalı (4 ardışık iyi ölçüm)
    const qualityOrder: VideoQuality[] = ['low', 'medium', 'high', 'hd'];
    const currentIdx = qualityOrder.indexOf(this.currentQuality);
    const targetIdx = qualityOrder.indexOf(targetQuality);

    if (targetIdx < currentIdx) {
      this.consecutivePoorCount++;
      this.consecutiveGoodCount = 0;
      if (this.consecutivePoorCount >= 2) {
        this.applyQuality(targetQuality);
        this.consecutivePoorCount = 0;
      }
    } else if (targetIdx > currentIdx) {
      this.consecutiveGoodCount++;
      this.consecutivePoorCount = 0;
      if (this.consecutiveGoodCount >= 4) {
        // Bir kademe artır (hızlı atlama değil)
        const newIdx = Math.min(currentIdx + 1, qualityOrder.length - 1);
        this.applyQuality(qualityOrder[newIdx]);
        this.consecutiveGoodCount = 0;
      }
    } else {
      this.consecutivePoorCount = 0;
      this.consecutiveGoodCount = 0;
    }
  }

  private async applyQuality(quality: VideoQuality): Promise<void> {
    if (quality === this.currentQuality) return;

    const preset = BITRATE_PRESETS[quality];
    await setVideoBitrate(this.pc, preset.video.max);
    await setAudioBitrate(this.pc, preset.audio.max);

    this.currentQuality = quality;
    this.onQualityChange?.(quality);
    console.log(`📊 Adaptif bitrate: ${quality} (max: ${preset.video.max / 1000}kbps)`);
  }
}

// ============================================================
// Simulcast Helper
// ============================================================

/**
 * addTrack yerine addTransceiver kullanarak simulcast encoding ekler.
 * Sadece yayıncı (broadcaster) tarafında kullanılır.
 * 
 * Önemli: Simulcast, SDP offer oluşturulmadan ÖNCE ayarlanmalıdır.
 */
export function addTrackWithSimulcast(
  pc: RTCPeerConnection,
  track: MediaStreamTrack,
  stream: MediaStream,
  enableSimulcast = false
): RTCRtpTransceiver | null {
  if (!enableSimulcast || track.kind !== 'video') {
    pc.addTrack(track, stream);
    return null;
  }

  try {
    const transceiver = pc.addTransceiver(track, {
      direction: 'sendonly',
      streams: [stream],
      sendEncodings: SIMULCAST_ENCODINGS,
    });
    return transceiver;
  } catch (e) {
    // Simulcast desteklenmiyorsa normal addTrack kullan
    console.warn('Simulcast eklenemedi, normal track ekleniyor:', e);
    pc.addTrack(track, stream);
    return null;
  }
}

// ============================================================
// Connection Recovery
// ============================================================

/**
 * ICE bağlantı koptuğunda yeniden bağlanma denemesi yapar.
 * ICE restart, mevcut peer connection'ı koruyarak yeni ICE adayları toplar.
 */
export function setupConnectionRecovery(
  pc: RTCPeerConnection,
  onReconnecting?: () => void,
  onReconnected?: () => void,
  onFailed?: () => void,
  maxAttempts = 3
): () => void {
  let attempts = 0;
  let recoveryTimeout: ReturnType<typeof setTimeout> | null = null;

  const handleStateChange = () => {
    const state = pc.iceConnectionState;

    if (state === 'disconnected') {
      onReconnecting?.();
      // Kısa süre bekle, otomatik düzelebilir
      recoveryTimeout = setTimeout(() => {
        if (pc.iceConnectionState === 'disconnected' && attempts < maxAttempts) {
          attempts++;
          console.log(`🔄 ICE restart deneniyor (${attempts}/${maxAttempts})`);
          try {
            pc.restartIce();
          } catch (e) {
            console.warn('ICE restart başarısız:', e);
          }
        }
      }, 2000);
    } else if (state === 'failed') {
      if (attempts < maxAttempts) {
        attempts++;
        console.log(`🔄 ICE restart (failed) deneniyor (${attempts}/${maxAttempts})`);
        try {
          pc.restartIce();
        } catch (e) {
          console.warn('ICE restart başarısız:', e);
          onFailed?.();
        }
      } else {
        onFailed?.();
      }
    } else if (state === 'connected' || state === 'completed') {
      attempts = 0;
      if (recoveryTimeout) clearTimeout(recoveryTimeout);
      onReconnected?.();
    }
  };

  pc.addEventListener('iceconnectionstatechange', handleStateChange);

  // Cleanup function
  return () => {
    if (recoveryTimeout) clearTimeout(recoveryTimeout);
    pc.removeEventListener('iceconnectionstatechange', handleStateChange);
  };
}

// ============================================================
// Initial Bitrate Setup
// ============================================================

/**
 * Yeni bağlantı sonrası başlangıç bitrate'ini ayarlar.
 * "connected" durumuna geçince çağrılmalıdır.
 */
export async function applyInitialBitrate(
  pc: RTCPeerConnection,
  quality: VideoQuality = 'high'
): Promise<void> {
  const preset = BITRATE_PRESETS[quality];
  await setVideoBitrate(pc, preset.video.start);
  await setAudioBitrate(pc, preset.audio.max);
}

// ============================================================
// Reconnection Constants
// ============================================================

export const RECONNECT_DELAY = 2000;
export const MAX_RECONNECT_ATTEMPTS = 5;
