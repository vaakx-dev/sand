import { errorMessage } from '@sand/util'
import { basename } from 'node:path'
import type { SignItem, Signed } from '../contract'
import { localImage } from '../resolve'
import { mediaPath } from '../route'
import type { Store } from '../store'
import { extensionOf } from '../store/types'
import type { Tokens } from './tokens'

type CwdOf = (session?: string) => string | undefined

export const createSigner = (store: Store, tokens: Tokens, cwdOf: CwdOf) => {
  const link = (hash: string, name: string) => {
    const { token, expires } = tokens.issue(hash)
    return { url: `${mediaPath}${token}/${encodeURIComponent(name)}`, expires }
  }

  const local = async (src: string, session?: string): Promise<Signed> => {
    const image = await localImage(src, cwdOf(session))
    const media = store.put(await Bun.file(image.path).bytes(), image.mediaType)
    return { ...link(media.hash, basename(image.path)), media }
  }

  const stored = async (hash: string, mediaType: string, name?: string): Promise<Signed> => {
    if (!store.locate(hash)) return { error: 'This file is no longer stored on this PC' }
    return link(hash, name ?? `media.${extensionOf(mediaType)}`)
  }

  const signOne = (item: SignItem, session?: string) => ('src' in item ? local(item.src, session) : stored(item.hash, item.mediaType, item.name))

  return ({ session, items }: { session?: string; items: SignItem[] }) =>
    Promise.all(items.map(item => signOne(item, session).catch((error): Signed => ({ error: errorMessage(error) }))))
}
