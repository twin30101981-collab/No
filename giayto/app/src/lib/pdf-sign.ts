/**
 * pdf-sign.ts — nhúng chữ ký số PKCS#7 (adbe.pkcs7.detached) vào PDF.
 * Dùng pdf-lib dựng ô chữ ký + chỗ trống, node-forge ký SHA-256 bằng khóa từ .p12.
 * Chạy hoàn toàn trên máy; khóa riêng không rời bộ nhớ.
 */
import forge from "node-forge";
import { PDFArray, PDFDocument, PDFHexString, PDFName, PDFNumber, PDFString } from "pdf-lib";
import type { ImportedP12 } from "./p12";

const SIG_BYTES = 8192; // chỗ trống cho chữ ký (hex = ×2)
const BR_PLACEHOLDER = 9999999999;

export interface SignOptions {
  reason?: string;
  location?: string;
  name?: string;
  date?: Date;
}

const latin1 = (b: Uint8Array) => new TextDecoder("latin1").decode(b);
function toBinary(b: Uint8Array): string {
  let s = "";
  for (let i = 0; i < b.length; i += 0x8000)
    s += String.fromCharCode.apply(null, Array.from(b.subarray(i, i + 0x8000)));
  return s;
}

export async function signPdf(
  pdf: Uint8Array,
  key: ImportedP12,
  opts: SignOptions = {},
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdf, { ignoreEncryption: false });
  const ctx = doc.context;
  const date = opts.date ?? new Date();
  const byteRange = PDFArray.withContext(ctx);
  byteRange.push(PDFNumber.of(0));
  for (let i = 0; i < 3; i++) byteRange.push(PDFNumber.of(BR_PLACEHOLDER));

  const sig = ctx.obj({
    Type: "Sig",
    Filter: "Adobe.PPKLite",
    SubFilter: "adbe.pkcs7.detached",
    ByteRange: byteRange,
    Contents: PDFHexString.of("0".repeat(SIG_BYTES * 2)),
    Reason: PDFString.of(opts.reason ?? "Ký số"),
    Location: PDFString.of(opts.location ?? ""),
    Name: PDFString.of(opts.name ?? key.info.commonName),
    M: PDFString.fromDate(date),
  });
  const sigRef = ctx.register(sig);
  const page = doc.getPage(0);
  const widget = ctx.obj({
    Type: "Annot",
    Subtype: "Widget",
    FT: "Sig",
    Rect: [0, 0, 0, 0],
    V: sigRef,
    T: PDFString.of(`Signature${Date.now()}`),
    F: 132,
    P: page.ref,
  });
  const widgetRef = ctx.register(widget);
  let annots = page.node.lookup(PDFName.of("Annots"));
  if (!(annots instanceof PDFArray)) {
    annots = PDFArray.withContext(ctx);
    page.node.set(PDFName.of("Annots"), annots);
  }
  (annots as PDFArray).push(widgetRef);
  const form = doc.getForm(); // tạo AcroForm nếu chưa có
  form.acroForm.dict.set(PDFName.of("SigFlags"), PDFNumber.of(3));
  form.acroForm.addField(widgetRef);

  const out = await doc.save({ useObjectStreams: false });
  const text = latin1(out);

  const cStart = text.indexOf("<" + "0".repeat(SIG_BYTES * 2) + ">");
  if (cStart < 0) throw new Error("Không tạo được chỗ chữ ký trong PDF.");
  const cEnd = cStart + SIG_BYTES * 2 + 2;
  const brRe = new RegExp(`/ByteRange\\s*\\[\\s*0\\s+${BR_PLACEHOLDER}\\s+${BR_PLACEHOLDER}\\s+${BR_PLACEHOLDER}\\s*\\]`);
  const m = brRe.exec(text);
  if (!m) throw new Error("Không tìm thấy vùng ByteRange.");
  const ranges = [0, cStart, cEnd, out.length - cEnd];
  let brText = `/ByteRange [${ranges.join(" ")}]`;
  if (brText.length > m[0].length) throw new Error("ByteRange quá dài.");
  brText = brText.padEnd(m[0].length, " ");
  const bytes = new Uint8Array(out);
  for (let i = 0; i < brText.length; i++) bytes[m.index + i] = brText.charCodeAt(i);

  const signed = new Uint8Array(cStart + (out.length - cEnd));
  signed.set(bytes.subarray(0, cStart), 0);
  signed.set(bytes.subarray(cEnd), cStart);

  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(toBinary(signed));
  const cert = forge.pki.certificateFromPem(key.certPem);
  p7.addCertificate(cert);
  p7.addSigner({
    key: forge.pki.privateKeyFromPem(key.privateKeyPem) as forge.pki.rsa.PrivateKey,
    certificate: cert,
    digestAlgorithm: forge.pki.oids["sha256"]!,
    authenticatedAttributes: [
      { type: forge.pki.oids["contentType"]!, value: forge.pki.oids["data"]! },
      { type: forge.pki.oids["messageDigest"]! },
      { type: forge.pki.oids["signingTime"]!, value: date as unknown as string },
    ],
  });
  p7.sign({ detached: true });
  const hex = forge.util.bytesToHex(forge.asn1.toDer(p7.toAsn1()).getBytes());
  if (hex.length > SIG_BYTES * 2) throw new Error("Chữ ký quá lớn.");
  const padded = hex.padEnd(SIG_BYTES * 2, "0");
  for (let i = 0; i < padded.length; i++) bytes[cStart + 1 + i] = padded.charCodeAt(i);
  return bytes;
}

/** Lấy ByteRange + chữ ký hex của chữ ký cuối trong PDF (dùng cho kiểm tra). */
export function readSignature(pdf: Uint8Array): { ranges: number[]; der: string } | null {
  const text = latin1(pdf);
  const all = [...text.matchAll(/\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/g)];
  const last = all[all.length - 1];
  if (!last) return null;
  const ranges = last.slice(1, 5).map(Number);
  const hex = text.slice(ranges[1] + 1, ranges[2] - 1).replace(/(00)+$/, "");
  return { ranges, der: forge.util.hexToBytes(hex) };
}

export interface SignatureCheck {
  status: "valid" | "modified" | "invalid" | "none";
  signer?: string;
  signedAt?: Date | undefined;
  /** Chứng thư tự ký (không do tổ chức chứng thực cấp) */
  selfSigned?: boolean;
  /** Chữ ký không phủ hết tệp: có nội dung thêm vào sau khi ký */
  coversWholeFile?: boolean;
  certExpired?: boolean;
  message: string;
}

const binOf = (u: Uint8Array) => toBinary(u);

/** Kiểm tra chữ ký số cuối trong PDF: băm nội dung, đối chiếu chữ ký RSA, hạn chứng thư. */
export function verifyPdfSignature(pdf: Uint8Array, at: Date = new Date()): SignatureCheck {
  let s: ReturnType<typeof readSignature>;
  try { s = readSignature(pdf); } catch { s = null; }
  if (!s || !s.der) return { status: "none", message: "Tệp không có chữ ký số." };
  try {
    const [a, b, c, d] = s.ranges as [number, number, number, number];
    const oids = forge.pki.oids;
    const msg = forge.pkcs7.messageFromAsn1(forge.asn1.fromDer(s.der)) as unknown as {
      certificates: forge.pki.Certificate[];
      rawCapture: { authenticatedAttributes: forge.asn1.Asn1[]; signature: string; digestAlgorithm: string };
    };
    const cert = msg.certificates[0];
    if (!cert) return { status: "invalid", message: "Chữ ký thiếu chứng thư." };
    const attrs = msg.rawCapture.authenticatedAttributes ?? [];
    const attrVal = (oid: string) => {
      const x = attrs.find((t) => forge.asn1.derToOid((t.value as forge.asn1.Asn1[])[0]!.value as string) === oid);
      return x ? ((x.value as forge.asn1.Asn1[])[1]!.value as forge.asn1.Asn1[])[0] : undefined;
    };
    const md = forge.md.sha256.create();
    md.update(binOf(pdf.subarray(a, a + b)));
    md.update(binOf(pdf.subarray(c, c + d)));
    const digestNode = attrVal(oids["messageDigest"]!);
    const contentOk = !!digestNode && forge.util.bytesToHex(digestNode.value as string) === md.digest().toHex();

    // chữ ký RSA trên tập thuộc tính (DER SET)
    const set = forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SET, true, attrs);
    const amd = forge.md.sha256.create();
    amd.update(forge.asn1.toDer(set).getBytes());
    let sigOk = false;
    try { sigOk = (cert.publicKey as forge.pki.rsa.PublicKey).verify(amd.digest().getBytes(), msg.rawCapture.signature); } catch { sigOk = false; }

    const timeNode = attrVal(oids["signingTime"]!);
    let signedAt: Date | undefined;
    if (timeNode) try { signedAt = timeNode.type === forge.asn1.Type.UTCTIME ? forge.asn1.utcTimeToDate(timeNode.value as string) : forge.asn1.generalizedTimeToDate(timeNode.value as string); } catch { /* bỏ qua */ }
    const signer = (cert.subject.getField("CN")?.value as string) ?? "";
    let selfSigned = false;
    try { selfSigned = cert.isIssuer(cert) && cert.verify(cert); } catch { selfSigned = false; }
    const ref = signedAt ?? at;
    const certExpired = ref < cert.validity.notBefore || ref > cert.validity.notAfter;
    const coversWholeFile = c + d === pdf.length;
    const base = { signer, signedAt, selfSigned, certExpired, coversWholeFile };
    if (!sigOk) return { ...base, status: "invalid", message: "Chữ ký không hợp lệ — không khớp với chứng thư." };
    if (!contentOk) return { ...base, status: "modified", message: "Tài liệu đã bị sửa sau khi ký." };
    let message = "Chữ ký hợp lệ, nội dung chưa bị sửa.";
    if (!coversWholeFile) message += " Có phần thêm vào sau khi ký.";
    if (certExpired) message += " Chứng thư không còn hiệu lực tại thời điểm ký.";
    if (selfSigned) message += " Chứng thư tự ký — chỉ tin cậy nếu bạn biết người ký.";
    return { ...base, status: "valid", message };
  } catch {
    return { status: "invalid", message: "Không đọc được chữ ký trong tệp." };
  }
}
