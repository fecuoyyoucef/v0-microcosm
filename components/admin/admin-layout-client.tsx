"use client"

import type React from "react"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (isMobileMenuOpen) {
      const handleClickOutside = () => setIsMobileMenuOpen(false)
      document.addEventListener("click", handleClickOutside)
      return () => document.removeEventListener("click", handleClickOutside)
    }
  }, [isMobileMenuOpen])

  return (
    <div className="h-screen bg-slate-950 flex flex-col md:flex-row overflow-hidden" dir="rtl">
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 right-4 z-[60] md:hidden bg-slate-900/80 backdrop-blur-sm text-white hover:bg-slate-800"
        onClick={(e) => {
          e.stopPropagation()
          setIsMobileMenuOpen(!isMobileMenuOpen)
        }}
      >
        {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className="hidden md:block flex-shrink-0">
        <AdminSidebar />
      </div>

      <div
        className={`fixed top-0 right-0 h-full w-72 bg-slate-900 z-[50] md:hidden transition-transform duration-300 shadow-2xl ${
          isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <AdminSidebar />
      </div>

      <main className="flex-1 min-h-0 overflow-auto w-full pt-16 md:pt-0 isolate">{children}</main>
    </div>
  )
}
