# SimplifyLegal Render Deployment

This project is ready to deploy on **Render as a single web service**.

## Why this works

- The React frontend is built into `frontend/dist`
- The Express backend in `backend/server.js` already serves that built frontend
- So Render only needs **one Node web service**

## Steps

1. Push the project to GitHub.
2. Sign in to [Render](https://render.com/).
3. Click **New +** -> **Blueprint**.
4. Connect your GitHub repository.
5. Render will detect [render.yaml](/D:/SimplifyLegal/render.yaml).
6. Create the service.

## Important environment variables

After the service is created, add these in Render if you use them:

- `OPENAI_API_KEY`
- `CONTACT_RECEIVER_EMAIL`
- `CONTACT_FROM_EMAIL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`

## Notes

- `JWT_SECRET` and `DOCUMENT_ENCRYPTION_KEY` are generated automatically by `render.yaml`
- The app health endpoint is `/api/health`
- On free hosting, the service may sleep when inactive
- SQLite is acceptable for a college demo, but not ideal for long-term production hosting

## Local build reminder

If you want to test before deploy:

```powershell
cd D:\SimplifyLegal\frontend
npm.cmd run build

cd D:\SimplifyLegal\backend
node server.js
```
