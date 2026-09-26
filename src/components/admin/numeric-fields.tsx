"use client";

import { useState, type ChangeEvent } from "react";

export function MoneyInput({
  defaultValue,
  name,
  className = "field",
  required = false,
  placeholder = "0.00",
}: {
  defaultValue?: string | null;
  name: string;
  className?: string;
  required?: boolean;
  placeholder?: string;
}) {
  const [val, setVal] = useState(defaultValue ?? "");

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value.replace(/,/g, ".");
    // Filter out all non-digits except single dot
    input = input.replace(/[^0-9.]/g, "");
    const parts = input.split(".");
    if (parts.length > 2) {
      input = parts[0] + "." + parts.slice(1).join("");
    }
    if (parts[1] && parts[1].length > 2) {
      input = parts[0] + "." + parts[1].slice(0, 2);
    }
    setVal(input);
  };

  return (
    <input
      autoComplete="off"
      className={className}
      inputMode="decimal"
      name={name}
      onChange={handleChange}
      placeholder={placeholder}
      required={required}
      type="text"
      value={val}
    />
  );
}

export function IntegerInput({
  defaultValue,
  name,
  className = "field",
  required = false,
  placeholder = "0",
}: {
  defaultValue?: number | string | null;
  name: string;
  className?: string;
  required?: boolean;
  placeholder?: string;
}) {
  const [val, setVal] = useState(
    defaultValue !== null && defaultValue !== undefined
      ? String(defaultValue)
      : "",
  );

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    // Only allow whole digits 0-9
    const digitsOnly = e.target.value.replace(/[^0-9]/g, "");
    setVal(digitsOnly);
  };

  return (
    <input
      autoComplete="off"
      className={className}
      inputMode="numeric"
      name={name}
      onChange={handleChange}
      placeholder={placeholder}
      required={required}
      type="text"
      value={val}
    />
  );
}
