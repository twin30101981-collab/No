/**
 * p12.ts — tạo và nhập chứng thư số PKCS#12 (.p12/.pfx) để ký PDF.
 * Dùng node-forge (thuần JS, chạy được trên trình duyệt, không cần server).
 * Chứng thư tự ký phục vụ ký số nội bộ; khóa riêng chỉ nằm trong bộ nhớ
 * và trong tệp .p12 người dùng tự giữ — không gửi đi đâu.
 */
import forge from "node-forge";

export interface CertInfo {
  commonName: string;
  organization: string;
  email: string;
  serialNumber: string;
  notBefore: Date;
  notAfter: Date;
  sha256Fingerprint: string;
}

export interface KeyPairP12 {
  /** Tệp .p12 dạng bytes, đã mã hóa bằng mật khẩu */
  p12Bytes: Uint8Array;
  info: CertInfo;
}

// TD-33: forge giữ giá trị thuộc tính dạng byte thô — UTF8String (vd CN "Nguyễn…" do openssl tạo) phải giải mã,
// BMPString là UTF-16BE. Không giải mã thì tên có dấu hiện vỡ mã ("Nguyá»n…").
export function fieldText(field: unknown): string {
  const f = field as { value?: unknown; valueTagClass?: number } | null | undefined;
  if (!f || typeof f.value !== "string") return "";
  if (f.valueTagClass === forge.asn1.Type.UTF8) { try { return forge.util.decodeUtf8(f.value); } catch { return f.value; } }
  if (f.valueTagClass === forge.asn1.Type.BMPSTRING) {
    let out = ""; for (let i = 0; i + 1 < f.value.length; i += 2) out += String.fromCharCode((f.value.charCodeAt(i) << 8) | f.value.charCodeAt(i + 1));
    return out;
  }
  return f.value;
}
/** Chuỗi JS → byte UTF-16BE (dạng chuỗi nhị phân của forge) cho BMPString (friendlyName của .p12). */
function toBmp(s: string): string {
  let out = ""; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); out += String.fromCharCode(c >> 8, c & 0xff); }
  return out;
}

function certInfo(cert: forge.pki.Certificate): CertInfo {
  const get = (name: string) => fieldText(cert.subject.getField(name));
  const md = forge.md.sha256.create();
  md.update(forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes());
  return {
    commonName: get("CN"),
    organization: get("O"),
    email: get("E"),
    serialNumber: cert.serialNumber,
    notBefore: cert.validity.notBefore,
    notAfter: cert.validity.notAfter,
    sha256Fingerprint: md.digest().toHex(),
  };
}

export interface CreateCertOptions {
  commonName: string;
  organization?: string;
  email?: string;
  /** Số ngày hiệu lực, mặc định 825 (~27 tháng) */
  days?: number;
  /** Mật khẩu bảo vệ tệp .p12 (bắt buộc, tối thiểu 6 ký tự) */
  password: string;
}

/** Tạo cặp khóa RSA-2048 + chứng thư tự ký, đóng gói thành .p12. */
export function createP12(opts: CreateCertOptions): KeyPairP12 {
  if (!opts.password || opts.password.length < 6)
    throw new Error("Mật khẩu chứng thư cần ít nhất 6 ký tự.");
  if (!opts.commonName.trim()) throw new Error("Cần nhập tên chủ thể.");

  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  // P18: số serial phải DƯƠNG (RFC 5280); byte đầu ≥ 0x80 bị hiểu là số âm ("-7AE8…" khi openssl đọc).
  const sn = forge.random.getBytesSync(16);
  cert.serialNumber = forge.util.bytesToHex(String.fromCharCode((sn.charCodeAt(0) & 0x7f) | 0x40) + sn.slice(1));
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setDate(
    cert.validity.notAfter.getDate() + (opts.days ?? 825),
  );
  const attrs: forge.pki.CertificateField[] = [
    // TD-33: UTF8String để tên có dấu không bị cắt byte (mặc định forge dùng PrintableString).
    { name: "commonName", value: opts.commonName.trim(), valueTagClass: forge.asn1.Type.UTF8 as number },
  ];
  if (opts.organization?.trim())
    attrs.push({ name: "organizationName", value: opts.organization.trim(), valueTagClass: forge.asn1.Type.UTF8 as number });
  if (opts.email?.trim())
    attrs.push({ name: "emailAddress", value: opts.email.trim(), valueTagClass: forge.asn1.Type.IA5STRING as number });
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.setExtensions([
    { name: "basicConstraints", cA: false },
    { name: "keyUsage", digitalSignature: true, nonRepudiation: true },
    { name: "extKeyUsage", emailProtection: true },
  ]);
  cert.sign(keys.privateKey, forge.md.sha256.create());

  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], opts.password, {
    algorithm: "3des",
    friendlyName: toBmp(opts.commonName.trim()), // BMPString = UTF-16BE
  });
  const der = forge.asn1.toDer(p12Asn1).getBytes();
  const p12Bytes = new Uint8Array(der.length);
  for (let i = 0; i < der.length; i++) p12Bytes[i] = der.charCodeAt(i);
  return { p12Bytes, info: certInfo(cert) };
}

export interface ImportedP12 {
  info: CertInfo;
  /** PEM khóa riêng — chỉ giữ trong bộ nhớ, dùng để ký rồi bỏ */
  privateKeyPem: string;
  certPem: string;
}

/** Mở tệp .p12 bằng mật khẩu, lấy chứng thư + khóa riêng. */
export function importP12(p12Bytes: Uint8Array, password: string): ImportedP12 {
  let der = "";
  for (let i = 0; i < p12Bytes.length; i++) der += String.fromCharCode(p12Bytes[i]!);
  let p12: forge.pkcs12.Pkcs12Pfx;
  try {
    p12 = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(der), password);
  } catch {
    throw new Error("Không mở được tệp chứng thư — sai mật khẩu hoặc tệp hỏng.");
  }
  const certBags = p12.getBags({ bagType: forge.pki.oids["certBag"]! });
  const keyBags = p12.getBags({
    bagType: forge.pki.oids["pkcs8ShroudedKeyBag"]!,
  });
  const cert = certBags[forge.pki.oids["certBag"]!]?.[0]?.cert;
  const key = keyBags[forge.pki.oids["pkcs8ShroudedKeyBag"]!]?.[0]?.key;
  if (!cert || !key)
    throw new Error("Tệp chứng thư thiếu chứng thư hoặc khóa riêng.");
  return {
    info: certInfo(cert),
    privateKeyPem: forge.pki.privateKeyToPem(key),
    certPem: forge.pki.certificateToPem(cert),
  };
}

/** Kiểm tra chứng thư còn hạn tại thời điểm cho trước. */
export function isCertValid(info: CertInfo, at: Date = new Date()): boolean {
  return at >= info.notBefore && at <= info.notAfter;
}
