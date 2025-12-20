import { createClient } from "@/lib/supabase/client"

export type DocumentType = "privacy_policy" | "terms_of_service"

export interface LegalDocument {
  id: string
  document_type: DocumentType
  title: string
  content: string
  version: number
  is_active: boolean
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface UserConsent {
  id: string
  user_id: string
  privacy_policy_version: number
  terms_of_service_version: number
  ip_address: string | null
  user_agent: string | null
  consented_at: string
}

// Get active document by type
export async function getActiveDocument(type: DocumentType): Promise<LegalDocument | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("legal_documents")
    .select("*")
    .eq("document_type", type)
    .eq("is_active", true)
    .order("version", { ascending: false })
    .limit(1)
    .single()

  if (error) {
    console.error("Error fetching legal document:", error)
    return null
  }

  return data
}

// Get all versions of a document
export async function getAllDocumentVersions(type: DocumentType): Promise<LegalDocument[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("legal_documents")
    .select("*")
    .eq("document_type", type)
    .order("version", { ascending: false })

  if (error) {
    console.error("Error fetching document versions:", error)
    return []
  }

  return data || []
}

// Create or update a document (creates new version)
export async function createDocumentVersion(
  type: DocumentType,
  title: string,
  content: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  // Get current active version
  const currentDoc = await getActiveDocument(type)
  const newVersion = currentDoc ? currentDoc.version + 1 : 1

  // Deactivate current version
  if (currentDoc) {
    await supabase.from("legal_documents").update({ is_active: false }).eq("id", currentDoc.id)
  }

  // Insert new version
  const { error } = await supabase.from("legal_documents").insert({
    document_type: type,
    title,
    content,
    version: newVersion,
    is_active: true,
  })

  if (error) {
    console.error("Error creating document version:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

// Record user consent
export async function recordUserConsent(
  userId: string,
  privacyPolicyVersion: number,
  termsVersion: number,
  ipAddress?: string,
  userAgent?: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  const { error } = await supabase.from("user_consents").insert({
    user_id: userId,
    privacy_policy_version: privacyPolicyVersion,
    terms_of_service_version: termsVersion,
    ip_address: ipAddress,
    user_agent: userAgent,
  })

  if (error) {
    console.error("Error recording consent:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

// Check if user has consented to latest versions
export async function hasUserConsented(userId: string): Promise<boolean> {
  const supabase = createClient()

  // Get latest versions
  const privacyPolicy = await getActiveDocument("privacy_policy")
  const termsOfService = await getActiveDocument("terms_of_service")

  if (!privacyPolicy || !termsOfService) return false

  // Check if user has consent for these versions
  const { data, error } = await supabase
    .from("user_consents")
    .select("*")
    .eq("user_id", userId)
    .eq("privacy_policy_version", privacyPolicy.version)
    .eq("terms_of_service_version", termsOfService.version)
    .single()

  return !error && !!data
}
