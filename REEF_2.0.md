# REEF 2.0 -- Migration Charter

## The core strategy: parallel migration, not a cutover

This is NOT "replace Reef, then figure it out." Old Reef stays fully live
and operational, exactly as it is, the entire time. REEF 2.0 is built
and tested ALONGSIDE it, on the same server, in a different folder, on a
different port -- same IP. Both deployments coexist without conflict.

**Shutting down the existing Reef is the LAST step in this entire
project -- and only happens after REEF 2.0 is fully built and tested,
not before.**

## Absolute constraints -- do not violate

- Do NOT touch, modify, or disrupt the existing production setup:
  - `/home/vikas/prvis-reef/` and its running `reef.service` -- untouched.
  - The `main` branch of `prvis-reef` -- untouched.
  - The current, live runtime code -- untouched, keeps running exactly
    as it does today, for the entire duration of this project.
- REEF 2.0 work happens in a NEW, separate folder on the SAME server
  (`reef`), bound to the SAME existing IP but a DIFFERENT port, so
  nothing conflicts with what's already running.
- All REEF 2.0 code work happens on a `dev` branch (in the `openclaw`
  repo, `mbmjsuperuser7/openclaw`) -- not on `main`, until it's actually
  ready.

## What REEF 2.0 actually is: the best of both, not a wholesale swap

**Take from OpenClaw -- the parts that are genuinely better, more
mature, more battle-tested than the current bespoke Reef code:**
- `@openclaw/agent-core`'s real agent loop (`agent-loop.ts`) -- backed
  by a 124K test suite, with NATIVE tool-loop recovery (loop detection)
  and turn-interruption/resume already built in and battle-tested --
  the exact things hand-built from scratch in Reef's `executor.py`
  tonight, less reliably, with real bugs (a missing import, an
  unconfirmed repetition threshold) that OpenClaw's version doesn't have.
- Its harness/session/compaction system -- more sophisticated than
  Reef's own `compaction.py`.
- Its gateway -- a real, production multiplexing layer.

**Keep from Reef/Grafect -- what's genuinely specific to Vikas's own
requirements and does NOT exist in OpenClaw at all:**
- `unified_mcp_router.py` (grafect) -- the MCP-facing router itself,
  including `submit_reef_task`/`check_reef_task` as the ONLY legitimate
  path in, the "no bypass Reef or Grafect" rule, and its own native
  integrations (graph, OpenProject, Outline, Open Notebook).
- `reef-credbroker` -- the credential-isolation architecture (GitHub
  PAT, SSH credentials held in a genuinely separate process, never
  touching the agent runtime's own memory). Stays exactly as-is --
  it's already a clean, language-agnostic HTTP service; OpenClaw's own
  tools call it directly, the same way Reef's `git_operate` does today.
  No porting needed.
- Fine-grained GitHub permission enforcement per role (contents:
  read/write, enforced before any git action executes).
- The teams/roles concept and its specific role definitions (git
  operations, SSH, media pipelines, etc.) -- translated into whatever
  OpenClaw's own native config/skill system uses, not discarded.

## Integration shape (the concrete "how")

1. OpenClaw's own gateway/`agent-core` becomes the real execution
   engine, running as its own service, in the new dev folder, on the
   new dev port.
2. `reef-credbroker` stays running exactly as it is today (same
   process, same port, same code) -- reachable by BOTH the old Reef
   and the new OpenClaw-based engine, since it's just a loopback HTTP
   service either can call.
3. `unified_mcp_router.py` is updated to support BOTH targets during
   the migration -- `submit_reef_task`/`check_reef_task` can reach
   EITHER the old Reef engine or the new OpenClaw-based one (e.g. via
   an explicit parameter, or two distinct tool pairs during the
   transition). This is the literal "point the MCP at both" instruction
   -- nothing gets cut over silently.
4. Reef's existing roles/teams/permission contracts get translated into
   OpenClaw's native equivalent, one at a time, tested against the new
   engine while the old engine keeps running in parallel the whole time.
5. Only once REEF 2.0 is confirmed working, end to end, tested
   thoroughly -- THEN, and only then, is shutting down the old Reef
   even considered, as an explicit, separate, later decision.

## Current status (as of this writing)

- Fresh OpenClaw base pushed to `mbmjsuperuser7/openclaw` (`main`,
  single clean commit, current as of tonight). Needs a `dev` branch
  created from this for actual REEF 2.0 work, per the branch
  requirement above.
- `build_dev` task (`task-9da1653f268a`, Reef's own `coder` role) is
  PAUSED -- it got real, substantial work done (confirmed: ~9,300 input
  / ~6,800 output tokens of real reasoning) before hitting a genuine,
  correct blocker: the sandbox container it runs inside was missing
  Node.js/pnpm (needed for OpenClaw's own build), and its filesystem is
  deliberately read-only, so it couldn't self-install them. Fixed by
  baking Node.js 20 + pnpm into the sandbox image directly. Once
  rebuilt and deployed, this task resumes from exactly where it paused
  -- not from scratch.
- Real infrastructure issues found and fixed tonight, independent of
  REEF 2.0 but worth noting since they affected testing: a stale ARP
  cache entry between `reef` and `alpha-ai`, `vikas` missing from the
  `docker` group (blocking the sandbox entirely), and a GPU passthrough
  fault on `alpha-ai` requiring a guest VM reboot (confirmed fixed --
  real GPU utilization verified via `nvidia-smi` during a live
  generation, 30% util / ~14.8GB used).
