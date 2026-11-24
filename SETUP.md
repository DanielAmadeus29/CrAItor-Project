# CrAItor — Setup & Run Guide

This guide walks you through installing dependencies and running the project from scratch.

---

## Prerequisites

Make sure you have these installed:

- **Python 3.9+** — check with `python3 --version`
- **Node.js & npm** — check with `node --version` and `npm --version`
- **Git** (if cloning) — check with `git --version`

---

## Step 1 — Open a terminal in the project root

```bash
cd ~/Projects/CrAItor-Project
```

Your prompt should now show you're in the `CrAItor-Project` folder.

---

## Step 2 — Install Node dependencies

From the project root:

```bash
npm install
```

This reads `package.json` and installs everything the frontend/backend needs.

---

## Step 3 — Install Python dependencies for the AI service

Move into the AI service folder:

```bash
cd ai_service
```

Install the Python packages listed in `requirements.txt`:

```bash
python3 -m pip install -r requirements.txt
```

This installs:

- `flask`, `flask-cors` — web server
- `tensorflow` — classification model
- `torch`, `torchvision` — PyTorch backbone
- `efficientnet-pytorch` — aesthetic scoring model
- `transformers` — caption generation
- `Pillow`, `numpy` — image and array handling

> **Note:** First install takes several minutes. TensorFlow and PyTorch are large downloads (~1–2 GB combined).

---

## Step 4 — Verify the Python packages installed correctly

Still inside `ai_service`:

```bash
python3 -c "import efficientnet_pytorch, transformers, torch, tensorflow; print('All Python deps OK')"
```

If you see `All Python deps OK`, you're good. If you see an `ImportError`, re-run Step 3 and check for errors.

---

## Step 5 — Make sure the classification model file exists

The classification model needs a weights file called `ImageModel.keras`. From the `ai_service` directory:

```bash
ls ImageModel.keras
```

- If the file is there → continue to Step 6.
- If you see "No such file or directory" → you'll need to obtain or train this file. Check the project README or ask whoever shared the repo with you.

---

## Step 6 — Start the AI service

Still in `ai_service`:

```bash
python3 ai_server.py
```

Watch the log. You should see:

```
STARTING AI SERVER WITH IMPROVED CAPTIONING
Using device: cpu
Loading classification model...
[SUCCESS] Classification model loaded! Classes: 10
Loading aesthetic model (EfficientNet-B0)...
[SUCCESS] Aesthetic model loaded!
Loading caption generator...
[SUCCESS] Caption generator loaded!
```

The server will then listen on a local port (typically `http://127.0.0.1:5000`).

**Leave this terminal running.** Don't close it.

---

## Step 7 — Start the backend / frontend

Open a **new terminal window or tab** (don't close the one running the AI service).

Go back to the project root:

```bash
cd ~/Projects/CrAItor-Project
```

Start the dev server:

```bash
npm run dev
```

> If `npm run dev` doesn't exist in your `package.json`, check the available scripts with:
>
> ```bash
> cat package.json
> ```
>
> Common alternatives: `npm start`, `npm run start:backend`, `npm run start:frontend`.

---

## Step 8 — Open the app

Once both services are running, the frontend usually opens automatically in your browser. If not, check the terminal output for a URL like `http://localhost:3000` and open it manually.

---

## Troubleshooting

### `command not found: pip`
Use the module form instead:
```bash
python3 -m pip install <package>
```

### `efficientnet-pytorch not installed` in server logs (even after installing)
The server is being launched with a different Python than the one you installed into. Try installing into the system Python explicitly:
```bash
python3 -m pip install efficientnet-pytorch transformers
```

### `externally-managed-environment` error from pip (newer macOS)
Use a virtual environment:
```bash
cd ai_service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python ai_server.py
```
python3 -m pip install efficientnet-pytorch transformers

Remember to `source venv/bin/activate` every time you open a new terminal for the AI service.

### `ImageModel.keras` not found
The classification weights file is missing. It's not generated automatically — you need to either train it or get it from the original project source.

### Port already in use
Another process is using the port. Either stop it, or change the port in the relevant config (Flask's port is set in `ai_server.py`).

---

## Quick reference — daily startup

After the first-time setup, starting the project is just:

**Terminal 1:**
```bash
cd ~/Projects/CrAItor-Project/ai_service
python3 ai_server.py
```

**Terminal 2:**
```bash
cd ~/Projects/CrAItor-Project
npm run dev
```

Done.
