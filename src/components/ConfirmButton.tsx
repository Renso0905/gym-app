import { useEffect, useState } from 'react';

interface Props {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  className?: string;
}

/** A destructive button that needs a second tap within a few seconds. */
export function ConfirmButton({ label, confirmLabel, onConfirm, className = '' }: Props) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = window.setTimeout(() => setArmed(false), 4000);
    return () => window.clearTimeout(timer);
  }, [armed]);

  return (
    <button
      type="button"
      className={`${className} ${armed ? 'danger armed' : 'danger'}`}
      onClick={() => (armed ? onConfirm() : setArmed(true))}
      onBlur={() => setArmed(false)}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}
