#!/usr/bin/env bash
# Mobil giris -> accessToken + refreshToken
set -euo pipefail
BASE=${BASE:-https://canlifal.com}
curl -sS -X POST "$BASE/api/auth/mobile-login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"'"$EMAIL"'","password":"'"$PASSWORD"'"}' | jq .
# NOT: EMAIL / PASSWORD ortam degiskeni olarak verilir, dosyaya yazilmaz.
