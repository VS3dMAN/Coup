#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const gameId = process.argv[2];
if (!gameId) {
    console.error('Usage: node scripts/pull-logs.mjs <gameId>');
    process.exit(1);
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars before running.');
    process.exit(1);
}

const supabase = createClient(url, key);

const { data: game, error: gameErr } = await supabase
    .from('games').select('*').eq('id', gameId).single();
if (gameErr) { console.error('Game not found:', gameErr.message); process.exit(1); }

const { data: players, error: playersErr } = await supabase
    .from('players').select('*').eq('game_id', gameId).order('seat');
if (playersErr) { console.error('Players fetch error:', playersErr.message); process.exit(1); }

const { data: events, error: eventsErr } = await supabase
    .from('events').select('*').eq('game_id', gameId).order('ts');
if (eventsErr) { console.error('Events fetch error:', eventsErr.message); process.exit(1); }

const lines = [
    `=== GAME ${gameId} ===`,
    `Started:  ${game.created_at}`,
    `Ended:    ${game.ended_at ?? 'still active'}`,
    `Players:  ${game.player_count}`,
    `End:      ${game.end_reason ?? '-'}`,
    '',
    'Players:',
    ...players.map(p => `  [${p.seat}] ${p.name} (${p.player_id})`),
    '',
    'Events:',
    ...events.map(e => {
        const ts = new Date(e.ts).toISOString().replace('T', ' ').slice(0, 23);
        const payload = e.payload ? ' ' + JSON.stringify(e.payload) : '';
        return `  ${ts}  ${String(e.phase ?? '-').padEnd(30)}  ${String(e.actor ?? '-').padEnd(20)}  ${e.kind}${payload}`;
    }),
];

const __dirname = dirname(fileURLToPath(import.meta.url));
const logsDir = join(__dirname, '..', 'logs');
mkdirSync(logsDir, { recursive: true });
const outPath = join(logsDir, `${gameId}.txt`);
writeFileSync(outPath, lines.join('\n') + '\n');
console.log(`Written: ${outPath}  (${events.length} events)`);
