import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

/**
 * Serve FLUTTER_CURSOR_PROMPT content as raw markdown.
 * Accessed via /api/flutter-prompt or rewritten from /FLUTTER_CURSOR_PROMPT.md via middleware.
 */
export async function GET() {
  try {
    const txtPath = path.join(process.cwd(), 'public', 'FLUTTER_CURSOR_PROMPT.txt')
    const mdPath = path.join(process.cwd(), 'public', 'FLUTTER_CURSOR_PROMPT.md')
    
    let content = ''
    if (fs.existsSync(txtPath)) {
      content = fs.readFileSync(txtPath, 'utf-8')
    } else if (fs.existsSync(mdPath)) {
      content = fs.readFileSync(mdPath, 'utf-8')
    } else {
      return new NextResponse('File not found', { status: 404 })
    }

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      }
    })
  } catch (error) {
    console.error('Flutter prompt serve error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
