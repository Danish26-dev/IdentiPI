require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { v4: uuid } = require('uuid');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { createPresignedUpload, getS3Config } = require('./utils/s3');
const { generateProof, verifyProof, resolveProofType } = require('./utils/midnightZkp');
const { createDidIdentity, issueVerifiableCredential, verifyVerifiableCredential } = require('./utils/didVcManager');

const app = express();
const port = Number(process.env.PORT || 8080);
const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
const walletNonceTtlSeconds = Number(process.env.WALLET_NONCE_TTL_SECONDS || 300);

app.use(cors({ origin: frontendOrigin, credentials: true }));
app.use(express.json({ limit: '10mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

const db = {
  users: new Map(),
  documents: new Map(),
  credentials: new Map(),
  verificationRequests: new Map(),
  incomingRequests: new Map(),
  zkpRequests: new Map(),
  walletNonces: new Map(),
  didSecrets: new Map(),
};

const DID_ISSUER_KEY = '__system_issuer__';

const normalizeDid = (value) => String(value || '').replace(/\s+/g, '');

const sanitizeUser = (user) => {
  if (!user) return user;
  const sanitized = { ...user };
  delete sanitized.privateKey;
  delete sanitized.privateKeyBase64;
  return sanitized;
};

const ensureIssuerIdentity = async () => {
  const existing = db.didSecrets.get(DID_ISSUER_KEY);
  if (existing) return existing;

  const created = await createDidIdentity();
  db.didSecrets.set(DID_ISSUER_KEY, created);
  return created;
};

const seed = () => {
  const demoUser = {
    id: 'demo-user-1',
    name: 'Demo User',
    email: 'user@identipi.com',
    role: 'user',
    walletAddress: null,
    did: null,
    identityScore: 68,
    didCreatedAt: null,
    didHistory: [],
  };

  const demoVerifier = {
    id: 'demo-verifier-1',
    name: 'Demo Verifier',
    email: 'admin@identipi.com',
    role: 'verifier',
    walletAddress: null,
    did: null,
    identityScore: 0,
    didCreatedAt: null,
    didHistory: [],
  };

  db.users.set(demoUser.id, demoUser);
  db.users.set(demoVerifier.id, demoVerifier);
};

seed();

const upsertCredential = ({ userId, did, credentialType, issuer }) => {
  const id = `cred-${uuid()}`;
  const credential = {
    id,
    userId,
    did,
    credentialType,
    issuer: issuer || 'IdentiPI Verifier',
    issueDate: new Date().toISOString(),
  };
  db.credentials.set(id, credential);
  return credential;
};

const getUserByEmailAndRole = ({ email, role }) => {
  const normalized = String(email || '').trim().toLowerCase();
  for (const user of db.users.values()) {
    if (String(user.email || '').toLowerCase() === normalized && user.role === role) {
      return user;
    }
  }
  return null;
};

const getOrCreateWalletUser = ({ role, walletAddress, networkId }) => {
  const wallet = String(walletAddress || '').trim();
  const normalizedRole = role === 'verifier' ? 'verifier' : 'user';

  for (const user of db.users.values()) {
    if (user.walletAddress === wallet && user.role === normalizedRole) {
      return user;
    }
  }

  const id = `wallet-${normalizedRole}-${uuid()}`;
  const created = {
    id,
    name: normalizedRole === 'user' ? 'Wallet User' : 'Wallet Verifier',
    email: null,
    role: normalizedRole,
    walletAddress: wallet,
    networkId: networkId ?? null,
    did: null,
    identityScore: normalizedRole === 'user' ? 68 : 0,
    didCreatedAt: null,
    didHistory: [],
  };

  db.users.set(id, created);
  return created;
};

const inferProofTypeFromCredential = (credentialRequested) => {
  const value = String(credentialRequested || '').toLowerCase();
  if (value.includes('degree')) return 'degree';
  if (value.includes('address')) return 'address';
  if (value.includes('age')) return 'age';
  return 'age';
};

const extractIdHint = (fileName) => {
  const name = String(fileName || '');
  const matches = name.match(/[A-Z0-9]{6,}/gi);
  if (!matches || matches.length === 0) return null;
  return matches[0];
};

const analyzeVerificationDocument = ({ credentialRequested, document, supportingNotes, extractedText }) => {
  const fileName = String(document?.fileName || '').toLowerCase();
  const fileType = String(document?.fileType || '').toLowerCase();
  const sizeKb = Number(document?.fileSizeBytes || 0) / 1024;
  const text = String(extractedText || '').trim();

  const flags = [];
  if (!document?.storageKey) flags.push('missing_storage_key');
  if (sizeKb <= 0) flags.push('empty_or_unknown_size');
  if (sizeKb > 5120) flags.push('large_file_review_needed');
  if (fileType.includes('pdf') || fileName.endsWith('.pdf')) flags.push('pdf_document');
  if (fileType.includes('image') || fileName.match(/\.(png|jpg|jpeg|webp)$/)) flags.push('image_document');
  if (fileType.includes('text') || fileName.endsWith('.txt')) flags.push('text_document');
  if (!text) flags.push('no_pdf_text_extracted');

  const summary = {
    credentialRequested,
    proofType: inferProofTypeFromCredential(credentialRequested),
    extractedFields: {
      fileName: document?.fileName || null,
      fileType: document?.fileType || null,
      fileSizeKb: Number.isFinite(sizeKb) ? Number(sizeKb.toFixed(2)) : null,
      storageKey: document?.storageKey || null,
      storageMode: document?.storageMode || null,
      fileUrl: document?.fileUrl || null,
      idHint: extractIdHint(document?.fileName),
      extractedTextPreview: text ? text.slice(0, 300) : null,
      supportingNotes: supportingNotes || null,
    },
    qualityScore: Math.max(35, Math.min(98, Math.round(92 - flags.length * 10))),
    flags,
    analyzedAt: new Date().toISOString(),
  };

  return summary;
};

const extractPdfText = async (fileBuffer) => {
  if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
    return '';
  }

  try {
    const parsed = await pdfParse(fileBuffer);
    return String(parsed?.text || '').replace(/\s+/g, ' ').trim();
  } catch (_error) {
    return '';
  }
};

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    service: 'identipi-backend',
    time: new Date().toISOString(),
    zkpMode: process.env.MIDNIGHT_ZKP_MODE || 'mock',
    s3Configured: getS3Config().isConfigured,
  });
});

app.post('/api/auth/login', (req, res) => {
  const email = req.query.email || req.body?.email;
  const role = req.query.role || req.body?.role;

  if (!email || !role) {
    return res.status(400).json({ success: false, message: 'email and role are required' });
  }

  const user = getUserByEmailAndRole({ email, role });
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials for selected role' });
  }

  return res.json({ success: true, user: sanitizeUser(user) });
});

app.get('/api/auth/wallet/nonce', (req, res) => {
  const role = req.query.role === 'verifier' ? 'verifier' : 'user';
  const walletAddress = String(req.query.walletAddress || '').trim();

  if (!walletAddress) {
    return res.status(400).json({ success: false, message: 'walletAddress is required' });
  }

  const nonce = `identipi_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const expiresAt = Date.now() + walletNonceTtlSeconds * 1000;

  db.walletNonces.set(walletAddress, {
    nonce,
    role,
    expiresAt,
  });

  return res.json({
    success: true,
    nonce,
    expiresAt,
    message: `Sign this nonce to login: ${nonce}`,
  });
});

app.post('/api/auth/wallet/verify', (req, res) => {
  const role = req.body?.role === 'verifier' ? 'verifier' : 'user';
  const walletAddress = String(req.body?.walletAddress || '').trim();
  const networkId = req.body?.networkId ?? null;
  const nonce = String(req.body?.nonce || '');
  const signature = req.body?.signature;

  if (!walletAddress || !nonce || !signature) {
    return res.status(400).json({
      success: false,
      message: 'walletAddress, nonce and signature are required',
    });
  }

  const nonceRecord = db.walletNonces.get(walletAddress);
  if (!nonceRecord) {
    return res.status(401).json({ success: false, message: 'Nonce not found. Request a new nonce.' });
  }

  if (nonceRecord.expiresAt < Date.now()) {
    db.walletNonces.delete(walletAddress);
    return res.status(401).json({ success: false, message: 'Nonce expired. Request a new nonce.' });
  }

  if (nonceRecord.nonce !== nonce || nonceRecord.role !== role) {
    return res.status(401).json({ success: false, message: 'Nonce validation failed.' });
  }

  db.walletNonces.delete(walletAddress);

  const user = getOrCreateWalletUser({ role, walletAddress, networkId });

  return res.json({
    success: true,
    user: sanitizeUser(user),
    authMode: 'wallet-nonce-sign',
    verification: 'demo-shape-check',
  });
});

app.get('/api/users/:userId', (req, res) => {
  const user = db.users.get(req.params.userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  return res.json(sanitizeUser(user));
});

app.post('/api/users/:userId/generate-did', async (req, res) => {
  const user = db.users.get(req.params.userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  try {
    const identity = await createDidIdentity();
    const previousDid = normalizeDid(user.did);
    if (previousDid) {
      user.didHistory = Array.isArray(user.didHistory) ? user.didHistory : [];
      if (!user.didHistory.includes(previousDid)) {
        user.didHistory.push(previousDid);
      }
    }

    user.did = identity.did;
    user.didCreatedAt = new Date().toISOString();
    user.identityScore = Math.max(user.identityScore || 0, 40);

    db.users.set(user.id, user);
    db.didSecrets.set(user.id, {
      did: identity.did,
      privateKeyBase64: identity.privateKeyBase64,
    });

    return res.json({ success: true, did: identity.did, user: sanitizeUser(user) });
  } catch (error) {
    return res.status(500).json({ success: false, message: `DID generation failed: ${error.message}` });
  }
});

app.delete('/api/users/:userId/did', (req, res) => {
  const user = db.users.get(req.params.userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  user.did = null;
  user.didCreatedAt = null;
  user.identityScore = 0;
  db.users.set(user.id, user);
  db.didSecrets.delete(user.id);

  for (const [id, cred] of db.credentials.entries()) {
    if (cred.userId === user.id) {
      db.credentials.delete(id);
    }
  }

  for (const [id, vr] of db.verificationRequests.entries()) {
    if (vr.requesterId === user.id) {
      db.verificationRequests.delete(id);
    }
  }

  return res.json({ success: true, message: 'DID and linked records removed' });
});

app.get('/api/documents/user/:userId', (req, res) => {
  const documents = Array.from(db.documents.values()).filter((d) => d.userId === req.params.userId);
  return res.json({ documents });
});

app.get('/api/documents/pending', (_req, res) => {
  const documents = Array.from(db.documents.values()).filter((d) => d.status === 'pending');
  return res.json({ documents });
});

app.post('/api/documents/:docId/verify', (req, res) => {
  const status = String(req.query.status || '').toLowerCase();
  const doc = db.documents.get(req.params.docId);

  if (!doc) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'status must be approved or rejected' });
  }

  doc.status = status;
  doc.verifiedAt = new Date().toISOString();
  db.documents.set(doc.id, doc);

  return res.json({ success: true, document: doc });
});

app.get('/api/credentials/user/:userId', (req, res) => {
  const credentials = Array.from(db.credentials.values()).filter((c) => c.userId === req.params.userId);
  return res.json({ credentials });
});

app.get('/api/credentials/all', (_req, res) => {
  const credentials = Array.from(db.credentials.values());
  return res.json({ credentials });
});

app.get('/api/verification-requests/user/:userId', (req, res) => {
  const requests = Array.from(db.verificationRequests.values()).filter((r) => r.requesterId === req.params.userId);
  return res.json({ requests });
});

app.get('/api/verification-requests/pending', (_req, res) => {
  const requests = Array.from(db.verificationRequests.values()).filter((r) => r.status === 'pending');
  return res.json({ requests });
});

app.post('/api/verification-requests/create', (req, res) => {
  const body = req.body || {};
  if (!body.requesterId || !body.userDid || !body.credentialRequested) {
    return res.status(400).json({ success: false, message: 'requesterId, userDid, credentialRequested are required' });
  }

  const request = {
    id: `vr-${uuid()}`,
    requesterId: body.requesterId,
    requesterName: body.requesterName || 'Unknown User',
    userDid: body.userDid,
    credentialRequested: body.credentialRequested,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  db.verificationRequests.set(request.id, request);

  return res.json({ success: true, request });
});

app.post('/api/verification-requests/create-with-document', upload.single('document'), async (req, res) => {
  const body = req.body || {};
  const file = req.file;

  if (!body.requesterId || !body.userDid || !body.credentialRequested) {
    return res.status(400).json({ success: false, message: 'requesterId, userDid, credentialRequested are required' });
  }

  if (!file) {
    return res.status(400).json({ success: false, message: 'PDF file is required in document field' });
  }

  const fileType = String(file.mimetype || '').toLowerCase();
  if (!fileType.includes('pdf')) {
    return res.status(400).json({ success: false, message: 'Only PDF upload is supported for this flow' });
  }

  const storageKey = `vc-requests/${Date.now()}-${String(file.originalname || 'document.pdf').replace(/\s+/g, '-')}`;
  const extractedText = await extractPdfText(file.buffer);

  const document = {
    id: `doc-${uuid()}`,
    userId: body.requesterId,
    requesterName: body.requesterName || 'Unknown User',
    userDid: body.userDid,
    credentialType: body.credentialRequested,
    fileName: file.originalname,
    fileType,
    fileSizeBytes: Number(file.size || 0),
    storageKey,
    fileUrl: null,
    storageMode: 'backend-upload',
    status: 'pending',
    verificationStatus: 'pending',
    createdAt: new Date().toISOString(),
  };

  const analysis = analyzeVerificationDocument({
    credentialRequested: body.credentialRequested,
    document,
    supportingNotes: body.supportingNotes,
    extractedText,
  });

  const request = {
    id: `vr-${uuid()}`,
    requesterId: body.requesterId,
    requesterName: body.requesterName || 'Unknown User',
    userDid: body.userDid,
    credentialRequested: body.credentialRequested,
    documentId: document.id,
    documentSummary: {
      fileName: document.fileName,
      fileType: document.fileType,
      fileSizeBytes: document.fileSizeBytes,
      storageKey: document.storageKey,
      storageMode: document.storageMode,
      fileUrl: document.fileUrl,
    },
    analysis,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  db.documents.set(document.id, document);
  db.verificationRequests.set(request.id, request);

  return res.json({
    success: true,
    request,
    document,
    analysis,
  });
});

app.post('/api/verification-requests/:id/update', async (req, res) => {
  const request = db.verificationRequests.get(req.params.id);
  const status = String(req.query.status || '').toLowerCase();

  if (!request) {
    return res.status(404).json({ success: false, message: 'Verification request not found' });
  }

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'status must be approved or rejected' });
  }

  request.status = status;
  request.updatedAt = new Date().toISOString();

  if (request.documentId) {
    const linkedDocument = db.documents.get(request.documentId);
    if (linkedDocument) {
      linkedDocument.status = status;
      linkedDocument.verificationStatus = status;
      linkedDocument.verifiedAt = new Date().toISOString();
      db.documents.set(linkedDocument.id, linkedDocument);
    }
  }

  db.verificationRequests.set(request.id, request);

  let issuedCredential = null;
  if (status === 'approved') {
    const user = db.users.get(request.requesterId);
    const issuer = await ensureIssuerIdentity();

    const vc = await issueVerifiableCredential({
      issuerDid: issuer.did,
      issuerPrivateKeyBase64: issuer.privateKeyBase64,
      holderDid: request.userDid,
      credentialType: request.credentialRequested,
      claims: {
        approvedBy: 'IdentiPI Verifier',
        issuedForRequestId: request.id,
      },
    });

    issuedCredential = upsertCredential({
      userId: request.requesterId,
      did: request.userDid,
      credentialType: request.credentialRequested,
      issuer: issuer.did,
    });
    issuedCredential.format = vc.format;
    issuedCredential.vcJwt = vc.vcJwt;
    db.credentials.set(issuedCredential.id, issuedCredential);

    if (user) {
      user.identityScore = Math.min(100, (user.identityScore || 0) + 8);
      db.users.set(user.id, user);
    }
  }

  return res.json({
    success: true,
    request,
    issuedCredential,
  });
});

app.post('/api/credentials/verify', async (req, res) => {
  const vcJwt = req.body?.vcJwt;

  if (!vcJwt) {
    return res.status(400).json({ success: false, message: 'vcJwt is required' });
  }

  try {
    const verification = await verifyVerifiableCredential({ vcJwt });
    return res.json({ success: true, verification });
  } catch (error) {
    return res.status(400).json({ success: false, message: `Credential verification failed: ${error.message}` });
  }
});

app.get('/api/incoming-requests/user-did/:did', (req, res) => {
  const requestedDid = normalizeDid(req.params.did);
  const requests = Array.from(db.incomingRequests.values()).filter(
    (r) => normalizeDid(r.userDid) === requestedDid,
  );
  return res.json({ requests });
});

app.get('/api/incoming-requests/user/:userId', (req, res) => {
  const user = db.users.get(req.params.userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const didSet = new Set([
    normalizeDid(user.did),
    ...(Array.isArray(user.didHistory) ? user.didHistory.map(normalizeDid) : []),
  ].filter(Boolean));

  const requests = Array.from(db.incomingRequests.values()).filter((r) => {
    if (r.targetUserId && r.targetUserId === user.id) return true;
    return didSet.has(normalizeDid(r.userDid));
  });

  return res.json({ requests });
});

app.get('/api/stats/dashboard', (_req, res) => {
  const users = Array.from(db.users.values());
  const totalUsers = users.filter((u) => u.role === 'user').length;
  const pendingRequests = Array.from(db.verificationRequests.values()).filter((r) => r.status === 'pending').length;
  const issuedCredentials = db.credentials.size;

  return res.json({
    totalUsers,
    pendingRequests,
    issuedCredentials,
  });
});

app.post('/api/storage/presign-upload', async (req, res) => {
  const fileName = String(req.body?.fileName || '').trim();
  const fileType = String(req.body?.fileType || 'application/octet-stream');
  const scope = String(req.body?.scope || 'documents').trim();

  if (!fileName) {
    return res.status(400).json({ success: false, message: 'fileName is required' });
  }

  const safeName = fileName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '');
  const key = `${scope}/${Date.now()}-${safeName}`;

  try {
    const s3 = await createPresignedUpload({ key, contentType: fileType });
    return res.json({
      success: true,
      provider: 's3',
      mode: 'live',
      key,
      uploadUrl: s3.uploadUrl,
      fileUrl: s3.fileUrl,
    });
  } catch (error) {
    return res.status(503).json({
      success: false,
      provider: 's3',
      mode: 'unconfigured',
      message: error.message,
    });
  }
});

app.post('/api/zkp/requests/create', async (req, res) => {
  const body = req.body || {};
  if (!body.statement) {
    return res.status(400).json({ success: false, message: 'statement is required' });
  }

  const proofType = resolveProofType(body.proofType);

  const zkpRequest = {
    id: `zkpr-${uuid()}`,
    userDid: null,
    verifierId: body.verifierId || null,
    verifierName: body.verifierName || 'Verifier',
    statement: body.statement,
    proofType,
    witnessMeta: body.witnessMeta || {},
    status: 'awaiting_user_binding',
    kycStatus: 'pending',
    proof: null,
    verification: null,
    createdAt: new Date().toISOString(),
  };

  db.zkpRequests.set(zkpRequest.id, zkpRequest);

  return res.json({
    success: true,
    request: zkpRequest,
  });
});

app.post('/api/zkp/requests/:id/bind-user', (req, res) => {
  const request = db.zkpRequests.get(req.params.id);
  const requestedDid = normalizeDid(req.body?.userDid);
  const requestedUserId = String(req.body?.userId || '').trim();

  if (!request) {
    return res.status(404).json({ success: false, message: 'ZKP request not found' });
  }

  if (!requestedDid) {
    return res.status(400).json({ success: false, message: 'userDid is required' });
  }

  const allUsers = Array.from(db.users.values());
  const matchedByUserId = requestedUserId ? allUsers.find((u) => u.id === requestedUserId && u.role === 'user') : null;
  const matchedByDid = allUsers.find((u) => normalizeDid(u.did) === requestedDid);
  const matchedByHistory = allUsers.find(
    (u) => Array.isArray(u.didHistory) && u.didHistory.map(normalizeDid).includes(requestedDid),
  );
  const fallbackUsers = allUsers.filter((u) => u.role === 'user' && normalizeDid(u.did));
  const matchedUser = matchedByUserId || matchedByDid || matchedByHistory || (fallbackUsers.length === 1 ? fallbackUsers[0] : null);
  const userDid = normalizeDid(matchedUser?.did || requestedDid);

  if (request.userDid && String(request.userDid || '').replace(/\s+/g, '') !== userDid) {
    return res.status(409).json({ success: false, message: 'This request is already bound to another DID' });
  }

  request.userDid = userDid;

  const existingIncoming = Array.from(db.incomingRequests.values()).find(
    (incoming) => incoming.type === 'zkp' && incoming.relatedRequestId === request.id,
  );

  if (existingIncoming) {
    existingIncoming.userDid = userDid;
    existingIncoming.targetUserId = matchedUser?.id || existingIncoming.targetUserId || null;
    existingIncoming.status = 'pending';
    existingIncoming.updatedAt = new Date().toISOString();
    db.incomingRequests.set(existingIncoming.id, existingIncoming);
  } else {
    const incoming = {
      id: `incoming-${uuid()}`,
      type: 'zkp',
      relatedRequestId: request.id,
      userDid: request.userDid,
      targetUserId: matchedUser?.id || null,
      verifierName: request.verifierName || 'Verifier',
      credentialType: request.statement,
      proofType: request.proofType,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    db.incomingRequests.set(incoming.id, incoming);
  }

  request.status = 'pending_user_approval';
  request.updatedAt = new Date().toISOString();
  db.zkpRequests.set(request.id, request);

  return res.json({
    success: true,
    request,
    didResolution: {
      requestedDid,
      boundDid: userDid,
      requestedUserId: requestedUserId || null,
      matchedUserId: matchedUser?.id || null,
      fallbackApplied: !matchedByUserId && !matchedByDid && !matchedByHistory && Boolean(matchedUser),
    },
  });
});

app.get('/api/zkp/requests/pending', (_req, res) => {
  const requests = Array.from(db.zkpRequests.values()).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );
  return res.json({ requests });
});

app.post('/api/incoming-requests/:id/respond', async (req, res) => {
  const incoming = db.incomingRequests.get(req.params.id);
  if (!incoming) {
    return res.status(404).json({ success: false, message: 'Incoming request not found' });
  }

  const approved = Boolean(req.body?.approved);
  const relatedRequest = db.zkpRequests.get(incoming.relatedRequestId);
  if (!relatedRequest) {
    return res.status(404).json({ success: false, message: 'Linked ZKP request not found' });
  }

  if (!approved) {
    incoming.status = 'rejected';
    incoming.updatedAt = new Date().toISOString();
    db.incomingRequests.set(incoming.id, incoming);

    relatedRequest.status = 'user_rejected';
    relatedRequest.kycStatus = 'rejected';
    relatedRequest.updatedAt = new Date().toISOString();
    db.zkpRequests.set(relatedRequest.id, relatedRequest);

    return res.json({ success: true, request: relatedRequest, incoming });
  }

  try {
    const proof = await generateProof({
      statement: relatedRequest.statement,
      witnessMeta: relatedRequest.witnessMeta,
      proofType: relatedRequest.proofType,
    });

    incoming.status = 'approved';
    incoming.updatedAt = new Date().toISOString();
    db.incomingRequests.set(incoming.id, incoming);

    relatedRequest.status = 'proof_generated';
    relatedRequest.kycStatus = 'completed';
    relatedRequest.proof = proof;
    relatedRequest.proofSentAt = new Date().toISOString();
    relatedRequest.updatedAt = new Date().toISOString();
    db.zkpRequests.set(relatedRequest.id, relatedRequest);

    return res.json({ success: true, request: relatedRequest, incoming });
  } catch (error) {
    relatedRequest.status = 'failed';
    relatedRequest.kycStatus = 'pending';
    relatedRequest.error = error.message;
    relatedRequest.updatedAt = new Date().toISOString();
    db.zkpRequests.set(relatedRequest.id, relatedRequest);

    return res.status(500).json({ success: false, message: error.message, request: relatedRequest });
  }
});

app.post('/api/zkp/requests/:id/verify', async (req, res) => {
  const request = db.zkpRequests.get(req.params.id);
  if (!request) {
    return res.status(404).json({ success: false, message: 'ZKP request not found' });
  }

  const proofHash = req.body?.proofHash || request?.proof?.proofHash;
  const proofType = resolveProofType(req.body?.proofType || request.proofType);
  const verification = await verifyProof({ proofHash, proofType });

  request.status = verification.verified ? 'verified' : 'failed';
  request.kycStatus = verification.verified ? 'completed' : 'pending';
  request.verification = verification;
  request.updatedAt = new Date().toISOString();
  db.zkpRequests.set(request.id, request);

  return res.json({ success: verification.success, request });
});

app.listen(port, () => {
  console.log(`IdentiPI backend running on http://localhost:${port}`);
});
