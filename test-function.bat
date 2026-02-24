@echo off

echo Testing Netlify Function...
echo.

echo Making a test request to the Netlify function...
curl -X POST http://localhost:9999/.netlify/functions/run-script \
  -H "Content-Type: application/json" \
  -d "{}" 2>&1

echo.
echo Test complete.

pause