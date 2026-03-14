import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import IdinaOrb3D from './IdinaOrb3D';
import { resolveMockIntent, INTENT_HINTS } from './mockIntents';
import { useMockVoice } from './useMockVoice';

const IdinaVoicePanel = ({ user }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Idina is active. Speak a command about DID or VC management.',
    },
  ]);

  const onTranscript = (transcript) => {
    setMessages((prev) => [...prev, { role: 'user', text: transcript }]);

    const result = resolveMockIntent(transcript);
    setMessages((prev) => [...prev, { role: 'assistant', text: result.reply }]);

    if (result.action === 'close') return;

    if (result.action) {
      toast.success(`Idina mock action: ${result.action}`);
    }
  };

  const { supported, listening, startListening, stopListening } = useMockVoice({ onTranscript });

  const subtitle = useMemo(() => {
    if (!supported) return 'Speech recognition is not available in this browser.';
    if (listening) return 'Listening... speak now.';
    return 'Tap start and say a command.';
  }, [supported, listening]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full rounded-2xl border border-cyan-400/20 bg-slate-950/95 shadow-2xl overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-cyan-400/15">
        <h3 className="text-xl font-bold text-white">Idina Voice Assistant</h3>
        <p className="text-sm text-gray-400">{subtitle}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-0">
        <div className="p-6 border-b lg:border-b-0 lg:border-r border-cyan-400/10">
          <div className="flex flex-col items-center gap-4">
            <IdinaOrb3D active={listening} />
            <div className="text-center">
              <p className="text-cyan-300 text-sm">{listening ? 'Voice stream active' : 'Voice stream idle'}</p>
              <p className="text-gray-400 text-xs mt-1">Mock frontend-only responses for demo submission</p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                disabled={!supported || listening}
                onClick={startListening}
                className="px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 disabled:opacity-50"
              >
                Start Voice
              </button>
              <button
                type="button"
                disabled={!supported || !listening}
                onClick={stopListening}
                className="px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-300 disabled:opacity-50"
              >
                Stop
              </button>
            </div>

            <div className="w-full text-left bg-slate-900/70 border border-cyan-400/10 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-2">Suggested commands</p>
              <div className="flex flex-wrap gap-2">
                {INTENT_HINTS.map((hint) => (
                  <span key={hint} className="px-2 py-1 rounded bg-slate-800 text-xs text-cyan-300">
                    {hint}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-3 text-sm text-gray-300">
            Active user: <span className="text-white font-semibold">{user?.name || 'Unknown'}</span>
          </div>
          <div className="h-[340px] overflow-y-auto rounded-lg border border-cyan-400/10 bg-slate-900/60 p-3 space-y-2">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={
                  message.role === 'assistant'
                    ? 'p-2 rounded-lg bg-cyan-500/10 text-cyan-100 text-sm'
                    : 'p-2 rounded-lg bg-slate-700/50 text-white text-sm'
                }
              >
                {message.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default IdinaVoicePanel;
