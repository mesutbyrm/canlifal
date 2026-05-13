import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const IMAGE_MAP: Record<string, string> = {
  'kemal-sunal': '/celebrities/kemal_sunal.jpg',
  'tarkan': '/celebrities/tarkan.jpg',
  'hande-ercel': '/celebrities/hande_ercel.jpg',
  'arda-guler': '/celebrities/arda_guler.jpg',
  'enes-batur': '/celebrities/enes_batur.jpg',
  'danla-bilic': '/celebrities/danla_bilic.jpg',
  'nuri-bilge-ceylan': '/celebrities/nuri_bilge_ceylan.jpg',
  'burak-ozcivit': '/celebrities/burak_ozcivit.jpg',
  'ebru-gundes': '/celebrities/ebru_gundes.jpg',
  'cagatay-ulusoy': '/celebrities/cagatay_ulusoy.jpg',
}

async function main() {
  for (const [slug, profileImage] of Object.entries(IMAGE_MAP)) {
    const result = await prisma.celebrity.updateMany({
      where: { slug },
      data: { profileImage },
    })
    console.log(`Updated ${slug}: ${result.count} row(s)`)
  }
  console.log('All celebrity images updated!')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
