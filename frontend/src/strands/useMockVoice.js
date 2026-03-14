import { useEffect, useRef, useState } from 'react';

const getRecognitionCtor = () => {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

export const useMockVoice = ({ onTranscript }) => {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    const Recognition = getRecognitionCtor();
    if (!Recognition) {
      setSupported(false);
      return;
    }

    setSupported(true);
    const recognition = new Recognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event) => {
      const transcript = event?.results?.[0]?.[0]?.transcript || '';
      const value = String(transcript || '').trim();
      setLastTranscript(value);
      if (value && onTranscript) onTranscript(value);
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch (_error) {
        // no-op
      }
      recognitionRef.current = null;
    };
  }, [onTranscript]);

  const startListening = () => {
    if (!recognitionRef.current || listening) return;
    try {
      recognitionRef.current.start();
    } catch (_error) {
      setListening(false);
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch (_error) {
      // no-op
    }
  };

  return {
    supported,
    listening,
    lastTranscript,
    startListening,
    stopListening,
  };
};
