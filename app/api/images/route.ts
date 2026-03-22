import { auth } from "@/auth";
import { NextResponse } from "next/server";
import Replicate from "replicate";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { prompt } = await request.json();

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { credits: true },
  });

  if (!user || user.credits <= 0) {
    return NextResponse.json({ error: "No credits remaining. Please purchase more credits." }, { status: 403 });
  }

  const apiKey = process.env.REPLICATE_API_TOKEN;
  if (!apiKey) {
    return NextResponse.json({ error: "Replicate API token not configured" }, { status: 500 });
  }

  try {
    const replicate = new Replicate({ auth: apiKey });

    let prediction = await replicate.predictions.create({
      version: "fast-sdxl@0.9.1",
      input: {
        prompt: prompt,
        num_inference_steps: 4,
      },
    });

    let imageUrl = "";
    let attempts = 0;
    const maxAttempts = 60;

    while (prediction.status !== "succeeded" && prediction.status !== "failed" && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      prediction = await replicate.predictions.get(prediction.id);
      attempts++;
    }

    if (prediction.status === "succeeded" && prediction.output) {
      if (Array.isArray(prediction.output)) {
        imageUrl = prediction.output[prediction.output.length - 1] as string;
      } else if (typeof prediction.output === "string") {
        imageUrl = prediction.output;
      }
    }

    if (!imageUrl) {
      return NextResponse.json({ error: "Failed to generate image. Please try again." }, { status: 500 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { credits: user.credits - 1 },
    });

    return NextResponse.json({ imageUrl, creditsRemaining: user.credits - 1 });
  } catch (error) {
    console.error("Error generating image:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate image";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
