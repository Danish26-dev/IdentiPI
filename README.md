IdentiPI is a decentralized identity platform designed to unify fragmented identity documents and redefine how identity verification works online.
Instead of repeatedly sharing full documents like Aadhaar, PAN, or certificates, users attach them to a Decentralized Identity (DID) as Verifiable Credentials (VCs) and prove specific facts using Zero Knowledge Proofs (ZKPs).
Example:
Instead of uploading your Aadhaar to prove age, you can simply prove:
> “I am above 18”
without revealing the actual document.
Problem
Today digital identity is fragmented and inefficient.
People store important documents like:
-Aadhaar
-PAN
-Degree certificates
-Address proofs
-across multiple platforms and services.
Every service asks users to upload the same documents repeatedly, even when only a small piece of information is needed.
This causes several issues:
• Overexposure of personal data
• Repeated verification processes
• Document inconsistencies and mismatches
• Inefficient onboarding for services

Solution
IdentiPI solves this by introducing a unified identity infrastructure.
The platform:
1. Creates a Decentralized Identity (DID) for every user.
2. Converts verified documents into Verifiable Credentials (VCs).
3. Calculates an Identity Reliability Score similar to a credit score.
4. Allows services to verify specific attributes using Zero Knowledge Proofs.

Instead of sharing full documents, users generate privacy-preserving proofs.
Example verification flows:
-Age verification
-Address verification
-Degree verification
-Identity confirmation

Core Features
Decentralized Identity (DID)
Users generate a unique decentralized identity.
Example format:
did:identipi:uuid
The DID acts as the root identity layer for all credentials.

Verifiable Credentials (VC)
Documents are converted into cryptographically verifiable credentials issued by trusted verifiers.
Examples:
Aadhaar verified
PAN verified
Degree verified
Address verified
redentials are linked to the user’s DID.
Identity Reliability Score
IdentiPI introduces an identity score similar to a CIBIL score.

The score evaluates:
• number of verified credentials
• document consistency
• trusted issuers
This helps organizations quickly evaluate identity reliability.

Zero Knowledge Proof Verification
IdentiPI enables selective disclosure using ZK proofs.
Users can prove specific claims without revealing the underlying document.
Examples:
Proof Request	Result
Age ≥ 18	True/False
Degree verified	True/False
Address verified	True/False
This significantly improves privacy and security.

Idina Voice Identity Assistant
IdentiPI includes Idina, an AI voice assistant built with the Strands SDK.
Idina allows users to interact with their identity system using voice commands.
Example commands:

• "Create my DID"
• "Request a credential verification"
• "Show my identity score"
• "List my credentials"
Idina appears as a 3D animated interface that listens, processes, and responds via voice.
System Architecture
IdentiPI follows a hybrid Web3 architecture.
Sensitive identity proofs are decentralized while application logic remains cloud-based.
User
 ↓
IdentiPI dApp (React)
 ↓
Backend API (Express)
 ↓
Cloud Database (In-Memory / Future DB)
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

Repository Structure

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
│   └── static
│
├── vercel.json
├── LOCAL_RUN_GUIDE.md
└── README.md

