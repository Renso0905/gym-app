import { useEffect, useState } from 'react';

interface Props {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  /** Whole numbers only (reps, seconds). */
  integer?: boolean;
}

const show = (value: number | undefined) => (value === undefined ? '' : String(value));

/**
 * A numeric input that never fights the typist: it keeps its own text while
 * focused (so "12." is allowed on the way to "12.5") and only accepts digits.
 */
export function NumberField({ label, value, onChange, integer = false }: Props) {
  const [text, setText] = useState(show(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(show(value));
  }, [value, focused]);

  return (
    <input
      className="num"
      aria-label={label}
      inputMode={integer ? 'numeric' : 'decimal'}
      autoComplete="off"
      placeholder="–"
      value={text}
      onFocus={(e) => {
        setFocused(true);
        e.currentTarget.select();
      }}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        const next = e.currentTarget.value.replace(',', '.');
        if (!(integer ? /^\d{0,5}$/ : /^\d{0,5}(\.\d{0,2})?$/).test(next)) return;
        setText(next);
        onChange(next === '' || next === '.' ? undefined : Number(next));
      }}
    />
  );
}
