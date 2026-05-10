"use client"

interface PhotoItem {
  id: string
  name: string
  "@microsoft.graph.downloadUrl"?: string
  file?: { mimeType?: string }
}

export default function PhotoGrid({ photos }: { photos: PhotoItem[] }) {
  if (photos.length === 0) {
    return <p className="text-gray-400 text-sm">Aucun document trouve</p>
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {photos.map((photo) => {
        const url = photo["@microsoft.graph.downloadUrl"] || ""
        const isImage = photo.file?.mimeType?.startsWith("image/") ||
          /\.(jpg|jpeg|png|gif|webp)$/i.test(photo.name)

        return (
          <a
            key={photo.id}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block border rounded-lg overflow-hidden hover:shadow-md transition-shadow group"
          >
            <div className="w-full h-36 overflow-hidden bg-gray-100 flex items-center justify-center">
              {isImage ? (
                <img
                  src={url}
                  alt={photo.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  onError={(e) => {
                    const t = e.target as HTMLImageElement
                    t.style.display = "none"
                    t.parentElement!.innerHTML =
                      '<span class="text-gray-400 text-xs text-center px-2">Image non disponible</span>'
                  }}
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-xs">PDF</span>
                </div>
              )}
            </div>
            <p className="text-xs text-center py-1.5 text-gray-600 truncate px-2 border-t">
              {photo.name}
            </p>
          </a>
        )
      })}
    </div>
  )
}
