'use client';

import { useEffect, useRef, useState } from 'react';

type SearchInputProps = {
  placeholder?: string;
  initialValue?: string;
  onDebouncedChange: (value: string) => void;
  delay?: number;
  className?: string;
};

export default function SearchInput({
  placeholder,
  initialValue = '',
  onDebouncedChange,
  delay = 200,
  className = 'search-input',
}: SearchInputProps) {
  const [value, setValue] = useState(initialValue);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDebouncedChangeRef = useRef(onDebouncedChange);
  onDebouncedChangeRef.current = onDebouncedChange;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleChange = (next: string) => {
    setValue(next);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => onDebouncedChangeRef.current(next), delay);
  };

  return (
    <input
      className={className}
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => handleChange(e.target.value)}
    />
  );
}