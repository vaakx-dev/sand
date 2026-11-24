import type { AndroidApp, Wire } from '@sand/devices-contract'
import { appPush } from './app'
import { webPush } from './browser'

export type Support = 'ready' | 'insecure' | 'install' | 'missing'

export interface PushChannel {
  support(): Support
  blocked(): boolean
  subscribe(key: string): Promise<void>
  unsubscribe(): Promise<void>
}

export const pushChannel = (app: AndroidApp | undefined, wire: Wire): PushChannel => (app ? appPush(app, wire) : webPush(wire))
