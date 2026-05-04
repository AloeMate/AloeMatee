import py_compile
import sys

try:
    py_compile.compile(r'c:\Users\sehan\Desktop\AloeMatee\apps\server\app\services\inference.py', doraise=True)
    print("Syntax OK")
except py_compile.PyCompileError as e:
    print(f"Syntax Error: {e}")
    sys.exit(1)
