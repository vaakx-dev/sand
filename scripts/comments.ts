import { Glob } from 'bun'
import { join, resolve } from 'node:path'

interface Comment {
  start: number
  end: number
}

const root = resolve(import.meta.dir, '..')
const sources = new Glob('{apps,packages,plugins,scripts}/**/*.{ts,tsx,js,jsx,mjs,cjs,css}')
const directive = /^\/\/\/\s*<reference/
const regexAfter = /[(,=:[!&|?{};+\-*%<>~^]|^$|\b(return|typeof|case|do|else|in|of|new|delete|void|throw|yield|await)$/

const skipString = (text: string, at: number) => {
  const quote = text[at]
  let i = at + 1
  while (i < text.length && text[i] !== quote && text[i] !== '\n') i += text[i] === '\\' ? 2 : 1
  return i + 1
}

const skipRegex = (text: string, at: number) => {
  let i = at + 1
  let inClass = false
  while (i < text.length && text[i] !== '\n') {
    const char = text[i]
    if (char === '\\') i++
    else if (char === '[') inClass = true
    else if (char === ']') inClass = false
    else if (char === '/' && !inClass) return i + 1
    i++
  }
  return i
}

const findComments = (text: string, css: boolean) => {
  const comments: Comment[] = []
  const templates: number[] = []
  let braces = 0
  let previous = ''
  let i = 0
  while (i < text.length) {
    const char = text[i]!
    const next = text[i + 1]
    if (char === '/' && next === '*') {
      const end = text.indexOf('*/', i + 2)
      comments.push({ start: i, end: end < 0 ? text.length : end + 2 })
      i = end < 0 ? text.length : end + 2
    } else if (!css && char === '/' && next === '/') {
      const end = text.indexOf('\n', i)
      comments.push({ start: i, end: end < 0 ? text.length : end })
      i = end < 0 ? text.length : end
    } else if (char === '"' || char === "'") {
      i = skipString(text, i)
      previous = 'a'
    } else if (!css && (char === '`' || (char === '}' && templates.at(-1) === braces))) {
      if (char === '}') templates.pop()
      i++
      while (i < text.length && text[i] !== '`' && !(text[i] === '$' && text[i + 1] === '{')) i += text[i] === '\\' ? 2 : 1
      if (text[i] === '$') {
        templates.push(braces)
        i += 2
        previous = '{'
      } else {
        i++
        previous = 'a'
      }
    } else if (!css && char === '/' && regexAfter.test(previous)) {
      i = skipRegex(text, i)
      previous = 'a'
    } else {
      if (char === '{') braces++
      if (char === '}') braces--
      if (!/\s/.test(char)) previous = /[\w$]/.test(char) ? text.slice(Math.max(0, i - 7), i + 1).match(/[\w$]+$/)![0] : char
      i++
    }
  }
  return comments.filter(({ start }) => !directive.test(text.slice(start, start + 20)))
}

const strip = (text: string, comments: Comment[]) => {
  let out = text
  for (const { start, end } of comments.toReversed()) {
    const lineStart = out.lastIndexOf('\n', start - 1) + 1
    const lineEnd = out.indexOf('\n', end) < 0 ? out.length : out.indexOf('\n', end)
    const ownLines = !out.slice(lineStart, start).trim() && !out.slice(end, lineEnd).trim()
    out = ownLines ? out.slice(0, lineStart) + out.slice(Math.min(lineEnd + 1, out.length)) : out.slice(0, start).trimEnd() + out.slice(end)
  }
  return out
}

const fix = process.argv.includes('--fix')
const found: string[] = []
for await (const path of sources.scan({ cwd: root })) {
  if (path.includes('node_modules')) continue
  const file = Bun.file(join(root, path))
  const text = await file.text()
  const comments = findComments(text, path.endsWith('.css'))
  if (!comments.length) continue
  if (fix) await Bun.write(file, strip(text, comments))
  for (const { start } of comments) found.push(`${path}:${text.slice(0, start).split('\n').length}: ${text.slice(start, text.indexOf('\n', start)).slice(0, 80)}`)
}

if (found.length && !fix) {
  console.error(`Comments are not allowed; name things so the code says it:\n${found.join('\n')}`)
  process.exit(1)
}
console.log(fix ? `Removed ${found.length} comments` : 'No comments')
