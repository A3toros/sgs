#!/usr/bin/env node

/**
 * Test script for the local Node.js server
 * This script tests all the API endpoints
 */

import axios from 'axios';

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

async function testExampleEndpoint() {
  console.log('\n🔍 Testing /api/example endpoint...');
  try {
    const response = await axios.post(`${BASE_URL}/api/example`, {
      name: 'Test User',
      message: 'Hello from test script'
    });
    console.log('✅ Example endpoint passed');
    console.log('   Response:', response.data);
    return true;
  } catch (error) {
    console.log('❌ Example endpoint failed');
    console.log('   Error:', error.message);
    return false;
  }
}

async function testRunScriptEndpoint() {
  console.log('\n🔍 Testing /api/run-script endpoint...');
  try {
    const response = await axios.post(`${BASE_URL}/api/run-script`, {
      test: 'sample data'
    });
    console.log('✅ Run-script endpoint passed');
    console.log('   Response:', response.data);
    return true;
  } catch (error) {
    console.log('❌ Run-script endpoint failed');
    console.log('   Error:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting server tests...');
  console.log('   Base URL:', BASE_URL);
  
  const results = await Promise.all([
    testHealthEndpoint(),
    testExampleEndpoint(),
    testRunScriptEndpoint()
  ]);
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log('\n📊 Test Results:');
  console.log(`   Passed: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('\n✅ All tests passed!');
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
