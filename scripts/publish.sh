#!/usr/bin/env bash
# Publish the portfolio to GitHub Pages as the personal account.
#
#   ./scripts/publish.sh
#
# Requires the GitHub CLI logged in as MahmoudMostafaTayee. The site is a
# plain static site, so Pages serves the repository root directly.
set -euo pipefail

OWNER="MahmoudMostafaTayee"
REPO="$OWNER/$OWNER.github.io"
URL="https://$OWNER.github.io/"

cd "$(dirname "$0")/.."

active="$(gh api user --jq .login 2>/dev/null || true)"
if [ "$active" != "$OWNER" ]; then
  cat >&2 <<EOF
Active gh account is '${active:-none}', but this must publish as '$OWNER'.

  gh auth switch --user $OWNER     # if already logged in
  gh auth login                     # otherwise, choose GitHub.com > HTTPS

Then re-run: ./scripts/publish.sh
EOF
  exit 1
fi

# Let git use the gh token over HTTPS, so no SSH key or agent is involved.
gh auth setup-git

if gh repo view "$REPO" >/dev/null 2>&1; then
  if git remote get-url origin >/dev/null 2>&1; then
    git remote set-url origin "https://github.com/$REPO.git"
  else
    git remote add origin "https://github.com/$REPO.git"
  fi
  git push -u origin main
else
  gh repo create "$REPO" --public \
    --description "Portfolio — computer vision and AI systems" \
    --source=. --remote=origin --push
fi

# User sites (*.github.io) enable Pages automatically; this is a no-op then.
gh api -X POST "repos/$REPO/pages" \
  -f 'source[branch]=main' -f 'source[path]=/' >/dev/null 2>&1 || true

echo "Pushed. Pages usually takes under two minutes to build."
echo "Check status: gh api repos/$REPO/pages --jq '.status + \" \" + .html_url'"
echo "Site:         $URL"
