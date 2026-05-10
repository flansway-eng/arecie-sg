const TENANT_ID = process.env.AZURE_AD_TENANT_ID!
const CLIENT_ID = process.env.AZURE_AD_CLIENT_ID!
const CLIENT_SECRET = process.env.AZURE_AD_CLIENT_SECRET!
const SP_HOST = process.env.SHAREPOINT_HOST!
const SP_SITE_PATH = process.env.SHAREPOINT_SITE_PATH!
const LIST_ID = process.env.SHAREPOINT_LIST_ID!
const DOCS_DRIVE_ID = process.env.SHAREPOINT_DOCS_DRIVE_ID!
const MAIL_SENDER = process.env.MAIL_SENDER!
const MAIL_RECIPIENT = process.env.MAIL_RECIPIENT!

let cachedToken: { token: string; expiresAt: number } | null = null
let cachedSiteId: string | null = null

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) return cachedToken.token
  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: "https://graph.microsoft.com/.default",
  })
  const res = await fetch(
    `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
    { method: "POST", body: params, headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  )
  const data = await res.json()
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 }
  return cachedToken.token
}

async function g(endpoint: string, options: RequestInit = {}) {
  const token = await getAccessToken()
  return fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...options.headers },
  })
}

async function getSiteId(): Promise<string> {
  if (cachedSiteId) return cachedSiteId
  const res = await g(`/sites/${SP_HOST}:${SP_SITE_PATH}`)
  const data = await res.json()
  cachedSiteId = data.id
  return data.id
}

export async function getDossiers() {
  const siteId = await getSiteId()
  const res = await g(`/sites/${siteId}/lists/${LIST_ID}/items?$expand=fields&$top=500`)
  const data = await res.json()
  return data.value || []
}

export async function getDossier(itemId: string) {
  const siteId = await getSiteId()
  const res = await g(`/sites/${siteId}/lists/${LIST_ID}/items/${itemId}?$expand=fields`)
  return res.json()
}

export async function updateDossier(itemId: string, statut: string, commentaire: string) {
  const siteId = await getSiteId()
  const res = await g(`/sites/${siteId}/lists/${LIST_ID}/items/${itemId}/fields`, {
    method: "PATCH",
    body: JSON.stringify({ Statutdudossier: statut, Commentaires_SG: commentaire }),
  })
  return res.json()
}

export async function getDossierPhotos(folderNameOrNumber: string) {
  // "Documents Adherents" est un drive separe dans SharePoint
  // On utilise son ID directement plutot que le drive principal

  // Liste des dossiers a la racine du drive "Documents Adherents"
  const listRes = await g(`/drives/${DOCS_DRIVE_ID}/root/children`)
  const listData = await listRes.json()
  const folders = listData.value || []

  // Recherche exacte d'abord
  const exactMatch = folders.find((f: Record<string, unknown>) =>
    (f.name as string).toLowerCase() === folderNameOrNumber.toLowerCase()
  )
  if (exactMatch) {
    const res = await g(`/drives/${DOCS_DRIVE_ID}/items/${exactMatch.id}/children`)
    return (await res.json()).value || []
  }

  // Recherche fuzzy par termes
  const searchTerms = folderNameOrNumber.split("_").filter(t => t.length > 2)
  const matchedFolder = folders.find((f: Record<string, unknown>) => {
    const name = (f.name as string).toLowerCase()
    return searchTerms.some(term => name.includes(term.toLowerCase()))
  })

  if (!matchedFolder) return []

  const folderRes = await g(`/drives/${DOCS_DRIVE_ID}/items/${matchedFolder.id}/children`)
  const folderData = await folderRes.json()
  return folderData.value || []
}

export async function sendDossierEmail(dossierFields: Record<string, unknown>) {
  const token = await getAccessToken()
  const f = dossierFields

  const nom = f.Title as string || ""
  const nAdh = f.N_x00b0_adh_x00e9_rent as string || ""
  const type = f.Typeadh_x00e9_rent as string || ""
  const tel = f.T_x00e9_l_x00e9_phoneWhatsApp as string || ""
  const cmu = f.CMUadh_x00e9_rent as string || ""
  const conjoint = f.Aunconjoint ? "Oui" : "Non"
  const nomConjoint = f.Nomconjoint as string || "-"
  const cmuConjoint = f.CMUconjoint as string || "-"
  const nbEnfants = String(f.Nb_x0020_enfants ?? "0")
  const date = f.Datesoumission
    ? new Date(f.Datesoumission as string).toLocaleDateString("fr-FR")
    : ""
  const commentaire = (f.Commentaires_SG as string || "").replace(/<[^>]*>/g, "").trim()

  // Recuperer les documents en pieces jointes
  const lienDossier = f.Lien_x0020_dossier as string | undefined
  let folderName = nom.replace(/ /g, "_")
  if (lienDossier) {
    const decoded = decodeURIComponent(lienDossier)
    const segments = decoded.split("/")
    const last = segments[segments.length - 1]
    if (last && last.length > 0) folderName = last
  }

  const photos = await getDossierPhotos(folderName)
  const attachments: Record<string, string>[] = []

  for (const photo of photos) {
    const downloadUrl = photo["@microsoft.graph.downloadUrl"] as string
    if (!downloadUrl) continue
    try {
      const fileRes = await fetch(downloadUrl)
      const buffer = await fileRes.arrayBuffer()
      const base64 = Buffer.from(buffer).toString("base64")
      const mimeType = (photo.file as Record<string, string>)?.mimeType || "application/octet-stream"
      attachments.push({
        "@odata.type": "#microsoft.graph.fileAttachment",
        name: photo.name as string,
        contentType: mimeType,
        contentBytes: base64,
      })
    } catch {
      // Ignorer les fichiers non telechargeable
    }
  }

  const subject = `Dossier ASMAR 2026 valide - ${nom} (${nAdh})`

  const body = `
<html><body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto">
  <div style="background:#1e3a5f;padding:20px;border-radius:8px 8px 0 0">
    <h2 style="color:white;margin:0">Dossier ASMAR 2026 Valide</h2>
    <p style="color:#a8c4e0;margin:4px 0 0">Secretariat General - ARECIE</p>
  </div>
  <div style="background:#f0f7ff;padding:16px;border-left:4px solid #22c55e">
    <p style="margin:0;font-weight:bold;color:#16a34a">&#10003; Ce dossier a ete valide par la SG</p>
    <p style="margin:4px 0 0;font-size:13px;color:#166534">${attachments.length} document(s) en piece(s) jointe(s)</p>
  </div>
  <div style="padding:24px;background:white;border:1px solid #e5e7eb;border-top:none">
    <h3 style="color:#1e3a5f;margin-top:0">Informations adherent</h3>
    <table style="width:100%;border-collapse:collapse">
      <tr style="background:#f9fafb"><td style="padding:8px 12px;color:#6b7280;width:40%">Nom adherent</td><td style="padding:8px 12px;font-weight:600">${nom}</td></tr>
      <tr><td style="padding:8px 12px;color:#6b7280">N adherent</td><td style="padding:8px 12px;font-weight:600">${nAdh}</td></tr>
      <tr style="background:#f9fafb"><td style="padding:8px 12px;color:#6b7280">Type</td><td style="padding:8px 12px">${type}</td></tr>
      <tr><td style="padding:8px 12px;color:#6b7280">Telephone WhatsApp</td><td style="padding:8px 12px">${tel}</td></tr>
      <tr style="background:#f9fafb"><td style="padding:8px 12px;color:#6b7280">CMU adherent</td><td style="padding:8px 12px">${cmu}</td></tr>
      <tr><td style="padding:8px 12px;color:#6b7280">Conjoint</td><td style="padding:8px 12px">${conjoint}${conjoint === "Oui" ? " - " + nomConjoint : ""}</td></tr>
      ${conjoint === "Oui" ? `<tr style="background:#f9fafb"><td style="padding:8px 12px;color:#6b7280">CMU conjoint</td><td style="padding:8px 12px">${cmuConjoint}</td></tr>` : ""}
      <tr style="background:#f9fafb"><td style="padding:8px 12px;color:#6b7280">Nb enfants</td><td style="padding:8px 12px">${nbEnfants}</td></tr>
      <tr><td style="padding:8px 12px;color:#6b7280">Date soumission</td><td style="padding:8px 12px">${date}</td></tr>
      ${commentaire ? `<tr style="background:#fff7ed"><td style="padding:8px 12px;color:#6b7280">Note SG</td><td style="padding:8px 12px;color:#9a3412">${commentaire}</td></tr>` : ""}
    </table>
  </div>
  <div style="padding:16px;background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;text-align:center">
    <p style="margin:0;font-size:12px;color:#9ca3af">Envoye automatiquement par le systeme ARECIE-SG &bull; ${new Date().toLocaleDateString("fr-FR")}</p>
  </div>
</body></html>`

  const mailPayload: Record<string, unknown> = {
    message: {
      subject,
      body: { contentType: "HTML", content: body },
      toRecipients: [{ emailAddress: { address: MAIL_RECIPIENT } }],
      attachments: attachments.length > 0 ? attachments : undefined,
    },
    saveToSentItems: true,
  }

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${MAIL_SENDER}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(mailPayload),
    }
  )

  if (!res.ok && res.status !== 202) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Erreur envoi email: ${res.status}`)
  }
  return { sent: true, attachments: attachments.length }
}
