use std::{
    collections::{HashMap, VecDeque},
    path::PathBuf,
    process::Stdio,
    sync::{Arc, Mutex as StdMutex, RwLock as StdRwLock, atomic::AtomicU64},
};

use serde::Serialize;
use serde_json::Value;
use tauri::AppHandle;
use tokio::{
    process::{Child, ChildStdin, Command},
    sync::{Mutex, RwLock},
};

mod acp;
mod events;
mod paths;
mod worker;
mod workspace;
mod workspaces;

use crate::{acp::Error as AcpError, journal::JournalError};
pub use paths::WorkspaceInfo;
use paths::{RuntimePaths, WorkspacePaths, bun_executable};
use worker::PendingSender;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;
use workspace::Workspace;

#[derive(Debug, thiserror::Error)]
pub enum RuntimeError {
    #[error("cannot locate the runtime file at {0}")]
    MissingRuntimeFile(String),
    #[error("cannot resolve the user home directory: {0}")]
    Home(String),
    #[error("cannot open workspace {path}: {source}")]
    Workspace {
        path: String,
        #[source]
        source: std::io::Error,
    },
    #[error("workspace must be a directory: {0}")]
    WorkspaceDirectory(String),
    #[error("unknown workspace: {0}")]
    UnknownWorkspace(String),
    #[error("cannot close the only open workspace")]
    LastWorkspace,
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
    Journal(#[from] JournalError),
    #[error(transparent)]
    Acp(#[from] AcpError),
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeEvent {
    pub seq: u64,
    pub workspace_id: Option<String>,
    pub kind: String,
    pub payload: Value,
}

pub struct Runtime {
    home: PathBuf,
    stdin: Mutex<ChildStdin>,
    child: Mutex<Child>,
    tasks: StdMutex<Vec<tokio::task::JoinHandle<()>>>,
    pending: Mutex<HashMap<u64, PendingSender>>,
    events: StdMutex<VecDeque<RuntimeEvent>>,
    next_request: AtomicU64,
    next_event: AtomicU64,
    workspaces: RwLock<HashMap<String, Arc<Workspace>>>,
    active_workspace: StdRwLock<Option<String>>,
    workspace_changes: Mutex<()>,
}

impl Runtime {
    pub async fn start(app: &AppHandle) -> Result<Arc<Self>, RuntimeError> {
        let paths = RuntimePaths::resolve(app)?;
        let mut command = Command::new(bun_executable());
        command
            .arg("run")
            .arg("--no-install")
            .arg(&paths.host)
            .current_dir(&paths.root)
            .env("SAND_APP_ROOT", &paths.root)
            .env("SAND_BUILTIN_EXTENSIONS", &paths.extensions)
            .env("SAND_HOME", &paths.home)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .kill_on_drop(true);

        #[cfg(windows)]
        command.creation_flags(CREATE_NO_WINDOW);

        let mut child = command.spawn().map_err(RuntimeError::Start)?;
        let stdin = child.stdin.take().ok_or(RuntimeError::MissingStdin)?;
        let stdout = child.stdout.take().ok_or(RuntimeError::MissingStdout)?;
        let stderr = child.stderr.take().ok_or(RuntimeError::MissingStderr)?;
        let runtime = Arc::new(Self {
            home: paths.home,
            stdin: Mutex::new(stdin),
            child: Mutex::new(child),
            tasks: StdMutex::new(Vec::new()),
            pending: Mutex::new(HashMap::new()),
            events: StdMutex::new(VecDeque::new()),
            next_request: AtomicU64::new(1),
            next_event: AtomicU64::new(1),
            workspaces: RwLock::new(HashMap::new()),
            active_workspace: StdRwLock::new(None),
            workspace_changes: Mutex::new(()),
        });

        runtime
            .tasks
            .lock()
            .expect("runtime task lock is not poisoned")
            .extend([
                tokio::spawn(Self::read_stdout(Arc::clone(&runtime), stdout)),
                tokio::spawn(Self::read_stderr(Arc::clone(&runtime), stderr)),
            ]);

        if let Err(error) = runtime.open_workspace(paths.initial_workspace).await {
            runtime.shutdown().await;
            return Err(error);
        }
        Ok(runtime)
    }

    pub async fn request(
        &self,
        workspace_id: Option<String>,
        method: String,
        params: Value,
    ) -> Result<Value, RuntimeError> {
        let workspace = self.workspace(workspace_id.as_deref()).await?;
        if method.starts_with("acp.") {
            return self.request_acp(&workspace, &method, params).await;
        }
        match method.as_str() {
            "threads.list" => return Ok(workspace.journal.threads()),
            "threads.get" => {
                let id = required_parameter(&params, "id")?;
                return Ok(workspace.journal.thread(id)?);
            }
            "journal.events" => {
                let id = required_parameter(&params, "threadId")?;
                return Ok(workspace.journal.events(id)?);
            }
            _ => {}
        }
        self.request_worker(Some(&workspace.paths.info.id), method, params)
            .await
    }

    pub async fn shutdown(&self) {
        self.shutdown_workspaces().await;
        let _ = self.child.lock().await.kill().await;
        let pending = std::mem::take(&mut *self.pending.lock().await);
        for (_, sender) in pending {
            let _ = sender.send(Err("extension runtime stopped".to_owned()));
        }
        let tasks = std::mem::take(
            &mut *self
                .tasks
                .lock()
                .expect("runtime task lock is not poisoned"),
        );
        for task in tasks {
            task.abort();
        }
    }
}

fn required_parameter<'a>(params: &'a Value, key: &str) -> Result<&'a str, RuntimeError> {
    params
        .get(key)
        .and_then(Value::as_str)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| RuntimeError::Request(format!("{key} is required")))
}
