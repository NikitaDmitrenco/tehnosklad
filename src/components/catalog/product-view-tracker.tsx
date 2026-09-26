"use client";

import { useEffect, useRef } from "react";

export function ProductViewTracker({ productId }: { productId: string }) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;

    fetch("/api/products/views", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ productId }),
    }).catch((err) => {
      console.error("Failed to record product view", err);
    });
  }, [productId]);

  return null;
}
