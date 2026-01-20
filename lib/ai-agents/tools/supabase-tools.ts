/**
 * Supabase Database Tools Implementation
 * 
 * Provides tools for interacting with Supabase database
 */

import { createClient } from "@/lib/supabase/server"
import type { ToolResult } from "../types"

export class SupabaseTools {
  private async getClient() {
    return createClient()
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
      const supabase = await this.getClient()
      
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

      // Apply limit
      if (params.limit) {
        query = query.limit(params.limit)
      }

      const { data, error } = await query

      if (error) {
        return {
          success: false,
          error: `Database query failed: ${error.message}`,
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
      const supabase = await this.getClient()

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
      const supabase = await this.getClient()

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
      const supabase = await this.getClient()

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
      const supabase = await this.getClient()

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
