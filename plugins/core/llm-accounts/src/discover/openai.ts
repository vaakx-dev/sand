import type { ApiKey } from '../auth/store'
import { bearer, isRecord, trimSlash } from '@sand/kit'
import { describeOpenAI, takesImages } from '../openai/models'
import { listIn } from './fields'
import { getJson } from './http'
import type { Discovered } from './types'

const defaultBase = 'https://api.openai.com/v1'
const source = 'OpenAI'
const wanted = /^(gpt-|o1|o3|o4|codex)/
const unwanted = /audio|realtime|transcribe|tts|image|embedding|search|moderation|dall-e|whisper|instruct/

const chatModel = (entry: unknown) => {
  const id = isRecord(entry) ? entry.id : undefined
  return typeof id === 'string' && wanted.test(id) && !unwanted.test(id) ? [id] : []
}

const describe = (id: string): Discovered => {
  const { label, efforts, defaultEffort, context } = describeOpenAI(id)
  return { name: id, label, efforts, defaultEffort, context, images: takesImages(id) }
}

export const discoverOpenAI = async (credential: ApiKey): Promise<Discovered[]> => {
  const body = await getJson(source, `${trimSlash(credential.base_url ?? defaultBase)}/models`, bearer(credential.key))
  return listIn(source, body, 'data').flatMap(chatModel).map(describe)
}
