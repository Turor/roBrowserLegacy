# Signed data manifest (v2)

The remote client can publish a small signed root and 256 content shards
instead of one flat file list. This client checks that manifest before it
caches or uses a covered file.

The signing key stays with the operator. This repository embeds only the
release public key. A verified root may list `next-keys`. After the signature
checks, those public keys are stored and trusted on later starts. An all-zero
key is ignored.

Paths are normalized before they are compared, including when a cached file is
looked up. The vectors live in `testdata/manifest-v2-normalize.txt`.

## What is verified

1. `GET data-manifest/root` and `GET data-manifest/root.sig` (or the versioned
   URLs once `GET version` or `X-Data-Version` names a version).
2. The detached Ed25519 signature over the exact root bytes. The signature file
   is 128 lowercase hex characters, with or without one trailing newline.
3. The shard for a file, lazily, against the hash and size in the accepted root.
4. The file bytes (SHA-256 and size) before they are written to the FileSystem
   cache and before they are used.
5. The saved root is loaded and verified again on the next start. A lower
   version than the accepted one is a rollback and is refused.

The accepted root, its signature, the highest accepted version, and any
next-keys are stored in IndexedDB, keyed by the remote client base URL. The
file worker cannot use `localStorage`. Nothing in that record is a private key.

Until a signature has been published, report mode keeps the previous remote
and cache behaviour.

## Report mode (default)

`dataManifestMode` defaults to `report`.

In report mode the client logs `[data-manifest]` events and does not block
gameplay when the manifest is missing, the signature is bad, a shard does not
match, or a file digest does not match. A file is written to the cache only
when it matches an accepted manifest, or when no manifest has been accepted
yet.

Use this mode for the first rollout. Read the log if names or hashes do not
match the files the server actually sends.

## Switching to enforce

Change the mode only after a report-mode soak shows no digest or signature
errors for a published root.

In `Config.local.js` (this overrides the generated default; do not edit the
built file by hand if you deploy from a local override):

```javascript
window.ROConfigLocal = {
	dataManifestMode: 'enforce'
};
```

A server entry may set the same field when one world uses a different policy
than the global default.

Enforce fails closed:

- With no accepted manifest, remote files are not used. Local GRF and disk
  files that the manifest does not list are still allowed.
- After a manifest has been accepted, a missing root, HTTP 404, bad signature,
  rollback, truncated or mismatched shard, or file digest mismatch is treated
  as an attack. Covered files that do not match are not cached and not used.
  The last accepted root stays in force until a newer signed root verifies.

Set the value back to `'report'` to leave enforce.

## Operator signature

The data host writes the unsigned root. The operator signs that file on the
signing controller and publishes `root.sig` next to it. Example placeholders:

```text
sign-data-root --root /path/to/root --private-key /path/to/seed
```

Do not commit a seed, and do not point the client at a private key. The client
only needs the public key already embedded in the source.
