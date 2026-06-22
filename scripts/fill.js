#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const VAULT_PATH = path.resolve(__dirname, '../..');
const DAILY_PATH = path.join(VAULT_PATH, 'Journal', 'Daily');
const TEMPLATE_PATH = path.join(VAULT_PATH, 'Journal', 'Templates', 'Daily Note.md');

const args = process.argv.slice(2);

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function formatDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseLocalDate(str) {
  return new Date(str + 'T00:00:00');
}

function formatDisplayDate(d) {
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()} ${d.getFullYear()}`;
}

function getISOWeek(d) {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

function getMostRecentMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  return date;
}

function printUsage() {
  console.error([
    'Usage:',
    '  journal-fill                fill from oldest existing note up to today',
    '  journal-fill --last-week    fill missing notes for last week (Mon–Fri)',
    '  journal-fill --weeks <n>    fill missing notes for the last n weeks',
  ].join('\n'));
  process.exit(1);
}

const existingFiles = fs.existsSync(DAILY_PATH) ? fs.readdirSync(DAILY_PATH) : [];

function noteExists(dateStr) {
  return existingFiles.some(f => f.startsWith(dateStr));
}

function getDefaultFrom() {
  const dates = existingFiles
    .map(f => f.match(/^(\d{4}-\d{2}-\d{2})/))
    .filter(Boolean)
    .map(m => m[1])
    .sort();
  if (dates.length === 0) return getMostRecentMonday(new Date());
  return getMostRecentMonday(parseLocalDate(dates[0]));
}

let fromDate, toDate;
const today = new Date();

if (args.includes('--last-week')) {
  const thisMonday = getMostRecentMonday(today);
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);
  fromDate = lastMonday;
  toDate = new Date(lastMonday);
  toDate.setDate(lastMonday.getDate() + 4);
} else if (args.includes('--weeks')) {
  const idx = args.indexOf('--weeks');
  const n = parseInt(args[idx + 1], 10);
  if (isNaN(n) || n < 1) { console.error('--weeks requires a positive integer'); process.exit(1); }
  const thisMonday = getMostRecentMonday(today);
  fromDate = new Date(thisMonday);
  fromDate.setDate(thisMonday.getDate() - n * 7);
  toDate = today;
} else if (args.length === 0) {
  fromDate = getDefaultFrom();
  toDate = today;
} else {
  printUsage();
}

const template = fs.existsSync(TEMPLATE_PATH)
  ? fs.readFileSync(TEMPLATE_PATH, 'utf-8')
  : '# {{date:dddd, MMMM D YYYY}}\n\n## What happened\n\n## Wins\n\n## Challenges\n\n## Tomorrow\n';

fs.mkdirSync(DAILY_PATH, { recursive: true });

const cursor = new Date(fromDate);
let created = 0;
let skipped = 0;

while (cursor <= toDate) {
  const dayOfWeek = cursor.getDay();
  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    const dateStr = formatDate(cursor);
    if (!noteExists(dateStr)) {
      const week = getISOWeek(cursor);
      const filename = `${dateStr} • Vecka ${week}.md`;
      const content = template.replace('{{date:dddd, MMMM D YYYY}}', formatDisplayDate(cursor));
      fs.writeFileSync(path.join(DAILY_PATH, filename), content);
      console.log(`Created: ${filename}`);
      created++;
    } else {
      skipped++;
    }
  }
  cursor.setDate(cursor.getDate() + 1);
}

if (created === 0) {
  console.log(`No missing entries found — all weekdays already have notes (${skipped} existing).`);
} else {
  console.log(`\nDone: ${created} note${created === 1 ? '' : 's'} created, ${skipped} already existed.`);
}
