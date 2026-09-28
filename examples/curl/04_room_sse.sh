#!/usr/bin/env bash
# Sesli oda SSE akisini dinle (heartbeat 10 sn, veri yoklama 2 sn)
set -euo pipefail
BASE=${BASE:-https://canlifal.com}
curl -N -sS "$BASE/api/chat/rooms/$ROOM_ID/stream" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H 'Accept: text/event-stream'
# Olay tipleri: connected, messages, presence, gift, gift_box, pk, room_event, system, typing
