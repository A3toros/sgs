# Development Guide

## Running the Application

This application consists of a Next.js frontend and Netlify serverless functions. To run it properly, you need to start both servers.

### Option 1: Using the Convenience Script (Recommended)

Run both servers simultaneously:

```bash
npm run dev:all
```

This will start:
- Next.js dev server on `http://localhost:3000`
- Netlify functions server on `http://localhost:9999`

### Option 2: Manual Setup

#### Start Next.js Dev Server

```bash
npm run dev
```

This starts the Next.js application on `http://localhost:3000`

#### Start Netlify Functions Server (in a new terminal)

```bash
netlify dev
```

This starts the Netlify functions server on `http://localhost:9999`

### Option 3: Using the Batch File (Windows)

Double-click `run-dev-servers.bat` to start both servers automatically.

## Troubleshooting

### Error: "Unexpected token '<', "<!DOCTYPE"... is not valid JSON"

This error occurs when the frontend tries to call the Netlify function but receives HTML instead of JSON. This typically happens when:

1. **Netlify functions server is not running**: Make sure you've started the Netlify functions server with `netlify dev` or `npm run dev:all`

2. **Wrong endpoint in development**: The frontend automatically detects development mode and uses `http://localhost:9999/.netlify/functions/run-script` instead of the relative path

3. **Port conflicts**: Ensure port 9999 is available for the Netlify functions server

### Common Solutions

1. **Restart both servers**: Stop both servers and restart them using `npm run dev:all`

2. **Check server status**: Verify both servers are running by visiting:
   - `http://localhost:3000` (Next.js)
   - `http://localhost:9999/.netlify/functions/run-script` (Netlify function)

3. **Clear cache**: Try clearing your browser cache or using incognito mode

4. **Check Netlify CLI**: Ensure Netlify CLI is installed globally:
   ```bash
   npm install -g netlify-cli
   ```

### Error: "Failed to fetch"

This error occurs when the browser cannot connect to the Netlify functions server. This typically happens when:

1. **Netlify functions server is not running**: The server must be running for the frontend to communicate with it

2. **CORS issues**: The browser is blocking cross-origin requests

3. **Port blocking**: A firewall or security software is blocking access to localhost:9999

### Common Solutions

1. **Start the Netlify functions server**: Run `netlify dev` in a separate terminal window

2. **Use the convenience script**: Run `npm run dev:all` to start both servers automatically

3. **Check port availability**: Ensure port 9999 is not being used by another application

4. **Disable firewall temporarily**: Check if your firewall is blocking connections to localhost

5. **Test the function directly**: Open `http://localhost:9999/.netlify/functions/run-script` in your browser to see if the function is responding

6. **Check browser console**: Look for CORS errors in the browser's developer console (F12)

## Building for Production

```bash
npm run build
```

This will build both the Next.js application and bundle the Netlify functions.

## Environment Variables

Create a `.env` file in the root directory for environment-specific variables:

```
# Example .env file
NODE_ENV=development
```

## Dependencies

### Required Global Packages

- `netlify-cli` - For running Netlify functions locally

Install with:
```bash
npm install -g netlify-cli
```

### Project Dependencies

All project dependencies are listed in `package.json` and will be installed automatically when you run:

```bash
npm install
```

## File Structure

```
/
├── netlify/              # Netlify configuration
│   └── functions/        # Serverless functions
│       └── run-script.ts # Main function for executing scripts
├── src/                  # Next.js application
│   └── app/              # App Router pages
│       └── teacher-config/ # Teacher configuration page
├── package.json          # Project dependencies and scripts
├── netlify.toml          # Netlify configuration
└── DEVELOPMENT_GUIDE.md  # This file
```

## Netlify Functions

The application uses Netlify serverless functions for:
- Executing Selenium scripts
- Handling authentication
- Processing student data

Functions are automatically served when running `netlify dev` or deployed to Netlify.

## Frontend

The frontend is built with Next.js 14 using the App Router. Key features:
- Teacher configuration interface
- Script generation
- Student data management
- Execution logs display

## Deployment

To deploy to Netlify:

1. Install Netlify CLI globally (if not already installed)
2. Run `netlify init` to link your project
3. Run `netlify deploy` to deploy
4. Run `netlify deploy --prod` to deploy to production

The `netlify.toml` file contains all necessary deployment configuration.
