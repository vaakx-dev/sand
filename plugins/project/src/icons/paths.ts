import { join } from 'node:path'

export const projectIconTypes: Record<string, string> = {
  svg: 'image/svg+xml',
  png: 'image/png',
  webp: 'image/webp',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  ico: 'image/x-icon',
}

export const isIconType = (value: unknown): value is string => typeof value === 'string' && Object.values(projectIconTypes).includes(value)

export const isIconHash = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value)

export const projectIconPath = (home: string, hash: string) => join(home, 'project-icons', hash)
