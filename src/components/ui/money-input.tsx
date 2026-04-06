import React, { useState, useEffect, useRef } from 'react';

/**
 * Formats a numeric value as BRL currency string: 1.234,56
 */
export function formatBRL(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '';
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Parses a BRL-formatted string back to a number.
 * Handles: 2.115,10 → 2115.10 and 2115.10 → 2115.10
 */
export function parseBRL(text: string): number {
  if (!text) return 0;
  // If the text contains a comma, treat it as BRL format (1.234,56)
  if (text.includes(',')) {
    const clean = text.replace(/\./g, '').replace(',', '.');
    return parseFloat(clean) || 0;
  }
  // Otherwise parse as standard number
  return parseFloat(text.replace(/[^0-9.-]/g, '')) || 0;
}

type MoneyInputProps = {
  value: number | string | null | undefined;
  onChange: (numericValue: number) => void;
  className?: string;
  placeholder?: string;
  readOnly?: boolean;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  size?: 'default' | 'sm';
};

/**
 * Input that displays and accepts BRL money format (1.234,56).
 * On focus: shows raw number for easy editing.
 * On blur: formats as BRL.
 * Always calls onChange with the numeric value.
 */
export default function MoneyInput({
  value,
  onChange,
  className = '',
  placeholder = '0,00',
  readOnly = false,
  autoFocus = false,
  onKeyDown,
  size = 'default',
}: MoneyInputProps) {
  const numericValue = typeof value === 'string' ? parseBRL(value) : (value ?? 0);
  const [displayValue, setDisplayValue] = useState(numericValue ? formatBRL(numericValue) : '');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!focused) {
      const nv = typeof value === 'string' ? parseBRL(value) : (value ?? 0);
      setDisplayValue(nv ? formatBRL(nv) : '');
    }
  }, [value, focused]);

  const handleFocus = () => {
    setFocused(true);
    const nv = typeof value === 'string' ? parseBRL(value) : (value ?? 0);
    setDisplayValue(nv ? nv.toString().replace('.', ',') : '');
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const handleBlur = () => {
    setFocused(false);
    const parsed = parseBRL(displayValue);
    setDisplayValue(parsed ? formatBRL(parsed) : '');
    onChange(parsed);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow digits, comma, dot
    const sanitized = raw.replace(/[^0-9.,]/g, '');
    setDisplayValue(sanitized);
    const parsed = parseBRL(sanitized);
    onChange(parsed);
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      className={className}
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      readOnly={readOnly}
      autoFocus={autoFocus}
      onKeyDown={onKeyDown}
    />
  );
}
