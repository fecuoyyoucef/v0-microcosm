"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import useEmblaCarousel from "embla-carousel-react"
import { FileText, Download, File, X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react"
import { cn } from "@/lib/utils"

interface Attachment {
  url: string
  name?: string
  type: "image" | "document"
  size?: number
}

interface AttachmentsGalleryProps {
  attachments: Attachment[]
  isOwn: boolean
}

export function AttachmentsGallery({ attachments, isOwn }: AttachmentsGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  if (!attachments || !Array.isArray(attachments) || attachments.length === 0) {
    return null
  }

  const images = attachments.filter((a) => a.type === "image")
  const documents = attachments.filter((a) => a.type === "document")

  return (
    <div className="mt-3 space-y-3">
      {images.length > 0 && (
        <ImageMosaic
          images={images}
          onImageClick={(i) => setLightboxIndex(i)}
        />
      )}

      {lightboxIndex !== null && (
        <Lightbox
          images={images}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {documents.length > 0 && (
        <DocumentsList documents={documents} isOwn={isOwn} />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Instagram-style mosaic                                             */
/* ------------------------------------------------------------------ */

function ImageMosaic({
  images,
  onImageClick,
}: {
  images: Attachment[]
  onImageClick: (index: number) => void
}) {
  const count = images.length

  // Single image — respect natural aspect ratio, full width up to ~480px
  if (count === 1) {
    return <SingleImage image={images[0]} onClick={() => onImageClick(0)} />
  }

  // Two images — side by side, square
  if (count === 2) {
    return (
      <div className="grid grid-cols-2 gap-1 max-w-md rounded-2xl overflow-hidden">
        {images.map((img, i) => (
          <MosaicTile
            key={i}
            image={img}
            onClick={() => onImageClick(i)}
            className="aspect-square"
          />
        ))}
      </div>
    )
  }

  // Three images — 1 large left + 2 stacked right
  if (count === 3) {
    return (
      <div className="grid grid-cols-2 gap-1 max-w-md rounded-2xl overflow-hidden">
        <MosaicTile
          image={images[0]}
          onClick={() => onImageClick(0)}
          className="row-span-2 aspect-[3/4]"
        />
        <MosaicTile
          image={images[1]}
          onClick={() => onImageClick(1)}
          className="aspect-[4/3]"
        />
        <MosaicTile
          image={images[2]}
          onClick={() => onImageClick(2)}
          className="aspect-[4/3]"
        />
      </div>
    )
  }

  // Four images — 2x2 grid
  if (count === 4) {
    return (
      <div className="grid grid-cols-2 gap-1 max-w-md rounded-2xl overflow-hidden">
        {images.map((img, i) => (
          <MosaicTile
            key={i}
            image={img}
            onClick={() => onImageClick(i)}
            className="aspect-square"
          />
        ))}
      </div>
    )
  }

  // 5+ images — 2x2 + overlay "+N" on fourth
  const visible = images.slice(0, 4)
  const remaining = count - 4

  return (
    <div className="grid grid-cols-2 gap-1 max-w-md rounded-2xl overflow-hidden">
      {visible.map((img, i) => (
        <MosaicTile
          key={i}
          image={img}
          onClick={() => onImageClick(i)}
          className="aspect-square"
          overlay={
            i === 3 ? (
              <div className="absolute inset-0 bg-black/55 flex items-center justify-center backdrop-blur-[2px]">
                <span className="text-white text-2xl sm:text-3xl font-semibold tracking-tight">
                  +{remaining}
                </span>
              </div>
            ) : null
          }
        />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Single image — respects natural aspect ratio                       */
/* ------------------------------------------------------------------ */

function SingleImage({
  image,
  onClick,
}: {
  image: Attachment
  onClick: () => void
}) {
  const [ratio, setRatio] = useState<number | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    if (img.naturalWidth && img.naturalHeight) {
      // Clamp ratio between 0.5 (tall portrait) and 1.91 (wide landscape) — Instagram-like
      const raw = img.naturalWidth / img.naturalHeight
      const clamped = Math.max(0.5, Math.min(1.91, raw))
      setRatio(clamped)
    }
    setLoaded(true)
  }

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    // Swallow the error event so it doesn't bubble up to window
    // and appear as a generic {isTrusted: true} runtime error.
    e.preventDefault()
    e.stopPropagation()
    if (e.currentTarget.src !== window.location.origin + "/placeholder.svg") {
      e.currentTarget.src = "/placeholder.svg"
    }
    setErrored(true)
    setLoaded(true)
  }

  return (
    <button
      onClick={onClick}
      className="group relative block w-full max-w-[480px] overflow-hidden rounded-2xl bg-muted transition-shadow hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      style={ratio ? { aspectRatio: ratio } : { aspectRatio: 1 }}
      aria-label={image.name || "عرض الصورة"}
    >
      <img
        src={image.url || "/placeholder.svg"}
        alt={image.name || "صورة"}
        loading="lazy"
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          "h-full w-full object-cover transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
          errored && "opacity-50",
        )}
      />
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden />
      )}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/20 group-hover:opacity-100">
        <ZoomIn className="h-7 w-7 text-white drop-shadow-lg" />
      </div>
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Mosaic tile                                                        */
/* ------------------------------------------------------------------ */

function MosaicTile({
  image,
  onClick,
  className,
  overlay,
}: {
  image: Attachment
  onClick: () => void
  className?: string
  overlay?: React.ReactNode
}) {
  const [loaded, setLoaded] = useState(false)

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.currentTarget.src !== window.location.origin + "/placeholder.svg") {
      e.currentTarget.src = "/placeholder.svg"
    }
    setLoaded(true)
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative block w-full overflow-hidden bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
        className,
      )}
      aria-label={image.name || "عرض الصورة"}
    >
      <img
        src={image.url || "/placeholder.svg"}
        alt={image.name || "صورة"}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={handleError}
        className={cn(
          "h-full w-full object-cover transition-all duration-300 group-hover:scale-[1.03]",
          loaded ? "opacity-100" : "opacity-0",
        )}
      />
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden />
      )}
      <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-200 group-hover:bg-black/10" />
      {overlay}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Lightbox with Embla carousel                                       */
/* ------------------------------------------------------------------ */

function Lightbox({
  images,
  startIndex,
  onClose,
}: {
  images: Attachment[]
  startIndex: number
  onClose: () => void
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    startIndex,
    loop: images.length > 1,
    direction: "rtl",
    align: "center",
  })
  const [currentIndex, setCurrentIndex] = useState(startIndex)
  const [zoomed, setZoomed] = useState(false)

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    const onSelect = () => {
      setCurrentIndex(emblaApi.selectedScrollSnap())
      setZoomed(false)
    }
    emblaApi.on("select", onSelect)
    return () => {
      emblaApi.off("select", onSelect)
    }
  }, [emblaApi])

  // Keyboard navigation + ESC to close + scroll lock
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      else if (e.key === "ArrowRight") scrollPrev() // RTL: right = previous
      else if (e.key === "ArrowLeft") scrollNext()
    }
    window.addEventListener("keydown", onKey)

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = originalOverflow
    }
  }, [onClose, scrollPrev, scrollNext])

  const current = images[currentIndex]

  const handleDownload = async () => {
    if (!current?.url) return
    try {
      const res = await fetch(current.url)
      if (!res.ok) throw new Error("Download failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = current.name || `image-${currentIndex + 1}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      window.open(current.url, "_blank")
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="معرض الصور"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
          aria-label="إغلاق"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-sm font-medium tabular-nums">
          {currentIndex + 1} / {images.length}
        </div>

        <button
          onClick={handleDownload}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
          aria-label="تحميل الصورة"
        >
          <Download className="h-5 w-5" />
        </button>
      </div>

      {/* Carousel */}
      <div className="relative flex-1 overflow-hidden" dir="rtl">
        <div className="h-full" ref={emblaRef}>
          <div className="flex h-full">
            {images.map((img, i) => (
              <div
                key={i}
                className="relative flex h-full min-w-0 flex-[0_0_100%] items-center justify-center px-2 sm:px-8"
              >
                <ZoomableImage
                  src={img.url}
                  alt={img.name || `صورة ${i + 1}`}
                  active={i === currentIndex}
                  zoomed={i === currentIndex ? zoomed : false}
                  onToggleZoom={() => setZoomed((z) => !z)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Nav arrows — hidden when single image */}
        {images.length > 1 && (
          <>
            <button
              onClick={scrollPrev}
              className="absolute right-2 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-all hover:bg-white/20 sm:flex"
              aria-label="السابق"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
            <button
              onClick={scrollNext}
              className="absolute left-2 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-all hover:bg-white/20 sm:flex"
              aria-label="التالي"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      {/* Bottom bar: caption + dots */}
      <div className="space-y-3 px-4 pb-6 pt-3 text-white">
        {current?.name && (
          <p className="mx-auto max-w-2xl truncate text-center text-sm text-white/80">
            {current.name}
          </p>
        )}

        {images.length > 1 && (
          <div className="flex items-center justify-center gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => emblaApi?.scrollTo(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-200",
                  i === currentIndex
                    ? "w-6 bg-white"
                    : "w-1.5 bg-white/40 hover:bg-white/60",
                )}
                aria-label={`الانتقال إلى الصورة ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Zoomable image — double-tap / double-click to zoom                 */
/* ------------------------------------------------------------------ */

function ZoomableImage({
  src,
  alt,
  active,
  zoomed,
  onToggleZoom,
}: {
  src: string
  alt: string
  active: boolean
  zoomed: boolean
  onToggleZoom: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const lastTapRef = useRef<number>(0)

  const handleClick = () => {
    const now = Date.now()
    if (now - lastTapRef.current < 300) {
      onToggleZoom()
    }
    lastTapRef.current = now
  }

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.currentTarget.src !== window.location.origin + "/placeholder.svg") {
      e.currentTarget.src = "/placeholder.svg"
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full items-center justify-center"
      onClick={handleClick}
    >
      <img
        src={src || "/placeholder.svg"}
        alt={alt}
        draggable={false}
        loading={active ? "eager" : "lazy"}
        onError={handleError}
        className={cn(
          "max-h-full max-w-full select-none object-contain transition-transform duration-300 ease-out",
          zoomed ? "scale-[2] cursor-zoom-out" : "scale-100 cursor-zoom-in",
        )}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Documents list (unchanged behavior, cleaner styles)                */
/* ------------------------------------------------------------------ */

function DocumentsList({
  documents,
  isOwn,
}: {
  documents: Attachment[]
  isOwn: boolean
}) {
  const getFileIcon = (name: string) => {
    const ext = name?.split(".").pop()?.toLowerCase()
    if (ext === "pdf") return <FileText className="h-5 w-5 text-red-500" />
    if (ext === "docx" || ext === "doc")
      return <FileText className="h-5 w-5 text-blue-500" />
    if (ext === "md") return <FileText className="h-5 w-5 text-muted-foreground" />
    return <File className="h-5 w-5" />
  }

  return (
    <div className="space-y-2">
      {documents.map((attachment, index) => (
        <a
          key={index}
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          download={attachment.name}
          className={cn(
            "flex items-center gap-3 rounded-lg border p-3 transition-all duration-200 hover:shadow-md hover:scale-[1.01]",
            isOwn
              ? "border-white/20 bg-white/10 hover:bg-white/15"
              : "border-border bg-muted hover:bg-muted/80",
          )}
        >
          <div className="flex-shrink-0">{getFileIcon(attachment.name || "")}</div>
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "truncate text-sm font-medium",
                isOwn ? "text-white" : "text-foreground",
              )}
            >
              {attachment.name}
            </p>
            {attachment.size && (
              <p
                className={cn(
                  "text-xs",
                  isOwn ? "text-white/60" : "text-muted-foreground",
                )}
              >
                {(attachment.size / 1024).toFixed(1)} KB
              </p>
            )}
          </div>
          <div className="flex-shrink-0">
            <Download
              className={cn(
                "h-5 w-5 transition-transform duration-200 hover:scale-110",
                isOwn ? "text-white/70" : "text-muted-foreground",
              )}
            />
          </div>
        </a>
      ))}
    </div>
  )
}
