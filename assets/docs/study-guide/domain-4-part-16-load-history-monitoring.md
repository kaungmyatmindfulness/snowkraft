# Domain 4: Data Loading & Unloading - Load History and Monitoring

## Overview

Monitoring data loading operations is critical for ensuring data integrity, troubleshooting issues, and managing costs. Snowflake provides multiple views, table functions, and system functions to track load history across bulk loading and continuous loading (Snowpipe) operations.

---

## 1. Key Concepts

### Load Metadata and Duplicate Prevention

Snowflake automatically tracks loaded files using metadata to prevent duplicate data ingestion:

| Loading Method | Metadata Storage | Retention Period |
|---------------|------------------|------------------|
| **Bulk Loading (COPY INTO)** | Table metadata | **64 days** |
| **Snowpipe** | Pipe metadata | **14 days** |

**How Duplicate Prevention Works:**
- Snowflake stores file name and content hash in metadata
- Before loading, system checks if file was previously loaded
- Files with same name AND contents are automatically skipped
- Prevents accidental data duplication from re-running load commands

**FORCE Option:**
```sql
-- Bypasses duplicate detection (use carefully!)
COPY INTO my_table
FROM @my_stage
FORCE = TRUE;
```

> **Exam Alert:** The FORCE option bypasses load history checking and will reload files even if previously loaded. This can cause duplicate data.

### Cloning and Load History

**Critical Exam Point:** Cloned tables do NOT contain the load history of the source table. This means:
- The clone has no memory of which files were loaded into the source
- Loading the same files into a clone will NOT be blocked
- Risk of duplicate data if you load the same files into both source and clone

---

## 2. Key Monitoring Views and Functions

### COPY_HISTORY View (Account Usage)

**Location:** `SNOWFLAKE.ACCOUNT_USAGE.COPY_HISTORY`

**Purpose:** Historical view of all data loading activity across the entire account

**Key Characteristics:**
| Feature | Value |
|---------|-------|
| Data Retention | **365 days (1 year)** |
| Data Latency | Up to **2 hours** |
| Scope | All tables in account |
| Coverage | Bulk loads, Snowpipe, web UI uploads |

**Required Access:**
- Role with access to SNOWFLAKE database
- Grant via: `GRANT IMPORTED PRIVILEGES ON DATABASE SNOWFLAKE TO ROLE <role_name>`

**Key Columns:**
| Column | Description |
|--------|-------------|
| `FILE_NAME` | Name of the file loaded |
| `TABLE_NAME` | Target table |
| `TABLE_SCHEMA_NAME` | Schema of target table |
| `TABLE_CATALOG_NAME` | Database of target table |
| `STAGE_LOCATION` | Stage where file was located |
| `PIPE_CATALOG_NAME` | Database of pipe (if Snowpipe) |
| `PIPE_SCHEMA_NAME` | Schema of pipe (if Snowpipe) |
| `PIPE_NAME` | Pipe used (if Snowpipe) |
| `STATUS` | Load status (Loaded, Partially loaded, Failed, Skipped) |
| `ROW_COUNT` | Number of rows loaded |
| `ROW_PARSED` | Number of rows parsed |
| `FIRST_ERROR_MESSAGE` | First error encountered |
| `FIRST_ERROR_LINE_NUM` | Line number of first error |
| `FIRST_ERROR_CHARACTER_POS` | Character position of first error |
| `FIRST_ERROR_COLUMN_NAME` | Column where first error occurred |
| `ERROR_COUNT` | Total number of errors |
| `ERROR_LIMIT` | Error limit setting |
| `FILE_SIZE` | Size of file in bytes |
| `LAST_LOAD_TIME` | Timestamp of load |

**Example Query:**
```sql
-- View load history for the last 7 days
SELECT
    FILE_NAME,
    TABLE_NAME,
    STATUS,
    ROW_COUNT,
    FIRST_ERROR_MESSAGE,
    LAST_LOAD_TIME
FROM SNOWFLAKE.ACCOUNT_USAGE.COPY_HISTORY
WHERE LAST_LOAD_TIME >= DATEADD(day, -7, CURRENT_TIMESTAMP())
ORDER BY LAST_LOAD_TIME DESC;
```

---

### COPY_HISTORY Table Function (Information Schema)

**Location:** `INFORMATION_SCHEMA.COPY_HISTORY()`

**Purpose:** Real-time view of data loading activity for specific tables

**Key Characteristics:**
| Feature | Value |
|---------|-------|
| Data Retention | **14 days** |
| Data Latency | **Very low (near real-time)** |
| Scope | Specific table |
| Coverage | Bulk loads, Snowpipe, web UI uploads |

**Required Access:**
- USAGE privilege on database and schema containing the table
- SELECT privilege on the table, OR
- MONITOR privilege on the pipe (for Snowpipe loads)

**Syntax:**
```sql
SELECT *
FROM TABLE(INFORMATION_SCHEMA.COPY_HISTORY(
    TABLE_NAME => '<table_name>',
    START_TIME => DATEADD(hours, -24, CURRENT_TIMESTAMP()),
    END_TIME => CURRENT_TIMESTAMP(),
    RESULT_LIMIT => 100
));
```

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `TABLE_NAME` | Yes | Fully qualified table name |
| `START_TIME` | No | Beginning of time range (default: 24 hours ago) |
| `END_TIME` | No | End of time range (default: current time) |
| `RESULT_LIMIT` | No | Max rows returned (default: 100) |

**Example Query:**
```sql
-- Check load history for a specific table
SELECT
    FILE_NAME,
    STATUS,
    ROW_COUNT,
    ROW_PARSED,
    FIRST_ERROR_MESSAGE,
    PIPE_NAME
FROM TABLE(INFORMATION_SCHEMA.COPY_HISTORY(
    TABLE_NAME => 'MY_DB.MY_SCHEMA.MY_TABLE',
    START_TIME => DATEADD(days, -7, CURRENT_TIMESTAMP())
))
WHERE STATUS != 'Loaded'
ORDER BY LAST_LOAD_TIME DESC;
```

---

### COPY_HISTORY Comparison: View vs Table Function

| Feature | ACCOUNT_USAGE.COPY_HISTORY (View) | INFORMATION_SCHEMA.COPY_HISTORY (Function) |
|---------|----------------------------------|-------------------------------------------|
| **Retention** | 365 days | 14 days |
| **Latency** | Up to 2 hours | Near real-time |
| **Scope** | Entire account | Single table |
| **Use Case** | Historical analysis, auditing | Real-time troubleshooting |
| **Requires Warehouse** | Yes | Yes |
| **Includes Snowpipe loads** | Yes | Yes |

> **Exam Alert:** Know the difference between the Account Usage view (365 days, 2-hour latency) and the Information Schema table function (14 days, low latency).

> **Important Clarification:** Both the COPY_HISTORY view and function include Snowpipe loads (identified by the PIPE_NAME column). The "14-day Snowpipe load history" mentioned in documentation refers to the pipe metadata used for duplicate detection, NOT the COPY_HISTORY retention. You can query Snowpipe load history for up to 365 days via the Account Usage view.

---

## 3. Snowpipe Monitoring

### PIPE_USAGE_HISTORY View (Account Usage)

**Location:** `SNOWFLAKE.ACCOUNT_USAGE.PIPE_USAGE_HISTORY`

**Purpose:** Track Snowpipe usage and costs across the account

**Key Columns:**
| Column | Description |
|--------|-------------|
| `PIPE_NAME` | Name of the pipe |
| `PIPE_SCHEMA_NAME` | Schema containing the pipe |
| `PIPE_CATALOG_NAME` | Database containing the pipe |
| `START_TIME` | Start of usage period |
| `END_TIME` | End of usage period |
| `CREDITS_USED` | Compute credits consumed |
| `BYTES_INSERTED` | Bytes of data loaded |
| `FILES_INSERTED` | Number of files loaded |
| `BYTES_BILLED` | Bytes charged for loading |

**Example - Daily Snowpipe Costs:**
```sql
-- Snowpipe cost history by day and pipe
SELECT
    TO_DATE(START_TIME) AS date,
    PIPE_NAME,
    SUM(CREDITS_USED) AS credits_used,
    SUM(BYTES_BILLED) AS bytes_billed_total
FROM SNOWFLAKE.ACCOUNT_USAGE.PIPE_USAGE_HISTORY
WHERE START_TIME >= DATEADD(day, -30, CURRENT_TIMESTAMP())
GROUP BY 1, 2
ORDER BY date DESC, credits_used DESC;
```

**Example - Weekly Average Analysis:**
```sql
-- Identify anomalies in Snowpipe consumption
WITH credits_by_day AS (
    SELECT
        TO_DATE(START_TIME) AS date,
        SUM(CREDITS_USED) AS credits_used,
        SUM(BYTES_BILLED) AS bytes_billed_total
    FROM SNOWFLAKE.ACCOUNT_USAGE.PIPE_USAGE_HISTORY
    WHERE START_TIME >= DATEADD(year, -1, CURRENT_TIMESTAMP())
    GROUP BY 1
)
SELECT
    DATE_TRUNC('week', date) AS week,
    AVG(credits_used) AS avg_daily_credits,
    SUM(bytes_billed_total) AS total_bytes_billed
FROM credits_by_day
GROUP BY 1
ORDER BY week DESC;
```

### PIPE_USAGE_HISTORY Table Function (Information Schema)

**Location:** `INFORMATION_SCHEMA.PIPE_USAGE_HISTORY()`

**Purpose:** Real-time view of Snowpipe usage

**Example:**
```sql
SELECT *
FROM TABLE(INFORMATION_SCHEMA.PIPE_USAGE_HISTORY(
    DATE_RANGE_START => DATEADD(day, -7, CURRENT_TIMESTAMP()),
    DATE_RANGE_END => CURRENT_TIMESTAMP(),
    PIPE_NAME => 'MY_DB.MY_SCHEMA.MY_PIPE'
));
```

---

### SYSTEM$PIPE_STATUS Function

**Purpose:** Get real-time status of a specific pipe in JSON format

**Syntax:**
```sql
SELECT SYSTEM$PIPE_STATUS('my_database.my_schema.my_pipe');
```

**Output Fields (for auto-ingest pipes):**
| Field | Description |
|-------|-------------|
| `executionState` | Current state (RUNNING, PAUSED, STALE, etc.) |
| `pendingFileCount` | Number of files waiting to be loaded |
| `lastReceivedMessageTimestamp` | When last event message was received |
| `notificationChannelName` | Cloud notification channel |
| `numOutstandingMessagesOnChannel` | Messages in cloud queue |
| `lastForwardedMessageTimestamp` | When last message was forwarded to Snowflake |

**Example Output:**
```json
{
  "executionState": "RUNNING",
  "pendingFileCount": 5,
  "lastReceivedMessageTimestamp": "2024-01-15T10:30:00.000Z",
  "notificationChannelName": "arn:aws:sqs:us-west-2:123456789:my-queue",
  "numOutstandingMessagesOnChannel": 3,
  "lastForwardedMessageTimestamp": "2024-01-15T10:29:55.000Z"
}
```

**Use Cases:**
- Verify pipe is running
- Check if messages are being received from cloud storage
- Identify backlog of pending files
- Troubleshoot auto-ingest issues

---

### VALIDATE_PIPE_LOAD Function

**Purpose:** Validate data files that were loaded (or attempted) by a pipe

**Syntax:**
```sql
SELECT *
FROM TABLE(VALIDATE_PIPE_LOAD(
    PIPE_NAME => 'my_database.my_schema.my_pipe',
    START_TIME => DATEADD(hour, -24, CURRENT_TIMESTAMP())
));
```

**When to Use:**
- When COPY_HISTORY shows errors
- To get detailed error information for each file
- To validate files before/after fixing issues

**Key Output Columns:**
| Column | Description |
|--------|-------------|
| `FILE` | File name |
| `STATUS` | Validation status |
| `ROWS_PARSED` | Rows successfully parsed |
| `FIRST_ERROR` | First error message |
| `FIRST_ERROR_LINE` | Line number of first error |
| `FIRST_ERROR_CHARACTER` | Character position of error |
| `FIRST_ERROR_COLUMN_NAME` | Column with error |

---

## 4. Load Status Values

Understanding status values in COPY_HISTORY:

| Status | Description |
|--------|-------------|
| `Loaded` | All rows successfully loaded |
| `Partially loaded` | Some rows loaded, some failed (ON_ERROR = CONTINUE) |
| `Failed` | Load failed completely |
| `Skipped` | File skipped (already loaded or pattern mismatch) |
| `In progress` | Load currently executing |

---

## 5. Snowsight Copy History Interface

### Account-Level Copy History
**Navigation:** Ingestion > Copy History

**Features:**
- View up to 365 days of history
- Filter by:
  - Time range
  - Status (All, In progress, Loaded, Failed, Partially loaded, Skipped)
  - Database, Schema, Table
  - Stage location
- Export underlying SQL query
- Click row to drill into table-level details

### Table-Level Copy History
**Navigation:** Data > Databases > [Database] > [Schema] > [Table] > Copy History

**Features:**
- View up to 14 days of history
- Near real-time data
- Filter by status and pipe
- Hover over failed loads for error details

---

## 6. Troubleshooting Data Loads

### Troubleshooting Workflow

**Step 1: Check Pipe Status (Snowpipe)**
```sql
SELECT SYSTEM$PIPE_STATUS('my_pipe');
```
- Verify `executionState` is RUNNING
- Check `pendingFileCount` for backlog
- Verify `lastReceivedMessageTimestamp` is recent

**Step 2: View Copy History**
```sql
-- For real-time table-level info
SELECT *
FROM TABLE(INFORMATION_SCHEMA.COPY_HISTORY(
    TABLE_NAME => 'my_table',
    START_TIME => DATEADD(hour, -24, CURRENT_TIMESTAMP())
))
WHERE STATUS IN ('Failed', 'Partially loaded');
```

**Step 3: Validate Files (Snowpipe)**
```sql
SELECT *
FROM TABLE(VALIDATE_PIPE_LOAD(
    PIPE_NAME => 'my_pipe',
    START_TIME => DATEADD(hour, -24, CURRENT_TIMESTAMP())
));
```

### Common Issues and Solutions

| Issue | Diagnostic | Solution |
|-------|------------|----------|
| Files not loading | Check SYSTEM$PIPE_STATUS | Verify notifications configured |
| Duplicate data | Query COPY_HISTORY | Check if FORCE=TRUE was used |
| Partial loads | Check FIRST_ERROR_MESSAGE | Fix data format issues |
| Files skipped | Check STATUS in COPY_HISTORY | Files may already be loaded |
| Stale pipe | Check executionState | Resume pipe, refresh if needed |

---

## 7. Snowpipe Billing Monitoring

### Current Pricing Model
- **Credit-per-GB model** (simplified billing)
- Text files (CSV, JSON, XML): Charged on **uncompressed** size
- Binary files (Parquet, Avro, ORC): Charged on **observed** size

### Monitoring Costs
```sql
-- View Snowpipe costs by pipe for last 30 days
SELECT
    PIPE_NAME,
    SUM(CREDITS_USED) AS total_credits,
    SUM(BYTES_INSERTED) AS total_bytes_loaded,
    SUM(FILES_INSERTED) AS total_files
FROM SNOWFLAKE.ACCOUNT_USAGE.PIPE_USAGE_HISTORY
WHERE START_TIME >= DATEADD(day, -30, CURRENT_TIMESTAMP())
GROUP BY PIPE_NAME
ORDER BY total_credits DESC;
```

> **Note:** Resource monitors cannot be used to control Snowpipe credit usage. The SNOWPIPE warehouse is Snowflake-managed.

---

## 8. Load Tracking Queries Reference

### Find Failed Loads in Last 24 Hours
```sql
SELECT
    FILE_NAME,
    TABLE_NAME,
    PIPE_NAME,
    FIRST_ERROR_MESSAGE,
    ERROR_COUNT,
    LAST_LOAD_TIME
FROM SNOWFLAKE.ACCOUNT_USAGE.COPY_HISTORY
WHERE LAST_LOAD_TIME >= DATEADD(hour, -24, CURRENT_TIMESTAMP())
  AND STATUS = 'Failed'
ORDER BY LAST_LOAD_TIME DESC;
```

### Compare Load Volume by Table
```sql
SELECT
    TABLE_CATALOG_NAME AS database,
    TABLE_SCHEMA_NAME AS schema,
    TABLE_NAME,
    COUNT(*) AS load_count,
    SUM(ROW_COUNT) AS total_rows,
    SUM(FILE_SIZE) AS total_bytes
FROM SNOWFLAKE.ACCOUNT_USAGE.COPY_HISTORY
WHERE LAST_LOAD_TIME >= DATEADD(day, -30, CURRENT_TIMESTAMP())
  AND STATUS = 'Loaded'
GROUP BY 1, 2, 3
ORDER BY total_rows DESC
LIMIT 20;
```

### Identify Frequently Failing Files
```sql
SELECT
    FILE_NAME,
    COUNT(*) AS attempt_count,
    MAX(FIRST_ERROR_MESSAGE) AS last_error
FROM SNOWFLAKE.ACCOUNT_USAGE.COPY_HISTORY
WHERE LAST_LOAD_TIME >= DATEADD(day, -7, CURRENT_TIMESTAMP())
  AND STATUS IN ('Failed', 'Partially loaded')
GROUP BY FILE_NAME
HAVING COUNT(*) > 1
ORDER BY attempt_count DESC;
```

### Monitor Daily Load Trends
```sql
SELECT
    TO_DATE(LAST_LOAD_TIME) AS load_date,
    STATUS,
    COUNT(*) AS file_count,
    SUM(ROW_COUNT) AS total_rows
FROM SNOWFLAKE.ACCOUNT_USAGE.COPY_HISTORY
WHERE LAST_LOAD_TIME >= DATEADD(day, -30, CURRENT_TIMESTAMP())
GROUP BY 1, 2
ORDER BY load_date DESC, STATUS;
```

---

## 9. Exam Tips and Common Question Patterns

### Key Numbers to Remember

| Metric | Value |
|--------|-------|
| Bulk load history retention (table metadata) | **64 days** |
| Snowpipe load history retention (pipe metadata) | **14 days** |
| COPY_HISTORY view retention (Account Usage) | **365 days** |
| COPY_HISTORY function retention (Information Schema) | **14 days** |
| Account Usage data latency | **Up to 2 hours** |
| Information Schema latency | **Near real-time** |

### Common Exam Traps

1. **Load history retention confusion**
   - 64 days = Bulk loading (stored in table metadata)
   - 14 days = Snowpipe (stored in pipe metadata)
   - These are NOT the same as COPY_HISTORY retention periods

2. **COPY_HISTORY view vs function**
   - View (Account Usage): 365 days, 2-hour latency
   - Function (Information Schema): 14 days, low latency

3. **Cloning and load history**
   - Cloned tables do NOT retain load history
   - Same files can be loaded into both source and clone

4. **FORCE option impact**
   - Bypasses duplicate detection
   - Can cause data duplication
   - Does NOT update load history

5. **PIPE_USAGE_HISTORY vs COPY_HISTORY**
   - PIPE_USAGE_HISTORY: Billing/credit information
   - COPY_HISTORY: File-level load status and errors

### Typical Exam Questions

**Q: How long is load history retained for Snowpipe operations?**
A: 14 days (stored in pipe metadata)

**Q: What function shows the current status of a pipe?**
A: SYSTEM$PIPE_STATUS

**Q: Where can you find load history for the past 6 months?**
A: SNOWFLAKE.ACCOUNT_USAGE.COPY_HISTORY view (up to 365 days)

**Q: What happens when you clone a table regarding load history?**
A: The clone does NOT contain the load history of the source table

**Q: What is the latency for the COPY_HISTORY table function?**
A: Very low (near real-time)

**Q: How do you validate files loaded by a pipe?**
A: Use the VALIDATE_PIPE_LOAD table function

**Q: What privilege is needed to see pipe details in COPY_HISTORY?**
A: MONITOR privilege on the pipe (otherwise pipe details show as NULL)

---

## Summary

| Monitoring Need | Tool | Location |
|----------------|------|----------|
| Account-wide load history (up to 1 year) | COPY_HISTORY view | ACCOUNT_USAGE |
| Table-specific load history (real-time) | COPY_HISTORY function | INFORMATION_SCHEMA |
| Snowpipe status | SYSTEM$PIPE_STATUS | System function |
| Snowpipe costs | PIPE_USAGE_HISTORY | ACCOUNT_USAGE / INFORMATION_SCHEMA |
| File validation | VALIDATE_PIPE_LOAD | INFORMATION_SCHEMA |
| Visual monitoring | Copy History page | Snowsight |

Understanding these monitoring tools is essential for:
- Troubleshooting failed loads
- Preventing duplicate data
- Managing Snowpipe costs
- Auditing data ingestion history
- Meeting compliance requirements
