use std::sync::Arc;

use agent_client_protocol::schema::v1::{RequestPermissionRequest, SessionNotification};
use serde_json::json;
use tokio::sync::RwLock;

use super::{
    State,
    event::Events,
    model::{merge_correlations, protocol_error, to_value},
};

pub(super) async fn publish_notification(
    agent_id: &str,
    state: &Arc<RwLock<State>>,
    events: &Events,
    notification: SessionNotification,
) -> Result<(), agent_client_protocol::Error> {
    let acp_session_id = notification.session_id.to_string();
    let session = state
        .read()
        .await
        .sessions
        .values()
        .find(|session| session.agent_id == agent_id && session.acp_session_id == acp_session_id)
        .cloned();
    let update = to_value(&notification.update);
    let mut payload = json!({
        "agentId": agent_id,
        "acpSessionId": acp_session_id,
        "update": update,
    });
    if let Some(ref session) = session {
        merge_correlations(&mut payload, session);
        payload["sessionId"] = json!(session.id);
    }
    events
        .record("acp.session.update", payload)
        .map_err(protocol_error)?;
    if let Some(ref session) = session {
        super::compat::publish_update(state, events, &session, &update).await?;
    }
    Ok(())
}

pub(super) async fn publish_permission(
    agent_id: &str,
    state: &Arc<RwLock<State>>,
    events: &Events,
    request: &RequestPermissionRequest,
    selected: Option<String>,
) -> Result<(), agent_client_protocol::Error> {
    let acp_session_id = request.session_id.to_string();
    let session = state
        .read()
        .await
        .sessions
        .values()
        .find(|session| session.agent_id == agent_id && session.acp_session_id == acp_session_id)
        .cloned();
    let mut payload = json!({
        "agentId": agent_id,
        "acpSessionId": acp_session_id,
        "request": to_value(request),
        "selectedOptionId": selected,
    });
    if let Some(ref session) = session {
        merge_correlations(&mut payload, &session);
        payload["sessionId"] = json!(session.id);
    }
    events
        .record("acp.permission.resolved", payload)
        .map_err(protocol_error)
}
