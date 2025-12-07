# Common Modules - Sprint 7 Optimizations

This directory contains common modules created for Sprint 7 optimizations.

## Modules

### Cache Module (`cache/`)
- **Purpose**: Redis-based caching for hot endpoints
- **Features**:
  - Redis integration via `cache-manager-redis-yet`
  - Cache service with helper methods for key generation
  - TTL-based expiration
- **Usage**: Injected into controllers for caching responses

### Logger Module (`logger/`)
- **Purpose**: Structured logging with log rotation
- **Features**:
  - Winston-based logging
  - Daily log rotation (max 20MB per file)
  - Separate error, combined, exceptions, and rejections logs
  - Retention: 7-14 days depending on log type
- **Usage**: Global module, can be used throughout the app

### Error Recovery Module (`error-recovery/`)
- **Purpose**: Circuit breakers and retry strategies for external API calls
- **Features**:
  - Circuit breaker pattern (CLOSED, OPEN, HALF_OPEN states)
  - Exponential backoff retry strategy
  - Configurable failure thresholds and timeouts
- **Usage**: Use when making external API calls to providers

### Batching Module (`batching/`)
- **Purpose**: Batch API requests to reduce external API calls
- **Features**:
  - Concurrent request batching with `p-limit`
  - Configurable concurrency and batch size
  - Group requests by key for parallel processing
- **Usage**: Use when making multiple similar API calls

### Compression Module (`compression/`)
- **Purpose**: Compress data to reduce database storage
- **Features**:
  - Gzip compression/decompression
  - Base64 encoding for database storage
  - Used for signal evidence compression
- **Usage**: Compress large JSON data before storing in DB

## Integration Status

✅ **Completed:**
- Cache module integrated into Signals, Coins, and Events controllers
- Compression integrated into SignalService for evidence storage
- Rate limiting via ThrottlerModule (global)
- Logger module created (ready for use)

⏳ **Pending Integration:**
- Error recovery (circuit breakers) - ready for provider integrations
- Batching service - ready for provider integrations

## Configuration

Add to `.env`:
```bash
# Throttling
THROTTLE_TTL=60          # Time window in seconds
THROTTLE_LIMIT=100       # Max requests per window

# Logging
LOG_LEVEL=info           # debug, info, warn, error
```

