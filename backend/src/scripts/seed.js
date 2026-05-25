/**
 * MeterFlow — Demo Seed Script
 *
 * Creates:
 *  - 1 demo user  (demo@meterflow.io / Demo@1234)
 *  - 1 sample API (JSONPlaceholder — free public REST API)
 *  - 1 active API key for that API
 *
 * Usage:
 *   node src/scripts/seed.js
 *
 * The raw API key is printed to the console at the end.
 * Use it like:
 *   GET http://localhost:5000/gateway/<apiId>/posts
 *   Header: X-API-Key: <rawKey>
 */

require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const Api = require('../models/Api');
const ApiKey = require('../models/ApiKey');

// ─── Helpers (inline so script is self-contained) ─────────────────────────────

function generateApiKey(env = 'live') {
  const prefix = env === 'test' ? 'mf_test_' : 'mf_live_';
  return `${prefix}${crypto.randomBytes(32).toString('hex')}`;
}

async function hashApiKey(key) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(key, salt);
}

function generateKeyLookupHash(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

function maskApiKey(key) {
  if (!key || key.length < 20) return '***';
  return `${key.substring(0, 12)}${'*'.repeat(16)}${key.slice(-4)}`;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function seed() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/meterflow';

  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('✅ Connected\n');

  // ── 1. Demo User ────────────────────────────────────────────────────────────
  let user = await User.findOne({ email: 'demo@meterflow.io' });

  if (user) {
    console.log('ℹ️  Demo user already exists — skipping user creation');
  } else {
    user = await User.create({
      name: 'Demo User',
      email: 'demo@meterflow.io',
      password: 'Demo@1234',          // hashed by the pre-save hook
      role: 'api_owner',
      subscriptionPlan: 'pro',
      isEmailVerified: true,
      isActive: true,
    });
    console.log(`✅ Demo user created: ${user.email}`);
  }

  const userId   = user._id;
  const tenantId = user.tenantId || user._id.toString();

  // ── 2. Sample API ────────────────────────────────────────────────────────────
  let api = await Api.findOne({ ownerId: userId, name: 'JSONPlaceholder API' });

  if (api) {
    console.log('ℹ️  Sample API already exists — skipping API creation');
  } else {
    api = await Api.create({
      ownerId:     userId,
      tenantId:    tenantId,
      name:        'JSONPlaceholder API',
      description: 'A free fake REST API for testing and prototyping. Provides posts, comments, albums, photos, todos, and users.',
      baseUrl:     'https://jsonplaceholder.typicode.com',
      visibility:  'public',
      category:    'data',
      status:      'active',
      version:     'v1',
      tags:        ['demo', 'rest', 'fake-data', 'testing'],
      rateLimit: {
        requestsPerMinute: 100,
        requestsPerDay:    10000,
      },
      documentation: `## JSONPlaceholder API

A free online REST API that you can use whenever you need some fake data.

### Available Endpoints

| Method | Path              | Description              |
|--------|-------------------|--------------------------|
| GET    | /posts            | List all posts           |
| GET    | /posts/:id        | Get a single post        |
| POST   | /posts            | Create a post            |
| PUT    | /posts/:id        | Update a post            |
| DELETE | /posts/:id        | Delete a post            |
| GET    | /comments         | List all comments        |
| GET    | /users            | List all users           |
| GET    | /todos            | List all todos           |
| GET    | /albums           | List all albums          |
| GET    | /photos           | List all photos          |

### Example Request via MeterFlow Gateway

\`\`\`bash
curl http://localhost:5000/gateway/<apiId>/posts \\
  -H "X-API-Key: <your-api-key>"
\`\`\`

### Example Response

\`\`\`json
[
  {
    "userId": 1,
    "id": 1,
    "title": "sunt aut facere repellat provident occaecati",
    "body": "quia et suscipit\\nsuscipit recusandae..."
  }
]
\`\`\`
`,
      endpoints: [
        { path: '/posts',        method: 'GET',    description: 'List all posts',     isActive: true },
        { path: '/posts/:id',    method: 'GET',    description: 'Get a single post',  isActive: true },
        { path: '/posts',        method: 'POST',   description: 'Create a new post',  isActive: true },
        { path: '/posts/:id',    method: 'PUT',    description: 'Update a post',      isActive: true },
        { path: '/posts/:id',    method: 'DELETE', description: 'Delete a post',      isActive: true },
        { path: '/comments',     method: 'GET',    description: 'List all comments',  isActive: true },
        { path: '/users',        method: 'GET',    description: 'List all users',     isActive: true },
        { path: '/todos',        method: 'GET',    description: 'List all todos',     isActive: true },
        { path: '/albums',       method: 'GET',    description: 'List all albums',    isActive: true },
        { path: '/photos',       method: 'GET',    description: 'List all photos',    isActive: true },
      ],
    });
    console.log(`✅ Sample API created: "${api.name}" (id: ${api._id})`);
  }

  // ── 3. API Key ───────────────────────────────────────────────────────────────
  const existingKey = await ApiKey.findOne({ apiId: api._id, status: 'active' });

  if (existingKey) {
    console.log('ℹ️  Active API key already exists for this API — skipping key creation');
    console.log('\n─────────────────────────────────────────────────────────');
    console.log('  Existing masked key:', existingKey.maskedKey);
    console.log('  (Raw key not available — was only shown at creation time)');
    console.log('─────────────────────────────────────────────────────────\n');
  } else {
    const rawKey    = generateApiKey('live');
    const keyHash   = generateKeyLookupHash(rawKey);
    const hashedKey = await hashApiKey(rawKey);
    const maskedKey = maskApiKey(rawKey);
    const keyPrefix = rawKey.substring(0, 12);

    await ApiKey.create({
      apiId:       api._id,
      ownerId:     userId,
      tenantId:    tenantId,
      name:        'Demo Key — JSONPlaceholder',
      keyHash,
      hashedKey,
      maskedKey,
      keyPrefix,
      environment: 'live',
      status:      'active',
      expiresAt:   null,
      rateLimit:   { requestsPerMinute: 100 },
      scopes:      ['read', 'write'],
    });

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║              🎉  Seed completed successfully                 ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║  Login credentials                                           ║');
    console.log('║    Email   : demo@meterflow.io                               ║');
    console.log('║    Password: Demo@1234                                       ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log(`║  API ID    : ${api._id}  ║`);
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║  Raw API Key (shown ONCE — save it now):                     ║');
    console.log(`║  ${rawKey}  ║`);
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║  Test the gateway:                                           ║');
    console.log(`║  GET http://localhost:5000/gateway/${api._id}/posts  ║`);
    console.log('║  Header: X-API-Key: <rawKey above>                           ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
  }

  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
