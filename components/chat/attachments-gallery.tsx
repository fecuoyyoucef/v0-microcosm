"use client"

import { useState } from "react"
import { FileText, Download, File } from "lucide-react"
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
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)

  if (!attachments || !Array.isArray(attachments) || attachments.length === 0) {
    return null
  }

  const images = attachments.filter((a) => a.type === "image")
  const documents = attachments.filter((a) => a.type === "document")

  const getFileIcon = (name: string) => {
    const ext = name?.split(".").pop()?.toLowerCase()
    if (ext === "pdf") return <FileText className="w-5 h-5 text-red-500" />
    if (ext === "docx" || ext === "doc") return <FileText className="w-5 h-5 text-blue-500" />
    if (ext === "md") return <FileText className="w-5 h-5 text-gray-500" />
    return <File className="w-5 h-5" />
  }

  return (
    <div className="mt-3 space-y-3">
      {/* صور في Grid */}
      {images.length > 0 && (
        <div
          className={cn(
            "grid gap-2",
            images.length === 1
              ? "grid-cols-1 w-fit"
              : images.length === 2
                ? "grid-cols-2 w-fit"
                : "grid-cols-3 w-fit max-w-md",
          )}
        >
          {images.map((attachment, index) => (
            <button
              key={index}
              onClick={() => setSelectedImageIndex(index)}
              className="relative rounded-lg overflow-hidden group cursor-pointer transition-transform duration-200 hover:scale-105"
            >
              <img
                src={attachment.url || "/placeholder.svg"}
                alt={attachment.name || "صورة"}
                className="rounded-lg object-cover w-[150px] h-[150px] sm:w-[180px] sm:h-[180px]"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-lg">
                <span className="text-white text-xs font-medium">انقر للتكبير</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedImageIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* صورة رئيسية */}
            <div className="flex-1 flex items-center justify-center overflow-auto">
              <img
                src={images[selectedImageIndex].url || "/placeholder.svg"}
                alt={images[selectedImageIndex].name || "صورة"}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            </div>

            {/* معلومات أسفل الصورة */}
            {images[selectedImageIndex].name && (
              <div className="bg-black/40 text-white text-center py-2 text-sm mt-2 rounded-lg backdrop-blur-sm">
                {images[selectedImageIndex].name}
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-4 gap-2">
              {/* زر السابق */}
              <button
                onClick={() =>
                  setSelectedImageIndex(selectedImageIndex === 0 ? images.length - 1 : selectedImageIndex - 1)
                }
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                السابق
              </button>

              {/* عداد الصور */}
              <span className="text-white text-sm font-medium bg-black/40 px-3 py-2 rounded-lg backdrop-blur-sm">
                {selectedImageIndex + 1} / {images.length}
              </span>

              {/* زر التالي */}
              <button
                onClick={() =>
                  setSelectedImageIndex(selectedImageIndex === images.length - 1 ? 0 : selectedImageIndex + 1)
                }
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                التالي
              </button>
            </div>

            {/* زر الإغلاق */}
            <button
              onClick={() => setSelectedImageIndex(null)}
              className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-200 backdrop-blur-sm"
            >
              ✕
            </button>
          </div>

          {/* إغلاق عند الضغط خارج الصورة */}
          <div className="absolute inset-0 -z-10" onClick={() => setSelectedImageIndex(null)} />
        </div>
      )}

      {/* ملفات المستندات */}
      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((attachment, index) => (
            <a
              key={index}
              href={attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              download={attachment.name}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 hover:shadow-md hover:scale-[1.02]",
                isOwn ? "bg-white/10 border-white/20 hover:bg-white/15" : "bg-muted border-border hover:bg-muted/80",
              )}
            >
              {/* أيقونة الملف */}
              <div className="flex-shrink-0">{getFileIcon(attachment.name || "")}</div>

              {/* معلومات الملف */}
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium truncate", isOwn ? "text-white" : "text-foreground")}>
                  {attachment.name}
                </p>
                {attachment.size && (
                  <p className={cn("text-xs", isOwn ? "text-white/60" : "text-muted-foreground")}>
                    {(attachment.size / 1024).toFixed(1)} KB
                  </p>
                )}
              </div>

              {/* زر التحميل */}
              <div className="flex-shrink-0">
                <Download
                  className={cn(
                    "w-5 h-5 transition-transform duration-200 hover:scale-110",
                    isOwn ? "text-white/70" : "text-muted-foreground",
                  )}
                />
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
