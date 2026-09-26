"use client";

export function PriceFilterInput({
  ariaLabel,
  defaultValue,
  name,
  placeholder,
}: {
  ariaLabel: string;
  defaultValue: string;
  name: "price_min" | "price_max";
  placeholder: string;
}) {
  return (
    <input
      aria-label={ariaLabel}
      className="field"
      defaultValue={defaultValue}
      inputMode="numeric"
      maxLength={12}
      name={name}
      onInput={(event) => {
        const input = event.currentTarget;
        const digits = input.value.replace(/[^0-9]/g, "");
        if (digits !== input.value) input.value = digits;
      }}
      pattern="[0-9]*"
      placeholder={placeholder}
      type="text"
    />
  );
}
