# supascan

A security analysis CLI tool for Supabase databases that helps identify exposed data, analyze schemas, and test RPC functions.

## Installation

```bash
bun install -g supascan
```

## Usage

### Basic Analysis

Analyze your Supabase database for security issues:

```bash
supascan --url https://your-project.supabase.co --key your-anon-key
```

### Available Commands

#### Database Analysis

```bash
# Analyze all schemas
supascan --url <url> --key <key>

# Analyze specific schema
supascan --url <url> --key <key> --schema public

# Generate HTML report
supascan --url <url> --key <key> --html

# JSON output
supascan --url <url> --key <key> --json
```

#### Data Dumping

```bash
# Dump table data
supascan --url <url> --key <key> --dump public.users --limit 100

# Dump Swagger JSON for schema
supascan --url <url> --key <key> --dump public
```

#### RPC Testing

```bash
# Get RPC help
supascan --url <url> --key <key> --rpc public.get_user_stats

# Call RPC with parameters
supascan --url <url> --key <key> --rpc public.get_user_stats --args '{"user_id": "123"}'

# Show query execution plan
supascan --url <url> --key <key> --rpc public.get_user_stats --args '{"user_id": "123"}' --explain
```

#### Credential Extraction (Experimental)

```bash
# Extract credentials from JS file
supascan --extract https://example.com/app.js --url <url> --key <key>
```

## Options

| Option                             | Description                                                      |
| ---------------------------------- | ---------------------------------------------------------------- |
| `-u, --url <url>`                  | Supabase URL                                                     |
| `-k, --key <key>`                  | Supabase anon key                                                |
| `-s, --schema <schema>`            | Schema to analyze (default: all schemas)                         |
| `-x, --extract <url>`              | Extract credentials from JS file URL (experimental)              |
| `--dump <schema.table\|schema>`    | Dump data from specific table or swagger JSON from schema        |
| `--limit <number>`                 | Limit rows for dump or RPC results (default: 10)                 |
| `--rpc <schema.rpc_name>`          | Call an RPC function (read-only operations only)                 |
| `--args <json>`                    | JSON arguments for RPC call (use $VAR for environment variables) |
| `--json`                           | Output as JSON                                                   |
| `--html`                           | Generate HTML report                                             |
| `-d, --debug`                      | Enable debug mode                                                |
| `--explain`                        | Show query execution plan                                        |
| `--suppress-experimental-warnings` | Suppress experimental warnings                                   |

## What supascan Analyzes

### Database Security Assessment

- **Schema Discovery**: Automatically discovers all available schemas
- **Table Access Analysis**: Identifies which tables are:
  - ✅ **Readable** - Data is exposed and accessible
  - ⚠️ **Empty/Protected** - No data or protected by RLS
  - ❌ **Denied** - Access is explicitly denied

### JWT Token Analysis

- Parses and displays JWT token information
- Shows issuer, audience, expiration, and role information

### RPC Function Analysis

- Lists all available RPC functions
- Shows parameter requirements and types
- Validates parameters before execution

### Output Formats

- **Console**: Colorized terminal output with detailed analysis
- **JSON**: Machine-readable output for scripting
- **HTML**: Visual report that opens in your browser

## Examples

### Security Analysis Report

```bash
supascan --url https://abc123.supabase.co --key eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... --html
```

### Check Specific Table Access

```bash
supascan --url https://abc123.supabase.co --key eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... --dump public.users --limit 5
```

### Test RPC Function

```bash
supascan --url https://abc123.supabase.co --key eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... --rpc public.get_user_count --args '{"active": true}'
```

## Security Considerations

⚠️ **Important**: This tool is designed for security analysis and testing. Only use it on:

- Your own databases
- Databases you have explicit permission to test
- Staging/development environments

Never use this tool on production databases without proper authorization.

## Development

```bash
# Install dependencies
bun install

# Run locally
bun run start

# Build
bun run build

# Test
bun test

# Lint
bun run lint
```

## License

Private - All rights reserved.
