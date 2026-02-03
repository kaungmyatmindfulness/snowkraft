# Domain 3: Performance Concepts

## Part 1: Query Performance Fundamentals

**Exam Weight: 10-15%**

This section covers the fundamentals of query performance in Snowflake, including the query lifecycle, Query Profile analysis, key performance metrics, and optimization strategies. Understanding these concepts is essential for the SnowPro Core exam.

---

## Table of Contents

1. [Query Lifecycle Overview](#query-lifecycle-overview)
2. [Understanding Query Execution](#understanding-query-execution)
3. [The Query Profile](#the-query-profile)
4. [Key Performance Metrics](#key-performance-metrics)
5. [Micro-Partitions and Pruning](#micro-partitions-and-pruning)
6. [Caching Mechanisms](#caching-mechanisms)
7. [Common Performance Issues](#common-performance-issues)
8. [Monitoring and Exploring Execution Times](#monitoring-and-exploring-execution-times)
9. [Warehouse Optimization Strategies](#warehouse-optimization-strategies)
10. [Exam Tips and Common Question Patterns](#exam-tips-and-common-question-patterns)

---

## Query Lifecycle Overview

### The Journey of a Query

When you submit a query in Snowflake, it goes through several distinct phases before returning results:

```
+-------------------------------------------------------------------------+
|                         QUERY LIFECYCLE                                  |
+-------------------------------------------------------------------------+
|                                                                          |
|   1. SUBMISSION                                                          |
|      +----------------------------------------------------------+       |
|      | Query submitted via Snowsight, SnowSQL, JDBC/ODBC, etc. |       |
|      +----------------------------------------------------------+       |
|                              |                                           |
|                              v                                           |
|   2. CLOUD SERVICES LAYER (Parsing & Compilation)                       |
|      +----------------------------------------------------------+       |
|      | - SQL parsing and syntax validation                      |       |
|      | - Semantic analysis (object resolution)                  |       |
|      | - Access control verification                            |       |
|      | - Query optimization (plan generation)                   |       |
|      | - Result cache check                                     |       |
|      +----------------------------------------------------------+       |
|                              |                                           |
|            +----------------+----------------+                           |
|            |                                 |                           |
|            v                                 v                           |
|   3a. CACHE HIT                    3b. EXECUTION (Virtual Warehouse)    |
|   +------------------+             +-----------------------------+       |
|   | Return cached    |             | - Warehouse allocation      |       |
|   | results directly |             | - Micro-partition scanning  |       |
|   +------------------+             | - Data processing           |       |
|                                    | - Result generation         |       |
|                                    +-----------------------------+       |
|                                                 |                        |
|                                                 v                        |
|   4. RESULTS RETURNED                                                    |
|      +----------------------------------------------------------+       |
|      | Results returned to client, cached for potential reuse   |       |
|      +----------------------------------------------------------+       |
|                                                                          |
+-------------------------------------------------------------------------+
```

### Phase Breakdown

| Phase | Component | Key Activities | Compute Used |
|-------|-----------|----------------|--------------|
| **Parsing** | Cloud Services | Syntax validation, tokenization | Cloud Services (no warehouse) |
| **Optimization** | Cloud Services | Query plan generation, cost estimation | Cloud Services (no warehouse) |
| **Compilation** | Cloud Services | Create execution plan, check result cache | Cloud Services (no warehouse) |
| **Execution** | Virtual Warehouse | Data scanning, joins, aggregations | Warehouse credits |
| **Result Return** | Cloud Services | Format and deliver results | Cloud Services (no warehouse) |

**Key Point:** The Cloud Services layer handles parsing, optimization, and compilation WITHOUT requiring a running warehouse. Only the execution phase requires warehouse compute resources.

---

## Understanding Query Execution

### Execution Time Categories

When a query executes, time is spent across different categories of processing. Understanding these categories helps identify performance bottlenecks:

| Category | Description | What It Indicates |
|----------|-------------|-------------------|
| **Processing** | Time spent on data processing by the CPU | Core query computation work |
| **Local Disk I/O** | Time blocked by local disk access | Reading from/writing to warehouse cache |
| **Remote Disk I/O** | Time blocked by remote disk access | Reading from cloud storage |
| **Network Communication** | Time waiting for network data transfer | Data movement between nodes |
| **Synchronization** | Time for synchronization activities | Coordination between processes |
| **Initialization** | Time setting up query processing | Query startup overhead |
| **Hybrid Table Request Throttling** | Time spent throttling hybrid table requests | Rate limiting for hybrid table operations |

### What Affects Query Performance?

```
+-------------------------------------------------------------------------+
|                    FACTORS AFFECTING QUERY PERFORMANCE                   |
+-------------------------------------------------------------------------+
|                                                                          |
|   DATA FACTORS                          QUERY FACTORS                    |
|   +------------------------+            +---------------------------+    |
|   | - Table size           |            | - Query complexity        |    |
|   | - Data distribution    |            | - Join types and counts   |    |
|   | - Clustering state     |            | - Filter selectivity      |    |
|   | - Micro-partition      |            | - Aggregation complexity  |    |
|   |   organization         |            | - Window functions        |    |
|   | - Data types used      |            | - Subquery patterns       |    |
|   +------------------------+            +---------------------------+    |
|                                                                          |
|   WAREHOUSE FACTORS                     SYSTEM FACTORS                   |
|   +------------------------+            +---------------------------+    |
|   | - Warehouse size       |            | - Cloud services load     |    |
|   | - Concurrent queries   |            | - Resource availability   |    |
|   | - Cache warmth         |            | - Network latency         |    |
|   | - Memory availability  |            | - Query acceleration      |    |
|   | - Queue depth          |            |   service availability    |    |
|   +------------------------+            +---------------------------+    |
|                                                                          |
+-------------------------------------------------------------------------+
```

---

## The Query Profile

### What Is the Query Profile?

The **Query Profile** is a powerful diagnostic tool that visualizes the query execution plan and provides granular statistics about each step of query processing. It helps you:

- Understand how a query is executed
- Identify performance bottlenecks
- Spot optimization opportunities
- Debug query issues

### Accessing the Query Profile

**Via Snowsight:**
1. Navigate to **Monitoring > Query History**
2. Select a query by its Query ID
3. Click the **Query Profile** tab

**Programmatically:**
```sql
-- Get operator statistics for a query
SELECT * FROM TABLE(GET_QUERY_OPERATOR_STATS('query-uuid-here'));
```

### Query Profile Components

#### 1. Query Execution Plan (Center Panel)

The execution plan shows operator nodes connected by arrows:

```
+-----------------------------------------------------------------------+
|                    QUERY EXECUTION PLAN STRUCTURE                      |
+-----------------------------------------------------------------------+
|                                                                        |
|   +-------------------+                                                |
|   |    Result         | <-- Final output node                         |
|   |    ID: 0          |                                                |
|   +-------------------+                                                |
|           ^                                                            |
|           |  (rows flow upward)                                        |
|   +-------------------+                                                |
|   |    Aggregate      | <-- Processing node                           |
|   |    ID: 1          |                                                |
|   |    [25% of time]  |                                                |
|   +-------------------+                                                |
|           ^                                                            |
|           |                                                            |
|   +-------------------+                                                |
|   |    Join           | <-- Combines two inputs                       |
|   |    ID: 2          |                                                |
|   |    [15% of time]  |                                                |
|   +-------------------+                                                |
|           ^         ^                                                  |
|          /           \                                                 |
|   +----------+   +----------+                                          |
|   | TableScan|   | TableScan| <-- Data access nodes                   |
|   | ID: 3    |   | ID: 4    |                                         |
|   | [30%]    |   | [30%]    |                                         |
|   +----------+   +----------+                                          |
|                                                                        |
+-----------------------------------------------------------------------+
```

**Each operator node displays:**
- Operator type and ID number
- Execution time as percentage of total query time
- Preview of operator details (table name, expressions, etc.)

#### 2. Information Panes

| Pane | Description |
|------|-------------|
| **Profile Overview** | Execution time breakdown by category (Processing, I/O, Network, etc.) |
| **Query Insights** | Automated recommendations if performance issues detected |
| **Statistics** | Detailed metrics (I/O, DML, Pruning, Spilling, Network, etc.) |
| **Most Expensive Nodes** | Nodes taking >= 1% of total execution time, sorted descending |
| **Attributes** | Detailed information about the selected operator node |

### Key Operator Types

#### Data Access Operators

| Operator | Description | Key Attributes |
|----------|-------------|----------------|
| **TableScan** | Reads from a table | Full table name, columns, scan mode, access predicates |
| **IndexScan** | Reads from secondary indexes (hybrid tables) | Full index name, columns, access predicates |
| **ExternalScan** | Reads from stage objects | Stage name, stage type |
| **Generator** | Creates rows using TABLE(GENERATOR()) | rowCount, timeLimit |
| **ValuesClause** | Returns values from VALUES clause | Number of values |

#### Data Processing Operators

| Operator | Description | Key Attributes |
|----------|-------------|----------------|
| **Filter** | Filters rows based on conditions | Filter condition |
| **Join** | Combines two inputs | Join type, equality condition, additional conditions |
| **Aggregate** | Groups and aggregates data | Grouping keys, aggregate functions |
| **Sort** | Orders input rows | Sort keys |
| **SortWithLimit** | Sorts and limits rows (ORDER BY ... LIMIT) | Sort keys, number of rows, offset |
| **WindowFunction** | Computes window functions | Window functions list |
| **Flatten** | Processes VARIANT data | Input expression |
| **UnionAll** | Concatenates two inputs | None |

#### DML Operators

| Operator | Description | Key Attributes |
|----------|-------------|----------------|
| **Insert** | Adds rows to a table | Input expressions, table names |
| **Delete** | Removes rows from a table | Table name |
| **Update** | Modifies rows in a table | Table name |
| **Merge** | Performs MERGE operation | Full table name |
| **Unload** | Exports data via COPY | Location (stage) |

---

## Key Performance Metrics

### Statistics in the Query Profile

#### I/O Statistics

| Statistic | Description | Performance Indicator |
|-----------|-------------|----------------------|
| **Scan progress** | Percentage of data scanned so far | Progress tracking |
| **Bytes scanned** | Total bytes read from storage | Data volume indicator |
| **Percentage scanned from cache** | Proportion read from warehouse cache | Cache effectiveness |
| **Bytes written** | Bytes written (for DML operations) | Write volume |
| **Bytes written to result** | Size of query result object | Result size |
| **External bytes scanned** | Bytes read from external storage (stages) | External data access |

#### Pruning Statistics (Critical for Performance)

| Statistic | Description | What to Look For |
|-----------|-------------|------------------|
| **Partitions scanned** | Micro-partitions actually read | Lower is better |
| **Partitions total** | Total partitions in the table | Baseline for comparison |

**Pruning Efficiency Formula:**
```
Pruning Efficiency = (Partitions Total - Partitions Scanned) / Partitions Total * 100%
```

**Example:**
- Partitions Total: 1,000
- Partitions Scanned: 50
- Pruning Efficiency: (1000 - 50) / 1000 * 100 = 95% (Excellent!)

#### Spilling Statistics (Performance Warning Signs)

| Statistic | Description | Impact |
|-----------|-------------|--------|
| **Bytes spilled to local storage** | Data written to local disk due to memory constraints | Moderate performance impact |
| **Bytes spilled to remote storage** | Data written to remote storage due to local disk constraints | Severe performance impact |

**Key Point:** Spilling indicates insufficient memory. If you see spilling, consider:
- Using a larger warehouse
- Processing data in smaller batches
- Optimizing the query to reduce intermediate data

#### Network Statistics

| Statistic | Description |
|-----------|-------------|
| **Bytes sent over the network** | Data transferred between nodes |

---

## Micro-Partitions and Pruning

### Understanding Micro-Partitions

Micro-partitions are the fundamental unit of data storage in Snowflake:

| Characteristic | Description |
|----------------|-------------|
| **Size** | 50 MB to 500 MB uncompressed (smaller when compressed) |
| **Structure** | Columnar storage format |
| **Compression** | Automatically compressed per column |
| **Metadata** | Rich statistics stored for each partition |
| **Creation** | Automatically created as data is loaded |

**Metadata Stored Per Micro-Partition:**
- Range of values for each column (min/max)
- Number of distinct values
- NULL counts
- Additional optimization properties

### How Pruning Works

```
+-------------------------------------------------------------------------+
|                          PARTITION PRUNING                               |
+-------------------------------------------------------------------------+
|                                                                          |
|   Query: SELECT * FROM sales WHERE sale_date = '2024-01-15'             |
|                                                                          |
|   +------------------------------------------------------------------+  |
|   |                    TABLE: sales                                   |  |
|   |                    Total Partitions: 1000                         |  |
|   +------------------------------------------------------------------+  |
|                                                                          |
|   Micro-partition metadata check:                                        |
|                                                                          |
|   +---------------+  +---------------+  +---------------+               |
|   | Partition 1   |  | Partition 2   |  | Partition 3   |               |
|   | Date Range:   |  | Date Range:   |  | Date Range:   |               |
|   | 2024-01-01    |  | 2024-01-10    |  | 2024-01-20    |               |
|   | to            |  | to            |  | to            |               |
|   | 2024-01-09    |  | 2024-01-19    |  | 2024-01-29    |               |
|   +---------------+  +---------------+  +---------------+               |
|          |                  |                  |                         |
|          v                  v                  v                         |
|        SKIP            SCAN (match!)         SKIP                       |
|                                                                          |
|   Result: Only 50 partitions scanned (95% pruning efficiency)           |
|                                                                          |
+-------------------------------------------------------------------------+
```

### Clustering and Clustering Depth

**Clustering Depth** measures how well-organized data is within micro-partitions:

| Depth Value | Meaning |
|-------------|---------|
| **1** | Perfect clustering - no overlap between partitions |
| **2-3** | Good clustering - minimal overlap |
| **> 5** | Poor clustering - significant overlap, pruning less effective |

**Monitor Clustering:**
```sql
-- Check clustering information
SELECT SYSTEM$CLUSTERING_INFORMATION('my_table', '(column1, column2)');

-- Check clustering depth
SELECT SYSTEM$CLUSTERING_DEPTH('my_table', '(date_column)');
```

### Inefficient Pruning Indicators

In the Query Profile, check the **TableScan** operator:
- If **Partitions scanned** is close to **Partitions total**, pruning is ineffective
- Look for a **Filter** operator above TableScan that filters out many rows (suggests data reorganization might help)

---

## Caching Mechanisms

Snowflake implements multiple caching layers to improve query performance:

### 1. Result Cache (Query Result Reuse)

| Aspect | Details |
|--------|---------|
| **Location** | Cloud Services layer |
| **Duration** | 24 hours (extended up to 31 days if reused) |
| **Scope** | Account-wide |
| **Cost** | No warehouse credits consumed |

**Conditions for Result Cache Reuse:**

| Condition | Requirement |
|-----------|-------------|
| Query match | Exact same SQL text (case-sensitive, including aliases) |
| Data unchanged | Underlying table data must not have changed |
| No volatile functions | Cannot use RANDOM(), UUID_STRING(), RANDSTR(), etc. |
| No external functions | Queries with external functions cannot use result cache |
| No hybrid tables | Queries against hybrid tables don't use result cache |
| Permissions unchanged | Same role with same privileges |
| Same configuration | Query-relevant session parameters must match |

**Important:** Even whitespace and case differences prevent cache reuse:
```sql
-- These are different queries for caching purposes:
SELECT * FROM table1;
SELECT * FROM TABLE1;
select * from table1;
SELECT  * FROM table1;  -- extra space
```

**Control Result Cache:**
```sql
-- Disable result cache for session
ALTER SESSION SET USE_CACHED_RESULT = FALSE;

-- Re-enable result cache
ALTER SESSION SET USE_CACHED_RESULT = TRUE;
```

### 2. Warehouse Cache (Local Disk Cache)

| Aspect | Details |
|--------|---------|
| **Location** | Virtual warehouse local SSD storage |
| **Duration** | While warehouse is running |
| **Scope** | Per warehouse |
| **Cleared when** | Warehouse is suspended |

**Key Behaviors:**
- Caches table data read from cloud storage
- Improves performance for repeated access to same data
- Lost when warehouse suspends (cache is dropped)

**Auto-Suspend Impact on Cache:**

| Use Case | Recommended Auto-Suspend | Reason |
|----------|-------------------------|--------|
| Tasks | Immediate | Cache not important for task workloads |
| Ad hoc/DevOps | ~5 minutes | Cache less critical for unique queries |
| BI/SELECT workloads | >= 10 minutes | Maintain cache for repeated queries |

**Monitor Cache Effectiveness:**
```sql
-- Find percentage of data scanned from cache by warehouse
SELECT
  warehouse_name,
  COUNT(*) AS query_count,
  SUM(bytes_scanned) AS bytes_scanned,
  SUM(bytes_scanned * percentage_scanned_from_cache) AS bytes_from_cache,
  SUM(bytes_scanned * percentage_scanned_from_cache) /
    NULLIF(SUM(bytes_scanned), 0) AS percent_from_cache
FROM snowflake.account_usage.query_history
WHERE start_time >= DATEADD(month, -1, CURRENT_TIMESTAMP())
  AND bytes_scanned > 0
GROUP BY warehouse_name
ORDER BY percent_from_cache;
```

### 3. Metadata Cache

| Aspect | Details |
|--------|---------|
| **Location** | Cloud Services layer |
| **Contains** | Table statistics, partition metadata |
| **Use** | Query optimization, pruning decisions |

Some queries can be answered entirely from metadata:
```sql
-- These can use metadata cache (no warehouse needed):
SELECT COUNT(*) FROM large_table;
SELECT MIN(date_column), MAX(date_column) FROM large_table;
```

---

## Common Performance Issues

### 1. Exploding Joins

**Symptom:** Join operator produces many more rows than it consumes.

```sql
-- Problem: Missing or weak join condition
SELECT *
FROM table_a a, table_b b  -- Cartesian product!
WHERE a.status = 'active';

-- Solution: Add proper join condition
SELECT *
FROM table_a a
JOIN table_b b ON a.id = b.a_id
WHERE a.status = 'active';
```

**Detection in Query Profile:**
- Look at Join operator input vs. output row counts
- If output >> input, investigate the join condition

### 2. UNION Without ALL

**Symptom:** Unnecessary duplicate elimination on UNION operations.

```sql
-- Inefficient: Performs duplicate elimination
SELECT col1, col2 FROM table_a
UNION
SELECT col1, col2 FROM table_b;

-- Efficient: If duplicates are acceptable or known not to exist
SELECT col1, col2 FROM table_a
UNION ALL
SELECT col1, col2 FROM table_b;
```

**Detection in Query Profile:**
- UnionAll operator followed by an Aggregate operator indicates duplicate elimination

### 3. Memory Spillage

**Symptom:** Bytes spilled to local or remote storage in Query Profile statistics.

**Causes:**
- Query processes too much intermediate data
- Warehouse size too small for the workload
- Poorly optimized aggregations or joins

**Solutions:**

| Solution | When to Use |
|----------|-------------|
| Larger warehouse | Consistent memory issues across queries |
| Smaller batches | One-time large operation |
| Query optimization | Reduce intermediate result size |

### 4. Poor Partition Pruning

**Symptom:** High ratio of partitions scanned to total partitions.

**Causes:**
- Filter columns not aligned with data clustering
- Subqueries in predicates (can't be used for pruning)
- Functions applied to filter columns

**Solutions:**

| Solution | Description |
|----------|-------------|
| Define clustering key | Align data organization with common filters |
| Search optimization | For point lookups and equality predicates |
| Rewrite predicates | Avoid functions on filtered columns |

### 5. Queuing

**Symptom:** Queries wait in queue before executing.

**Causes:**
- Too many concurrent queries for warehouse capacity
- MAX_CONCURRENCY_LEVEL reached

**Solutions:**

| Solution | Description |
|----------|-------------|
| Multi-cluster warehouse | Automatically scale out during high demand |
| Additional warehouses | Distribute workloads across warehouses |
| Query Acceleration Service | Offload portions of eligible queries |

---

## Monitoring and Exploring Execution Times

### Using Snowsight

**Query History:**
1. Navigate to **Monitoring > Query History**
2. Use the **Duration** column to identify slow queries
3. Filter by warehouse, user, status, or time period
4. Sort by duration to find longest-running queries

**Warehouse Activity:**
1. Navigate to **Compute > Warehouses**
2. Select a warehouse
3. View the **Warehouse Activity** chart
4. Look for queued load (indicates resource contention)

### Using ACCOUNT_USAGE Views

```sql
-- Top 50 longest-running queries in last day
SELECT
  query_id,
  query_text,
  total_elapsed_time/1000 AS execution_time_seconds,
  partitions_scanned,
  partitions_total
FROM snowflake.account_usage.query_history
WHERE warehouse_name = 'MY_WAREHOUSE'
  AND start_time > DATEADD(day, -1, CURRENT_TIMESTAMP())
  AND total_elapsed_time > 0
  AND error_code IS NULL
ORDER BY total_elapsed_time DESC
LIMIT 50;

-- Queries grouped by execution time buckets
SELECT
  CASE
    WHEN total_elapsed_time <= 60000 THEN 'Under 1 minute'
    WHEN total_elapsed_time <= 300000 THEN '1-5 minutes'
    WHEN total_elapsed_time <= 1800000 THEN '5-30 minutes'
    ELSE 'Over 30 minutes'
  END AS duration_bucket,
  COUNT(*) AS query_count
FROM snowflake.account_usage.query_history
WHERE warehouse_name = 'MY_WAREHOUSE'
  AND start_time > DATEADD(month, -1, CURRENT_TIMESTAMP())
  AND total_elapsed_time > 0
GROUP BY 1
ORDER BY 1;

-- Find repeated queries consuming the most time (using query hash)
SELECT
  query_hash,
  COUNT(*) AS execution_count,
  SUM(total_elapsed_time) AS total_time,
  ANY_VALUE(query_id) AS sample_query_id
FROM snowflake.account_usage.query_history
WHERE warehouse_name = 'MY_WAREHOUSE'
  AND start_time > DATEADD(day, -7, CURRENT_TIMESTAMP())
GROUP BY query_hash
ORDER BY total_time DESC
LIMIT 100;

-- Warehouse load analysis
SELECT
  TO_DATE(start_time) AS date,
  warehouse_name,
  SUM(avg_running) AS sum_running,
  SUM(avg_queued_load) AS sum_queued
FROM snowflake.account_usage.warehouse_load_history
WHERE start_time >= DATEADD(month, -1, CURRENT_TIMESTAMP())
GROUP BY 1, 2
HAVING SUM(avg_queued_load) > 0
ORDER BY date;
```

### Using Information Schema (Near Real-Time)

```sql
-- Recent query history (past 7 days, faster than ACCOUNT_USAGE)
SELECT *
FROM TABLE(information_schema.query_history(
  dateadd('days', -7, current_timestamp()),
  current_timestamp()
))
WHERE total_elapsed_time > 60000  -- Over 1 minute
ORDER BY total_elapsed_time DESC;
```

### ACCOUNT_USAGE Latency

| View | Description | Latency |
|------|-------------|---------|
| QUERY_HISTORY | Query execution history | Up to 45 minutes |
| WAREHOUSE_LOAD_HISTORY | Warehouse workload metrics | Up to 3 hours |
| TASK_HISTORY | Task execution history | Up to 45 minutes |

---

## Warehouse Optimization Strategies

### Strategy Summary

| Strategy | Problem Addressed | Action |
|----------|-------------------|--------|
| **Reduce queues** | Queries waiting before execution | Multi-cluster or additional warehouses |
| **Resolve memory spillage** | Data spilling to storage | Larger warehouse or smaller batches |
| **Increase warehouse size** | Complex queries too slow | Scale up warehouse size |
| **Query Acceleration Service** | Outlier queries with large scans | Enable QAS for eligible queries |
| **Optimize warehouse cache** | Low cache hit rates | Adjust auto-suspend timing |
| **Limit concurrency** | Resource contention | Adjust MAX_CONCURRENCY_LEVEL |

### Warehouse Sizing

| Size | Credits/Hour | Best For |
|------|-------------|----------|
| X-Small | 1 | Simple queries, testing |
| Small | 2 | Light workloads |
| Medium | 4 | Standard workloads |
| Large | 8 | Complex queries, larger datasets |
| X-Large | 16 | Heavy analytics |
| 2X-Large | 32 | Very large operations |
| 3X-Large | 64 | Massive data processing |
| 4X-Large | 128 | Extreme workloads |

**Key Insight:** A query running twice as fast on a larger warehouse costs the same total credits (2x credits/hour but half the time). However, performance improvement is not always linear.

### Auto-Suspend Configuration

```sql
-- Set auto-suspend to 10 minutes (value in seconds)
ALTER WAREHOUSE my_warehouse SET AUTO_SUSPEND = 600;

-- Set auto-suspend to immediate (tasks, short jobs)
ALTER WAREHOUSE my_warehouse SET AUTO_SUSPEND = 60;
```

### Concurrency Control

```sql
-- Reduce max concurrent queries (default is 8)
ALTER WAREHOUSE my_warehouse SET MAX_CONCURRENCY_LEVEL = 4;

-- Set queue timeout (in seconds)
ALTER SESSION SET STATEMENT_QUEUED_TIMEOUT_IN_SECONDS = 300;
```

---

## Exam Tips and Common Question Patterns

### Frequently Tested Concepts

1. **Query Profile Components**: Know the information panes (Profile Overview, Statistics, Most Expensive Nodes)
2. **Execution Time Categories**: Processing, Local Disk I/O, Remote Disk I/O, Network, Synchronization
3. **Caching Layers**: Result cache (24 hours), warehouse cache (while running), metadata cache
4. **Pruning**: Partitions scanned vs. partitions total, clustering impact
5. **Spilling**: Local vs. remote storage spilling, performance implications
6. **Result Cache Conditions**: Exact match, no volatile functions, data unchanged

### Common Exam Traps

| Trap | Correct Understanding |
|------|----------------------|
| All caches are the same | Three distinct caches: result, warehouse, metadata |
| Result cache lasts forever | 24 hours initially, up to 31 days if reused |
| Warehouse size always improves performance | Larger warehouses help complex queries more than simple ones |
| Suspending warehouse saves all costs | Cache is lost on suspend, affecting subsequent query performance |
| Spilling to local storage is as bad as remote | Remote spilling is significantly worse than local |
| All queries use the warehouse | Some queries can use metadata cache without warehouse |

### Key SQL Commands to Know

```sql
-- Check clustering information
SELECT SYSTEM$CLUSTERING_INFORMATION('table_name', '(columns)');

-- Get query operator statistics programmatically
SELECT * FROM TABLE(GET_QUERY_OPERATOR_STATS('query-id'));

-- Disable result cache for testing
ALTER SESSION SET USE_CACHED_RESULT = FALSE;

-- Configure warehouse auto-suspend (seconds)
ALTER WAREHOUSE wh SET AUTO_SUSPEND = 600;

-- Check warehouse settings
SHOW WAREHOUSES LIKE 'wh_name';
```

### Practice Questions

**Question 1:** A user runs the same SELECT query twice in succession. The second execution returns instantly. Which caching mechanism is responsible?

- A) Warehouse cache
- B) Result cache
- C) Metadata cache
- D) Browser cache

<details>
<summary>Show Answer</summary>

**Answer:** B - The result cache stores complete query results in the Cloud Services layer and returns them when the same query is run again.
</details>

---

**Question 2:** In the Query Profile, which statistic indicates that a query ran out of memory?

- A) Bytes scanned
- B) Partitions total
- C) Bytes spilled to local storage
- D) Percentage scanned from cache

<details>
<summary>Show Answer</summary>

**Answer:** C - Bytes spilled to local (or remote) storage indicates the query exceeded available memory.
</details>

---

**Question 3:** A table has 1000 partitions. A filtered query scans 950 partitions. What does this indicate?

- A) Excellent pruning efficiency
- B) Poor pruning efficiency
- C) The table needs more partitions
- D) The warehouse is too small

<details>
<summary>Show Answer</summary>

**Answer:** B - Scanning 95% of partitions indicates the filter condition does not align well with how data is organized (poor pruning).
</details>

---

**Question 4:** What happens to the warehouse cache when a warehouse is suspended?

- A) It is preserved until the next resume
- B) It is persisted to cloud storage
- C) It is dropped (cleared)
- D) It is shared with other warehouses

<details>
<summary>Show Answer</summary>

**Answer:** C - The warehouse cache is dropped when the warehouse suspends. This is why auto-suspend timing matters for workloads that benefit from cached data.
</details>

---

**Question 5:** Which of these will prevent result cache reuse?

- A) Running the query on a different warehouse
- B) Running the exact same SQL text
- C) Using the RANDOM() function in the query
- D) Having the same role and privileges

<details>
<summary>Show Answer</summary>

**Answer:** C - Non-deterministic functions like RANDOM() prevent result cache reuse because they return different values each time.
</details>

---

**Question 6:** A query spills to remote storage. What is the recommended first action?

- A) Add more columns to the query
- B) Use a larger warehouse
- C) Disable remote storage
- D) Increase the result cache duration

<details>
<summary>Show Answer</summary>

**Answer:** B - Using a larger warehouse increases available memory and local storage, which can eliminate or reduce spilling.
</details>

---

**Question 7:** What does the "Most Expensive Nodes" pane show in the Query Profile?

- A) Nodes with the most errors
- B) Nodes taking >= 1% of total execution time
- C) Nodes using the most storage
- D) Nodes with the most columns

<details>
<summary>Show Answer</summary>

**Answer:** B - The Most Expensive Nodes pane lists operators taking 1% or more of total execution time, sorted by time descending.
</details>

---

**Question 8:** Which ACCOUNT_USAGE view would you query to find the longest-running queries over the past month?

- A) WAREHOUSE_METERING_HISTORY
- B) QUERY_HISTORY
- C) WAREHOUSE_LOAD_HISTORY
- D) LOGIN_HISTORY

<details>
<summary>Show Answer</summary>

**Answer:** B - QUERY_HISTORY contains query execution details including total_elapsed_time for each query.
</details>

---

## Quick Reference

### Query Profile Information Panes

| Pane | Purpose |
|------|---------|
| Profile Overview | Execution time breakdown by category |
| Query Insights | Automated performance recommendations |
| Statistics | I/O, DML, Pruning, Spilling, Network metrics |
| Most Expensive Nodes | Operators consuming >= 1% of query time |
| Attributes | Details about selected operator |

### Cache Comparison

| Cache Type | Location | Duration | Scope |
|------------|----------|----------|-------|
| Result Cache | Cloud Services | 24 hours | Account |
| Warehouse Cache | Warehouse SSD | While running | Warehouse |
| Metadata Cache | Cloud Services | Automatic | Account |

### Key Statistics to Monitor

| Statistic | Ideal Value | Concern If |
|-----------|------------|------------|
| Percentage scanned from cache | High | Consistently low |
| Partitions scanned / Partitions total | Low ratio | Ratio near 1.0 |
| Bytes spilled to local storage | 0 | Any value > 0 |
| Bytes spilled to remote storage | 0 | Any value > 0 (severe) |

### Warehouse Auto-Suspend Guidelines

| Workload | Recommended Auto-Suspend |
|----------|-------------------------|
| Tasks | Immediate (60 seconds) |
| DevOps/Ad hoc | ~5 minutes (300 seconds) |
| BI/Analytics | >= 10 minutes (600+ seconds) |

---

**Key Takeaway:** Query performance in Snowflake depends on understanding the interplay between data organization (micro-partitions, clustering), caching mechanisms (result, warehouse, metadata), and warehouse resources. The Query Profile is your primary tool for diagnosing performance issues, with key indicators being pruning efficiency, spilling statistics, and execution time distribution. For the exam, focus on understanding how each caching layer works, what causes performance degradation, and the appropriate optimization strategies for different scenarios.
