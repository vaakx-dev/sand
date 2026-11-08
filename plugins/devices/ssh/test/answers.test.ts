import { expect, test } from 'bun:test'
import type { SshPrompt } from '../src/contract'
import { createAnswers } from '../src/host/askpass/answers'
import { promptKind } from '../src/host/askpass/prompt'

const hostKey = [
  "The authenticity of host 'box (10.0.0.5)' can't be established.",
  'ED25519 key fingerprint is SHA256:abc.',
  'Are you sure you want to continue connecting (yes/no/[fingerprint])? ',
].join('\n')

test('tells host keys, passwords, key passphrases and one-time codes apart', () => {
  expect(promptKind(hostKey, '')).toBe('confirm')
  expect(promptKind('Allow use of key id_ed25519?', 'confirm')).toBe('confirm')
  expect(promptKind("me@token-box's password: ", '')).toBe('password')
  expect(promptKind('(me@box) Password: ', '')).toBe('password')
  expect(promptKind("Enter passphrase for key '/home/me/.ssh/token_key': ", '')).toBe('passphrase')
  expect(promptKind('(me@box) Verification code: ', '')).toBe('code')
  expect(promptKind('One-time password (OATH) for `me`: ', '')).toBe('code')
  expect(promptKind('Passcode or option (1-3): ', '')).toBe('code')
  expect(promptKind('Enter PIN for ECDSA-SK key /home/me/.ssh/id_sk: ', '')).toBe('code')
  expect(promptKind('Confirm user presence for key ECDSA-SK SHA256:abc', 'none')).toBe('notice')
})

const asking = (replies: (string | null)[]) => {
  const asked: SshPrompt[] = []
  const ask = async (prompt: SshPrompt) => {
    asked.push(prompt)
    return replies.shift() ?? null
  }
  return { asked, ask }
}

test('asks once per attempt for a password and replays it to the next ssh, but never replays codes', async () => {
  const { asked, ask } = asking(['hunter2', '123456', '654321'])
  const answers = createAnswers({ ask })
  const first = answers.process()
  expect(await first("me@box's password: ", '')).toBe('hunter2')
  expect(await first('Verification code: ', '')).toBe('123456')
  const second = answers.process()
  expect(await second("me@box's password: ", '')).toBe('hunter2')
  expect(await second('Verification code: ', '')).toBe('654321')
  expect(asked).toEqual([
    { text: "me@box's password:", secret: true },
    { text: 'Verification code:', secret: true },
    { text: 'Verification code:', secret: true },
  ])
  expect(answers.kept()).toEqual({ "me@box's password: ": 'hunter2' })
})

test('host key questions are shown as yes/no and their answer is not kept', async () => {
  const { asked, ask } = asking(['yes'])
  const answers = createAnswers({ ask })
  expect(await answers.process()(hostKey, '')).toBe('yes')
  expect(asked[0]?.confirm).toBe(true)
  expect(asked[0]?.secret).toBe(false)
  expect(answers.kept()).toEqual({})
})

test('a saved password that ssh asks for again is dropped, and without anyone to ask it needs you', async () => {
  const rejected: string[] = []
  const prompt = "me@box's password: "
  const answers = createAnswers({ saved: { [prompt]: 'old' }, rejected: text => rejected.push(text) })
  const ssh = answers.process()
  expect(await ssh(prompt, '')).toBe('old')
  expect(await ssh(prompt, '')).toBeNull()
  expect(rejected).toEqual([prompt])
  expect(answers.kept()).toEqual({})
  expect(answers.needsYou()).toBe("me@box's password:")
})

test('once the user cancels a prompt, that ssh gets no more questions shown', async () => {
  const { asked, ask } = asking([null, 'never'])
  const ssh = createAnswers({ ask }).process()
  expect(await ssh("me@box's password: ", '')).toBeNull()
  expect(await ssh("me@box's password: ", '')).toBeNull()
  expect(asked).toHaveLength(1)
})

test('a wrong typed password is asked again and the right one is kept', async () => {
  const { ask } = asking(['wrong', 'right'])
  const answers = createAnswers({ ask })
  const ssh = answers.process()
  expect(await ssh('Password: ', '')).toBe('wrong')
  expect(await ssh('Password: ', '')).toBe('right')
  expect(answers.kept()).toEqual({ 'Password: ': 'right' })
})
