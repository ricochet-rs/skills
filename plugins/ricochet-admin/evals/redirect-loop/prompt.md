---
name: redirect-loop
tags: [positive]
runs: 1
max_turns: 4
timeout_seconds: 180
allowed_tools: [Skill, Read, Glob, Grep]
---

Users get stuck in a redirect loop when signing in to our Ricochet server.
