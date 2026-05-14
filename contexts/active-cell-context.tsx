"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

interface ActiveCellContextType {
  activeCellId: string | null
  setActiveCellId: (cellId: string | null) => void
  isInCell: (cellId: string) => boolean
}

const ActiveCellContext = createContext<ActiveCellContextType | undefined>(undefined)

// Persist the currently-open cell to IndexedDB so the service worker
// (firebase-messaging-sw.js / sw.js) can read it from a push handler and
// either suppress or clear notifications for the cell the user is viewing.
// The SW reads `activeCellId` from db `synaptic-app`, store `state`.
function persistActiveCellId(cellId: string | null) {
  if (typeof indexedDB === "undefined") return
  try {
    const open = indexedDB.open("synaptic-app", 1)
    open.onupgradeneeded = () => {
      const db = open.result
      if (!db.objectStoreNames.contains("state")) {
        db.createObjectStore("state")
      }
    }
    open.onsuccess = () => {
      const db = open.result
      if (!db.objectStoreNames.contains("state")) {
        db.close()
        return
      }
      const tx = db.transaction("state", "readwrite")
      const store = tx.objectStore("state")
      if (cellId) {
        store.put(cellId, "activeCellId")
      } else {
        store.delete("activeCellId")
      }
      tx.oncomplete = () => db.close()
      tx.onerror = () => db.close()
    }
    open.onerror = () => {
      /* ignore */
    }
  } catch {
    /* ignore */
  }
}

// Post a message to every service worker registration we have. We can't rely
// on `navigator.serviceWorker.ready` because the page may be controlled by
// `sw.js` while notifications are owned by `firebase-messaging-sw.js`, and
// vice-versa. Broadcasting reaches whichever SW is actually holding the
// notifications.
async function broadcastToServiceWorkers(message: unknown) {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return
  try {
    const regs = await navigator.serviceWorker.getRegistrations()
    for (const reg of regs) {
      const target = reg.active || reg.waiting || reg.installing
      target?.postMessage(message)
    }
    // Also message the controller (some browsers only deliver to it reliably).
    navigator.serviceWorker.controller?.postMessage(message)
  } catch {
    /* ignore */
  }
}

export function ActiveCellProvider({ children }: { children: ReactNode }) {
  const [activeCellId, setActiveCellIdState] = useState<string | null>(null)

  const setActiveCellId = useCallback((cellId: string | null) => {
    setActiveCellIdState(cellId)
    persistActiveCellId(cellId)
    if (cellId) {
      // Tell every SW to drop any tray notifications for this cell right now.
      broadcastToServiceWorkers({ type: "clearCellNotifications", groupId: cellId })
    }
  }, [])

  const isInCell = useCallback(
    (cellId: string) => {
      return activeCellId === cellId
    },
    [activeCellId],
  )

  return (
    <ActiveCellContext.Provider value={{ activeCellId, setActiveCellId, isInCell }}>
      {children}
    </ActiveCellContext.Provider>
  )
}

export function useActiveCell() {
  const context = useContext(ActiveCellContext)
  if (context === undefined) {
    throw new Error("useActiveCell must be used within an ActiveCellProvider")
  }
  return context
}
