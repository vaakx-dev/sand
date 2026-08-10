use std::{fs, path::Path};

use rusqlite::{Connection, params};
use serde_json::Value;
use uuid::Uuid;

use super::{
    Event, JournalError, Record, Store,
    projection::{Projection, apply, correlation},
    timestamp,
};

pub(super) fn open(path: &Path) -> Result<Store, JournalError> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(JournalError::Directory)?;
    }
    let connection = Connection::open(path)?;
    connection.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA synchronous = FULL;
         CREATE TABLE IF NOT EXISTS journal_events (
           sequence INTEGER PRIMARY KEY AUTOINCREMENT,
           id TEXT NOT NULL UNIQUE,
           kind TEXT NOT NULL,
           thread_id TEXT,
           run_id TEXT,
           attempt_id TEXT,
           created_at TEXT NOT NULL,
           payload TEXT NOT NULL
         );
         CREATE INDEX IF NOT EXISTS journal_events_thread
           ON journal_events(thread_id, sequence);
         CREATE INDEX IF NOT EXISTS journal_events_run
           ON journal_events(run_id, sequence);",
    )?;
    let projection = replay(&connection)?;
    Ok(Store {
        connection,
        projection,
    })
}

pub(super) fn append(store: &mut Store, record: Record) -> Result<Event, JournalError> {
    let id = Uuid::new_v4().to_string();
    let created_at = timestamp();
    let thread_id = correlation(&record.payload, "threadId");
    let run_id = correlation(&record.payload, "runId");
    let attempt_id = correlation(&record.payload, "attemptId");
    let payload = serde_json::to_string(&record.payload).expect("record payload is serializable");
    store.connection.execute(
        "INSERT INTO journal_events
         (id, kind, thread_id, run_id, attempt_id, created_at, payload)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            id,
            record.kind,
            thread_id,
            run_id,
            attempt_id,
            created_at,
            payload
        ],
    )?;
    let event = Event {
        sequence: store.connection.last_insert_rowid(),
        id,
        kind: record.kind,
        thread_id,
        run_id,
        attempt_id,
        created_at,
        payload: record.payload,
    };
    apply(&mut store.projection, &event);
    Ok(event)
}

fn replay(connection: &Connection) -> Result<Projection, JournalError> {
    let mut projection = Projection::default();
    let mut statement = connection.prepare(
        "SELECT sequence, id, kind, thread_id, run_id, attempt_id, created_at, payload
         FROM journal_events ORDER BY sequence",
    )?;
    let rows = statement.query_map([], event_from_row)?;
    for event in rows {
        apply(&mut projection, &event?);
    }
    Ok(projection)
}

pub(super) fn events_for(
    connection: &Connection,
    thread_id: &str,
) -> Result<Vec<Event>, rusqlite::Error> {
    let mut statement = connection.prepare(
        "SELECT sequence, id, kind, thread_id, run_id, attempt_id, created_at, payload
         FROM journal_events WHERE thread_id = ?1 ORDER BY sequence",
    )?;
    statement
        .query_map([thread_id], event_from_row)?
        .collect::<Result<Vec<_>, _>>()
}

fn event_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Event> {
    let payload: String = row.get(7)?;
    Ok(Event {
        sequence: row.get(0)?,
        id: row.get(1)?,
        kind: row.get(2)?,
        thread_id: row.get(3)?,
        run_id: row.get(4)?,
        attempt_id: row.get(5)?,
        created_at: row.get(6)?,
        payload: serde_json::from_str(&payload).unwrap_or(Value::Null),
    })
}
