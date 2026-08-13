use serde_json::{Value, json};

use super::super::{Acp, Error, SessionRecord};

#[derive(Clone, Debug, Default)]
pub(crate) struct GenerationSelection {
    pub provider: String,
    pub model: String,
    pub reasoning: String,
    pub service_tier: String,
}

impl Acp {
    pub(in crate::acp) async fn apply_selection(
        &self,
        session: &mut SessionRecord,
        selection: &GenerationSelection,
    ) -> Result<(), Error> {
        self.set_category(session, "model", &selection.model)
            .await?;
        self.set_category(session, "thought_level", &selection.reasoning)
            .await?;
        self.set_category(session, "model_config", &selection.service_tier)
            .await?;
        Ok(())
    }

    async fn set_category(
        &self,
        session: &mut SessionRecord,
        category: &str,
        value: &str,
    ) -> Result<(), Error> {
        if value.is_empty() {
            return Ok(());
        }
        let Some(config_id) = config_id(session.config_options.as_ref(), category) else {
            return Ok(());
        };
        let updated = self
            .set_config(json!({
                "id": session.id,
                "configId": config_id,
                "value": value,
            }))
            .await?;
        *session = serde_json::from_value(updated)?;
        Ok(())
    }
}

fn config_id(options: Option<&Value>, category: &str) -> Option<String> {
    options?
        .as_array()?
        .iter()
        .find(|option| option.get("category").and_then(Value::as_str) == Some(category))?
        .get("id")?
        .as_str()
        .map(ToOwned::to_owned)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn finds_configuration_by_standard_category() {
        let options = json!([
            { "id": "runtime_model", "category": "model" },
            { "id": "effort", "category": "thought_level" },
        ]);
        assert_eq!(
            config_id(Some(&options), "model").as_deref(),
            Some("runtime_model")
        );
        assert_eq!(
            config_id(Some(&options), "thought_level").as_deref(),
            Some("effort")
        );
        assert_eq!(config_id(Some(&options), "model_config"), None);
    }
}
