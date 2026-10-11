#!/usr/bin/env bash
# SSE 20-CYCLE — real Server-Sent Events endpoints on production.
#
# Endpoints under test (discovered from the repository, not guessed):
#   GET /api/notifications/stream            (auth required)
#   GET /api/video-streams/{streamId}/stream (stream existence checked)
#
# Each of the 20 tests opens its own SSE connection and closes it,
# so the run performs 20 real connect / read / close cycles.
# Covers: authentication, connection, event stream, heartbeat,
# reconnect, close, timeout.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_common.sh
source "${SCRIPT_DIR}/_common.sh"

USER_EMAIL="${ACCEPTANCE_USER_EMAIL:-}"
USER_PASSWORD="${ACCEPTANCE_USER_PASSWORD:-}"
STREAM_ID="${ACCEPTANCE_STREAM_ID:-}"

NOTIF_SSE="/api/notifications/stream"
USER_TOKEN=""

TMPDIR_SSE=$(mktemp -d)
trap 'rm -rf "$TMPDIR_SSE"' EXIT

# sse_open <path> <seconds> [token] -> writes body to $TMPDIR_SSE/body, headers to $TMPDIR_SSE/head
# echoes the HTTP status code
sse_open() {
  local path="$1" secs="$2" token="${3:-}"
  : > "$TMPDIR_SSE/body"
  : > "$TMPDIR_SSE/head"
  if [[ -n "$token" ]]; then
    curl -s -N --max-time "$secs" -D "$TMPDIR_SSE/head" -o "$TMPDIR_SSE/body" \
      -H "Accept: text/event-stream" -H "Authorization: Bearer ${token}" \
      "${API_BASE_URL}${path}" >/dev/null 2>&1 || true
  else
    curl -s -N --max-time "$secs" -D "$TMPDIR_SSE/head" -o "$TMPDIR_SSE/body" \
      -H "Accept: text/event-stream" \
      "${API_BASE_URL}${path}" >/dev/null 2>&1 || true
  fi
  head -1 "$TMPDIR_SSE/head" | awk '{print $2}'
}

head_has() { grep -qi "$1" "$TMPDIR_SSE/head"; }
body_has() { grep -q  "$1" "$TMPDIR_SSE/body"; }

# ── 1: bootstrap login (needed by the authenticated cycles) ───
bootstrap() {
  local resp
  resp=$(login "$USER_EMAIL" "$USER_PASSWORD")
  USER_TOKEN=$(extract_json_field "$resp" accessToken)
  if [[ -z "$USER_TOKEN" ]]; then
    red "Login failed — cannot run SSE suite"; exit 2
  fi
  echo "Login OK (token acquired, not printed)"
}

c1_auth_required() {
  local s; s=$(sse_open "$NOTIF_SSE" 8)
  echo "  ${NOTIF_SSE} (no token) → $s"
  [[ "$s" == "401" ]]
}

c2_bad_token() {
  local s; s=$(sse_open "$NOTIF_SSE" 8 "invalid.token.value")
  echo "  ${NOTIF_SSE} (bad token) → $s"
  [[ "$s" == "401" ]]
}

c3_connect_200() {
  local s; s=$(sse_open "$NOTIF_SSE" 6 "$USER_TOKEN")
  echo "  connect → $s"
  [[ "$s" == "200" ]]
}

c4_content_type() {
  local s; s=$(sse_open "$NOTIF_SSE" 6 "$USER_TOKEN")
  echo "  status $s / content-type: $(grep -i '^content-type' "$TMPDIR_SSE/head" | tr -d '\r')"
  [[ "$s" == "200" ]] && head_has 'content-type: *text/event-stream'
}

c5_cache_control() {
  sse_open "$NOTIF_SSE" 6 "$USER_TOKEN" >/dev/null
  echo "  cache-control: $(grep -i '^cache-control' "$TMPDIR_SSE/head" | tr -d '\r')"
  head_has 'cache-control: *no-cache'
}

# Proxy buffering must be OFF on the live domain.
#
# The origin sends `X-Accel-Buffering: no`, but that name is a directive for
# buffering reverse proxies: the proxy in front of production honours it and
# strips it from the client-facing response (verified against a probe endpoint
# where a plain custom header on the SAME response did survive). So its literal
# presence cannot be asserted from outside.
#
# This gate therefore asserts the two things that are actually observable and
# that the directive exists to guarantee:
#   a) the mirrored `X-Sse-Buffering: no` marker reaches the client, proving the
#      origin asked for unbuffered delivery and the edge passes headers through;
#   b) the first SSE frame really arrives immediately (no buffering in between).
c6_no_buffering() {
  local accel mirror ttfb out ok=0
  sse_open "$NOTIF_SSE" 6 "$USER_TOKEN" >/dev/null
  accel=$(grep -i '^x-accel-buffering' "$TMPDIR_SSE/head" | tr -d '\r')
  mirror=$(grep -i '^x-sse-buffering' "$TMPDIR_SSE/head" | tr -d '\r')
  echo "  x-accel-buffering (consumed by proxy): ${accel:-<absent>}"
  echo "  x-sse-buffering   (client visible):    ${mirror:-<absent>}"

  out=$(curl -s -N -m 8 -o "$TMPDIR_SSE/ttfb_body" -w '%{time_starttransfer}' \
        -H "Authorization: Bearer ${USER_TOKEN}" "${API_BASE_URL}${NOTIF_SSE}" || true)
  ttfb=$out
  echo "  time to first byte: ${ttfb}s"
  echo "  first frame: $(head -1 "$TMPDIR_SSE/ttfb_body" 2>/dev/null)"

  head_has 'x-sse-buffering: *no' || return 1
  grep -q '"type":"connected"' "$TMPDIR_SSE/ttfb_body" 2>/dev/null || return 1
  # A buffering proxy would withhold the first frame; unbuffered delivery is sub-second.
  ok=$(awk -v t="$ttfb" 'BEGIN{print (t+0>0 && t+0<3.0)?1:0}')
  [[ "$ok" == "1" ]]
}

c7_connected_event() {
  sse_open "$NOTIF_SSE" 6 "$USER_TOKEN" >/dev/null
  echo "  first frame: $(head -1 "$TMPDIR_SSE/body")"
  body_has '"type":"connected"'
}

c8_connected_payload() {
  sse_open "$NOTIF_SSE" 6 "$USER_TOKEN" >/dev/null
  echo "  payload: $(head -1 "$TMPDIR_SSE/body")"
  body_has '"unreadCount"'
}

c9_frame_format() {
  sse_open "$NOTIF_SSE" 6 "$USER_TOKEN" >/dev/null
  echo "  raw: $(head -2 "$TMPDIR_SSE/body" | tr '\n' '|')"
  grep -q '^data: ' "$TMPDIR_SSE/body"
}

c10_stream_sse_404() {
  local s; s=$(sse_open "/api/video-streams/sse-unknown-stream-id/stream" 8 "$USER_TOKEN")
  echo "  unknown stream SSE → $s"
  [[ "$s" == "404" ]]
}

c11_stream_sse_connect() {
  local s; s=$(sse_open "/api/video-streams/${STREAM_ID}/stream" 6 "$USER_TOKEN")
  echo "  stream SSE → $s / $(head -1 "$TMPDIR_SSE/body")"
  [[ "$s" == "200" ]] && body_has '"type":"connected"'
}

c12_stream_sse_stream_id() {
  sse_open "/api/video-streams/${STREAM_ID}/stream" 6 "$USER_TOKEN" >/dev/null
  echo "  payload: $(head -1 "$TMPDIR_SSE/body")"
  body_has "\"streamId\":\"${STREAM_ID}\""
}

c13_stream_sse_viewer_count() {
  sse_open "/api/video-streams/${STREAM_ID}/stream" 6 "$USER_TOKEN" >/dev/null
  echo "  frames: $(tr '\n' '|' < "$TMPDIR_SSE/body" | cut -c1-200)"
  body_has '"type":"viewerCount"'
}

# heartbeat is emitted every 15s → hold the connection for 20s
c14_heartbeat() {
  sse_open "$NOTIF_SSE" 20 "$USER_TOKEN" >/dev/null
  echo "  heartbeat lines: $(grep -c '^: heartbeat' "$TMPDIR_SSE/body" || true)"
  grep -q '^: heartbeat' "$TMPDIR_SSE/body"
}

# connection must stay open (no premature server close) for at least 10s
c15_timeout_hold() {
  local start end dur
  start=$(date +%s)
  sse_open "$NOTIF_SSE" 10 "$USER_TOKEN" >/dev/null
  end=$(date +%s); dur=$((end - start))
  echo "  held open for ${dur}s"
  [[ $dur -ge 9 ]]
}

# client-side close: short read must still deliver the initial frame
c16_clean_close() {
  local s; s=$(sse_open "$NOTIF_SSE" 3 "$USER_TOKEN")
  echo "  short-lived connection → $s, frames received: $(grep -c '^data: ' "$TMPDIR_SSE/body" || true)"
  [[ "$s" == "200" ]] && body_has '"type":"connected"'
}

# reconnect cycles 17–20
reconnect_cycle() {
  local n="$1" s
  s=$(sse_open "$NOTIF_SSE" 5 "$USER_TOKEN")
  echo "  reconnect #${n} → $s / $(head -1 "$TMPDIR_SSE/body")"
  [[ "$s" == "200" ]] && body_has '"type":"connected"'
}
c17() { reconnect_cycle 1; }
c18() { reconnect_cycle 2; }
c19() { reconnect_cycle 3; }
c20() { reconnect_cycle 4; }

if [[ -z "$USER_EMAIL" || -z "$USER_PASSWORD" || -z "$STREAM_ID" ]]; then
  red "ACCEPTANCE_USER_EMAIL, ACCEPTANCE_USER_PASSWORD and ACCEPTANCE_STREAM_ID are required"
  exit 2
fi

echo "============================================================"
echo "CanlıFal SSE 20-CYCLE"
echo "Target:    ${API_BASE_URL}"
echo "Endpoints: ${NOTIF_SSE} , /api/video-streams/{id}/stream"
echo "Time:      $(date -u +'%Y-%m-%d %H:%M:%S UTC')"
echo "============================================================"

bootstrap

run_gate 1  "AUTH – no token → 401"            c1_auth_required
run_gate 2  "AUTH – bad token → 401"           c2_bad_token
run_gate 3  "CONNECT – 200"                    c3_connect_200
run_gate 4  "CONNECT – text/event-stream"      c4_content_type
run_gate 5  "HEADERS – no-cache"               c5_cache_control
run_gate 6  "HEADERS – no proxy buffering"     c6_no_buffering
run_gate 7  "EVENT – connected"                c7_connected_event
run_gate 8  "EVENT – connected payload"        c8_connected_payload
run_gate 9  "EVENT – SSE frame format"         c9_frame_format
run_gate 10 "STREAM SSE – unknown id → 404"    c10_stream_sse_404
run_gate 11 "STREAM SSE – connected"           c11_stream_sse_connect
run_gate 12 "STREAM SSE – streamId echoed"     c12_stream_sse_stream_id
run_gate 13 "STREAM SSE – viewerCount event"   c13_stream_sse_viewer_count
run_gate 14 "HEARTBEAT – 15s comment frame"    c14_heartbeat
run_gate 15 "TIMEOUT – holds open 10s"         c15_timeout_hold
run_gate 16 "CLOSE – clean client close"       c16_clean_close
run_gate 17 "RECONNECT cycle 1"                c17
run_gate 18 "RECONNECT cycle 2"                c18
run_gate 19 "RECONNECT cycle 3"                c19
run_gate 20 "RECONNECT cycle 4"                c20

echo ""
echo "Each of the 20 tests above opened and closed its own SSE connection"
echo "(20 connect / read / close cycles in total)."

summary "SSE_20_CYCLE"
exit $FAILED
