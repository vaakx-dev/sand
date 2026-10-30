import type { DeviceKind } from '@sand/devices-contract'

const nameLimit = 80

const fallbackNames: Record<DeviceKind, string> = { pc: 'PC', phone: 'Phone', browser: 'Browser' }

export const deviceName = (name: string, kind: DeviceKind) => name.trim().slice(0, nameLimit).trim() || fallbackNames[kind]
