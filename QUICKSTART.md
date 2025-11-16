# Quick Start Guide

Get your Obsidian MCP Server running in 5 minutes!

## Step 1: Install Dependencies

```bash
cd obsidian-mcp-server
npm install
```

## Step 2: Build the Project

```bash
npm run build
```

## Step 3: Run Initialization Wizard (Recommended)

**NEW**: Interactive setup that checks for Obsidian and configures your vault:

```bash
npm run init
```

The wizard will:
- ✓ Check if Obsidian is installed (required)
- ✓ Help you download Obsidian if needed
- ✓ Auto-detect existing Obsidian vaults
- ✓ Save your configuration to `~/.obsidian-mcp/config.json`

After running the wizard, skip to [Step 5](#step-5-integrate-with-claude-desktop).

## Step 3 (Alternative): Manual Configuration

Choose one of these methods:

### Option A: Environment Variable (Recommended)

```bash
export OBSIDIAN_VAULT_PATH="/path/to/your/vault"
```

On Windows (PowerShell):
```powershell
$env:OBSIDIAN_VAULT_PATH="C:\Users\YourName\Documents\ObsidianVault"
```

On Windows (Command Prompt):
```cmd
set OBSIDIAN_VAULT_PATH=C:\Users\YourName\Documents\ObsidianVault
```

### Option B: Command Line Argument

```bash
node dist/index.js --vault-path /path/to/your/vault
```

### Option C: Config File

Create `~/.obsidian-mcp/config.json`:

```json
{
  "vaults": {
    "default": "/path/to/your/vault"
  },
  "defaultVault": "default"
}
```

## Step 4: Test the Server

Run the server directly to verify it works:

```bash
node dist/index.js
```

You should see:
```
Obsidian MCP Server running on stdio
Vault path: /path/to/your/vault
```

Press `Ctrl+C` to stop the test.

## Step 5: Integrate with Claude Desktop

1. **Find your Claude Desktop config file:**
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

2. **Edit the config file** and add:

```json
{
  "mcpServers": {
    "obsidian": {
      "command": "node",
      "args": [
        "/absolute/path/to/obsidian-mcp-server/dist/index.js"
      ],
      "env": {
        "OBSIDIAN_VAULT_PATH": "/path/to/your/vault"
      }
    }
  }
}
```

**Important**: Use absolute paths, not relative paths!

3. **Restart Claude Desktop**

## Step 6: Verify Integration

Open Claude Desktop and try these commands:

1. **List all tools:**
   ```
   What Obsidian tools are available?
   ```

2. **Get vault stats:**
   ```
   Show me statistics about my Obsidian vault
   ```

3. **Search for notes:**
   ```
   Search my notes for "quantum mechanics"
   ```

4. **Create a test note:**
   ```
   Create a note called "Test Note.md" in my vault with some sample content
   ```

## Common Issues

### "Vault path not configured"

**Solution**: Make sure you set the `OBSIDIAN_VAULT_PATH` in the Claude Desktop config's `env` section.

### "Module not found" errors

**Solution**: Run `npm install` again to ensure all dependencies are installed.

### Server doesn't appear in Claude

**Solution**:
1. Check that the path to `dist/index.js` is absolute
2. Restart Claude Desktop completely
3. Check Claude's developer console for errors (View > Developer > Developer Tools)

### "Cannot find module" with .js extension errors

**Solution**: The project is already configured for ES modules. Make sure you ran `npm run build` successfully.

## Example Usage in Claude

Once integrated, you can ask Claude things like:

- "Show me all notes tagged with #research"
- "Find all notes that link to my 'Important Concepts' note"
- "Create a new daily note for today"
- "Search my vault for notes about machine learning"
- "What are my most used tags?"
- "Show me orphan notes that aren't linked from anywhere"
- "Update the status in my project note to 'completed'"

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Explore all 16 available tools
- Check [QUALITY_CHECKLIST.md](QUALITY_CHECKLIST.md) for implementation details
- Configure multiple vaults if needed

## Troubleshooting

For more detailed troubleshooting, see the [README.md#troubleshooting](README.md#troubleshooting) section.

## Development Mode

If you want to make changes to the server:

1. **Run in watch mode:**
   ```bash
   npm run watch
   ```

2. **Make your changes** in the `src/` directory

3. **The TypeScript compiler will automatically rebuild**

4. **Restart Claude Desktop** to pick up changes

## Publishing to npm (Optional)

To make this available globally:

1. Update `package.json` with your details
2. Run `npm publish`
3. Install globally: `npm install -g obsidian-mcp-server`
4. Update Claude config to use: `"command": "obsidian-mcp-server"`

---

Happy knowledge management! 🧠✨
