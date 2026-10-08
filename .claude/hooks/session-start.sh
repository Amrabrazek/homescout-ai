#!/bin/bash
# Prepares a Claude Code cloud session: app dependencies + Postgres 16 with pgvector and seed data.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

(cd backend && npm install --no-audit --no-fund)
(cd frontend && npm install --no-audit --no-fund)

if [ ! -f /usr/share/postgresql/16/extension/vector.control ]; then
  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends postgresql-16-pgvector
fi

if ! pg_isready -q -h localhost -p 5432; then
  pg_ctlcluster 16 main start
  until pg_isready -q -h localhost -p 5432; do sleep 1; done
fi

su postgres -c "psql -qtAc \"SELECT 1 FROM pg_roles WHERE rolname='homescout'\"" | grep -q 1 \
  || su postgres -c "psql -qc \"CREATE ROLE homescout LOGIN SUPERUSER PASSWORD 'homescout'\""
su postgres -c "psql -qtAc \"SELECT 1 FROM pg_database WHERE datname='homescout'\"" | grep -q 1 \
  || su postgres -c "psql -qc 'CREATE DATABASE homescout OWNER homescout'"

(cd backend && DB_HOST=localhost DB_PORT=5432 npm run -s db:seed)
