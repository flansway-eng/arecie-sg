import { NextResponse } from "next/server"
import { getDossier, updateDossier } from "@/lib/graph"
import { auth } from "@/auth"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non autorise" }, { status: 401 })
  const { id } = await params
  try {
    const dossier = await getDossier(id)
    return NextResponse.json(dossier)
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non autorise" }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  try {
    const result = await updateDossier(id, body.statut, body.commentaire)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
