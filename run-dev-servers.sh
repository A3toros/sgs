#!/bin/bash

# Run Next.js dev server in the background
echo "Starting Next.js dev server..."
npm run dev &
NEXT_PID=$!

# Wait for Next.js to start
echo "Waiting for Next.js to start..."
sleep 10

# Run Netlify functions server
echo "Starting Netlify functions server..."
netlify dev &
NETLIFY_PID=$!

# Wait for both servers
echo "Both servers are running!"
echo "Next.js: http://localhost:3000"
echo "Netlify Functions: http://localhost:9999"

# Keep the script running
wait $NEXT_PID $NETLIFY_PID