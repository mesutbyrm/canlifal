#!/usr/bin/env bash
set -euo pipefail
BASE=${BASE:-https://canlifal.com}
curl -sS "$BASE/api/gifts/types" | jq '.data | length'
# Gonderim (gercek jeton harcar - uretimde calistirmayin):
# curl -sS -X POST "$BASE/api/gifts/send" -H "Authorization: Bearer $ACCESS_TOKEN" \
#   -H 'Content-Type: application/json' \
#   -d '{"giftId":"...","receiverId":"...","roomId":"...","quantity":1}'
# Rate limit: gift_send 10/dk
