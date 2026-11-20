import variant from '@jitl/quickjs-singlefile-mjs-release-sync'
import { newQuickJSWASMModuleFromVariant, type QuickJSContext, type QuickJSDeferredPromise, type QuickJSHandle } from 'quickjs-emscripten-core'
import type { Answer, FromWorker, Start, ToWorker } from './protocol'

const MEMORY_BYTES = 256 * 1024 * 1024
const STACK_BYTES = 1024 * 1024

const PRELUDE = `(call, log, names) => {
  const show = value => typeof value === 'string' ? value : value instanceof Error ? String(value) : JSON.stringify(value, null, 2) ?? String(value)
  const print = (...values) => log(values.map(show).join(' '))
  globalThis.require = name => { throw new Error('This is not Node, so there is no ' + name + '. Reach files and commands through tools, like tools.read({ path }) or tools.shell({ command }).') }
  globalThis.console = { log: print, info: print, warn: print, error: print, debug: print }
  globalThis.login = ref => '⟦login:' + ref + '⟧'
  const caller = name => input => call(name, JSON.stringify(input ?? {}))
  const listed = Object.fromEntries(JSON.parse(names).map(name => [name, caller(name)]))
  globalThis.tools = new Proxy(listed, { get: (target, name) => target[name] ?? (typeof name === 'string' && name !== 'then' ? caller(name) : undefined) })
  return show
}`

const quickjs = newQuickJSWASMModuleFromVariant(variant)

const send = (message: FromWorker) => postMessage(message)

const errorText = (vm: QuickJSContext, handle: QuickJSHandle) => {
  const error = vm.dump(handle)
  if (typeof error !== 'object' || error === null) return String(error)
  const { name, message, stack } = error as { name?: string; message?: string; stack?: string }
  const head = [name, message].filter(Boolean).join(': ')
  return stack ? `${head}\n${stack.trimEnd()}` : head
}

const evaluate = (vm: QuickJSContext, code: string, file: string) => {
  const found = vm.evalCode(code, file)
  if (found.error) throw new Error(errorText(vm, found.error))
  return found.value
}

const settle = async (vm: QuickJSContext, show: QuickJSHandle, promise: QuickJSHandle) => {
  const settled = await vm.resolvePromise(promise)
  if (settled.error) return send({ type: 'end', error: errorText(vm, settled.error) })
  const returned = vm.typeof(settled.value) === 'undefined' ? undefined : vm.getString(vm.unwrapResult(vm.callFunction(show, vm.undefined, settled.value)))
  send({ type: 'end', ...(returned !== undefined && { value: returned }) })
}

const start = async ({ code, names, stop }: Start) => {
  const runtime = (await quickjs).newRuntime()
  const stopped = new Int32Array(stop)
  runtime.setInterruptHandler(() => Atomics.load(stopped, 0) === 1)
  runtime.setMemoryLimit(MEMORY_BYTES)
  runtime.setMaxStackSize(STACK_BYTES)
  const vm = runtime.newContext()
  const pending = new Map<number, QuickJSDeferredPromise>()
  let next = 0

  const call = vm.newFunction('call', (name, input) => {
    const id = next++
    const deferred = vm.newPromise()
    pending.set(id, deferred)
    send({ type: 'call', id, name: vm.getString(name), input: vm.getString(input) })
    return deferred.handle
  })
  const log = vm.newFunction('log', text => send({ type: 'log', text: vm.getString(text) }))

  const answer = ({ id, text, failed }: Answer) => {
    const deferred = pending.get(id)
    if (!deferred) return
    pending.delete(id)
    const value = failed ? vm.newError(text) : vm.newString(text)
    if (failed) deferred.reject(value)
    else deferred.resolve(value)
    runtime.executePendingJobs()
  }

  try {
    const show = vm.unwrapResult(vm.callFunction(evaluate(vm, PRELUDE, 'prelude.js'), vm.undefined, call, log, vm.newString(JSON.stringify(names))))
    const script = evaluate(vm, `(async () => {${code}\n})`, 'script.js')
    const promise = vm.unwrapResult(vm.callFunction(script, vm.undefined))
    void settle(vm, show, promise)
    runtime.executePendingJobs()
  } catch (error) {
    send({ type: 'end', error: error instanceof Error ? error.message : String(error) })
  }
  return answer
}

let answers: Promise<(answer: Answer) => void> | undefined

self.onmessage = ({ data }: MessageEvent<ToWorker>) => {
  if (data.type === 'start') answers = start(data)
  else void answers?.then(answer => answer(data))
}
