/**
 * Reef Bridge plugin entry. Exposes git_operate and ssh_execute as real
 * agent tools, calling reef-credbroker directly over loopback HTTP -- same
 * design already validated in Reef's own Python tools.py: the broker
 * performs the actual git/SSH operation itself, using whatever credential
 * it holds; this process only ever sees the resulting output, never the
 * credential, not even transiently.
 */
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { Type } from "typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";

const BROKER_URL = process.env.REEF_CREDBROKER_URL ?? "http://127.0.0.1:8901";

const GitOperateParams = Type.Object({
  operation: Type.String({
    description: "clone, pull, fetch, status, log, diff, commit, push, branch, tag",
  }),
  repo_path: Type.String({ description: "Absolute path to the repo on this machine" }),
  remote_url: Type.Optional(Type.String()),
  message: Type.Optional(Type.String({ description: "For commit" })),
  branch: Type.Optional(Type.String()),
  ref: Type.Optional(Type.String()),
  no_main: Type.Optional(
    Type.Boolean({ description: "Refuse to push to main/master. Defaults to true." }),
  ),
});

const SshExecuteParams = Type.Object({
  host_alias: Type.String({
    description: "A host alias already configured in reef-credbroker's ssh_hosts.json",
  }),
  command: Type.String(),
});

const gitOperateTool: AnyAgentTool = {
  name: "git_operate",
  label: "Git Operate",
  description:
    "Deterministic git operation via reef-credbroker -- the broker performs the actual " +
    "operation using whatever credential it holds; this tool only ever sees the output.",
  parameters: GitOperateParams,
  async execute(_toolCallId, params) {
    let res: Response;
    try {
      res = await fetch(`${BROKER_URL}/git/operate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
    } catch (err) {
      return {
        content: [{ type: "text", text: `[git_operate failed: could not reach reef-credbroker: ${String(err)}]` }],
        details: { error: String(err) },
      };
    }
    const body = (await res.json()) as { output?: string; error?: string | null };
    if (body.error && !body.output) {
      return {
        content: [{ type: "text", text: `[git_operate failed: ${body.error}]` }],
        details: body,
      };
    }
    return {
      content: [{ type: "text", text: body.output ?? "" }],
      details: body,
    };
  },
};

const sshExecuteTool: AnyAgentTool = {
  name: "ssh_execute",
  label: "SSH Execute",
  description:
    "Run a command on a configured remote host via reef-credbroker -- the broker performs " +
    "the actual SSH connection using whatever credential it holds for that host alias; " +
    "this tool only ever sees stdout/stderr/exit_code, never the credential.",
  parameters: SshExecuteParams,
  async execute(_toolCallId, params) {
    let res: Response;
    try {
      res = await fetch(`${BROKER_URL}/ssh/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
    } catch (err) {
      return {
        content: [{ type: "text", text: `[ssh_execute failed: could not reach reef-credbroker: ${String(err)}]` }],
        details: { error: String(err) },
      };
    }
    const body = (await res.json()) as { output?: string; error?: string | null; exit_code?: number };
    if (body.error && !body.output) {
      return {
        content: [{ type: "text", text: `[ssh_execute failed: ${body.error}]` }],
        details: body,
      };
    }
    return {
      content: [{ type: "text", text: body.output ?? "" }],
      details: body,
    };
  },
};

export default definePluginEntry({
  id: "reef-bridge",
  name: "Reef Bridge",
  description: "Exposes git_operate and ssh_execute, calling reef-credbroker directly.",
  register(api) {
    api.registerTool(gitOperateTool);
    api.registerTool(sshExecuteTool);
  },
});
