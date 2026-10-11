import prisma from '@/lib/db'

export const DEFAULT_MUSIC_SETTINGS = {
  musicEnabled: true,
  musicRequestCost: 10,
  videoRequestCost: 20,
  maxMusicQueue: 30,
}

export interface RoomMusicSettingsRow {
  musicEnabled: boolean | null
  musicRequestCost: number | null
  videoRequestCost: number | null
  maxMusicQueue: number | null
}

export function serializeMusicSettings(row: RoomMusicSettingsRow) {
  return {
    musicEnabled: row.musicEnabled ?? DEFAULT_MUSIC_SETTINGS.musicEnabled,
    musicRequestCost: row.musicRequestCost ?? DEFAULT_MUSIC_SETTINGS.musicRequestCost,
    videoRequestCost: row.videoRequestCost ?? DEFAULT_MUSIC_SETTINGS.videoRequestCost,
    maxMusicQueue: row.maxMusicQueue ?? DEFAULT_MUSIC_SETTINGS.maxMusicQueue,
  }
}

export async function getRoomMusicSettings(roomId: string) {
  const row = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    select: {
      musicEnabled: true,
      musicRequestCost: true,
      videoRequestCost: true,
      maxMusicQueue: true,
    },
  })
  if (!row) return { ...DEFAULT_MUSIC_SETTINGS }
  return serializeMusicSettings(row)
}
