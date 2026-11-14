import { expect, test } from 'bun:test'
import { tildeHome } from '../src'

test('tildeHome shows every home folder in a text as ~ and leaves other folders alone', () => {
  expect(tildeHome('C:\\Users\\ada\\AppData\\Local')).toBe('~\\AppData\\Local')
  expect(tildeHome('cd "c:/Users/ada/src" && ls')).toBe('cd "~/src" && ls')
  expect(tildeHome('PATH=/home/ada/bin:/home/ada/.local/bin')).toBe('PATH=~/bin:~/.local/bin')
  expect(tildeHome('in /Users/ada.lovelace/notes.')).toBe('in ~/notes.')
  expect(tildeHome('saved in /home/ada.')).toBe('saved in ~.')
  expect(tildeHome('/root/.config')).toBe('~/.config')
  expect(tildeHome('/c/Users/ada/src and /mnt/c/Users/ada/src')).toBe('~/src and ~/src')
  expect(tildeHome('{"path":"C:\\\\Users\\\\ada\\\\x"}')).toBe('{"path":"~\\\\x"}')
  expect(tildeHome('C:\\Users\\Public\\Desktop')).toBe('C:\\Users\\Public\\Desktop')
  expect(tildeHome('/Users/Shared/x')).toBe('/Users/Shared/x')
  expect(tildeHome('/mnt/home/ada/x')).toBe('/mnt/home/ada/x')
  expect(tildeHome('./home/ada')).toBe('./home/ada')
  expect(tildeHome('/rootless')).toBe('/rootless')
  expect(tildeHome('file:///C:/Users/ada/x')).toBe('file:///C:/Users/ada/x')
})
