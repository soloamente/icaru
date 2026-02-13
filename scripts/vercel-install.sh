#!/usr/bin/env bash
# Vercel install: if MOTION_TOKEN is set, download motion-plus tarball so
# "file:./scripts/motion-plus.tgz" in package.json can be resolved, then run bun install.
# The tarball is gitignored, so on Vercel we must fetch it before install.
# In Vercel: set MOTION_TOKEN in project Environment Variables (see README).
set -e
MOTION_VERSION="${MOTION_PLUS_VERSION:-2.8.0}"
if [ -n "${MOTION_TOKEN:-}" ]; then
  echo "Fetching motion-plus@${MOTION_VERSION}..."
  mkdir -p scripts
  curl -fsSL -o scripts/motion-plus.tgz \
    "https://api.motion.dev/registry.tgz?package=motion-plus&version=${MOTION_VERSION}&token=${MOTION_TOKEN}"
  echo "motion-plus tarball ready."
else
  echo "MOTION_TOKEN not set; motion-plus will not be available (build may fail if app uses it)."
fi
bun install
