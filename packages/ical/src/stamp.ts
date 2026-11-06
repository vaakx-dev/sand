export type Stamp = { kind: 'date'; date: Temporal.PlainDate } | { kind: 'local'; plain: Temporal.PlainDateTime } | { kind: 'utc'; instant: Temporal.Instant }

const pattern = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/

export const readStamp = (value: string): Stamp => {
  const match = pattern.exec(value.trim())
  if (!match) throw new Error(`Bad iCalendar date ${value}`)
  const [, year, month, day, hour, minute, second] = match.map(Number)
  const date = Temporal.PlainDate.from({ year: year!, month: month!, day: day! }, { overflow: 'reject' })
  if (match[4] === undefined) return { kind: 'date', date }
  const plain = date.toPlainDateTime({ hour: hour!, minute: minute!, second: Math.min(second!, 59) })
  return match[7] ? { kind: 'utc', instant: plain.toZonedDateTime('UTC').toInstant() } : { kind: 'local', plain }
}

const digits = (text: string) => text.replace(/[-:]/g, '')

export const dateStamp = (date: Temporal.PlainDate) => digits(date.toString())

export const localStamp = (plain: Temporal.PlainDateTime) => digits(plain.toString({ smallestUnit: 'second' }))

export const utcStamp = (ms: number) => `${localStamp(Temporal.Instant.fromEpochMilliseconds(ms).toZonedDateTimeISO('UTC').toPlainDateTime())}Z`
