# Org Analyzer

A production-ready web application for analyzing Salesforce orgs, detecting migration blockers, and generating comprehensive reports.

## Features

- **Secure OAuth Authentication**: Connect to Production or Sandbox orgs via Salesforce OAuth Web Server Flow
- **Comprehensive Org Scanning**: 
  - Org metadata (edition, limits, licenses, users)
  - Objects, fields, and relationships
  - Automations (flows, triggers, validation rules)
  - Profiles, roles, queues, sharing rules
  - Reports, dashboards, and layouts
- **Migration Blocker Detection**:
  - Autonumber preservation issues
  - Automation density analysis
  - Large object identification
  - Profile mismatch detection
- **Interactive Dashboard**: Visual KPIs, charts, and blocker tables
- **Report Generation**: Export scans as JSON or Markdown runbooks
- **Historical Comparison**: Compare two scans to identify changes

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Data Fetching**: SWR
- **Database**: Supabase (PostgreSQL)
- **ORM**: Drizzle
- **Session Management**: iron-session
- **Logging**: pino
- **Error Tracking**: Sentry (optional)

## Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Salesforce Connected App (for OAuth)

## Setup

### 1. Clone and Install

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file based on `.env.example`:

```bash
# Application Mode
MODE=live

# Salesforce OAuth
SF_LOGIN_URL=https://login.salesforce.com
SF_SANDBOX_LOGIN_URL=https://test.salesforce.com
SF_CLIENT_ID=your_connected_app_client_id
SF_CLIENT_SECRET=your_connected_app_secret
API_VERSION=v60.0

# Session Security (must be at least 32 characters)
SESSION_PASSWORD=your_secure_random_password_at_least_32_chars

# Supabase
# Get connection string from Supabase Dashboard > Settings > Database > Connection string (Transaction mode)
SUPABASE_DB_URL=postgresql://postgres:[password]@[host]:5432/postgres
# Or use SUPABASE_URL (will construct connection string, less reliable)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Org Analyzer

# Optional: Monitoring
SENTRY_DSN=your_sentry_dsn
```

### 3. Configure Salesforce Connected App

1. In Salesforce Setup, go to **App Manager** → **New Connected App**
2. Set:
   - **Connected App Name**: Org Analyzer
   - **API Name**: Org_Analyzer
   - **Enable OAuth Settings**: ✓
   - **Callback URL**: `http://localhost:3000/api/auth/callback` (or your production URL)
   - **Selected OAuth Scopes**: 
     - `Access and manage your data (api)`
     - `Perform requests on your behalf at any time (refresh_token, offline_access)`
   - **Require Secret for Web Server Flow**: ✓
3. Save and note the **Consumer Key** (Client ID) and **Consumer Secret** (Client Secret)

### 4. Set Up Database

Run database migrations:

```bash
npm run db:generate
npm run db:migrate
```

Or use Supabase Dashboard to create tables manually based on `lib/db/schema.ts`.

### 5. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to start using the application.

## Project Structure

```
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # OAuth endpoints
│   │   ├── scan/         # Scan execution
│   │   ├── report/       # Report generation
│   │   └── compare/      # Scan comparison
│   ├── connect/          # OAuth connection page
│   ├── dashboard/        # Main dashboard
│   └── compare/          # Comparison view
├── server/
│   ├── salesforce/       # Salesforce API clients
│   ├── inventory/        # Org data collectors
│   ├── scanners/         # Blocker detection
│   ├── runbook/          # Markdown generation
│   └── composeScan.ts    # Scan orchestration
├── lib/
│   ├── db/               # Database schema and client
│   ├── types.ts          # TypeScript types
│   ├── session.ts        # Session management
│   └── utils.ts          # Utility functions
└── components/           # Reusable components (optional)
```

## Usage

### 1. Connect to Salesforce

1. Navigate to `/connect`
2. Toggle "Connect to Sandbox" if needed
3. Click "Connect to Salesforce"
4. Complete OAuth flow in Salesforce

### 2. Run a Scan

1. Go to `/dashboard`
2. Click "Run Scan"
3. Wait for scan completion (may take several minutes)

### 3. View Results

- **KPIs**: Key metrics at a glance
- **Charts**: Visual representation of data
- **Blockers Table**: Migration blockers with severity
- **Scan Info**: Metadata about the scan

### 4. Download Reports

- **JSON**: Full scan data in JSON format
- **Markdown**: Human-readable runbook with recommendations

### 5. Compare Scans

1. Navigate to `/compare`
2. Select two scans to compare
3. View differences in metrics and record counts

## API Routes

### Authentication

- `GET /api/auth/login?sandbox=true` - Get OAuth URL
- `GET /api/auth/callback` - OAuth callback handler
- `POST /api/auth/logout` - Clear session

### Scanning

- `POST /api/scan` - Execute org scan
- `GET /api/scans` - List all scans

### Reports

- `GET /api/report?scanId=xxx&format=json` - JSON report
- `GET /api/report?scanId=xxx&format=md` - Markdown report
- `GET /api/compare?scanId1=xxx&scanId2=yyy` - Compare scans

## Security

- **No Credential Storage**: Access tokens stored only in server-side sessions
- **Encrypted Refresh Tokens**: Optional encryption in Supabase
- **Row-Level Security**: Supabase RLS ensures user data isolation
- **Secure Sessions**: iron-session with secure cookies

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Monitoring

The app supports Sentry for error tracking. Set `SENTRY_DSN` in environment variables to enable.

## Limitations

- Scans are limited to first 100 objects to avoid timeout
- Some metadata types require additional API permissions
- Large orgs may take significant time to scan

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT

## Support

For issues and questions, please open a GitHub issue.
