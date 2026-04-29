# NZBarr Desktop Security Hardening Plan

## Goal

Make NZBarr Desktop materially harder to tamper with, abuse, or bypass.

Not literally "unhackable", because no desktop app is, but we can make:

- casual patching harder
- license bypass harder
- IPC abuse harder
- local tampering more visible
- server-side validation authoritative
- release builds more resistant to repackaging and reverse engineering

This plan is written as an implementation roadmap, not just ideas.

## Security Principles

1. Treat the renderer as untrusted.
2. Treat the local database as user-controlled.
3. Treat the filesystem as user-controlled.
4. Keep trust decisions in the main process and on the license server.
5. Assume determined users can patch local JavaScript.
6. Make the server, not the UI, the final authority for paid features.
7. Fail safely: uncertain or invalid state should downgrade to Free, not unlock Premium.

## Threat Model

We want to reduce:

- simple renderer hacks
- patched preload / IPC calls
- local SQLite edits to fake Premium state
- disabled or removed license checks
- replayed license responses
- copied machine-bound licenses between devices
- modified packaged app binaries
- fake local license server responses

We do not fully prevent:

- advanced reverse engineering by a determined attacker with full local machine control
- fully custom cracked builds distributed outside our control

But we can make those paths harder, noisier, and less reliable.

## Phase 1: Immediate Hardening

These are the best next changes and should be done first.

### 1. Make the main process the real enforcement layer

Status now:
- some Premium features are enforced in both renderer and main process
- some are still renderer-only

Implement:
- audit every Premium feature and make sure the main process or backend repository path rejects it without license permission
- never trust disabled buttons as protection

Priority features to harden server-side:
- `edit_media_info`
- `custom_artwork_upload`
- `fanart_artwork`
- preparation pipeline when later gated to Premium

Success criteria:
- direct IPC calls from DevTools cannot unlock Premium-only behavior

### 2. Recompute license state in the main process only

Implement:
- renderer should receive a read-only status object
- renderer must never decide Premium from DB fields directly
- all feature checks should flow through one main-process license service

Success criteria:
- editing front-end variables alone cannot unlock features

### 3. Stop trusting raw local DB values

Problem:
- a user can edit SQLite and set `license_status=active`

Implement:
- local DB stores cached license state only
- on app startup, main process validates whether cached state is still trustworthy
- if signature/validation is missing or stale, downgrade to Free until refresh succeeds

Success criteria:
- changing SQLite values alone is not enough

### 4. Add signed license payload validation

Implement on license server:
- return license payloads with a server-side signature
- desktop app verifies that signature with an embedded public key
- do not trust unsigned JSON from server or local DB

Recommended model:
- server signs license status, features, plan, expiry, grace, machine binding, issued-at timestamp
- app verifies signature before accepting or caching status

Success criteria:
- local tampering with cached license JSON becomes detectable

### 5. Tighten machine binding

Implement:
- license server binds activations to a machine fingerprint
- desktop app sends stable machine identity
- server decides whether that activation is allowed
- app must reject valid signatures for the wrong machine

Important:
- keep machine fingerprint privacy-conscious and stable enough not to punish legitimate users

Success criteria:
- copying another machine's cached active license state does not work

## Phase 2: IPC and Electron Hardening

### 6. Audit preload surface

Implement:
- expose only narrow IPC methods
- remove any generic or overpowered bridge methods
- validate all inputs in main process

Check:
- no arbitrary path write IPC
- no arbitrary shell execution
- no broad "update anything" endpoints without authorization and validation

### 7. Validate all IPC inputs

Implement:
- schema validation per IPC handler
- reject malformed IDs, paths, enums, booleans, arrays
- normalize file paths and block traversal

Examples:
- only allow expected media types
- only allow known settings keys where appropriate
- clamp batch sizes and string lengths

### 8. Electron production hardening review

Verify:
- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true` where compatible
- `enableRemoteModule: false`
- navigation restrictions
- external link allowlist
- CSP tightened in renderer

Success criteria:
- renderer compromise has less reach

## Phase 3: License Server Security

### 9. Move all commercial truth to the server

Server should be authoritative for:
- plan
- features
- status
- expiry
- grace
- revocation
- device activation policy

Desktop app should only cache the last signed answer.

### 10. Add anti-replay controls

Implement:
- signed `issued_at`
- signed `expires_at`
- short-lived validation freshness window
- optional nonce/challenge for refresh responses later

Desktop behavior:
- if cached validation is too old, app falls back to limited state until refreshed

### 11. Rate limits and anomaly logging

Implement on server:
- per-license validation rate limiting
- per-IP throttling
- activation anomaly detection
- repeated wrong-machine attempts logging

### 12. Use TLS only in production

Implement:
- production app should warn or refuse insecure `http://` license server URLs
- allow insecure local URLs only in explicit development mode

## Phase 4: Build and Packaging Hardening

### 13. Signed builds

Implement:
- code signing for macOS builds
- notarization for macOS distribution

Benefits:
- harder to silently replace app bundles
- better user trust

### 14. Production packaging review

Implement:
- minimize exposed source maps
- disable dev helpers in production
- remove debug-only IPC
- remove unnecessary console logging in release builds

### 15. Tamper-evident runtime checks

Optional but useful:
- verify key app files/hashes at runtime
- detect modified app bundle resources
- if tampering is detected, degrade to Free and show warning

Important:
- do this carefully to avoid false positives in development

## Phase 5: Local Data Protection

### 16. Protect sensitive local settings

Candidates:
- downloader credentials
- NNTP credentials
- license activation tokens

Implement:
- move secrets to OS keychain/credential storage where practical
- avoid storing secrets in plain SQLite when possible

### 17. Separate trusted vs untrusted local state

Implement:
- trusted signed license cache
- ordinary app settings
- volatile run-state logs

This makes it easier to reason about what can be edited safely.

## Phase 6: Observability and Response

### 18. Add security-relevant logging

Log:
- license refresh failures
- signature verification failures
- machine mismatch
- blocked Premium IPC attempts
- repeated duplicate or malformed requests

Do not log:
- raw secrets
- full tokens
- private credentials

### 19. Add internal admin diagnostics

Implement a hidden diagnostics view or export for:
- current license trust source
- last successful validation
- signature verification result
- feature decisions by layer

This will make support much easier.

## Feature-Gating Matrix To Harden

These must all be blocked outside the renderer:

- `send_to_downloader`
- `bulk_actions`
- `owned_refresh`
- `auto_refresh`
- `edit_media_info`
- `custom_artwork_upload`
- `fanart_artwork`
- future `smart_preparation`

## Recommended Order Of Implementation

### Tomorrow / next session

1. Audit all Premium features and list which are still renderer-only
2. Move any remaining Premium checks into main-process handlers
3. Design signed license response format
4. Decide what "stale cache" behavior should be

### After that

5. Implement license signature verification in desktop app
6. Implement signed responses in license server
7. Enforce secure production license URLs
8. Review preload/API attack surface

### Later

9. Build signing / notarization pass
10. Secret storage hardening
11. Tamper-evident runtime checks

## Practical Reality

What this plan should achieve:

- editing the renderer should not unlock Premium
- editing SQLite should not unlock Premium
- replaying old or fake license JSON should not unlock Premium
- copied license cache from another machine should not unlock Premium
- basic cracking becomes much more expensive

What it will not achieve:

- absolute prevention of a fully custom cracked fork by a skilled reverse engineer

That is normal for desktop software.

The goal is strong commercial resistance with sane maintenance cost.
