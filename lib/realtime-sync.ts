"use client"

import { createClient } from "@/lib/supabase/client"

export class RealtimeSync {
  private supabase = createClient()
  private syncQueue: Map<string, { action: string; data: any }> = new Map()
  private isOnline = true

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => this.handleOnline())
      window.addEventListener("offline", () => this.handleOffline())
    }
  }

  private handleOnline() {
    console.log("[v0] Connection restored, syncing...")
    this.isOnline = true
    this.processSyncQueue()
  }

  private handleOffline() {
    console.log("[v0] Connection lost, queuing updates...")
    this.isOnline = false
  }

  async queueUpdate(key: string, action: string, data: any) {
    this.syncQueue.set(key, { action, data })

    if (this.isOnline) {
      await this.processSyncQueue()
    }
  }

  private async processSyncQueue() {
    for (const [key, { action, data }] of this.syncQueue.entries()) {
      try {
        await this.executeSync(action, data)
        this.syncQueue.delete(key)
      } catch (error) {
        console.error("[v0] Sync failed:", error)
      }
    }
  }

  private async executeSync(action: string, data: any) {
    const [table, operation] = action.split(":")

    switch (operation) {
      case "insert":
        await this.supabase.from(table).insert(data)
        break
      case "update":
        await this.supabase.from(table).update(data).eq("id", data.id)
        break
      case "delete":
        await this.supabase.from(table).delete().eq("id", data.id)
        break
    }
  }

  getQueueSize() {
    return this.syncQueue.size
  }

  isConnected() {
    return this.isOnline
  }
}

export const realtimeSync = new RealtimeSync()
