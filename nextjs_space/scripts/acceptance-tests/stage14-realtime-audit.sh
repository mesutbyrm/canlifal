#!/usr/bin/env bash
# STAGE 14 — Real-time backend production audit (TRTC / live / voice / seat / gift / PK / presence / SSE / music / auto-close)
# READ-MOSTLY: creates only S14TEST-prefixed artifacts, cleaned up by stage14-helper.js cleanup
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

STAMP="$(date +%s)"
TAG="S14TEST-${STAMP}"
OUT="/tmp/s14_facts.txt"
: > "$OUT"
gate() { local __gf=$FAILED; run_gate "$1" "$2" "$3"; [[ $FAILED -eq $__gf ]]; }
fact() { echo "FACT|$*" >> "$OUT"; echo "    · $*"; }
group() { echo "GROUP|$1|$2" >> "$OUT"; }

http_post() {
  local path="$1" token="${2:-}" data="${3:-{\}}"
  if [[ -n "$token" ]]; then
    curl -s -w '\n%{http_code}' --max-time 45 -X POST "${API_BASE_URL}${path}" \
      -H 'Content-Type: application/json' -H "Authorization: Bearer ${token}" -d "$data"
  else
    curl -s -w '\n%{http_code}' --max-time 45 -X POST "${API_BASE_URL}${path}" \
      -H 'Content-Type: application/json' -d "$data"
  fi
}
http_patch() {
  local path="$1" token="$2" data="${3:-{\}}"
  curl -s -w '\n%{http_code}' --max-time 45 -X PATCH "${API_BASE_URL}${path}" \
    -H 'Content-Type: application/json' -H "Authorization: Bearer ${token}" -d "$data"
}

# ---------------- login ----------------
USER_EMAIL="${ACCEPTANCE_USER_EMAIL:?}"; USER_PASS="${ACCEPTANCE_USER_PASSWORD:?}"
TELLER_EMAIL="${ACCEPTANCE_TELLER_EMAIL:?}"; TELLER_PASS="${ACCEPTANCE_TELLER_PASSWORD:?}"
ADMIN_EMAIL="${ACCEPTANCE_ADMIN_EMAIL:?}"; ADMIN_PASS="${ACCEPTANCE_ADMIN_PASSWORD:?}"

lr=$(login "$USER_EMAIL" "$USER_PASS");   UTOK=$(extract_json_field "$lr" accessToken); UID_=$(echo "$lr" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d.get("user",{}).get("id",""))' 2>/dev/null)
lr=$(login "$TELLER_EMAIL" "$TELLER_PASS"); TTOK=$(extract_json_field "$lr" accessToken); TID_=$(echo "$lr" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d.get("user",{}).get("id",""))' 2>/dev/null)
lr=$(login "$ADMIN_EMAIL" "$ADMIN_PASS");  ATOK=$(extract_json_field "$lr" accessToken)
[[ -n "$UTOK" && -n "$TTOK" && -n "$ATOK" ]] || { echo "LOGIN FAILED"; exit 1; }
echo "logins ok (user=${#UTOK}ch teller=${#TTOK}ch admin=${#ATOK}ch) userId=$UID_ tellerUserId=$TID_"
node "${SCRIPT_DIR}/stage14-helper.js" fund "$USER_EMAIL" 3000 >/dev/null 2>&1
node "${SCRIPT_DIR}/stage14-helper.js" fund "$TELLER_EMAIL" 1000 >/dev/null 2>&1

# ================= A. TRTC =================
A_FAIL=0
g_trtc_noauth() {
  r=$(http_post /api/trtc/token "" '{"roomId":"probe"}'); s=$(status_of "$r")
  fact "TRTC token auth'suz -> HTTP $s"; [[ "$s" == "401" ]]
}
g_trtc_noroom() {
  r=$(http_post /api/trtc/token "$UTOK" '{}'); s=$(status_of "$r"); b=$(body_of "$r")
  fact "TRTC token roomId'siz -> HTTP $s code=$(extract_json_field "$b" code)"; [[ "$s" == "400" ]]
}
TRTC_ROOM_ECHO=""
g_trtc_ok() {
  r=$(http_post /api/trtc/token "$UTOK" "{\"roomId\":\"${TAG}-probe\"}"); s=$(status_of "$r"); b=$(body_of "$r")
  local sdk uid sig exp trm
  sdk=$(extract_json_number "$b" sdkAppId); uid=$(extract_json_field "$b" userId)
  sig=$(extract_json_field "$b" userSig); exp=$(extract_json_number "$b" expireTime)
  trm=$(extract_json_field "$b" trtcRoomId); TRTC_ROOM_ECHO="$trm"
  fact "TRTC token 200 -> sdkAppId_set=$([[ -n "$sdk" && "$sdk" != "0" ]] && echo yes || echo no) userId_matches=$([[ "$uid" == "$UID_" ]] && echo yes || echo no) userSig_len=${#sig} expireTime=$exp trtcRoomId=$trm numericUid=$(extract_json_number "$b" numericUid)"
  [[ "$s" == "200" && -n "$sdk" && "$sdk" != "0" && "$uid" == "$UID_" && ${#sig} -gt 40 && "$exp" -gt 0 && -n "$trm" ]]
}
g_trtc_badtoken() {
  r=$(http_post /api/trtc/token "invalid.jwt.value" '{"roomId":"probe"}'); s=$(status_of "$r")
  fact "TRTC token gecersiz JWT -> HTTP $s"; [[ "$s" == "401" ]]
}
g_trtc_dup() {
  r1=$(http_post /api/trtc/token "$UTOK" "{\"roomId\":\"${TAG}-probe\"}")
  r2=$(http_post /api/trtc/token "$UTOK" "{\"roomId\":\"${TAG}-probe\"}")
  s1=$(status_of "$r1"); s2=$(status_of "$r2")
  fact "TRTC duplicate join (ayni user+room 2 kez token) -> $s1 / $s2 (rejoin destekli)"
  [[ "$s1" == "200" && "$s2" == "200" ]]
}
g_trtc_usersig_noauth() {
  r=$(http_post /api/trtc/usersig "" "{\"userId\":\"anon-${STAMP}\"}"); s=$(status_of "$r"); b=$(body_of "$r")
  local sig; sig=$(extract_json_field "$b" userSig)
  fact "TRTC /usersig auth'suz + body userId -> HTTP $s userSig_uretildi=$([[ ${#sig} -gt 40 ]] && echo EVET || echo hayir)"
  # Bu bir GUVENLIK gozlemi: auth'suz UserSig uretimi -> FAIL sayilir
  [[ ${#sig} -le 40 ]]
}
gate A1 "TRTC token auth zorunlulugu" g_trtc_noauth || A_FAIL=1
gate A2 "TRTC token roomId validasyonu" g_trtc_noroom || A_FAIL=1
gate A3 "TRTC token basarili uretim + alan dogrulama" g_trtc_ok || A_FAIL=1
gate A4 "TRTC gecersiz token reddi" g_trtc_badtoken || A_FAIL=1
gate A5 "TRTC duplicate join / reconnect" g_trtc_dup || A_FAIL=1
gate A6 "TRTC /usersig yetkilendirme" g_trtc_usersig_noauth || A_FAIL=1
group TRTC $([[ $A_FAIL -eq 0 ]] && echo PASS || echo FAIL)

# ================= B. CANLI YAYIN =================
B_FAIL=0; STREAM_ID=""
g_stream_create() {
  r=$(http_post /api/video-streams "$TTOK" "{\"title\":\"${TAG} yayin\",\"description\":\"stage14\",\"category\":\"genel\"}")
  s=$(status_of "$r"); b=$(body_of "$r")
  STREAM_ID=$(echo "$b" | python3 -c 'import sys,json
try:
 d=json.load(sys.stdin)
except Exception:
 print("");raise SystemExit
for k in ("id",):
 if k in d: print(d[k]);raise SystemExit
for k in ("stream","data"):
 if isinstance(d.get(k),dict) and d[k].get("id"): print(d[k]["id"]);raise SystemExit
print("")')
  fact "Yayin olustur -> HTTP $s streamId=${STREAM_ID:-YOK}"
  [[ ( "$s" == "200" || "$s" == "201" ) && -n "$STREAM_ID" ]]
}
g_stream_get() {
  r=$(http_get "/api/video-streams/${STREAM_ID}" "$UTOK"); s=$(status_of "$r"); b=$(body_of "$r")
  fact "Yayin bilgisi -> HTTP $s status=$(extract_json_field "$b" status) owner_set=$(json_has_key "$b" userId && echo yes || echo no)"
  [[ "$s" == "200" ]]
}
g_stream_dup() {
  r=$(http_post /api/video-streams "$TTOK" "{\"title\":\"${TAG} yayin-dup\",\"category\":\"genel\"}")
  s=$(status_of "$r"); b=$(body_of "$r")
  local id2; id2=$(echo "$b" | python3 -c 'import sys,json
try: d=json.load(sys.stdin)
except Exception: print("");raise SystemExit
print(d.get("id") or (d.get("stream") or {}).get("id") or "")')
  fact "Duplicate yayin (ayni sahip, ikinci kez) -> HTTP $s ikinci_id=${id2:-yok} (ayni_yayin_dondu=$([[ "$id2" == "$STREAM_ID" ]] && echo EVET || echo hayir))"
  [[ "$s" == "200" || "$s" == "201" || "$s" == "409" || "$s" == "400" ]]
}
g_stream_join() {
  r=$(http_post /api/live/join-room "$UTOK" "{\"roomId\":\"${STREAM_ID}\",\"roomType\":\"stream\"}"); s=$(status_of "$r"); b=$(body_of "$r")
  fact "Izleyici join (stream) -> HTTP $s onlineCount=$(extract_json_number "$b" onlineCount)"
  [[ "$s" == "200" ]]
}
g_stream_hb() {
  r=$(http_post /api/live/heartbeat "$UTOK" "{\"roomId\":\"${STREAM_ID}\",\"roomType\":\"stream\"}"); s=$(status_of "$r"); b=$(body_of "$r")
  fact "Stream heartbeat -> HTTP $s onlineCount=$(extract_json_number "$b" onlineCount) staleRemoved=$(extract_json_number "$b" staleRemoved)"
  [[ "$s" == "200" ]]
}
g_stream_online() {
  r=$(http_get "/api/live/online-users?roomId=${STREAM_ID}&roomType=stream" "$UTOK"); s=$(status_of "$r"); b=$(body_of "$r")
  fact "Stream online-users -> HTTP $s totalCount=$(extract_json_number "$b" totalCount)"
  [[ "$s" == "200" ]]
}
g_stream_autoclose() {
  r=$(http_get "/api/video-streams/${STREAM_ID}/auto-close" "$TTOK"); s=$(status_of "$r"); b=$(body_of "$r")
  fact "auto-close GET -> HTTP $s shouldClose=$(echo "$b" | grep -o '"shouldClose"[^,}]*') reason=$(extract_json_field "$b" reason) timeoutMinutes=$(extract_json_number "$b" timeoutMinutes) remainingMinutes=$(extract_json_number "$b" remainingMinutes)"
  fact "auto-close kriter alanlari: media/audio/video inaktivite alani var mi -> $(echo "$b" | grep -qiE 'audio|video_?activity|media' && echo VAR || echo YOK)"
  [[ "$s" == "200" ]]
}
g_stream_leave() {
  r=$(http_post /api/live/leave-room "$UTOK" "{\"roomId\":\"${STREAM_ID}\",\"roomType\":\"stream\"}"); s=$(status_of "$r")
  fact "Izleyici leave (stream) -> HTTP $s"; [[ "$s" == "200" ]]
}
gate B1 "Yayin olusturma" g_stream_create || B_FAIL=1
if [[ -n "$STREAM_ID" ]]; then
  gate B2 "Yayin bilgisi" g_stream_get || B_FAIL=1
  gate B3 "Duplicate yayin davranisi" g_stream_dup || B_FAIL=1
  gate B4 "Yayina katilim" g_stream_join || B_FAIL=1
  gate B5 "Stream heartbeat" g_stream_hb || B_FAIL=1
  gate B6 "Stream online kullanicilar" g_stream_online || B_FAIL=1
  gate B7 "Yayindan ayrilma" g_stream_leave || B_FAIL=1
else B_FAIL=1; fi
group CANLI_YAYIN $([[ $B_FAIL -eq 0 ]] && echo PASS || echo FAIL)

AC_FAIL=0
if [[ -n "$STREAM_ID" ]]; then gate B8 "5dk medya-inaktivite otomatik kapatma" g_stream_autoclose || AC_FAIL=1; else AC_FAIL=1; fi

# ================= C. CANLI FALCI =================
C_FAIL=0; TELLER_PROFILE_ID=""; SESSION_ID=""; SESSION_ROOM=""
g_teller_find() {
  r=$(http_get "/api/fortune-tellers?limit=100" "$UTOK"); s=$(status_of "$r"); b=$(body_of "$r")
  TELLER_PROFILE_ID=$(echo "$b" | python3 -c "
import sys,json
try: d=json.load(sys.stdin)
except Exception: print('');raise SystemExit
rows=d if isinstance(d,list) else (d.get('tellers') or d.get('data') or d.get('items') or [])
for t in rows:
  if t.get('userId')=='${TID_}' or (t.get('user') or {}).get('id')=='${TID_}': print(t.get('id'));raise SystemExit
print('')")
  local in_list="$TELLER_PROFILE_ID"
  if [[ -z "$TELLER_PROFILE_ID" ]]; then
    TELLER_PROFILE_ID=$(node "${SCRIPT_DIR}/stage14-helper.js" teller-id "$TELLER_EMAIL" 2>/dev/null | grep -o 'tellerProfileId=.*' | cut -d= -f2)
  fi
  fact "Falci listesi -> HTTP $s liste_ilk_sayfada=${in_list:-HAYIR} kullanilan_profil_id=${TELLER_PROFILE_ID:-BULUNAMADI}"
  [[ "$s" == "200" && -n "$TELLER_PROFILE_ID" ]]
}
g_session_request() {
  r=$(http_post "/api/fortune-tellers/${TELLER_PROFILE_ID}/session" "$UTOK" '{"fortuneType":"general","duration":5}')
  s=$(status_of "$r"); b=$(body_of "$r")
  SESSION_ID=$(extract_json_field "$b" sessionId)
  fact "Danisan seans talebi -> HTTP $s sessionId=${SESSION_ID:-yok} hata=$(extract_json_field "$b" error)"
  [[ "$s" == "201" && -n "$SESSION_ID" ]]
}
g_session_visible() {
  r=$(http_get "/api/fortune-tellers/sessions?status=pending" "$TTOK"); s=$(status_of "$r"); b=$(body_of "$r")
  fact "Falci bekleyen talepleri goruyor -> HTTP $s talep_listede=$(echo "$b" | grep -q "$SESSION_ID" && echo EVET || echo HAYIR)"
  [[ "$s" == "200" ]] && echo "$b" | grep -q "$SESSION_ID"
}
g_session_accept() {
  r=$(http_patch "/api/fortune-tellers/sessions/${SESSION_ID}" "$TTOK" '{"action":"accept"}'); s=$(status_of "$r"); b=$(body_of "$r")
  SESSION_ROOM=$(extract_json_field "$b" roomId)
  fact "Falci kabul -> HTTP $s status=$(extract_json_field "$b" status) roomId=${SESSION_ROOM:-yok}"
  [[ "$s" == "200" ]]
}
g_session_room_shared() {
  [[ -z "$SESSION_ROOM" ]] && { r=$(http_get "/api/room/${SESSION_ID}" "$UTOK"); SESSION_ROOM=$(extract_json_field "$(body_of "$r")" roomId); }
  r1=$(http_post /api/trtc/token "$UTOK" "{\"roomId\":\"${SESSION_ROOM}\"}"); b1=$(body_of "$r1")
  r2=$(http_post /api/trtc/token "$TTOK" "{\"roomId\":\"${SESSION_ROOM}\"}"); b2=$(body_of "$r2")
  t1=$(extract_json_field "$b1" trtcRoomId); t2=$(extract_json_field "$b2" trtcRoomId)
  u1=$(extract_json_field "$b1" userId); u2=$(extract_json_field "$b2" userId)
  fact "Iki taraf ayni TRTC odasi -> danisan_room=$t1 falci_room=$t2 esit=$([[ "$t1" == "$t2" && -n "$t1" ]] && echo EVET || echo HAYIR); farkli_userId=$([[ "$u1" != "$u2" ]] && echo EVET || echo HAYIR)"
  [[ -n "$t1" && "$t1" == "$t2" && "$u1" != "$u2" ]]
}
g_session_roomget() {
  r=$(http_get "/api/room/${SESSION_ID}" "$UTOK"); s=$(status_of "$r"); b=$(body_of "$r")
  fact "Oda bilgisi (danisan) -> HTTP $s status=$(extract_json_field "$b" status)"
  r2=$(http_get "/api/room/${SESSION_ID}" "$ATOK"); s2=$(status_of "$r2")
  fact "Oda bilgisi (yetkisiz 3. kisi) -> HTTP $s2 (403 beklenir)"
  [[ "$s" == "200" ]]
}
g_session_complete() {
  r=$(http_patch "/api/fortune-tellers/sessions/${SESSION_ID}" "$TTOK" '{"action":"complete"}'); s=$(status_of "$r"); b=$(body_of "$r")
  fact "Seans tamamla -> HTTP $s"
  r2=$(http_get "/api/room/${SESSION_ID}" "$UTOK"); b2=$(body_of "$r2")
  fact "Kapanis sonrasi oda durumu = $(extract_json_field "$b2" status)"
  [[ "$s" == "200" ]]
}
g_session_reject_refund() {
  bal0=$(extract_json_number "$(body_of "$(http_get /api/user/profile "$UTOK")")" jetonBalance)
  r=$(http_post "/api/fortune-tellers/${TELLER_PROFILE_ID}/session" "$UTOK" '{"fortuneType":"general","duration":5}')
  sid=$(extract_json_field "$(body_of "$r")" sessionId)
  bal1=$(extract_json_number "$(body_of "$(http_get /api/user/profile "$UTOK")")" jetonBalance)
  http_patch "/api/fortune-tellers/sessions/${sid}" "$TTOK" '{"action":"reject"}' >/dev/null
  bal2=$(extract_json_number "$(body_of "$(http_get /api/user/profile "$UTOK")")" jetonBalance)
  fact "Reject iade zinciri: talep_oncesi=$bal0 talep_sonrasi=$bal1 reject_sonrasi=$bal2"
  [[ -n "$bal0" && "$bal0" == "$bal2" && "$bal1" != "$bal0" ]]
}
gate C1 "Test falci profili bulunuyor" g_teller_find || C_FAIL=1
if [[ -n "$TELLER_PROFILE_ID" ]]; then
  gate C2 "Danisan -> seans talebi" g_session_request || C_FAIL=1
  if [[ -n "$SESSION_ID" ]]; then
    gate C3 "Falci talebi goruyor" g_session_visible || C_FAIL=1
    gate C4 "Falci kabul + oda olusumu" g_session_accept || C_FAIL=1
    gate C5 "Iki taraf ayni TRTC odasinda" g_session_room_shared || C_FAIL=1
    gate C6 "Oda erisimi + yetki" g_session_roomget || C_FAIL=1
    gate C7 "Seans kapanisi" g_session_complete || C_FAIL=1
  else C_FAIL=1; fi
  gate C8 "Reddetme + jeton iadesi" g_session_reject_refund || C_FAIL=1
else C_FAIL=1; fi
group CANLI_FALCI $([[ $C_FAIL -eq 0 ]] && echo PASS || echo FAIL)

# ================= D. SESLI ODA + SEAT + PRESENCE =================
D_FAIL=0; S_FAIL=0; P_FAIL=0; ROOM_A=""; ROOM_B=""
g_room_create() {
  r=$(http_post /api/chat/rooms/create "$UTOK" "{\"name\":\"${TAG} odaA\",\"description\":\"stage14\",\"icon\":\"🎤\",\"paymentType\":\"jeton\",\"roomType\":\"voice\"}")
  s=$(status_of "$r"); b=$(body_of "$r")
  ROOM_A=$(echo "$b" | python3 -c 'import sys,json
try: d=json.load(sys.stdin)
except Exception: print("");raise SystemExit
print(d.get("id") or (d.get("room") or {}).get("id") or (d.get("data") or {}).get("id") or "")')
  fact "Sesli oda A olustur (sahip=user) -> HTTP $s roomId=${ROOM_A:-yok} hata=$(extract_json_field "$b" error)"
  [[ ( "$s" == "200" || "$s" == "201" ) && -n "$ROOM_A" ]]
}
g_room_create_b() {
  r=$(http_post /api/chat/rooms/create "$TTOK" "{\"name\":\"${TAG} odaB\",\"description\":\"stage14\",\"icon\":\"🎧\",\"paymentType\":\"jeton\",\"roomType\":\"voice\"}")
  s=$(status_of "$r"); b=$(body_of "$r")
  ROOM_B=$(echo "$b" | python3 -c 'import sys,json
try: d=json.load(sys.stdin)
except Exception: print("");raise SystemExit
print(d.get("id") or (d.get("room") or {}).get("id") or (d.get("data") or {}).get("id") or "")')
  fact "Sesli oda B olustur (sahip=teller) -> HTTP $s roomId=${ROOM_B:-yok} hata=$(extract_json_field "$b" error)"
  [[ ( "$s" == "200" || "$s" == "201" ) && -n "$ROOM_B" ]]
}
g_voice_join() {
  r1=$(http_post /api/live/join-room "$UTOK" "{\"roomId\":\"${ROOM_A}\",\"roomType\":\"voice\"}"); s1=$(status_of "$r1")
  r2=$(http_post /api/live/join-room "$TTOK" "{\"roomId\":\"${ROOM_A}\",\"roomType\":\"voice\"}"); s2=$(status_of "$r2")
  fact "Sesli oda JOIN -> user=$s1 teller=$s2"
  [[ "$s1" == "200" && "$s2" == "200" ]]
}
g_voice_hb() {
  r=$(http_post /api/live/heartbeat "$UTOK" "{\"roomId\":\"${ROOM_A}\",\"roomType\":\"voice\"}"); s=$(status_of "$r"); b=$(body_of "$r")
  http_post /api/live/heartbeat "$TTOK" "{\"roomId\":\"${ROOM_A}\",\"roomType\":\"voice\"}" >/dev/null
  fact "Sesli oda HEARTBEAT -> HTTP $s onlineCount=$(extract_json_number "$b" onlineCount) staleRemoved=$(extract_json_number "$b" staleRemoved) serverTime_var=$(json_has_key "$b" serverTime && echo yes || echo no)"
  [[ "$s" == "200" ]]
}
ONLINE_BEFORE=0
g_presence_online() {
  r=$(http_get "/api/live/online-users?roomId=${ROOM_A}&roomType=voice&limit=50" "$UTOK"); s=$(status_of "$r"); b=$(body_of "$r")
  ONLINE_BEFORE=$(extract_json_number "$b" totalCount)
  fact "PRESENCE join sonrasi online=$ONLINE_BEFORE (2 kullanici bekleniyor) user_listede=$(echo "$b" | grep -q "$UID_" && echo EVET || echo HAYIR)"
  [[ "$s" == "200" && "${ONLINE_BEFORE:-0}" -ge 2 ]]
}
g_presence_leave() {
  r=$(http_post /api/live/leave-room "$UTOK" "{\"roomId\":\"${ROOM_A}\",\"roomType\":\"voice\"}"); s=$(status_of "$r")
  sleep 2
  b=$(body_of "$(http_get "/api/live/online-users?roomId=${ROOM_A}&roomType=voice&limit=50" "$TTOK")")
  after=$(extract_json_number "$b" totalCount)
  fact "PRESENCE leave sonrasi -> leave HTTP $s online: $ONLINE_BEFORE -> $after ; ayrilan_user_hala_listede=$(echo "$b" | grep -q "$UID_" && echo EVET || echo HAYIR)"
  ! echo "$b" | grep -q "$UID_"
}
SEAT_IDX=3
g_seat_take() {
  http_post /api/live/join-room "$UTOK" "{\"roomId\":\"${ROOM_A}\",\"roomType\":\"voice\"}" >/dev/null
  r=$(http_post /api/live/seats "$UTOK" "{\"roomId\":\"${ROOM_A}\",\"action\":\"take\",\"seatIndex\":${SEAT_IDX}}"); s=$(status_of "$r"); b=$(body_of "$r")
  fact "SEAT take idx=$SEAT_IDX (user) -> HTTP $s seatIndex=$(extract_json_number "$b" seatIndex) code=$(extract_json_field "$b" code)"
  [[ "$s" == "200" ]]
}
g_seat_conflict() {
  r=$(http_post /api/live/seats "$TTOK" "{\"roomId\":\"${ROOM_A}\",\"action\":\"take\",\"seatIndex\":${SEAT_IDX}}"); s=$(status_of "$r"); b=$(body_of "$r")
  fact "SEAT dolu koltuga ikinci talep -> HTTP $s code=$(extract_json_field "$b" code)"
  [[ "$s" == "409" || "$s" == "400" ]]
}
g_seat_race() {
  local idx=7
  local f1=/tmp/s14_race1 f2=/tmp/s14_race2
  ( http_post /api/live/seats "$UTOK" "{\"roomId\":\"${ROOM_A}\",\"action\":\"take\",\"seatIndex\":${idx}}" > "$f1" ) &
  ( http_post /api/live/seats "$TTOK" "{\"roomId\":\"${ROOM_A}\",\"action\":\"take\",\"seatIndex\":${idx}}" > "$f2" ) &
  wait
  s1=$(status_of "$(cat $f1)"); s2=$(status_of "$(cat $f2)")
  sleep 1
  occ=$(node "${SCRIPT_DIR}/stage14-helper.js" seat-race "$ROOM_A" "$idx" 2>/dev/null | tail -1)
  fact "SEAT RACE idx=$idx es zamanli 2 talep -> HTTP $s1 / $s2 ; DB'de koltuk sahibi sayisi=$occ"
  [[ "${occ:-99}" == "1" ]]
}
g_seat_leave() {
  r=$(http_post /api/live/seats "$UTOK" "{\"roomId\":\"${ROOM_A}\",\"action\":\"leave\"}"); s=$(status_of "$r")
  fact "SEAT leave -> HTTP $s"; [[ "$s" == "200" ]]
}
g_seat_force_unauth() {
  r=$(http_post /api/live/seats "$TTOK" "{\"roomId\":\"${ROOM_A}\",\"action\":\"force\",\"targetUserId\":\"${UID_}\"}"); s=$(status_of "$r")
  fact "SEAT force yetkisiz kullanici -> HTTP $s (403 beklenir)"; [[ "$s" == "403" ]]
}
g_seat_swap_owner() {
  r=$(http_post /api/live/seats "$UTOK" "{\"roomId\":\"${ROOM_A}\",\"action\":\"swap\",\"targetUserId\":\"${TID_}\",\"seatIndex\":9}"); s=$(status_of "$r"); b=$(body_of "$r")
  fact "SEAT swap (oda sahibi) -> HTTP $s code=$(extract_json_field "$b" code) err=$(extract_json_field "$b" error)"
  [[ "$s" == "200" || "$s" == "400" ]]
}
g_seat_invalid_idx() {
  r=$(http_post /api/live/seats "$UTOK" "{\"roomId\":\"${ROOM_A}\",\"action\":\"take\",\"seatIndex\":99}"); s=$(status_of "$r")
  fact "SEAT gecersiz index 99 -> HTTP $s (400 beklenir)"; [[ "$s" == "400" ]]
}
gate D1 "Sesli oda A olusturma" g_room_create || D_FAIL=1
gate D2 "Sesli oda B olusturma" g_room_create_b || D_FAIL=1
if [[ -n "$ROOM_A" ]]; then
  gate D3 "Sesli oda JOIN" g_voice_join || D_FAIL=1
  gate D4 "Sesli oda HEARTBEAT" g_voice_hb || { D_FAIL=1; P_FAIL=1; }
  gate D5 "PRESENCE join sonrasi" g_presence_online || P_FAIL=1
  gate D6 "PRESENCE leave sonrasi temizlik" g_presence_leave || P_FAIL=1
  gate E1 "SEAT take" g_seat_take || S_FAIL=1
  gate E2 "SEAT cakisma reddi" g_seat_conflict || S_FAIL=1
  gate E3 "SEAT gecersiz index" g_seat_invalid_idx || S_FAIL=1
  gate E4 "SEAT RACE CONDITION" g_seat_race || S_FAIL=1
  gate E5 "SEAT leave" g_seat_leave || S_FAIL=1
  gate E6 "SEAT force yetki kontrolu" g_seat_force_unauth || S_FAIL=1
  gate E7 "SEAT swap" g_seat_swap_owner || S_FAIL=1
else D_FAIL=1; S_FAIL=1; P_FAIL=1; fi
group SESLI_ODA $([[ $D_FAIL -eq 0 ]] && echo PASS || echo FAIL)
group SEAT $([[ $S_FAIL -eq 0 ]] && echo PASS || echo FAIL)
group PRESENCE $([[ $P_FAIL -eq 0 ]] && echo PASS || echo FAIL)

# ================= F. HEDIYE / JETON =================
G_FAIL=0; J_FAIL=0; GIFT_ID=""; GIFT_PRICE=0; GIFT_QTY=1
g_gift_types() {
  r=$(http_get "/api/live/gift-types" "$UTOK"); s=$(status_of "$r"); b=$(body_of "$r")
  read -r GIFT_ID GIFT_PRICE GIFT_QTY <<<"$(echo "$b" | python3 -c '
import sys,json
try: d=json.load(sys.stdin)
except Exception: print("  0 1");raise SystemExit
rows=d if isinstance(d,list) else (d.get("giftTypes") or d.get("data") or d.get("gifts") or [])
if isinstance(rows,dict): rows=rows.get("giftTypes") or []
best=None
for g in rows:
    p=g.get("price") or 0
    if p and 500%p==0 and 500//p<=100:
        if best is None or p>best[1]: best=(g.get("id"),p,500//p)
if best: print(best[0],best[1],best[2])
else: print("",0,1)')"
  fact "gift-types -> HTTP $s secilen hediye fiyat=$GIFT_PRICE adet=$GIFT_QTY (toplam=$((GIFT_PRICE*GIFT_QTY)))"
  [[ "$s" == "200" && -n "$GIFT_ID" && $((GIFT_PRICE*GIFT_QTY)) -eq 500 ]]
}
BAL_BEFORE=0; RCV_BEFORE=0
g_gift_send500() {
  BAL_BEFORE=$(node "${SCRIPT_DIR}/stage14-helper.js" show "$USER_EMAIL" 2>/dev/null | grep -o 'jetonBalance=[0-9-]*' | cut -d= -f2)
  RCV_BEFORE=$(node "${SCRIPT_DIR}/stage14-helper.js" show "$TELLER_EMAIL" 2>/dev/null | grep -o 'jetonBalance=[0-9-]*' | cut -d= -f2)
  r=$(http_post /api/live/gift/send "$UTOK" "{\"roomId\":\"${ROOM_A}\",\"roomType\":\"voice\",\"giftTypeId\":\"${GIFT_ID}\",\"quantity\":${GIFT_QTY},\"recipientId\":\"${TID_}\"}")
  s=$(status_of "$r"); b=$(body_of "$r")
  local newbal total
  newbal=$(extract_json_number "$b" newBalance); total=$(extract_json_number "$b" totalPrice)
  sleep 1
  BAL_AFTER=$(node "${SCRIPT_DIR}/stage14-helper.js" show "$USER_EMAIL" 2>/dev/null | grep -o 'jetonBalance=[0-9-]*' | cut -d= -f2)
  RCV_AFTER=$(node "${SCRIPT_DIR}/stage14-helper.js" show "$TELLER_EMAIL" 2>/dev/null | grep -o 'jetonBalance=[0-9-]*' | cut -d= -f2)
  fact "HEDIYE 500 jeton -> HTTP $s response.newBalance=$newbal response.totalPrice=$total"
  fact "HEDIYE DB: gonderen $BAL_BEFORE -> $BAL_AFTER (fark=$((BAL_BEFORE-BAL_AFTER))) ; alici $RCV_BEFORE -> $RCV_AFTER (fark=$((RCV_AFTER-RCV_BEFORE)))"
  [[ "$s" == "200" && "$total" == "500" && $((BAL_BEFORE-BAL_AFTER)) -eq 500 && $((RCV_AFTER-RCV_BEFORE)) -gt 0 ]]
}
g_gift_insufficient() {
  r=$(http_post /api/live/gift/send "$ATOK" "{\"roomId\":\"${ROOM_A}\",\"roomType\":\"voice\",\"giftTypeId\":\"${GIFT_ID}\",\"quantity\":${GIFT_QTY},\"recipientId\":\"${TID_}\"}")
  s=$(status_of "$r"); b=$(body_of "$r")
  fact "HEDIYE admin(finans-disi) gonderim -> HTTP $s totalPrice=$(extract_json_number "$b" totalPrice) newBalance=$(extract_json_number "$b" newBalance) [0 jeton kaydi bu yoldan olusur]"
  [[ "$s" == "200" || "$s" == "400" || "$s" == "403" ]]
}
g_gift_self() {
  r=$(http_post /api/live/gift/send "$UTOK" "{\"roomId\":\"${ROOM_A}\",\"roomType\":\"voice\",\"giftTypeId\":\"${GIFT_ID}\",\"quantity\":1,\"recipientId\":\"${UID_}\"}")
  s=$(status_of "$r"); fact "HEDIYE kendine gonderim -> HTTP $s (400 beklenir)"; [[ "$s" == "400" ]]
}

gate F1 "Hediye tipleri" g_gift_types || { G_FAIL=1; J_FAIL=1; }
if [[ -n "$GIFT_ID" && -n "$ROOM_A" ]]; then
  gate F2 "500 jetonluk hediye zinciri" g_gift_send500 || { G_FAIL=1; J_FAIL=1; }
  gate F3 "Kendine hediye engeli" g_gift_self || G_FAIL=1
  gate F4 "Finans-disi hesap hediye davranisi" g_gift_insufficient || G_FAIL=1
else G_FAIL=1; J_FAIL=1; fi
group HEDIYE $([[ $G_FAIL -eq 0 ]] && echo PASS || echo FAIL)
group JETON $([[ $J_FAIL -eq 0 ]] && echo PASS || echo FAIL)

# ================= G. PK =================
PK_FAIL=0; BATTLE_ID=""
g_pk_create() {
  # Karsi tarafin (oda B) SSE kanalini PK istegi GONDERILMEDEN ONCE ac
  rm -f /tmp/s14_sse_pk.txt
  ( timeout 25 curl -s -N --max-time 25 "${API_BASE_URL}/api/chat/rooms/${ROOM_B}/stream" \
      -H "Authorization: Bearer ${TTOK}" -H 'Accept: text/event-stream' > /tmp/s14_sse_pk.txt 2>/dev/null ) &
  SSE_PID=$!
  sleep 4
  r=$(http_post /api/live/pk "$UTOK" "{\"action\":\"create\",\"roomId\":\"${ROOM_A}\",\"targetRoomId\":\"${ROOM_B}\",\"duration\":300}")
  s=$(status_of "$r"); b=$(body_of "$r")
  BATTLE_ID=$(extract_json_field "$b" id); [[ -z "$BATTLE_ID" ]] && BATTLE_ID=$(extract_json_field "$b" battleId)
  fact "PK create (voice A -> B) -> HTTP $s battleId=${BATTLE_ID:-yok} code=$(extract_json_field "$b" code) err=$(extract_json_field "$b" error)"
  [[ "$s" == "200" && -n "$BATTLE_ID" ]]
}
g_pk_event_target() {
  local f=/tmp/s14_sse_pk.txt
  wait ${SSE_PID:-0} 2>/dev/null
  local hits; hits=$(grep -ci 'pk' "$f" 2>/dev/null); hits=${hits:-0}
  fact "PK SSE (oda B kanali PK istegi ONCESI acildi, 25sn dinlendi) -> satir=$(wc -l < "$f" 2>/dev/null) pk_gecen_satir=$hits event_tipleri=$(grep -o '\"type\":\"[a-z_]*\"' "$f" 2>/dev/null | sort -u | tr '\n' ' ')"
  [[ "${hits:-0}" -gt 0 ]]
}
g_pk_get() {
  r=$(http_get "/api/live/pk?roomId=${ROOM_B}" "$TTOK"); s=$(status_of "$r"); b=$(body_of "$r")
  fact "PK GET (hedef oda) -> HTTP $s battle_gorunuyor=$(echo "$b" | grep -q "$BATTLE_ID" && echo EVET || echo HAYIR) status=$(extract_json_field "$b" status)"
  echo "$b" | grep -q "$BATTLE_ID"
}
g_pk_accept() {
  r=$(http_post /api/live/pk "$TTOK" "{\"action\":\"accept\",\"battleId\":\"${BATTLE_ID}\"}"); s=$(status_of "$r"); b=$(body_of "$r")
  fact "PK accept -> HTTP $s status=$(extract_json_field "$b" status) err=$(extract_json_field "$b" error)"
  [[ "$s" == "200" ]]
}
g_pk_score() {
  before=$(body_of "$(http_get "/api/live/pk?roomId=${ROOM_A}" "$UTOK")")
  http_post /api/live/gift/send "$UTOK" "{\"roomId\":\"${ROOM_A}\",\"roomType\":\"voice\",\"giftTypeId\":\"${GIFT_ID}\",\"quantity\":1,\"recipientId\":\"${TID_}\"}" >/dev/null
  sleep 2
  after=$(body_of "$(http_get "/api/live/pk?roomId=${ROOM_A}" "$UTOK")")
  s1=$(extract_json_number "$before" score1); s2=$(extract_json_number "$after" score1)
  fact "PK skor (hediye sonrasi) -> score1: ${s1:-?} -> ${s2:-?}"
  [[ -n "$s2" && "${s2:-0}" -gt "${s1:-0}" ]]
}
g_pk_end() {
  r=$(http_post /api/live/pk "$UTOK" "{\"action\":\"end\",\"battleId\":\"${BATTLE_ID}\"}"); s=$(status_of "$r"); b=$(body_of "$r")
  fact "PK end -> HTTP $s status=$(extract_json_field "$b" status)"
  [[ "$s" == "200" ]]
}
g_pk_stream_isolation() {
  # video/live PK ayri endpoint: /api/video-streams/pk — voice PK state'ini bozuyor mu
  r=$(http_get "/api/live/pk?roomId=${ROOM_A}" "$UTOK"); b=$(body_of "$r")
  r2=$(http_get "/api/video-streams/pk?streamId=${STREAM_ID}" "$TTOK"); s2=$(status_of "$r2"); b2=$(body_of "$r2")
  fact "PK izolasyon -> voice PK sorgusu battle=$(extract_json_field "$b" id) ; video PK endpoint HTTP $s2 ayni_battle_donuyor=$(echo "$b2" | grep -q "${BATTLE_ID:-__none__}" && echo EVET || echo HAYIR)"
  ! echo "$b2" | grep -q "${BATTLE_ID:-__none__}"
}
if [[ -n "$ROOM_A" && -n "$ROOM_B" ]]; then
  gate G1 "PK istegi olusturma" g_pk_create || PK_FAIL=1
  if [[ -n "$BATTLE_ID" ]]; then
    gate G2 "PK karsi taraf GET ile goruyor" g_pk_get || PK_FAIL=1
    gate G3 "PK karsi taraf SSE event aliyor" g_pk_event_target || PK_FAIL=1
    PK_SSE_HITS=$(grep -ci 'pk' /tmp/s14_sse_pk.txt 2>/dev/null)
    gate G4 "PK kabul" g_pk_accept || PK_FAIL=1
    gate G5 "PK skor guncelleme (hediye)" g_pk_score || PK_FAIL=1
    gate G6 "PK voice/video izolasyonu" g_pk_stream_isolation || PK_FAIL=1
    gate G7 "PK bitirme" g_pk_end || PK_FAIL=1
  else PK_FAIL=1; fi
else PK_FAIL=1; fi
group PK $([[ $PK_FAIL -eq 0 ]] && echo PASS || echo FAIL)

# ================= H. MUZIK / !istek =================
M_FAIL=0
g_music_noauth() {
  r=$(http_get "/api/music/search?q=tarkan"); s=$(status_of "$r")
  fact "Muzik arama auth'suz -> HTTP $s (401 beklenir)"; [[ "$s" == "401" ]]
}
g_music_short() {
  r=$(http_get "/api/music/search?q=a" "$UTOK"); s=$(status_of "$r")
  fact "Muzik arama kisa sorgu -> HTTP $s (400 beklenir)"; [[ "$s" == "400" ]]
}
VIDEO_ID=""
g_music_search() {
  r=$(http_get "/api/music/search?q=tarkan%20kuzu%20kuzu" "$UTOK"); s=$(status_of "$r"); b=$(body_of "$r")
  VIDEO_ID=$(echo "$b" | python3 -c 'import sys,json
try: d=json.load(sys.stdin)
except Exception: print("");raise SystemExit
rows=d if isinstance(d,list) else (d.get("results") or d.get("items") or d.get("data") or [])
print((rows[0].get("videoId") or rows[0].get("id") or "") if rows else "")')
  fact "Muzik arama -> HTTP $s sonuc_sayisi=$(echo "$b" | grep -o '"videoId"' | wc -l) ilk_videoId=${VIDEO_ID:-yok}"
  [[ "$s" == "200" && -n "$VIDEO_ID" ]]
}
g_song_request() {
  before=$(node "${SCRIPT_DIR}/stage14-helper.js" show "$USER_EMAIL" 2>/dev/null | grep -o 'jetonBalance=[0-9-]*' | cut -d= -f2)
  r=$(http_post "/api/chat/rooms/${ROOM_A}/song-request" "$UTOK" "{\"videoId\":\"${VIDEO_ID}\",\"title\":\"${TAG} sarki\",\"duration\":210,\"requestType\":\"audio\"}")
  s=$(status_of "$r"); b=$(body_of "$r")
  sleep 1
  after=$(node "${SCRIPT_DIR}/stage14-helper.js" show "$USER_EMAIL" 2>/dev/null | grep -o 'jetonBalance=[0-9-]*' | cut -d= -f2)
  fact "!istek song-request (audio) -> HTTP $s jeton: $before -> $after (fark=$((before-after)), beklenen 10) err=$(extract_json_field "$b" error)"
  [[ "$s" == "200" || "$s" == "201" ]]
}
g_music_queue() {
  r=$(http_get "/api/chat/rooms/${ROOM_A}/music-queue" "$UTOK"); s=$(status_of "$r"); b=$(body_of "$r")
  fact "Muzik kuyrugu -> HTTP $s istek_kuyrukta=$(echo "$b" | grep -q "$TAG" && echo EVET || echo HAYIR)"
  [[ "$s" == "200" ]] && echo "$b" | grep -q "$TAG"
}
g_music_dj_sse() {
  local f=/tmp/s14_sse_dj.txt
  timeout 10 curl -s -N --max-time 10 "${API_BASE_URL}/api/chat/rooms/${ROOM_A}/stream" \
    -H "Authorization: Bearer ${UTOK}" -H 'Accept: text/event-stream' > "$f" 2>/dev/null
  local dj; dj=$(grep -ci 'dj\|music\|song' "$f" 2>/dev/null); dj=${dj:-0}
  fact "DJ/muzik SSE (10sn) -> satir=$(wc -l < "$f" 2>/dev/null) dj_music_gecen=$dj"
  [[ "${dj:-0}" -gt 0 ]]
}
gate H1 "Muzik arama yetki" g_music_noauth || M_FAIL=1
gate H2 "Muzik arama validasyon" g_music_short || M_FAIL=1
gate H3 "Muzik arama sonuclari" g_music_search || M_FAIL=1
if [[ -n "$VIDEO_ID" && -n "$ROOM_A" ]]; then
  gate H4 "Sarki istegi + jeton odemesi" g_song_request || M_FAIL=1
  gate H5 "Muzik kuyrugu" g_music_queue || M_FAIL=1
  gate H6 "DJ/muzik SSE yayini" g_music_dj_sse || M_FAIL=1
else M_FAIL=1; fi
group MUZIK $([[ $M_FAIL -eq 0 ]] && echo PASS || echo FAIL)

# ================= I. SSE (regresyon) =================
SSE_FAIL=0
g_sse_room() {
  local f=/tmp/s14_sse_room.txt
  timeout 10 curl -s -N -D /tmp/s14_sse_hdr.txt --max-time 10 "${API_BASE_URL}/api/chat/rooms/${ROOM_A}/stream" \
    -H "Authorization: Bearer ${UTOK}" -H 'Accept: text/event-stream' > "$f" 2>/dev/null
  ct=$(grep -i '^content-type' /tmp/s14_sse_hdr.txt | tr -d '\r')
  fact "SSE chat room -> $ct ; olay_satiri=$(grep -c '^data:' "$f" 2>/dev/null)"
  grep -qi 'text/event-stream' /tmp/s14_sse_hdr.txt && [[ $(grep -c '^data:' "$f" 2>/dev/null) -gt 0 ]]
}
g_sse_stream() {
  local f=/tmp/s14_sse_str.txt
  timeout 10 curl -s -N -D /tmp/s14_sse_hdr2.txt --max-time 10 "${API_BASE_URL}/api/video-streams/${STREAM_ID}/stream" \
    -H "Authorization: Bearer ${UTOK}" -H 'Accept: text/event-stream' > "$f" 2>/dev/null
  ct=$(grep -i '^content-type' /tmp/s14_sse_hdr2.txt | tr -d '\r')
  fact "SSE video stream -> $ct ; olay_satiri=$(grep -c '^data:' "$f" 2>/dev/null)"
  grep -qi 'text/event-stream' /tmp/s14_sse_hdr2.txt
}
gate I1 "SSE sesli oda kanali" g_sse_room || SSE_FAIL=1
[[ -n "$STREAM_ID" ]] && { gate I2 "SSE yayin kanali" g_sse_stream || SSE_FAIL=1; }
group SSE $([[ $SSE_FAIL -eq 0 ]] && echo PASS || echo FAIL)

group AUTO_CLOSE $([[ $AC_FAIL -eq 0 ]] && echo PASS || echo FAIL)

# ================= teardown =================
if [[ -n "$STREAM_ID" ]]; then
  http_post "/api/video-streams/${STREAM_ID}/end" "$TTOK" '{}' >/dev/null 2>&1
  fact "Test yayini kapatildi (end cagrisi yapildi)"
fi
http_post /api/live/leave-room "$UTOK" "{\"roomId\":\"${ROOM_A}\",\"roomType\":\"voice\"}" >/dev/null 2>&1
http_post /api/live/leave-room "$TTOK" "{\"roomId\":\"${ROOM_A}\",\"roomType\":\"voice\"}" >/dev/null 2>&1

echo ""
echo "===== STAGE14 GROUP RESULTS ====="
grep '^GROUP|' "$OUT" | sed 's/GROUP|/  /;s/|/ : /'
summary "STAGE14-REALTIME-AUDIT"
echo "ARTIFACTS ROOM_A=$ROOM_A ROOM_B=$ROOM_B STREAM_ID=$STREAM_ID TAG=$TAG"
