use serde_json::json;

use super::super::{Acp, Error, SessionRecord};

impl Acp {
    pub(super) async fn session_for_thread(&self, thread_id: &str) -> Option<SessionRecord> {
        let state = self.state.read().await;
        state
            .sessions
            .values()
            .filter(|session| session.thread_id.as_deref() == Some(thread_id))
            .max_by_key(|session| {
                (
                    state.loaded_sessions.contains(&session.id),
                    session.updated_at.as_str(),
                )
            })
            .cloned()
    }

    pub(super) async fn open_session(
        &self,
        thread_id: &str,
        agent_id: &str,
    ) -> Result<SessionRecord, Error> {
        if let Some(session) = self.session_for_thread(thread_id).await {
            let loaded = self
                .state
                .read()
                .await
                .loaded_sessions
                .contains(&session.id);
            if loaded || self.load_session(json!({ "id": session.id })).await.is_ok() {
                return self.session(&session.id).await;
            }
        }
        let value = self
            .new_session(json!({
                "agentId": agent_id,
                "threadId": thread_id,
            }))
            .await?;
        Ok(serde_json::from_value::<SessionRecord>(value)?)
    }
}
