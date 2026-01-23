export async function generateBarcodeDataUrl(text: string): Promise<string | null> {
  try {
    const { createCanvas } = await import("canvas");
    const JsBarcode = (await import("jsbarcode")).default;
    const canvas = createCanvas(300, 80);
    JsBarcode(canvas, text, { format: "CODE128", displayValue: false, margin: 0 });
    return canvas.toDataURL();
  } catch (e) {
    console.error("Barcode generation failed", e);
    return null;
  }
}
