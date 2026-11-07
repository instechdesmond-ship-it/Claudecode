// Zerith voice assistant server.
// Serves the page and streams Claude's replies to it. Your API key stays here
// on the server and is never sent to the browser.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
// Local only by default. Set HOST=0.0.0.0 only behind HTTPS and a login you control.
const HOST = process.env.HOST || "127.0.0.1";
const MODEL = process.env.ASSISTANT_MODEL || "claude-opus-5-5";
const EFFORT = process.env.ASSISTANT_EFFORT || "low"; // low keeps replies quick for talking
const MAX_BODY = 64 * 1024;

const PAGE = fs.readFileSync(path.join(here, "public", "index.html"));
const notesPath = path.join(here, "company.md");
const NOTES = fs.existsSync(notesPath) ? fs.readFileSync(notesPath, "utf8").slice(0, 20000) : "";

const PERSONAS = {
  friday: {
    name: "FRIDAY",
    style:
      'Warm, quick and a little dry. Calls the user "boss" in English and 老板 in Chinese. Sounds like a sharp colleague who is always one step ahead, never robotic.',
  },
  edith: {
    name: "EDITH",
    style:
      'Calm, precise and tactical. Leads with the key finding, then the options. Brief situational briefings. Calls the user "sir" in English and uses the polite 您 in Chinese.',
  },
};

function systemPrompt(persona) {
  const p = PERSONAS[persona];
  return [
    `You are ${p.name}, the AI human assistant of Zerith Global Sdn. Bhd., a digital marketing and AI automation company in Malaysia. You are speaking out loud with the company's owner like a trusted colleague, in the spirit of the AI assistants in the Iron Man films, but you are an original character made for this company. Never claim to come from those films or to have Stark technology.`,
    `Personality: ${p.style}`,
    "Language: reply in the language the user just spoke. English gets English, Chinese gets Simplified Chinese (普通话). If the user mixes both, mirror the mix. Keep names, numbers and brand terms unchanged.",
    "Voice: your words are spoken aloud, so write the way people talk. Two to four short sentences unless asked for detail. No lists, no markdown, no emojis, no headings, no URLs. Say numbers and dates the way you would say them.",
    "Honesty: in this version you have no live access to ClickUp, calendars, Instagram or ad accounts, so you cannot read current figures. If asked for live numbers, say so plainly and suggest checking the company dashboard. Never invent numbers, dates or names. Use the company notes below, and general knowledge for everything else, saying when you are going beyond the notes. You cannot send messages, place calls or change anything.",
    "Speech recognition can mishear. If a request is unclear or sounds wrong, ask a short question to confirm instead of guessing.",
    "Company notes (facts supplied by the owner):",
    NOTES || "(none yet)",
  ].join("\n\n");
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error("Request too large"), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function cleanMessages(raw) {
  if (!Array.isArray(raw)) return null;
  const out = [];
  for (const m of raw.slice(-16)) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") return null;
    const content = m.content.trim().slice(0, 4000);
    if (content) out.push({ role: m.role, content });
  }
  while (out.length && out[0].role !== "user") out.shift();
  if (!out.length || out[out.length - 1].role !== "user") return null;
  return out;
}

function friendlyError(err) {
  if (err instanceof Anthropic.AuthenticationError) return "The API key is missing or not valid. Check ANTHROPIC_API_KEY on the server.";
  if (err instanceof Anthropic.RateLimitError) return "Too many requests right now. Please try again in a moment.";
  if (err instanceof Anthropic.BadRequestError) return "The request was rejected: " + String(err.message).slice(0, 200);
  if (err instanceof Anthropic.APIConnectionError) return "I could not reach Claude. Check the internet connection on the server.";
  if (err instanceof Anthropic.APIError) return `Claude returned an error (${err.status}).`;
  if (err && /api key|authentication|credentials/i.test(String(err.message))) return "The API key is missing. Set ANTHROPIC_API_KEY and restart the server.";
  return "Something went wrong on the server.";
}

async function handleChat(req, res) {
  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch (err) {
    res.writeHead(err.status || 400, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: err.status === 413 ? "Request too large" : "Bad request" }));
    return;
  }
  const persona = body.persona === "edith" ? "edith" : "friday";
  const messages = cleanMessages(body.messages);
  if (!messages) {
    res.writeHead(400, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "Send a list of messages that ends with a user message." }));
    return;
  }
  // Time goes with the newest user turn so the system prompt stays identical between requests.
  const tz = typeof body.tz === "string" ? body.tz.slice(0, 60) : "";
  const now = typeof body.now === "string" ? body.now.slice(0, 60) : new Date().toISOString();
  const last = messages[messages.length - 1];
  last.content = `${last.content}\n\n[Current local time: ${now}${tz ? `, ${tz}` : ""}]`;

  res.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-store",
    connection: "keep-alive",
    "x-accel-buffering": "no",
  });
  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  let stream;
  try {
    const client = new Anthropic();
    stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 1024,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: EFFORT },
      system: [{ type: "text", text: systemPrompt(persona), cache_control: { type: "ephemeral" } }],
      messages,
    });
    res.on("close", () => {
      if (!res.writableFinished) stream.abort();
    });
    stream.on("text", (delta) => send({ t: delta }));
    const final = await stream.finalMessage();
    if (final.stop_reason === "refusal") send({ error: "I can't help with that one. Try asking another way." });
    send({ done: true });
  } catch (err) {
    if (!res.writableEnded && !(stream && stream.controller && stream.controller.signal.aborted)) {
      console.error("chat error:", err && err.message ? err.message : err);
      send({ error: friendlyError(err) });
    }
  } finally {
    res.end();
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      res.end(PAGE);
    } else if (req.method === "POST" && url.pathname === "/api/chat") {
      await handleChat(req, res);
    } else {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("Not found");
    }
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.writeHead(500, { "content-type": "text/plain" });
    res.end("Server error");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Voice assistant running at http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`);
  console.log(`Model: ${MODEL} (effort ${EFFORT}). Open the address in Chrome, Edge or Safari.`);
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    console.log("Note: ANTHROPIC_API_KEY is not set. Set it before talking, or run `ant auth login` if you use the Anthropic CLI.");
  }
});
