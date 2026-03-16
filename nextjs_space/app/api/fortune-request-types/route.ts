import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET - List active fortune request types (public)
export async function GET() {
  try {
    const types = await prisma.fortuneRequestType.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    })
    
    return NextResponse.json(types)
  } catch (error) {
    console.error('Error fetching fortune request types:', error)
    return NextResponse.json({ error: 'Failed to fetch types' }, { status: 500 })
  }
}
