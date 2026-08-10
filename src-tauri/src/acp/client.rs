use std::sync::Arc;

use agent_client_protocol::{
    AcpAgent, Agent, Client, ConnectionTo, on_receive_notification, on_receive_request,
    schema::{
        ProtocolVersion,
        v1::{
            Implementation, InitializeRequest, InitializeResponse, PermissionOptionKind,
            RequestPermissionOutcome, RequestPermissionRequest, RequestPermissionResponse,
            SelectedPermissionOutcome, SessionNotification,
        },
    },
};
use tokio::sync::{mpsc, oneshot};

use super::{
    Acp, Error,
    callback::{publish_notification, publish_permission},
};

impl Acp {
    pub(super) async fn run_connection(
        self: &Arc<Self>,
        agent_id: String,
        agent: AcpAgent,
        ready: mpsc::Sender<Result<(ConnectionTo<Agent>, InitializeResponse), Error>>,
        close: oneshot::Receiver<()>,
    ) -> Result<(), agent_client_protocol::Error> {
        let notification_state = Arc::clone(&self.state);
        let notification_events = self.events.clone();
        let notification_agent = agent_id.clone();
        let permission_state = Arc::clone(&self.state);
        let permission_events = self.events.clone();
        let permission_agent = agent_id;

        let initialized_ready = ready.clone();
        let result = Client
            .builder()
            .name("sand")
            .on_receive_notification(
                async move |notification: SessionNotification, _connection| {
                    publish_notification(
                        &notification_agent,
                        &notification_state,
                        &notification_events,
                        notification,
                    )
                    .await
                },
                on_receive_notification!(),
            )
            .on_receive_request(
                async move |request: RequestPermissionRequest, responder, _connection| {
                    let selected = request
                        .options
                        .iter()
                        .find(|option| option.kind == PermissionOptionKind::AllowAlways)
                        .or_else(|| {
                            request
                                .options
                                .iter()
                                .find(|option| option.kind == PermissionOptionKind::AllowOnce)
                        })
                        .or_else(|| request.options.first());
                    publish_permission(
                        &permission_agent,
                        &permission_state,
                        &permission_events,
                        &request,
                        selected.map(|option| option.option_id.to_string()),
                    )
                    .await?;
                    match selected {
                        Some(option) => responder.respond(RequestPermissionResponse::new(
                            RequestPermissionOutcome::Selected(SelectedPermissionOutcome::new(
                                option.option_id.clone(),
                            )),
                        )),
                        None => responder.respond(RequestPermissionResponse::new(
                            RequestPermissionOutcome::Cancelled,
                        )),
                    }
                },
                on_receive_request!(),
            )
            .connect_with(agent, |connection: ConnectionTo<Agent>| async move {
                let initialized = connection
                    .send_request(InitializeRequest::new(ProtocolVersion::V1).client_info(
                        Implementation::new("sand", env!("CARGO_PKG_VERSION")).title("Sand"),
                    ))
                    .block_task()
                    .await;
                match initialized {
                    Ok(initialized) => {
                        let _ = initialized_ready
                            .send(Ok((connection.clone(), initialized)))
                            .await;
                        let _ = close.await;
                        Ok(())
                    }
                    Err(error) => {
                        let _ = initialized_ready
                            .send(Err(Error::Protocol(error.to_string())))
                            .await;
                        Err(error)
                    }
                }
            })
            .await;
        if let Err(error) = &result {
            let _ = ready.send(Err(Error::Protocol(error.to_string()))).await;
        }
        result
    }
}
