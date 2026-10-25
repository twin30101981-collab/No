"""HM-13 (phần 1): router hash + lịch sử cho các trang (nguồn: td_router.js). Chèn cuối thân trang; không đổi các lớp bọc showPage
 (gộp 12 lớp bọc vào một đường là HM-13b/HM-21). Theo dõi lớp .active của từng .page nên đúng bất kể thứ tự các lớp bọc.
Dùng: python3 apply_hm13.py <vao.html> <ra.html>"""
import sys, os
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
mod = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'td_router.js'), encoding='utf-8').read()
i = s.rindex('</body>')
blk = '<script id="td-router">\n' + mod.rstrip() + '\ntry { TD.router.install(window); } catch (e) { console.error("[HM-13 router]", e); }\n</script>\n\n'
s = s[:i] + blk + s[i:]
open(dst, 'w', encoding='utf-8').write(s); print('OK', len(s.encode('utf-8')))
