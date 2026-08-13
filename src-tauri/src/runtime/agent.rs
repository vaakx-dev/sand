use serde_json::{Value, json};

use super::{Runtime, RuntimeError, Workspace, required_parameter};
use crate::acp::GenerationSelection;

impl Runtime {
    pub(super) async fn request_agent(
        &self,
        workspace: &Workspace,
        method: &str,
        params: Value,
    ) -> Result<Value, RuntimeError> {
        match method {
            "agent.providers" => Ok(workspace.acp.compat_providers().await?),
            "agent.run.start" => {
                let prompt = required_parameter(&params, "prompt")?.trim().to_owned();
                if prompt.is_empty() {
                    return Err(RuntimeError::Request("prompt is required".to_owned()));
                }
                let existing = params
                    .get("threadId")
                    .and_then(Value::as_str)
                    .filter(|id| !id.is_empty());
                let thread = match existing {
                    Some(id) if !id.is_empty() => workspace.journal.thread(id)?,
                    _ => {
                        let provider = required_parameter(&params, "provider")?.trim();
                        if provider.is_empty() {
                            return Err(RuntimeError::Request("provider is required".to_owned()));
                        }
                        let model = required_parameter(&params, "model")?.trim();
                        if model.is_empty() {
                            return Err(RuntimeError::Request("model is required".to_owned()));
                        }
                        self.request_worker(
                            Some(&workspace.paths.info.id),
                            "threads.create".to_owned(),
                            json!({
                                "prompt": prompt,
                                "provider": provider,
                                "model": model,
                            }),
                        )
                        .await?
                    }
                };
                if existing.is_none() {
                    if let Some(selection) = title_selection(&params) {
                        workspace.acp.start_title_generation(
                            value(&thread, "id"),
                            value(&thread, "title"),
                            prompt.clone(),
                            selection,
                        );
                    }
                }
                let selection = run_selection(&thread, &params);
                Ok(workspace
                    .acp
                    .start_compat(thread, prompt, selection)
                    .await?)
            }
            "agent.run.queue" => {
                let thread_id = required_parameter(&params, "threadId")?;
                let prompt = required_parameter(&params, "prompt")?;
                Ok(workspace.acp.queue_compat(thread_id, prompt, false).await?)
            }
            "agent.run.steer" => {
                let thread_id = required_parameter(&params, "threadId")?;
                let prompt = required_parameter(&params, "prompt")?;
                Ok(workspace.acp.steer_compat(thread_id, prompt).await?)
            }
            "agent.run.cancel" => {
                let thread_id = required_parameter(&params, "threadId")?;
                Ok(workspace.acp.cancel_compat(thread_id).await?)
            }
            "agent.run.recover" => {
                let thread_id = required_parameter(&params, "threadId")?;
                let thread = workspace.journal.thread(thread_id)?;
                Ok(workspace
                    .acp
                    .start_compat(
                        thread.clone(),
                        "Continue the previous task.".to_owned(),
                        run_selection(&thread, &Value::Null),
                    )
                    .await?)
            }
            _ => Err(RuntimeError::Request(format!(
                "unknown agent request: {method}"
            ))),
        }
    }
}

fn run_selection(thread: &Value, params: &Value) -> GenerationSelection {
    GenerationSelection {
        provider: value(thread, "provider"),
        model: value(thread, "model"),
        reasoning: value(params, "reasoning"),
        service_tier: value(params, "serviceTier"),
    }
}

fn title_selection(params: &Value) -> Option<GenerationSelection> {
    let value = params.get("titleGeneration")?;
    let selection = GenerationSelection {
        provider: self::value(value, "provider"),
        model: self::value(value, "model"),
        reasoning: self::value(value, "reasoning"),
        service_tier: String::new(),
    };
    (!selection.provider.is_empty() && !selection.model.is_empty()).then_some(selection)
}

fn value(source: &Value, key: &str) -> String {
    source
        .get(key)
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_owned()
}
