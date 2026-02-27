# supascan

[![Tests](https://github.com/abhishekg999/supascan/actions/workflows/tests.yml/badge.svg)](https://github.com/abhishekg999/supascan/actions/workflows/tests.yml) [![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/abhishekg999/supascan/master/LICENCE) [![npm](https://img.shields.io/npm/v/supascan)](https://www.npmjs.com/package/supascan)

Security scanner for Supabase. Point it at any site using Supabase and it extracts credentials, discovers schemas, tests RLS policies, and dumps exposed data.

## Install

```bash
bun install -g supascan
```

or `npm install -g supascan`

## Usage

### Auto-detect from any URL

Point supascan at a site and it automatically extracts Supabase credentials from HTML/JS:

```bash
supascan --extract https://example.com --html
```

This fetches the page, parses inline scripts and external JS bundles, extracts the Supabase URL and anon key, runs a full security scan, and opens an interactive HTML report.

<!-- screenshot: html-report.png -->

### Manual credentials

```bash
supascan --url https://xyz.supabase.co --key eyJhbG... --html
```

### Console output

Skip `--html` for terminal output:

```bash
supascan --extract https://example.com
```

```
============================================================
  SUPABASE DATABASE ANALYSIS
============================================================

TARGET SUMMARY
--------------------
Domain: xyz.supabase.co
Project ID: xyz

JWT TOKEN INFO
--------------------
Issuer: https://xyz.supabase.co/auth/v1
Role: anon
Expires: 2030-01-01T00:00:00.000Z

DATABASE ANALYSIS
--------------------
Schemas discovered: 2

Schema: public

Tables: 8
  3 exposed | 2 empty/protected | 3 denied

  [+] users (~1420 rows exposed)
  [+] posts (~892 rows exposed)
  [+] comments (~3201 rows exposed)
  [-] sessions (0 rows - empty or RLS)
  [-] audit_logs (0 rows - empty or RLS)
  [X] admin_users (access denied)
  [X] secrets (access denied)
  [X] internal_config (access denied)

RPCs: 2
  * get_public_stats
    No parameters
  * search_users
    - query: string (required)
    - limit: integer (optional)
```

### Dump exposed data

```bash
supascan --extract https://example.com --dump public.users --limit 100
```

### Call RPC functions

```bash
supascan --extract https://example.com --rpc public.search_users --args '{"query": "admin"}'
```

Environment variables in args:

```bash
supascan --url $URL --key $KEY --rpc public.lookup --args '{"id": "$USER_ID"}'
```

### JSON output

```bash
supascan --extract https://example.com --json > report.json
```

## HTML Report

The `--html` flag generates an interactive report with:

- Schema browser
- Table explorer with pagination
- RPC tester with parameter forms
- Live query interface against the target

<!-- screenshot: html-tables.png -->

## Options

```
-V, --version                     output the version number
-u, --url <url>                   Supabase URL
-k, --key <key>                   Supabase anon key
-s, --schema <schema>             Schema to analyze (default: all schemas)
-x, --extract <url>               Extract credentials from JS file URL (experimental)
--dump <schema.table|schema>      Dump data from specific table or swagger JSON from schema
--limit <number>                  Limit rows for dump or RPC results (default: "10")
--rpc <schema.rpc_name>           Call an RPC function (read-only operations only)
--args <json>                     JSON arguments for RPC call (use $VAR for environment variables)
-H, --header <header>             Add custom HTTP header (can be used multiple times)
--json                            Output as JSON
--html                            Generate HTML report
-d, --debug                       Enable debug mode
--explain                         Show query execution plan
--suppress-experimental-warnings  Suppress experimental warnings
-h, --help                        display help for command
```

## License

MIT
