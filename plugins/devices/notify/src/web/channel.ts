import type { AndroidApp, PushTarget } from '@sand/devices-contract'
import { appPush } from './app'
import { webPush } from './browser'

export type Support = 'ready' | 'insecure' | 'install' | 'missing' | 'distributor'

export interface PushChannel {
  support(): Support
  blocked(): boolean
  subscribe(key: string): Promise<PushTarget | undefined>
  unsubscribe(): Promise<void>
}

export const pushChannel = (app: AndroidApp | undefined): PushChannel => (app ? appPush(app) : webPush)
