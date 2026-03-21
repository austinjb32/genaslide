import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const presentation = await prisma.presentation.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!presentation) {
      return NextResponse.json({ error: "Presentation not found" }, { status: 404 });
    }

    return NextResponse.json(presentation);
  } catch (error) {
    console.error("Error fetching presentation:", error);
    return NextResponse.json({ error: "Failed to fetch presentation" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { title, slides } = await request.json();

  try {
    const presentation = await prisma.presentation.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!presentation) {
      return NextResponse.json({ error: "Presentation not found" }, { status: 404 });
    }

    const updated = await prisma.presentation.update({
      where: { id },
      data: { title, slides },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating presentation:", error);
    return NextResponse.json({ error: "Failed to update presentation" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const presentation = await prisma.presentation.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!presentation) {
      return NextResponse.json({ error: "Presentation not found" }, { status: 404 });
    }

    await prisma.presentation.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting presentation:", error);
    return NextResponse.json({ error: "Failed to delete presentation" }, { status: 500 });
  }
}
