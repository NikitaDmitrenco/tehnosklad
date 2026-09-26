import type { ImageTone, PresentationKey } from "@/features/catalog/types";

type Props = {
  category: PresentationKey;
  tone: ImageTone;
  label: string;
  imageUrl?: string;
  className?: string;
};

export function ProductIllustration({
  category,
  tone,
  label,
  imageUrl,
  className = "",
}: Props) {
  if (imageUrl) {
    return (
      <div
        aria-label={label}
        role="img"
        className={`bg-cover bg-center bg-no-repeat ${className}`}
        style={{ backgroundImage: `url(${JSON.stringify(imageUrl)})` }}
      />
    );
  }
  return (
    <div
      aria-label={label}
      role="img"
      className={`product-illustration product-illustration--${tone} ${className}`}
    >
      <div className={`appliance appliance--${category}`}>
        <i />
        <b />
        <span />
      </div>
    </div>
  );
}
