import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { generatePPTX, generatePDF } from "@/lib/download";

export async function POST(request: Request) {
  const session = await auth();
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { presentation, format } = await request.json();

  if (!presentation || !format) {
    return NextResponse.json({ error: "Presentation and format required" }, { status: 400 });
  }

  try {
    if (format === "pptx") {
      const buffer = await generatePPTX(presentation);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          "Content-Disposition": `attachment; filename="${presentation.title.replace(/[^a-z0-9]/gi, "_")}.pptx"`,
        },
      });
    } else if (format === "pdf") {
      const buffer = await generatePDF(presentation);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${presentation.title.replace(/[^a-z0-9]/gi, "_")}.pdf"`,
        },
      });
    } else {
      return NextResponse.json({ error: "Invalid format" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error generating download:", error);
    return NextResponse.json({ error: "Failed to generate download" }, { status: 500 });
  }
}
