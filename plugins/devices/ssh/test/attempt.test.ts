import { pcsChange, type WireListener } from '@sand/devices-contract'
import type { Request, WireEvent } from '@sand/host-hub/contract'
import { afterAll, beforeAll, expect, test } from 'bun:test'
import { createApp } from 'drydock'
import { type SshPrompt, sshAsk, sshProgress } from '../src/contract'
import { attempts, type Prompt } from '../src/web/attempt'

beforeAll(() => Object.assign(globalThis, { window: { setTimeout, clearTimeout } }))
afterAll(() => Reflect.deleteProperty(globalThis, 'window'))

const setup = (prompt: Prompt = () => Promise.resolve(null)) => {
  const ctx = createApp()
  const listeners = new Map<string, Set<WireListener<unknown>>>()
  const calls: { type: string; input: Record<string, unknown> }[] = []
  let finish: (output: unknown) => void = () => {}
  const online = new Set<string>()
  const wire = {
    call: <I, O>(request: Request<I, O>, input: I) => {
      calls.push({ type: request.id, input: input as Record<string, unknown> })
      if (request.id !== 'ssh.connect' && request.id !== 'ssh.reconnect') return Promise.resolve(undefined as O)
      return new Promise<O>(resolve => {
        finish = output => resolve(output as O)
      })
    },
    on: <P>(event: WireEvent<P>, listener: WireListener<P>) => {
      const set = listeners.get(event.id) ?? new Set()
      listeners.set(event.id, set.add(listener as WireListener<unknown>))
      return () => void set.delete(listener as WireListener<unknown>)
    },
  }
  const emit = <P>(event: WireEvent<P>, payload: P) => {
    for (const listener of listeners.get(event.id) ?? []) listener(payload, 'home')
  }
  const pcs = { online: (id: string) => online.has(id), name: (id: string) => id }
  const comeOnline = (pc: string) => {
    online.add(pc)
    ctx.emit(pcsChange)
  }
  const attemptOf = () => String(calls[0]?.input.attempt)
  return { run: attempts({ ctx, wire, pcs, prompt }), calls, emit, finish: (output: unknown) => finish(output), comeOnline, attemptOf, listeners }
}

const settle = () => new Promise(resolve => setTimeout(resolve, 0))

test('connect routes its own progress and questions, answers on the wire, and resolves once the PC is online', async () => {
  const { run, calls, emit, finish, comeOnline, attemptOf, listeners } = setup()
  const progress: string[] = []
  const asked: SshPrompt[] = []
  let resolved: string | undefined
  void run
    .connect('box', {
      progress: text => progress.push(text),
      ask: prompt => {
        asked.push(prompt)
        return Promise.resolve('hunter2')
      },
    })
    .then(pc => {
      resolved = pc
    })

  const attempt = attemptOf()
  emit(sshProgress, { attempt: 'other', text: 'not mine' })
  emit(sshProgress, { attempt, text: 'Connecting to box' })
  emit(sshAsk, { attempt: 'other', id: 'q0', text: 'Password:', secret: true })
  emit(sshAsk, { attempt, id: 'q1', text: 'Password:', secret: true })
  await settle()

  expect(progress).toEqual(['Connecting to box'])
  expect(asked.map(prompt => prompt.text)).toEqual(['Password:'])
  expect(calls.slice(1)).toEqual([{ type: 'ssh.answer', input: { attempt, id: 'q1', value: 'hunter2' } }])

  finish({ pc: 'pc-box' })
  await settle()
  expect(resolved).toBeUndefined()

  comeOnline('pc-box')
  await settle()
  expect(resolved).toBe('pc-box')
  expect([...listeners.values()].every(set => set.size === 0)).toBe(true)
})

test('aborting cancels the attempt on the host, closes the built-in prompt and rejects', async () => {
  let promptSignal: AbortSignal | undefined
  const { run, calls, emit, attemptOf } = setup((_, signal) => {
    promptSignal = signal
    return new Promise(() => {})
  })
  const controller = new AbortController()
  const done = run.reconnect('pc-box', { signal: controller.signal })

  const attempt = attemptOf()
  emit(sshAsk, { attempt, id: 'q1', text: 'Trust this host key?', secret: false, confirm: true })
  await settle()
  expect(promptSignal?.aborted).toBe(false)

  controller.abort()
  await expect(done).rejects.toThrow('Cancelled')
  expect(promptSignal?.aborted).toBe(true)
  expect(calls.map(call => call.type)).toEqual(['ssh.reconnect', 'ssh.cancel'])
})
