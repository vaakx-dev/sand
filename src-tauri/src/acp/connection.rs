use std::sync::Arc;

use agent_client_protocol::{
    AcpAgent, AcpAgentConfig, schema::v1::AuthenticateRequest as ProtocolAuthenticateRequest,
};
use serde_json::{Value, json};
use tokio::sync::{mpsc, oneshot};

use super::{
    Acp, AgentHandle, Error,
    model::{
        AgentRecord, AuthenticateRequest, ConnectRequest, IdRequest, agent_payload, now, to_value,
        validate_id,
    },
};

impl Acp {
    pub async fn connect(self: &Arc<Self>, value: Value) -> Result<Value, Error> {
        let request = serde_json::from_value::<ConnectRequest>(value)?;
        validate_id("agent id", &request.id)?;
        if request.command.trim().is_empty() {
            return Err(Error::Invalid("ACP command is required".to_owned()));
        }

        {
            let mut state = self.state.write().await;
            if state.shutting_down {
                return Err(Error::Stopped);
            }
            if state.agents.contains_key(&request.id)
                || !state.connecting.insert(request.id.clone())
            {
                return Err(Error::DuplicateAgent(request.id));
            }
        }

        let created_at = now();
        let base = AgentRecord {
            id: request.id.clone(),
            command: request.command.clone(),
            args: request.args.clone(),
            env: request.env.keys().cloned().collect(),
            status: "connecting".to_owned(),
            protocol_version: None,
            capabilities: None,
            auth_methods: None,
            implementation: None,
            created_at: created_at.clone(),
            updated_at: created_at,
            error: None,
        };
        if let Err(error) = self
            .events
            .record("acp.agent.connecting", agent_payload(&base))
        {
            self.state.write().await.connecting.remove(&request.id);
            return Err(error.into());
        }

        let config = AcpAgentConfig::new(&request.command)
            .args(request.args.clone())
            .envs(request.env.clone());
        let agent = AcpAgent::new(config).with_debug({
            let events = self.events.clone();
            let agent_id = request.id.clone();
            move |line, direction| {
                events.emit(
                    "acp.log",
                    json!({
                        "agentId": agent_id,
                        "direction": format!("{direction:?}").to_lowercase(),
                        "message": line,
                    }),
                );
            }
        });

        let (ready_tx, mut ready_rx) = mpsc::channel(1);
        let (close_tx, close_rx) = oneshot::channel();
        let (inserted_tx, inserted_rx) = oneshot::channel();
        let owner = Arc::clone(self);
        let agent_id = request.id.clone();
        let task_base = base.clone();
        tokio::spawn(async move {
            let result = owner
                .run_connection(agent_id.clone(), agent, ready_tx, close_rx)
                .await;
            let _ = inserted_rx.await;
            owner
                .connection_closed(&agent_id, task_base, result.err())
                .await;
        });

        let (connection, initialized) = ready_rx.recv().await.ok_or(Error::Stopped)??;
        let mut record = base;
        record.status = "connected".to_owned();
        record.protocol_version = Some(to_value(&initialized.protocol_version));
        record.capabilities = Some(to_value(&initialized.agent_capabilities));
        record.auth_methods = Some(to_value(&initialized.auth_methods));
        record.implementation = initialized.agent_info.as_ref().map(to_value);
        record.updated_at = now();

        self.events
            .record("acp.agent.connected", agent_payload(&record))?;
        {
            let mut state = self.state.write().await;
            state.connecting.remove(&request.id);
            if state.shutting_down {
                drop(state);
                let _ = close_tx.send(());
                let _ = inserted_tx.send(());
                return Err(Error::Stopped);
            }
            state.agents.insert(
                request.id.clone(),
                AgentHandle {
                    connection,
                    close: Some(close_tx),
                    record: record.clone(),
                },
            );
        }
        let _ = inserted_tx.send(());
        Ok(to_value(&record))
    }

    pub async fn disconnect(&self, value: Value) -> Result<Value, Error> {
        let request = serde_json::from_value::<IdRequest>(value)?;
        let close = self
            .state
            .write()
            .await
            .agents
            .get_mut(&request.id)
            .ok_or_else(|| Error::UnknownAgent(request.id.clone()))?
            .close
            .take();
        if let Some(close) = close {
            let _ = close.send(());
        }
        Ok(Value::Bool(true))
    }

    pub async fn authenticate(&self, value: Value) -> Result<Value, Error> {
        let request = serde_json::from_value::<AuthenticateRequest>(value)?;
        let connection = self.connection(&request.agent_id).await?;
        let response = connection
            .send_request(ProtocolAuthenticateRequest::new(request.method_id))
            .block_task()
            .await?;
        let payload = json!({
            "agentId": request.agent_id,
            "response": to_value(&response),
        });
        self.events
            .record("acp.agent.authenticated", payload.clone())?;
        Ok(payload)
    }

    async fn connection_closed(
        &self,
        id: &str,
        mut record: AgentRecord,
        error: Option<agent_client_protocol::Error>,
    ) {
        let removed = {
            let mut state = self.state.write().await;
            state.connecting.remove(id);
            state.agents.remove(id)
        };
        if let Some(handle) = removed {
            record = handle.record;
        }
        record.status = "disconnected".to_owned();
        record.updated_at = now();
        record.error = error.map(|error| error.to_string());
        let _ = self
            .events
            .record("acp.agent.disconnected", agent_payload(&record));
    }
}
