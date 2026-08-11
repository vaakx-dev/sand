mod callback;
mod client;
mod connection;
mod event;
mod model;
mod session;

use std::{
    collections::{HashMap, HashSet},
    path::PathBuf,
    sync::Arc,
};

use agent_client_protocol::{Agent, ConnectionTo};
use serde_json::Value;
use tokio::sync::{RwLock, oneshot};

pub use event::{Event, Events};
use model::{AgentRecord, SessionRecord, now, session_payload};

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("{0}")]
    Invalid(String),
    #[error("ACP agent already connected: {0}")]
    DuplicateAgent(String),
    #[error("unknown ACP agent: {0}")]
    UnknownAgent(String),
    #[error("unknown ACP session: {0}")]
    UnknownSession(String),
    #[error("ACP session is already running: {0}")]
    BusySession(String),
    #[error("ACP protocol error: {0}")]
    Protocol(String),
    #[error("ACP connection stopped before initialization")]
    Stopped,
    #[error("ACP journal failed: {0}")]
    Journal(String),
}

impl From<agent_client_protocol::Error> for Error {
    fn from(error: agent_client_protocol::Error) -> Self {
        Self::Protocol(error.to_string())
    }
}

impl From<serde_json::Error> for Error {
    fn from(error: serde_json::Error) -> Self {
        Self::Invalid(error.to_string())
    }
}

impl From<crate::journal::JournalError> for Error {
    fn from(error: crate::journal::JournalError) -> Self {
        Self::Journal(error.to_string())
    }
}

struct AgentHandle {
    connection: ConnectionTo<Agent>,
    close: Option<oneshot::Sender<()>>,
    record: AgentRecord,
}

#[derive(Default)]
struct State {
    agents: HashMap<String, AgentHandle>,
    connecting: HashSet<String>,
    sessions: HashMap<String, SessionRecord>,
    shutting_down: bool,
}

pub struct Acp {
    workspace: PathBuf,
    events: Events,
    state: Arc<RwLock<State>>,
}

impl Acp {
    pub fn new(workspace: PathBuf, snapshot: &Value, events: Events) -> Arc<Self> {
        let mut state = State::default();
        if let Some(sessions) = snapshot.get("acpSessions").and_then(Value::as_array) {
            for value in sessions {
                if let Ok(session) = serde_json::from_value::<SessionRecord>(value.clone()) {
                    state.sessions.insert(session.id.clone(), session);
                }
            }
        }
        Arc::new(Self {
            workspace,
            events,
            state: Arc::new(RwLock::new(state)),
        })
    }

    async fn connection(&self, id: &str) -> Result<ConnectionTo<Agent>, Error> {
        self.state
            .read()
            .await
            .agents
            .get(id)
            .map(|agent| agent.connection.clone())
            .ok_or_else(|| Error::UnknownAgent(id.to_owned()))
    }

    pub async fn shutdown(&self) {
        let closes = {
            let mut state = self.state.write().await;
            state.shutting_down = true;
            state
                .agents
                .values_mut()
                .filter_map(|agent| agent.close.take())
                .collect::<Vec<_>>()
        };
        for close in closes {
            let _ = close.send(());
        }
    }

    async fn session(&self, id: &str) -> Result<SessionRecord, Error> {
        self.state
            .read()
            .await
            .sessions
            .get(id)
            .cloned()
            .ok_or_else(|| Error::UnknownSession(id.to_owned()))
    }

    async fn commit_session(
        &self,
        id: &str,
        kind: &str,
        extra: Option<Value>,
        update: impl FnOnce(&mut SessionRecord) -> Result<(), Error>,
    ) -> Result<SessionRecord, Error> {
        let mut state = self.state.write().await;
        let mut session = state
            .sessions
            .get(id)
            .cloned()
            .ok_or_else(|| Error::UnknownSession(id.to_owned()))?;
        update(&mut session)?;
        session.updated_at = now();
        self.events.record(kind, session_payload(&session, extra))?;
        state.sessions.insert(id.to_owned(), session.clone());
        Ok(session)
    }

    fn resolve_cwd(&self, cwd: Option<PathBuf>) -> Result<PathBuf, Error> {
        let cwd = cwd.unwrap_or_else(|| self.workspace.clone());
        if !cwd.is_absolute() {
            return Err(Error::Invalid(
                "ACP session cwd must be absolute".to_owned(),
            ));
        }
        Ok(cwd)
    }
}
