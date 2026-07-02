#!/bin/bash
# Metro remote debug tunnel via frp-over-SSH
# Auto-recovers from SSH drops, frpc failures, and network flaps.
set -e

SSH_KEY="/Users/lanx/.ssh/snail_staging"
SERVER="root@8.135.58.90"
SSH_PORT_FWD="14443:127.0.0.1:4443"

cleanup() {
    echo "$(date): cleaning up child processes"
    kill $SSH_PID $FRPC_PID 2>/dev/null
    wait $SSH_PID $FRPC_PID 2>/dev/null
    echo "$(date): tunnel exited"
    exit 0
}
trap cleanup EXIT INT TERM

# ── SSH auto-reconnect loop ──
(
  while true; do
    echo "$(date): starting SSH tunnel (L 127.0.0.1:${SSH_PORT_FWD})"
    ssh -i "$SSH_KEY" \
        -L "$SSH_PORT_FWD" \
        -N \
        -C \
        -c aes128-gcm@openssh.com \
        -o ServerAliveInterval=15 \
        -o ServerAliveCountMax=2 \
        -o ExitOnForwardFailure=yes \
        -o StrictHostKeyChecking=accept-new \
        -o ConnectTimeout=10 \
        -o ConnectionAttempts=3 \
        "$SERVER" 2>&1
    echo "$(date): SSH tunnel died, restarting in 2s..."
    sleep 2
  done
) &
SSH_PID=$!

# ── Wait for SSH tunnel to be ready before starting frpc ──
echo "$(date): waiting for SSH tunnel port 14443..."
for i in $(seq 1 20); do
  if nc -z 127.0.0.1 14443 2>/dev/null; then
    echo "$(date): SSH tunnel ready (attempt $i)"
    break
  fi
  if [ $i -eq 20 ]; then
    echo "$(date): SSH tunnel failed to come up after 20 attempts, exiting"
    exit 1
  fi
  sleep 1
done

# ── frpc with restart loop ──
(
  while true; do
    echo "$(date): starting frpc"
    /Users/lanx/bin/frpc -c /Users/lanx/.config/frp/frpc.toml 2>&1
    echo "$(date): frpc died, restarting in 3s..."
    sleep 3
  done
) &
FRPC_PID=$!

echo "$(date): tunnel fully up — SSH=${SSH_PID} frpc=${FRPC_PID}"

# ── Health monitor: if either child dies, exit to trigger launchd restart ──
while kill -0 $SSH_PID 2>/dev/null && kill -0 $FRPC_PID 2>/dev/null; do
  sleep 5
done

echo "$(date): a child process died, exiting for launchd restart"
exit 0
