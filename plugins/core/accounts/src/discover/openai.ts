import { bearer } from '@sand/util/host'
import type { PlanModel } from '../contract'
import type { ApiKey } from '../auth/store'
import { trimSlash } from '@sand/util'
import { listIn, modelId } from './fields'
import { getJson } from './http'

const defaultBase = 'https://api.openai.com/v1'
const source = 'OpenAI'
const wanted = /^(gpt-|o1|o3|o4|codex)/
const unwanted = /audio|realtime|transcribe|tts|image|embedding|search|moderation|dall-e|whisper|instruct/

const chatModel = (entry: unknown): PlanModel[] => {
  const id = modelId.safeParse(entry).data?.id
  return id && wanted.test(id) && !unwanted.test(id) ? [{ name: id, label: id }] : []
}

export const discoverOpenAI = async (credential: ApiKey): Promise<PlanModel[]> => {
  const body = await getJson(source, `${trimSlash(credential.base_url ?? defaultBase)}/models`, bearer(credential.key))
  return listIn(source, body).flatMap(chatModel)
}
