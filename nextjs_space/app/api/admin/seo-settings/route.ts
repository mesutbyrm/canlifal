import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

async function isAdmin() {
  const session = await getServerSession(authOptions)
  return session?.user && ((session.user as any).role || '').toLowerCase() === 'admin'
}

const SEO_KEYS = ['site_name', 'site_description', 'site_keywords', 'site_logo', 'site_favicon', 'site_og_image'] as const

export async function GET() {
  try {
    if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const settings = await prisma.siteSetting.findMany({
      where: { key: { in: [...SEO_KEYS] } },
    })
    const result: Record<string, string> = {}
    settings.forEach((s: any) => { result[s.key] = s.value })
    return NextResponse.json(result)
  } catch (error) {
    console.error('SEO settings fetch error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    const updates: Promise<any>[] = []
    for (const key of SEO_KEYS) {
      if (body[key] !== undefined) {
        updates.push(
          prisma.siteSetting.upsert({
            where: { key },
            create: { key, value: body[key] },
            update: { value: body[key] },
          })
        )
      }
    }
    await Promise.all(updates)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('SEO settings update error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
