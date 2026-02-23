import { App, Notice, Plugin, PluginSettingTab, Setting } from "obsidian";

// ============================================================
// SETTINGS
// ============================================================

interface TestFixturesSettings {
	peopleFolder: string;
	groupsFolder: string;
	documentsFolder: string;
	tasksFolder: string;
	demosFolder: string;
	viewsFolder: string;
}

const DEFAULT_SETTINGS: TestFixturesSettings = {
	peopleFolder: "User-DB/People",
	groupsFolder: "User-DB/Groups",
	documentsFolder: "Document Library, Knowledge",
	tasksFolder: "TaskNotes/Tasks",
	demosFolder: "TaskNotes/Demos",
	viewsFolder: "TaskNotes/Views",
};

// ============================================================
// GENERATION CONTEXT (reads from TaskNotes at runtime)
// ============================================================

interface GenerationContext {
	assigneeField: string;
	creatorField: string;
	typeProperty: string;
	personTypeValue: string;
	groupTypeValue: string;
	personTag: string;
	groupTag: string;
	taskTag: string;
	fieldMapping: {
		title: string;
		status: string;
		priority: string;
		due: string;
		scheduled: string;
		contexts: string;
		projects: string;
		timeEstimate: string;
		completedDate: string;
		dateCreated: string;
		recurrence: string;
		reminders: string;
		blockedBy: string;
	};
}

const DEFAULT_CONTEXT: GenerationContext = {
	assigneeField: "assignee",
	creatorField: "creator",
	typeProperty: "type",
	personTypeValue: "person",
	groupTypeValue: "group",
	personTag: "person",
	groupTag: "group",
	taskTag: "task",
	fieldMapping: {
		title: "title",
		status: "status",
		priority: "priority",
		due: "due",
		scheduled: "scheduled",
		contexts: "contexts",
		projects: "projects",
		timeEstimate: "timeEstimate",
		completedDate: "completedDate",
		dateCreated: "dateCreated",
		recurrence: "recurrence",
		reminders: "reminders",
		blockedBy: "blockedBy",
	},
};

function buildContextFromTaskNotes(app: App): GenerationContext {
	const tn = (app as any).plugins?.plugins?.tasknotes;
	if (!tn?.settings) return DEFAULT_CONTEXT;
	const s = tn.settings;
	const fm = s.fieldMapping || {};
	return {
		assigneeField: s.assigneeFieldName || DEFAULT_CONTEXT.assigneeField,
		creatorField: s.creatorFieldName || DEFAULT_CONTEXT.creatorField,
		typeProperty: s.identityTypePropertyName || DEFAULT_CONTEXT.typeProperty,
		personTypeValue: s.personTypeValue || DEFAULT_CONTEXT.personTypeValue,
		groupTypeValue: s.groupTypeValue || DEFAULT_CONTEXT.groupTypeValue,
		personTag: s.personNotesTag || DEFAULT_CONTEXT.personTag,
		groupTag: s.groupNotesTag || DEFAULT_CONTEXT.groupTag,
		taskTag: s.taskTag || DEFAULT_CONTEXT.taskTag,
		fieldMapping: {
			title: fm.title || "title",
			status: fm.status || "status",
			priority: fm.priority || "priority",
			due: fm.due || "due",
			scheduled: fm.scheduled || "scheduled",
			contexts: fm.contexts || "contexts",
			projects: fm.projects || "projects",
			timeEstimate: fm.timeEstimate || "timeEstimate",
			completedDate: fm.completedDate || "completedDate",
			dateCreated: fm.dateCreated || "dateCreated",
			recurrence: fm.recurrence || "recurrence",
			reminders: fm.reminders || "reminders",
			blockedBy: fm.blockedBy || "blockedBy",
		},
	};
}

// ============================================================
// DATA DEFINITIONS
// ============================================================

interface PersonDef {
	name: string;
	role: string;
	department: string;
	email: string;
	reminderTime: string;
	active: boolean;
}

interface GroupDef {
	name: string;
	description: string;
	members: string[];
}

interface DocumentDef {
	name: string;
	subfolder: string;
	metadata?: {
		type: string;
		status: string;
		owner: string;
		review_date_offset: number;
		last_reviewed_offset: number;
		review_cycle: string;
		version: string;
		tags: string[];
	};
	content: string;
}

interface TaskDef {
	name: string;
	status: string;
	priority: string;
	due_offset?: number | "today" | "tomorrow" | "yesterday" | "next_week";
	scheduled_offset?: number | "today";
	assignee?: string;
	creator?: string;
	projects?: string[];
	timeEstimate?: number;
	contexts?: string[];
	recurrence?: string;
	reminders?: { id: string; type: string; relatedTo?: string; offset?: number; unit?: string; direction?: string; description?: string }[];
	blockedBy?: string[];
	blocking?: string[];
	parent?: string;
	subtasks?: string[];
	completedDate_offset?: number | "yesterday";
}

const PERSONS: PersonDef[] = [
	{ name: "Cybersader", role: "Developer", department: "Engineering", email: "cybersader@example.com", reminderTime: "09:00", active: true },
	{ name: "Alice Chen", role: "Software Engineer", department: "Engineering", email: "alice.chen@example.com", reminderTime: "08:30", active: true },
	{ name: "Bob Wilson", role: "Security Analyst", department: "Security", email: "bob.wilson@example.com", reminderTime: "09:00", active: true },
	{ name: "Carol Davis", role: "Product Manager", department: "Product", email: "carol.davis@example.com", reminderTime: "08:00", active: true },
	{ name: "David Kim", role: "DevOps Engineer", department: "Engineering", email: "david.kim@example.com", reminderTime: "10:00", active: true },
	{ name: "Eva Martinez", role: "UX Designer", department: "Design", email: "eva.martinez@example.com", reminderTime: "09:30", active: true },
	{ name: "Frank Johnson", role: "QA Engineer", department: "Engineering", email: "frank.johnson@example.com", reminderTime: "09:00", active: false },
];

const GROUPS: GroupDef[] = [
	{ name: "Engineering Team", description: "All engineering staff", members: ["Alice Chen", "David Kim", "Frank Johnson", "Cybersader"] },
	{ name: "Security Team", description: "Security and compliance", members: ["Bob Wilson"] },
	{ name: "Product Team", description: "Product and design", members: ["Carol Davis", "Eva Martinez"] },
	{ name: "All Staff", description: "Everyone in the organization", members: ["Engineering Team", "Security Team", "Product Team"] },
	{ name: "Core Reviewers", description: "Code review team", members: ["Alice Chen", "Bob Wilson", "Cybersader"] },
];

const DOCUMENTS: DocumentDef[] = [
	// Projects
	{ name: "Project Alpha Requirements", subfolder: "Projects", metadata: { type: "document", status: "active", owner: "Carol Davis", review_date_offset: 5, last_reviewed_offset: -25, review_cycle: "monthly", version: "2.1", tags: ["document", "project"] }, content: "# Project Alpha Requirements\n\n## Overview\nA comprehensive system for task management.\n\n## Requirements\n- User authentication\n- Task CRUD operations\n- Notification system\n- Reporting dashboard\n\n## Timeline\n- Phase 1: Q1 2026\n- Phase 2: Q2 2026\n" },
	{ name: "Sprint 42 Planning", subfolder: "Projects", metadata: { type: "document", status: "active", owner: "Alice Chen", review_date_offset: 2, last_reviewed_offset: -7, review_cycle: "weekly", version: "1.3", tags: ["document", "project", "sprint"] }, content: "# Sprint 42 Planning\n\n## Goals\n- Complete notification system\n- Fix bulk task creation bugs\n- Improve avatar display\n\n## Tasks\n1. Implement person avatars\n2. Add assignee dropdown\n3. Fix file lookup issues\n" },
	{ name: "Project Beta Launch Plan", subfolder: "Projects", metadata: { type: "document", status: "active", owner: "Carol Davis", review_date_offset: -2, last_reviewed_offset: -32, review_cycle: "monthly", version: "1.0", tags: ["document", "project"] }, content: "# Project Beta Launch Plan\n\n## Pre-Launch Checklist\n- [ ] Complete feature freeze\n- [ ] Run load testing\n- [ ] Security review\n- [ ] Documentation update\n\n## Launch Day\n- [ ] Deploy to production\n- [ ] Monitor metrics\n- [ ] Support team standby\n" },
	{ name: "Q1 2026 Roadmap", subfolder: "Projects", metadata: { type: "document", status: "active", owner: "Carol Davis", review_date_offset: 15, last_reviewed_offset: -10, review_cycle: "quarterly", version: "3.0", tags: ["document", "project", "roadmap"] }, content: "# Q1 2026 Roadmap\n\n## January\n- Feature A development\n- Team expansion\n\n## February\n- Feature B development\n- Performance optimization\n\n## March\n- Integration testing\n- Beta release\n" },
	{ name: "Mobile App Initiative", subfolder: "Projects", metadata: { type: "document", status: "active", owner: "Eva Martinez", review_date_offset: 20, last_reviewed_offset: -5, review_cycle: "monthly", version: "0.9", tags: ["document", "project", "mobile"] }, content: "# Mobile App Initiative\n\n## Vision\nBring TaskNotes to mobile platforms.\n\n## Platforms\n- iOS (React Native)\n- Android (React Native)\n\n## Key Features\n- Offline sync\n- Push notifications\n- Quick capture\n" },

	// Compliance
	{ name: "Security Audit Checklist", subfolder: "Compliance", metadata: { type: "document", status: "active", owner: "Bob Wilson", review_date_offset: -5, last_reviewed_offset: -35, review_cycle: "monthly", version: "4.2", tags: ["document", "compliance", "security"] }, content: "# Security Audit Checklist\n\n## Network Security\n- [ ] Firewall configuration review\n- [ ] VPN access audit\n- [ ] Port scanning\n\n## Application Security\n- [ ] Code review\n- [ ] Dependency audit\n- [ ] Penetration testing\n\n## Data Security\n- [ ] Encryption at rest\n- [ ] Encryption in transit\n- [ ] Backup verification\n" },
	{ name: "GDPR Compliance Review", subfolder: "Compliance", metadata: { type: "document", status: "active", owner: "Bob Wilson", review_date_offset: 8, last_reviewed_offset: -20, review_cycle: "quarterly", version: "2.0", tags: ["document", "compliance", "privacy"] }, content: "# GDPR Compliance Review\n\n## Data Inventory\n- [ ] Personal data mapping\n- [ ] Data flow documentation\n- [ ] Third-party processors list\n\n## Rights Management\n- [ ] Access request process\n- [ ] Deletion request process\n- [ ] Portability implementation\n\n## Documentation\n- [ ] Privacy policy update\n- [ ] Cookie policy\n- [ ] DPA templates\n" },
	{ name: "SOC 2 Type II Preparation", subfolder: "Compliance", metadata: { type: "document", status: "active", owner: "Bob Wilson", review_date_offset: 1, last_reviewed_offset: -29, review_cycle: "monthly", version: "1.5", tags: ["document", "compliance"] }, content: "# SOC 2 Type II Preparation\n\n## Trust Services Criteria\n- Security\n- Availability\n- Processing Integrity\n- Confidentiality\n- Privacy\n\n## Evidence Collection\n- [ ] Access control logs\n- [ ] Change management records\n- [ ] Incident response documentation\n" },
	{ name: "ISO 27001 Gap Analysis", subfolder: "Compliance", metadata: { type: "document", status: "draft", owner: "Bob Wilson", review_date_offset: 30, last_reviewed_offset: -60, review_cycle: "quarterly", version: "0.5", tags: ["document", "compliance"] }, content: "# ISO 27001 Gap Analysis\n\n## Current State Assessment\n- Information Security Policy: Partial\n- Risk Assessment: In Progress\n- Access Control: Implemented\n\n## Remediation Plan\n1. Complete risk assessment\n2. Develop incident response plan\n3. Implement asset management\n" },
	{ name: "Vendor Security Assessment Template", subfolder: "Compliance", metadata: { type: "document", status: "active", owner: "Bob Wilson", review_date_offset: 45, last_reviewed_offset: -15, review_cycle: "quarterly", version: "3.1", tags: ["document", "compliance", "vendor"] }, content: "# Vendor Security Assessment\n\n## Vendor Information\n- Company: [Vendor Name]\n- Service: [Description]\n- Data Handled: [Types]\n\n## Security Questionnaire\n- [ ] SOC 2 report available?\n- [ ] Encryption at rest?\n- [ ] MFA required?\n- [ ] Incident response plan?\n" },

	// Technical
	{ name: "API Documentation", subfolder: "Technical", metadata: { type: "document", status: "active", owner: "Alice Chen", review_date_offset: 3, last_reviewed_offset: -14, review_cycle: "monthly", version: "5.0", tags: ["document", "technical", "api"] }, content: "# API Documentation\n\n## Endpoints\n\n### GET /api/tasks\nReturns list of tasks.\n\n### POST /api/tasks\nCreates a new task.\n\n### PUT /api/tasks/:id\nUpdates an existing task.\n\n### DELETE /api/tasks/:id\nDeletes a task.\n" },
	{ name: "Database Schema", subfolder: "Technical", metadata: { type: "document", status: "active", owner: "David Kim", review_date_offset: 10, last_reviewed_offset: -20, review_cycle: "monthly", version: "3.2", tags: ["document", "technical", "database"] }, content: "# Database Schema\n\n## Tables\n\n### users\n- id (uuid, primary key)\n- email (varchar, unique)\n- created_at (timestamp)\n\n### tasks\n- id (uuid, primary key)\n- title (varchar)\n- status (enum)\n- user_id (uuid, foreign key)\n- due_date (date)\n" },
	{ name: "Architecture Overview", subfolder: "Technical", metadata: { type: "document", status: "active", owner: "Cybersader", review_date_offset: 25, last_reviewed_offset: -5, review_cycle: "quarterly", version: "2.0", tags: ["document", "technical", "architecture"] }, content: "# Architecture Overview\n\n## Components\n- Frontend: React + TypeScript\n- Backend: Node.js + Express\n- Database: PostgreSQL\n- Cache: Redis\n- Queue: RabbitMQ\n\n## Infrastructure\n- AWS ECS for containers\n- RDS for database\n- S3 for file storage\n- CloudFront for CDN\n" },
	{ name: "Deployment Guide", subfolder: "Technical", metadata: { type: "document", status: "active", owner: "David Kim", review_date_offset: -1, last_reviewed_offset: -31, review_cycle: "monthly", version: "2.4", tags: ["document", "technical", "devops"] }, content: "# Deployment Guide\n\n## Prerequisites\n- Docker installed\n- AWS CLI configured\n- Terraform >= 1.0\n\n## Steps\n1. Build Docker image\n2. Push to ECR\n3. Apply Terraform\n4. Run migrations\n5. Verify health checks\n" },
	{ name: "Performance Tuning Guide", subfolder: "Technical", metadata: { type: "document", status: "active", owner: "Alice Chen", review_date_offset: 18, last_reviewed_offset: -12, review_cycle: "quarterly", version: "1.1", tags: ["document", "technical"] }, content: "# Performance Tuning Guide\n\n## Database Optimization\n- Index frequently queried columns\n- Use connection pooling\n- Implement query caching\n\n## Application Optimization\n- Enable response compression\n- Implement pagination\n- Use lazy loading\n" },
	{ name: "Error Handling Standards", subfolder: "Technical", metadata: { type: "document", status: "active", owner: "Cybersader", review_date_offset: 40, last_reviewed_offset: -3, review_cycle: "quarterly", version: "1.0", tags: ["document", "technical"] }, content: '# Error Handling Standards\n\n## HTTP Status Codes\n- 200: Success\n- 400: Bad Request\n- 401: Unauthorized\n- 403: Forbidden\n- 404: Not Found\n- 500: Internal Server Error\n\n## Error Response Format\n```json\n{\n  "error": {\n    "code": "VALIDATION_ERROR",\n    "message": "Invalid input",\n    "details": []\n  }\n}\n```\n' },

	// HR
	{ name: "Onboarding Guide", subfolder: "HR", metadata: { type: "document", status: "active", owner: "Carol Davis", review_date_offset: 12, last_reviewed_offset: -18, review_cycle: "quarterly", version: "3.0", tags: ["document", "hr"] }, content: "# New Employee Onboarding\n\n## Day 1\n- [ ] Set up workstation\n- [ ] Configure email\n- [ ] Meet the team\n\n## Week 1\n- [ ] Complete security training\n- [ ] Read codebase documentation\n- [ ] Shadow a team member\n\n## Month 1\n- [ ] Complete first project\n- [ ] Present to team\n" },
	{ name: "Remote Work Policy", subfolder: "HR", metadata: { type: "document", status: "active", owner: "Carol Davis", review_date_offset: 60, last_reviewed_offset: -30, review_cycle: "quarterly", version: "2.1", tags: ["document", "hr", "policy"] }, content: "# Remote Work Policy\n\n## Eligibility\nAll full-time employees after 90-day probation.\n\n## Requirements\n- Reliable internet (25+ Mbps)\n- Dedicated workspace\n- Available during core hours (10am-3pm)\n\n## Equipment\nCompany provides:\n- Laptop\n- Monitor\n- Keyboard/mouse\n" },
	{ name: "Performance Review Template", subfolder: "HR", metadata: { type: "document", status: "active", owner: "Carol Davis", review_date_offset: 90, last_reviewed_offset: -60, review_cycle: "quarterly", version: "1.2", tags: ["document", "hr"] }, content: "# Performance Review\n\n## Employee Information\n- Name:\n- Title:\n- Manager:\n- Review Period:\n\n## Self Assessment\n1. Key accomplishments\n2. Areas for improvement\n3. Goals for next period\n\n## Manager Assessment\n1. Performance rating\n2. Feedback\n3. Development plan\n" },
	{ name: "Interview Question Bank", subfolder: "HR", metadata: { type: "document", status: "archived", owner: "Carol Davis", review_date_offset: 180, last_reviewed_offset: -90, review_cycle: "yearly", version: "2.0", tags: ["document", "hr"] }, content: "# Interview Question Bank\n\n## Technical Questions\n1. Describe a complex problem you solved\n2. How do you approach debugging?\n3. Explain your testing philosophy\n\n## Behavioral Questions\n1. Tell me about a time you disagreed with a teammate\n2. How do you prioritize competing deadlines?\n3. Describe a project you're proud of\n" },
	{ name: "Benefits Overview", subfolder: "HR", metadata: { type: "document", status: "active", owner: "Carol Davis", review_date_offset: 30, last_reviewed_offset: -60, review_cycle: "yearly", version: "2026.1", tags: ["document", "hr", "benefits"] }, content: "# Benefits Overview\n\n## Health Insurance\n- Medical (100% premium covered)\n- Dental (100% premium covered)\n- Vision (100% premium covered)\n\n## Time Off\n- Unlimited PTO\n- 10 company holidays\n- Sick leave as needed\n\n## Other Benefits\n- 401k with 4% match\n- $1000 learning budget\n- Home office stipend\n" },

	// Meeting Notes (no metadata)
	{ name: "Weekly Standup 2026-01-27", subfolder: "Meeting Notes", content: "# Weekly Standup - January 27, 2026\n\n## Attendees\nAlice, Bob, Carol, David\n\n## Updates\n- Alice: Working on notification system\n- Bob: Completed security audit\n- Carol: Sprint planning done\n- David: DevOps pipeline updates\n\n## Blockers\n- Waiting on design review\n" },
	{ name: "Weekly Standup 2026-02-03", subfolder: "Meeting Notes", content: "# Weekly Standup - February 3, 2026\n\n## Attendees\nAlice, Bob, Carol, Eva\n\n## Updates\n- Alice: Avatar component complete\n- Bob: Vendor assessment ongoing\n- Carol: Roadmap finalized\n- Eva: UI mockups ready\n\n## Action Items\n- [ ] Schedule design review\n- [ ] Update documentation\n" },
	{ name: "Architecture Review 2026-01-15", subfolder: "Meeting Notes", content: "# Architecture Review - January 15, 2026\n\n## Topics Discussed\n1. Microservices migration\n2. Database sharding strategy\n3. Caching layer improvements\n\n## Decisions\n- Proceed with gradual migration\n- Use consistent hashing for shards\n- Implement Redis cluster\n" },
	{ name: "Quarterly Planning Q1 2026", subfolder: "Meeting Notes", content: "# Quarterly Planning - Q1 2026\n\n## OKRs\n1. Increase user retention by 15%\n2. Reduce P95 latency to <200ms\n3. Launch mobile app beta\n\n## Resource Allocation\n- Engineering: 60% features, 40% tech debt\n- Design: New features + design system\n- QA: Automation focus\n" },
	{ name: "Incident Postmortem 2026-01-20", subfolder: "Meeting Notes", content: "# Incident Postmortem - January 20, 2026\n\n## Incident Summary\nProduction outage lasting 45 minutes.\n\n## Root Cause\nDatabase connection pool exhaustion.\n\n## Timeline\n- 14:00 - Alerts triggered\n- 14:15 - On-call paged\n- 14:30 - Root cause identified\n- 14:45 - Mitigation applied\n\n## Action Items\n- [ ] Increase connection pool size\n- [ ] Add connection pool monitoring\n- [ ] Document runbook\n" },

	// Research
	{ name: "AI Integration Research", subfolder: "Research", metadata: { type: "document", status: "active", owner: "Cybersader", review_date_offset: 14, last_reviewed_offset: -10, review_cycle: "monthly", version: "1.0", tags: ["document", "research", "ai"] }, content: "# AI Integration Research\n\n## Use Cases\n1. Smart task prioritization\n2. Natural language task creation\n3. Automated task categorization\n\n## Technologies Evaluated\n- OpenAI GPT-4\n- Anthropic Claude\n- Local LLMs (Llama)\n\n## Recommendation\nStart with Claude API for task parsing.\n" },
	{ name: "Competitor Analysis", subfolder: "Research", metadata: { type: "document", status: "active", owner: "Eva Martinez", review_date_offset: 22, last_reviewed_offset: -8, review_cycle: "quarterly", version: "2.0", tags: ["document", "research"] }, content: "# Competitor Analysis\n\n## Todoist\n- Strengths: Clean UI, cross-platform\n- Weaknesses: Limited customization\n\n## Notion\n- Strengths: Flexible, collaborative\n- Weaknesses: Steep learning curve\n\n## Things 3\n- Strengths: Beautiful design\n- Weaknesses: Apple-only\n\n## Our Differentiator\nLocal-first, Obsidian integration.\n" },
	{ name: "User Feedback Summary Q4 2025", subfolder: "Research", metadata: { type: "document", status: "active", owner: "Eva Martinez", review_date_offset: -3, last_reviewed_offset: -33, review_cycle: "monthly", version: "1.0", tags: ["document", "research", "feedback"] }, content: "# User Feedback Summary - Q4 2025\n\n## Top Requests\n1. Mobile app (47 mentions)\n2. Better notifications (31 mentions)\n3. Team collaboration (28 mentions)\n4. Calendar sync (22 mentions)\n\n## Pain Points\n- Sync conflicts in shared vaults\n- Complex initial setup\n- Documentation gaps\n" },
	{ name: "Technology Radar 2026", subfolder: "Research", metadata: { type: "document", status: "active", owner: "Cybersader", review_date_offset: 50, last_reviewed_offset: -15, review_cycle: "quarterly", version: "2026.1", tags: ["document", "research", "tech"] }, content: "# Technology Radar 2026\n\n## Adopt\n- TypeScript 5\n- Bun runtime\n- Playwright\n\n## Trial\n- Solid.js\n- Drizzle ORM\n- tRPC\n\n## Assess\n- WebAssembly\n- Effect-TS\n- Tauri\n\n## Hold\n- Webpack (use esbuild)\n- Jest (use Vitest)\n" },

	// Templates (no metadata)
	{ name: "RFC Template", subfolder: "Templates", content: "# RFC: [Title]\n\n## Summary\nBrief description of the proposal.\n\n## Motivation\nWhy are we doing this?\n\n## Detailed Design\nTechnical details of the solution.\n\n## Alternatives Considered\nOther approaches we evaluated.\n\n## Rollout Plan\nHow we'll deploy this.\n\n## Open Questions\nUnresolved issues.\n" },
	{ name: "Bug Report Template", subfolder: "Templates", content: '# Bug Report\n\n## Description\nWhat happened?\n\n## Steps to Reproduce\n1. Go to...\n2. Click on...\n3. See error\n\n## Expected Behavior\nWhat should have happened?\n\n## Actual Behavior\nWhat actually happened?\n\n## Environment\n- OS:\n- Browser:\n- Version:\n\n## Screenshots\n(if applicable)\n' },
	{ name: "Feature Request Template", subfolder: "Templates", content: "# Feature Request\n\n## Summary\nWhat feature would you like?\n\n## Use Case\nWhat problem does this solve?\n\n## Proposed Solution\nHow would this work?\n\n## Alternatives\nOther ways to solve this.\n\n## Priority\nHow important is this?\n" },
	{ name: "Decision Record Template", subfolder: "Templates", content: "# ADR-XXX: [Title]\n\n## Status\nProposed | Accepted | Deprecated | Superseded\n\n## Context\nWhat is the issue that we're seeing?\n\n## Decision\nWhat is the change that we're proposing?\n\n## Consequences\nWhat becomes easier or harder?\n" },

	// Design
	{ name: "Design System Overview", subfolder: "Design", metadata: { type: "document", status: "active", owner: "Eva Martinez", review_date_offset: 35, last_reviewed_offset: -10, review_cycle: "quarterly", version: "3.0", tags: ["document", "design"] }, content: "# Design System Overview\n\n## Colors\n- Primary: #6366f1\n- Secondary: #8b5cf6\n- Success: #22c55e\n- Warning: #f59e0b\n- Error: #ef4444\n\n## Typography\n- Headings: Inter\n- Body: Inter\n- Code: JetBrains Mono\n\n## Spacing\n- xs: 4px\n- sm: 8px\n- md: 16px\n- lg: 24px\n- xl: 32px\n" },
	{ name: "Component Library", subfolder: "Design", metadata: { type: "document", status: "active", owner: "Eva Martinez", review_date_offset: 7, last_reviewed_offset: -21, review_cycle: "monthly", version: "2.5", tags: ["document", "design", "components"] }, content: "# Component Library\n\n## Buttons\n- Primary: Solid, accent color\n- Secondary: Outline, neutral\n- Ghost: Transparent, hover effect\n- Destructive: Red, for dangerous actions\n\n## Forms\n- Text Input\n- Textarea\n- Select\n- Checkbox\n- Radio\n- Toggle\n\n## Feedback\n- Toast notifications\n- Modal dialogs\n- Tooltips\n- Progress bars\n" },
	{ name: "Accessibility Guidelines", subfolder: "Design", metadata: { type: "document", status: "active", owner: "Eva Martinez", review_date_offset: 60, last_reviewed_offset: -30, review_cycle: "quarterly", version: "1.0", tags: ["document", "design", "a11y"] }, content: "# Accessibility Guidelines\n\n## WCAG 2.1 AA Compliance\n\n### Perceivable\n- Color contrast ratio: 4.5:1 minimum\n- Text alternatives for images\n- Captions for videos\n\n### Operable\n- Keyboard navigation\n- Focus indicators\n- No motion that causes seizures\n\n### Understandable\n- Clear language\n- Predictable navigation\n- Input assistance\n\n### Robust\n- Valid HTML\n- ARIA labels\n- Screen reader testing\n" },

	// Operations
	{ name: "Runbook - Database Failover", subfolder: "Operations", metadata: { type: "document", status: "active", owner: "David Kim", review_date_offset: 0, last_reviewed_offset: -30, review_cycle: "monthly", version: "2.0", tags: ["document", "operations", "runbook"] }, content: "# Runbook: Database Failover\n\n## When to Use\n- Primary database unresponsive\n- Planned maintenance\n\n## Prerequisites\n- VPN access\n- Database admin credentials\n- PagerDuty access\n\n## Steps\n1. Verify primary is down\n2. Check replication lag\n3. Promote replica\n4. Update connection strings\n5. Verify application health\n\n## Rollback\n1. Point back to original primary\n2. Resync data\n" },
	{ name: "Runbook - Scaling", subfolder: "Operations", metadata: { type: "document", status: "active", owner: "David Kim", review_date_offset: 14, last_reviewed_offset: -16, review_cycle: "monthly", version: "1.3", tags: ["document", "operations", "runbook"] }, content: "# Runbook: Application Scaling\n\n## When to Use\n- High traffic events\n- CPU > 80% sustained\n- Memory > 85%\n\n## Auto-Scaling Rules\n- Min instances: 2\n- Max instances: 10\n- Scale up: CPU > 70% for 3 minutes\n- Scale down: CPU < 30% for 10 minutes\n\n## Manual Scaling\n```bash\naws ecs update-service --desired-count N\n```\n\n## Monitoring\n- CloudWatch dashboard\n- PagerDuty alerts\n" },
	{ name: "On-Call Handbook", subfolder: "Operations", metadata: { type: "document", status: "active", owner: "David Kim", review_date_offset: 45, last_reviewed_offset: -15, review_cycle: "quarterly", version: "1.5", tags: ["document", "operations"] }, content: "# On-Call Handbook\n\n## Responsibilities\n- Acknowledge alerts within 5 minutes\n- Assess severity\n- Engage others if needed\n- Document in incident channel\n\n## Escalation Path\n1. Primary on-call\n2. Secondary on-call\n3. Engineering manager\n4. CTO\n\n## Useful Links\n- [Runbooks](./Runbooks)\n- [Monitoring Dashboard](#)\n- [Status Page](#)\n" },

	// Security
	{ name: "Security Incident Response Plan", subfolder: "Security", metadata: { type: "document", status: "active", owner: "Bob Wilson", review_date_offset: 10, last_reviewed_offset: -20, review_cycle: "monthly", version: "3.1", tags: ["document", "security"] }, content: "# Security Incident Response Plan\n\n## Severity Levels\n- P1: Data breach, production down\n- P2: Security vulnerability exploited\n- P3: Suspicious activity detected\n- P4: Potential vulnerability found\n\n## Response Steps\n1. Contain the incident\n2. Preserve evidence\n3. Notify stakeholders\n4. Remediate\n5. Post-incident review\n\n## Contacts\n- Security Team: security@example.com\n- Legal: legal@example.com\n" },
	{ name: "Secret Management Guide", subfolder: "Security", metadata: { type: "document", status: "active", owner: "Bob Wilson", review_date_offset: 25, last_reviewed_offset: -5, review_cycle: "quarterly", version: "2.0", tags: ["document", "security"] }, content: "# Secret Management Guide\n\n## Approved Solutions\n- AWS Secrets Manager (production)\n- Doppler (development)\n- 1Password (personal)\n\n## Never Do\n- Commit secrets to git\n- Share via Slack/email\n- Store in plain text files\n\n## Rotation Policy\n- API keys: 90 days\n- Database passwords: 180 days\n- SSH keys: Annually\n" },
	{ name: "Penetration Test Report 2025", subfolder: "Security", metadata: { type: "document", status: "archived", owner: "Bob Wilson", review_date_offset: 180, last_reviewed_offset: -60, review_cycle: "yearly", version: "1.0", tags: ["document", "security", "pentest"] }, content: "# Penetration Test Report - December 2025\n\n## Executive Summary\nAnnual penetration test completed by SecureCorp.\n\n## Findings Summary\n- Critical: 0\n- High: 1\n- Medium: 3\n- Low: 5\n\n## High Findings\n### H1: Session Fixation\n- Status: Remediated\n- Fix: Regenerate session on login\n\n## Remediation Status\nAll high and medium findings addressed.\n" },
];

const TASKS: TaskDef[] = [
	// Overdue
	{ name: "Review security findings", status: "pending", priority: "high", due_offset: -3, assignee: "Bob Wilson", creator: "Carol Davis", projects: ["Security Audit Checklist"], timeEstimate: 60, contexts: ["security", "audit"], reminders: [{ id: "rem_sec_1", type: "relative", relatedTo: "due", offset: 1, unit: "days", direction: "before", description: "1 day before due" }] },
	{ name: "Submit compliance report", status: "pending", priority: "high", due_offset: -1, assignee: "Bob Wilson", creator: "Carol Davis", projects: ["SOC 2 Type II Preparation"], timeEstimate: 120, contexts: ["compliance"], blockedBy: ["Review security findings"] },
	{ name: "Finalize vendor assessment", status: "pending", priority: "medium", due_offset: -2, assignee: "Bob Wilson", creator: "Bob Wilson", projects: ["Vendor Security Assessment Template"], contexts: ["compliance", "vendor"], timeEstimate: 90 },

	// Due today
	{ name: "Update API documentation", status: "in-progress", priority: "medium", scheduled_offset: "today", due_offset: 2, assignee: "Alice Chen", creator: "Alice Chen", projects: ["API Documentation"], timeEstimate: 90, contexts: ["documentation", "api"], blocking: ["Write integration tests for API"] },
	{ name: "Deploy hotfix to production", status: "pending", priority: "high", due_offset: "today", scheduled_offset: "today", assignee: "David Kim", creator: "Cybersader", contexts: ["urgent", "production"], reminders: [{ id: "rem_deploy_1", type: "relative", relatedTo: "due", offset: 1, unit: "hours", direction: "before", description: "1 hour before due" }, { id: "rem_deploy_2", type: "relative", relatedTo: "due", offset: 30, unit: "minutes", direction: "before", description: "30 min before due" }], blockedBy: ["Run staging environment tests"] },
	{ name: "Review pull requests", status: "pending", priority: "medium", due_offset: "today", assignee: "Core Reviewers", projects: ["Sprint 42 Planning"], contexts: ["code-review"], timeEstimate: 60 },

	// Due tomorrow
	{ name: "Complete sprint planning", status: "pending", priority: "high", due_offset: "tomorrow", scheduled_offset: "today", assignee: "Carol Davis", creator: "Carol Davis", projects: ["Sprint 42 Planning"], contexts: ["meeting", "planning"], timeEstimate: 120, reminders: [{ id: "rem_sprint_1", type: "relative", relatedTo: "due", offset: 2, unit: "hours", direction: "before", description: "2 hours before meeting" }], subtasks: ["Prepare demo for stakeholders", "Write sprint retrospective notes"] },
	{ name: "Finalize design mockups", status: "in-progress", priority: "medium", due_offset: "tomorrow", scheduled_offset: "today", assignee: "Eva Martinez", creator: "Carol Davis", projects: ["Mobile App Initiative"], contexts: ["design", "mobile"], timeEstimate: 180, blocking: ["Implement mobile navigation component"] },
	{ name: "Design review meeting", status: "pending", priority: "medium", due_offset: "tomorrow", assignee: "Product Team", contexts: ["meeting", "design"], reminders: [{ id: "rem_design_1", type: "relative", relatedTo: "due", offset: 1, unit: "hours", direction: "before", description: "1 hour before meeting" }] },

	// Due this week
	{ name: "Fix notification bugs", status: "in-progress", priority: "medium", due_offset: 3, scheduled_offset: "today", assignee: "Cybersader", creator: "Cybersader", contexts: ["bug", "notifications"], timeEstimate: 45, blocking: ["Write unit tests for notification service"] },
	{ name: "Write unit tests for avatar component", status: "pending", priority: "low", due_offset: 4, assignee: "Alice Chen", creator: "Alice Chen", contexts: ["testing"], timeEstimate: 120, blockedBy: ["Design avatar component"] },
	{ name: "Prepare demo for stakeholders", status: "pending", priority: "high", due_offset: 5, assignee: "Carol Davis", projects: ["Project Alpha Requirements"], contexts: ["presentation"], parent: "Complete sprint planning", reminders: [{ id: "rem_demo_1", type: "relative", relatedTo: "due", offset: 1, unit: "days", direction: "before", description: "1 day before demo" }, { id: "rem_demo_2", type: "relative", relatedTo: "due", offset: 3, unit: "hours", direction: "before", description: "3 hours before demo" }], timeEstimate: 60 },
	{ name: "Run staging environment tests", status: "in-progress", priority: "high", due_offset: 2, assignee: "Frank Johnson", creator: "David Kim", contexts: ["testing", "staging"], timeEstimate: 90, blocking: ["Deploy hotfix to production"] },
	{ name: "Write integration tests for API", status: "pending", priority: "medium", due_offset: 4, assignee: "Alice Chen", creator: "Alice Chen", projects: ["API Documentation"], contexts: ["testing", "api"], timeEstimate: 150, blockedBy: ["Update API documentation"] },
	{ name: "Write sprint retrospective notes", status: "pending", priority: "low", due_offset: 5, assignee: "Carol Davis", parent: "Complete sprint planning", contexts: ["documentation", "sprint"] },

	// Due next week
	{ name: "Weekly standup", status: "pending", priority: "medium", due_offset: 7, scheduled_offset: 7, assignee: "Engineering Team", contexts: ["meeting"], recurrence: "FREQ=WEEKLY;BYDAY=MO", reminders: [{ id: "rem_standup_1", type: "relative", relatedTo: "due", offset: 15, unit: "minutes", direction: "before", description: "15 min before standup" }] },
	{ name: "Complete database migration", status: "pending", priority: "medium", due_offset: "next_week", assignee: "David Kim", creator: "Cybersader", projects: ["Architecture Overview"], timeEstimate: 240, blocking: ["Update runbooks", "Verify database backup integrity"], contexts: ["database", "migration"] },
	{ name: "Update runbooks", status: "pending", priority: "low", due_offset: 10, assignee: "David Kim", projects: ["Runbook - Database Failover"], contexts: ["documentation"], blockedBy: ["Complete database migration"] },
	{ name: "Conduct user interviews", status: "pending", priority: "medium", due_offset: 12, scheduled_offset: 10, assignee: "Eva Martinez", creator: "Carol Davis", projects: ["User Feedback Summary Q4 2025"], contexts: ["research", "ux"], timeEstimate: 120, reminders: [{ id: "rem_interview_1", type: "relative", relatedTo: "due", offset: 2, unit: "days", direction: "before", description: "2 days before interviews" }] },
	{ name: "Write unit tests for notification service", status: "pending", priority: "medium", due_offset: 8, assignee: "Cybersader", contexts: ["testing", "notifications"], timeEstimate: 120, blockedBy: ["Fix notification bugs"] },
	{ name: "Implement mobile navigation component", status: "pending", priority: "medium", due_offset: 9, assignee: "Alice Chen", creator: "Eva Martinez", projects: ["Mobile App Initiative"], contexts: ["mobile", "feature"], timeEstimate: 240, blockedBy: ["Finalize design mockups"], blocking: ["Mobile app smoke tests"] },
	{ name: "Verify database backup integrity", status: "pending", priority: "high", due_offset: 8, assignee: "David Kim", contexts: ["database", "operations"], timeEstimate: 45, blockedBy: ["Complete database migration"] },
	{ name: "Team retrospective", status: "pending", priority: "medium", due_offset: 7, assignee: "All Staff", contexts: ["meeting"], recurrence: "FREQ=WEEKLY;BYDAY=FR" },

	// Due later
	{ name: "Monthly security review", status: "pending", priority: "high", due_offset: 28, assignee: "Bob Wilson", creator: "Bob Wilson", projects: ["Security Incident Response Plan"], recurrence: "FREQ=MONTHLY;BYMONTHDAY=1", contexts: ["security", "compliance"], timeEstimate: 180, reminders: [{ id: "rem_secrev_1", type: "relative", relatedTo: "due", offset: 3, unit: "days", direction: "before", description: "3 days before review" }] },
	{ name: "Plan Q2 roadmap", status: "pending", priority: "low", due_offset: 30, assignee: "Carol Davis", projects: ["Q1 2026 Roadmap"], contexts: ["planning", "roadmap"] },
	{ name: "Implement AI task parsing", status: "pending", priority: "low", due_offset: 45, assignee: "Cybersader", projects: ["AI Integration Research"], contexts: ["ai", "feature"], timeEstimate: 480 },
	{ name: "Security awareness session", status: "pending", priority: "high", due_offset: 14, assignee: "Security Team", creator: "Bob Wilson", projects: ["Security Incident Response Plan"], recurrence: "FREQ=MONTHLY;BYMONTHDAY=15", reminders: [{ id: "rem_security_1", type: "relative", relatedTo: "due", offset: 3, unit: "days", direction: "before", description: "3 days before session" }, { id: "rem_security_2", type: "relative", relatedTo: "due", offset: 1, unit: "hours", direction: "before", description: "1 hour before session" }], contexts: ["security", "training"] },
	{ name: "Quarterly compliance audit", status: "pending", priority: "high", due_offset: 60, assignee: "Bob Wilson", creator: "Carol Davis", projects: ["GDPR Compliance Review"], recurrence: "FREQ=YEARLY;BYMONTH=3,6,9,12;BYMONTHDAY=1", contexts: ["compliance", "audit"], timeEstimate: 360, reminders: [{ id: "rem_audit_1", type: "relative", relatedTo: "due", offset: 7, unit: "days", direction: "before", description: "1 week before audit" }] },
	{ name: "Daily standup notes", status: "pending", priority: "low", due_offset: 1, scheduled_offset: 1, assignee: "Cybersader", recurrence: "FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR", contexts: ["meeting", "daily"] },
	{ name: "Biweekly 1-on-1 with manager", status: "pending", priority: "medium", due_offset: 14, assignee: "Alice Chen", recurrence: "FREQ=WEEKLY;INTERVAL=2;BYDAY=TH", contexts: ["meeting", "one-on-one"], reminders: [{ id: "rem_1on1_1", type: "relative", relatedTo: "due", offset: 1, unit: "hours", direction: "before", description: "1 hour before meeting" }] },
	{ name: "Mobile app smoke tests", status: "pending", priority: "medium", due_offset: 15, assignee: "Frank Johnson", creator: "Alice Chen", projects: ["Mobile App Initiative"], contexts: ["testing", "mobile"], timeEstimate: 120, blockedBy: ["Implement mobile navigation component"] },

	// Completed
	{ name: "Design avatar component", status: "done", priority: "low", completedDate_offset: "yesterday", assignee: "Eva Martinez", creator: "Carol Davis", contexts: ["design"], projects: ["Component Library"], timeEstimate: 120 },
	{ name: "Set up CI pipeline", status: "done", priority: "high", completedDate_offset: -5, assignee: "David Kim", creator: "Cybersader", projects: ["Deployment Guide"], contexts: ["devops"], timeEstimate: 300 },
	{ name: "Complete security training", status: "done", priority: "medium", completedDate_offset: -7, assignee: "Engineering Team", projects: ["Onboarding Guide"], contexts: ["training"] },
	{ name: "Implement user authentication", status: "done", priority: "high", completedDate_offset: -3, assignee: "Cybersader", creator: "Carol Davis", projects: ["Project Alpha Requirements"], contexts: ["feature", "auth"], timeEstimate: 480 },
	{ name: "Create onboarding documentation", status: "done", priority: "medium", completedDate_offset: -10, assignee: "Carol Davis", creator: "Carol Davis", projects: ["Onboarding Guide"], contexts: ["documentation", "hr"], timeEstimate: 180 },
	{ name: "Fix login page CSS", status: "done", priority: "low", completedDate_offset: -2, assignee: "Eva Martinez", contexts: ["bug", "css"] },
	{ name: "Set up monitoring dashboard", status: "done", priority: "medium", completedDate_offset: -14, assignee: "David Kim", creator: "David Kim", projects: ["Runbook - Scaling"], contexts: ["operations", "monitoring"], timeEstimate: 240 },
	{ name: "Write GDPR data mapping document", status: "done", priority: "high", completedDate_offset: -4, assignee: "Bob Wilson", creator: "Carol Davis", projects: ["GDPR Compliance Review"], contexts: ["compliance", "privacy"], timeEstimate: 300 },
	{ name: "Migrate legacy API endpoints", status: "done", priority: "medium", completedDate_offset: -21, assignee: "Alice Chen", creator: "Cybersader", projects: ["API Documentation"], contexts: ["api", "migration"], timeEstimate: 360 },
	{ name: "Conduct penetration test follow-up", status: "done", priority: "high", completedDate_offset: -30, assignee: "Bob Wilson", projects: ["Penetration Test Report 2025"], contexts: ["security", "pentest"], timeEstimate: 240 },

	// Backlog (no due date)
	{ name: "Research GraphQL adoption", status: "pending", priority: "low", assignee: "Alice Chen", projects: ["Technology Radar 2026"], contexts: ["research", "graphql"] },
	{ name: "Document coding standards", status: "pending", priority: "low", assignee: "Engineering Team", contexts: ["documentation", "standards"] },
	{ name: "Evaluate new monitoring tools", status: "pending", priority: "medium", assignee: "David Kim", creator: "David Kim", contexts: ["operations", "research"], timeEstimate: 180 },
	{ name: "Prototype dark mode theme", status: "pending", priority: "low", assignee: "Eva Martinez", creator: "Eva Martinez", projects: ["Design System Overview"], contexts: ["design", "feature"], timeEstimate: 240 },
	{ name: "Refactor task service layer", status: "in-progress", priority: "medium", assignee: "Cybersader", creator: "Cybersader", contexts: ["refactor", "architecture"], timeEstimate: 300 },

	// Parent tasks with subtasks
	{ name: "Launch Project Beta", status: "in-progress", priority: "high", due_offset: 20, assignee: "Carol Davis", creator: "Carol Davis", projects: ["Project Beta Launch Plan"], contexts: ["project", "launch"], subtasks: ["Complete feature freeze", "Run load testing", "Security review for launch"], timeEstimate: 60 },
	{ name: "Complete feature freeze", status: "in-progress", priority: "high", due_offset: 12, assignee: "Alice Chen", creator: "Carol Davis", projects: ["Project Beta Launch Plan"], parent: "Launch Project Beta", blocking: ["Run load testing"], contexts: ["development"], timeEstimate: 120 },
	{ name: "Run load testing", status: "pending", priority: "high", due_offset: 16, assignee: "Frank Johnson", creator: "Carol Davis", projects: ["Project Beta Launch Plan"], parent: "Launch Project Beta", blockedBy: ["Complete feature freeze"], blocking: ["Security review for launch"], contexts: ["testing", "performance"], timeEstimate: 180 },
	{ name: "Security review for launch", status: "pending", priority: "high", due_offset: 18, assignee: "Bob Wilson", creator: "Carol Davis", projects: ["Project Beta Launch Plan"], parent: "Launch Project Beta", blockedBy: ["Run load testing"], contexts: ["security", "review"], timeEstimate: 120, reminders: [{ id: "rem_seclaunch_1", type: "relative", relatedTo: "due", offset: 2, unit: "days", direction: "before", description: "2 days before review" }] },
];

// ============================================================
// DEMO BASE FILES
// ============================================================

const DEMO_BASES: Record<string, string> = {
	"Bulk Convert Demo": `filters:
  and:
    - file.inFolder("Document Library, Knowledge")
formulas:
  ownerName: if(owner, owner.replace("[[", "").replace("]]", ""), "Unassigned")
  hasStatus: status && !status.isEmpty()
  hasPriority: priority && !priority.isEmpty()
properties:
  file.name:
    displayName: Note
  type:
    displayName: Type
  formula.ownerName:
    displayName: Owner
  status:
    displayName: Current Status
  isTask:
    displayName: Is Task
views:
  - type: tasknotesTaskList
    name: Notes to Convert
    order:
      - file.name
      - type
      - formula.ownerName
      - status
    sort:
      - property: file.name
        direction: ASC
    enableSearch: true
  - type: table
    name: By Type
    order:
      - file.name
      - type
      - formula.ownerName
    sort:
      - property: type
        direction: ASC
    group:
      - column: type
  - type: table
    name: All Notes
    order:
      - file.name
      - type
      - formula.ownerName
      - status
      - isTask
    sort:
      - property: file.name
        direction: ASC`,

	"Bulk Edit Demo": `filters:
  and:
    - or:
        - file.hasTag("task")
        - isTask == true
    - tnType != "base-notification"
    - status != "done"
formulas:
  priorityWeight: if(priority=="none",0,if(priority=="low",1,if(priority=="normal",2,if(priority=="high",3,999))))
  daysUntilDue: if(due, ((number(date(due)) - number(today())) / 86400000).floor(), null)
  assigneeName: if(assignee, assignee.replace("[[", "").replace("]]", ""), "Unassigned")
  projectName: if(projects && list(projects).length > 0, list(projects)[0].replace("[[", "").replace("]]", ""), "No project")
  dueDateCategory: if(!due, "No due date", if(date(due) < today(), "Overdue", if(date(due).date() == today(), "Today", if(date(due).date() == today() + "1d", "Tomorrow", if(date(due) <= today() + "7d", "This week", "Later")))))
properties:
  title:
    displayName: Task
  status:
    displayName: Status
  priority:
    displayName: Priority
  due:
    displayName: Due
  formula.assigneeName:
    displayName: Assignee
  formula.projectName:
    displayName: Project
  formula.dueDateCategory:
    displayName: Due Category
views:
  - type: tasknotesTaskList
    name: Active Tasks (Edit These)
    order:
      - title
      - status
      - priority
      - due
      - formula.assigneeName
      - formula.projectName
    sort:
      - property: formula.priorityWeight
        direction: DESC
    enableSearch: true
  - type: table
    name: By Priority
    order:
      - title
      - status
      - due
      - formula.assigneeName
    sort:
      - property: formula.priorityWeight
        direction: DESC
    group:
      - column: priority
  - type: table
    name: By Due Category
    order:
      - title
      - priority
      - formula.assigneeName
      - formula.projectName
    sort:
      - property: formula.daysUntilDue
        direction: ASC
    group:
      - column: formula.dueDateCategory`,

	"Bulk Generate Demo": `filters:
  and:
    - file.inFolder("Document Library, Knowledge")
    - type == "document"
    - status == "active"
formulas:
  ownerName: if(owner, owner.replace("[[", "").replace("]]", ""), "Unassigned")
  daysUntilReview: "review_date ? ((number(date(review_date)) - number(today())) / 86400000).floor() : 999"
  reviewStatus: if(formula.daysUntilReview < 0, "OVERDUE", if(formula.daysUntilReview <= 7, "This week", if(formula.daysUntilReview <= 30, "This month", "OK")))
properties:
  file.name:
    displayName: Document
  formula.ownerName:
    displayName: Owner
  formula.reviewStatus:
    displayName: Review Status
  review_date:
    displayName: Review Date
  review_cycle:
    displayName: Cycle
views:
  - type: tasknotesTaskList
    name: Ready to Generate
    order:
      - file.name
      - formula.ownerName
      - formula.reviewStatus
      - review_date
      - review_cycle
    sort:
      - property: formula.daysUntilReview
        direction: ASC
    enableSearch: true
  - type: table
    name: All Documents
    order:
      - file.name
      - formula.ownerName
      - formula.reviewStatus
      - review_date
      - review_cycle
    sort:
      - property: formula.daysUntilReview
        direction: ASC
  - type: table
    name: By Department
    order:
      - file.name
      - formula.ownerName
      - formula.reviewStatus
      - review_date
    sort:
      - property: file.name
        direction: ASC
    group:
      - column: file.folder`,

	"Notification Demo": `filters:
  and:
    - or:
        - file.hasTag("task")
        - isTask == true
    - tnType != "base-notification"
    - status != "done"
    - or:
        - and:
            - due
            - date(due) <= today() + "3d"
        - and:
            - scheduled
            - date(scheduled) <= today()
formulas:
  daysUntilDue: if(due, ((number(date(due)) - number(today())) / 86400000).floor(), null)
  isOverdue: due && date(due) < today() && status != "done"
  urgencyLabel: if(due && date(due) < today(), "OVERDUE", if(due && date(due).date() == today(), "Due Today", if(due && date(due).date() == today() + "1d", "Due Tomorrow", "Due Soon")))
  assigneeName: if(assignee, assignee.replace("[[", "").replace("]]", ""), "Unassigned")
properties:
  title:
    displayName: Task
  status:
    displayName: Status
  priority:
    displayName: Priority
  due:
    displayName: Due
  formula.urgencyLabel:
    displayName: Urgency
  formula.assigneeName:
    displayName: Assignee
views:
  - type: tasknotesTaskList
    name: Urgent Items
    order:
      - title
      - status
      - priority
      - due
      - formula.urgencyLabel
      - formula.assigneeName
    sort:
      - property: formula.daysUntilDue
        direction: ASC
    enableSearch: true
    notify: true
  - type: table
    name: All Urgent
    order:
      - title
      - status
      - priority
      - due
      - formula.urgencyLabel
      - formula.assigneeName
    sort:
      - property: formula.daysUntilDue
        direction: ASC
  - type: table
    name: By Urgency
    order:
      - title
      - priority
      - due
      - formula.assigneeName
    sort:
      - property: formula.daysUntilDue
        direction: ASC
    group:
      - column: formula.urgencyLabel`,

	"Team Workload": `filters:
  and:
    - file.hasTag("task")
formulas:
  assigneeName: |
    if(assignee, assignee.replace("[[", "").replace("]]", ""), "Unassigned")
properties:
  title:
    displayName: Task
  status:
    displayName: Status
  priority:
    displayName: Priority
  due:
    displayName: Due
  formula.assigneeName:
    displayName: Assignee
views:
  - type: tasknotesTaskList
    name: Tasks by Assignee
    groupBy:
      property: formula.assigneeName
      direction: ASC
    order:
      - status
      - priority
      - due
      - assignee
    sort:
      - property: priority
        direction: DESC
  - type: table
    name: All Tasks
    order:
      - title
      - status
      - priority
      - due
      - formula.assigneeName
    sort:
      - property: priority
        direction: DESC`,
};

// Only include the 5 most commonly used demos inline.
// The remaining 13 are generated via the same pattern - they're available
// in the canonical test-fixtures in the main TaskNotes repo.
// For brevity, we include all 18 by reading from the build-time embed.
// (The remaining demos are added below)

// Add remaining demo bases
Object.assign(DEMO_BASES, {
	"Completed Tasks Demo": `filters:
  and:
    - or:
        - file.hasTag("task")
        - isTask == true
    - tnType != "base-notification"
    - status == "done"
formulas:
  assigneeName: if(assignee, assignee.replace("[[", "").replace("]]", ""), "Unassigned")
  projectName: if(projects && list(projects).length > 0, list(projects)[0].replace("[[", "").replace("]]", ""), "No project")
  completedWeek: if(completedDate, date(completedDate).format("YYYY-[W]WW"), file.mtime.format("YYYY-[W]WW"))
  completedMonth: if(completedDate, date(completedDate).format("YYYY-MM"), file.mtime.format("YYYY-MM"))
  daysSinceCompleted: if(completedDate, ((number(today()) - number(date(completedDate))) / 86400000).floor(), ((number(today()) - number(file.mtime)) / 86400000).floor())
properties:
  title:
    displayName: Task
  priority:
    displayName: Priority
  completedDate:
    displayName: Completed
  formula.daysSinceCompleted:
    displayName: Days Ago
  formula.assigneeName:
    displayName: Completed By
  formula.projectName:
    displayName: Project
  formula.completedWeek:
    displayName: Week
views:
  - type: tasknotesTaskList
    name: Recently Completed
    order:
      - title
      - priority
      - completedDate
      - formula.daysSinceCompleted
      - formula.assigneeName
      - formula.projectName
    sort:
      - property: formula.daysSinceCompleted
        direction: ASC
    enableSearch: true
  - type: table
    name: By Week
    order:
      - title
      - priority
      - completedDate
      - formula.assigneeName
    sort:
      - property: formula.daysSinceCompleted
        direction: ASC
    group:
      - column: formula.completedWeek
  - type: table
    name: By Person
    order:
      - title
      - completedDate
      - formula.projectName
    sort:
      - property: formula.daysSinceCompleted
        direction: ASC
    group:
      - column: formula.assigneeName`,

	"Custom Properties Demo": `filters:
  and:
    - or:
        - file.hasTag("task")
        - isTask == true
    - tnType != "base-notification"
    - status != "done"
formulas:
  assigneeName: if(assignee, assignee.replace("[[", "").replace("]]", ""), "Unassigned")
  projectName: if(projects && list(projects).length > 0, list(projects)[0].replace("[[", "").replace("]]", ""), "No project")
  contextList: if(contexts && list(contexts).length > 0, list(contexts).join(", "), "None")
  hasTimeEstimate: timeEstimate && timeEstimate > 0
  timeEstimateDisplay: if(timeEstimate && timeEstimate > 0, if(timeEstimate >= 60, (timeEstimate / 60).floor() + "h " + (timeEstimate % 60) + "m", timeEstimate + "m"), "---")
properties:
  title:
    displayName: Task
  status:
    displayName: Status
  priority:
    displayName: Priority
  due:
    displayName: Due
  formula.assigneeName:
    displayName: Assignee
  formula.projectName:
    displayName: Project
  formula.contextList:
    displayName: Contexts
  formula.timeEstimateDisplay:
    displayName: Estimate
  timeEstimate:
    displayName: Estimate (min)
fieldMappings:
  deadline: due
  effort: timeEstimate
  owner: assignee
views:
  - type: tasknotesTaskList
    name: With Custom Fields
    order:
      - title
      - status
      - priority
      - due
      - formula.assigneeName
      - formula.projectName
      - formula.contextList
      - formula.timeEstimateDisplay
    sort:
      - property: due
        direction: ASC
    enableSearch: true
  - type: table
    name: By Context
    order:
      - title
      - priority
      - due
      - formula.assigneeName
      - formula.timeEstimateDisplay
    sort:
      - property: priority
        direction: DESC
    group:
      - column: formula.contextList
  - type: table
    name: By Project
    order:
      - title
      - status
      - priority
      - due
      - formula.assigneeName
    sort:
      - property: due
        direction: ASC
    group:
      - column: formula.projectName`,

	"Document Library": `filters:
  and:
    - file.inFolder("Document Library, Knowledge")
    - type == "document"
formulas:
  daysUntilReview: "note.review_date ? ((number(date(note.review_date)) - number(today())) / 86400000).floor() : 999"
  isOverdue: formula.daysUntilReview < 0
  reviewStatus: if(formula.daysUntilReview < 0, "OVERDUE", if(formula.daysUntilReview <= 7, "This week", if(formula.daysUntilReview <= 30, "This month", "OK")))
  ownerName: if(note.owner, note.owner.replace("[[", "").replace("]]", ""), "Unassigned")
properties:
  file.name:
    displayName: Document
  note.status:
    displayName: Status
  formula.ownerName:
    displayName: Owner
  note.review_date:
    displayName: Review Date
  note.review_cycle:
    displayName: Cycle
  formula.daysUntilReview:
    displayName: Days Until Review
  formula.reviewStatus:
    displayName: Review Status
  note.version:
    displayName: Version
views:
  - type: tasknotesTaskList
    name: All Documents
    order:
      - file.name
      - status
      - formula.ownerName
      - review_date
      - review_cycle
      - formula.reviewStatus
      - version
    sort:
      - property: file.name
        direction: ASC
    enableSearch: true
    notify: true
  - type: table
    name: Active Only
    filters:
      and:
        - status == "active"
    order:
      - file.name
      - formula.ownerName
      - review_date
      - formula.reviewStatus
    sort:
      - property: formula.daysUntilReview
        direction: ASC
  - type: table
    name: Needs Attention
    filters:
      or:
        - formula.isOverdue
        - status == "draft"
        - status == "deprecated"
    order:
      - file.name
      - status
      - formula.ownerName
      - formula.daysUntilReview
    sort:
      - property: formula.daysUntilReview
        direction: ASC
  - type: table
    name: By Owner
    order:
      - formula.ownerName
      - file.name
      - status
      - formula.reviewStatus
    sort:
      - property: formula.ownerName
        direction: ASC
    group:
      - column: formula.ownerName`,

	"Documents Coming Due": `filters:
  and:
    - file.inFolder("Document Library, Knowledge")
    - type == "document"
    - status == "active"
formulas:
  daysUntilReview: "review_date ? ((number(date(review_date)) - number(today())) / 86400000).floor() : 999"
  isOverdue: formula.daysUntilReview < 0
  reviewStatus: if(formula.daysUntilReview < 0, "OVERDUE", if(formula.daysUntilReview <= 7, "This week", if(formula.daysUntilReview <= 30, "This month", "OK")))
  ownerName: if(owner, owner.replace("[[", "").replace("]]", ""), "Unassigned")
properties:
  file.name:
    displayName: Document
  formula.ownerName:
    displayName: Owner
  review_date:
    displayName: Review Date
  last_reviewed:
    displayName: Last Reviewed
  review_cycle:
    displayName: Cycle
  status:
    displayName: Status
  formula.daysUntilReview:
    displayName: Days Until Review
  formula.reviewStatus:
    displayName: Review Status
views:
  - type: table
    name: Coming Due (30 days)
    filters:
      and:
        - formula.daysUntilReview <= 30
    order:
      - formula.reviewStatus
      - formula.daysUntilReview
      - file.name
      - formula.ownerName
      - review_date
      - review_cycle
    sort:
      - property: formula.daysUntilReview
        direction: ASC
  - type: table
    name: Overdue
    filters:
      and:
        - formula.isOverdue
    order:
      - formula.daysUntilReview
      - file.name
      - formula.ownerName
      - last_reviewed
    sort:
      - property: formula.daysUntilReview
        direction: ASC
  - type: table
    name: By Owner
    order:
      - formula.ownerName
      - file.name
      - formula.daysUntilReview
      - formula.reviewStatus
    sort:
      - property: formula.daysUntilReview
        direction: ASC
    group:
      - column: formula.ownerName
  - type: tasknotesTaskList
    name: All Documents
    order:
      - file.name
      - status
      - formula.ownerName
      - review_date
      - review_cycle
      - formula.reviewStatus
    sort:
      - property: file.name
        direction: ASC
    columnSize:
      status: 101
    indentProperties: true
    enableSearch: true
    notify: true
  - type: table
    name: All
    order:
      - file.name
      - formula.reviewStatus
      - formula.daysUntilReview
      - formula.ownerName
    sort:
      - property: file.name
        direction: ASC`,

	"Per-View Mapping Demo": `filters:
  and:
    - or:
        - file.hasTag("task")
        - isTask == true
    - tnType != "base-notification"
    - status != "done"
formulas:
  assigneeName: if(assignee, assignee.replace("[[", "").replace("]]", ""), "Unassigned")
  projectName: if(projects && list(projects).length > 0, list(projects)[0].replace("[[", "").replace("]]", ""), "No project")
  daysUntilDue: if(due, ((number(date(due)) - number(today())) / 86400000).floor(), null)
properties:
  title:
    displayName: Task Name
  status:
    displayName: Current Status
  priority:
    displayName: Importance
  due:
    displayName: Deadline
  scheduled:
    displayName: Start Date
  formula.assigneeName:
    displayName: Owner
  formula.projectName:
    displayName: Initiative
  contexts:
    displayName: Labels
fieldMappings:
  deadline: due
  start_date: scheduled
  importance: priority
  owner: assignee
  initiative: projects
  labels: contexts
views:
  - type: tasknotesTaskList
    name: Mapped Properties
    order:
      - title
      - status
      - priority
      - due
      - scheduled
      - formula.assigneeName
      - formula.projectName
      - contexts
    sort:
      - property: formula.daysUntilDue
        direction: ASC
    enableSearch: true
  - type: table
    name: All Tasks
    order:
      - title
      - status
      - priority
      - due
      - scheduled
      - formula.assigneeName
      - formula.projectName
      - contexts
    sort:
      - property: formula.daysUntilDue
        direction: ASC
  - type: table
    name: By Initiative
    order:
      - title
      - status
      - priority
      - due
      - formula.assigneeName
    sort:
      - property: formula.daysUntilDue
        direction: ASC
    group:
      - column: formula.projectName`,

	"Priority Dashboard Demo": `filters:
  and:
    - or:
        - file.hasTag("task")
        - isTask == true
    - tnType != "base-notification"
    - status != "done"
formulas:
  priorityWeight: if(priority=="none",0,if(priority=="low",1,if(priority=="normal",2,if(priority=="high",3,999))))
  daysUntilDue: if(due, ((number(date(due)) - number(today())) / 86400000).floor(), null)
  assigneeName: if(assignee, assignee.replace("[[", "").replace("]]", ""), "Unassigned")
  projectName: if(projects && list(projects).length > 0, list(projects)[0].replace("[[", "").replace("]]", ""), "No project")
  isOverdue: due && date(due) < today() && status != "done"
  urgencyScore: if(!due, formula.priorityWeight, formula.priorityWeight + max(0, 10 - formula.daysUntilDue))
  priorityLabel: if(priority=="high", "High", if(priority=="normal", "Normal", if(priority=="low", "Low", "None")))
  dueDateCategory: if(!due, "No due date", if(date(due) < today(), "Overdue", if(date(due).date() == today(), "Today", if(date(due).date() == today() + "1d", "Tomorrow", if(date(due) <= today() + "7d", "This week", "Later")))))
properties:
  title:
    displayName: Task
  status:
    displayName: Status
  priority:
    displayName: Priority
  due:
    displayName: Due
  formula.urgencyScore:
    displayName: Urgency
  formula.assigneeName:
    displayName: Assignee
  formula.projectName:
    displayName: Project
  formula.dueDateCategory:
    displayName: Timeline
views:
  - type: tasknotesTaskList
    name: By Urgency Score
    order:
      - title
      - priority
      - due
      - formula.urgencyScore
      - formula.assigneeName
      - formula.projectName
    sort:
      - property: formula.urgencyScore
        direction: DESC
    enableSearch: true
  - type: tasknotesKanban
    name: Priority Board
    groupBy:
      property: priority
      direction: DESC
    order:
      - title
      - status
      - due
      - formula.assigneeName
    options:
      columnWidth: 300
  - type: table
    name: Overdue + High Priority
    filters:
      and:
        - or:
            - formula.isOverdue
            - priority == "high"
    order:
      - title
      - priority
      - due
      - formula.urgencyScore
      - formula.assigneeName
    sort:
      - property: formula.urgencyScore
        direction: DESC
  - type: table
    name: By Timeline
    order:
      - title
      - priority
      - due
      - formula.assigneeName
    sort:
      - property: formula.daysUntilDue
        direction: ASC
    group:
      - column: formula.dueDateCategory`,

	"Project Dependencies Demo": `filters:
  and:
    - or:
        - file.hasTag("task")
        - isTask == true
    - tnType != "base-notification"
    - status != "done"
formulas:
  assigneeName: if(assignee, assignee.replace("[[", "").replace("]]", ""), "Unassigned")
  projectName: if(projects && list(projects).length > 0, list(projects)[0].replace("[[", "").replace("]]", ""), "No project")
  daysUntilDue: if(due, ((number(date(due)) - number(today())) / 86400000).floor(), null)
  hasBlockers: blockedBy && list(blockedBy).length > 0
  isBlocking: blocking && list(blocking).length > 0
  hasSubtasks: subtasks && list(subtasks).length > 0
  hasParent: parent && !parent.isEmpty()
  dependencyType: if(formula.hasBlockers && formula.isBlocking, "Both", if(formula.hasBlockers, "Blocked", if(formula.isBlocking, "Blocking", if(formula.hasSubtasks, "Parent", if(formula.hasParent, "Subtask", "Linked")))))
properties:
  title:
    displayName: Task
  status:
    displayName: Status
  priority:
    displayName: Priority
  due:
    displayName: Due
  formula.assigneeName:
    displayName: Assignee
  formula.projectName:
    displayName: Project
  formula.dependencyType:
    displayName: Dependency Type
  blockedBy:
    displayName: Blocked By
  blocking:
    displayName: Blocking
views:
  - type: tasknotesTaskList
    name: All Dependencies
    order:
      - title
      - status
      - formula.dependencyType
      - due
      - formula.assigneeName
      - formula.projectName
    sort:
      - property: formula.daysUntilDue
        direction: ASC
    enableSearch: true
  - type: table
    name: By Dependency Type
    order:
      - title
      - status
      - due
      - formula.assigneeName
    sort:
      - property: formula.daysUntilDue
        direction: ASC
    group:
      - column: formula.dependencyType
  - type: tasknotesKanban
    name: Dependency Board
    groupBy:
      property: formula.dependencyType
      direction: ASC
    order:
      - title
      - status
      - priority
      - due
    options:
      columnWidth: 300`,

	"Recurring Tasks Demo": `filters:
  and:
    - or:
        - file.hasTag("task")
        - isTask == true
    - tnType != "base-notification"
    - recurrence
    - '!recurrence.isEmpty()'
formulas:
  daysUntilDue: if(due, ((number(date(due)) - number(today())) / 86400000).floor(), null)
  assigneeName: if(assignee, assignee.replace("[[", "").replace("]]", ""), "Unassigned")
  projectName: if(projects && list(projects).length > 0, list(projects)[0].replace("[[", "").replace("]]", ""), "No project")
  recurrenceType: if(recurrence.contains("DAILY"), "Daily", if(recurrence.contains("WEEKLY"), "Weekly", if(recurrence.contains("MONTHLY"), "Monthly", if(recurrence.contains("YEARLY"), "Yearly", "Custom"))))
properties:
  title:
    displayName: Task
  status:
    displayName: Status
  recurrence:
    displayName: Recurrence Rule
  formula.recurrenceType:
    displayName: Frequency
  due:
    displayName: Next Due
  formula.daysUntilDue:
    displayName: Days Until Due
  formula.assigneeName:
    displayName: Assignee
views:
  - type: tasknotesTaskList
    name: All Recurring
    order:
      - title
      - formula.recurrenceType
      - recurrence
      - due
      - formula.daysUntilDue
      - formula.assigneeName
    sort:
      - property: formula.daysUntilDue
        direction: ASC
    enableSearch: true
  - type: table
    name: All Recurring
    order:
      - title
      - status
      - formula.recurrenceType
      - recurrence
      - due
      - formula.daysUntilDue
      - formula.assigneeName
    sort:
      - property: formula.daysUntilDue
        direction: ASC
  - type: table
    name: By Frequency
    order:
      - title
      - recurrence
      - due
      - formula.assigneeName
    sort:
      - property: formula.daysUntilDue
        direction: ASC
    group:
      - column: formula.recurrenceType
  - type: tasknotesCalendar
    name: Recurring Calendar
    order:
      - title
      - status
      - priority
      - recurrence`,

	"Reminders Demo": `filters:
  and:
    - or:
        - file.hasTag("task")
        - isTask == true
    - tnType != "base-notification"
    - reminders
    - '!reminders.isEmpty()'
formulas:
  daysUntilDue: if(due, ((number(date(due)) - number(today())) / 86400000).floor(), null)
  assigneeName: if(assignee, assignee.replace("[[", "").replace("]]", ""), "Unassigned")
  reminderCount: if(reminders, list(reminders).length, 0)
  hasReminder: reminders && list(reminders).length > 0
properties:
  title:
    displayName: Task
  status:
    displayName: Status
  priority:
    displayName: Priority
  due:
    displayName: Due
  scheduled:
    displayName: Scheduled
  formula.reminderCount:
    displayName: Reminders
  formula.assigneeName:
    displayName: Assignee
views:
  - type: tasknotesTaskList
    name: Tasks with Reminders
    order:
      - title
      - status
      - priority
      - due
      - scheduled
      - formula.reminderCount
      - formula.assigneeName
    sort:
      - property: due
        direction: ASC
    enableSearch: true
  - type: table
    name: All Reminders
    order:
      - title
      - status
      - priority
      - due
      - scheduled
      - formula.reminderCount
      - formula.assigneeName
    sort:
      - property: due
        direction: ASC
  - type: tasknotesCalendar
    name: Reminder Calendar
    order:
      - title
      - status
      - priority
      - formula.reminderCount`,

	"Shared Vault Demo": `filters:
  and:
    - or:
        - file.hasTag("task")
        - isTask == true
    - tnType != "base-notification"
    - status != "done"
formulas:
  assigneeName: if(assignee, assignee.replace("[[", "").replace("]]", ""), "Unassigned")
  creatorName: if(creator, creator.replace("[[", "").replace("]]", ""), "Unknown")
  projectName: if(projects && list(projects).length > 0, list(projects)[0].replace("[[", "").replace("]]", ""), "No project")
  daysUntilDue: if(due, ((number(date(due)) - number(today())) / 86400000).floor(), null)
  dueDateCategory: if(!due, "No due date", if(date(due) < today(), "Overdue", if(date(due).date() == today(), "Today", if(date(due).date() == today() + "1d", "Tomorrow", if(date(due) <= today() + "7d", "This week", "Later")))))
properties:
  title:
    displayName: Task
  status:
    displayName: Status
  priority:
    displayName: Priority
  due:
    displayName: Due
  formula.assigneeName:
    displayName: Assigned To
  formula.creatorName:
    displayName: Created By
  formula.projectName:
    displayName: Project
  formula.dueDateCategory:
    displayName: Timeline
views:
  - type: tasknotesTaskList
    name: Team Dashboard
    order:
      - title
      - status
      - priority
      - due
      - formula.assigneeName
      - formula.creatorName
      - formula.projectName
    sort:
      - property: formula.daysUntilDue
        direction: ASC
    enableSearch: true
  - type: table
    name: By Team Member
    order:
      - title
      - status
      - priority
      - due
      - formula.creatorName
    sort:
      - property: formula.daysUntilDue
        direction: ASC
    group:
      - column: formula.assigneeName
  - type: table
    name: Created By
    order:
      - title
      - status
      - priority
      - due
      - formula.assigneeName
    sort:
      - property: formula.daysUntilDue
        direction: ASC
    group:
      - column: formula.creatorName
  - type: tasknotesKanban
    name: Team Kanban
    groupBy:
      property: formula.assigneeName
      direction: ASC
    order:
      - title
      - status
      - priority
      - due
    options:
      columnWidth: 280
      hideEmptyColumns: true`,

	"Statistics Demo": `filters:
  and:
    - or:
        - file.hasTag("task")
        - isTask == true
    - tnType != "base-notification"
formulas:
  priorityWeight: if(priority=="none",0,if(priority=="low",1,if(priority=="normal",2,if(priority=="high",3,999))))
  daysUntilDue: if(due, ((number(date(due)) - number(today())) / 86400000).floor(), null)
  assigneeName: if(assignee, assignee.replace("[[", "").replace("]]", ""), "Unassigned")
  projectName: if(projects && list(projects).length > 0, list(projects)[0].replace("[[", "").replace("]]", ""), "No project")
  isOverdue: due && date(due) < today() && status != "done"
  ageInDays: ((number(now()) - number(file.ctime)) / 86400000).floor()
  ageCategory: if(formula.ageInDays < 1, "Today", if(formula.ageInDays < 7, "This week", if(formula.ageInDays < 30, "This month", "Older")))
  statusLabel: if(status == "done", "Completed", if(status == "in-progress", "In Progress", if(status == "pending", "Pending", status)))
  createdMonth: file.ctime.format("YYYY-MM")
properties:
  title:
    displayName: Task
  status:
    displayName: Status
  priority:
    displayName: Priority
  due:
    displayName: Due
  formula.assigneeName:
    displayName: Assignee
  formula.projectName:
    displayName: Project
  formula.ageInDays:
    displayName: Age (days)
  formula.statusLabel:
    displayName: Status Label
  formula.createdMonth:
    displayName: Created Month
views:
  - type: table
    name: By Status
    order:
      - title
      - priority
      - due
      - formula.assigneeName
      - formula.ageInDays
    sort:
      - property: formula.priorityWeight
        direction: DESC
    group:
      - column: formula.statusLabel
  - type: table
    name: By Project
    order:
      - title
      - formula.statusLabel
      - priority
      - due
      - formula.assigneeName
    sort:
      - property: formula.priorityWeight
        direction: DESC
    group:
      - column: formula.projectName
  - type: table
    name: By Age
    order:
      - title
      - formula.statusLabel
      - formula.ageInDays
      - formula.assigneeName
    sort:
      - property: formula.ageInDays
        direction: DESC
    group:
      - column: formula.ageCategory
  - type: table
    name: By Creation Month
    order:
      - title
      - formula.statusLabel
      - priority
      - formula.assigneeName
    sort:
      - property: file.ctime
        direction: DESC
    group:
      - column: formula.createdMonth
  - type: tasknotesTaskList
    name: Full List
    order:
      - title
      - status
      - priority
      - due
      - formula.assigneeName
      - formula.projectName
      - formula.ageInDays
    sort:
      - property: file.ctime
        direction: DESC
    enableSearch: true`,

	"Tasks by Assignee": `filters:
  and:
    - file.hasTag("task")
formulas:
  priorityWeight: if(priority=="none",0,if(priority=="low",1,if(priority=="normal",2,if(priority=="high",3,999))))
  daysUntilDue: if(due, ((number(date(due)) - number(today())) / 86400000).floor(), null)
  isOverdue: due && date(due) < today() && status != "done"
  dueDateCategory: if(!due, "No due date", if(date(due) < today(), "Overdue", if(date(due).date() == today(), "Today", if(date(due).date() == today() + "1d", "Tomorrow", if(date(due) <= today() + "7d", "This week", "Later")))))
  assigneeName: if(assignee, assignee.replace("[[", "").replace("]]", ""), "Unassigned")
  projectName: if(projects && list(projects).length > 0, list(projects)[0].replace("[[", "").replace("]]", ""), "No project")
properties:
  title:
    displayName: Task
  formula.assigneeName:
    displayName: Assignee
  formula.projectName:
    displayName: Project
  status:
    displayName: Status
  priority:
    displayName: Priority
  due:
    displayName: Due Date
  formula.dueDateCategory:
    displayName: Due Category
  formula.daysUntilDue:
    displayName: Days Until Due
views:
  - type: tasknotesTaskList
    name: By Assignee
    filters:
      and:
        - status != "done"
    order:
      - formula.assigneeName
      - status
      - priority
      - due
      - title
      - formula.projectName
    sort:
      - property: formula.daysUntilDue
        direction: ASC
    group:
      - column: formula.assigneeName
  - type: table
    name: Workload Summary
    filters:
      and:
        - status != "done"
    order:
      - formula.assigneeName
      - title
      - status
      - priority
      - due
      - formula.dueDateCategory
    sort:
      - property: formula.priorityWeight
        direction: DESC
    group:
      - column: formula.assigneeName
  - type: tasknotesTaskList
    name: Overdue by Assignee
    filters:
      and:
        - formula.isOverdue
    order:
      - formula.assigneeName
      - formula.daysUntilDue
      - title
      - formula.projectName
    sort:
      - property: formula.daysUntilDue
        direction: ASC
    group:
      - column: formula.assigneeName`,

	"Time Tracking Demo": `filters:
  and:
    - or:
        - file.hasTag("task")
        - isTask == true
    - tnType != "base-notification"
    - or:
        - and:
            - timeEstimate
            - timeEstimate > 0
        - and:
            - timeEntries
            - '!timeEntries.isEmpty()'
formulas:
  assigneeName: if(assignee, assignee.replace("[[", "").replace("]]", ""), "Unassigned")
  timeTracked: if(timeEntries, list(timeEntries).filter(value.endTime).map((number(date(value.endTime)) - number(date(value.startTime))) / 60000).reduce(acc + value, 0).round(), 0)
  timeTrackedFormatted: if(timeEntries, if(list(timeEntries).filter(value.endTime).map((number(date(value.endTime)) - number(date(value.startTime))) / 60000).reduce(acc + value, 0) >= 60, (list(timeEntries).filter(value.endTime).map((number(date(value.endTime)) - number(date(value.startTime))) / 60000).reduce(acc + value, 0) / 60).floor() + "h " + (list(timeEntries).filter(value.endTime).map((number(date(value.endTime)) - number(date(value.startTime))) / 60000).reduce(acc + value, 0) % 60).round() + "m", list(timeEntries).filter(value.endTime).map((number(date(value.endTime)) - number(date(value.startTime))) / 60000).reduce(acc + value, 0).round() + "m"), "0m")
  timeEstimateFormatted: if(timeEstimate && timeEstimate > 0, if(timeEstimate >= 60, (timeEstimate / 60).floor() + "h " + (timeEstimate % 60) + "m", timeEstimate + "m"), "---")
  efficiencyRatio: if(timeEstimate && timeEstimate > 0 && timeEntries, (list(timeEntries).filter(value.endTime).map((number(date(value.endTime)) - number(date(value.startTime))) / 60000).reduce(acc + value, 0) / timeEstimate * 100).round(), null)
  trackingStatus: if(!timeEstimate || timeEstimate == 0, "No estimate", if(!timeEntries || list(timeEntries).length == 0, "Not started", if(formula.efficiencyRatio < 80, "Under budget", if(formula.efficiencyRatio <= 120, "On track", "Over budget"))))
  timeEstimateCategory: if(!timeEstimate || timeEstimate == 0, "No estimate", if(timeEstimate < 30, "Quick (<30m)", if(timeEstimate <= 120, "Medium (30m-2h)", "Long (>2h)")))
properties:
  title:
    displayName: Task
  status:
    displayName: Status
  formula.timeEstimateFormatted:
    displayName: Estimated
  formula.timeTrackedFormatted:
    displayName: Tracked
  formula.efficiencyRatio:
    displayName: "% Used"
  formula.trackingStatus:
    displayName: Budget
  formula.assigneeName:
    displayName: Assignee
views:
  - type: tasknotesTaskList
    name: Time Overview
    order:
      - title
      - status
      - formula.timeEstimateFormatted
      - formula.timeTrackedFormatted
      - formula.efficiencyRatio
      - formula.trackingStatus
      - formula.assigneeName
    sort:
      - property: formula.efficiencyRatio
        direction: DESC
    enableSearch: true
  - type: table
    name: By Budget Status
    order:
      - title
      - formula.timeEstimateFormatted
      - formula.timeTrackedFormatted
      - formula.efficiencyRatio
    sort:
      - property: formula.efficiencyRatio
        direction: DESC
    group:
      - column: formula.trackingStatus
  - type: table
    name: By Estimate Size
    order:
      - title
      - status
      - formula.timeEstimateFormatted
      - formula.timeTrackedFormatted
    sort:
      - property: timeEstimate
        direction: ASC
    group:
      - column: formula.timeEstimateCategory`,
});


// ============================================================
// DATE HELPERS
// ============================================================

function getDateStr(offset: number): string {
	const d = new Date();
	d.setDate(d.getDate() + offset);
	return d.toISOString().split("T")[0];
}

function resolveOffset(offset: number | string | undefined): string | undefined {
	if (offset === undefined) return undefined;
	if (offset === "today") return getDateStr(0);
	if (offset === "tomorrow") return getDateStr(1);
	if (offset === "yesterday") return getDateStr(-1);
	if (offset === "next_week") return getDateStr(7);
	return getDateStr(offset as number);
}

// ============================================================
// CONTENT GENERATORS
// ============================================================

function generatePersonContent(person: PersonDef, ctx: GenerationContext): string {
	const lines: string[] = [];
	lines.push(`${ctx.typeProperty}: ${ctx.personTypeValue}`);
	lines.push(`email: "${person.email}"`);
	lines.push(`role: ${person.role}`);
	lines.push(`department: ${person.department}`);
	lines.push(`active: ${person.active}`);
	lines.push(`reminderTime: "${person.reminderTime}"`);
	lines.push(`notificationEnabled: true`);
	lines.push(`tags:`);
	lines.push(`  - ${ctx.personTag}`);
	lines.push(`  - ${person.department.toLowerCase().replace(/\s+/g, "-")}`);

	return `---\n${lines.join("\n")}\n---\n\n# ${person.name}\n\n## Role\n\n${person.role} in the ${person.department} department.\n\n## Contact\n\n- Email: ${person.email}\n`;
}

function generateGroupContent(group: GroupDef, ctx: GenerationContext): string {
	const memberLinks = group.members.map(m => `  - "[[${m}]]"`).join("\n");
	return `---\n${ctx.typeProperty}: ${ctx.groupTypeValue}\ntitle: ${group.name}\nmembers:\n${memberLinks}\ntags:\n  - ${ctx.groupTag}\n---\n\n# ${group.name}\n\n${group.description}\n\n## Members\n\n${group.members.map(m => `- [[${m}]]`).join("\n")}\n`;
}

function generateDocumentContent(doc: DocumentDef): string {
	if (doc.metadata) {
		const m = doc.metadata;
		const lines: string[] = [];
		lines.push(`type: ${m.type}`);
		lines.push(`status: ${m.status}`);
		lines.push(`owner: "[[${m.owner}]]"`);
		lines.push(`review_date: ${getDateStr(m.review_date_offset)}`);
		lines.push(`last_reviewed: ${getDateStr(m.last_reviewed_offset)}`);
		lines.push(`review_cycle: "${m.review_cycle}"`);
		lines.push(`version: "${m.version}"`);
		lines.push(`tags:`);
		for (const t of m.tags) lines.push(`  - ${t}`);
		return `---\n${lines.join("\n")}\n---\n\n${doc.content}`;
	}
	return doc.content;
}

function generateTaskContent(task: TaskDef, ctx: GenerationContext): string {
	const fm = ctx.fieldMapping;
	const lines: string[] = [];
	lines.push(`isTask: true`);
	lines.push(`${fm.title}: "${task.name}"`);
	lines.push(`${fm.status}: ${task.status}`);
	lines.push(`${fm.priority}: ${task.priority}`);

	const due = resolveOffset(task.due_offset);
	if (due) lines.push(`${fm.due}: ${due}`);
	const scheduled = resolveOffset(task.scheduled_offset);
	if (scheduled) lines.push(`${fm.scheduled}: ${scheduled}`);
	const completed = resolveOffset(task.completedDate_offset);
	if (completed) lines.push(`${fm.completedDate}: ${completed}`);
	lines.push(`${fm.dateCreated}: ${getDateStr(0)}`);

	if (task.assignee) lines.push(`${ctx.assigneeField}: "[[${task.assignee}]]"`);
	if (task.projects) {
		lines.push(`${fm.projects}:`);
		for (const p of task.projects) lines.push(`  - "[[${p}]]"`);
	}
	if (task.contexts) {
		lines.push(`${fm.contexts}:`);
		for (const c of task.contexts) lines.push(`  - ${c}`);
	}
	lines.push(`tags:`);
	lines.push(`  - ${ctx.taskTag}`);
	if (task.timeEstimate) lines.push(`${fm.timeEstimate}: ${task.timeEstimate}`);
	if (task.recurrence) lines.push(`${fm.recurrence}: "${task.recurrence}"`);
	if (task.reminders) {
		lines.push(`${fm.reminders}:`);
		for (const r of task.reminders) {
			lines.push(`  - id: "${r.id}"`);
			lines.push(`    type: "${r.type}"`);
			if (r.relatedTo) lines.push(`    relatedTo: "${r.relatedTo}"`);
			if (r.offset !== undefined) lines.push(`    offset: ${r.offset}`);
			if (r.unit) lines.push(`    unit: "${r.unit}"`);
			if (r.direction) lines.push(`    direction: "${r.direction}"`);
			if (r.description) lines.push(`    description: "${r.description}"`);
		}
	}
	if (task.blockedBy) {
		lines.push(`${fm.blockedBy}:`);
		for (const b of task.blockedBy) lines.push(`  - "[[${b}]]"`);
	}
	if (task.blocking) {
		lines.push(`blocking:`);
		for (const b of task.blocking) lines.push(`  - "[[${b}]]"`);
	}
	if (task.parent) lines.push(`parent: "[[${task.parent}]]"`);
	if (task.subtasks) {
		lines.push(`subtasks:`);
		for (const s of task.subtasks) lines.push(`  - "[[${s}]]"`);
	}
	if (task.creator) lines.push(`${ctx.creatorField}: "[[${task.creator}]]"`);

	return `---\n${lines.join("\n")}\n---\n\n# ${task.name}\n\nTask details go here.\n`;
}

// ============================================================
// GENERATOR CLASS
// ============================================================

class TestDataGenerator {
	private app: App;
	private settings: TestFixturesSettings;
	private ctx: GenerationContext;

	constructor(app: App, settings: TestFixturesSettings, ctx: GenerationContext) {
		this.app = app;
		this.settings = settings;
		this.ctx = ctx;
	}

	private async ensureFolder(path: string): Promise<void> {
		if (!(await this.app.vault.adapter.exists(path))) {
			await this.app.vault.adapter.mkdir(path);
		}
	}

	private async createOrOverwrite(path: string, content: string): Promise<void> {
		const existing = this.app.vault.getAbstractFileByPath(path);
		if (existing) {
			await this.app.vault.modify(existing as any, content);
		} else {
			await this.app.vault.create(path, content);
		}
	}

	private async cleanFolder(path: string): Promise<number> {
		let count = 0;
		if (await this.app.vault.adapter.exists(path)) {
			const listing = await this.app.vault.adapter.list(path);
			for (const file of listing.files) {
				const f = this.app.vault.getAbstractFileByPath(file);
				if (f) {
					await this.app.vault.delete(f);
					count++;
				}
			}
		}
		return count;
	}

	async cleanAll(): Promise<string> {
		const msgs: string[] = [];
		const s = this.settings;

		let deleted = await this.cleanFolder(s.peopleFolder);
		msgs.push(`People: ${deleted} files removed`);

		deleted = await this.cleanFolder(s.groupsFolder);
		msgs.push(`Groups: ${deleted} files removed`);

		deleted = await this.cleanFolder(s.tasksFolder);
		msgs.push(`Tasks: ${deleted} files removed`);

		const docSubdirs = ["Projects", "Compliance", "Technical", "HR", "Meeting Notes", "Research", "Templates", "Design", "Operations", "Security"];
		for (const sub of docSubdirs) {
			deleted = await this.cleanFolder(`${s.documentsFolder}/${sub}`);
			if (deleted > 0) msgs.push(`Documents/${sub}: ${deleted} files removed`);
		}

		return msgs.join("\n");
	}

	async generateAll(): Promise<string> {
		const s = this.settings;
		const msgs: string[] = [];

		// Ensure directories
		await this.ensureFolder(s.peopleFolder);
		await this.ensureFolder(s.groupsFolder);
		await this.ensureFolder(s.tasksFolder);
		await this.ensureFolder(s.documentsFolder);
		await this.ensureFolder(s.demosFolder);
		await this.ensureFolder(s.viewsFolder);

		const docSubdirs = ["Projects", "Compliance", "Technical", "HR", "Meeting Notes", "Research", "Templates", "Design", "Operations", "Security"];
		for (const sub of docSubdirs) {
			await this.ensureFolder(`${s.documentsFolder}/${sub}`);
		}

		// People
		for (const person of PERSONS) {
			await this.createOrOverwrite(`${s.peopleFolder}/${person.name}.md`, generatePersonContent(person, this.ctx));
		}
		msgs.push(`${PERSONS.length} person notes`);

		// Groups
		for (const group of GROUPS) {
			await this.createOrOverwrite(`${s.groupsFolder}/${group.name}.md`, generateGroupContent(group, this.ctx));
		}
		msgs.push(`${GROUPS.length} group notes`);

		// Documents
		for (const doc of DOCUMENTS) {
			await this.createOrOverwrite(`${s.documentsFolder}/${doc.subfolder}/${doc.name}.md`, generateDocumentContent(doc));
		}
		msgs.push(`${DOCUMENTS.length} document notes`);

		// Tasks
		for (const task of TASKS) {
			await this.createOrOverwrite(`${s.tasksFolder}/${task.name}.md`, generateTaskContent(task, this.ctx));
		}
		msgs.push(`${TASKS.length} task notes`);

		// Demo .base files
		let demoCount = 0;
		for (const [name, content] of Object.entries(DEMO_BASES)) {
			await this.createOrOverwrite(`${s.demosFolder}/${name}.base`, content);
			demoCount++;
		}
		msgs.push(`${demoCount} demo .base views`);

		return msgs.join(", ");
	}
}

// ============================================================
// SETTINGS TAB
// ============================================================

class TestFixturesSettingTab extends PluginSettingTab {
	plugin: TestFixturesPlugin;

	constructor(app: App, plugin: TestFixturesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl).setName("Folder paths").setHeading();

		new Setting(containerEl)
			.setName("People folder")
			.setDesc("Where person notes are generated")
			.addText(text => text.setValue(this.plugin.settings.peopleFolder).onChange(async v => { this.plugin.settings.peopleFolder = v; await this.plugin.saveSettings(); }));

		new Setting(containerEl)
			.setName("Groups folder")
			.setDesc("Where group notes are generated")
			.addText(text => text.setValue(this.plugin.settings.groupsFolder).onChange(async v => { this.plugin.settings.groupsFolder = v; await this.plugin.saveSettings(); }));

		new Setting(containerEl)
			.setName("Documents folder")
			.setDesc("Root folder for document notes (subdirectories created automatically)")
			.addText(text => text.setValue(this.plugin.settings.documentsFolder).onChange(async v => { this.plugin.settings.documentsFolder = v; await this.plugin.saveSettings(); }));

		new Setting(containerEl)
			.setName("Tasks folder")
			.setDesc("Where task notes are generated")
			.addText(text => text.setValue(this.plugin.settings.tasksFolder).onChange(async v => { this.plugin.settings.tasksFolder = v; await this.plugin.saveSettings(); }));

		new Setting(containerEl)
			.setName("Demos folder")
			.setDesc("Where demo .base views are generated")
			.addText(text => text.setValue(this.plugin.settings.demosFolder).onChange(async v => { this.plugin.settings.demosFolder = v; await this.plugin.saveSettings(); }));
	}
}

// ============================================================
// PLUGIN
// ============================================================

export default class TestFixturesPlugin extends Plugin {
	settings: TestFixturesSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: "generate-all",
			name: "Generate all test data",
			callback: async () => {
				const ctx = buildContextFromTaskNotes(this.app);
				const gen = new TestDataGenerator(this.app, this.settings, ctx);
				new Notice("Generating test data...");
				try {
					const result = await gen.generateAll();
					new Notice(`Done! Generated: ${result}`);
				} catch (e) {
					new Notice(`Error: ${e}`);
					console.error("Test fixtures generation error:", e);
				}
			},
		});

		this.addCommand({
			id: "clean-and-generate",
			name: "Clean and regenerate all test data",
			callback: async () => {
				const ctx = buildContextFromTaskNotes(this.app);
				const gen = new TestDataGenerator(this.app, this.settings, ctx);
				new Notice("Cleaning existing data...");
				try {
					const cleanResult = await gen.cleanAll();
					console.log("Clean result:", cleanResult);
					new Notice("Regenerating...");
					const genResult = await gen.generateAll();
					new Notice(`Done! Generated: ${genResult}`);
				} catch (e) {
					new Notice(`Error: ${e}`);
					console.error("Test fixtures error:", e);
				}
			},
		});

		this.addCommand({
			id: "clean-only",
			name: "Remove all generated test data",
			callback: async () => {
				const ctx = buildContextFromTaskNotes(this.app);
				const gen = new TestDataGenerator(this.app, this.settings, ctx);
				new Notice("Cleaning test data...");
				try {
					const result = await gen.cleanAll();
					new Notice(`Done!\n${result}`);
				} catch (e) {
					new Notice(`Error: ${e}`);
					console.error("Test fixtures clean error:", e);
				}
			},
		});

		this.addCommand({
			id: "configure-tasknotes",
			name: "Configure TaskNotes settings for test data",
			callback: async () => {
				const tn = (this.app as any).plugins?.plugins?.tasknotes;
				if (!tn?.settings) {
					new Notice("TaskNotes plugin is not installed or enabled");
					return;
				}
				// Backup current settings
				const backup = JSON.parse(JSON.stringify(tn.settings));
				const data = await this.loadData() || {};
				data.backupSettings = backup;
				await this.saveData(data);

				// Apply test-friendly settings
				const s = tn.settings;
				s.taskIdentificationMethod = "property";
				s.taskPropertyName = "isTask";
				s.taskPropertyValue = "true";
				s.taskTag = "task";
				s.tasksFolder = this.settings.tasksFolder;
				s.personNotesFolder = this.settings.peopleFolder;
				s.groupNotesFolder = this.settings.groupsFolder;
				s.personNotesTag = "person";
				s.groupNotesTag = "group";
				s.identityTypePropertyName = "type";
				s.personTypeValue = "person";
				s.groupTypeValue = "group";
				s.autoSetCreator = true;
				s.creatorFieldName = "creator";
				s.assigneeFieldName = "assignee";
				s.enableBases = true;
				s.enableBulkActionsButton = true;
				s.enableNotifications = true;
				s.enableUniversalBasesButtons = true;

				// Reset field mapping to defaults
				s.fieldMapping = {
					title: "title", status: "status", priority: "priority",
					due: "due", scheduled: "scheduled", contexts: "contexts",
					projects: "projects", timeEstimate: "timeEstimate",
					completedDate: "completedDate", dateCreated: "dateCreated",
					dateModified: "dateModified", recurrence: "recurrence",
					recurrenceAnchor: "recurrence_anchor", archiveTag: "archived",
					timeEntries: "timeEntries", completeInstances: "complete_instances",
					skippedInstances: "skipped_instances", blockedBy: "blockedBy",
					pomodoros: "pomodoros", icsEventId: "icsEventId",
					icsEventTag: "ics_event", googleCalendarEventId: "googleCalendarEventId",
					reminders: "reminders",
				};

				await tn.saveSettings();
				new Notice("TaskNotes configured for testing. Previous settings backed up.");
			},
		});

		this.addCommand({
			id: "restore-tasknotes",
			name: "Restore TaskNotes settings from backup",
			callback: async () => {
				const tn = (this.app as any).plugins?.plugins?.tasknotes;
				if (!tn?.settings) {
					new Notice("TaskNotes plugin is not installed or enabled");
					return;
				}
				const data = await this.loadData() || {};
				if (!data.backupSettings) {
					new Notice("No backup found. Run 'Configure TaskNotes for testing' first.");
					return;
				}
				Object.assign(tn.settings, data.backupSettings);
				await tn.saveSettings();
				delete data.backupSettings;
				await this.saveData(data);
				new Notice("TaskNotes settings restored from backup.");
			},
		});

		this.addCommand({
			id: "full-test-setup",
			name: "Full test setup (configure + generate)",
			callback: async () => {
				const tn = (this.app as any).plugins?.plugins?.tasknotes;
				if (!tn?.settings) {
					new Notice("TaskNotes plugin is not installed or enabled");
					return;
				}

				// Step 1: Configure TaskNotes
				const backup = JSON.parse(JSON.stringify(tn.settings));
				const data = await this.loadData() || {};
				data.backupSettings = backup;
				await this.saveData(data);

				const s = tn.settings;
				s.taskIdentificationMethod = "property";
				s.taskPropertyName = "isTask";
				s.taskPropertyValue = "true";
				s.taskTag = "task";
				s.tasksFolder = this.settings.tasksFolder;
				s.personNotesFolder = this.settings.peopleFolder;
				s.groupNotesFolder = this.settings.groupsFolder;
				s.personNotesTag = "person";
				s.groupNotesTag = "group";
				s.identityTypePropertyName = "type";
				s.personTypeValue = "person";
				s.groupTypeValue = "group";
				s.autoSetCreator = true;
				s.creatorFieldName = "creator";
				s.assigneeFieldName = "assignee";
				s.enableBases = true;
				s.enableBulkActionsButton = true;
				s.enableNotifications = true;
				s.enableUniversalBasesButtons = true;
				s.fieldMapping = {
					title: "title", status: "status", priority: "priority",
					due: "due", scheduled: "scheduled", contexts: "contexts",
					projects: "projects", timeEstimate: "timeEstimate",
					completedDate: "completedDate", dateCreated: "dateCreated",
					dateModified: "dateModified", recurrence: "recurrence",
					recurrenceAnchor: "recurrence_anchor", archiveTag: "archived",
					timeEntries: "timeEntries", completeInstances: "complete_instances",
					skippedInstances: "skipped_instances", blockedBy: "blockedBy",
					pomodoros: "pomodoros", icsEventId: "icsEventId",
					icsEventTag: "ics_event", googleCalendarEventId: "googleCalendarEventId",
					reminders: "reminders",
				};
				await tn.saveSettings();

				// Step 2: Clean and regenerate
				const ctx = buildContextFromTaskNotes(this.app);
				const gen = new TestDataGenerator(this.app, this.settings, ctx);
				new Notice("Setting up test environment...");
				try {
					await gen.cleanAll();
					const result = await gen.generateAll();
					new Notice(`Test environment ready!\nTaskNotes configured, ${result}`);
				} catch (e) {
					new Notice(`Error: ${e}`);
					console.error("Full test setup error:", e);
				}
			},
		});

		this.addSettingTab(new TestFixturesSettingTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
