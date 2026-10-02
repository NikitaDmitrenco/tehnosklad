"use client";

import { useState, type ChangeEvent } from "react";

// Counter with two thresholds: up to warningThreshold the value is normal
// (neutral counter), above it the counter turns red and `warningText`
// explains the soft limit (e.g. search engines cut long SEO strings).
// The hard limit stays the HTML maxLength fed from src/lib/limits.ts.
function warningClassName(showWarning: boolean): string {
  return showWarning
    ? "font-mono font-bold text-red-600"
    : "font-mono text-stone-500";
}

export function CountedInput({
  defaultValue,
  maxLength,
  name,
  className = "field",
  warningThreshold = Math.floor(maxLength * 0.8),
  warningText,
  ...rest
}: {
  defaultValue?: string | null;
  maxLength: number;
  name: string;
  className?: string;
  warningThreshold?: number;
  warningText?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const [value, setValue] = useState(defaultValue ?? "");
  const len = value.length;
  const showWarning = len > warningThreshold;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    if (rest.onChange) rest.onChange(e);
  };

  return (
    <div className="space-y-1">
      <input
        {...rest}
        className={`${className} ${showWarning ? "border-red-500 focus:border-red-600" : ""}`}
        defaultValue={undefined}
        maxLength={maxLength}
        name={name}
        onChange={handleChange}
        value={value}
      />
      <div className="flex justify-end items-center text-xs">
        <span className={warningClassName(showWarning)}>
          {len} / {maxLength}
        </span>
      </div>
      {showWarning && warningText ? (
        <div className="text-xs font-bold text-red-600">{warningText}</div>
      ) : null}
    </div>
  );
}

export function CountedTextarea({
  defaultValue,
  maxLength,
  name,
  className = "field",
  warningThreshold = Math.floor(maxLength * 0.8),
  warningText,
  ...rest
}: {
  defaultValue?: string | null;
  maxLength: number;
  name: string;
  className?: string;
  warningThreshold?: number;
  warningText?: string;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const [value, setValue] = useState(defaultValue ?? "");
  const len = value.length;
  const showWarning = len > warningThreshold;

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    if (rest.onChange) rest.onChange(e);
  };

  return (
    <div className="space-y-1">
      <textarea
        {...rest}
        className={`${className} ${showWarning ? "border-red-500 focus:border-red-600" : ""}`}
        defaultValue={undefined}
        maxLength={maxLength}
        name={name}
        onChange={handleChange}
        value={value}
      />
      <div className="flex justify-end items-center text-xs">
        <span className={warningClassName(showWarning)}>
          {len} / {maxLength}
        </span>
      </div>
      {showWarning && warningText ? (
        <div className="text-xs font-bold text-red-600">{warningText}</div>
      ) : null}
    </div>
  );
}
