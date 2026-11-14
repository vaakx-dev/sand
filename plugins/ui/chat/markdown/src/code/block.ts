import type { Kit } from '@sand/ui-kit/contract'
import { tildeHome } from '@sand/util'
import { div } from '@vaakx-dev/vrui'
import type { CodeRenderer } from '../contract'
import { highlight } from './highlight'

const fingerprint = (value: string) => {
  let hash = 0
  for (let index = 0; index < value.length; index++) hash = (Math.imul(hash, 31) + value.charCodeAt(index)) | 0
  return `${value.length}:${(hash >>> 0).toString(36)}`
}

const notYet = () => ''

export const codeBlock = (kit: Kit, code: string, language: string) =>
  kit.ownedByNode(() => div({ class: 'mb-3 last:mb-0', 'data-code': fingerprint(code) }, kit.codeBlock({ copy: () => code, class: 'whitespace-pre' }, highlight(tildeHome(code), language))))

export const renderedCode = (renderer: CodeRenderer, code: string) => div({ class: 'mb-3 last:mb-0' }, renderer.render(code))

export const streamingCodeBlock = (kit: Kit, code: string) => kit.ownedByNode(() => div({ class: 'mb-3 last:mb-0', 'data-code': 'streaming' }, kit.codeBlock({ copy: notYet, class: 'whitespace-pre' }, tildeHome(code))))
