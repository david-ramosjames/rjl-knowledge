export function SlideGallery({
  slug,
  slides,
}: {
  slug: string;
  slides: { id: string; fileName: string; sortOrder: number }[];
}) {
  if (slides.length === 0) return null;

  return (
    <div className="not-prose space-y-6">
      {slides.map((slide, index) => (
        <figure key={slide.id} className="overflow-hidden rounded-xl border border-border bg-muted/40">
          <img
            src={`/api/articles/${slug}/slides/${slide.id}`}
            alt={slide.fileName || `Slide ${index + 1}`}
            className="mx-auto max-h-[42rem] w-full object-contain bg-white"
          />
          <figcaption className="px-4 py-2 text-xs text-muted-foreground">
            Slide {index + 1} of {slides.length}
            {slide.fileName ? ` · ${slide.fileName}` : ""}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
