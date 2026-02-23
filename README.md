# TaskNotes Test Fixtures

An Obsidian plugin that generates test data for [TaskNotes](https://github.com/callumalpass/tasknotes) development and testing. Install it alongside TaskNotes in your dev vault to quickly populate realistic test content.

## What it generates

- **7 person notes** (User-DB/People/) -- developers, analysts, managers with roles, departments, and contact info
- **5 group notes** (User-DB/Groups/) -- teams with nested membership (Engineering, Security, Product, All Staff, Core Reviewers)
- **45 document notes** (Document Library, Knowledge/) -- across 10 subdirectories (Projects, Compliance, Technical, HR, Meeting Notes, Research, Templates, Design, Operations, Security) with review dates, owners, and version tracking
- **50 task notes** (TaskNotes/Tasks/) -- with varied states: overdue, due today, due this week, recurring, completed, backlog, parent/subtask hierarchies, dependencies, reminders, time tracking
- **18 demo .base views** (TaskNotes/Demos/) -- showcasing every TaskNotes view type: task lists, kanban boards, calendars, notifications, bulk operations, statistics, time tracking, shared vault workflows

## Installation

### Via BRAT (recommended)

1. Install the [BRAT](https://github.com/TfTHacker/obsidian42-brat) community plugin
2. Add beta plugin: `cybersader/tasknotes-test-fixtures`
3. Enable the plugin in Settings > Community Plugins

### Manual

1. Download `main.js` and `manifest.json` from the [latest release](https://github.com/cybersader/tasknotes-test-fixtures/releases)
2. Create `.obsidian/plugins/tasknotes-test-fixtures/` in your vault
3. Place both files there
4. Enable the plugin

## Commands

Open the command palette (Ctrl/Cmd+P) and search for:

| Command | Description |
|---------|-------------|
| **Generate all test data** | Creates all files (overwrites existing generated files) |
| **Clean and regenerate all test data** | Deletes all generated files, then creates fresh ones |
| **Remove all generated test data** | Deletes all generated files without regenerating |

## Settings

Customize output folder paths in Settings > TaskNotes Test Fixtures:

| Setting | Default |
|---------|---------|
| People folder | `User-DB/People` |
| Groups folder | `User-DB/Groups` |
| Documents folder | `Document Library, Knowledge` |
| Tasks folder | `TaskNotes/Tasks` |
| Demos folder | `TaskNotes/Demos` |

## Development

```bash
npm install
npm run dev    # Watch mode
npm run build  # Production build
```

## License

MIT
