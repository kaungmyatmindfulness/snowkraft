# Domain 4: Data Loading & Unloading

## Part 4: Snowpipe Streaming

This section covers Snowpipe Streaming, Snowflake's service for continuous, low-latency data ingestion. Snowpipe Streaming enables near real-time data availability within seconds, making it essential for use cases requiring immediate data access such as live dashboards, real-time analytics, and fraud detection.

---

## 1. Overview of Snowpipe Streaming

### 1.1 What Is Snowpipe Streaming?

Snowpipe Streaming is Snowflake's service for **continuous, low-latency loading of streaming data** directly into Snowflake tables. Unlike traditional file-based loading approaches, Snowpipe Streaming writes rows directly to tables without requiring intermediate staging in cloud storage.

> **KEY DIFFERENTIATOR (Exam Critical):** Snowpipe Streaming writes rows of data **directly to Snowflake tables WITHOUT the requirement of staging files**. This is the fundamental distinction from regular Snowpipe, which always requires files to be staged in cloud storage first. No staging area, no files -- just direct row insertion via SDK or REST API.

**Key Value Propositions:**

| Benefit | Description |
|---------|-------------|
| **Real-time Data Availability** | Ingests data as it arrives, supporting live dashboards, real-time analytics, and fraud detection |
| **Efficient Streaming Workloads** | Writes rows directly into tables, bypassing intermediate cloud storage |
| **Simplified Data Pipelines** | Streamlined approach for continuous data from application events, IoT sensors, CDC streams, and message queues |
| **Serverless and Scalable** | Automatically scales compute resources based on ingestion load |
| **Cost-effective** | Billing optimized for streaming ingestion workloads |

### 1.2 Streaming vs. File-Based Ingestion

Understanding the fundamental differences between Snowpipe Streaming and traditional Snowpipe is critical for the exam:

| Category | Snowpipe Streaming | Traditional Snowpipe |
|----------|-------------------|----------------------|
| **Form of Data** | Rows | Files |
| **Data Flow** | Direct row insertion via SDK/API | File staging in cloud storage |
| **Latency** | Seconds (5-10 seconds end-to-end) | Minutes (typically 1+ minute) |
| **Data Ordering** | Ordered insertions within each channel | Not supported; file loading order varies |
| **Third-party Requirements** | SDK (Java/Python) or REST API | None |
| **Best Use Case** | Real-time streaming data | Existing file-based pipelines in cloud storage |

**Visual Comparison:**

```
Traditional Snowpipe:
[Data Source] --> [Files] --> [Cloud Storage] --> [Snowpipe] --> [Table]
                              (Staging Area)

Snowpipe Streaming:
[Data Source] --> [SDK/API] --> [Channel] --> [Table]
                  (Direct Row Insertion)
```

### 1.3 Two Architectures: Classic vs. High-Performance

Snowflake offers two Snowpipe Streaming architectures:

| Aspect | High-Performance Architecture | Classic Architecture |
|--------|------------------------------|---------------------|
| **SDK** | `snowpipe-streaming` SDK (Java/Python) | `snowflake-ingest-sdk` |
| **Data Flow** | Channels opened against PIPE objects | Channels opened directly against tables |
| **REST API** | Supported for lightweight ingestion | Not available |
| **Pricing** | Throughput-based (credits per uncompressed GB) | Serverless compute + client connections |
| **Throughput** | Up to 10 GB/s per table | Variable based on client resources |
| **Server-side Transformations** | Supported via PIPE definition | Not supported |
| **Recommendation** | New projects | Existing implementations |

**When to Choose Each:**

- **High-Performance Architecture**: New streaming projects, need for maximum throughput, transparent pricing, REST API requirements
- **Classic Architecture**: Existing implementations, specific SDK compatibility needs

---

## 2. Architecture and Key Concepts

### 2.1 Channels

A **channel** is the fundamental unit of data flow in Snowpipe Streaming. It represents a logical, named streaming connection to Snowflake for loading data in an ordered manner.

**Key Channel Characteristics:**

- **Ordered Data Delivery**: Row ordering is preserved within a single channel
- **Named Connections**: Each channel has a unique name for identification
- **Offset Tracking**: Maintains position tracking via offset tokens
- **Multiple Channels per Table**: A table can receive data from many channels simultaneously

**Channel Behavior:**

| Scenario | Behavior |
|----------|----------|
| **Within a single channel** | Rows and offset tokens are ordered |
| **Across multiple channels to same table** | No ordering guarantee across channels |
| **Channel inactivity** | Automatically deleted after 30 days |
| **Channel re-open** | Returns latest persisted offset token |

**Channel Limits:**

| Architecture | Limit |
|--------------|-------|
| **High-Performance** | 2,000 channels per pipe (default) |
| **Classic** | 10,000 channels per table |

### 2.2 Offset Tokens

**Offset tokens** provide a mechanism for tracking ingestion progress and enabling exactly-once delivery semantics.

**How Offset Tokens Work:**

1. Client sends rows with an optional offset token per batch
2. Snowflake persists the offset token with committed data
3. On channel re-open, the latest committed offset token is returned
4. Client uses the token to reset position in source data

**Common Use Cases:**

- **Replay from failure**: Resume ingestion from the last successfully committed position
- **Verify committed data**: Confirm specific batches were persisted
- **Synchronize with source**: Align Snowflake position with source system offsets (e.g., Kafka partition offsets)

**Important Considerations:**

- Offset tokens are **linked to channels**
- Channels are automatically cleared after **30 days of inactivity**
- Consider maintaining separate offset tracking if channel lifecycle is a concern
- When a channel is re-opened, uncommitted buffered data is **discarded**

### 2.3 Client Architecture

**Classic Architecture Components:**

```
                   +-----------------+
                   |  Java/Scala     |
                   |  Application    |
                   +--------+--------+
                            |
                   +--------v--------+
                   | Snowflake       |
                   | Ingest SDK      |
                   +--------+--------+
                            |
          +-----------------+------------------+
          |                 |                  |
   +------v------+   +------v------+   +------v------+
   | Channel 1   |   | Channel 2   |   | Channel N   |
   +------+------+   +------+------+   +------+------+
          |                 |                  |
          +-----------------+------------------+
                            |
                   +--------v--------+
                   |  Target Table   |
                   +-----------------+
```

**High-Performance Architecture Components:**

```
                   +------------------+
                   |  Application     |
                   +--------+---------+
                            |
          +-----------------+------------------+
          |                                    |
   +------v--------+                   +-------v-------+
   | snowpipe-     |                   |  REST API     |
   | streaming SDK |                   |  Endpoint     |
   +------+--------+                   +-------+-------+
          |                                    |
          +-----------------+------------------+
                            |
                   +--------v--------+
                   |   PIPE Object   |
                   | (Configuration) |
                   +--------+--------+
                            |
                   +--------v--------+
                   |   Channels      |
                   +--------+--------+
                            |
                   +--------v--------+
                   |  Target Table   |
                   +-----------------+
```

### 2.4 PIPE Object (High-Performance Only)

In the high-performance architecture, the **PIPE object** manages:

- Data flow configuration
- Schema definitions
- Lightweight transformations at ingest time
- Channel associations

**Creating a Streaming PIPE:**

```sql
CREATE PIPE my_streaming_pipe
  AUTO_INGEST = FALSE
  AS
  SELECT
    $1:id::INT as id,
    $1:name::VARCHAR as name,
    $1:timestamp::TIMESTAMP_NTZ as event_time
  FROM @my_stage;
```

---

## 3. Snowpipe Streaming SDKs

### 3.1 SDK Options

| SDK | Languages | Requirements | Notes |
|-----|-----------|--------------|-------|
| **High-Performance SDK** | Java 11+, Python 3.8+ | `snowpipe-streaming` package | Rust-based core for better performance |
| **Classic SDK (Ingest SDK)** | Java 11+ | `snowflake-ingest-sdk` | Original implementation |

### 3.2 Java SDK (Classic) Key Classes

```java
// Key interfaces and classes
SnowflakeStreamingIngestClient  // Main client for managing channels
SnowflakeStreamingIngestChannel // Individual channel for data insertion
InsertValidationResponse        // Response from insertRows operation
```

**Basic Usage Pattern:**

```java
// 1. Create client
Properties props = new Properties();
props.put("account", "myaccount");
props.put("user", "myuser");
props.put("private_key", privateKey);

SnowflakeStreamingIngestClient client =
    SnowflakeStreamingIngestClientFactory
        .builder("my_client")
        .setProperties(props)
        .build();

// 2. Open channel
OpenChannelRequest request = OpenChannelRequest.builder("my_channel")
    .setDBName("my_db")
    .setSchemaName("my_schema")
    .setTableName("my_table")
    .build();

SnowflakeStreamingIngestChannel channel = client.openChannel(request);

// 3. Insert rows
Map<String, Object> row = new HashMap<>();
row.put("column1", "value1");
row.put("column2", 123);

InsertValidationResponse response = channel.insertRow(row, "offset_token_1");

// 4. Check for errors
if (response.hasErrors()) {
    // Handle validation errors
}

// 5. Close channel when done
channel.close();
client.close();
```

### 3.3 Key SDK Methods

| Method | Purpose |
|--------|---------|
| `openChannel()` | Creates or reopens a channel to a table |
| `insertRow()` / `insertRows()` | Inserts one or more rows |
| `getLatestCommittedOffsetToken()` | Retrieves last committed offset |
| `close()` | Closes the channel, flushing pending data |

### 3.4 Data Type Mappings

| Snowflake Type | Allowed Java Types |
|----------------|-------------------|
| NUMBER, INT, FLOAT, DOUBLE | `int`, `long`, `float`, `double`, `BigDecimal`, `BigInteger` |
| VARCHAR, CHAR, STRING | `String` |
| BINARY | `byte[]` |
| BOOLEAN | `boolean` |
| DATE | `java.time.LocalDate`, `java.sql.Date` |
| TIME | `java.time.LocalTime`, `java.sql.Time` |
| TIMESTAMP_NTZ | `java.time.LocalDateTime` |
| TIMESTAMP_LTZ | `java.time.ZonedDateTime`, `java.time.OffsetDateTime` |
| VARIANT, OBJECT, ARRAY | `String` (JSON), `Map<String, ?>`, `List<?>` |

---

## 4. Kafka Connector with Snowpipe Streaming

### 4.1 Overview

The **Snowflake Connector for Kafka** (version 2.0.0+) integrates with Snowpipe Streaming to load Kafka topic data directly into Snowflake tables.

**Architecture:**

```
+---------------+     +------------------+     +-----------+
| Kafka Cluster | --> | Kafka Connector  | --> | Snowflake |
| (Topics)      |     | + Ingest SDK     |     | (Tables)  |
+---------------+     +------------------+     +-----------+
```

### 4.2 Configuration

**Required Property:**

```properties
# Enable Snowpipe Streaming (instead of traditional Snowpipe)
snowflake.ingestion.method = SNOWPIPE_STREAMING
```

**Key Configuration Properties:**

| Property | Description | Default |
|----------|-------------|---------|
| `snowflake.ingestion.method` | `SNOWPIPE_STREAMING` or `SNOWPIPE` | `SNOWPIPE` |
| `buffer.flush.time` | Seconds between buffer flushes | 10 |
| `buffer.count.records` | Records buffered before flush | 10000 |
| `buffer.size.bytes` | Bytes buffered before flush | 20000000 |
| `enable.streaming.client.optimization` | One client for multiple partitions | true |

### 4.3 Exactly-Once Semantics

The Kafka connector achieves **exactly-once delivery** through:

1. **One-to-one partition-channel mapping**: Each Kafka partition maps to one channel
2. **Dual offset tracking**:
   - **Snowflake offset token**: Last committed position in Snowflake
   - **Consumer offset**: Position tracked by Kafka
3. **Recovery process**: On restart, channel is reopened and consumer offset is reset to Snowflake's committed offset token

**Offset Recovery Flow:**

```
1. Connector starts/restarts
2. Opens/reopens channel with same name
3. Calls getLatestCommittedOffsetToken()
4. Resets Kafka consumer offset to (committed_offset + 1)
5. Resumes ingestion from correct position
```

### 4.4 Schema Detection and Evolution

The Kafka connector supports automatic schema evolution:

```properties
# Enable schema detection
snowflake.schema_evolution = true
snowflake.enable.schematization = true
```

**Behavior:**

- Table structure automatically defined from incoming data
- New columns added automatically when data structure changes
- Requires `EVOLVE SCHEMA` privilege on target table

---

## 5. Billing and Costs

### 5.1 High-Performance Architecture Billing

**Model: Throughput-Based**

| Component | How Measured | Notes |
|-----------|--------------|-------|
| **Ingestion** | Credits per uncompressed GB | Based on input bytes received |
| **What's Measured** | Data values only | Keys in JSON not counted |

**Example Calculation:**

```
Ingestion rate: 1 MB/s
Per hour: 1 MB/s * 3600 s = 3.6 GB/hour
Credits: 3.6 GB * [rate per GB from consumption table]
```

**Monitoring Usage:**

```sql
SELECT *
FROM SNOWFLAKE.ACCOUNT_USAGE.METERING_HISTORY
WHERE SERVICE_TYPE = 'SNOWPIPE_STREAMING';
```

### 5.2 Classic Architecture Billing

**Components:**

| Cost Component | Description |
|----------------|-------------|
| **Serverless Compute** | Resources for ingestion processing |
| **Client Connections** | Per active client charge |
| **File Migration** | Background optimization of ingested data |

**Key Views for Monitoring:**

| View | Purpose |
|------|---------|
| `METERING_HISTORY` | Overall credit consumption |
| `SNOWPIPE_STREAMING_CLIENT_HISTORY` | Client connection costs |
| `SNOWPIPE_STREAMING_FILE_MIGRATION_HISTORY` | File migration operations |

### 5.3 Cost Optimization Tips

1. **Use fewer clients with higher throughput**: Reduces per-client charges
2. **Use multiple channels per client**: Channels don't affect client cost
3. **Batch rows efficiently**: Optimal batch size is 10-16 MB
4. **Consider table design**: Co-locating batch and streaming to same tables can reduce migration costs

---

## 6. Limitations and Considerations

### 6.1 High-Performance Architecture Limitations

**Service Limits:**

| Limit Type | Value |
|------------|-------|
| Maximum table throughput | 10 GB/s uncompressed |
| Channels per pipe | 2,000 (default) |
| Pipes per account | 1,000 |
| Pipes per table | 10 |
| SDK channel throughput | 12 MB/s uncompressed |
| REST endpoint throughput | 1 MB/s uncompressed |
| REST payload limit | 4 MB per request |
| REST request rate | 10 RPS |

**Unsupported Features:**

- OAuth and Personal Access Tokens for authentication
- Partitioned Iceberg tables
- ON_ERROR options other than CONTINUE

### 6.2 Classic Architecture Limitations

**Unsupported Features:**

| Feature | Status |
|---------|--------|
| Fail-safe recovery | Not supported for tables with streaming data |
| GEOGRAPHY/GEOMETRY types | Not supported |
| Columns with collations | Not supported |
| TEMPORARY tables | Not supported |
| Structured types (OBJECT, MAP, ARRAY) | Only for Iceberg tables |
| Increased MAX size limits (128 MB VARCHAR) | Not supported |

**Data Encryption:**

- Only 256-bit AES keys supported

### 6.3 General Considerations

**MAX_CLIENT_LAG:**

| Table Type | Default | Purpose |
|------------|---------|---------|
| Standard Snowflake tables | 1 second | Controls data flush frequency |
| Iceberg tables | 30 seconds | Optimized for Parquet file generation |

**Channel Lifecycle:**

- Inactive channels auto-deleted after 30 days
- Offset tokens lost when channels are deleted
- Consider maintaining external offset tracking for critical workloads

---

## 7. Best Practices

### 7.1 Channel Management

| Practice | Recommendation |
|----------|----------------|
| **Channel Lifecycle** | Use long-lived channels; avoid frequent open/close cycles |
| **Naming Convention** | Use deterministic, descriptive names (e.g., `source-env-region-client-id`) |
| **Scaling** | Open multiple channels to increase throughput |
| **Monitoring** | Regularly check `getChannelStatus` for health metrics |

### 7.2 Data Quality

**Client-side Validation:**

- Implement schema validation before sending data
- Selective validation (batch boundaries or sampling) for performance

**Server-side Error Handling:**

- Monitor `row_error_count` via `getChannelStatus`
- Implement dead-letter queue pattern for failed records

### 7.3 Tracking and Recovery

**Recommended Approach:**

Include tracking columns in your data:

```sql
CREATE TABLE streaming_target (
    -- Business columns
    event_id INT,
    event_data VARIANT,

    -- Tracking columns
    channel_id INT,
    stream_offset BIGINT,
    ingested_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);
```

**Detecting Missing Records:**

```sql
-- Find gaps in offset sequence
SELECT
    channel_id,
    stream_offset,
    LAG(stream_offset) OVER (PARTITION BY channel_id ORDER BY stream_offset) as prev_offset,
    stream_offset - LAG(stream_offset) OVER (PARTITION BY channel_id ORDER BY stream_offset) as gap
FROM streaming_target
WHERE gap > 1;
```

### 7.4 Row Batching

| Guideline | Value |
|-----------|-------|
| **Optimal batch size** | 10-16 MB |
| **Maximum batch size** | 16 MB compressed |
| **Method preference** | Use `insertRows()` over multiple `insertRow()` calls |

---

## 8. Exam Tips and Common Question Patterns

### 8.1 Frequently Tested Concepts

1. **Streaming vs. File-Based**: Know when to use Snowpipe Streaming vs. traditional Snowpipe
2. **Channels**: Understand ordered delivery within channels, not across channels
3. **Offset Tokens**: How they enable exactly-once delivery and recovery
4. **Billing Models**: Throughput-based (high-performance) vs. compute + connection (classic)
5. **Kafka Integration**: Configuration properties and exactly-once semantics
6. **Limitations**: What features are NOT supported with Snowpipe Streaming

### 8.2 Common Exam Traps

| Trap | Correct Understanding |
|------|----------------------|
| "Snowpipe Streaming requires file staging" | FALSE - writes rows directly to tables |
| "Data ordering is guaranteed across channels" | FALSE - only within a single channel |
| "Offset tokens never expire" | FALSE - lost when channel deleted (30 days inactive) |
| "Traditional Snowpipe has lower latency" | FALSE - Streaming has lower latency (seconds vs. minutes) |
| "Snowpipe Streaming uses Snowpipe's file-based COPY INTO" | FALSE - different mechanisms entirely |
| "REST API available in classic architecture" | FALSE - only high-performance |

### 8.3 Key Comparisons to Know

**Snowpipe Streaming vs. Traditional Snowpipe:**

| Aspect | Snowpipe Streaming | Traditional Snowpipe |
|--------|-------------------|----------------------|
| Data input | Rows via SDK/API | Files in cloud storage |
| Latency | Seconds | Minutes |
| Ordering | Within channel | Not guaranteed |
| Use case | Real-time streaming | File-based ETL |

**High-Performance vs. Classic Architecture:**

| Aspect | High-Performance | Classic |
|--------|-----------------|---------|
| SDK | `snowpipe-streaming` | `snowflake-ingest-sdk` |
| PIPE object | Required | Not used |
| REST API | Available | Not available |
| Pricing | Per GB throughput | Compute + connections |

### 8.4 Practice Questions

**Question 1:** What is the primary difference between Snowpipe Streaming and traditional Snowpipe?

- A) Snowpipe Streaming requires files to be staged in cloud storage
- B) Snowpipe Streaming writes rows directly to tables without intermediate file staging
- C) Traditional Snowpipe has lower latency than Snowpipe Streaming
- D) Snowpipe Streaming cannot work with Kafka

**Answer:** B - Snowpipe Streaming writes rows directly to tables using SDKs or APIs, bypassing intermediate cloud storage staging.

---

**Question 2:** A data engineer needs to ensure exactly-once delivery when using the Kafka connector with Snowpipe Streaming. What mechanism enables this?

- A) Kafka's built-in deduplication
- B) Snowflake's automatic record deduplication
- C) Offset token tracking with channel-partition mapping
- D) File checksums in cloud storage

**Answer:** C - The Kafka connector maintains a one-to-one mapping between Kafka partitions and Snowpipe Streaming channels, using offset tokens to track committed positions and recover from failures.

---

**Question 3:** In Snowpipe Streaming, data ordering is guaranteed:

- A) Across all channels pointing to the same table
- B) Within a single channel only
- C) Based on the timestamp of the source data
- D) By Snowflake's automatic sorting

**Answer:** B - Row ordering and offset tokens are preserved within a single channel but not across multiple channels pointing to the same table.

---

**Question 4:** What happens to a Snowpipe Streaming channel after 30 days of inactivity?

- A) It is automatically suspended
- B) It is automatically deleted along with its offset token
- C) It remains available indefinitely
- D) It triggers an alert to the account administrator

**Answer:** B - Inactive channels are automatically deleted after 30 days, and their offset tokens are lost.

---

**Question 5:** Which billing model does the high-performance Snowpipe Streaming architecture use?

- A) Per-query compute charges
- B) Warehouse credit consumption
- C) Throughput-based credits per uncompressed GB
- D) Per-channel hourly charges

**Answer:** C - The high-performance architecture uses transparent, throughput-based pricing charged per uncompressed gigabyte of data ingested.

---

**Question 6:** A company wants to load data from multiple IoT sensors into Snowflake with sub-minute latency. Which approach is most appropriate?

- A) Traditional Snowpipe with continuous file drops
- B) Scheduled COPY INTO commands every minute
- C) Snowpipe Streaming with the Ingest SDK
- D) External tables with automatic refresh

**Answer:** C - Snowpipe Streaming provides the lowest latency (seconds) for continuous data ingestion, making it ideal for IoT use cases.

---

**Question 7:** When using the Kafka connector with Snowpipe Streaming, what property must be set to enable streaming ingestion?

- A) `snowflake.streaming.enabled = true`
- B) `snowflake.ingestion.method = SNOWPIPE_STREAMING`
- C) `kafka.streaming.mode = true`
- D) `snowpipe.type = streaming`

**Answer:** B - The `snowflake.ingestion.method` property must be set to `SNOWPIPE_STREAMING` to enable streaming ingestion.

---

**Question 8:** Which type of table does NOT support Snowpipe Streaming Classic?

- A) Standard tables
- B) Dynamic tables
- C) TEMPORARY tables
- D) Iceberg tables

**Answer:** C - TEMPORARY tables are not supported by Snowpipe Streaming Classic architecture.

---

## 9. Quick Reference

### Common SQL Commands

```sql
-- View channel information
SHOW CHANNELS;

-- Check streaming pipe status
SHOW PIPES LIKE 'my_streaming_pipe';

-- Monitor streaming costs (high-performance)
SELECT *
FROM SNOWFLAKE.ACCOUNT_USAGE.METERING_HISTORY
WHERE SERVICE_TYPE = 'SNOWPIPE_STREAMING';

-- Monitor classic architecture costs
SELECT *
FROM SNOWFLAKE.ACCOUNT_USAGE.SNOWPIPE_STREAMING_CLIENT_HISTORY;

SELECT *
FROM SNOWFLAKE.ACCOUNT_USAGE.SNOWPIPE_STREAMING_FILE_MIGRATION_HISTORY;
```

### Required Privileges

| Object | Privilege | Notes |
|--------|-----------|-------|
| Table | INSERT | Required for data insertion |
| Table | EVOLVE SCHEMA | Required for schema evolution with Kafka |
| Database | USAGE | Required |
| Schema | USAGE | Required |
| Pipe | OPERATE | High-performance architecture only |

### SDK Maven Coordinates

```xml
<!-- High-Performance SDK -->
<dependency>
    <groupId>com.snowflake</groupId>
    <artifactId>snowpipe-streaming</artifactId>
    <version>LATEST</version>
</dependency>

<!-- Classic SDK -->
<dependency>
    <groupId>net.snowflake</groupId>
    <artifactId>snowflake-ingest-sdk</artifactId>
    <version>LATEST</version>
</dependency>
```

### Key Metrics to Monitor

| Metric | Source | Purpose |
|--------|--------|---------|
| `last_committed_offset_token` | `getChannelStatus` | Verify ingestion progress |
| `row_error_count` | `getChannelStatus` | Detect ingestion errors |
| `CREDITS_USED` | `METERING_HISTORY` | Cost monitoring |
| `CLIENT_COST` | `SNOWPIPE_STREAMING_CLIENT_HISTORY` | Classic connection costs |

---

**Key Takeaway:** Snowpipe Streaming is Snowflake's solution for low-latency, real-time data ingestion. It differs fundamentally from traditional Snowpipe by writing rows directly to tables rather than loading files. Understanding the channel concept, offset token tracking, and the differences between classic and high-performance architectures is essential for the SnowPro Core exam. For new implementations, Snowflake recommends the high-performance architecture with its throughput-based pricing and REST API capabilities.
