#!/usr/bin/env bash
# TRTC UserSig uretimi. sdkAppId sunucu tarafinda env'den okunur (TRTC_SDK_APP_ID).
set -euo pipefail
BASE=${BASE:-https://canlifal.com}
curl -sS "$BASE/api/trtc/usersig" -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
# Yanittaki sdkAppId istemcide TRTCCloud.enterRoom ile birebir ayni olmali.
# TRTC yapilandirilmamissa: 503 TRTC_NOT_CONFIGURED
