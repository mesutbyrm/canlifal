#!/usr/bin/env bash
# STAGE 8 — Fortune Request contract verification against production.
# 8 scenarios: UNAUTHORIZED, INVALID BODY, INVALID STREAM, BALANCE,
# VALID, SUCCESS/SCHEMA, DUPLICATE, LEGACY BODY.
# Target: 0 FAIL.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_common.sh
source "${SCRIPT_DIR}/_common.sh"

USER_EMAIL="${ACCEPTANCE_USER_EMAIL:-}"
USER_PASSWORD="${ACCEPTANCE_USER_PASSWORD:-}"
STREAM_ID="${ACCEPTANCE_STREAM_ID:-}"
TYPE_ID="${ACCEPTANCE_FORTUNE_TYPE_ID:-tek-soru}"

USER_TOKEN=""

helper() {
  ( cd "${SCRIPT_DIR}/../.." && node "scripts/acceptance-tests/test-account-helper.js" "$@" )
}

bootstrap() {
  if [[ -z "$USER_EMAIL" || -z "$USER_PASSWORD" ]]; then
    red "ACCEPTANCE_USER_EMAIL / ACCEPTANCE_USER_PASSWORD required"; exit 2
  fi
  if [[ -z "$STREAM_ID" ]]; then
    red "ACCEPTANCE_STREAM_ID required (a real live stream id)"; exit 2
  fi
  local resp
  resp=$(login "$USER_EMAIL" "$USER_PASSWORD")
  USER_TOKEN=$(extract_json_field "$resp" "accessToken")
  if [[ -z "$USER_TOKEN" ]]; then
    red "Login failed — cannot run STAGE 8"; exit 2
  fi
  echo "Login OK (token acquired, not printed)"
  echo "Pre-state: $(helper clear)"
}

post_fr() {
  # post_fr <streamId> <body> [noauth]
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

LAST_BODY=""

# ── 1: UNAUTHORIZED → 401 ───────────────────────────────────
s1_unauthorized() {
  local r s b
  r=$(post_fr "$STREAM_ID" "{\"typeId\":\"${TYPE_ID}\"}" noauth)
  s=$(status_of "$r"); b=$(body_of "$r")
  echo "  POST fortune-requests (no token) → $s"
  echo "  body: $b"
  [[ "$s" == "401" ]]
}

# ── 2: INVALID BODY (malformed JSON) → 400 INVALID_BODY ──────
s2_invalid_json() {
  local r s b
  r=$(post_fr "$STREAM_ID" '{"typeId":')
  s=$(status_of "$r"); b=$(body_of "$r")
  echo "  malformed JSON → $s"
  echo "  body: $b"
  [[ "$s" == "400" ]] && [[ "$(extract_json_field "$b" code)" == "INVALID_BODY" ]]
}

# ── 3: INVALID BODY (empty object / missing typeId) → 400 ────
s3_missing_type() {
  local r s b
  r=$(post_fr "$STREAM_ID" '{}')
  s=$(status_of "$r"); b=$(body_of "$r")
  echo "  empty object → $s"
  echo "  body: $b"
  [[ "$s" == "400" ]] && [[ "$(extract_json_field "$b" code)" == "INVALID_BODY" ]]
}

# ── 4: INVALID STREAM → 404 STREAM_NOT_FOUND ─────────────────
s4_invalid_stream() {
  local r s b
  r=$(post_fr "stage8-nonexistent-stream-id" "{\"typeId\":\"${TYPE_ID}\"}")
  s=$(status_of "$r"); b=$(body_of "$r")
  echo "  unknown streamId → $s"
  echo "  body: $b"
  [[ "$s" == "404" ]] && [[ "$(extract_json_field "$b" code)" == "STREAM_NOT_FOUND" ]]
}

# ── 5: BALANCE → 400 INSUFFICIENT_BALANCE ───────────────────
s5_balance() {
  echo "  helper: $(helper zero)"
  local r s b
  r=$(post_fr "$STREAM_ID" "{\"typeId\":\"${TYPE_ID}\",\"nickname\":\"Stage8Bal\"}")
  s=$(status_of "$r"); b=$(body_of "$r")
  echo "  zero-balance request → $s"
  echo "  body: $b"
  [[ "$s" == "400" ]] \
    && [[ "$(extract_json_field "$b" code)" == "INSUFFICIENT_BALANCE" ]] \
    && [[ -n "$(extract_json_number "$b" required)" ]] \
    && [[ -n "$(extract_json_number "$b" current)" ]]
}

# ── 6: VALID → 200 ──────────────────────────────────────
s6_valid() {
  echo "  helper: $(helper fund 500)"
  local r s b
  r=$(post_fr "$STREAM_ID" "{\"typeId\":\"${TYPE_ID}\",\"nickname\":\"Stage8Valid\",\"question\":\"stage8 valid\"}")
  s=$(status_of "$r"); b=$(body_of "$r")
  LAST_BODY="$b"
  echo "  valid request → $s"
  echo "  body: $b"
  [[ "$s" == "200" ]] && [[ -n "$(extract_json_field "$b" id)" ]]
}

# ── 7: SUCCESS response schema ─────────────────────────────
s7_success_schema() {
  local b="$LAST_BODY"
  echo "  schema check on created request"
  echo "  body: $b"
  json_has_key "$b" id \
    && [[ "$(extract_json_field "$b" typeId)" == "${TYPE_ID}" ]] \
    && [[ "$(extract_json_field "$b" status)" == "pending" ]] \
    && [[ "$(extract_json_field "$b" nickname)" == "Stage8Valid" ]] \
    && [[ -n "$(extract_json_number "$b" jetonAmount)" ]] \
    && echo "$b" | grep -q '"success"[[:space:]]*:[[:space:]]*true'
}

# ── 8a: DUPLICATE → 409 ──────────────────────────────────
s8_duplicate() {
  local r s b
  r=$(post_fr "$STREAM_ID" "{\"typeId\":\"${TYPE_ID}\",\"nickname\":\"Stage8Dup\"}")
  s=$(status_of "$r"); b=$(body_of "$r")
  echo "  duplicate pending request → $s"
  echo "  body: $b"
  [[ "$s" == "409" ]] && [[ "$(extract_json_field "$b" code)" == "DUPLICATE_REQUEST" ]]
}

# ── 8b: LEGACY BODY mapping ───────────────────────────────
s9_legacy() {
  echo "  helper: $(helper clear)"
  local r s b
  r=$(post_fr "$STREAM_ID" "{\"fortuneTypeId\":\"${TYPE_ID}\",\"displayName\":\"Stage8Legacy\",\"message\":\"legacy body\",\"anonymous\":true}")
  s=$(status_of "$r"); b=$(body_of "$r")
  echo "  legacy field body → $s"
  echo "  body: $b"
  [[ "$s" == "200" ]] \
    && [[ "$(extract_json_field "$b" typeId)" == "${TYPE_ID}" ]] \
    && [[ "$(extract_json_field "$b" nickname)" == "Stage8Legacy" ]] \
    && [[ "$(extract_json_field "$b" question)" == "legacy body" ]]
}

echo "============================================================"
echo "CanlıFal STAGE 8 — Fortune Request production contract"
echo "Target: ${API_BASE_URL}"
echo "Stream: ${STREAM_ID}   Type: ${TYPE_ID}"
echo "Time:   $(date -u +'%Y-%m-%d %H:%M:%S UTC')"
echo "============================================================"

bootstrap

run_gate 1 "UNAUTHORIZED → 401"                 s1_unauthorized
run_gate 2 "INVALID BODY (malformed) → 400"     s2_invalid_json
run_gate 3 "INVALID BODY (no typeId) → 400"     s3_missing_type
run_gate 4 "INVALID STREAM → 404"               s4_invalid_stream
run_gate 5 "BALANCE → 400 INSUFFICIENT_BALANCE" s5_balance
run_gate 6 "VALID → 200"                        s6_valid
run_gate 7 "SUCCESS response schema"            s7_success_schema
run_gate 8 "DUPLICATE → 409"                    s8_duplicate
run_gate 9 "LEGACY BODY mapping → 200"          s9_legacy

# ── cleanup: remove test rows, reset balance ─────────────────
echo ""
echo "Cleanup: $(helper clear)"
echo "Cleanup: $(helper zero)"

summary "STAGE8"
exit $FAILED
