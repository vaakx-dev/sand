import { CodexBridge } from "./bridge.ts";
import { startCodex } from "./codex.ts";
import { RpcConnection, type RpcHandler } from "./rpc.ts";

if (import.meta.main) {
  const command = process.argv[2];
  if (!command) throw new Error("Codex CLI command is required");

  const codex = startCodex(command);
  let requestId = 0;
  const acp = new RpcConnection(
    process.stdin,
    (line) => process.stdout.write(line),
    true,
    () => `codex:${++requestId}`,
  );
  const bridge = new CodexBridge(acp, codex.rpc);
  const acpHandler: RpcHandler = {
    request: (method, params) => bridge.requestFromAcp(method, params),
    notification: (method, params) => bridge.notificationFromAcp(method, params),
    closed: () => codex.close(),
  };
  const codexHandler: RpcHandler = {
    request: (method, params) => bridge.requestFromCodex(method, params),
    notification: (method, params) => bridge.notificationFromCodex(method, params),
    closed: (error) => bridge.fail(error),
  };

  codex.rpc.start(codexHandler);
  acp.start(acpHandler);
  bridge.start();
  const close = () => codex.close();
  const terminate = () => {
    close();
    process.stdin.destroy();
  };
  process.once("SIGINT", terminate);
  process.once("SIGTERM", terminate);
  process.once("exit", close);
  void codex.exited.then((code) => {
    const error = new Error(`Codex app-server exited with code ${code}`);
    bridge.fail(error);
    acp.stop(error);
  });
}
