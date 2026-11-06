import type { Ledger } from '@sand/ledger/contract'

const schema = [['create table calendar_feeds (calendar text primary key, token text not null unique)']]

const newToken = () => Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString('base64url')

export const createFeeds = (ledger: Ledger) => {
  ledger.migrate('calendar-local', schema)
  const byCalendar = ledger.db.query<{ token: string }, { calendar: string }>('select token from calendar_feeds where calendar = $calendar')
  const byToken = ledger.db.query<{ calendar: string }, { token: string }>('select calendar from calendar_feeds where token = $token')
  const add = ledger.db.query<unknown, { calendar: string; token: string }>('insert into calendar_feeds (calendar, token) values ($calendar, $token)')

  return {
    token(calendar: string) {
      const known = byCalendar.get({ calendar })?.token
      if (known) return known
      const token = newToken()
      add.run({ calendar, token })
      return token
    },
    calendar: (token: string) => byToken.get({ token })?.calendar,
  }
}
