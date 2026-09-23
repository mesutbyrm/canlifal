import { NextResponse } from 'next/server'
import { getCachedCreditPackages } from '@/lib/cache'

export async function GET() {
  try {
    const packages = await getCachedCreditPackages()
    return NextResponse.json(packages, {
      headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' },
    })
  } catch (error) {
    console.error('Error fetching credit packages:', error)
    return NextResponse.json([], { status: 500 })
  }
}
