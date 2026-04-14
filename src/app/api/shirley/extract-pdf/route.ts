import OpenAI from "openai";
import { extractText } from "unpdf";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return Response.json({ error: "Only PDF files are supported" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const { text: rawText } = await extractText(new Uint8Array(buffer), { mergePages: true });

    if (!rawText?.trim()) {
      return Response.json({ error: "Could not extract text from PDF" }, { status: 422 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "OPENAI_API_KEY is not configured — add it in Vercel environment variables" },
        { status: 500 }
      );
    }

    const client = new OpenAI({ apiKey });

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        {
          role: "user",
          content: `You are extracting key roofing measurements from a PDF report (e.g. EagleView, hover, or similar).

Extract ONLY the following if present:
- Total roof area (sq ft)
- Net roof area less obstructions (sq ft)
- Number of roof facets
- Number of stories
- Predominant pitch
- Pitch breakdown (each pitch with sq ft and % of roof)
- Structure complexity (Simple/Normal/Complex)
- Lengths: Ridges, Hips, Valleys, Rakes, Eaves, Flashing, Step flashing
- Roof obstructions: count, total area, perimeter
- Estimated attic area
- Suggested waste % and resulting squares
- Any "Notes" section content

IGNORE: copyright text, patent numbers, company names, "Prepared for" info, legal disclaimers, image captions, page numbers, footnote definitions, and any instructional text about waste factors.

Format the result as a compact plain-text summary (no markdown, no bullet symbols — just labeled lines). Example:
Total Roof Area: 1,632 sq ft | Net Area: 1,612 sq ft
Facets: 5 | Stories: ≤1 | Complexity: Normal
Predominant Pitch: 2/12 (9°)
Pitches: 2/12 → 1,545 sq ft (94.7%), 6/12 → 87 sq ft (5.3%)
Lengths: Ridges 65.2 ft, Valleys 31.4 ft, Rakes 75 ft, Eaves 101 ft, Flashing 6.6 ft
Obstructions: 11 (area 20 sq ft, perimeter 58 ft)
Attic: 1,601.9 sq ft | Suggested waste: 92% → 2.00 squares
Notes: Residential property. No structural changes in past 4 years.

PDF text:
${rawText.slice(0, 8000)}`,
        },
      ],
    });

    const summary = (response.choices[0]?.message?.content ?? rawText).trim();
    return Response.json({ text: summary });
  } catch (err) {
    console.error("[extract-pdf] Error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
