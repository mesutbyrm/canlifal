#!/usr/bin/env bash
set -euo pipefail
BASE=${BASE:-https://canlifal.com}
curl -sS "$BASE/api/chat/rooms" -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.data | length'
curl -sS "$BASE/api/chat/rooms/$ROOM_ID" -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
