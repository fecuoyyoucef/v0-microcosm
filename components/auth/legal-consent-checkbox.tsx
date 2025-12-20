"use client"

import { useState } from "react"
import Link from "next/link"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface LegalConsentCheckboxProps {
  onConsentChange: (consented: boolean) => void
  required?: boolean
}

export function LegalConsentCheckbox({ onConsentChange, required = true }: LegalConsentCheckboxProps) {
  const [privacyChecked, setPrivacyChecked] = useState(false)
  const [termsChecked, setTermsChecked] = useState(false)

  const handlePrivacyChange = (checked: boolean) => {
    setPrivacyChecked(checked)
    onConsentChange(checked && termsChecked)
  }

  const handleTermsChange = (checked: boolean) => {
    setTermsChecked(checked)
    onConsentChange(privacyChecked && checked)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <Checkbox
          id="privacy-consent"
          checked={privacyChecked}
          onCheckedChange={handlePrivacyChange}
          required={required}
          className="mt-1"
        />
        <Label htmlFor="privacy-consent" className="text-sm leading-relaxed cursor-pointer">
          أوافق على{" "}
          <Link href="/legal/privacy" target="_blank" className="text-primary hover:underline font-medium">
            سياسة الخصوصية
          </Link>
          {required && <span className="text-destructive mr-1">*</span>}
        </Label>
      </div>

      <div className="flex items-start gap-2">
        <Checkbox
          id="terms-consent"
          checked={termsChecked}
          onCheckedChange={handleTermsChange}
          required={required}
          className="mt-1"
        />
        <Label htmlFor="terms-consent" className="text-sm leading-relaxed cursor-pointer">
          أوافق على{" "}
          <Link href="/legal/terms" target="_blank" className="text-primary hover:underline font-medium">
            شروط الاستخدام
          </Link>
          {required && <span className="text-destructive mr-1">*</span>}
        </Label>
      </div>
    </div>
  )
}
