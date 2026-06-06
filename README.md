# prvis-ai — OpenClaw (stripped fork)

Communication gateway for prvis-ai.
Stripped to: Telegram, WhatsApp, Slack, Signal.
All messages route to brain-gateway /webhook.

## What was removed
128 extensions removed. Kept: telegram, slack, signal, whatsapp, ollama, webhooks, searxng.
Removed: docs, qa, deploy, scripts, git-hooks, skills, changelog, contributing docs.

## What was added
- prvis/config.yaml — prvis channel config, all messages route to brain-gateway
- prvis/docker-compose.yml — 512M RAM limit, PostgreSQL backend, agent-network

## Channels
Telegram · WhatsApp · Slack · Signal → brain-gateway /webhook → AI
