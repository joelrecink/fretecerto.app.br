import React, { useEffect, useRef, useState } from 'react';
import { Check, Loader2, MapPin, Mic, MicOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSpeechToText } from '@/hooks/useSpeechToText';

interface Suggestion {
  id: string;
  label: string;
  title: string;
  lat: number;
  lng: number;
}

interface AddressAutocompleteProps {
  value: string;
  hasCoords?: boolean;
  onTextChange: (text: string) => void;
  onSelect: (address: string, lat: number, lng: number) => void;
  placeholder?: string;
  accent?: 'emerald' | 'blue';
  rightSlot?: React.ReactNode;
  /** Enable microphone for voice dictation of the address. */
  enableVoice?: boolean;
}

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  value,
  hasCoords,
  onTextChange,
  onSelect,
  placeholder,
  accent = 'emerald',
  rightSlot,
  enableVoice = false,
}) => {

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | null>(null);
  const lastQueryRef = useRef<string>('');

  const focusRing = accent === 'blue'
    ? 'focus:ring-blue-500 focus:border-blue-500'
    : 'focus:ring-emerald-500 focus:border-emerald-500';

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const fetchSuggestions = (q: string) => {
    if (q.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    lastQueryRef.current = q;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('address-autocomplete', {
          body: { q },
        });
        if (error) throw error;
        if (lastQueryRef.current !== q) return;
        const list: Suggestion[] = data?.suggestions || [];
        setSuggestions(list);
        setOpen(true);
        setHighlight(0);
      } catch (err) {
        console.error('autocomplete error', err);
        setSuggestions([]);
      } finally {
        if (lastQueryRef.current === q) setLoading(false);
      }
    })();
  };

  const handleChange = (text: string) => {
    onTextChange(text);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => fetchSuggestions(text), 300);
  };

  const speech = useSpeechToText({
    lang: 'pt-BR',
    onResult: (text) => {
      if (!text) return;
      onTextChange(text);
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      fetchSuggestions(text);
    },
  });

  const handleSelect = (s: Suggestion) => {
    onSelect(s.label, s.lat, s.lng);
    setOpen(false);
    setSuggestions([]);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(h + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); handleSelect(suggestions[highlight]); }
    else if (e.key === 'Escape') { setOpen(false); }
  };


  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => suggestions.length && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className={`w-full px-4 py-4 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white outline-none transition-all ${focusRing} ${hasCoords ? 'pr-20' : 'pr-12'}`}
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {hasCoords && (
          <span title="Endereço confirmado" className="flex items-center gap-1 text-emerald-600 text-xs font-semibold">
            <Check size={14} />
          </span>
        )}
        {loading && <Loader2 size={16} className="animate-spin text-[hsl(var(--muted-foreground))]" />}
        {enableVoice && speech.supported && (
          <button
            type="button"
            onClick={speech.toggle}
            title={speech.isListening ? 'Parar gravação' : 'Ditar endereço por voz'}
            aria-label={speech.isListening ? 'Parar gravação' : 'Ditar endereço por voz'}
            className={`p-1.5 rounded-lg transition-all ${
              speech.isListening
                ? 'bg-red-500 text-white animate-pulse'
                : `text-[hsl(var(--muted-foreground))] hover:${accent === 'blue' ? 'text-blue-600' : 'text-emerald-600'}`
            }`}
          >
            {speech.isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
        )}
        {rightSlot}
      </div>


      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-[hsl(var(--border))] rounded-xl shadow-lg max-h-72 overflow-auto">
          {suggestions.map((s, i) => (
            <li
              key={s.id}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
              onMouseEnter={() => setHighlight(i)}
              className={`flex items-start gap-2 px-3 py-2 cursor-pointer text-sm ${i === highlight ? 'bg-[hsl(var(--secondary))]' : ''}`}
            >
              <MapPin size={16} className="mt-0.5 text-[hsl(var(--muted-foreground))] shrink-0" />
              <span className="text-[hsl(var(--foreground))]">{s.label}</span>
            </li>
          ))}
        </ul>
      )}
      {open && !loading && suggestions.length === 0 && value.trim().length >= 3 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-[hsl(var(--border))] rounded-xl shadow-lg px-3 py-2 text-sm text-[hsl(var(--muted-foreground))]">
          Nenhum endereço encontrado
        </div>
      )}
    </div>
  );
};

export default AddressAutocomplete;
