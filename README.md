# Servio — Next.js App

Voice-first marketplace for local services in Depalpur and Okara, Pakistan.
Seekers post a job (free), providers bid (free). To get a number, the seeker
sends a **number request**; the provider pays **5 coins (PKR 50)** only when he
**accepts** the request and the numbers are exchanged. Max 3 reveals per job,
no double charge for the same seeker–provider pair, bad leads are refunded.

This is the deployable Next.js version of the Servio prototype: three
role-locked interfaces (Seeker, Provider, Admin) behind a login, all sharing
one browser `localStorage` store so multiple tabs update **in realtime**.

Identity: *Midnight & Brass* — midnight ink `#182234`, brass `#B9975B`, ivory
`#F7F3EC`, flat colours, serif headings, minimal text, big tap targets.

## Demo accounts

| Role     | Name         | Phone        | Login with      |
|----------|--------------|--------------|-----------------|
| Seeker   | Ayesha       | 0300-1111111 | OTP `1234`      |
| Provider | Rafiq Ahmed  | 0300-2222222 | OTP `1234` — Electrician, 40 coins |
| Provider | Bilal Hussain| 0300-3333333 | OTP `1234` — Plumber, only 3 coins (test the low-coins path) |
| Admin    | Admin        | 0300-9999999 | PIN `9999`      |

There is **one login for everyone** (phone + OTP `1234`; admin uses PIN
`9999`) — the account's role decides which interface opens. Demo accounts are
one tap on the login screen. Sign up starts with a choice — *"Aap kya karna
chahte hain?"*:

- **Seeker signup** ("Mujhe kaam karwana hai") — name + phone + OTP only.
  Nothing else.
- **Provider signup** ("Main karigar hoon — kaam chahiye") — name + phone +
  OTP, then the 6-step voice onboarding (name, work, areas, experience,
  visit charges, availability), then a **selfie verification** step, then the
  profile card → profile goes live with **40 starter coins**.
  - A provider can offer **at most 3 services** (work categories).
  - The selfie is checked with **real on-device face detection**
    (`@tensorflow-models/blazeface`, dynamically imported only on that step).
    No face detected → the photo is rejected and the account cannot be
    created. A detected face is **cropped to the face only** (~30% padding,
    256×256 JPEG data URL on `providers[id].photo`) so no background — and no
    phone number displayed in it — is ever saved. That cropped face becomes
    the provider's avatar everywhere. Production must re-verify server-side
    (face match + liveness); this is a demo gate.

## Run locally

```bash
npm install
npm run dev
# open http://localhost:3000
```

Production build check:

```bash
npm run build
npm start
```

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. In Vercel: **Add New → Project → Import** the repo.
3. Framework preset: **Next.js** (auto-detected). No environment variables
   are needed — just deploy.

## Realtime cross-tab testing

All state lives in one shared store (`localStorage` key `servio-db-v1`) and
every write broadcasts on `BroadcastChannel 'servio-bus'` (with the `storage`
event as fallback), so:

1. Open the app in **3 tabs** of the same browser.
2. Log in as **Ayesha (seeker)** in tab 1, **Rafiq (provider)** in tab 2 and
   **Admin** in tab 3.
3. Ayesha posts a job → Rafiq's jobs feed and the admin activity feed update
   instantly, with a toast.
4. Rafiq bids → Ayesha gets an alert and sees the bid.
5. Ayesha taps **Number Request Karein** → Rafiq sees the request at the top
   of his Jobs screen (no coins move yet). Rafiq taps **Accept** → 5 coins
   leave his wallet live, both sides see each other's number with Call /
   WhatsApp buttons, admin reveals count goes up. **Reject** charges nothing.
   If Rafiq's balance is under 5 coins, Accept fails with "Coins kam hain"
   and the request stays pending until he tops up.
6. Rafiq requests a top-up → admin approves → Rafiq's wallet updates live.

## Reset demo data

Use **Reset demo data** on the login screen or in the admin sidebar. It clears
the `servio-db-v1` store and your session, then re-seeds the demo data.

## Project structure

```
app/
  layout.js          Root layout + toast host
  page.js            Redirects to /login or the role home
  login/page.js      Unified login, demo accounts, signup choice, seeker signup,
                     provider onboarding + selfie gate
  seeker/page.js     Seeker interface: categories, post job, my jobs, bids,
                     number requests, rating
  provider/page.js   Provider interface: jobs feed, number requests (accept/reject),
                     bids, leads, refunds, wallet, top-up, profile + selfie
  admin/page.js      Admin panel: dashboard, top-ups, refunds, jobs, users, categories, numbers check
  globals.css        Midnight & Brass design system
lib/
  store.js           Shared localStorage store, useServio() hook, BroadcastChannel sync,
                     session, phone screening, reveal rule, number-request flow
                     (requestReveal / acceptRevealRequest / declineRevealRequest /
                     exchangeNumbers), legacy-DB migration (normalizeDB)
  seed.js            Demo data: users, providers, 10 PRD categories, areas, jobs, bids, wallets
  i18n.js            Urdu / Roman Urdu / English dictionary for main labels (Urdu = RTL)
components/
  AppHeader.js       Top bar (coin pill, language toggle) + role guard + language hooks
  BottomNav.js       Prototype floating bottom navigation
  Onboarding.js      6-step voice onboarding + AI profile card (max 3 services enforced)
  SelfieStep.js      Provider selfie verification: blazeface detection + face-only crop
  ui.js              Shared bits: ProviderAvatar (selfie photo or initial), dots, celebrate…
  ToastHost.js       Cross-tab toast notifications
```

## Coin rules (from the PRD)

- 1 coin = PKR 10. A number exchange costs the provider **5 coins (PKR 50)**.
- Coins move **only when the provider accepts** a seeker's number request
  (or taps Number himself on a job — his own choice to spend). Pending or
  declined requests never charge.
- Max **3 reveals per job** (accepted exchanges only); the same
  seeker–provider pair is never charged twice — a second exchange is free.
- Accepting with fewer than 5 coins fails ("Coins kam hain — pehle top up
  karein") and the request stays pending.
- Bad lead (wrong number / no answer / spam) reported within the app →
  **automatic +5 coin refund**, recorded for admin.
- Top-ups are manual: provider sends JazzCash/Easypaisa, enters the
  transaction reference, admin approves, coins are credited.

## Next steps for production

This build is a faithful, testable front-end with a browser store. For the
real launch (per PRD v1.0):

- Replace `lib/store.js` with the real backend: **Django + DRF + PostgreSQL**
  (append-only coin ledger, idempotency keys on coin-moving endpoints),
  keeping the same action shapes.
- Real OTP via **WhatsApp Cloud API** with SMS fallback (rate-limited).
- Voice pipeline: browser MediaRecorder → **Gemini 2.5 Flash** audio-to-JSON
  (Urdu/Punjabi) with a confirmation card; pre-recorded onboarding questions.
- Web Push (VAPID) for Android, signed URLs for audio/photos on S3-compatible
  storage, and server-side phone-number screening on text + transcripts.
- Move the admin panel behind real staff auth (the demo PIN is test-only).
