import type { ApiKey } from '../auth/store'
import { describeCodex, takesImages } from '../codex/models'
import { bearer, getJson, trimmed } from './http'
import type { Discovered } from './types'

const defaultBase = 'https://api.openai.com/v1'
const source = 'OpenAI'
const wanted = /^(gpt-|o1|o3|o4|codex)/
const unwanted = /audio|realtime|transcribe|tts|image|embedding|search|moderation|dall-e|whisper|instruct/

const describe = (id: string): Discovered => {
  const { label, efforts, defaultEffort, context } = describeCodex(id)
  return { name: id, label, efforts, defaultEffort, context, images: takesImages(id) }
}

export const discoverOpenAI = async (credential: ApiKey): Promise<Discovered[]> => {
  const body = await getJson(source, `${trimmed(credential.base_url ?? defaultBase)}/models`, bearer(credential.key))
  if (!Array.isArray(body?.data)) throw new Error(`${source} model list failed: unexpected answer`)
  return body.data
    .map((entry: any) => entry?.id)
    .filter((id: unknown): id is string => typeof id === 'string' && wanted.test(id) && !unwanted.test(id))
    .map(describe)
}
