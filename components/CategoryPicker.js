'use client';
import { useMemo, useState } from 'react';
import { TINTS, GROUPS, groupLabel, searchCategories, subLabel } from '../lib/seed';
import { t } from '../lib/i18n';

// One reusable service picker: search (typed or simulated voice) + popular
// first + grouped sections. Used by the seeker home / job post and by the
// service-first Karigar tab. Matching covers names in en/ro/ur AND the local
// `words` of every category, whatever the current UI language is.
const VOICE_SAMPLES = ['mujhe nal wala chahiye', 'bijli wala chahiye'];

export const catLabel = (c, lang) => (lang === 'ur' ? c.ur : lang === 'en' ? c.en : c.ro);

export default function CategoryPicker({ categories, lang, onPick, counts, selectedId, onEmptyAction }) {
  const [query, setQuery] = useState('');
  const [sampleIdx, setSampleIdx] = useState(0);
  const [voiceNote, setVoiceNote] = useState('');
  const active = useMemo(() => (categories || []).filter((c) => c.active), [categories]);
  const results = useMemo(() => (query.trim() ? searchCategories(active, query) : null), [query, active]);
  const popular = useMemo(
    () => active.filter((c) => c.popular).sort((a, b) => a.popular - b.popular),
    [active],
  );
  const idxOf = (c) => (categories || []).findIndex((x) => x.id === c.id);

  const tile = (c, matchedSub) => (
    <button
      key={c.id}
      className={`cat ${selectedId === c.id ? 'sel' : ''}`}
      style={{ background: TINTS[Math.max(0, idxOf(c)) % TINTS.length] }}
      onClick={() => onPick(c)}
    >
      <span className="ic">{c.icon}</span><b>{catLabel(c, lang)}</b>
      {matchedSub && <span className="cat-sub">{subLabel(matchedSub, lang)}</span>}
      {counts && <span className="cat-count">{counts[c.id] || 0} karigar</span>}
    </button>
  );

  // Simulated voice search: fill a sample phrase and match it through the
  // same words search — a single strong winner is picked straight away.
  const micTap = () => {
    const phrase = VOICE_SAMPLES[sampleIdx % VOICE_SAMPLES.length];
    setSampleIdx(sampleIdx + 1);
    setQuery(phrase);
    const res = searchCategories(active, phrase);
    if (res.length && res[0].score >= 3 && (res.length === 1 || res[1].score < res[0].score)) {
      setVoiceNote(`🎙️ “${phrase}” — ${catLabel(res[0].cat, lang)} mil gaya ✓`);
      setTimeout(() => onPick(res[0].cat), 500);
    } else {
      setVoiceNote(`🎙️ “${phrase}”`);
    }
  };

  return (
    <>
      <div className="search-bar">
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setVoiceNote(''); }}
          placeholder={t(lang, 'searchPh')}
          aria-label={t(lang, 'searchPh')}
        />
        {query && (
          <button className="search-mic" style={{ background: 'var(--surface)', border: '1.5px solid var(--line)' }} onClick={() => setQuery('')} aria-label="Search saaf karein">✕</button>
        )}
        <button className="search-mic" onClick={micTap} aria-label="Bol kar search karein">🎙️</button>
      </div>
      {voiceNote && <p className="voice-note-line" aria-live="polite">{voiceNote}</p>}

      {results ? (
        results.length === 0 ? (
          <div className="card empty">
            <div className="ei">🔍</div>
            <p className="muted">{t(lang, 'noCat')}</p>
            {onEmptyAction && <button className="btn btn-primary" onClick={onEmptyAction}>🎙️ {t(lang, 'postJob')}</button>}
          </div>
        ) : (
          <div className="cat-grid">{results.map((r) => tile(r.cat, r.matchedSub))}</div>
        )
      ) : (
        <>
          {popular.length > 0 && (
            <>
              <h3 className="cat-group-title" style={{ marginTop: 8 }}>{t(lang, 'popularSec')}</h3>
              <div className="cat-grid">{popular.map(tile)}</div>
            </>
          )}
          {GROUPS.map((g) => {
            const inGroup = active.filter((c) => c.group === g.id);
            if (!inGroup.length) return null;
            return (
              <div key={g.id}>
                <h3 className="cat-group-title">{groupLabel(g.id, lang)}</h3>
                <div className="cat-grid">{inGroup.map(tile)}</div>
              </div>
            );
          })}
        </>
      )}
    </>
  );
}
