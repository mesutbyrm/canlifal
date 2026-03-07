import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

// Get available gift types
export async function GET() {
  try {
    // First ensure gift types exist
    const existingCount = await prisma.giftType.count()
    
    if (existingCount === 0) {
      // Seed default gift types
      const defaultGifts = [
        { id: 'gul', name: 'Gül', nameEn: 'Rose', icon: '🌹', animation: 'float', price: 5, sortOrder: 1 },
        { id: 'kalp', name: 'Kalp', nameEn: 'Heart', icon: '❤️', animation: 'pulse', price: 10, sortOrder: 2 },
        { id: 'yildiz', name: 'Yıldız', nameEn: 'Star', icon: '⭐', animation: 'sparkle', price: 20, sortOrder: 3 },
        { id: 'tac', name: 'Taç', nameEn: 'Crown', icon: '👑', animation: 'shine', price: 50, sortOrder: 4 },
        { id: 'elmas', name: 'Elmas', nameEn: 'Diamond', icon: '💎', animation: 'glow', price: 100, sortOrder: 5 },
        { id: 'roket', name: 'Roket', nameEn: 'Rocket', icon: '🚀', animation: 'fly', price: 200, sortOrder: 6 },
        { id: 'galaksi', name: 'Galaksi', nameEn: 'Galaxy', icon: '🌌', animation: 'cosmic', price: 500, sortOrder: 7 },
        { id: 'aslan', name: 'Aslan', nameEn: 'Lion', icon: '🦁', animation: 'roar', price: 1000, sortOrder: 8 },
      ]

      for (const gift of defaultGifts) {
        await prisma.giftType.upsert({
          where: { id: gift.id },
          create: gift,
          update: gift
        })
      }
    }

    const giftTypes = await prisma.giftType.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    })

    return NextResponse.json(giftTypes)
  } catch (error) {
    console.error('Error fetching gift types:', error)
    return NextResponse.json([], { status: 500 })
  }
}
