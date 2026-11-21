'use client';
import { useEffect, useRef, useState } from 'react';
import { OBQ, MAX_SERVICES, MAX_SERVICES_MSG, obAnswerText } from './Onboarding';
import { toggleService } from '../lib/seed';
import { t, p } from '../lib/i18n';
import SelfieStep from './SelfieStep';

// Provider signup as a WhatsApp-style chat (Midnight & Brass colours — no
// WhatsApp green). Servio asks the same 6 onboarding questions as chat
// bubbles, one by one, after a short typing indicator. Answers come from
// option chips above the input bar, typed text (name / charges), or the
// brass mic (simulated voice answers, shown as voice-note bubbles).
// After the 6 answers the chat asks for the selfie (the existing SelfieStep,
// hard gate: no face = no account), shows the cropped photo as a chat image,
// and hands over to the AI profile card — the summary/fix step.
const SELFIE_PROMPT = { ur: 'اب ایک سیلفی لیں — چہرہ تصدیق کرنے کے لیے 📷', ro: 'Ab ek selfie lein — chehra verify karne ke liye 📷', en: 'Now take a selfie — to verify your face 📷' };
const SELFIE_OK = { ur: '✓ چہرہ تصدیق ہو گیا', ro: '✓ Chehra verify ho gaya', en: '✓ Face verified' };
const PROFILE_READY = { ur: 'پروفائل تیار ہے — ایک دفعہ چیک کر لیں', ro: 'Profile tayyar hai — ek dafa check kar lein', en: 'Your profile is ready — check it once' };

const qText = (q, lang) => (lang === 'ur' ? q.q.ur : lang === 'en' ? q.q.en : q.q.roman);
const catLabel = (c, lang) => (lang === 'ur' ? c.ur : lang === 'en' ? c.en : c.ro);
const pick = (obj, lang) => obj[lang] || obj.ro;

export default function ChatOnboarding({ lang, categories, areas, profile, onChange, photo, onSelfie, onShowProfile, onBack }) {
  // Returning from the profile card: name + work are already answered, so the
  // transcript is rebuilt from the saved answers instead of re-asking.
  const resumed = !!(profile.name && (profile.work || []).length);
  const idRef = useRef(0);
  const nid = () => ++idRef.current;

  const buildTranscript = () => {
    const msgs = [];
    OBQ.forEach((q) => {
      msgs.push({ id: nid(), from: 'servio', kind: 'text', text: `${q.icon} ${qText(q, lang)}` });
      msgs.push({ id: nid(), from: 'me', kind: 'text', text: obAnswerText(profile, q.key, lang, categories) || '—' });
    });
    msgs.push({ id: nid(), from: 'servio', kind: 'text', text: pick(SELFIE_PROMPT, lang) });
    if (photo) {
      msgs.push({ id: nid(), from: 'me', kind: 'photo', src: photo });
      msgs.push({ id: nid(), from: 'servio', kind: 'text', text: pick(SELFIE_OK, lang) });
      msgs.push({ id: nid(), from: 'servio', kind: 'action', action: 'profile', text: pick(PROFILE_READY, lang), btn: `✓ ${lang === 'en' ? 'See Profile' : 'Profile Dekhein'}` });
    } else {
      msgs.push({ id: nid(), from: 'servio', kind: 'action', action: 'selfie', btn: '📷 Selfie Lein' });
    }
    return msgs;
  };

  const [messages, setMessages] = useState(() => (resumed ? buildTranscript() : []));
  const [step, setStep] = useState(() => (resumed ? 6 : 0));
  const [phase, setPhase] = useState(() => (resumed ? (photo ? 'verified' : 'selfiePrompt') : 'typing'));
  const [text, setText] = useState('');
  const [limitMsg, setLimitMsg] = useState('');
  const [hint, setHint] = useState('');
  const bottomRef = useRef(null);

  const pushMsg = (m) => setMessages((ms) => [...ms, { id: nid(), ...m }]);

  // Typing indicator, then the question bubble lands.
  useEffect(() => {
    if (phase !== 'typing') return undefined;
    const id = setTimeout(() => {
      pushMsg({ from: 'servio', kind: 'text', text: `${OBQ[step].icon} ${qText(OBQ[step], lang)}` });
      setPhase('ask');
    }, 650);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, step]);

  // Keep the newest bubble in view.
  useEffect(() => {
    const id = setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 60);
    return () => clearTimeout(id);
  }, [messages, phase]);

  const advance = (patch, bubble) => {
    onChange(patch);
    if (bubble) pushMsg(bubble);
    setLimitMsg(''); setHint('');
    if (step < 5) { setStep(step + 1); setPhase('typing'); } else {
      pushMsg({ from: 'servio', kind: 'text', text: pick(SELFIE_PROMPT, lang) });
      pushMsg({ from: 'servio', kind: 'action', action: 'selfie', btn: '📷 Selfie Lein' });
      setPhase('selfiePrompt');
    }
  };

  const q = OBQ[Math.min(step, 5)];

  const sendText = () => {
    const val = text.trim();
    if (!val) return;
    if (q.key === 'name') { setText(''); advance({ name: val }, { from: 'me', kind: 'text', text: val }); return; }
    if (q.key === 'charges') {
      const label = /^\d+$/.test(val) ? 'PKR ' + Number(val).toLocaleString() : val;
      setText(''); advance({ charges: label }, { from: 'me', kind: 'text', text: label }); return;
    }
    setHint(t(lang, 'pickAbove'));
  };

  // Mic = the prototype's simulated answer for this question, delivered as a
  // voice-note bubble. For the two multi-select questions it adds the sample
  // to the selection; the user still confirms with "Ho gaya ✓".
  const micTap = () => {
    if (phase !== 'ask') return;
    setHint('');
    if (q.key === 'name') { advance({ name: q.sample }, { from: 'me', kind: 'voice' }); return; }
    if (q.key === 'work') {
      const c = categories.find((x) => x.en === q.sample);
      if (c && !(profile.work || []).includes(c.id)) {
        const r = toggleService(profile.work, c.id, MAX_SERVICES);
        if (r.limited) { setLimitMsg(MAX_SERVICES_MSG[lang] || MAX_SERVICES_MSG.ro); return; }
        onChange({ work: r.selected });
      }
      pushMsg({ from: 'me', kind: 'voice' });
      return;
    }
    if (q.key === 'areas') {
      if (areas.includes(q.sample) && !(profile.areas || []).includes(q.sample)) {
        onChange({ areas: [...(profile.areas || []), q.sample] });
      }
      pushMsg({ from: 'me', kind: 'voice' });
      return;
    }
    if (q.key === 'exp' || q.key === 'charges') { advance({ [q.key]: q.sample }, { from: 'me', kind: 'voice' }); }
  };

  const toggleWork = (id) => {
    const r = toggleService(profile.work, id, MAX_SERVICES);
    if (r.limited) { setLimitMsg(MAX_SERVICES_MSG[lang] || MAX_SERVICES_MSG.ro); return; }
    setLimitMsg('');
    onChange({ work: r.selected });
  };
  const toggleArea = (a) => {
    const has = (profile.areas || []).includes(a);
    onChange({ areas: has ? profile.areas.filter((x) => x !== a) : [...(profile.areas || []), a] });
  };
  const doneMulti = () => {
    if (q.key === 'work' && !(profile.work || []).length) { setHint(t(lang, 'pickAbove')); return; }
    advance({}, { from: 'me', kind: 'text', text: obAnswerText(profile, q.key, lang, categories) || '—' });
  };

  const selfieDone = (url) => {
    onSelfie(url);
    pushMsg({ from: 'me', kind: 'photo', src: url });
    pushMsg({ from: 'servio', kind: 'text', text: pick(SELFIE_OK, lang) });
    pushMsg({ from: 'servio', kind: 'action', action: 'profile', text: pick(PROFILE_READY, lang), btn: `✓ ${lang === 'en' ? 'See Profile' : 'Profile Dekhein'}` });
    setPhase('verified');
  };

  if (phase === 'selfie') {
    return <SelfieStep lang={lang} onDone={selfieDone} onBack={() => setPhase('selfiePrompt')} />;
  }

  const inChat = phase === 'ask' || phase === 'typing';
  const progressPct = phase === 'selfiePrompt' || phase === 'verified' ? 100 : Math.round(((step + (phase === 'ask' ? 1 : 0)) / 6) * 100);

  return (
    <>
      <button className="backlink" onClick={onBack}>← {p(lang, 'back')}</button>
      <div className="chat-progress" aria-live="polite">
        {inChat ? `${t(lang, 'sawal')} ${Math.min(step + 1, 6)} / 6` : (lang === 'en' ? 'Last step — Selfie 📷' : 'Aakhri step — Selfie 📷')}
        <span className="chat-progbar"><i style={{ width: `${progressPct}%` }}></i></span>
      </div>

      <div className="chat-scroll">
        {messages.map((m) => {
          if (m.from === 'servio') {
            return (
              <div className="chat-row" key={m.id}>
                <span className="chat-avatar" aria-hidden="true">S</span>
                <div className="bubble in">
                  {m.text && <span>{m.text}</span>}
                  {m.kind === 'action' && m.action === 'selfie' && phase === 'selfiePrompt' && (
                    <button className="btn btn-amber bubble-btn" onClick={() => setPhase('selfie')}>{m.btn}</button>
                  )}
                  {m.kind === 'action' && m.action === 'profile' && (
                    <button className="btn btn-amber bubble-btn" onClick={onShowProfile}>{m.btn}</button>
                  )}
                </div>
              </div>
            );
          }
          if (m.kind === 'voice') {
            return (
              <div className="chat-row me" key={m.id}>
                <div className="bubble out voice">
                  <span className="vb-play">▶</span>
                  <span className="vb-bars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>
                  <span className="vb-dur">0:07</span>
                </div>
              </div>
            );
          }
          if (m.kind === 'photo') {
            return (
              <div className="chat-row me" key={m.id}>
                <div className="bubble out"><img className="chat-photo" src={m.src} alt="Verified selfie" /></div>
              </div>
            );
          }
          return (
            <div className="chat-row me" key={m.id}>
              <div className="bubble out">{m.text}</div>
            </div>
          );
        })}
        {phase === 'typing' && (
          <div className="chat-row">
            <span className="chat-avatar" aria-hidden="true">S</span>
            <div className="bubble in typing" aria-label="Servio likh raha hai"><i></i><i></i><i></i></div>
          </div>
        )}
        <div ref={bottomRef}></div>
      </div>

      {inChat && (
        <div className="chat-controls">
          {phase === 'ask' && q.type === 'cats' && (
            <>
              <p className="hold-hint" style={{ margin: '0 0 8px', textAlign: 'start' }}>{(profile.work || []).length} / {MAX_SERVICES} {lang === 'en' ? 'services' : 'kaam'}</p>
              <div className="chat-chips">
                {categories.map((c) => (
                  <button key={c.id} className={`pill ${(profile.work || []).includes(c.id) ? 'active' : ''}`} onClick={() => toggleWork(c.id)}>
                    {c.icon} {catLabel(c, lang)}
                  </button>
                ))}
                <button className="btn btn-amber chat-done" onClick={doneMulti}>{t(lang, 'donePick')}</button>
              </div>
            </>
          )}
          {phase === 'ask' && q.type === 'areas' && (
            <div className="chat-chips">
              {areas.map((a) => (
                <button key={a} className={`pill ${(profile.areas || []).includes(a) ? 'active' : ''}`} onClick={() => toggleArea(a)}>{a}</button>
              ))}
              <button className="btn btn-amber chat-done" onClick={doneMulti}>{t(lang, 'donePick')}</button>
            </div>
          )}
          {phase === 'ask' && q.type === 'chips' && (
            <div className="chat-chips">
              {q.options.map((o) => (
                <button key={o} className="pill" onClick={() => advance({ [q.key]: o }, { from: 'me', kind: 'text', text: o })}>{o}</button>
              ))}
            </div>
          )}
          {phase === 'ask' && q.type === 'avail' && (
            <div className="chat-chips">
              <button className="pill" onClick={() => advance({ avail: true }, { from: 'me', kind: 'text', text: lang === 'en' ? 'Yes — available' : 'Haan, available' })}>✓ {lang === 'en' ? 'Yes — available' : 'Haan, available'}</button>
              <button className="pill" onClick={() => advance({ avail: false }, { from: 'me', kind: 'text', text: lang === 'en' ? 'No' : 'Nahi' })}>✕ {lang === 'en' ? 'No' : 'Nahi'}</button>
            </div>
          )}
          {limitMsg && <div className="warn" role="alert">{limitMsg}</div>}
          {hint && !limitMsg && <p className="hold-hint" style={{ textAlign: 'start', margin: '0 0 8px' }}>{hint}</p>}
          <div className="chat-inputbar">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendText(); }}
              placeholder={t(lang, 'typeMsg')}
              aria-label={t(lang, 'typeMsg')}
            />
            {text.trim() ? (
              <button className="chat-round send" onClick={sendText} aria-label="Bhejein">➤</button>
            ) : q.type !== 'avail' ? (
              <button className="chat-round" onClick={micTap} aria-label="Bol kar jawab dein">🎙️</button>
            ) : (
              <button className="chat-round send" onClick={sendText} aria-label="Bhejein">➤</button>
            )}
          </div>
          <p className="hold-hint">{t(lang, 'holdHint')}</p>
        </div>
      )}
    </>
  );
}
