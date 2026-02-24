@echo off

echo Starting Next.js dev server...
start /B cmd /C "npm run dev"

timeout /T 10 /NOBREAK
echo Starting Netlify functions server...
start /B cmd /C "netlify dev"

echo Both servers are running!
echo Next.js: http://localhost:3000
echo Netlify Functions: http://localhost:9999
echo Press Ctrl+C to stop both servers

pause