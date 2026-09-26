"use client";

import { useState, type ChangeEvent } from "react";

export function CountedInput({
  defaultValue,
  maxLength,
  name,
  className = "field",
  warningThreshold = Math.floor(maxLength * 0.8),
  ...rest
}: {
  defaultValue?: string | null;
  maxLength: number;
  name: string;
  className?: string;
  warningThreshold?: number;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const [value, setValue] = useState(defaultValue ?? "");
  const len = value.length;
  const remaining = maxLength - len;
  const showWarning = len >= warningThreshold;

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
      {showWarning ? (
        <div className="flex justify-end items-center text-xs">
          <span className="font-mono font-bold text-red-600">
            {len} / {remaining}
          </span>
        </div>
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
  ...rest
}: {
  defaultValue?: string | null;
  maxLength: number;
  name: string;
  className?: string;
  warningThreshold?: number;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const [value, setValue] = useState(defaultValue ?? "");
  const len = value.length;
  const remaining = maxLength - len;
  const showWarning = len >= warningThreshold;

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
      {showWarning ? (
        <div className="flex justify-end items-center text-xs">
          <span className="font-mono font-bold text-red-600">
            {len} / {remaining}
          </span>
        </div>
      ) : null}
    </div>
  );
}
