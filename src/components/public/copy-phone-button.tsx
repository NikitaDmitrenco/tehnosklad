"use client";
import { useState } from "react";
export function CopyPhoneButton({
  copy,
  copied,
  phone,
}: {
  copy: string;
  copied: string;
  phone: string;
}) {
  const [done, setDone] = useState(false);
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(phone);
      setDone(true);
      window.setTimeout(() => setDone(false), 1800);
    } catch {
      setDone(false);
    }
  }
  return (
    <button className="button-secondary" type="button" onClick={handleCopy}>
      {done ? copied : copy}
    </button>
  );
}
