#!/usr/bin/env node

/**
 * This script updates the runtime-config.js file in the build output directory
 * Usage: node update-config.js --api-url=https://your-new-api-url.com
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const params = {};

args.forEach(arg => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.slice(2).split('=');
    if (key && value) {
      params[key] = value;
    }
  }
});

// Default build directory
const buildDir = path.resolve(process.cwd(), 'dist');
const configFile = path.join(buildDir, 'runtime-config.js');

// Check if the build directory exists
if (!fs.existsSync(buildDir)) {
  console.error(`Build directory not found: ${buildDir}`);
  console.error('Please run "npm run build" before running this script.');
  process.exit(1);
}

// Check if the config file exists
if (!fs.existsSync(configFile)) {
  console.error(`Config file not found: ${configFile}`);
  process.exit(1);
}

try {
  // Read the current config file
  let configContent = fs.readFileSync(configFile, 'utf-8');
  
  // Update API URL if provided
  if (params['api-url']) {
    const apiUrl = params['api-url'];
    console.log(`Updating API URL to: ${apiUrl}`);
    
    // Replace the API URL in the config file
    configContent = configContent.replace(
      /API_BASE_URL:\s*"[^"]*"/,
      `API_BASE_URL: "${apiUrl}"`
    );
  }
  
  // Write the updated config file
  fs.writeFileSync(configFile, configContent);
  console.log(`Successfully updated runtime configuration in: ${configFile}`);
  
} catch (error) {
  console.error('Error updating configuration:', error);
  process.exit(1);
}