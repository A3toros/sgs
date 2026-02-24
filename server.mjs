import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join, existsSync } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const DEFAULT_PORT = 3001;
const PORT = process.env.PORT || DEFAULT_PORT;

// Generate script.py automatically on server start
function generateScriptPy() {
  try {
    if (!existsSync('generate_script.py')) {
      console.log('⚠️  generate_script.py not found. Creating a basic script.py...');
      const fs = require('fs');
      const scriptContent = `#!/usr/bin/env python3
"""Automated Teacher Configuration Script"""

import json
import os
import sys
from datetime import datetime

class TeacherConfigManager:
    def __init__(self, data_file='teacher_config.json'):
        self.data_file = data_file
        self.data = self._load_data()
    
    def _load_data(self):
        if not os.path.exists(self.data_file):
            return {}
        try:
            with open(self.data_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading data: {e}")
            return {}
    
    def _save_data(self):
        try:
            with open(self.data_file, 'w', encoding='utf-8') as f:
                json.dump(self.data, f, indent=2, ensure_ascii=False)
            return True
        except Exception as e:
            print(f"Error saving data: {e}")
            return False
    
    def validate_data(self):
        errors = []
        warnings = []
        if not self.data:
            warnings.append("No data found")
        return {"valid": len(errors) == 0, "errors": errors, "warnings": warnings}
    
    def clear_all(self):
        self.data = {}
        return self._save_data()
    
    def test_connection(self):
        return {
            "status": "success",
            "message": "Connection test passed",
            "timestamp": datetime.now().isoformat()
        }
    
    def generate_config(self):
        self.data = {
            "version": "1.0",
            "last_updated": datetime.now().isoformat(),
            "config": {"subject": "Sample Subject", "group": "Sample Group", "students": {}}
        }
        return self._save_data()

def main():
    if len(sys.argv) < 2:
        print("\\n=== Teacher Configuration Script ===")
        print("\\nUsage:")
        print("  python script.py validate    - Validate configuration data")
        print("  python script.py clear      - Clear all configuration data")
        print("  python script.py test       - Test connection and configuration")
        print("  python script.py generate   - Generate sample configuration")
        print("  python script.py help       - Show this help message\\n")
        return
    
    command = sys.argv[1].lower()
    manager = TeacherConfigManager()
    
    try:
        if command == "validate":
            result = manager.validate_data()
            print("\\n=== Validation Results ===")
            print(f"Valid: {result['valid']}")
            if result['errors']:
                print("\\nErrors:")
                for error in result['errors']:
                    print(f"  - {error}")
            if result['warnings']:
                print("\\nWarnings:")
                for warning in result['warnings']:
                    print(f"  - {warning}")
            print()
        elif command == "clear":
            success = manager.clear_all()
            print("\\n=== Clear Results ===")
            print("✅ All configuration data cleared successfully" if success else "❌ Failed to clear configuration data")
            print()
        elif command == "test":
            result = manager.test_connection()
            print("\\n=== Test Results ===")
            print(f"Status: {result['status']}")
            print(f"Message: {result['message']}")
            print(f"Timestamp: {result['timestamp']}")
            print()
        elif command == "generate":
            success = manager.generate_config()
            print("\\n=== Generate Results ===")
            print("✅ Sample configuration generated successfully" if success else "❌ Failed to generate configuration")
            print()
        elif command == "help":
            print("\\n=== Help ===")
            print("\\nAvailable commands:")
            print("  validate  - Validate configuration data")
            print("  clear     - Clear all configuration data")
            print("  test      - Test connection and configuration")
            print("  generate  - Generate sample configuration")
            print("  help      - Show this help message")
            print()
        else:
            print(f"\\n❌ Unknown command: {command}")
            print("\\nUse 'python script.py help' for available commands\\n")
    except Exception as e:
        print(f"\\n❌ Error: {e}\\n")

if __name__ == "__main__":
    main()
`;
      fs.writeFileSync('script.py', scriptContent, 'utf-8');
      console.log('✅ Basic script.py created');
    }
  } catch (error) {
    console.error('⚠️  Error generating script.py:', error.message);
  }
}

// Call it on startup
generateScriptPy();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use(express.static(join(__dirname, 'public')));

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Example POST endpoint
app.post('/api/example', (req, res) => {
  try {
    const { name, message } = req.body;
    
    if (!name || !message) {
      return res.status(400).json({ error: 'Name and message are required' });
    }
    
    res.json({
      success: true,
      received: { name, message },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to generate script.py
app.post('/api/generate-script', (req, res) => {
  try {
    generateScriptPy();
    res.json({
      success: true,
      message: 'script.py generated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to run Python script commands
app.post('/api/run-python', (req, res) => {
  try {
    const { command } = req.body;
    
    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }
    
    // Generate script if it doesn't exist
    if (!existsSync('script.py')) {
      generateScriptPy();
    }
    
    // Execute the Python command
    const result = execSync(`python script.py ${command}`, { encoding: 'utf-8' });
    
    res.json({
      success: true,
      command,
      output: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      stdout: error.stdout,
      stderr: error.stderr
    });
  }
});

// Proxy endpoint to forward requests to Netlify functions locally
app.post('/api/run-script', async (req, res) => {
  try {
    // In a real implementation, you would call the Netlify function here
    // This is a placeholder to show how you would structure it
    res.json({
      success: true,
      message: 'Request received',
      data: req.body,
      note: 'This is a local proxy endpoint. In production, this would call the Netlify function.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve the web interface
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'web_interface.html'));
});

// Start the server with port fallback logic
function startServer(port) {
  app.listen(port, () => {
    console.log(`\n✅ Server running on http://localhost:${port}`);
    console.log(`📡 API endpoints:`);
    console.log(`   - GET  /api/health`);
    console.log(`   - POST /api/example`);
    console.log(`   - POST /api/run-script`);
    console.log(`   - GET  / (serves web_interface.html)\n`);
  }).on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.log(`\n⚠️  Port ${port} is already in use`);
      const newPort = port + 1;
      console.log(`🔄 Trying port ${newPort}...\n`);
      startServer(newPort);
    } else {
      console.error('\n❌ Server error:', error.message);
      process.exit(1);
    }
  });
}

startServer(PORT);

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});
