# CanlıFal — Faz 17 Raporu
## Performans Denetimi: Veritabanı İndeks Optimizasyonu (§66)

**Tarih:** 2026-08-27  
**Checkpoint:** `Phase 17: database index optimization`  
**Doğrulama:** tsc ✅ / build ✅ / db push ✅ (veri kaybı yok) / deploy ❌

---

## 1. Amaç

§66 (Performance) kapsamında veritabanı sorgu performansını iyileştirmek.
780 işleyicinin sorgu kalıpları otomatik olarak analiz edildi ve indekssiz
yüksek trafikli sorgular tespit edildi.

**Kısıt:** Tamamen eklemeli. Schema'ya yalnızca yeni `@@index` satırları
eklendi. Hiçbir alan, model veya mevcut indeks değiştirilmedi.

---

## 2. Analiz yöntemi

1. 780 API route dosyasındaki tüm `prisma.<model>.(findMany|findFirst|count|aggregate)` çağrıları tarandı
2. `WHERE` ve `ORDER BY` alanları çıkarıldı
3. En sık kullanılan sorgu kalıpları sayıldı (198 farklı kalıp)
4. Her kalıp için mevcut `@@index` / `@@unique` kapsamı kontrol edildi
5. 21 kritik sorgu kalıbı değerlendirildi: 12'si zaten kapsanmıştı, 8'i eksikti

---

## 3. Eklenen 8 indeks

| Model | İndeks | Sorgu kalıbı | Kullanım |
|-------|--------|-------------|----------|
| `ChatPresence` | `@@index([lastSeen])` | Çevrimiçi kullanıcı listesi | 18x |
| `ChatPresence` | `@@index([userId])` | Kullanıcı presence sorgusu | 5x |
| `VideoStreamViewer` | `@@index([streamId, leftAt])` | Aktif izleyici sayısı | 7x |
| `AgencyEarning` | `@@index([agencyId, createdAt])` | Ajans kazanç raporlama | 6x |
| `ChatUserRole` | `@@index([userId])` | Kullanıcının oda rolleri | 6x |
| `LiveFortuneTeller` | `@@index([verificationStatus])` | Doğrulama durumu filtresi | 4x |
| `SosGame` | `@@index([status, isAI])` | Aktif oyun listesi | 4x |
| `StreamCoBroadcaster` | `@@index([streamId, status])` | Co-broadcaster listesi | 4x |

**Toplam:** 8 yeni indeks, 6 tablo etkilendi.

---

## 4. Beklenen performans etkileri

| İndeks | Beklenen iyileşme |
|--------|-------------------|
| `ChatPresence(lastSeen)` | Seq scan → index scan: çevrimiçi kullanıcı listesi her oda yüklemesinde çağrılır |
| `ChatPresence(userId)` | Kullanıcı bazlı presence sorguları hızlanır |
| `VideoStreamViewer(streamId, leftAt)` | Aktif izleyici sayısı: composite indeks `WHERE streamId=x AND leftAt IS NULL` sorgusunu hızlandırır |
| `AgencyEarning(agencyId, createdAt)` | Ajans kazanç raporları tarih aralığı filtresiyle hızlanır |
| `ChatUserRole(userId)` | Kullanıcının tüm odalarındaki rolleri tek sorguda gelir |
| `LiveFortuneTeller(verificationStatus)` | Doğrulama durumu filtresi (PENDING/VERIFIED/REJECTED) |
| `SosGame(status, isAI)` | Aktif AI/insan oyunu listesi hızlanır |
| `StreamCoBroadcaster(streamId, status)` | Yayındaki aktif co-broadcaster listesi |

---

## 5. Zaten kapsanan sorgular (12)

| Model | Sorgu | Kapsayan indeks |
|-------|-------|-----------------|
| PKBattle | stream1Id | `@@index([stream1Id])` |
| VideoStream | status | `@@index([status])` |
| PaymentNotification | status | `@@index([status])` |
| DreamInterpretation | isPublished | `@@index([isPublished])` |
| LiveSession | status | `@@index([status])` |
| SitePresence | lastSeen | `@@index([lastSeen])` |
| Notification | userId, isRead | `@@index([userId, isRead])` |
| JetonTransaction | type | `@@index([type])` |
| BlogPost | isPublished | `@@index([isPublished])` |
| SocialPost | createdAt | `@@index([createdAt])` |
| GameRoom | status | `@@index([status])` |
| SiteVisit | visitedAt | `@@index([visitedAt])` |

---

## 6. Doğrulama

| Kontrol | Sonuç |
|---|---|
| `prisma db push` | ✅ “Your database is now in sync” (veri kaybı uyarısı yok) |
| `tsc --noEmit` | ✅ |
| Üretim derlemesi | ✅ |
| Deploy | ❌ yapılmadı |

---

## 7. Envanter (değişmedi)

215 model · 780 handler · 502 path · 172 kategori

**Not:** İndeks ekleme model sayısını değiştirmez. Yalnızca sorgu performansı
iyileşir.
