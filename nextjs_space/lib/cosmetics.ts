import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { getStaffSession } from '@/lib/admin-auth'

const ADMIN_ROLES = ['admin', 'yonetici', 'moderator', 'finans']

function db(): any {
  return prisma as any
}

async function isAdmin() {
  // Çift kimlik: web çerezi VEYA mobil Bearer JWT
  const session = await getStaffSession()
  const role = (session?.user as any)?.role
  return !!session?.user && ADMIN_ROLES.includes(role)
}

export interface CosmeticAdminConfig {
  model: string // prisma delegate name, e.g. 'nameEffect'
  fields: string[] // writable fields
  required: string[] // required on create
  userNullFields?: string[] // User columns to null out on delete (single-select id refs)
}

// ---------- ADMIN CRUD FACTORY ----------
export function createCosmeticAdminHandlers(cfg: CosmeticAdminConfig) {
  const GET = async () => {
    try {
      if (!(await isAdmin())) return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 401 })
      const items = await db()[cfg.model].findMany({ orderBy: { sortOrder: 'asc' } })
      return NextResponse.json(items)
    } catch (e) {
      console.error(`[cosmetic admin GET ${cfg.model}]`, e)
      return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
    }
  }

  const POST = async (request: NextRequest) => {
    try {
      if (!(await isAdmin())) return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 401 })
      const body = await request.json()
      for (const r of cfg.required) {
        if (body[r] === undefined || body[r] === null || body[r] === '') {
          return NextResponse.json({ error: `Alan gerekli: ${r}` }, { status: 400 })
        }
      }
      const data: Record<string, any> = {}
      for (const f of cfg.fields) {
        if (body[f] !== undefined) data[f] = body[f]
      }
      let item
      if (body.id) {
        item = await db()[cfg.model].update({ where: { id: body.id }, data })
      } else {
        item = await db()[cfg.model].create({ data })
      }
      return NextResponse.json(item)
    } catch (e) {
      console.error(`[cosmetic admin POST ${cfg.model}]`, e)
      return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
    }
  }

  const DELETE = async (request: NextRequest) => {
    try {
      if (!(await isAdmin())) return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 401 })
      const { searchParams } = new URL(request.url)
      const id = searchParams.get('id')
      if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
      for (const uf of cfg.userNullFields || []) {
        await prisma.user.updateMany({ where: { [uf]: id } as any, data: { [uf]: null } as any })
      }
      await db()[cfg.model].delete({ where: { id } })
      return NextResponse.json({ success: true })
    } catch (e) {
      console.error(`[cosmetic admin DELETE ${cfg.model}]`, e)
      return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
    }
  }

  return { GET, POST, DELETE }
}

// ---------- PUBLIC LIST + USER SELECTION FACTORY ----------
export interface CosmeticPublicConfig {
  model: string
  // User column that stores the selection. Omit for list-only catalogs (EmojiPack, RoomTheme).
  userField?: string
  // Which field of the record to store into userField: 'id' or 'key'. Default 'id'.
  selectValueField?: 'id' | 'key'
  // If true, userField holds a JSON array of ids (multi-select toggle).
  multi?: boolean
  // Filter by seasonal window (activeFrom/activeTo) when true.
  seasonal?: boolean
}

function accessibleTiers(membership?: string | null): string[] {
  const tiers = ['free']
  if (membership === 'gold' || membership === 'premium' || membership === 'diamond') tiers.push('gold')
  return tiers
}

export function createCosmeticPublicHandlers(cfg: CosmeticPublicConfig) {
  const selField = cfg.selectValueField || 'id'

  const GET = async (request: NextRequest) => {
    try {
      const authUser = await authenticateRequest(request)
      let membership: string | null = null
      let selected: any = null
      if (authUser) {
        const sel: any = { membership: true }
        if (cfg.userField) sel[cfg.userField] = true
        const user: any = await prisma.user.findUnique({ where: { id: authUser.id }, select: sel })
        membership = user?.membership ?? null
        if (cfg.userField) selected = (user as any)?.[cfg.userField] ?? null
      }

      const where: any = { isActive: true, tier: { in: accessibleTiers(membership) } }
      if (cfg.seasonal) {
        const now = new Date()
        where.AND = [
          { OR: [{ activeFrom: null }, { activeFrom: { lte: now } }] },
          { OR: [{ activeTo: null }, { activeTo: { gte: now } }] },
        ]
      }
      const items = await db()[cfg.model].findMany({ where, orderBy: { sortOrder: 'asc' } })

      let selectedParsed = selected
      if (cfg.multi && typeof selected === 'string') {
        try { selectedParsed = JSON.parse(selected) } catch { selectedParsed = [] }
      }
      return NextResponse.json({ success: true, data: { items, selected: selectedParsed, membership } })
    } catch (e) {
      console.error(`[cosmetic public GET ${cfg.model}]`, e)
      return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
    }
  }

  // POST only defined when userField present
  const POST = async (request: NextRequest) => {
    try {
      if (!cfg.userField) return NextResponse.json({ error: 'Bu katalog seçilebilir değil' }, { status: 400 })
      const authUser = await authenticateRequest(request)
      if (!authUser) return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
      const body = await request.json()
      const value = body.id ?? body.key ?? body.value ?? null

      const user: any = await prisma.user.findUnique({ where: { id: authUser.id }, select: { membership: true, [cfg.userField]: true } as any })
      if (!user) return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })

      // Clearing selection
      if (!value) {
        await prisma.user.update({ where: { id: authUser.id }, data: { [cfg.userField]: null } as any })
        return NextResponse.json({ success: true })
      }

      // Verify item exists and tier access
      const whereItem = selField === 'key' ? { key: value } : { id: value }
      const item = await db()[cfg.model].findUnique({ where: whereItem })
      if (!item || !item.isActive) return NextResponse.json({ error: 'Öğe bulunamadı' }, { status: 404 })
      if (item.tier === 'admin_only') return NextResponse.json({ error: 'Bu öğe yalnızca admin tarafından atanabilir' }, { status: 403 })
      if (item.tier === 'gold' && !['gold', 'premium', 'diamond'].includes(user.membership || 'basic')) {
        return NextResponse.json({ error: 'Bu öğe Gold üyelik gerektirir' }, { status: 403 })
      }

      const storeVal = selField === 'key' ? item.key : item.id

      if (cfg.multi) {
        let arr: string[] = []
        const cur = (user as any)[cfg.userField]
        if (typeof cur === 'string') { try { arr = JSON.parse(cur) } catch { arr = [] } }
        const toggle = body.toggle !== false // default toggle behaviour
        if (arr.includes(storeVal)) {
          if (toggle) arr = arr.filter(x => x !== storeVal)
        } else {
          arr.push(storeVal)
        }
        await prisma.user.update({ where: { id: authUser.id }, data: { [cfg.userField]: JSON.stringify(arr) } as any })
        return NextResponse.json({ success: true, data: { selected: arr } })
      }

      await prisma.user.update({ where: { id: authUser.id }, data: { [cfg.userField]: storeVal } as any })
      return NextResponse.json({ success: true })
    } catch (e) {
      console.error(`[cosmetic public POST ${cfg.model}]`, e)
      return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
    }
  }

  return { GET, POST }
}
