export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

/**
 * GET /api/me
 * Returns authenticated user's full profile.
 * Supports both NextAuth session (web) and Bearer token (mobile).
 * 
 * Mobile calls this on app startup to verify token and get latest user data.
 * The returned `id` is the same string used as OneSignal external_id.
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        phone: true,
        image: true,
        role: true,
        credits: true,
        jetonBalance: true,
        cfcBalance: true,
        membership: true,
        membershipExpiresAt: true,
        preferredLanguage: true,
        bio: true,
        birthDate: true,
        birthTime: true,
        zodiacSign: true,
        risingSign: true,
        favoriteTeam: true,
        level: true,
        xp: true,
        loginStreak: true,
        referralCode: true,
        referralCreditsEarned: true,
        totalTimeSpentMinutes: true,
        createdAt: true,
        specialBadges: true,
        profileEffect: true,
        withdrawalLimit: true,
        // Followers / following counts
        followers: { select: { id: true } },
        following: { select: { id: true } },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      phone: user.phone,
      image: user.image,
      role: user.role,
      credits: user.credits,
      jetonBalance: user.jetonBalance,
      cfcBalance: user.cfcBalance ?? 0,
      membership: user.membership,
      membershipExpiresAt: user.membershipExpiresAt?.toISOString() ?? null,
      preferredLanguage: user.preferredLanguage,
      bio: user.bio,
      birthDate: user.birthDate?.toISOString() ?? null,
      birthTime: user.birthTime,
      zodiacSign: user.zodiacSign,
      risingSign: user.risingSign,
      favoriteTeam: user.favoriteTeam,
      level: user.level,
      xp: user.xp,
      loginStreak: user.loginStreak,
      referralCode: user.referralCode,
      referralCreditsEarned: user.referralCreditsEarned,
      totalTimeSpentMinutes: user.totalTimeSpentMinutes,
      createdAt: user.createdAt.toISOString(),
      specialBadges: user.specialBadges,
      profileEffect: user.profileEffect,
      withdrawalLimit: user.withdrawalLimit,
      followersCount: user.followers.length,
      followingCount: user.following.length,
    })
  } catch (error: any) {
    console.error('/api/me error:', error)
    return NextResponse.json({ error: 'Profil alınamadı' }, { status: 500 })
  }
}

/**
 * PATCH /api/me
 * Update current user's profile fields.
 * Supports both web session and Bearer token.
 */
export async function PATCH(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const body = await req.json()
    const allowedFields = [
      'name', 'username', 'phone', 'bio', 'birthDate', 'birthTime',
      'zodiacSign', 'favoriteTeam', 'preferredLanguage', 'image',
    ]

    const updateData: Record<string, any> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'birthDate' && body[field]) {
          updateData[field] = new Date(body[field])
        } else {
          updateData[field] = body[field]
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Güncellenecek alan belirtilmedi' }, { status: 400 })
    }

    // Username uniqueness check
    if (updateData.username) {
      const normalized = updateData.username.toLowerCase().trim()
      const existing = await prisma.user.findFirst({
        where: { username: normalized, NOT: { id: authUser.id } },
      })
      if (existing) {
        return NextResponse.json({ error: 'Bu kullanıcı adı zaten alınmış' }, { status: 400 })
      }
      updateData.username = normalized
    }

    const updated = await prisma.user.update({
      where: { id: authUser.id },
      data: updateData,
      select: {
        id: true, email: true, name: true, username: true, phone: true,
        image: true, bio: true, birthDate: true, birthTime: true,
        zodiacSign: true, favoriteTeam: true, preferredLanguage: true,
      },
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('/api/me PATCH error:', error)
    return NextResponse.json({ error: 'Profil güncellenemedi' }, { status: 500 })
  }
}
