import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"

// هذا endpoint مؤقت فقط لتوليد hash - سيتم حذفه بعد الاستخدام
export async function POST(request: Request) {
  try {
    const { password } = await request.json()
    
    if (!password) {
      return NextResponse.json({ error: "Password required" }, { status: 400 })
    }

    const hash = await bcrypt.hash(password, 12)
    
    console.log("[v0] Generated bcrypt hash:", hash)
    
    return NextResponse.json({ 
      hash,
      message: "Copy this hash and update the database, then DELETE this endpoint!"
    })
  } catch (error) {
    console.error("Hash generation error:", error)
    return NextResponse.json({ error: "Error" }, { status: 500 })
  }
}
