# Whisper AI Setup Guide for SoundBridge

**Cost:** £0/month (self-hosted, open-source)

---

## What is Whisper?

Whisper is OpenAI's open-source automatic speech recognition (ASR) model. It's completely free to use and runs on your own server.

**Performance:**
- `base` model (recommended): Transcribes 1 hour of audio in ~4 minutes (16x realtime)
- Supports 99+ languages
- Very accurate transcriptions
- Runs on CPU (no GPU required for our use case)

---

## Prerequisites

Before installing Whisper, ensure you have:

1. **Python 3.8 or higher**
   ```bash
   python3 --version
   # Should show: Python 3.8.x or higher
   ```

2. **pip (Python package manager)**
   ```bash
   pip3 --version
   # Should show: pip 20.x or higher
   ```

3. **ffmpeg (audio processing)**
   - This is required for Whisper to read audio files

---

## Installation Steps

### Step 1: Install ffmpeg

#### On Ubuntu/Debian:
```bash
sudo apt update
sudo apt install ffmpeg
```

#### On macOS:
```bash
brew install ffmpeg
```

#### On Windows:
1. Download from https://ffmpeg.org/download.html
2. Extract and add to PATH
3. Verify: `ffmpeg -version`

---

### Step 2: Install Whisper

```bash
# Install Whisper from PyPI
pip3 install -U openai-whisper

# Verify installation
whisper --help
```

**Expected output:**
```
usage: whisper [-h] [--model {tiny,base,small,medium,large}] ...
```

---

### Step 3: Download Whisper Model

Whisper will automatically download the model on first use, but you can pre-download:

```bash
# Download the base model (recommended for SoundBridge)
whisper --model base --help

# This downloads the model to ~/.cache/whisper/
```

**Model sizes:**
- `tiny`: ~39 MB
- `base`: ~74 MB ✅ **Recommended**
- `small`: ~244 MB
- `medium`: ~769 MB
- `large`: ~1.5 GB

---

### Step 4: Test Transcription

Test with a sample audio file:

```bash
# Create a test audio file (or use your own)
whisper test-audio.mp3 --model base --language en
```

**Expected output:**
```
Detecting language using up to the first 30 seconds. Use `--language` to specify the language
Detected language: English
[00:00.000 --> 00:05.000] This is a test transcription.
```

---

## Integration with SoundBridge

### Environment Configuration

Add to your `.env` file:

```bash
# Whisper Configuration
WHISPER_ENABLED=true
WHISPER_MODEL=base
WHISPER_SAMPLE_DURATION=120  # Transcribe first 2 minutes for podcasts
```

### Server Requirements

**For Vercel Deployment:**

⚠️ **Important:** Whisper requires a long-running server process. Vercel serverless functions have a 10-second timeout, which is not enough for transcription.

**Options:**

1. **Run Whisper on separate server** (Recommended)
   - Deploy a simple Node.js Express server on Railway, Render, or DigitalOcean
   - Expose a `/transcribe` API endpoint
   - Call from Vercel cron job

2. **Use Vercel Background Functions** (Beta)
   - Requires Vercel Pro plan
   - Allows up to 5-minute execution time

3. **Use serverless GPU service** (Alternative)
   - Replicate.com (paid)
   - HuggingFace Inference API (paid)

---

## Recommended: Separate Whisper Server Setup

### Option A: Railway Deployment (Free tier: 500 hours/month)

1. Create a simple Express server:

```typescript
// whisper-server/index.ts
import express from 'express';
import { transcribeAudio } from './whisper-service';

const app = express();
app.use(express.json());

app.post('/transcribe', async (req, res) => {
  try {
    const { audioUrl, model, sampleOnly } = req.body;

    const result = await transcribeAudioFromUrl(audioUrl, {
      model: model || 'base',
      sampleOnly: sampleOnly || false
    });

    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(3000, () => {
  console.log('Whisper server running on port 3000');
});
```

2. Deploy to Railway:
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy
railway up
```

3. Set environment variable in Vercel:
```bash
WHISPER_SERVICE_URL=https://your-railway-app.railway.app
```

---

### Option B: DigitalOcean Droplet ($4/month)

1. Create a Basic Droplet (512MB RAM)
2. SSH into server
3. Install Python, ffmpeg, and Whisper
4. Run Express server with PM2 (process manager)
5. Expose via Nginx reverse proxy

---

## Performance Benchmarks

Using `base` model on a standard server:

| Audio Duration | Transcription Time | Realtime Factor |
|----------------|-------------------|-----------------|
| 30 seconds     | ~2 seconds        | 15x             |
| 2 minutes      | ~7 seconds        | 17x             |
| 10 minutes     | ~35 seconds       | 17x             |
| 1 hour         | ~4 minutes        | 15x             |

**For SoundBridge:**
- Transcribe first 2 minutes of podcasts: ~7 seconds
- Full track transcription (average 3 min): ~12 seconds

---

## Cost Analysis

### Self-Hosted Whisper (Railway)

| Scenario | Server Cost | Total Cost |
|----------|-------------|------------|
| 0-100 uploads/day | Free tier | **£0/month** ✅ |
| 100-1,000 uploads/day | ~$5/month | **£4/month** |
| 1,000+ uploads/day | ~$20/month | **£16/month** |

### Alternative: Paid APIs

| Service | Cost |
|---------|------|
| OpenAI Whisper API | $0.006/minute = **£72/month** (1,000 uploads) ❌ |
| AssemblyAI | $0.15/hour = **£18/month** (1,000 uploads) ❌ |
| Deepgram | $0.0043/minute = **£51/month** (1,000 uploads) ❌ |

**Winner:** Self-hosted Whisper saves **£50-70/month**

---

## Troubleshooting

### Issue: "whisper: command not found"

**Solution:**
```bash
# Add Python scripts to PATH
export PATH="$HOME/.local/bin:$PATH"

# Add to ~/.bashrc or ~/.zshrc to make permanent
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### Issue: "ffmpeg: command not found"

**Solution:**
Install ffmpeg (see Step 1 above)

### Issue: "No module named 'whisper'"

**Solution:**
```bash
# Reinstall Whisper
pip3 uninstall openai-whisper
pip3 install -U openai-whisper
```

### Issue: Transcription is slow

**Solution:**
- Use a faster model: `tiny` or `base`
- Enable sample-only mode (first 2 minutes)
- Upgrade server CPU

### Issue: Out of memory

**Solution:**
- Use `tiny` or `base` model (requires less RAM)
- Reduce concurrent transcriptions
- Upgrade server RAM

---

## Testing Whisper Integration

After installation, test the SoundBridge integration:

```bash
# In your soundbridge project
npm run test:whisper
```

Or manually test:

```typescript
import { transcribeAudio } from '@/lib/whisper-service';

const result = await transcribeAudio('/path/to/audio.mp3', {
  model: 'base',
  sampleOnly: true,
  maxDuration: 120
});

console.log('Transcription:', result.text);
```

---

## Next Steps

After setting up Whisper:

1. ✅ Verify installation: `whisper --help`
2. ✅ Test transcription with sample audio
3. ✅ Deploy Whisper server (Railway or DigitalOcean)
4. ✅ Update `.env` with `WHISPER_SERVICE_URL`
5. ✅ Proceed to Phase 4: OpenAI Moderation API integration

---

## Support

**Documentation:**
- Whisper GitHub: https://github.com/openai/whisper
- Whisper.cpp (faster): https://github.com/ggerganov/whisper.cpp

**Issues?**
- Check Whisper GitHub issues
- Review SoundBridge moderation implementation guide

---

*Whisper Setup Guide - December 17, 2025*
*Part of SoundBridge Content Moderation System - Phase 3*
