# Vendored Claude Code Skills

These skills were installed on **2026-07-26** from the VirtualizationHowto article
*"These Downloadable AI Skills Made My Home Lab Agents Much More Useful."* Each skill is a
third-party `SKILL.md` (plus any bundled `references/`, `scripts/`, `assets/`) that Claude
auto-loads when a task matches the skill's description. They are vendored here so they travel
with the repo — nothing is wired into the build.

To update a skill, re-pull from its upstream source below.

| Skill | Upstream source |
|-------|-----------------|
| `multi-stage-dockerfile` | github/awesome-copilot → `skills/multi-stage-dockerfile` |
| `technology-stack-blueprint-generator` | github/awesome-copilot → `skills/technology-stack-blueprint-generator` |
| `security-review` | github/awesome-copilot → `skills/security-review` |
| `acquire-codebase-knowledge` | github/awesome-copilot → `skills/acquire-codebase-knowledge` |
| `dependabot` | github/awesome-copilot → `skills/dependabot` |
| `docker-patterns` | affaan-m/everything-claude-code → `skills/docker-patterns` |
| `docker-compose-orchestration` | manutej/luxor-claude-marketplace → `plugins/luxor-devops-suite/skills/docker-compose-orchestration` |
| `kubernetes-specialist` | jeffallan/claude-skills → `skills/kubernetes-specialist` |

**Note:** These are third-party instruction files. `acquire-codebase-knowledge` also ships a
Python helper (`scripts/scan.py`); it only runs if a task explicitly invokes it. TikCal is a
React + Vite + Supabase frontend with no Docker/Kubernetes, so the Docker/K8s skills are
reference material rather than immediately applicable here.
