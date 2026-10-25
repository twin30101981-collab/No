// Kiểm thử V2 (Node) cho module TD.num / TD.date: node td_numdate.test.js
const path = require('path');
const TD = require(path.join(__dirname, 'td_numdate.js'));
let pass = 0, fail = 0;
const eq = (name, got, want) => {
  const ok = (typeof want === 'number' && isNaN(want)) ? (typeof got === 'number' && isNaN(got)) : Object.is(got, want);
  if (ok) pass++; else { fail++; console.log('FAIL', name, '→', got, '(mong đợi', want + ')'); }
};
const P = TD.num.parse;
// ── số: các lỗi đã xác minh ở bản cũ
eq('US 300,000,000', P('300,000,000'), 300000000);          // cũ: 300
eq('VN 300.000.000', P('300.000.000'), 300000000);
eq('VN thập phân 1.234,56', P('1.234,56'), 1234.56);
eq('US thập phân 1,234.56', P('1,234.56'), 1234.56);
eq('1.234.567,5', P('1.234.567,5'), 1234567.5);
eq('1,234,567.5', P('1,234,567.5'), 1234567.5);
eq('một dấu 3 số: 1.234', P('1.234'), 1234);
eq('một dấu 3 số: 300,000', P('300,000'), 300000);
eq('thập phân ngắn 8,5', P('8,5'), 8.5);
eq('thập phân ngắn 8.5', P('8.5'), 8.5);
eq('lãi 0.075', P('0.075'), 0.075);
eq('0,500 là thập phân', P('0,500'), 0.5);
eq('4 chữ số sau dấu 1.2345', P('1.2345'), 1.2345);
eq('số nguyên', P('1234567'), 1234567);
eq('số âm -5', P('-5'), -5);
eq('số âm VN -1.234,5', P('-1.234,5'), -1234.5);
eq('ngoặc (1.234)', P('(1.234)'), -1234);
eq('ký hiệu tiền "1.234 đ"', P('1.234 đ'), 1234);
eq('VND', P('2.160.375.016.661 VND'), 2160375016661);
eq('khoảng trắng', P('  42  '), 42);
eq('phần trăm', P('9,5%'), 9.5);
eq('mũ 1e3', P('1e3'), 1000);
eq('kiểu number', P(12.5), 12.5);
eq('number NaN', P(NaN), NaN);
eq('rỗng', P(''), NaN);
eq('null', P(null), NaN);
eq('chữ', P('abc'), NaN);
eq('nhiều dấu thập phân', P('1,2.3,4'), NaN);
eq('toNumber mặc định 0', TD.num.toNumber('abc'), 0);
eq('toNumber def', TD.num.toNumber('abc', -1), -1);
eq('fmt 1234567', TD.num.fmt(1234567), '1.234.567');
eq('fmt 1234.5,1', TD.num.fmt(1234.5, 1), '1.234,5');
eq('fmt âm', TD.num.fmt(-1234567), '-1.234.567');
eq('fmt 0', TD.num.fmt(0), '0');
// ── groupVND (tiền nhập tay): lỗi nhân 100 của bản cũ
eq('groupVND số thực 1234567.89', TD.num.groupVND(1234567.89), '1.234.568');   // cũ: 123456789 → ×100
eq('groupVND chuỗi máy "1234567.5"', TD.num.groupVND('1234567.5'), '1.234.568');
eq('groupVND gõ tay "1234567"', TD.num.groupVND('1234567'), '1.234.567');
eq('groupVND đã nhóm', TD.num.groupVND('1.234.567'), '1.234.567');
eq('groupVND số âm', TD.num.groupVND(-5000), '-5.000');
eq('groupVND rỗng', TD.num.groupVND(''), '');
eq('groupVND 0', TD.num.groupVND(0), '0');
eq('stripVND', TD.num.stripVND('1.234.567'), '1234567');
eq('stripVND âm', TD.num.stripVND('-1.234'), '-1234');
// ── ngày
const D = (s) => { const d = TD.date.parse(s); return d ? TD.date.iso(d) : null; };
eq('dd/mm/yyyy', D('31/05/2026'), '2026-05-31');
eq('d/m/yyyy', D('1/2/2026'), '2026-02-01');
eq('dd-mm-yyyy', D('15-04-2026'), '2026-04-15');
eq('dd.mm.yyyy', D('30.06.2026'), '2026-06-30');
eq('ISO không thành năm 2031', D('2026-05-31'), '2026-05-31');  // bản TDUP5 cũ: 26/05/2031
eq('ISO có giờ', D('2026-05-31T10:20:00'), '2026-05-31');
eq('yyyy/mm/dd', D('2026/05/31'), '2026-05-31');
eq('yyyymmdd', D('20260531'), '2026-05-31');
eq('dd/mm/yy', D('31/05/26'), '2026-05-31');
eq('có giờ phía sau', D('31/05/2026 10:20'), '2026-05-31');
eq('31/02 bị từ chối', D('31/02/2026'), null);                 // cũ: cuộn thành 03/03
eq('30/02 bị từ chối', D('30/02/2026'), null);
eq('29/02 năm nhuận', D('29/02/2028'), '2028-02-29');
eq('29/02 năm thường', D('29/02/2026'), null);
eq('tháng 13', D('10/13/2026'), null);
eq('ISO 31/02', D('2026-02-31'), null);
eq('thừa chữ số năm', D('31/05/20261'), null);
eq('rỗng', D(''), null);
eq('chữ', D('hôm nay'), null);
eq('Date object', D(new Date(2026, 4, 31)), '2026-05-31');
eq('vn()', TD.date.vn('2026-05-31'), '31/05/2026');
eq('iso()', TD.date.iso('31/05/2026'), '2026-05-31');
eq('isValid', TD.date.isValid('31/02/2026'), false);
// find: ngày bất kỳ trong văn bản
const F = (s) => { const d = TD.date.find(s); return d ? TD.date.iso(d) : null; };
eq('find trong câu', F('Số liệu đến ngày 31/05/2026 (IPCAS)'), '2026-05-31');
eq('find ISO', F('chốt 2026-05-31'), '2026-05-31');
eq('find không bắt đuôi ISO', F('2026-05-31'), '2026-05-31');
eq('find bỏ ngày sai, lấy ngày đúng', F('31/02/2026 rồi 01/03/2026'), '2026-03-01');
eq('find không có', F('không có ngày'), null);
console.log(`Kết quả: ${pass} đạt, ${fail} lỗi, tổng ${pass + fail} ca`);
process.exit(fail ? 1 : 0);
