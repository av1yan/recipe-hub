#!/bin/sh
set -e

cd "$CI_PRIMARY_REPOSITORY_PATH"

if ! command -v node >/dev/null 2>&1; then
  HOMEBREW_NO_AUTO_UPDATE=1 brew install node
fi

npm ci
npm run cap:sync
