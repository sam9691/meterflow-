// MongoDB initialization script
db = db.getSiblingDB('meterflow');

// Create indexes for performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ tenantId: 1 });

db.apis.createIndex({ ownerId: 1, status: 1 });
db.apis.createIndex({ visibility: 1, status: 1 });

db.apikeys.createIndex({ keyHash: 1 }, { unique: true });
db.apikeys.createIndex({ apiId: 1, status: 1 });

db.usagelogs.createIndex({ ownerId: 1, timestamp: -1 });
db.usagelogs.createIndex({ apiId: 1, timestamp: -1 });
db.usagelogs.createIndex({ billingMonth: 1 });

db.billings.createIndex({ userId: 1, billingMonth: 1 }, { unique: true });

print('MeterFlow MongoDB initialized successfully');
