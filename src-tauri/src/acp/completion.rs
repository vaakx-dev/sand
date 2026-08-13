use std::sync::Arc;

use serde_json::{Value, json};
use tokio::sync::RwLock;
use uuid::Uuid;

use super::{
    Acp, Error, SessionRecord, State,
    compat::{GenerationSelection, summary},
    model::now,
};

const TITLE_PROMPT: &str = "Create a concise thread title from the user's first message. Return only the title, with no quotation marks, markdown, explanation, or ending punctuation. Use at most eight words.";

impl Acp {
    pub(crate) fn start_title_generation(
        self: &Arc<Self>,
        thread_id: String,
        initial_title: String,
        prompt: String,
        selection: GenerationSelection,
    ) {
        if selection.provider.is_empty() || selection.model.is_empty() {
            return;
        }
        let owner = Arc::clone(self);
        tokio::spawn(async move {
            if let Err(error) = owner
                .generate_title(&thread_id, &initial_title, &prompt, &selection)
                .await
            {
                let _ = owner.events.record(
                    "title.failed",
                    json!({
                        "threadId": thread_id,
                        "provider": selection.provider,
                        "model": selection.model,
                        "error": error.to_string(),
                    }),
                );
            }
        });
    }

    async fn generate_title(
        &self,
        thread_id: &str,
        initial_title: &str,
        prompt: &str,
        selection: &GenerationSelection,
    ) -> Result<(), Error> {
        self.events.record(
            "title.started",
            json!({
                "threadId": thread_id,
                "provider": selection.provider,
                "model": selection.model,
                "reasoning": selection.reasoning,
            }),
        )?;
        let request = format!("{TITLE_PROMPT}\n\nUser's first message:\n{prompt}");
        let content = self.complete(thread_id, request, selection).await?;
        let Some(title) = clean_title(&content) else {
            return Ok(());
        };
        let current = self.events.thread(thread_id)?;
        if current.get("title").and_then(Value::as_str) != Some(initial_title) {
            return Ok(());
        }
        let updated_at = now();
        self.events.record(
            "thread.title_updated",
            json!({
                "threadId": thread_id,
                "title": title,
                "updatedAt": updated_at,
            }),
        )?;
        self.events.record(
            "title.completed",
            json!({
                "threadId": thread_id,
                "provider": selection.provider,
                "model": selection.model,
                "reasoning": selection.reasoning,
                "title": title,
            }),
        )?;
        let thread = self.events.thread(thread_id)?;
        self.events
            .emit("threads.changed", json!({ "thread": summary(&thread)? }));
        Ok(())
    }

    async fn complete(
        &self,
        thread_id: &str,
        prompt: String,
        selection: &GenerationSelection,
    ) -> Result<String, Error> {
        let agent_id = self.agent_for_provider(&selection.provider).await?;
        let value = self
            .new_session(json!({
                "agentId": agent_id,
                "threadId": thread_id,
                "_meta": { "sand.app/purpose": "thread_title" },
            }))
            .await?;
        let mut session = serde_json::from_value::<SessionRecord>(value)?;
        self.apply_selection(&mut session, selection).await?;
        self.state
            .write()
            .await
            .completions
            .insert(session.id.clone(), String::new());
        let id = Uuid::new_v4().to_string();
        let result = self
            .prompt(json!({
                "id": session.id,
                "prompt": prompt,
                "threadId": thread_id,
                "runId": id,
                "attemptId": Uuid::new_v4().to_string(),
            }))
            .await;
        let mut state = self.state.write().await;
        let content = state.completions.remove(&session.id).unwrap_or_default();
        state.loaded_sessions.remove(&session.id);
        state.sessions.remove(&session.id);
        drop(state);
        result?;
        Ok(content)
    }
}

pub(super) async fn capture_update(
    state: &Arc<RwLock<State>>,
    session: &SessionRecord,
    update: &Value,
) -> bool {
    let mut state = state.write().await;
    let Some(content) = state.completions.get_mut(&session.id) else {
        return false;
    };
    if update.get("sessionUpdate").and_then(Value::as_str) == Some("agent_message_chunk") {
        if let Some(delta) = update
            .get("content")
            .and_then(|value| value.get("text"))
            .and_then(Value::as_str)
        {
            content.push_str(delta);
        }
    }
    true
}

fn clean_title(value: &str) -> Option<String> {
    let line = value.lines().map(str::trim).find(|line| !line.is_empty())?;
    let title = line
        .trim_matches(|character: char| {
            character.is_whitespace()
                || matches!(character, '#' | '*' | '`' | '\'' | '"' | '.' | '!' | '?')
        })
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ");
    if title.is_empty() {
        return None;
    }
    let characters = title.chars().collect::<Vec<_>>();
    Some(if characters.len() > 80 {
        format!(
            "{}...",
            characters[..77].iter().collect::<String>().trim_end()
        )
    } else {
        title
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cleans_generated_title() {
        assert_eq!(
            clean_title("  **Fix provider model selection.**\nExtra text").as_deref(),
            Some("Fix provider model selection"),
        );
    }
}
