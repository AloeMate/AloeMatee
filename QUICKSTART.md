# AloeVeraMate - Quick Start Guide

This is a simplified guide to get you started quickly. For comprehensive documentation, see [README.md](README.md).

## Prerequisites

- Node.js 18+ 
- Python 3.10+
- Expo Go app on your phone

## 5-Minute Setup

### Automated Setup (Recommended)

**Windows:**
```bash
setup.bat
```

**macOS/Linux:**
```bash
chmod +x setup.sh
./setup.sh
```

### Manual Setup

1. **Install backend dependencies:**
   ```bash
   cd apps/server
   python -m venv venv
   venv\Scripts\activate        # Windows
   # source venv/bin/activate   # macOS/Linux
   pip install -r requirements.txt
   ```

2. **Install mobile dependencies:**
   ```bash
   cd apps/mobile
   npm install
   ```

3. **Configure environment:**
   - Copy `apps/server/.env.example` to `apps/server/.env`
   - Copy `apps/mobile/.env.example` to `apps/mobile/.env`
   - Edit `apps/mobile/.env` and set your computer's IP address

## Running

**Terminal 1 - Backend:**
```bash
cd apps/server
venv\Scripts\activate    # Windows: venv\Scripts\activate
python run.py
```

**Terminal 2 - Mobile:**
```bash
cd apps/mobile
npm start
```

Scan QR code with Expo Go app!

## Finding Your IP Address

**Windows:**
```bash
ipconfig
# Look for IPv4 Address under your active network
```

**macOS/Linux:**
```bash
ifconfig
# Look for inet under your active network interface
```

Update `apps/mobile/.env`:
```
EXPO_PUBLIC_API_URL=http://YOUR_IP_HERE:8000
```

## Troubleshooting

**Can't connect to backend?**
- Ensure backend is running (http://localhost:8000 should work in browser)
- Check your `.env` file has correct IP
- Ensure phone and computer are on same WiFi

**Module not found?**
- Run `npm install` in `apps/mobile`
- Try `npm start -- --clear`

**Python errors?**
- Activate virtual environment
- Run `pip install -r requirements.txt` again

## Next Steps

1. Capture plant image
2. View disease predictions
3. Select treatment type
4. Follow treatment steps

Happy plant care! 🌿
