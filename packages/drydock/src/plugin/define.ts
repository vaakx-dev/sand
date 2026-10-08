import type { ServiceKey } from '../services/types'
import type { AnyPlugin, Plugin } from './types'

export const definePlugin = <C = undefined, const I extends ServiceKey = never>(plugin: Plugin<C, I>) => plugin

export const isPlugin = (value: unknown): value is AnyPlugin =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as AnyPlugin).name === 'string' &&
  typeof (value as AnyPlugin).apply === 'function'
