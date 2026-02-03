# Domain 4: Data Loading & Unloading
## Part 3: Snowpipe (Continuous Data Loading)

**Exam Weight:** This topic is part of Domain 4 (10-15% of exam)

---

## Overview

Snowpipe is Snowflake's serverless, continuous data ingestion service that enables loading data from files as soon as they are available in a stage. Unlike bulk loading with COPY INTO where you manually execute commands, Snowpipe automatically detects and loads new files, making data available in near real-time (typically within one minute).

---

## Section 1: Snowpipe Fundamentals

### What is Snowpipe?

Snowpipe is a serverless feature that provides continuous data ingestion into Snowflake tables. Key characteristics:

- **Serverless**: Uses Snowflake-managed compute resources (no user warehouse required)
- **Continuous**: Automatically loads files as they arrive in stages
- **Near Real-Time**: Typical load latency of approximately one minute
- **Micro-Batch**: Loads data in small batches rather than large bulk operations
- **Event-Driven**: Responds to file arrival notifications or REST API calls

### The Pipe Object

A **pipe** is a named, first-class Snowflake object that contains a COPY statement used by Snowpipe. The pipe defines:

- Source location (stage) where data files reside
- Target table where data will be loaded
- File format and copy options

```sql
-- Basic pipe creation syntax
CREATE PIPE my_pipe
  AUTO_INGEST = TRUE
  AS
  COPY INTO my_table
  FROM @my_external_stage
  FILE_FORMAT = (TYPE = CSV SKIP_HEADER = 1);
```

### Two Triggering Methods

Snowpipe can be triggered in two ways:

| Method | AUTO_INGEST Setting | Stage Type | How It Works |
|--------|---------------------|------------|--------------|
| **Cloud Messaging (Auto-Ingest)** | TRUE | External only | Cloud storage event notifications |
| **REST API** | FALSE | Internal or External | Client calls Snowpipe REST endpoints |

---

## Section 2: Auto-Ingest with Cloud Notifications

### How Auto-Ingest Works

When AUTO_INGEST = TRUE, Snowpipe leverages cloud provider event notification services to detect new files:

1. File is uploaded to cloud storage (S3, GCS, or Azure Blob)
2. Cloud storage sends event notification to Snowflake-managed queue
3. Snowpipe polls the queue and detects the new file notification
4. Snowpipe executes the COPY statement defined in the pipe
5. Data is loaded into the target table

**Important**: Auto-ingest works ONLY with external stages. It cannot be used with internal stages.

### Cloud-Specific Notification Services

| Cloud Platform | Notification Service | Queue Type |
|----------------|---------------------|------------|
| **Amazon Web Services (AWS)** | S3 Event Notifications | Amazon SQS (Simple Queue Service) |
| **Google Cloud Platform (GCP)** | Cloud Storage Notifications | Google Pub/Sub |
| **Microsoft Azure** | Blob Storage Events | Azure Event Grid |

### AWS S3 Configuration Steps

1. **Create a storage integration** (recommended for security):
```sql
CREATE STORAGE INTEGRATION my_s3_int
  TYPE = EXTERNAL_STAGE
  STORAGE_PROVIDER = 'S3'
  ENABLED = TRUE
  STORAGE_AWS_ROLE_ARN = 'arn:aws:iam::123456789012:role/myrole'
  STORAGE_ALLOWED_LOCATIONS = ('s3://mybucket/path/');
```

2. **Create an external stage**:
```sql
CREATE STAGE my_s3_stage
  STORAGE_INTEGRATION = my_s3_int
  URL = 's3://mybucket/path/'
  FILE_FORMAT = (TYPE = CSV);
```

3. **Create the pipe with AUTO_INGEST**:
```sql
CREATE PIPE my_s3_pipe
  AUTO_INGEST = TRUE
  AS
  COPY INTO my_table
  FROM @my_s3_stage;
```

4. **Retrieve the SQS queue ARN** for S3 event configuration:
```sql
SHOW PIPES;
-- Look for notification_channel column containing the SQS ARN
-- Example: arn:aws:sqs:us-west-2:123456789012:sf-snowpipe-...
```

5. **Configure S3 bucket event notifications** to send to the SQS queue (done in AWS Console)

### Google Cloud Storage Configuration

1. **Create storage integration and stage** (similar to AWS)

2. **Create the pipe**:
```sql
CREATE PIPE my_gcs_pipe
  AUTO_INGEST = TRUE
  AS
  COPY INTO my_table
  FROM @my_gcs_stage;
```

3. **Configure Pub/Sub notification** from SHOW PIPES output

4. **Create Pub/Sub subscription** pointing to Snowflake's notification channel

### Microsoft Azure Blob Storage Configuration

1. **Create storage integration and stage**

2. **Create the pipe with AUTO_INGEST = TRUE**

3. **Configure Azure Event Grid subscription** using the notification URL from SHOW PIPES

**Supported Azure blob storage account types**:
- Blob storage
- Data Lake Storage Gen2

**Supported BlobCreated event types**:
- CopyBlob
- PutBlob
- PutBlockList
- FlushWithClose (Data Lake Storage Gen2)

### Cross-Cloud Support Matrix

| Snowflake Account Location | Amazon S3 | Google Cloud Storage | Azure Blob Storage |
|---------------------------|-----------|---------------------|-------------------|
| AWS | Supported | Supported | Supported |
| GCP | Supported | Supported | Supported |
| Azure | Supported | Supported | Supported |

**Note**: Government regions do not allow event notifications across commercial regions.

---

## Section 3: REST API Method

### When to Use REST API

The REST API method (AUTO_INGEST = FALSE) is useful when:

- Loading from internal stages (auto-ingest not supported)
- Need programmatic control over which files to load
- Integrating with custom data pipelines
- Using AWS Lambda or other serverless functions

### Authentication Requirements

REST API calls require **key pair authentication with JWT tokens** (not standard username/password):

1. Generate RSA key pair
2. Assign public key to Snowflake user
3. Generate JWT token for API calls

### REST API Endpoints

| Endpoint | Purpose | Method |
|----------|---------|--------|
| **insertFiles** | Submit list of files to load | POST |
| **insertReport** | Get report of recently loaded files | GET |
| **loadHistoryScan** | Get load history for a time range | GET |

### insertFiles Endpoint

Informs Snowflake about files to be ingested. A successful response means files are queued (not necessarily loaded yet).

**URL Format**:
```
https://{account}.snowflakecomputing.com/v1/data/pipes/{pipeName}/insertFiles?requestId={requestId}
```

**Response Codes**:
| Code | Meaning |
|------|---------|
| 200 | Success - files queued for loading |
| 400 | Bad request - invalid parameters |
| 403 | Forbidden - insufficient privileges |
| 404 | Pipe not found |
| 500 | Internal error |

### insertReport Endpoint

Retrieves report of files recently ingested via insertFiles.

**Limitations**:
- Returns results for approximately 10 minutes after file load completes
- Maximum 10,000 items per response

### loadHistoryScan Endpoint

Fetches load history between two points in time.

**URL Format**:
```
https://{account}.snowflakecomputing.com/v1/data/pipes/{pipeName}/loadHistoryScan?startTimeInclusive={start}&endTimeExclusive={end}
```

### Client SDKs

Snowflake provides SDKs to simplify REST API interactions:

- **Java SDK**: Snowflake Ingest SDK
- **Python SDK**: snowflake-ingest library

```python
# Python SDK example
from snowflake.ingest import SimpleIngestManager, StagedFile

ingest_manager = SimpleIngestManager(
    account='myaccount',
    host='myaccount.snowflakecomputing.com',
    user='myuser',
    pipe='mydb.myschema.mypipe',
    private_key=private_key
)

files = [StagedFile('file1.csv', None), StagedFile('file2.csv', None)]
response = ingest_manager.ingest_files(files)
```

### AWS Lambda Integration

Snowpipe can be automated using AWS Lambda to call the REST API when files arrive in S3:

1. Create Lambda function that calls insertFiles endpoint
2. Configure S3 event notification to trigger Lambda
3. Lambda sends file list to Snowpipe for loading

---

## Section 4: Snowpipe vs. Bulk Loading Comparison

### Key Differences

| Aspect | Bulk Loading (COPY INTO) | Snowpipe |
|--------|--------------------------|----------|
| **Execution** | Manual execution by user | Automatic on file arrival |
| **Compute** | User-owned virtual warehouse | Snowflake-managed serverless compute |
| **Load History Retention** | 64 days (table metadata) | 14 days (pipe metadata) |
| **Authentication** | Standard Snowflake authentication | Key pair + JWT (REST API only) |
| **Default ON_ERROR** | ABORT_STATEMENT | SKIP_FILE |
| **Transactions** | User can wrap in explicit transaction | Each file is separate transaction |
| **Cost Model** | Warehouse credits (per-second billing) | Serverless credits (per-GB billing) |
| **Use Case** | Large batch loads, scheduled ETL | Continuous streaming, real-time data |

### When to Use Each

**Use Bulk Loading When**:
- Loading large historical datasets
- Running scheduled batch ETL jobs
- Need explicit transaction control
- Loading from internal stages without REST API

**Use Snowpipe When**:
- Need near real-time data availability
- Files arrive continuously throughout the day
- Want automatic, hands-off loading
- Loading many small files frequently

### Load History Differences

**Critical Exam Point**: Load history retention differs significantly:

| Loading Method | Storage Location | Retention Period |
|----------------|------------------|------------------|
| Bulk Loading (COPY INTO) | Table metadata | **64 days** |
| Snowpipe | Pipe metadata | **14 days** |

This metadata prevents duplicate file loading. After the retention period, files could potentially be loaded again if not managed carefully.

> **Frequently Tested Exam Trap -- 14-Day Duplicate Risk:** Because Snowpipe only retains load metadata for 14 days (compared to COPY INTO's 64 days), there is a specific duplicate-loading scenario to watch out for: if a file with the **same name** is modified and **re-staged after 14 days**, Snowpipe **WILL reload it**, because the original load record has expired from the pipe metadata. This can cause **duplicate data** in the target table. For COPY INTO, the same scenario would only cause duplicates after 64 days. This contrast between the two retention windows is a frequent exam question.

---

## Section 5: Snowpipe Billing and Cost Management

### Billing Model

Snowpipe uses a simplified **credit-per-GB billing model**:

- Charged based on a fixed credit amount per GB of data loaded
- Applies to all Snowflake editions (Standard, Enterprise, Business Critical, VPS)
- No per-1000-files charge (legacy model was retired)

### File Size Billing Rules

| File Type | Billing Basis |
|-----------|---------------|
| **Text files** (CSV, JSON, XML) | Uncompressed size |
| **Binary files** (Parquet, Avro, ORC) | Observed size (as-is) |

### Viewing Snowpipe Costs

**Using Snowsight**:
Navigate to Admin > Cost Management

**Using SQL**:
```sql
-- Snowpipe cost history by day
SELECT
  TO_DATE(start_time) AS date,
  pipe_name,
  SUM(credits_used) AS credits_used
FROM SNOWFLAKE.ACCOUNT_USAGE.PIPE_USAGE_HISTORY
WHERE start_time >= DATEADD('day', -30, CURRENT_TIMESTAMP())
GROUP BY 1, 2
ORDER BY 1 DESC, 2;

-- Weekly average daily credits
WITH credits_by_day AS (
  SELECT
    TO_DATE(start_time) AS date,
    SUM(credits_used) AS credits_used
  FROM SNOWFLAKE.ACCOUNT_USAGE.PIPE_USAGE_HISTORY
  WHERE start_time >= DATEADD('year', -1, CURRENT_TIMESTAMP())
  GROUP BY 1
)
SELECT
  DATE_TRUNC('week', date) AS week,
  AVG(credits_used) AS avg_daily_credits
FROM credits_by_day
GROUP BY 1
ORDER BY 1 DESC;
```

### Cost Optimization Best Practices

1. **Use recommended file sizes**: 100-250 MB compressed
2. **Enable cloud event filtering**: Reduce unnecessary notifications
3. **Avoid loading files too frequently**: Not more than once per minute
4. **Bundle very small files**: Reduces per-file overhead
5. **Pre-sort data**: Improves micro-partition efficiency

### Resource Monitor Limitation

**Important**: Resource monitors cannot control Snowpipe credit usage. The SNOWPIPE warehouse is Snowflake-managed and exempt from resource monitor constraints.

---

## Section 6: Pipe Management and Operations

### Pipe States

| State | Description |
|-------|-------------|
| **RUNNING** | Pipe is actively processing files |
| **PAUSED** | Pipe is stopped, not processing files |
| **STALE** | Pipe paused longer than 14 days |

### Pausing and Resuming Pipes

```sql
-- Pause a pipe
ALTER PIPE my_pipe SET PIPE_EXECUTION_PAUSED = TRUE;

-- Resume a pipe
ALTER PIPE my_pipe SET PIPE_EXECUTION_PAUSED = FALSE;

-- Check pipe status
SELECT SYSTEM$PIPE_STATUS('my_pipe');
```

### Stale Pipe Handling

When a pipe is paused for more than 14 days, it becomes "stale":

- Event notifications older than 14 days may be dropped
- Requires special function to resume

```sql
-- Resume a stale pipe
SELECT SYSTEM$PIPE_FORCE_RESUME('mydb.myschema.my_stale_pipe', 'staleness_check_override');

-- Resume stale pipe with ownership transfer
SELECT SYSTEM$PIPE_FORCE_RESUME('mydb.myschema.my_pipe',
  'staleness_check_override, ownership_transfer_check_override');
```

### Refreshing Pipe Metadata

To load files that were staged but missed (within 7 days):

```sql
-- Refresh pipe to load files from last 7 days
ALTER PIPE my_pipe REFRESH;

-- Refresh specific path prefix
ALTER PIPE my_pipe REFRESH PREFIX = 'path/to/files/';
```

**Warning**: Do not run REFRESH after recreating a pipe, as it may cause duplicate data loading.

### Monitoring Pipe Status

```sql
-- View all pipes
SHOW PIPES;

-- Describe specific pipe
DESCRIBE PIPE my_pipe;

-- Get pipe status (JSON output)
SELECT SYSTEM$PIPE_STATUS('my_pipe');
-- Returns: executionState, pendingFileCount, lastIngestedTimestamp, etc.
```

### Recreating Pipes Best Practice

When recreating a pipe:

1. Pause the existing pipe
2. Verify pipe status shows PAUSED
3. Wait for pending files to finish loading
4. Recreate the pipe
5. Pause the new pipe immediately
6. Resume the new pipe
7. Verify RUNNING status

---

## Section 7: Error Handling and Troubleshooting

### Default ON_ERROR Behavior

**Snowpipe default**: ON_ERROR = SKIP_FILE

This means files with errors are skipped entirely, unlike bulk loading which defaults to ABORT_STATEMENT.

### Error Notifications

Snowpipe can push error notifications to cloud messaging services:

| Cloud Platform | Error Notification Service |
|----------------|---------------------------|
| AWS | Amazon SNS |
| GCP | Google Pub/Sub |
| Azure | Azure Event Grid |

**Important**: Error notifications only work when ON_ERROR = SKIP_FILE (the default).

### Viewing Load History and Errors

```sql
-- Query load history
SELECT *
FROM TABLE(INFORMATION_SCHEMA.COPY_HISTORY(
  TABLE_NAME => 'my_table',
  START_TIME => DATEADD('hours', -24, CURRENT_TIMESTAMP())
));

-- Validate files for errors
SELECT *
FROM TABLE(VALIDATE_PIPE_LOAD(
  PIPE_NAME => 'my_pipe',
  START_TIME => DATEADD('hours', -24, CURRENT_TIMESTAMP())
));
```

### Common Troubleshooting Steps

**For Auto-Ingest Issues**:

1. Verify pipe status: `SELECT SYSTEM$PIPE_STATUS('my_pipe');`
2. Check if notifications are being received
3. Query COPY_HISTORY for load activity
4. Use VALIDATE_PIPE_LOAD to check for errors
5. Verify IAM roles and permissions

**For REST API Issues**:

1. Verify key pair authentication setup
2. Check JWT token validity
3. Confirm endpoint URLs are correct
4. Verify role has necessary privileges

### Latency Considerations

Factors affecting Snowpipe latency:

- File size and format
- COPY statement complexity
- Number of files in queue
- Network conditions
- Cloud provider notification delays

**Typical latency**: ~1 minute from file arrival to data availability

---

## Section 8: Best Practices for Optimal Performance

### File Size Recommendations

| File Size | Recommendation |
|-----------|----------------|
| **100-250 MB compressed** | Optimal - recommended range |
| **< 100 MB** | Consider bundling small files |
| **> 100 GB** | Not recommended - may cause issues |

### Loading Frequency Guidelines

- Do not upload files more frequently than once per minute
- Snowpipe aims to load files within 1 minute of notification
- Loading faster than processing causes queue buildup

### Data Organization

1. **Organize stage data by path**: Use consistent prefix patterns
2. **Pre-sort data**: Improves micro-partition clustering
3. **Use appropriate file formats**: Match format to data type
4. **Enable cloud event filtering**: Reduces noise and cost

### Security Best Practices

1. Use storage integrations instead of hardcoded credentials
2. Implement least-privilege access for pipe ownership
3. Rotate key pairs regularly for REST API access
4. Monitor pipe activity for anomalies

---

## Exam Tips and Common Question Patterns

### High-Frequency Exam Topics

1. **Load history retention**: 14 days for Snowpipe vs. 64 days for bulk loading
2. **Auto-ingest limitations**: External stages only
3. **Serverless nature**: No warehouse required
4. **Triggering methods**: Auto-ingest vs. REST API
5. **Default ON_ERROR**: SKIP_FILE for Snowpipe
6. **Billing model**: Credit-per-GB based on file type

### Common Exam Questions

**Q: What is the load history retention period for Snowpipe?**
A: 14 days (stored in pipe metadata)

**Q: Which stage types support AUTO_INGEST = TRUE?**
A: External stages only (not internal stages)

**Q: What compute resources does Snowpipe use?**
A: Snowflake-managed serverless compute (no user warehouse)

**Q: What authentication is required for Snowpipe REST API?**
A: Key pair authentication with JWT tokens

**Q: What is the recommended file size for Snowpipe?**
A: 100-250 MB compressed

**Q: What happens when a pipe is paused for more than 14 days?**
A: It becomes "stale" and requires SYSTEM$PIPE_FORCE_RESUME to restart

**Q: What is the default ON_ERROR behavior for Snowpipe?**
A: SKIP_FILE (entire files with errors are skipped)

**Q: Can you use resource monitors to control Snowpipe costs?**
A: No, resource monitors do not apply to Snowpipe (serverless compute)

### Key Distinctions to Remember

| Concept | Bulk Loading | Snowpipe |
|---------|--------------|----------|
| Load history | 64 days (table) | 14 days (pipe) |
| Default ON_ERROR | ABORT_STATEMENT | SKIP_FILE |
| Compute | User warehouse | Serverless |
| Execution | Manual | Automatic |

### Tricky Scenarios

1. **Internal stage with auto-ingest**: Not possible - must use REST API
2. **Stale pipe after 15 days pause**: Need SYSTEM$PIPE_FORCE_RESUME with staleness override
3. **Duplicate loading after pipe recreation**: Use caution with ALTER PIPE REFRESH
4. **File size billing**: Text files use uncompressed size; binary files use actual size

---

## Practice Questions

### Question 1
What is the load history retention period for Snowpipe?

- A) 7 days
- B) 14 days
- C) 30 days
- D) 64 days

<details>
<summary>Show Answer</summary>

**Answer: B) 14 days**

Snowpipe load history is stored in pipe metadata for 14 days. Bulk loading history is stored in table metadata for 64 days.

</details>

### Question 2
Which triggering method allows Snowpipe to load from internal stages?

- A) AUTO_INGEST = TRUE
- B) AUTO_INGEST = FALSE (REST API)
- C) Cloud messaging only
- D) Snowpipe cannot load from internal stages

<details>
<summary>Show Answer</summary>

**Answer: B) AUTO_INGEST = FALSE (REST API)**

Auto-ingest (cloud messaging) only works with external stages. The REST API method works with both internal and external stages.

</details>

### Question 3
What type of compute resources does Snowpipe use for loading data?

- A) User-specified virtual warehouse
- B) Shared virtual warehouse pool
- C) Snowflake-managed serverless compute
- D) Cloud provider compute instances

<details>
<summary>Show Answer</summary>

**Answer: C) Snowflake-managed serverless compute**

Snowpipe is a serverless feature that uses Snowflake-managed compute resources. Users do not need to specify or manage a warehouse.

</details>

### Question 4
What is the default ON_ERROR behavior for Snowpipe?

- A) ABORT_STATEMENT
- B) CONTINUE
- C) SKIP_FILE
- D) SKIP_FILE_10

<details>
<summary>Show Answer</summary>

**Answer: C) SKIP_FILE**

Snowpipe defaults to SKIP_FILE, meaning files with errors are skipped entirely. This differs from bulk loading, which defaults to ABORT_STATEMENT.

</details>

### Question 5
What is the recommended compressed file size for optimal Snowpipe performance?

- A) 1-10 MB
- B) 50-100 MB
- C) 100-250 MB
- D) 500 MB - 1 GB

<details>
<summary>Show Answer</summary>

**Answer: C) 100-250 MB**

Snowflake recommends 100-250 MB compressed files for optimal Snowpipe performance. Very small files cause overhead, and very large files (>100 GB) are not recommended.

</details>

### Question 6
What happens when a pipe is paused for longer than 14 days?

- A) The pipe is automatically deleted
- B) The pipe becomes "stale" and requires special handling to resume
- C) All queued files are automatically loaded when resumed
- D) The pipe continues to accumulate notifications indefinitely

<details>
<summary>Show Answer</summary>

**Answer: B) The pipe becomes "stale" and requires special handling to resume**

Pipes paused for more than 14 days become stale. To resume them, you must call SYSTEM$PIPE_FORCE_RESUME with the staleness_check_override argument.

</details>

### Question 7
Which cloud notification service does Snowpipe use for auto-ingest from Amazon S3?

- A) Amazon SNS
- B) Amazon SQS
- C) AWS Lambda
- D) Amazon EventBridge

<details>
<summary>Show Answer</summary>

**Answer: B) Amazon SQS**

For S3 auto-ingest, Snowflake creates and manages an SQS (Simple Queue Service) queue. S3 event notifications are configured to send to this queue.

</details>

### Question 8
Can resource monitors be used to control Snowpipe credit consumption?

- A) Yes, by setting limits on the SNOWPIPE warehouse
- B) Yes, by creating a dedicated resource monitor
- C) No, resource monitors do not apply to serverless features
- D) Yes, but only at the account level

<details>
<summary>Show Answer</summary>

**Answer: C) No, resource monitors do not apply to serverless features**

Resource monitors control virtual warehouse credit usage but cannot control Snowflake-managed serverless compute, including Snowpipe.

</details>

### Question 9
What authentication method is required for calling Snowpipe REST API endpoints?

- A) Username and password
- B) OAuth token
- C) Key pair authentication with JWT
- D) SAML-based SSO

<details>
<summary>Show Answer</summary>

**Answer: C) Key pair authentication with JWT**

Snowpipe REST API requires key pair authentication because it does not maintain client sessions. Users must generate JWT tokens using their private key.

</details>

### Question 10
How are text files (CSV, JSON) billed when loaded via Snowpipe?

- A) Based on compressed file size
- B) Based on uncompressed file size
- C) Fixed rate per file
- D) Based on number of rows loaded

<details>
<summary>Show Answer</summary>

**Answer: B) Based on uncompressed file size**

Text files (CSV, JSON, XML) are billed based on their uncompressed size. Binary files (Parquet, Avro, ORC) are billed based on their observed (actual) size.

</details>

---

## Quick Reference Card

### Snowpipe Key Facts
```
Load History Retention:    14 days (pipe metadata)
Default ON_ERROR:          SKIP_FILE
Compute:                   Serverless (Snowflake-managed)
Optimal File Size:         100-250 MB compressed
Typical Latency:           ~1 minute
```

### Triggering Methods
```
AUTO_INGEST = TRUE         External stages only, cloud notifications
AUTO_INGEST = FALSE        Internal or external, REST API calls
```

### Cloud Notification Services
```
AWS:    S3 Event Notifications -> SQS Queue
GCP:    Cloud Storage -> Pub/Sub
Azure:  Blob Storage -> Event Grid
```

### Key SQL Commands
```sql
-- Create pipe with auto-ingest
CREATE PIPE my_pipe AUTO_INGEST = TRUE AS COPY INTO table FROM @stage;

-- Create pipe for REST API
CREATE PIPE my_pipe AS COPY INTO table FROM @stage;

-- Pause pipe
ALTER PIPE my_pipe SET PIPE_EXECUTION_PAUSED = TRUE;

-- Resume pipe
ALTER PIPE my_pipe SET PIPE_EXECUTION_PAUSED = FALSE;

-- Check pipe status
SELECT SYSTEM$PIPE_STATUS('my_pipe');

-- Refresh pipe (load missed files from last 7 days)
ALTER PIPE my_pipe REFRESH;

-- Resume stale pipe
SELECT SYSTEM$PIPE_FORCE_RESUME('my_pipe', 'staleness_check_override');

-- View load history
SELECT * FROM TABLE(INFORMATION_SCHEMA.COPY_HISTORY(...));

-- Validate pipe load
SELECT * FROM TABLE(VALIDATE_PIPE_LOAD(...));
```

### Snowpipe vs. Bulk Loading Quick Comparison
```
                    | Bulk Loading  | Snowpipe
--------------------|---------------|------------------
Load History        | 64 days       | 14 days
Default ON_ERROR    | ABORT         | SKIP_FILE
Compute             | User WH       | Serverless
Execution           | Manual        | Automatic
Authentication      | Standard      | Key pair + JWT (REST)
```

---

*Last Updated: January 2026*
*Source: Official Snowflake Documentation*
