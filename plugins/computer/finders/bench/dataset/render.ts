import { findBrowser, launch } from '@sand/cdp'
import type { Box, UiElement } from '@sand/computers/contract'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Kind } from './pages'

export interface Candidate {
  description: string
  kind: Kind
  ref: string
  box: Box
  pixels: { width: number; height: number }
  clipped: boolean
}

export interface Rendered {
  png: Uint8Array
  elements: UiElement[]
  candidates: Candidate[]
}

const collect = () => {
  for (const node of document.querySelectorAll<HTMLElement>('[data-scroll]')) {
    const half = node.children[Number(node.dataset.scroll)]
    if (half instanceof HTMLElement) node.scrollTop = half.offsetTop + half.offsetHeight / 2
  }
  scrollTo(0, Number(document.body.dataset.scrollPage ?? 0))
  const width = innerWidth
  const height = innerHeight
  const roles: Record<string, string> = { A: 'link', BUTTON: 'button', SELECT: 'combobox', TEXTAREA: 'textbox' }
  const inputRoles: Record<string, string> = { checkbox: 'checkbox', radio: 'radio' }
  const roleOf = (node: HTMLElement) =>
    node.getAttribute('role') ?? (node instanceof HTMLInputElement ? (inputRoles[node.type] ?? 'textbox') : (roles[node.tagName] ?? 'generic'))
  const nameOf = (node: HTMLElement) =>
    (node.getAttribute('aria-label') || node.innerText?.trim() || node.getAttribute('placeholder') || '').replace(/\s+/g, ' ').slice(0, 80)
  const visibleRect = (node: HTMLElement) => {
    const rect = node.getBoundingClientRect()
    let left = Math.max(0, rect.left)
    let top = Math.max(0, rect.top)
    let right = Math.min(width, rect.right)
    let bottom = Math.min(height, rect.bottom)
    for (let parent = node.parentElement; parent; parent = parent.parentElement) {
      if (getComputedStyle(parent).overflow === 'visible') continue
      const clip = parent.getBoundingClientRect()
      left = Math.max(left, clip.left)
      top = Math.max(top, clip.top)
      right = Math.min(right, clip.right)
      bottom = Math.min(bottom, clip.bottom)
    }
    return { left, top, right, bottom, share: right > left && bottom > top ? ((right - left) * (bottom - top)) / (rect.width * rect.height) : 0 }
  }
  const shown = [...document.querySelectorAll<HTMLElement>('a, button, input, select, textarea, [role="button"], [role="switch"]')]
    .map(node => ({ node, rect: visibleRect(node) }))
    .filter(({ rect }) => rect.share > 0)
  const boxOf = (rect: { left: number; top: number; right: number; bottom: number }) => ({ left: rect.left / width, top: rect.top / height, right: rect.right / width, bottom: rect.bottom / height })
  const elements = shown.map(({ node, rect }, index) => ({ ref: `e${index + 1}`, role: roleOf(node), name: nameOf(node), box: boxOf(rect) }))
  const uncovered = (node: HTMLElement, rect: { left: number; top: number; right: number; bottom: number }) => {
    const top = document.elementFromPoint((rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2)
    return top !== null && (top === node || node.contains(top))
  }
  const candidates = shown.flatMap(({ node, rect }, index) => {
    if (!node.dataset.target || rect.share < 0.3 || !uncovered(node, rect)) return []
    const pixels = { width: rect.right - rect.left, height: rect.bottom - rect.top }
    return [{ description: node.dataset.target, kind: node.dataset.kind, ref: `e${index + 1}`, box: boxOf(rect), pixels, clipped: rect.share < 0.95 }]
  })
  return { elements, candidates }
}

const settled = 'document.fonts.ready.then(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))))'

export const renderer = async () => {
  const executable = await findBrowser()
  if (!executable) throw new Error('No Chrome, Edge or Chromium found; set CHROME_PATH')
  const profile = mkdtempSync(join(tmpdir(), 'sand-bench-chrome-'))
  const args = ['--headless=new', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--force-device-scale-factor=1']
  const browser = await launch({ executable, profile, args, deadline: Date.now() + 30_000 })
  const { targetId } = await browser.call<{ targetId: string }>('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await browser.call<{ sessionId: string }>('Target.attachToTarget', { targetId, flatten: true })
  const call = <T>(method: string, params: object = {}) => browser.call<T>(method, params, sessionId)

  return {
    async render(html: string, width: number, height: number): Promise<Rendered> {
      await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })
      const { frameTree } = await call<{ frameTree: { frame: { id: string } } }>('Page.getFrameTree')
      await call('Page.setDocumentContent', { frameId: frameTree.frame.id, html })
      await call('Runtime.evaluate', { expression: settled, awaitPromise: true })
      const { result } = await call<{ result: { value: Omit<Rendered, 'png'> } }>('Runtime.evaluate', { expression: `(${collect.toString()})()`, returnByValue: true })
      await call('Runtime.evaluate', { expression: settled, awaitPromise: true })
      const { data } = await call<{ data: string }>('Page.captureScreenshot', { format: 'png' })
      return { png: Buffer.from(data, 'base64'), ...result.value }
    },
    async close() {
      await browser.close()
      rmSync(profile, { recursive: true, force: true })
    },
  }
}
