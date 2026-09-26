import type { ImageTone, PresentationKey } from "@/features/catalog/types";

const categoryTones: Record<PresentationKey, ImageTone> = {
  fridge: "blue",
  stove: "coral",
  vacuum: "mint",
  generic: "yellow",
};

export function getCategoryTone(presentationKey: PresentationKey): ImageTone {
  return categoryTones[presentationKey];
}
