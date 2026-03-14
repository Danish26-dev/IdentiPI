# Midnight ZKP Module

This folder contains isolated Midnight Compact contracts for IdentiPI proof flows:

- `Age >= 18`
- `Degree Verification`
- `Address Verification`

## Structure

- `contracts/*.compact` - Compact contracts for each proof domain
- `schemas/*.json` - Example witness/public input payload shapes
- `package.json` - compile and proof-server scripts

## Prerequisites

1. Midnight Compact toolchain (Linux/macOS or WSL2 on Windows)
2. Docker Desktop for local proof server

## Compile

From this folder:

```bash
npm run compile:all
```

Generated artifacts will be created in:

- `contracts/managed/age-over-18/`
- `contracts/managed/degree-verification/`
- `contracts/managed/address-verification/`

Each managed contract should include `keys/` with proving and verifying keys.

## Start local proof server

```bash
npm run start-proof-server
```

## Backend env mapping (example)

After compile, map one circuit at a time in backend env:

```dotenv
MIDNIGHT_ZKP_MODE=sdk
MIDNIGHT_PROVING_KEY_PATH=../midnight-zkp/contracts/managed/age-over-18/keys/proving.key
MIDNIGHT_VERIFYING_KEY_PATH=../midnight-zkp/contracts/managed/age-over-18/keys/verifying.key
```

You can switch these two paths per proof type if you want separate verification jobs.
