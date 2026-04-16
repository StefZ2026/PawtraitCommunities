// Calendar PDF composition engine
// Takes 12 portrait images + cover → produces a print-ready PDF for Gelato
// 11x8.5 folded (11x17 open), 300 DPI, bleed included

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import sharp from "sharp";

// Print specs for 11x17 wall calendar
const PAGE_WIDTH_IN = 11;
const PAGE_HEIGHT_IN = 17; // Full open height (image top + calendar grid bottom)
const DPI = 300;
const BLEED_IN = 0.125; // 1/8 inch bleed on all sides

const PAGE_WIDTH_PX = (PAGE_WIDTH_IN + BLEED_IN * 2) * DPI; // 3375
const PAGE_HEIGHT_PX = (PAGE_HEIGHT_IN + BLEED_IN * 2) * DPI; // 5175

const IMAGE_HEIGHT_PX = Math.round(PAGE_HEIGHT_PX * 0.55); // Image takes top 55%
const GRID_HEIGHT_PX = PAGE_HEIGHT_PX - IMAGE_HEIGHT_PX; // Calendar grid takes bottom 45%

const SAFE_MARGIN_PX = Math.round(0.25 * DPI); // 0.25 inch safe margin

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Process a single image for calendar print quality
 */
async function processImage(imageUrl: string, targetWidth: number, targetHeight: number): Promise<Buffer> {
  // Fetch image
  const res = await fetch(imageUrl);
  const buffer = Buffer.from(await res.arrayBuffer());

  // Process with sharp: resize, crop, sharpen, normalize
  return sharp(buffer)
    .resize(targetWidth, targetHeight, {
      fit: "cover",
      position: "centre", // Auto-center subject
    })
    .sharpen({ sigma: 0.8 }) // Slight sharpening for print
    .normalize() // Normalize brightness/contrast
    .jpeg({ quality: 95 })
    .toBuffer();
}

/**
 * Get the day of week (0=Sun) for the first day of a month
 */
function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

/**
 * Get number of days in a month
 */
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Generate a complete calendar PDF
 * @param images - Array of 12 objects { imageUrl, month (1-12) } sorted by month
 * @param coverImage - Cover image { imageUrl, type: "single" | "collage" }
 * @param calendarName - e.g. "Buddy's 2027 Calendar"
 * @param year - Calendar year
 * @param startMonth - Starting month (1-12)
 * @param petName - Optional pet name to show on each page
 */
export async function generateCalendarPDF(
  images: Array<{ imageUrl: string; month: number }>,
  coverImage: { imageUrl: string; type: string } | null,
  calendarName: string,
  year: number,
  startMonth: number = 1,
  petName?: string
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.TimesRoman);

  // Points (PDF uses points, 1 inch = 72 points)
  const pageW = (PAGE_WIDTH_IN + BLEED_IN * 2) * 72;
  const pageH = (PAGE_HEIGHT_IN + BLEED_IN * 2) * 72;
  const bleed = BLEED_IN * 72;
  const safeMarg = 0.25 * 72;

  const imageH = pageH * 0.55;
  const gridH = pageH - imageH;

  // Cover page
  if (coverImage) {
    const page = pdfDoc.addPage([pageW, pageH]);
    try {
      const imgBuf = await processImage(coverImage.imageUrl, PAGE_WIDTH_PX, PAGE_HEIGHT_PX);
      const img = await pdfDoc.embedJpg(imgBuf);
      page.drawImage(img, { x: 0, y: 0, width: pageW, height: pageH });
    } catch (e: any) {
      console.error("[calendar-pdf] Cover image failed:", e.message);
      page.drawRectangle({ x: 0, y: 0, width: pageW, height: pageH, color: rgb(0.95, 0.95, 0.95) });
    }

    // Calendar name overlay on cover
    const titleSize = 36;
    const titleWidth = font.widthOfTextAtSize(calendarName, titleSize);
    page.drawRectangle({
      x: pageW / 2 - titleWidth / 2 - 20,
      y: pageH * 0.1,
      width: titleWidth + 40,
      height: titleSize + 30,
      color: rgb(1, 1, 1),
      opacity: 0.85,
    });
    page.drawText(calendarName, {
      x: pageW / 2 - titleWidth / 2,
      y: pageH * 0.1 + 15,
      size: titleSize,
      font,
      color: rgb(0.91, 0.46, 0.12), // #E8751E
    });
  }

  // Month pages
  const sortedImages = [...images].sort((a, b) => {
    // Sort by month, wrapping around startMonth
    const aIdx = ((a.month - startMonth + 12) % 12);
    const bIdx = ((b.month - startMonth + 12) % 12);
    return aIdx - bIdx;
  });

  for (const { imageUrl, month } of sortedImages) {
    const page = pdfDoc.addPage([pageW, pageH]);

    // Draw portrait image (top section)
    try {
      const imgBuf = await processImage(imageUrl, PAGE_WIDTH_PX, IMAGE_HEIGHT_PX);
      const img = await pdfDoc.embedJpg(imgBuf);
      page.drawImage(img, { x: 0, y: gridH, width: pageW, height: imageH });
    } catch (e: any) {
      console.error(`[calendar-pdf] Image failed for month ${month}:`, e.message);
      page.drawRectangle({ x: 0, y: gridH, width: pageW, height: imageH, color: rgb(0.95, 0.95, 0.95) });
    }

    // Month name header
    const monthName = MONTH_NAMES[month - 1];
    const yearStr = String(year);
    const headerText = `${monthName} ${yearStr}`;
    const headerSize = 28;
    const headerWidth = font.widthOfTextAtSize(headerText, headerSize);
    page.drawText(headerText, {
      x: pageW / 2 - headerWidth / 2,
      y: gridH - bleed - safeMarg - headerSize,
      size: headerSize,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });

    // Pet name (optional)
    if (petName) {
      const petSize = 14;
      const petWidth = fontRegular.widthOfTextAtSize(petName, petSize);
      page.drawText(petName, {
        x: pageW / 2 - petWidth / 2,
        y: gridH - bleed - safeMarg - headerSize - petSize - 8,
        size: petSize,
        font: fontRegular,
        color: rgb(0.5, 0.5, 0.5),
      });
    }

    // Calendar grid
    const gridTop = gridH - bleed - safeMarg - headerSize - (petName ? 30 : 10) - 30;
    const gridLeft = bleed + safeMarg;
    const gridWidth = pageW - 2 * (bleed + safeMarg);
    const cellW = gridWidth / 7;
    const cellH = 28;

    // Day headers
    const dayHeaderSize = 10;
    for (let d = 0; d < 7; d++) {
      const dayW = fontRegular.widthOfTextAtSize(DAY_NAMES[d], dayHeaderSize);
      page.drawText(DAY_NAMES[d], {
        x: gridLeft + d * cellW + cellW / 2 - dayW / 2,
        y: gridTop,
        size: dayHeaderSize,
        font: fontRegular,
        color: rgb(0.4, 0.4, 0.4),
      });
    }

    // Day numbers
    const firstDay = getFirstDayOfMonth(year, month);
    const daysInMonth = getDaysInMonth(year, month);
    const numSize = 12;

    for (let day = 1; day <= daysInMonth; day++) {
      const col = (firstDay + day - 1) % 7;
      const row = Math.floor((firstDay + day - 1) / 7);
      const dayStr = String(day);
      const dayW = fontRegular.widthOfTextAtSize(dayStr, numSize);

      page.drawText(dayStr, {
        x: gridLeft + col * cellW + cellW / 2 - dayW / 2,
        y: gridTop - (row + 1) * cellH - 5,
        size: numSize,
        font: fontRegular,
        color: col === 0 ? rgb(0.8, 0.2, 0.2) : rgb(0.2, 0.2, 0.2), // Sunday = red
      });
    }
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/**
 * Create a collage cover from multiple images
 */
export async function createCollageCover(imageUrls: string[], width: number = PAGE_WIDTH_PX, height: number = PAGE_HEIGHT_PX): Promise<Buffer> {
  const count = Math.min(imageUrls.length, 6);
  const cols = count <= 2 ? 2 : 3;
  const rows = Math.ceil(count / cols);
  const cellW = Math.floor(width / cols);
  const cellH = Math.floor(height / rows);

  const composites: Array<{ input: Buffer; top: number; left: number }> = [];

  for (let i = 0; i < count; i++) {
    try {
      const res = await fetch(imageUrls[i]);
      const buf = Buffer.from(await res.arrayBuffer());
      const processed = await sharp(buf).resize(cellW, cellH, { fit: "cover" }).toBuffer();
      composites.push({
        input: processed,
        top: Math.floor(i / cols) * cellH,
        left: (i % cols) * cellW,
      });
    } catch (e: any) {
      console.error(`[calendar-pdf] Collage image ${i} failed:`, e.message);
    }
  }

  return sharp({
    create: { width, height, channels: 3, background: { r: 255, g: 255, b: 255 } },
  })
    .composite(composites)
    .jpeg({ quality: 95 })
    .toBuffer();
}
