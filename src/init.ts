#!/usr/bin/env node

/**
 * Interactive initialization script for Obsidian MCP Server
 * Checks for Obsidian installation and helps configure vault path
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as readline from 'readline';
import { execSync } from 'child_process';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function checkObsidianInstalled(): { installed: boolean; path?: string } {
  const platform = os.platform();

  try {
    if (platform === 'win32') {
      // Check common Windows installation paths
      const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
      const possiblePaths = [
        path.join(localAppData, 'Obsidian', 'Obsidian.exe'),
        path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Obsidian', 'Obsidian.exe'),
      ];

      for (const testPath of possiblePaths) {
        if (fs.existsSync(testPath)) {
          return { installed: true, path: testPath };
        }
      }
    } else if (platform === 'darwin') {
      // Check macOS
      const appPath = '/Applications/Obsidian.app';
      if (fs.existsSync(appPath)) {
        return { installed: true, path: appPath };
      }
    } else {
      // Check Linux (multiple package managers)
      try {
        execSync('which obsidian', { stdio: 'ignore' });
        return { installed: true };
      } catch {
        // Not found
      }
    }
  } catch (error) {
    // Error checking, assume not installed
  }

  return { installed: false };
}

function getDownloadUrl(): string {
  const platform = os.platform();
  if (platform === 'win32') {
    return 'https://obsidian.md/download (Windows installer)';
  } else if (platform === 'darwin') {
    return 'https://obsidian.md/download (macOS installer)';
  } else {
    return 'https://obsidian.md/download (Linux packages)';
  }
}

function findObsidianVaults(): string[] {
  const platform = os.platform();
  const vaults: string[] = [];

  try {
    if (platform === 'win32') {
      // Check common Windows vault locations
      const documents = path.join(os.homedir(), 'Documents');
      const onedrive = path.join(os.homedir(), 'OneDrive', 'Documents');
      
      const searchPaths = [documents, onedrive, os.homedir()];
      
      for (const searchPath of searchPaths) {
        if (fs.existsSync(searchPath)) {
          const entries = fs.readdirSync(searchPath, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isDirectory()) {
              const fullPath = path.join(searchPath, entry.name);
              // Check if it looks like an Obsidian vault (has .obsidian folder)
              if (fs.existsSync(path.join(fullPath, '.obsidian'))) {
                vaults.push(fullPath);
              }
            }
          }
        }
      }
    } else {
      // macOS and Linux
      const documents = path.join(os.homedir(), 'Documents');
      const homeVaults = path.join(os.homedir(), 'vaults');
      
      const searchPaths = [documents, homeVaults, os.homedir()];
      
      for (const searchPath of searchPaths) {
        if (fs.existsSync(searchPath)) {
          const entries = fs.readdirSync(searchPath, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isDirectory()) {
              const fullPath = path.join(searchPath, entry.name);
              if (fs.existsSync(path.join(fullPath, '.obsidian'))) {
                vaults.push(fullPath);
              }
            }
          }
        }
      }
    }
  } catch (error) {
    // Ignore errors in vault detection
  }

  return vaults;
}

async function saveConfig(vaultPath: string, vaultName: string = 'default') {
  const configDir = path.join(os.homedir(), '.obsidian-mcp');
  const configPath = path.join(configDir, 'config.json');

  // Create config directory if it doesn't exist
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  // Read existing config or create new one
  let config: any = { vaults: {}, defaultVault: vaultName };
  
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch {
      // Use default config if parsing fails
    }
  }

  // Add/update vault
  config.vaults[vaultName] = vaultPath;
  config.defaultVault = vaultName;

  // Save config
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  
  return configPath;
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('   Obsidian MCP Server - Initialization Wizard');
  console.log('═══════════════════════════════════════════════════\n');

  // Step 1: Check if Obsidian is installed
  console.log('Step 1: Checking for Obsidian installation...\n');
  const obsidianCheck = checkObsidianInstalled();

  if (obsidianCheck.installed) {
    console.log('✓ Obsidian is installed!');
    if (obsidianCheck.path) {
      console.log(`  Location: ${obsidianCheck.path}`);
    }
    console.log();
  } else {
    console.log('✗ Obsidian is not installed (required)');
    console.log();
    console.log('This MCP server requires Obsidian to be installed.');
    console.log(`Please download and install Obsidian from: ${getDownloadUrl()}`);
    console.log();
    
    const proceed = await question('Have you installed Obsidian? (yes/no): ');
    
    if (proceed.toLowerCase() !== 'yes' && proceed.toLowerCase() !== 'y') {
      console.log('\nPlease install Obsidian first, then run this initialization again.');
      console.log('Installation command: npm run init');
      rl.close();
      process.exit(0);
    }
    
    console.log();
  }

  // Step 2: Find or configure vault path
  console.log('Step 2: Configuring Obsidian vault...\n');
  
  const foundVaults = findObsidianVaults();
  
  if (foundVaults.length > 0) {
    console.log('Found existing Obsidian vault(s):');
    foundVaults.forEach((vault, idx) => {
      console.log(`  ${idx + 1}. ${vault}`);
    });
    console.log(`  ${foundVaults.length + 1}. Enter a custom path`);
    console.log();
    
    const choice = await question(`Select a vault (1-${foundVaults.length + 1}): `);
    const choiceNum = parseInt(choice, 10);
    
    let vaultPath: string;
    
    if (choiceNum > 0 && choiceNum <= foundVaults.length) {
      vaultPath = foundVaults[choiceNum - 1];
    } else {
      vaultPath = await question('Enter the full path to your Obsidian vault: ');
    }
    
    // Validate vault path
    if (!fs.existsSync(vaultPath)) {
      console.log(`\n✗ Error: Vault path does not exist: ${vaultPath}`);
      rl.close();
      process.exit(1);
    }
    
    const obsidianDir = path.join(vaultPath, '.obsidian');
    if (!fs.existsSync(obsidianDir)) {
      console.log(`\n⚠ Warning: No .obsidian folder found. This may not be a valid Obsidian vault.`);
      const continueAnyway = await question('Continue anyway? (yes/no): ');
      if (continueAnyway.toLowerCase() !== 'yes' && continueAnyway.toLowerCase() !== 'y') {
        rl.close();
        process.exit(0);
      }
    }
    
    // Save configuration
    console.log('\nSaving configuration...');
    const vaultName = await question('Enter a name for this vault (default): ') || 'default';
    const configPath = await saveConfig(vaultPath, vaultName);
    
    console.log(`\n✓ Configuration saved to: ${configPath}`);
    console.log(`✓ Vault path: ${vaultPath}`);
    console.log(`✓ Vault name: ${vaultName}`);
    
  } else {
    console.log('No Obsidian vaults found automatically.');
    console.log();
    const vaultPath = await question('Enter the full path to your Obsidian vault: ');
    
    // Validate vault path
    if (!fs.existsSync(vaultPath)) {
      console.log(`\n✗ Error: Vault path does not exist: ${vaultPath}`);
      console.log('Please create a vault in Obsidian first, then run this initialization again.');
      rl.close();
      process.exit(1);
    }
    
    const obsidianDir = path.join(vaultPath, '.obsidian');
    if (!fs.existsSync(obsidianDir)) {
      console.log(`\n⚠ Warning: No .obsidian folder found. This may not be a valid Obsidian vault.`);
      console.log('Please open this folder in Obsidian first to initialize it as a vault.');
      rl.close();
      process.exit(1);
    }
    
    // Save configuration
    console.log('\nSaving configuration...');
    const vaultName = await question('Enter a name for this vault (default): ') || 'default';
    const configPath = await saveConfig(vaultPath, vaultName);
    
    console.log(`\n✓ Configuration saved to: ${configPath}`);
    console.log(`✓ Vault path: ${vaultPath}`);
    console.log(`✓ Vault name: ${vaultName}`);
  }

  // Step 3: Next steps
  console.log('\n═══════════════════════════════════════════════════');
  console.log('   Setup Complete!');
  console.log('═══════════════════════════════════════════════════\n');
  
  console.log('Next steps:');
  console.log('  1. Build the project: npm run build');
  console.log('  2. Test the server: node dist/index.js');
  console.log('  3. Integrate with Claude Desktop (see README.md)');
  console.log('\nFor more information, see QUICKSTART.md\n');

  rl.close();
}

main().catch((error) => {
  console.error('Error during initialization:', error);
  rl.close();
  process.exit(1);
});
