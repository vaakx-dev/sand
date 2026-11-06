export const schema = [
  [
    `create table calendars (
      id text primary key,
      provider text not null,
      data text not null,
      token text,
      created integer not null
    )`,
    `create table calendar_events (
      calendar text not null,
      id text not null,
      series text,
      first integer not null,
      last integer,
      data text not null,
      primary key (calendar, id)
    )`,
    'create index calendar_events_first on calendar_events (calendar, first)',
    'create index calendar_events_series on calendar_events (calendar, series)',
  ],
]
