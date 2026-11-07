import { pushTargetSchema } from '@sand/devices-contract'
import { decodeBase64url } from '@sand/devices-identity'
import { isRecord } from '@sand/util'
import { listen } from '@vaakx-dev/vrui'
import type { Notice } from '../contract'

export type Support = 'ready' | 'insecure' | 'install' | 'missing'

const icon = '/icons/192x192.png'

export const support = (): Support => {
  if (!window.isSecureContext) return 'insecure'
  if ('PushManager' in window && 'serviceWorker' in navigator && 'Notification' in window) return 'ready'
  return /iPhone|iPad/.test(navigator.userAgent) ? 'install' : 'missing'
}

export const permission = () => (support() === 'ready' ? Notification.permission : 'default')

export const subscribe = async (key: string) => {
  if ((await Notification.requestPermission()) !== 'granted') return undefined
  const { pushManager } = await navigator.serviceWorker.ready
  await (await pushManager.getSubscription())?.unsubscribe()
  const subscription = await pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: new Uint8Array(decodeBase64url(key)) })
  return pushTargetSchema.parse(subscription.toJSON())
}

export const unsubscribe = async () => {
  const { pushManager } = await navigator.serviceWorker.ready
  await (await pushManager.getSubscription())?.unsubscribe()
}

export const showNotice = async (notice: Notice) => {
  const registration = await navigator.serviceWorker.ready
  await registration.showNotification(notice.title, { body: notice.body, tag: notice.tag, icon, data: notice })
}

export type Target = { thread: string } | { bot: string }

const targetOf = (data: unknown): Target | undefined => {
  if (!isRecord(data) || !isRecord(data.notice)) return undefined
  const { thread, bot } = data.notice
  if (typeof thread === 'string') return { thread }
  return typeof bot === 'string' ? { bot } : undefined
}

export const onNoticeOpen = (open: (target: Target) => void) =>
  listen<MessageEvent>(navigator.serviceWorker, 'message', event => {
    const target = targetOf(event.data)
    if (target) open(target)
  })
