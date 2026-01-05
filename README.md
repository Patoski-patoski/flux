# Flux - Digital Wallet Transaction System

A microservices-based digital wallet system demonstrating event-driven architecture with PostgreSQL and Apache Kafka.

## 📋 Overview

Flux is a learning project that shows how to build a distributed financial system with:

- **Synchronous transactions** for immediate wallet operations
- **Asynchronous events** for audit trails and history
- **Eventual consistency** between services
- **ACID guarantees** for money transfers

### What You'll Learn

- PostgreSQL transactions and optimistic locking
- Kafka producer/consumer patterns
- Event-driven architecture
- Handling eventual consistency
- Concurrent balance updates without race conditions
- Clean Architecture with Domain-Driven Design

## 🏗️ Architecture

```markdown
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│  Wallet Service │───▶│    Kafka     │───▶│ History Service │
│   (port 3000)   │    │              │    │   (port 3001)   │
└─────────────────┘    │wallet-events │    └─────────────────┘
         │             └──────────────┘             │
         └──────────────────────────────────────────┘
                   Shared PostgreSQL Database
```

**Flow:**

1. Client calls Wallet Service API
2. Wallet Service updates PostgreSQL immediately
3. Wallet Service publishes event to Kafka
4. History Service consumes event asynchronously
5. Client queries history from History Service

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- Git

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd flux

# Start infrastructure (PostgreSQL, Kafka, Zookeeper)
docker-compose up -d

# Verify services are running
docker ps

# Setup Wallet Service
cd wallet-service
npm install
cp .env.example .env
npm run start:dev

# In a new terminal, setup History Service
cd history-service
npm install
cp .env.example .env
npm run start:dev
```

### Verify Installation

```bash
# Check Wallet Service
curl http://localhost:3000/health

# Check History Service
curl http://localhost:3001/health

# Access Kafka UI
open http://localhost:8080
```

## 📡 API Endpoints

### Wallet Service (port 3000)

#### Create Wallet

```bash
POST /wallets
Content-Type: application/json

{
  "userId": "user-123"
}
```

#### Fund Wallet

```bash
POST /wallets/{walletId}/fund
Content-Type: application/json

{
  "amount": 100.50
}
```

#### Transfer Money

```bash
POST /wallets/{walletId}/transfer
Content-Type: application/json

{
  "toWalletId": "wallet-456",
  "amount": 50.00
}
```

#### Get Wallet Balance

```bash
GET /wallets/{walletId}
```

#### Get User's Wallets

```bash
GET /users/{userId}/wallets
```

### History Service (port 3001)

#### Get Wallet History

```bash
GET /wallets/{walletId}/history
```

#### Get User Activity
   
```bash
GET /users/{userId}/activity
```

## 🗄️ Database Schema

### Wallet Service Tables

**wallets**

```sql
id           VARCHAR(36) PRIMARY KEY
user_id      VARCHAR(100) NOT NULL
balance      DECIMAL(19,4) NOT NULL DEFAULT 0
version      BIGINT NOT NULL DEFAULT 0
created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

**wallet_transactions**

```sql
id           VARCHAR(36) PRIMARY KEY
wallet_id    VARCHAR(36) NOT NULL
amount       DECIMAL(19,4) NOT NULL
type         VARCHAR(20) NOT NULL  -- FUND, TRANSFER_OUT, TRANSFER_IN
status       VARCHAR(20) NOT NULL  -- COMPLETED, FAILED
created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### History Service Table

**transaction_events**

```sql
id              VARCHAR(36) PRIMARY KEY
wallet_id       VARCHAR(36) NOT NULL
user_id         VARCHAR(100) NOT NULL
amount          DECIMAL(19,4) NOT NULL
event_type      VARCHAR(30) NOT NULL
transaction_id  VARCHAR(36)
created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
event_data      JSONB
```

## 🎯 Project Structure

```text
flux/
├── wallet-service/          # Handles wallet operations
│   └── src/
│       ├── domain/          # Business logic & entities
│       ├── application/     # Use cases & handlers
│       ├── infrastructure/  # Database & Kafka
│       └── presentation/    # Controllers & DTOs
│
└── history-service/         # Builds audit trail
    └── src/
        ├── domain/          # Event entities
        ├── application/     # Event handlers
        ├── infrastructure/  # Database & Kafka consumer
        └── presentation/    # History controllers
```

### Design Patterns Used

- **Domain-Driven Design (DDD)**: Separates business logic from infrastructure
- **Repository Pattern**: Abstracts data access
- **Command Pattern**: Encapsulates user requests
- **Value Objects**: Enforces business rules (Money, WalletId)
- **Domain Events**: Decouples services

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run integration tests
npm run test:e2e

# Run with coverage
npm run test:cov
```

## 🔧 Configuration

### Environment Variables

**Wallet Service (.env)**

```env
# Application
PORT=3000
NODE_ENV=development

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=flux_wallet
DATABASE_USER=flux_user
DATABASE_PASSWORD=flux_pass

# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_TOPIC_WALLET_EVENTS=wallet-events
```

**History Service (.env)**

```env
# Application
PORT=3001
NODE_ENV=development

# Database (same as wallet service)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=flux_wallet
DATABASE_USER=flux_user
DATABASE_PASSWORD=flux_pass

# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_TOPIC_WALLET_EVENTS=wallet-events
KAFKA_CONSUMER_GROUP=history-service-group
```

## 🐛 Troubleshooting

### Docker Services Won't Start

```bash
# Check if ports are in use
netstat -an | grep 5432  # PostgreSQL
netstat -an | grep 9092  # Kafka

# Reset everything
docker-compose down -v
docker-compose up -d
```

### Kafka Connection Issues

```bash
# Check Kafka logs
docker logs flux-kafka

# Verify topic creation
docker exec -it flux-kafka kafka-topics --list --bootstrap-server localhost:9092
```

### Database Connection Issues

```bash
# Test PostgreSQL connection
docker exec -it flux-postgres psql -U flux_user -d flux_wallet

# Check if database exists
\l

# Check tables
\dt
```

### Services Can't Connect

- Make sure all Docker containers are running: `docker ps`
- Check service logs: `docker logs <container-name>`
- Verify .env files are configured correctly
- Ensure no firewall blocking ports 3000, 3001, 5432, 9092

## 📚 Learning Resources

### Key Concepts

1. **Optimistic Locking**: Uses version numbers to prevent concurrent update conflicts
2. **Eventual Consistency**: History service eventually catches up with wallet state
3. **Idempotency**: Events can be processed multiple times safely
4. **Transaction Boundaries**: Database and Kafka operations handled carefully

### Recommended Reading

- [NestJS Documentation](https://docs.nestjs.com/)
- [TypeORM Documentation](https://typeorm.io/)
- [KafkaJS Documentation](https://kafka.js.org/)
- [Domain-Driven Design by Eric Evans](https://www.domainlanguage.com/ddd/)

## 🛣️ Roadmap

**Phase 1: Core Features** ✅
- [x] Create wallets
- [x] Fund wallets
- [x] Transfer money
- [x] Transaction history

**Phase 2: Production Features** 🚧
- [ ] Idempotency keys
- [ ] Dead letter queue
- [ ] Authentication & authorization
- [ ] Rate limiting
- [ ] Distributed tracing

**Phase 3: Advanced Features** 📋
- [ ] Withdrawal operations
- [ ] Transaction limits
- [ ] Webhook notifications
- [ ] Reconciliation jobs
- [ ] Multi-currency support

## 🤝 Contributing

This is a learning project, but improvements are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Inspired by real-world fintech architectures
- Built with NestJS, PostgreSQL, and Apache Kafka
- Designed for learning distributed systems


**Built with ❤️ & ☕ for learning event-driven architecture**
