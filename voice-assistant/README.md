# Zerith voice assistant (FRIDAY and EDITH)

Talk to an AI assistant out loud, in English or Mandarin, and hear it answer.
Pick FRIDAY (warm, quick, dry humour) or EDITH (calm, tactical). Both are original
characters made for your company.

## Start it (about 5 minutes)

1. Install Node.js 18 or newer from https://nodejs.org if you do not have it.
2. Get an Anthropic API key at https://console.anthropic.com (this is separate from a
   claude.ai subscription and is billed by use).
3. In a terminal, in this folder:

   ```
   npm install
   export ANTHROPIC_API_KEY=your-key-here     # Windows PowerShell: $env:ANTHROPIC_API_KEY="your-key-here"
   npm start
   ```
4. Open http://localhost:3000 in **Chrome, Edge or Safari**, allow the microphone, and tap the big
   microphone button.

## Using it

- Pick the language you are about to speak (English or 中文). The browser can only listen in one
  language at a time. The assistant answers in the language it heard, and speaks it aloud.
- **Keep listening** makes it a conversation: after each answer it listens again by itself.
- Tap the microphone while it is talking to interrupt.
- **Voice** lists the voices installed on your device. Install better Chinese or English voices in your
  system settings (for example Settings, Accessibility, Spoken Content on a Mac) and they appear here.
- You can also type in the box at the bottom.

## Use it on a phone or tablet

A phone or tablet only allows the microphone on a secure `https` address, so the app has to run on a
hosting service instead of your computer. The server refuses to start on the internet without a password,
so nobody else can spend your API credit.

Example with Render (https://render.com). Other hosts that run Docker work the same way.

1. Put this folder in a GitHub repository.
2. In Render choose **New, Web Service**, pick the repository, and set:
   - **Root Directory**: `voice-assistant` (leave empty if this folder is the whole repository)
   - **Runtime**: Docker
3. Add two environment variables:
   - `ANTHROPIC_API_KEY`: your key
   - `ACCESS_PASSWORD`: a long password you will type on the tablet
   - and `HOST` = `0.0.0.0`
4. Deploy. Render gives you an `https://...onrender.com` address.
5. On the tablet open that address in Chrome (Android) or Safari (iPad), enter the password, allow the
   microphone, and tap the big button. Use "Add to Home Screen" to make it an app icon.

Notes:
- Hosting usually costs a small monthly fee. Free tiers often go to sleep and take a minute to wake up.
- Logins last 30 days. Wrong passwords are rate limited.
- Change the password any time in the host's settings. Old logins stop working.
- Everything said goes through your browser's speech service and then to Claude. Leave the address private.

## Teach it about your company

Edit `company.md` (services, prices, hours, answers you give customers), then restart with `npm start`.

## What this version cannot do

- It has **no live access** to ClickUp, Google Calendar, Instagram or Meta ads. It says so instead of guessing.
  Those live answers work in the Claude page version of the assistant.
- It does not talk on the phone or answer WhatsApp customers.
- Voice recognition is done by your browser's speech service (in Chrome this sends audio to Google). Do not
  use it for confidential conversations if that is a concern.

## Settings (environment variables)

| Name | Default | Meaning |
|---|---|---|
| `ANTHROPIC_API_KEY` | none | Your key. Stays on the server. |
| `ASSISTANT_MODEL` | `claude-opus-5-5` | Use `claude-haiku-5-5` for the fastest and cheapest replies. |
| `ASSISTANT_EFFORT` | `low` | `low` is quickest. `medium` or `high` think longer. |
| `PORT` | `3000` | Port to listen on. |
| `HOST` | `127.0.0.1` | Only this computer. `0.0.0.0` opens it to the network and requires `ACCESS_PASSWORD`. |
| `ACCESS_PASSWORD` | none | Turns on the login page. Required when `HOST` is not local. |
