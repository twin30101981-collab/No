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
