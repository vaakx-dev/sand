import type { Markdown } from '@sand/markdown/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div, el, img, sig, span } from '@vaakx-dev/vrui'
import { extensionOf, type FileFormat, type OpenFile } from '../contract'
import { pictureStage } from './picture'

interface Parts {
  kit: Kit
  markdown(): Markdown | undefined
}

const SHOWN_LINES = 20_000

const TEXT_EXTENSIONS = [
  'txt', 'log', 'csv', 'tsv', 'json', 'jsonc', 'json5', 'jsonl', 'ndjson', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'env', 'xml', 'html', 'htm', 'css', 'scss', 'less',
  'js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx', 'mts', 'cts', 'py', 'rb', 'go', 'rs', 'java', 'kt', 'swift', 'c', 'h', 'cc', 'cpp', 'hpp', 'cs', 'php', 'lua', 'sh', 'bash', 'zsh',
  'ps1', 'sql', 'r', 'dart', 'scala', 'zig', 'nix', 'ex', 'exs', 'hs', 'elm', 'vue', 'svelte', 'graphql', 'gql', 'proto', 'sol', 'diff', 'patch', 'tex', 'gradle', 'lock',
]
const MARKDOWN_EXTENSIONS = ['md', 'markdown', 'mdx']
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg', 'bmp', 'ico']
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'oga', 'm4a', 'aac', 'flac', 'opus', 'weba']
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'm4v', 'ogv']

const numbered = (text: string) => {
  const lines = text.split(/\r?\n/)
  const shown = lines.slice(0, SHOWN_LINES)
  return { shown, hidden: lines.length - shown.length }
}

const codeView = ({ kit, markdown }: Parts, file: OpenFile, text: string) => {
  const { shown, hidden } = numbered(text)
  const code = shown.join('\n')
  const highlight = markdown()?.highlight
  return div(
    { class: 'flex flex-col gap-2 p-3' },
    kit.codeBlock(
      { copy: () => text, class: 'flex gap-3 overflow-x-auto whitespace-pre text-xs' },
      span({ class: 'shrink-0 select-none text-right text-neutral-500' }, shown.map((_, index) => index + 1).join('\n')),
      span({ class: 'shrink-0' }, highlight ? highlight(code, extensionOf(file.name)) : code),
    ),
    hidden > 0 ? kit.metaLine(`${hidden} more lines not shown`) : null,
  )
}

const textFormat = (parts: Parts): FileFormat => ({
  id: 'text',
  extensions: TEXT_EXTENSIONS,
  render: async file => codeView(parts, file, await file.content()),
})

const markdownFormat = (parts: Parts): FileFormat => ({
  id: 'markdown',
  extensions: MARKDOWN_EXTENSIONS,
  async render(file) {
    const text = await file.content()
    const found = parts.markdown()
    if (!found) return codeView(parts, file, text)
    const files = { link: (target: string, label: (Node | string)[]) => file.link(target, label), mention: () => undefined }
    return div({ class: 'p-4' }, parts.kit.prose(...found.nodes(text, { files, size: 'reading' })))
  },
})

const objectUrl = async (file: OpenFile) => {
  const src = URL.createObjectURL(await file.blob())
  return { src, onMount: () => () => URL.revokeObjectURL(src) }
}

const imageFormat = (): FileFormat => ({
  id: 'image',
  extensions: IMAGE_EXTENSIONS,
  async render(file) {
    const actual = sig(false)
    const source = await objectUrl(file)
    return pictureStage({ actual: () => actual.get(), toggle: () => actual.update(value => !value), element: look => img({ ...source, alt: file.name, ...look }) })
  },
})

const stage = (player: HTMLElement) => div({ class: 'flex justify-center p-4' }, player)

const audioFormat = (): FileFormat => ({
  id: 'audio',
  extensions: AUDIO_EXTENSIONS,
  render: async file => stage(el('audio', { ...(await objectUrl(file)), controls: true, preload: 'metadata', class: 'w-full' })),
})

const videoFormat = (): FileFormat => ({
  id: 'video',
  extensions: VIDEO_EXTENSIONS,
  render: async file => stage(el('video', { ...(await objectUrl(file)), controls: true, preload: 'metadata', playsInline: true, class: 'w-full rounded-md' })),
})

const builtinFormats = (parts: Parts) => [markdownFormat(parts), imageFormat(), audioFormat(), videoFormat()]

export { builtinFormats, textFormat, type Parts }
