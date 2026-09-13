import { NextRequest } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { getUserPermissions } from '@/lib/chat-permissions'

export const MAX_BANNED_WORDS = 200

export function parseBannedWords(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.map((w) => String(w)).filter((w) => w.trim().length > 0)
    }
  } catch {}
  return []
}

export async function resolveChatActor(request: NextRequest): Promise<string | null> {
  const mobileUser = await authenticateRequest(request)
  const session = !mobileUser ? await getServerSession(authOptions) : null
  return mobileUser?.id || session?.user?.id || null
}

export async function canManageRoomWords(roomId: string, userId: string): Promise<boolean> {
  const permissions = await getUserPermissions(roomId, userId)
  return (
    permissions.isRoomOwner ||
    permissions.isGlobalAdmin ||
    ['superadmin', 'founder', 'sop', 'admin'].includes(permissions.role || '')
  )
}
