const TENANT_ID = process.env.AZURE_AD_TENANT_ID!
const CLIENT_ID = process.env.AZURE_AD_CLIENT_ID!
const CLIENT_SECRET = process.env.AZURE_AD_CLIENT_SECRET!
const SP_HOST = process.env.SHAREPOINT_HOST!
const SP_SITE_PATH = process.env.SHAREPOINT_SITE_PATH!
const LIST_ID = process.env.SHAREPOINT_LIST_ID!
const DOCS_DRIVE_ID = process.env.SHAREPOINT_DOCS_DRIVE_ID!

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
