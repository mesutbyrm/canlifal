'use client'

import type {
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  IAgoraRTCRemoteUser,
  UID,
} from 'agora-rtc-sdk-ng'

export type AgoraRole = 'host' | 'audience'

export interface AgoraConfig {
  appId: string
  channelName: string
  token: string
  uid: UID
  role: AgoraRole
}

// Lazy load Agora SDK (browser only)
let _AgoraRTC: typeof import('agora-rtc-sdk-ng').default | null = null

async function getAgoraRTC() {
  if (_AgoraRTC) return _AgoraRTC
  const mod = await import('agora-rtc-sdk-ng')
  _AgoraRTC = mod.default
  _AgoraRTC.setLogLevel(3) // WARNING level
  return _AgoraRTC
}

// Fetch token from our API
export async function fetchAgoraToken(
  channelName: string,
  role: AgoraRole,
  uid?: number
): Promise<{ token: string; uid: number; appId: string }> {
  const res = await fetch('/api/agora/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channelName, role, uid }),
  })
  if (!res.ok) throw new Error('Failed to fetch Agora token')
  return res.json()
}

// Create Agora RTC client
export async function createAgoraClient(role: AgoraRole): Promise<IAgoraRTCClient> {
  const AgoraRTC = await getAgoraRTC()
  return AgoraRTC.createClient({
    mode: 'live',
    codec: 'vp8',
    role: role === 'host' ? 'host' : 'audience',
  })
}

// Create local tracks (camera + mic)
export async function createLocalTracks(
  facingMode: 'user' | 'environment' = 'user'
): Promise<[IMicrophoneAudioTrack, ICameraVideoTrack]> {
  const AgoraRTC = await getAgoraRTC()
  try {
    const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
      { encoderConfig: 'high_quality' },
      {
        encoderConfig: {
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          frameRate: { min: 15, ideal: 24, max: 30 },
          bitrateMin: 400,
          bitrateMax: 1500,
        },
        facingMode,
      }
    )
    return [audioTrack, videoTrack]
  } catch (err) {
    console.warn('High quality failed, trying lower quality:', err)
    const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
      {},
      {
        encoderConfig: '480p_1',
        facingMode,
      }
    )
    return [audioTrack, videoTrack]
  }
}

// Get available cameras
export async function getCameras() {
  const AgoraRTC = await getAgoraRTC()
  return AgoraRTC.getCameras()
}

// Leave channel and cleanup
export async function leaveChannel(
  client: IAgoraRTCClient,
  localAudioTrack?: IMicrophoneAudioTrack | null,
  localVideoTrack?: ICameraVideoTrack | null
): Promise<void> {
  localAudioTrack?.close()
  localVideoTrack?.close()
  await client.leave()
}

export type { IAgoraRTCClient, ICameraVideoTrack, IMicrophoneAudioTrack, IAgoraRTCRemoteUser, UID }
