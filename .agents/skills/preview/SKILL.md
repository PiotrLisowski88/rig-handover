---
name: preview
description: Publish a rig page as a public preview on GitHub Pages, and take its lane marker off after review. Use for a plan's "Preview for review" and "Clean up" sections.
---

# preview

The preview is one HTML file deployed by the `preview` workflow (`.github/workflows/preview.yml`)
as a GitHub Pages artifact, never a file in a branch (ADR 0003). The workflow saves
`/digest/2026-10-28`; change its curl line when a plan previews another page.

Link: `https://<owner>.github.io/<repo>/`. Needs `gh`, authenticated, with Pages set to
build from Actions (once per repo: `gh api -X POST repos/<owner>/<repo>/pages -f build_type=workflow`).

## Publish

Ask the human first: the page is public and carries the lane marker.

```sh
grep '^LANE_MARKER=' .env | cut -d= -f2 | tr -d '\n' | gh secret set LANE_MARKER
gh workflow run preview.yml
gh run watch "$(gh run list --workflow preview.yml --limit 1 --json databaseId -q '.[0].databaseId')" --exit-status
curl -s https://<owner>.github.io/<repo>/ | grep -o '<span class="marker">[^<]*</span>'
```

The curl runs without sign-in, the way the reviewer opens it: the marker must show. Then send the
link. Leave the preview issue open until the reviewer has looked.

## Clean up

Only once the review is in, and after asking the human:

```sh
gh secret delete LANE_MARKER
gh workflow run preview.yml   # then watch it as above
curl -s https://<owner>.github.io/<repo>/ | grep -o '<span class="marker">[^<]*</span>'
```

Done when the banner reads `no marker set`.
