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

async function generateSlides(apiKey: string, topic: string, systemPrompt: string, userPrompt: string) {
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
            { role: "user", content: userPrompt },
          ],
          max_tokens: attempt.max_tokens,
          temperature: attempt.temperature,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter API error: ${error}`);
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
        return slides;
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        slides = tryParseJSON(jsonMatch[0]);
        if (slides && typeof slides === "object" && "title" in slides && "slides" in slides) {
          return slides;
        }
      }
    } catch (error) {
      console.error("Attempt error:", error);
    }
  }
  return null;
}

export async function POST(request: Request) {
  const session = await auth();
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { topic, existingTopic, existingSlides } = await request.json();

  if (!topic) {
    return NextResponse.json({ error: "Topic is required" }, { status: 400 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OpenRouter API key not configured" }, { status: 500 });
  }

  let systemPrompt: string;
  let userPrompt: string;

  if (existingSlides && existingSlides.length > 0) {
    const slidesJson = JSON.stringify(existingSlides, null, 2);
    systemPrompt = `You are an expert slide designer. You will enhance or modify existing slides based on user feedback. The user wants to CHANGE or IMPROVE their current presentation.

Current slides:
${slidesJson}

Return ONLY valid JSON with this exact structure:
{
  "title": "Presentation Title",
  "slides": [
    {
      "id": 1,
      "title": "Slide Title",
      "content": "Main content for the slide - keep it concise and impactful",
      "layout": "title"
    }
  ]
}
Use varied layouts: "title" for title/intro slides, "content" for regular content, "two-column" for comparisons (use | to separate columns), "quote" for impactful quotes.
IMPORTANT: Return ONLY the JSON, no markdown, no code blocks, no explanation.`;

    userPrompt = `User wants to change/improve their presentation about "${existingTopic}".\n\nTheir request: ${topic}\n\nPlease modify the slides to address their request. Keep the same structure but change the content as requested.`;
  } else {
    systemPrompt = `You are an expert slide designer. Create a presentation with 5-7 slides based on the topic provided. Return ONLY valid JSON with this exact structure:
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

    userPrompt = `Create a presentation about: ${topic}`;
  }

  const slides = await generateSlides(apiKey, topic, systemPrompt, userPrompt);

  if (slides) {
    return NextResponse.json(slides);
  }

  return NextResponse.json({ error: "Failed to generate valid slides after multiple attempts. Please try again." }, { status: 500 });
}
