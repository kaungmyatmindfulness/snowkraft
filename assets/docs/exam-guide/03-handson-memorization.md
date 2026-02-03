# SnowPro Core COF-C02 -- Hands-On Memorization Guide

## Domain 1: Snowflake AI Data Cloud Features & Architecture -- SQL Syntax Cheat Sheet

### SnowPro Core COF-C02 Exam Reference (25-30% of Exam)

This is a memorization-focused reference for all critical SQL syntax, commands, and system functions
related to Domain 1. Every entry is formatted for rapid review before the exam.

---

### 1. ACCOUNT AND ORGANIZATION STRUCTURE

#### 1.1 Organization Account Commands

```sql
-- Show the organization account (requires GLOBALORGADMIN role in org account)
-- Enterprise Edition or higher required
-- Does NOT require a running warehouse
SHOW ORGANIZATION ACCOUNTS;

-- Show with LIKE filter (case-insensitive, supports % and _ wildcards)
SHOW ORGANIZATION ACCOUNTS LIKE 'prod%';
```

```sql
-- Create a new account within the organization (GLOBALORGADMIN role required)
-- Must specify ADMIN_NAME, authentication method, EMAIL, and EDITION
CREATE ORGANIZATION ACCOUNT my_new_account
  ADMIN_NAME = 'admin_user'
  ADMIN_PASSWORD = 'SecureP@ss123'
  EMAIL = 'admin@company.com'
  EDITION = ENTERPRISE
  REGION = 'AWS_US_WEST_2'
  COMMENT = 'Production account';
```

```sql
-- Rename an organization account (GLOBALORGADMIN role)
ALTER ORGANIZATION ACCOUNT old_name RENAME TO new_name;

-- Set parameters on the organization account
ALTER ORGANIZATION ACCOUNT SET
  COMMENT = 'Updated description';
```

**Exam tip:** SHOW ORGANIZATION ACCOUNTS was repurposed -- it now shows only the org account itself.
To list ALL accounts in the organization, use `SHOW ACCOUNTS` instead (with ORGADMIN or GLOBALORGADMIN).

```sql
-- List all accounts in the organization (ORGADMIN or GLOBALORGADMIN)
-- Does NOT require a running warehouse
SHOW ACCOUNTS;

-- With filter
SHOW ACCOUNTS LIKE 'dev%';

-- Include history of dropped accounts (within Time Travel)
SHOW ACCOUNTS HISTORY;
```

#### 1.2 ALTER ACCOUNT

```sql
-- Set account-level parameters (ACCOUNTADMIN role required)
ALTER ACCOUNT SET
  STATEMENT_TIMEOUT_IN_SECONDS = 172800;

-- Assign a resource monitor at the ACCOUNT level (controls ALL warehouses)
ALTER ACCOUNT SET RESOURCE_MONITOR = my_account_monitor;

-- Remove account-level resource monitor
ALTER ACCOUNT UNSET RESOURCE_MONITOR;

-- Rename an account (ORGADMIN role, executed from a DIFFERENT account)
-- Uses account NAME format only (not locator)
ALTER ACCOUNT old_acct_name RENAME TO new_acct_name;

-- Enable replication for an account (ORGADMIN)
ALTER ACCOUNT my_account ENABLE REPLICATION TO ACCOUNTS my_org.target_account;
```

**Exam tip:** ALTER ACCOUNT with RENAME or ENABLE REPLICATION is run by ORGADMIN from a different
account. ALTER ACCOUNT SET (parameters) is run by ACCOUNTADMIN from the account itself.

#### 1.3 Checking Account Edition

```sql
-- Check edition via SHOW ACCOUNTS (ORGADMIN required)
SHOW ACCOUNTS;
-- Output includes 'edition' column: STANDARD | ENTERPRISE | BUSINESS_CRITICAL

-- Check current account info via context function
SELECT CURRENT_ACCOUNT();

-- Check the current account name (returns account name, not locator)
SELECT CURRENT_ACCOUNT_NAME();

-- Check the current organization name
SELECT CURRENT_ORGANIZATION_NAME();
```

**Exam tip:** You CANNOT change your account edition via SQL. You must contact Snowflake Support.

---

### 2. SNOWFLAKE EDITIONS AND FEATURE GATING

#### Edition Feature Matrix (Memorize This)

| Feature                            | Standard | Enterprise | Business Critical | VPS |
| ---------------------------------- | -------- | ---------- | ----------------- | --- |
| Time Travel (max days)             | 1        | 90         | 90                | 90  |
| Multi-cluster warehouses           | NO       | YES        | YES               | YES |
| Materialized views                 | NO       | YES        | YES               | YES |
| Search optimization service        | NO       | YES        | YES               | YES |
| Column-level security              | NO       | YES        | YES               | YES |
| Dynamic data masking               | NO       | YES        | YES               | YES |
| Row access policies                | NO       | YES        | YES               | YES |
| External data tokenization         | NO       | YES        | YES               | YES |
| Periodic rekeying (annual)         | NO       | NO         | YES               | YES |
| AWS PrivateLink / Azure PL         | NO       | NO         | YES               | YES |
| HIPAA / PCI DSS compliance         | NO       | YES        | YES               | YES |
| Customer-managed keys (Tri-Secret) | NO       | NO         | YES               | YES |
| Database failover/failback         | NO       | NO         | YES               | YES |
| Dedicated metadata store           | NO       | NO         | NO                | YES |

**Exam tip:** The big Standard-to-Enterprise jump: multi-cluster warehouses, materialized views,
search optimization, extended Time Travel (90 days), column security, row access policies.
Enterprise-to-Business Critical is about security: PrivateLink, Tri-Secret Secure, failover.

```sql
-- Set Time Travel retention on a table (0 or 1 day on Standard; 0-90 on Enterprise+)
ALTER TABLE my_table SET DATA_RETENTION_TIME_IN_DAYS = 90;

-- Check current Time Travel setting
SHOW PARAMETERS LIKE 'DATA_RETENTION%' IN TABLE my_table;
```

---

### 3. VIRTUAL WAREHOUSE COMMANDS

#### 3.1 CREATE WAREHOUSE

```sql
-- Full CREATE WAREHOUSE with all commonly tested parameters
CREATE WAREHOUSE my_warehouse WITH
  WAREHOUSE_SIZE = 'MEDIUM'                  -- XSMALL|SMALL|MEDIUM|LARGE|XLARGE|2XLARGE|3XLARGE|4XLARGE|5XLARGE|6XLARGE
  WAREHOUSE_TYPE = 'STANDARD'                -- STANDARD | SNOWPARK-OPTIMIZED
  AUTO_SUSPEND = 300                         -- Seconds of inactivity before suspend (default 600, min 0 for never)
  AUTO_RESUME = TRUE                         -- Auto-resume when query arrives (default TRUE)
  INITIALLY_SUSPENDED = TRUE                 -- Start in suspended state (CREATE only, cannot ALTER)
  MIN_CLUSTER_COUNT = 1                      -- Minimum clusters (multi-cluster, Enterprise+ only)
  MAX_CLUSTER_COUNT = 3                      -- Maximum clusters (if MIN=MAX, Maximized mode)
  SCALING_POLICY = 'STANDARD'                -- STANDARD | ECONOMY (only for Auto-scale mode)
  ENABLE_QUERY_ACCELERATION = TRUE           -- Enterprise+ only; offloads to serverless compute
  QUERY_ACCELERATION_MAX_SCALE_FACTOR = 8    -- 0 = no limit; N = up to N * warehouse_size credits
  MAX_CONCURRENCY_LEVEL = 8                  -- Max concurrent queries per cluster (default 8)
  STATEMENT_QUEUED_TIMEOUT_IN_SECONDS = 0    -- 0 = no timeout
  STATEMENT_TIMEOUT_IN_SECONDS = 172800      -- Max query runtime (default 172800 = 2 days)
  RESOURCE_MONITOR = my_monitor              -- Assign resource monitor
  COMMENT = 'ETL warehouse';
```

#### 3.2 Warehouse Sizes -- Credits Per Hour (Memorize This)

| Size     | Nodes/Servers | Credits/Hour |
| -------- | ------------- | ------------ |
| X-Small  | 1             | 1            |
| Small    | 2             | 2            |
| Medium   | 4             | 4            |
| Large    | 8             | 8            |
| X-Large  | 16            | 16           |
| 2X-Large | 32            | 32           |
| 3X-Large | 64            | 64           |
| 4X-Large | 128           | 128          |
| 5X-Large | 256           | 256          |
| 6X-Large | 512           | 512          |

**Exam tip:** Each size doubles the previous size's nodes AND credits. Billing is per-second
with a 60-second minimum each time the warehouse resumes. When suspended = zero credits.

#### 3.3 ALTER WAREHOUSE

```sql
-- Resize a warehouse (can be done while running -- queries in flight use old size)
ALTER WAREHOUSE my_warehouse SET WAREHOUSE_SIZE = 'LARGE';

-- Resize and WAIT for completion before returning
ALTER WAREHOUSE my_warehouse SET WAREHOUSE_SIZE = 'LARGE'
  WAIT_FOR_COMPLETION = TRUE;

-- Change auto-suspend timeout
ALTER WAREHOUSE my_warehouse SET AUTO_SUSPEND = 120;

-- Suspend a warehouse immediately
ALTER WAREHOUSE my_warehouse SUSPEND;

-- Resume a warehouse
ALTER WAREHOUSE my_warehouse RESUME;

-- Resume only if suspended (avoids error)
ALTER WAREHOUSE my_warehouse RESUME IF SUSPENDED;

-- Abort all running queries on a warehouse
ALTER WAREHOUSE my_warehouse ABORT ALL QUERIES;

-- Assign a resource monitor to a warehouse
ALTER WAREHOUSE my_warehouse SET RESOURCE_MONITOR = my_monitor;

-- Enable multi-cluster auto-scale (Enterprise+)
ALTER WAREHOUSE my_warehouse SET
  MIN_CLUSTER_COUNT = 1
  MAX_CLUSTER_COUNT = 5
  SCALING_POLICY = 'ECONOMY';

-- Enable query acceleration service (Enterprise+)
ALTER WAREHOUSE my_warehouse SET
  ENABLE_QUERY_ACCELERATION = TRUE
  QUERY_ACCELERATION_MAX_SCALE_FACTOR = 0;  -- 0 = unlimited
```

#### 3.4 Multi-Cluster Warehouse Modes

```sql
-- MAXIMIZED mode: MIN = MAX (all clusters always running)
ALTER WAREHOUSE my_warehouse SET
  MIN_CLUSTER_COUNT = 3
  MAX_CLUSTER_COUNT = 3;

-- AUTO-SCALE mode: MIN < MAX (clusters start/stop based on load)
ALTER WAREHOUSE my_warehouse SET
  MIN_CLUSTER_COUNT = 1
  MAX_CLUSTER_COUNT = 10;
```

**Scaling Policies (Auto-scale mode only):**

- `STANDARD`: Starts additional cluster when a query is queued. Shuts down after 2-3 checks (each check is 20 seconds apart) showing the load can be handled by fewer clusters.
- `ECONOMY`: Starts additional cluster only when there is enough query load to keep it busy for at least 6 minutes. Conserves credits.

**Exam tip:** Multi-cluster warehouses are Enterprise Edition or higher. Scaling policy only applies
in Auto-scale mode (MIN < MAX). In Maximized mode (MIN = MAX), all clusters run all the time.

#### 3.5 SHOW / DESCRIBE WAREHOUSE

```sql
-- List all warehouses visible to current role
-- Does NOT require a running warehouse (metadata operation)
SHOW WAREHOUSES;

-- Filter by name pattern
SHOW WAREHOUSES LIKE 'etl%';

-- Show warehouses where you have specific privileges
SHOW WAREHOUSES WITH PRIVILEGES MODIFY, OPERATE;

-- Describe a specific warehouse (returns properties)
DESCRIBE WAREHOUSE my_warehouse;
-- Aliases: DESC WAREHOUSE my_warehouse;
```

#### 3.6 USE WAREHOUSE

```sql
-- Set the active warehouse for the session
USE WAREHOUSE my_warehouse;

-- Check the current warehouse
SELECT CURRENT_WAREHOUSE();
```

---

### 4. RESOURCE MONITORS

#### 4.1 CREATE RESOURCE MONITOR

```sql
-- Only ACCOUNTADMIN can create resource monitors
USE ROLE ACCOUNTADMIN;

-- Full resource monitor with all options
CREATE OR REPLACE RESOURCE MONITOR my_monitor WITH
  CREDIT_QUOTA = 1000                     -- Number of credits for the interval
  FREQUENCY = MONTHLY                     -- MONTHLY | DAILY | WEEKLY | YEARLY | NEVER
  START_TIMESTAMP = '2024-01-01 00:00 PST'  -- Required when FREQUENCY is set
  END_TIMESTAMP = '2024-12-31 23:59 PST'    -- Optional end date
  TRIGGERS
    ON 50 PERCENT DO NOTIFY               -- Send notification at 50%
    ON 75 PERCENT DO NOTIFY               -- Send notification at 75%
    ON 100 PERCENT DO SUSPEND             -- Suspend warehouses at 100% (running queries complete)
    ON 110 PERCENT DO SUSPEND_IMMEDIATE;  -- Suspend immediately, cancel queries at 110%
```

```sql
-- Minimal resource monitor (immediately starts, monthly)
CREATE RESOURCE MONITOR quick_monitor WITH
  CREDIT_QUOTA = 500
  FREQUENCY = MONTHLY
  START_TIMESTAMP = IMMEDIATELY
  TRIGGERS
    ON 100 PERCENT DO SUSPEND;
```

#### 4.2 Resource Monitor Trigger Actions

| Action              | Behavior                                                              |
| ------------------- | --------------------------------------------------------------------- |
| `NOTIFY`            | Sends alert notification only. No suspension.                         |
| `SUSPEND`           | Suspends assigned warehouses. Running queries finish. No new queries. |
| `SUSPEND_IMMEDIATE` | Suspends warehouses immediately. Cancels running queries.             |

**Exam tip:** Max 5 NOTIFY triggers per monitor. SUSPEND/SUSPEND_IMMEDIATE only affect user-managed
warehouses (not cloud services compute). A monitor must have at least 1 trigger to do anything.
Percentages > 100 are valid (e.g., 110%, 150%).

#### 4.3 ALTER RESOURCE MONITOR

```sql
-- Modify credit quota
ALTER RESOURCE MONITOR my_monitor SET CREDIT_QUOTA = 2000;

-- Change triggers
ALTER RESOURCE MONITOR my_monitor SET
  TRIGGERS
    ON 80 PERCENT DO NOTIFY
    ON 100 PERCENT DO SUSPEND;
```

#### 4.4 Assigning Resource Monitors

```sql
-- Assign to a specific warehouse
ALTER WAREHOUSE my_warehouse SET RESOURCE_MONITOR = my_monitor;

-- Assign at ACCOUNT level (monitors ALL warehouses)
ALTER ACCOUNT SET RESOURCE_MONITOR = my_account_monitor;

-- Remove from a warehouse
ALTER WAREHOUSE my_warehouse UNSET RESOURCE_MONITOR;
```

**Exam tip:** A warehouse can have its own resource monitor AND be covered by an account-level
monitor. Both are evaluated independently -- whichever triggers first takes effect.

#### 4.5 SHOW RESOURCE MONITORS

```sql
-- List all resource monitors (ACCOUNTADMIN or granted privilege)
SHOW RESOURCE MONITORS;

-- Filter by name
SHOW RESOURCE MONITORS LIKE 'prod%';
```

---

### 5. DATABASE / SCHEMA / TABLE HIERARCHY

#### 5.1 Fully Qualified Object Names

```text
Format: <database>.<schema>.<object>
Example: my_db.my_schema.my_table
```

```sql
-- Set session context (so you don't need full qualifiers)
USE DATABASE my_db;
USE SCHEMA my_schema;
-- Shorthand for both:
USE SCHEMA my_db.my_schema;

-- Check current context
SELECT CURRENT_DATABASE();
SELECT CURRENT_SCHEMA();
```

#### 5.2 CREATE DATABASE

```sql
-- Basic create
CREATE DATABASE my_db;

-- With options
CREATE DATABASE IF NOT EXISTS my_db
  DATA_RETENTION_TIME_IN_DAYS = 30
  MAX_DATA_EXTENSION_TIME_IN_DAYS = 14
  COMMENT = 'Production database';

-- Transient database (no Fail-safe, Time Travel 0 or 1 day only)
CREATE TRANSIENT DATABASE staging_db;

-- Create database from share
CREATE DATABASE shared_db FROM SHARE provider_account.share_name;

-- Clone a database (zero-copy clone)
CREATE DATABASE my_db_clone CLONE my_db;
```

**Exam tip:** Every database automatically gets two schemas: PUBLIC (default) and INFORMATION_SCHEMA
(read-only metadata). A transient database means ALL schemas and tables in it are transient.

#### 5.3 CREATE SCHEMA

```sql
-- Basic create
CREATE SCHEMA my_schema;

-- Full syntax
CREATE SCHEMA IF NOT EXISTS my_db.my_schema
  WITH MANAGED ACCESS                          -- Schema owner controls grants
  DATA_RETENTION_TIME_IN_DAYS = 14
  COMMENT = 'Analytics schema';

-- Transient schema
CREATE TRANSIENT SCHEMA temp_schema;
```

**Exam tip:** MANAGED ACCESS schemas mean the schema owner (not individual object owners) controls
all privilege grants on objects within the schema. Uses SECURITYADMIN-friendly centralized control.

#### 5.4 CREATE TABLE (Architecture-relevant options)

```sql
-- Standard permanent table
CREATE TABLE my_table (
  id INT AUTOINCREMENT,
  name VARCHAR(100) NOT NULL,
  data VARIANT,
  created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- Transient table (no Fail-safe, Time Travel 0 or 1 day)
CREATE TRANSIENT TABLE staging_data (
  id INT,
  payload VARIANT
);

-- Temporary table (session-scoped, no Fail-safe, Time Travel 0 or 1 day)
CREATE TEMPORARY TABLE session_temp (
  id INT,
  val STRING
);

-- Create table with clustering key
CREATE TABLE events (
  event_date DATE,
  event_type VARCHAR(50),
  user_id INT,
  data VARIANT
) CLUSTER BY (event_date, event_type);

-- Create Table As Select (CTAS)
CREATE TABLE new_table AS
SELECT * FROM source_table WHERE status = 'active';

-- Create table LIKE (structure only, no data)
CREATE TABLE new_table LIKE source_table;

-- Create table using CLONE (zero-copy, includes data)
CREATE TABLE new_table CLONE source_table;
```

#### 5.5 Table Types Comparison (Memorize This)

| Property                         | Permanent               | Transient | Temporary |
| -------------------------------- | ----------------------- | --------- | --------- |
| Time Travel                      | 0-90 days (Enterprise+) | 0-1 day   | 0-1 day   |
| Fail-safe                        | 7 days                  | NONE      | NONE      |
| Visible to other sessions        | Yes                     | Yes       | NO        |
| Persists after session ends      | Yes                     | Yes       | NO        |
| Storage cost                     | Highest                 | Medium    | Lowest    |
| CDL (Continuous Data Protection) | Full                    | Partial   | Minimal   |

#### 5.6 SHOW Commands for Hierarchy Objects

```sql
-- List databases (does NOT need a warehouse)
SHOW DATABASES;
SHOW DATABASES LIKE 'prod%';
SHOW DATABASES HISTORY;              -- Includes dropped databases in Time Travel

-- List schemas (does NOT need a warehouse)
SHOW SCHEMAS;                        -- In current database
SHOW SCHEMAS IN DATABASE my_db;
SHOW SCHEMAS HISTORY IN DATABASE my_db;
SHOW SCHEMAS LIKE 'stg%' IN DATABASE my_db;

-- List tables (does NOT need a warehouse)
SHOW TABLES;                         -- In current schema
SHOW TABLES IN SCHEMA my_db.my_schema;
SHOW TABLES LIKE 'fact%' IN DATABASE my_db;
SHOW TABLES HISTORY;                 -- Includes dropped tables in Time Travel

-- List views
SHOW VIEWS;
SHOW VIEWS IN SCHEMA my_db.my_schema;

-- Describe object structure
DESCRIBE TABLE my_table;             -- Columns, types, defaults
DESC TABLE my_table;                 -- Alias
DESCRIBE TABLE my_table TYPE = COLUMNS;
DESCRIBE TABLE my_table TYPE = STAGE; -- Stage properties for the table

-- List all objects (tables and views together)
SHOW OBJECTS IN SCHEMA my_db.my_schema;
```

**Exam tip:** ALL SHOW and DESCRIBE commands are metadata operations handled by the Cloud Services
layer. They do NOT require a running warehouse and do NOT consume warehouse credits.
They DO consume cloud services credits (usually negligible, covered by the 10% adjustment).

---

### 6. MICRO-PARTITIONS AND CLUSTERING

#### 6.1 Clustering Key Commands

```sql
-- Define clustering key at table creation
CREATE TABLE sales (
  sale_date DATE,
  region VARCHAR(20),
  amount NUMBER(12,2)
) CLUSTER BY (sale_date, region);

-- Add or change clustering key on existing table
ALTER TABLE sales CLUSTER BY (sale_date, region);

-- Use expression-based clustering key
ALTER TABLE sales CLUSTER BY (DATE_TRUNC('MONTH', sale_date), region);

-- Use partial string for high-cardinality columns
ALTER TABLE logs CLUSTER BY (LEFT(session_id, 4), log_date);

-- Drop (remove) clustering key from a table
ALTER TABLE sales DROP CLUSTERING KEY;
```

**Exam tip:** Order clustering key columns from LOWEST cardinality to HIGHEST cardinality.
Snowflake recommends clustering only for tables with 1,000+ micro-partitions (multi-TB tables).
Defining a clustering key enables Automatic Clustering (serverless background maintenance).

#### 6.2 Automatic Clustering Control

```sql
-- Suspend automatic reclustering (stops background maintenance + credit usage)
ALTER TABLE sales SUSPEND RECLUSTER;

-- Resume automatic reclustering
ALTER TABLE sales RESUME RECLUSTER;
```

**Exam tip:** Automatic Clustering is a serverless feature (Enterprise+). It uses its own compute
resources (not your warehouse). Credits are billed separately. You can suspend/resume it per table.

#### 6.3 Clustering Information Functions

```sql
-- Get clustering information as JSON (most comprehensive)
-- Returns: total_partition_count, total_constant_partition_count,
--          average_overlaps, average_depth, partition_depth_histogram
SELECT SYSTEM$CLUSTERING_INFORMATION('my_db.my_schema.sales');

-- Check clustering info for specific columns (even without a defined key)
SELECT SYSTEM$CLUSTERING_INFORMATION('sales', '(sale_date, region)');

-- Get the average clustering depth for the defined clustering key
SELECT SYSTEM$CLUSTERING_DEPTH('my_db.my_schema.sales');

-- Get clustering depth for specific columns
SELECT SYSTEM$CLUSTERING_DEPTH('sales', '(sale_date)');

-- Get clustering depth with a predicate filter
SELECT SYSTEM$CLUSTERING_DEPTH('sales', '(sale_date)', 'sale_date > ''2024-01-01''');
```

**Key metrics to understand:**

| Metric                           | Meaning                                                       | Good Value     |
| -------------------------------- | ------------------------------------------------------------- | -------------- |
| `average_depth`                  | Avg number of micro-partitions that must be scanned per value | Close to 1     |
| `average_overlaps`               | Avg number of micro-partitions with overlapping value ranges  | Close to 0     |
| `total_constant_partition_count` | Partitions fully optimized (won't benefit from reclustering)  | Close to total |

**Exam tip:** A well-clustered table has depth close to 1 and low overlap. The depth of a table
with data is always >= 1. SYSTEM$CLUSTERING_INFORMATION returns JSON (VARCHAR).
These are system functions, NOT table functions -- call them with SELECT, not FROM TABLE().

---

### 7. QUERY PROFILE AND EXPLAIN COMMANDS

#### 7.1 EXPLAIN

```sql
-- Get query execution plan WITHOUT running the query
EXPLAIN SELECT * FROM sales WHERE region = 'US';

-- Output in text format (default)
EXPLAIN USING TEXT SELECT * FROM sales WHERE region = 'US';

-- Output in JSON format (for programmatic processing)
EXPLAIN USING JSON SELECT * FROM sales WHERE region = 'US';

-- Verbose mode (more details)
EXPLAIN VERBOSE SELECT * FROM sales WHERE region = 'US';
```

**Exam tip:** EXPLAIN does NOT execute the query and does NOT consume warehouse credits for compute.
However, compilation uses Cloud Services credits. If no warehouse is active, EXPLAIN uses
XSMALL warehouse assumptions for the plan.

#### 7.2 System Functions for Query Plans

```sql
-- Get explain plan as JSON for a SQL statement (pass SQL as string)
SELECT SYSTEM$EXPLAIN_PLAN_JSON('SELECT * FROM sales WHERE region = ''US''');

-- Using $$ delimiters to avoid escaping single quotes
SELECT SYSTEM$EXPLAIN_PLAN_JSON(
  $$ SELECT * FROM sales WHERE region = 'US' $$
);

-- Get explain plan for a previously executed query (by query ID)
-- Query must be within last 14 days
SELECT SYSTEM$EXPLAIN_PLAN_JSON('01a2b3c4-0000-1234-0000-00000000abcd');

-- Convert JSON explain plan to readable text
SELECT SYSTEM$EXPLAIN_JSON_TO_TEXT(
  SYSTEM$EXPLAIN_PLAN_JSON('SELECT * FROM sales')
);

-- Convert JSON explain to tabular format
SELECT * FROM TABLE(
  EXPLAIN_JSON(
    SYSTEM$EXPLAIN_PLAN_JSON('SELECT * FROM sales')
  )
);
```

#### 7.3 Query Acceleration Service Functions

```sql
-- Check if a specific query would benefit from QAS
-- Returns JSON with status: "eligible" or "ineligible"
SELECT SYSTEM$ESTIMATE_QUERY_ACCELERATION('01a2b3c4-0000-1234-0000-00000000abcd');

-- Parse the output for readability
SELECT PARSE_JSON(
  SYSTEM$ESTIMATE_QUERY_ACCELERATION('01a2b3c4-0000-1234-0000-00000000abcd')
);

-- Use ACCOUNT_USAGE to find queries that WOULD benefit from QAS
SELECT query_id, eligible_query_acceleration_time
FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_ACCELERATION_ELIGIBLE
WHERE eligible_query_acceleration_time > 0
ORDER BY eligible_query_acceleration_time DESC
LIMIT 20;
```

#### 7.4 Query History

```sql
-- INFORMATION_SCHEMA: last 7 days, real-time, per-database
SELECT *
FROM TABLE(INFORMATION_SCHEMA.QUERY_HISTORY(
  DATE_RANGE_START => DATEADD('hours', -1, CURRENT_TIMESTAMP()),
  RESULT_LIMIT => 100
));

-- Get query history by warehouse
SELECT *
FROM TABLE(INFORMATION_SCHEMA.QUERY_HISTORY_BY_WAREHOUSE(
  WAREHOUSE_NAME => 'MY_WAREHOUSE',
  RESULT_LIMIT => 50
));

-- ACCOUNT_USAGE: last 365 days, 45-min latency, account-wide
SELECT query_id, query_text, total_elapsed_time, warehouse_name
FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY
WHERE start_time > DATEADD('day', -7, CURRENT_TIMESTAMP())
ORDER BY total_elapsed_time DESC
LIMIT 20;
```

---

### 8. INFORMATION_SCHEMA vs. ACCOUNT_USAGE

#### 8.1 Side-by-Side Comparison (Memorize This)

| Feature                | INFORMATION_SCHEMA                         | ACCOUNT_USAGE                                 |
| ---------------------- | ------------------------------------------ | --------------------------------------------- |
| **Location**           | `<db>.INFORMATION_SCHEMA.<view>`           | `SNOWFLAKE.ACCOUNT_USAGE.<view>`              |
| **Scope**              | Per database                               | Entire account                                |
| **Latency**            | Real-time (no latency)                     | 45 min to 3 hours                             |
| **Retention**          | 7 days to 6 months                         | Up to 1 year (365 days)                       |
| **Dropped objects**    | NOT included                               | Included                                      |
| **Access**             | Based on object privileges of current role | ACCOUNTADMIN (or granted IMPORTED PRIVILEGES) |
| **Requires warehouse** | No (metadata)                              | Yes (queries the SNOWFLAKE shared database)   |

#### 8.2 INFORMATION_SCHEMA Queries

```sql
-- List all tables in a database
SELECT table_name, table_type, row_count, bytes
FROM my_db.INFORMATION_SCHEMA.TABLES
WHERE table_schema = 'PUBLIC';

-- List columns of a table
SELECT column_name, data_type, is_nullable, column_default
FROM my_db.INFORMATION_SCHEMA.COLUMNS
WHERE table_name = 'MY_TABLE';

-- Query history (table function, last 7 days)
SELECT *
FROM TABLE(my_db.INFORMATION_SCHEMA.QUERY_HISTORY())
ORDER BY start_time DESC
LIMIT 10;

-- Storage usage
SELECT *
FROM TABLE(my_db.INFORMATION_SCHEMA.DATABASE_STORAGE_USAGE_HISTORY(
  DATE_RANGE_START => DATEADD('day', -30, CURRENT_TIMESTAMP())
));

-- Warehouse metering (table function)
SELECT *
FROM TABLE(my_db.INFORMATION_SCHEMA.WAREHOUSE_METERING_HISTORY(
  DATE_RANGE_START => DATEADD('day', -7, CURRENT_TIMESTAMP())
));

-- Active pipes
SELECT pipe_name, pipe_schema, definition
FROM my_db.INFORMATION_SCHEMA.PIPES;
```

#### 8.3 ACCOUNT_USAGE Queries

```sql
-- First, grant access to non-ACCOUNTADMIN roles
USE ROLE ACCOUNTADMIN;
GRANT IMPORTED PRIVILEGES ON DATABASE SNOWFLAKE TO ROLE my_analyst_role;

-- Query history (365-day retention, 45-min latency)
SELECT query_id, user_name, warehouse_name, execution_status,
       total_elapsed_time, bytes_scanned
FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY
WHERE start_time >= DATEADD('day', -30, CURRENT_TIMESTAMP())
ORDER BY total_elapsed_time DESC;

-- Login history (365 days)
SELECT *
FROM SNOWFLAKE.ACCOUNT_USAGE.LOGIN_HISTORY
WHERE event_timestamp >= DATEADD('day', -7, CURRENT_TIMESTAMP());

-- Storage usage (365 days)
SELECT *
FROM SNOWFLAKE.ACCOUNT_USAGE.STORAGE_USAGE
ORDER BY usage_date DESC
LIMIT 30;

-- Warehouse metering (365 days)
SELECT warehouse_name, SUM(credits_used) as total_credits
FROM SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_METERING_HISTORY
WHERE start_time >= DATEADD('month', -1, CURRENT_TIMESTAMP())
GROUP BY warehouse_name
ORDER BY total_credits DESC;

-- Find dropped tables (not possible with INFORMATION_SCHEMA)
SELECT table_name, table_schema, deleted
FROM SNOWFLAKE.ACCOUNT_USAGE.TABLES
WHERE deleted IS NOT NULL
ORDER BY deleted DESC;

-- Credit usage by service type
SELECT service_type, SUM(credits_used) as total_credits
FROM SNOWFLAKE.ACCOUNT_USAGE.METERING_HISTORY
WHERE start_time >= DATEADD('month', -1, CURRENT_TIMESTAMP())
GROUP BY service_type
ORDER BY total_credits DESC;
```

**Exam tip:** INFORMATION_SCHEMA is automatically created in EVERY database. ACCOUNT_USAGE lives
only in the shared SNOWFLAKE database. To grant access to ACCOUNT_USAGE, you grant IMPORTED
PRIVILEGES on the entire SNOWFLAKE database (not on individual schemas or views).

---

### 9. CACHING AND RESULT REUSE

#### 9.1 Query Result Cache

```sql
-- Disable result cache for the current SESSION (for benchmarking)
ALTER SESSION SET USE_CACHED_RESULT = FALSE;

-- Re-enable result cache
ALTER SESSION SET USE_CACHED_RESULT = TRUE;

-- Disable at USER level
ALTER USER my_user SET USE_CACHED_RESULT = FALSE;

-- Disable at ACCOUNT level (ACCOUNTADMIN)
ALTER ACCOUNT SET USE_CACHED_RESULT = FALSE;
```

**Query Result Cache conditions (all must be true for cache hit):**

1. Query text is EXACTLY the same (case-sensitive, including whitespace)
2. Underlying data has NOT changed
3. Result is still available (24-hour retention)
4. No non-deterministic functions (RANDOM(), UUID_STRING(), CURRENT_TIMESTAMP(), etc.)
5. No external functions
6. Executing role has required privileges
7. USE_CACHED_RESULT = TRUE (default)

**Exam tip:** Result cache is part of the Cloud Services layer. It is shared across ALL warehouses
in the account. A cached result does NOT require a running warehouse to return. It persists for 24
hours, and the timer resets each time the result is reused.

#### 9.2 RESULT_SCAN Function

```sql
-- Use results from the most recently executed query
SELECT * FROM TABLE(RESULT_SCAN(LAST_QUERY_ID()));

-- Use results from a specific query by ID
SELECT * FROM TABLE(RESULT_SCAN('01a2b3c4-0000-1234-0000-00000000abcd'));

-- Commonly used to post-process SHOW command output
SHOW WAREHOUSES;
SELECT "name", "size", "state"
FROM TABLE(RESULT_SCAN(LAST_QUERY_ID()))
WHERE "state" = 'ACTIVE';

-- Post-process SHOW PARAMETERS output
SHOW PARAMETERS IN ACCOUNT;
SELECT "key", "value", "level"
FROM TABLE(RESULT_SCAN(LAST_QUERY_ID()))
WHERE "key" LIKE '%TIMEOUT%';
```

**Exam tip:** RESULT_SCAN returns the output of the LAST query (or a specific query ID) as a table
that you can query with SELECT. Column names from SHOW commands are LOWERCASE and must be
double-quoted. RESULT_SCAN is a TABLE FUNCTION (use FROM TABLE(...)).

#### 9.3 LAST_QUERY_ID

```sql
-- Get the ID of the most recently executed query in the session
SELECT LAST_QUERY_ID();

-- Get the ID of the Nth most recent query (-1 = previous, -2 = two ago)
SELECT LAST_QUERY_ID(-1);  -- Same as LAST_QUERY_ID()
SELECT LAST_QUERY_ID(-2);  -- Second most recent
```

---

### 10. METADATA OPERATIONS vs. WAREHOUSE OPERATIONS

#### 10.1 Operations That Do NOT Need a Running Warehouse

These are handled by the Cloud Services layer:

```sql
-- All SHOW commands
SHOW DATABASES;
SHOW SCHEMAS;
SHOW TABLES;
SHOW WAREHOUSES;
SHOW ROLES;
SHOW GRANTS;
SHOW PARAMETERS;
SHOW RESOURCE MONITORS;

-- All DESCRIBE/DESC commands
DESCRIBE TABLE my_table;
DESCRIBE WAREHOUSE my_warehouse;

-- DDL commands (CREATE, ALTER, DROP, GRANT, REVOKE)
CREATE DATABASE test_db;
ALTER TABLE my_table SET DATA_RETENTION_TIME_IN_DAYS = 30;
DROP TABLE old_table;
GRANT SELECT ON TABLE my_table TO ROLE analyst;

-- Context functions
SELECT CURRENT_ROLE();
SELECT CURRENT_WAREHOUSE();
SELECT CURRENT_DATABASE();
SELECT CURRENT_SCHEMA();
SELECT CURRENT_USER();
SELECT CURRENT_ACCOUNT();
SELECT CURRENT_SESSION();
SELECT CURRENT_VERSION();
SELECT CURRENT_REGION();

-- Cached query results (if cache conditions met)
-- (Returns from Cloud Services layer without warehouse)

-- USE commands
USE DATABASE my_db;
USE SCHEMA my_schema;
USE WAREHOUSE my_wh;
USE ROLE my_role;
```

#### 10.2 Operations That REQUIRE a Running Warehouse

```sql
-- Any SELECT query that reads data from tables
SELECT * FROM my_table;

-- DML operations
INSERT INTO my_table VALUES (1, 'data');
UPDATE my_table SET col = 'new' WHERE id = 1;
DELETE FROM my_table WHERE id = 1;
MERGE INTO target USING source ON target.id = source.id ...;

-- Data loading/unloading
COPY INTO my_table FROM @my_stage;
COPY INTO @my_stage FROM my_table;

-- CTAS (Create Table As Select)
CREATE TABLE new_table AS SELECT * FROM old_table;
```

**Exam tip:** The key distinction is: metadata operations = Cloud Services layer (no warehouse).
Data operations = Query Processing layer (requires warehouse). DDL is metadata even though
it modifies structure. DML and queries require compute.

#### 10.3 Cloud Services Credit Billing

```sql
-- Check cloud services usage (what percentage did you use vs. 10% threshold?)
SELECT service_type, SUM(credits_used) as credits
FROM SNOWFLAKE.ACCOUNT_USAGE.METERING_HISTORY
WHERE service_type = 'CLOUD_SERVICES'
  AND start_time >= DATEADD('day', -30, CURRENT_TIMESTAMP())
GROUP BY service_type;
```

**Exam tip:** Cloud Services credits are billed ONLY if daily cloud services usage exceeds 10% of
daily warehouse compute usage. Below 10% = free (this is called the "10% adjustment").

---

### 11. PARAMETERS AND CONFIGURATION

#### 11.1 Parameter Hierarchy (Memorize This)

```text
Parameter Types:
  ACCOUNT parameters  --> Set only at account level, cannot be overridden
  SESSION parameters  --> Account -> User -> Session (each level can override)
  OBJECT parameters   --> Account -> Database -> Schema -> Table (hierarchy)
                          Account -> Warehouse (no hierarchy, direct override)
```

#### 11.2 SHOW PARAMETERS

```sql
-- Show session parameters (default if no scope specified)
SHOW PARAMETERS;
SHOW PARAMETERS IN SESSION;

-- Show account parameters
SHOW PARAMETERS IN ACCOUNT;

-- Show warehouse parameters
SHOW PARAMETERS IN WAREHOUSE my_warehouse;

-- Show database parameters
SHOW PARAMETERS IN DATABASE my_db;

-- Show schema parameters
SHOW PARAMETERS IN SCHEMA my_db.my_schema;

-- Show table parameters
SHOW PARAMETERS IN TABLE my_db.my_schema.my_table;

-- Filter parameters by name
SHOW PARAMETERS LIKE '%TIMEOUT%' IN WAREHOUSE my_warehouse;
SHOW PARAMETERS LIKE 'DATA_RETENTION%' IN ACCOUNT;
```

#### 11.3 Setting Parameters at Different Levels

```sql
-- Account level (ACCOUNTADMIN required)
ALTER ACCOUNT SET STATEMENT_TIMEOUT_IN_SECONDS = 172800;

-- Session level (current user)
ALTER SESSION SET STATEMENT_TIMEOUT_IN_SECONDS = 3600;
ALTER SESSION SET USE_CACHED_RESULT = FALSE;
ALTER SESSION SET QUERY_TAG = 'etl_pipeline_v2';

-- User level
ALTER USER my_user SET DEFAULT_WAREHOUSE = 'COMPUTE_WH';
ALTER USER my_user SET DEFAULT_ROLE = 'ANALYST';

-- Warehouse level
ALTER WAREHOUSE my_wh SET STATEMENT_TIMEOUT_IN_SECONDS = 7200;
ALTER WAREHOUSE my_wh SET MAX_CONCURRENCY_LEVEL = 4;

-- Database level
ALTER DATABASE my_db SET DATA_RETENTION_TIME_IN_DAYS = 14;

-- Schema level
ALTER SCHEMA my_db.my_schema SET DATA_RETENTION_TIME_IN_DAYS = 7;

-- Table level
ALTER TABLE my_table SET DATA_RETENTION_TIME_IN_DAYS = 1;
```

**Exam tip:** When SHOW PARAMETERS output has a blank "level" column, the parameter is at its
DEFAULT value. When explicitly set, the "level" column shows where it was set (e.g., "ACCOUNT").
SHOW PARAMETERS does NOT require a running warehouse.

---

### 12. SEARCH OPTIMIZATION SERVICE

```sql
-- Enable search optimization on an entire table (Enterprise+ required)
ALTER TABLE my_table ADD SEARCH OPTIMIZATION;

-- Enable for specific columns and search methods
ALTER TABLE my_table ADD SEARCH OPTIMIZATION ON
  EQUALITY(col1, col2),                    -- For = and IN predicates
  SUBSTRING(col3),                         -- For LIKE, ILIKE, RLIKE
  GEO(geo_col),                            -- For GEOGRAPHY type searches
  FULL_TEXT(text_col1, text_col2);          -- For SEARCH function

-- Drop search optimization
ALTER TABLE my_table DROP SEARCH OPTIMIZATION;

-- Drop search optimization for specific columns
ALTER TABLE my_table DROP SEARCH OPTIMIZATION ON EQUALITY(col1);

-- Check search optimization status
DESCRIBE SEARCH OPTIMIZATION ON my_table;

-- View search optimization cost
SELECT *
FROM SNOWFLAKE.ACCOUNT_USAGE.SEARCH_OPTIMIZATION_HISTORY
WHERE start_time >= DATEADD('day', -7, CURRENT_TIMESTAMP());
```

**Exam tip:** Search Optimization is a TABLE-level property (vs. QAS which is WAREHOUSE-level).
It works by building a "search access path" in the background (serverless). It is best for
point lookups (= and IN), substring searches, and semi-structured data queries. Enterprise+ only.

---

### 13. CONTEXT FUNCTIONS (Complete Reference)

```sql
-- Account and organization context
SELECT CURRENT_ACCOUNT();           -- Account locator
SELECT CURRENT_ACCOUNT_NAME();      -- Account name
SELECT CURRENT_ORGANIZATION_NAME(); -- Organization name
SELECT CURRENT_REGION();            -- Cloud region (e.g., AWS_US_WEST_2)

-- Session context
SELECT CURRENT_SESSION();           -- Session ID
SELECT CURRENT_USER();              -- User name
SELECT CURRENT_ROLE();              -- Active primary role
SELECT CURRENT_SECONDARY_ROLES();   -- Active secondary roles
SELECT CURRENT_AVAILABLE_ROLES();   -- All roles available to user

-- Object context
SELECT CURRENT_DATABASE();          -- Current database
SELECT CURRENT_SCHEMA();            -- Current schema
SELECT CURRENT_SCHEMAS();           -- All schemas in search path
SELECT CURRENT_WAREHOUSE();         -- Current warehouse

-- Query context
SELECT LAST_QUERY_ID();             -- Last query ID in session
SELECT LAST_QUERY_ID(-2);           -- 2nd most recent query ID
SELECT LAST_TRANSACTION();          -- Last transaction ID

-- System info
SELECT CURRENT_VERSION();           -- Snowflake version string
SELECT CURRENT_CLIENT();            -- Client application name

-- Date/time context
SELECT CURRENT_DATE();
SELECT CURRENT_TIME();
SELECT CURRENT_TIMESTAMP();

-- IP address
SELECT CURRENT_IP_ADDRESS();        -- Client IP

-- Statement context (useful inside stored procedures / UDFs)
SELECT CURRENT_STATEMENT();         -- The SQL text currently executing
SELECT CURRENT_TRANSACTION();       -- Current transaction ID
```

**Exam tip:** Context functions do NOT require a running warehouse. They are zero-argument functions
and can be called without parentheses in SQL statements (ANSI compliance), but parentheses are
required when assigning to a Snowflake Scripting variable.

---

### 14. DATA TYPES AND SEMI-STRUCTURED DATA (Architecture Relevance)

#### 14.1 Semi-Structured Data Types

```sql
-- VARIANT: can hold any JSON-compatible value (or NULL)
CREATE TABLE events (
  id INT,
  data VARIANT        -- stores JSON, arrays, objects, scalars
);

-- OBJECT: key-value pairs (like a JSON object)
CREATE TABLE configs (
  id INT,
  settings OBJECT
);

-- ARRAY: ordered list of values
CREATE TABLE lists (
  id INT,
  items ARRAY
);
```

#### 14.2 Querying Semi-Structured Data

```sql
-- Colon notation for top-level keys (VARIANT columns)
SELECT data:name FROM events;                    -- Returns VARIANT
SELECT data:name::STRING FROM events;            -- Cast to STRING

-- Dot notation for nested keys
SELECT data:employee.name::STRING FROM events;

-- Bracket notation (required for special characters or variables)
SELECT data['employee']['name'] FROM events;

-- Array access (0-indexed)
SELECT data:items[0]::STRING FROM events;

-- FLATTEN to expand arrays/objects into rows
SELECT e.id, f.value::STRING AS item
FROM events e,
LATERAL FLATTEN(input => e.data:items) f;
```

**Exam tip:** Colon notation is Snowflake-specific (data:key). Dot notation for nested (data:a.b).
Bracket notation for keys with spaces/special chars (data['key name']). Keys are CASE-SENSITIVE
in semi-structured data.

---

### 15. SNOWFLAKE OBJECTS AND ARCHITECTURE SYSTEM FUNCTIONS

#### 15.1 Useful System Functions for Architecture

```sql
-- Get the DDL for any object
SELECT GET_DDL('TABLE', 'my_db.my_schema.my_table');
SELECT GET_DDL('DATABASE', 'my_db');
SELECT GET_DDL('SCHEMA', 'my_db.my_schema');
SELECT GET_DDL('WAREHOUSE', 'my_warehouse');

-- Check if a feature is enabled (undocumented but useful)
SELECT SYSTEM$BEHAVIOR_CHANGE_BUNDLE_STATUS('2024_08');

-- Get warehouse load metrics
SELECT SYSTEM$WAREHOUSE_LOAD_HISTORY('my_warehouse');
```

#### 15.2 Pipe Operator for Post-Processing SHOW Output

```sql
-- Modern syntax using the pipe operator (->>)
-- Post-process SHOW WAREHOUSES output inline
SHOW WAREHOUSES ->> SELECT "name", "size", "state" WHERE "state" = 'ACTIVE';

-- Post-process SHOW TABLES output
SHOW TABLES IN DATABASE my_db ->> SELECT "name", "rows" WHERE "rows" > 0;
```

**Exam tip:** The pipe operator (->>) is a newer syntax alternative to RESULT_SCAN for
post-processing SHOW command output. Both approaches work; the pipe operator is more concise.

---

### 16. TAGS AND GOVERNANCE (Architecture-Level)

```sql
-- Create a tag (account or schema level)
CREATE TAG cost_center ALLOWED_VALUES 'engineering', 'marketing', 'sales';

-- Apply tag to a warehouse
ALTER WAREHOUSE my_wh SET TAG cost_center = 'engineering';

-- Apply tag to a database
ALTER DATABASE my_db SET TAG cost_center = 'marketing';

-- Query tag references
SELECT *
FROM TABLE(INFORMATION_SCHEMA.TAG_REFERENCES('my_db.my_schema.my_table', 'TABLE'));

-- Account-wide tag references (ACCOUNT_USAGE, 2-hour latency)
SELECT *
FROM SNOWFLAKE.ACCOUNT_USAGE.TAG_REFERENCES
WHERE tag_name = 'COST_CENTER';
```

---

### 17. QUICK REFERENCE: COMMANDS THAT DO NOT REQUIRE A WAREHOUSE

| Command Category  | Examples                                                 |
| ----------------- | -------------------------------------------------------- |
| SHOW commands     | SHOW DATABASES, SHOW TABLES, SHOW WAREHOUSES, SHOW ROLES |
| DESCRIBE commands | DESC TABLE, DESC WAREHOUSE, DESC USER                    |
| USE commands      | USE DATABASE, USE SCHEMA, USE WAREHOUSE, USE ROLE        |
| DDL               | CREATE/ALTER/DROP DATABASE/SCHEMA/TABLE/VIEW/WAREHOUSE   |
| DCL               | GRANT, REVOKE                                            |
| Context functions | CURRENT_USER(), CURRENT_ROLE(), CURRENT_WAREHOUSE()      |
| SHOW PARAMETERS   | All levels (session, account, object)                    |
| Cached results    | When query result cache conditions are met               |
| LIST @stage       | Lists files in a stage                                   |
| EXPLAIN           | Shows query plan without execution                       |

---

### 18. QUICK REFERENCE: KEY ROLE REQUIREMENTS

| Operation                          | Minimum Role                                       |
| ---------------------------------- | -------------------------------------------------- |
| CREATE RESOURCE MONITOR            | ACCOUNTADMIN                                       |
| ALTER ACCOUNT SET RESOURCE_MONITOR | ACCOUNTADMIN                                       |
| ALTER ACCOUNT SET parameters       | ACCOUNTADMIN                                       |
| SHOW ORGANIZATION ACCOUNTS         | GLOBALORGADMIN (org account)                       |
| CREATE ORGANIZATION ACCOUNT        | GLOBALORGADMIN                                     |
| SHOW ACCOUNTS (all in org)         | ORGADMIN or GLOBALORGADMIN                         |
| ALTER ACCOUNT RENAME               | ORGADMIN                                           |
| Access SNOWFLAKE.ACCOUNT_USAGE     | ACCOUNTADMIN (or granted IMPORTED PRIVILEGES)      |
| CREATE WAREHOUSE                   | SYSADMIN (or role with CREATE WAREHOUSE privilege) |
| CREATE DATABASE                    | SYSADMIN (or role with CREATE DATABASE privilege)  |

---

### 19. EXAM DAY MENTAL CHECKLIST FOR DOMAIN 1

1. **Three architecture layers:** Storage (S3/Azure Blob/GCS), Compute (Virtual Warehouses), Cloud Services (metadata, auth, optimization)
2. **Warehouse sizing:** Each size = 2x previous. XS=1 credit/hr. Billed per-second, 60s minimum.
3. **Multi-cluster = Enterprise+.** Auto-scale (MIN < MAX) vs Maximized (MIN = MAX).
4. **Resource monitors:** ACCOUNTADMIN creates. 3 actions: NOTIFY, SUSPEND, SUSPEND_IMMEDIATE.
5. **Caching:** Result cache (Cloud Services, 24hr, shared), Warehouse cache (local SSD), Metadata cache (Cloud Services).
6. **Result cache conditions:** Exact same SQL text + data unchanged + no non-deterministic functions + privileges + 24hr window.
7. **INFORMATION_SCHEMA:** Per-database, real-time, 7 days, no dropped objects.
8. **ACCOUNT_USAGE:** Account-wide, 45min-3hr latency, 365 days, includes dropped objects.
9. **Metadata ops = no warehouse.** DDL, SHOW, DESCRIBE, context functions, USE, cached results.
10. **Table types:** Permanent (full protection), Transient (no fail-safe, 0-1 day TT), Temporary (session-only, no fail-safe, 0-1 day TT).
11. **Clustering:** Low-to-high cardinality order. Depth close to 1 = well-clustered. 1000+ partitions needed.
12. **Search Optimization = table-level (Enterprise+).** QAS = warehouse-level (Enterprise+).
13. **Parameters:** Account (no override) > Session (user/session override) > Object (hierarchy override).
14. **Cloud Services billing:** Free if < 10% of daily warehouse compute.
15. **Editions:** Standard < Enterprise (multi-cluster, MV, SOS, 90-day TT) < Business Critical (PrivateLink, Tri-Secret, failover) < VPS (isolated).

---

## Domain 2: Account Access & Security -- SQL Syntax Cheat Sheet

> **SnowPro Core COF-C02 Exam** | Weight: 20-25%
>
> This document covers every critical SQL command, syntax pattern, and configuration
> related to Snowflake account access and security. Organized by subcategory for
> rapid memorization.

---

### Table of Contents

1. [User Management](#1-user-management)
2. [Role Management](#2-role-management)
3. [System-Defined Roles Hierarchy](#3-system-defined-roles-hierarchy)
4. [GRANT / REVOKE Privileges](#4-grant--revoke-privileges)
5. [GRANT OWNERSHIP](#5-grant-ownership)
6. [Future Grants](#6-future-grants)
7. [SHOW GRANTS (Auditing Access)](#7-show-grants-auditing-access)
8. [Network Policies & Network Rules](#8-network-policies--network-rules)
9. [Authentication Policies & MFA](#9-authentication-policies--mfa)
10. [Key Pair Authentication](#10-key-pair-authentication)
11. [Federated Authentication / SSO (SAML2)](#11-federated-authentication--sso-saml2)
12. [SCIM Integration (User Provisioning)](#12-scim-integration-user-provisioning)
13. [Dynamic Data Masking (Column-Level Security)](#13-dynamic-data-masking-column-level-security)
14. [Row Access Policies](#14-row-access-policies)
15. [Object Tagging](#15-object-tagging)
16. [Session Policies](#16-session-policies)
17. [Password Policies](#17-password-policies)
18. [Encryption & Tri-Secret Secure](#18-encryption--tri-secret-secure)
19. [Access History & Login History (Auditing)](#19-access-history--login-history-auditing)
20. [User Types (PERSON / SERVICE / LEGACY_SERVICE)](#20-user-types-person--service--legacy_service)

---

### 1. User Management

```sql
-- CREATE a new user with common properties
CREATE USER janesmith
  PASSWORD = 'S3cur3Pa$$!'
  LOGIN_NAME = 'JANESMITH'
  DISPLAY_NAME = 'Jane Smith'
  FIRST_NAME = 'Jane'
  LAST_NAME = 'Smith'
  EMAIL = 'jane@example.com'
  DEFAULT_ROLE = analyst_role
  DEFAULT_WAREHOUSE = compute_wh
  DEFAULT_NAMESPACE = mydb.public
  MUST_CHANGE_PASSWORD = TRUE;
```

```sql
-- ALTER USER: change properties
ALTER USER janesmith SET
  DEFAULT_ROLE = data_engineer
  DEFAULT_WAREHOUSE = etl_wh
  DEFAULT_NAMESPACE = prod_db.analytics
  DEFAULT_SECONDARY_ROLES = ('ALL');
```

```sql
-- ALTER USER: reset password
ALTER USER janesmith SET PASSWORD = 'N3wPa$$word!';
```

```sql
-- ALTER USER: disable/enable a user
ALTER USER janesmith SET DISABLED = TRUE;
ALTER USER janesmith SET DISABLED = FALSE;
```

```sql
-- ALTER USER: set days until password expires
ALTER USER janesmith SET DAYS_TO_EXPIRY = 90;
```

```sql
-- ALTER USER: force password change on next login
ALTER USER janesmith SET MUST_CHANGE_PASSWORD = TRUE;
```

```sql
-- ALTER USER: rename a user
ALTER USER janesmith RENAME TO jane_smith;
```

```sql
-- DROP a user
DROP USER IF EXISTS janesmith;
```

```sql
-- DESCRIBE a user (show all properties)
DESCRIBE USER janesmith;
-- or
DESC USER janesmith;
```

```sql
-- SHOW all users
SHOW USERS;

-- SHOW users matching a pattern
SHOW USERS LIKE 'jane%';
```

> **EXAM TIP**: Only users with USERADMIN role (or higher), or a role with
> CREATE USER privilege, can create users. Setting DEFAULT_ROLE does NOT
> grant that role -- you must still run GRANT ROLE explicitly.

---

### 2. Role Management

```sql
-- CREATE a custom role
CREATE ROLE data_engineer;

-- CREATE a role with a comment
CREATE ROLE analyst_role COMMENT = 'Read-only analytics role';

-- CREATE OR REPLACE a role
CREATE OR REPLACE ROLE analyst_role COMMENT = 'Updated analyst role';
```

```sql
-- ALTER ROLE: rename
ALTER ROLE analyst_role RENAME TO analytics_role;

-- ALTER ROLE: add/change comment
ALTER ROLE analytics_role SET COMMENT = 'For BI team read access';

-- ALTER ROLE: remove comment
ALTER ROLE analytics_role UNSET COMMENT;
```

```sql
-- DROP a role
DROP ROLE IF EXISTS analytics_role;
```

```sql
-- GRANT a role to a user
GRANT ROLE analyst_role TO USER janesmith;

-- GRANT a role to another role (build hierarchy)
GRANT ROLE analyst_role TO ROLE sysadmin;

-- REVOKE a role from a user
REVOKE ROLE analyst_role FROM USER janesmith;

-- REVOKE a role from another role
REVOKE ROLE analyst_role FROM ROLE sysadmin;
```

```sql
-- SHOW all roles
SHOW ROLES;

-- SHOW roles matching a pattern
SHOW ROLES LIKE 'data%';
```

```sql
-- USE a specific role in session
USE ROLE analyst_role;

-- USE a secondary role
USE SECONDARY ROLES ALL;
USE SECONDARY ROLES NONE;
```

> **EXAM TIP**: When a role is dropped, ALL grants associated with that role
> (both as grantor and grantee) are automatically revoked. Custom roles should
> be granted to SYSADMIN to maintain the hierarchy. ACCOUNTADMIN should never
> be a user's DEFAULT_ROLE.

---

### 3. System-Defined Roles Hierarchy

```text
ACCOUNTADMIN (top-level)
  |-- SECURITYADMIN
  |     |-- USERADMIN
  |-- SYSADMIN
  |     |-- (all custom roles should roll up here)
  |
  PUBLIC (granted to every user and role automatically)
```

| Role              | Key Privileges                                                                                 | Exam Notes                                                |
| ----------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **ACCOUNTADMIN**  | Encapsulates SYSADMIN + SECURITYADMIN. Manages billing, resource monitors, reader accounts.    | NOT a superuser. Limit to few trusted users. Require MFA. |
| **SECURITYADMIN** | MANAGE GRANTS global privilege. Inherits USERADMIN. Can grant/revoke privileges on ANY object. | Can manage any grant in the account.                      |
| **USERADMIN**     | CREATE USER, CREATE ROLE privileges.                                                           | Manages users/roles it owns.                              |
| **SYSADMIN**      | Creates/manages warehouses, databases, schemas, and all DB objects.                            | All custom roles should roll up to SYSADMIN.              |
| **PUBLIC**        | Minimal, default privileges. Auto-granted to every user and role.                              | Cannot be dropped.                                        |
| **ORGADMIN**      | Manages operations across accounts in an organization.                                         | Org-level only.                                           |

```sql
-- Verify system-defined roles
SHOW ROLES LIKE 'ACCOUNT%';
SHOW ROLES LIKE 'SYS%';
SHOW ROLES LIKE 'SECURITY%';
SHOW ROLES LIKE 'USER%';
SHOW ROLES LIKE 'PUBLIC';
```

> **EXAM TIP**: The MANAGE GRANTS privilege (held by SECURITYADMIN) allows
> granting/revoking privileges on ANY object in the account, even objects
> the role does not own. ACCOUNTADMIN inherits this through SECURITYADMIN.
> SYSADMIN does NOT have MANAGE GRANTS.

---

### 4. GRANT / REVOKE Privileges

#### Granting Privileges on Objects

```sql
-- GRANT privileges on a DATABASE
GRANT USAGE ON DATABASE mydb TO ROLE analyst_role;
GRANT CREATE SCHEMA ON DATABASE mydb TO ROLE data_engineer;
GRANT ALL PRIVILEGES ON DATABASE mydb TO ROLE admin_role;

-- GRANT privileges on a SCHEMA
GRANT USAGE ON SCHEMA mydb.public TO ROLE analyst_role;
GRANT CREATE TABLE ON SCHEMA mydb.public TO ROLE data_engineer;
GRANT CREATE VIEW ON SCHEMA mydb.public TO ROLE data_engineer;

-- GRANT privileges on a TABLE
GRANT SELECT ON TABLE mydb.public.customers TO ROLE analyst_role;
GRANT INSERT, UPDATE, DELETE ON TABLE mydb.public.orders TO ROLE data_engineer;
GRANT ALL PRIVILEGES ON TABLE mydb.public.staging TO ROLE loader_role;

-- GRANT privileges on ALL tables in a schema
GRANT SELECT ON ALL TABLES IN SCHEMA mydb.public TO ROLE analyst_role;

-- GRANT privileges on ALL tables in a database
GRANT SELECT ON ALL TABLES IN DATABASE mydb TO ROLE analyst_role;

-- GRANT privileges on a VIEW
GRANT SELECT ON VIEW mydb.public.customer_vw TO ROLE analyst_role;

-- GRANT privileges on a WAREHOUSE
GRANT USAGE ON WAREHOUSE compute_wh TO ROLE analyst_role;
GRANT OPERATE ON WAREHOUSE compute_wh TO ROLE data_engineer;
GRANT MONITOR ON WAREHOUSE compute_wh TO ROLE dba_role;
GRANT ALL PRIVILEGES ON WAREHOUSE compute_wh TO ROLE admin_role;

-- GRANT privileges on a STAGE
GRANT USAGE ON STAGE mydb.public.my_stage TO ROLE loader_role;
GRANT READ ON STAGE mydb.public.my_stage TO ROLE loader_role;
GRANT WRITE ON STAGE mydb.public.my_stage TO ROLE loader_role;

-- GRANT privileges on a FILE FORMAT
GRANT USAGE ON FILE FORMAT mydb.public.csv_format TO ROLE loader_role;

-- GRANT privileges on a FUNCTION / PROCEDURE
GRANT USAGE ON FUNCTION mydb.public.my_udf(VARCHAR) TO ROLE analyst_role;
GRANT USAGE ON PROCEDURE mydb.public.my_proc(INT) TO ROLE data_engineer;

-- GRANT privileges on a STREAM
GRANT SELECT ON STREAM mydb.public.my_stream TO ROLE data_engineer;

-- GRANT privileges on a TASK
GRANT MONITOR ON TASK mydb.public.my_task TO ROLE data_engineer;
GRANT OPERATE ON TASK mydb.public.my_task TO ROLE data_engineer;
```

#### Account-Level (Global) Privileges

```sql
-- GRANT account-level privileges
GRANT CREATE DATABASE ON ACCOUNT TO ROLE sysadmin;
GRANT CREATE WAREHOUSE ON ACCOUNT TO ROLE sysadmin;
GRANT CREATE ROLE ON ACCOUNT TO ROLE useradmin;
GRANT CREATE USER ON ACCOUNT TO ROLE useradmin;
GRANT MANAGE GRANTS ON ACCOUNT TO ROLE securityadmin;
GRANT MONITOR USAGE ON ACCOUNT TO ROLE monitor_role;
GRANT CREATE INTEGRATION ON ACCOUNT TO ROLE admin_role;
GRANT EXECUTE TASK ON ACCOUNT TO ROLE etl_role;
GRANT EXECUTE MANAGED TASK ON ACCOUNT TO ROLE etl_role;
```

#### WITH GRANT OPTION

```sql
-- Allow the recipient to re-grant the privilege to other roles
GRANT SELECT ON TABLE mydb.public.customers TO ROLE analyst_role
  WITH GRANT OPTION;
```

#### REVOKE Privileges

```sql
-- REVOKE a specific privilege
REVOKE SELECT ON TABLE mydb.public.customers FROM ROLE analyst_role;

-- REVOKE all privileges
REVOKE ALL PRIVILEGES ON DATABASE mydb FROM ROLE analyst_role;

-- REVOKE with CASCADE (revoke dependent grants too)
REVOKE SELECT ON TABLE mydb.public.customers FROM ROLE analyst_role CASCADE;

-- REVOKE the GRANT OPTION only (keep the privilege)
REVOKE GRANT OPTION FOR SELECT ON TABLE mydb.public.customers FROM ROLE analyst_role;
```

> **EXAM TIP**: Warehouse privileges to know:
>
> - USAGE = can use the warehouse to execute queries
> - OPERATE = can start/stop/suspend/resume the warehouse
> - MONITOR = can monitor the warehouse (view queries, usage)
> - MODIFY = can change warehouse properties (size, etc.)
>
> A REVOKE only removes grants made by the active role (or lower in hierarchy).
> Parallel grants by other grantors are NOT affected.

---

### 5. GRANT OWNERSHIP

```sql
-- Transfer ownership of a single object
GRANT OWNERSHIP ON TABLE mydb.myschema.mytable
  TO ROLE data_engineer
  COPY CURRENT GRANTS;

-- Transfer ownership with REVOKE (removes existing grants)
GRANT OWNERSHIP ON TABLE mydb.myschema.mytable
  TO ROLE data_engineer
  REVOKE CURRENT GRANTS;

-- Transfer ownership of ALL tables in a schema
GRANT OWNERSHIP ON ALL TABLES IN SCHEMA mydb.myschema
  TO ROLE data_engineer
  COPY CURRENT GRANTS;

-- Transfer ownership of ALL tables in a database
GRANT OWNERSHIP ON ALL TABLES IN DATABASE mydb
  TO ROLE data_engineer
  REVOKE CURRENT GRANTS;

-- Transfer ownership of FUTURE tables in a schema
GRANT OWNERSHIP ON FUTURE TABLES IN SCHEMA mydb.myschema
  TO ROLE data_engineer
  COPY CURRENT GRANTS;

-- Transfer ownership of a DATABASE
GRANT OWNERSHIP ON DATABASE mydb
  TO ROLE sysadmin
  COPY CURRENT GRANTS;

-- Transfer ownership of a SCHEMA
GRANT OWNERSHIP ON SCHEMA mydb.public
  TO ROLE data_engineer
  COPY CURRENT GRANTS;

-- Transfer ownership of a WAREHOUSE
GRANT OWNERSHIP ON WAREHOUSE compute_wh
  TO ROLE sysadmin
  COPY CURRENT GRANTS;

-- Transfer ownership of a ROLE
GRANT OWNERSHIP ON ROLE analyst_role
  TO ROLE securityadmin;
```

> **EXAM TIP**: COPY CURRENT GRANTS vs REVOKE CURRENT GRANTS:
>
> - COPY = new owner inherits all existing privilege grants on the object
> - REVOKE = all existing privilege grants on the object are removed
> - If neither is specified and outbound grants exist, the command FAILS
>   (except for roles, which don't require the clause).
> - Cannot REVOKE CURRENT GRANTS on a database granted to a share.
> - Tasks must be suspended and pipes must be paused before ownership transfer.
> - You cannot directly "revoke" ownership; you must transfer it to another role.

---

### 6. Future Grants

```sql
-- Grant SELECT on all FUTURE tables in a SCHEMA
GRANT SELECT ON FUTURE TABLES IN SCHEMA mydb.myschema TO ROLE analyst_role;

-- Grant SELECT on all FUTURE tables in a DATABASE
GRANT SELECT ON FUTURE TABLES IN DATABASE mydb TO ROLE analyst_role;

-- Grant USAGE on all FUTURE schemas in a DATABASE
GRANT USAGE ON FUTURE SCHEMAS IN DATABASE mydb TO ROLE analyst_role;

-- Grant multiple privileges on FUTURE tables
GRANT SELECT, INSERT, UPDATE ON FUTURE TABLES IN SCHEMA mydb.myschema TO ROLE data_engineer;

-- Grant USAGE on FUTURE views
GRANT SELECT ON FUTURE VIEWS IN SCHEMA mydb.myschema TO ROLE analyst_role;

-- Grant on FUTURE stages
GRANT READ ON FUTURE STAGES IN SCHEMA mydb.myschema TO ROLE loader_role;

-- REVOKE future grants
REVOKE SELECT ON FUTURE TABLES IN SCHEMA mydb.myschema FROM ROLE analyst_role;

-- SHOW future grants
SHOW FUTURE GRANTS IN SCHEMA mydb.myschema;
SHOW FUTURE GRANTS IN DATABASE mydb;
```

> **EXAM TIP**: CRITICAL PRECEDENCE RULE -- When future grants exist at BOTH
> the database level AND schema level for the same object type, the SCHEMA-level
> future grants take precedence and the DATABASE-level grants are IGNORED
> for that schema.
>
> Future grants define INITIAL privileges. Admins can still add/revoke
> additional privileges on individual objects after creation.
>
> Future grants are NOT applied when renaming or swapping a table. They ARE
> copied when a database or schema is cloned.

---

### 7. SHOW GRANTS (Auditing Access)

```sql
-- Show all privileges granted TO a role
SHOW GRANTS TO ROLE analyst_role;

-- Show all roles granted TO a user
SHOW GRANTS TO USER janesmith;

-- Show all roles granted to the CURRENT user
SHOW GRANTS TO USER;

-- Show all privileges granted ON a specific object
SHOW GRANTS ON DATABASE mydb;
SHOW GRANTS ON SCHEMA mydb.public;
SHOW GRANTS ON TABLE mydb.public.customers;
SHOW GRANTS ON WAREHOUSE compute_wh;
SHOW GRANTS ON VIEW mydb.public.my_view;

-- Show all account-level (global) privileges
SHOW GRANTS ON ACCOUNT;

-- Show all users and roles to which a role has been granted (WHO has this role?)
SHOW GRANTS OF ROLE analyst_role;
SHOW GRANTS OF ROLE accountadmin;

-- Show all privileges granted to a SHARE
SHOW GRANTS TO SHARE my_share;

-- Show future grants in a schema or database
SHOW FUTURE GRANTS IN SCHEMA mydb.myschema;
SHOW FUTURE GRANTS IN DATABASE mydb;
```

#### Quick Reference Table

| Syntax                    | Question It Answers                        |
| ------------------------- | ------------------------------------------ |
| `SHOW GRANTS TO ROLE x`   | "What privileges does role x have?"        |
| `SHOW GRANTS TO USER x`   | "What roles does user x have?"             |
| `SHOW GRANTS ON <object>` | "Who has access to this object?"           |
| `SHOW GRANTS OF ROLE x`   | "Who (users/roles) has been given role x?" |
| `SHOW GRANTS ON ACCOUNT`  | "What global privileges are assigned?"     |

> **EXAM TIP**: SHOW GRANTS does NOT require a running warehouse. The PUBLIC
> role is NOT listed in SHOW GRANTS TO USER output. SHOW GRANTS OF ROLE is
> the way to find out who has the ACCOUNTADMIN role -- important for auditing.

---

### 8. Network Policies & Network Rules

#### Traditional Network Policies (IP Lists)

```sql
-- CREATE a network policy with allowed/blocked IP lists
CREATE OR REPLACE NETWORK POLICY office_policy
  ALLOWED_IP_LIST = ('192.168.1.0/24', '10.0.0.0/8')
  BLOCKED_IP_LIST = ('192.168.1.99')
  COMMENT = 'Allow office IPs, block specific machine';
```

```sql
-- ALTER a network policy
ALTER NETWORK POLICY office_policy SET
  ALLOWED_IP_LIST = ('192.168.1.0/24', '10.0.0.0/8', '172.16.0.0/12');

-- Add to blocked list
ALTER NETWORK POLICY office_policy SET
  BLOCKED_IP_LIST = ('192.168.1.99', '192.168.1.100');
```

```sql
-- ACTIVATE network policy at ACCOUNT level
ALTER ACCOUNT SET NETWORK_POLICY = office_policy;

-- ACTIVATE network policy for a specific USER
ALTER USER janesmith SET NETWORK_POLICY = office_policy;

-- UNSET (remove) network policy from account
ALTER ACCOUNT UNSET NETWORK_POLICY;

-- UNSET network policy from user
ALTER USER janesmith UNSET NETWORK_POLICY;
```

```sql
-- DROP a network policy
DROP NETWORK POLICY IF EXISTS office_policy;

-- SHOW all network policies
SHOW NETWORK POLICIES;

-- DESCRIBE a network policy
DESCRIBE NETWORK POLICY office_policy;
```

#### Modern Network Rules (Recommended)

```sql
-- CREATE a network rule (IPv4, INGRESS)
CREATE NETWORK RULE allow_office_ips
  TYPE = IPV4
  MODE = INGRESS
  VALUE_LIST = ('192.168.1.0/24', '10.0.0.0/8');

-- CREATE a network rule (block specific IP)
CREATE NETWORK RULE block_bad_ip
  TYPE = IPV4
  MODE = INGRESS
  VALUE_LIST = ('192.168.1.99');

-- CREATE a network rule (AWS VPC Endpoint)
CREATE NETWORK RULE allow_vpc_endpoint
  TYPE = AWSVPCEID
  MODE = INGRESS
  VALUE_LIST = ('vpce-0fa383eb170331202');

-- CREATE a network rule (Azure Private Link)
CREATE NETWORK RULE allow_azure_link
  TYPE = AZURELINKID
  MODE = INGRESS
  VALUE_LIST = ('/subscriptions/.../privateEndpoints/my-endpoint');

-- CREATE a network rule (EGRESS for external access)
CREATE NETWORK RULE allow_external_api
  TYPE = HOST_PORT
  MODE = EGRESS
  VALUE_LIST = ('api.example.com:443', 'data.example.com:443');

-- CREATE a network rule (internal stage access via VPC endpoint)
CREATE NETWORK RULE corporate_stage_access
  TYPE = AWSVPCEID
  MODE = INTERNAL_STAGE
  VALUE_LIST = ('vpce-123abc3420c1931');
```

```sql
-- CREATE a network policy USING network rules (modern approach)
CREATE OR REPLACE NETWORK POLICY modern_policy
  ALLOWED_NETWORK_RULE_LIST = ('allow_office_ips', 'allow_vpc_endpoint')
  BLOCKED_NETWORK_RULE_LIST = ('block_bad_ip');
```

> **EXAM TIP**: Network policy precedence (most specific wins):
>
> 1. Security integration-level policy (most specific)
> 2. User-level policy
> 3. Account-level policy (least specific)
>
> BLOCKED_IP_LIST takes precedence over ALLOWED_IP_LIST.
> Your own IP must be in ALLOWED_IP_LIST before activating at account level (self-lockout prevention).
> Only SECURITYADMIN or higher (or ACCOUNTADMIN) can create/activate network policies.
>
> Network rule TYPE values: IPV4, AWSVPCEID, AZURELINKID, GCPPSCID, HOST_PORT, PRIVATE_HOST_PORT
> Network rule MODE values: INGRESS (inbound), INTERNAL_STAGE (stage access), EGRESS (outbound)

---

### 9. Authentication Policies & MFA

```sql
-- CREATE an authentication policy requiring MFA
CREATE AUTHENTICATION POLICY require_mfa_policy
  AUTHENTICATION_METHODS = ('PASSWORD')
  MFA_ENROLLMENT = 'REQUIRED'
  CLIENT_TYPES = ('SNOWFLAKE_UI', 'SNOWSQL', 'DRIVERS')
  COMMENT = 'Require MFA for all password-based auth';
```

```sql
-- CREATE an authentication policy allowing only SSO
CREATE AUTHENTICATION POLICY sso_only_policy
  AUTHENTICATION_METHODS = ('SAML')
  COMMENT = 'Only allow SSO authentication';
```

```sql
-- CREATE a policy with specific MFA methods
CREATE AUTHENTICATION POLICY strict_mfa_policy
  MFA_ENROLLMENT = 'REQUIRED'
  MFA_POLICY = (ALLOWED_METHODS = ('TOTP', 'PASSKEY'));
```

```sql
-- APPLY authentication policy at account level
ALTER ACCOUNT SET AUTHENTICATION POLICY = require_mfa_policy;

-- APPLY authentication policy to a specific user
ALTER USER janesmith SET AUTHENTICATION POLICY = require_mfa_policy;

-- UNSET authentication policy
ALTER ACCOUNT UNSET AUTHENTICATION POLICY;
ALTER USER janesmith UNSET AUTHENTICATION POLICY;
```

```sql
-- SHOW / DESCRIBE authentication policies
SHOW AUTHENTICATION POLICIES;
DESCRIBE AUTHENTICATION POLICY require_mfa_policy;
```

```sql
-- ALTER USER: temporarily bypass MFA (in minutes)
ALTER USER janesmith SET MINS_TO_BYPASS_MFA = 60;

-- ALTER USER: disable MFA for a user (legacy, not recommended)
ALTER USER janesmith SET DISABLE_MFA = TRUE;
```

> **EXAM TIP**: MFA_ENROLLMENT values: REQUIRED, REQUIRED_PASSWORD_ONLY, OPTIONAL
> MFA methods: TOTP (authenticator app), PASSKEY, OTP, DUO
> Authentication policies are Enterprise Edition or higher.
> Snowflake is deprecating single-factor password logins by late 2026.
> SERVICE users cannot use passwords (must use key pair or OAuth).
> LEGACY_SERVICE users can still use passwords (transitional, being deprecated).

---

### 10. Key Pair Authentication

#### Step 1: Generate Keys (OpenSSL on local machine)

```bash
# Generate a 2048-bit RSA private key (PKCS#8 format, unencrypted)
openssl genrsa 2048 | openssl pkcs8 -topk8 -inform PEM -out rsa_key.p8 -nocrypt

# Generate a 2048-bit RSA private key (PKCS#8 format, encrypted with passphrase)
openssl genrsa 2048 | openssl pkcs8 -topk8 -v2 aes256 -inform PEM -out rsa_key.p8

# Generate the public key from the private key
openssl rsa -in rsa_key.p8 -pubout -out rsa_key.pub
```

#### Step 2: Assign Public Key to User

```sql
-- Assign the public key (exclude BEGIN/END delimiters and line breaks)
ALTER USER service_account SET RSA_PUBLIC_KEY = 'MIIBIjANBgkqh...';
```

#### Step 3: Verify the Key Fingerprint

```sql
-- Check the user's key fingerprint
DESC USER service_account;
-- Look at RSA_PUBLIC_KEY_FP property
```

#### Key Pair Rotation

```sql
-- Assign a SECOND public key (for rotation)
ALTER USER service_account SET RSA_PUBLIC_KEY_2 = 'MIIBIjANBgkqh...NEW...';

-- After verifying the new key works, remove the old key
ALTER USER service_account UNSET RSA_PUBLIC_KEY;
```

> **EXAM TIP**: Key pair authentication requires a MINIMUM 2048-bit RSA key pair.
> Snowflake supports TWO active public keys per user (RSA_PUBLIC_KEY and
> RSA_PUBLIC_KEY_2) for uninterrupted rotation.
> Key pair auth is the recommended method for service accounts/programmatic access.
> The private key is NEVER stored in Snowflake -- only the public key is assigned.

---

### 11. Federated Authentication / SSO (SAML2)

```sql
-- CREATE a SAML2 security integration for SSO
CREATE SECURITY INTEGRATION my_sso_integration
  TYPE = SAML2
  ENABLED = TRUE
  SAML2_ISSUER = 'https://idp.example.com/issuer'
  SAML2_SSO_URL = 'https://idp.example.com/sso/saml'
  SAML2_PROVIDER = 'CUSTOM'       -- or 'OKTA', 'ADFS'
  SAML2_X509_CERT = 'MIIDpDCCA...'
  SAML2_SP_INITIATED_LOGIN_PAGE_LABEL = 'My Company SSO'
  SAML2_ENABLE_SP_INITIATED = TRUE
  SAML2_SNOWFLAKE_ACS_URL = 'https://myaccount.snowflakecomputing.com/fed/login'
  SAML2_SNOWFLAKE_ISSUER_URL = 'https://myaccount.snowflakecomputing.com';
```

```sql
-- ALTER a SAML2 integration
ALTER SECURITY INTEGRATION my_sso_integration SET
  SAML2_ENABLE_SP_INITIATED = TRUE
  SAML2_FORCE_AUTHN = TRUE;
```

```sql
-- DESCRIBE the integration to get Snowflake metadata for IdP setup
DESCRIBE SECURITY INTEGRATION my_sso_integration;
```

```sql
-- SHOW all security integrations
SHOW SECURITY INTEGRATIONS;

-- SHOW only SAML2 integrations
SHOW SECURITY INTEGRATIONS LIKE '%sso%';
```

```sql
-- DROP a security integration
DROP SECURITY INTEGRATION IF EXISTS my_sso_integration;
```

> **EXAM TIP**: SAML2 = authentication/SSO. SCIM = user/group provisioning.
> Snowflake supports SP-initiated and IdP-initiated SSO.
> SAML2_PROVIDER values: CUSTOM, OKTA, ADFS.
> SAML2_FORCE_AUTHN = TRUE forces re-authentication (does not use IdP session).
> Multiple SAML2 integrations are supported (one per IdP).
> SSO is NOT automatically enabled by SCIM -- you need both integrations.

---

### 12. SCIM Integration (User Provisioning)

#### Okta SCIM Setup

```sql
-- Step 1: Create provisioner role
USE ROLE SECURITYADMIN;
CREATE ROLE IF NOT EXISTS okta_provisioner;
GRANT CREATE USER ON ACCOUNT TO ROLE okta_provisioner;
GRANT CREATE ROLE ON ACCOUNT TO ROLE okta_provisioner;
GRANT ROLE okta_provisioner TO ROLE accountadmin;

-- Step 2: Create SCIM security integration
USE ROLE ACCOUNTADMIN;
CREATE OR REPLACE SECURITY INTEGRATION okta_provisioning
  TYPE = SCIM
  SCIM_CLIENT = 'OKTA'
  RUN_AS_ROLE = 'OKTA_PROVISIONER'
  ENABLED = TRUE;

-- Step 3: Generate SCIM access token (valid for 6 months)
SELECT SYSTEM$GENERATE_SCIM_ACCESS_TOKEN('OKTA_PROVISIONING');
```

#### Azure AD (Entra ID) SCIM Setup

```sql
-- Step 1: Create provisioner role
USE ROLE SECURITYADMIN;
CREATE ROLE IF NOT EXISTS aad_provisioner;
GRANT CREATE USER ON ACCOUNT TO ROLE aad_provisioner;
GRANT CREATE ROLE ON ACCOUNT TO ROLE aad_provisioner;
GRANT ROLE aad_provisioner TO ROLE accountadmin;

-- Step 2: Create SCIM security integration
USE ROLE ACCOUNTADMIN;
CREATE OR REPLACE SECURITY INTEGRATION aad_provisioning
  TYPE = SCIM
  SCIM_CLIENT = 'AZURE'
  RUN_AS_ROLE = 'AAD_PROVISIONER'
  ENABLED = TRUE;

-- Step 3: Generate SCIM access token
SELECT SYSTEM$GENERATE_SCIM_ACCESS_TOKEN('AAD_PROVISIONING');
```

#### Generic SCIM Setup

```sql
CREATE OR REPLACE SECURITY INTEGRATION generic_scim_provisioning
  TYPE = SCIM
  SCIM_CLIENT = 'GENERIC'
  RUN_AS_ROLE = 'GENERIC_SCIM_PROVISIONER'
  ENABLED = TRUE;
```

```sql
-- Optional: attach a network policy to the SCIM integration
CREATE OR REPLACE SECURITY INTEGRATION okta_provisioning
  TYPE = SCIM
  SCIM_CLIENT = 'OKTA'
  RUN_AS_ROLE = 'OKTA_PROVISIONER'
  NETWORK_POLICY = 'scim_network_policy'
  SYNC_PASSWORD = TRUE;
```

> **EXAM TIP**: SCIM_CLIENT values: 'OKTA', 'AZURE', 'GENERIC'.
> RUN_AS_ROLE provisioner names are CASE-SENSITIVE and must be uppercase:
> OKTA_PROVISIONER, AAD_PROVISIONER, GENERIC_SCIM_PROVISIONER.
> SCIM access tokens are valid for 6 months.
> SYNC_PASSWORD is supported for Okta and Generic, NOT for Azure.
> SCIM provisions users/roles. It does NOT enable SSO (use SAML2 for that).
> The provisioner role needs CREATE USER + CREATE ROLE on ACCOUNT.

---

### 13. Dynamic Data Masking (Column-Level Security)

#### Create a Masking Policy

```sql
-- Basic masking: full mask for non-analysts
CREATE OR REPLACE MASKING POLICY mask_ssn
  AS (val STRING) RETURNS STRING ->
  CASE
    WHEN CURRENT_ROLE() IN ('HR_ADMIN') THEN val
    ELSE '***-**-****'
  END;
```

```sql
-- Partial email masking
CREATE OR REPLACE MASKING POLICY mask_email
  AS (val STRING) RETURNS STRING ->
  CASE
    WHEN CURRENT_ROLE() IN ('DATA_ENGINEER') THEN val
    WHEN CURRENT_ROLE() IN ('ANALYST') THEN REGEXP_REPLACE(val, '.+\@', '*****@')
    ELSE '********'
  END;
```

```sql
-- Numeric masking
CREATE OR REPLACE MASKING POLICY mask_salary
  AS (val NUMBER) RETURNS NUMBER ->
  CASE
    WHEN CURRENT_ROLE() IN ('HR_ADMIN', 'FINANCE') THEN val
    ELSE 0
  END;
```

```sql
-- Conditional masking (using a second column for context)
CREATE OR REPLACE MASKING POLICY mask_email_conditional
  AS (email VARCHAR, visibility STRING) RETURNS VARCHAR ->
  CASE
    WHEN CURRENT_ROLE() = 'ADMIN' THEN email
    WHEN visibility = 'Public' THEN email
    ELSE '***MASKED***'
  END;
```

```sql
-- Using IS_ROLE_IN_SESSION for role hierarchy support
CREATE OR REPLACE MASKING POLICY mask_pii
  AS (val STRING) RETURNS STRING ->
  CASE
    WHEN IS_ROLE_IN_SESSION('PII_ADMIN') THEN val
    ELSE '**REDACTED**'
  END;
```

#### Apply / Unset Masking Policies

```sql
-- APPLY masking policy to a table column
ALTER TABLE employees MODIFY COLUMN ssn
  SET MASKING POLICY mask_ssn;

-- APPLY masking policy to a view column
ALTER VIEW employee_vw MODIFY COLUMN ssn
  SET MASKING POLICY mask_ssn;

-- APPLY conditional masking (USING clause for multi-column)
ALTER TABLE employees MODIFY COLUMN email
  SET MASKING POLICY mask_email_conditional
  USING (email, visibility_flag);

-- UNSET (remove) masking policy from a column
ALTER TABLE employees MODIFY COLUMN ssn
  UNSET MASKING POLICY;
```

#### Masking Policy Governance Privileges

```sql
-- Grant ability to CREATE masking policies
GRANT CREATE MASKING POLICY ON SCHEMA mydb.myschema TO ROLE masking_admin;

-- Grant ability to APPLY masking policies to any object
GRANT APPLY MASKING POLICY ON ACCOUNT TO ROLE masking_admin;
```

```sql
-- SHOW masking policies
SHOW MASKING POLICIES;
SHOW MASKING POLICIES IN SCHEMA mydb.myschema;

-- DESCRIBE a masking policy
DESCRIBE MASKING POLICY mask_ssn;
```

> **EXAM TIP**: Masking policies are SCHEMA-LEVEL objects. They require
> Enterprise Edition or higher. The RETURN type MUST match the input type
> of the first argument. One masking policy can be applied to many columns.
> A column can only have ONE masking policy at a time.
> Use IS_ROLE_IN_SESSION() for role hierarchy awareness (CURRENT_ROLE()
> only checks the active primary role).
> Masking is applied at QUERY TIME -- data at rest is unchanged.
> The policy is applied everywhere the column appears in a query (SELECT,
> WHERE, JOIN, ORDER BY, GROUP BY).

---

### 14. Row Access Policies

#### Create a Row Access Policy

```sql
-- Simple role-based row filtering
CREATE OR REPLACE ROW ACCESS POLICY rap_by_role
  AS (region VARCHAR) RETURNS BOOLEAN ->
    CURRENT_ROLE() IN ('ADMIN', 'GLOBAL_READER')
    OR region = CURRENT_ROLE();
```

```sql
-- Row access using a mapping/entitlement table
CREATE OR REPLACE ROW ACCESS POLICY rap_with_mapping
  AS (region_value VARCHAR) RETURNS BOOLEAN ->
    EXISTS (
      SELECT 1 FROM security.entitlement_table
      WHERE role_name = CURRENT_ROLE()
        AND allowed_region = region_value
    );
```

```sql
-- Using IS_ROLE_IN_SESSION for hierarchy
CREATE OR REPLACE ROW ACCESS POLICY rap_hierarchy
  AS (department VARCHAR) RETURNS BOOLEAN ->
    IS_ROLE_IN_SESSION('SUPER_ADMIN')
    OR department = CURRENT_ROLE();
```

#### Apply / Remove Row Access Policies

```sql
-- ADD a row access policy to a table
ALTER TABLE sales ADD ROW ACCESS POLICY rap_by_role ON (region);

-- ADD a row access policy to a view
ALTER VIEW sales_vw ADD ROW ACCESS POLICY rap_by_role ON (region);

-- REMOVE (drop) a row access policy from a table
ALTER TABLE sales DROP ROW ACCESS POLICY rap_by_role;

-- You can also add a RAP during table creation
CREATE TABLE sales (
  id INT,
  region VARCHAR,
  amount NUMBER
) WITH ROW ACCESS POLICY rap_by_role ON (region);
```

#### Row Access Policy Governance Privileges

```sql
-- Grant ability to CREATE row access policies
GRANT CREATE ROW ACCESS POLICY ON SCHEMA mydb.security TO ROLE governance_role;

-- Grant ability to APPLY row access policies
GRANT APPLY ROW ACCESS POLICY ON ACCOUNT TO ROLE governance_role;
```

```sql
-- SHOW row access policies
SHOW ROW ACCESS POLICIES;
SHOW ROW ACCESS POLICIES IN SCHEMA mydb.security;

-- DESCRIBE a row access policy
DESCRIBE ROW ACCESS POLICY rap_by_role;
```

> **EXAM TIP**: Row access policies are SCHEMA-LEVEL objects. They return BOOLEAN
> (true = row visible, false = row hidden). Enterprise Edition or higher.
> A table can have only ONE row access policy at a time.
> If BOTH a masking policy and a row access policy exist on a table, the
> ROW ACCESS POLICY is evaluated FIRST.
> The same column CANNOT be used in both a masking policy signature and a
> row access policy signature simultaneously.
> UNDROP is NOT supported for row access policies.
> External tables CANNOT be used as mapping tables in a row access policy.

---

### 15. Object Tagging

#### Create Tags

```sql
-- Create a simple tag
CREATE TAG cost_center COMMENT = 'Identifies the cost center';

-- Create a tag with allowed values
CREATE OR REPLACE TAG pii_data
  ALLOWED_VALUES 'Names', 'Contact Details', 'Address', 'SSN';

-- Create a tag without allowed values (any string value accepted)
CREATE OR REPLACE TAG environment;

-- ALTER a tag to add/change allowed values
ALTER TAG pii_data ADD ALLOWED_VALUES 'Financial', 'Health';

-- ALTER a tag to remove allowed values
ALTER TAG pii_data DROP ALLOWED_VALUES 'SSN';
```

#### Assign Tags to Objects

```sql
-- Tag a TABLE
ALTER TABLE employees SET TAG cost_center = 'HR';

-- Tag a COLUMN
ALTER TABLE employees MODIFY COLUMN email SET TAG pii_data = 'Contact Details';
ALTER TABLE employees MODIFY COLUMN ssn SET TAG pii_data = 'SSN';

-- Tag a WAREHOUSE
ALTER WAREHOUSE compute_wh SET TAG cost_center = 'Engineering';

-- Tag a DATABASE
ALTER DATABASE mydb SET TAG environment = 'Production';

-- Tag a SCHEMA
ALTER SCHEMA mydb.public SET TAG environment = 'Production';

-- Tag a ROLE
ALTER ROLE analyst_role SET TAG cost_center = 'Analytics';

-- Tag a USER
ALTER USER janesmith SET TAG cost_center = 'Data Team';
```

```sql
-- UNSET tags from objects
ALTER TABLE employees UNSET TAG cost_center;
ALTER TABLE employees MODIFY COLUMN email UNSET TAG pii_data;
ALTER WAREHOUSE compute_wh UNSET TAG cost_center;
```

```sql
-- Assign tags DURING object creation
CREATE TABLE employees (
  id INT,
  name VARCHAR WITH TAG (pii_data = 'Names'),
  email VARCHAR WITH TAG (pii_data = 'Contact Details')
) WITH TAG (cost_center = 'HR');

CREATE WAREHOUSE dev_wh
  WAREHOUSE_SIZE = 'XSMALL'
  WITH TAG (cost_center = 'Development');
```

#### Tag Governance Privileges

```sql
-- Grant ability to CREATE tags
GRANT CREATE TAG ON SCHEMA mydb.governance TO ROLE tag_admin;

-- Grant ability to APPLY tags to any object
GRANT APPLY TAG ON ACCOUNT TO ROLE tag_admin;
```

#### Query Tags

```sql
-- Get all tags on columns in a table
SELECT * FROM TABLE(
  INFORMATION_SCHEMA.TAG_REFERENCES_ALL_COLUMNS('mydb.public.employees', 'TABLE')
);

-- Get all tags on a specific object
SELECT * FROM TABLE(
  INFORMATION_SCHEMA.TAG_REFERENCES('mydb.public.employees', 'TABLE')
);

-- Get the value of a specific tag on an object
SELECT SYSTEM$GET_TAG('pii_data', 'mydb.public.employees.email', 'COLUMN');
```

```sql
-- SHOW all tags
SHOW TAGS;
SHOW TAGS IN SCHEMA mydb.governance;

-- DESCRIBE a tag
DESCRIBE TAG pii_data;

-- DROP a tag
DROP TAG IF EXISTS pii_data;
```

> **EXAM TIP**: Tags are SCHEMA-LEVEL objects. Max 50 unique tags per object.
> Max 50 unique tags across ALL columns of a single table. Tag values are
> always STRINGS (max 256 chars). Tags support INHERITANCE -- a tag on a
> database is inherited by all schemas, tables, and columns within it.
> Tag-based masking policies: you can assign a masking policy to a tag, and
> it automatically protects all columns with that tag.
> Tags require Enterprise Edition or higher.

---

### 16. Session Policies

```sql
-- CREATE a session policy
CREATE OR REPLACE SESSION POLICY prod_session_policy
  SESSION_IDLE_TIMEOUT_MINS = 30
  SESSION_UI_IDLE_TIMEOUT_MINS = 15
  COMMENT = 'Production session timeout policy';
```

```sql
-- CREATE a session policy with secondary role controls
CREATE OR REPLACE SESSION POLICY restricted_session_policy
  SESSION_IDLE_TIMEOUT_MINS = 60
  SESSION_UI_IDLE_TIMEOUT_MINS = 30
  ALLOWED_SECONDARY_ROLES = ('analyst_role', 'reader_role')
  COMMENT = 'Limits available secondary roles';
```

```sql
-- ALTER a session policy
ALTER SESSION POLICY prod_session_policy SET
  SESSION_IDLE_TIMEOUT_MINS = 45;

ALTER SESSION POLICY prod_session_policy SET
  SESSION_UI_IDLE_TIMEOUT_MINS = 10;
```

```sql
-- APPLY session policy at ACCOUNT level
ALTER ACCOUNT SET SESSION POLICY mydb.policies.prod_session_policy;

-- APPLY session policy to a specific USER (overrides account policy)
ALTER USER janesmith SET SESSION POLICY mydb.policies.prod_session_policy;

-- UNSET (remove) session policy
ALTER ACCOUNT UNSET SESSION POLICY;
ALTER USER janesmith UNSET SESSION POLICY;
```

```sql
-- SHOW / DESCRIBE session policies
SHOW SESSION POLICIES;
DESCRIBE SESSION POLICY prod_session_policy;

-- DROP a session policy
DROP SESSION POLICY IF EXISTS prod_session_policy;
```

#### Session Policy Governance Privileges

```sql
-- Grant ability to create session policies
GRANT CREATE SESSION POLICY ON SCHEMA mydb.policies TO ROLE policy_admin;

-- Grant ability to apply session policies at account or user level
GRANT APPLY SESSION POLICY ON ACCOUNT TO ROLE policy_admin;
```

> **EXAM TIP**: Session policies require Enterprise Edition or higher.
> Default idle timeout is 240 minutes (4 hours). Minimum configurable is 5 minutes.
> SESSION_IDLE_TIMEOUT_MINS = programmatic clients (drivers, connectors).
> SESSION_UI_IDLE_TIMEOUT_MINS = Snowsight (web UI).
> User-level policy overrides account-level policy.
> If CLIENT_SESSION_KEEP_ALIVE = TRUE, the session stays alive indefinitely
> (as long as connection is active), overriding the session policy.

---

### 17. Password Policies

```sql
-- CREATE a password policy
CREATE OR REPLACE PASSWORD POLICY strict_password_policy
  PASSWORD_MIN_LENGTH = 12
  PASSWORD_MAX_LENGTH = 256
  PASSWORD_MIN_UPPER_CASE_CHARS = 2
  PASSWORD_MIN_LOWER_CASE_CHARS = 2
  PASSWORD_MIN_NUMERIC_CHARS = 2
  PASSWORD_MIN_SPECIAL_CHARS = 1
  PASSWORD_MIN_AGE_DAYS = 1
  PASSWORD_MAX_AGE_DAYS = 90
  PASSWORD_MAX_RETRIES = 5
  PASSWORD_LOCKOUT_TIME_MINS = 30
  PASSWORD_HISTORY = 10
  COMMENT = 'Strict password requirements for production';
```

```sql
-- ALTER a password policy
ALTER PASSWORD POLICY strict_password_policy SET
  PASSWORD_MAX_RETRIES = 3
  PASSWORD_LOCKOUT_TIME_MINS = 60;
```

```sql
-- APPLY password policy at ACCOUNT level
ALTER ACCOUNT SET PASSWORD POLICY mydb.policies.strict_password_policy;

-- APPLY password policy to a specific USER (overrides account policy)
ALTER USER janesmith SET PASSWORD POLICY mydb.policies.strict_password_policy;

-- UNSET password policy
ALTER ACCOUNT UNSET PASSWORD POLICY;
ALTER USER janesmith UNSET PASSWORD POLICY;
```

```sql
-- SHOW / DESCRIBE password policies
SHOW PASSWORD POLICIES;
DESCRIBE PASSWORD POLICY strict_password_policy;

-- DROP a password policy
DROP PASSWORD POLICY IF EXISTS strict_password_policy;
```

> **EXAM TIP**: Password policies are SCHEMA-LEVEL objects.
> Default minimum password length is 8 characters.
> PASSWORD_HISTORY prevents reuse of the last N passwords.
> PASSWORD_LOCKOUT_TIME_MINS specifies how long an account is locked
> after PASSWORD_MAX_RETRIES failed attempts.
> User-level password policy overrides account-level.
> Password policies do NOT apply to key pair or OAuth authentication.

---

### 18. Encryption & Tri-Secret Secure

#### Snowflake Encryption Defaults

```text
- All data encrypted at rest and in transit (AES-256)
- Hierarchical key model:
    Root Key --> Account Master Key --> Table Master Key --> File Key --> Data
- Automatic key rotation every 30 days (Snowflake-managed)
- No configuration required for default encryption
```

#### Periodic Data Rekeying (Enterprise Edition)

```sql
-- Enable periodic rekeying (Enterprise Edition)
ALTER ACCOUNT SET PERIODIC_DATA_REKEYING = TRUE;

-- Disable periodic rekeying
ALTER ACCOUNT SET PERIODIC_DATA_REKEYING = FALSE;
```

#### Tri-Secret Secure (Business Critical Edition)

```sql
-- Enable Tri-Secret Secure (requires Business Critical edition)
-- Customer-managed key (CMK) must be configured with Snowflake support first
-- Then enable at account level:
ALTER ACCOUNT SET ENABLE_TRI_SECRET_AND_REKEY_OPT_OUT_FOR_IMAGE_REPOSITORY = TRUE;
```

```sql
-- Rekey with the latest version of customer-managed key
SELECT SYSTEM$ACTIVATE_CMK_INFO('REKEY_SAME_CMK');
```

> **EXAM TIP**: Tri-Secret Secure = Snowflake key + Customer-managed key (CMK)
> = composite master key. Requires Business Critical Edition.
> Periodic rekeying requires Enterprise Edition.
> Key rotation: automatic every 30 days (active key replaced by new key,
> old key retired). Rekeying: after 1 year, retired key is replaced and
> data is re-encrypted; old key is destroyed.
> Rekeying is done ONLINE with NO downtime or performance impact.
> If the customer revokes their CMK, Snowflake CANNOT decrypt the data.
> Cannot use hybrid tables if periodic rekeying is enabled.

---

### 19. Access History & Login History (Auditing)

#### Access History (Enterprise Edition)

```sql
-- Query access history: who accessed what objects
SELECT
  user_name,
  query_id,
  query_start_time,
  direct_objects_accessed,
  base_objects_accessed,
  objects_modified
FROM SNOWFLAKE.ACCOUNT_USAGE.ACCESS_HISTORY
ORDER BY query_start_time DESC
LIMIT 100;
```

```sql
-- Find all tables accessed by a specific user (last 30 days)
SELECT
  ah.user_name,
  ah.query_id,
  ah.query_start_time,
  obj.value:"objectName"::STRING AS table_name,
  obj.value:"objectDomain"::STRING AS object_type
FROM SNOWFLAKE.ACCOUNT_USAGE.ACCESS_HISTORY ah,
  LATERAL FLATTEN(ah.base_objects_accessed) obj
WHERE obj.value:"objectDomain"::STRING = 'Table'
  AND ah.query_start_time >= DATEADD('day', -30, CURRENT_TIMESTAMP())
  AND ah.user_name = 'JANESMITH'
ORDER BY ah.query_start_time DESC;
```

```sql
-- Find all write operations (INSERT, UPDATE, DELETE, COPY)
SELECT
  user_name,
  query_id,
  query_start_time,
  objects_modified
FROM SNOWFLAKE.ACCOUNT_USAGE.ACCESS_HISTORY
WHERE ARRAY_SIZE(objects_modified) > 0
  AND query_start_time >= DATEADD('day', -7, CURRENT_TIMESTAMP())
ORDER BY query_start_time DESC;
```

#### Login History

```sql
-- Query login history from ACCOUNT_USAGE (up to 365 days, ~2hr latency)
SELECT
  EVENT_TIMESTAMP,
  USER_NAME,
  CLIENT_IP,
  REPORTED_CLIENT_TYPE,
  FIRST_AUTHENTICATION_FACTOR,
  SECOND_AUTHENTICATION_FACTOR,
  IS_SUCCESS,
  ERROR_CODE,
  ERROR_MESSAGE
FROM SNOWFLAKE.ACCOUNT_USAGE.LOGIN_HISTORY
WHERE EVENT_TIMESTAMP > DATEADD('day', -30, CURRENT_TIMESTAMP())
ORDER BY EVENT_TIMESTAMP DESC;
```

```sql
-- Find failed login attempts
SELECT
  EVENT_TIMESTAMP,
  USER_NAME,
  CLIENT_IP,
  ERROR_CODE,
  ERROR_MESSAGE
FROM SNOWFLAKE.ACCOUNT_USAGE.LOGIN_HISTORY
WHERE IS_SUCCESS = 'NO'
  AND EVENT_TIMESTAMP > DATEADD('day', -7, CURRENT_TIMESTAMP())
ORDER BY EVENT_TIMESTAMP DESC;
```

```sql
-- Query login history from INFORMATION_SCHEMA (last 7 days, near real-time)
SELECT *
FROM TABLE(INFORMATION_SCHEMA.LOGIN_HISTORY(
  TIME_RANGE_START => DATEADD('hours', -24, CURRENT_TIMESTAMP()),
  TIME_RANGE_END => CURRENT_TIMESTAMP()
))
ORDER BY EVENT_TIMESTAMP DESC;

-- Login history for a specific user (INFORMATION_SCHEMA)
SELECT *
FROM TABLE(INFORMATION_SCHEMA.LOGIN_HISTORY_BY_USER(
  USER_NAME => 'JANESMITH',
  RESULT_LIMIT => 100
))
ORDER BY EVENT_TIMESTAMP DESC;
```

#### Granting Access to ACCOUNT_USAGE Views

```sql
-- Grant access to ACCOUNT_USAGE views (default: only ACCOUNTADMIN)
GRANT IMPORTED PRIVILEGES ON DATABASE SNOWFLAKE TO ROLE sysadmin;

-- Use Snowflake database roles for granular access
GRANT DATABASE ROLE SNOWFLAKE.SECURITY_VIEWER TO ROLE security_team;
GRANT DATABASE ROLE SNOWFLAKE.GOVERNANCE_VIEWER TO ROLE governance_team;
GRANT DATABASE ROLE SNOWFLAKE.USAGE_VIEWER TO ROLE finance_team;
GRANT DATABASE ROLE SNOWFLAKE.OBJECT_VIEWER TO ROLE data_team;
```

| ACCOUNT_USAGE View | Purpose                    | Retention | Latency          |
| ------------------ | -------------------------- | --------- | ---------------- |
| ACCESS_HISTORY     | Object/column access audit | 365 days  | Up to 3 hours    |
| LOGIN_HISTORY      | Login attempts             | 365 days  | Up to 2 hours    |
| QUERY_HISTORY      | Query execution details    | 365 days  | Up to 45 minutes |
| GRANTS_TO_ROLES    | Historical role grants     | 365 days  | Up to 2 hours    |
| GRANTS_TO_USERS    | Historical user grants     | 365 days  | Up to 2 hours    |
| SESSIONS           | Session details            | 365 days  | Up to 3 hours    |
| POLICY_REFERENCES  | Policy assignments         | 365 days  | Up to 2 hours    |

> **EXAM TIP**: ACCESS_HISTORY requires Enterprise Edition. LOGIN_HISTORY
> is available in all editions. ACCOUNT_USAGE views have latency (not
> real-time). INFORMATION_SCHEMA functions are near real-time but only cover
> last 7 days. ACCOUNT_USAGE views retain data for 365 days.
> Failed queries appear in QUERY_HISTORY but NOT in ACCESS_HISTORY.
> By default only ACCOUNTADMIN can access SNOWFLAKE.ACCOUNT_USAGE views.
> Use GRANT IMPORTED PRIVILEGES to share access with other roles.
> Snowflake database roles: SECURITY_VIEWER, GOVERNANCE_VIEWER,
> USAGE_VIEWER, OBJECT_VIEWER provide granular access.

---

### 20. User Types (PERSON / SERVICE / LEGACY_SERVICE)

```sql
-- Set a user as PERSON (human user -- supports MFA, interactive login)
ALTER USER janesmith SET TYPE = PERSON;

-- Set a user as SERVICE (non-human -- key pair or OAuth only, NO passwords)
ALTER USER svc_etl SET TYPE = SERVICE;
CREATE USER svc_pipeline TYPE = SERVICE;

-- Set a user as LEGACY_SERVICE (transitional -- can still use passwords)
ALTER USER old_service_acct SET TYPE = LEGACY_SERVICE;
```

| User Type      | Password Login | MFA Required      | Key Pair | OAuth | Notes                          |
| -------------- | -------------- | ----------------- | -------- | ----- | ------------------------------ |
| PERSON         | Yes            | Yes (enforced)    | Yes      | Yes   | Default for human users        |
| SERVICE        | No             | N/A               | Yes      | Yes   | For applications/automation    |
| LEGACY_SERVICE | Yes            | No                | Yes      | Yes   | Transitional, being deprecated |
| NULL (unset)   | Yes            | Treated as PERSON | Yes      | Yes   | Default if TYPE not set        |

> **EXAM TIP**: SERVICE users CANNOT log in with passwords. This is the
> recommended type for automated processes and service accounts.
> LEGACY_SERVICE is a temporary type for migration -- it will be deprecated
> by mid-to-late 2026. If TYPE is not set, the user is treated as a
> human user (PERSON behavior). Always explicitly set the TYPE property.

---

### Quick Reference: Privileges Required for Common Security Operations

| Operation                             | Required Privilege / Role                        |
| ------------------------------------- | ------------------------------------------------ |
| Create users                          | USERADMIN or CREATE USER on ACCOUNT              |
| Create roles                          | USERADMIN or CREATE ROLE on ACCOUNT              |
| Grant/revoke any privilege            | SECURITYADMIN (MANAGE GRANTS)                    |
| Create network policies               | SECURITYADMIN or higher                          |
| Activate account-level network policy | SECURITYADMIN or higher                          |
| Create masking policies               | CREATE MASKING POLICY on SCHEMA                  |
| Apply masking policies                | APPLY MASKING POLICY on ACCOUNT                  |
| Create row access policies            | CREATE ROW ACCESS POLICY on SCHEMA               |
| Apply row access policies             | APPLY ROW ACCESS POLICY on ACCOUNT               |
| Create tags                           | CREATE TAG on SCHEMA                             |
| Apply tags                            | APPLY TAG on ACCOUNT                             |
| Create session policies               | CREATE SESSION POLICY on SCHEMA                  |
| Apply session policies                | APPLY SESSION POLICY on ACCOUNT                  |
| Create password policies              | CREATE PASSWORD POLICY on SCHEMA                 |
| Create security integrations          | CREATE INTEGRATION on ACCOUNT (ACCOUNTADMIN)     |
| Enable periodic rekeying              | ACCOUNTADMIN                                     |
| Access ACCOUNT_USAGE views            | IMPORTED PRIVILEGES on SNOWFLAKE database        |
| View access history                   | IMPORTED PRIVILEGES or GOVERNANCE_VIEWER db role |

---

### Quick Reference: ALTER ACCOUNT vs ALTER USER Policy Assignment

All policies can be set at account level OR user level. User-level always overrides account-level.

```sql
-- Pattern for ALL policy types:
-- Account level
ALTER ACCOUNT SET <POLICY_TYPE> = <fully_qualified_policy_name>;
ALTER ACCOUNT UNSET <POLICY_TYPE>;

-- User level
ALTER USER <user_name> SET <POLICY_TYPE> = <fully_qualified_policy_name>;
ALTER USER <user_name> UNSET <POLICY_TYPE>;

-- Specific examples:
ALTER ACCOUNT SET NETWORK_POLICY = my_policy;
ALTER ACCOUNT SET PASSWORD POLICY = db.schema.my_pwd_policy;
ALTER ACCOUNT SET SESSION POLICY = db.schema.my_session_policy;
ALTER ACCOUNT SET AUTHENTICATION POLICY = my_auth_policy;
```

---

### Quick Reference: Enterprise vs Business Critical Features

| Feature                            | Minimum Edition         |
| ---------------------------------- | ----------------------- |
| Dynamic Data Masking               | Enterprise              |
| Row Access Policies                | Enterprise              |
| Object Tagging                     | Enterprise              |
| Session Policies                   | Enterprise              |
| Periodic Data Rekeying             | Enterprise              |
| Access History                     | Enterprise              |
| Column-Level Security              | Enterprise              |
| Authentication Policies            | Enterprise              |
| Network Policies                   | Standard (all editions) |
| Tri-Secret Secure (CMK)            | Business Critical       |
| Customer-Managed Keys              | Business Critical       |
| HIPAA / PCI DSS support            | Business Critical       |
| Private connectivity (PrivateLink) | Business Critical       |
| Database failover/failback         | Business Critical       |

---

### Mnemonics & Memory Aids

**System Role Hierarchy (top to bottom): "A S U S P"**

- **A**CCOUNTADMIN
- **S**ECURITYADMIN
- **U**SERADMIN
- **S**YSADMIN (separate branch from SECURITYADMIN)
- **P**UBLIC

**SECURITYADMIN has two children**: USERADMIN (inherits) + MANAGE GRANTS (privilege)

**SHOW GRANTS prepositions**:

- **TO** = what does X have? (TO ROLE = privileges it holds; TO USER = roles assigned)
- **ON** = who can access this object?
- **OF** = where has this role been assigned?

**Policy Evaluation Order**: Row Access Policy FIRST, then Masking Policy

**Network Policy Precedence** (most specific wins):
Security Integration > User > Account

**COPY vs REVOKE CURRENT GRANTS**:

- **C**OPY = **C**arry over existing grants
- **R**EVOKE = **R**emove existing grants

---

_Sources: Snowflake Official Documentation (docs.snowflake.com), SnowPro Core COF-C02 Exam Guide_

---

## Domain 3: Performance Concepts -- SQL Syntax & Commands Cheat Sheet

### SnowPro Core COF-C02 Exam Memorization Guide

> **Exam Weight: 10-15%**
> Focus areas: Query Profile, virtual warehouse configuration, performance tools,
> caching, clustering, materialized views, search optimization, query acceleration,
> resource monitors, and cost control.

---

### 1. VIRTUAL WAREHOUSE CREATION & SIZING

```sql
-- Create a warehouse with all performance-related parameters
CREATE WAREHOUSE my_wh WITH
  WAREHOUSE_SIZE = 'XSMALL'           -- XSMALL|SMALL|MEDIUM|LARGE|XLARGE|2XLARGE|3XLARGE|4XLARGE|5XLARGE|6XLARGE
  AUTO_SUSPEND = 300                   -- seconds of inactivity before suspending (default 600 = 10 min)
  AUTO_RESUME = TRUE                   -- auto-restart when query submitted (default TRUE)
  INITIALLY_SUSPENDED = TRUE           -- start in suspended state to avoid immediate credit use
  MIN_CLUSTER_COUNT = 1                -- minimum clusters (Enterprise+ for multi-cluster)
  MAX_CLUSTER_COUNT = 3                -- maximum clusters (>1 = multi-cluster warehouse)
  SCALING_POLICY = 'STANDARD'          -- STANDARD or ECONOMY
  ENABLE_QUERY_ACCELERATION = TRUE     -- enable Query Acceleration Service (QAS)
  QUERY_ACCELERATION_MAX_SCALE_FACTOR = 8  -- 0-100, default 8 (0 = unlimited)
  STATEMENT_TIMEOUT_IN_SECONDS = 3600           -- max query execution time
  STATEMENT_QUEUED_TIMEOUT_IN_SECONDS = 600     -- max time query can wait in queue
  RESOURCE_MONITOR = 'my_monitor'      -- attach a resource monitor
  COMMENT = 'Analytics warehouse';
```

**EXAM TIP:** Each size doubles credits per hour:

| Size | Credits/Hour |
| ---- | ------------ |
| XS   | 1            |
| S    | 2            |
| M    | 4            |
| L    | 8            |
| XL   | 16           |
| 2XL  | 32           |
| 3XL  | 64           |
| 4XL  | 128          |
| 5XL  | 256          |
| 6XL  | 512          |

**EXAM TIP:** Warehouses are billed per-second with a 60-second (1 minute) minimum each time they resume.

**EXAM TIP:** `INITIALLY_SUSPENDED` can only be set at creation time -- it cannot be altered later.

---

### 2. ALTER WAREHOUSE -- SIZING & SCALING

```sql
-- Resize a warehouse (immediate effect on running warehouse)
ALTER WAREHOUSE my_wh SET WAREHOUSE_SIZE = 'LARGE';
```

```sql
-- Change auto-suspend to 5 minutes (300 seconds)
ALTER WAREHOUSE my_wh SET AUTO_SUSPEND = 300;
```

```sql
-- Disable auto-suspend (warehouse runs continuously -- NOT recommended)
ALTER WAREHOUSE my_wh SET AUTO_SUSPEND = 0;
-- Or: ALTER WAREHOUSE my_wh SET AUTO_SUSPEND = NULL;
```

```sql
-- Manually suspend a warehouse
ALTER WAREHOUSE my_wh SUSPEND;
```

```sql
-- Manually resume a warehouse
ALTER WAREHOUSE my_wh RESUME;
-- Resume even if resource monitor has suspended it:
ALTER WAREHOUSE my_wh RESUME IF SUSPENDED;
```

**EXAM TIP:** Suspending a warehouse clears the warehouse (local disk / SSD) cache. A low AUTO_SUSPEND value saves credits but loses cached data. A higher value preserves cache but costs more. Recommended: 5-10 minutes for most workloads.

**EXAM TIP:** Resizing a warehouse to a LARGER size triggers a 1-minute minimum billing charge for the additional compute resources added.

---

### 3. MULTI-CLUSTER WAREHOUSE CONFIGURATION

```sql
-- Create a multi-cluster warehouse in Auto-scale mode
-- (MIN < MAX = Auto-scale; MIN = MAX = Maximized mode)
CREATE WAREHOUSE multi_wh WITH
  WAREHOUSE_SIZE = 'MEDIUM'
  MIN_CLUSTER_COUNT = 1
  MAX_CLUSTER_COUNT = 4
  SCALING_POLICY = 'STANDARD';
```

```sql
-- Switch to Economy scaling policy (saves credits, allows more queuing)
ALTER WAREHOUSE multi_wh SET SCALING_POLICY = 'ECONOMY';
```

```sql
-- Switch to Maximized mode (all clusters always running)
ALTER WAREHOUSE multi_wh SET
  MIN_CLUSTER_COUNT = 4
  MAX_CLUSTER_COUNT = 4;
```

**EXAM TIP: STANDARD vs ECONOMY scaling policies:**

- **STANDARD** -- Prioritizes performance. Starts additional cluster after ~20 seconds of queuing. Shuts down cluster after 2-3 consecutive checks (every 60 sec) show load decrease.
- **ECONOMY** -- Prioritizes cost savings. Starts additional cluster only if enough load to keep it busy for at least 6 minutes. Shuts down cluster after 5-6 consecutive checks show load decrease.

**EXAM TIP:** Multi-cluster warehouses require Enterprise Edition or higher. On Standard Edition, MAX_CLUSTER_COUNT is always 1.

**EXAM TIP:** Multi-cluster warehouses scale OUT (more clusters), not UP (bigger clusters). Each cluster is the same WAREHOUSE_SIZE. This helps with concurrency, NOT with making individual queries faster.

---

### 4. QUERY PERFORMANCE TOOLS

#### 4a. EXPLAIN Plan

```sql
-- Default output (TABULAR format) -- does NOT execute the query
EXPLAIN SELECT * FROM my_table WHERE id = 42;
```

```sql
-- Output as formatted text
EXPLAIN USING TEXT SELECT * FROM my_table WHERE id = 42;
```

```sql
-- Output as JSON (useful for programmatic analysis or storing)
EXPLAIN USING JSON SELECT * FROM my_table WHERE id = 42;
```

```sql
-- Store EXPLAIN plan as JSON using system function
SELECT SYSTEM$EXPLAIN_PLAN_JSON('SELECT * FROM my_table WHERE id = 42');
```

```sql
-- Convert stored JSON explain plan back to human-readable text
SELECT SYSTEM$EXPLAIN_JSON_TO_TEXT(
  SYSTEM$EXPLAIN_PLAN_JSON('SELECT * FROM my_table WHERE id = 42')
);
```

```sql
-- Convert JSON explain plan to tabular format (returns a table)
SELECT * FROM TABLE(EXPLAIN_JSON(
  SYSTEM$EXPLAIN_PLAN_JSON('SELECT * FROM my_table WHERE id = 42')
));
```

**EXAM TIP:** EXPLAIN shows the LOGICAL plan (not actual execution). It does NOT execute the query, so no warehouse credits are consumed (only cloud services layer). Use the Query Profile (in Snowsight) for ACTUAL execution details.

**EXAM TIP:** EXPLAIN output includes: operations, expressions, partitions (total vs. assigned), and bytes. The "assignedPartitions" value is an upper-bound estimate.

#### 4b. QUERY_HISTORY -- Information Schema (last 7 days, no latency)

```sql
-- Query the most recent queries (default: current user)
SELECT * FROM TABLE(INFORMATION_SCHEMA.QUERY_HISTORY())
ORDER BY start_time DESC
LIMIT 20;
```

```sql
-- Query history with a time range (last 1 hour)
SELECT * FROM TABLE(INFORMATION_SCHEMA.QUERY_HISTORY(
  END_TIME_RANGE_START => DATEADD('hours', -1, CURRENT_TIMESTAMP()),
  END_TIME_RANGE_END   => CURRENT_TIMESTAMP(),
  RESULT_LIMIT         => 100
)) ORDER BY start_time DESC;
```

```sql
-- Query history by specific user
SELECT * FROM TABLE(INFORMATION_SCHEMA.QUERY_HISTORY_BY_USER(
  USER_NAME            => 'MY_USER',
  END_TIME_RANGE_START => DATEADD('hours', -24, CURRENT_TIMESTAMP()),
  RESULT_LIMIT         => 50
));
```

```sql
-- Query history by warehouse
SELECT * FROM TABLE(INFORMATION_SCHEMA.QUERY_HISTORY_BY_WAREHOUSE(
  WAREHOUSE_NAME       => 'MY_WH',
  END_TIME_RANGE_START => DATEADD('hours', -6, CURRENT_TIMESTAMP()),
  RESULT_LIMIT         => 50
));
```

```sql
-- Query history by session
SELECT * FROM TABLE(INFORMATION_SCHEMA.QUERY_HISTORY_BY_SESSION(
  SESSION_ID           => 12345678901234,
  RESULT_LIMIT         => 50
));
```

**EXAM TIP:** Information Schema QUERY_HISTORY covers the last **7 days** with **no latency**. Account Usage QUERY_HISTORY covers the last **365 days** but has up to **45 minutes latency**.

#### 4c. QUERY_HISTORY -- Account Usage (last 365 days, up to 45 min latency)

```sql
-- Account Usage view -- requires ACCOUNTADMIN or SNOWFLAKE database access
SELECT query_id, query_text, warehouse_name, execution_status,
       total_elapsed_time, bytes_scanned, rows_produced,
       partitions_scanned, partitions_total,
       bytes_spilled_to_local_storage,
       bytes_spilled_to_remote_storage,
       query_acceleration_bytes_scanned
FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY
WHERE start_time >= DATEADD('day', -7, CURRENT_TIMESTAMP())
ORDER BY total_elapsed_time DESC
LIMIT 20;
```

```sql
-- Find queries that spilled to storage (performance problem indicator)
SELECT query_id, query_text, warehouse_name, warehouse_size,
       bytes_spilled_to_local_storage,
       bytes_spilled_to_remote_storage
FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY
WHERE bytes_spilled_to_remote_storage > 0
  AND start_time >= DATEADD('day', -7, CURRENT_TIMESTAMP())
ORDER BY bytes_spilled_to_remote_storage DESC
LIMIT 10;
```

#### 4d. Query Profile (Snowsight UI)

```text
-- NOT a SQL command -- accessed via Snowsight UI:
-- Monitoring > Query History > Select a query > View Query Profile

Key things to look for in the Query Profile:
  - Most Expensive Nodes (highlighted)
  - Bytes Scanned vs. Bytes Sent Over the Network
  - Percentage Scanned From Cache (warehouse cache hit ratio)
  - Bytes Spilled to Local Storage
  - Bytes Spilled to Remote Storage
  - Partitions Scanned vs. Partitions Total (pruning efficiency)
  - Exploding Joins (unexpected row count explosion)
```

**EXAM TIP:** The Query Profile is a DAG (Directed Acyclic Graph) showing operators as nodes and data flow as links. Look at the "Most Expensive Nodes" section first. The profile also shows "METADATA-BASED RESULT" when the answer came from metadata cache.

---

### 5. CACHING MECHANISMS

#### 5a. Metadata Cache (Cloud Services Layer)

```text
-- No explicit SQL to manage -- always active, cannot be disabled.
-- Automatically caches: row counts, min/max values, distinct counts, null counts.
-- Lasts 64 days.
-- Used for queries like:
```

```sql
-- These can return from metadata cache WITHOUT using a warehouse:
SELECT COUNT(*) FROM my_table;
SELECT MIN(id) FROM my_table;
SELECT MAX(id) FROM my_table;
```

**EXAM TIP:** MIN/MAX on **numeric** and **date** columns use metadata cache. MIN/MAX on **string/character** columns do NOT use metadata cache.

**EXAM TIP:** When a query uses metadata cache, the Query Profile shows a single node labeled "METADATA-BASED RESULT" and no warehouse is needed (0 credits for compute).

#### 5b. Query Result Cache (Cloud Services Layer)

```sql
-- Result cache is ON by default. To disable for a session:
ALTER SESSION SET USE_CACHED_RESULT = FALSE;

-- Re-enable it:
ALTER SESSION SET USE_CACHED_RESULT = TRUE;

-- Check current setting:
SHOW PARAMETERS LIKE 'USE_CACHED_RESULT' IN SESSION;
```

**EXAM TIP:** Result cache conditions for reuse:

1. Query text must be **exactly the same** (syntactically identical)
2. Underlying table data has **not changed**
3. Query does NOT use non-deterministic functions (CURRENT_TIMESTAMP, RANDOM, etc.)
4. Query does NOT use UDFs or external functions
5. Same role is used (different users OK, but same role required)
6. Cache is valid for **24 hours** (can extend up to **31 days** if frequently reused)
7. No warehouse is needed to serve from result cache (0 compute credits)

#### 5c. Warehouse Cache / Local Disk Cache (Compute Layer)

```text
-- No explicit SQL to manage -- automatically managed via LRU (Least Recently Used).
-- Stores raw micro-partition data on SSD of warehouse nodes.
-- Cleared when warehouse is: suspended, resized, or dropped.
-- Larger warehouse = larger cache.
-- Only available to the specific warehouse (not shared).
```

**EXAM TIP:** The three cache layers are checked in this order:

1. **Result Cache** (Cloud Services) -- exact query match, 24hr
2. **Warehouse Cache** (Local SSD) -- raw data from prior scans
3. **Remote Storage** (Cloud Storage) -- full table scan from S3/Azure Blob/GCS

---

### 6. RESULT_SCAN FUNCTION

```sql
-- Return the result of the most recent query in the session
SELECT * FROM TABLE(RESULT_SCAN(LAST_QUERY_ID()));
```

```sql
-- Equivalent shorthand (defaults to last query)
SELECT * FROM TABLE(RESULT_SCAN(-1));
```

```sql
-- Use a specific query ID
SELECT * FROM TABLE(RESULT_SCAN('01b71944-0001-b181-0000-0129032279f6'));
```

```sql
-- Common pattern: process output of SHOW commands
SHOW WAREHOUSES;
SELECT "name", "size", "state"
FROM TABLE(RESULT_SCAN(LAST_QUERY_ID()))
WHERE "state" = 'STARTED';
```

```sql
-- Process output of DESCRIBE commands
DESCRIBE TABLE my_table;
SELECT * FROM TABLE(RESULT_SCAN(LAST_QUERY_ID()))
WHERE "type" LIKE '%VARCHAR%';
```

**EXAM TIP:** RESULT_SCAN returns results from the last **24 hours**. Only the user who ran the original query can use RESULT_SCAN on it (even ACCOUNTADMIN cannot access another user's results). RESULT_SCAN is especially useful for processing SHOW and DESCRIBE output as tables.

---

### 7. CLUSTERING KEYS

#### 7a. Define Clustering Keys

```sql
-- Create a table with a clustering key
CREATE TABLE orders (
  order_id    INT,
  order_date  DATE,
  customer_id INT,
  status      STRING,
  amount      NUMBER(12,2)
) CLUSTER BY (order_date, status);
```

```sql
-- Add or change clustering key on existing table
ALTER TABLE orders CLUSTER BY (order_date);
```

```sql
-- Cluster by expressions (e.g., truncating a timestamp to date)
ALTER TABLE events CLUSTER BY (TO_DATE(event_timestamp), event_type);
```

```sql
-- Drop (remove) the clustering key
ALTER TABLE orders DROP CLUSTERING KEY;
```

**EXAM TIP:** Clustering keys are most beneficial for:

- Very large tables (multi-terabyte)
- Tables frequently queried with filters on specific columns
- Recommended maximum of 3-4 columns per clustering key
- Clustering maintains data organization via **Automatic Clustering** (serverless, background process)
- Automatic Clustering requires Enterprise Edition or higher

#### 7b. Monitor Clustering Health

```sql
-- Check clustering depth for the defined clustering key
-- Lower depth = better clustering (minimum is 1)
SELECT SYSTEM$CLUSTERING_DEPTH('my_db.my_schema.orders');
```

```sql
-- Check clustering depth for specific columns (no clustering key required)
SELECT SYSTEM$CLUSTERING_DEPTH('my_db.my_schema.orders', '(order_date, status)');
```

```sql
-- Check with a predicate filter
SELECT SYSTEM$CLUSTERING_DEPTH(
  'my_db.my_schema.orders',
  '(order_date)',
  'order_date >= ''2024-01-01'' AND order_date < ''2025-01-01'''
);
```

```sql
-- Get comprehensive clustering information (returns JSON)
SELECT SYSTEM$CLUSTERING_INFORMATION('my_db.my_schema.orders');
```

```sql
-- Clustering information for specific columns
SELECT SYSTEM$CLUSTERING_INFORMATION('my_db.my_schema.orders', '(order_date, status)');
```

**EXAM TIP:** SYSTEM$CLUSTERING_INFORMATION returns JSON with these key fields:

- `total_partition_count` -- total micro-partitions in the table
- `total_constant_partition_count` -- partitions already fully clustered
- `average_overlaps` -- average overlapping partitions (lower = better)
- `average_depth` -- average clustering depth (lower = better, min = 1)
- `partition_depth_histogram` -- distribution of partition depths

**EXAM TIP:** All arguments to SYSTEM$CLUSTERING_DEPTH and SYSTEM$CLUSTERING_INFORMATION are **strings** (enclosed in single quotes). Column lists must be in parentheses even for a single column.

#### 7c. Automatic Clustering (Serverless)

```sql
-- Suspend automatic re-clustering for a table
ALTER TABLE orders SUSPEND RECLUSTER;
```

```sql
-- Resume automatic re-clustering
ALTER TABLE orders RESUME RECLUSTER;
```

**EXAM TIP:** Automatic Clustering is a **serverless** feature -- it uses Snowflake-managed compute (not your warehouse). It incurs separate credit charges. It runs in the background to maintain clustering as DML changes data.

---

### 8. MATERIALIZED VIEWS

```sql
-- Create a materialized view (Enterprise Edition+ required)
CREATE MATERIALIZED VIEW mv_daily_sales AS
  SELECT order_date, SUM(amount) AS total_amount, COUNT(*) AS order_count
  FROM orders
  GROUP BY order_date;
```

```sql
-- Create with a clustering key (must include column name list)
CREATE MATERIALIZED VIEW mv_daily_sales (order_date, total_amount, order_count)
  CLUSTER BY (order_date)
  AS
  SELECT order_date, SUM(amount) AS total_amount, COUNT(*) AS order_count
  FROM orders
  GROUP BY order_date;
```

```sql
-- Create or replace
CREATE OR REPLACE MATERIALIZED VIEW mv_daily_sales AS
  SELECT order_date, SUM(amount) AS total_amount, COUNT(*) AS order_count
  FROM orders
  GROUP BY order_date;
```

```sql
-- Drop a materialized view
DROP MATERIALIZED VIEW mv_daily_sales;
```

```sql
-- Show materialized views
SHOW MATERIALIZED VIEWS;
SHOW MATERIALIZED VIEWS IN SCHEMA my_schema;
```

**EXAM TIP: Key Materialized View Limitations (commonly tested):**

1. Can query only a **single table** -- NO JOINS allowed in the definition
2. NO UDFs (user-defined functions) allowed
3. NO nested materialized views (MV referencing another MV)
4. NO DML (INSERT, UPDATE, DELETE) on materialized views
5. Time Travel is NOT supported on materialized views
6. Cannot be altered to change definition -- must DROP and recreate
7. Cannot be directly cloned (but cloning a schema/db includes MVs)
8. Shown in INFORMATION_SCHEMA.**TABLES** (not INFORMATION_SCHEMA.VIEWS)
9. TABLE_TYPE column shows "MATERIALIZED VIEW"

**EXAM TIP:** Materialized views are maintained **automatically** by a serverless background process. They incur both **compute** (for maintenance) and **storage** costs. They are NOT monitored by Resource Monitors.

**EXAM TIP:** Requires **Enterprise Edition** or higher.

---

### 9. SEARCH OPTIMIZATION SERVICE

```sql
-- Enable search optimization for an entire table (EQUALITY on all supported columns)
ALTER TABLE my_table ADD SEARCH OPTIMIZATION;
```

```sql
-- Enable search optimization for specific columns and methods
ALTER TABLE my_table ADD SEARCH OPTIMIZATION ON EQUALITY(customer_id);
```

```sql
-- Enable for substring searches
ALTER TABLE my_table ADD SEARCH OPTIMIZATION ON SUBSTRING(name);
```

```sql
-- Enable for semi-structured data
ALTER TABLE my_table ADD SEARCH OPTIMIZATION ON EQUALITY(variant_col:user.id);
ALTER TABLE my_table ADD SEARCH OPTIMIZATION ON SUBSTRING(variant_col:user.name);
```

```sql
-- Enable for GEO (geography) data
ALTER TABLE my_table ADD SEARCH OPTIMIZATION ON GEO(geo_col);
```

```sql
-- Enable multiple search methods at once
ALTER TABLE my_table ADD SEARCH OPTIMIZATION
  ON EQUALITY(customer_id, order_id),
     SUBSTRING(name),
     GEO(location);
```

```sql
-- Remove search optimization entirely
ALTER TABLE my_table DROP SEARCH OPTIMIZATION;
```

```sql
-- Remove for a specific column/method
ALTER TABLE my_table DROP SEARCH OPTIMIZATION ON SUBSTRING(name);
```

```sql
-- Check search optimization configuration
DESCRIBE SEARCH OPTIMIZATION ON my_table;
```

```sql
-- Estimate costs before enabling
SELECT SYSTEM$ESTIMATE_SEARCH_OPTIMIZATION_COSTS('my_table');
```

```sql
-- Grant required privilege (needed to add search optimization)
GRANT ADD SEARCH OPTIMIZATION ON SCHEMA my_schema TO ROLE my_role;
```

**EXAM TIP:** Search optimization creates a **search access path** (persistent data structure) that tracks which values exist in which micro-partitions. It is best for:

- Point lookup queries (WHERE col = value)
- Queries using IN lists
- Substring/LIKE searches
- Semi-structured data access
- Geospatial queries

**EXAM TIP:** Enterprise Edition or higher required. It is a **serverless** feature with separate compute and storage costs.

**EXAM TIP:** If you enable at table level (no ON clause), new columns added later ARE auto-optimized for EQUALITY. But if you use the ON clause even once, new columns are NOT auto-optimized.

**EXAM TIP:** VARIANT, OBJECT, ARRAY columns are NOT optimized by table-level enabling -- you must use the ON clause to specify them explicitly.

---

### 10. QUERY ACCELERATION SERVICE (QAS)

```sql
-- Enable QAS on a warehouse
ALTER WAREHOUSE my_wh SET ENABLE_QUERY_ACCELERATION = TRUE;
```

```sql
-- Enable with a specific max scale factor (default is 8)
ALTER WAREHOUSE my_wh SET
  ENABLE_QUERY_ACCELERATION = TRUE
  QUERY_ACCELERATION_MAX_SCALE_FACTOR = 4;
```

```sql
-- Set scale factor to 0 (unlimited -- no upper bound on serverless resources)
ALTER WAREHOUSE my_wh SET QUERY_ACCELERATION_MAX_SCALE_FACTOR = 0;
```

```sql
-- Disable QAS
ALTER WAREHOUSE my_wh SET ENABLE_QUERY_ACCELERATION = FALSE;
```

```sql
-- Check if a specific query would benefit from QAS
SELECT PARSE_JSON(SYSTEM$ESTIMATE_QUERY_ACCELERATION('01b71944-0001-b181-0000-0129032279f6'))
  AS estimate;
```

```sql
-- View QAS eligible queries for a warehouse
SELECT * FROM TABLE(INFORMATION_SCHEMA.QUERY_ACCELERATION_ELIGIBLE(
  WAREHOUSE_NAME => 'MY_WH'
));
```

**EXAM TIP:** QAS offloads portions of eligible queries to **serverless** compute resources. It helps with:

- Queries with large scans and selective filters
- Ad hoc / unpredictable workloads
- Outlier queries that slow down the whole warehouse

**EXAM TIP:** Scale factor is a **multiplier** of warehouse cost. Example: Medium warehouse (4 credits/hr) with scale factor 4 = up to 16 additional credits/hr for QAS. Scale factor 0 = no limit. Default scale factor = 8. Valid range: 0-100.

**EXAM TIP:** QAS is billed per-second, only when actively accelerating. Snowflake automatically decides per-query whether to use QAS. It does NOT help every query -- only eligible ones with large scan + selective filter patterns.

---

### 11. QUERY TAGS

```sql
-- Set a query tag for the current session
ALTER SESSION SET QUERY_TAG = 'etl_pipeline_daily_load';
```

```sql
-- Clear the query tag
ALTER SESSION UNSET QUERY_TAG;
-- Or:
ALTER SESSION SET QUERY_TAG = '';
```

```sql
-- Set query tag at account level (applies to all sessions by default)
ALTER ACCOUNT SET QUERY_TAG = 'default_tag';
```

```sql
-- Set query tag at user level
ALTER USER my_user SET QUERY_TAG = 'user_default_tag';
```

```sql
-- Find queries by tag in account usage
SELECT query_id, query_text, query_tag, total_elapsed_time
FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY
WHERE query_tag = 'etl_pipeline_daily_load'
  AND start_time >= DATEADD('day', -7, CURRENT_TIMESTAMP())
ORDER BY start_time DESC;
```

**EXAM TIP:** QUERY_TAG is a session-level parameter (can also be set at account or user level). Maximum 2000 characters. Useful for cost attribution, monitoring, and filtering in QUERY_HISTORY. Tags appear in the QUERY_TAG column of the QUERY_HISTORY view.

---

### 12. TIMEOUT PARAMETERS

```sql
-- Set maximum execution time for queries (seconds) -- default is 172800 (2 days)
ALTER WAREHOUSE my_wh SET STATEMENT_TIMEOUT_IN_SECONDS = 3600;    -- 1 hour
ALTER SESSION SET STATEMENT_TIMEOUT_IN_SECONDS = 1800;             -- 30 min
ALTER ACCOUNT SET STATEMENT_TIMEOUT_IN_SECONDS = 7200;             -- 2 hours
ALTER USER my_user SET STATEMENT_TIMEOUT_IN_SECONDS = 3600;        -- 1 hour
```

```sql
-- Set maximum time a query can sit in the queue (seconds) -- default is 0 (no limit)
ALTER WAREHOUSE my_wh SET STATEMENT_QUEUED_TIMEOUT_IN_SECONDS = 300;   -- 5 min
ALTER SESSION SET STATEMENT_QUEUED_TIMEOUT_IN_SECONDS = 120;           -- 2 min
ALTER ACCOUNT SET STATEMENT_QUEUED_TIMEOUT_IN_SECONDS = 600;           -- 10 min
```

```sql
-- Reset to defaults
ALTER WAREHOUSE my_wh UNSET STATEMENT_TIMEOUT_IN_SECONDS;
ALTER SESSION UNSET STATEMENT_QUEUED_TIMEOUT_IN_SECONDS;
```

```sql
-- View current timeout settings
SHOW PARAMETERS LIKE 'STATEMENT%TIMEOUT%' IN WAREHOUSE my_wh;
SHOW PARAMETERS LIKE 'STATEMENT%TIMEOUT%' IN SESSION;
SHOW PARAMETERS LIKE 'STATEMENT%TIMEOUT%' IN ACCOUNT;
```

**EXAM TIP:** When STATEMENT_TIMEOUT_IN_SECONDS is set at multiple levels, the **lowest** value wins. Example: session=3600, warehouse=600 --> warehouse timeout of 600 seconds applies.

**EXAM TIP:** STATEMENT_TIMEOUT covers total query execution time. STATEMENT_QUEUED_TIMEOUT covers only the time spent waiting in queue (before execution begins).

---

### 13. RESOURCE MONITORS

```sql
-- Create a resource monitor with triggers
CREATE RESOURCE MONITOR my_monitor WITH
  CREDIT_QUOTA = 1000
  FREQUENCY = MONTHLY
  START_TIMESTAMP = IMMEDIATELY
  NOTIFY_USERS = (admin_user, data_engineer)
  TRIGGERS
    ON 50 PERCENT DO NOTIFY
    ON 75 PERCENT DO NOTIFY
    ON 90 PERCENT DO SUSPEND
    ON 100 PERCENT DO SUSPEND_IMMEDIATE;
```

```sql
-- Create with a specific start date and end date
CREATE RESOURCE MONITOR quarterly_monitor WITH
  CREDIT_QUOTA = 5000
  FREQUENCY = MONTHLY
  START_TIMESTAMP = '2025-01-01 00:00 PST'
  END_TIMESTAMP = '2025-03-31 23:59 PST'
  TRIGGERS
    ON 80 PERCENT DO NOTIFY
    ON 100 PERCENT DO SUSPEND;
```

```sql
-- Create with NEVER frequency (quota does not reset)
CREATE RESOURCE MONITOR one_time_monitor WITH
  CREDIT_QUOTA = 500
  FREQUENCY = NEVER
  START_TIMESTAMP = IMMEDIATELY
  TRIGGERS
    ON 100 PERCENT DO SUSPEND_IMMEDIATE;
```

```sql
-- Alter an existing resource monitor
ALTER RESOURCE MONITOR my_monitor SET
  CREDIT_QUOTA = 2000
  TRIGGERS
    ON 75 PERCENT DO NOTIFY
    ON 100 PERCENT DO SUSPEND;
```

```sql
-- Assign resource monitor to a warehouse
ALTER WAREHOUSE my_wh SET RESOURCE_MONITOR = 'my_monitor';
```

```sql
-- Assign resource monitor at account level
ALTER ACCOUNT SET RESOURCE_MONITOR = 'my_monitor';
```

```sql
-- Remove resource monitor from a warehouse
ALTER WAREHOUSE my_wh UNSET RESOURCE_MONITOR;
```

```sql
-- View resource monitors
SHOW RESOURCE MONITORS;
```

```sql
-- Drop a resource monitor
DROP RESOURCE MONITOR my_monitor;
```

**EXAM TIP: Three trigger actions:**

1. **NOTIFY** -- sends notification only (up to 5 NOTIFY triggers per monitor)
2. **SUSPEND** -- suspends warehouse, lets running queries finish, sends notification
3. **SUSPEND_IMMEDIATE** -- suspends warehouse AND cancels all running queries immediately

**EXAM TIP:** Only **ACCOUNTADMIN** can create resource monitors. Trigger thresholds can exceed 100% (e.g., ON 110 PERCENT DO SUSPEND_IMMEDIATE).

**EXAM TIP:** FREQUENCY options: DAILY, WEEKLY, MONTHLY, YEARLY, NEVER. Default resets monthly. NEVER means the quota never resets.

**EXAM TIP:** A warehouse can only be assigned to ONE resource monitor, but a resource monitor can be assigned to MULTIPLE warehouses. Only ONE account-level resource monitor is allowed.

**EXAM TIP:** Resource monitors track credits from **user-managed virtual warehouses** and **cloud services**. They do NOT track serverless features (Automatic Clustering, Materialized View maintenance, Snowpipe, Search Optimization, etc.).

---

### 14. CANCEL QUERIES

```sql
-- Cancel all queries in a specific session
SELECT SYSTEM$CANCEL_ALL_QUERIES(12345678901234);
-- The argument is the session ID (numeric)
```

```sql
-- Cancel a specific query by query ID
SELECT SYSTEM$CANCEL_QUERY('01b71944-0001-b181-0000-0129032279f6');
```

```sql
-- Find long-running queries to cancel
SELECT query_id, query_text, start_time, warehouse_name
FROM TABLE(INFORMATION_SCHEMA.QUERY_HISTORY())
WHERE execution_status = 'RUNNING'
  AND DATEDIFF('minute', start_time, CURRENT_TIMESTAMP()) > 30
ORDER BY start_time;
```

**EXAM TIP:** Users can cancel their own queries. To cancel another user's queries, you need OWNERSHIP on the user, or OPERATE/OWNERSHIP on the warehouse. ACCOUNTADMIN does not automatically have these privileges.

---

### 15. WAREHOUSE MONITORING VIEWS

#### 15a. WAREHOUSE_LOAD_HISTORY (Information Schema -- last 14 days)

```sql
-- Query warehouse load history
SELECT * FROM TABLE(INFORMATION_SCHEMA.WAREHOUSE_LOAD_HISTORY(
  DATE_RANGE_START => DATEADD('day', -7, CURRENT_TIMESTAMP()),
  DATE_RANGE_END   => CURRENT_TIMESTAMP(),
  WAREHOUSE_NAME   => 'MY_WH'
));
```

#### 15b. WAREHOUSE_LOAD_HISTORY (Account Usage -- last 365 days)

```sql
-- Account Usage view
SELECT warehouse_name, start_time, end_time,
       avg_running, avg_queued_load, avg_queued_provisioning, avg_blocked
FROM SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_LOAD_HISTORY
WHERE warehouse_name = 'MY_WH'
  AND start_time >= DATEADD('day', -30, CURRENT_TIMESTAMP())
ORDER BY start_time;
```

**EXAM TIP:** Key columns in WAREHOUSE_LOAD_HISTORY:

- `AVG_RUNNING` -- average number of queries executing
- `AVG_QUEUED_LOAD` -- queries queued because warehouse is overloaded
- `AVG_QUEUED_PROVISIONING` -- queries queued because warehouse is provisioning
- `AVG_BLOCKED` -- queries blocked by a concurrent DML

**EXAM TIP:** If AVG_QUEUED_LOAD is consistently high, consider: adding more clusters (multi-cluster), increasing warehouse size, or enabling QAS.

#### 15c. QUERY_ACCELERATION_HISTORY

```sql
-- Information Schema table function
SELECT * FROM TABLE(INFORMATION_SCHEMA.QUERY_ACCELERATION_HISTORY(
  DATE_RANGE_START => DATEADD('day', -7, CURRENT_TIMESTAMP()),
  DATE_RANGE_END   => CURRENT_TIMESTAMP(),
  WAREHOUSE_NAME   => 'MY_WH'
));
```

```sql
-- Account Usage view -- total QAS credits by warehouse (month-to-date)
SELECT warehouse_name,
       SUM(credits_used) AS total_qas_credits
FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_ACCELERATION_HISTORY
WHERE start_time >= DATE_TRUNC('month', CURRENT_TIMESTAMP())
GROUP BY warehouse_name
ORDER BY total_qas_credits DESC;
```

#### 15d. WAREHOUSE_METERING_HISTORY

```sql
-- View credit consumption per warehouse
SELECT warehouse_name,
       SUM(credits_used) AS total_credits
FROM SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_METERING_HISTORY
WHERE start_time >= DATEADD('day', -30, CURRENT_TIMESTAMP())
GROUP BY warehouse_name
ORDER BY total_credits DESC;
```

---

### 16. SPILLING TO STORAGE (Performance Problem)

```text
-- Spilling is NOT controlled by SQL -- it happens automatically when
-- a query operation exceeds available memory.
--
-- Spilling hierarchy:
-- 1. Memory (fastest)
-- 2. Local SSD / Local Disk (slower)
-- 3. Remote Cloud Storage (S3/Azure Blob/GCS) (slowest)
--
-- Common causes: ORDER BY, GROUP BY, Window Functions, large JOINs, large CTEs
--
-- Diagnosis: Check the Query Profile for:
--   "Bytes spilled to local storage"
--   "Bytes spilled to remote storage"
--
-- Also query Account Usage:
```

```sql
-- Find queries with the most remote spilling (worst offenders)
SELECT query_id, query_text, warehouse_name, warehouse_size,
       bytes_spilled_to_local_storage,
       bytes_spilled_to_remote_storage,
       total_elapsed_time / 1000 AS elapsed_seconds
FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY
WHERE bytes_spilled_to_remote_storage > 0
  AND start_time >= DATEADD('day', -7, CURRENT_TIMESTAMP())
ORDER BY bytes_spilled_to_remote_storage DESC
LIMIT 10;
```

**EXAM TIP: Remedies for spilling:**

1. **Use a larger warehouse** -- more memory + more local SSD
2. **Optimize the query** -- reduce data volume, limit columns (avoid SELECT \*)
3. **Process in smaller batches** -- break up large operations
4. **Improve partition pruning** -- add/adjust clustering keys so less data is scanned
5. **Convert large CTEs to temp tables** -- CTEs hold results in memory

**EXAM TIP:** Remote spilling is FAR worse than local spilling. If you see remote spilling, upsizing the warehouse is often the most effective fix. Local spilling may be acceptable for large operations.

---

### 17. USE_CACHED_RESULT PARAMETER

```sql
-- Disable result cache for current session (useful for benchmarking/testing)
ALTER SESSION SET USE_CACHED_RESULT = FALSE;

-- Re-enable
ALTER SESSION SET USE_CACHED_RESULT = TRUE;

-- Set at account level
ALTER ACCOUNT SET USE_CACHED_RESULT = FALSE;

-- Check current value
SHOW PARAMETERS LIKE 'USE_CACHED_RESULT' IN SESSION;
```

**EXAM TIP:** Default value is TRUE. When FALSE, Snowflake will re-execute queries even if cached results exist. Useful for performance testing / benchmarking. Can be set at account or session level (NOT warehouse level).

---

### 18. SHOW PARAMETERS (Performance Investigation)

```sql
-- Show all parameters for a warehouse
SHOW PARAMETERS IN WAREHOUSE my_wh;

-- Show all parameters for current session
SHOW PARAMETERS IN SESSION;

-- Show all parameters for account
SHOW PARAMETERS IN ACCOUNT;

-- Filter for specific parameters
SHOW PARAMETERS LIKE '%TIMEOUT%' IN WAREHOUSE my_wh;
SHOW PARAMETERS LIKE '%CACHE%' IN SESSION;
SHOW PARAMETERS LIKE '%QUERY_TAG%' IN SESSION;
```

---

### 19. LAST_QUERY_ID() AND QUERY ID FUNCTIONS

```sql
-- Get the ID of the most recently executed query in this session
SELECT LAST_QUERY_ID();
```

```sql
-- Get the ID of the 2nd most recent query
SELECT LAST_QUERY_ID(-2);
```

```sql
-- Get the ID of the first query in the session
SELECT LAST_QUERY_ID(1);
```

```sql
-- Combine with RESULT_SCAN to process previous results
SHOW TABLES;
SELECT * FROM TABLE(RESULT_SCAN(LAST_QUERY_ID()));
```

---

### 20. QUICK REFERENCE: EDITION REQUIREMENTS

| Feature                        | Minimum Edition |
| ------------------------------ | --------------- |
| Multi-cluster Warehouses       | Enterprise      |
| Automatic Clustering           | Enterprise      |
| Materialized Views             | Enterprise      |
| Search Optimization Service    | Enterprise      |
| Query Acceleration Service     | Standard (all)  |
| Resource Monitors              | Standard (all)  |
| Query Profile / EXPLAIN        | Standard (all)  |
| Result Cache / Warehouse Cache | Standard (all)  |

---

### 21. QUICK REFERENCE: SERVERLESS vs WAREHOUSE-BASED FEATURES

| Feature                       | Compute Source      | Billed Separately? |
| ----------------------------- | ------------------- | ------------------ |
| Automatic Clustering          | Serverless          | Yes                |
| Materialized View Maintenance | Serverless          | Yes                |
| Search Optimization Service   | Serverless          | Yes                |
| Query Acceleration Service    | Serverless          | Yes (per-second)   |
| Query Execution               | Virtual Warehouse   | Warehouse credits  |
| EXPLAIN Plan                  | Cloud Services Only | Cloud services     |
| Result Cache Retrieval        | Cloud Services Only | Cloud services     |
| Metadata Cache Retrieval      | Cloud Services Only | Cloud services     |

**EXAM TIP:** Serverless features are NOT tracked by Resource Monitors. Resource monitors only track user-managed warehouse credits and cloud services credits.

---

### 22. KEY SYSTEM FUNCTIONS SUMMARY

```sql
-- Clustering analysis
SELECT SYSTEM$CLUSTERING_DEPTH('table_name');
SELECT SYSTEM$CLUSTERING_DEPTH('table_name', '(col1, col2)');
SELECT SYSTEM$CLUSTERING_INFORMATION('table_name');
SELECT SYSTEM$CLUSTERING_INFORMATION('table_name', '(col1, col2)');

-- Search optimization cost estimate
SELECT SYSTEM$ESTIMATE_SEARCH_OPTIMIZATION_COSTS('table_name');

-- Query acceleration estimate (pass a query ID)
SELECT SYSTEM$ESTIMATE_QUERY_ACCELERATION('query_id');

-- Cancel queries
SELECT SYSTEM$CANCEL_QUERY('query_id');
SELECT SYSTEM$CANCEL_ALL_QUERIES(session_id);

-- EXPLAIN plan as JSON
SELECT SYSTEM$EXPLAIN_PLAN_JSON('SELECT ...');
SELECT SYSTEM$EXPLAIN_JSON_TO_TEXT(json_plan);

-- Warehouse abort all queries
-- (Use SYSTEM$CANCEL_ALL_QUERIES with session ID instead)
```

---

### 23. COMMON EXAM SCENARIOS

#### Scenario: Users report slow queries during peak hours

- **Answer:** Use multi-cluster warehouse (scale out) with STANDARD scaling policy, OR enable Query Acceleration Service.

#### Scenario: Same query runs fast once, slow the next time

- **Answer:** Result cache was invalidated (data changed, or 24hr expired), OR warehouse was suspended (clearing local disk cache).

#### Scenario: Query profile shows bytes spilled to remote storage

- **Answer:** Increase warehouse size (more memory/SSD), optimize the query, or process in smaller batches.

#### Scenario: Need to limit monthly credit spend

- **Answer:** Create a Resource Monitor with CREDIT_QUOTA and SUSPEND/SUSPEND_IMMEDIATE triggers.

#### Scenario: Large table scanned fully despite narrow WHERE clause

- **Answer:** Add a clustering key on the filter columns, OR enable search optimization for point lookups.

#### Scenario: SELECT COUNT(\*) returns instantly with no warehouse

- **Answer:** Metadata cache returned the result (no compute needed).

#### Scenario: Need to track which pipeline a query belongs to

- **Answer:** Use ALTER SESSION SET QUERY_TAG to label queries, then filter in QUERY_HISTORY.

#### Scenario: Need to see query plan without executing the query

- **Answer:** Use EXPLAIN (TABULAR, TEXT, or JSON format). Runs in cloud services only, no warehouse needed.

#### Scenario: Materialized view definition needs to include a JOIN

- **Answer:** NOT possible. Materialized views can only query a single table. Use a regular view or table for JOINs.

---

## Domain 4: Data Loading & Unloading -- SQL Syntax Cheat Sheet

> **SnowPro Core COF-C02 | Weight: 10-15%**

---

### 1. STAGES

#### 1.1 Stage Types & References

```text
Stage Type       | Reference       | Description
-----------------|-----------------|-----------------------------------------
User stage       | @~              | Each user has one; cannot be altered/dropped
Table stage      | @%table_name    | Each table has one; cannot be altered/dropped
Named internal   | @stage_name     | Created with CREATE STAGE (no URL)
Named external   | @stage_name     | Created with CREATE STAGE (with URL)
```

**EXAM TIP**: User stages (@~) and table stages (@%table) are automatically created. They have NO grantable privileges of their own. Named stages require CREATE STAGE privilege.

**EXAM TIP**: Table stages do NOT support file format options in the stage definition. You must specify file format in the COPY INTO command. Table stages also do NOT support transformations during load.

#### 1.2 Create Internal Named Stage

```sql
-- Create a named internal stage (data stored within Snowflake)
CREATE OR REPLACE STAGE my_internal_stage
  FILE_FORMAT = (TYPE = CSV FIELD_DELIMITER = '|' SKIP_HEADER = 1)
  COMMENT = 'Internal stage for CSV loads';
```

```sql
-- Create an internal stage with a named file format
CREATE OR REPLACE STAGE my_stage
  FILE_FORMAT = my_csv_format;
```

```sql
-- Create a TEMPORARY stage (dropped at end of session)
CREATE TEMPORARY STAGE my_temp_stage
  FILE_FORMAT = (TYPE = JSON);
```

#### 1.3 Create External Stage -- Amazon S3

```sql
-- External stage for S3 using storage integration (RECOMMENDED)
CREATE OR REPLACE STAGE my_s3_stage
  STORAGE_INTEGRATION = s3_int
  URL = 's3://mybucket/path/'
  FILE_FORMAT = (TYPE = CSV);
```

```sql
-- External stage for S3 using credentials directly (NOT recommended)
CREATE OR REPLACE STAGE my_s3_stage
  URL = 's3://mybucket/path/'
  CREDENTIALS = (AWS_KEY_ID = 'xxxx' AWS_SECRET_KEY = 'yyyy')
  ENCRYPTION = (TYPE = 'AWS_SSE_S3')
  FILE_FORMAT = (TYPE = CSV);
```

#### 1.4 Create External Stage -- Azure Blob Storage

```sql
-- External stage for Azure using storage integration
CREATE OR REPLACE STAGE my_azure_stage
  STORAGE_INTEGRATION = azure_int
  URL = 'azure://myaccount.blob.core.windows.net/container/path/'
  FILE_FORMAT = (TYPE = PARQUET);
```

**EXAM TIP**: Azure URLs use `azure://` protocol in Snowflake, NOT `https://`.

#### 1.5 Create External Stage -- Google Cloud Storage

```sql
-- External stage for GCS using storage integration
CREATE OR REPLACE STAGE my_gcs_stage
  STORAGE_INTEGRATION = gcs_int
  URL = 'gcs://mybucket/path/'
  FILE_FORMAT = (TYPE = JSON);
```

**EXAM TIP**: GCS storage integrations ONLY support storage integration authentication. Direct credential-based auth is NOT supported for GCS.

#### 1.6 Stage with Directory Table

```sql
-- Create a stage with directory table enabled
CREATE OR REPLACE STAGE my_dir_stage
  URL = 's3://mybucket/path/'
  STORAGE_INTEGRATION = s3_int
  DIRECTORY = (ENABLE = TRUE AUTO_REFRESH = TRUE);
```

```sql
-- Enable directory table on an existing stage
ALTER STAGE my_stage SET DIRECTORY = (ENABLE = TRUE);
```

```sql
-- Refresh directory table metadata manually
ALTER STAGE my_stage REFRESH;
```

```sql
-- Query a directory table
SELECT * FROM DIRECTORY(@my_dir_stage);
```

**EXAM TIP**: Directory tables store FILE-LEVEL metadata (filename, size, last modified, file URL). They work on BOTH internal and external stages.

---

### 2. STORAGE INTEGRATION

```sql
-- Create storage integration for S3 (requires ACCOUNTADMIN or CREATE INTEGRATION privilege)
CREATE OR REPLACE STORAGE INTEGRATION s3_int
  TYPE = EXTERNAL_STAGE
  STORAGE_PROVIDER = 'S3'
  ENABLED = TRUE
  STORAGE_AWS_ROLE_ARN = 'arn:aws:iam::123456789012:role/myrole'
  STORAGE_ALLOWED_LOCATIONS = ('s3://mybucket/path1/', 's3://mybucket/path2/')
  STORAGE_BLOCKED_LOCATIONS = ('s3://mybucket/sensitive/');
```

```sql
-- Create storage integration for Azure
CREATE OR REPLACE STORAGE INTEGRATION azure_int
  TYPE = EXTERNAL_STAGE
  STORAGE_PROVIDER = 'AZURE'
  ENABLED = TRUE
  AZURE_TENANT_ID = '<tenant_id>'
  STORAGE_ALLOWED_LOCATIONS = ('azure://myaccount.blob.core.windows.net/container/');
```

```sql
-- Create storage integration for GCS
CREATE OR REPLACE STORAGE INTEGRATION gcs_int
  TYPE = EXTERNAL_STAGE
  STORAGE_PROVIDER = 'GCS'
  ENABLED = TRUE
  STORAGE_ALLOWED_LOCATIONS = ('gcs://mybucket/');
```

```sql
-- View integration details (to retrieve IAM user ARN for trust policy)
DESC STORAGE INTEGRATION s3_int;
```

**EXAM TIP**: Storage integrations avoid passing credentials in stage definitions. Only ACCOUNTADMIN (or a role with CREATE INTEGRATION privilege) can create them. A single integration can be used by MULTIPLE stages.

---

### 3. PUT COMMAND (Upload to Internal Stage)

```sql
-- Upload a local file to a named internal stage
PUT file:///tmp/data/myfile.csv @my_internal_stage;
```

```sql
-- Upload to user stage
PUT file:///tmp/data/myfile.csv @~;
```

```sql
-- Upload to table stage
PUT file:///tmp/data/myfile.csv @%my_table;
```

```sql
-- Upload with options
PUT file:///tmp/data/myfile.csv @my_stage/folder/
  PARALLEL = 4
  AUTO_COMPRESS = TRUE
  SOURCE_COMPRESSION = AUTO_DETECT
  OVERWRITE = FALSE;
```

```sql
-- Upload with wildcard pattern
PUT file:///tmp/data/data*.csv @my_stage;
```

**EXAM TIP**: PUT works with INTERNAL stages ONLY. It CANNOT upload to external stages (S3/Azure/GCS). Use cloud-native tools for external.

**EXAM TIP**: PUT and GET can ONLY be run from SnowSQL (CLI) or connectors/drivers. They CANNOT be run from the Snowsight web UI worksheets.

**EXAM TIP**: By default, PUT auto-compresses files with GZIP and files are encrypted with AES-128 (client-side) + AES-256 (server-side).

**EXAM TIP**: PUT ignores duplicate files by default (same name + same checksum). Use OVERWRITE = TRUE to force re-upload.

---

### 4. GET COMMAND (Download from Internal Stage)

```sql
-- Download from named internal stage to local directory
GET @my_internal_stage file:///tmp/output/;
```

```sql
-- Download from user stage
GET @~ file:///tmp/output/;
```

```sql
-- Download from table stage
GET @%my_table file:///tmp/output/;
```

```sql
-- Download with pattern filter and parallelism
GET @my_stage file:///tmp/output/
  PATTERN = '.*\.csv\.gz'
  PARALLEL = 10;
```

**EXAM TIP**: GET works with INTERNAL stages ONLY. Cannot download from external stages. Use cloud-native tools instead.

**EXAM TIP**: GET does NOT preserve the stage directory structure. If two files in different subdirectories share the same name, GET returns an error.

---

### 5. LIST COMMAND

```sql
-- List files in a named stage
LIST @my_stage;

-- Abbreviation
LS @my_stage;
```

```sql
-- List files in user stage
LIST @~;
```

```sql
-- List files in table stage
LIST @%my_table;
```

```sql
-- List with a path prefix
LIST @my_stage/folder1/subfolder/;
```

```sql
-- List with a regex pattern filter
LIST @my_stage PATTERN = '.*\.csv\.gz';
```

**EXAM TIP**: LIST works on BOTH internal AND external stages. It returns: name, size, md5, last_modified.

---

### 6. REMOVE COMMAND

```sql
-- Remove files from a named stage
REMOVE @my_stage/path/myfile.csv.gz;

-- Abbreviation
RM @my_stage/path/myfile.csv.gz;
```

```sql
-- Remove all files from a stage path
REMOVE @my_stage/folder1/;
```

```sql
-- Remove with pattern
REMOVE @my_stage PATTERN = '.*\.csv\.gz';
```

```sql
-- Remove from user stage
REMOVE @~/myfile.csv.gz;
```

```sql
-- Remove from table stage
REMOVE @%my_table/myfile.csv.gz;
```

**EXAM TIP**: REMOVE works on BOTH internal AND external stages. Do NOT remove staged files until COPY INTO has completed successfully. Check with COPY_HISTORY.

---

### 7. CREATE FILE FORMAT

#### 7.1 CSV File Format

```sql
CREATE OR REPLACE FILE FORMAT my_csv_format
  TYPE = CSV
  COMPRESSION = AUTO                  -- AUTO|GZIP|BZ2|BROTLI|ZSTD|DEFLATE|RAW_DEFLATE|NONE
  FIELD_DELIMITER = ','               -- column separator (default: ,)
  RECORD_DELIMITER = '\n'             -- row separator (default: \n)
  SKIP_HEADER = 1                     -- number of header rows to skip (default: 0)
  FIELD_OPTIONALLY_ENCLOSED_BY = '"'  -- character enclosing fields (default: NONE)
  NULL_IF = ('NULL', 'null', '\\N')   -- strings treated as SQL NULL
  EMPTY_FIELD_AS_NULL = TRUE          -- treat empty strings as NULL (default: TRUE for loading)
  TRIM_SPACE = FALSE                  -- trim leading/trailing whitespace
  ERROR_ON_COLUMN_COUNT_MISMATCH = TRUE  -- error if file cols != table cols (default: TRUE)
  ESCAPE = NONE                       -- escape character
  ESCAPE_UNENCLOSED_FIELD = '\\'      -- escape char for unenclosed fields
  DATE_FORMAT = 'AUTO'
  TIME_FORMAT = 'AUTO'
  TIMESTAMP_FORMAT = 'AUTO'
  ENCODING = 'UTF8'
  SKIP_BLANK_LINES = FALSE
  PARSE_HEADER = FALSE;               -- use first row as column names for INFER_SCHEMA
```

#### 7.2 JSON File Format

```sql
CREATE OR REPLACE FILE FORMAT my_json_format
  TYPE = JSON
  COMPRESSION = AUTO
  STRIP_OUTER_ARRAY = TRUE         -- remove outer [ ] from JSON arrays
  STRIP_NULL_VALUES = FALSE        -- remove key-value pairs with null values
  ALLOW_DUPLICATE = FALSE          -- allow duplicate keys
  ENABLE_OCTAL = FALSE             -- interpret octal numbers
  IGNORE_UTF8_ERRORS = FALSE       -- replace invalid UTF-8 with ?
  REPLACE_INVALID_CHARACTERS = FALSE
  DATE_FORMAT = 'AUTO'
  TIME_FORMAT = 'AUTO'
  TIMESTAMP_FORMAT = 'AUTO'
  MULTI_LINE = FALSE;              -- TRUE if JSON spans multiple lines
```

**EXAM TIP**: STRIP_OUTER_ARRAY = TRUE is critical when loading a JSON file that contains a top-level array `[{...},{...}]`. Without it, the entire array loads as ONE row.

#### 7.3 Parquet File Format

```sql
CREATE OR REPLACE FILE FORMAT my_parquet_format
  TYPE = PARQUET
  COMPRESSION = AUTO               -- AUTO|SNAPPY|LZO|NONE (for unloading: SNAPPY|LZO|NONE)
  BINARY_AS_TEXT = TRUE             -- interpret binary as text
  TRIM_SPACE = FALSE
  REPLACE_INVALID_CHARACTERS = FALSE
  USE_LOGICAL_TYPE = TRUE           -- interpret Parquet logical types
  USE_VECTORIZED_SCANNER = TRUE;    -- faster columnar reads (recommended for new workloads)
```

#### 7.4 Avro File Format

```sql
CREATE OR REPLACE FILE FORMAT my_avro_format
  TYPE = AVRO
  COMPRESSION = AUTO                -- AUTO|DEFLATE|SNAPPY|ZSTD|NONE
  TRIM_SPACE = FALSE
  REPLACE_INVALID_CHARACTERS = FALSE
  NULL_IF = ();
```

#### 7.5 ORC File Format

```sql
CREATE OR REPLACE FILE FORMAT my_orc_format
  TYPE = ORC
  TRIM_SPACE = FALSE
  REPLACE_INVALID_CHARACTERS = FALSE
  NULL_IF = ();
```

#### 7.6 XML File Format

```sql
CREATE OR REPLACE FILE FORMAT my_xml_format
  TYPE = XML
  COMPRESSION = AUTO
  IGNORE_UTF8_ERRORS = FALSE
  PRESERVE_SPACE = FALSE
  STRIP_OUTER_ELEMENT = FALSE
  DISABLE_SNOWFLAKE_DATA = FALSE
  DISABLE_AUTO_CONVERT = FALSE
  REPLACE_INVALID_CHARACTERS = FALSE;
```

**EXAM TIP**: AVRO, ORC, and XML are LOAD-ONLY. You CANNOT unload data to these formats. You CAN unload to CSV, JSON, and PARQUET only.

**EXAM TIP**: Temporary file formats can be created with `CREATE TEMPORARY FILE FORMAT` -- they last only for the session.

---

### 8. COPY INTO <table> (Data Loading)

#### 8.1 Basic Loading

```sql
-- Load from a named stage into a table
COPY INTO my_table
  FROM @my_stage
  FILE_FORMAT = (FORMAT_NAME = my_csv_format);
```

```sql
-- Load from a named stage using inline file format
COPY INTO my_table
  FROM @my_stage
  FILE_FORMAT = (TYPE = CSV FIELD_DELIMITER = '|' SKIP_HEADER = 1);
```

```sql
-- Load from user stage
COPY INTO my_table
  FROM @~
  FILE_FORMAT = (FORMAT_NAME = my_csv_format);
```

```sql
-- Load from table stage
COPY INTO my_table
  FROM @%my_table
  FILE_FORMAT = (FORMAT_NAME = my_csv_format);
```

```sql
-- Load from external stage (S3 path directly, no named stage)
COPY INTO my_table
  FROM 's3://mybucket/path/'
  STORAGE_INTEGRATION = s3_int
  FILE_FORMAT = (TYPE = CSV);
```

#### 8.2 Loading with File Selection

```sql
-- Load specific files by name
COPY INTO my_table
  FROM @my_stage
  FILES = ('file1.csv.gz', 'file2.csv.gz')
  FILE_FORMAT = (FORMAT_NAME = my_csv_format);
```

```sql
-- Load files matching a regex pattern
COPY INTO my_table
  FROM @my_stage
  PATTERN = '.*sales.*\.csv\.gz'
  FILE_FORMAT = (FORMAT_NAME = my_csv_format);
```

**EXAM TIP**: FILES takes a literal list of filenames. PATTERN takes a regex. You cannot use both at the same time.

#### 8.3 ON_ERROR Options

```sql
-- ABORT_STATEMENT (default for bulk loads): abort entire load on first error
COPY INTO my_table FROM @my_stage
  FILE_FORMAT = (FORMAT_NAME = my_csv_format)
  ON_ERROR = ABORT_STATEMENT;
```

```sql
-- CONTINUE: skip error rows, load everything else
COPY INTO my_table FROM @my_stage
  FILE_FORMAT = (FORMAT_NAME = my_csv_format)
  ON_ERROR = CONTINUE;
```

```sql
-- SKIP_FILE: skip entire file if any error is found
COPY INTO my_table FROM @my_stage
  FILE_FORMAT = (FORMAT_NAME = my_csv_format)
  ON_ERROR = SKIP_FILE;
```

```sql
-- SKIP_FILE_n: skip file if error count >= n
COPY INTO my_table FROM @my_stage
  FILE_FORMAT = (FORMAT_NAME = my_csv_format)
  ON_ERROR = SKIP_FILE_5;
```

```sql
-- SKIP_FILE_n%: skip file if error percentage >= n%
COPY INTO my_table FROM @my_stage
  FILE_FORMAT = (FORMAT_NAME = my_csv_format)
  ON_ERROR = 'SKIP_FILE_10%';
```

**EXAM TIP**: Default ON_ERROR for COPY INTO is ABORT_STATEMENT. Default ON_ERROR for Snowpipe is SKIP_FILE.

**EXAM TIP**: SKIP_FILE_n% must be enclosed in quotes because of the % sign.

#### 8.4 VALIDATION_MODE Options (Dry Run -- No Data Loaded)

```sql
-- Return first N rows if no errors (validate only, no loading)
COPY INTO my_table FROM @my_stage
  FILE_FORMAT = (FORMAT_NAME = my_csv_format)
  VALIDATION_MODE = RETURN_10_ROWS;
```

```sql
-- Return all errors found across all files
COPY INTO my_table FROM @my_stage
  FILE_FORMAT = (FORMAT_NAME = my_csv_format)
  VALIDATION_MODE = RETURN_ERRORS;
```

```sql
-- Return all errors including from previously partially-loaded files
COPY INTO my_table FROM @my_stage
  FILE_FORMAT = (FORMAT_NAME = my_csv_format)
  VALIDATION_MODE = RETURN_ALL_ERRORS;
```

**EXAM TIP**: When VALIDATION_MODE is set, NO data is loaded. It only validates. It does NOT work with COPY statements that include transformations (SELECT).

#### 8.5 Other Important COPY Options

```sql
-- FORCE: reload files even if they were loaded before (bypass load metadata check)
COPY INTO my_table FROM @my_stage
  FILE_FORMAT = (FORMAT_NAME = my_csv_format)
  FORCE = TRUE;
```

```sql
-- PURGE: automatically delete staged files after successful load
COPY INTO my_table FROM @my_stage
  FILE_FORMAT = (FORMAT_NAME = my_csv_format)
  PURGE = TRUE;
```

```sql
-- SIZE_LIMIT: maximum size of data loaded in bytes (stops after next file exceeds limit)
COPY INTO my_table FROM @my_stage
  FILE_FORMAT = (FORMAT_NAME = my_csv_format)
  SIZE_LIMIT = 10485760;
```

```sql
-- RETURN_FAILED_ONLY: only show files that had errors in COPY output
COPY INTO my_table FROM @my_stage
  FILE_FORMAT = (FORMAT_NAME = my_csv_format)
  ON_ERROR = CONTINUE
  RETURN_FAILED_ONLY = TRUE;
```

```sql
-- MATCH_BY_COLUMN_NAME: match file columns to table columns by name (not position)
COPY INTO my_table FROM @my_stage
  FILE_FORMAT = (FORMAT_NAME = my_parquet_format)
  MATCH_BY_COLUMN_NAME = CASE_INSENSITIVE;
```

```sql
-- INCLUDE_METADATA: load file metadata alongside data (requires MATCH_BY_COLUMN_NAME)
COPY INTO my_table FROM @my_stage
  FILE_FORMAT = (FORMAT_NAME = my_parquet_format)
  MATCH_BY_COLUMN_NAME = CASE_INSENSITIVE
  INCLUDE_METADATA = (
    ingest_filename = METADATA$FILENAME,
    ingest_time = METADATA$START_SCAN_TIME
  );
```

**EXAM TIP**: By default, COPY INTO tracks loaded files via metadata for 64 days. It will NOT reload the same file unless FORCE = TRUE or the file is modified (different checksum).

**EXAM TIP**: SIZE_LIMIT does not split files. It stops loading AFTER the first file that causes the cumulative size to exceed the limit.

**EXAM TIP**: MATCH_BY_COLUMN_NAME is supported for Parquet, Avro, ORC, and JSON only. NOT for CSV. It CANNOT be combined with transformation (SELECT).

#### 8.6 Transformation During Load

```sql
-- Reorder, omit, and cast columns during load
COPY INTO my_table (city, zip, sale_date, price)
  FROM (
    SELECT
      SUBSTR(t.$2, 4),   -- transform column 2
      t.$1,              -- reorder column 1
      t.$5,              -- select column 5
      t.$4               -- select column 4 (skip column 3)
    FROM @my_stage t
  )
  FILE_FORMAT = (FORMAT_NAME = my_csv_format);
```

```sql
-- Load JSON into a VARIANT column
COPY INTO my_json_table (src)
  FROM (SELECT $1 FROM @my_stage)
  FILE_FORMAT = (TYPE = JSON);
```

```sql
-- Load with metadata columns
COPY INTO my_table (filename, row_num, col1, col2)
  FROM (
    SELECT
      METADATA$FILENAME,
      METADATA$FILE_ROW_NUMBER,
      t.$1,
      t.$2
    FROM @my_stage t
  )
  FILE_FORMAT = (FORMAT_NAME = my_csv_format);
```

```sql
-- Load with sequence-generated ID
CREATE OR REPLACE SEQUENCE my_seq;

COPY INTO my_table (id, col1, col2)
  FROM (
    SELECT my_seq.NEXTVAL, t.$1, t.$2
    FROM @my_stage t
  )
  FILE_FORMAT = (FORMAT_NAME = my_csv_format);
```

**EXAM TIP**: Supported transformations during load: column reorder, column omit, CAST, SQL functions, sequence values, FLATTEN. Transformations work from user stages and named stages ONLY (not table stages).

**EXAM TIP**: VALIDATION_MODE does NOT work with transformation queries.

---

### 9. COPY INTO <location> (Data Unloading)

#### 9.1 Basic Unloading

```sql
-- Unload table to a named internal stage
COPY INTO @my_stage/export/
  FROM my_table
  FILE_FORMAT = (TYPE = CSV FIELD_DELIMITER = '|' COMPRESSION = GZIP);
```

```sql
-- Unload table to an external stage
COPY INTO @my_s3_stage/export/
  FROM my_table
  FILE_FORMAT = (TYPE = PARQUET);
```

```sql
-- Unload a query result
COPY INTO @my_stage/export/
  FROM (SELECT col1, col2, col3 FROM my_table WHERE status = 'active')
  FILE_FORMAT = (TYPE = CSV);
```

```sql
-- Unload directly to an S3 path
COPY INTO 's3://mybucket/export/'
  FROM my_table
  STORAGE_INTEGRATION = s3_int
  FILE_FORMAT = (TYPE = CSV);
```

#### 9.2 Key Unloading Options

```sql
-- SINGLE: unload into a single file (default: FALSE)
COPY INTO @my_stage/export/all_data.csv
  FROM my_table
  FILE_FORMAT = (TYPE = CSV)
  SINGLE = TRUE
  MAX_FILE_SIZE = 5368709120;    -- increase max to avoid size error (5GB)
```

```sql
-- MAX_FILE_SIZE: control output file size (default: 16MB)
COPY INTO @my_stage/export/
  FROM my_table
  FILE_FORMAT = (TYPE = CSV)
  MAX_FILE_SIZE = 268435456;    -- 256MB per file
```

```sql
-- HEADER: include column names as first row (default: FALSE)
COPY INTO @my_stage/export/
  FROM my_table
  FILE_FORMAT = (TYPE = CSV)
  HEADER = TRUE;
```

```sql
-- OVERWRITE: overwrite existing files (default: FALSE)
COPY INTO @my_stage/export/
  FROM my_table
  FILE_FORMAT = (TYPE = CSV)
  OVERWRITE = TRUE;
```

```sql
-- PARTITION BY: partition output files by expression
COPY INTO @my_stage/export/
  FROM my_table
  PARTITION BY ('date=' || TO_VARCHAR(sale_date, 'YYYY-MM-DD'))
  FILE_FORMAT = (TYPE = PARQUET)
  HEADER = TRUE;
```

```sql
-- INCLUDE_QUERY_ID: add query ID to output file names (default: TRUE)
COPY INTO @my_stage/export/data_
  FROM my_table
  FILE_FORMAT = (TYPE = CSV)
  INCLUDE_QUERY_ID = TRUE;
```

**EXAM TIP**: Default MAX_FILE_SIZE is 16MB for unloading. Output is GZIP compressed by default for CSV.

**EXAM TIP**: SINGLE = TRUE produces ONE file. If data exceeds MAX_FILE_SIZE, it errors. Increase MAX_FILE_SIZE or set SINGLE = FALSE.

**EXAM TIP**: Unloading supports CSV, JSON, and PARQUET only. NOT Avro, ORC, or XML.

**EXAM TIP**: The PARTITION BY option is powerful for creating data lake-style directory structures.

---

### 10. VALIDATE() Table Function

```sql
-- Validate the most recent COPY INTO load in this session
SELECT * FROM TABLE(VALIDATE(my_table, JOB_ID => '_last'));
```

```sql
-- Validate a specific COPY INTO load by query ID
SELECT * FROM TABLE(VALIDATE(my_table, JOB_ID => '019b9ee5-0500-845a-0043-4d83000124f6'));
```

**EXAM TIP**: VALIDATE() returns ALL errors from a previous COPY INTO load. The JOB_ID is the query ID of the COPY INTO statement (found in Query History). Use `_last` for the most recent load in the current session.

**EXAM TIP**: VALIDATE does NOT work with loads that used data transformations (SELECT).

---

### 11. COPY_HISTORY Table Function

```sql
-- View load history for a table in the last 24 hours
SELECT *
FROM TABLE(INFORMATION_SCHEMA.COPY_HISTORY(
  TABLE_NAME => 'MY_TABLE',
  START_TIME => DATEADD(hours, -24, CURRENT_TIMESTAMP())
));
```

```sql
-- View load history for a specific pipe
SELECT *
FROM TABLE(INFORMATION_SCHEMA.COPY_HISTORY(
  TABLE_NAME => 'MY_TABLE',
  START_TIME => DATEADD(days, -7, CURRENT_TIMESTAMP()),
  END_TIME => CURRENT_TIMESTAMP(),
  PIPE_NAME => 'MY_DB.MY_SCHEMA.MY_PIPE'
));
```

**EXAM TIP**: COPY_HISTORY returns history for the last 14 days. It includes both COPY INTO and Snowpipe loads. Check the STATUS column (Loaded, Load Failed, Partially Loaded). The LOAD_HISTORY view (Information Schema) is limited to 10,000 rows; COPY_HISTORY (table function) is not.

**EXAM TIP**: Account Usage COPY_HISTORY view has up to 365 days of history but with up to 2-hour latency.

---

### 12. METADATA COLUMNS FOR STAGED FILES

```sql
-- Query metadata columns from staged files (always available)
SELECT
  METADATA$FILENAME,              -- full file path
  METADATA$FILE_ROW_NUMBER,       -- row number within the file
  METADATA$FILE_CONTENT_KEY,      -- checksum of the file
  METADATA$FILE_LAST_MODIFIED,    -- last modified timestamp (TIMESTAMP_NTZ)
  METADATA$START_SCAN_TIME,       -- operation start timestamp (TIMESTAMP_LTZ)
  t.$1, t.$2, t.$3
FROM @my_stage (FILE_FORMAT => my_csv_format) t;
```

**EXAM TIP**: Metadata columns must be queried BY NAME -- they are NOT included in SELECT \*. They are available for both internal and external stages.

---

### 13. SNOWPIPE (Continuous Data Ingestion)

#### 13.1 Create Pipe

```sql
-- Basic pipe (manual trigger via REST API)
CREATE OR REPLACE PIPE my_pipe
  AS
  COPY INTO my_table
  FROM @my_stage
  FILE_FORMAT = (FORMAT_NAME = my_csv_format);
```

```sql
-- Auto-ingest pipe for S3 (triggered by S3 event notifications via SQS)
CREATE OR REPLACE PIPE my_s3_pipe
  AUTO_INGEST = TRUE
  AS
  COPY INTO my_table
  FROM @my_s3_stage
  FILE_FORMAT = (TYPE = CSV SKIP_HEADER = 1);
```

```sql
-- Auto-ingest pipe for S3 with SNS topic
CREATE OR REPLACE PIPE my_pipe
  AUTO_INGEST = TRUE
  AWS_SNS_TOPIC = 'arn:aws:sns:us-west-2:123456789012:my_topic'
  AS
  COPY INTO my_table
  FROM @my_s3_stage
  FILE_FORMAT = (TYPE = JSON);
```

```sql
-- Auto-ingest pipe for GCS (using notification integration)
CREATE OR REPLACE PIPE my_gcs_pipe
  AUTO_INGEST = TRUE
  INTEGRATION = 'my_gcs_notification_int'
  AS
  COPY INTO my_table
  FROM @my_gcs_stage
  FILE_FORMAT = (TYPE = PARQUET);
```

```sql
-- Auto-ingest pipe for Azure (using notification integration)
CREATE OR REPLACE PIPE my_azure_pipe
  AUTO_INGEST = TRUE
  INTEGRATION = 'my_azure_notification_int'
  AS
  COPY INTO my_table
  FROM @my_azure_stage
  FILE_FORMAT = (TYPE = CSV);
```

```sql
-- Pipe with error notification integration
CREATE OR REPLACE PIPE my_pipe
  AUTO_INGEST = TRUE
  ERROR_INTEGRATION = my_error_notification_int
  AS
  COPY INTO my_table
  FROM @my_s3_stage
  FILE_FORMAT = (FORMAT_NAME = my_csv_format);
```

#### 13.2 Manage Pipes

```sql
-- View pipe definition and status
DESC PIPE my_pipe;
-- Returns: notification_channel (SQS queue ARN for auto-ingest setup)
```

```sql
-- Check pipe status (returns JSON with executionState, pendingFileCount, etc.)
SELECT SYSTEM$PIPE_STATUS('my_db.my_schema.my_pipe');
```

```sql
-- Pause a pipe
ALTER PIPE my_pipe SET PIPE_EXECUTION_PAUSED = TRUE;
```

```sql
-- Resume a pipe
ALTER PIPE my_pipe SET PIPE_EXECUTION_PAUSED = FALSE;
```

```sql
-- Force resume a stale pipe (paused > 14 days)
SELECT SYSTEM$PIPE_FORCE_RESUME('my_pipe', 'STALENESS_CHECK_OVERRIDE');
```

```sql
-- Refresh a pipe (manually submit files for loading)
ALTER PIPE my_pipe REFRESH;
```

```sql
-- Refresh with prefix filter and modified-after filter
ALTER PIPE my_pipe REFRESH
  PREFIX = '/folder1/'
  MODIFIED_AFTER = '2024-01-01T00:00:00Z';
```

```sql
-- View Snowpipe load history
SELECT *
FROM TABLE(INFORMATION_SCHEMA.PIPE_USAGE_HISTORY(
  DATE_RANGE_START => DATEADD(day, -7, CURRENT_TIMESTAMP()),
  DATE_RANGE_END => CURRENT_TIMESTAMP(),
  PIPE_NAME => 'my_db.my_schema.my_pipe'
));
```

```sql
-- Validate pipe load (troubleshoot)
SELECT *
FROM TABLE(VALIDATE_PIPE_LOAD(
  PIPE_NAME => 'my_db.my_schema.my_pipe',
  START_TIME => DATEADD(hour, -8, CURRENT_TIMESTAMP())
));
```

**EXAM TIP**: Snowpipe uses Snowflake-managed compute (serverless). It does NOT use your virtual warehouses. You pay per-file credits.

**EXAM TIP**: Snowpipe load order is NOT guaranteed. Oldest files are usually processed first, but no strict ordering.

**EXAM TIP**: Snowpipe load history is retained for 14 days.

**EXAM TIP**: Snowpipe default ON_ERROR is SKIP_FILE (different from bulk COPY INTO default of ABORT_STATEMENT).

**EXAM TIP**: A pipe definition is STATIC. If you rename/drop the stage or table, you must recreate the pipe.

**EXAM TIP**: If a pipe is paused for > 14 days, it becomes "stale" and requires SYSTEM$PIPE_FORCE_RESUME with STALENESS_CHECK_OVERRIDE.

**EXAM TIP**: Snowpipe ignores modified files re-staged with the same name. To reload, recreate the pipe with CREATE OR REPLACE PIPE.

---

### 14. SNOWPIPE STREAMING

```sql
-- Snowpipe Streaming does NOT use SQL to create channels.
-- Channels are created programmatically via the Snowflake Ingest SDK (Java/Python).
```

**Key Concepts for the Exam**:

- Snowpipe Streaming uses the Snowflake Ingest SDK (Java SDK available, Python SDK added with high-performance architecture)
- Data is streamed ROW-BY-ROW directly into tables -- NO staging files needed
- Lowest latency option: data available for query within seconds
- Each "channel" maps to a specific Snowflake table
- Offset tokens allow applications to track ingestion progress
- Uses serverless compute (no virtual warehouse required)
- High-performance architecture (2025): up to 10 GB/s per table, sub-10-second latency
- High-performance architecture uses PIPE objects as entry points with server-side transformation support

**EXAM TIP**: Snowpipe Streaming vs Standard Snowpipe:

- Standard Snowpipe: file-based, event-driven, seconds-to-minutes latency
- Snowpipe Streaming: row-based, API-driven, sub-10-second latency, no staging

---

### 15. EXTERNAL TABLES

```sql
-- Create external table on Parquet files in S3
CREATE OR REPLACE EXTERNAL TABLE my_ext_table
  WITH LOCATION = @my_s3_stage/data/
  AUTO_REFRESH = TRUE
  FILE_FORMAT = (TYPE = PARQUET);
```

```sql
-- External table with explicit column definitions (auto-partitioned)
CREATE OR REPLACE EXTERNAL TABLE my_ext_table (
  date_part DATE AS (
    TO_DATE(SPLIT_PART(METADATA$FILENAME, '/', 3), 'YYYY-MM-DD')
  ),
  col1 VARCHAR AS (VALUE:col1::VARCHAR),
  col2 NUMBER AS (VALUE:col2::NUMBER)
)
  PARTITION BY (date_part)
  WITH LOCATION = @my_s3_stage/data/
  AUTO_REFRESH = TRUE
  FILE_FORMAT = (TYPE = PARQUET);
```

```sql
-- External table with user-specified partitions
CREATE OR REPLACE EXTERNAL TABLE my_ext_table (
  year VARCHAR AS (METADATA$FILENAME::VARCHAR),
  col1 VARCHAR AS (VALUE:c1::VARCHAR)
)
  PARTITION BY (year)
  PARTITION_TYPE = USER_SPECIFIED
  WITH LOCATION = @my_s3_stage/data/
  FILE_FORMAT = (TYPE = PARQUET);
```

```sql
-- Manually add partitions (for USER_SPECIFIED partition type)
ALTER EXTERNAL TABLE my_ext_table ADD PARTITION (year = '2024')
  LOCATION '2024/';
```

```sql
-- Refresh external table metadata
ALTER EXTERNAL TABLE my_ext_table REFRESH;
```

```sql
-- Query an external table (uses VALUE pseudo-column for semi-structured)
SELECT
  VALUE:col1::VARCHAR AS col1,
  VALUE:col2::NUMBER AS col2
FROM my_ext_table;
```

**EXAM TIP**: External tables are READ-ONLY. No DML (INSERT, UPDATE, DELETE).

**EXAM TIP**: External tables store data OUTSIDE Snowflake. Only METADATA is stored in Snowflake.

**EXAM TIP**: External tables support all formats EXCEPT XML.

**EXAM TIP**: Use METADATA$FILENAME to derive partition columns from the file path.

**EXAM TIP**: External tables can have materialized views created on top of them for better query performance.

---

### 16. SEMI-STRUCTURED DATA & VARIANT

#### 16.1 Loading JSON into VARIANT

```sql
-- Table with a VARIANT column for JSON data
CREATE OR REPLACE TABLE my_json_table (
  src VARIANT
);

-- Load JSON file into VARIANT column
COPY INTO my_json_table
  FROM @my_stage
  FILE_FORMAT = (TYPE = JSON STRIP_OUTER_ARRAY = TRUE);
```

#### 16.2 Querying Semi-Structured Data

```sql
-- Dot notation (case-sensitive, returns VARIANT)
SELECT
  src:name::STRING AS name,
  src:address.city::STRING AS city,
  src:age::NUMBER AS age
FROM my_json_table;
```

```sql
-- Bracket notation (for keys with special characters or spaces)
SELECT
  src['name']::STRING AS name,
  src['home address']['zip code']::STRING AS zip
FROM my_json_table;
```

```sql
-- Array access (zero-based index)
SELECT
  src:items[0]:name::STRING AS first_item,
  src:items[1]:price::NUMBER AS second_item_price
FROM my_json_table;
```

#### 16.3 FLATTEN Function

```sql
-- Basic FLATTEN: expand an array into rows
SELECT
  src:name::STRING AS customer,
  f.VALUE::STRING AS phone_number
FROM my_json_table,
  LATERAL FLATTEN(INPUT => src:phone_numbers) f;
```

```sql
-- FLATTEN with all output columns
SELECT
  f.SEQ,        -- sequence number (unique per input row)
  f.KEY,        -- key for objects; NULL for arrays
  f.PATH,       -- path to this element
  f.INDEX,      -- array index; NULL for objects
  f.VALUE,      -- the flattened value
  f.THIS        -- the parent element being flattened
FROM my_json_table,
  LATERAL FLATTEN(INPUT => src:items) f;
```

```sql
-- FLATTEN nested structure (multiple levels)
SELECT
  src:name::STRING AS customer,
  o.VALUE:order_id::NUMBER AS order_id,
  i.VALUE:product::STRING AS product,
  i.VALUE:quantity::NUMBER AS quantity
FROM my_json_table,
  LATERAL FLATTEN(INPUT => src:orders) o,
  LATERAL FLATTEN(INPUT => o.VALUE:items) i;
```

```sql
-- FLATTEN with OUTER => TRUE (keep rows even if array is empty/null)
SELECT
  src:name::STRING AS customer,
  f.VALUE::STRING AS tag
FROM my_json_table,
  LATERAL FLATTEN(INPUT => src:tags, OUTER => TRUE) f;
```

```sql
-- FLATTEN with RECURSIVE (expand all levels)
SELECT
  f.KEY,
  f.PATH,
  f.VALUE,
  TYPEOF(f.VALUE) AS value_type
FROM my_json_table,
  LATERAL FLATTEN(INPUT => src, RECURSIVE => TRUE) f;
```

```sql
-- FLATTEN with MODE (OBJECT, ARRAY, or BOTH)
SELECT f.KEY, f.VALUE
FROM my_json_table,
  LATERAL FLATTEN(INPUT => src, MODE => 'OBJECT') f;
```

**EXAM TIP**: LATERAL FLATTEN is the standard pattern. LATERAL allows FLATTEN to reference columns from the preceding table in the FROM clause.

**EXAM TIP**: OUTER => TRUE is like a LEFT JOIN -- keeps the row even if the array is empty or NULL.

**EXAM TIP**: FLATTEN output columns: SEQ, KEY, PATH, INDEX, VALUE, THIS.

#### 16.4 Other Semi-Structured Functions

```sql
-- PARSE_JSON: convert string to VARIANT
SELECT PARSE_JSON('{"name": "Alice", "age": 30}') AS json_data;
```

```sql
-- OBJECT_CONSTRUCT: build a JSON object
SELECT OBJECT_CONSTRUCT('name', 'Alice', 'age', 30) AS json_obj;
```

```sql
-- ARRAY_CONSTRUCT: build a JSON array
SELECT ARRAY_CONSTRUCT(1, 2, 3, 'four') AS json_arr;
```

```sql
-- TO_VARIANT: convert to VARIANT
SELECT TO_VARIANT('hello') AS v;
```

```sql
-- TYPEOF: return the type of a VARIANT value
SELECT TYPEOF(src:age) FROM my_json_table;
-- Returns: 'INTEGER', 'VARCHAR', 'BOOLEAN', 'ARRAY', 'OBJECT', 'NULL_VALUE', etc.
```

```sql
-- ARRAY_SIZE: count elements in an array
SELECT ARRAY_SIZE(src:items) AS item_count FROM my_json_table;
```

```sql
-- OBJECT_KEYS: get all keys from an object
SELECT OBJECT_KEYS(src) AS keys FROM my_json_table;
```

```sql
-- GET / GET_PATH: extract element from VARIANT
SELECT GET(src, 'name') FROM my_json_table;
SELECT GET_PATH(src, 'address.city') FROM my_json_table;
```

---

### 17. SCHEMA DETECTION & EVOLUTION

#### 17.1 INFER_SCHEMA

```sql
-- Detect schema from staged files (Parquet, Avro, ORC, JSON, CSV)
SELECT *
FROM TABLE(INFER_SCHEMA(
  LOCATION => '@my_stage/data/',
  FILE_FORMAT => 'my_parquet_format'
));
-- Returns: COLUMN_NAME, TYPE, NULLABLE, EXPRESSION, FILENAMES, ORDER_ID
```

```sql
-- Detect schema for specific files
SELECT *
FROM TABLE(INFER_SCHEMA(
  LOCATION => '@my_stage/',
  FILE_FORMAT => 'my_parquet_format',
  FILES => 'file1.parquet'
));
```

#### 17.2 CREATE TABLE ... USING TEMPLATE

```sql
-- Auto-create table based on file schema
CREATE OR REPLACE TABLE my_auto_table
  USING TEMPLATE (
    SELECT ARRAY_AGG(OBJECT_CONSTRUCT(*))
    FROM TABLE(INFER_SCHEMA(
      LOCATION => '@my_stage/data/',
      FILE_FORMAT => 'my_parquet_format'
    ))
  );
```

```sql
-- For CSV files with PARSE_HEADER, preserve column order
CREATE OR REPLACE TABLE my_csv_table
  USING TEMPLATE (
    SELECT ARRAY_AGG(OBJECT_CONSTRUCT(*))
      WITHIN GROUP (ORDER BY ORDER_ID)
    FROM TABLE(INFER_SCHEMA(
      LOCATION => '@my_stage/data.csv',
      FILE_FORMAT => 'my_csv_format_with_parse_header'
    ))
  );
```

#### 17.3 Schema Evolution

```sql
-- Enable schema evolution on a table
ALTER TABLE my_table SET ENABLE_SCHEMA_EVOLUTION = TRUE;

-- Or create with schema evolution enabled
CREATE OR REPLACE TABLE my_table (col1 VARCHAR)
  ENABLE_SCHEMA_EVOLUTION = TRUE;
```

```sql
-- Load with MATCH_BY_COLUMN_NAME (required for schema evolution)
-- New columns in the file are automatically added to the table
COPY INTO my_table
  FROM @my_stage
  FILE_FORMAT = (FORMAT_NAME = my_parquet_format)
  MATCH_BY_COLUMN_NAME = CASE_INSENSITIVE;
```

**EXAM TIP**: INFER_SCHEMA works with named stages and user stages ONLY (not table stages). Supported file types: Parquet, Avro, ORC, JSON, CSV.

**EXAM TIP**: USING TEMPLATE creates the table structure but loads NO data. You must COPY INTO separately.

**EXAM TIP**: Schema evolution requires both ENABLE_SCHEMA_EVOLUTION = TRUE on the table AND MATCH_BY_COLUMN_NAME in the COPY INTO. The loading role needs EVOLVE SCHEMA or OWNERSHIP privilege.

---

### 18. GENERATE_COLUMN_DESCRIPTION

```sql
-- Generate column description string from INFER_SCHEMA output
SELECT GENERATE_COLUMN_DESCRIPTION(
  ARRAY_AGG(OBJECT_CONSTRUCT(*)),
  'TABLE'
) AS col_desc
FROM TABLE(INFER_SCHEMA(
  LOCATION => '@my_stage/',
  FILE_FORMAT => 'my_parquet_format'
));
```

---

### 19. FILE SIZING & BEST PRACTICES

**EXAM TIP**: Optimal compressed file size for loading: 100-250 MB. This enables effective parallel processing across warehouse nodes.

**EXAM TIP**: Split large files before loading. A single large file cannot be processed in parallel by multiple nodes if it is too big.

**EXAM TIP**: Use GZIP, BZIP2, BROTLI, ZSTD, or DEFLATE compression. Snowflake auto-detects compression with COMPRESSION = AUTO.

**EXAM TIP**: For CSV files, default compression for COPY INTO (unloading) is GZIP. For Parquet, default is SNAPPY.

---

### 20. QUICK REFERENCE: LOADING vs UNLOADING COMPARISON

```text
Feature                  | COPY INTO <table>         | COPY INTO <location>
-------------------------|---------------------------|---------------------------
Direction                | Stage -> Table (LOAD)     | Table/Query -> Stage (UNLOAD)
ON_ERROR                 | Yes                       | No
VALIDATION_MODE          | Yes                       | RETURN_ROWS only
FORCE                    | Yes                       | No
PURGE                    | Yes                       | No
FILES / PATTERN          | Yes                       | No
SINGLE                   | No                        | Yes
MAX_FILE_SIZE            | No                        | Yes (default 16MB)
HEADER                   | No (use SKIP_HEADER)      | Yes
OVERWRITE                | No                        | Yes
PARTITION BY             | No                        | Yes
SIZE_LIMIT               | Yes                       | No
MATCH_BY_COLUMN_NAME     | Yes                       | No
INCLUDE_METADATA         | Yes                       | No
Default ON_ERROR         | ABORT_STATEMENT           | N/A
Supported formats        | CSV,JSON,Parquet,Avro,    | CSV, JSON, Parquet ONLY
                         | ORC,XML                   |
Requires warehouse       | Yes                       | Yes
```

---

### 21. COMMAND AVAILABILITY SUMMARY

```text
Command     | Internal Stage | External Stage | Web UI (Snowsight) | SnowSQL/Drivers
------------|----------------|----------------|--------------------|----------------
PUT         | Yes            | NO             | NO                 | Yes
GET         | Yes            | NO             | NO                 | Yes
LIST        | Yes            | Yes            | Yes                | Yes
REMOVE      | Yes            | Yes            | Yes                | Yes
COPY INTO   | Yes            | Yes            | Yes                | Yes
```

---

### 22. CRITICAL EXAM DISTINCTIONS

1. **Bulk Loading (COPY INTO)** uses YOUR virtual warehouse compute and credits.
   **Snowpipe** uses Snowflake-managed serverless compute.
   **Snowpipe Streaming** also uses serverless compute.

2. **64-day load metadata retention**: COPY INTO remembers which files it loaded for 64 days to prevent duplicates.
   **14-day Snowpipe load history**: Snowpipe retains file load history for only 14 days.

3. **FORCE = TRUE** bypasses the duplicate file check and reloads everything.
   **PURGE = TRUE** deletes files from the stage after a successful load.

4. **ON_ERROR defaults**: ABORT_STATEMENT for COPY INTO, SKIP_FILE for Snowpipe.

5. **PUT/GET** = internal stages only, SnowSQL/drivers only.
   **LIST/REMOVE** = both internal and external stages, any client.

6. **External tables** = read-only, data stays outside Snowflake, metadata in Snowflake.
   **Directory tables** = implicit object on a stage, provides file-level metadata only.

7. **STRIP_OUTER_ARRAY** = JSON loading. Removes outer `[]` brackets so each element becomes a separate row.
   Without it, the entire JSON array loads as ONE row.

8. **VALIDATION_MODE** validates but loads NOTHING. Cannot be used with transformations.
   **VALIDATE()** table function reviews errors AFTER a load has already been attempted.

9. **Unload formats**: CSV, JSON, Parquet ONLY. Cannot unload to Avro, ORC, or XML.

10. **MATCH_BY_COLUMN_NAME**: Parquet, Avro, ORC, JSON only. NOT CSV. Cannot combine with SELECT transformations.

---

## Domain 5: Data Transformations -- SnowPro Core COF-C02 Cheat Sheet

> **Exam Weight: 20-25%** -- This is one of the highest-weighted domains.
> Covers structured data (views, UDFs, stored procedures, streams, tasks, window functions),
> semi-structured data (VARIANT, FLATTEN, JSON functions), and unstructured data.

---

### 1. VIEWS

```sql
-- CREATE a standard (non-materialized) view
-- A virtual table; query executes each time the view is referenced
CREATE OR REPLACE VIEW my_view AS
SELECT col1, col2 FROM my_table WHERE col1 > 10;

-- CREATE a SECURE view (hides definition from non-owner roles)
-- Use for data sharing and row-level security scenarios
CREATE OR REPLACE SECURE VIEW my_secure_view AS
SELECT col1, col2 FROM my_table WHERE col1 > 10;

-- CREATE a MATERIALIZED view (pre-computed, stored results)
-- Requires Enterprise Edition or higher
-- Can only query from ONE table (no joins, no self-joins)
CREATE OR REPLACE MATERIALIZED VIEW my_mat_view AS
SELECT col1, SUM(col2) AS total
FROM my_table
GROUP BY col1;

-- CREATE a SECURE MATERIALIZED view (pre-computed + hidden definition)
CREATE OR REPLACE SECURE MATERIALIZED VIEW my_secure_mat_view AS
SELECT col1, SUM(col2) AS total FROM my_table GROUP BY col1;

-- Convert an existing view to/from SECURE
ALTER VIEW my_view SET SECURE;
ALTER VIEW my_view UNSET SECURE;
```

**EXAM TIPS -- Views:**

- Materialized views can only query ONE table (no joins).
- Materialized views have storage cost AND background compute cost for maintenance.
- Secure views hide the view definition from non-owner roles (SHOW VIEWS won't display it).
- Secure views may be slower because they bypass certain query optimizations.
- Secure materialized views combine both benefits: pre-computed + hidden definition.
- For data sharing, you MUST use secure views (or secure UDFs).
- Query profile for secure views does NOT expose data scanned (to protect underlying data).

---

### 2. USER-DEFINED FUNCTIONS (UDFs)

```sql
-- SQL UDF (scalar) -- simplest form, inline expression
CREATE OR REPLACE FUNCTION add_tax(price FLOAT)
  RETURNS FLOAT
  AS 'price * 1.08';

-- SQL UDF returning a TABLE (UDTF)
CREATE OR REPLACE FUNCTION get_employees_by_dept(dept_name VARCHAR)
  RETURNS TABLE (emp_id INT, emp_name VARCHAR)
  AS 'SELECT emp_id, emp_name FROM employees WHERE department = dept_name';

-- JavaScript UDF
CREATE OR REPLACE FUNCTION js_double(x FLOAT)
  RETURNS FLOAT
  LANGUAGE JAVASCRIPT
  AS $$
    return X * 2;   // Note: argument names are UPPERCASED in JavaScript UDFs
  $$;

-- Python UDF
CREATE OR REPLACE FUNCTION py_upper(s VARCHAR)
  RETURNS VARCHAR
  LANGUAGE PYTHON
  RUNTIME_VERSION = '3.12'
  HANDLER = 'upper_func'
  AS $$
def upper_func(s):
    return s.upper()
$$;

-- Java UDF
CREATE OR REPLACE FUNCTION java_strlen(s VARCHAR)
  RETURNS INT
  LANGUAGE JAVA
  RUNTIME_VERSION = '17'
  HANDLER = 'MyClass.strlen'
  AS $$
  class MyClass {
    public static int strlen(String s) {
      return s.length();
    }
  }
  $$;

-- SECURE UDF (hides definition, required for sharing)
CREATE OR REPLACE SECURE FUNCTION secure_mask(val VARCHAR)
  RETURNS VARCHAR
  AS 'CONCAT(''***'', RIGHT(val, 4))';

-- Calling a scalar UDF (used inline in SELECT)
SELECT add_tax(100.00);
SELECT col1, add_tax(price) FROM products;

-- Calling a table UDF (used in FROM clause)
SELECT * FROM TABLE(get_employees_by_dept('Engineering'));
```

**EXAM TIPS -- UDFs:**

- UDFs are called as PART of a SQL statement (in SELECT, WHERE, etc.).
- UDFs MUST return a value (scalar or table).
- UDFs CANNOT perform DML/DDL (no INSERT, UPDATE, DELETE, CREATE).
- UDFs can only execute queries (SELECT).
- Multiple UDFs can be called in a single SQL statement.
- Supported languages: SQL, JavaScript, Python, Java, Scala.
- JavaScript UDF arguments are automatically UPPERCASED inside the function body.
- For Python/Java UDFs, you must specify HANDLER and RUNTIME_VERSION.

---

### 3. STORED PROCEDURES

```sql
-- Snowflake Scripting (SQL) stored procedure
CREATE OR REPLACE PROCEDURE sp_cleanup_old_data(days_old INT)
  RETURNS VARCHAR
  LANGUAGE SQL
  AS
  BEGIN
    DELETE FROM logs WHERE created_at < DATEADD(day, -days_old, CURRENT_TIMESTAMP());
    RETURN 'Cleanup complete';
  END;

-- JavaScript stored procedure
CREATE OR REPLACE PROCEDURE sp_js_example(table_name VARCHAR)
  RETURNS VARCHAR
  LANGUAGE JAVASCRIPT
  EXECUTE AS CALLER
  AS $$
    var sql = "SELECT COUNT(*) AS cnt FROM " + TABLE_NAME;
    var stmt = snowflake.createStatement({sqlText: sql});
    var rs = stmt.execute();
    rs.next();
    return rs.getColumnValue("CNT").toString();
  $$;

-- Python stored procedure
CREATE OR REPLACE PROCEDURE sp_python_copy(from_tbl STRING, to_tbl STRING, n INT)
  RETURNS STRING
  LANGUAGE PYTHON
  RUNTIME_VERSION = '3.12'
  PACKAGES = ('snowflake-snowpark-python')
  HANDLER = 'run'
  AS $$
def run(session, from_tbl, to_tbl, n):
    session.table(from_tbl).limit(n).write.save_as_table(to_tbl)
    return "SUCCESS"
$$;

-- Java stored procedure
CREATE OR REPLACE PROCEDURE sp_java_hello(name VARCHAR)
  RETURNS VARCHAR
  LANGUAGE JAVA
  RUNTIME_VERSION = '17'
  PACKAGES = ('com.snowflake:snowpark:latest')
  HANDLER = 'Hello.greet'
  AS $$
  class Hello {
    public static String greet(com.snowflake.snowpark.Session session, String name) {
      return "Hello, " + name + "!";
    }
  }
  $$;

-- Scala stored procedure
CREATE OR REPLACE PROCEDURE sp_scala_example()
  RETURNS VARCHAR
  LANGUAGE SCALA
  RUNTIME_VERSION = '2.12'
  PACKAGES = ('com.snowflake:snowpark:latest')
  HANDLER = 'MyScala.run'
  AS $$
  object MyScala {
    def run(session: com.snowflake.snowpark.Session): String = {
      "Hello from Scala"
    }
  }
  $$;

-- Calling a stored procedure (always via CALL)
CALL sp_cleanup_old_data(30);
CALL sp_js_example('my_table');

-- Caller's rights vs Owner's rights
-- EXECUTE AS CALLER  = runs with privileges of the calling role
-- EXECUTE AS OWNER   = runs with privileges of the owner role (DEFAULT)
CREATE OR REPLACE PROCEDURE sp_owner_rights()
  RETURNS VARCHAR
  LANGUAGE SQL
  EXECUTE AS OWNER     -- This is the DEFAULT
  AS
  BEGIN
    RETURN 'I run as owner';
  END;
```

**EXAM TIPS -- Stored Procedures:**

- Stored procedures are called with CALL (independent statement, NOT in SELECT).
- Only ONE stored procedure per CALL statement.
- Stored procedures CAN perform DML and DDL (INSERT, UPDATE, DELETE, CREATE, DROP, etc.).
- Return value is OPTIONAL (but a RETURNS clause is still required in syntax).
- Default execution rights = OWNER's rights.
- Stored procedures are NOT atomic -- if one statement fails, previous ones are NOT rolled back.
- Supported languages: SQL (Snowflake Scripting), JavaScript, Python, Java, Scala.
- Stored procedures support overloading (same name, different parameter signatures).

---

### 4. UDF vs STORED PROCEDURE -- KEY DIFFERENCES

```text
+---------------------------+---------------------------+---------------------------+
| Feature                   | UDF (CREATE FUNCTION)     | Stored Proc (CREATE PROC) |
+---------------------------+---------------------------+---------------------------+
| Called as                  | Part of SQL expression    | Independent CALL statement|
|                           | (SELECT myudf(col))       | (CALL myproc())           |
+---------------------------+---------------------------+---------------------------+
| Returns value             | ALWAYS required           | Optional                  |
+---------------------------+---------------------------+---------------------------+
| DML/DDL support           | NO (queries only)         | YES                       |
+---------------------------+---------------------------+---------------------------+
| Multiple per statement    | YES                       | NO (one per CALL)         |
+---------------------------+---------------------------+---------------------------+
| Caller/Owner rights       | N/A                       | YES (default: owner)      |
+---------------------------+---------------------------+---------------------------+
| Languages supported       | SQL, JS, Python, Java,    | SQL Script, JS, Python,   |
|                           | Scala                     | Java, Scala               |
+---------------------------+---------------------------+---------------------------+
| Used in WHERE/SELECT/etc. | YES                       | NO                        |
+---------------------------+---------------------------+---------------------------+
```

---

### 5. STREAMS (Change Data Capture)

```sql
-- Standard stream: tracks ALL DML (INSERT, UPDATE, DELETE)
CREATE OR REPLACE STREAM my_stream ON TABLE my_table;

-- Append-only stream: tracks INSERTs only (no updates/deletes)
-- More performant than standard; good for ELT pipelines
CREATE OR REPLACE STREAM append_stream ON TABLE my_table
  APPEND_ONLY = TRUE;

-- Insert-only stream: for EXTERNAL TABLES and external-catalog Iceberg tables
CREATE OR REPLACE STREAM ext_stream ON EXTERNAL TABLE my_ext_table
  INSERT_ONLY = TRUE;

-- Stream on a VIEW
CREATE OR REPLACE STREAM view_stream ON VIEW my_view;

-- Stream on a DIRECTORY TABLE (for unstructured data in stages)
CREATE OR REPLACE STREAM dir_stream ON STAGE my_stage;

-- Stream with specific offset (AT / BEFORE for Time Travel)
CREATE OR REPLACE STREAM my_stream ON TABLE my_table
  AT (TIMESTAMP => '2024-01-01 00:00:00'::TIMESTAMP_LTZ);

-- Query the stream (returns CDC records)
SELECT * FROM my_stream;

-- Check if a stream has consumable data
SELECT SYSTEM$STREAM_HAS_DATA('my_stream');
```

#### Stream Metadata Columns

```sql
-- Every stream adds these 3 metadata columns:
-- METADATA$ACTION      = 'INSERT' or 'DELETE'
-- METADATA$ISUPDATE    = TRUE if part of an UPDATE, FALSE otherwise
-- METADATA$ROW_ID      = Unique, immutable row identifier

-- Example: query stream to see changes
SELECT
  METADATA$ACTION,
  METADATA$ISUPDATE,
  METADATA$ROW_ID,
  col1, col2
FROM my_stream;

-- HOW UPDATES APPEAR IN STREAMS:
-- An UPDATE = 1 DELETE row + 1 INSERT row, both with METADATA$ISUPDATE = TRUE
-- A pure INSERT = 1 INSERT row with METADATA$ISUPDATE = FALSE
-- A pure DELETE = 1 DELETE row with METADATA$ISUPDATE = FALSE
```

**EXAM TIPS -- Streams:**

- Standard streams track INSERT, UPDATE, DELETE (net changes via delta).
- Append-only streams track INSERTs only (no netting, more performant).
- Insert-only streams are specifically for external tables.
- Streams leverage Time Travel under the hood (no separate storage).
- Streams have NO Fail-safe and NO Time Travel retention of their own.
- A stream offset advances ONLY when the stream is consumed in a DML transaction.
- SYSTEM$STREAM_HAS_DATA() returns TRUE/FALSE -- commonly used with Tasks.
- Standard streams cannot track geospatial data changes (use append-only instead).

---

### 6. TASKS

```sql
-- Task with a CRON schedule (runs every day at 9 AM UTC)
CREATE OR REPLACE TASK daily_task
  WAREHOUSE = my_wh
  SCHEDULE = 'USING CRON 0 9 * * * UTC'
AS
  INSERT INTO summary SELECT * FROM raw_data;

-- Task with an interval schedule (every 5 minutes)
CREATE OR REPLACE TASK interval_task
  WAREHOUSE = my_wh
  SCHEDULE = '5 MINUTES'
AS
  CALL my_stored_procedure();

-- Serverless task (no warehouse needed, auto-managed compute)
CREATE OR REPLACE TASK serverless_task
  USER_TASK_MANAGED_INITIAL_WAREHOUSE_SIZE = 'XSMALL'
  SCHEDULE = '10 MINUTES'
AS
  INSERT INTO target SELECT * FROM source;

-- Task with a WHEN condition (only runs if stream has data)
CREATE OR REPLACE TASK cdc_task
  WAREHOUSE = my_wh
  SCHEDULE = '1 MINUTE'
  WHEN SYSTEM$STREAM_HAS_DATA('my_stream')
AS
  INSERT INTO target SELECT * FROM my_stream WHERE METADATA$ACTION = 'INSERT';

-- CRON expression format:
-- ┌───── minute (0-59)
-- │ ┌───── hour (0-23)
-- │ │ ┌───── day of month (1-31, or L)
-- │ │ │ ┌───── month (1-12, JAN-DEC)
-- │ │ │ │ ┌───── day of week (0-6, SUN-SAT, or L)
-- │ │ │ │ │
-- * * * * *

-- CRON examples:
-- '0 9 * * MON-FRI America/New_York'   = weekdays at 9 AM ET
-- '*/5 * * * * UTC'                     = every 5 minutes
-- '0 0 1 * * UTC'                       = first day of every month at midnight
-- '0 9-17 * * SUN America/Los_Angeles'  = Sundays 9AM-5PM PT (hourly)
```

#### Task Trees / DAGs (Directed Acyclic Graphs)

```sql
-- ROOT TASK (has the schedule)
CREATE OR REPLACE TASK root_task
  WAREHOUSE = my_wh
  SCHEDULE = '5 MINUTES'
AS
  SELECT 1;

-- CHILD TASK A (runs AFTER root_task completes)
-- Child tasks do NOT have a SCHEDULE -- they use AFTER
CREATE OR REPLACE TASK child_a
  WAREHOUSE = my_wh
  AFTER root_task
AS
  INSERT INTO table_a SELECT * FROM source_a;

-- CHILD TASK B (also runs AFTER root_task -- parallel with child_a)
CREATE OR REPLACE TASK child_b
  WAREHOUSE = my_wh
  AFTER root_task
AS
  INSERT INTO table_b SELECT * FROM source_b;

-- GRANDCHILD TASK C (runs AFTER both child_a AND child_b complete)
CREATE OR REPLACE TASK grandchild_c
  WAREHOUSE = my_wh
  AFTER child_a, child_b
AS
  INSERT INTO final_table SELECT * FROM table_a JOIN table_b;

-- FINALIZER TASK (cleanup -- runs after ALL tasks in DAG complete, even on failure)
CREATE OR REPLACE TASK finalizer_task
  WAREHOUSE = my_wh
  FINALIZE = root_task
AS
  CALL cleanup_procedure();
```

#### Task Management

```sql
-- Tasks are SUSPENDED by default when created -- you MUST resume them
ALTER TASK root_task RESUME;
ALTER TASK child_a RESUME;
ALTER TASK child_b RESUME;

-- IMPORTANT: Resume child tasks BEFORE the root task!
-- Suspend tasks (root first, then children)
ALTER TASK root_task SUSPEND;

-- Any ALTER TASK change automatically SUSPENDS the task

-- Execute a task manually (one-time, on demand)
EXECUTE TASK root_task;

-- View task execution history
SELECT * FROM TABLE(INFORMATION_SCHEMA.TASK_HISTORY())
ORDER BY SCHEDULED_TIME DESC;

-- View task history for a specific task
SELECT * FROM TABLE(INFORMATION_SCHEMA.TASK_HISTORY(
  TASK_NAME => 'root_task',
  SCHEDULED_TIME_RANGE_START => DATEADD(hour, -1, CURRENT_TIMESTAMP())
));
```

**EXAM TIPS -- Tasks:**

- Tasks are always created in a SUSPENDED state.
- Only the ROOT task has a SCHEDULE. Child tasks use AFTER.
- A task graph (DAG) is limited to 1000 tasks max.
- A single task can have up to 100 parent tasks and 100 child tasks.
- All tasks in a DAG must be in the same database and schema, owned by the same role.
- Any ALTER TASK automatically SUSPENDS the task.
- Resume children BEFORE the root task; suspend root BEFORE children.
- SYSTEM$STREAM_HAS_DATA() is commonly used in the WHEN clause.
- Serverless tasks use USER_TASK_MANAGED_INITIAL_WAREHOUSE_SIZE (no warehouse param).
- EXECUTE TASK can manually trigger a task (even if suspended).
- Minimum schedule interval: 1 minute (CRON) or seconds-level with interval syntax.

---

### 7. SEMI-STRUCTURED DATA ACCESS (VARIANT)

```sql
-- Colon notation: access top-level key in a VARIANT column
SELECT src:name FROM json_table;

-- Dot notation: traverse nested keys
SELECT src:address.city FROM json_table;

-- Bracket notation: access keys (especially with special chars or spaces)
SELECT src['name'] FROM json_table;
SELECT src['address']['city'] FROM json_table;

-- Array element access (0-based index)
SELECT src:hobbies[0] FROM json_table;

-- Combine notations
SELECT src:employees[0].name FROM json_table;
SELECT src:employees[0]['name'] FROM json_table;

-- Cast VARIANT values to specific types using ::
SELECT src:name::VARCHAR AS name,
       src:age::INT AS age,
       src:salary::FLOAT AS salary
FROM json_table;
```

**EXAM TIPS -- VARIANT Access:**

- Colon `:` is for the FIRST level (column:key).
- Dot `.` is for nested levels (column:key.subkey).
- Bracket `['key']` works at any level and is needed for keys with special characters.
- Array access is 0-based: `col:arr[0]`.
- JSON keys are CASE-SENSITIVE (col:City is different from col:city).
- Values extracted from VARIANT are VARIANT type -- you must cast with `::` for typed output.
- Without casting, string values appear with double quotes around them.

---

### 8. SEMI-STRUCTURED FUNCTIONS

```sql
-- PARSE_JSON: convert a JSON string to VARIANT
SELECT PARSE_JSON('{"name":"John","age":30}');

-- TRY_PARSE_JSON: same but returns NULL on invalid JSON instead of error
SELECT TRY_PARSE_JSON('not valid json');  -- Returns NULL

-- TO_JSON: convert VARIANT back to a JSON string
SELECT TO_JSON(my_variant_col) FROM my_table;

-- TO_VARIANT: wrap any value as VARIANT (does NOT parse JSON)
SELECT TO_VARIANT('hello');        -- VARIANT string "hello"
SELECT PARSE_JSON('{"a":1}');      -- VARIANT object {a:1}
-- KEY DIFFERENCE: TO_VARIANT wraps as-is, PARSE_JSON interprets the structure

-- OBJECT_CONSTRUCT: build a JSON object from key-value pairs
SELECT OBJECT_CONSTRUCT('name', 'Alice', 'age', 30);
-- Returns: {"age": 30, "name": "Alice"}

-- OBJECT_CONSTRUCT with * (from table row)
SELECT OBJECT_CONSTRUCT(*) FROM my_table;
-- Converts each row into a JSON object using column names as keys

-- NOTE: NULL values are OMITTED from OBJECT_CONSTRUCT output
SELECT OBJECT_CONSTRUCT('a', 1, 'b', NULL);
-- Returns: {"a": 1}   (key 'b' is omitted)

-- ARRAY_CONSTRUCT: build an array from values
SELECT ARRAY_CONSTRUCT(1, 2, 3);
-- Returns: [1, 2, 3]

-- ARRAY_AGG: aggregate rows into an array
SELECT department, ARRAY_AGG(employee_name) AS employees
FROM emp
GROUP BY department;

-- ARRAY_AGG with DISTINCT and ordering
SELECT ARRAY_AGG(DISTINCT status) WITHIN GROUP (ORDER BY status ASC)
FROM orders;

-- OBJECT_AGG: aggregate key-value pairs into an object
SELECT OBJECT_AGG(key_col, value_col) FROM my_table;

-- OBJECT_INSERT: add or update a key in an object
SELECT OBJECT_INSERT(my_obj, 'new_key', 'new_value');

-- OBJECT_DELETE: remove a key from an object
SELECT OBJECT_DELETE(my_obj, 'key_to_remove');

-- ARRAY_APPEND / ARRAY_PREPEND
SELECT ARRAY_APPEND(ARRAY_CONSTRUCT(1,2,3), 4);   -- [1,2,3,4]
SELECT ARRAY_PREPEND(ARRAY_CONSTRUCT(2,3,4), 1);   -- [1,2,3,4]

-- ARRAY_SIZE: return number of elements
SELECT ARRAY_SIZE(ARRAY_CONSTRUCT(1,2,3));          -- 3

-- ARRAY_CONTAINS: check if value exists in array
SELECT ARRAY_CONTAINS(42::VARIANT, my_array_col);   -- TRUE/FALSE

-- ARRAY_SLICE: extract a portion of an array
SELECT ARRAY_SLICE(ARRAY_CONSTRUCT(0,1,2,3,4), 1, 3);  -- [1, 2]
```

---

### 9. FLATTEN FUNCTION

```sql
-- Basic FLATTEN: explode an ARRAY into rows
SELECT value
FROM TABLE(FLATTEN(input => PARSE_JSON('[1,2,3]')));

-- LATERAL FLATTEN on a table column (most common pattern)
SELECT t.id, f.value::VARCHAR AS hobby
FROM my_table t,
  LATERAL FLATTEN(input => t.data:hobbies) f;

-- FLATTEN with PATH (navigate to a nested array)
SELECT f.value:name::VARCHAR AS name
FROM my_table t,
  LATERAL FLATTEN(input => t.data, path => 'employees') f;

-- FLATTEN with OUTER => TRUE (include rows even if array is empty/null)
-- Similar to a LEFT JOIN -- produces a row with NULLs if nothing to flatten
SELECT t.id, f.value::VARCHAR AS item
FROM my_table t,
  LATERAL FLATTEN(input => t.data:items, outer => TRUE) f;

-- FLATTEN with RECURSIVE => TRUE (flatten all nested structures)
SELECT f.key, f.path, f.value
FROM my_table t,
  LATERAL FLATTEN(input => t.data, recursive => TRUE) f;

-- FLATTEN with MODE (control what gets flattened)
-- MODE => 'OBJECT'  = only flatten objects
-- MODE => 'ARRAY'   = only flatten arrays
-- MODE => 'BOTH'    = flatten both (default)
SELECT f.key, f.value
FROM my_table t,
  LATERAL FLATTEN(input => t.data, mode => 'OBJECT') f;

-- Multi-level nested LATERAL FLATTEN
SELECT
  t.id,
  f1.value:dept::VARCHAR AS department,
  f2.value:name::VARCHAR AS employee_name
FROM my_table t,
  LATERAL FLATTEN(input => t.data:departments) f1,
  LATERAL FLATTEN(input => f1.value:employees) f2;
```

#### FLATTEN Output Columns

```sql
-- FLATTEN returns these columns:
-- SEQ   = Sequence number (unique per input record)
-- KEY   = Key name (for objects); NULL for arrays
-- PATH  = Path to the flattened element
-- INDEX = Array index (0-based); NULL for objects
-- VALUE = The actual value of the element
-- THIS  = The element being flattened (useful in recursive mode)

SELECT seq, key, path, index, value, this
FROM TABLE(FLATTEN(input => PARSE_JSON('{"a":1,"b":[10,20]}')));
```

**EXAM TIPS -- FLATTEN:**

- FLATTEN is a TABLE function -- use in FROM clause with TABLE() or LATERAL.
- LATERAL allows FLATTEN to reference columns from prior tables in FROM.
- OUTER => TRUE is like a LEFT JOIN (keeps rows with empty/null arrays).
- Default MODE is 'BOTH' (flattens arrays and objects).
- RECURSIVE => TRUE traverses all levels of nesting.
- VALUE is the most commonly referenced output column.
- For multi-level nesting, chain multiple LATERAL FLATTEN calls.

---

### 10. TYPEOF AND TYPE INSPECTION

```sql
-- TYPEOF: returns the data type of a VARIANT value as VARCHAR
-- Used specifically for VARIANT data (semi-structured type inspection)
SELECT TYPEOF(PARSE_JSON('{"a":1}'):a);           -- Returns: 'INTEGER'
SELECT TYPEOF(PARSE_JSON('"hello"'));               -- Returns: 'VARCHAR'
SELECT TYPEOF(PARSE_JSON('true'));                   -- Returns: 'BOOLEAN'
SELECT TYPEOF(PARSE_JSON('null'));                   -- Returns: 'NULL_VALUE'
SELECT TYPEOF(PARSE_JSON('[1,2,3]'));               -- Returns: 'ARRAY'
SELECT TYPEOF(PARSE_JSON('{"x":1}'));               -- Returns: 'OBJECT'

-- SYSTEM$TYPEOF: returns the actual SQL data type (not for VARIANT inspection)
SELECT SYSTEM$TYPEOF(42);                           -- Returns: 'NUMBER(2,0)[SB1]'
SELECT SYSTEM$TYPEOF('hello');                      -- Returns: 'VARCHAR(5)[LOB]'
SELECT SYSTEM$TYPEOF(CURRENT_TIMESTAMP());          -- Returns: 'TIMESTAMP_LTZ(9)[LOB]'
```

**EXAM TIP:** TYPEOF is for inspecting what type a value is INSIDE a VARIANT.
SYSTEM$TYPEOF is for inspecting the SQL data type of any expression.

---

### 11. TYPE CASTING AND SAFE CASTING

```sql
-- CAST function
SELECT CAST('2024-01-15' AS DATE);
SELECT CAST(42.5 AS INT);

-- :: cast operator (shorthand for CAST)
SELECT '2024-01-15'::DATE;
SELECT 42.5::INT;
SELECT my_variant_col:name::VARCHAR;

-- TRY_CAST: returns NULL instead of error on failure
-- ONLY works with STRING input expressions
SELECT TRY_CAST('2024-01-15' AS DATE);              -- Returns: 2024-01-15
SELECT TRY_CAST('not-a-date' AS DATE);              -- Returns: NULL (no error)
SELECT TRY_CAST('123' AS NUMBER);                    -- Returns: 123
SELECT TRY_CAST('abc' AS NUMBER);                    -- Returns: NULL

-- TRY_TO_NUMBER / TRY_TO_DECIMAL / TRY_TO_NUMERIC (all synonyms)
-- Returns NULL on conversion failure
SELECT TRY_TO_NUMBER('123.45');                      -- Returns: 123
SELECT TRY_TO_NUMBER('abc');                         -- Returns: NULL
SELECT TRY_TO_NUMBER('$1,234.56', '$9,999.99');     -- With format mask
SELECT TRY_TO_DECIMAL('123.45', 10, 2);             -- Precision 10, scale 2

-- TRY_TO_DATE: returns NULL instead of error on failure
SELECT TRY_TO_DATE('2024-01-15');                    -- Returns: 2024-01-15
SELECT TRY_TO_DATE('not-a-date');                    -- Returns: NULL
SELECT TRY_TO_DATE('15/01/2024', 'DD/MM/YYYY');    -- With format

-- TRY_TO_TIMESTAMP: returns NULL instead of error on failure
SELECT TRY_TO_TIMESTAMP('2024-01-15 10:30:00');
SELECT TRY_TO_TIMESTAMP('invalid');                  -- Returns: NULL

-- TRY_TO_BOOLEAN
SELECT TRY_TO_BOOLEAN('true');                       -- Returns: TRUE
SELECT TRY_TO_BOOLEAN('maybe');                      -- Returns: NULL
```

**EXAM TIPS -- Casting:**

- `::` is the shorthand for CAST (e.g., `col::INT` = `CAST(col AS INT)`).
- `::` has HIGHER precedence than arithmetic operators. Use parentheses: `(a * b)::VARCHAR`.
- TRY_CAST only works with STRING inputs (not numeric-to-numeric).
- TRY*TO*\* functions return NULL on failure instead of raising errors.
- Use TRY\_\* functions when data quality is uncertain (e.g., loading external data).

---

### 12. WINDOW FUNCTIONS

#### Ranking Functions

```sql
-- ROW_NUMBER: unique sequential integer (1,2,3,4...) -- no ties
SELECT
  employee_name,
  department,
  salary,
  ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS row_num
FROM employees;

-- RANK: same rank for ties, SKIPS subsequent ranks (1,2,2,4...)
SELECT
  employee_name,
  salary,
  RANK() OVER (ORDER BY salary DESC) AS rank_val
FROM employees;

-- DENSE_RANK: same rank for ties, NO GAPS (1,2,2,3...)
SELECT
  employee_name,
  salary,
  DENSE_RANK() OVER (ORDER BY salary DESC) AS dense_rank_val
FROM employees;

-- NTILE: distributes rows into N roughly equal buckets
SELECT
  employee_name,
  salary,
  NTILE(4) OVER (ORDER BY salary DESC) AS quartile
FROM employees;

-- Compare all three ranking functions:
-- Values: 100, 90, 90, 80
-- ROW_NUMBER:  1, 2, 3, 4  (always unique)
-- RANK:        1, 2, 2, 4  (ties get same rank, next rank skipped)
-- DENSE_RANK:  1, 2, 2, 3  (ties get same rank, no skip)
```

#### Navigation / Offset Functions

```sql
-- LAG: access a previous row's value (default offset = 1)
SELECT
  order_date,
  amount,
  LAG(amount) OVER (ORDER BY order_date) AS prev_amount,
  LAG(amount, 2, 0) OVER (ORDER BY order_date) AS two_back_default_zero
FROM orders;

-- LEAD: access a subsequent row's value (default offset = 1)
SELECT
  order_date,
  amount,
  LEAD(amount) OVER (ORDER BY order_date) AS next_amount
FROM orders;

-- FIRST_VALUE: get the first value in the window frame
SELECT
  employee_name,
  department,
  salary,
  FIRST_VALUE(employee_name) OVER (
    PARTITION BY department ORDER BY salary DESC
  ) AS highest_paid
FROM employees;

-- LAST_VALUE: get the last value in the window frame
-- IMPORTANT: must specify frame to get true last value
SELECT
  employee_name,
  salary,
  LAST_VALUE(employee_name) OVER (
    PARTITION BY department ORDER BY salary DESC
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ) AS lowest_paid
FROM employees;

-- NTH_VALUE: get the Nth row's value
SELECT
  employee_name,
  salary,
  NTH_VALUE(employee_name, 2) OVER (
    PARTITION BY department ORDER BY salary DESC
  ) AS second_highest
FROM employees;

-- NTH_VALUE FROM LAST
SELECT
  NTH_VALUE(employee_name, 2) FROM LAST OVER (
    PARTITION BY department ORDER BY salary DESC
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ) AS second_lowest
FROM employees;

-- IGNORE NULLS option (works with LAG, LEAD, FIRST_VALUE, LAST_VALUE, NTH_VALUE)
SELECT
  FIRST_VALUE(col) IGNORE NULLS OVER (ORDER BY id) AS first_non_null
FROM my_table;
```

#### Aggregate Window Functions

```sql
-- Running total
SELECT
  order_date,
  amount,
  SUM(amount) OVER (ORDER BY order_date) AS running_total
FROM orders;

-- Moving average (3-row window)
SELECT
  order_date,
  amount,
  AVG(amount) OVER (
    ORDER BY order_date
    ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING
  ) AS moving_avg
FROM orders;

-- COUNT within partition
SELECT
  department,
  employee_name,
  COUNT(*) OVER (PARTITION BY department) AS dept_count
FROM employees;
```

---

### 13. QUALIFY CLAUSE

```sql
-- QUALIFY: filter on window function results (like HAVING for GROUP BY)
-- Eliminates need for subqueries when filtering window function output

-- Get top 1 per department by salary
SELECT employee_name, department, salary
FROM employees
QUALIFY ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) = 1;

-- Equivalent without QUALIFY (requires subquery):
SELECT * FROM (
  SELECT employee_name, department, salary,
    ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS rn
  FROM employees
) WHERE rn = 1;

-- QUALIFY with column alias from SELECT
SELECT employee_name, department, salary,
  RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS sal_rank
FROM employees
QUALIFY sal_rank <= 3;

-- QUALIFY can reference a window function NOT in SELECT
SELECT employee_name, department, salary
FROM employees
QUALIFY DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) = 1;

-- SQL clause execution order:
-- FROM -> WHERE -> GROUP BY -> HAVING -> SELECT (window funcs) -> QUALIFY -> ORDER BY -> LIMIT
```

**EXAM TIPS -- QUALIFY:**

- QUALIFY is Snowflake-specific (NOT ANSI standard). Also in Teradata, BigQuery, Databricks.
- Evaluated AFTER window functions are computed.
- You CANNOT use window functions in WHERE (evaluated too early).
- Can reference column aliases defined in SELECT.
- Can contain aggregates and subqueries in the predicate.
- Drastically simplifies deduplication and top-N queries.

---

### 14. MERGE STATEMENT

```sql
-- MERGE: combine INSERT, UPDATE, DELETE in one atomic statement
MERGE INTO target_table t
USING source_table s
ON t.id = s.id
WHEN MATCHED AND s.status = 'DELETE' THEN
  DELETE
WHEN MATCHED THEN
  UPDATE SET t.name = s.name, t.updated_at = CURRENT_TIMESTAMP()
WHEN NOT MATCHED THEN
  INSERT (id, name, updated_at) VALUES (s.id, s.name, CURRENT_TIMESTAMP());

-- MERGE with a subquery as source
MERGE INTO target t
USING (SELECT id, name FROM staging WHERE valid = TRUE) s
ON t.id = s.id
WHEN MATCHED THEN UPDATE SET t.name = s.name
WHEN NOT MATCHED THEN INSERT (id, name) VALUES (s.id, s.name);

-- MERGE with CTE
MERGE INTO target t
USING (
  WITH cte AS (SELECT * FROM raw_data WHERE processed = FALSE)
  SELECT * FROM cte
) s
ON t.id = s.id
WHEN MATCHED THEN UPDATE SET t.value = s.value
WHEN NOT MATCHED THEN INSERT (id, value) VALUES (s.id, s.value);
```

**EXAM TIPS -- MERGE:**

- At least ONE of WHEN MATCHED / WHEN NOT MATCHED is required.
- Multiple WHEN MATCHED clauses are allowed (evaluated in order).
- A clause without AND must be LAST of its type (catch-all).
- If multiple source rows match one target row, behavior is nondeterministic.
- ERROR_ON_NONDETERMINISTIC_MERGE session parameter controls whether this raises an error.

---

### 15. INSERT OVERWRITE

```sql
-- INSERT OVERWRITE: atomically replaces ALL data in the table
-- Equivalent to TRUNCATE + INSERT but in a single atomic operation
INSERT OVERWRITE INTO my_table
SELECT * FROM staging_table;

-- INSERT OVERWRITE with specific columns
INSERT OVERWRITE INTO dim_customers (customer_id, customer_name)
SELECT id, name FROM stg_customers;
```

**EXAM TIP:** INSERT OVERWRITE truncates the target table and inserts new data atomically.

---

### 16. CTAS, CREATE TABLE LIKE, CREATE TABLE CLONE

```sql
-- CTAS (CREATE TABLE AS SELECT): creates AND populates a new table
CREATE OR REPLACE TABLE new_table AS
SELECT col1, col2, col1 * col2 AS computed
FROM source_table
WHERE col1 > 100;

-- Column names and types are inferred from the SELECT
-- You can also explicitly define columns:
CREATE OR REPLACE TABLE new_table (x INT, y VARCHAR) AS
SELECT col1, col2 FROM source_table;

-- CTAS with COPY GRANTS (preserve grants when replacing)
CREATE OR REPLACE TABLE new_table COPY GRANTS AS
SELECT * FROM source_table;

-- CREATE TABLE LIKE: copies structure ONLY (no data)
-- Copies column names, types, defaults, constraints
CREATE OR REPLACE TABLE empty_copy LIKE source_table;

-- CREATE TABLE CLONE: zero-copy clone (structure + data, no actual copy)
-- Uses Snowflake's metadata pointers -- instant and free until data diverges
CREATE OR REPLACE TABLE cloned_table CLONE source_table;

-- Clone with Time Travel (clone as of a specific point in time)
CREATE OR REPLACE TABLE cloned_table CLONE source_table
  AT (TIMESTAMP => '2024-01-01 00:00:00'::TIMESTAMP_LTZ);

CREATE OR REPLACE TABLE cloned_table CLONE source_table
  BEFORE (STATEMENT => '<query_id>');
```

**EXAM TIPS:**

- CTAS = structure + data (from query results).
- LIKE = structure only (empty table).
- CLONE = structure + data (zero-copy, metadata-only until data diverges).
- CLONE supports Time Travel (AT/BEFORE). LIKE does not.
- CLONE copies grants by default. CTAS does NOT (unless COPY GRANTS specified).

---

### 17. SEQUENCES

```sql
-- CREATE a sequence
CREATE OR REPLACE SEQUENCE my_seq
  START WITH 1
  INCREMENT BY 1
  COMMENT = 'Auto-incrementing ID sequence';

-- Use sequence as column default
CREATE OR REPLACE TABLE my_table (
  id INT DEFAULT my_seq.NEXTVAL,
  name VARCHAR
);

-- Use sequence in INSERT
INSERT INTO my_table (id, name) VALUES (my_seq.NEXTVAL, 'Alice');

-- Use sequence in SELECT
SELECT my_seq.NEXTVAL;

-- AUTOINCREMENT / IDENTITY (inline alternative to sequences)
CREATE OR REPLACE TABLE auto_table (
  id INT AUTOINCREMENT START 1 INCREMENT 1,
  name VARCHAR
);
-- IDENTITY is a synonym for AUTOINCREMENT
CREATE OR REPLACE TABLE identity_table (
  id INT IDENTITY(1, 1),
  name VARCHAR
);

-- ORDER vs NOORDER
-- ORDER:   values are strictly increasing (slower with concurrency)
-- NOORDER: values are unique but may not be strictly ordered (faster, DEFAULT)
CREATE OR REPLACE SEQUENCE ordered_seq START WITH 1 INCREMENT BY 1 ORDER;
CREATE OR REPLACE SEQUENCE unordered_seq START WITH 1 INCREMENT BY 1 NOORDER;
```

**EXAM TIPS -- Sequences:**

- Sequences guarantee UNIQUE values, but NOT gap-free.
- AUTOINCREMENT and IDENTITY are synonymous.
- NOORDER is the default (better for concurrent inserts).
- ORDER ensures strictly increasing values but is slower.
- A sequence is a schema-level object, independent of any table.
- AUTOINCREMENT/IDENTITY is a column property, tied to a specific table.

---

### 18. GENERATOR AND TABLE FUNCTIONS

```sql
-- GENERATOR: create synthetic rows
-- Generate exactly 10 rows
SELECT SEQ4() AS row_num
FROM TABLE(GENERATOR(ROWCOUNT => 10));

-- Generate rows for a time limit (seconds)
SELECT SEQ4()
FROM TABLE(GENERATOR(TIMELIMIT => 5));

-- Generate a date range (common pattern)
SELECT DATEADD(day, SEQ4(), '2024-01-01'::DATE) AS calendar_date
FROM TABLE(GENERATOR(ROWCOUNT => 365));

-- Generate sequence numbers with UNIFORM random values
SELECT
  SEQ4() AS id,
  UNIFORM(1, 100, RANDOM()) AS random_val
FROM TABLE(GENERATOR(ROWCOUNT => 1000));

-- ROW_NUMBER with GENERATOR
SELECT ROW_NUMBER() OVER (ORDER BY SEQ4()) AS rn
FROM TABLE(GENERATOR(ROWCOUNT => 50));

-- RESULT_SCAN: query the result of a previous query
SELECT * FROM TABLE(RESULT_SCAN(LAST_QUERY_ID()));

-- VALIDATE: check data from a previous COPY INTO
SELECT * FROM TABLE(VALIDATE(my_table, JOB_ID => '_last'));
```

**EXAM TIP:** GENERATOR is commonly used to create date dimensions, test data, or
synthetic rows. It takes ROWCOUNT and/or TIMELIMIT parameters.

---

### 19. STRING FUNCTIONS

```sql
-- SPLIT_PART: split string by delimiter and return Nth part (1-based)
SELECT SPLIT_PART('a,b,c,d', ',', 2);          -- Returns: 'b'
SELECT SPLIT_PART('a,b,c,d', ',', -1);         -- Returns: 'd' (from end)

-- SPLIT: split into an ARRAY
SELECT SPLIT('a,b,c', ',');                     -- Returns: ["a","b","c"]

-- SPLIT_TO_TABLE: split into rows (table function)
SELECT value FROM TABLE(SPLIT_TO_TABLE('a,b,c', ','));

-- REGEXP_LIKE (RLIKE): pattern match returning TRUE/FALSE
-- Pattern is implicitly anchored (^pattern$)
SELECT REGEXP_LIKE('Snowflake', 'Snow.*');       -- Returns: TRUE
SELECT REGEXP_LIKE('Snowflake', 'snow.*');       -- Returns: FALSE (case-sensitive)
SELECT REGEXP_LIKE('Snowflake', 'snow.*', 'i');  -- Returns: TRUE (case-insensitive)

-- REGEXP_REPLACE: replace pattern matches
SELECT REGEXP_REPLACE('Phone: 123-456-7890', '[^0-9]', '');
-- Returns: '1234567890'

SELECT REGEXP_REPLACE('aaa bbb ccc', '\\s+', '-');
-- Returns: 'aaa-bbb-ccc'

-- REGEXP_SUBSTR: extract first match of a pattern
SELECT REGEXP_SUBSTR('Order #12345 placed', '#(\\d+)', 1, 1, 'e');
-- Returns: '12345'

-- REGEXP_COUNT: count pattern matches
SELECT REGEXP_COUNT('banana', 'an');             -- Returns: 2

-- REGEXP_INSTR: position of pattern match
SELECT REGEXP_INSTR('hello world', 'world');     -- Returns: 7

-- Other useful string functions
SELECT UPPER('hello');                           -- 'HELLO'
SELECT LOWER('HELLO');                           -- 'hello'
SELECT TRIM('  hello  ');                        -- 'hello'
SELECT LTRIM('  hello');                         -- 'hello'
SELECT RTRIM('hello  ');                         -- 'hello'
SELECT LPAD('42', 5, '0');                       -- '00042'
SELECT RPAD('hi', 5, '!');                       -- 'hi!!!'
SELECT LEFT('Snowflake', 4);                     -- 'Snow'
SELECT RIGHT('Snowflake', 5);                    -- 'flake'
SELECT SUBSTR('Snowflake', 1, 4);               -- 'Snow' (1-based)
SELECT LENGTH('Snowflake');                      -- 9
SELECT CONCAT('Snow', 'flake');                  -- 'Snowflake'
SELECT 'Snow' || 'flake';                        -- 'Snowflake' (|| operator)
SELECT REPLACE('Snowflake', 'Snow', 'Ice');      -- 'Iceflake'
SELECT REVERSE('abc');                           -- 'cba'
SELECT REPEAT('ab', 3);                          -- 'ababab'
SELECT INITCAP('hello world');                   -- 'Hello World'
SELECT CONTAINS('Snowflake', 'Snow');            -- TRUE
SELECT STARTSWITH('Snowflake', 'Snow');          -- TRUE
SELECT ENDSWITH('Snowflake', 'flake');           -- TRUE
SELECT POSITION('flake' IN 'Snowflake');         -- 5
SELECT CHARINDEX('flake', 'Snowflake');          -- 5
```

---

### 20. DATE/TIME FUNCTIONS

```sql
-- DATEADD: add/subtract time units
SELECT DATEADD(day, 7, CURRENT_DATE());          -- 7 days from now
SELECT DATEADD(month, -3, '2024-06-15'::DATE);   -- 3 months before
SELECT DATEADD(hour, 2, CURRENT_TIMESTAMP());    -- 2 hours from now
-- Aliases: TIMEADD, TIMESTAMPADD

-- DATEDIFF: difference between two dates
SELECT DATEDIFF(day, '2024-01-01', '2024-12-31');   -- Returns: 365
SELECT DATEDIFF(month, '2024-01-15', '2024-03-10'); -- Returns: 2 (truncated, not rounded)
SELECT DATEDIFF(year, '2023-12-31', '2024-01-01');  -- Returns: 1
-- Aliases: TIMEDIFF, TIMESTAMPDIFF

-- DATE_TRUNC: truncate to specified precision
SELECT DATE_TRUNC('month', '2024-03-15'::DATE);     -- Returns: 2024-03-01
SELECT DATE_TRUNC('year', '2024-07-22'::DATE);      -- Returns: 2024-01-01
SELECT DATE_TRUNC('hour', '2024-01-15 10:45:30'::TIMESTAMP);
-- Returns: 2024-01-15 10:00:00

-- TO_DATE / DATE: convert to DATE
SELECT TO_DATE('2024-01-15');                        -- Auto-detect format
SELECT TO_DATE('15/01/2024', 'DD/MM/YYYY');         -- Explicit format
SELECT TO_DATE('1704067200', 'YYYY-MM-DD');         -- From Unix epoch

-- TO_TIMESTAMP: convert to TIMESTAMP
SELECT TO_TIMESTAMP('2024-01-15 10:30:00');
SELECT TO_TIMESTAMP('2024-01-15', 'YYYY-MM-DD');
SELECT TO_TIMESTAMP(1704067200);                    -- From seconds since epoch

-- TO_TIMESTAMP_LTZ / TO_TIMESTAMP_NTZ / TO_TIMESTAMP_TZ
SELECT TO_TIMESTAMP_LTZ('2024-01-15 10:30:00');     -- Local time zone
SELECT TO_TIMESTAMP_NTZ('2024-01-15 10:30:00');     -- No time zone
SELECT TO_TIMESTAMP_TZ('2024-01-15 10:30:00 -05:00'); -- With time zone

-- Date part extraction
SELECT YEAR('2024-03-15'::DATE);                     -- 2024
SELECT MONTH('2024-03-15'::DATE);                    -- 3
SELECT DAY('2024-03-15'::DATE);                      -- 15
SELECT DAYOFWEEK('2024-03-15'::DATE);               -- 5 (Friday, 0=Sunday)
SELECT DAYOFYEAR('2024-03-15'::DATE);               -- 75
SELECT WEEKOFYEAR('2024-03-15'::DATE);              -- 11
SELECT QUARTER('2024-03-15'::DATE);                  -- 1

-- EXTRACT function (alternative syntax)
SELECT EXTRACT(YEAR FROM '2024-03-15'::DATE);        -- 2024
SELECT EXTRACT(MONTH FROM CURRENT_TIMESTAMP());

-- DATE_PART (another alternative)
SELECT DATE_PART(year, '2024-03-15'::DATE);          -- 2024

-- Current date/time functions
SELECT CURRENT_DATE();                               -- Today's date
SELECT CURRENT_TIMESTAMP();                          -- Current timestamp (LTZ)
SELECT CURRENT_TIME();                               -- Current time
SELECT SYSDATE();                                    -- Current timestamp (not cached)
```

**EXAM TIP:** DATEDIFF does NOT round -- it only counts whole boundaries crossed.
DATEDIFF(year, '2024-12-31', '2025-01-01') = 1 (crosses year boundary).
DATEDIFF(year, '2024-01-01', '2024-12-31') = 0 (same year).

---

### 21. PIVOT AND UNPIVOT

```sql
-- PIVOT: rotate rows into columns
-- Aggregate values from rows and turn distinct values into column headers
SELECT *
FROM monthly_sales
  PIVOT (SUM(amount) FOR month IN ('JAN', 'FEB', 'MAR'))
AS p;

-- PIVOT with column aliases
SELECT *
FROM monthly_sales
  PIVOT (SUM(amount) FOR month IN (
    'JAN' AS january,
    'FEB' AS february,
    'MAR' AS march
  ))
AS p;

-- PIVOT with ANY (auto-detect all distinct values)
SELECT *
FROM monthly_sales
  PIVOT (SUM(amount) FOR month IN (ANY ORDER BY month))
AS p;

-- UNPIVOT: rotate columns into rows (opposite of PIVOT)
SELECT *
FROM quarterly_report
  UNPIVOT (revenue FOR quarter IN (q1, q2, q3, q4));

-- UNPIVOT with INCLUDE NULLS (by default NULLs are excluded)
SELECT *
FROM quarterly_report
  UNPIVOT INCLUDE NULLS (revenue FOR quarter IN (q1, q2, q3, q4));
```

**EXAM TIPS -- PIVOT/UNPIVOT:**

- PIVOT supports: SUM, COUNT, AVG, MIN, MAX.
- UNPIVOT is NOT the exact reverse of PIVOT (cannot undo aggregation).
- By default, UNPIVOT EXCLUDES nulls. Use INCLUDE NULLS to keep them.
- ANY in PIVOT auto-detects all distinct values.

---

### 22. SAMPLE / TABLESAMPLE

```sql
-- SAMPLE and TABLESAMPLE are synonyms
-- Row-level (Bernoulli) sampling: probability-based, per row
SELECT * FROM my_table SAMPLE (10);              -- ~10% of rows
SELECT * FROM my_table TABLESAMPLE BERNOULLI (10); -- Same thing

-- Block-level (System) sampling: probability-based, per micro-partition
SELECT * FROM my_table SAMPLE SYSTEM (10);       -- ~10% of data (faster)
SELECT * FROM my_table TABLESAMPLE BLOCK (10);   -- Same thing

-- Fixed-size sampling (specific number of rows)
SELECT * FROM my_table SAMPLE (100 ROWS);        -- Exactly 100 rows

-- Deterministic sampling with SEED (System/Block only)
SELECT * FROM my_table SAMPLE SYSTEM (10) SEED (42);
SELECT * FROM my_table SAMPLE SYSTEM (10) REPEATABLE (42);  -- same as SEED
```

**EXAM TIPS -- SAMPLE:**

- BERNOULLI (ROW): per-row probability, more random, slower.
- SYSTEM (BLOCK): per-micro-partition probability, faster, less granular.
- Default method (if not specified) is BERNOULLI.
- SEED/REPEATABLE is only supported for SYSTEM/BLOCK sampling.
- Fixed-size sampling: up to 1,000,000 rows.
- SAMPLE applies to ONE table only, not the whole query.

---

### 23. GROUP BY ROLLUP, CUBE, GROUPING SETS

```sql
-- GROUP BY ROLLUP: hierarchical subtotals (N+1 grouping levels)
-- For N columns, produces N+1 grouping sets
SELECT region, product, SUM(sales) AS total_sales
FROM sales_data
GROUP BY ROLLUP (region, product);
-- Produces: (region, product), (region), ()
-- Grand total has NULLs for both region and product

-- GROUP BY CUBE: all possible combinations (2^N grouping sets)
SELECT region, product, SUM(sales) AS total_sales
FROM sales_data
GROUP BY CUBE (region, product);
-- Produces: (region, product), (region), (product), ()
-- Max 7 elements (= 128 grouping sets)

-- GROUP BY GROUPING SETS: explicitly specify which groupings you want
SELECT region, product, SUM(sales) AS total_sales
FROM sales_data
GROUP BY GROUPING SETS (
  (region, product),     -- by region and product
  (region),              -- by region only
  ()                     -- grand total
);

-- GROUPING function: distinguishes real NULLs from subtotal NULLs
-- Returns 0 if the column is part of the grouping, 1 if it's a subtotal
SELECT
  region,
  product,
  SUM(sales) AS total_sales,
  GROUPING(region) AS is_region_subtotal,
  GROUPING(product) AS is_product_subtotal
FROM sales_data
GROUP BY ROLLUP (region, product);
```

**EXAM TIPS:**

- ROLLUP = hierarchical subtotals, N columns produce N+1 levels.
- CUBE = all combinations, N columns produce 2^N levels. Max 7 columns (128 sets).
- GROUPING SETS = custom specification of exactly which groupings to compute.
- ROLLUP(a,b,c) = GROUPING SETS((a,b,c),(a,b),(a),())
- CUBE(a,b) = GROUPING SETS((a,b),(a),(b),())
- Use GROUPING() function to tell apart real NULLs from aggregation NULLs.
- Max 128 grouping sets in one query block.

---

### 24. CONNECT BY (Hierarchical Queries)

```sql
-- CONNECT BY: Oracle-compatible syntax for hierarchical queries
-- Process parent-child relationships iteratively
SELECT
  LEVEL,
  employee_id,
  manager_id,
  employee_name,
  SYS_CONNECT_BY_PATH(employee_name, ' -> ') AS path
FROM employees
  START WITH manager_id IS NULL           -- Root node(s)
  CONNECT BY PRIOR employee_id = manager_id  -- PRIOR = parent level
ORDER BY LEVEL, employee_id;

-- CONNECT BY keywords:
-- START WITH  = defines the root row(s) of the hierarchy
-- PRIOR       = refers to the parent row's column value
-- LEVEL       = pseudo-column indicating depth (1 = root)
-- SYS_CONNECT_BY_PATH = builds path string from root to current node
-- CONNECT_BY_ROOT      = access root-level value from any level

-- Recursive CTE (alternative, more flexible approach)
WITH RECURSIVE org_hierarchy AS (
  -- Anchor: root nodes
  SELECT employee_id, manager_id, employee_name, 1 AS level
  FROM employees
  WHERE manager_id IS NULL

  UNION ALL

  -- Recursive: join children to parents
  SELECT e.employee_id, e.manager_id, e.employee_name, h.level + 1
  FROM employees e
  JOIN org_hierarchy h ON e.manager_id = h.employee_id
)
SELECT * FROM org_hierarchy ORDER BY level, employee_id;
```

**EXAM TIPS:**

- CONNECT BY is Oracle-compatible syntax; Snowflake supports it.
- Recursive CTEs (WITH RECURSIVE) are more flexible (support JOINs inside).
- PRIOR keyword in CONNECT BY refers to the parent row.
- LEVEL is a pseudo-column (1 for root, increments per depth level).
- CONNECT BY can cause infinite loops if hierarchy has cycles (watch STATEMENT_TIMEOUT).
- Recursive CTE needs UNION ALL between anchor and recursive clause.

---

### 25. CONDITIONAL EXPRESSIONS

```sql
-- IFF: simple inline if-then-else (single condition)
SELECT IFF(score >= 75, 'PASS', 'FAIL') AS result;
-- If condition is NULL, returns the false_value

-- CASE (searched form): multiple conditions
SELECT
  CASE
    WHEN score >= 90 THEN 'A'
    WHEN score >= 80 THEN 'B'
    WHEN score >= 70 THEN 'C'
    ELSE 'F'
  END AS grade
FROM students;

-- CASE (simple form): compare expression against values
SELECT
  CASE status
    WHEN 'A' THEN 'Active'
    WHEN 'I' THEN 'Inactive'
    WHEN 'D' THEN 'Deleted'
    ELSE 'Unknown'
  END AS status_desc
FROM users;
-- NOTE: Simple CASE cannot match NULL (NULL WHEN NULL won't match)

-- DECODE: compact alternative to simple CASE (matches NULLs!)
SELECT DECODE(status, 'A', 'Active', 'I', 'Inactive', 'D', 'Deleted', 'Unknown')
FROM users;
-- DECODE(expr, search1, result1, search2, result2, ..., default)
-- KEY DIFFERENCE from CASE: DECODE matches NULL = NULL (CASE does not)

-- NVL / IFNULL: replace NULL with a value (2 args, synonyms)
SELECT NVL(phone, 'N/A') FROM contacts;
SELECT IFNULL(phone, 'N/A') FROM contacts;    -- Same result

-- NVL2: 3-argument NULL check
-- NVL2(expr, not_null_result, null_result)
SELECT NVL2(phone, 'Has phone', 'No phone') FROM contacts;
-- If phone IS NOT NULL -> 'Has phone'
-- If phone IS NULL     -> 'No phone'

-- COALESCE: return first non-NULL from a list (2+ args)
SELECT COALESCE(phone, mobile, email, 'No contact') FROM contacts;

-- NULLIF: return NULL if two values are equal
SELECT NULLIF(col1, 0);    -- Returns NULL if col1 = 0, else returns col1
-- Useful to prevent division by zero: col1 / NULLIF(col2, 0)

-- ZEROIFNULL: return 0 if input is NULL
SELECT ZEROIFNULL(amount);  -- Returns 0 if amount is NULL

-- NULLIFZERO: return NULL if input is 0
SELECT NULLIFZERO(amount);  -- Returns NULL if amount is 0
```

**EXAM TIPS -- Conditional Expressions:**

- DECODE can match NULL = NULL. Simple CASE cannot.
- NVL and IFNULL are identical (synonyms).
- NVL2 takes 3 args: (expr_to_check, result_if_not_null, result_if_null).
- COALESCE accepts 2+ arguments (NVL/IFNULL accept exactly 2).
- IFF is for single-condition if-then-else. Use CASE for multiple conditions.
- ZEROIFNULL(x) = if x IS NULL then 0 else x.
- NULLIFZERO(x) = if x = 0 then NULL else x.
- NULLIF(a, b) = if a = b then NULL else a.
- Common pattern: x / NULLIF(y, 0) to avoid divide-by-zero errors.

---

### 26. ADDITIONAL TRANSFORMATION FEATURES

#### INSERT Variants

```sql
-- Standard INSERT
INSERT INTO my_table (col1, col2) VALUES (1, 'a'), (2, 'b');

-- INSERT from SELECT
INSERT INTO target_table SELECT * FROM source_table WHERE condition;

-- INSERT OVERWRITE (atomic truncate + insert)
INSERT OVERWRITE INTO my_table SELECT * FROM staging;

-- Multi-table INSERT (insert same source into multiple tables)
INSERT ALL
  INTO table_a (col1) VALUES (src_col)
  INTO table_b (col2) VALUES (src_col)
SELECT src_col FROM source;
```

#### Estimation Functions (Approximate)

```sql
-- APPROX_COUNT_DISTINCT: approximate distinct count (faster than COUNT(DISTINCT))
SELECT APPROX_COUNT_DISTINCT(user_id) FROM events;

-- HLL (HyperLogLog): same as APPROX_COUNT_DISTINCT
SELECT HLL(user_id) FROM events;

-- APPROX_PERCENTILE: approximate percentile
SELECT APPROX_PERCENTILE(salary, 0.5) AS median_salary FROM employees;

-- APPROX_TOP_K: approximate most frequent values
SELECT APPROX_TOP_K(product_id, 10) FROM sales;
```

#### OBJECT_CONSTRUCT_KEEP_NULL

```sql
-- Unlike OBJECT_CONSTRUCT, this version KEEPS null key-value pairs
SELECT OBJECT_CONSTRUCT_KEEP_NULL('a', 1, 'b', NULL);
-- Returns: {"a": 1, "b": null}
-- (Regular OBJECT_CONSTRUCT would return: {"a": 1})
```

#### GET, GET_PATH, ARRAY_FLATTEN, STRTOK_SPLIT_TO_TABLE

```sql
-- GET: extract element from VARIANT/OBJECT/ARRAY by key or index
SELECT GET(my_variant, 'name');    -- Same as my_variant:name
SELECT GET(my_array, 0);          -- Same as my_array[0]

-- GET_PATH: extract element using a path string
SELECT GET_PATH(my_variant, 'address.city');   -- Same as my_variant:address.city

-- STRTOK_SPLIT_TO_TABLE: tokenize string into rows
SELECT value
FROM TABLE(STRTOK_SPLIT_TO_TABLE('one-two-three', '-'));
```

#### Unstructured Data Functions (Domain 5.3)

```sql
-- BUILD_SCOPED_FILE_URL: generates a scoped URL for a staged file
SELECT BUILD_SCOPED_FILE_URL(@my_stage, 'file.pdf');

-- BUILD_STAGE_FILE_URL: generates a permanent file URL for a staged file
SELECT BUILD_STAGE_FILE_URL(@my_stage, 'file.pdf');

-- GET_PRESIGNED_URL: generates a pre-signed URL (temporary access)
SELECT GET_PRESIGNED_URL(@my_stage, 'file.pdf', 3600);  -- 1 hour expiry

-- Directory table: query files in a stage
SELECT * FROM DIRECTORY(@my_stage);
-- Returns: RELATIVE_PATH, SIZE, LAST_MODIFIED, ETAG, FILE_URL
```

**EXAM TIPS -- Unstructured Data URLs:**

- Scoped URL: access only within Snowflake, expires when session ends.
- File URL: permanent access, requires appropriate role.
- Pre-signed URL: temporary external access, has configurable expiry.

---

### QUICK REFERENCE: SQL CLAUSE EXECUTION ORDER

```text
1. FROM       (tables, joins, LATERAL FLATTEN)
2. WHERE      (row-level filtering)
3. GROUP BY   (aggregation, ROLLUP, CUBE, GROUPING SETS)
4. HAVING     (filter on aggregates)
5. SELECT     (column expressions, window functions computed here)
6. QUALIFY    (filter on window function results)
7. DISTINCT   (remove duplicates)
8. ORDER BY   (sort results)
9. LIMIT      (restrict output rows)
```

---

### KEY EXAM REMINDERS FOR DOMAIN 5

1. **UDF vs Stored Procedure**: UDFs are called in SQL expressions; procedures use CALL. UDFs cannot do DML/DDL.
2. **Streams**: Standard = all DML; Append-only = inserts only; Insert-only = external tables.
3. **Tasks**: Created SUSPENDED. Only root task has SCHEDULE. Children use AFTER. Resume children before root.
4. **FLATTEN**: Table function for exploding VARIANT arrays/objects. Use LATERAL to reference other table columns. OUTER => TRUE for LEFT JOIN behavior.
5. **QUALIFY**: Filters window function results. NOT ANSI standard. Evaluated after window functions.
6. **VARIANT access**: Use `:` for top-level, `.` for nested, `[]` for arrays or special chars. Cast with `::`.
7. **MERGE**: Combines INSERT/UPDATE/DELETE. At least one WHEN clause required.
8. **DECODE vs CASE**: DECODE matches NULL = NULL. Simple CASE does not.
9. **COALESCE vs NVL**: COALESCE takes 2+ args. NVL/IFNULL take exactly 2.
10. **Materialized views**: Single table only. Has storage + compute cost. Enterprise Edition required.
11. **CLONE vs LIKE vs CTAS**: CLONE = zero-copy with data. LIKE = structure only. CTAS = structure + data from query.
12. **Window functions**: ROW_NUMBER (no ties), RANK (gaps), DENSE_RANK (no gaps).
13. **SAMPLE**: BERNOULLI/ROW = per-row (default). SYSTEM/BLOCK = per-partition (faster). SEED only for SYSTEM.
14. **ROLLUP vs CUBE**: ROLLUP = hierarchical (N+1 levels). CUBE = all combos (2^N levels).

---

## Domain 6: Data Protection & Data Sharing -- SQL Syntax Cheat Sheet

> **SnowPro Core COF-C02 | Weight: 5-10% (some sources say ~12%)**
> Two objectives: (6.1) Continuous Data Protection, (6.2) Data Sharing Capabilities

---

### 1. TIME TRAVEL

#### 1.1 SELECT ... AT (query historical data at a point in time)

```sql
-- Query data as it existed at an exact timestamp
SELECT * FROM my_table AT(TIMESTAMP => '2024-06-26 09:20:00'::TIMESTAMP_TZ);

-- Query data as it existed N seconds ago (OFFSET is in seconds, negative = past)
SELECT * FROM my_table AT(OFFSET => -60*15);        -- 15 minutes ago
SELECT * FROM my_table AT(OFFSET => -60*60*24);     -- 24 hours ago

-- Query data as it existed AFTER a specific statement completed
SELECT * FROM my_table AT(STATEMENT => '01a2b7f1-0000-214f-0000-0002ef66a941');
```

#### 1.2 SELECT ... BEFORE (query data just before a point in time)

```sql
-- Query data as it existed BEFORE a specific timestamp
SELECT * FROM my_table BEFORE(TIMESTAMP => '2024-06-26 09:20:00'::TIMESTAMP);

-- Query data as it existed BEFORE a specific statement started
-- (key distinction: BEFORE + STATEMENT = just before the statement completed)
SELECT * FROM my_table BEFORE(STATEMENT => '01a2b7f1-0000-214f-0000-0002ef66a941');
```

#### 1.3 Using DATEADD with Time Travel

```sql
-- Combine AT with DATEADD for relative timestamps
SELECT * FROM my_table AT(TIMESTAMP => DATEADD(hour, -1, CURRENT_TIMESTAMP()));
SELECT * FROM my_table AT(TIMESTAMP => DATEADD(day, -3, CURRENT_TIMESTAMP()));
```

> **EXAM TIP**: AT vs BEFORE distinction:
>
> - `AT(STATEMENT => id)` returns data **after** the statement completed.
> - `BEFORE(STATEMENT => id)` returns data **before** the statement completed.
> - `AT(TIMESTAMP => ts)` returns data **at** that exact timestamp.
> - `BEFORE(TIMESTAMP => ts)` returns data **before** that timestamp.
> - TIMESTAMP and OFFSET values must be **constant expressions**.
> - AT/BEFORE clauses do **NOT** work with CTEs.

---

### 2. DATA_RETENTION_TIME_IN_DAYS

#### 2.1 Setting retention at different levels

```sql
-- Set at ACCOUNT level (requires ACCOUNTADMIN)
ALTER ACCOUNT SET DATA_RETENTION_TIME_IN_DAYS = 90;

-- Set at DATABASE level
ALTER DATABASE my_db SET DATA_RETENTION_TIME_IN_DAYS = 30;

-- Set at SCHEMA level
ALTER SCHEMA my_db.my_schema SET DATA_RETENTION_TIME_IN_DAYS = 14;

-- Set at TABLE level
ALTER TABLE my_db.my_schema.my_table SET DATA_RETENTION_TIME_IN_DAYS = 7;

-- Set during table creation
CREATE TABLE my_table (id INT, name STRING)
  DATA_RETENTION_TIME_IN_DAYS = 45;

-- Disable Time Travel entirely (set to 0)
ALTER TABLE staging_table SET DATA_RETENTION_TIME_IN_DAYS = 0;
```

> **EXAM TIP -- Retention Limits by Edition & Table Type**:
>
> | Table Type      | Standard Edition | Enterprise+  |
> | --------------- | ---------------- | ------------ |
> | Permanent table | 0 or 1 day       | 0 to 90 days |
> | Transient table | 0 or 1 day       | 0 or 1 day   |
> | Temporary table | 0 or 1 day       | 0 or 1 day   |
>
> - The parameter **inherits** from account -> database -> schema -> table.
> - Child objects inherit from parent unless explicitly overridden.
> - Setting to 0 effectively **disables** Time Travel for that object.

---

### 3. FAIL-SAFE (Concept -- No User-Facing Syntax)

```text
No SQL syntax -- Fail-safe is entirely managed by Snowflake internally.
Users cannot query, access, or configure Fail-safe directly.
Only Snowflake Support can recover data from Fail-safe.
```

> **EXAM TIP -- Fail-safe Key Facts**:
>
> | Table Type      | Time Travel (configurable) | Fail-safe (fixed) |
> | --------------- | -------------------------- | ----------------- |
> | Permanent table | Up to 90 days (Enterprise) | 7 days            |
> | Transient table | 0 or 1 day                 | **NONE (0 days)** |
> | Temporary table | 0 or 1 day                 | **NONE (0 days)** |
>
> - Fail-safe begins **after** the Time Travel period ends.
> - Fail-safe data incurs **storage costs** but is not user-accessible.
> - Total protection window for permanent tables: up to 90 + 7 = **97 days**.
> - Transient/temporary tables have **NO Fail-safe** -- once Time Travel expires, data is gone forever.
> - Temporary tables are also purged when the **session ends**.

---

### 4. UNDROP

#### 4.1 UNDROP TABLE

```sql
-- Restore the most recently dropped table with this name
UNDROP TABLE my_table;

-- Restore a table in a specific schema
UNDROP TABLE my_db.my_schema.my_table;
```

#### 4.2 UNDROP SCHEMA

```sql
-- Restore the most recently dropped schema with this name
UNDROP SCHEMA my_schema;
```

#### 4.3 UNDROP DATABASE

```sql
-- Restore the most recently dropped database with this name
UNDROP DATABASE my_database;
```

#### 4.4 UNDROP with name collision workaround

```sql
-- If a new object was created with the same name after the drop:
-- Step 1: Rename the current object
ALTER TABLE my_table RENAME TO my_table_v2;

-- Step 2: Undrop restores the previously dropped object
UNDROP TABLE my_table;
```

#### 4.5 UNDROP by ID (for multiple drops of same-named objects)

```sql
-- Find the object ID from Account Usage views
SELECT table_id, table_name, deleted
FROM SNOWFLAKE.ACCOUNT_USAGE.TABLES
WHERE table_name = 'MY_TABLE' AND deleted IS NOT NULL
ORDER BY deleted;

-- Undrop a specific version by ID
UNDROP TABLE IDENTIFIER(408578);
UNDROP SCHEMA IDENTIFIER(798);
UNDROP DATABASE IDENTIFIER(492);
```

> **EXAM TIP**: UNDROP restores the **most recent** version of a dropped object.
> If you dropped and re-created with the same name, you must rename the current
> object first before you can UNDROP the previous one. UNDROP only works
> within the **Time Travel retention period**.

---

### 5. ZERO-COPY CLONING

#### 5.1 Basic cloning

```sql
-- Clone a table
CREATE TABLE my_table_clone CLONE my_table;

-- Clone a schema (includes all objects within it)
CREATE SCHEMA my_schema_clone CLONE my_schema;

-- Clone a database (includes all schemas and objects)
CREATE DATABASE my_db_clone CLONE my_db;

-- Clone with COPY GRANTS (preserves access privileges)
CREATE TABLE my_table_clone CLONE my_table COPY GRANTS;
```

#### 5.2 Cloning with Time Travel (AT / BEFORE)

```sql
-- Clone table as it was at a specific timestamp
CREATE TABLE restored_table CLONE my_table
  AT(TIMESTAMP => '2024-06-26 09:00:00'::TIMESTAMP_TZ);

-- Clone table as it was N seconds ago
CREATE TABLE restored_table CLONE my_table
  AT(OFFSET => -60*30);   -- 30 minutes ago

-- Clone table as it was before a specific statement
CREATE TABLE restored_table CLONE my_table
  BEFORE(STATEMENT => '01a2b7f1-0000-214f-0000-0002ef66a941');

-- Clone a schema with Time Travel
CREATE SCHEMA restored_schema CLONE my_schema
  AT(TIMESTAMP => '2024-06-26 09:00:00'::TIMESTAMP_TZ);

-- Clone a database with Time Travel
CREATE DATABASE restored_db CLONE my_db
  AT(TIMESTAMP => '2024-06-26 09:00:00'::TIMESTAMP_TZ);
```

#### 5.3 Clone with IGNORE TABLES WITH INSUFFICIENT DATA RETENTION

```sql
-- Skip tables whose Time Travel data has expired (useful for transient tables)
CREATE DATABASE restored_db CLONE my_db
  AT(TIMESTAMP => '2024-06-20 09:00:00'::TIMESTAMP_TZ)
  IGNORE TABLES WITH INSUFFICIENT DATA RETENTION;
```

> **EXAM TIP -- Zero-Copy Cloning Key Facts**:
>
> - Clone initially uses **zero additional storage** (points to same micro-partitions).
> - Storage is only consumed when **either the source or clone is modified** (copy-on-write).
> - Clones are **independent objects** -- changes to one do not affect the other.
> - A clone of a clone is allowed.
> - **Temporary tables cannot be cloned** (they cannot be the source of a clone).
> - Time Travel cloning works for databases, schemas, and non-temporary tables.
> - Without COPY GRANTS, clones do **not inherit** explicit access privileges
>   (but do inherit any future grants defined in the schema).
> - Cloning a database/schema clones **all child objects** recursively.
> - Cloned objects have their **own independent Time Travel** and Fail-safe.
> - Internal (named) stages are **NOT** cloned. External stages **ARE** cloned.
> - Pipes referencing internal stages are **NOT** cloned.

---

### 6. DATA SHARING (Provider Side)

#### 6.1 CREATE SHARE

```sql
-- Create a new empty share (requires ACCOUNTADMIN or CREATE SHARE privilege)
CREATE SHARE my_share;

-- Create a share with a comment
CREATE SHARE my_share COMMENT = 'Sales data for partners';
```

#### 6.2 GRANT privileges TO SHARE

```sql
-- Step 1: Grant USAGE on the database to the share
GRANT USAGE ON DATABASE my_db TO SHARE my_share;

-- Step 2: Grant USAGE on the schema to the share
GRANT USAGE ON SCHEMA my_db.public TO SHARE my_share;

-- Step 3: Grant SELECT on specific tables
GRANT SELECT ON TABLE my_db.public.customers TO SHARE my_share;

-- Grant SELECT on ALL tables in a schema (bulk grant)
GRANT SELECT ON ALL TABLES IN SCHEMA my_db.public TO SHARE my_share;

-- Grant SELECT on a secure view (ONLY secure views can be shared)
GRANT SELECT ON VIEW my_db.public.secure_customer_view TO SHARE my_share;

-- Grant USAGE on a secure UDF
GRANT USAGE ON FUNCTION my_db.public.my_udf(STRING) TO SHARE my_share;
```

#### 6.3 Sharing data from multiple databases (REFERENCE_USAGE)

```sql
-- When a secure view references tables in another database,
-- grant REFERENCE_USAGE on the referenced database
GRANT REFERENCE_USAGE ON DATABASE reference_db TO SHARE my_share;

-- Then grant USAGE on the database that contains the secure view
GRANT USAGE ON DATABASE view_db TO SHARE my_share;
GRANT USAGE ON SCHEMA view_db.public TO SHARE my_share;
GRANT SELECT ON VIEW view_db.public.cross_db_secure_view TO SHARE my_share;
```

#### 6.4 ALTER SHARE -- Add/Remove consumer accounts

```sql
-- Add consumer accounts to the share (use org.account format)
ALTER SHARE my_share ADD ACCOUNTS = org1.consumer_acct1, org1.consumer_acct2;

-- Remove a consumer account from the share
ALTER SHARE my_share REMOVE ACCOUNTS = org1.consumer_acct2;

-- Replace ALL accounts on the share
ALTER SHARE my_share SET ACCOUNTS = org1.new_consumer;

-- Allow sharing to accounts on a different edition (Business Critical -> Standard)
ALTER SHARE my_share ADD ACCOUNTS = org1.consumer_acct1
  SHARE_RESTRICTIONS = FALSE;
```

#### 6.5 REVOKE privileges FROM SHARE

```sql
-- Revoke specific privileges from the share
REVOKE SELECT ON TABLE my_db.public.customers FROM SHARE my_share;
REVOKE USAGE ON SCHEMA my_db.public FROM SHARE my_share;
REVOKE USAGE ON DATABASE my_db FROM SHARE my_share;
```

#### 6.6 DROP SHARE

```sql
DROP SHARE my_share;
```

#### 6.7 SHOW and DESCRIBE shares

```sql
-- List all shares (inbound and outbound)
SHOW SHARES;

-- Filter shares by pattern
SHOW SHARES LIKE 'sales%';

-- Describe a specific share (see objects in it)
DESCRIBE SHARE my_share;

-- Describe an inbound share from another account
DESCRIBE SHARE provider_org.provider_acct.their_share;
```

> **EXAM TIP -- Data Sharing Rules & Limitations**:
>
> - Only **one database** can have USAGE granted per share (but multiple schemas/tables/views).
> - Multiple databases can be referenced via **REFERENCE_USAGE** for secure views.
> - Only **secure views** can be shared (not regular views) -- unless SECURE_OBJECTS_ONLY=FALSE on the share.
> - **Future grants** are NOT supported on shares.
> - You **cannot reshare** data from an imported (shared) database.
> - Shared databases are **read-only** for consumers.
> - No data is **copied or transferred** -- consumers query provider's data in place.
> - Sharing is for accounts in the **same region/cloud** by default.
>   Cross-region sharing requires **listings** (backed by replication).
> - The ACCOUNTADMIN role (or a role with CREATE SHARE privilege) is required.
> - Shares do NOT include: stages, tasks, streams, pipes, stored procedures.

---

### 7. DATA SHARING (Consumer Side)

#### 7.1 CREATE DATABASE FROM SHARE

```sql
-- Create a database from an inbound share (requires IMPORT SHARE + CREATE DATABASE privileges)
CREATE DATABASE shared_sales FROM SHARE provider_org.provider_acct.sales_share;
```

#### 7.2 GRANT IMPORTED PRIVILEGES

```sql
-- By default, only the role that created the database can access it
-- Grant IMPORTED PRIVILEGES to allow other roles to query shared data
GRANT IMPORTED PRIVILEGES ON DATABASE shared_sales TO ROLE analyst_role;
GRANT IMPORTED PRIVILEGES ON DATABASE shared_sales TO ROLE data_team;
```

#### 7.3 Setting up a non-ACCOUNTADMIN role for importing

```sql
-- Allow a custom role to import shares
USE ROLE ACCOUNTADMIN;
CREATE ROLE share_importer;
GRANT CREATE DATABASE ON ACCOUNT TO ROLE share_importer;
GRANT IMPORT SHARE ON ACCOUNT TO ROLE share_importer;
GRANT USAGE ON WAREHOUSE my_wh TO ROLE share_importer;
```

> **EXAM TIP -- Consumer Side Key Facts**:
>
> - Use `CREATE DATABASE ... FROM SHARE` (not `CREATE SCHEMA` or `CREATE TABLE`).
> - Requires both **IMPORT SHARE** and **CREATE DATABASE** privileges.
> - Use `GRANT IMPORTED PRIVILEGES` (not `GRANT USAGE`) on shared databases.
> - If you try `GRANT USAGE ON DATABASE shared_db`, it will **fail** with an error.
> - Shared data is **read-only** -- consumers cannot INSERT, UPDATE, or DELETE.
> - Consumers cannot **clone** objects from shared databases.
> - Consumers cannot **re-share** data they received via sharing.
> - A share can only be imported (consumed) **once per account**.

---

### 8. SECURE VIEWS (for Sharing)

#### 8.1 Creating a secure view

```sql
-- Create a secure view
CREATE SECURE VIEW my_db.public.customer_view AS
SELECT customer_id, name, region
FROM my_db.public.customers;

-- Create a secure view with row-level filtering per consumer account
CREATE SECURE VIEW my_db.public.filtered_view AS
SELECT *
FROM my_db.public.customers
WHERE region = CURRENT_ACCOUNT();

-- Create a secure materialized view
CREATE SECURE MATERIALIZED VIEW my_db.public.agg_view AS
SELECT region, COUNT(*) AS cnt
FROM my_db.public.orders
GROUP BY region;
```

#### 8.2 Converting existing views

```sql
-- Convert a regular view to secure
ALTER VIEW my_view SET SECURE;

-- Convert a secure view back to regular
ALTER VIEW my_view UNSET SECURE;
```

#### 8.3 Validating shared secure views (provider side)

```sql
-- Simulate what a consumer account would see
ALTER SESSION SET SIMULATED_DATA_SHARING_CONSUMER = 'consumer_org.consumer_acct';

-- Query the secure view to see results as if you were the consumer
SELECT * FROM my_db.public.filtered_view;

-- Reset simulation
ALTER SESSION UNSET SIMULATED_DATA_SHARING_CONSUMER;
```

> **EXAM TIP -- Secure Views Key Facts**:
>
> - Secure view definitions are **hidden** from unauthorized users (SHOW VIEWS, GET_DDL, etc.).
> - Secure views may be **slower** than regular views (internal optimizations are disabled for security).
> - Use `CURRENT_ACCOUNT()` in secure views for **row-level access** per consumer.
> - `CURRENT_ROLE()` and `CURRENT_USER()` return **NULL** when called from a shared secure view
>   in a consumer account (because the provider does not know the consumer's roles/users).
> - Only secure views (and secure materialized views) can be granted to shares.

---

### 9. READER ACCOUNTS (Managed Accounts)

#### 9.1 Creating a reader account

```sql
-- Create a reader account (requires ACCOUNTADMIN or CREATE ACCOUNT privilege)
CREATE MANAGED ACCOUNT reader_acct1
  ADMIN_NAME = 'admin_user',
  ADMIN_PASSWORD = 'Str0ngP@ssw0rd!',
  TYPE = READER;

-- With a comment
CREATE MANAGED ACCOUNT reader_acct1
  ADMIN_NAME = 'admin_user',
  ADMIN_PASSWORD = 'Str0ngP@ssw0rd!',
  TYPE = READER,
  COMMENT = 'Reader account for partner XYZ';
```

#### 9.2 Managing reader accounts

```sql
-- Show all managed (reader) accounts
SHOW MANAGED ACCOUNTS;

-- Drop a reader account
DROP MANAGED ACCOUNT reader_acct1;
```

#### 9.3 Add reader account to a share

```sql
-- After creating the reader account, add it to the share
-- (use the account locator returned by CREATE MANAGED ACCOUNT)
ALTER SHARE my_share ADD ACCOUNTS = <reader_account_locator>;
```

> **EXAM TIP -- Reader Accounts Key Facts**:
>
> - Reader accounts are for sharing data with entities that do **NOT have** their own Snowflake account.
> - TYPE = READER is the **only** supported type for managed accounts.
> - The **provider pays** for all compute (warehouse) costs in reader accounts.
> - Reader accounts can **only** consume data from the provider that created them.
> - Reader accounts have **read-only** access -- no data loading, no DML.
> - Default limit: **20 reader accounts** per provider account.
> - Set up a **resource monitor** on reader accounts to control costs.
> - Reader accounts do NOT have a licensing agreement with Snowflake -- no direct Snowflake support.

---

### 10. SNOWFLAKE MARKETPLACE & DATA EXCHANGE

```text
No specific SQL syntax -- these are managed via the Snowsight UI.
However, the following concepts are heavily tested.
```

#### 10.1 Key Concepts

> **Snowflake Marketplace** (Public):
>
> - A public data exchange **administered by Snowflake**.
> - Any Snowflake customer can browse and consume data.
> - Providers publish **listings** (free or paid).
> - Powered by Secure Data Sharing + Replication under the hood.
>
> **Data Exchange** (Private):
>
> - A **private** marketplace administered by the **provider/organization**.
> - Only **invited** accounts can participate.
> - Useful for intra-company data sharing or trusted partner networks.
>
> **Listing** (vs. Direct Share):
>
> - A **listing** can be published globally across regions/clouds (uses replication behind the scenes).
> - A **direct share** is limited to the **same region and cloud**.
> - A share can only be attached to **one listing**.
>
> **Listing Types**:
>
> - **Standard listing**: Consumers get instant access to the shared data.
> - **Personalized listing**: Consumers submit a request; providers can accept or reject.
>
> **Key Roles**:
>
> - **Data Exchange Admin**: ACCOUNTADMIN or role with IMPORTED PRIVILEGES on the exchange.
> - **Data Provider**: Creates and publishes listings.
> - **Data Consumer**: Browses and subscribes to listings.
>
> **EXAM TIP**: Remember the three modes of data distribution:
>
> 1. **Direct Share** -- same region, 1:1 or 1:few, via SHARE object
> 2. **Data Exchange** -- private, invited group, via listings
> 3. **Marketplace** -- public, any Snowflake customer, via listings
>
> A Snowflake account can be a member of multiple Data Exchanges simultaneously.

---

### 11. ACCESS CONTROL IN SHARES

#### 11.1 Using database roles with shares

```sql
-- Create a database role
CREATE DATABASE ROLE my_db.share_reader;

-- Grant privileges to the database role
GRANT USAGE ON SCHEMA my_db.public TO DATABASE ROLE my_db.share_reader;
GRANT SELECT ON TABLE my_db.public.orders TO DATABASE ROLE my_db.share_reader;

-- Grant the database role to the share
GRANT DATABASE ROLE my_db.share_reader TO SHARE my_share;
```

#### 11.2 What CAN be shared

```sql
-- Objects that CAN be granted to a share:
-- Tables (SELECT)
-- Secure views (SELECT)
-- Secure materialized views (SELECT)
-- Secure UDFs (USAGE)
-- External tables (SELECT)
-- Iceberg tables (SELECT)
-- Dynamic tables (SELECT)
-- Database roles (USAGE -- groups privileges together)
```

#### 11.3 What CANNOT be shared

```text
Objects that CANNOT be shared or granted to a share:
- Non-secure views (unless SECURE_OBJECTS_ONLY=FALSE on share)
- Stages (internal or external)
- Tasks
- Streams
- Pipes
- Stored Procedures
- Sequences
- File formats
- Imported (shared) databases (cannot re-share)
- Future grants (GRANT ... ON FUTURE ... TO SHARE is not supported)
```

> **EXAM TIP**: The exam loves to test what can and cannot be included in a share.
> Remember: "Tables, Secure Views, Secure UDFs -- yes. Stages, Tasks, Streams, Pipes -- no."

---

### 12. REPLICATION & FAILOVER

#### 12.1 Enable replication for accounts (ORGADMIN)

```sql
-- Must be run by ORGADMIN role
-- Enable replication for each source and target account
USE ROLE ORGADMIN;

SELECT SYSTEM$GLOBAL_ACCOUNT_SET_PARAMETER(
  'myorg.source_account', 'ENABLE_ACCOUNT_DATABASE_REPLICATION', 'true');

SELECT SYSTEM$GLOBAL_ACCOUNT_SET_PARAMETER(
  'myorg.target_account', 'ENABLE_ACCOUNT_DATABASE_REPLICATION', 'true');
```

#### 12.2 CREATE REPLICATION GROUP (source account)

```sql
-- Create a replication group on the source (primary) account
CREATE REPLICATION GROUP my_rg
  OBJECT_TYPES = DATABASES, ROLES, WAREHOUSES
  ALLOWED_DATABASES = db1, db2
  ALLOWED_ACCOUNTS = myorg.target_account
  REPLICATION_SCHEDULE = '10 MINUTE';
```

#### 12.3 CREATE REPLICATION GROUP (target account -- as replica)

```sql
-- Create the secondary replication group on the target account
USE ROLE ACCOUNTADMIN;
CREATE REPLICATION GROUP my_rg
  AS REPLICA OF myorg.source_account.my_rg;
```

#### 12.4 CREATE FAILOVER GROUP (source account)

```sql
-- Create a failover group (supports failover, not just replication)
CREATE FAILOVER GROUP my_fg
  OBJECT_TYPES = USERS, ROLES, WAREHOUSES, RESOURCE MONITORS, DATABASES, INTEGRATIONS
  ALLOWED_DATABASES = db1, db2
  ALLOWED_INTEGRATION_TYPES = SECURITY INTEGRATIONS
  ALLOWED_ACCOUNTS = myorg.target_account1, myorg.target_account2
  REPLICATION_SCHEDULE = '10 MINUTE';
```

#### 12.5 CREATE FAILOVER GROUP (target account -- as replica)

```sql
-- Create the secondary failover group on the target account
USE ROLE ACCOUNTADMIN;
CREATE FAILOVER GROUP my_fg
  AS REPLICA OF myorg.source_account.my_fg;
```

#### 12.6 ALTER REPLICATION/FAILOVER GROUP -- Refresh, Suspend, Resume

```sql
-- Manually refresh the secondary (run on TARGET account)
ALTER REPLICATION GROUP my_rg REFRESH;
ALTER FAILOVER GROUP my_fg REFRESH;

-- Suspend automatic scheduled refreshes (run on TARGET account)
ALTER REPLICATION GROUP my_rg SUSPEND;
ALTER FAILOVER GROUP my_fg SUSPEND;

-- Cancel an in-progress refresh immediately
ALTER FAILOVER GROUP my_fg SUSPEND IMMEDIATE;

-- Resume automatic scheduled refreshes (run on TARGET account)
ALTER REPLICATION GROUP my_rg RESUME;
ALTER FAILOVER GROUP my_fg RESUME;
```

#### 12.7 ALTER REPLICATION GROUP -- Modify (run on SOURCE account)

```sql
-- Change the replication schedule
ALTER REPLICATION GROUP my_rg SET REPLICATION_SCHEDULE = '30 MINUTE';

-- Add an object type
ALTER REPLICATION GROUP my_rg SET OBJECT_TYPES = DATABASES, ROLES, WAREHOUSES, USERS;

-- Add/remove target accounts
ALTER REPLICATION GROUP my_rg ADD myorg.another_target;
ALTER REPLICATION GROUP my_rg REMOVE myorg.old_target;
```

#### 12.8 Failover (promote secondary to primary)

```sql
-- Run on the TARGET account to promote it to primary
-- Step 1: Suspend scheduled refreshes
ALTER FAILOVER GROUP my_fg SUSPEND;

-- Step 2: Promote secondary to primary
ALTER FAILOVER GROUP my_fg PRIMARY;

-- Step 3: Resume replication on other secondaries
ALTER FAILOVER GROUP my_fg RESUME;
```

#### 12.9 SHOW commands for replication

```sql
-- Show all replication groups (includes both replication and failover groups)
SHOW REPLICATION GROUPS;

-- Show replication groups for a specific account
SHOW REPLICATION GROUPS IN ACCOUNT myaccount1;

-- Show databases in a replication group
SHOW DATABASES IN REPLICATION GROUP my_rg;

-- Show shares in a replication group
SHOW SHARES IN REPLICATION GROUP my_rg;

-- Show replication accounts (ORGADMIN or ACCOUNTADMIN)
SHOW REPLICATION ACCOUNTS;
```

> **EXAM TIP -- Replication & Failover Key Facts**:
>
> - **Replication Group** = one-way replication only (read-only replicas).
> - **Failover Group** = replication + ability to promote secondary to primary.
> - Failover groups require **Business Critical Edition** (or higher).
> - Database and share replication is available to **all editions**.
> - An object can only belong to **one failover group**.
> - An object can be in **multiple replication groups** if each targets a different account.
> - REPLICATION_SCHEDULE max interval = **11,520 minutes (8 days)**.
> - The `ORGADMIN` role is needed to enable replication via SYSTEM$GLOBAL_ACCOUNT_SET_PARAMETER.
> - Cannot failover while a refresh is in progress -- **suspend first**.

---

### 13. DATABASE REPLICATION (Legacy Syntax)

#### 13.1 Enable replication (legacy -- on source account)

```sql
-- Legacy approach: enable replication on a specific database
-- Snowflake recommends using replication/failover groups instead
ALTER DATABASE my_db ENABLE REPLICATION TO ACCOUNTS myorg.target_acct1, myorg.target_acct2;

-- With IGNORE EDITION CHECK (allows replication to lower-edition accounts)
ALTER DATABASE my_db ENABLE REPLICATION TO ACCOUNTS myorg.target_acct1
  IGNORE EDITION CHECK;
```

#### 13.2 Enable failover (legacy -- on source account)

```sql
-- Enable failover for the database to specific accounts
ALTER DATABASE my_db ENABLE FAILOVER TO ACCOUNTS myorg.target_acct1;
```

#### 13.3 Create replica database (legacy -- on target account)

```sql
-- Create a replica (secondary) database on the target account
CREATE DATABASE my_db AS REPLICA OF myorg.source_acct.my_db;

-- Refresh the replica manually
ALTER DATABASE my_db REFRESH;
```

#### 13.4 Promote secondary to primary (legacy)

```sql
-- Promote a secondary database to primary (failover)
ALTER DATABASE my_db PRIMARY;
```

#### 13.5 SHOW REPLICATION DATABASES (legacy)

```sql
-- List all primary and secondary databases with replication enabled
SHOW REPLICATION DATABASES;

-- Filter by primary database
SHOW REPLICATION DATABASES WITH PRIMARY myorg.source_acct.my_db;
```

#### 13.6 Disable legacy replication (to migrate to groups)

```sql
-- Disable database-level replication (required before adding to a replication/failover group)
SELECT SYSTEM$DISABLE_DATABASE_REPLICATION('my_db');
```

> **EXAM TIP**: The legacy `ALTER DATABASE ... ENABLE REPLICATION` approach is deprecated
> in favor of replication/failover groups. However, it still appears on the exam.
> Key difference: legacy replicates **one database at a time**; groups replicate
> **multiple objects with point-in-time consistency**.

---

### 14. CHANGES CLAUSE (Change Data Capture without Streams)

#### 14.1 Prerequisites -- enable change tracking

```sql
-- Enable change tracking on a table
ALTER TABLE my_table SET CHANGE_TRACKING = TRUE;
```

#### 14.2 Query changes with INFORMATION => DEFAULT

```sql
-- Query ALL changes (inserts, updates, deletes) since a point in time
SELECT *
FROM my_table
  CHANGES(INFORMATION => DEFAULT)
  AT(TIMESTAMP => '2024-06-26 09:00:00'::TIMESTAMP);

-- Query changes from an offset
SELECT *
FROM my_table
  CHANGES(INFORMATION => DEFAULT)
  AT(OFFSET => -60*30);  -- last 30 minutes

-- Query changes between two points in time (AT + END)
SELECT *
FROM my_table
  CHANGES(INFORMATION => DEFAULT)
  AT(TIMESTAMP => '2024-06-26 09:00:00'::TIMESTAMP)
  END(TIMESTAMP => '2024-06-26 12:00:00'::TIMESTAMP);
```

#### 14.3 Query changes with INFORMATION => APPEND_ONLY

```sql
-- Query ONLY inserted rows (ignores updates and deletes) -- more performant
SELECT *
FROM my_table
  CHANGES(INFORMATION => APPEND_ONLY)
  AT(OFFSET => -60*60);  -- last hour
```

#### 14.4 Using STREAM offset with CHANGES

```sql
-- Use a stream's current offset as the starting point
SELECT *
FROM my_table
  CHANGES(INFORMATION => DEFAULT)
  AT(STREAM => 'my_stream');
```

> **EXAM TIP -- CHANGES Clause Key Facts**:
>
> - `INFORMATION => DEFAULT` = all DML changes (insert, update, delete, truncate).
> - `INFORMATION => APPEND_ONLY` = inserts only (faster, simpler).
> - The CHANGES clause adds **metadata columns**: METADATA$ACTION, METADATA$ISUPDATE, METADATA$ROW_ID.
> - Change tracking must be **enabled** on the table first (or a stream must exist on it).
> - CHANGES does **not consume** an offset -- unlike reading from a stream.
> - Data must be within the **Time Travel retention period** or the query fails.
> - Not supported for external tables or directory tables.

---

### 15. SYSTEM FUNCTIONS

#### 15.1 SYSTEM$LAST_CHANGE_COMMIT_TIME

```sql
-- Returns the epoch timestamp (nanoseconds) of the last DML change on a table
SELECT SYSTEM$LAST_CHANGE_COMMIT_TIME('my_db.my_schema.my_table');

-- Can also be called with CALL
CALL SYSTEM$LAST_CHANGE_COMMIT_TIME('my_table');

-- Returns something like: 1661920053987000000
-- For a view, returns the latest commit time of ALL referenced objects
SELECT SYSTEM$LAST_CHANGE_COMMIT_TIME('my_view');
```

#### 15.2 SYSTEM$GLOBAL_ACCOUNT_SET_PARAMETER

```sql
-- Set account-level parameters globally (requires ORGADMIN)
-- Primary use: enable replication on accounts

USE ROLE ORGADMIN;

-- Enable replication for an account
SELECT SYSTEM$GLOBAL_ACCOUNT_SET_PARAMETER(
  'myorg.account1',
  'ENABLE_ACCOUNT_DATABASE_REPLICATION',
  'true'
);
```

#### 15.3 SYSTEM$DISABLE_DATABASE_REPLICATION

```sql
-- Disable legacy database replication (to migrate to group-based replication)
SELECT SYSTEM$DISABLE_DATABASE_REPLICATION('my_db');
```

> **EXAM TIP**: SYSTEM$LAST_CHANGE_COMMIT_TIME is useful for determining if a table
> has been modified since a known point in time. The return value is in **nanoseconds**
> (epoch format), not a human-readable timestamp. For views, it checks **all** underlying objects.

---

### 16. OBJECT_DEPENDENCIES VIEW

```sql
-- Query dependencies from Account Usage (latency up to 3 hours)
SELECT
    referencing_object_name,
    referencing_object_type,
    referenced_object_name,
    referenced_object_type
FROM SNOWFLAKE.ACCOUNT_USAGE.OBJECT_DEPENDENCIES
WHERE referenced_object_name = 'MY_TABLE'
  AND referenced_object_domain = 'TABLE';

-- Find all objects that depend on a specific table
SELECT *
FROM SNOWFLAKE.ACCOUNT_USAGE.OBJECT_DEPENDENCIES
WHERE referenced_database = 'MY_DB'
  AND referenced_schema = 'PUBLIC'
  AND referenced_object_name = 'CUSTOMERS';

-- Find what a specific view depends on
SELECT *
FROM SNOWFLAKE.ACCOUNT_USAGE.OBJECT_DEPENDENCIES
WHERE referencing_object_name = 'MY_VIEW'
  AND referencing_object_domain = 'VIEW';
```

> **EXAM TIP -- OBJECT_DEPENDENCIES Key Facts**:
>
> - Located in `SNOWFLAKE.ACCOUNT_USAGE` schema (has up to **3-hour latency**).
> - Shows pairs of **referencing** (dependent) and **referenced** (base) objects.
> - Dependency types: BY_NAME (e.g., view -> table) and BY_ID (e.g., stage -> storage integration).
> - Does NOT capture clone dependencies.
> - Does NOT capture dependencies involving session parameters in object definitions.
> - Useful for **impact analysis** before dropping or modifying objects.

---

### 17. TRANSIENT & TEMPORARY TABLE IMPLICATIONS

#### 17.1 Creating transient and temporary tables

```sql
-- Create a transient table (no Fail-safe, max 1-day Time Travel)
CREATE TRANSIENT TABLE staging_data (
    id INT,
    payload VARIANT
) DATA_RETENTION_TIME_IN_DAYS = 1;

-- Create a temporary table (session-scoped, no Fail-safe, max 1-day Time Travel)
CREATE TEMPORARY TABLE session_temp (
    key STRING,
    value STRING
);

-- Create a transient schema (all tables within inherit transient behavior)
CREATE TRANSIENT SCHEMA staging;

-- Create a transient database (all schemas and tables inherit transient behavior)
CREATE TRANSIENT DATABASE etl_workspace;
```

> **EXAM TIP -- Transient vs Temporary vs Permanent Summary**:
>
> | Feature                | Permanent        | Transient        | Temporary             |
> | ---------------------- | ---------------- | ---------------- | --------------------- |
> | Keyword                | (default)        | CREATE TRANSIENT | CREATE TEMPORARY      |
> | Time Travel            | 0-90 days (Ent.) | 0-1 day          | 0-1 day               |
> | Fail-safe              | 7 days           | **None**         | **None**              |
> | Visible to other users | Yes              | Yes              | **No (session only)** |
> | Persists after session | Yes              | Yes              | **No**                |
> | Can be cloned          | Yes              | Yes              | **No**                |
> | Storage costs          | Data + TT + FS   | Data + TT        | Data + TT             |
> | Best for               | Production data  | ETL staging      | Session scratch       |
>
> - A transient/temporary table inside a permanent schema is still transient/temporary.
> - A permanent table inside a transient schema inherits transient behavior (0 Fail-safe).
> - You **cannot** create a permanent table inside a transient database/schema.
> - Transient tables are ideal for **cost savings** on staging/ETL data.

---

### 18. ADDITIONAL EXAM-RELEVANT COMMANDS

#### 18.1 DESCRIBE SHARE

```sql
-- Describe objects included in a share (provider or consumer)
DESCRIBE SHARE my_share;
DESCRIBE SHARE provider_org.provider_acct.their_share;
-- Shorthand
DESC SHARE my_share;
```

#### 18.2 Granting privileges for non-ACCOUNTADMIN sharing roles

```sql
-- Enable a custom role to manage shares (provider side)
GRANT CREATE SHARE ON ACCOUNT TO ROLE share_admin;

-- Enable a custom role to import shares (consumer side)
GRANT IMPORT SHARE ON ACCOUNT TO ROLE share_consumer;
GRANT CREATE DATABASE ON ACCOUNT TO ROLE share_consumer;
```

#### 18.3 Client redirect for failover (connection objects)

```sql
-- Create a connection object (on source account)
CREATE CONNECTION my_connection;

-- Enable failover for the connection to target accounts
ALTER CONNECTION my_connection ENABLE FAILOVER TO ACCOUNTS myorg.target_acct;

-- Create secondary connection on target account
CREATE CONNECTION my_connection AS REPLICA OF myorg.source_acct.my_connection;

-- Promote the connection to primary (failover)
ALTER CONNECTION my_connection PRIMARY;

-- Show connections
SHOW CONNECTIONS;
```

> **EXAM TIP**: Connection objects enable **client redirect** during failover,
> so that client applications are automatically redirected to the new primary
> account without changing connection strings.

#### 18.4 Data encryption

```sql
-- Snowflake encryption is automatic and always-on:
-- - All data is encrypted at rest using AES-256
-- - All data is encrypted in transit using TLS 1.2+
-- - Encryption is end-to-end, including Time Travel and Fail-safe data
-- - Enterprise Edition: periodic key rotation (automatic)
-- - Business Critical: customer-managed keys (Tri-Secret Secure)
```

> **EXAM TIP -- Encryption Key Facts**:
>
> - Encryption is **automatic** -- no user action required.
> - Uses a **hierarchical key model**: root key -> account key -> table key -> file key.
> - Enterprise Edition: **automatic annual key rotation**.
> - Business Critical: **Tri-Secret Secure** (customer-managed key + Snowflake key = composite key).
> - Tri-Secret Secure uses cloud provider KMS (AWS KMS, Azure Key Vault, GCP Cloud KMS).

---

### 19. QUICK REFERENCE -- FREQUENTLY TESTED SCENARIOS

#### Scenario: Accidentally deleted rows -- recover them

```sql
-- Find the query ID of the DELETE statement
SELECT query_id FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY
WHERE query_text ILIKE '%DELETE%my_table%' ORDER BY start_time DESC LIMIT 1;

-- Restore the data using BEFORE
INSERT INTO my_table
SELECT * FROM my_table BEFORE(STATEMENT => '<query_id_of_delete>');
```

#### Scenario: Accidentally dropped a table -- recover it

```sql
UNDROP TABLE my_table;
```

#### Scenario: Need to restore table to a point in time

```sql
-- Option 1: Clone from Time Travel
CREATE TABLE my_table_restored CLONE my_table
  AT(TIMESTAMP => '2024-06-26 09:00:00'::TIMESTAMP_TZ);

-- Option 2: Replace the table
CREATE OR REPLACE TABLE my_table CLONE my_table
  BEFORE(STATEMENT => '<query_id>');
```

#### Scenario: Share data with a non-Snowflake company

```sql
-- Step 1: Create a reader account
CREATE MANAGED ACCOUNT partner_reader
  ADMIN_NAME = 'admin', ADMIN_PASSWORD = 'P@ssw0rd!', TYPE = READER;

-- Step 2: Create the share and grant objects
CREATE SHARE partner_share;
GRANT USAGE ON DATABASE my_db TO SHARE partner_share;
GRANT USAGE ON SCHEMA my_db.public TO SHARE partner_share;
GRANT SELECT ON TABLE my_db.public.partner_data TO SHARE partner_share;

-- Step 3: Add the reader account to the share
ALTER SHARE partner_share ADD ACCOUNTS = <reader_account_locator>;
```

#### Scenario: Set up disaster recovery across regions

```sql
-- Step 1: Enable replication (ORGADMIN)
SELECT SYSTEM$GLOBAL_ACCOUNT_SET_PARAMETER('myorg.prod', 'ENABLE_ACCOUNT_DATABASE_REPLICATION', 'true');
SELECT SYSTEM$GLOBAL_ACCOUNT_SET_PARAMETER('myorg.dr', 'ENABLE_ACCOUNT_DATABASE_REPLICATION', 'true');

-- Step 2: Create failover group on source
USE ROLE ACCOUNTADMIN;  -- on prod account
CREATE FAILOVER GROUP prod_fg
  OBJECT_TYPES = DATABASES, USERS, ROLES, WAREHOUSES
  ALLOWED_DATABASES = prod_db
  ALLOWED_ACCOUNTS = myorg.dr
  REPLICATION_SCHEDULE = '10 MINUTE';

-- Step 3: Create secondary failover group on target
USE ROLE ACCOUNTADMIN;  -- on dr account
CREATE FAILOVER GROUP prod_fg
  AS REPLICA OF myorg.prod.prod_fg;

-- Step 4: If disaster strikes, failover
ALTER FAILOVER GROUP prod_fg SUSPEND;
ALTER FAILOVER GROUP prod_fg PRIMARY;
```

---

### 20. FINAL EXAM TIPS -- DOMAIN 6 SUMMARY

> **Time Travel**: SELECT ... AT/BEFORE, UNDROP, CLONE with AT/BEFORE. Know the three
> parameters: TIMESTAMP, OFFSET (seconds), STATEMENT (query ID).
>
> **Fail-safe**: 7 days for permanent tables only. Not user-accessible. No Fail-safe
> for transient or temporary tables.
>
> **Cloning**: Zero additional storage initially. Independent objects. Cannot clone
> temporary tables. Cloning a database clones all child objects.
>
> **Sharing**: CREATE SHARE -> GRANT ... TO SHARE -> ALTER SHARE ADD ACCOUNTS.
> Consumer: CREATE DATABASE FROM SHARE -> GRANT IMPORTED PRIVILEGES.
> Only secure views can be shared. Cannot reshare. Read-only for consumers.
>
> **Reader accounts**: For non-Snowflake users. Provider pays for compute. TYPE = READER.
> Created via CREATE MANAGED ACCOUNT. Max 20 per provider by default.
>
> **Marketplace/Exchange**: Marketplace = public (Snowflake-managed). Data Exchange = private
> (provider-managed). Listings enable cross-region sharing via replication.
>
> **Replication**: Replication groups (read-only replicas) vs. failover groups (can promote).
> Failover requires Business Critical. ORGADMIN enables replication on accounts.
> Use ALTER FAILOVER GROUP ... PRIMARY to fail over.
>
> **CHANGES clause**: Alternative to streams. INFORMATION => DEFAULT (all changes) or
> APPEND_ONLY (inserts only). Requires change tracking enabled. Does not consume offset.
