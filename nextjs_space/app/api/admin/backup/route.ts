export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { staffCan } from '@/lib/permissions'
import { getHybridSession } from '@/lib/hybrid-session'

const ADMIN_ROLES = ['admin', 'yonetici']

// GET /api/admin/backup?type=sql|settings|users|tables
export async function GET(req: NextRequest) {
  try {
    const session = await getHybridSession(req)
    if (!session?.user || !(await staffCan((session?.user as any)?.role, (session?.user as any)?.id, 'system.config.manage', ADMIN_ROLES))) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'tables'

    // Just list available tables
    if (type === 'tables') {
      const tables: { tablename: string }[] = await prisma.$queryRaw`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
      `
      const tableCounts: { table: string; count: number }[] = []
      for (const t of tables) {
        try {
          const result: { count: bigint }[] = await prisma.$queryRawUnsafe(
            `SELECT COUNT(*) as count FROM "${t.tablename}"`
          )
          tableCounts.push({ table: t.tablename, count: Number(result[0]?.count || 0) })
        } catch {
          tableCounts.push({ table: t.tablename, count: -1 })
        }
      }
      return NextResponse.json({ tables: tableCounts })
    }

    // Export platform settings
    if (type === 'settings') {
      const platformSettings = await prisma.platformSettings.findMany()
      const siteSettings = await prisma.siteSetting.findMany()
      const data = {
        exportedAt: new Date().toISOString(),
        exportedBy: (session.user as any).email || session.user.name,
        platformSettings,
        siteSettings,
      }
      return new NextResponse(JSON.stringify(data, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="canlifal_settings_${new Date().toISOString().slice(0,10)}.json"`,
        },
      })
    }

    // Export users (raw query to avoid schema mismatch)
    if (type === 'users') {
      const users: any[] = await prisma.$queryRaw`
        SELECT id, name, email, username, role, membership, "jetonBalance", credits,
               phone, "birthDate", "createdAt", "isOnline", level, "referralCode"
        FROM users ORDER BY "createdAt" DESC
      `
      const data = {
        exportedAt: new Date().toISOString(),
        exportedBy: (session.user as any).email || session.user.name,
        totalUsers: users.length,
        users,
      }
      return new NextResponse(JSON.stringify(data, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="canlifal_users_${new Date().toISOString().slice(0,10)}.json"`,
        },
      })
    }

    // Export specific table as SQL-compatible JSON
    if (type === 'sql') {
      const tableName = searchParams.get('table')
      if (!tableName) {
        return NextResponse.json({ error: 'Tablo adı gerekli' }, { status: 400 })
      }

      // Validate table exists
      const tableExists: { tablename: string }[] = await prisma.$queryRaw`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = ${tableName}
      `
      if (tableExists.length === 0) {
        return NextResponse.json({ error: 'Tablo bulunamadı' }, { status: 404 })
      }

      // Get column info
      const columns: { column_name: string; data_type: string }[] = await prisma.$queryRaw`
        SELECT column_name, data_type FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = ${tableName}
        ORDER BY ordinal_position
      `

      // Get row count first
      const countResult: { count: bigint }[] = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*) as count FROM "${tableName}"`
      )
      const totalRows = Number(countResult[0]?.count || 0)

      // Limit to 50k rows for safety
      const limit = Math.min(totalRows, 50000)
      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM "${tableName}" ORDER BY 1 LIMIT ${limit}`
      )

      // Generate SQL INSERT statements
      let sql = `-- CanlıFal Yedekleme\n-- Tablo: ${tableName}\n-- Tarih: ${new Date().toISOString()}\n-- Toplam Kayıt: ${totalRows}${totalRows > limit ? ` (ilk ${limit} gösteriliyor)` : ''}\n\n`

      // CREATE TABLE hint (columns)
      sql += `-- Sütunlar: ${columns.map(c => `${c.column_name} (${c.data_type})`).join(', ')}\n\n`

      if (rows.length > 0) {
        const colNames = columns.map(c => `"${c.column_name}"`).join(', ')
        for (const row of rows) {
          const values = columns.map(c => {
            const val = row[c.column_name]
            if (val === null || val === undefined) return 'NULL'
            if (typeof val === 'number' || typeof val === 'bigint') return String(val)
            if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'
            if (val instanceof Date) return `'${val.toISOString()}'`
            if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`
            return `'${String(val).replace(/'/g, "''")}'`
          })
          sql += `INSERT INTO "${tableName}" (${colNames}) VALUES (${values.join(', ')});\n`
        }
      }

      return new NextResponse(sql, {
        headers: {
          'Content-Type': 'application/sql',
          'Content-Disposition': `attachment; filename="${tableName}_${new Date().toISOString().slice(0,10)}.sql"`,
        },
      })
    }

    // Full database export (all tables as JSON)
    if (type === 'full') {
      const tables: { tablename: string }[] = await prisma.$queryRaw`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
      `

      const fullBackup: Record<string, any> = {
        exportedAt: new Date().toISOString(),
        exportedBy: (session.user as any).email || session.user.name,
        tables: {},
      }

      for (const t of tables) {
        try {
          const rows: any[] = await prisma.$queryRawUnsafe(
            `SELECT * FROM "${t.tablename}" ORDER BY 1 LIMIT 10000`
          )
          fullBackup.tables[t.tablename] = {
            rowCount: rows.length,
            data: rows,
          }
        } catch (err) {
          fullBackup.tables[t.tablename] = {
            rowCount: 0,
            error: 'Veri alınamadı',
          }
        }
      }

      return new NextResponse(JSON.stringify(fullBackup, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="canlifal_full_backup_${new Date().toISOString().slice(0,10)}.json"`,
        },
      })
    }

    return NextResponse.json({ error: 'Geçersiz yedekleme tipi' }, { status: 400 })
  } catch (error: any) {
    console.error('Backup error:', error)
    return NextResponse.json({ error: 'Yedekleme hatası: ' + (error?.message || 'Bilinmeyen hata') }, { status: 500 })
  }
}
