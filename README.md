# Flux

A microservices-based digital wallet system built with NestJS, PostgreSQL, and Apache Kafka.

## What is Flux?

Flux is a distributed financial transaction system that handles wallet operations with real-time updates and asynchronous event processing. Money moves instantly, history builds eventually.

**Core capabilities:**
- Create and manage digital wallets
- Fund wallets and transfer money between users
- Complete audit trail of all transactions
- Event-driven architecture for scalability

## Architecture

Two microservices sharing a PostgreSQL database, communicating through Kafka:

```
Wallet Service (3000) ──▶ Kafka ──▶ History Service (3001)
         │                               │
         └───────── PostgreSQL ──────────┘
```

**Wallet Service** handles all wallet operations synchronously. **History Service** consumes events asynchronously to build transaction history. This gives us strong consistency where it matters (your balance) and eventual consistency where it doesn't (your history).

## Tech Stack

- **Backend**: NestJS + TypeScript
- **Database**: PostgreSQL with TypeORM
- **Messaging**: Apache Kafka
- **Infrastructure**: Docker Compose

Built with Domain-Driven Design and Clean Architecture principles.

## Getting Started

**Requirements**: Node.js 18+, Docker

```bash
# Start infrastructure
docker-compose up -d

# Install and run wallet service
cd wallet-service && npm install && npm run start:dev

# Install and run history service (new terminal)
cd history-service && npm install && npm run start:dev
```

Access Kafka UI at http://localhost:8080 to watch events flow.

## API

### Wallet Operations

```bash
# Create wallet
POST /wallets
{"userId": "user-123"}

# Add money
POST /wallets/{id}/fund
{"amount": 100.50}

# Transfer money
POST /wallets/{id}/transfer
{"toWalletId": "wallet-456", "amount": 50.00}

# Check balance
GET /wallets/{id}

# List user wallets
GET /users/{userId}/wallets
```

### Transaction History

```bash
# Get wallet history
GET /wallets/{id}/history

# Get user activity
GET /users/{userId}/activity
```

All amounts use 4 decimal places. Balances never go negative.

## Database

**Wallet Service owns:**
- `wallets` - User balances with optimistic locking
- `wallet_transactions` - Record of all operations

**History Service owns:**
- `transaction_events` - Event-sourced audit trail

One database, clear ownership boundaries.

## Configuration

Copy `.env.example` to `.env` in each service. Defaults work for local development.

**Key settings:**
```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
KAFKA_BROKERS=localhost:9092
```

## Development

```bash
# Run tests
npm run test

# Integration tests
npm run test:e2e

# Check coverage
npm run test:cov
```

## How It Works

**Synchronous Flow** (Wallet Operations):
1. Client requests wallet operation
2. Validate and update PostgreSQL
3. Publish event to Kafka
4. Return success immediately

**Asynchronous Flow** (History Building):
1. History Service consumes Kafka event
2. Process and store in transaction_events
3. Available for history queries

This architecture ensures money never gets lost while keeping the system responsive.

## Project Structure

```
flux/
├── wallet-service/      # Wallet operations
│   ├── domain/          # Business entities & rules
│   ├── application/     # Use cases & commands
│   ├── infrastructure/  # DB & Kafka implementation
│   └── presentation/    # REST controllers
│
└── history-service/     # Audit trail
    ├── domain/          # Event entities
    ├── application/     # Event handlers
    ├── infrastructure/  # DB & Kafka consumer
    └── presentation/    # History API
```

Clean separation of concerns with dependency inversion throughout.

## Key Design Decisions

**Why eventual consistency for history?**
Your wallet balance must be immediately accurate. Your transaction history can take a few milliseconds to update. This trade-off lets us scale reads independently from writes.

**Why optimistic locking?**
Multiple concurrent operations on the same wallet need coordination. Optimistic locking with version numbers prevents lost updates without pessimistic locks.

**Why Kafka over REST?**
Services don't need to know about each other. Events describe what happened, not what to do. This decoupling makes the system easier to extend and more resilient to failures.

## Roadmap

**Current**: Core wallet operations with event-driven history

**Next**:
- Idempotency keys for safe retries
- Dead letter queue for failed events
- Basic authentication with JWT
- Rate limiting per user

**Future**:
- Withdrawal operations
- Transaction holds and reversals
- Webhook notifications
- Multi-currency support

## Troubleshooting

**Services won't start?**
```bash
docker-compose down -v && docker-compose up -d
docker ps  # Verify all containers running
```

**Can't connect to Kafka?**
```bash
docker logs flux-kafka
# Wait 30 seconds after starting - Kafka needs time
```

**Database issues?**
```bash
docker exec -it flux-postgres psql -U flux_user -d flux_wallet
\dt  # List tables
```

## License

MIT

---

Built to learn event-driven architecture, PostgreSQL transactions, and Kafka messaging patterns in a real-world fintech context.
