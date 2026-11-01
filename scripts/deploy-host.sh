#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
docker info >/dev/null
docker build -f Dockerfile.sandbox -t kd-runtime:local .
if [ -n "$(docker compose --env-file deploy/.env -f deploy/compose.yml ps --status running -q app)" ]; then
 docker compose --env-file deploy/.env -f deploy/compose.yml exec -T app node --input-type=module -e "import {backupPlatform} from './storage.mjs';await backupPlatform(new URL('file:///app/data/'),'/app/data/before-deploy-'+Date.now()+'.sqlite')"
fi
docker compose --env-file deploy/.env -f deploy/compose.yml up --build -d --remove-orphans
