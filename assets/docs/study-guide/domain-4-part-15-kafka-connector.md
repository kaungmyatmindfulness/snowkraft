# Domain 4: Data Loading & Unloading - Part 15

## Kafka Connector for Snowflake

### Overview

The Snowflake Connector for Kafka enables streaming data ingestion from Apache Kafka topics directly into Snowflake tables. It is a critical component for real-time data pipelines and is a key topic for the SnowPro Core exam.

---

## 1. Key Concepts

### What is Apache Kafka?

Apache Kafka is a distributed streaming platform that uses a publish-subscribe model for reading and writing streams of records. Key concepts include:

| Term | Definition |
|------|------------|
| **Topic** | A named feed to which records are published |
| **Partition** | Divisions within a topic for scalability |
| **Producer** | Application that publishes messages to topics |
| **Consumer** | Application that subscribes to topics |
| **Kafka Connect** | Framework for connecting Kafka with external systems |

### Snowflake Connector for Kafka

The Kafka connector is a **sink connector** that:
- Reads data from one or more Kafka topics
- Loads the data into Snowflake tables
- Runs within the Kafka Connect framework

**Two Versions Available:**
1. **Confluent Package Version** - For Confluent Kafka distributions
2. **Open Source (OSS) Apache Kafka Version** - For standard Apache Kafka

> **Exam Tip:** The Kafka connector is a **sink connector** (writes TO Snowflake). It does NOT read from Snowflake - it only loads data INTO Snowflake.

---

## 2. Kafka Connector Architecture

### Data Loading Methods

The Kafka connector supports two ingestion methods:

| Method | Description | Latency | Use Case |
|--------|-------------|---------|----------|
| **Snowpipe** | File-based loading via internal stages and pipes | Higher | Batch-oriented streaming |
| **Snowpipe Streaming** | Direct row insertion via API | Lower | Real-time, low-latency |

### Workflow for Snowpipe-Based Loading

```
1. Kafka Connect subscribes to topic(s)
2. Connector buffers messages from partitions
3. When threshold reached (time/memory/count):
   - Write messages to temporary file in internal stage
   - Trigger Snowpipe to ingest the file
4. Snowpipe queues the file and loads via serverless compute
5. Connector confirms load, deletes staged file
```

### Objects Created by the Connector

For each topic, the connector creates:
- **One internal stage** - `SNOWFLAKE_KAFKA_CONNECTOR_<connector_name>_STAGE_<table_name>`
- **One pipe per partition** - `SNOWFLAKE_KAFKA_CONNECTOR_<connector_name>_PIPE_<table_name>_<partition>`
- **One table** (if not exists) - Using topic name converted to uppercase

> **Exam Tip:** The connector creates ONE pipe per PARTITION, not per topic. Understanding this naming convention helps with troubleshooting.

---

## 3. Table Schema

### Default Schema (Two VARIANT Columns)

By default, every Kafka-loaded table has two columns:

| Column | Type | Content |
|--------|------|---------|
| **RECORD_CONTENT** | VARIANT | The Kafka message payload (JSON/Avro) |
| **RECORD_METADATA** | VARIANT | Metadata about the message |

### RECORD_METADATA Fields

| Field | Data Type | Description |
|-------|-----------|-------------|
| `topic` | VARCHAR | Name of the Kafka topic |
| `partition` | VARCHAR | Kafka partition number |
| `offset` | INTEGER | Offset within the partition |
| `CreateTime` / `LogAppendTime` | BIGINT | Timestamp in milliseconds |
| `key` | VARCHAR | Message key (if KeyedMessage) |
| `schema_id` | INTEGER | Schema registry ID (if using Avro) |
| `headers` | OBJECT | User-defined key-value pairs |
| `SnowflakeConnectorPushTime` | BIGINT | When record was pushed to buffer (Snowpipe Streaming only) |

### Querying Kafka Data

```sql
-- Extract data using VARIANT syntax
SELECT
    record_metadata:CreateTime AS created_time,
    record_metadata:topic AS source_topic,
    record_content:sensor_id AS sensor_id,
    record_content:temperature AS temperature
FROM kafka_sensor_data
WHERE record_metadata:topic = 'temperature_readings';
```

---

## 4. Configuration Essentials

### Required Configuration Properties

| Property | Description | Example |
|----------|-------------|---------|
| `name` | Unique connector name | `"XYZCompanySensorData"` |
| `connector.class` | Connector class | `"com.snowflake.kafka.connector.SnowflakeSinkConnector"` |
| `topics` | Comma-separated topic list | `"topic1,topic2"` |
| `snowflake.url.name` | Snowflake account URL | `"myorg-myaccount.snowflakecomputing.com:443"` |
| `snowflake.user.name` | Snowflake username | `"kafka_user"` |
| `snowflake.private.key` | RSA private key (without header/footer) | Key content |
| `snowflake.database.name` | Target database | `"KAFKA_DB"` |
| `snowflake.schema.name` | Target schema | `"KAFKA_SCHEMA"` |
| `key.converter` | Key converter class | `"org.apache.kafka.connect.storage.StringConverter"` |
| `value.converter` | Value converter class | See converter options below |

### Value Converter Options

| Format | Converter Class |
|--------|-----------------|
| JSON (Snowflake) | `com.snowflake.kafka.connector.records.SnowflakeJsonConverter` |
| Avro with Schema Registry | `com.snowflake.kafka.connector.records.SnowflakeAvroConverter` |
| Avro without Schema Registry | `com.snowflake.kafka.connector.records.SnowflakeAvroConverterWithoutSchemaRegistry` |
| Plain Text | `org.apache.kafka.connect.storage.StringConverter` |

### Buffer Configuration Properties

| Property | Default | Description |
|----------|---------|-------------|
| `buffer.count.records` | 10,000 | Records before flush |
| `buffer.flush.time` | 120 (Snowpipe) / 10 (Streaming) | Seconds between flushes |
| `buffer.size.bytes` | 5 MB (Snowpipe) / 20 MB (Streaming) | Bytes before flush |

> **Exam Tip:** Buffer settings control when data moves from Kafka Connect to Snowflake. Lower values = lower latency but higher cost.

### Sample Configuration (Distributed Mode - JSON)

```json
{
  "name": "SensorDataConnector",
  "config": {
    "connector.class": "com.snowflake.kafka.connector.SnowflakeSinkConnector",
    "tasks.max": "8",
    "topics": "sensor_readings",
    "snowflake.topic2table.map": "sensor_readings:SENSOR_DATA",
    "buffer.count.records": "10000",
    "buffer.flush.time": "60",
    "buffer.size.bytes": "5000000",
    "snowflake.url.name": "myorg-myaccount.snowflakecomputing.com:443",
    "snowflake.user.name": "kafka_user",
    "snowflake.private.key": "MIIEvg...",
    "snowflake.database.name": "STREAMING_DB",
    "snowflake.schema.name": "KAFKA_SCHEMA",
    "key.converter": "org.apache.kafka.connect.storage.StringConverter",
    "value.converter": "com.snowflake.kafka.connector.records.SnowflakeJsonConverter"
  }
}
```

---

## 5. Schema Registry Support

### What is Schema Registry?

Schema Registry is a centralized service for managing and validating schemas for Kafka messages. It ensures:
- Schema compatibility across producers and consumers
- Data quality through schema enforcement
- Schema evolution management

### Configuring Schema Registry with Avro

```json
{
  "value.converter": "com.snowflake.kafka.connector.records.SnowflakeAvroConverter",
  "value.converter.schema.registry.url": "http://localhost:8081",
  "value.converter.basic.auth.credentials.source": "USER_INFO",
  "value.converter.basic.auth.user.info": "username:password"
}
```

### Supported Data Formats

| Format | Schema Registry Required | Notes |
|--------|-------------------------|-------|
| JSON | Optional | Data types inferred if no schema |
| Avro | Required (for SnowflakeAvroConverter) | Schema ID stored in metadata |
| Protobuf | Supported | Requires version 1.5.0+ |

---

## 6. Snowpipe Streaming Integration

### Enabling Snowpipe Streaming

```json
{
  "snowflake.ingestion.method": "SNOWPIPE_STREAMING"
}
```

### Key Properties for Snowpipe Streaming

| Property | Default | Description |
|----------|---------|-------------|
| `snowflake.ingestion.method` | `SNOWPIPE` | Set to `SNOWPIPE_STREAMING` |
| `snowflake.streaming.max.client.lag` | 30 seconds | Flush frequency to Snowflake |
| `snowflake.streaming.enable.single.buffer` | true | Skip connector internal buffer |
| `enable.streaming.client.optimization` | true | One client per connector |

### Benefits of Snowpipe Streaming

| Feature | Snowpipe | Snowpipe Streaming |
|---------|----------|--------------------|
| Latency | Seconds to minutes | Sub-second possible |
| Files created | Yes (internal stage) | No (direct insert) |
| Cost model | Per-file | Per-row compute |
| Stages/Pipes | Created | Not needed |

---

## 7. Exactly-Once Delivery Semantics

### How Exactly-Once Works

Snowpipe Streaming provides **exactly-once semantics** by default:

1. **Consumer Offset** - Tracks position in Kafka (managed by Kafka)
2. **Offset Token** - Tracks committed position in Snowflake (managed by Snowflake)

### Delivery Guarantee Mechanisms

| Mechanism | Description |
|-----------|-------------|
| **Channel Open/Reopen** | Uses Snowflake offset token as source of truth |
| **Offset Validation** | Only accepts rows with sequential offsets |
| **Crash Recovery** | Reopens channel, resets consumer offset to last committed |
| **Retry Mechanism** | Retries API calls for transient failures |
| **Consumer Offset Advancement** | Periodically syncs with committed offset token |

> **Exam Tip:** Exactly-once semantics are ONLY available with Snowpipe Streaming, not traditional Snowpipe.

---

## 8. Schema Detection and Evolution

### Enabling Schema Detection

```json
{
  "snowflake.ingestion.method": "SNOWPIPE_STREAMING",
  "snowflake.enable.schematization": "TRUE",
  "schema.registry.url": "http://localhost:8081"
}
```

### Requirements

1. Kafka connector version 2.0.0+
2. Set `ENABLE_SCHEMA_EVOLUTION = TRUE` on the table
3. Use a role with OWNERSHIP on the table

### Schema Evolution Capabilities

| Capability | Supported |
|------------|-----------|
| Add new columns | Yes |
| Drop NOT NULL constraint | Yes |
| Change data types | No |
| Remove columns | No |

### Before and After Schema Detection

**Without Schema Detection:**
```
| RECORD_METADATA | RECORD_CONTENT |
|-----------------|----------------|
| {...metadata...}| {"account":"ABC","symbol":"ZTEST","side":"BUY"} |
```

**With Schema Detection:**
```
| RECORD_METADATA | ACCOUNT | SYMBOL | SIDE |
|-----------------|---------|--------|------|
| {...metadata...}| ABC     | ZTEST  | BUY  |
```

---

## 9. Authentication

### Key Pair Authentication (Required)

The Kafka connector uses **key pair authentication** (not username/password):

```bash
# Generate private key (encrypted)
openssl genrsa 2048 | openssl pkcs8 -topk8 -v2 aes256 -inform PEM -out rsa_key.p8

# Generate public key
openssl rsa -in rsa_key.p8 -pubout -out rsa_key.pub

# Assign public key to user in Snowflake
ALTER USER kafka_user SET RSA_PUBLIC_KEY = 'MIIBIjANBgkqh...';
```

### External OAuth (Snowpipe Streaming Only)

```json
{
  "snowflake.authenticator": "oauth",
  "snowflake.oauth.client.id": "client_id",
  "snowflake.oauth.client.secret": "secret",
  "snowflake.oauth.refresh.token": "refresh_token",
  "snowflake.oauth.token.endpoint": "https://oauth.example.com/token"
}
```

---

## 10. Required Privileges

### Minimum Privileges for Kafka Connector Role

| Object | Privilege | Notes |
|--------|-----------|-------|
| Database | USAGE | Required |
| Schema | USAGE, CREATE TABLE, CREATE STAGE, CREATE PIPE | CREATE privileges can be revoked after setup |
| Table | OWNERSHIP | For existing tables |
| Stage | READ, WRITE | For existing stages (not recommended) |

### Creating a Kafka Connector Role

```sql
-- Create dedicated role
CREATE ROLE kafka_connector_role;

-- Grant database and schema privileges
GRANT USAGE ON DATABASE kafka_db TO ROLE kafka_connector_role;
GRANT USAGE ON SCHEMA kafka_schema TO ROLE kafka_connector_role;
GRANT CREATE TABLE ON SCHEMA kafka_schema TO ROLE kafka_connector_role;
GRANT CREATE STAGE ON SCHEMA kafka_schema TO ROLE kafka_connector_role;
GRANT CREATE PIPE ON SCHEMA kafka_schema TO ROLE kafka_connector_role;

-- Assign to user and set as default
GRANT ROLE kafka_connector_role TO USER kafka_user;
ALTER USER kafka_user SET DEFAULT_ROLE = kafka_connector_role;
```

> **Exam Tip:** Privileges must be granted DIRECTLY to the role - they cannot be inherited from role hierarchy.

---

## 11. Monitoring with JMX

### Enabling JMX

```bash
export KAFKA_JMX_OPTS="-Dcom.sun.management.jmxremote=true \
  -Dcom.sun.management.jmxremote.authenticate=false \
  -Dcom.sun.management.jmxremote.ssl=false \
  -Djava.rmi.server.hostname=<ip_address> \
  -Dcom.sun.management.jmxremote.port=<jmx_port>"
```

### Key MBean Categories

| Category | Metrics | Applies To |
|----------|---------|------------|
| **file-counts** | file-count-on-stage, file-count-on-ingestion | Snowpipe only |
| **offsets** | processed-offset, flushed-offset, committed-offset | Both methods |
| **buffer** | buffer-size-bytes, buffer-record-count | Snowpipe only |
| **latencies** | kafka-lag, commit-lag, ingestion-lag | Snowpipe only |

### Snowpipe Streaming Metrics

| Metric | Description |
|--------|-------------|
| `offsetPersistedInSnowflake` | Latest offset persisted in Snowflake |
| `latestConsumerOffset` | Most recent record sent to buffer |

---

## 12. Fault Tolerance

### Built-in Fault Tolerance

- **Deduplication** - Snowpipe eliminates duplicates (rare edge cases possible)
- **Error handling** - Malformed records moved to table stage
- **Recovery** - Connector resumes from last checkpoint after restart

### Limitations

| Limitation | Impact |
|------------|--------|
| Kafka retention exceeded | Expired records not loaded |
| Multiple connector instances on same topic | Potential duplicates |
| Message deletion/update in Kafka | Changes may not reflect in Snowflake |
| Row ordering | No guarantee of insertion order |

### Dead-Letter Queues (DLQ)

For Snowpipe Streaming, configure DLQ for error handling:

```json
{
  "errors.tolerance": "ALL",
  "errors.log.enable": "TRUE",
  "errors.deadletterqueue.topic.name": "kafka_errors"
}
```

---

## 13. Apache Iceberg Table Support

### Requirements (Version 3.0.0+)

- Snowpipe Streaming only (not Snowpipe)
- Table must be created before running connector
- External volume USAGE privilege required

### Configuration

```json
{
  "snowflake.streaming.iceberg.enabled": "true",
  "snowflake.ingestion.method": "SNOWPIPE_STREAMING"
}
```

### Creating an Iceberg Table for Kafka

```sql
CREATE ICEBERG TABLE kafka_iceberg_data (
    record_metadata OBJECT()
)
EXTERNAL_VOLUME = 'my_volume'
CATALOG = 'SNOWFLAKE'
BASE_LOCATION = 'my_location/kafka_iceberg_data';
```

---

## 14. Troubleshooting

### Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Duplicate rows | Execution timeout exceeded | Increase `consumer.max.poll.interval.ms` |
| Files on table stage | Ingestion failures | Check COPY_HISTORY, fix data issues |
| Rebalance loops | Too many partitions per connector | Adjust `tasks.max`, enable CooperativeStickyAssignor |
| Channel migration errors | Version upgrade from 2.1.x | Set `enable.streaming.channel.offset.migration=false` |

### Checking Load History

```sql
-- View Kafka connector load activity
SELECT *
FROM TABLE(INFORMATION_SCHEMA.COPY_HISTORY(
    TABLE_NAME => 'KAFKA_TABLE',
    START_TIME => DATEADD(hours, -24, CURRENT_TIMESTAMP())
));

-- List files on table stage (failed loads)
LIST @%kafka_table;
```

---

## 15. Billing Considerations

### Snowpipe Loading Costs

- Snowpipe compute time charged per-file
- No direct charge for connector itself
- Data storage charges apply

### Snowpipe Streaming Costs

- Charged based on compute time for row insertion
- Lower per-record cost for high-volume streaming
- No file staging costs

---

## Exam Tips and Common Question Patterns

### High-Frequency Exam Topics

1. **Default table schema** - Two VARIANT columns (RECORD_CONTENT, RECORD_METADATA)
2. **Authentication method** - Key pair authentication (not username/password)
3. **Objects created** - Stage, pipe (per partition), table
4. **Exactly-once semantics** - Available only with Snowpipe Streaming
5. **Privilege requirements** - Direct grants required (no inheritance)

### Sample Exam Questions

**Q: What objects does the Kafka connector create for a topic with 4 partitions?**
A: 1 stage, 4 pipes (one per partition), 1 table

**Q: What authentication method does the Kafka connector use?**
A: Key pair authentication (RSA public/private key)

**Q: How does the Kafka connector store message content by default?**
A: In a VARIANT column named RECORD_CONTENT

**Q: Which Kafka connector feature provides exactly-once delivery guarantees?**
A: Snowpipe Streaming (not traditional Snowpipe)

**Q: What happens to malformed records during Kafka ingestion?**
A: They are moved to the table stage (or DLQ for Snowpipe Streaming)

### Key Differentiators to Remember

| Feature | Snowpipe | Snowpipe Streaming |
|---------|----------|--------------------|
| Creates files | Yes | No |
| Creates pipes | Yes | No |
| Exactly-once | No | Yes |
| Schema detection | No | Yes (with configuration) |
| External OAuth | No | Yes |
| Iceberg support | No | Yes |
| DLQ support | No | Yes |

### Quick Reference: Configuration Properties

| Purpose | Property | Value |
|---------|----------|-------|
| Use Snowpipe Streaming | `snowflake.ingestion.method` | `SNOWPIPE_STREAMING` |
| Enable schema detection | `snowflake.enable.schematization` | `TRUE` |
| Enable Iceberg | `snowflake.streaming.iceberg.enabled` | `true` |
| Map topics to tables | `snowflake.topic2table.map` | `topic:table` |
| Handle errors gracefully | `errors.tolerance` | `ALL` |

---

## Summary

The Snowflake Connector for Kafka is essential for real-time data ingestion. Key points for the exam:

1. **Two ingestion methods**: Snowpipe (file-based) and Snowpipe Streaming (row-based)
2. **Default schema**: Two VARIANT columns for content and metadata
3. **Authentication**: Key pair required, External OAuth optional (Streaming only)
4. **Exactly-once**: Only with Snowpipe Streaming
5. **Schema evolution**: Supported with Snowpipe Streaming + configuration
6. **Privileges**: Must be granted directly to the connector role
7. **Monitoring**: JMX MBeans for metrics and observability
