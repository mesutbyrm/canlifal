# CanlıFal — Faz 20 Raporu
## Transaction Safety + Race Condition Düzeltmeleri (§77-78)

**Tarih:** 2026-08-27  
**Checkpoint:** `Phase 20: transaction safety race conditions`  
**Doğrulama:** tsc ✅ · build ✅ · dev sunucu ✅ · kimlikli canlı uç testi ✅ · deploy ❌ (yapılmadı)

---

## 1. Amaç

§77 (Database Transaction Safety) ve §78 (Concurrency / Race Conditions) bölümlerinde listelenen kritik işlem yollarını denetleyip, atomik olmayan yazımları interactive transaction'a sarmak ve TOCTOU yarış koşullarını kapatmak.

---

## 2. Denetim sonucu

Mevcut kodda toplam **47 `$transaction`** çağrısı bulundu. §77'de listelenen 8 kritik alan tarandı:

| Alan | Önceki durum | Faz 20 eylemi |
|------|-------------|---------------|
| **Seat assignment** | findFirst → upsert (TOCTOU) | ✅ Interactive tx ile sarıldı |
| **Gift (sohbet odası)** | Zaten interactive tx | — değişiklik yok |
| **Gift (canlı yayın)** | Zaten batch tx | — değişiklik yok |
| **Wallet / jeton düşümü** | Zaten batch tx | — değişiklik yok |
| **Withdrawal** | Zaten batch tx | — değişiklik yok |
| **Reward / günlük görev** | Kontrol tx dışında (çift talep riski) | ✅ Interactive tx ile sarıldı |
| **Günlük giriş bonusu** | Kontrol tx dışında (çift talep riski) | ✅ Interactive tx ile sarıldı |
| **Agency commission** | 3 ayrı yazım, tx YOK | ✅ Interactive tx ile sarıldı |
| **Membership / üyelik** | Mevcut işlem yolu yok (harici ödeme) | — kapsam dışı |
| **Leaderboard reward** | Mevcut ödül dağıtım ucu yok | — kapsam dışı |

---

## 3. Yapılan düzeltmeler

### 3.1 Ajans komisyonu — `lib/agency-commission.ts`

**Sorun:** `agencyEarning.create` + `agency.update` + `agencyUser.update` üç ayrı sorguydu. Herhangi biri başarısız olursa toplamlar tutarsız kalırdı.

**Düzeltme:** Üç yazım tek bir `prisma.$transaction(async (tx) => { ... })` içine alındı. Hata durumunda tümü geri alınır.

### 3.2 Koltuk ataması — `app/api/chat/rooms/[roomId]/presence/route.ts`

**Sorun:** `findFirst` ile koltuk boş mu kontrolü yapılıyor, sonra ayrı bir `upsert` ile koltuk atanyor. İki eş zamanlı istek aynı koltuğu alabiliyordu (TOCTOU).

**Düzeltme:** Kontrol + upsert tek bir interactive transaction (`ReadCommitted` izolasyon) içinde. Çakışma tespit edilirse kullanıcı dinleyici olarak kalır (`seatIndex = -1`), hata dönmez (istemci presence yanıtından durumu okur). P2002 geri dönüş davranışı korundu.

### 3.3 Günlük görev talebi — `app/api/daily-missions/route.ts`

**Sorun:** `findUnique` ile "zaten tamamlandı mı" kontrolu yapılıyor, ardından ayrı bir batch `$transaction` ile kredi artırılıp `dailyTask` oluşturuluyor. İki eş zamanlı istek arasından sızıp çift ödül alabilirdi (unique constraint `P2002` ikincisini engellerdi ama kredi artışı zaten yapılmış olurdu).

**Düzeltme:** Hem `all_complete_bonus` hem normal görev yolu interactive `$transaction` içine alındı. Kontrol, kredi artışı ve `dailyTask.create` atomik. `P2002` catch bloğu da eklendi (ekstra güvenlik ağı).

### 3.4 Günlük giriş bonusu — `app/api/jeton/route.ts`

**Sorun:** Aynı desen: kontrol tx dışında, kredi artışı tx içinde.

**Düzeltme:** Aynı çözüm uygulandı. `currentCredits` ve `newCreditsBalance` dış kapsama taşındı (ledger kaydı için).

---

## 4. Zaten güvenli bulunan yollar

| Dosya | Desen |
|-------|-------|
| `chat/rooms/[roomId]/gifts/route.ts` | Interactive `$transaction(async (tx) => { ... })` — gönderici/alıcı/oda sahibi bakiye hareketleri atomik |
| `video-streams/[streamId]/gifts/route.ts` | Batch `$transaction([...])` — gönderici/alıcı + hediye kaydı atomik |
| `admin/withdrawals/route.ts` | Batch `$transaction` |
| `gifts/missions/[missionId]/claim/route.ts` | Interactive `$transaction` + `upsert` + P2002 guard |
| `gifts/battles/route.ts` | Interactive `$transaction` + idempotency (mevcut aktif savaş kontrolü) |
| `room/[sessionId]/tip/route.ts` | Batch `$transaction` |
| `room/[sessionId]/route.ts` (süre uzatma) | Batch `$transaction` |
| `fortune-tellers/session/route.ts` | Batch `$transaction` |
| `bana-ozel/open/route.ts` | Batch `$transaction` (LLM çağrısından sonra; bakiye kontrolü TOCTOU riski düşük — kısa zaman penceresi) |

---

## 5. Canlı doğrulama

| Kontrol | Sonuç |
|---------|-------|
| Tip kontrolu + derleme | ✅ |
| Geliştirme sunucusu + `/api/health` | ✅ 200 |
| Günlük görev: ilk talep `login` | ✅ `{success, creditsEarned: 5}` |
| Günlük görev: tekrar `login` | ✅ `{error, alreadyClaimed: true}` (400) |
| Jeton günlük giriş: (zaten alınmış) | ✅ `{error, alreadyClaimed: true}` (400) |

---

## 6. Değişen dosyalar

| Dosya | Değişiklik |
|-------|------------|
| `lib/agency-commission.ts` | 3 yazım → interactive tx |
| `app/api/chat/rooms/[roomId]/presence/route.ts` | Koltuk kontrol+upsert → interactive tx (ReadCommitted) |
| `app/api/daily-missions/route.ts` | Bonus + regular claim → interactive tx + P2002 guard |
| `app/api/jeton/route.ts` | daily_login → interactive tx + P2002 guard |

---

## 7. Envanter (değişmedi)

780 handler · 502 path · 172 kategori · 215 model. $transaction kullanımı: 47 → **51** (4 interactive tx eklendi/değiştirildi).

---

## 8. Durum

- Checkpoint kaydedildi ✅
- Üretime alınmadı ❌
