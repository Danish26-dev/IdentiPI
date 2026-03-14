export const INTENT_HINTS = [
  'create did',
  'delete did',
  'request vc',
  'check identity score',
  'close assistant',
];

const includesAny = (value, patterns) => patterns.some((pattern) => value.includes(pattern));

export const resolveMockIntent = (utterance = '') => {
  const text = String(utterance || '').toLowerCase().trim();
  if (!text) {
    return {
      intent: 'empty',
      reply: 'I did not catch that. Please say a command like create DID or request VC.',
      action: null,
    };
  }

  if (includesAny(text, ['create did', 'generate did', 'new did'])) {
    return {
      intent: 'create_did',
      reply: 'Mock mode: I understood create DID. In this demo I am not mutating backend state from voice.',
      action: 'mock_create_did',
    };
  }

  if (includesAny(text, ['delete did', 'remove did'])) {
    return {
      intent: 'delete_did',
      reply: 'Mock mode: I understood delete DID. No real delete was executed.',
      action: 'mock_delete_did',
    };
  }

  if (includesAny(text, ['request vc', 'create vc', 'credential request'])) {
    return {
      intent: 'request_vc',
      reply: 'Mock mode: VC request command captured. Please use the VC panel to submit the actual request.',
      action: 'mock_request_vc',
    };
  }

  if (includesAny(text, ['score', 'identity score', 'cibil'])) {
    return {
      intent: 'check_score',
      reply: 'Mock mode: I can read your identity score from the dashboard context.',
      action: 'mock_check_score',
    };
  }

  if (includesAny(text, ['close', 'exit', 'stop assistant'])) {
    return {
      intent: 'close',
      reply: 'Closing Idina voice assistant.',
      action: 'close',
    };
  }

  return {
    intent: 'fallback',
    reply: 'I understood your voice, but this demo supports only DID and VC management commands.',
    action: null,
  };
};
