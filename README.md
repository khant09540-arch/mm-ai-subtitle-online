# MM AI Subtitle Online

GitHub-ready AI subtitle web app starter.

## Features
- Video / audio upload UI
- Backend job API
- AI transcription hook
- Chinese/English → Myanmar translation hook
- SRT / VTT generation
- FFmpeg subtitle rendering hook
- API keys kept server-side via `.env`

## Run locally

```bash
cp .env.example .env
npm install
npm start
```

Open `http://localhost:3000`.

## Important
Do not put API keys in frontend JavaScript or commit `.env` to GitHub.
