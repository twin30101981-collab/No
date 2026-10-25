
(function(){
  // Chuẩn hoá 1 phần khoá: bỏ mọi ký tự không phải chữ/số, viết hoa.
  // Áp dụng cho cả Mã KH (số thuần, có/không dấu "-") và Số HĐTD (chữ+số).
  function _tsbdNormKeyPart(v) {
    return String(v || '').trim().toUpperCase().replace(/[^0-9A-Z]/g, '');
  }

  // Ghi đè tsbdFromLinkedHoso gốc (dòng ~23220) bằng bản có chuẩn hoá khoá.
  window.tsbdFromLinkedHoso = function tsbdFromLinkedHoso(ma, soHD) {
    try {
      const maN = _tsbdNormKeyPart(ma);
      const hdN = _tsbdNormKeyPart(soHD);
      if (!maN && !hdN) return null;

      const links   = (typeof hsvvLinkGetAll === 'function') ? hsvvLinkGetAll() : {};
      const records = (typeof hosoGetAll === 'function') ? hosoGetAll() : {};

      const hosoId = Object.keys(links).find(function (id) {
        const stored = String(links[id] || '').split('|');
        const lMa = _tsbdNormKeyPart(stored[0]);
        const lHd = _tsbdNormKeyPart(stored[1]);
        if (!lMa) return false;
        if (maN && lMa !== maN) return false;               // Mã KH phải khớp khi có
        if (hdN && lHd && lHd !== hdN) return false;         // Số HĐ chỉ so khi cả 2 bên đều có
        return true;
      });

      if (!hosoId || !records[hosoId]) return null;
      const raw = records[hosoId]._tsbdData;
      if (!raw) return null;
      const list = JSON.parse(raw);
      if (!Array.isArray(list) || !list.length) return null;

      const tong = list.reduce(function (sum, ts) {
        return sum + (parseFloat(String(ts.giaTS || '').replace(/[^\d.-]/g, '')) || 0);
      }, 0);

      return { list: list, tong: tong, soLuong: list.length, hosoId: hosoId };
    } catch (e) {
      console.error('[PATCH tsbdFromLinkedHoso]', e);
      return null;
    }
  };

  console.info('[PATCH] tsbdFromLinkedHoso đã được vá — chuẩn hoá khoá Mã KH/Số HĐTD (bỏ dấu "-", khoảng trắng, không phân biệt hoa/thường).');
})();
