import { refParts } from './elements'
import { evaluate } from './evaluate'
import type { Call } from './tabs'

type Refusal = 'password' | 'frame'

type Read = { text: string } | { refused: Refusal }

export interface Reader {
  call: Call
  frameCall(session: string): Call | undefined
}

const OBJECT_GROUP = 'sand-read'

const REFUSALS: Record<Refusal, (ref: string) => string> = {
  password: ref => `${ref} is a password field; its value stays hidden.`,
  frame: ref => `${ref} is a frame from another site. Read a ref inside it instead.`,
}

const MAIN_TEXT = `(document.querySelector('main, [role=main]') ?? document.body).innerText`

const elementText = `function () {
  const element = this instanceof Element ? this : this.parentElement
  if (element instanceof HTMLInputElement && element.type === 'password') return { refused: 'password' }
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) return { text: element.value }
  if (!(element instanceof HTMLIFrameElement)) return { text: element.innerText }
  const body = element.contentDocument?.body
  return body ? { text: body.innerText } : { refused: 'frame' }
}`

const tidy = (text: string) => text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()

const mainText = async (call: Call) => {
  const { result, exceptionDetails } = await evaluate<string>(call, { expression: MAIN_TEXT })
  if (exceptionDetails) throw new Error(`Could not read the page: ${exceptionDetails.text}`)
  return tidy(result.value)
}

const gone = (ref: string) => new Error(`No element ${ref} on the page now. Call computer_elements again.`)

const objectOf = async (call: Call, backendNodeId: number, ref: string) => {
  const { object } = await call<{ object: { objectId: string } }>('DOM.resolveNode', { backendNodeId, objectGroup: OBJECT_GROUP }).catch(() => {
    throw gone(ref)
  })
  return object.objectId
}

const readNode = async (call: Call, backendNodeId: number, ref: string) => {
  const objectId = await objectOf(call, backendNodeId, ref)
  const { result } = await call<{ result: { value: Read } }>('Runtime.callFunctionOn', { objectId, functionDeclaration: elementText, returnByValue: true }).finally(() =>
    call('Runtime.releaseObjectGroup', { objectGroup: OBJECT_GROUP }),
  )
  if ('refused' in result.value) throw new Error(REFUSALS[result.value.refused](ref))
  return result.value.text
}

const refText = async (reader: Reader, ref: string) => {
  const { session, node } = refParts(ref)
  const call = session ? reader.frameCall(session) : reader.call
  if (!call || Number.isNaN(node)) throw gone(ref)
  return readNode(call, node, ref)
}

export const readText = (reader: Reader, ref: string | undefined) => (ref === undefined ? mainText(reader.call) : refText(reader, ref))
