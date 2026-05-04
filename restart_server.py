import subprocess
import time
import os
import signal

# Kill any existing python process running run.py
os.system("taskkill /F /IM python.exe /T")
time.sleep(2)

# Start the server
os.chdir(r"c:\Users\sehan\Desktop\AloeMatee\apps\server")
subprocess.Popen([r"C:\Program Files\Python311\python.exe", "run.py"])
