"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

const STATUTS = ["En attente", "Valide", "Incomplet", "Rejete"]

const statutColors: Record<string, string> = {
  "En attente": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "Valide": "bg-green-100 text-green-800 border-green-200",
  "Incomplet": "bg-orange-100 text-orange-800 border-orange-200",
  "Rejete": "bg-red-100 text-red-800 border-red-200",
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
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const router = useRouter()

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/dossiers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut, commentaire }),
      })
      if (res.ok) {
        setMessage({ text: "Decision enregistree avec succes !", ok: true })
        setTimeout(() => { setMessage(null); router.refresh() }, 2000)
      } else {
        const data = await res.json().catch(() => ({}))
        setMessage({ text: data.error || "Erreur lors de l'enregistrement", ok: false })
      }
    } catch {
      setMessage({ text: "Erreur reseau, verifiez votre connexion", ok: false })
    } finally {
      setSaving(false)
    }
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
                (statut === s
                  ? (statutColors[s] || "bg-gray-100 border-gray-200")
                  : "border-gray-200 text-gray-600 hover:bg-gray-50")}>
              {s}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-sm text-gray-500 mb-2 block">Commentaire</label>
        <textarea value={commentaire} onChange={e => setCommentaire(e.target.value)}
          rows={4} placeholder="Votre note de verification..."
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
      </div>
      {message && (
        <p className={"text-sm px-3 py-2 rounded-lg " + (message.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700")}>
          {message.text}
        </p>
      )}
      <button onClick={handleSave} disabled={saving}
        className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
        {saving ? "Enregistrement..." : "Enregistrer la decision"}
      </button>
    </div>
  )
}
