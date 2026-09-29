export function ProductMedia({
  src,
  alt,
  sizes,
  priority = false,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
}) {
  const variant = src.endsWith("-v2-1200.jpg");
  const small = variant ? src.replace("-1200.jpg", "-480.jpg") : src;
  const webp = variant ? src.replace("-1200.jpg", "-1200.webp") : src;
  const webpSmall = variant ? src.replace("-1200.jpg", "-480.webp") : src;
  return (
    <div className="media-box">
      <picture>
        {variant && (
          <source
            type="image/webp"
            srcSet={`${webpSmall} 480w, ${webp} 1200w`}
            sizes={sizes}
          />
        )}
        <img
          src={src}
          srcSet={variant ? `${small} 480w, ${src} 1200w` : undefined}
          sizes={sizes}
          alt={alt}
          width={1200}
          height={1500}
          decoding="async"
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
        />
      </picture>
    </div>
  );
}
