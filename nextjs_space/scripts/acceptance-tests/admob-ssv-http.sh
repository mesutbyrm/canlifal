#!/usr/bin/env bash
# AdMob SSV ucunun HTTP davranış testi (imza doğrulaması yolu).
#
#   BASE_URL=http://localhost:3000 bash scripts/acceptance-tests/admob-ssv-http.sh
#
# NOT: Geçerli imza testi yalnızca Google'ın özel anahtarıyla mümkün olduğundan
# burada YALNIZCA imzasız yoklama (200) ve geçersiz imza (403) kontrol edilir.
# İmza mantığının kendisi scripts/acceptance-tests/admob-ssv.ts ile test edilir.
# Bu betik VERİTABANINA YAZMAZ: iki senaryo da ödül yoluna girmez.
set -u
BASE_URL="${BASE_URL:-http://localhost:3000}"
EP="$BASE_URL/api/ads/ssv/admob"
fail=0

expect() { # name url expected
  code=$(curl -s -o /dev/null -w '%{http_code}' "$2")
  if [ "$code" = "$3" ]; then echo "PASS  $1 ($code)"; else echo "FAIL  $1 — beklenen $3, gelen $code"; fail=1; fi
}

expect "imzasız yoklama 200 (AdMob 'URL'yi doğrula')" "$EP" 200
expect "geçersiz imza 403" \
  "$EP?ad_network=1&ad_unit=8698346072&reward_amount=5&reward_item=credits&timestamp=1759500000000&transaction_id=bogus-tx-$RANDOM&user_id=bogus-user&signature=Zm9vYmFy&key_id=3335741209" 403
expect "bilinmeyen key_id 403" \
  "$EP?ad_network=1&ad_unit=8698346072&reward_amount=5&reward_item=credits&timestamp=1759500000000&transaction_id=bogus-tx-$RANDOM&user_id=bogus-user&signature=Zm9vYmFy&key_id=0" 403

exit $fail
