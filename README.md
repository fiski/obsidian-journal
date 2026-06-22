# Obsidian Work Journal

A daily work journal setup for [Obsidian](https://obsidian.md) with optional AI-powered summarization via the Claude API.

Write what happened during your workday. Summarize a week, the last 4 weeks, or any custom date range — with a single terminal command.

---

## Features

- Daily note template with light structure (What happened, Wins, Challenges, Tomorrow)
- Notes named by date and week number: `2026-05-13 • Vecka 20.md`
- `journal-summary` — AI-generated summaries for any date range
- `journal-fill` — creates missing notes for any weekday range you forgot to write
- Works on macOS and Linux

---

## Prerequisites

- [Obsidian](https://obsidian.md) (free)
- [Node.js](https://nodejs.org) v18 or later
- An Anthropic API key — only required for AI summarization (see [AI Summarization](#ai-summarization))

---

## Installation

### Option 1 — Install with Claude Code (recommended)

If you have [Claude Code](https://claude.ai/code) installed, paste the following prompt and it will set everything up for you:

```
I want to set up an Obsidian work journal using this GitHub repo: https://github.com/fiski/obsidian-journal

My Obsidian vault is located at: [YOUR VAULT PATH HERE]

Please:
1. Create a Journal/ folder inside my vault with Daily/, Summaries/, Templates/, and scripts/ subfolders
2. Copy the scripts from the repo (summarize.js, fill.js, package.json) into Journal/scripts/
3. Copy the template from templates/Daily Note.md into Journal/Templates/
4. Run npm install inside Journal/scripts/
5. Configure the Obsidian Daily Notes plugin by writing .obsidian/daily-notes.json with folder set to Journal/Daily, template set to Journal/Templates/Daily Note, and format YYYY-MM-DD [•] [Vecka] W
6. Configure the Obsidian Templates plugin by writing .obsidian/templates.json with folder set to Journal/Templates
7. Set up a hotkey Cmd+Shift+D for daily-notes:goto-today in .obsidian/hotkeys.json
8. Add journal-summary and journal-fill aliases to my ~/.zshrc pointing to the full node path and script paths
9. Add a placeholder ANTHROPIC_API_KEY= line to my ~/.zshrc

After setup, tell me what the full node path is so I can use it for the Obsidian Shell Commands plugin.
```

> Replace `[YOUR VAULT PATH HERE]` with the actual path to your vault before pasting.

---

### Option 2 — Manual installation

**1. Copy files into your vault**

Place the contents of this repo inside your vault like this:

```
YourVault/
└── Journal/
    ├── Daily/
    ├── Summaries/
    ├── Templates/
    │   └── Daily Note.md     ← copy from templates/
    └── scripts/
        ├── summarize.js      ← copy from scripts/
        ├── fill.js           ← copy from scripts/
        └── package.json      ← copy from scripts/
```

**2. Install dependencies**

```bash
cd YourVault/Journal/scripts
npm install
```

**3. Find your Node.js path**

```bash
which node
# example output: /opt/homebrew/bin/node
```

**4. Add aliases to your shell config**

Add these lines to your `~/.zshrc` (or `~/.bashrc` on Linux):

```bash
alias journal-summary="/opt/homebrew/bin/node '/path/to/YourVault/Journal/scripts/summarize.js'"
alias journal-fill="/opt/homebrew/bin/node '/path/to/YourVault/Journal/scripts/fill.js'"
```

Then reload: `source ~/.zshrc`

**5. Configure Obsidian**

Make sure these core plugins are enabled in Obsidian: **Daily Notes** and **Templates**.

Then create or update these files in your vault's `.obsidian/` folder:

`.obsidian/daily-notes.json`
```json
{
  "folder": "Journal/Daily",
  "template": "Journal/Templates/Daily Note",
  "format": "YYYY-MM-DD [•] [Vecka] W"
}
```

`.obsidian/templates.json`
```json
{
  "folder": "Journal/Templates"
}
```

Restart Obsidian to pick up the changes.

---

## Setting up hotkeys

### Daily note hotkey (Cmd+Shift+D)

In Obsidian: `Settings → Hotkeys` → search **"Open today's daily note"** → click `+` → press `Cmd+Shift+D`.

### Fill missing notes hotkey (Cmd+Shift+F)

This requires the [Shell Commands](https://obsidian.md/plugins?id=obsidian-shellcommands) community plugin.

1. Install **Shell Commands** from Obsidian's community plugin browser
2. Go to `Settings → Shell Commands → New shell command`
3. Enter the full command:
   ```
   /opt/homebrew/bin/node '/path/to/YourVault/Journal/scripts/fill.js'
   ```
   *(replace with your actual node path and vault path)*
4. Save, then go to `Settings → Hotkeys` → search the command → bind it to `Cmd+Shift+F`

---

## Daily journaling

Press `Cmd+Shift+D` to open today's note. It will be created automatically in `Journal/Daily/` with the template pre-filled:

```
# Wednesday, May 13 2026

## What happened

## Wins

## Challenges

## Tomorrow
```

All sections are optional — write what's relevant.

---

## Filling missing notes

If you forgot to write notes for some days, run:

```bash
# Fill all missing weekdays from your oldest note up to today
journal-fill

# Fill missing notes for just last week
journal-fill --last-week

# Fill missing notes for the last N weeks
journal-fill --weeks 4
```

Existing notes are never overwritten — only missing weekdays (Mon–Fri) are created.

---

## AI Summarization

> **Note:** Summarization uses the [Anthropic API](https://console.anthropic.com) (Claude). This costs money, but the amounts are very small — roughly $0.002–0.005 per summary using the Haiku model. A $5 credit will last months of regular use.

### Setup

1. Create an API key at [console.anthropic.com](https://console.anthropic.com)
2. Add it to your `~/.zshrc`:
   ```bash
   export ANTHROPIC_API_KEY="sk-ant-..."
   ```
3. Reload: `source ~/.zshrc`

### Usage

```bash
# Summarize this week so far
journal-summary --this-week

# Summarize last week (Mon–Fri)
journal-summary --last-week

# Summarize the last N weeks
journal-summary --weeks 4

# Custom date range
journal-summary --from 2026-04-01 --to 2026-04-30
```

Each summary is saved to `Journal/Summaries/` and opens automatically in Obsidian. Days with no content are skipped.

### Summary format

```
# Summary: May 4, 2026 – May 8, 2026 • Vecka 19

## Overview
...

## Key themes
- ...

## Notable wins
- ...

## Recurring challenges
- ...

## Looking ahead
...
```

---

## Folder structure

```
Journal/
├── Daily/          ← one .md file per workday (YYYY-MM-DD • Vecka N.md)
├── Summaries/      ← AI-generated summaries
├── Templates/
│   └── Daily Note.md
└── scripts/
    ├── package.json
    ├── summarize.js
    └── fill.js
```

---

## License

MIT
