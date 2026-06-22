#!/usr/bin/env node

const { Anthropic } = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const VAULT_PATH = path.resolve(__dirname, '../..');
const DAILY_PATH = path.join(VAULT_PATH, 'Journal', 'Daily');
const SUMMARIES_PATH = path.join(VAULT_PATH, 'Journal', 'Summaries');

const args = process.argv.slice(2);

function formatDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseLocalDate(str) {
  return new Date(str + 'T00:00:00');
}

function formatDisplayDate(str) {
  return parseLocalDate(str).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric'
  });
}

function getISOWeek(d) {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

function formatWeekLabel(fromStr, toStr) {
  const weeks = new Set();
  const cursor = new Date(parseLocalDate(fromStr));
  const end = parseLocalDate(toStr);
  while (cursor <= end) {
    weeks.add(getISOWeek(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  const sorted = [...weeks].sort((a, b) => a - b);

  if (sorted.length === 1) return `Vecka ${sorted[0]}`;

  const isConsecutive = sorted.every((w, i) => i === 0 || w === sorted[i - 1] + 1);
  if (isConsecutive) return `Veckor ${sorted[0]}-${sorted[sorted.length - 1]}`;

  const last = sorted[sorted.length - 1];
  return `Vecka ${sorted.slice(0, -1).join(', ')} & ${last}`;
}

function getMostRecentMonday(from) {
  const d = new Date(from);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function getLastWeekRange() {
  const today = new Date();
  const thisMonday = getMostRecentMonday(today);
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);
  const lastFriday = new Date(lastMonday);
  lastFriday.setDate(lastMonday.getDate() + 4);
  return { from: formatDate(lastMonday), to: formatDate(lastFriday) };
}

function getThisWeekRange() {
  const today = new Date();
  const thisMonday = getMostRecentMonday(today);
  return { from: formatDate(thisMonday), to: formatDate(today) };
}

function getWeeksRange(n) {
  const today = new Date();
  const thisMonday = getMostRecentMonday(today);
  const from = new Date(thisMonday);
  from.setDate(thisMonday.getDate() - n * 7);
  const to = new Date(thisMonday);
  to.setDate(thisMonday.getDate() - 1);
  return { from: formatDate(from), to: formatDate(to) };
}

function printUsage() {
  console.error([
    'Usage:',
    '  journal-summary --this-week',
    '  journal-summary --last-week',
    '  journal-summary --weeks <n>',
    '  journal-summary --from YYYY-MM-DD --to YYYY-MM-DD',
  ].join('\n'));
  process.exit(1);
}

let range;
if (args.includes('--this-week')) {
  range = getThisWeekRange();
} else if (args.includes('--last-week')) {
  range = getLastWeekRange();
} else if (args.includes('--weeks')) {
  const idx = args.indexOf('--weeks');
  const n = parseInt(args[idx + 1], 10);
  if (isNaN(n) || n < 1) { console.error('--weeks requires a positive integer'); process.exit(1); }
  range = getWeeksRange(n);
} else if (args.includes('--from') && args.includes('--to')) {
  range = {
    from: args[args.indexOf('--from') + 1],
    to: args[args.indexOf('--to') + 1],
  };
} else {
  printUsage();
}

const fromDate = parseLocalDate(range.from);
const toDate = parseLocalDate(range.to);
const weekLabel = formatWeekLabel(range.from, range.to);
const useWeekFilename = args.includes('--this-week');

// Find a daily note file by date prefix (handles both old YYYY-MM-DD.md
// and new "YYYY-MM-DD • Vecka N.md" naming)
const dailyFiles = fs.existsSync(DAILY_PATH) ? fs.readdirSync(DAILY_PATH) : [];
function findDailyNote(dateStr) {
  const match = dailyFiles.find(f => f.startsWith(dateStr));
  return match ? path.join(DAILY_PATH, match) : null;
}

const entries = [];
const cursor = new Date(fromDate);
while (cursor <= toDate) {
  const dateStr = formatDate(cursor);
  const filepath = findDailyNote(dateStr);
  if (filepath) {
    const raw = fs.readFileSync(filepath, 'utf-8').trim();
    const bodyOnly = raw.replace(/^#[^\n]*\n?/, '').trim();
    const hasContent = bodyOnly.replace(/^##[^\n]*$/gm, '').trim().length > 0;
    if (hasContent) {
      entries.push({ date: dateStr, content: raw });
    }
  }
  cursor.setDate(cursor.getDate() + 1);
}

if (entries.length === 0) {
  console.log(`No journal entries found between ${range.from} and ${range.to}.`);
  process.exit(0);
}

console.log(`Summarizing ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} (${range.from} → ${range.to}, ${weekLabel})...`);

const entriesText = entries
  .map(e => `### ${e.date}\n${e.content}`)
  .join('\n\n---\n\n');

const prompt = `You are summarizing a work journal. Below are daily entries from ${range.from} to ${range.to}.

Write a concise, well-structured summary using this exact markdown format:

# Summary: ${formatDisplayDate(range.from)} – ${formatDisplayDate(range.to)} • ${weekLabel}

## Overview
[2-3 sentence narrative of the period]

## Key themes
- ...

## Notable wins
- ...

## Recurring challenges
- ...

## Looking ahead
[Anything flagged under "Tomorrow" across the entries. Omit this section entirely if nothing was flagged.]

---

Journal entries:

${entriesText}`;

async function main() {
  const client = new Anthropic();

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const summary = message.content[0].text;

  fs.mkdirSync(SUMMARIES_PATH, { recursive: true });
  const filename = useWeekFilename
    ? `${fromDate.getFullYear()} • ${weekLabel}.md`
    : `${range.from} to ${range.to} • ${weekLabel}.md`;
  const summaryPath = path.join(SUMMARIES_PATH, filename);
  fs.writeFileSync(summaryPath, summary);

  console.log(`Saved: Journal/Summaries/${filename}`);

  const vaultName = path.basename(VAULT_PATH);
  const obsidianFile = `Journal/Summaries/${filename}`;
  const url = `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(obsidianFile)}`;
  const opener = process.platform === 'linux' ? 'xdg-open' : 'open';
  execSync(`${opener} "${url}"`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
