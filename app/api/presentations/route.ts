import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const presentations = await prisma.presentation.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        topic: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(presentations);
  } catch (error) {
    console.error("Error fetching presentations:", error);
    return NextResponse.json({ error: "Failed to fetch presentations" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, topic, slides } = await request.json();

  if (!title || !topic || !slides) {
    return NextResponse.json({ error: "Title, topic, and slides are required" }, { status: 400 });
  }

  try {
    const presentation = await prisma.presentation.create({
      data: {
        title,
        topic,
        slides,
        userId: session.user.id,
      },
    });

    return NextResponse.json(presentation);
  } catch (error) {
    console.error("Error creating presentation:", error);
    return NextResponse.json({ error: "Failed to create presentation" }, { status: 500 });
  }
}
