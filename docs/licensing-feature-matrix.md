# NZBarr Licensing Feature Matrix

Last updated: 2026-04-16

This document defines the current Free vs Premium product split for NZBarr Desktop.

It is meant to be the single source of truth for:
- product decisions
- UI gating
- Electron main-process IPC enforcement
- future licensing work

## Current Licensing States

- `free`: no active license
- `active`: premium license is valid
- `grace`: premium remains temporarily available after validation problems
- `expired`: app falls back to Free mode
- `revoked`: app falls back to Free mode
- `invalid`: app falls back to Free mode

For feature access purposes:
- `active` and `grace` are treated as Premium
- `free`, `expired`, `revoked`, and `invalid` are treated as Free

## Product Rule

Free mode should remain useful for local browsing and one-at-a-time usage.

Premium should cover:
- automation
- downloader integration
- editing and artwork tools
- bulk workflows

## Always Available In Free Mode

- browse indexed releases
- search, sort, and filter releases
- view release details
- view library entries
- view collections
- import NZB files
- link NZBs to media
- download a single NZB file locally
- use the built-in or external player
- access general settings
- view metadata already stored in the app

## Premium Only

### `send_to_downloader`

Premium only:
- send one release to SABnzbd
- send one release to NZBGet
- send selected releases from batch actions

Enforcement:
- renderer: yes
- main process / IPC: yes

### `bulk_actions`

Premium only:
- release multi-select checkboxes
- `Select All`
- batch download
- multi-select batch actions

Free mode rule:
- users may still download one NZB at a time

Enforcement:
- renderer: yes
- main process / IPC: yes for `releases:downloadNZBBatch`

### `edit_media_info`

Premium only:
- `Edit Info`
- save edited movie info
- save edited TV info
- fetch from TMDB
- TMDB search from edit modal
- delete info flows

Enforcement:
- renderer: yes
- main process / IPC: not fully hardened yet

### `custom_artwork_upload`

Premium only:
- upload custom cover
- upload custom backdrop
- upload custom logo

Enforcement:
- renderer: yes
- main process / IPC: not fully hardened yet

### `fanart_artwork`

Premium only:
- pick cover from Fanart.tv
- pick backdrop from Fanart.tv
- pick logo from Fanart.tv

Enforcement:
- renderer: yes
- main process / IPC: not fully hardened yet

### `owned_refresh`

Premium only:
- release detail refresh button
- manual owned refresh trigger
- owned refresh workflow

Enforcement:
- renderer: yes
- main process / IPC: yes

### `auto_refresh`

Premium only:
- auto refresh settings controls
- auto refresh scheduler start
- auto refresh scheduler stop
- scheduler startup behavior

Enforcement:
- renderer: yes
- main process / IPC: yes

## Partially Defined Or Not Enforced Yet

The seeded license server currently includes these feature flags, but they are not yet treated as real product gates in the app:

- `collections_page`
- `grand_vault`
- `advanced_settings`

These exist in seeded test data but are not currently part of the enforced Free/Premium split.

## UX Rule

Premium features should generally:
- remain visible
- appear disabled in Free mode
- explain that Premium is required

This supports discoverability without hiding product value.

## Implementation Notes

Current important rule:
- do not broaden gating aggressively without updating this document first

When adding a new Premium feature:
1. add the feature decision here first
2. add renderer gating
3. add main-process / IPC enforcement if the action can be bypassed
4. add or update seeded license features on the test server
5. test both Free and Premium states

## Current Test Keys

Local test server keys currently used for licensing work:

- `NZBARR-TEST-ACTIVE-2026`
- `NZBARR-TEST-GRACE-2026`
- `NZBARR-TEST-EXPIRED-2025`
- `NZBARR-TEST-REVOKED-2026`

## Next Recommended Hardening

The next licensing-hardening work should focus on:

- persisting `expired` and `revoked` responses cleanly during activation / refresh
- adding backend hardening for `edit_media_info`
- adding backend hardening for `custom_artwork_upload`
- adding backend hardening for `fanart_artwork`

