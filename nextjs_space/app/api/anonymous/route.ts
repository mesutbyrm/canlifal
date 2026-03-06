import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// Create or get anonymous user
export async function POST(request: NextRequest) {
  try {
    const { username, deviceId } = await request.json()

    if (!username || !deviceId) {
      return NextResponse.json({ error: 'Username and deviceId are required' }, { status: 400 })
    }

    // Check if username is taken
    const existingUsername = await prisma.anonymousUser.findUnique({
      where: { username }
    })

    if (existingUsername && existingUsername.deviceId !== deviceId) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
    }

    // Check if device already has an anonymous user
    let anonymousUser = await prisma.anonymousUser.findUnique({
      where: { deviceId }
    })

    if (anonymousUser) {
      // Update username if different
      if (anonymousUser.username !== username) {
        anonymousUser = await prisma.anonymousUser.update({
          where: { id: anonymousUser.id },
          data: { username }
        })
      }
    } else {
      // Create new anonymous user with 1 free fortune
      anonymousUser = await prisma.anonymousUser.create({
        data: {
          username,
          deviceId,
          credits: 1, // 1 free fortune
          fortunesUsed: 0
        }
      })
    }

    return NextResponse.json(anonymousUser)
  } catch (error) {
    console.error('Anonymous user error:', error)
    return NextResponse.json({ error: 'Failed to create anonymous user' }, { status: 500 })
  }
}

// Get anonymous user by deviceId
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get('deviceId')

    if (!deviceId) {
      return NextResponse.json({ error: 'deviceId is required' }, { status: 400 })
    }

    const anonymousUser = await prisma.anonymousUser.findUnique({
      where: { deviceId }
    })

    if (!anonymousUser) {
      return NextResponse.json({ exists: false })
    }

    return NextResponse.json({ exists: true, user: anonymousUser })
  } catch (error) {
    console.error('Anonymous user fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch anonymous user' }, { status: 500 })
  }
}
