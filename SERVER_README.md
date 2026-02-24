# Local Node.js Server

This document describes the local Node.js server setup for the project.

## Overview

The `server.mjs` file provides a local Express-based server that can be used for:
- Testing API endpoints locally
- Proxying requests to Netlify functions
- Serving the web interface
- Development and debugging

## Installation

The server requires the following dependencies:
- `express` - Web framework for Node.js
- `cors` - Enable CORS for development

These are already listed in `package.json`. To install them, run:

```bash
npm install
```

## Running the Server

### Basic Server

To start the server on port 3001 (or the port specified in your environment):

```bash
npm run server
```

### Development Mode (with nodemon)

For automatic restarts during development:

```bash
npm run server:dev
```

*Note: You'll need to install nodemon globally if you want to use this:
```bash
npm install -g nodemon
```

## API Endpoints

### Health Check

**GET** `/api/health`

Returns a simple health check response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-09T02:37:00.000Z"
}
```

### Example POST Endpoint

**POST** `/api/example`

Accepts JSON data with `name` and `message` fields:

```json
{
  "name": "Test User",
  "message": "Hello World"
}
```

Returns:
```json
{
  "success": true,
  "received": {
    "name": "Test User",
    "message": "Hello World"
  },
  "timestamp": "2026-01-09T02:37:00.000Z"
}
```

### Generate Python Script

**POST** `/api/generate-script`

Generates or regenerates the `script.py` file with all the Python functionality.

Returns:
```json
{
  "success": true,
  "message": "script.py generated successfully",
  "timestamp": "2026-01-09T02:37:00.000Z"
}
```

### Run Python Commands

**POST** `/api/run-python`

Executes Python script commands. The server automatically generates `script.py` if it doesn't exist.

**Request Body:**
```json
{
  "command": "validate"
}
```

**Available Commands:**
- `validate` - Validate configuration data
- `clear` - Clear all configuration data
- `test` - Test connection and configuration
- `generate` - Generate sample configuration
- `help` - Show help message

**Example:**
```bash
curl -X POST http://localhost:3001/api/run-python \
  -H "Content-Type: application/json" \
  -d '{"command":"validate"}'
```

**Response:**
```json
{
  "success": true,
  "command": "validate",
  "output": "=== Validation Results ===\nValid: True\n...",
  "timestamp": "2026-01-09T02:37:00.000Z"
}
```

### Run Script Proxy

**POST** `/api/run-script`

This endpoint is a placeholder for proxying requests to the Netlify `run-script` function. In a production environment, you would implement actual proxy logic to forward requests to the Netlify function.

## Configuration

The server can be configured through environment variables:

- `PORT` - The port to listen on (default: 3001)

### Port Conflict Handling

If the default port (3001) or the specified port is already in use, the server will automatically try the next available port. For example, if port 3001 is busy, it will try 3002, then 3003, etc.

If you encounter persistent port conflicts:

1. **Find what's using the port:**
   ```bash
   netstat -ano | findstr :3001
   ```

2. **Kill the process:**
   ```bash
   taskkill /PID <PID> /F
   ```

3. **Or specify a different port:**
   ```bash
   PORT=4000 npm run server
   ```

## Web Interface

The server serves `web_interface.html` at the root path (`/`). This allows you to test the web interface locally without needing the full Next.js application running.

## Integration with Next.js

To run both the Next.js app and the local server together:

1. Open a terminal and start the Next.js app:
   ```bash
   npm run dev
   ```

2. Open another terminal and start the local server:
   ```bash
   npm run server
   ```

3. Access the Next.js app at `http://localhost:3000`
4. Access the local API at `http://localhost:3001`

## Testing the Server

You can test the server using curl or any HTTP client:

```bash
# Test health endpoint
curl http://localhost:3001/api/health

# Test POST endpoint
curl -X POST http://localhost:3001/api/example \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","message":"Hello"}'
```

## Notes

- The server includes error handling for unhandled promise rejections and uncaught exceptions
- CORS is enabled for development purposes
- Static files can be served from a `public` directory
