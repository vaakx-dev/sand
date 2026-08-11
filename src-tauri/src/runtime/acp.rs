use serde_json::Value;

use super::{Runtime, RuntimeError, Workspace, required_parameter};

impl Runtime {
    pub(super) async fn request_acp(
        &self,
        workspace: &Workspace,
        method: &str,
        params: Value,
    ) -> Result<Value, RuntimeError> {
        match method {
            "acp.agents" => Ok(workspace.journal.acp_agents()),
            "acp.sessions" => Ok(workspace.journal.acp_sessions()),
            "acp.session" => {
                let id = required_parameter(&params, "id")?;
                Ok(workspace.journal.acp_session(id)?)
            }
            "acp.connect" => Ok(workspace.acp.connect(params).await?),
            "acp.disconnect" => Ok(workspace.acp.disconnect(params).await?),
            "acp.authenticate" => Ok(workspace.acp.authenticate(params).await?),
            "acp.session.new" => Ok(workspace.acp.new_session(params).await?),
            "acp.session.load" => Ok(workspace.acp.load_session(params).await?),
            "acp.session.prompt" => Ok(workspace.acp.prompt(params).await?),
            "acp.session.cancel" => Ok(workspace.acp.cancel(params).await?),
            "acp.session.setMode" => Ok(workspace.acp.set_mode(params).await?),
            "acp.session.setConfig" => Ok(workspace.acp.set_config(params).await?),
            _ => Err(RuntimeError::Request(format!(
                "unknown ACP request: {method}"
            ))),
        }
    }
}
