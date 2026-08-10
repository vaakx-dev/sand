use std::{
    collections::{HashMap, VecDeque},
    process::Stdio,
    sync::{Arc, Mutex as StdMutex, atomic::AtomicU64},
};

use serde::Serialize;
use serde_json::Value;
use tauri::AppHandle;
use tokio::{
    process::{Child, ChildStdin, Command},
    sync::Mutex,
};

mod acp;
mod events;
mod paths;
mod worker;

use crate::{
    acp::{Acp, Error as AcpError, Events as AcpEvents},
    orchestration::{Orchestration, OrchestrationError},
};
use paths::{RuntimePaths, bun_executable};
use worker::PendingSender;

#[derive(Debug, thiserror::Error)]
pub enum RuntimeError {
    #[error("cannot locate the extension runtime at {0}")]
    MissingHost(String),
    #[error("failed to start Bun: {0}")]
    Start(#[source] std::io::Error),
    #[error("the extension runtime has no stdin")]
    MissingStdin,
    #[error("the extension runtime has no stdout")]
    MissingStdout,
    #[error("the extension runtime has no stderr")]
    MissingStderr,
    #[error("failed to send a runtime request: {0}")]
    Send(#[source] std::io::Error),
    #[error("the extension runtime stopped before responding")]
    Stopped,
    #[error("{0}")]
    Request(String),
    #[error(transparent)]
    Orchestration(#[from] OrchestrationError),
    #[error(transparent)]
    Acp(#[from] AcpError),
}

#[derive(Clone, Debug, Serialize)]
pub struct RuntimeEvent {
    pub seq: u64,
    pub kind: String,
    pub payload: Value,
}

pub struct Runtime {
    stdin: Mutex<ChildStdin>,
    _child: Mutex<Child>,
    pending: Mutex<HashMap<u64, PendingSender>>,
    events: StdMutex<VecDeque<RuntimeEvent>>,
    next_request: AtomicU64,
    next_event: AtomicU64,
    orchestration: Arc<Orchestration>,
    acp: Arc<Acp>,
}

impl Runtime {
    pub async fn start(app: &AppHandle) -> Result<Arc<Self>, RuntimeError> {
        let paths = RuntimePaths::resolve(app)?;
        let orchestration = Arc::new(Orchestration::open(&paths.journal)?);
        let snapshot = orchestration.snapshot();
        let (acp_events, acp_event_rx) = AcpEvents::channel(Arc::clone(&orchestration));
        let acp = Acp::new(paths.workspace.clone(), &snapshot, acp_events);
        let bun = bun_executable();
        let mut command = Command::new(bun);
        command
            .arg("run")
            .arg(&paths.host)
            .current_dir(&paths.root)
            .env("SAND_APP_ROOT", &paths.root)
            .env("SAND_BUILTIN_EXTENSIONS", &paths.extensions)
            .env("SAND_CACHE", &paths.cache)
            .env("SAND_CONFIG", &paths.config)
            .env("SAND_USER_EXTENSIONS", &paths.user_extensions)
            .env("SAND_WORKSPACE", &paths.workspace)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .kill_on_drop(true);

        let mut child = command.spawn().map_err(RuntimeError::Start)?;
        let stdin = child.stdin.take().ok_or(RuntimeError::MissingStdin)?;
        let stdout = child.stdout.take().ok_or(RuntimeError::MissingStdout)?;
        let stderr = child.stderr.take().ok_or(RuntimeError::MissingStderr)?;

        let runtime = Arc::new(Self {
            stdin: Mutex::new(stdin),
            _child: Mutex::new(child),
            pending: Mutex::new(HashMap::new()),
            events: StdMutex::new(VecDeque::new()),
            next_request: AtomicU64::new(1),
            next_event: AtomicU64::new(1),
            orchestration,
            acp,
        });

        tokio::spawn(Self::read_stdout(Arc::clone(&runtime), stdout));
        tokio::spawn(Self::read_stderr(Arc::clone(&runtime), stderr));
        tokio::spawn(Self::read_acp_events(Arc::clone(&runtime), acp_event_rx));

        runtime
            .request_worker("orchestration.restore".to_owned(), snapshot)
            .await?;

        Ok(runtime)
    }

    pub async fn request(&self, method: String, params: Value) -> Result<Value, RuntimeError> {
        if method.starts_with("acp.") {
            return self.request_acp(&method, params).await;
        }
        match method.as_str() {
            "orchestration.threads" => return Ok(self.orchestration.threads()),
            "orchestration.thread" => {
                let id = required_parameter(&params, "id")?;
                return Ok(self.orchestration.thread(id)?);
            }
            "orchestration.events" => {
                let id = required_parameter(&params, "threadId")?;
                return Ok(self.orchestration.events(id)?);
            }
            _ => {}
        }
        self.request_worker(method, params).await
    }
}

fn required_parameter<'a>(params: &'a Value, key: &str) -> Result<&'a str, RuntimeError> {
    params
        .get(key)
        .and_then(Value::as_str)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| RuntimeError::Request(format!("{key} is required")))
}
