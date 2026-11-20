'use client';
import { useEffect, useState } from 'react';
import { seedDB } from './seed';

export const DB_KEY = 'servio-db-v1';
export const SESSION_KEY = 'servio-session';
const BUS = 'servio-bus';

export function uid() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

function freshLoad() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* corrupted storage -> reseed */ }
  const db = seedDB();
  window.localStorage.setItem(DB_KEY, JSON.stringify(db));
  return db;
}

function broadcast() {
  try {
    const bc = new BroadcastChannel(BUS);
    bc.postMessage({ type: 'update', at: Date.now() });
    bc.close();
  } catch (e) { /* storage event is the fallback */ }
}

/** Run a mutation against a fresh copy of the shared store, persist + broadcast it.
 *  opts: { toast: string, toastFor: [userId...] | 'all' } — toast is also stored in
 *  db.lastEvent so tabs that only get the 'storage' event can still show it. */
export function transact(mutator, opts = {}) {
  if (typeof window === 'undefined') return null;
  const db = freshLoad();
  const result = mutator(db);
  if (opts.toast) {
    db.lastEvent = { id: uid(), toast: opts.toast, toastFor: opts.toastFor || 'all', at: Date.now() };
  }
  window.localStorage.setItem(DB_KEY, JSON.stringify(db));
  broadcast();
  window.dispatchEvent(new CustomEvent('servio-local-update'));
  return result;
}

/** React hook: returns the shared DB (null until mounted) and re-renders on
 *  local writes, BroadcastChannel messages and cross-tab 'storage' events. */
export function useServio() {
  const [db, setDb] = useState(null);
  useEffect(() => {
    const refresh = () => setDb(freshLoad());
    refresh();
    let bc = null;
    try { bc = new BroadcastChannel(BUS); bc.onmessage = refresh; } catch (e) { /* ignore */ }
    const onStorage = (e) => { if (e.key === DB_KEY) refresh(); };
    window.addEventListener('storage', onStorage);
    window.addEventListener('servio-local-update', refresh);
    return () => {
      if (bc) bc.close();
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('servio-local-update', refresh);
    };
  }, []);
  return db;
}

// ---- session ----
export function getSession() {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(window.localStorage.getItem(SESSION_KEY)); } catch (e) { return null; }
}
export function setSession(user) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id, role: user.role, name: user.name, phone: user.phone }));
}
export function clearSession() {
  if (typeof window !== 'undefined') window.localStorage.removeItem(SESSION_KEY);
}
export function resetDemoData() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(DB_KEY);
  window.localStorage.removeItem(SESSION_KEY);
  freshLoad();
  broadcast();
}

// ---- helpers usable inside a transact mutator ----
export function notify(db, userId, text) {
  db.notifications.unshift({ id: uid(), userId, text, read: false, at: Date.now() });
}
export function notifyAdmins(db, text) {
  db.users.filter((u) => u.role === 'admin').forEach((a) => notify(db, a.id, text));
}
export function logActivity(db, text) {
  db.activity.unshift({ id: uid(), text, at: Date.now() });
  db.activity = db.activity.slice(0, 60);
}

// ---- phone-number screening (PRD §13) ----
const PHONE_RE = /(\+92|0)3\d{2}[-\s]?\d{7}|(\+92|0)3\d{2}[-\s]?\d{3}[-\s]?\d{4}|\d{4}[-\s]\d{7}/g;
export function findPhone(text) {
  if (!text) return null;
  const m = String(text).match(PHONE_RE);
  return m ? m[0] : null;
}
export function stripPhone(text) {
  if (!text) return text;
  return String(text).replace(PHONE_RE, '[number removed]').replace(/\s+/g, ' ').trim();
}

// ---- the reveal rule (PRD §6.5): 5 coins, max 3 per job, no double charge ----
// Mutates db. Returns 'ok' | 'already' | 'full' | 'low' | 'suspended'
export function doReveal(db, { seekerId, providerId, jobId }) {
  const providerUser = db.users.find((u) => u.id === providerId);
  if (!providerUser || providerUser.status !== 'active') return 'suspended';
  const existing = db.reveals.find((r) => r.seekerId === seekerId && r.providerId === providerId && !r.refunded);
  if (existing) return 'already';
  const job = jobId ? db.jobs.find((j) => j.id === jobId) : null;
  if (job && job.revealCount >= 3) return 'full';
  const wallet = db.wallets[providerId];
  if (!wallet || wallet.balance < 5) return 'low';
  wallet.balance -= 5;
  wallet.txns.unshift({ id: uid(), type: 'reveal', amount: -5, note: 'Number shown to a seeker', at: Date.now() });
  db.reveals.unshift({ id: uid(), jobId: jobId || null, seekerId, providerId, coins: 5, at: Date.now(), refunded: false });
  if (job) job.revealCount += 1;
  const seeker = db.users.find((u) => u.id === seekerId);
  notify(db, providerId, `Your number was shown to ${seeker ? seeker.name : 'a seeker'} — 5 coins used.`);
  notifyAdmins(db, `Reveal: ${providerUser.name} number shown to ${seeker ? seeker.name : 'a seeker'} (5 coins).`);
  logActivity(db, `Reveal — ${providerUser.name} ↔ ${seeker ? seeker.name : 'seeker'} (5 coins)`);
  return 'ok';
}

export function userName(db, id) {
  const u = db.users.find((x) => x.id === id);
  return u ? u.name : 'User';
}
export function catName(db, id, lang = 'en') {
  const c = db.categories.find((x) => x.id === id);
  if (!c) return id;
  return lang === 'ur' ? c.ur : lang === 'ro' ? c.ro : c.en;
}
