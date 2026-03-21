import { auth } from "@/auth";
import { NextResponse } from "next/server";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

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

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "nvidia/nemotron-3-super-120b-a12b:free",
        messages: [
          {
            role: "system",
            content: `You are an expert slide designer. Create a presentation with 5-7 slides based on the topic provided. Return ONLY valid JSON with this exact structure:
{
  "title": "Presentation Title",
  "slides": [
    {
      "id": 1,
      "title": "Slide Title",
      "content": "Main content for the slide",
      "layout": "title" | "content" | "two-column" | "quote"
    }
  ]
}
Each slide should be concise, impactful, and visually engaging. Use varied layouts.`,
          },
          {
            role: "user",
            content: `Create a presentation about: ${topic}`,
          },
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenRouter API error:", error);
      return NextResponse.json({ error: `OpenRouter API error: ${error}` }, { status: response.status });
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ error: "No content generated" }, { status: 500 });
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Invalid response format" }, { status: 500 });
    }

    const slides = JSON.parse(jsonMatch[0]);
    return NextResponse.json(slides);
  } catch (error) {
    console.error("Error generating slides:", error);
    return NextResponse.json({ error: "Failed to generate slides" }, { status: 500 });
  }
}
