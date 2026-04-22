import pool from '@/lib/db';
import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type SenderRole = 'homeowner' | 'subcontractor' | 'supplier';
type Stage = 'awaiting_supplier' | 'awaiting_sub' | 'awaiting_homeowner' | 'confirmed';

interface SimState {
  stage: Stage;
  proposedDate?: string;
  proposedTime?: string;
  deliveryDate?: string;
  suggestedSubDate?: string;
  round?: number;
}

interface SimRequest {
  jobId?: string;
  propertyAddress?: string;
  homeownerName?: string;
  subName?: string;
  tradeType?: string;
  jobNotes?: string;
  accessType?: string;
  senderRole: SenderRole;
  currentState: SimState;
  conversationHistory: { role: 'user' | 'assistant'; content: string }[];
  newMessage: string;
}

interface AiResult {
  intent: string;
  confidence: string;
  needsHuman: boolean;
  extractedData: {
    proposedDate: string | null;
    proposedTime: string | null;
    yesNo: boolean | null;
    conditions: string | null;
  };
  language: string;
  suggestedReply: string;
}

interface CrossPartyMessage {
  to: SenderRole;
  message: string;
  reason: string;
}

interface SimResponse {
  reply: string;
  aiResult: Omit<AiResult, 'suggestedReply'>;
  newState: SimState;
  crossPartyMessages: CrossPartyMessage[];
}

function nextBusinessDay(isoDate: string): string {
  const d = new Date(isoDate + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  const day = d.getUTCDay();
  if (day === 6) d.setUTCDate(d.getUTCDate() + 2);
  else if (day === 0) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function fmt(isoDate?: string | null): string {
  if (!isoDate) return '';
  try {
    return new Date(isoDate + 'T12:00:00Z').toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC',
    });
  } catch {
    return isoDate;
  }
}

async function callOpenAI(systemPrompt: string, history: { role: 'user' | 'assistant'; content: string }[], newMessage: string): Promise<AiResult> {
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: newMessage },
    ],
  });
  const raw = response.choices[0]?.message?.content ?? '{}';
  return JSON.parse(raw) as AiResult;
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as SimRequest;
    const { jobId, senderRole, currentState, conversationHistory, newMessage } = body;

    // ── Build job context ──────────────────────────────────────────────────────
    let propertyAddress = body.propertyAddress ?? 'Test Property';
    let homeownerName = body.homeownerName ?? 'Homeowner';
    let tradeType = body.tradeType ?? 'Unknown Trade';
    let accessType = body.accessType ?? 'exterior';
    let subName = body.subName ?? 'Sub';
    let jobNotes = body.jobNotes ?? null;

    if (jobId) {
      const { rows: jobs } = await pool.query(
        `SELECT j.*,
                t.trade_type, t.access_type,
                s.name AS sub_name
         FROM jobs j
         LEFT JOIN trades t ON t.job_id = j.job_id
         LEFT JOIN subcontractors s ON s.sub_id = t.assigned_sub_id
         WHERE j.job_id = $1
         ORDER BY t.status ASC
         LIMIT 1`,
        [jobId]
      );
      const row = jobs[0];
      if (!row) return Response.json({ error: 'Job not found' }, { status: 404 });
      propertyAddress = row.property_address;
      homeownerName = row.homeowner_name;
      tradeType = row.trade_type ?? tradeType;
      accessType = row.access_type ?? accessType;
      subName = row.sub_name ?? subName;
      jobNotes = row.job_notes;
    }

    // ── Derive scheduling goal from stage ─────────────────────────────────────
    const stage = currentState.stage;
    let schedulingGoal = '';
    if (stage === 'awaiting_supplier') schedulingGoal = 'Get the material supplier to confirm their earliest delivery date for roofing materials';
    else if (stage === 'awaiting_sub') schedulingGoal = `Get ${subName} to confirm they can come out on ${fmt(currentState.suggestedSubDate) || 'a specific date'}`;
    else if (stage === 'awaiting_homeowner') schedulingGoal = `Confirm the proposed date (${fmt(currentState.proposedDate) || 'TBD'}) with ${homeownerName}`;
    else if (stage === 'confirmed') schedulingGoal = 'Appointment confirmed — answer any remaining questions';

    // ── Build contact description ──────────────────────────────────────────────
    const contactDescription = senderRole === 'subcontractor'
      ? `the subcontractor (${subName}) — refer to them as "you", never by name in scheduling nudges`
      : senderRole === 'supplier'
      ? `the material supplier — your goal is to get a confirmed delivery date`
      : `the homeowner (${homeownerName})`;

    // ── Build system prompt — exact mirror of production buildClassificationPrompt() ──
    const now = new Date();
    const currentDateTime = now.toLocaleString('en-US', {
      timeZone: 'America/Los_Angeles',
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
    });

    const systemPrompt = `You are Shirley, the scheduling coordinator for Hive Roofing & Solar.
You coordinate appointments between homeowners and subcontractors via SMS.
You sound like a real employee texting from their personal phone — casual, natural, never robotic.
You are fully knowledgeable about each job and can answer questions about scope, measurements, materials, access, and timeline using the job context provided.
You never quote prices, make insurance commitments, or guarantee outcomes.
You handle communication in English and Spanish.

CRITICAL RULE — NO GUESSING: If the answer to a question is NOT explicitly in the job notes below, do NOT invent or guess the answer. Acknowledge the question naturally, say you'll confirm that detail, and immediately redirect to scheduling. Never fabricate measurements, material types, specifications, colors, or scope details not in the notes.

CRITICAL RULE — NO REPETITION: You have access to the full conversation history. Never repeat information already mentioned in previous messages — the address, access type, square footage, or anything else already covered. The person has already read those messages. Treat the conversation like a real ongoing text thread and respond only to what's new.

CURRENT JOB CONTEXT:
- Current date & time: ${currentDateTime}
- Property: ${propertyAddress}
- Homeowner: ${homeownerName}
- Trade: ${tradeType} (${accessType})
- Assigned sub: ${subName}
- Current stage: ${stage}
- Current scheduling goal: ${schedulingGoal}
- You are currently texting with: ${contactDescription}
${currentState.deliveryDate ? `- Material delivery date: ${fmt(currentState.deliveryDate)}` : ''}
${currentState.proposedDate ? `- Proposed appointment date: ${fmt(currentState.proposedDate)}${currentState.proposedTime ? ' at ' + currentState.proposedTime : ''}` : ''}
${jobNotes ? `- Job notes & measurements: ${jobNotes}` : '- Job notes & measurements: No detailed notes available'}

Classify the incoming message and respond in this exact JSON shape:
{
  "intent": "<confirmation|rejection|reschedule|question|complaint|off_topic|ambiguous>",
  "extractedData": {
    "proposedDate": "<ISO date string (YYYY-MM-DD) resolved from current date — e.g. 'Monday' or 'Morday' = next Monday's date, 'tomorrow' = tomorrow's date, 'next week' = null unless a specific day is mentioned, else null>",
    "proposedTime": "<time string if mentioned, else null>",
    "yesNo": <true|false|null>,
    "conditions": "<any conditions attached, else null>"
  },
  "confidence": "<high|medium|low>",
  "needsHuman": <true|false>,
  "suggestedReply": "<full reply text>",
  "language": "<en|es>"
}

RULES FOR needsHuman:
- needsHuman = true ONLY when: contact is explicitly angry/threatening, negotiating pricing or pay rates, raising an insurance dispute, requesting to speak to a manager, OR requesting a delay of more than one week
- needsHuman = false for everything else including scope questions, unclear messages, off-topic messages, and questions answerable from job context

RULES FOR confidence:
- confidence describes how certain you are about what the person MEANT — not whether you can handle it
- high: intent is clear. Examples: "yeah Tuesday works" / "what's the square footage" / "no I can't do that day"
- medium: intent reasonably clear but has ambiguity. Examples: "maybe Thursday" / "I'll try to make it"
- low: message is genuinely uninterpretable. Examples: gibberish, clearly wrong number, completely nonsensical

RULES FOR suggestedReply:
- Sound like a real person texting from their phone — casual, direct, warm but not over-friendly
- NEVER use: "Great question" / "Certainly!" / "Of course!" / "Absolutely!" / "I understand" / "I appreciate" / "Happy to help" / "No problem at all" / "Thanks for reaching out"
- Never start with hollow affirmations — just get to the point
- Never mention you are an AI, a bot, or an automated system
- Vary phrasing — don't use the same opener repeatedly
- If the answer IS in job notes: answer directly and confidently, then nudge toward scheduling. Do the math if needed (sq ft ÷ 100 = squares)
- If the answer is NOT in job notes: say you'll confirm that specific detail, then redirect. Example: "Let me confirm that and get back to you — what days are you looking at?"
- For pricing/rate questions: deflect without escalating. Example: "I handle the scheduling side — for rates check with the office directly. What's your availability?"
- After answering any question, bring the conversation back toward the current scheduling goal with a soft nudge
- Default to 1-3 sentences. For detailed scope descriptions with rich notes, up to 4-5 sentences max. Never a full paragraph.

FEW-SHOT EXAMPLES:

Example 1 — Scope question, answer IS in notes:
Incoming: "Is this a tear-off or overlay?"
Notes: "Full tear-off and replacement, architectural shingles, 1,632 sq ft"
{"intent":"question","extractedData":{"proposedDate":null,"proposedTime":null,"yesNo":null,"conditions":null},"confidence":"high","needsHuman":false,"suggestedReply":"Full tear-off, going with architectural shingles. About 16 squares total. What days work for you on this one?","language":"en"}

Example 2 — Scope question, answer NOT in notes:
Incoming: "What color shingles?"
Notes: no color mentioned
{"intent":"question","extractedData":{"proposedDate":null,"proposedTime":null,"yesNo":null,"conditions":null},"confidence":"high","needsHuman":false,"suggestedReply":"Let me confirm the color spec and get back to you on that. What's your availability looking like this week?","language":"en"}

Example 3 — Ambiguous reply:
Incoming: "Maybe Thursday"
{"intent":"reschedule","extractedData":{"proposedDate":null,"proposedTime":null,"yesNo":null,"conditions":"tentative Thursday"},"confidence":"medium","needsHuman":false,"suggestedReply":"Thursday could work — morning or afternoon better for you?","language":"en"}

Example 4 — Clear confirmation:
Incoming: "Yeah 9am Tuesday is good"
{"intent":"confirmation","extractedData":{"proposedDate":"2026-04-21","proposedTime":"09:00","yesNo":true,"conditions":null},"confidence":"high","needsHuman":false,"suggestedReply":"Locked in — Tuesday 9am at ${propertyAddress}. I'll send you a reminder the day before.","language":"en"}

Example 5 — Needs human escalation:
Incoming: "I'm done working with you guys, your last check bounced"
{"intent":"complaint","extractedData":{"proposedDate":null,"proposedTime":null,"yesNo":null,"conditions":null},"confidence":"high","needsHuman":true,"suggestedReply":"I hear you — let me get someone from the office to reach out to you directly about that.","language":"en"}

Example 6 — Pricing deflection (no escalation):
Incoming: "How much does this pay?"
{"intent":"question","extractedData":{"proposedDate":null,"proposedTime":null,"yesNo":null,"conditions":null},"confidence":"high","needsHuman":false,"suggestedReply":"I handle the scheduling side — for rates you'd want to check with the office directly. What's your availability looking like for this one?","language":"en"}

Example 7 — Spanish:
Incoming: "¿Qué hay que hacer en esa propiedad?"
Notes: "Gutter installation, 120 linear feet, exterior only"
{"intent":"question","extractedData":{"proposedDate":null,"proposedTime":null,"yesNo":null,"conditions":null},"confidence":"high","needsHuman":false,"suggestedReply":"Es una instalación de canaletas — 120 pies lineales, todo por fuera así que no necesitas coordinar con el dueño. ¿Qué días te funcionan?","language":"es"}

Example 8 — Major delay (needs human):
Incoming: "I can't get to this for about 3 weeks, swamped right now"
{"intent":"reschedule","extractedData":{"proposedDate":null,"proposedTime":null,"yesNo":false,"conditions":"3 week delay"},"confidence":"high","needsHuman":true,"suggestedReply":"Got it — let me check with the team on timing and get back to you.","language":"en"}

Now classify the incoming message and return ONLY the JSON. No explanation, no markdown, no preamble.`;

    // ── Classify intent ────────────────────────────────────────────────────────
    const aiResult = await callOpenAI(systemPrompt, conversationHistory, newMessage);
    const { intent, extractedData, suggestedReply } = aiResult;

    let reply = suggestedReply ?? "Got it — I'll follow up shortly.";
    let newState: SimState = { ...currentState };
    const crossPartyMessages: CrossPartyMessage[] = [];

    // ── State machine ──────────────────────────────────────────────────────────
    if (senderRole === 'supplier' && stage === 'awaiting_supplier') {
      if (extractedData?.proposedDate) {
        const deliveryDate = extractedData.proposedDate;
        const suggestedSubDate = nextBusinessDay(deliveryDate);
        newState = { ...currentState, stage: 'awaiting_sub', deliveryDate, suggestedSubDate, round: 1 };
        crossPartyMessages.push({
          to: 'subcontractor',
          message: `Hey ${subName}, materials for the ${tradeType} at ${propertyAddress} are confirmed for delivery on ${fmt(deliveryDate)}. Can you be there on ${fmt(suggestedSubDate)}?`,
          reason: 'Supplier confirmed delivery date → notifying sub',
        });
      } else {
        newState = { ...currentState, round: (currentState.round ?? 1) + 1 };
      }

    } else if (senderRole === 'subcontractor' && stage === 'awaiting_sub') {
      if (extractedData?.proposedDate && (intent === 'confirmation' || intent === 'reschedule')) {
        const proposedDate = extractedData.proposedDate;
        const proposedTime = extractedData.proposedTime ?? undefined;
        newState = { ...currentState, stage: 'awaiting_homeowner', proposedDate, proposedTime };
        const timeStr = proposedTime ? ` at ${proposedTime}` : '';
        const hoMsg = accessType === 'interior'
          ? `Hi ${homeownerName}, our crew is aiming for ${fmt(proposedDate)}${timeStr} for the ${tradeType}. You'd need to be home to let them in. Does that work?`
          : `Hi ${homeownerName}, our crew is planning to come out on ${fmt(proposedDate)}${timeStr} for the ${tradeType} — they won't need anyone home. Does that date work? Just reply yes or no.`;
        crossPartyMessages.push({
          to: 'homeowner',
          message: hoMsg,
          reason: 'Sub proposed a date → asking homeowner',
        });
      } else if (intent !== 'question' && intent !== 'ambiguous') {
        newState = { ...currentState, round: (currentState.round ?? 1) + 1 };
      }

    } else if (senderRole === 'homeowner' && stage === 'awaiting_homeowner') {
      if (intent === 'confirmation' || extractedData?.yesNo === true) {
        newState = { ...currentState, stage: 'confirmed' };
        crossPartyMessages.push({
          to: 'subcontractor',
          message: `${homeownerName} confirmed ${fmt(currentState.proposedDate)}. You're good to go — take before/during/after photos and send your invoice to invoices@hiveroofingandsolar.com when done.`,
          reason: 'Homeowner confirmed → notifying sub',
        });
        crossPartyMessages.push({
          to: 'homeowner',
          message: `You're all set for ${fmt(currentState.proposedDate)}. Our crew will handle everything. I'll send a reminder the day before.`,
          reason: 'Appointment confirmed — sending homeowner confirmation',
        });
      } else if (intent === 'rejection' || intent === 'reschedule' || extractedData?.yesNo === false) {
        const alternativeDate = extractedData?.proposedDate;
        newState = {
          stage: 'awaiting_sub',
          deliveryDate: currentState.deliveryDate,
          suggestedSubDate: currentState.suggestedSubDate,
          round: (currentState.round ?? 1) + 1,
        };
        const subMsg = alternativeDate
          ? `${homeownerName} can't do ${fmt(currentState.proposedDate)} but suggested ${fmt(alternativeDate)}. Does that work for you?`
          : `${homeownerName} isn't available on ${fmt(currentState.proposedDate)}. What other days work for you?`;
        crossPartyMessages.push({
          to: 'subcontractor',
          message: subMsg,
          reason: 'Homeowner rejected → asking sub for new date',
        });
      }
    }

    const { suggestedReply: _dropped, ...aiResultWithoutReply } = aiResult;

    const result: SimResponse = {
      reply,
      aiResult: aiResultWithoutReply,
      newState,
      crossPartyMessages,
    };

    return Response.json(result);
  } catch (err) {
    console.error('[simulate] Error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
