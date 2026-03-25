import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'
dotenv.config()

const prisma = new PrismaClient()

async function main() {
  console.log('⚠️ Finans verilerini ve jeton bakiyelerini sıfırlama başlıyor...')
  
  // 1. Tüm kullanıcıların jeton bakiyelerini sıfırla
  const userUpdate = await prisma.user.updateMany({
    data: { jetonBalance: 0 }
  })
  console.log(`✅ ${userUpdate.count} kullanıcının jeton bakiyesi sıfırlandı`)
  
  // 2. Tüm jeton transaction kayıtlarını sil
  const jtDel = await prisma.jetonTransaction.deleteMany({})
  console.log(`✅ ${jtDel.count} jeton işlem kaydı silindi`)
  
  // 3. StreamGift kayıtlarını sil
  const sgDel = await prisma.streamGift.deleteMany({})
  console.log(`✅ ${sgDel.count} yayın hediye kaydı silindi`)
  
  // 4. ChatRoomGift kayıtlarını sil
  const cgDel = await prisma.chatRoomGift.deleteMany({})
  console.log(`✅ ${cgDel.count} sohbet hediye kaydı silindi`)
  
  // 5. TellerGift kayıtlarını sil
  const tgDel = await prisma.tellerGift.deleteMany({})
  console.log(`✅ ${tgDel.count} falcı hediye kaydı silindi`)
  
  // 6. BanaOzelHistory kayıtlarını sil
  const boDel = await prisma.banaOzelHistory.deleteMany({})
  console.log(`✅ ${boDel.count} Bana Özel kaydı silindi`)
  
  // 7. MembershipPurchase kayıtlarını sil
  try {
    const mpDel = await prisma.membershipPurchase.deleteMany({})
    console.log(`✅ ${mpDel.count} üyelik satın alma kaydı silindi`)
  } catch (e) {
    console.log('ℹ️ MembershipPurchase tablosu bulunamadı veya boş')
  }
  
  // 8. LiveSession charge bilgilerini sıfırla
  const lsDel = await prisma.liveSession.updateMany({
    data: { creditsCharged: 0 }
  })
  console.log(`✅ ${lsDel.count} canlı seans charge değeri sıfırlandı`)
  
  // 9. Falcı kazançlarını sıfırla
  const ftDel = await prisma.liveFortuneTeller.updateMany({
    data: { totalEarnings: 0 }
  })
  console.log(`✅ ${ftDel.count} falcının kazancı sıfırlandı`)
  
  // 10. Payment kayıtlarını sıfırla
  const payDel = await prisma.payment.deleteMany({})
  console.log(`✅ ${payDel.count} ödeme kaydı silindi`)
  
  // 11. Manuel profit adjustment'ı sıfırla
  try {
    await prisma.platformSettings.upsert({
      where: { key: 'manual_profit_adjustment' },
      update: { value: '0' },
      create: { key: 'manual_profit_adjustment', value: '0' }
    })
    console.log('✅ Manuel kâr/zarar düzenlemesi sıfırlandı')
  } catch (e) {
    console.log('ℹ️ manual_profit_adjustment ayarlanamadı')
  }
  
  console.log('\n🎉 Tüm finans verileri başarıyla sıfırlandı!')
}

main()
  .catch(e => { console.error('Hata:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
