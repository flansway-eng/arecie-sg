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
  const [sending, setSending] = useState(false)
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

  const handleSendDPS = async () => {
    setSending(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/dossiers/${id}/send`, { method: "POST" })
      const data = await res.json()
      if (res.ok) {
        setMessage({ text: "Dossier envoye a arecie@flansway.com !", ok: true })
        setTimeout(() => { setMessage(null); router.refresh() }, 3000)
      } else {
        setMessage({ text: data.error || "Erreur lors de l'envoi", ok: false })
      }
    } catch {
      setMessage({ text: "Erreur reseau lors de l'envoi", ok: false })
    } finally {
      setSending(false)
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

      {statut === "Valide" && (
        <button onClick={handleSendDPS} disabled={sending}
          className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
          {sending ? (
            "Envoi en cours..."
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Envoyer a la DPS
            </>
          )}
        </button>
      )}
    </div>
  )
}
