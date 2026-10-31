import { errorMessage } from '@sand/util'
import type { z } from 'zod'
import type { AskRequest } from './contract'

type AskText = (request: AskRequest) => Promise<string>

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string }

const jsonOnly = 'Reply with JSON only: no prose and no code fences.'

const unfenced = (text: string) =>
  text
    .replace(/^```[\w-]*\s*/, '')
    .replace(/\s*```$/, '')
    .trim()

const parse = <S extends z.ZodType>(text: string, schema: S): Parsed<z.infer<S>> => {
  try {
    return { ok: true, value: schema.parse(JSON.parse(unfenced(text))) }
  } catch (error) {
    return { ok: false, error: errorMessage(error) }
  }
}

const withNote = (request: AskRequest, note: string): AskRequest => ({ ...request, system: `${request.system}\n\n${note}` })

export const createJson =
  (text: AskText) =>
  async <S extends z.ZodType>(request: AskRequest, schema: S): Promise<z.infer<S>> => {
    const first = withNote(request, jsonOnly)
    const parsed = parse(await text(first), schema)
    if (parsed.ok) return parsed.value
    const retry = withNote(first, `Your previous reply was rejected: ${parsed.error}. Fix it and reply again.`)
    const again = parse(await text(retry), schema)
    if (again.ok) return again.value
    throw new Error(`The model did not reply with valid JSON: ${again.error}`)
  }
