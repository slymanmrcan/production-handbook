# AGENT DIRECTIVE: Server Setup Handbook

> **SYSTEM PROMPT:** This file is the authoritative source of truth for the project structure, technical constraints, and operating procedures. Any AI agent working on this repository MUST consume this context first.

## 1. 🎯 MISSION CONTEXT

**Goal:** Maintain a "Senior SRE Level" documentation and automation suite for Linux Server (Ubuntu/Debian) provisioning, designed for both human operators and **AI-Based Development** workflows.
**Philosophy:** "Plug-and-Play", "Secure by Default", "No Fluff (Direct & Actionable)", "Verify Everything".
**Target User:** DevOps Engineers, System Admins, and Developers building and deploying production servers with AI-assisted engineering workflows.
**Primary Output:** A high-quality Astro Starlight static site + Executable Bash Script library + AI-Based Development infrastructure contracts.

---

## 2. 🏗️ ARCHITECTURE, VERSIONS & TECH STACK

> **Repo Dev Reference:** See [`DEVELOPMENT.md`](DEVELOPMENT.md) for local setup, CSS design tokens/classes, Markdown extensions, and full contributor guidelines.

| Component                | Technology / Version Pin         | Role / Constraint                                                         |
| :----------------------- | :------------------------------- | :------------------------------------------------------------------------ |
| **Documentation Engine** | Astro 7 + Starlight, Node.js 24 in CI | Exact versions are locked in `package-lock.json`. |
| **Site CI/CD Pipeline**  | GitHub Actions                   | `.github/workflows/build.yml` (`main` → `npm run build` → GitHub Pages).   |
| **Target Server Stack**  | Ubuntu `22.04/24.04 LTS`, Debian `12`, Docker + Compose v2 (`docker compose`) | Never use legacy `docker-compose` v1, `:latest`, or deprecated `apt-key`. |
| **Automation Engine**    | Bash Scripts                     | Native, Zero-Dependency (`set -Eeuo pipefail`). Location: `docs/scripts/library`. |
| **AI-Based Dev Layer**   | Contracts & Audit Gates          | Location: `docs/ai-dev/`. Keeps AI coding aligned with prod infra.        |
| **SaaS/Product Spec**    | Commercial Plan                  | Internal only. Located in `engine-readme.md` (Excluded from git).         |

### Language & UI Conventions

- **Language:** Main handbook (`docs/`) is **Turkish** (technical terms, CLI commands, and config keys in English). `docs/android/` is **English** (preserved).
- **Styling:** Use Starlight’s shared styles in `src/handbook.css`, standard Markdown, Starlight asides, Mermaid, and MDX tabs when needed. Keep page-specific style in scoped Astro components.

---

## 3. 🛡️ NON-NEGOTIABLE INFRASTRUCTURE STANDARDS

Any code, config, recipe, or example added to this repo MUST comply with these rules:

1. **Public Exposure:** Only the edge reverse proxy listens publicly (`80/443`) alongside hardened SSH. Application, DB, cache, and admin UIs MUST bind to `127.0.0.1` or stay on private/internal Docker networks.
2. **Docker Gateway Rule:** Never publish internal services with bare `PORT:PORT` (bypasses UFW via `iptables`). Use `expose` + internal networks or `127.0.0.1:<host>:<container>`.
3. **Container Hardening:** Pin base image versions (no `:latest`), use multi-stage builds, run as non-root `USER`, include `healthcheck`, `logging` rotation (`max-size`, `max-file`), resource limits (`cpus`, `memory`, `pids_limit`), `no-new-privileges:true`, and `cap_drop: [ALL]`.
4. **Secrets:** Never hardcode passwords/tokens or recommend committing `.env`. Prefer file-based secrets (`/run/secrets/...`) and strict file permissions (`600`).
5. **Verification First:** Every guide, script, or checklist MUST include concrete verification commands (`Verify Step`). Never recommend restarting `sshd` or `nginx` without `sshd -t` / `nginx -t`.

---

## 4. 🗺️ KNOWLEDGE GRAPH (File Map & Role Separation)

### Core Configuration

- `astro.config.mjs`: Starlight configuration, static output, and GitHub Pages base path.
- `src/navigation.mjs`: Rehber, Referans, and Olay müdahalesi. Link every new guide here.
- `.gitignore`: Controls build artifacts and internal product specs.

### Functional Directories (`docs/`)

- `getting-started/`: **[ENTRY]** Single linear Day 0 → Day 1 → Day 2 roadmap (`roadmap.md`).
- `ai-dev/`: **[AI-BASED DEV]** Infrastructure context, app-server contracts, AI audit gates, reusable `AGENTS.md` templates, and AI ops playbook.
- `how-to/`: **[GUIDES]** Conceptual setup & usage guides (*"How to install & configure"*).
- `recipes/`: **[BLUEPRINTS]** Production-hardened stack tuning (.NET, React, PG, MySQL, Redis, Nginx, Traefik).
- `file-templates/`: **[CONFIG]** Clean copy-paste configuration templates (compose, nginx, systemd, env).
- `security/`: **[HARDENING]** Split in navigation into **Mandatory Baseline** vs **Advanced / Defense-in-Depth**.
  - `docker-gateway.md`: **[CRITICAL]** Networking model to prevent UFW bypass.
- `runbooks/`: **[INCIDENT]** "Break Glass" guides grouped by domain (Incident/Deploy, System/Resource, Network/TLS, DB/Backup).
- `checklists/`: **[PROTOCOL]** Verification matrices (Day 0 `server-first-setup`, Day 1 `app-launch`, `prod-ready` Go/No-Go).
- `scripts/library/`: **[EXECUTABLE]** Production-ready idempotent Bash scripts (`bootstrap`, `maintenance`, `backup`, `audit`, `health-check`, `restore`).
- `architecture/`: **[DESIGN]** Topology diagrams (`overview.md`) and port allocation policy (`port-strategy.md`).
- `troubleshooting/` & `reference/`: **[DIAGNOSTICS]** USE/RED methodology and command cheat-sheets.
- `android/`: **[PRESERVED]** Separate Android publishing documentation; do not remove or break.

---

## 5. ⚙️ STANDARD OPERATING PROCEDURES (SOP)

### SOP-001: Adding a New Guide (No Duplication)

1. Check existing directories to avoid duplicating a topic across `how-to/`, `recipes/`, and `file-templates/`. Follow the strict role separation in Section 4.
2. Create the file in the appropriate subdirectory.
3. **IMMEDIATELY** add the page to `src/navigation.mjs`.
4. Ensure the guide includes concrete **Verification** commands.

### SOP-002: Updating Scripts

1. Edit the markdown file (e.g., `docs/scripts/library/bootstrap.md`).
2. Ensure valid Bash (`set -Eeuo pipefail`), **Idempotency**, and no `curl | sh`.
3. Add a brief changelog note in the file header.

### SOP-003: AI-Based Development Alignment

1. Whenever a core architectural standard, port range, security baseline, or stack recipe changes, update `docs/ai-dev/infra-context.md` and `docs/ai-dev/app-contracts.md` in the same change.
2. Keep `docs/ai-dev/context-templates.md` synchronized so external repos copy accurate rules.

### SOP-004: Handling Internal Specs

1. `engine-readme.md` contains internal SaaS business logic and is `.gitignore`d.
2. Do not expose its contents in public docs unless explicitly requested.

### SOP-005: Mandatory Build & Link Verification

1. Before completing any documentation, navigation, or styling change, run:
   ```bash
   npm run build
   ```
2. Fix every warning, broken link, or unreferenced file before finishing. Do not commit generated `dist/` output.

---

## 6. 🧠 MEMORY & CONTEXT (Current State)

- **Latest Upgrade:** Migrated the static site to Astro Starlight with a contextual sidebar and CI checks for generated pages, sidebar coverage, and internal links. The Day 0 → Day 1 → Day 2 roadmap and AI development guides are the main entry points for their workflows.
- **Preserved Scope:** `docs/android/` remains intact and untouched.
