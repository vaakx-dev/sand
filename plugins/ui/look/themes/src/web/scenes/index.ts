import type { SceneId } from '../../contract'
import { blueprint } from './blueprint'
import type { Scene } from './draw'
import { halftone } from './halftone'
import { skyline } from './skyline'
import { sunset } from './sunset'

export interface Frost {
  main: number
  side: number
  panel: number
  head: number
}

export interface SceneSpec {
  draw: Scene
  frost: Frost
}

const frost = (main: number, panel = 70): Frost => ({ main, side: 74, panel, head: 50 })

export const scenes: Record<SceneId, SceneSpec> = {
  blueprint: { draw: blueprint, frost: frost(30) },
  halftone: { draw: halftone, frost: frost(55, 74) },
  skyline: { draw: skyline, frost: frost(20) },
  sunset: { draw: sunset, frost: frost(25) },
}

export type { Colors, Scene } from './draw'
