#!/usr/bin/env bash
# Minimal wait-for-it: check TCP connect
host="$1"
port="$2"
shift 2
for i in `seq 1 60`; do
  (echo > /dev/tcp/$host/$port) >/dev/null 2>&1 && break
  echo "Waiting for $host:$port..."
  sleep 1
done
exec "$@"
