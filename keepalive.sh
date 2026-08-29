#!/bin/bash
cd /home/z/my-project
while true; do
  if ! ss -tlnp | grep -q ':3000 '; then
    echo "$(date): Server down, restarting..." >> dev.log
    bun run dev >> dev.log 2>&1 &
    sleep 15
  fi
  sleep 5
done
