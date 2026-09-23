import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const settings = await prisma.siteSetting.findMany({
      where: { key: { in: ['site_name', 'site_description', 'site_keywords', 'site_logo', 'site_favicon', 'site_og_image'] } },
    })
    const result: Record<string, string> = {}
    settings.forEach((s: any) => { result[s.key] = s.value })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Public SEO settings error:', error)
    return NextResponse.json({})
  }
}
