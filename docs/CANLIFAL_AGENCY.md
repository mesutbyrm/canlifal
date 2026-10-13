# CanlıFal — Ajans Sistemi Dokümantasyonu

> **§40-42 — Spec Referansları**
>
> Son güncelleme: 2026-08-27

---

## 1. Genel Bakış

Ajans sistemi, yayıncıların (creator) bir ajans çatısı altında toplanmasını, performans takibi yapılmasını ve komisyon bazlı kazanç dağıtılmasını sağlar.

---

## 2. Veri Modeli

### 2.1 Agency

| Alan | Tip | Açıklama |
|------|-----|----------|
| id | String | Benzersiz ID |
| name | String @unique | Ajans adı |
| description | String? | Açıklama |
| ownerId | String | Kurucu kullanıcı ID |
| ownerName | String | Kurucu adı |
| status | String | pending, approved, rejected, suspended |
| commissionRate | Float | Komisyon oranı (%) (varsayılan 5.0) |
| contactEmail | String? | İletişim e-posta |
| contactPhone | String? | İletişim telefon |
| logoUrl | String? | Logo URL |
| totalEarnings | Float | Toplam kazanç |
| totalMembers | Int | Toplam üye |
| activeMembers | Int | Aktif üye |
| performanceScore | Float | APS (0-100) |
| penaltyLevel | Int | 0=temiz, 1=uyarı, 2=davet_kapandı, 3=komisyon_düşük, 4=askıya_alındı |
| invitesDisabled | Boolean | Davet gönderme engeli |

### 2.2 AgencyUser

| Alan | Tip | Açıklama |
|------|-----|----------|
| agencyId | String | Ajans ID |
| userId | String @unique | Kullanıcı ID (bir kullanıcı tek ajansa üye) |
| role | String | owner, manager, member |
| joinedVia | String? | invite_code, referral_link, direct |
| totalEarnings | Float | Ajansa katkı toplamı |
| isActive | Boolean | Aktif üyelik |
| joinIp | String? | Katılım IP (fraud tracking) |
| joinDeviceId | String? | Katılım cihaz ID |

### 2.3 AgencyEarning

| Alan | Tip | Açıklama |
|------|-----|----------|
| agencyId | String | Ajans ID |
| userId | String | Kazanç sağlayan üye |
| amount | Float | Komisyon miktarı |
| sourceType | String | chat_gift, stream_gift, direct_gift, tip, bonus |
| originalAmount | Float | Orijinal tutar |
| commissionRate | Float | Uygulanan oran |

### 2.4 AgencyTask (Haftalık Görevler)

| Alan | Tip | Açıklama |
|------|-----|----------|
| weekStart/End | DateTime | Görev haftası |
| earningsTarget/Actual | Float | Kazanç hedef/gerçekleşen |
| newUsersTarget/Actual | Int | Yeni üye hedef/gerçekleşen |
| activeUsersTarget/Actual | Int | Aktif üye hedef/gerçekleşen |
| completionPercent | Float | Tamamlanma yüzdesi |
| bonusAwarded | Float | Verilen bonus |
| status | String | active, completed, failed |

### 2.5 AgencyPenalty

| Alan | Tip | Açıklama |
|------|-----|----------|
| level | Int | 1=uyarı, 2=davet_kapat, 3=komisyon_düşür, 4=askıya_al |
| reason | String | Ceza sebebi |
| appliedBy | String? | Admin ID veya 'system' |
| isActive | Boolean | Aktif ceza |
| resolvedAt/By/Note | — | Çözüm bilgileri |

### 2.6 AgencyLeaveRequest

| Alan | Tip | Açıklama |
|------|-----|----------|
| userId | String | Ayrılmak isteyen üye |
| reason | String? | Sebep |
| status | String | pending, approved, rejected |
| reviewedBy | String? | İnceleyen ajans yöneticisi |

---

## 3. API Uçları

| Yöntem | Yol | Auth | Açıklama |
|--------|-----|------|----------|
| POST | `/api/agency/apply` | Evet + AGENCY_ENABLED | Ajans başvurusu |
| POST | `/api/agency/join` | Evet + AGENCY_ENABLED | Ajansa katılma |
| POST | `/api/agency/invite` | Evet | Üye davet etme |
| GET | `/api/agency/my` | Evet | Kendi ajansım bilgisi |
| GET | `/api/agency/members` | Evet | Üye listesi |
| GET | `/api/agency/earnings` | Evet | Kazanç raporu |
| POST | `/api/agency/leave` | Evet | Ajanstan ayrılma |
| GET | `/api/agency/leaderboard` | Evet | Ajans sıralaması |
| GET | `/api/agency/tasks` | Evet | Haftalık görevler |
| POST | `/api/agency/withdrawals` | Evet + guardRateLimit | Ajans çekimi |

### Admin Uçları

| Yöntem | Yol | Auth | Açıklama |
|--------|-----|------|----------|
| GET | `/api/admin/agencies` | isAdminRole | Ajans listesi |
| PATCH | `/api/admin/agencies/[id]` | isAdminRole | Ajans güncelleme/onay/ret |
| GET | `/api/admin/agencies/[id]/members` | isAdminRole | Üye detayları |

---

## 4. Komisyon Dağılımı

### Sesli Oda Hediye Akışı

```
Gönderen → [jeton düşürme]
  → Alıcı: vr_gift_receiver_percent (varsayılan %70)
  → Oda sahibi: vr_room_owner_percent (varsayılan %30)
  → Platform: vr_site_commission_percent (varsayılan %50 üzerinden)
  → Ajans: commissionRate (%5 varsayılan, üye kazancından)
```

### Canlı Yayın Hediye Akışı

```
Gönderen → [jeton düşürme]
  → Yayıncı: (100% - platform komisyonu)
  → Platform: ~%30
  → Ajans: commissionRate (yayıncı kazancından)
```

Komisyon hesaplama `processAgencyCommission()` fonksiyonu ile yapılır.

---

## 5. Ledger Entegrasyonu

Tüm finansal hareketler `LedgerEntry`'ye fire-and-forget olarak yazılır:
- Hediye gönderimi → `gift_send` kategorisi
- Bahşiş → `tip` kategorisi
- Ajans çekimi → `withdrawal` kategorisi

---

## 6. Supporter Level ile İlişki

`lib/supporter-level.ts` — Her hediye/bahşiş `recordContribution(userId, broadcasterId, amount)` çağrısı yapar. Bu, gönderen↔alıcı çiftine özel supporter seviyesini artırır.

---

## 7. Güvenlik

- `AGENCY_ENABLED` feature flag ile açılıp kapatılabilir
- `guardRateLimit('agency_action')` — 5 istek/dakika
- Katılım IP ve cihaz ID fraud tracking için kaydedilir
- Ceza sistemi kademeli (uyarı → davet engeli → komisyon düşürme → askıya alma)
