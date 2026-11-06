import type { UiElement } from '@sand/computers/contract'
import { z } from 'zod'
import type { Hit } from '../contract'

export interface Size {
  width: number
  height: number
}

const shape = z.object({
  x: z.number().optional(),
  y: z.number().optional(),
  ref: z.union([z.string(), z.number()]).optional(),
  found: z.boolean().optional(),
  confidence: z.number().min(0).max(1).optional(),
})

type Answer = z.infer<typeof shape>

const lastObject = (text: string) => {
  const found = text.match(/\{[^{}]*\}/g)?.at(-1)
  if (!found) return undefined
  try {
    return shape.safeParse(JSON.parse(found)).data
  } catch {
    return undefined
  }
}

const clamp = (value: number) => Math.min(1, Math.max(0, value))

const hitOf = (answer: Answer, image: Size | null, elements: UiElement[]): Hit => {
  if (answer.found === false) return null
  if (answer.ref !== undefined) {
    const ref = String(answer.ref)
    return elements.some(element => element.ref === ref) ? { kind: 'element', ref } : null
  }
  if (!image || answer.x === undefined || answer.y === undefined) return null
  return { kind: 'point', x: clamp(answer.x / image.width), y: clamp(answer.y / image.height) }
}

export const answerOf = (text: string, image: Size | null, elements: UiElement[]) => {
  const answer = lastObject(text)
  return answer ? { hit: hitOf(answer, image, elements), confidence: answer.confidence ?? null } : { hit: null, confidence: null }
}
