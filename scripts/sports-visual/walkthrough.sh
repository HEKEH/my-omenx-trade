#!/usr/bin/env bash
# M9 walkthrough: every region of the sample events at both viewports, then the overlays.
# Needs PUPPETEER_CORE and both dev servers (see README.md).
set -u
cd "$(dirname "$0")"
REGIONS=topbar,hero,prematch,stage,outcomes,tape,picker,form,related,positions
EVENTS="wc26-usa-par wc26-mex-rsa che-psg-2025-ucl liv-new wc26-winner wc26-grpa-mex wc26-messi-plays"
for size in 1440x900 1920x1080; do
  for id in $EVENTS; do
    echo "## $id $size"
    MAX_DIFFS=8 node measure-tree.cjs "$id" "$size" "$REGIONS" | grep -v "^total"
  done
done
