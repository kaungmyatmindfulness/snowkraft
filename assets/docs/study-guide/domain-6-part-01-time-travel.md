# Domain 6: Data Protection & Sharing - Time Travel

## Overview

Snowflake Time Travel is a powerful data protection feature that enables accessing historical data at any point within a defined retention period. This capability allows you to query, clone, and restore data that has been changed or deleted, forming a critical component of Snowflake's Continuous Data Protection (CDP) lifecycle.

**Exam Weight**: Domain 6 (Data Protection & Sharing) accounts for 5-10% of the SnowPro Core exam.

---

## 1. Introduction to Time Travel

### What is Time Travel?

Time Travel enables accessing **historical data** (data that has been changed or deleted) at any point within a defined period. It is automatically enabled for all Snowflake accounts with no configuration required.

### Time Travel Capabilities

| Capability | Description |
|-----------|-------------|
| **Query Historical Data** | SELECT data as it existed at a specific point in time |
| **Clone Historical Objects** | Create clones of tables, schemas, and databases at past points |
| **Restore Dropped Objects** | Recover tables, schemas, and databases that have been dropped |

### Time Travel in the CDP Lifecycle

```
+------------------+     +------------------+     +------------------+
|   CURRENT DATA   | --> |   TIME TRAVEL    | --> |    FAIL-SAFE     |
|                  |     | (1-90 days)      |     | (7 days)         |
+------------------+     +------------------+     +------------------+
       |                        |                        |
       v                        v                        v
  Live queries           Historical queries         Snowflake recovery
  Real-time access       UNDROP, CLONE             Best-effort only
```

**Key Point**: Time Travel is for user-accessible historical data; Fail-safe is for Snowflake-managed disaster recovery only.

---

## 2. Data Retention Period

### The DATA_RETENTION_TIME_IN_DAYS Parameter

The retention period determines how long historical data is preserved and available for Time Travel operations.

```sql
-- Set retention period at account level (ACCOUNTADMIN required)
ALTER ACCOUNT SET DATA_RETENTION_TIME_IN_DAYS = 30;

-- Set retention period at database level
ALTER DATABASE my_db SET DATA_RETENTION_TIME_IN_DAYS = 14;

-- Set retention period at schema level
ALTER SCHEMA my_schema SET DATA_RETENTION_TIME_IN_DAYS = 7;

-- Set retention period at table level
ALTER TABLE my_table SET DATA_RETENTION_TIME_IN_DAYS = 30;
```

### Retention Period by Edition and Table Type

| Table Type | Snowflake Standard | Enterprise Edition+ | Fail-safe Period |
|------------|-------------------|---------------------|------------------|
| **Permanent Tables** | 0 or 1 day | 0 to 90 days | 7 days |
| **Transient Tables** | 0 or 1 day | 0 or 1 day | 0 days |
| **Temporary Tables** | 0 or 1 day | 0 or 1 day | 0 days |

**Critical Exam Point**: Extended retention (up to 90 days) is an **Enterprise Edition** feature. Standard Edition is limited to 0 or 1 day.

### MIN_DATA_RETENTION_TIME_IN_DAYS Parameter

Administrators can enforce a **minimum** retention period at the account level:

```sql
-- Set minimum retention period (ACCOUNTADMIN required)
ALTER ACCOUNT SET MIN_DATA_RETENTION_TIME_IN_DAYS = 7;
```

**Effective Retention Calculation**:
```
Effective Retention = MAX(DATA_RETENTION_TIME_IN_DAYS, MIN_DATA_RETENTION_TIME_IN_DAYS)
```

### Retention Period Inheritance

```
+------------------+
|     ACCOUNT      |  <- Sets default retention (e.g., 30 days)
+------------------+
        |
        v
+------------------+
|    DATABASE      |  <- Inherits from account OR overrides (e.g., 14 days)
+------------------+
        |
        v
+------------------+
|     SCHEMA       |  <- Inherits from database OR overrides (e.g., 7 days)
+------------------+
        |
        v
+------------------+
|      TABLE       |  <- Inherits from schema OR overrides (e.g., 1 day)
+------------------+
```

**Key Rule**: Child objects inherit the retention period from their parent unless explicitly overridden.

---

## 3. SQL Extensions for Time Travel

### AT and BEFORE Clauses

Time Travel uses the **AT** and **BEFORE** clauses with three parameters:

| Parameter | Description | Example |
|-----------|-------------|---------|
| **TIMESTAMP** | Specific date/time | `AT(TIMESTAMP => '2024-06-26 09:20:00'::timestamp_tz)` |
| **OFFSET** | Seconds from current time (negative) | `AT(OFFSET => -300)` for 5 minutes ago |
| **STATEMENT** | Query ID of a specific statement | `BEFORE(STATEMENT => 'query-id-here')` |

### AT vs BEFORE Difference

| Clause | Behavior |
|--------|----------|
| **AT** | Returns data as it existed at the **exact moment** specified |
| **BEFORE** | Returns data as it existed **immediately before** the specified point |

---

## 4. Querying Historical Data

### Query Using Timestamp

```sql
-- Query data at a specific timestamp
SELECT * FROM my_table
AT(TIMESTAMP => 'Wed, 26 Jun 2024 09:20:00 -0700'::timestamp_tz);

-- Query data at a timestamp using DATEADD
SELECT * FROM my_table
AT(TIMESTAMP => DATEADD(hours, -2, CURRENT_TIMESTAMP())::timestamp_tz);
```

### Query Using Offset

```sql
-- Query data from 5 minutes ago (offset in seconds)
SELECT * FROM my_table AT(OFFSET => -60*5);

-- Query data from 1 hour ago
SELECT * FROM my_table AT(OFFSET => -3600);

-- Query data from 1 day ago
SELECT * FROM my_table AT(OFFSET => -86400);
```

### Query Using Statement ID

```sql
-- Query data BEFORE a specific statement was executed
SELECT * FROM my_table
BEFORE(STATEMENT => '8e5d0ca9-005e-44e6-b858-a8f5b37c5726');
```

**Use Case**: This is particularly useful to see data before an UPDATE or DELETE operation.

### Error Handling

If the specified time is outside the retention period, the query fails:

```
Error: requested data is outside the data retention period
```

---

## 5. Cloning Historical Objects

### Clone Tables at a Point in Time

```sql
-- Clone a table at a specific timestamp
CREATE TABLE restored_table CLONE my_table
  AT(TIMESTAMP => 'Wed, 26 Jun 2024 01:01:00 +0300'::timestamp_tz);

-- Clone a table from 1 hour ago
CREATE TABLE restored_table CLONE my_table
  AT(OFFSET => -3600);

-- Clone a table before a specific statement
CREATE TABLE restored_table CLONE my_table
  BEFORE(STATEMENT => '8e5d0ca9-005e-44e6-b858-a8f5b37c5726');
```

### Clone Schemas and Databases

```sql
-- Clone a schema from 1 hour ago
CREATE SCHEMA restored_schema CLONE my_schema AT(OFFSET => -3600);

-- Clone a database before a specific statement
CREATE DATABASE restored_db CLONE my_db
  BEFORE(STATEMENT => '8e5d0ca9-005e-44e6-b858-a8f5b37c5726');
```

### Handling Insufficient Retention

When cloning a database or schema, if any child object's data is beyond its retention period, the operation fails. Use the `IGNORE TABLES WITH INSUFFICIENT DATA RETENTION` clause:

```sql
-- Clone database, skipping tables with insufficient retention
CREATE DATABASE restored_db CLONE my_db
  AT(TIMESTAMP => DATEADD(days, -4, CURRENT_TIMESTAMP())::timestamp_tz)
  IGNORE TABLES WITH INSUFFICIENT DATA RETENTION;
```

### Objects NOT Cloned with Time Travel

The following objects are **not** cloned when using Time Travel:

- External tables
- Hybrid tables (for schema-level clones)
- User tasks (when using TIMESTAMP with CREATE SCHEMA CLONE)

---

## 6. Dropping and Restoring Objects (UNDROP)

### DROP Behavior with Time Travel

When you DROP a table, schema, or database:

1. The object is **not immediately removed** from the system
2. It is retained for the data retention period
3. During this period, the object can be restored with UNDROP
4. After retention expires, it moves to Fail-safe (permanent tables only)

```sql
-- Drop a table
DROP TABLE loaddata1;

-- Drop a schema (drops all contained objects)
DROP SCHEMA my_schema;

-- Drop a database (drops all contained schemas and tables)
DROP DATABASE my_db;
```

### Listing Dropped Objects

Use the **HISTORY** clause with SHOW commands:

```sql
-- Show dropped tables
SHOW TABLES HISTORY LIKE 'load%' IN my_db.my_schema;

-- Show dropped schemas
SHOW SCHEMAS HISTORY IN my_db;

-- Show dropped databases
SHOW DATABASES HISTORY;
```

The output includes a **DROPPED_ON** column showing when each object was dropped.

### UNDROP Command

```sql
-- Restore a dropped table
UNDROP TABLE mytable;

-- Restore a dropped schema
UNDROP SCHEMA myschema;

-- Restore a dropped database
UNDROP DATABASE mydatabase;
```

**UNDROP restores the object to its most recent state before DROP was executed.**

### Objects That Support UNDROP

| Object Type | UNDROP Command |
|-------------|----------------|
| Table | `UNDROP TABLE` |
| Schema | `UNDROP SCHEMA` |
| Database | `UNDROP DATABASE` |
| Dynamic Table | `UNDROP DYNAMIC TABLE` |
| Iceberg Table | `UNDROP ICEBERG TABLE` |
| Notebook | `UNDROP NOTEBOOK` |
| External Volume | `UNDROP EXTERNAL VOLUME` |
| Tag | `UNDROP TAG` |
| Account | `UNDROP ACCOUNT` |

### UNDROP Name Conflict Resolution

**If an object with the same name already exists, UNDROP fails.** You must rename the existing object first:

```sql
-- Scenario: Need to restore dropped "loaddata1" but a new table
-- with the same name already exists

-- Step 1: Rename the current table
ALTER TABLE loaddata1 RENAME TO loaddata1_current;

-- Step 2: Restore the dropped table
UNDROP TABLE loaddata1;

-- Step 3: Rename restored table if needed
ALTER TABLE loaddata1 RENAME TO loaddata1_restored;
```

### Multiple Dropped Versions

If a table was dropped multiple times, UNDROP restores the **most recently dropped version**. To restore earlier versions, repeat the rename-and-undrop process:

```sql
-- Table was dropped twice - restore both versions

-- Restore most recent drop
ALTER TABLE loaddata1 RENAME TO loaddata3;
UNDROP TABLE loaddata1;

-- Rename restored table
ALTER TABLE loaddata1 RENAME TO loaddata2;

-- Restore first drop
UNDROP TABLE loaddata1;
```

---

## 7. Changing Retention Periods

### Increasing Retention Period

When you increase retention:
- Data currently in Time Travel is retained for the **longer** period
- Does not affect data already moved to Fail-safe

```sql
-- Increase retention from 10 to 20 days
ALTER TABLE my_table SET DATA_RETENTION_TIME_IN_DAYS = 20;
-- Data from days 1-10 now retained for 20 days total
```

### Decreasing Retention Period

When you decrease retention:
- Data **within** the new period remains in Time Travel
- Data **outside** the new period moves to Fail-safe
- The transition happens via background process (not immediate)

```sql
-- Decrease retention from 10 to 1 day
ALTER TABLE my_table SET DATA_RETENTION_TIME_IN_DAYS = 1;
-- Data from days 2-10 will move to Fail-safe
-- Only day 1 data remains in Time Travel
```

### Dropped Objects and Retention Changes

**Important**: Changing retention on a database or schema does **not** affect already-dropped objects.

```sql
-- Schema s1 has 90-day retention
-- Table t1 is dropped (retained for 90 days)
-- Later, schema retention is changed to 1 day
-- Dropped table t1 STILL retained for 90 days (unchanged)
```

To change retention on a dropped object:
1. UNDROP the object
2. ALTER the retention period
3. DROP again if needed

---

## 8. Disabling Time Travel

### Setting Retention to 0

You can disable Time Travel for an object by setting retention to 0:

```sql
-- Disable Time Travel for a table
ALTER TABLE my_table SET DATA_RETENTION_TIME_IN_DAYS = 0;
```

**Consequences of Retention = 0**:
- Modified/deleted data moves directly to Fail-safe (permanent tables)
- Modified/deleted data is deleted (transient tables)
- Dropped objects **cannot** be restored
- No historical queries possible

### When Retention = 0 Is Overridden

If `MIN_DATA_RETENTION_TIME_IN_DAYS` is set at the account level, setting `DATA_RETENTION_TIME_IN_DAYS = 0` may not actually disable Time Travel:

```
Effective = MAX(0, MIN_DATA_RETENTION_TIME_IN_DAYS)
```

### Checking Retention Period

```sql
-- Check retention for tables
SHOW TABLES;
-- Look at retention_time column

-- Check tables with Time Travel disabled
SELECT "name", "retention_time"
FROM TABLE(RESULT_SCAN(LAST_QUERY_ID()))
WHERE "retention_time" = 0;

-- Check schemas with non-default retention
SHOW SCHEMAS;
SELECT "name", "retention_time"
FROM TABLE(RESULT_SCAN(LAST_QUERY_ID()))
WHERE "retention_time" > 1;
```

---

## 9. Storage Costs

### How Time Travel Storage is Calculated

- Storage fees are incurred for each **24-hour period** of historical data
- Snowflake stores only the **changed portions** of data (not full copies)
- Full copies are stored only when tables are **dropped or truncated**

### Storage by Table Type

| Table Type | Time Travel Storage | Fail-safe Storage | Max Additional Days |
|------------|---------------------|-------------------|---------------------|
| **Permanent (Standard)** | 0-1 day | 7 days | 8 days |
| **Permanent (Enterprise)** | 0-90 days | 7 days | 97 days |
| **Transient** | 0-1 day | 0 days | 1 day |
| **Temporary** | 0-1 day | 0 days | 1 day |

### Managing Storage Costs

Use transient or temporary tables for:
- ETL work/staging tables
- Short-lived data
- Data that can be easily recreated

**Do NOT use transient tables for**:
- Critical business data
- Data that requires Fail-safe protection
- Long-lived fact tables

---

## 10. Time Travel vs Fail-safe

| Feature | Time Travel | Fail-safe |
|---------|-------------|-----------|
| **Duration** | 0-90 days (configurable) | 7 days (fixed) |
| **User Access** | Yes (queries, clones, UNDROP) | No (Snowflake only) |
| **Configurable** | Yes | No |
| **Purpose** | User-initiated recovery | Disaster recovery |
| **Table Types** | All tables | Permanent tables only |
| **Recovery Time** | Immediate | Hours to days |

**Key Exam Point**: Users cannot access Fail-safe data directly. It requires contacting Snowflake Support and recovery is on a best-effort basis.

---

## 11. Exam Tips and Common Question Patterns

### Key Facts to Memorize

1. **Default retention**: 1 day for all editions
2. **Maximum retention**: 1 day (Standard), 90 days (Enterprise+)
3. **Fail-safe period**: 7 days (permanent tables only)
4. **Transient/Temporary tables**: No Fail-safe, max 1 day retention
5. **Time Travel is always enabled** - cannot be disabled at account level
6. **UNDROP fails** if an object with the same name exists

### Common Exam Question Types

**Question Type 1: Edition Comparison**
> "A company using Standard Edition wants to configure 30-day Time Travel retention. What should they do?"

**Answer**: Upgrade to Enterprise Edition. Standard Edition is limited to 1 day.

**Question Type 2: AT vs BEFORE**
> "You accidentally deleted rows with a DELETE statement. Which clause do you use to see data before the delete?"

**Answer**: `BEFORE(STATEMENT => 'query-id')` or `AT(OFFSET => -seconds)`

**Question Type 3: UNDROP Failure**
> "UNDROP TABLE fails with 'object already exists' error. How do you resolve this?"

**Answer**: Rename the existing object, then UNDROP.

**Question Type 4: Storage Costs**
> "Which table type has the lowest storage cost for temporary ETL data?"

**Answer**: Transient tables (no Fail-safe, max 1-day Time Travel)

**Question Type 5: Retention Inheritance**
> "A database has 30-day retention. A new table is created without specifying retention. What is the table's retention?"

**Answer**: 30 days (inherits from parent database)

### Remember These Relationships

```
+--------------------------------------------------+
|           CONTINUOUS DATA PROTECTION             |
+--------------------------------------------------+
|                                                  |
|   Current Data --> Time Travel --> Fail-safe    |
|       |              |               |           |
|   Live queries   User recovery   Snowflake only |
|   Updates/Deletes  UNDROP/CLONE   Best effort   |
|       |              |               |           |
|   Immediate      1-90 days       7 days         |
|                  (configurable)   (fixed)        |
+--------------------------------------------------+
```

### Practice Questions

1. What happens when DATA_RETENTION_TIME_IN_DAYS is set to 0 for a permanent table?

<details>
<summary>Show Answer</summary>

**Answer**: Data moves directly to Fail-safe upon modification/deletion
</details>

2. Can you query Fail-safe data using Time Travel syntax?

<details>
<summary>Show Answer</summary>

**Answer**: No, Fail-safe is only accessible by Snowflake for disaster recovery
</details>

3. What is the retention period for a transient table in Enterprise Edition?

<details>
<summary>Show Answer</summary>

**Answer**: 0 or 1 day (cannot be extended beyond 1 day)
</details>

4. How do you restore the second-most-recently dropped version of a table?

<details>
<summary>Show Answer</summary>

**Answer**: UNDROP the most recent, rename it, then UNDROP again
</details>

5. What parameter enforces minimum retention across all objects in an account?

<details>
<summary>Show Answer</summary>

**Answer**: MIN_DATA_RETENTION_TIME_IN_DAYS
</details>

---

## Quick Reference Card

### Time Travel Commands

```sql
-- Query historical data
SELECT * FROM table AT(TIMESTAMP => 'timestamp');
SELECT * FROM table AT(OFFSET => -seconds);
SELECT * FROM table BEFORE(STATEMENT => 'query-id');

-- Clone historical objects
CREATE TABLE new_t CLONE old_t AT(OFFSET => -3600);
CREATE SCHEMA new_s CLONE old_s AT(TIMESTAMP => 'ts');
CREATE DATABASE new_d CLONE old_d BEFORE(STATEMENT => 'id');

-- Restore dropped objects
UNDROP TABLE table_name;
UNDROP SCHEMA schema_name;
UNDROP DATABASE database_name;

-- Configure retention
ALTER TABLE t SET DATA_RETENTION_TIME_IN_DAYS = 30;
ALTER ACCOUNT SET MIN_DATA_RETENTION_TIME_IN_DAYS = 7;

-- Check dropped objects
SHOW TABLES HISTORY;
SHOW SCHEMAS HISTORY;
SHOW DATABASES HISTORY;
```

### Retention Limits Summary

| Edition | Permanent Tables | Transient Tables | Temporary Tables |
|---------|------------------|------------------|------------------|
| Standard | 0-1 day | 0-1 day | 0-1 day |
| Enterprise+ | 0-90 days | 0-1 day | 0-1 day |
