import pool from '@/lib/db';
import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface SimulateRequest {
  jobId?: string;
  contactRole: 'homeowner' | 'subcontractor' | 'supplier';
  // Manual context (used when no jobId)
  propertyAddress?: string;
  homeownerName?: string;
  tradeType?: string;
  accessType?: string;
  subName?: string;
  jobNotes?: string;
  schedulingGoal?: string;
  conversationHistory: { role: 'user' | 'assistant'; content: string }[];
  newMessage: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as SimulateRequest;
    const { jobId, contactRole, conversationHistory, newMessage } = body;

    // ── Build job context ──────────────────────────────────────────────────────
    let propertyAddress = body.propertyAddress ?? 'Test Property';
    let homeownerName = body.homeownerName ?? 'Homeowner';
    let tradeType = body.tradeType ?? 'Unknown Trade';
    let accessType = body.accessType ?? 'exterior';
    let subName = body.subName ?? 'Sub';
    let jobNotes = body.jobNotes ?? null;
    let appointmentStatus = 'none';
    let schedulingGoal = body.schedulingGoal ?? 'Get sub to propose available dates';

    if (jobId) {
      const { rows: jobs } = await pool.query(
        `SELECT j.*,
                t.trade_type, t.access_type, t.status AS trade_status, t.notes AS trade_notes,
                s.name AS sub_name,
                a.status AS appt_status, a.confirmed_time, a.proposed_time
         FROM jobs j
         LEFT JOIN trades t ON t.job_id = j.job_id
         LEFT JOIN subcontractors s ON s.sub_id = t.assigned_sub_id
         LEFT JOIN appointments a ON a.trade_id = t.trade_id
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

      if (row.confirmed_time) {
        appointmentStatus = `confirmed ${new Date(row.confirmed_time).toLocaleDateString()}`;
      } else if (row.proposed_time) {
        appointmentStatus = `proposed ${new Date(row.proposed_time).toLocaleDateString()}`;
      } else if (row.appt_status) {
        appointmentStatus = row.appt_status;
      }

      // Derive scheduling goal from trade notes stage
      try {
        const notes = JSON.parse(row.trade_notes ?? '{}') as { stage?: string };
        if (notes.stage === 'awaiting_supplier') schedulingGoal = 'Get the material supplier to confirm earliest delivery date';
        else if (notes.stage === 'awaiting_sub') schedulingGoal = `Get sub to propose available dates for the ${tradeType} job`;
        else if (notes.stage === 'awaiting_homeowner') schedulingGoal = 'Confirm the proposed appointment time with the homeowner';
        else if (notes.stage === 'confirmed') schedulingGoal = 'Appointment is confirmed — answer questions and provide reminders';
      } catch {}
    }

    // ── Build system prompt (mirrors the agent's buildClassificationPrompt) ────
    const now = new Date();
    const currentDateTime = now.toLocaleString('en-US', {
      timeZone: 'America/Los_Angeles',
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
    });

    const contactDescription = contactRole === 'subcontractor'
      ? `the subcontractor (${subName}) — refer to them as "you", never by name in scheduling nudges`
      : contactRole === 'supplier'
      ? `the material supplier — ask for delivery date availability`
      : `the homeowner (${homeownerName})`;

    const systemPrompt = `You are Shirley, the scheduling coordinator for Hive Roofing & Solar.
You coordinate appointments between homeowners and subcontractors via SMS.
You sound like a real employee texting from their personal phone — casual, natural, never robotic.
You are fully knowledgeable about each job and can answer questions about scope, measurements, materials, access, and timeline using the job context provided.
You never quote prices, make insurance commitments, or guarantee outcomes.
You handle communication in English and Spanish.

CRITICAL RULE — NO GUESSING: If the answer to a question is NOT explicitly in the job notes below, do NOT invent or guess the answer. Acknowledge the question naturally, say you'll confirm that detail, and immediately redirect to scheduling. Never fabricate measurements, material types, specifications, colors, or scope details not in the notes.

CRITICAL RULE — NO REPETITION: You have access to the full conversation history. Never repeat information already mentioned in previous messages. Treat this like a real ongoing text thread.

CURRENT JOB CONTEXT:
- Current date & time: ${currentDateTime}
- Property: ${propertyAddress}
- Homeowner: ${homeownerName}
- Trade: ${tradeType} (${accessType})
- Assigned sub: ${subName}
- Appointment status: ${appointmentStatus}
- Current scheduling goal: ${schedulingGoal}
- You are currently texting with: ${contactDescription}
${jobNotes ? `- Job notes & measurements: ${jobNotes}` : '- Job notes & measurements: No detailed notes available'}

Classify the incoming message and respond in this exact JSON shape:
{
  "intent": "<confirmation|rejection|reschedule|question|complaint|off_topic|ambiguous>",
  "extractedData": {
    "proposedDate": "<ISO date string (YYYY-MM-DD) resolved from current date — e.g. 'Monday' = next Monday's date, 'tomorrow' = tomorrow's date, else null>",
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
- needsHuman = true ONLY when: explicit anger/threats, pricing negotiation, insurance disputes, requests to speak to a manager, or delay of more than one week
- needsHuman = false for everything else

RULES FOR confidence:
- high: intent is clear ("yeah Tuesday works", "what's the square footage")
- medium: reasonably clear but some ambiguity ("maybe Thursday", "I'll try")
- low: genuinely uninterpretable (gibberish, wrong number)

RULES FOR suggestedReply:
- NEVER use: "Great question" / "Certainly!" / "Of course!" / "Absolutely!" / "I understand" / "Happy to help"
- Never start with hollow affirmations — just get to the point
- Never mention you are an AI or a bot
- If answer IS in job notes: answer directly, then nudge toward scheduling
- If answer NOT in notes: say you'll confirm, redirect to scheduling
- For pricing questions: deflect without escalating
- Keep it 1-3 sentences, casual, always nudge toward the scheduling goal
- Vary phrasing across messages

Now classify the incoming message and return ONLY the JSON. No explanation, no markdown, no preamble.`;

    const response = await client.chat.completions.create({
      model: 'o4-mini',
      reasoning_effort: 'medium',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: newMessage },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? '{}';
    const result = JSON.parse(raw);
    return Response.json(result);
  } catch (err) {
    console.error('[simulate] Error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
