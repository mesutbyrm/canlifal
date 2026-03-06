import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const translations = [
    // Share translations
    { languageCode: 'en', translationKey: 'share.title', translationValue: 'Share your reading' },
    { languageCode: 'tr', translationKey: 'share.title', translationValue: 'Falını paylaş' },
    
    // Missing fortune types
    { languageCode: 'en', translationKey: 'fortune.katina.name', translationValue: 'Katina Fortune' },
    { languageCode: 'tr', translationKey: 'fortune.katina.name', translationValue: 'Katina Falı' },
    { languageCode: 'en', translationKey: 'fortune.kursundokme.name', translationValue: 'Lead Pouring' },
    { languageCode: 'tr', translationKey: 'fortune.kursundokme.name', translationValue: 'Kurşun Dökme' },
    { languageCode: 'en', translationKey: 'fortune.horoscope.name', translationValue: 'Horoscope' },
    { languageCode: 'tr', translationKey: 'fortune.horoscope.name', translationValue: 'Burç Yorumu' },
    { languageCode: 'en', translationKey: 'fortune.palm.name', translationValue: 'Palm Reading' },
    { languageCode: 'tr', translationKey: 'fortune.palm.name', translationValue: 'El Falı' },
    { languageCode: 'en', translationKey: 'fortune.numerology.name', translationValue: 'Numerology' },
    { languageCode: 'tr', translationKey: 'fortune.numerology.name', translationValue: 'Numeroloji' },
    { languageCode: 'en', translationKey: 'fortune.angel.name', translationValue: 'Angel Cards' },
    { languageCode: 'tr', translationKey: 'fortune.angel.name', translationValue: 'Melek Kartları' },
    { languageCode: 'en', translationKey: 'fortune.aura.name', translationValue: 'Aura Reading' },
    { languageCode: 'tr', translationKey: 'fortune.aura.name', translationValue: 'Aura Analizi' },
    { languageCode: 'en', translationKey: 'fortune.birthchart.name', translationValue: 'Birth Chart' },
    { languageCode: 'tr', translationKey: 'fortune.birthchart.name', translationValue: 'Doğum Haritası' },
    { languageCode: 'en', translationKey: 'fortune.istikhara.name', translationValue: 'Istikhara' },
    { languageCode: 'tr', translationKey: 'fortune.istikhara.name', translationValue: 'İstihare' },
    { languageCode: 'en', translationKey: 'fortune.love.name', translationValue: 'Love Fortune' },
    { languageCode: 'tr', translationKey: 'fortune.love.name', translationValue: 'Aşk Falı' },
    { languageCode: 'en', translationKey: 'fortune.yesno.name', translationValue: 'Yes/No Fortune' },
    { languageCode: 'tr', translationKey: 'fortune.yesno.name', translationValue: 'Evet/Hayır Falı' },
  ]

  for (const t of translations) {
    await prisma.translation.upsert({
      where: {
        languageCode_translationKey: {
          languageCode: t.languageCode,
          translationKey: t.translationKey
        }
      },
      update: { translationValue: t.translationValue },
      create: t
    })
    console.log(`Added: ${t.translationKey} (${t.languageCode})`)
  }
  
  console.log('Done!')
}

main().catch(console.error).finally(() => prisma.$disconnect())
