#!/usr/bin/env node

/**
 * Comprehensive test script for the local Node.js server
 * Tests all API endpoints including Python script generation and execution
 */

import axios from 'axios';
import { execSync } from 'child_process';

const BASE_URL = 'http://localhost:3001';

async function testHealthEndpoint() {
  console.log('\n🔍 Testing /api/health endpoint...');
  try {
    const response = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ Health check passed');
    console.log('   Response:', response.data);
    return true;
  } catch (error) {
    console.log('❌ Health check failed');
    console.log('   Error:', error.message);
    return false;
  }
}

async function testGenerateScript() {
  console.log('\n🔍 Testing /api/generate-script endpoint...');
  try {
    const response = await axios.post(`${BASE_URL}/api/generate-script`);
    console.log('✅ Script generation passed');
    console.log('   Response:', response.data);
    return true;
  } catch (error) {
    console.log('❌ Script generation failed');
    console.log('   Error:', error.message);
    return false;
  }
}

async function testRunPythonValidate() {
  console.log('\n🔍 Testing /api/run-python with validate command...');
  try {
    const response = await axios.post(`${BASE_URL}/api/run-python`, {
      command: 'validate'
    });
    console.log('✅ Python validate command passed');
    console.log('   Output preview:', response.data.output.substring(0, 100) + '...');
    return true;
  } catch (error) {
    console.log('❌ Python validate command failed');
    console.log('   Error:', error.message);
    return false;
  }
}

async function testRunPythonClear() {
  console.log('\n🔍 Testing /api/run-python with clear command...');
  try {
    const response = await axios.post(`${BASE_URL}/api/run-python`, {
      command: 'clear'
    });
    console.log('✅ Python clear command passed');
    console.log('   Output:', response.data.output);
    return true;
  } catch (error) {
    console.log('❌ Python clear command failed');
    console.log('   Error:', error.message);
    return false;
  }
}

async function testRunPythonTest() {
  console.log('\n🔍 Testing /api/run-python with test command...');
  try {
    const response = await axios.post(`${BASE_URL}/api/run-python`, {
      command: 'test'
    });
    console.log('✅ Python test command passed');
    console.log('   Output:', response.data.output);
    return true;
  } catch (error) {
    console.log('❌ Python test command failed');
    console.log('   Error:', error.message);
    return false;
  }
}

async function testRunPythonGenerate() {
  console.log('\n🔍 Testing /api/run-python with generate command...');
  try {
    const response = await axios.post(`${BASE_URL}/api/run-python`, {
      command: 'generate'
    });
    console.log('✅ Python generate command passed');
    console.log('   Output:', response.data.output);
    return true;
  } catch (error) {
    console.log('❌ Python generate command failed');
    console.log('   Error:', error.message);
    return false;
  }
}

async function testRunPythonHelp() {
  console.log('\n🔍 Testing /api/run-python with help command...');
  try {
    const response = await axios.post(`${BASE_URL}/api/run-python`, {
      command: 'help'
    });
    console.log('✅ Python help command passed');
    console.log('   Output preview:', response.data.output.substring(0, 100) + '...');
    return true;
  } catch (error) {
    console.log('❌ Python help command failed');
    console.log('   Error:', error.message);
    return false;
  }
}

async function testDirectPythonExecution() {
  console.log('\n🔍 Testing direct Python script execution...');
  try {
    // Check if script.py exists
    const fs = require('fs');
    if (!fs.existsSync('script.py')) {
      console.log('⚠️  script.py not found, generating...');
      const generateResponse = await axios.post(`${BASE_URL}/api/generate-script`);
    }
    
    // Test direct execution
    const output = execSync('python script.py help', { encoding: 'utf-8' });
    console.log('✅ Direct Python execution passed');
    console.log('   Output preview:', output.substring(0, 100) + '...');
    return true;
  } catch (error) {
    console.log('❌ Direct Python execution failed');
    console.log('   Error:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting comprehensive server tests...');
  console.log('   Base URL:', BASE_URL);
  
  const results = await Promise.all([
    testHealthEndpoint(),
    testGenerateScript(),
    testRunPythonValidate(),
    testRunPythonClear(),
    testRunPythonTest(),
    testRunPythonGenerate(),
    testRunPythonHelp(),
    testDirectPythonExecution()
  ]);
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log('\n📊 Test Results:');
  console.log(`   Passed: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('\n✅ All tests passed!');
    console.log('\n📋 Summary:');
    console.log('   ✓ Server is running');
    console.log('   ✓ All API endpoints working');
    console.log('   ✓ Python script generation working');
    console.log('   ✓ Python script execution working');
    console.log('   ✓ Direct Python execution working');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed!');
    process.exit(1);
  }
}

// Run the tests
main().catch(error => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});
