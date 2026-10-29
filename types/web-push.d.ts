declare module "web-push" {
  interface PushSubscription {
    endpoint: string
    keys: { p256dh: string; auth: string }
  }

  interface SendResult {
    statusCode: number
    headers: Record<string, string | string[] | undefined>
    body?: string
  }

  const webpush: {
    setVapidDetails(subject: string, publicKey: string, privateKey: string): void
    sendNotification(subscription: PushSubscription, payload?: string, options?: Record<string, unknown>): Promise<SendResult>
  }

  export default webpush
}
