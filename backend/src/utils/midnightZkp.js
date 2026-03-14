const { v4: uuid } = require('uuid');
const fs = require('fs');
const path = require('path');

const getMode = () => process.env.MIDNIGHT_ZKP_MODE || 'mock';

const PROOF_TYPES = {
  AGE: 'age-over-18',
  DEGREE: 'degree-verification',
  ADDRESS: 'address-verification',
};

const resolveProofType = (rawProofType) => {
  const normalized = String(rawProofType || '').trim().toLowerCase();

  if (!normalized || normalized === 'age' || normalized === 'age18' || normalized === 'age-over-18') {
    return PROOF_TYPES.AGE;
  }

  if (normalized === 'degree' || normalized === 'degree-verification' || normalized === 'degree_verification') {
    return PROOF_TYPES.DEGREE;
  }

  if (normalized === 'address' || normalized === 'address-verification' || normalized === 'address_verification') {
    return PROOF_TYPES.ADDRESS;
  }

  return PROOF_TYPES.AGE;
};

const getCircuitKeyConfig = (proofType) => {
  const resolved = resolveProofType(proofType);

  const typeEnv = {
    [PROOF_TYPES.AGE]: {
      proving: process.env.MIDNIGHT_AGE_PROVING_KEY_PATH,
      verifying: process.env.MIDNIGHT_AGE_VERIFYING_KEY_PATH,
    },
    [PROOF_TYPES.DEGREE]: {
      proving: process.env.MIDNIGHT_DEGREE_PROVING_KEY_PATH,
      verifying: process.env.MIDNIGHT_DEGREE_VERIFYING_KEY_PATH,
    },
    [PROOF_TYPES.ADDRESS]: {
      proving: process.env.MIDNIGHT_ADDRESS_PROVING_KEY_PATH,
      verifying: process.env.MIDNIGHT_ADDRESS_VERIFYING_KEY_PATH,
    },
  };

  const byType = typeEnv[resolved] || {};

  return {
    proofType: resolved,
    provingKeyPath: byType.proving || process.env.MIDNIGHT_PROVING_KEY_PATH || '',
    verifyingKeyPath: byType.verifying || process.env.MIDNIGHT_VERIFYING_KEY_PATH || '',
  };
};

const ensureSdkKeys = ({ proofType, provingKeyPath, verifyingKeyPath }) => {
  if (!provingKeyPath || !verifyingKeyPath) {
    throw new Error(`Missing Midnight key paths for ${proofType}. Configure proving/verifying key paths in backend env.`);
  }

  const provingExists = fs.existsSync(path.resolve(provingKeyPath));
  const verifyingExists = fs.existsSync(path.resolve(verifyingKeyPath));

  if (!provingExists || !verifyingExists) {
    throw new Error(
      `Midnight key files not found for ${proofType}. Expected proving key: ${provingKeyPath}, verifying key: ${verifyingKeyPath}`,
    );
  }
};

const createMockProof = ({ statement, witnessMeta, proofType }) => {
  const result = {
    id: `proof-${uuid()}`,
    provider: 'midnight',
    mode: 'mock',
    proofType: resolveProofType(proofType),
    statement,
    witnessMeta: witnessMeta || {},
    proofHash: `mock_${Date.now().toString(16)}_${Math.random().toString(16).slice(2, 10)}`,
    generatedAt: new Date().toISOString(),
    verified: true,
  };

  return result;
};

const generateProof = async ({ statement, witnessMeta, proofType }) => {
  const mode = getMode();
  const circuit = getCircuitKeyConfig(proofType);

  if (mode === 'sdk') {
    ensureSdkKeys(circuit);

    // Placeholder for real Midnight SDK integration.
    // Replace this branch with SDK circuit execution once access is available.
    return {
      id: `proof-${uuid()}`,
      provider: 'midnight',
      mode: 'sdk',
      proofType: circuit.proofType,
      statement,
      witnessMeta: witnessMeta || {},
      proofHash: `sdk_pending_${Date.now().toString(16)}`,
      generatedAt: new Date().toISOString(),
      verified: true,
      keyConfig: {
        provingKeyPath: circuit.provingKeyPath,
        verifyingKeyPath: circuit.verifyingKeyPath,
      },
      warning: 'SDK mode placeholder active. Plug real Midnight proof generation here.',
    };
  }

  return createMockProof({ statement, witnessMeta, proofType: circuit.proofType });
};

const verifyProof = async ({ proofHash, proofType }) => {
  const mode = getMode();
  const circuit = getCircuitKeyConfig(proofType);

  if (mode === 'sdk') {
    ensureSdkKeys(circuit);
  }

  if (!proofHash) {
    return {
      success: false,
      provider: 'midnight',
      mode,
      proofType: circuit.proofType,
      verified: false,
      reason: 'Missing proof hash',
    };
  }

  return {
    success: true,
    provider: 'midnight',
    mode,
    proofType: circuit.proofType,
    verified: true,
    checkedAt: new Date().toISOString(),
  };
};

module.exports = {
  generateProof,
  verifyProof,
  resolveProofType,
};
