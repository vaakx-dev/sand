use serde_json::Value;

use super::{Runtime, RuntimeError, required_parameter};

impl Runtime {
    pub(super) async fn request_acp(
        &self,
        method: &str,
        params: Value,
    ) -> Result<Value, RuntimeError> {
        match method {
            "acp.agents" => Ok(self.journal.acp_agents()),
            "acp.sessions" => Ok(self.journal.acp_sessions()),
            "acp.session" => {
                let id = required_parameter(&params, "id")?;
                Ok(self.journal.acp_session(id)?)
            }
            "acp.connect" => Ok(self.acp.connect(params).await?),
            "acp.disconnect" => Ok(self.acp.disconnect(params).await?),
            "acp.authenticate" => Ok(self.acp.authenticate(params).await?),
            "acp.session.new" => Ok(self.acp.new_session(params).await?),
            "acp.session.load" => Ok(self.acp.load_session(params).await?),
            "acp.session.prompt" => Ok(self.acp.prompt(params).await?),
            "acp.session.cancel" => Ok(self.acp.cancel(params).await?),
            "acp.session.setMode" => Ok(self.acp.set_mode(params).await?),
            "acp.session.setConfig" => Ok(self.acp.set_config(params).await?),
            _ => Err(RuntimeError::Request(format!(
                "unknown ACP request: {method}"
            ))),
        }
    }
}
