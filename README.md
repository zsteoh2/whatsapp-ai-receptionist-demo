# ORA WhatsApp AI Receptionist Demo

ORA is a reusable WhatsApp business-assistant demonstration. ORA is now the only active customer-facing identity: it explains its capabilities, handles callback requests, and directs prospects to the Founder without exposing an industry-specific business template.

This is not a production business system. Use synthetic test data only. It does not provide professional advice or process real money.

## What is implemented

- `GET /health`
- Signed Twilio Sandbox and Meta webhook ingestion
- Twilio Sandbox or WhatsApp Cloud API text replies
- ORA capability information and safe pending-template replies
- A hidden Cleaner Demo selected only by sending the standalone command `cleaner`
- Deterministic emergency, medical, complaint, under-18, and human-request handover
- A retained, disabled Clinic regression template with OpenAI-compatible classification and stateful booking
- Google Calendar free/busy lookup, alternatives, and event creation for an enabled business template
- Google OAuth with signed state and service-only refresh-token storage
- Stripe Test Checkout and signed webhook confirmation
- WhatsApp and Stripe webhook idempotency
- Supabase persistence with an in-memory local fallback
- Clean ORA welcome menu and post-booking Founder call to action

The old Clinic template is retained for regression only and is disabled by default. Do not set `ENABLE_CLINIC_DEMO=true` in Railway while it is offline. Until an approved business template is supplied, ORA will not invent services, prices, availability, or booking rules. The Founder CTA uses `07955 506757` and `hau@convertbydigital.com`; a Calendly link has not yet been supplied.

Send exactly `cleaner` (case-insensitive, with no other words) to enter the Cleaner Demo. Mentioning cleaner in a normal sentence does not switch modes. The selected mode persists in bounded conversation memory for up to 24 hours; `START OVER` immediately returns to the main ORA demo. The Cleaner Demo is currently a safe presentation shell rather than a working quote or booking journey because its approved catalogue and operating rules have not been supplied.

## Local setup

Requirements: Node.js 22 or newer.

```bash
npm install
npm run check
```

Copy the non-secret settings from `.env.example` into `.env.local` and fill the provider values. `.env.local`, `Key.txt`, build output, logs, and dependencies are ignored by Git.

`ENABLE_CLINIC_DEMO` defaults to `false`. The `true` setting exists only to run the retained Clinic regression template and must not be enabled for the current ORA presentation.

The demo uses the OpenAI-compatible VectorEngine endpoint at `https://api.vectorengine.cn/v1` through `OPENAI_BASE_URL`. Keep the API key only in `.env.local` or Railway Variables; the configured model is `gpt-5.6-luna`.

The existing intermediary API key has already been placed in `.env.local`. `Key.txt` still contains the original copy and is ignored; delete that file manually after you have confirmed the application works if you no longer need the duplicate.

Start locally:

```bash
npm run dev
```

Then open `http://localhost:3000/health`. The response reports only configured/not-configured flags and never returns secrets.

## Supabase

1. Create a Supabase Free project.
2. Open the SQL editor and run [`supabase/schema.sql`](supabase/schema.sql).
3. Set `SUPABASE_URL` and the server-only `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` and Railway.
4. Never expose the service-role key to a browser or client application.

All tables have Row Level Security enabled and no client policies. The backend service role is the only intended caller.

Run the schema again on an existing project before deploying this version; its idempotent migration adds the nullable `business_mode` field used to remember Cleaner Demo selection.

## Google Calendar

1. Create a Google Cloud project and enable Google Calendar API.
2. Create a Web application OAuth client.
3. Add `<APP_BASE_URL>/auth/google/callback` as an authorised redirect URI.
4. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, and `GOOGLE_CALENDAR_ID`.
5. After deployment, open `<APP_BASE_URL>/auth/google` once and complete consent.

The OAuth callback stores the refresh token in the service-only `integration_secrets` table. `GOOGLE_REFRESH_TOKEN` can instead be supplied as a hosting secret and takes precedence.

## Stripe Test Mode

1. Use only a key beginning with `sk_test_`.
2. Add `<APP_BASE_URL>/webhooks/stripe` as a Stripe Test webhook endpoint.
3. Subscribe to `checkout.session.completed`.
4. Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.

Test card:

```text
4242 4242 4242 4242
Any future expiry
Any three-digit CVC
```

A successful Checkout webhook rechecks Calendar availability before creating the event. A payment return page alone never confirms a booking. In the Twilio Trial demo, return to WhatsApp and send `STATUS` after payment to retrieve the confirmed Calendar booking synchronously.

## Twilio WhatsApp Sandbox (recommended for Phase 1)

1. In Twilio Console, open **Messaging → Try it out → Send a WhatsApp message**.
2. Join the testing environment from the WhatsApp account used for the demo.
3. Set `TWILIO_ACCOUNT_SID`, a newly generated `TWILIO_AUTH_TOKEN`, and `TWILIO_WHATSAPP_FROM` in Railway.
4. Set `APP_BASE_URL` to the Railway HTTPS origin with no trailing slash.
5. Set the inbound message webhook to `<APP_BASE_URL>/webhooks/twilio/whatsapp` using `POST`.

The webhook validates `X-Twilio-Signature`. Never paste the Auth Token into chat, source control, screenshots, or commands that will be shared. Incoming Sandbox conversations reply synchronously with TwiML so the trial can return free-form text without using the restricted outbound Messages API.

Twilio's current free **Try out WhatsApp** flow accepts only pre-approved `ContentSid` templates for outbound API sends. Asynchronous confirmation is therefore best-effort on Trial; the payment return page tells the tester to send `STATUS`, which retrieves the confirmed booking through the working synchronous TwiML path. Upgrade Twilio when automatic outbound confirmation is required.

## Meta WhatsApp test number (optional alternative)

1. Create a new Meta App and add the WhatsApp product.
2. Use Meta's provided test number; no new SIM or production number is needed for Phase 1.
3. Add your existing WhatsApp number as an approved test recipient.
4. Set the callback URL to `<APP_BASE_URL>/webhooks/whatsapp` and use the value of `META_VERIFY_TOKEN` as the verification token.
5. Set `META_APP_SECRET`, `WHATSAPP_ACCESS_TOKEN`, and `WHATSAPP_PHONE_NUMBER_ID`.
6. Subscribe to WhatsApp message events.

The POST webhook rejects requests without a valid `X-Hub-Signature-256` signature.

## Railway Free deployment

1. Push this repository to a private GitHub repository.
2. Create a Railway project from the repository.
3. Add every required environment variable from `.env.example` to Railway Variables.
4. Generate a public domain and set `APP_BASE_URL` to that HTTPS origin.
5. Redeploy after updating `APP_BASE_URL` and provider webhook URLs.

[`railway.json`](railway.json) builds with `npm run build`, starts with `npm start`, and checks `/health`.

## Demonstration checklist

Because Railway Free and Supabase Free may sleep or exhaust free usage, run this before a scheduled or recorded demonstration:

1. Open the Supabase project and confirm it is active.
2. Call Railway `/health` and check every required integration flag.
3. Send one WhatsApp test message and receive a reply.
4. Confirm Google Calendar OAuth still works.
5. Confirm the Stripe endpoint is receiving Test Mode events.
6. Use only synthetic customer details.

## Useful commands

```bash
npm run dev       # local development
npm run build     # compile to dist/
npm test          # focused automated checks
npm run check     # build plus tests
npm run test:dialogue:live # real LLM + in-memory bot; no WhatsApp/provider traffic
npm start         # run compiled service
```

The live dialogue command uses synthetic unusual phrasing and the configured LLM, while replacing WhatsApp/Twilio, Supabase, Google Calendar, and Stripe with in-memory test doubles. It reports scenario labels and outcomes without printing API keys or raw medical test messages.

## Known Phase 1 limits

- One fictional clinic, practitioner, timezone, calendar, and English text channel
- No production payments or WhatsApp number
- No dashboard, CRM, reminders, voice notes, images, cancellation automation, or rescheduling automation
- Background WhatsApp work runs in the Railway process; a durable queue belongs in a production phase
- External provider setup and public webhook delivery require the account owner’s credentials and dashboards
