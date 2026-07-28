'use client';

import { useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';

type PasswordFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: CSSProperties;
  autoComplete?: string;
  required?: boolean;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
};

export default function PasswordField({
  value,
  onChange,
  placeholder,
  className,
  style,
  autoComplete,
  required,
  onKeyDown,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-field">
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
        // paddingRight always wins here (spread last) so there's guaranteed
        // room for the peek icon, no matter what base style is passed in.
        style={{ ...style, paddingRight: 38 }}
        autoComplete={autoComplete}
        required={required}
        onKeyDown={onKeyDown}
      />
      <button
        type="button"
        className="password-field__toggle"
        onClick={() => setVisible(v => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        tabIndex={-1}
      >
        {visible ? '🔒' : '🔓'}
      </button>
    </div>
  );
}
