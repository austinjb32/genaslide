import { auth } from "@/auth";
import { NextResponse } from "next/server";
import Replicate from "replicate";

export async function POST(request: Request) {
  const session = await auth();
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { prompt } = await request.json();

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  const apiKey = process.env.REPLICATE_API_TOKEN;
  if (!apiKey) {
    return NextResponse.json({ error: "Replicate API token not configured" }, { status: 500 });
  }

  try {
    const replicate = new Replicate({ auth: apiKey });

    const output = await replicate.run("black-forest-labs/flux-schnell", {
      input: {
        prompt: `${prompt}, cinematic, dramatic lighting, presentation background, abstract, no text, no letters, no words, no typography, 16:9 aspect ratio, high quality, detailed`,
        num_inference_steps: 4,
        guidance: 0,
      },
    });

    const imageUrl = (output as unknown as { url: () => string }[])[0]?.url?.() || (output as string[])[0];

    if (!imageUrl) {
      return NextResponse.json({ error: "No image generated" }, { status: 500 });
    }

    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error("Error generating image:", error);
    return NextResponse.json({ error: "Failed to generate image" }, { status: 500 });
  }
}
