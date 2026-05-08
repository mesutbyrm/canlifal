'use client'

/**
 * TRTC (Tencent Real-Time Communication) client helper.
 * Replaces Agora SDK for live streaming and voice chat.
 * 
 * Usage mirrors the old agora-client.ts API for easy migration:
 *   import { createTRTCInstance, fetchTRTCCredentials, ... } from '@/lib/trtc-client'
 */

import type TRTC from 'trtc-sdk-v5'

export type TRTCRole = 'host' | 'audience'

export interface TRTCCredentials {
  sdkAppId: number
  userId: string
  userSig: string
}

// Lazy load TRTC SDK (browser only)
let _TRTC: typeof import('trtc-sdk-v5').default | null = null

async function getTRTC() {
  if (_TRTC) return _TRTC
  const mod = await import('trtc-sdk-v5')
  _TRTC = mod.default
  return _TRTC
}

/**
 * Fetch TRTC credentials (UserSig) from our server API
 */
export async function fetchTRTCCredentials(
  userId: string,
  roomId: string
): Promise<TRTCCredentials> {
  const res = await fetch('/api/trtc/usersig', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, roomId }),
  })
  if (!res.ok) throw new Error('Failed to fetch TRTC credentials')
  return res.json()
}

/**
 * Create a TRTC instance
 */
export async function createTRTCInstance(): Promise<TRTC> {
  const TRTCModule = await getTRTC()
  return TRTCModule.create()
}

/**
 * Enter a TRTC room as host (broadcaster) or audience (viewer)
 */
export async function enterRoom(
  trtc: TRTC,
  credentials: TRTCCredentials,
  roomId: string,
  role: TRTCRole = 'host',
  scene: 'live' | 'rtc' = 'live'
): Promise<void> {
  await trtc.enterRoom({
    sdkAppId: credentials.sdkAppId,
    userId: credentials.userId,
    userSig: credentials.userSig,
    strRoomId: roomId,
    scene: scene as any,
    role: (role === 'host' ? 'anchor' : 'audience') as any,
    // For audience: pre-receive video for faster playback & enable autoplay dialog
    autoReceiveVideo: role === 'audience',
    autoReceiveAudio: true,
    enableAutoPlayDialog: true,
  } as any)
}

/**
 * Start publishing local video
 */
export async function startLocalVideo(
  trtc: TRTC,
  viewElement: HTMLElement | string,
  useFrontCamera: boolean = true
): Promise<void> {
  await trtc.startLocalVideo({
    view: viewElement,
    option: {
      profile: '1080p',
      useFrontCamera,
    },
  })
}

/**
 * Start publishing local audio
 */
export async function startLocalAudio(trtc: TRTC): Promise<void> {
  await trtc.startLocalAudio({
    option: { profile: 'high' },
  })
}

/**
 * Stop local video
 */
export async function stopLocalVideo(trtc: TRTC): Promise<void> {
  await trtc.stopLocalVideo()
}

/**
 * Stop local audio
 */
export async function stopLocalAudio(trtc: TRTC): Promise<void> {
  await trtc.stopLocalAudio()
}

/**
 * Start playing remote user's video
 */
export async function startRemoteVideo(
  trtc: TRTC,
  userId: string,
  viewElement: HTMLElement | string,
  streamType: 'main' | 'sub' = 'main'
): Promise<void> {
  await trtc.startRemoteVideo({
    userId,
    view: viewElement,
    streamType: streamType === 'main'
      ? (await getTRTC()).TYPE.STREAM_TYPE_MAIN
      : (await getTRTC()).TYPE.STREAM_TYPE_SUB,
  })
}

/**
 * Stop playing remote user's video
 */
export async function stopRemoteVideo(
  trtc: TRTC,
  userId: string,
  streamType: 'main' | 'sub' = 'main'
): Promise<void> {
  await trtc.stopRemoteVideo({
    userId,
    streamType: streamType === 'main'
      ? (await getTRTC()).TYPE.STREAM_TYPE_MAIN
      : (await getTRTC()).TYPE.STREAM_TYPE_SUB,
  })
}

/**
 * Mute/unmute remote audio
 */
export async function muteRemoteAudio(
  trtc: TRTC,
  userId: string,
  mute: boolean
): Promise<void> {
  await trtc.muteRemoteAudio(userId, mute)
}

/**
 * Update local video (e.g., switch camera)
 */
export async function updateLocalVideo(
  trtc: TRTC,
  option: { useFrontCamera?: boolean; cameraId?: string }
): Promise<void> {
  await trtc.updateLocalVideo({ option })
}

/**
 * Switch role (host <-> audience) for live streaming
 */
export async function switchRole(
  trtc: TRTC,
  role: TRTCRole
): Promise<void> {
  await trtc.switchRole((role === 'host' ? 'anchor' : 'audience') as any)
}

/**
 * Exit room and cleanup
 */
export async function exitRoom(trtc: TRTC): Promise<void> {
  await trtc.exitRoom()
}

/**
 * Destroy TRTC instance
 */
export async function destroyTRTC(trtc: TRTC): Promise<void> {
  trtc.destroy()
}

/**
 * Get available cameras list
 */
export async function getCameraList() {
  const TRTCModule = await getTRTC()
  return TRTCModule.getCameraList()
}

/**
 * Get available microphones list
 */
export async function getMicrophoneList() {
  const TRTCModule = await getTRTC()
  return TRTCModule.getMicrophoneList()
}

/**
 * Check if TRTC is supported in this browser
 */
export async function isSupported(): Promise<boolean> {
  const TRTCModule = await getTRTC()
  return TRTCModule.isSupported()
}

/**
 * Enable audio volume evaluation (for speaking indicators)
 * @param interval - evaluation interval in ms (default 1000)
 */
export function enableAudioVolumeEvaluation(trtc: TRTC, interval = 1000): void {
  trtc.enableAudioVolumeEvaluation(interval)
}

/**
 * Mute/unmute local audio (keeps connection alive, just stops publishing audio)
 */
export async function muteLocalAudio(trtc: TRTC, mute: boolean): Promise<void> {
  if (mute) {
    await trtc.updateLocalAudio({ mute: true })
  } else {
    await trtc.updateLocalAudio({ mute: false })
  }
}

/**
 * Get TRTC EVENT constants for event listening
 */
export async function getTRTCEvent() {
  const TRTCModule = await getTRTC()
  return TRTCModule.EVENT
}

// Re-export TRTC type for consumers
export type { TRTC }
