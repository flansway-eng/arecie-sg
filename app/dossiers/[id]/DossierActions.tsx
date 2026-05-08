"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

const STATUTS = ["En attente", "Valide", "Incomplet", "Rejete"]

const statutColors: Record<string, string> = {
  "En attente": "bg-yellow-100 text-yellow-800",
  "Valide": "bg-green-100 text-green-800",
  "Incomplet": "bg-orange-100 text-orange-800",
  "Rejete": "bg-red-100 text-red-800",
}

export default function DossierActions({
  id, currentStatut, currentCommentaire
}: {
  id: string
  currentStatut: string
  currentCommentaire: string
}) {
  const [statut, setStatut] = useState(currentStatut)
  const [commentaire, setCommentaire] = useState(currentCommentaire)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const router = useRouter()

  const handleSave = async () => {
    setSaving(true)
    await fetch(`/api/dossiers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut, commentaire }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => { setSaved(false); router.refresh() }, 2000)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
      <h2 className="font-semibold text-gray-800">Decision SG</h2>
      <div>
        <label className="text-sm text-gray-500 mb-2 block">Statut</label>
        <div className="flex flex-wrap gap-2">
          {STATUTS.map(s => (
            <button key={s} onClick={() => setStatut(s)}
              className={"px-3 py-1.5 rounded-full text-sm font-medium border transition-all " +
                (statut === s ? (statutColors[s] || "bg-gray-100") + " border-transparent" : "border-gray-200 text-gray-600 hover:bg-gray-50")}>
              {s}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-sm text-gray-500 mb-2 block">Commentaire</label>
        <textarea value={commentaire} onChange={e => setCommentaire(e.target.value)}
          rows={4} placeholder="Votre note de verification..."
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <button onClick={handleSave} disabled={saving}
        className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
        {saving ? "Enregistrement..." : saved ? "Enregistre !" : "Enregistrer la decision"}
      </button>
    </div>
  )
}
