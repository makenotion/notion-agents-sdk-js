# Notion Agents CLI

An interactive terminal-based chat interface for Notion Custom Agents. Provides a collaborative chat experience with streaming responses, agent switching, and conversation persistence.

## Features

- **Interactive chat interface** with real-time streaming responses
- **Agent switching** - Switch between different Notion agents on the fly
- **Conversation persistence** - Resume previous conversations across sessions
- **First-run setup** - Automatic configuration on first launch
- **Slash commands** for quick actions
- **Beautiful terminal UI** powered by Ink (React for CLIs)

## Installation

From the `examples/cli-tool` directory:

```bash
npm install
```

## Usage

Start the CLI tool:

```bash
npm start
```

Or run directly with npx:

```bash
npx tsx cli.tsx
```

### First-time setup

On first run, you'll be prompted to enter:

1. Your Notion API token
2. API base URL (press Enter to use the default production URL)
3. The CLI will verify your credentials and display your workspace information

These settings are saved in `config.json` (gitignored) for future sessions.

If you have a `.env` file in the repository root with `NOTION_API_TOKEN` and/or `NOTION_BASE_URL`, those values will be pre-populated in the setup wizard.

### Getting a Notion API token

1. Go to Notion Settings & Members → Connections → Develop or manage integrations
2. Create a new internal integration or use an existing one
3. Copy the "Internal Integration Secret" token
4. Make sure your integration has access to Custom Agents

## Commands

While chatting, you can use these slash commands:

- `/switch` - Switch to a different agent (resets conversation)
- `/reconfigure` or `/config` - Change API settings (token, base URL)
- `/exit` or `/quit` - Exit the CLI tool gracefully

## Features in detail

### Workspace information

On every launch, the CLI displays your workspace and bot details in a gray-bordered box below the agent information. This helps you verify you're connected to the correct workspace.

### Streaming responses

Messages from agents stream in real-time as they're generated, providing immediate feedback.

### Agent switching

Use `/switch` to bring up an agent selector. Navigate with arrow keys and press Enter to switch agents. Switching agents starts a fresh conversation.

### Conversation persistence

The CLI remembers:

- Your last used agent (auto-selected on startup)
- Your last conversation thread

On startup, if a previous thread exists, you'll be prompted to continue it. Press `y` to resume or `n` to start fresh.

### Configuration

Settings are stored in `config.json` in the same directory:

```json
{
  "apiToken": "your_token_here",
  "baseUrl": "https://api.notion.com",
  "lastAgentId": "agent_id",
  "lastThreadId": "thread_id"
}
```

You can manually edit this file if needed.

## Keyboard shortcuts

- **Enter** - Send message or confirm selection
- **Up/Down arrows** - Navigate agent list (in agent selector mode)
- **Ctrl+C** - Force quit (or use `/exit` for graceful exit)

## Troubleshooting

### "No agents found"

Make sure you have created at least one Custom Agent in your Notion workspace and that your integration has access to it.

### Connection errors

Verify that:

- Your API token is valid
- Your integration has the required permissions
- The base URL is correct (default: https://api.notion.com)

### Reset configuration

Delete `config.json` to reset all settings and go through setup again.

## Development

The CLI is built with:

- **Ink** - React-based terminal UI framework
- **React** - Component-based UI
- **@notionhq/agents-client** - Notion Agents SDK

The main application code is in `cli.tsx`.
