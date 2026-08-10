use std::sync::{Arc, atomic::Ordering};

use serde::Deserialize;
use serde_json::{Value, json};
use tokio::{
    io::{AsyncBufReadExt, AsyncWriteExt, BufReader},
    sync::oneshot,
};

use super::{Runtime, RuntimeError};
use crate::orchestration::Record;

pub(super) type PendingSender = oneshot::Sender<Result<Value, String>>;

#[derive(Debug, Deserialize)]
struct WireEvent {
    kind: String,
    #[serde(default)]
    payload: Value,
}

#[derive(Debug, Deserialize)]
struct WireRecord {
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
    record: Option<WireRecord>,
}

impl Runtime {
    pub(super) async fn request_worker(
        &self,
        method: String,
        params: Value,
    ) -> Result<Value, RuntimeError> {
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

    pub(super) async fn read_stdout(runtime: Arc<Self>, stdout: tokio::process::ChildStdout) {
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

    pub(super) async fn read_stderr(runtime: Arc<Self>, stderr: tokio::process::ChildStderr) {
        let mut lines = BufReader::new(stderr).lines();
        while let Ok(Some(line)) = lines.next_line().await {
            runtime.push_event("runtime.log", json!({ "message": line }));
        }
    }

    async fn handle_message(&self, message: WireMessage) {
        if let Some(record) = message.record {
            match self.orchestration.append(Record {
                kind: record.kind,
                payload: record.payload,
            }) {
                Ok(event) => self.push_event(
                    "orchestration.event",
                    serde_json::to_value(event).expect("orchestration event is serializable"),
                ),
                Err(error) => self.push_event(
                    "orchestration.error",
                    json!({ "message": error.to_string() }),
                ),
            }
        }

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
}
