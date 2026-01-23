export async function generateQrDataUrl(text: string): Promise<string | null> {
  try {
    const { createCanvas } = await import("canvas");
    const QRCode = (await import("qrcode")).default;
    const canvas = createCanvas(200, 200);
    await QRCode.toCanvas(canvas, text, { margin: 1 });
    return canvas.toDataURL();
  } catch (e) {
    console.error("QR generation failed", e);
    return null;
  }
}
