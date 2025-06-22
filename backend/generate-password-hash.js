#!/usr/bin/env node

/**
 * Password hash generator for test data
 * 
 * This script generates bcrypt hashes for passwords used in test data.
 * It uses the same bcrypt configuration as the application to ensure compatibility.
 * 
 * Usage:
 *   node generate-password-hash.js <password>
 *   node generate-password-hash.js admin123
 * 
 * Or run without arguments to generate hashes for all default test passwords:
 *   node generate-password-hash.js
 */

const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

const DEFAULT_PASSWORDS = {
  'admin': 'admin123',
  'alice': 'alice123', 
  'bob': 'bob123',
  'charlie': 'charlie123'
};

async function generateHash(password) {
  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    return hash;
  } catch (error) {
    console.error('Error generating hash:', error);
    return null;
  }
}

async function main() {
  const password = process.argv[2];
  
  if (password) {
    // Generate hash for single password
    console.log(`Generating hash for password: ${password}`);
    const hash = await generateHash(password);
    if (hash) {
      console.log(`Hash: ${hash}`);
    }
  } else {
    // Generate hashes for all default test passwords
    console.log('Generating hashes for all default test passwords:\n');
    
    for (const [username, pwd] of Object.entries(DEFAULT_PASSWORDS)) {
      console.log(`${username} (password: ${pwd}):`);
      const hash = await generateHash(pwd);
      if (hash) {
        console.log(`  ${hash}`);
      }
      console.log();
    }
    
    console.log('Copy these hashes to backend/init-users.sql');
  }
}

main().catch(console.error);