/**
 * WebRTC React Hooks
 * 
 * Mevcut sayfalara entegre edilecek yardımcı hook'lar.
 * Tam yeniden yazma yerine, mevcut koda ekleme yapılarak
 * optimizasyonlar sağlanır.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import {
  getRTCConfiguration,
  getMediaConstraints,
  setPreferredCodec,
  applyInitialBitrate,
  AdaptiveBitrateManager,
  setupConnectionRecovery,
  setVideoBitrate,
  BITRATE_PRESETS,
  isMobileDevice,
  type VideoQuality,
  type NetworkStats,
  getNetworkStats,
} from './webrtc-config';

/**
 * Adaptif bitrate yönetimi hook'u.
 * PeerConnection bağlandığında otomatik olarak başlar.
 */
export function useAdaptiveBitrate(
  pc: RTCPeerConnection | null,
  enabled = true
) {
  const managerRef = useRef<AdaptiveBitrateManager | null>(null);
  const [currentQuality, setCurrentQuality] = useState<VideoQuality>('high');

  useEffect(() => {
    if (!pc || !enabled) return;

    const manager = new AdaptiveBitrateManager(pc, (quality) => {
      setCurrentQuality(quality);
    });

    // Bağlantı kurulduğunda başlat
    const handleConnection = () => {
      if (pc.connectionState === 'connected') {
        applyInitialBitrate(pc, 'high');
        manager.start(3000);
      }
    };

    // Zaten bağlıysa hemen başlat
    if (pc.connectionState === 'connected') {
      applyInitialBitrate(pc, 'high');
      manager.start(3000);
    }

    pc.addEventListener('connectionstatechange', handleConnection);
    managerRef.current = manager;

    return () => {
      manager.stop();
      pc.removeEventListener('connectionstatechange', handleConnection);
      managerRef.current = null;
    };
  }, [pc, enabled]);

  return { currentQuality };
}

/**
 * Bağlantı kurtarma hook'u.
 * ICE bağlantısı koptuğunda otomatik yeniden bağlanma dener.
 */
export function useConnectionRecovery(
  pc: RTCPeerConnection | null,
  options?: {
    onReconnecting?: () => void;
    onReconnected?: () => void;
    onFailed?: () => void;
    maxAttempts?: number;
  }
) {
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    if (!pc) return;

    const cleanup = setupConnectionRecovery(
      pc,
      () => {
        setIsReconnecting(true);
        options?.onReconnecting?.();
      },
      () => {
        setIsReconnecting(false);
        options?.onReconnected?.();
      },
      () => {
        setIsReconnecting(false);
        options?.onFailed?.();
      },
      options?.maxAttempts ?? 3
    );

    return cleanup;
  }, [pc]); // eslint-disable-line react-hooks/exhaustive-deps

  return { isReconnecting };
}

/**
 * Ağ istatistikleri izleme hook'u.
 */
export function useNetworkStats(
  pc: RTCPeerConnection | null,
  intervalMs = 5000
) {
  const [stats, setStats] = useState<NetworkStats | null>(null);

  useEffect(() => {
    if (!pc) return;

    const interval = setInterval(async () => {
      if (pc.connectionState === 'connected') {
        const networkStats = await getNetworkStats(pc);
        setStats(networkStats);
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [pc, intervalMs]);

  return stats;
}

/**
 * Optimize edilmiş getUserMedia wrapper.
 * Mobil cihazlarda uygun kısıtlamalar uygular.
 */
export function useOptimizedMedia() {
  const getStream = useCallback(async (
    quality: VideoQuality = 'high',
    facingMode: 'user' | 'environment' = 'user'
  ): Promise<MediaStream> => {
    const constraints = getMediaConstraints(quality, facingMode);
    
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      // İlk deneme başarısız olursa daha düşük kaliteyle dene
      console.warn('İlk getUserMedia başarısız, düşük kaliteyle deneniyor:', err);
      const fallbackConstraints = getMediaConstraints('medium', facingMode);
      try {
        return await navigator.mediaDevices.getUserMedia(fallbackConstraints);
      } catch (err2) {
        // Son çare: minimum kısıtlamalar
        console.warn('Medium kalite de başarısız, minimum deneniyor:', err2);
        return await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: true,
        });
      }
    }
  }, []);

  return { getStream, isMobile: isMobileDevice() };
}
