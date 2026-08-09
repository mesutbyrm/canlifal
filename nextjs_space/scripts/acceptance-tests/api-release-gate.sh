#!/usr/bin/env bash
# ============================================================
echo "DEBUG: API_BASE_URL=${API_BASE_URL:-EMPTY}"
echo "DEBUG: USER_EMAIL=${ACCEPTANCE_USER_EMAIL:-EMPTY}"
echo "DEBUG: ADMIN_EMAIL=${ACCEPTANCE_ADMIN_EMAIL:-EMPTY}"
# CanlıFal – API Release Gate (Acceptance Tests)
# ============================================================
# Runs against the live deployment before merging to main.
#
# Required GitHub Secrets / env vars:
#   ACCEPTANCE_USER_EMAIL        (e.g. mesutbyrm1+user@gmail.com)
#   ACCEPTANCE_USER_PASSWORD     (e.g. Test1234!)
#   ACCEPTANCE_ADMIN_EMAIL       (e.g. mesutbyrm1+admin@gmail.com)
#   ACCEPTANCE_ADMIN_PASSWORD    (e.g. Test1234!)
#   ACCEPTANCE_TELLER_EMAIL      (e.g. mesutbyrm1+teller@gmail.com)
#   ACCEPTANCE_TELLER_PASSWORD   (e.g. Test1234!)
#   API_BASE_URL                 (default: https://canlifal.com)
# ============================================================
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-https://canlifal.com}"
PASSED=0
FAILED=0
TOTAL=0

# ── helpers ──────────────────────────────────────────────────
green()  { printf '\033[0;32m%s\033[0m\n' "$*"; }
red()    { printf '\033[0;31m%s\033[0m\n' "$*"; }
yellow() { printf '\033[0;33m%s\033[0m\n' "$*"; }

run_gate() {
  local gate_num="$1" desc="$2"
  shift 2
  TOTAL=$((TOTAL + 1))
  printf '\n── Gate %s: %s ──\n' "$gate_num" "$desc"
  if "$@"; then
    green "  ✅ PASSED"
    PASSED=$((PASSED + 1))
  else
    red   "  ❌ FAILED"
    FAILED=$((FAILED + 1))
  fi
}

extract_json_field() {
  # Usage: extract_json_field <json_string> <field_name>
  # grep -o can fail (exit 1) under set -e if no match, so use || true
  local match
  match=$(echo "$1" | grep -o "\"$2\":\"[^\"]*\"" 2>/dev/null | head -1) || true
  if [[ -n "$match" ]]; then
    echo "$match" | cut -d'"' -f4
  fi
}

extract_json_number() {
  local match
  match=$(echo "$1" | grep -o "\"$2\":[0-9]*" 2>/dev/null | head -1) || true
  if [[ -n "$match" ]]; then
    echo "$match" | cut -d':' -f2
  fi
}

# ── Gate 1: Health check ─────────────────────────────────────
gate_1_health() {
  local status
  status=$(curl -s -o /dev/null -w '%{http_code}' "${API_BASE_URL}/")
  echo "  HTTP status: $status"
  [[ "$status" == "200" ]]
}

# ── Gate 2: Public endpoints return 200 ──────────────────────
gate_2_public() {
  local endpoints=(
    "/api/credit-packages"
    "/api/payments/methods"
    "/api/fortune-tellers"
    "/api/blog"
  )
  local ok=true
  for ep in "${endpoints[@]}"; do
    local status
    status=$(curl -s -o /dev/null -w '%{http_code}' "${API_BASE_URL}${ep}")
    echo "  ${ep} → $status"
    [[ "$status" == "200" ]] || ok=false
  done
  $ok
}

# ── Gate 3: User login ───────────────────────────────────────
gate_3_user_login() {
  LOGIN_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/api/auth/mobile-login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${ACCEPTANCE_USER_EMAIL}\",\"password\":\"${ACCEPTANCE_USER_PASSWORD}\"}")

  USER_TOKEN=$(extract_json_field "$LOGIN_RESPONSE" "accessToken")
  echo "DEBUG LOGIN RESPONSE: $LOGIN_RESPONSE"
  echo "DEBUG USER TOKEN: $USER_TOKEN"

  if [[ -z "$USER_TOKEN" ]]; then
    echo "  Response: $LOGIN_RESPONSE"
    return 1
  fi

  local user_role
  user_role=$(extract_json_field "$LOGIN_RESPONSE" "role")
  echo "  Token acquired (role: ${user_role:-unknown})"
  return 0
}

# ── Gate 4: Admin login ──────────────────────────────────────
gate_4_admin_login() {
  ADMIN_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/api/auth/mobile-login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${ACCEPTANCE_ADMIN_EMAIL}\",\"password\":\"${ACCEPTANCE_ADMIN_PASSWORD}\"}")

  ADMIN_TOKEN=$(extract_json_field "$ADMIN_RESPONSE" "accessToken")
  echo "DEBUG ADMIN RESPONSE: $ADMIN_RESPONSE"
  echo "DEBUG ADMIN TOKEN: $ADMIN_TOKEN"

  if [[ -z "$ADMIN_TOKEN" ]]; then
    echo "  Response: $ADMIN_RESPONSE"
    return 1
  fi

  local admin_role
  admin_role=$(extract_json_field "$ADMIN_RESPONSE" "role")
  echo "  Token acquired (role: ${admin_role:-unknown})"
  [[ "$admin_role" == "admin" ]]
}

# ── Gate 5: Teller login ─────────────────────────────────────
gate_5_teller_login() {
  TELLER_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/api/auth/mobile-login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${ACCEPTANCE_TELLER_EMAIL}\",\"password\":\"${ACCEPTANCE_TELLER_PASSWORD}\"}")

  TELLER_TOKEN=$(extract_json_field "$TELLER_RESPONSE" "accessToken")

  if [[ -z "$TELLER_TOKEN" ]]; then
    echo "  Response: $TELLER_RESPONSE"
    return 1
  fi

  local teller_role
  teller_role=$(extract_json_field "$TELLER_RESPONSE" "role")
  echo "  Token acquired (role: ${teller_role:-unknown})"
  [[ "$teller_role" == "teller" ]]
}

# ── Gate 6: Authenticated GET /api/me ────────────────────────
gate_6_me() {
  if [[ -z "${USER_TOKEN:-}" ]]; then
    echo "  Skipped – no user token"
    return 1
  fi

  local resp status
  resp=$(curl -s -w '\n%{http_code}' "${API_BASE_URL}/api/me" \
    -H "Authorization: Bearer $USER_TOKEN")
  status=$(echo "$resp" | tail -1)
  local body
  body=$(echo "$resp" | sed '$d')

  echo "  /api/me → $status"
  [[ "$status" == "200" ]]
}

# ── Gate 7: Wallet endpoint ──────────────────────────────────
gate_7_wallet() {
  if [[ -z "${USER_TOKEN:-}" ]]; then
    echo "  Skipped – no user token"
    return 1
  fi

  local resp status
  resp=$(curl -s -w '\n%{http_code}' "${API_BASE_URL}/api/wallet" \
    -H "Authorization: Bearer $USER_TOKEN")
  status=$(echo "$resp" | tail -1)

  echo "  /api/wallet → $status"
  [[ "$status" == "200" ]]
}

# ── Gate 8: Fortune tellers list ─────────────────────────────
gate_8_fortune_tellers() {
  if [[ -z "${USER_TOKEN:-}" ]]; then
    echo "  Skipped – no user token"
    return 1
  fi

  local resp status
  resp=$(curl -s -w '\n%{http_code}' "${API_BASE_URL}/api/fortune-tellers" \
    -H "Authorization: Bearer $USER_TOKEN")
  status=$(echo "$resp" | tail -1)

  echo "  /api/fortune-tellers → $status"
  [[ "$status" == "200" ]]
}

# ── Gate 9: Notifications endpoint ───────────────────────────
gate_9_notifications() {
  if [[ -z "${USER_TOKEN:-}" ]]; then
    echo "  Skipped – no user token"
    return 1
  fi

  local resp status
  resp=$(curl -s -w '\n%{http_code}' "${API_BASE_URL}/api/notifications" \
    -H "Authorization: Bearer $USER_TOKEN")
  status=$(echo "$resp" | tail -1)

  echo "  /api/notifications → $status"
  [[ "$status" == "200" ]]
}

# ── Gate 10: Token refresh ───────────────────────────────────
gate_10_refresh() {
  local refresh_token
  refresh_token=$(extract_json_field "$LOGIN_RESPONSE" "refreshToken")

  if [[ -z "$refresh_token" ]]; then
    echo "  Skipped – no refresh token"
    return 1
  fi

  local resp status
  resp=$(curl -s -w '\n%{http_code}' -X POST "${API_BASE_URL}/api/auth/mobile-refresh" \
    -H "Content-Type: application/json" \
    -d "{\"refreshToken\":\"${refresh_token}\"}")
  status=$(echo "$resp" | tail -1)
  local body
  body=$(echo "$resp" | sed '$d')

  local new_token
  new_token=$(extract_json_field "$body" "accessToken")

  echo "  /api/auth/mobile-refresh → $status"
  [[ "$status" == "200" ]] && [[ -n "$new_token" ]]
}

# ── Gate 11: Live stream creation (teller only) ─────────────
gate_11_live_stream() {
  if [[ -z "${TELLER_TOKEN:-}" ]]; then
    echo "  Skipped – no teller token"
    return 1
  fi

  # Create a test stream
  local resp status body
  resp=$(curl -s -w '\n%{http_code}' -X POST "${API_BASE_URL}/api/video-streams" \
    -H "Authorization: Bearer $TELLER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"title":"CI Gate Test Stream","description":"Acceptance test – auto cleanup"}')
  status=$(echo "$resp" | tail -1)
  body=$(echo "$resp" | sed '$d')

  echo "  POST /api/video-streams → $status"

  if [[ "$status" != "200" ]]; then
    echo "  Response: $body"
    return 1
  fi

  # Extract stream ID and clean up (end the stream)
  local stream_id
  stream_id=$(extract_json_field "$body" "streamId")
  if [[ -z "$stream_id" ]]; then
    stream_id=$(extract_json_field "$body" "id")
  fi

  if [[ -n "$stream_id" ]]; then
    # End the test stream to avoid polluting the live list
    local cleanup_status
    cleanup_status=$(curl -s -o /dev/null -w '%{http_code}' -X PATCH "${API_BASE_URL}/api/video-streams/${stream_id}" \
      -H "Authorization: Bearer $TELLER_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"status":"ended"}')
    echo "  Cleanup: PATCH /api/video-streams/${stream_id} → $cleanup_status"
  fi

  return 0
}

# ── Run all gates ────────────────────────────────────────────
echo "============================================================"
echo "CanlıFal API Release Gate"
echo "Target: ${API_BASE_URL}"
echo "Time:   $(date -u +'%Y-%m-%d %H:%M:%S UTC')"
echo "============================================================"

run_gate 1  "Health check"            gate_1_health
run_gate 2  "Public endpoints"         gate_2_public
run_gate 3  "User login"               gate_3_user_login
run_gate 4  "Admin login"              gate_4_admin_login
run_gate 5  "Teller login"             gate_5_teller_login
run_gate 6  "GET /api/me (JWT)"        gate_6_me
run_gate 7  "GET /api/wallet (JWT)"    gate_7_wallet
run_gate 8  "Fortune tellers (JWT)"    gate_8_fortune_tellers
run_gate 9  "Notifications (JWT)"      gate_9_notifications
run_gate 10 "Token refresh"            gate_10_refresh
run_gate 11 "Live stream (teller)"     gate_11_live_stream

# ── Summary ──────────────────────────────────────────────────
echo ""
echo "============================================================"
if [[ $FAILED -eq 0 ]]; then
  green "ALL $TOTAL GATES PASSED ✅"
else
  red   "$FAILED / $TOTAL GATES FAILED ❌"
  echo  "$PASSED passed, $FAILED failed"
fi
echo "============================================================"

exit $FAILED
