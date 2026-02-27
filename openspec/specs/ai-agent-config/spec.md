# ai-agent-config Specification

## Purpose
TBD - created by archiving change projectx-platform-spec. Update Purpose after archive.
## Requirements
### Requirement: Multi-AI-assistant skill architecture
The system SHALL maintain a master skills directory at `.agents/skills/` with each skill as a subdirectory. Each AI assistant's config directory SHALL symlink to the master skills to avoid duplication.

#### Scenario: Adding a new skill
- **WHEN** a developer adds a new skill directory to `.agents/skills/`
- **THEN** all AI assistant configs (Claude, Cursor, Codex, Gemini, OpenCode, Windsurf) SHALL gain access via symlinks

#### Scenario: Skill structure
- **WHEN** a skill is defined
- **THEN** it SHALL contain a `SKILL.md` file with metadata (name, description, license) and instructions

### Requirement: OpenSpec integration for all assistants
OpenSpec SHALL be configured for all supported AI assistants. Each assistant SHALL have access to OpenSpec slash commands (`/opsx:new`, `/opsx:ff`, `/opsx:apply`, `/opsx:verify`, `/opsx:archive`, `/opsx:explore`, `/opsx:sync`).

#### Scenario: Using OpenSpec from any assistant
- **WHEN** a developer invokes `/opsx:new add-user-feature` in any configured AI assistant
- **THEN** the assistant SHALL create a new change directory at `openspec/changes/add-user-feature/` with the spec-driven schema

### Requirement: Claude Code agent specialization
Claude Code SHALL define specialized agents in `.claude/agents/` for different roles: backend-engineer, frontend-engineer, devops-engineer, and remotion-video-creator.

#### Scenario: Backend engineering task
- **WHEN** a task involves NestJS microservice development
- **THEN** the backend-engineer agent SHALL be available with access to NestJS, Prisma, and Temporal skills

### Requirement: MCP server configuration
The system SHALL configure MCP servers for enhanced AI capabilities including: temporal-docs (Temporal documentation), postgres (database access), stripe (payment API), playwright (browser automation), and context7 (context management).

#### Scenario: Querying Temporal documentation
- **WHEN** an AI agent needs Temporal workflow patterns
- **THEN** it SHALL access the temporal-docs MCP server for up-to-date documentation

### Requirement: Cursor rules for domain-specific guidance
Cursor SHALL have rules files in `.cursor/rules/` organized by domain: backend (nestjs-rules, packages-rules, temporal-rules), frontend (web-rules, packages-rules), and infrastructure (docker-apps, docker-database, docker-temporal).

#### Scenario: Backend development in Cursor
- **WHEN** a developer works on NestJS code in Cursor
- **THEN** Cursor SHALL apply the nestjs-rules.mdc guidelines automatically

### Requirement: Project-level instruction files
The project SHALL maintain `AGENTS.md` with agent conventions and tool references, and `CLAUDE.md` with project structure, commands, and architecture patterns. These files SHALL be kept in sync with the actual project state.

#### Scenario: New service added
- **WHEN** a new service is added to the project
- **THEN** `CLAUDE.md` SHALL be updated to include the new service in the project structure and commands sections

