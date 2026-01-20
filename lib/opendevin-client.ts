/**
 * OpenDevin Client Library
 * For interacting with OpenDevin API from Next.js
 */

export interface OpenDevinTask {
  task_id: string
  instruction: string
  status: "pending" | "running" | "completed" | "failed"
  progress: number
  logs: string[]
  result?: {
    success: boolean
    output: string
    actions: any[]
    files_changed: string[]
    iterations: number
  }
  error?: string
  created_at: string
  updated_at: string
}

export interface CreateTaskRequest {
  instruction: string
  project_path?: string
  max_iterations?: number
  context?: Record<string, any>
}

export interface CreateTaskResponse {
  task_id: string
  status: string
  message: string
}

export class OpenDevinClient {
  private baseUrl: string

  constructor(baseUrl: string = "/api/opendevin") {
    this.baseUrl = baseUrl
  }

  /**
   * Create a new OpenDevin task
   */
  async createTask(request: CreateTaskRequest): Promise<CreateTaskResponse> {
    const response = await fetch(`${this.baseUrl}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to create task")
    }

    return response.json()
  }

  /**
   * Get task status
   */
  async getTaskStatus(taskId: string): Promise<OpenDevinTask> {
    const response = await fetch(`${this.baseUrl}/tasks/${taskId}`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to fetch task status")
    }

    return response.json()
  }

  /**
   * List all tasks
   */
  async listTasks(status?: string, limit: number = 50): Promise<{
    total: number
    tasks: OpenDevinTask[]
  }> {
    const params = new URLSearchParams()
    if (status) params.append("status", status)
    params.append("limit", limit.toString())

    const response = await fetch(`${this.baseUrl}/tasks?${params}`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to fetch tasks")
    }

    return response.json()
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/tasks/${taskId}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to delete task")
    }
  }

  /**
   * Poll task status until completion
   */
  async waitForCompletion(
    taskId: string,
    onProgress?: (task: OpenDevinTask) => void,
    pollInterval: number = 2000,
    maxWaitTime: number = 300000 // 5 minutes
  ): Promise<OpenDevinTask> {
    const startTime = Date.now()

    while (true) {
      const task = await this.getTaskStatus(taskId)

      if (onProgress) {
        onProgress(task)
      }

      if (task.status === "completed" || task.status === "failed") {
        return task
      }

      if (Date.now() - startTime > maxWaitTime) {
        throw new Error("Task timeout")
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval))
    }
  }

  /**
   * Stream task logs (using polling)
   */
  async *streamLogs(taskId: string, pollInterval: number = 1000): AsyncGenerator<string[]> {
    let lastLogCount = 0

    while (true) {
      const task = await this.getTaskStatus(taskId)

      if (task.logs.length > lastLogCount) {
        yield task.logs.slice(lastLogCount)
        lastLogCount = task.logs.length
      }

      if (task.status === "completed" || task.status === "failed") {
        break
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval))
    }
  }
}

/**
 * Create OpenDevin client instance
 */
export function createOpenDevinClient(): OpenDevinClient {
  return new OpenDevinClient()
}

/**
 * React hook for OpenDevin tasks
 */
export function useOpenDevinTask(taskId: string | null) {
  // يمكن تحويله لـ React hook كامل لاحقاً
  const client = createOpenDevinClient()

  return {
    getStatus: () => (taskId ? client.getTaskStatus(taskId) : null),
    delete: () => (taskId ? client.deleteTask(taskId) : null),
  }
}
