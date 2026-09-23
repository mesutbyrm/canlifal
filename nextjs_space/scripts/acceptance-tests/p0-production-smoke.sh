#!/usr/bin/env bash
# P0 PRODUCTION SMOKE — 25 critical endpoints on the live site.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_common.sh
source "${SCRIPT_DIR}/_common.sh"

USER_EMAIL="${ACCEPTANCE_USER_EMAIL:-}"
USER_PASSWORD="${ACCEPTANCE_USER_PASSWORD:-}"
LOGIN_RESPONSE=""
USER_TOKEN=""

# public_ok <path>
public_ok() {
  local path="$1" r s b ct
  r=$(http_get "$path")
  s=$(status_of "$r"); b=$(body_of "$r")
  ct=$(curl -s -o /dev/null --max-time 40 -w '%{content_type}' "${API_BASE_URL}${path}")
  echo "  GET ${path} → ${s} ${ct} (${#b} bytes)"
  # A 200 that renders HTML is NOT a working API endpoint — reject it.
  [[ "$s" == "200" && "$ct" == *json* ]]
}

auth_ok() {
  local path="$1" r s b
  if [[ -z "$USER_TOKEN" ]]; then echo "  no token"; return 1; fi
  r=$(http_get "$path" "$USER_TOKEN")
  s=$(status_of "$r"); b=$(body_of "$r")
  echo "  GET ${path} (JWT) → ${s} (${#b} bytes)"
  [[ "$s" == "200" ]]
}

p1()  { public_ok /api/announcements; }
p2()  { public_ok /api/warmup; }
p3()  { public_ok /api/mobile/config; }
p4()  { public_ok /api/credit-packages; }
p5()  { public_ok /api/memberships; }
p6()  { public_ok /api/memberships/packages; }
p7()  { public_ok /api/fortune-request-types; }
p8()  { public_ok /api/gifts/types; }
p9()  { public_ok /api/gift-engine/gifts; }
p10() { public_ok /api/blog; }
p11() { public_ok /api/homepage-buttons; }
p12() { public_ok /api/homepage-fortune-cards; }
p13() { public_ok /api/public-stats; }
p14() { public_ok /api/public/jeton-price; }
p15() { public_ok /api/payments/methods; }
p16() { public_ok /api/translations; }
p17() { public_ok /api/users/online; }
p18() { public_ok /api/chat/rooms; }
p19() { public_ok /api/video-streams; }
p20() { public_ok /api/dreams; }

p21_login() {
  LOGIN_RESPONSE=$(login "$USER_EMAIL" "$USER_PASSWORD")
  USER_TOKEN=$(extract_json_field "$LOGIN_RESPONSE" accessToken)
  echo "  POST /api/auth/mobile-login → token: $([[ -n "$USER_TOKEN" ]] && echo acquired || echo missing)"
  [[ -n "$USER_TOKEN" ]]
}

p22() { auth_ok /api/me; }
p23() { auth_ok /api/wallet; }
p24() { auth_ok /api/notifications; }

p25_refresh() {
  local rt r s b
  rt=$(extract_json_field "$LOGIN_RESPONSE" refreshToken)
  if [[ -z "$rt" ]]; then echo "  no refresh token"; return 1; fi
  r=$(curl -s -w '\n%{http_code}' --max-time 40 -X POST "${API_BASE_URL}/api/auth/mobile-refresh" \
    -H "Content-Type: application/json" -d "{\"refreshToken\":\"${rt}\"}")
  s=$(status_of "$r"); b=$(body_of "$r")
  echo "  POST /api/auth/mobile-refresh → ${s}"
  [[ "$s" == "200" ]] && [[ -n "$(extract_json_field "$b" accessToken)" ]]
}

if [[ -z "$USER_EMAIL" || -z "$USER_PASSWORD" ]]; then
  red "ACCEPTANCE_USER_EMAIL / ACCEPTANCE_USER_PASSWORD required"; exit 2
fi

echo "============================================================"
echo "CanlıFal P0 PRODUCTION SMOKE (25 endpoints)"
echo "Target: ${API_BASE_URL}"
echo "Time:   $(date -u +'%Y-%m-%d %H:%M:%S UTC')"
echo "============================================================"

run_gate 1  "/api/announcements"             p1
run_gate 2  "/api/warmup"                    p2
run_gate 3  "/api/mobile/config"             p3
run_gate 4  "/api/credit-packages"           p4
run_gate 5  "/api/memberships"               p5
run_gate 6  "/api/memberships/packages"      p6
run_gate 7  "/api/fortune-request-types"     p7
run_gate 8  "/api/gifts/types"               p8
run_gate 9  "/api/gift-engine/gifts"         p9
run_gate 10 "/api/blog"                      p10
run_gate 11 "/api/homepage-buttons"          p11
run_gate 12 "/api/homepage-fortune-cards"    p12
run_gate 13 "/api/public-stats"              p13
run_gate 14 "/api/public/jeton-price"        p14
run_gate 15 "/api/payments/methods"          p15
run_gate 16 "/api/translations"              p16
run_gate 17 "/api/users/online"              p17
run_gate 18 "/api/chat/rooms"                p18
run_gate 19 "/api/video-streams"             p19
run_gate 20 "/api/dreams"                    p20
run_gate 21 "mobile-login"                   p21_login
run_gate 22 "/api/me (JWT)"                  p22
run_gate 23 "/api/wallet (JWT)"              p23
run_gate 24 "/api/notifications (JWT)"       p24
run_gate 25 "mobile-refresh"                 p25_refresh

summary "P0_SMOKE"
exit $FAILED
