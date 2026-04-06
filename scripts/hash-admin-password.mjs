/**
 * هذا السكريبت يُنشئ hash مشفر لكلمة مرور الأدمن
 * شغّله مرة واحدة ثم ضع الـ hash الناتج في قاعدة البيانات
 *
 * طريقة الاستخدام:
 *   node scripts/hash-admin-password.mjs
 */

import { createHash } from "crypto"

// كلمة المرور الحالية التي تريد تشفيرها
const password = "F1E2C3U4O5Y6"

// نستخدم SHA-256 مع salt ثابت لأن bcrypt غير متاح بدون npm في next-lite
// في الإنتاج الحقيقي استخدم bcrypt
const salt = "synaptic_space_admin_salt_2024"
const hash = createHash("sha256")
  .update(salt + password)
  .digest("hex")

console.log("=".repeat(60))
console.log("Password Hash Generated:")
console.log(hash)
console.log("=".repeat(60))
console.log("\nRun this SQL to update your admin password in Supabase:")
console.log(`
UPDATE admins 
SET password_hash = '${hash}',
    salt = '${salt}'
WHERE email = 'youcef192837@gmail.com';
`)
