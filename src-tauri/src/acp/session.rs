use agent_client_protocol::schema::v1::{
    CancelNotification, ContentBlock, LoadSessionRequest,
    NewSessionRequest as ProtocolNewSessionRequest, PromptRequest as ProtocolPromptRequest,
    SessionConfigOptionValue, SetSessionConfigOptionRequest, SetSessionModeRequest,
};
use serde_json::{Value, json};
use uuid::Uuid;

use super::{
    Acp, Error,
    model::{
        IdRequest, NewSessionRequest, PromptRequest, SessionRecord, SetConfigRequest,
        SetModeRequest, now, session_payload, to_value, validate_id,
    },
};

impl Acp {
    pub async fn new_session(&self, value: Value) -> Result<Value, Error> {
        let request = serde_json::from_value::<NewSessionRequest>(value)?;
        let connection = self.connection(&request.agent_id).await?;
        let cwd = self.resolve_cwd(request.cwd)?;
        let protocol_request = ProtocolNewSessionRequest::new(&cwd).meta(request.meta);
        let response = connection
            .send_request(protocol_request)
            .block_task()
            .await?;
        let timestamp = now();
        let session = SessionRecord {
            id: Uuid::new_v4().to_string(),
            agent_id: request.agent_id,
            acp_session_id: response.session_id.to_string(),
            cwd,
            thread_id: request.thread_id,
            status: "idle".to_owned(),
            run_id: None,
            attempt_id: None,
            modes: response.modes.as_ref().map(to_value),
            config_options: response.config_options.as_ref().map(to_value),
            meta: response.meta.as_ref().map(to_value),
            stop_reason: None,
            created_at: timestamp.clone(),
            updated_at: timestamp,
            error: None,
        };
        self.events.record(
            "acp.session.created",
            session_payload(&session, Some(json!({ "response": to_value(&response) }))),
        )?;
        let mut state = self.state.write().await;
        state.loaded_sessions.insert(session.id.clone());
        state.sessions.insert(session.id.clone(), session.clone());
        Ok(to_value(&session))
    }

    pub async fn load_session(&self, value: Value) -> Result<Value, Error> {
        let request = serde_json::from_value::<IdRequest>(value)?;
        let session = self.session(&request.id).await?;
        let connection = self.connection(&session.agent_id).await?;
        let response = connection
            .send_request(LoadSessionRequest::new(
                session.acp_session_id.clone(),
                session.cwd.clone(),
            ))
            .block_task()
            .await?;
        let extra = Some(json!({ "response": to_value(&response) }));
        let session = self
            .commit_session(&request.id, "acp.session.loaded", extra, |session| {
                session.status = "idle".to_owned();
                session.modes = response.modes.as_ref().map(to_value);
                session.config_options = response.config_options.as_ref().map(to_value);
                session.meta = response.meta.as_ref().map(to_value);
                session.error = None;
                Ok(())
            })
            .await?;
        self.state
            .write()
            .await
            .loaded_sessions
            .insert(session.id.clone());
        Ok(to_value(&session))
    }

    pub async fn prompt(&self, value: Value) -> Result<Value, Error> {
        let request = serde_json::from_value::<PromptRequest>(value)?;
        if request.prompt.trim().is_empty() {
            return Err(Error::Invalid("ACP prompt is required".to_owned()));
        }
        validate_id("thread id", &request.thread_id)?;
        validate_id("run id", &request.run_id)?;
        validate_id("attempt id", &request.attempt_id)?;

        let session = self.session(&request.id).await?;
        let connection = self.connection(&session.agent_id).await?;
        let prompt = request.prompt;
        let thread_id = request.thread_id;
        let run_id = request.run_id;
        let attempt_id = request.attempt_id;
        let running = self
            .commit_session(
                &session.id,
                "acp.prompt.started",
                Some(json!({ "prompt": prompt })),
                |session| {
                    if session.status == "running" {
                        return Err(Error::BusySession(session.id.clone()));
                    }
                    session.thread_id = Some(thread_id);
                    session.run_id = Some(run_id);
                    session.attempt_id = Some(attempt_id);
                    session.status = "running".to_owned();
                    session.stop_reason = None;
                    session.error = None;
                    Ok(())
                },
            )
            .await?;

        let result = connection
            .send_request(ProtocolPromptRequest::new(
                running.acp_session_id.clone(),
                vec![ContentBlock::from(prompt)],
            ))
            .block_task()
            .await;
        match result {
            Ok(response) => {
                self.commit_session(
                    &running.id,
                    "acp.prompt.completed",
                    Some(json!({ "response": to_value(&response) })),
                    |session| {
                        session.status = "idle".to_owned();
                        session.stop_reason = Some(to_value(&response.stop_reason));
                        session.run_id = None;
                        session.attempt_id = None;
                        Ok(())
                    },
                )
                .await?;
                Ok(to_value(&response))
            }
            Err(error) => {
                let message = error.to_string();
                self.commit_session(&running.id, "acp.prompt.failed", None, |session| {
                    session.status = "error".to_owned();
                    session.error = Some(message.clone());
                    session.run_id = None;
                    session.attempt_id = None;
                    Ok(())
                })
                .await?;
                Err(Error::Protocol(message))
            }
        }
    }

    pub async fn cancel(&self, value: Value) -> Result<Value, Error> {
        let request = serde_json::from_value::<IdRequest>(value)?;
        let session = self.session(&request.id).await?;
        let connection = self.connection(&session.agent_id).await?;
        connection.send_notification(CancelNotification::new(session.acp_session_id.clone()))?;
        self.events.record(
            "acp.prompt.cancelRequested",
            session_payload(&session, None),
        )?;
        Ok(Value::Bool(true))
    }

    pub async fn set_mode(&self, value: Value) -> Result<Value, Error> {
        let request = serde_json::from_value::<SetModeRequest>(value)?;
        let session = self.session(&request.id).await?;
        let connection = self.connection(&session.agent_id).await?;
        let response = connection
            .send_request(SetSessionModeRequest::new(
                session.acp_session_id.clone(),
                request.mode_id.clone(),
            ))
            .block_task()
            .await?;
        let extra = Some(json!({
            "modeId": request.mode_id,
            "response": to_value(&response),
        }));
        let session = self
            .commit_session(&request.id, "acp.session.mode_set", extra, |_| Ok(()))
            .await?;
        Ok(to_value(&session))
    }

    pub async fn set_config(&self, value: Value) -> Result<Value, Error> {
        let request = serde_json::from_value::<SetConfigRequest>(value)?;
        let session = self.session(&request.id).await?;
        let connection = self.connection(&session.agent_id).await?;
        let option = match request.value {
            Value::String(value) => SessionConfigOptionValue::value_id(value),
            value => serde_json::from_value::<SessionConfigOptionValue>(value)?,
        };
        let response = connection
            .send_request(SetSessionConfigOptionRequest::new(
                session.acp_session_id.clone(),
                request.config_id,
                option,
            ))
            .block_task()
            .await?;
        let extra = Some(json!({ "response": to_value(&response) }));
        let session = self
            .commit_session(&request.id, "acp.session.config_set", extra, |session| {
                session.config_options = Some(to_value(&response.config_options));
                Ok(())
            })
            .await?;
        Ok(to_value(&session))
    }
}
