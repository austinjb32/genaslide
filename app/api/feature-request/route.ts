import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { userType: true },
  });

  if (user?.userType !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const featureRequests = await prisma.featureRequest.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(featureRequests);
  } catch (error) {
    console.error("Error fetching feature requests:", error);
    return NextResponse.json({ error: "Failed to fetch feature requests" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { message } = await request.json();

  if (!message || message.trim().length === 0) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  try {
    const featureRequest = await prisma.featureRequest.create({
      data: {
        email: session.user.email,
        message: message.trim(),
      },
    });

    return NextResponse.json(featureRequest);
  } catch (error) {
    console.error("Error creating feature request:", error);
    return NextResponse.json({ error: "Failed to submit feature request" }, { status: 500 });
  }
}
