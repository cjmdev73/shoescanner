import { Footprints } from "lucide-react";

// Renders the shoe's product image when a licensed image is available.
// Falls back to a clean icon placeholder (no AI-generated photos) when no
// legal image has been sourced yet. Shows attribution for licensed images.
export default function ShoeImage({
  src,
  verified,
  license,
  attributedTo,
  alt,
  className = "",
  imgClassName = "",
  showCredit = false,
}) {
  const hasImage = !!src;

  if (!hasImage) {
    return (
      <div
        className={`relative w-full h-full overflow-hidden bg-[#f6f8fb] flex items-center justify-center ${className}`}
      >
        <Footprints className="w-8 h-8 text-[#c3cedd]" strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full overflow-hidden bg-[#f6f8fb] ${className}`}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={`w-full h-full object-cover ${imgClassName}`}
      />
      {showCredit && verified && hasImage && (attributedTo || license) && (
        <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm px-2 py-1 text-[10px] text-muted-foreground truncate">
          {attributedTo ? `© ${attributedTo}` : ""}{license ? ` · ${license}` : ""}
        </div>
      )}
    </div>
  );
}