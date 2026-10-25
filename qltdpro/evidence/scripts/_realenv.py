# P10 (T8): đường dẫn cho kịch bản dữ liệu thật (xem _realenv.js); PYLIB: thư mục cài xlrd/openpyxl (pip install --target)
import os, sys
R = os.environ.get('QLTD_REAL_ROOT', '/tmp/claude-0/real')
DATA = os.environ.get('QLTD_REAL_DATA', R + '/data')
ROWS = os.environ.get('QLTD_REAL_ROWS', R)
WORK = os.environ.get('QLTD_WORK', '/tmp/claude-0/work1')
OUT = os.environ.get('QLTD_OUT', '/tmp/claude-0/w/out')
PYLIB = os.environ.get('QLTD_PYLIB', '/tmp/claude-0/pylib')
if PYLIB not in sys.path: sys.path.insert(0, PYLIB)
