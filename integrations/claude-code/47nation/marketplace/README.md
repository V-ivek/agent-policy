# Marketplace manifest (provisional)

This directory contains a template `marketplace.json` for publishing the `47nation`
publisher with the `agent-policy` plugin on a Claude Code plugin marketplace.

## What is provisional

- `marketplace.json` is **not** a registered manifest. It is a template shape.
- The `47nation` publisher namespace is not currently registered on any Claude Code
  plugin marketplace. This file assumes the owner of this repository will register
  that namespace on a marketplace that supports it.

## Before publishing

1. Confirm the exact manifest schema your target marketplace expects. Edit this file
   to match — field names may differ from the template.
2. Register the `47nation` publisher on that marketplace.
3. Host this file at the URL the marketplace requires.
4. Remove the `_note` field.

Until those steps are complete, the `integrations/claude-code/47nation/` directory works
as a locally-installable plugin — see the parent `README.md`.
