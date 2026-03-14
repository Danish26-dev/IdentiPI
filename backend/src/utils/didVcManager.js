const { generatePrivateKey, getAuthenticatedDID } = require('@didtools/key-did');
const { EdDSASigner } = require('did-jwt');
const { createVerifiableCredentialJwt, verifyCredential } = require('did-jwt-vc');
const { Resolver } = require('did-resolver');
const { getResolver } = require('key-did-resolver');

const didResolver = new Resolver(getResolver());

const encodeKey = (bytes) => Buffer.from(bytes).toString('base64');
const decodeKey = (value) => Uint8Array.from(Buffer.from(String(value || ''), 'base64'));

const buildCredentialPayload = ({ holderDid, credentialType, claims }) => {
  return {
    sub: holderDid,
    nbf: Math.floor(Date.now() / 1000),
    vc: {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiableCredential', credentialType || 'GenericCredential'],
      credentialSubject: {
        id: holderDid,
        ...(claims || {}),
      },
    },
  };
};

const createDidIdentity = async () => {
  const privateKey = generatePrivateKey();
  const did = await getAuthenticatedDID(privateKey);

  return {
    did: did.id,
    privateKeyBase64: encodeKey(privateKey),
  };
};

const issueVerifiableCredential = async ({ issuerDid, issuerPrivateKeyBase64, holderDid, credentialType, claims }) => {
  const privateKey = decodeKey(issuerPrivateKeyBase64);

  const vcJwt = await createVerifiableCredentialJwt(
    buildCredentialPayload({
      holderDid,
      credentialType,
      claims,
    }),
    {
      did: issuerDid,
      alg: 'EdDSA',
      signer: EdDSASigner(privateKey),
    },
  );

  return {
    format: 'jwt_vc',
    vcJwt,
  };
};

const verifyVerifiableCredential = async ({ vcJwt }) => {
  const result = await verifyCredential(vcJwt, didResolver);

  return {
    verified: Boolean(result?.verified),
    issuer: result?.verifiableCredential?.issuer || null,
    subject: result?.verifiableCredential?.credentialSubject?.id || null,
  };
};

module.exports = {
  createDidIdentity,
  issueVerifiableCredential,
  verifyVerifiableCredential,
};
