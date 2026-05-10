import { auth } from "@/auth"
import { getDossier, getDossierPhotos } from "@/lib/graph"
import Link from "next/link"
import DossierActions from "./DossierActions"
import PhotoGrid, { type PhotoItem } from "./PhotoGrid"

function stripHtml(html: string | undefined): string {
  if (!html) return ""
  // SharePoint stocke les textes multi-lignes en HTML - on extrait le texte brut
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim()
}

function extractFolderName(lienDossier: string | undefined, title: string): string {
  if (lienDossier) {
    const decoded = decodeURIComponent(lienDossier)
    const segments = decoded.split("/")
    const last = segments[segments.length - 1]
    if (last && last.length > 0) return last
  }
  return title?.replace(/ /g, "_") || ""
}

export default async function DossierDetail({ params }: { params: Promise<{ id: string }> }) {
  await auth()
  const { id } = await params
  const dossier = await getDossier(id)
  const f = dossier.fields

  const folderName = extractFolderName(f?.Lien_x0020_dossier, f?.Title)

  let photos: Record<string, unknown>[] = []
  try { photos = await getDossierPhotos(folderName) } catch (e) {
    console.error("Photos error:", e)
    photos = []
  }

  const champs = [
    { label: "Nom adherent", value: f?.Title },
    { label: "N adherent", value: f?.N_x00b0_adh_x00e9_rent },
    { label: "Telephone", value: f?.T_x00e9_l_x00e9_phoneWhatsApp },
    { label: "Type", value: f?.Typeadh_x00e9_rent },
    { label: "CMU adherent", value: f?.CMUadh_x00e9_rent },
    { label: "A un conjoint", value: f?.Aunconjoint ? "Oui" : "Non" },
    { label: "Nom conjoint", value: f?.Nomduconjoint },
    { label: "CMU conjoint", value: f?.CMUconjoint },
    { label: "Nb enfants", value: f?.Nb_x0020_enfants?.toString() },
    { label: "Date soumission", value: f?.Datesoumission ? new Date(f.Datesoumission).toLocaleDateString("fr-FR") : "" },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <Link href="/" className="text-blue-600 hover:underline text-sm">Retour</Link>
        <h1 className="text-lg font-bold text-blue-900">{f?.Title}</h1>
        <span className="text-sm text-gray-500">{f?.Typeadh_x00e9_rent}</span>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Informations</h2>
            <dl className="space-y-2">
              {champs.filter(c => c.value).map(c => (
                <div key={c.label} className="flex gap-2 text-sm">
                  <dt className="text-gray-500 w-36 shrink-0">{c.label}</dt>
                  <dd className="font-medium text-gray-900">{c.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <DossierActions
            id={id}
            currentStatut={f?.Statutdudossier || "En attente"}
            currentCommentaire={stripHtml(f?.Commentaires_SG)}
          />
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="font-semibold text-gray-800 mb-1">Documents ({photos.length})</h2>
          <p className="text-xs text-gray-400 mb-4">Dossier: {folderName}</p>
          <PhotoGrid photos={photos as unknown as PhotoItem[]} />
        </div>
      </main>
    </div>
  )
}
