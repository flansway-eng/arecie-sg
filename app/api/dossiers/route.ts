import { NextResponse } from "next/server"
import { getDossiers } from "@/lib/graph"
import { auth } from "@/auth"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  try {
    const dossiers = await getDossiers()
    return NextResponse.json(dossiers)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
