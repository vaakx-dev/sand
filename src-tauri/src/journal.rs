use std::{path::Path, sync::Mutex};

use chrono::Utc;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

mod database;
mod projection;
mod recovery;

use database::{append, events_for, open};
use projection::{Projection, sorted_values, thread_summary, values_for};

#[derive(Debug, thiserror::Error)]
pub enum JournalError {
    #[error("cannot create journal directory: {0}")]
    Directory(#[source] std::io::Error),
    #[error("journal failed: {0}")]
    Database(#[from] rusqlite::Error),
    #[error("journal record is missing {0}")]
    Missing(&'static str),
    #[error("unknown thread: {0}")]
    UnknownThread(String),
    #[error("unknown ACP session: {0}")]
    UnknownAcpSession(String),
}

#[derive(Clone, Debug, Deserialize)]
pub struct Record {
    pub kind: String,
    #[serde(default)]
    pub payload: Value,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Event {
    pub sequence: i64,
    pub id: String,
    pub kind: String,
    pub thread_id: Option<String>,
    pub run_id: Option<String>,
    pub attempt_id: Option<String>,
    pub created_at: String,
    pub payload: Value,
}

struct Store {
    connection: Connection,
    projection: Projection,
}

pub struct Journal {
    store: Mutex<Store>,
}

impl Journal {
    pub fn open(path: &Path) -> Result<Self, JournalError> {
        let journal = Self {
            store: Mutex::new(open(path)?),
        };
        journal.reconcile()?;
        Ok(journal)
    }

    pub fn append(&self, record: Record) -> Result<Event, JournalError> {
        let mut store = self.store.lock().expect("journal lock is not poisoned");
        append(&mut store, record)
    }

    pub fn snapshot(&self) -> Value {
        let store = self.store.lock().expect("journal lock is not poisoned");
        json!({
            "threads": sorted_values(&store.projection.threads, "updatedAt"),
            "runs": sorted_values(&store.projection.runs, "createdAt"),
            "attempts": sorted_values(&store.projection.attempts, "createdAt"),
            "acpAgents": sorted_values(&store.projection.acp_agents, "updatedAt"),
            "acpSessions": sorted_values(&store.projection.acp_sessions, "updatedAt"),
        })
    }

    pub fn acp_agents(&self) -> Value {
        let store = self.store.lock().expect("journal lock is not poisoned");
        Value::Array(sorted_values(&store.projection.acp_agents, "updatedAt"))
    }

    pub fn acp_sessions(&self) -> Value {
        let store = self.store.lock().expect("journal lock is not poisoned");
        Value::Array(sorted_values(&store.projection.acp_sessions, "updatedAt"))
    }

    pub fn acp_session(&self, id: &str) -> Result<Value, JournalError> {
        let store = self.store.lock().expect("journal lock is not poisoned");
        store
            .projection
            .acp_sessions
            .get(id)
            .cloned()
            .ok_or_else(|| JournalError::UnknownAcpSession(id.to_owned()))
    }

    pub fn threads(&self) -> Value {
        let store = self.store.lock().expect("journal lock is not poisoned");
        Value::Array(
            sorted_values(&store.projection.threads, "updatedAt")
                .into_iter()
                .filter(|thread| thread.get("listed").and_then(Value::as_bool) != Some(false))
                .map(thread_summary)
                .collect(),
        )
    }

    pub fn thread(&self, id: &str) -> Result<Value, JournalError> {
        let store = self.store.lock().expect("journal lock is not poisoned");
        let mut thread = store
            .projection
            .threads
            .get(id)
            .cloned()
            .ok_or_else(|| JournalError::UnknownThread(id.to_owned()))?;
        let object = thread
            .as_object_mut()
            .ok_or(JournalError::Missing("thread object"))?;
        object.insert(
            "runs".to_owned(),
            Value::Array(values_for(&store.projection.runs, "threadId", id)),
        );
        object.insert(
            "attempts".to_owned(),
            Value::Array(values_for(&store.projection.attempts, "threadId", id)),
        );
        Ok(thread)
    }

    pub fn events(&self, thread_id: &str) -> Result<Value, JournalError> {
        let store = self.store.lock().expect("journal lock is not poisoned");
        Ok(
            serde_json::to_value(events_for(&store.connection, thread_id)?)
                .expect("journal events are serializable"),
        )
    }
}

fn timestamp() -> String {
    Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
}
