# NZBarr License Signing Setup

NZBarr now supports bundled trusted public keys from:

- `config/license-public-keys.json`

## File format

Use an array of objects:

```json
[
  {
    "keyId": "prod-2026-01",
    "publicKeyPem": "-----BEGIN PUBLIC KEY-----\nPASTE_YOUR_ED25519_PUBLIC_KEY_HERE\n-----END PUBLIC KEY-----"
  }
]
```

Notes:
- `keyId` should match `key_id` sent by your license server signature envelope.
- `publicKeyPem` must be the PEM public key used to verify `signed_payload`.
- Keep newline escapes as `\n` when storing PEM inside JSON.

## Signed response envelope expected by NZBarr

Your license response should include:

```json
{
  "signed_payload": "<base64url-encoded-json-payload>",
  "signature": "<base64url-signature>",
  "key_id": "prod-2026-01",
  "alg": "ed25519"
}
```

Supported `alg`:
- `ed25519`

## Safety behavior

- For non-local license servers, signed responses are required.
- For local/dev servers (`localhost`, `.local`, private IP ranges), unsigned responses are allowed.

