# supascan

[![.github/workflows/tests.yml](https://github.com/abhishekg999/supascan/actions/workflows/tests.yml/badge.svg)](https://github.com/abhishekg999/supascan/actions/workflows/tests.yml) [![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/abhishekg999/supascan/master/LICENCE)

**supascan** is an automated security scanner for Supabase databases. It detects exposed data, analyzes Row Level Security (RLS) policies, tests RPC functions, and generates comprehensive security reports.

## Features

- Automated schema and table discovery
- RLS policy effectiveness testing
- Exposed data detection with row count estimation
- RPC function parameter analysis and testing
- JWT token decoding and validation
- Multiple output formats (Console, JSON, HTML)
- Interactive HTML reports with live query interface
- Credential extraction from JavaScript files (experimental)

## Installation

**Bun:**

```bash
bun install -g supascan
```

**NPM (not yet):**

```bash
npm install -g supascan
```

**From source:**

```bash
git clone https://github.com/abhishekg999/supascan.git
cd supascan
bun install
bun run build
```

## Usage

To get basic options and usage:

```bash
supascan --help
```

### Quick Start

```bash
# Basic security scan
supascan --url https://your-project.supabase.co --key your-anon-key

# Generate HTML report
supascan --url https://your-project.supabase.co --key your-anon-key --html

# Analyze specific schema
supascan --url https://your-project.supabase.co --key your-anon-key --schema public

# Dump table data
supascan --url https://your-project.supabase.co --key your-anon-key --dump public.users --limit 100

# Test RPC function
supascan --url https://your-project.supabase.co --key your-anon-key --rpc public.my_function --args '{"param": "value"}'
```

## What supascan Detects

- **Exposed Tables**: Tables readable without authentication or with weak RLS
- **Data Leakage**: Estimated row counts for accessible tables
- **RPC Vulnerabilities**: Publicly callable functions and their parameters
- **JWT Issues**: Token expiration, role assignments, and claims
- **Schema Information**: Complete database structure visibility

## Security Considerations

⚠️ **Important**: This tool is for authorized security testing only.

- Only scan databases you own or have explicit permission to test
- Use on staging/development environments when possible
- Never use on production databases without proper authorization
- Be aware that scanning may trigger rate limits or monitoring alerts

Unauthorized database scanning may be illegal in your jurisdiction.

## Development

```bash
# Install dependencies
bun install

# Run locally
bun run start

# Run tests
bun test

# Build
bun run build
```

## License

supascan is distributed under the [MIT License](LICENCE).

## Links

- **Homepage**: https://github.com/abhishekg999/supascan
- **Issues**: https://github.com/abhishekg999/supascan/issues
- **NPM**: https://www.npmjs.com/package/supascan
