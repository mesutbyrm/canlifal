/**
 * Seed RBAC roles + permissions (Phase 6). Idempotent — uses upsert only.
 * Run:  npx tsx scripts/seed-rbac.ts
 */
import { PrismaClient } from '@prisma/client'
import { PERMISSIONS, SYSTEM_ROLES } from '../lib/permissions'

const prisma = new PrismaClient()

async function main() {
  // 1) permissions
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: { name: p.name, group: p.group },
      create: { key: p.key, name: p.name, group: p.group },
    })
  }
  console.log(`✅ ${PERMISSIONS.length} permission upserted`)

  // 2) roles + their permission grants
  for (const r of SYSTEM_ROLES) {
    const role = await prisma.role.upsert({
      where: { key: r.key },
      update: { name: r.name, description: r.description, level: r.level, isSystem: true },
      create: { key: r.key, name: r.name, description: r.description, level: r.level, isSystem: true },
    })

    const keys = r.permissions === '*' ? PERMISSIONS.map((p) => p.key) : r.permissions
    const perms = await prisma.permission.findMany({ where: { key: { in: keys } } })
    for (const p of perms) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: p.id } },
        update: {},
        create: { roleId: role.id, permissionId: p.id },
      })
    }
    console.log(`✅ role ${r.key}: ${perms.length} permission`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
