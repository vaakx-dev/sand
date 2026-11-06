import type { Effort } from '@sand/accounts/contract'
import { center, type Box, type Point, type Screenshot, type UiElement } from '@sand/computers/contract'
import { service } from 'drydock'

export type Hit = { kind: 'point'; x: number; y: number } | { kind: 'box'; box: Box } | { kind: 'element'; ref: string } | null

export interface LocateInput {
  screenshot: Screenshot
  target: string
  elements?: UiElement[]
}

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
}

export interface Located {
  hit: Hit
  confidence: number | null
  usage: TokenUsage
  costUsd: number
  ms: number
}

export interface Finder {
  id: string
  label: string
  locate(input: LocateInput, signal?: AbortSignal): Promise<Located>
}

export type FinderSpec = { kind: 'llm'; model: string; effort?: Effort } | { kind: 'element'; model: string; effort?: Effort }

export type StrategySpec =
  | { kind: 'single' }
  | { kind: 'zoom'; scale: number; rounds: number; confidence: number }
  | { kind: 'grid'; size: number; rounds: number }
  | { kind: 'marks' }
  | { kind: 'list' }

export interface Finders {
  make(finder: FinderSpec, strategy: StrategySpec): Finder
}

export const finders = service<Finders>('finders')

export const pointOf = (hit: Hit, elements: UiElement[] = []): Point | null => {
  if (!hit) return null
  if (hit.kind === 'point') return { x: hit.x, y: hit.y }
  if (hit.kind === 'box') return center(hit.box)
  const element = elements.find(found => found.ref === hit.ref)
  return element ? center(element.box) : null
}
