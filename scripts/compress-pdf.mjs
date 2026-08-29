#!/usr/bin/env node
/**
 * ضغط ملف PDF ممسوح ضوئيًا بإعادة ترميز صور JPEG المضمّنة فيه.
 *
 * الاستخدام:
 *   node scripts/compress-pdf.mjs <ملف-المصدر> <ملف-الوجهة> [الجودة] [أقصى-حجم-بالميجابايت]
 *
 * مثال:
 *   node scripts/compress-pdf.mjs "in.pdf" "out.pdf" 88 49
 *
 * ⚠️ لا يُعدّل ملف المصدر إطلاقًا — يكتب نسخة جديدة فقط.
 *
 * كيف يعمل:
 *   ملفات المحاضرات صور ممسوحة، كل صفحة صورة JPEG واحدة مخزّنة بمرشّح
 *   DCTDecode. نستخرج بايتات كل صورة (وهي JPEG صالح كما هو)، ونعيد ترميزها
 *   بـ mozjpeg عند الجودة المطلوبة، ثم نستبدل مجرى البيانات في مكانه.
 *   الأبعاد وفضاء الألوان لا يتغيّران، فلا يتأثر تخطيط الصفحة.
 *
 * الأمان:
 *   • تُتخطّى أي صورة ليست DeviceRGB أو DeviceGray (مثل CMYK) تفاديًا
 *     لانزياح الألوان.
 *   • تُتخطّى أي صورة يكبر حجمها بعد إعادة الترميز.
 *   • تُتخطّى الأقنعة (SMask/Mask) لأن إعادة ترميزها بالفقد تُفسد الشفافية.
 */

import { readFile, writeFile } from "node:fs/promises";
import { PDFDocument, PDFName, PDFRawStream, PDFDict } from "pdf-lib";
import sharp from "sharp";

const [, , srcPath, outPath, qualityArg, maxMbArg] = process.argv;

if (!srcPath || !outPath) {
  console.error(
    "الاستخدام: node scripts/compress-pdf.mjs <مصدر> <وجهة> [جودة=88] [أقصى-ميجابايت]",
  );
  process.exit(1);
}

const quality = Number(qualityArg) || 88;
const maxMb = maxMbArg ? Number(maxMbArg) : null;
const mb = (n) => (n / 1024 / 1024).toFixed(2);

const srcBytes = await readFile(srcPath);
console.log(`\nالمصدر   : ${srcPath}`);
console.log(`الحجم    : ${mb(srcBytes.byteLength)} MB`);
console.log(`الجودة   : ${quality}\n`);

const doc = await PDFDocument.load(srcBytes, { ignoreEncryption: true });
console.log(`الصفحات  : ${doc.getPageCount()}`);

// اجمع مراجع الأقنعة حتى لا نلمسها
const maskRefs = new Set();
for (const [, obj] of doc.context.enumerateIndirectObjects()) {
  const dict = obj instanceof PDFRawStream ? obj.dict : obj instanceof PDFDict ? obj : null;
  if (!dict) continue;
  for (const key of ["SMask", "Mask"]) {
    const ref = dict.get(PDFName.of(key));
    if (ref) maskRefs.add(ref.toString());
  }
}

let processed = 0;
let skipped = 0;
let savedBytes = 0;

for (const [ref, obj] of doc.context.enumerateIndirectObjects()) {
  if (!(obj instanceof PDFRawStream)) continue;

  const dict = obj.dict;
  const subtype = dict.get(PDFName.of("Subtype"));
  if (subtype?.toString() !== "/Image") continue;

  const filter = dict.get(PDFName.of("Filter"))?.toString() ?? "";
  if (!filter.includes("DCTDecode")) {
    skipped += 1;
    continue;
  }

  if (maskRefs.has(ref.toString())) {
    skipped += 1;
    continue;
  }

  const cs = dict.get(PDFName.of("ColorSpace"))?.toString() ?? "";
  const isSafeCs =
    cs.includes("DeviceRGB") || cs.includes("DeviceGray") || cs.includes("ICCBased") || cs === "";
  if (!isSafeCs) {
    skipped += 1;
    continue;
  }

  const original = Buffer.from(obj.contents);

  try {
    const meta = await sharp(original).metadata();
    // تفادي CMYK صراحةً
    if (meta.space === "cmyk") {
      skipped += 1;
      continue;
    }

    let pipeline = sharp(original).jpeg({
      quality,
      mozjpeg: true,
      chromaSubsampling: "4:4:4", // يحافظ على حدة النص العربي
    });
    if (meta.space === "b-w" || meta.channels === 1) {
      pipeline = pipeline.toColourspace("b-w");
    }

    const recoded = await pipeline.toBuffer();

    if (recoded.byteLength >= original.byteLength) {
      skipped += 1;
      continue;
    }

    const newDict = dict.clone();
    newDict.set(PDFName.of("Length"), doc.context.obj(recoded.byteLength));
    doc.context.assign(ref, PDFRawStream.of(newDict, new Uint8Array(recoded)));

    savedBytes += original.byteLength - recoded.byteLength;
    processed += 1;
  } catch {
    skipped += 1;
  }
}

console.log(`أُعيد ترميز : ${processed} صورة`);
console.log(`تُخطّي      : ${skipped} صورة`);
console.log(`وُفّر        : ${mb(savedBytes)} MB من الصور\n`);

const out = await doc.save({ useObjectStreams: true });
await writeFile(outPath, out);

const pct = ((1 - out.byteLength / srcBytes.byteLength) * 100).toFixed(1);
console.log(`الوجهة   : ${outPath}`);
console.log(`الحجم    : ${mb(out.byteLength)} MB  (توفير ${pct}%)`);

if (maxMb) {
  const ok = out.byteLength < maxMb * 1024 * 1024;
  console.log(
    ok
      ? `\n✓ تحت الحد المطلوب (${maxMb} MB).\n`
      : `\n✗ ما زال فوق ${maxMb} MB — أعِد التشغيل بجودة أقل.\n`,
  );
  if (!ok) process.exit(2);
}
