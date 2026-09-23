#!/usr/bin/env bash
# API ACCEPTANCE — 17 contract tests against production.
# Covers: authentication, unauthorized responses, valid requests,
# invalid requests, validation, 404 behaviour, duplicate behaviour,
# error mapping, response schema, database-backed operations.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_common.sh
source "${SCRIPT_DIR}/_common.sh"

USER_EMAIL="${ACCEPTANCE_USER_EMAIL:-}"
USER_PASSWORD="${ACCEPTANCE_USER_PASSWORD:-}"
STREAM_ID="${ACCEPTANCE_STREAM_ID:-}"
TYPE_ID="${ACCEPTANCE_FORTUNE_TYPE_ID:-tek-soru}"

LOGIN_RESPONSE=""
USER_TOKEN=""
CREATED_ID=""

helper() {
  ( cd "${SCRIPT_DIR}/../.." && node "scripts/acceptance-tests/test-account-helper.js" "$@" )
}

post_fr() {
  local sid="$1" body="$2" mode="${3:-auth}"
  if [[ "$mode" == "noauth" ]]; then
    curl -s -w '\n%{http_code}' --max-time 40 -X POST \
      "${API_BASE_URL}/api/video-streams/${sid}/fortune-requests" \
      -H "Content-Type: application/json" --data-binary "$body"
  else
    curl -s -w '\n%{http_code}' --max-time 40 -X POST \
      "${API_BASE_URL}/api/video-streams/${sid}/fortune-requests" \
      -H "Authorization: Bearer ${USER_TOKEN}" \
      -H "Content-Type: application/json" --data-binary "$body"
  fi
}

# 1 — AUTHENTICATION: valid credentials issue an access token
t1_login() {
  LOGIN_RESPONSE=$(login "$USER_EMAIL" "$USER_PASSWORD")
  USER_TOKEN=$(extract_json_field "$LOGIN_RESPONSE" accessToken)
  echo "  POST /api/auth/mobile-login → token acquired: $([[ -n "$USER_TOKEN" ]] && echo yes || echo no)"
  [[ -n "$USER_TOKEN" ]]
}

# 2 — AUTHENTICATION: refresh token is also issued
t2_refresh_token_issued() {
  local rt
  rt=$(extract_json_field "$LOGIN_RESPONSE" refreshToken)
  echo "  refreshToken present: $([[ -n "$rt" ]] && echo yes || echo no)"
  [[ -n "$rt" ]]
}

# 3 — UNAUTHORIZED: wrong password is rejected
t3_wrong_password() {
  local r s
  r=$(curl -s -w '\n%{http_code}' --max-time 40 -X POST "${API_BASE_URL}/api/auth/mobile-login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${USER_EMAIL}\",\"password\":\"definitely-not-the-password\"}")
  s=$(status_of "$r")
  echo "  wrong password → $s"
  [[ "$s" == "401" ]]
}

# 4 — UNAUTHORIZED: protected endpoint without token
t4_me_no_token() {
  local r s
  r=$(http_get "/api/me")
  s=$(status_of "$r")
  echo "  GET /api/me (no token) → $s"
  [[ "$s" == "401" ]]
}

# 5 — UNAUTHORIZED: protected endpoint with malformed token
t5_wallet_bad_token() {
  local r s
  r=$(http_get "/api/wallet" "not-a-real-jwt")
  s=$(status_of "$r")
  echo "  GET /api/wallet (bad token) → $s"
  [[ "$s" == "401" ]]
}

# 6 — VALID REQUEST + RESPONSE SCHEMA: /api/me
t6_me_schema() {
  local r s b
  r=$(http_get "/api/me" "$USER_TOKEN")
  s=$(status_of "$r"); b=$(body_of "$r")
  echo "  GET /api/me → $s"
  [[ "$s" == "200" ]] && json_has_key "$b" id && json_has_key "$b" email
}

# 7 — VALID REQUEST + RESPONSE SCHEMA: /api/wallet exposes a balance
t7_wallet_schema() {
  local r s b
  r=$(http_get "/api/wallet" "$USER_TOKEN")
  s=$(status_of "$r"); b=$(body_of "$r")
  echo "  GET /api/wallet → $s"
  [[ "$s" == "200" ]] && ( json_has_key "$b" balance || json_has_key "$b" jetonBalance )
}

# 8 — VALID REQUEST: public catalogue endpoint returns data
t8_fortune_types() {
  local r s b
  r=$(http_get "/api/fortune-request-types")
  s=$(status_of "$r"); b=$(body_of "$r")
  echo "  GET /api/fortune-request-types → $s (${#b} bytes)"
  [[ "$s" == "200" ]] && [[ ${#b} -gt 2 ]]
}

# 9 — INVALID REQUEST: malformed JSON body
t9_malformed_body() {
  local r s b
  r=$(post_fr "$STREAM_ID" '{"typeId":')
  s=$(status_of "$r"); b=$(body_of "$r")
  echo "  malformed JSON → $s / $b"
  [[ "$s" == "400" ]] && [[ "$(extract_json_field "$b" code)" == "INVALID_BODY" ]]
}

# 10 — VALIDATION: required field missing
t10_missing_required() {
  local r s b
  r=$(post_fr "$STREAM_ID" '{}')
  s=$(status_of "$r"); b=$(body_of "$r")
  echo "  missing typeId → $s / $b"
  [[ "$s" == "400" ]] && [[ "$(extract_json_field "$b" code)" == "INVALID_BODY" ]]
}

# 11 — VALIDATION: wrong JSON root type (array instead of object)
t11_array_body() {
  local r s b
  r=$(post_fr "$STREAM_ID" '[1,2,3]')
  s=$(status_of "$r"); b=$(body_of "$r")
  echo "  array body → $s / $b"
  [[ "$s" == "400" ]] && [[ "$(extract_json_field "$b" code)" == "INVALID_BODY" ]]
}

# 12 — 404 BEHAVIOUR: unknown stream id on a nested resource
t12_unknown_stream() {
  local r s b
  r=$(post_fr "acceptance-unknown-stream" "{\"typeId\":\"${TYPE_ID}\"}")
  s=$(status_of "$r"); b=$(body_of "$r")
  echo "  unknown stream → $s / $b"
  [[ "$s" == "404" ]] && [[ "$(extract_json_field "$b" code)" == "STREAM_NOT_FOUND" ]]
}

# 13 — 404 BEHAVIOUR: unknown route returns 404, never 200
t13_unknown_route() {
  local r s
  r=$(http_get "/api/this-route-does-not-exist-acceptance")
  s=$(status_of "$r")
  echo "  unknown route → $s"
  [[ "$s" == "404" ]]
}

# 14 — ERROR MAPPING: insufficient balance is a typed 400
t14_error_mapping_balance() {
  echo "  helper: $(helper clear)"
  echo "  helper: $(helper zero)"
  local r s b
  r=$(post_fr "$STREAM_ID" "{\"typeId\":\"${TYPE_ID}\",\"nickname\":\"AcceptBal\"}")
  s=$(status_of "$r"); b=$(body_of "$r")
  echo "  zero balance → $s / $b"
  [[ "$s" == "400" ]] \
    && [[ "$(extract_json_field "$b" code)" == "INSUFFICIENT_BALANCE" ]] \
    && [[ -n "$(extract_json_number "$b" required)" ]] \
    && [[ -n "$(extract_json_number "$b" current)" ]]
}

# 15 — DATABASE-BACKED WRITE: record is created and persisted
t15_db_write() {
  echo "  helper: $(helper fund 500)"
  local r s b
  r=$(post_fr "$STREAM_ID" "{\"typeId\":\"${TYPE_ID}\",\"nickname\":\"AcceptWrite\",\"question\":\"acceptance write\"}")
  s=$(status_of "$r"); b=$(body_of "$r")
  CREATED_ID=$(extract_json_field "$b" id)
  echo "  create → $s / $b"
  local after
  after=$(helper show)
  echo "  db state: $after"
  [[ "$s" == "200" ]] && [[ -n "$CREATED_ID" ]] \
    && [[ "$(extract_json_number "$after" fortuneRequests)" -ge 1 ]]
}

# 16 — DUPLICATE BEHAVIOUR: second pending request is rejected with 409
t16_duplicate() {
  local r s b
  r=$(post_fr "$STREAM_ID" "{\"typeId\":\"${TYPE_ID}\",\"nickname\":\"AcceptDup\"}")
  s=$(status_of "$r"); b=$(body_of "$r")
  echo "  duplicate → $s / $b"
  [[ "$s" == "409" ]] && [[ "$(extract_json_field "$b" code)" == "DUPLICATE_REQUEST" ]]
}

# 17 — DATABASE-BACKED SESSION: refresh token exchange issues a new access token
t17_refresh_exchange() {
  local rt r s b
  rt=$(extract_json_field "$LOGIN_RESPONSE" refreshToken)
  r=$(curl -s -w '\n%{http_code}' --max-time 40 -X POST "${API_BASE_URL}/api/auth/mobile-refresh" \
    -H "Content-Type: application/json" -d "{\"refreshToken\":\"${rt}\"}")
  s=$(status_of "$r"); b=$(body_of "$r")
  echo "  POST /api/auth/mobile-refresh → $s"
  [[ "$s" == "200" ]] && [[ -n "$(extract_json_field "$b" accessToken)" ]]
}

if [[ -z "$USER_EMAIL" || -z "$USER_PASSWORD" || -z "$STREAM_ID" ]]; then
  red "ACCEPTANCE_USER_EMAIL, ACCEPTANCE_USER_PASSWORD and ACCEPTANCE_STREAM_ID are required"
  exit 2
fi

echo "============================================================"
echo "CanlıFal API ACCEPTANCE (17 tests)"
echo "Target: ${API_BASE_URL}"
echo "Time:   $(date -u +'%Y-%m-%d %H:%M:%S UTC')"
echo "============================================================"

run_gate 1  "AUTH – login issues access token"        t1_login
run_gate 2  "AUTH – login issues refresh token"       t2_refresh_token_issued
run_gate 3  "UNAUTHORIZED – wrong password"           t3_wrong_password
run_gate 4  "UNAUTHORIZED – no token"                 t4_me_no_token
run_gate 5  "UNAUTHORIZED – malformed token"          t5_wallet_bad_token
run_gate 6  "VALID – /api/me schema"                  t6_me_schema
run_gate 7  "VALID – /api/wallet schema"              t7_wallet_schema
run_gate 8  "VALID – public catalogue"                t8_fortune_types
run_gate 9  "INVALID – malformed JSON"                t9_malformed_body
run_gate 10 "VALIDATION – required field"             t10_missing_required
run_gate 11 "VALIDATION – wrong root type"            t11_array_body
run_gate 12 "404 – unknown nested resource"           t12_unknown_stream
run_gate 13 "404 – unknown route"                     t13_unknown_route
run_gate 14 "ERROR MAPPING – insufficient balance"    t14_error_mapping_balance
run_gate 15 "DB – persisted write"                    t15_db_write
run_gate 16 "DUPLICATE – 409"                         t16_duplicate
run_gate 17 "DB – refresh token exchange"             t17_refresh_exchange

echo ""
echo "Cleanup: $(helper clear)"
echo "Cleanup: $(helper zero)"

summary "API_ACCEPTANCE"
exit $FAILED
