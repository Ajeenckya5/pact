#!/bin/sh
if [ -d .git ]; then
  cp scripts/git-hooks/commit-msg .git/hooks/commit-msg
  chmod +x .git/hooks/commit-msg scripts/git-hooks/commit-msg
fi
