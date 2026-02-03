# Domain 3: Performance Concepts - Query History and Monitoring

## Overview

Query history and monitoring are essential components of Snowflake's performance management capabilities. Understanding how to access, analyze, and act upon query history data is critical for optimizing workloads, troubleshooting performance issues, and managing costs effectively.

---

## 1. Query History Access Methods

Snowflake provides multiple ways to access query history information:

### 1.1 Snowsight Query History Page

Access via: **Monitoring > Query History**

Two views are available:
- **Individual Queries**: View specific query executions
- **Grouped Queries**: Aggregate view based on parameterized query hash (useful for high-volume workloads)

**Key Features:**
- Explore queries executed over the last **14 days**
- Filter by status, user, warehouse, duration, statement type, session ID, and query tag
- View query details including performance data and query profile

### 1.2 ACCOUNT_USAGE.QUERY_HISTORY View

```sql
SELECT * FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY
WHERE start_time >= DATEADD('day', -7, CURRENT_TIMESTAMP());
```

**Characteristics:**
- Located in the SNOWFLAKE shared database
- **1-year (365 days) data retention**
- Up to 45-minute latency for new records
- Requires ACCOUNTADMIN or IMPORTED PRIVILEGES on SNOWFLAKE database

### 1.3 INFORMATION_SCHEMA.QUERY_HISTORY Table Functions

```sql
-- Most recent queries for current user
SELECT * FROM TABLE(INFORMATION_SCHEMA.QUERY_HISTORY());

-- Queries within a time range
SELECT * FROM TABLE(INFORMATION_SCHEMA.QUERY_HISTORY_BY_SESSION());

-- Queries by user
SELECT * FROM TABLE(INFORMATION_SCHEMA.QUERY_HISTORY_BY_USER());

-- Queries by warehouse
SELECT * FROM TABLE(INFORMATION_SCHEMA.QUERY_HISTORY_BY_WAREHOUSE());
```

**Characteristics:**
- **7-day data retention** (shorter than ACCOUNT_USAGE)
- No latency - immediate access to recent queries
- Only accessible to queries run by the current user (unless using elevated roles)

---

## 2. Important QUERY_HISTORY Columns

### 2.1 Core Identification Columns

| Column | Description | Exam Relevance |
|--------|-------------|----------------|
| `QUERY_ID` | Unique identifier for the query | Used with RESULT_SCAN and GET_QUERY_OPERATOR_STATS |
| `QUERY_TEXT` | SQL statement text | May be redacted for failed queries with syntax errors |
| `QUERY_TAG` | User-defined tag via QUERY_TAG session parameter | Useful for categorizing and tracking queries |
| `QUERY_HASH` | Hash of canonicalized query text | Groups identical queries |
| `QUERY_PARAMETERIZED_HASH` | Hash ignoring literal values in predicates | Groups queries with different filter values |

### 2.2 Timing and Performance Columns

| Column | Description | Key for Analysis |
|--------|-------------|------------------|
| `START_TIME` | Query start timestamp | Time-based filtering |
| `END_TIME` | Query completion timestamp | Duration calculation |
| `TOTAL_ELAPSED_TIME` | Total execution time (milliseconds) | Primary performance metric |
| `COMPILATION_TIME` | Time spent parsing and optimizing | High values indicate complex queries |
| `EXECUTION_TIME` | Time spent executing | Core compute time |
| `QUEUED_PROVISIONING_TIME` | Time waiting for warehouse provisioning | Indicates warehouse startup delays |
| `QUEUED_OVERLOAD_TIME` | Time queued due to warehouse overload | Indicates need for larger/multi-cluster warehouse |

### 2.3 Resource Consumption Columns

| Column | Description | Performance Insight |
|--------|-------------|---------------------|
| `BYTES_SCANNED` | Bytes read from storage | Efficiency of pruning |
| `BYTES_WRITTEN` | Bytes written to storage | DML operation size |
| `BYTES_SPILLED_TO_LOCAL_STORAGE` | Data spilled to local disk | Memory pressure indicator |
| `BYTES_SPILLED_TO_REMOTE_STORAGE` | Data spilled to remote storage | Severe memory issue |
| `ROWS_PRODUCED` | Rows returned by query | Result set size |
| `PARTITIONS_SCANNED` | Micro-partitions read | Pruning effectiveness |
| `PARTITIONS_TOTAL` | Total partitions in tables | Compare with scanned for pruning ratio |
| `PERCENTAGE_SCANNED_FROM_CACHE` | Data served from cache | Higher is better |

### 2.4 Status and Error Columns

| Column | Description | Use Case |
|--------|-------------|----------|
| `EXECUTION_STATUS` | Query status (SUCCESS, FAIL, INCIDENT) | Filter for failed queries |
| `ERROR_CODE` | Numeric error code | Programmatic error handling |
| `ERROR_MESSAGE` | Error description | Troubleshooting |

### 2.5 Context Columns

| Column | Description |
|--------|-------------|
| `USER_NAME` | User who executed the query |
| `ROLE_NAME` | Role used for execution |
| `WAREHOUSE_NAME` | Warehouse used |
| `WAREHOUSE_SIZE` | Size of warehouse |
| `WAREHOUSE_TYPE` | STANDARD or SNOWPARK-OPTIMIZED |
| `DATABASE_NAME` | Current database context |
| `SCHEMA_NAME` | Current schema context |
| `SESSION_ID` | Session identifier |

---

## 3. Query Profile Analysis

### 3.1 Accessing the Query Profile

- **Snowsight**: Click on a query in Query History > Query Profile tab
- **SQL**: Use `GET_QUERY_OPERATOR_STATS(query_id)` function

### 3.2 Profile Overview Categories

The Profile Overview shows where execution time was spent:

| Category | Description |
|----------|-------------|
| **Processing** | CPU time for data processing |
| **Local Disk IO** | Blocked by local disk access |
| **Remote Disk IO** | Blocked by remote storage access |
| **Network Communication** | Waiting for network data transfer |
| **Synchronization** | Coordination between processes |
| **Initialization** | Query setup time |

### 3.3 Key Operator Types

**Data Access Operators:**
- `TableScan` - Reads data from tables
- `ExternalScan` - Reads from external stages
- `ValuesClause` - Generates rows from VALUES clause

**Data Processing Operators:**
- `Filter` - Applies WHERE conditions
- `Join` - Combines data from multiple sources
- `Aggregate` - GROUP BY and aggregate functions
- `Sort` / `SortWithLimit` - ORDER BY operations
- `WindowFunction` - Window/analytic functions

**DML Operators:**
- `Insert` - INSERT operations
- `Delete` - DELETE operations
- `Update` - UPDATE operations
- `Merge` - MERGE operations

### 3.4 Statistics in Query Profile

**IO Statistics:**
- Scan progress percentage
- Bytes scanned
- Percentage scanned from cache
- Bytes written to result

**Pruning Statistics:**
- Partitions scanned vs. Partitions total
- Good pruning: scanned << total

**Spilling Statistics:**
- Bytes spilled to local storage
- Bytes spilled to remote storage

**DML Statistics:**
- Rows inserted/updated/deleted
- Number of micro-partitions affected

---

## 4. Common Query Performance Problems

### 4.1 Exploding Joins

**Symptom**: Join operator produces far more rows than inputs

**Causes:**
- Missing join condition (Cartesian product)
- Non-equality predicates causing many-to-many matches
- Duplicate keys in join columns

**Solution**: Add proper equality-based join conditions

### 4.2 UNION vs UNION ALL

**Problem**: Using UNION when UNION ALL would suffice

**Impact**: Unnecessary duplicate elimination (extra Aggregate operator)

**Solution**: Use UNION ALL when duplicates are acceptable or impossible

### 4.3 Spilling to Disk

**Symptom**: High values in spilling statistics

**Causes:**
- Insufficient memory for operation
- Large aggregations or sorts
- Complex window functions

**Solutions:**
- Use larger warehouse size
- Process data in smaller batches
- Optimize query to reduce intermediate data

### 4.4 Inefficient Pruning

**Symptom**: Partitions scanned close to Partitions total

**Causes:**
- No filter predicates on clustered columns
- Data not clustered on filter columns
- Functions applied to filter columns

**Solutions:**
- Add clustering keys aligned with common filters
- Use filter predicates on clustering key columns
- Avoid functions on filtered columns

---

## 5. Query Insights

Snowflake automatically identifies performance issues and provides actionable insights.

### 5.1 Key Insight Types

| Insight ID | Issue | Recommendation |
|------------|-------|----------------|
| `QUERY_INSIGHT_NO_FILTER_ON_TOP_OF_TABLE_SCAN` | No WHERE clause | Add filter to reduce data scanned |
| `QUERY_INSIGHT_INAPPLICABLE_FILTER_ON_TABLE_SCAN` | Filter doesn't eliminate rows | Make filter more selective |
| `QUERY_INSIGHT_UNSELECTIVE_FILTER` | Filter not selective enough | Improve filter conditions |
| `QUERY_INSIGHT_LIKE_WITH_LEADING_WILDCARD` | LIKE pattern starts with wildcard | Use search optimization or avoid leading wildcards |
| `QUERY_INSIGHT_FILTER_WITH_CLUSTERING_KEY` | Query benefited from clustering | Positive insight - no action needed |
| `QUERY_INSIGHT_JOIN_WITH_NO_JOIN_CONDITION` | Cross join detected | Add join conditions |
| `QUERY_INSIGHT_INEFFICIENT_JOIN_CONDITION` | Complex join condition | Simplify join predicate |
| `QUERY_INSIGHT_EXPLODING_JOIN` | Join produces excessive rows | Review join logic |
| `QUERY_INSIGHT_REMOTE_SPILLAGE` | Data spilled to remote storage | Use larger warehouse |
| `QUERY_INSIGHT_QUEUED_OVERLOAD` | Long queue time | Scale warehouse or use multi-cluster |

### 5.2 Accessing Insights

```sql
-- Query the QUERY_INSIGHTS view
SELECT *
FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_INSIGHTS
WHERE query_id = '<query_id>';
```

---

## 6. Performance Analysis Queries

### 6.1 Find Longest Running Queries

```sql
SELECT
    query_id,
    query_text,
    user_name,
    warehouse_name,
    total_elapsed_time / 1000 AS elapsed_seconds,
    bytes_scanned / (1024*1024*1024) AS gb_scanned
FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY
WHERE start_time >= DATEADD('day', -7, CURRENT_TIMESTAMP())
  AND execution_status = 'SUCCESS'
ORDER BY total_elapsed_time DESC
LIMIT 20;
```

### 6.2 Find Queries with High Spilling

```sql
SELECT
    query_id,
    query_text,
    warehouse_size,
    bytes_spilled_to_local_storage / (1024*1024) AS mb_spilled_local,
    bytes_spilled_to_remote_storage / (1024*1024) AS mb_spilled_remote,
    total_elapsed_time / 1000 AS elapsed_seconds
FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY
WHERE start_time >= DATEADD('day', -7, CURRENT_TIMESTAMP())
  AND (bytes_spilled_to_local_storage > 0 OR bytes_spilled_to_remote_storage > 0)
ORDER BY bytes_spilled_to_remote_storage DESC
LIMIT 20;
```

### 6.3 Identify Repeated Expensive Queries

```sql
SELECT
    query_hash,
    COUNT(*) AS execution_count,
    SUM(total_elapsed_time) / 1000 AS total_seconds,
    AVG(total_elapsed_time) / 1000 AS avg_seconds,
    ANY_VALUE(query_id) AS sample_query_id
FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY
WHERE warehouse_name = 'MY_WAREHOUSE'
  AND start_time >= DATEADD('day', -7, CURRENT_TIMESTAMP())
GROUP BY query_hash
ORDER BY total_seconds DESC
LIMIT 100;
```

### 6.4 Analyze Queue Times

```sql
SELECT
    warehouse_name,
    DATE_TRUNC('hour', start_time) AS hour,
    COUNT(*) AS query_count,
    AVG(queued_overload_time) / 1000 AS avg_queue_seconds,
    MAX(queued_overload_time) / 1000 AS max_queue_seconds
FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY
WHERE start_time >= DATEADD('day', -7, CURRENT_TIMESTAMP())
  AND queued_overload_time > 0
GROUP BY warehouse_name, DATE_TRUNC('hour', start_time)
ORDER BY avg_queue_seconds DESC;
```

### 6.5 Measure Pruning Efficiency

```sql
SELECT
    query_id,
    query_text,
    partitions_scanned,
    partitions_total,
    ROUND(partitions_scanned / NULLIF(partitions_total, 0) * 100, 2) AS pct_scanned
FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY
WHERE start_time >= DATEADD('day', -7, CURRENT_TIMESTAMP())
  AND partitions_total > 1000
  AND partitions_scanned / NULLIF(partitions_total, 0) > 0.5
ORDER BY partitions_total DESC
LIMIT 20;
```

### 6.6 Track Query Performance Trends

```sql
SELECT
    query_parameterized_hash,
    DATE_TRUNC('day', start_time) AS day,
    COUNT(*) AS executions,
    AVG(total_elapsed_time) / 1000 AS avg_seconds,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY total_elapsed_time) / 1000 AS p95_seconds
FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY
WHERE query_parameterized_hash = '<hash_value>'
  AND start_time >= DATEADD('day', -30, CURRENT_TIMESTAMP())
GROUP BY query_parameterized_hash, DATE_TRUNC('day', start_time)
ORDER BY day;
```

---

## 7. Privileges for Query History Access

### 7.1 Snowsight Query History

| Access Level | Required Privilege |
|--------------|-------------------|
| Own queries | Any role (default) |
| All account queries | ACCOUNTADMIN |
| Warehouse queries | MONITOR or OPERATE on warehouse |
| Grouped queries view | GOVERNANCE_VIEWER or IMPORTED PRIVILEGES on SNOWFLAKE database |

### 7.2 ACCOUNT_USAGE Views

- Requires **IMPORTED PRIVILEGES** on SNOWFLAKE database
- Or specific database roles like **GOVERNANCE_VIEWER**

### 7.3 INFORMATION_SCHEMA Functions

- Users can always view their own query history
- ACCOUNTADMIN can view all queries
- MONITOR privilege on warehouse allows viewing warehouse queries

---

## 8. Query Hash Concepts

### 8.1 QUERY_HASH

- Computed from canonicalized query text
- Identical queries have same hash
- Differences in case, whitespace, and comments are ignored
- Different literal values = different hash

### 8.2 QUERY_PARAMETERIZED_HASH

- Computed after parameterizing literals in predicates
- Queries with different filter values have same hash
- Useful for analyzing patterns in point-lookup queries
- Essential for Grouped Query History in Snowsight

**Example:**
```sql
-- These have SAME query_parameterized_hash
SELECT * FROM users WHERE id = 123;
SELECT * FROM users WHERE id = 456;

-- These have DIFFERENT query_hash
SELECT * FROM users WHERE id = 123;
SELECT * FROM users WHERE id = 456;
```

---

## 9. Data Retention Comparison

| Source | Retention | Latency | Use Case |
|--------|-----------|---------|----------|
| Snowsight Query History | 14 days | Real-time | Interactive analysis |
| ACCOUNT_USAGE.QUERY_HISTORY | 365 days | Up to 45 min | Historical analysis, reporting |
| INFORMATION_SCHEMA functions | 7 days | Real-time | Recent query debugging |

---

## 10. Exam Tips and Common Question Patterns

### 10.1 Key Facts to Remember

1. **ACCOUNT_USAGE.QUERY_HISTORY** has **1-year retention** with up to **45-minute latency**
2. **INFORMATION_SCHEMA** functions have **7-day retention** with **no latency**
3. **Snowsight Query History** shows data for the last **14 days**
4. **QUERY_PARAMETERIZED_HASH** groups queries with different literal values
5. **Spilling to remote storage** is worse than spilling to local storage
6. **Partitions scanned vs total** indicates pruning effectiveness

### 10.2 Common Exam Scenarios

**Scenario 1**: "A query is running slowly. What should you check first?"
- Look at the Query Profile for most expensive nodes
- Check spilling statistics
- Verify pruning efficiency

**Scenario 2**: "You need to identify all executions of a query that varies only by filter values"
- Use `QUERY_PARAMETERIZED_HASH` to group the queries

**Scenario 3**: "You need query history from 6 months ago"
- Use `ACCOUNT_USAGE.QUERY_HISTORY` (1-year retention)
- Cannot use INFORMATION_SCHEMA (only 7 days)

**Scenario 4**: "Queries are waiting too long to execute"
- Check `QUEUED_OVERLOAD_TIME` column
- Consider multi-cluster warehouse or larger size

**Scenario 5**: "How to tag queries for tracking?"
- Set the `QUERY_TAG` session parameter
- Filter by `QUERY_TAG` column in Query History

### 10.3 Performance Red Flags

| Red Flag | Indicates | Action |
|----------|-----------|--------|
| High QUEUED_OVERLOAD_TIME | Warehouse overwhelmed | Scale up or use multi-cluster |
| High BYTES_SPILLED_TO_REMOTE | Memory insufficient | Use larger warehouse |
| Partitions scanned close to total | Poor pruning | Add/optimize clustering keys |
| Join produces 10x+ input rows | Exploding join | Fix join conditions |
| High COMPILATION_TIME | Complex query | Simplify query or cache results |

### 10.4 Best Practices

1. **Use QUERY_TAG** for categorizing and tracking queries
2. **Monitor queued time** to identify warehouse scaling needs
3. **Review Query Insights** for automatic performance recommendations
4. **Track query_hash trends** to identify regression over time
5. **Check pruning statistics** before adding clustering keys
6. **Use ACCOUNT_USAGE** for historical analysis and reporting

---

## Quick Reference Card

```
Data Sources:
- Snowsight Query History: 14 days, real-time
- ACCOUNT_USAGE.QUERY_HISTORY: 365 days, 45-min latency
- INFORMATION_SCHEMA.QUERY_HISTORY(): 7 days, real-time

Key Performance Columns:
- TOTAL_ELAPSED_TIME: Total query duration
- EXECUTION_TIME: Actual processing time
- QUEUED_OVERLOAD_TIME: Wait time due to warehouse load
- BYTES_SPILLED_TO_REMOTE_STORAGE: Memory pressure indicator
- PARTITIONS_SCANNED / PARTITIONS_TOTAL: Pruning efficiency

Query Grouping:
- QUERY_HASH: Exact query text matching
- QUERY_PARAMETERIZED_HASH: Same query, different filter values

Privileges:
- Own queries: Always visible
- All queries: ACCOUNTADMIN
- Warehouse queries: MONITOR or OPERATE privilege
```
