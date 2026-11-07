import type { Fill, Filled } from '@sand/computers/contract'
import type { FramesIn } from './elements'
import type { Call } from './tabs'

interface FrameTree {
  frame: { id: string; url: string; securityOrigin: string }
  childFrames?: FrameTree[]
}

type Frame = FrameTree['frame'] & { call: Call; session: string }

interface World {
  call: Call
  session: string
  context: number
}

type Values = Partial<Record<Filled, string>>

const fields: Filled[] = ['username', 'password', 'code']

const plainHosts = new Set(['localhost', '127.0.0.1'])

const put = `(field, value) => {
  field.focus()
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(field, value)
  field.dispatchEvent(new Event('input', { bubbles: true }))
  field.dispatchEvent(new Event('change', { bubbles: true }))
}`

const fillFields = `function (values) {
  const put = ${put}
  const hints = field => (field.getAttribute('autocomplete') || '').toLowerCase().split(/\\s+/)
  const usable = field => !field.disabled && !field.readOnly && field.checkVisibility({ visibilityProperty: true }) && field.offsetWidth > 0 && field.offsetHeight > 0
  const textual = field => ['text', 'email', 'tel'].includes(field.type)
  const inputs = [...document.querySelectorAll('input')].filter(usable)
  const password = inputs.find(field => field.type === 'password')
  const before = field => !password || (field.compareDocumentPosition(password) & Node.DOCUMENT_POSITION_FOLLOWING && (!password.form || field.form === password.form))
  const names = inputs.filter(field => before(field) && (textual(field) || hints(field).includes('username')) && !hints(field).includes('one-time-code'))
  const username =
    names.find(field => hints(field).includes('username')) ??
    names.find(field => field.type === 'email') ??
    names.find(field => /user|login|mail|account/i.test(field.name + ' ' + field.id)) ??
    (password || names.length === 1 ? names.at(-1) : undefined)
  const codes = inputs.filter(field => textual(field) || field.type === 'number')
  const code =
    codes.find(field => hints(field).includes('one-time-code')) ??
    codes.find(field => field === document.activeElement) ??
    (codes.length === 1 ? codes[0] : undefined)
  const found = { username, password, code }
  const filled = Object.keys(values).filter(name => found[name])
  filled.forEach(name => put(found[name], values[name]))
  return filled
}`

const fillNode = `function (value) {
  const put = ${put}
  if (!(this instanceof HTMLInputElement) || this.ownerDocument !== document) return false
  put(this, value)
  return true
}`

const onSite = (origin: string, site: string) => {
  const url = URL.parse(origin)
  if (!url) return false
  const secure = url.protocol === 'https:' || (url.protocol === 'http:' && plainHosts.has(url.hostname))
  return secure && (url.hostname === site || url.hostname.endsWith(`.${site}`))
}

const flatten = (tree: FrameTree): FrameTree['frame'][] => [tree.frame, ...(tree.childFrames ?? []).flatMap(flatten)]

const framesOf = async (call: Call, session: string, framesIn: FramesIn): Promise<Frame[]> => {
  const { frameTree } = await call<{ frameTree: FrameTree }>('Page.getFrameTree')
  const local = flatten(frameTree).map(frame => ({ ...frame, call, session }))
  const remote = await Promise.all(local.flatMap(frame => framesIn(frame.id)).map(inner => framesOf(inner.call, inner.ref, framesIn)))
  return [...local, ...remote.flat()]
}

const worldsOf = (frames: Frame[]) =>
  Promise.all(
    frames.map(async ({ id, call, session }): Promise<World> => {
      const { executionContextId } = await call<{ executionContextId: number }>('Page.createIsolatedWorld', { frameId: id, worldName: 'sand-fill' })
      return { call, session, context: executionContextId }
    }),
  )

const run = async <T>(call: Call, params: object): Promise<T> => {
  const { result, exceptionDetails } = await call<{ result: { value: T }; exceptionDetails?: unknown }>('Runtime.callFunctionOn', { ...params, returnByValue: true })
  if (exceptionDetails) throw new Error('The page refused the login fields.')
  return result.value
}

const fillWorlds = async (worlds: World[], values: Values) => {
  let pending = fields.filter(field => values[field])
  for (const { call, context } of worlds) {
    if (!pending.length) break
    const wanted = Object.fromEntries(pending.map(field => [field, values[field]]))
    const filled = await run<Filled[]>(call, { executionContextId: context, functionDeclaration: fillFields, arguments: [{ value: wanted }] })
    pending = pending.filter(field => !filled.includes(field))
  }
  return fields.filter(field => values[field] && !pending.includes(field))
}

const nodeIn = ({ call, context }: World, node: string) =>
  call<{ object: { objectId?: string } }>('DOM.resolveNode', { backendNodeId: Number(node), executionContextId: context }).then(
    ({ object }) => object.objectId,
    () => undefined,
  )

const fillRef = async (worlds: World[], ref: string, code: string, site: string) => {
  const dot = ref.lastIndexOf('.')
  const session = dot < 0 ? '' : ref.slice(0, dot)
  const node = ref.slice(dot + 1)
  for (const world of worlds.filter(world => world.session === session)) {
    const objectId = await nodeIn(world, node)
    if (objectId && (await run<boolean>(world.call, { objectId, functionDeclaration: fillNode, arguments: [{ value: code }] }))) return
  }
  throw new Error(`Field ${ref} isn't a text field on ${site}.`)
}

export const fillLogin = async (call: Call, framesIn: FramesIn, { site, ref, ...values }: Fill): Promise<Filled[]> => {
  const asked = fields.filter(field => values[field])
  if (!asked.length) throw new Error('Give a username, password or code to fill.')
  const host = site.toLowerCase()
  const frames = await framesOf(call, '', framesIn)
  const matching = frames.filter(frame => onSite(frame.securityOrigin, host))
  if (!matching.length) throw new Error(`The page isn't on ${site}; it shows ${URL.parse(frames[0]?.url ?? '')?.host || 'no site'}.`)
  const worlds = await worldsOf(matching)
  const filled = await fillWorlds(worlds, ref ? { ...values, code: undefined } : values)
  if (ref && values.code) {
    await fillRef(worlds, ref, values.code, site)
    return [...filled, 'code']
  }
  if (!filled.length) throw new Error(`Found no ${asked.join(' or ')} field on ${site}.`)
  return filled
}
