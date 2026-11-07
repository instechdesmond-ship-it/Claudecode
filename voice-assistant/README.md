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
| `HOST` | `127.0.0.1` | Only this computer. Do not change it unless the site is behind HTTPS and a login, because anyone who can reach it spends your API credit. |
