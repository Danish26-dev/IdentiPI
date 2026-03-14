# IdentiPI

### Unifying Fragmented Identity with Decentralized Credentials and Privacy-Preserving Proofs

IdentiPI is a decentralized identity DAP(web3) designed to **unify fragmented identity documents and redefine how they are used in everyday digital interactions**.

Instead of repeatedly uploading full documents like Aadhaar, PAN, or degree certificates, users attach them to a **Decentralized Identity (DID)** as **Verifiable Credentials (VCs)**. When verification is required, the system generates **Zero Knowledge Proofs (ZKPs)** to confirm only the required fact without revealing the document itself.

Example:

Instead of uploading Aadhaar to prove age, a user can simply prove:

**“Age ≥ 18”**

without exposing their personal data.

---

# Problem

Today digital identity is **fragmented and inefficient**.

Documents such as:

- Aadhaar  
- PAN  
- Degree certificates  
- Address proofs  

exist across multiple platforms and services.

Every organization asks users to **upload the same documents repeatedly**, even when only a small piece of information is needed.

This causes:

- Overexposure of personal data  
- Repeated KYC processes  
- Inefficient identity verification  
- Lack of user control over identity  

---

# Solution

IdentiPI introduces a **unified identity infrastructure**.

The platform:

1. Creates a **Decentralized Identity (DID)** for each user  
2. Converts verified documents into **Verifiable Credentials (VCs)**  
3. Calculates an **Identity Reliability Score** similar to a CIBIL score  
4. Enables **privacy-preserving verification through Zero Knowledge Proofs**

Instead of sharing documents, users share **cryptographic proofs**.

Examples:

- Age verification  
- Degree verification  
- Address verification  
- Identity confirmation  

---

# Core Features

## Decentralized Identity (DID)

Each user creates a DID which acts as the root identity.

Example:

```
did:identipi:uuid
```

This DID becomes the anchor for all credentials and verifications.

---

## Verifiable Credentials (VC)

Documents become **cryptographically signed credentials**.

Examples:

- Aadhaar Verified  
- PAN Verified  
- Degree Verified  
- Address Verified  

These credentials are linked to the user's DID.

---

## Identity Reliability Score

IdentiPI introduces an **Identity Reliability Score**, similar to a credit score.

Score factors include:

- number of verified credentials  
- document consistency  
- trusted issuers  

Range:

```
0 - 100
```

This allows organizations to quickly assess identity reliability.

---

## Zero Knowledge Proof Verification

IdentiPI enables **selective disclosure**.

Users can prove specific claims without revealing underlying documents.

Example proofs:

| Request | Proof Result |
|-------|------|
| Age ≥ 18 | True / False |
| Address Verified | True / False |
| Degree Verified | True / False |

This improves privacy and security.

---

## Idina Voice Identity Assistant

IdentiPI includes **Idina**, a voice-based AI identity assistant built with **Strands SDK**.

Users interact with their identity using voice commands.

Example commands:

- "Create my DID"
- "Request a credential verification"
- "Show my identity score"
- "List my credentials"

Idina appears as a **3D animated interface** that listens, processes commands, and responds via voice.

---

# System Architecture

IdentiPI follows a **Hybrid Web3 Architecture** where trust and verification are decentralized while application logic remains cloud-based.

```
User
 ↓
IdentiPI dApp (React Frontend)
 ↓
Backend API (Express)
 ↓
Cloud Database
 ↓
IPFS (Document Storage)
 ↓
DID Layer
 ↓
Verifiable Credentials
 ↓
Zero Knowledge Proof Engine (Midnight)
 ↓
Verifier
```

---

# User Journey

```
User registers
      ↓
User creates DID
      ↓
User uploads documents
      ↓
Documents converted into Verifiable Credentials
      ↓
Identity Score calculated
      ↓
Verifier requests proof
      ↓
User approves request
      ↓
ZK proof generated
      ↓
Verifier receives True / False
```

---

# Zero Knowledge Proof Flow

```
Verifier requests proof
        ↓
User receives request
        ↓
User approves verification
        ↓
Midnight ZKP engine generates proof
        ↓
Proof verifies specific claim
        ↓
Verifier receives result
```

Example:

```
Request: Age ≥ 18
Result: TRUE
```

No personal data is exposed.

---

# Repository Structure

```
identiPI
│
├── frontend
│   ├── src
│   │   ├── pages
│   │   │   ├── Login.js
│   │   │   ├── UpdatedUserDashboard.js
│   │   │   ├── UpdatedVerifierDashboard.js
│   │   │   └── IdentiPILanding.js
│   │   │
│   │   ├── components
│   │   │   ├── IdinaVoiceAgent.js
│   │   │   └── UI components
│   │   │
│   │   ├── services
│   │   │   └── laceWallet.js
│   │   │
│   │   └── strands
│   │       └── Idina voice interaction logic
│
├── backend
│   ├── src
│   │   ├── server.js
│   │   ├── didVcManager.js
│   │   ├── midnightZkp.js
│   │   └── s3.js
│
├── midnight-zkp
│   ├── contracts
│   ├── schemas
│   ├── scripts
│   └── tools
│
├── idina-integration
│   ├── app.py
│   ├── templates
│   └── static
│
├── vercel.json
├── LOCAL_RUN_GUIDE.md
└── README.md
```

---

# Tech Stack

Frontend

- React
- React Router
- TailwindCSS
- Framer Motion
- React Three Fiber

Backend

- Node.js
- Express

Identity Layer

- Decentralized Identifiers (DID)
- Verifiable Credentials

Privacy Layer

- Midnight ZKP

AI Assistant

- Strands SDK

Storage

- IPFS

Wallet Integration

- Lace Wallet

---

# Local Development

Clone repository

```
git clone https://github.com/your-repo/identiPI
cd identiPI
```

Start backend

```
cd backend
npm install
npm run dev
```

Backend runs on

```
[http://localhost:5000],(https://identipi-backend.onrender.com/)
```

Start frontend

```
cd frontend
npm install
npm start
```

Frontend runs on

```
[http://localhost:3000],(https://identi-pi-kappa.vercel.app/)
```

---

# Future Improvements

- persistent database
- full IPFS document storage
- production ZKP service
- mobile identity wallet
- issuer trust registry
- multi-chain DID support

---

# Use Cases

IdentiPI can be used for:

- banking KYC
- university credential verification
- job applications
- government identity services
- digital identity infrastructure

---

# License

MIT License
