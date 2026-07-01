import { useCallback, useEffect, useRef, useState } from 'react';

interface SpeechRecognitionAlternative { transcript: string; confidence: number; }
interface SpeechRecognitionResult { [i: number]: SpeechRecognitionAlternative; isFinal: boolean; length: number; }
interface SpeechRecognitionResultList { [i: number]: SpeechRecognitionResult; length: number; }
interface SpeechRecognitionEvent extends Event { results: SpeechRecognitionResultList; resultIndex: number; }
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: Event) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

function getRecognitionCtor(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

interface UseSpeechToTextOptions {
  lang?: string;
  /** Called with the final recognized text once recording stops. */
  onResult?: (text: string) => void;
  /** Called with interim (in-progress) transcript on each partial result. */
  onInterim?: (text: string) => void;
}

/**
 * Wrapper around the Web Speech API (`webkitSpeechRecognition`).
 * Works offline in Chrome / Edge / mobile Chrome / Safari 14.5+.
 * Returns `supported=false` on browsers without the API.
 */
export function useSpeechToText({ lang = 'pt-BR', onResult, onInterim }: UseSpeechToTextOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [supported, setSupported] = useState<boolean>(() => !!getRecognitionCtor());
  const recRef = useRef<SpeechRecognitionInstance | null>(null);
  const onResultRef = useRef(onResult);
  const onInterimRef = useRef(onInterim);

  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => { onInterimRef.current = onInterim; }, [onInterim]);

  useEffect(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) { setSupported(false); return; }
    setSupported(true);
    const rec = new Ctor();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = lang;
    rec.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const t = res[0]?.transcript ?? '';
        if (res.isFinal) final += t;
        else interim += t;
      }
      if (interim && onInterimRef.current) onInterimRef.current(interim.trim());
      if (final && onResultRef.current) onResultRef.current(final.trim());
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    recRef.current = rec;
    return () => {
      try { rec.abort(); } catch { /* noop */ }
      recRef.current = null;
    };
  }, [lang]);

  const start = useCallback(() => {
    const rec = recRef.current;
    if (!rec || isListening) return;
    try {
      rec.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
    }
  }, [isListening]);

  const stop = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    try { rec.stop(); } catch { /* noop */ }
  }, []);

  const toggle = useCallback(() => {
    if (isListening) stop(); else start();
  }, [isListening, start, stop]);

  return { isListening, supported, start, stop, toggle };
}
