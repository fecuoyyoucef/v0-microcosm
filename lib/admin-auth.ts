import { cookies } from "next/headers"
import { createHash, randomBytes, timingSafeEqual } from "crypto"
import bcrypt from "bcryptjs"
import { createClient } from "@/lib/supabase/server"

// مفتاح سري للتوقيع - يجب أن يكون في متغيرات البيئة
const getSecretKey = () => {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_JWT_SECRET
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET or SUPABASE_JWT_SECRET is required")
  }
  return secret
}

// بريد المالك - من متغيرات البيئة
const OWNER_EMAIL = process.env.OWNER_EMAIL || ""

export interface AdminSession {
  id: string
  email: string
  role: string
  iat: number // issued at
  exp: number // expires at
}

/**
 * إنشاء توقيع HMAC للـ token
 */
function createSignature(payload: string): string {
  const secret = getSecretKey()
  return createHash("sha256").update(payload + secret).digest("hex")
}

/**
 * التحقق من التوقيع بطريقة آمنة (مقاومة لـ timing attacks)
 */
function verifySignature(payload: string, signature: string): boolean {
  const expectedSignature = createSignature(payload)
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  } catch {
    return false
  }
}

/**
 * إنشاء session token موقّع
 */
export function createAdminToken(admin: { id: string; email: string; role: string }): string {
  const now = Date.now()
  const payload: AdminSession = {
    id: admin.id,
    email: admin.email,
    role: admin.role,
    iat: now,
    exp: now + 7 * 24 * 60 * 60 * 1000, // 7 أيام
  }

  const payloadString = JSON.stringify(payload)
  const payloadBase64 = Buffer.from(payloadString).toString("base64url")
  const signature = createSignature(payloadString)

  // Format: payload.signature
  return `${payloadBase64}.${signature}`
}

/**
 * فك وتحقق من صحة الـ token
 */
export function verifyAdminToken(token: string): AdminSession | null {
  try {
    const parts = token.split(".")
    if (parts.length !== 2) {
      // دعم التوكنات القديمة للتوافقية - ولكن نرفضها
      console.warn("Old token format detected - rejecting for security")
      return null
    }

    const [payloadBase64, signature] = parts
    const payloadString = Buffer.from(payloadBase64, "base64url").toString()

    // التحقق من التوقيع
    if (!verifySignature(payloadString, signature)) {
      console.warn("Invalid token signature")
      return null
    }

    const payload = JSON.parse(payloadString) as AdminSession

    // التحقق من انتهاء الصلاحية
    if (payload.exp < Date.now()) {
      console.warn("Token expired")
      return null
    }

    return payload
  } catch (error) {
    console.error("Token verification error:", error)
    return null
  }
}

/**
 * الحصول على session الأدمن الحالي
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("admin_session")?.value

  if (!token) {
    return null
  }

  return verifyAdminToken(token)
}

/**
 * التحقق من أن المستخدم أدمن صالح
 */
export async function verifyAdmin(): Promise<AdminSession | null> {
  const session = await getAdminSession()

  if (!session) {
    return null
  }

  // التحقق من أن الأدمن لا يزال نشطاً في قاعدة البيانات
  const supabase = await createClient()
  const { data: admin, error } = await supabase
    .from("admins")
    .select("id, email, role, is_active")
    .eq("id", session.id)
    .eq("is_active", true)
    .single()

  if (error || !admin) {
    return null
  }

  // التحقق من تطابق الدور (للكشف عن تعديل الصلاحيات)
  if (admin.role !== session.role) {
    console.warn("Role mismatch - session may be stale")
    // نعيد البيانات الصحيحة من قاعدة البيانات
    return {
      ...session,
      role: admin.role,
    }
  }

  return session
}

/**
 * التحقق من أن المستخدم super_admin
 */
export async function verifySuperAdmin(): Promise<AdminSession | null> {
  const session = await verifyAdmin()

  if (!session || session.role !== "super_admin") {
    return null
  }

  return session
}

/**
 * تشفير كلمة المرور باستخدام bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  // bcrypt يولّد salt تلقائياً ويدمجه مع الـ hash
  const saltRounds = 12 // قوة التشفير
  return bcrypt.hash(password, saltRounds)
}

/**
 * التحقق من كلمة المرور
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * التحقق من كلمة المرور القديمة (SHA-256 + salt) للتوافقية
 */
export function verifyLegacyPassword(password: string, hash: string, salt: string): boolean {
  const inputHash = createHash("sha256").update(salt + password).digest("hex")
  try {
    return timingSafeEqual(Buffer.from(inputHash), Buffer.from(hash))
  } catch {
    return false
  }
}

/**
 * التحقق من كلمة المرور (تدعم الصيغتين القديمة والجديدة)
 */
export async function verifyPasswordUniversal(
  password: string,
  storedHash: string,
  salt?: string | null
): Promise<{ valid: boolean; needsUpgrade: boolean }> {
  // إذا كان هناك salt منفصل، فهذا النظام القديم
  if (salt) {
    const valid = verifyLegacyPassword(password, storedHash, salt)
    return { valid, needsUpgrade: true }
  }

  // bcrypt hash يبدأ بـ $2
  if (storedHash.startsWith("$2")) {
    const valid = await verifyPassword(password, storedHash)
    return { valid, needsUpgrade: false }
  }

  // حالة غير متوقعة
  return { valid: false, needsUpgrade: false }
}

/**
 * توليد معرّف عشوائي آمن
 */
export function generateSecureId(): string {
  return randomBytes(32).toString("hex")
}

/**
 * التحقق من أن البريد هو بريد المالك
 */
export function isOwnerEmail(email: string): boolean {
  return OWNER_EMAIL && email.toLowerCase() === OWNER_EMAIL.toLowerCase()
}
