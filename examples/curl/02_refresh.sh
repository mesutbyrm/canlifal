#!/usr/bin/env bash
set -euo pipefail
BASE=${BASE:-https://canlifal.com}
curl -sS -X POST "$BASE/api/auth/mobile-refresh" \
  -H 'Content-Type: application/json' \
  -d '{"refreshToken":"'"$REFRESH_TOKEN"'"}' | jq .
# accessToken 7 gun, refreshToken 30 gun (lib/mobile-auth.ts:8-9)
# Ayni refreshToken 15 sn icinde tekrar gelirse ayni yanit doner (dedupe).
