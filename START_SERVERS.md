# Starting the Application Servers

## Quick Start (Recommended)

### Step 1: Install Netlify CLI (if not already installed)

```bash
npm install -g netlify-cli
```

### Step 2: Start Both Servers

Open **two separate terminal windows** and run these commands:

**Terminal 1 - Next.js Server:**
```bash
cd c:/Users/Aetoros/projects/sgs-submission
npm run dev
```

**Terminal 2 - Netlify Functions Server:**
```bash
cd c:/Users/Aetoros/projects/sgs-submission
netlify dev
```

### Step 3: Access the Application

Once both servers are running, open your browser and go to:
```
http://localhost:3000/teacher-config
```

## Alternative: Use the Convenience Script

If you're on Windows, you can use the batch file:

1. Double-click `run-dev-servers.bat`
2. This will open two command windows automatically
3. Wait for both servers to start
4. Open your browser to `http://localhost:3000/teacher-config`

## Verifying Servers Are Running

### Check Next.js Server
- Open: `http://localhost:3000`
- You should see the application homepage

### Check Netlify Functions Server
- Open: `http://localhost:9999/.netlify/functions/run-script`
- You should see a JSON response like:
```json
{"error":"Method not allowed"}
```

If you see this, the Netlify functions server is working correctly.

## Troubleshooting

### If you see "Failed to fetch" error:

1. **Check Terminal 2**: Make sure `netlify dev` is running without errors
2. **Check the URL**: The Netlify functions server must be on port 9999
3. **Check for errors**: Look for any error messages in Terminal 2
4. **Try restarting**: Stop both servers and start them again

### If Netlify CLI is not recognized:

```bash
npm install -g netlify-cli
```

Then try running `netlify dev` again.

### If port 9999 is in use:

Find and kill the process using port 9999, then restart the servers.

## Common Issues

### Issue: Netlify dev doesn't start
**Solution**: Make sure you're in the project directory and run:
```bash
netlify login
netlify init
```

### Issue: CORS errors in browser
**Solution**: The CORS headers are already configured in the Netlify function. Make sure you're using the correct URL (`http://localhost:9999/.netlify/functions/run-script` in development).

### Issue: Firewall blocking connection
**Solution**: Temporarily disable your firewall or add an exception for Node.js/Netlify CLI.