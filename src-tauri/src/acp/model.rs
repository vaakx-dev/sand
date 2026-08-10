use std::{collections::BTreeMap, path::PathBuf};

use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectRequest {
    pub id: String,
    pub command: String,
    #[serde(default)]
    pub args: Vec<String>,
    #[serde(default)]
    pub env: BTreeMap<String, String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewSessionRequest {
    pub agent_id: String,
    pub cwd: Option<PathBuf>,
    pub thread_id: Option<String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IdRequest {
    pub id: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PromptRequest {
    pub id: String,
    pub prompt: String,
    pub thread_id: String,
    pub run_id: String,
    pub attempt_id: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetModeRequest {
    pub id: String,
    pub mode_id: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetConfigRequest {
    pub id: String,
    pub config_id: String,
    pub value: Value,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthenticateRequest {
    pub agent_id: String,
    pub method_id: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentRecord {
    pub id: String,
    pub command: String,
    pub args: Vec<String>,
    pub env: Vec<String>,
    pub status: String,
    pub protocol_version: Option<Value>,
    pub capabilities: Option<Value>,
    pub auth_methods: Option<Value>,
    pub implementation: Option<Value>,
    pub created_at: String,
    pub updated_at: String,
    pub error: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionRecord {
    pub id: String,
    pub agent_id: String,
    pub acp_session_id: String,
    pub cwd: PathBuf,
    pub thread_id: Option<String>,
    pub status: String,
    pub run_id: Option<String>,
    pub attempt_id: Option<String>,
    pub modes: Option<Value>,
    pub config_options: Option<Value>,
    pub meta: Option<Value>,
    pub stop_reason: Option<Value>,
    pub created_at: String,
    pub updated_at: String,
    pub error: Option<String>,
}

pub fn agent_payload(agent: &AgentRecord) -> Value {
    json!({ "agentId": agent.id, "agent": agent })
}

pub fn session_payload(session: &SessionRecord, extra: Option<Value>) -> Value {
    let mut payload = json!({
        "sessionId": session.id,
        "agentId": session.agent_id,
        "acpSessionId": session.acp_session_id,
        "session": session,
    });
    merge_correlations(&mut payload, session);
    if let Some(Value::Object(extra)) = extra {
        if let Some(payload) = payload.as_object_mut() {
            payload.extend(extra);
        }
    }
    payload
}

pub fn merge_correlations(payload: &mut Value, session: &SessionRecord) {
    let Some(payload) = payload.as_object_mut() else {
        return;
    };
    if let Some(thread_id) = &session.thread_id {
        payload.insert("threadId".to_owned(), json!(thread_id));
    }
    if let Some(run_id) = &session.run_id {
        payload.insert("runId".to_owned(), json!(run_id));
    }
    if let Some(attempt_id) = &session.attempt_id {
        payload.insert("attemptId".to_owned(), json!(attempt_id));
    }
}

pub fn validate_id(label: &str, value: &str) -> Result<(), super::Error> {
    if value.trim().is_empty() {
        return Err(super::Error::Invalid(format!("{label} is required")));
    }
    Ok(())
}

pub fn to_value(value: &impl Serialize) -> Value {
    serde_json::to_value(value).expect("ACP value is serializable")
}

pub fn protocol_error(error: impl ToString) -> agent_client_protocol::Error {
    let mut protocol = agent_client_protocol::Error::internal_error();
    protocol.message = error.to_string();
    protocol
}

pub fn now() -> String {
    Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
}
