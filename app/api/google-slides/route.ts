import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { google } from "googleapis";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { presentation } = await request.json();

  if (!presentation || !presentation.title || !presentation.slides) {
    return NextResponse.json({ error: "Invalid presentation data" }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user?.googleAccessToken) {
      return NextResponse.json({ 
        error: "Google account not connected",
        needsAuth: true 
      }, { status: 401 });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL + "/api/auth/callback/google"
    );

    oauth2Client.setCredentials({
      access_token: user.googleAccessToken,
      refresh_token: user.googleRefreshToken,
    });

    const slidesService = google.slides({ version: "v1", auth: oauth2Client });

    const createdPresentation = await slidesService.presentations.create({
      requestBody: {
        title: presentation.title,
      },
    });

    const presentationId = createdPresentation.data.presentationId!;

    for (let i = 0; i < presentation.slides.length; i++) {
      const slide = presentation.slides[i];
      const pageId = `slide_${Date.now()}_${i}`;

      await slidesService.presentations.batchUpdate({
        presentationId,
        requestBody: {
          requests: [
            {
              createSlide: {
                slideLayoutReference: {
                  layoutId: "LAYOUT_5",
                },
                objectId: pageId,
              },
            },
          ],
        },
      });

      await slidesService.presentations.batchUpdate({
        presentationId,
        requestBody: {
          requests: [
            {
              insertText: {
                objectId: pageId,
                text: slide.title,
                insertionIndex: 0,
              },
            },
          ],
        },
      });
    }

    const presentationUrl = `https://docs.google.com/presentation/d/${presentationId}/edit`;

    return NextResponse.json({ url: presentationUrl, id: presentationId });
  } catch (error) {
    console.error("Error creating Google Slides:", error);
    return NextResponse.json({ error: "Failed to create Google Slides" }, { status: 500 });
  }
}
