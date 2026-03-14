# IdentiPI Backend

Express backend for IdentiPI demo with:
- Email login + wallet login nonce flow
- DID lifecycle APIs
- VC request and verifier approval APIs
- S3 presigned upload endpoint
- Midnight-style ZKP adapter endpoints (mock/sdk switch)

## Quick Start

1. Copy `.env.example` to `.env` and set values.
2. Install dependencies:
   npm install
3. Start server:
   npm run dev

Default server: `http://localhost:8080`

## Required Frontend Env

Set in `frontend/.env`:

REACT_APP_BACKEND_URL=http://localhost:8080

## Notes

- Wallet signature is currently validated in a demo-safe way (nonce + shape checks). For production, add cryptographic signature verification.
- S3 endpoint returns live presigned URL only when AWS env vars are configured.
- Midnight ZKP uses adapter mode `mock` by default so end-to-end flows work immediately.
