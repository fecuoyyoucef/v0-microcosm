/**
 * Supabase Database Tools Implementation
 * 
 * Provides tools for interacting with Supabase database
 */

import { createServiceClient } from "@/lib/supabase/server"
import { suggestTables } from "../schema-introspect"
import type { ToolResult } from "../types"

/**
 * Format a Postgres error from a SELECT/INSERT/... that referenced an
 * unknown table. Includes the closest matching real tables, which the
 * agent can use to retry instead of giving up.
 */
async function formatDbError(table: string, baseError: string): Promise<string> {
  const looksLikeMissing =
    baseError.toLowerCase().includes("could not find the table") ||
    baseError.toLowerCase().includes("does not exist") ||
    baseError.toLowerCase().includes("schema cache")

  if (!looksLikeMissing) return baseError

  const suggestions = await suggestTables(table)
  if (suggestions.length === 0) {
    return `${baseError} | الجدول "${table}" غير موجود في قاعدة البيانات. راجع قائمة الجداول المتاحة في تعليمات النظام.`
  }
  return `${baseError} | الجدول "${table}" غير موجود. هل قصدت أحد هذه: ${suggestions.join(", ")}؟`
}

export class SupabaseTools {
  private getClient() {
    return createServiceClient()
  }

  /**
   * Query data from a table
   */
  async query(params: {
    table: string
    select?: string
    filters?: Record<string, any>
    limit?: number
    order_by?: string
  }): Promise<ToolResult> {
    try {
      const supabase = this.getClient()
      
      let query = supabase
        .from(params.table)
        .select(params.select || "*")

      // Apply filters
      if (params.filters) {
        for (const [key, value] of Object.entries(params.filters)) {
          query = query.eq(key, value)
        }
      }

      // Apply ordering
      if (params.order_by) {
        const [column, direction] = params.order_by.split(".")
        query = query.order(column, {
          ascending: direction !== "desc",
        })
      }

      // Apply limit. We force a hard cap (50) when the agent doesn't specify
      // one — it has no instinct for "how many rows is too many" and a SELECT
      // * with no limit can easily blow our 12k TPM budget on big tables.
      const safeLimit = Math.min(params.limit ?? 25, 50)
      query = query.limit(safeLimit)

      const { data, error } = await query

      if (error) {
        return {
          success: false,
          error: await formatDbError(params.table, `Database query failed: ${error.message}`),
        }
      }

      return {
        success: true,
        data: {
          table: params.table,
          count: data?.length || 0,
          rows: data,
        },
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Query execution failed: ${error.message}`,
      }
    }
  }

  /**
   * Insert data into a table
   */
  async insert(params: {
    table: string
    data: Record<string, any> | Record<string, any>[]
  }): Promise<ToolResult> {
    try {
      const supabase = this.getClient()

      const { data, error } = await supabase
        .from(params.table)
        .insert(params.data)
        .select()

      if (error) {
        return {
          success: false,
          error: `Insert failed: ${error.message}`,
        }
      }

      return {
        success: true,
        data: {
          table: params.table,
          inserted_count: Array.isArray(data) ? data.length : 1,
          rows: data,
        },
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Insert execution failed: ${error.message}`,
      }
    }
  }

  /**
   * Update data in a table
   */
  async update(params: {
    table: string
    filters: Record<string, any>
    data: Record<string, any>
  }): Promise<ToolResult> {
    try {
      const supabase = this.getClient()

      let query = supabase
        .from(params.table)
        .update(params.data)

      // Apply filters
      for (const [key, value] of Object.entries(params.filters)) {
        query = query.eq(key, value)
      }

      const { data, error } = await query.select()

      if (error) {
        return {
          success: false,
          error: `Update failed: ${error.message}`,
        }
      }

      return {
        success: true,
        data: {
          table: params.table,
          updated_count: Array.isArray(data) ? data.length : 0,
          rows: data,
        },
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Update execution failed: ${error.message}`,
      }
    }
  }

  /**
   * Delete data from a table
   */
  async delete(params: {
    table: string
    filters: Record<string, any>
  }): Promise<ToolResult> {
    try {
      const supabase = this.getClient()

      let query = supabase.from(params.table).delete()

      // Apply filters
      for (const [key, value] of Object.entries(params.filters)) {
        query = query.eq(key, value)
      }

      const { data, error } = await query.select()

      if (error) {
        return {
          success: false,
          error: `Delete failed: ${error.message}`,
        }
      }

      return {
        success: true,
        data: {
          table: params.table,
          deleted_count: Array.isArray(data) ? data.length : 0,
          rows: data,
        },
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Delete execution failed: ${error.message}`,
      }
    }
  }

  /**
   * Call a database RPC function
   */
  async rpc(params: {
    function_name: string
    params?: Record<string, any>
  }): Promise<ToolResult> {
    try {
      const supabase = this.getClient()

      const { data, error } = await supabase.rpc(
        params.function_name,
        params.params || {}
      )

      if (error) {
        return {
          success: false,
          error: `RPC call failed: ${error.message}`,
        }
      }

      return {
        success: true,
        data: {
          function: params.function_name,
          result: data,
        },
      }
    } catch (error: any) {
      return {
        success: false,
        error: `RPC execution failed: ${error.message}`,
      }
    }
  }
}

// Export singleton instance
let supabaseToolsInstance: SupabaseTools | null = null

export function getSupabaseTools(): SupabaseTools {
  if (!supabaseToolsInstance) {
    supabaseToolsInstance = new SupabaseTools()
  }
  return supabaseToolsInstance
}
