import { NextResponse } from "next/server"
import { getDossier, sendDossierEmail, updateDossier } from "@/lib/graph"
import { auth } from "@/auth"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non autorise" }, { status: 401 })

  const { id } = await params
  try {
    const dossier = await getDossier(id)
    const f = dossier.fields

    if (f?.Statutdudossier !== "Valide") {
      return NextResponse.json({ error: "Le dossier doit etre valide avant envoi" }, { status: 400 })
    }

    await sendDossierEmail(f)

    // Marquer comme envoye dans le commentaire
    const timestamp = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    const commentaire = (f?.Commentaires_SG || "").replace(/<[^>]*>/g, "").trim()
    const newCommentaire = commentaire
      ? commentaire + "\n\nEnvoye a la DPS le " + timestamp
      : "Envoye a la DPS le " + timestamp

    await updateDossier(id, "Valide", newCommentaire)

    return NextResponse.json({ sent: true, timestamp })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Erreur serveur"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
