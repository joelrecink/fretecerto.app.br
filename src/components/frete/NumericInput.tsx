import React, { useEffect, useRef, useState } from 'react';

type BaseInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'>;

export interface NumericInputProps extends BaseInputProps {
  /** Numeric value; `undefined` / `null` means empty. */
  value: number | undefined | null;
  /** Called with parsed number, or `undefined` when the field is empty / mid-typing. */
  onChange: (value: number | undefined) => void;
  /** If true, only integer digits are accepted. */
  integer?: boolean;
}

function toDisplay(value: number | undefined | null): string {
  if (value === undefined || value === null) return '';
  if (Number.isNaN(value)) return '';
  // Show integers without decimals; fractional numbers with comma
  const str = Number.isInteger(value) ? String(value) : String(value).replace('.', ',');
  return str;
}

function parseNumber(text: string, integer: boolean): number | undefined {
  const trimmed = text.trim();
  if (trimmed === '' || trimmed === ',' || trimmed === '.') return undefined;
  const normalized = trimmed.replace(',', '.');
  const n = integer ? parseInt(normalized, 10) : parseFloat(normalized);
  return Number.isNaN(n) ? undefined : n;
}

/**
 * Numeric input that keeps a local text buffer so partial entries like
 * `""`, `","`, `",5"`, `"1,"` are preserved while typing. Emits parsed
 * number (or `undefined` when empty / mid-typing) to the parent.
 *
 * External value updates re-sync the buffer only when they represent a
 * different number than the current buffer, so typing is never disrupted.
 */
const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  ({ value, onChange, integer = false, inputMode, ...rest }, ref) => {
    const [text, setText] = useState<string>(() => toDisplay(value));
    const lastEmittedRef = useRef<number | undefined>(value ?? undefined);

    useEffect(() => {
      // Sync from parent only when the parent's value differs from what
      // we last emitted (i.e. an external update — like loading a saved
      // vehicle — not our own onChange round-trip).
      const external = value ?? undefined;
      if (external !== lastEmittedRef.current) {
        setText(toDisplay(external));
        lastEmittedRef.current = external;
      }
    }, [value]);

    const pattern = integer ? /^\d*$/ : /^\d*[.,]?\d*$/;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      if (!pattern.test(raw)) return; // reject invalid characters
      setText(raw);
      const parsed = parseNumber(raw, integer);
      lastEmittedRef.current = parsed;
      onChange(parsed);
    };

    return (
      <input
        {...rest}
        ref={ref}
        type="text"
        inputMode={inputMode ?? (integer ? 'numeric' : 'decimal')}
        value={text}
        onChange={handleChange}
      />
    );
  }
);

NumericInput.displayName = 'NumericInput';

export default NumericInput;
