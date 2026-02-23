# TaskNotes Test Fixtures

A testing harness plugin for [TaskNotes](https://github.com/callumalpass/tasknotes) development. Generates realistic test data, configures TaskNotes settings, and provides one-button environment setup. The fixture data evolves with TaskNotes -- modify `src/main.ts` to add new data shapes, test scenarios, or custom commands for whatever you're testing.

## Current fixtures

The default data set covers the major TaskNotes features. These are starting points -- fork and customize for your testing needs:

- **People and groups** -- person notes with roles/departments, group notes with nested membership
- **Documents** -- across 10 subdirectories with review dates, owners, and version tracking
- **Tasks** -- overdue, due today, recurring, completed, backlog, parent/subtask hierarchies, dependencies, reminders, time tracking
- **Demo .base views** -- every TaskNotes view type: task lists, kanban, calendars, notifications, bulk operations, statistics, shared vault workflows

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

## TaskNotes integration

When TaskNotes is installed and enabled, the test-fixtures plugin reads its live settings to generate data that matches your configuration -- property names, field mappings, identity settings, and tags all come from TaskNotes automatically. If TaskNotes is not installed, sensible defaults are used.

The "Full test setup" command goes further: it configures TaskNotes settings to match the test data, so you get a working test environment in one step. Your previous settings are backed up and can be restored at any time.

## Commands

Open the command palette (Ctrl/Cmd+P) and search for:

| Command | Description |
|---------|-------------|
| **Generate all test data** | Creates/updates files, skipping unchanged ones |
| **Sync test data** | Writes changed files + removes stale files not in fixture set |
| **Remove all generated test data** | Deletes all generated files without regenerating |
| **Full test setup (configure + generate)** | Configures TaskNotes settings, then syncs all test data |
| **Configure TaskNotes settings for test data** | Backs up current settings, applies test-friendly config |
| **Restore TaskNotes settings from backup** | Restores your original TaskNotes settings |

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
bun install        # or: npm install
bun run dev        # Watch mode
bun run build      # Production build
```

## License

MIT
