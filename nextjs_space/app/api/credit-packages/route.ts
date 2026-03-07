import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET() {
  try {
    const packages = await prisma.creditPackage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    })

    return NextResponse.json(packages)
  } catch (error) {
    console.error('Error fetching credit packages:', error)
    return NextResponse.json([], { status: 500 })
  }
}
