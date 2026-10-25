import { describe, expect, it } from "vitest";
import forge from "node-forge";
import { PDFDocument } from "pdf-lib";
import { createP12, importP12 } from "./p12";
import { readSignature, signPdf } from "./pdf-sign";

async function samplePdf() {
  const d = await PDFDocument.create();
  d.addPage([200, 200]).drawText("Xin chao", { x: 20, y: 100 });
  return d.save();
}
const key = importP12(createP12({ commonName: "Ky Thu", password: "matkhau1" }).p12Bytes, "matkhau1");

describe("pdf-sign", () => {
  it("nhúng chữ ký, ByteRange phủ toàn tệp trừ chỗ chữ ký", async () => {
    const out = await signPdf(await samplePdf(), key, { reason: "Duyệt" });
    const s = readSignature(out)!;
    expect(s.ranges[0]).toBe(0);
    expect(s.ranges[2] + s.ranges[3]).toBe(out.length);
    expect((await PDFDocument.load(out)).getPageCount()).toBe(1);
  });

  it("mã băm trong chữ ký khớp nội dung tệp", async () => {
    const out = await signPdf(await samplePdf(), key);
    const s = readSignature(out)!;
    const [a, b, c, d] = s.ranges;
    const md = forge.md.sha256.create();
    const bin = (u: Uint8Array) => Array.from(u, (x) => String.fromCharCode(x)).join("");
    md.update(bin(out.subarray(a, a + b)));
    md.update(bin(out.subarray(c, c + d)));
    const msg = forge.pkcs7.messageFromAsn1(forge.asn1.fromDer(s.der)) as unknown as {
      rawCapture: { authenticatedAttributes: forge.asn1.Asn1[] };
    };
    const attrs = msg.rawCapture.authenticatedAttributes;
    const digestAttr = attrs.find(
      (x) => forge.asn1.derToOid((x.value as forge.asn1.Asn1[])[0].value as string) === forge.pki.oids["messageDigest"]!,
    )!;
    const val = ((digestAttr.value as forge.asn1.Asn1[])[1].value as forge.asn1.Asn1[])[0].value as string;
    expect(forge.util.bytesToHex(val)).toBe(md.digest().toHex());
  });
});

import { verifyPdfSignature } from "./pdf-sign";
describe("verifyPdfSignature", () => {
  it("báo hợp lệ cho tệp vừa ký, nêu người ký và tự ký", async () => {
    const r = verifyPdfSignature(await signPdf(await samplePdf(), key));
    expect(r.status).toBe("valid");
    expect(r.signer).toBe("Ky Thu");
    expect(r.selfSigned).toBe(true);
    expect(r.coversWholeFile).toBe(true);
  });
  it("phát hiện tệp bị sửa sau khi ký", async () => {
    const out = await signPdf(await samplePdf(), key);
    const i = new TextDecoder("latin1").decode(out).indexOf("Xin");
    const bad = new Uint8Array(out); bad[i > 0 ? i : 20] ^= 1;
    expect(verifyPdfSignature(bad).status).toBe("modified");
  });
  it("báo không có chữ ký cho PDF thường", async () => {
    expect(verifyPdfSignature(await samplePdf()).status).toBe("none");
  });
});

describe("pdf-sign – chữ tiếng Việt trong từ điển chữ ký (TD-33)", () => {
  it("Reason/Location/Name giữ đúng dấu khi đọc lại", async () => {
    const { PDFDict, PDFName, PDFString, PDFHexString } = await import("pdf-lib");
    const k = importP12(createP12({ commonName: "Nguyễn Văn Thử", password: "matkhau1" }).p12Bytes, "matkhau1");
    const out = await signPdf(await samplePdf(), k, { reason: "Duyệt tài liệu", location: "Hà Nội" });
    const doc = await PDFDocument.load(out);
    const sig = doc.context.enumerateIndirectObjects().map(([, o]) => o).find((o) => o instanceof PDFDict && o.get(PDFName.of("Type"))?.toString() === "/Sig") as import("pdf-lib").PDFDict;
    const text = (n: string) => { const v = sig.get(PDFName.of(n)); return v instanceof PDFString || v instanceof PDFHexString ? v.decodeText() : undefined; };
    expect(text("Reason")).toBe("Duyệt tài liệu");
    expect(text("Location")).toBe("Hà Nội");
    expect(text("Name")).toBe("Nguyễn Văn Thử");
    const v = verifyPdfSignature(out);
    expect(v.status).toBe("valid");
    expect(v.signer).toBe("Nguyễn Văn Thử");
  });
});

describe("readSignature – DER kết thúc bằng byte 0x00 (P18)", () => {
  it("không cắt mất byte 00 cuối của chữ ký (trước đây bỏ mọi '00' ở cuối → ~1/256 chữ ký bị báo sai)", () => {
    const a = forge.asn1;
    const der = a.toDer(a.create(a.Class.UNIVERSAL, a.Type.SEQUENCE, true, [a.create(a.Class.UNIVERSAL, a.Type.OCTETSTRING, false, "ab\x00\x00")])).getBytes();
    expect(der.endsWith("\x00")).toBe(true);
    const hex = forge.util.bytesToHex(der).padEnd(64, "0");
    const head = "%PDF-1.7\n/ByteRange [0 0000000000 0000000000 0000000000] /Contents <";
    const start = head.length - 1, end = start + hex.length + 2;
    const tail = "> >>\n%%EOF\n";
    const pad = (n: number) => String(n).padStart(10, "0");
    const text = `%PDF-1.7\n/ByteRange [0 ${pad(start)} ${pad(end)} ${pad(tail.length - 1)}] /Contents <${hex}${tail}`;
    const s = readSignature(new TextEncoder().encode(text))!;
    expect(s.der).toBe(der);
  });
});

describe("SignerInfo khớp chứng thư khi tên có dấu (TD-33)", () => {
  it("issuerAndSerialNumber dùng đúng byte tên issuer của chứng thư (không mã UTF-8 hai lần)", async () => {
    const k = importP12(createP12({ commonName: "Nguyễn Văn Thử", password: "matkhau1" }).p12Bytes, "matkhau1");
    const out = await signPdf(await samplePdf(), k);
    const der = readSignature(out)!.der;
    const cert = forge.pki.certificateFromPem(k.certPem) as forge.pki.Certificate & { tbsCertificate: forge.asn1.Asn1 };
    // TBSCertificate: [version, serial, sigAlg, issuer, …] → issuer ở vị trí 3
    const issuerDer = forge.asn1.toDer((cert.tbsCertificate.value as forge.asn1.Asn1[])[3]!).getBytes();
    const count = (h: string) => h.split(issuerDer).length - 1;
    const inCert = count(forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes()); // tự ký: issuer + subject
    expect(count(der)).toBe(inCert + 1); // + 1 lần trong SignerInfo
  });
});
