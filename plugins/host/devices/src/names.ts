import type { DeviceKind } from '@sand/host-gateway/contract'

const fallbackNames: Record<DeviceKind, string> = { pc: 'PC', phone: 'Phone', browser: 'Browser' }

export const deviceName = (name: unknown, kind: DeviceKind) =>
  (typeof name === 'string' ? name.trim().slice(0, 80).trim() : '') || fallbackNames[kind]
