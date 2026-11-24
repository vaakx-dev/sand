import type { ReleaseInfo } from '@sand/host-updates/contract'
import { expect, test } from 'bun:test'
import { newerApp } from '../src/app/update'

const APK = { url: 'https://github.example/v1.2.0/sand.apk', sha256: 'abcdef', versionCode: 1_764_000_000 }

const release = (android?: ReleaseInfo['android']): ReleaseInfo => ({
  channel: 'release',
  tag: 'v1.2.0',
  name: 'v1.2.0',
  publishedAt: 1_764_000_600_000,
  notesUrl: 'https://github.example/releases/v1.2.0',
  build: { id: 'abc1234', time: 1_764_000_600_000 },
  ...(android && { android }),
})

test('the app is offered only an APK built from a later commit than its own', () => {
  expect(newerApp(release(APK), APK.versionCode - 60)).toEqual(APK)
  expect(newerApp(release(APK), APK.versionCode)).toBeUndefined()
  expect(newerApp(release(APK), APK.versionCode + 60)).toBeUndefined()
  expect(newerApp(release(), APK.versionCode - 60)).toBeUndefined()
  expect(newerApp(undefined, APK.versionCode - 60)).toBeUndefined()
})
