import { auth } from "@/auth";
import { NextResponse } from "next/server";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

function tryParseJSON(str: string): object | null {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function tryFixJSON(str: string): object | null {
  try {
    let fixed = str.trim();
    
    const match = fixed.match(/\{[\s\S]*\}/);
    if (match) {
      fixed = match[0];
    }
    
    const parsed = JSON.parse(fixed);
    if (parsed && typeof parsed === "object" && parsed.title && parsed.slides) {
      return parsed;
    }
    
    return null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const session = await auth();
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { topic } = await request.json();

  if (!topic) {
    return NextResponse.json({ error: "Topic is required" }, { status: 400 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OpenRouter API key not configured" }, { status: 500 });
  }

  const systemPrompt = `You are an expert slide designer. Create a presentation with 5-7 slides based on the topic provided. Return ONLY valid JSON with this exact structure:
{
  "title": "Presentation Title",
  "slides": [
    {
      "id": 1,
      "title": "Slide Title",
      "content": "Main content for the slide - keep it concise and impactful",
      "layout": "title"
    },
    {
      "id": 2,
      "title": "Second Slide Title",
      "content": "Key points to discuss on this slide",
      "layout": "content"
    }
  ]
}
Use varied layouts: "title" for title/intro slides, "content" for regular content, "two-column" for comparisons (use | to separate columns), "quote" for impactful quotes.
IMPORTANT: Return ONLY the JSON, no markdown, no code blocks, no explanation.`;

  const attempts = [
    { max_tokens: 2500, temperature: 0.7 },
    { max_tokens: 3000, temperature: 0.8 },
  ];

  for (const attempt of attempts) {
    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Create a presentation about: ${topic}` },
          ],
          max_tokens: attempt.max_tokens,
          temperature: attempt.temperature,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("OpenRouter API error:", error);
        return NextResponse.json({ error: `OpenRouter API error: ${error}` }, { status: response.status });
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        continue;
      }

      let slides = tryParseJSON(content);
      if (!slides) {
        slides = tryFixJSON(content);
      }

      if (slides && typeof slides === "object" && "title" in slides && "slides" in slides) {
        return NextResponse.json(slides);
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        slides = tryParseJSON(jsonMatch[0]);
        if (slides && typeof slides === "object" && "title" in slides && "slides" in slides) {
          return NextResponse.json(slides);
        }
      }
    } catch (error) {
      console.error("Attempt error:", error);
    }
  }

  return NextResponse.json({ error: "Failed to generate valid slides after multiple attempts. Please try again." }, { status: 500 });
}
