import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// PATCH /api/agency — ajans profilini güncelle (yalnızca onaylı ajansın sahibi).
// Mobil istemci name, description, contactEmail, contactPhone gönderir; boş olmayan alanlar yazılır.
export async function PATCH(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { name, description, contactEmail, contactPhone } = body || {}

    const agency = await prisma.agency.findFirst({
      where: { ownerId: authUser.id, status: 'approved' },
    })
    if (!agency) {
      return NextResponse.json({ error: 'Ajans bulunamadı veya yetkiniz yok' }, { status: 403 })
    }

    const updateData: Record<string, string | null> = {}

    if (name !== undefined && name !== null) {
      const trimmed = String(name).trim()
      if (trimmed.length < 2) {
        return NextResponse.json({ error: 'Ajans adı en az 2 karakter olmalı' }, { status: 400 })
      }
      if (trimmed !== agency.name) {
        const taken = await prisma.agency.findFirst({
          where: { name: trimmed, id: { not: agency.id } },
        })
        if (taken) {
          return NextResponse.json({ error: 'Bu ajans ismi zaten kullanımda' }, { status: 409 })
        }
      }
      updateData.name = trimmed
    }

    if (description !== undefined) {
      updateData.description = description === null ? null : String(description).trim() || null
    }

    if (contactEmail !== undefined) {
      const email = contactEmail === null ? '' : String(contactEmail).trim()
      if (email && !EMAIL_RE.test(email)) {
        return NextResponse.json({ error: 'Geçersiz e-posta adresi' }, { status: 400 })
      }
      updateData.contactEmail = email || null
    }

    if (contactPhone !== undefined) {
      updateData.contactPhone = contactPhone === null ? null : String(contactPhone).trim() || null
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Değiştirilecek bir bilgi belirtilmedi' }, { status: 400 })
    }

    const updated = await prisma.agency.update({
      where: { id: agency.id },
      data: updateData,
    })

    return NextResponse.json({ success: true, agency: updated })
  } catch (error: any) {
    console.error('[Agency PATCH] Error:', error)
    return NextResponse.json({ error: 'Güncelleme sırasında hata oluştu' }, { status: 500 })
  }
}
