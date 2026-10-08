import type { DeviceInfo, Remote } from '@sand/protocol'
import { connectRemote } from './client'
import { parseLink } from './link'

export const pair = async (text: string, self: DeviceInfo): Promise<Remote> => {
  const link = parseLink(text)
  const client = await connectRemote(link)
  try {
    const info = await client.call<DeviceInfo>({ type: 'device.info' }).catch(() => {
      throw new Error('That sand is too old to pair with; update it first')
    })
    if (info.id === self.id) throw new Error('That link opens this PC')
    return { ...info, ...link }
  } finally {
    client.close()
  }
}
