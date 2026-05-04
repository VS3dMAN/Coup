import { supabase } from './supabase.js';

const BUFFER_CAP = 500;
const buffer = [];
const lastActivity = new Map();

export function logEvent({ gameId, kind, actor = null, phase = null, turn = null, payload = null }) {
    if (!supabase) return;

    const entry = { game_id: gameId, kind, actor, phase, turn, payload };

    if (buffer.length >= BUFFER_CAP) {
        const dropIdx = buffer.findIndex(e => e.kind !== 'error');
        if (dropIdx !== -1) buffer.splice(dropIdx, 1);
        else buffer.shift();
    }

    buffer.push(entry);

    if (gameId) lastActivity.set(gameId, Date.now());
}

export function getLastActivity(gameId) {
    return lastActivity.get(gameId) ?? null;
}

export function clearLastActivity(gameId) {
    lastActivity.delete(gameId);
}

async function flush() {
    if (!supabase || buffer.length === 0) return;
    const rows = buffer.splice(0, buffer.length);
    try {
        const { error } = await supabase.from('events').insert(rows);
        if (error) console.error('[logger] flush error:', error.message);
    } catch (err) {
        console.error('[logger] flush exception:', err.message);
    }
}

export async function flushSync() {
    await flush();
}

setInterval(flush, 1000);
