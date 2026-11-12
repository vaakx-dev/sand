import { findBrowser } from '@sand/cdp'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { removeFolder } from '@sand/util/fs'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { browserComputer } from '../src/computer'

interface Got {
  at: string
  name: string
  value: string
}

const got: Got[] = []

const recorder = `<script>
  for (const field of document.querySelectorAll('input'))
    field.addEventListener('input', () =>
      fetch('/got', { method: 'POST', body: new URLSearchParams({ at: location.origin + location.pathname, name: field.name, value: field.value }) }))
</script>`

const html = (body: string) => new Response(`<!doctype html><html><body>${body}${recorder}</body></html>`, { headers: { 'content-type': 'text/html' } })

const server = Bun.serve({
  port: 0,
  async fetch(request) {
    const { pathname } = new URL(request.url)
    if (pathname === '/got') {
      const form = new URLSearchParams(await request.text())
      got.push({ at: form.get('at') ?? '', name: form.get('name') ?? '', value: form.get('value') ?? '' })
      return new Response('ok')
    }
    const pages: Record<string, string> = {
      '/login': `<form role="search"><input name="search" aria-label="Search"></form>
        <form><input name="user" autocomplete="username"><input name="pass" type="password"><button>Sign in</button></form>`,
      '/framed': `<form><input name="decoy" type="password"></form><iframe src="${loopback}/login" width="600" height="300"></iframe>`,
      '/step-one': `<form><input name="email" type="email"><button>Next</button></form>`,
      '/step-two': `<form><input name="pass" type="password"><button>Sign in</button></form>`,
      '/code': `<input name="note" aria-label="Note"><input name="otp" autocomplete="one-time-code" aria-label="Code"><input name="other" aria-label="Other">`,
      '/nested': `<iframe src="${loopback}/middle" width="700" height="300"></iframe>`,
      '/middle': `<iframe src="${local}/inner" width="600" height="200"></iframe>`,
      '/inner': `<input name="note" aria-label="Note"><input name="other" aria-label="Other">`,
    }
    const page = pages[pathname]
    return page ? html(page) : new Response('missing', { status: 404 })
  },
})

const local = `http://localhost:${server.port}`
const loopback = `http://127.0.0.1:${server.port}`
const profile = mkdtempSync(join(tmpdir(), 'sand-browser-login-'))
const computer = browserComputer({ id: 'test', label: 'Test browser', profile, headless: true })

const open = (url: string) => computer.act({ type: 'open', url })

const received = async (at: string, name: string) => {
  for (let tries = 0; tries < 40; tries++) {
    const entry = got.findLast(entry => entry.at === at && entry.name === name)
    if (entry) return entry.value
    await Bun.sleep(50)
  }
  return undefined
}

describe.skipIf(!(await findBrowser()))('browser login fill', () => {
  beforeAll(() => open(`${local}/login`))

  afterAll(async () => {
    await computer.close()
    await server.stop(true)
    await removeFolder(profile)
  })

  test('fills the username and password of a plain form and leaves other fields alone', async () => {
    await open(`${local}/login`)
    expect(await computer.fill({ site: 'localhost', username: 'ada', password: 'hunter2' })).toEqual(['username', 'password'])
    expect(await received(`${local}/login`, 'user')).toBe('ada')
    expect(await received(`${local}/login`, 'pass')).toBe('hunter2')
    expect(got.some(entry => entry.name === 'search')).toBe(false)
  })

  test('fills a login inside a cross-origin iframe and not the page around it', async () => {
    await open(`${local}/framed`)
    expect(await computer.fill({ site: '127.0.0.1', username: 'grace', password: 'cobol' })).toEqual(['username', 'password'])
    expect(await received(`${loopback}/login`, 'user')).toBe('grace')
    expect(await received(`${loopback}/login`, 'pass')).toBe('cobol')
    expect(got.some(entry => entry.name === 'decoy')).toBe(false)
  })

  test('fills whatever step of a two-step login is showing', async () => {
    await open(`${local}/step-one`)
    expect(await computer.fill({ site: 'localhost', username: 'ada@example.com', password: 'lovelace' })).toEqual(['username'])
    expect(await received(`${local}/step-one`, 'email')).toBe('ada@example.com')
    await open(`${local}/step-two`)
    expect(await computer.fill({ site: 'localhost', username: 'ada@example.com', password: 'lovelace' })).toEqual(['password'])
    expect(await received(`${local}/step-two`, 'pass')).toBe('lovelace')
    await expect(computer.fill({ site: 'localhost', username: 'ada@example.com' })).rejects.toThrow('Found no username field on localhost')
  })

  test('fills a code into the one-time-code field or into a listed element', async () => {
    await open(`${local}/code`)
    expect(await computer.fill({ site: 'localhost', code: '123456' })).toEqual(['code'])
    expect(await received(`${local}/code`, 'otp')).toBe('123456')
    const other = (await computer.elements()).find(element => element.name === 'Other')
    if (!other) throw new Error('no Other field')
    expect(await computer.fill({ site: 'localhost', code: '654321', ref: other.ref })).toEqual(['code'])
    expect(await received(`${local}/code`, 'other')).toBe('654321')
  })

  test('fills a listed element inside a nested cross-origin iframe', async () => {
    await open(`${local}/nested`)
    await computer.settle()
    const other = (await computer.elements()).find(element => element.name === 'Other')
    if (!other) throw new Error('no Other field')
    expect(await computer.fill({ site: 'localhost', code: '246810', ref: other.ref })).toEqual(['code'])
    expect(await received(`${local}/inner`, 'other')).toBe('246810')
  })

  test('refuses a page that is not on the site', async () => {
    await open(`${local}/login`)
    const before = got.length
    await expect(computer.fill({ site: 'bank.example', username: 'ada', password: 'hunter2' })).rejects.toThrow("The page isn't on bank.example")
    await expect(computer.fill({ site: 'host', password: 'hunter2' })).rejects.toThrow("The page isn't on host")
    await Bun.sleep(200)
    expect(got.length).toBe(before)
  })
})
