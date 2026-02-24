# Teacher Configuration Automation Guide

This guide explains how to use the automated Node.js server with Python script generation and execution capabilities.

## Overview

The system provides:
1. **Node.js Express Server** - Local API server with automatic port handling
2. **Python Script Generator** - Creates `script.py` with validation, clearing, and testing functionality
3. **API Endpoints** - RESTful endpoints to control everything
4. **Automatic Execution** - Everything runs automatically when you start the server

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Server

```bash
npm run server
```

The server will:
- Start on port 3001 (or next available port if busy)
- Automatically generate `script.py` if it doesn't exist
- Make all API endpoints available

### 3. Use the API

The server provides these endpoints:

#### Generate Python Script
```bash
curl -X POST http://localhost:3001/api/generate-script
```

#### Run Python Commands
```bash
# Validate data
curl -X POST http://localhost:3001/api/run-python \
  -H "Content-Type: application/json" \
  -d '{"command":"validate"}'

# Clear all data
curl -X POST http://localhost:3001/api/run-python \
  -H "Content-Type: application/json" \
  -d '{"command":"clear"}'

# Test connection
curl -X POST http://localhost:3001/api/run-python \
  -H "Content-Type: application/json" \
  -d '{"command":"test"}'

# Generate sample config
curl -X POST http://localhost:3001/api/run-python \
  -H "Content-Type: application/json" \
  -d '{"command":"generate"}'

# Show help
curl -X POST http://localhost:3001/api/run-python \
  -H "Content-Type: application/json" \
  -d '{"command":"help"}'
```

## Python Script Features

The `script.py` file provides these commands:

### `validate` - Validate Configuration Data

Validates the `teacher_config.json` file and reports any errors or warnings.

```bash
python script.py validate
```

### `clear` - Clear All Configuration Data

Removes all data from `teacher_config.json`.

```bash
python script.py clear
```

### `test` - Test Connection and Configuration

Tests if the configuration can be used successfully.

```bash
python script.py test
```

### `generate` - Generate Sample Configuration

Creates a sample configuration file with default values.

```bash
python script.py generate
```

### `help` - Show Help Message

Displays all available commands.

```bash
python script.py help
```

## Running Everything Automatically

The system is designed to run everything automatically:

1. **Server Startup** - When you run `npm run server`:
   - The Node.js server starts
   - `script.py` is automatically generated if missing
   - All API endpoints become available

2. **API Calls** - When you call `/api/run-python`:
   - The server automatically generates `script.py` if needed
   - Executes the requested Python command
   - Returns the output

3. **Direct Execution** - You can also run `script.py` directly:
   ```bash
   python script.py validate
   ```

## Port Configuration

If port 3001 is busy, the server automatically tries the next available port (3002, 3003, etc.).

To specify a custom port:
```bash
PORT=4000 npm run server
```

## Development Mode

For automatic restarts during development:
```bash
npm run server:dev
```

*Note: Install nodemon globally first: `npm install -g nodemon`*

## File Structure

```
project-root/
├── server.mjs              # Node.js Express server
├── generate_script.py      # Python script generator
├── script.py               # Generated Python script (created automatically)
├── teacher_config.json     # Configuration data file
├── SERVER_README.md        # Server documentation
└── AUTOMATION_GUIDE.md     # This guide
```

## Troubleshooting

### Port Already in Use

If you see `EADDRINUSE` error:
1. The server will automatically try the next port
2. Or manually specify a different port: `PORT=4000 npm run server`
3. Find and kill the process: `netstat -ano | findstr :3001` then `taskkill /PID <PID> /F`

### Python Not Found

Make sure Python 3 is installed and in your PATH.

### Missing Dependencies

Run `npm install` to install all required Node.js dependencies.

## Examples

### Example 1: Full Workflow

```bash
# Start the server
npm run server

# In another terminal, test the API
curl -X POST http://localhost:3001/api/run-python \
  -H "Content-Type: application/json" \
  -d '{"command":"generate"}'

curl -X POST http://localhost:3001/api/run-python \
  -H "Content-Type: application/json" \
  -d '{"command":"validate"}'

curl -X POST http://localhost:3001/api/run-python \
  -H "Content-Type: application/json" \
  -d '{"command":"test"}'
```

### Example 2: Direct Python Usage

```bash
# Generate the script (if not already generated)
python generate_script.py

# Use the script directly
python script.py generate
python script.py validate
python script.py test
```

## API Documentation

See `SERVER_README.md` for complete API documentation including:
- All available endpoints
- Request/response formats
- Error handling
- Configuration options

## Testing

Run comprehensive tests:
```bash
node test-all.mjs
```

This tests all endpoints and functionality automatically.

## Summary

The system provides a complete automation solution:
- ✅ Node.js server with automatic port handling
- ✅ Python script generation and execution
- ✅ RESTful API for remote control
- ✅ Direct Python script execution
- ✅ Comprehensive testing
- ✅ Automatic everything

Everything runs automatically when you start the server with `npm run server`!
