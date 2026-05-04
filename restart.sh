#!/bin/bash
# Kill any running Python processes running run.py
pkill -f "run.py"
sleep 2
cd /c/Users/sehan/Desktop/AloeMatee/apps/server
python run.py
