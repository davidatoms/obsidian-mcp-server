# Initialization Wizard

The Obsidian MCP Server now includes an interactive initialization wizard that makes setup easier.

## Features

### ✓ Obsidian Installation Check
The wizard verifies that Obsidian is installed on your system before proceeding. This is a **requirement** for the MCP server to work properly.

**Supported platforms:**
- Windows: Checks `%LOCALAPPDATA%\Obsidian` and `%PROGRAMFILES%\Obsidian`
- macOS: Checks `/Applications/Obsidian.app`
- Linux: Uses `which obsidian` to detect installation

If Obsidian is not found, the wizard will:
1. Display the download URL for your platform
2. Prompt you to install it before continuing
3. Exit gracefully if you choose not to install

### ✓ Automatic Vault Detection
The wizard automatically searches common locations for existing Obsidian vaults:

**Windows:**
- `%USERPROFILE%\Documents`
- `%USERPROFILE%\OneDrive\Documents`
- `%USERPROFILE%` (home directory)

**macOS/Linux:**
- `~/Documents`
- `~/vaults`
- `~` (home directory)

The wizard identifies vaults by looking for the `.obsidian` folder that Obsidian creates.

### ✓ Configuration Management
The wizard saves your vault configuration to `~/.obsidian-mcp/config.json` with the following structure:

```json
{
  "vaults": {
    "default": "/path/to/your/vault",
    "work": "/path/to/work/vault"
  },
  "defaultVault": "default"
}
```

You can run the wizard multiple times to add additional vaults.

## Usage

### First-time Setup

```bash
cd obsidian-mcp-server
npm install
npm run build
npm run init
```

### Adding a New Vault

Simply run the initialization wizard again:

```bash
npm run init
```

The wizard will preserve your existing vaults and let you add a new one.

## What the Wizard Does

1. **Checks for Obsidian installation**
   - Verifies Obsidian is installed
   - Shows installation path if found
   - Provides download link if not found

2. **Finds existing vaults**
   - Scans common directories for `.obsidian` folders
   - Lists all found vaults
   - Allows manual path entry

3. **Validates vault**
   - Confirms the path exists
   - Checks for `.obsidian` folder
   - Warns if the folder doesn't look like a vault

4. **Saves configuration**
   - Creates `~/.obsidian-mcp/config.json`
   - Preserves existing vaults
   - Sets the new vault as default

5. **Shows next steps**
   - Reminds you to build (if needed)
   - Shows how to test the server
   - Points to Claude Desktop integration docs

## Example Session

```
═══════════════════════════════════════════════════
   Obsidian MCP Server - Initialization Wizard
═══════════════════════════════════════════════════

Step 1: Checking for Obsidian installation...

✓ Obsidian is installed!
  Location: C:\Program Files\Obsidian\Obsidian.exe

Step 2: Configuring Obsidian vault...

Found existing Obsidian vault(s):
  1. C:\Users\You\Documents\MyVault
  2. C:\Users\You\Documents\WorkNotes
  3. Enter a custom path

Select a vault (1-3): 1

Saving configuration...
Enter a name for this vault (default): default

✓ Configuration saved to: C:\Users\You\.obsidian-mcp\config.json
✓ Vault path: C:\Users\You\Documents\MyVault
✓ Vault name: default

═══════════════════════════════════════════════════
   Setup Complete!
═══════════════════════════════════════════════════

Next steps:
  1. Build the project: npm run build
  2. Test the server: node dist/index.js
  3. Integrate with Claude Desktop (see README.md)

For more information, see QUICKSTART.md
```

## Manual Configuration (Alternative)

If you prefer not to use the wizard, you can still configure manually:

### Option 1: Environment Variable
```bash
# Windows (PowerShell)
$env:OBSIDIAN_VAULT_PATH="C:\path\to\vault"

# macOS/Linux
export OBSIDIAN_VAULT_PATH="/path/to/vault"
```

### Option 2: Command Line
```bash
node dist/index.js --vault-path /path/to/vault
```

### Option 3: Config File
Create `~/.obsidian-mcp/config.json` manually:
```json
{
  "vaults": {
    "default": "/path/to/vault"
  },
  "defaultVault": "default"
}
```

## Troubleshooting

### "Obsidian is not installed"
- Download from https://obsidian.md/download
- Install for your platform
- Run `npm run init` again

### "No Obsidian vaults found automatically"
- Make sure you've opened the folder in Obsidian at least once (this creates the `.obsidian` folder)
- Choose "Enter a custom path" and provide the full path
- The wizard will validate the path and warn if it doesn't look like a vault

### "Vault path does not exist"
- Check the path for typos
- Use absolute paths, not relative paths
- On Windows, use backslashes or escaped backslashes in the path

### Config not being used
- Make sure `~/.obsidian-mcp/config.json` exists
- The server checks environment variables first, then CLI args, then the config file
- To force config file usage, don't set `OBSIDIAN_VAULT_PATH` environment variable

## Benefits Over Manual Setup

| Feature | Manual Setup | Initialization Wizard |
|---------|--------------|---------------------|
| Obsidian check | ❌ No | ✓ Yes |
| Auto-detect vaults | ❌ No | ✓ Yes |
| Vault validation | ❌ Manual | ✓ Automatic |
| Multi-vault support | ⚠️ Complex | ✓ Easy |
| Error messages | ⚠️ Generic | ✓ Helpful |
| Guided experience | ❌ No | ✓ Yes |

## See Also

- [README.md](README.md) - Full documentation
- [QUICKSTART.md](QUICKSTART.md) - Quick start guide
- [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) - Project overview
