# GitHub + Online Deployment Guide

## 1. Create GitHub repository
Create a new repository, for example `mm-ai-subtitle-online`.

## 2. Upload this project
Upload all files and folders. Do NOT upload `.env`.

## 3. Choose a Node.js hosting service
Use a Node.js host that supports environment variables and FFmpeg if you want server-side video rendering.

Set:
- `PORT` (normally supplied by the host)
- `AI_API_KEY`
- `AI_API_URL`

## 4. Build command
`npm install`

## 5. Start command
`npm start`

## 6. Connect the real AI provider
The current server contains a safe runnable demo pipeline. Replace the marked transcription/translation section in `processJob()` with your chosen provider's server-side API calls.

Never place the secret API key in `public/app.js`, HTML, or any GitHub-visible file.
