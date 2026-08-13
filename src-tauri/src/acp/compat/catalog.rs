use serde_json::{Value, json};

use super::super::{Acp, AgentRecord, Error};

const PROVIDER_META: &str = "sand.app/provider";

impl Acp {
    pub async fn compat_providers(&self) -> Result<Value, Error> {
        let state = self.state.read().await;
        let providers = state
            .agents
            .values()
            .filter(|agent| agent.record.status == "connected")
            .map(|agent| provider_description(&agent.record))
            .collect::<Vec<_>>();
        Ok(Value::Array(providers))
    }

    pub(in crate::acp) async fn agent_for_provider(
        &self,
        provider_id: &str,
    ) -> Result<String, Error> {
        let state = self.state.read().await;
        if let Some(agent) = state
            .agents
            .values()
            .filter(|agent| agent.record.status == "connected")
            .find(|agent| agent.record.id == provider_id)
        {
            return Ok(agent.record.id.clone());
        }
        if !provider_id.is_empty() {
            return Err(Error::UnknownAgent(provider_id.to_owned()));
        }
        drop(state);
        self.default_agent_id().await
    }

    async fn default_agent_id(&self) -> Result<String, Error> {
        self.state
            .read()
            .await
            .agents
            .values()
            .find(|agent| agent.record.status == "connected")
            .map(|agent| agent.record.id.clone())
            .ok_or_else(|| Error::Invalid("no ACP agent is connected".to_owned()))
    }
}

fn provider_description(agent: &AgentRecord) -> Value {
    let name = agent
        .implementation
        .as_ref()
        .and_then(|value| value.get("title").or_else(|| value.get("name")))
        .and_then(Value::as_str)
        .unwrap_or(&agent.id);
    let catalog = agent
        .meta
        .as_ref()
        .and_then(|meta| meta.get(PROVIDER_META))
        .filter(|value| value.is_object());
    let default_model = catalog
        .and_then(|value| value.get("defaultModel"))
        .and_then(Value::as_str)
        .filter(|value| !value.is_empty())
        .unwrap_or("default");
    let model_defaults = catalog
        .and_then(|value| value.get("modelDefaults"))
        .cloned()
        .unwrap_or_else(default_traits);
    let models = catalog
        .and_then(|value| value.get("models"))
        .and_then(Value::as_array)
        .filter(|models| !models.is_empty())
        .cloned()
        .unwrap_or_else(|| vec![default_model_description(default_model)]);
    json!({
        "id": agent.id,
        "name": name,
        "defaultModel": default_model,
        "modelDefaults": model_defaults,
        "models": models,
    })
}

fn default_traits() -> Value {
    json!({
        "reasoning": [],
        "defaultReasoning": "",
        "serviceTiers": [],
        "defaultServiceTier": "",
    })
}

fn default_model_description(slug: &str) -> Value {
    let mut model = default_traits();
    if let Some(object) = model.as_object_mut() {
        object.insert("slug".to_owned(), json!(slug));
        object.insert("name".to_owned(), json!("Agent default"));
    }
    model
}
