use std::{
    collections::{HashMap, VecDeque},
    process::Stdio,
    sync::{
        Arc, Mutex as StdMutex,
        atomic::{AtomicU64, Ordering},
    },
};

use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use tauri::AppHandle;
use tokio::{
    io::{AsyncBufReadExt, AsyncWriteExt, BufReader},
    process::{Child, ChildStdin, Command},
    sync::{Mutex, oneshot},
};

mod paths;

use paths::{RuntimePaths, bun_executable};

const EVENT_LIMIT: usize = 4_000;

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
}

#[derive(Clone, Debug, Serialize)]
pub struct RuntimeEvent {
    pub seq: u64,
    pub kind: String,
    pub payload: Value,
}

#[derive(Debug, Deserialize)]
struct WireEvent {
    kind: String,
    #[serde(default)]
    payload: Value,
}

#[derive(Debug, Deserialize)]
struct WireMessage {
    id: Option<u64>,
    result: Option<Value>,
    error: Option<String>,
    event: Option<WireEvent>,
}

type PendingSender = oneshot::Sender<Result<Value, String>>;

pub struct Runtime {
    stdin: Mutex<ChildStdin>,
    _child: Mutex<Child>,
    pending: Mutex<HashMap<u64, PendingSender>>,
    events: StdMutex<VecDeque<RuntimeEvent>>,
    next_request: AtomicU64,
    next_event: AtomicU64,
}

impl Runtime {
    pub async fn start(app: &AppHandle) -> Result<Arc<Self>, RuntimeError> {
        let paths = RuntimePaths::resolve(app)?;
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
        });

        tokio::spawn(Self::read_stdout(Arc::clone(&runtime), stdout));
        tokio::spawn(Self::read_stderr(Arc::clone(&runtime), stderr));

        Ok(runtime)
    }

    pub async fn request(&self, method: String, params: Value) -> Result<Value, RuntimeError> {
        let id = self.next_request.fetch_add(1, Ordering::Relaxed);
        let body = serde_json::to_vec(&json!({
            "id": id,
            "method": method,
            "params": params,
        }))
        .expect("runtime request is serializable");
        let (sender, receiver) = oneshot::channel();
        self.pending.lock().await.insert(id, sender);

        let send_result = async {
            let mut stdin = self.stdin.lock().await;
            stdin.write_all(&body).await?;
            stdin.write_all(b"\n").await?;
            stdin.flush().await
        }
        .await;

        if let Err(error) = send_result {
            self.pending.lock().await.remove(&id);
            return Err(RuntimeError::Send(error));
        }

        receiver
            .await
            .map_err(|_| RuntimeError::Stopped)?
            .map_err(RuntimeError::Request)
    }

    pub fn events_after(&self, after: u64) -> Vec<RuntimeEvent> {
        self.events
            .lock()
            .expect("runtime event queue lock is not poisoned")
            .iter()
            .filter(|event| event.seq > after)
            .cloned()
            .collect()
    }

    async fn read_stdout(runtime: Arc<Self>, stdout: tokio::process::ChildStdout) {
        let mut lines = BufReader::new(stdout).lines();
        loop {
            match lines.next_line().await {
                Ok(Some(line)) => match serde_json::from_str::<WireMessage>(&line) {
                    Ok(message) => runtime.handle_message(message).await,
                    Err(error) => runtime.push_event(
                        "runtime.protocol_error",
                        json!({ "message": error.to_string(), "line": line }),
                    ),
                },
                Ok(None) => break,
                Err(error) => {
                    runtime.push_event(
                        "runtime.read_error",
                        json!({ "message": error.to_string() }),
                    );
                    break;
                }
            }
        }

        runtime.push_event(
            "runtime.exit",
            json!({ "message": "extension runtime stopped" }),
        );
        let pending = std::mem::take(&mut *runtime.pending.lock().await);
        for (_, sender) in pending {
            let _ = sender.send(Err("extension runtime stopped".to_owned()));
        }
    }

    async fn read_stderr(runtime: Arc<Self>, stderr: tokio::process::ChildStderr) {
        let mut lines = BufReader::new(stderr).lines();
        while let Ok(Some(line)) = lines.next_line().await {
            runtime.push_event("runtime.log", json!({ "message": line }));
        }
    }

    async fn handle_message(&self, message: WireMessage) {
        if let Some(event) = message.event {
            self.push_event(&event.kind, event.payload);
        }

        let Some(id) = message.id else {
            return;
        };
        let Some(sender) = self.pending.lock().await.remove(&id) else {
            return;
        };

        let response = match message.error {
            Some(error) => Err(error),
            None => Ok(message.result.unwrap_or(Value::Null)),
        };
        let _ = sender.send(response);
    }

    fn push_event(&self, kind: &str, payload: Value) {
        let seq = self.next_event.fetch_add(1, Ordering::Relaxed);
        let mut events = self
            .events
            .lock()
            .expect("runtime event queue lock is not poisoned");
        events.push_back(RuntimeEvent {
            seq,
            kind: kind.to_owned(),
            payload,
        });
        while events.len() > EVENT_LIMIT {
            events.pop_front();
        }
    }
}
