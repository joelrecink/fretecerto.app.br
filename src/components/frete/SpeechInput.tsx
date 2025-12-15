import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
  length: number;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  lang: string;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechInputProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: 'text' | 'number';
  placeholder?: string;
  className?: string;
  prefix?: string;
}

const SpeechInput: React.FC<SpeechInputProps> = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  className = '',
  prefix,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [inputValue, setInputValue] = useState<string>(value.toString());
  const [recognition, setRecognition] = useState<SpeechRecognitionInstance | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stringVal = value === 0 && inputValue === '' ? '' : value.toString();
    
    if (type === 'number') {
      const currentFloat = parseFloat(inputValue.replace(',', '.'));
      const newFloat = parseFloat(stringVal);
      
      if (currentFloat !== newFloat && !isNaN(newFloat)) {
        setInputValue(stringVal);
      }
    } else {
      if (inputValue !== stringVal) {
        setInputValue(stringVal);
      }
    }
  }, [value, type]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognitionConstructor = (window as any).webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognitionConstructor() as SpeechRecognitionInstance;
      recognitionInstance.continuous = false;
      recognitionInstance.lang = 'pt-BR';
      recognitionInstance.interimResults = false;

      recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        let processedValue = transcript;
        
        if (type === 'number') {
          processedValue = transcript
            .replace(/vírgula/gi, ',')
            .replace(/ponto/gi, '.')
            .replace(/[^\d,.]/g, '');
        }
        
        setInputValue(processedValue);
        onChange(processedValue);
        setIsListening(false);
      };

      recognitionInstance.onerror = () => {
        setIsListening(false);
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      setRecognition(recognitionInstance);
    }
  }, [onChange, type]);

  const toggleListening = () => {
    if (!recognition) {
      alert('Reconhecimento de voz não suportado neste navegador.');
      return;
    }

    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
      setIsListening(true);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-bold text-slate-600 uppercase tracking-wide">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-4 text-slate-500 font-bold text-sm pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          ref={inputRef}
          type={type === 'number' ? 'text' : type}
          inputMode={type === 'number' ? 'decimal' : 'text'}
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={`w-full px-4 py-4 border-2 border-slate-200 rounded-xl text-base font-medium text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 ${prefix ? 'pl-12' : ''} pr-14`}
        />
        <button
          type="button"
          onClick={toggleListening}
          className={`absolute right-3 p-2 rounded-lg transition-all ${
            isListening
              ? 'bg-red-500 text-white animate-pulse'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
          aria-label={isListening ? 'Parar gravação' : 'Iniciar gravação'}
        >
          {isListening ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
      </div>
    </div>
  );
};

export default SpeechInput;
