#!/usr/bin/env bash
# Odaya giris/cikis bildirimi. SSE varligi bu kayda bagli.
set -euo pipefail
BASE=${BASE:-https://canlifal.com}
curl -sS -X POST "$BASE/api/chat/rooms/$ROOM_ID/presence" -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
# Cikista MUTLAKA:
# curl -sS -X DELETE "$BASE/api/chat/rooms/$ROOM_ID/presence" -H "Authorization: Bearer $ACCESS_TOKEN"
