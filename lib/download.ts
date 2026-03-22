import PptxGenJS from "pptxgenjs";
import jsPDF from "jspdf";

interface Slide {
  id: number;
  title: string;
  content: string;
  layout: "title" | "content" | "two-column" | "quote" | "stat" | "cards" | "split";
  backgroundImage?: string;
}

interface Presentation {
  title: string;
  slides: Slide[];
}

async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    if (!url || url.startsWith("data:")) {
      return url || null;
    }
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch image: ${response.status}`);
      return null;
    }
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/png";
    const base64 = Buffer.from(buffer).toString("base64");
    return `${contentType};base64,${base64}`;
  } catch (error) {
    console.error("Error fetching image:", error);
    return null;
  }
}

export async function generatePPTX(presentation: Presentation): Promise<Buffer> {
  const pptx = new PptxGenJS();

  pptx.layout = "LAYOUT_16x9";
  pptx.title = presentation.title;
  pptx.author = "GenASlide";

  for (const slideData of presentation.slides) {
    const slide = pptx.addSlide();

    if (slideData.backgroundImage) {
      const imageData = await fetchImageAsBase64(slideData.backgroundImage);
      if (imageData) {
        slide.background = { data: imageData };
      } else {
        const bgColors: Record<string, string> = {
          title: "7c3aed",
          content: "1e293b",
          "two-column": "312e81",
          quote: "581c87",
          stat: "0f766e",
          cards: "1e40af",
          split: "1f2937",
        };
        slide.background = { color: bgColors[slideData.layout] || "1e1b4b" };
      }
    } else {
      const bgColors: Record<string, string> = {
        title: "7c3aed",
        content: "1e293b",
        "two-column": "312e81",
        quote: "581c87",
        stat: "0f766e",
        cards: "1e40af",
        split: "1f2937",
      };
      slide.background = { color: bgColors[slideData.layout] || "1e1b4b" };
    }

    switch (slideData.layout) {
      case "title":
        slide.addText(slideData.title, {
          x: 0.5,
          y: 2,
          w: 9,
          h: 1.5,
          fontSize: 44,
          bold: true,
          color: "FFFFFF",
          align: "center",
        });
        slide.addText(slideData.content, {
          x: 0.5,
          y: 3.5,
          w: 9,
          h: 1,
          fontSize: 20,
          color: "e9d5ff",
          align: "center",
        });
        break;
      case "quote":
        slide.addText('"', {
          x: 0.5,
          y: 1,
          w: 9,
          h: 1,
          fontSize: 72,
          color: "a78bfa",
          align: "center",
        });
        slide.addText(slideData.content, {
          x: 0.5,
          y: 2,
          w: 9,
          h: 2,
          fontSize: 24,
          italic: true,
          color: "FFFFFF",
          align: "center",
        });
        slide.addText(slideData.title, {
          x: 0.5,
          y: 4,
          w: 9,
          h: 0.5,
          fontSize: 18,
          bold: true,
          color: "c4b5fd",
          align: "center",
        });
        break;
      case "two-column":
        const parts = slideData.content.split("|");
        slide.addText(slideData.title, {
          x: 0.5,
          y: 0.5,
          w: 9,
          h: 0.8,
          fontSize: 32,
          bold: true,
          color: "FFFFFF",
        });
        slide.addText(parts[0] || slideData.content, {
          x: 0.5,
          y: 1.5,
          w: 4.25,
          h: 3,
          fontSize: 16,
          color: "e9d5ff",
        });
        slide.addText(parts[1] || "", {
          x: 5.25,
          y: 1.5,
          w: 4.25,
          h: 3,
          fontSize: 16,
          color: "e9d5ff",
        });
        break;
      case "stat":
        slide.addText(slideData.title, {
          x: 0.5,
          y: 1.5,
          w: 9,
          h: 1,
          fontSize: 48,
          bold: true,
          color: "FFFFFF",
          align: "center",
        });
        slide.addText(slideData.content, {
          x: 0.5,
          y: 2.8,
          w: 9,
          h: 2,
          fontSize: 18,
          color: "a5f3fc",
          align: "center",
        });
        break;
      case "cards":
        slide.addText(slideData.title, {
          x: 0.5,
          y: 0.3,
          w: 9,
          h: 0.6,
          fontSize: 24,
          bold: true,
          color: "FFFFFF",
          align: "center",
        });
        const cardItems = slideData.content.split("\n").filter((s: string) => s.trim());
        cardItems.forEach((item: string, idx: number) => {
          const [cardTitle, ...descParts] = item.split(":");
          const cardDesc = descParts.join(":").trim();
          const col = idx % 3;
          const row = Math.floor(idx / 3);
          slide.addText(cardTitle, {
            x: 0.5 + col * 3.1,
            y: 1.2 + row * 2,
            w: 2.9,
            h: 0.5,
            fontSize: 14,
            bold: true,
            color: "fbbf24",
          });
          slide.addText(cardDesc, {
            x: 0.5 + col * 3.1,
            y: 1.6 + row * 2,
            w: 2.9,
            h: 1.2,
            fontSize: 11,
            color: "e9d5ff",
          });
        });
        break;
      case "split":
        const splitParts = slideData.content.split("|");
        slide.addText(slideData.title, {
          x: 0.5,
          y: 1.5,
          w: 4,
          h: 3,
          fontSize: 28,
          bold: true,
          color: "FFFFFF",
        });
        slide.addText(splitParts[1] || splitParts[0] || slideData.content, {
          x: 5,
          y: 1.5,
          w: 4.5,
          h: 3,
          fontSize: 16,
          color: "e9d5ff",
        });
        break;
      default:
        slide.addText(slideData.title, {
          x: 0.5,
          y: 0.5,
          w: 9,
          h: 1,
          fontSize: 32,
          bold: true,
          color: "FFFFFF",
        });
        slide.addText(slideData.content, {
          x: 0.5,
          y: 1.8,
          w: 9,
          h: 3,
          fontSize: 18,
          color: "e9d5ff",
        });
    }
  }

  const buffer = await (pptx as unknown as { exportPresentation: (opts: { outputType: string }) => Promise<Uint8Array> }).exportPresentation({ outputType: "nodebuffer" });
  return Buffer.from(buffer);
}

export async function generatePDF(presentation: Presentation): Promise<Buffer> {
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < presentation.slides.length; i++) {
    const slideData = presentation.slides[i];

    if (i > 0) {
      pdf.addPage();
    }

    if (slideData.backgroundImage) {
      const imageData = await fetchImageAsBase64(slideData.backgroundImage);
      if (imageData) {
        const base64Data = imageData.split(",")[1];
        pdf.addImage(
          `data:image/png;base64,${base64Data}`,
          "PNG",
          0,
          0,
          pageWidth,
          pageHeight
        );
        pdf.setTextColor(255, 255, 255);
      } else {
        pdf.setFillColor(30, 27, 75);
        pdf.rect(0, 0, pageWidth, pageHeight, "F");
        pdf.setTextColor(255, 255, 255);
      }
    } else {
      const bgColors: Record<string, [number, number, number]> = {
        title: [124, 58, 237],
        content: [30, 41, 59],
        "two-column": [49, 46, 129],
        quote: [88, 28, 135],
        stat: [15, 118, 110],
        cards: [30, 64, 175],
        split: [31, 41, 55],
      };
      const color = bgColors[slideData.layout] || [30, 27, 75];
      pdf.setFillColor(color[0], color[1], color[2]);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");
      pdf.setTextColor(255, 255, 255);
    }

    switch (slideData.layout) {
      case "title":
        pdf.setFontSize(36);
        pdf.text(slideData.title, pageWidth / 2, 80, { align: "center" });
        pdf.setFontSize(16);
        pdf.setTextColor(233, 213, 255);
        pdf.text(slideData.content, pageWidth / 2, 110, { align: "center" });
        break;
      case "quote":
        pdf.setFontSize(60);
        pdf.setTextColor(167, 139, 250);
        pdf.text('"', pageWidth / 2, 50, { align: "center" });
        pdf.setFontSize(18);
        pdf.setTextColor(255, 255, 255);
        const contentLines = pdf.splitTextToSize(slideData.content, pageWidth - 40);
        pdf.text(contentLines, pageWidth / 2, 85, { align: "center" });
        pdf.setFontSize(14);
        pdf.setTextColor(196, 181, 253);
        pdf.text(slideData.title, pageWidth / 2, 130, { align: "center" });
        break;
      case "two-column":
        pdf.setFontSize(28);
        pdf.setTextColor(255, 255, 255);
        pdf.text(slideData.title, 15, 25);
        const parts = slideData.content.split("|");
        pdf.setFontSize(12);
        pdf.setTextColor(233, 213, 255);
        const leftLines = pdf.splitTextToSize(parts[0] || slideData.content, 130);
        pdf.text(leftLines, 15, 45);
        if (parts[1]) {
          const rightLines = pdf.splitTextToSize(parts[1], 130);
          pdf.text(rightLines, 155, 45);
        }
        break;
      case "stat":
        pdf.setFontSize(40);
        pdf.setTextColor(255, 255, 255);
        pdf.text(slideData.title, pageWidth / 2, 70, { align: "center" });
        pdf.setFontSize(14);
        pdf.setTextColor(165, 243, 252);
        const statLines = pdf.splitTextToSize(slideData.content, pageWidth - 40);
        pdf.text(statLines, pageWidth / 2, 100, { align: "center" });
        break;
      case "cards":
        pdf.setFontSize(22);
        pdf.setTextColor(255, 255, 255);
        pdf.text(slideData.title, pageWidth / 2, 20, { align: "center" });
        const cardItems = slideData.content.split("\n").filter((s: string) => s.trim());
        cardItems.slice(0, 3).forEach((item: string, idx: number) => {
          const [cardTitle, ...descParts] = item.split(":");
          const cardDesc = descParts.join(":").trim();
          const x = 20 + idx * 85;
          pdf.setFontSize(12);
          pdf.setTextColor(251, 191, 36);
          pdf.text(cardTitle?.trim() || "", x, 50);
          pdf.setFontSize(10);
          pdf.setTextColor(233, 213, 255);
          const cardLines = pdf.splitTextToSize(cardDesc || "", 70);
          pdf.text(cardLines, x, 60);
        });
        break;
      case "split":
        pdf.setFontSize(24);
        pdf.setTextColor(255, 255, 255);
        pdf.text(slideData.title, 15, 50);
        const splitParts = slideData.content.split("|");
        pdf.setFontSize(12);
        pdf.setTextColor(233, 213, 255);
        const splitLines = pdf.splitTextToSize(splitParts[1] || splitParts[0] || slideData.content, 100);
        pdf.text(splitLines, 160, 40);
        break;
      default:
        pdf.setFontSize(28);
        pdf.setTextColor(255, 255, 255);
        pdf.text(slideData.title, 15, 25);
        pdf.setFontSize(14);
        pdf.setTextColor(233, 213, 255);
        const defaultLines = pdf.splitTextToSize(slideData.content, pageWidth - 30);
        pdf.text(defaultLines, 15, 45);
    }
  }

  const arrayBuffer = pdf.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
