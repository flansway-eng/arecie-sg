import { auth } from "@/auth"
import { getDossiers } from "@/lib/graph"
import Link from "next/link"
import { signOut } from "@/auth"

const statutColors: Record<string, string> = {
  "En attente": "bg-yellow-100 text-yellow-800",
  "Valide": "bg-green-100 text-green-800",
  "Incomplet": "bg-orange-100 text-orange-800",
  "Rejete": "bg-red-100 text-red-800",
}

export default async function Dashboard() {
  const session = await auth()
  const dossiers = await getDossiers()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-blue-900">ARECIE-SG</h1>
          <p className="text-sm text-gray-500">Tableau de bord de validation</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{session?.user?.name}</span>
          <form action={async () => { "use server"; await signOut() }}>
            <button className="text-sm text-red-600 hover:underline">Deconnexion</button>
          </form>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800">
            Dossiers ASMAR 2026 — {dossiers.length} dossier(s)
          </h2>
        </div>
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Adherent</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">N Adherent</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Telephone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Statut</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {dossiers.map((d: Record<string, unknown>) => {
                const f = d.fields as Record<string, string>
                const statut = f?.Statutdudossier || "En attente"
                const colorClass = statutColors[statut] || "bg-gray-100 text-gray-700"
                return (
                  <tr key={d.id as string} className="hover:bg-blue-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{f?.Title}</td>
                    <td className="px-4 py-3 text-gray-600">{f?.N_x00b0_adh_x00e9_rent || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{f?.Typeadh_x00e9_rent}</td>
                    <td className="px-4 py-3 text-gray-600">{f?.T_x00e9_l_x00e9_phoneWhatsApp}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
                        {statut}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/dossiers/${d.id}`} className="text-blue-600 hover:underline font-medium">
                        Ouvrir
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {dossiers.length === 0 && (
            <div className="text-center py-12 text-gray-400">Aucun dossier pour le moment</div>
          )}
        </div>
      </main>
    </div>
  )
}
