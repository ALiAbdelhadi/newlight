# ADR 0002 — Cloudinary, a committed manifest, and a two-phase migration

Status: accepted, implemented in P1 (upload pending credentials) · 2026-09-06

## Context

~233 MB of product photography lives in the repository under two public trees. v1 stored
image references as a `TEXT[]` on `Product` plus a `colorImageMap` JSONB — an array that
cannot carry dimensions, alt text or a placeholder, and a second unvalidated copy of the
colour association.

The original audit recorded `apps/admin/public/products` as a stale duplicate to delete.
**That is false**: it holds files that exist nowhere else, and full-size originals where the
www tree holds downscaled copies.

## Decision

- Cloudinary, with a **committed manifest** (`data/media-manifest.json`) as the interface.
  The transform reads the manifest and never calls Cloudinary (§15.1).
- **Two phases.** `media:scan` resolves every catalog path, reads dimensions, derives a
  deterministic `public_id` and hashes — all without credentials, all reviewable before a
  byte leaves the machine. `media:upload` is a thin, resumable pass that fills in `url` and
  `blurDataUrl`.
- **`public_id` derives from the resolved FILE, not the catalog path.** Two catalog paths
  naming one photograph therefore share an id and upload once. A collision between two
  *different* files aborts the scan rather than silently overwriting a photograph.
- **Content type comes from magic bytes, never the extension.** 20 files carry an extension
  their bytes contradict.
- Resolution order is www exact → admin exact → committed override. An override never beats a
  real file; that ordering is what stopped four images being replaced by downscaled copies.
- **No Cloudinary SDK.** The upload API is a signed multipart POST; a dependency to make one
  HTTP call would hide the only part worth reading. Dimensions are parsed from PNG/JPEG/WebP
  headers directly rather than pulling in `sharp` for three integers.
- On Vercel, prefer a **Cloudinary loader** for `next/image` over Vercel's optimizer:
  Cloudinary already transforms and CDN-serves, and routing through Vercel's optimizer pays
  twice for the same work. **Trade-off**: the loader gives up Vercel's automatic AVIF/WebP
  negotiation and its own cache, and couples the app to Cloudinary's URL grammar. Accepted,
  because the alternative is double transformation cost on every image in the catalog.

## Consequences

- `apps/admin/public/products` may be deleted only after Cloudinary holds the **union**,
  verified per file. Deleting it today destroys the only copy of files the catalog uses.
- `res.cloudinary.com` must be in `remotePatterns` **and** the CSP `img-src` in both apps.
  Missing the CSP breaks images in production only, where the CSP is served.
- `width`, `height` and `blurDataUrl` stay nullable, so rendering never blocks on them.
