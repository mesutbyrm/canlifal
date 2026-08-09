#!/usr/bin/env bash
# Shared helpers for CanlıFal acceptance test scripts.
# Mirrors the structure of api-release-gate.sh (no token/secret echoing).

API_BASE_URL="${API_BASE_URL:-https://canlifal.com}"

PASSED=0
FAILED=0
TOTAL=0

green() { printf '\033[0;32m%s\033[0m\n' "$1"; }
red()   { printf '\033[0;31m%s\033[0m\n' "$1"; }
yellow(){ printf '\033[0;33m%s\033[0m\n' "$1"; }

# run_gate <num> <description> <function-name>
run_gate() {
  local num="$1" desc="$2" fn="$3"
  TOTAL=$((TOTAL + 1))
  echo ""
  echo "── [$num] $desc ──"
  if "$fn"; then
    PASSED=$((PASSED + 1))
    green "  PASS"
  else
    FAILED=$((FAILED + 1))
    red   "  FAIL"
  fi
}

# extract_json_field <json> <field>  -> string value
extract_json_field() {
  echo "$1" | grep -o "\"$2\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" | head -1 | sed 's/.*:[[:space:]]*"//;s/"$//'
}

# extract_json_number <json> <field> -> numeric value
extract_json_number() {
  echo "$1" | grep -o "\"$2\"[[:space:]]*:[[:space:]]*-\?[0-9][0-9.]*" | head -1 | sed 's/.*:[[:space:]]*//'
}

# json_has_key <json> <key>
json_has_key() {
  echo "$1" | grep -q "\"$2\"[[:space:]]*:"
}

# http_get <path> [auth-header-value]
http_get() {
  local path="$1" token="${2:-}"
  if [[ -n "$token" ]]; then
    curl -s -w '\n%{http_code}' --max-time 40 "${API_BASE_URL}${path}" -H "Authorization: Bearer ${token}"
  else
    curl -s -w '\n%{http_code}' --max-time 40 "${API_BASE_URL}${path}"
  fi
}

body_of()   { echo "$1" | sed '$d'; }
status_of() { echo "$1" | tail -1; }

# login <email> <password> -> prints full response JSON
login() {
  curl -s --max-time 40 -X POST "${API_BASE_URL}/api/auth/mobile-login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"$2\"}"
}

summary() {
  local label="$1"
  echo ""
  echo "============================================================"
  if [[ $FAILED -eq 0 ]]; then
    green "${label}: ALL ${TOTAL} TESTS PASSED"
  else
    red "${label}: ${PASSED} PASSED / ${FAILED} FAILED (of ${TOTAL})"
  fi
  echo "RESULT_LINE ${label} ${PASSED}/${TOTAL} FAILED=${FAILED}"
  echo "============================================================"
}
