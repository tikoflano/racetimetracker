#!/usr/bin/env bash
set -e
curl -sSf https://install.spacetimedb.com | sh -s -- --yes

WORKSPACE="$(cd "$(dirname "$0")/.." && pwd)"
cd "$WORKSPACE"
npm install

# Fix volume ownership so node_modules are writable by container user (not root)
for dir in node_modules client/node_modules; do
  if [ -d "$WORKSPACE/$dir" ]; then
    sudo chown -R "$(id -u):$(id -g)" "$WORKSPACE/$dir" 2>/dev/null || true
  fi
done
