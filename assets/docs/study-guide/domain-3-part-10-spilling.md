# Domain 3: Performance Concepts - Memory Spilling and Optimization

**Exam Weight: 10-15%** | **SnowPro Core (COF-C02)**

---

## Table of Contents

1. [Understanding Memory Spilling](#1-understanding-memory-spilling)
2. [The Spilling Hierarchy](#2-the-spilling-hierarchy)
3. [Operations Prone to Spilling](#3-operations-prone-to-spilling)
4. [Identifying Spilling in Your Queries](#4-identifying-spilling-in-your-queries)
5. [Resolving Memory Spillage](#5-resolving-memory-spillage)
6. [Snowpark-Optimized Warehouses](#6-snowpark-optimized-warehouses)
7. [Exam Tips and Common Question Patterns](#7-exam-tips-and-common-question-patterns)
8. [Quick Reference](#8-quick-reference)

---

## 1. Understanding Memory Spilling

### 1.1 What is Memory Spilling?

Memory spilling occurs when a warehouse runs out of available memory while executing a query. When this happens, Snowflake must write intermediate query results to disk storage instead of keeping them in memory, which significantly degrades performance.

**Key Concept**: Spilling is NOT a failure - the query will still complete, but it will run substantially slower than if all data fit in memory.

### 1.2 Why Does Spilling Happen?

Spilling occurs when:

- **Query requires more memory than available** - Complex operations on large datasets exceed warehouse memory capacity
- **Concurrent queries compete for resources** - Multiple memory-intensive queries run simultaneously
- **Insufficient warehouse size** - Warehouse is too small for the workload
- **Inefficient query design** - Poorly written queries that require excessive intermediate results

### 1.3 Performance Impact

| Spilling Location | Performance Impact | Relative Speed |
|-------------------|-------------------|----------------|
| No spilling (memory only) | Optimal | Fastest |
| Local disk spilling | Significant degradation | 10-100x slower |
| Remote disk spilling | Severe degradation | 100-1000x slower |

---

## 2. The Spilling Hierarchy

### 2.1 Three-Tier Storage Hierarchy

When a query exhausts available memory, Snowflake uses a hierarchical approach to handle overflow data:

```
Level 1: MEMORY (RAM)
    |
    | Memory full? Spill to...
    v
Level 2: LOCAL DISK (SSD on compute nodes)
    |
    | Local disk full? Spill to...
    v
Level 3: REMOTE STORAGE (Cloud provider storage - S3/Azure Blob/GCS)
```

### 2.2 Memory (Level 1) - Fastest

- **Location**: RAM on warehouse compute nodes
- **Speed**: Fastest - nanosecond access times
- **Capacity**: Limited by warehouse size
- **Cost**: Included in warehouse credits
- **Best for**: All query operations when possible

### 2.3 Local Disk (Level 2) - Medium

- **Location**: SSD storage attached to compute nodes
- **Speed**: Fast but slower than RAM - microsecond access times
- **Capacity**: More than memory, but still limited
- **Cost**: Included in warehouse credits
- **When used**: Memory is exhausted during query processing

### 2.4 Remote Storage (Level 3) - Slowest

- **Location**: Cloud provider object storage (S3, Azure Blob, GCS)
- **Speed**: Slowest - millisecond access times, network latency
- **Capacity**: Virtually unlimited
- **Cost**: May incur additional network transfer costs
- **When used**: Both memory AND local disk are exhausted

### 2.5 Visual Representation

```
+------------------+
|     MEMORY       |  <- Ideal: Keep all intermediate results here
|  (Fastest)       |
+------------------+
        |
        v Overflow
+------------------+
|   LOCAL DISK     |  <- First spill target: SSD on compute nodes
|  (Medium Speed)  |
+------------------+
        |
        v Overflow
+------------------+
|  REMOTE STORAGE  |  <- Last resort: Cloud object storage
|  (Slowest)       |
+------------------+
```

---

## 3. Operations Prone to Spilling

### 3.1 High-Risk Operations

The following SQL operations are most likely to cause memory spilling:

| Operation | Why It's Memory-Intensive | Risk Level |
|-----------|---------------------------|------------|
| **Large JOINs** | Must hold matching rows from both tables in memory | Very High |
| **Aggregations with GROUP BY** | Maintains hash tables for each group | High |
| **DISTINCT operations** | Must track all unique values | High |
| **Window Functions** | May need to buffer entire partitions | High |
| **ORDER BY on large datasets** | Requires sorting all rows | High |
| **Subqueries with large results** | Materializes intermediate results | Medium-High |
| **UNION (without ALL)** | Requires deduplication | Medium |

### 3.2 JOIN Operations

JOINs are the most common cause of spilling because:

```sql
-- This query might spill if both tables are large
SELECT *
FROM large_table_a a
JOIN large_table_b b ON a.key = b.key;

-- Nested loop joins are especially problematic
SELECT *
FROM table_a a
JOIN table_b b ON a.col LIKE '%' || b.pattern || '%';
```

**Memory required**: Approximately `(rows_from_smaller_table) x (row_size)` in memory for hash join

### 3.3 Aggregations

```sql
-- High cardinality GROUP BY can cause spilling
SELECT customer_id, product_id, SUM(amount)
FROM transactions
GROUP BY customer_id, product_id;  -- Millions of combinations

-- COUNT DISTINCT on high-cardinality columns
SELECT COUNT(DISTINCT user_session_id)
FROM clickstream_data;
```

### 3.4 Window Functions

```sql
-- Large partitions require buffering
SELECT
    customer_id,
    order_date,
    amount,
    SUM(amount) OVER (PARTITION BY customer_id ORDER BY order_date) as running_total
FROM orders;  -- If customers have millions of orders
```

### 3.5 Sorting Operations

```sql
-- ORDER BY on large datasets requires full sort
SELECT *
FROM billion_row_table
ORDER BY created_at;
```

---

## 4. Identifying Spilling in Your Queries

### 4.1 Query Profile in Snowsight

The Query Profile is your primary tool for identifying spilling:

1. Navigate to **Monitoring > Query History**
2. Select the query
3. Open the **Query Profile** tab
4. Look for operators showing **"Bytes Spilled to Local Storage"** or **"Bytes Spilled to Remote Storage"**

### 4.2 Query to Find Spilling Queries

Use this query to identify the top offending queries:

```sql
-- Find top 10 queries with most spilling in last 45 days
SELECT
    query_id,
    SUBSTR(query_text, 1, 50) AS partial_query_text,
    user_name,
    warehouse_name,
    warehouse_size,
    bytes_spilled_to_local_storage,
    bytes_spilled_to_remote_storage,
    total_elapsed_time / 1000 AS execution_time_seconds
FROM snowflake.account_usage.query_history
WHERE (bytes_spilled_to_local_storage > 0
       OR bytes_spilled_to_remote_storage > 0)
  AND start_time::date > DATEADD('days', -45, CURRENT_DATE)
ORDER BY bytes_spilled_to_remote_storage DESC,
         bytes_spilled_to_local_storage DESC
LIMIT 10;
```

### 4.3 Key Metrics in QUERY_HISTORY

| Column | Description | Concern Level |
|--------|-------------|---------------|
| `bytes_spilled_to_local_storage` | Bytes written to local SSD | Moderate |
| `bytes_spilled_to_remote_storage` | Bytes written to cloud storage | High |
| `bytes_scanned` | Total data scanned | Context |
| `percentage_scanned_from_cache` | Cache hit rate | Context |

### 4.4 Understanding Spilling Ratios

```sql
-- Calculate spilling as percentage of data processed
SELECT
    query_id,
    warehouse_name,
    bytes_scanned,
    bytes_spilled_to_local_storage,
    bytes_spilled_to_remote_storage,
    ROUND(bytes_spilled_to_local_storage / NULLIF(bytes_scanned, 0) * 100, 2)
        AS local_spill_pct,
    ROUND(bytes_spilled_to_remote_storage / NULLIF(bytes_scanned, 0) * 100, 2)
        AS remote_spill_pct
FROM snowflake.account_usage.query_history
WHERE bytes_spilled_to_local_storage > 0
  AND start_time >= DATEADD('day', -7, CURRENT_TIMESTAMP())
ORDER BY bytes_spilled_to_remote_storage DESC;
```

### 4.5 Query Acceleration Service and Spilling Note

**Important**: When the Query Acceleration Service (QAS) is enabled, Snowflake writes a small amount of data to remote storage for each eligible query, even if QAS isn't actually used for that query.

Therefore, a nonzero value for `bytes_spilled_to_remote_storage` may not indicate a performance problem when QAS is enabled - this is expected behavior.

---

## 5. Resolving Memory Spillage

### 5.1 Strategy Overview

| Strategy | When to Use | Effectiveness |
|----------|-------------|---------------|
| **Increase warehouse size** | Immediate relief needed | High |
| **Process in smaller batches** | Large data transformations | High |
| **Optimize query logic** | Inefficient query patterns | Medium-High |
| **Use Snowpark-optimized warehouse** | ML/memory-intensive workloads | High |
| **Enable Query Acceleration** | Ad-hoc analytical queries | Medium |

### 5.2 Increase Warehouse Size (Scale Up)

Larger warehouses have more memory and local storage:

```sql
-- Upsize warehouse to reduce spilling
ALTER WAREHOUSE my_warehouse SET WAREHOUSE_SIZE = 'XLARGE';

-- Re-run the problematic query
SELECT /* your query */;

-- If performance improvement doesn't justify cost, resize back
ALTER WAREHOUSE my_warehouse SET WAREHOUSE_SIZE = 'MEDIUM';
```

**Warehouse Memory Scaling**:

| Size | Relative Memory | Credits/Hour |
|------|-----------------|--------------|
| X-Small | 1x | 1 |
| Small | 2x | 2 |
| Medium | 4x | 4 |
| Large | 8x | 8 |
| X-Large | 16x | 16 |
| 2X-Large | 32x | 32 |
| 3X-Large | 64x | 64 |
| 4X-Large | 128x | 128 |

### 5.3 Process Data in Smaller Batches

Instead of processing entire table at once:

```sql
-- Bad: Process all at once (may spill)
INSERT INTO target_table
SELECT complex_transformation(*)
FROM source_table;  -- 1 billion rows

-- Better: Process in batches
INSERT INTO target_table
SELECT complex_transformation(*)
FROM source_table
WHERE date_column BETWEEN '2024-01-01' AND '2024-03-31';

INSERT INTO target_table
SELECT complex_transformation(*)
FROM source_table
WHERE date_column BETWEEN '2024-04-01' AND '2024-06-30';
-- Continue for remaining batches...
```

### 5.4 Optimize Query Logic

**Reduce JOIN sizes with filtering:**

```sql
-- Bad: Join entire tables first
SELECT a.*, b.*
FROM large_table_a a
JOIN large_table_b b ON a.id = b.id
WHERE a.status = 'ACTIVE';

-- Better: Filter before joining
SELECT a.*, b.*
FROM (SELECT * FROM large_table_a WHERE status = 'ACTIVE') a
JOIN large_table_b b ON a.id = b.id;
```

**Use APPROX_COUNT_DISTINCT instead of COUNT(DISTINCT):**

```sql
-- Memory-intensive
SELECT COUNT(DISTINCT session_id) FROM events;

-- Memory-efficient (uses HyperLogLog)
SELECT APPROX_COUNT_DISTINCT(session_id) FROM events;
```

**Avoid SELECT * in subqueries:**

```sql
-- Bad: Materializes all columns
SELECT * FROM (
    SELECT * FROM huge_table WHERE condition
);

-- Better: Select only needed columns
SELECT col1, col2 FROM (
    SELECT col1, col2 FROM huge_table WHERE condition
);
```

### 5.5 Use Query Profile to Identify Problem Operators

1. Open Query Profile for the spilling query
2. Look at the **Most Expensive Nodes** pane
3. Identify which operators are spilling
4. Focus optimization efforts on those specific operations

Common spilling operators:
- **Aggregate** - GROUP BY operations
- **Join** - Hash or merge join operations
- **Sort** - ORDER BY operations
- **WindowFunction** - Analytic functions

---

## 6. Snowpark-Optimized Warehouses

### 6.1 When to Use

Snowpark-optimized warehouses provide significantly more memory per node (16x default) and are ideal for:

- Machine Learning model training
- Large Snowpark UDFs/UDTFs
- Memory-intensive data transformations
- Workloads with predictable high memory requirements

### 6.2 Memory Configuration Options

| Memory (up to) | RESOURCE_CONSTRAINT | Minimum Size |
|----------------|---------------------|--------------|
| 16GB | MEMORY_1X, MEMORY_1X_x86 | X-Small |
| 256GB | MEMORY_16X, MEMORY_16X_x86 | Medium |
| 1TB | MEMORY_64X, MEMORY_64X_x86 | Large |

### 6.3 Creating Snowpark-Optimized Warehouse

```sql
-- Create Snowpark-optimized warehouse with default memory (16x)
CREATE OR REPLACE WAREHOUSE ml_warehouse
WITH
    WAREHOUSE_SIZE = 'MEDIUM'
    WAREHOUSE_TYPE = 'SNOWPARK-OPTIMIZED';

-- Create with specific memory configuration (256GB)
CREATE WAREHOUSE so_warehouse
WITH
    WAREHOUSE_SIZE = 'LARGE'
    WAREHOUSE_TYPE = 'SNOWPARK-OPTIMIZED'
    RESOURCE_CONSTRAINT = 'MEMORY_16X_X86';
```

### 6.4 Standard vs Snowpark-Optimized

| Aspect | Standard Warehouse | Snowpark-Optimized |
|--------|-------------------|-------------------|
| Memory per node | Base amount | Up to 16x more (or higher) |
| Best for | General SQL queries | Memory-intensive workloads |
| Startup time | Fast | May be slower |
| Cost | Standard credits | Higher credit consumption |
| Availability | All editions | All editions |

---

## 7. Exam Tips and Common Question Patterns

### 7.1 Key Exam Concepts

**Must Know:**

1. **Spilling hierarchy**: Memory -> Local Disk -> Remote Storage (ALWAYS in this order)
2. **Remote spilling is worst** - causes severe performance degradation
3. **Increasing warehouse size** is the primary solution for spilling
4. **Query Profile** shows which operators are spilling
5. **QUERY_HISTORY view** contains `bytes_spilled_to_local_storage` and `bytes_spilled_to_remote_storage` columns

### 7.2 Common Exam Question Patterns

**Pattern 1: Identifying Spilling**
> "A query is running very slowly. The Query Profile shows bytes spilled to remote storage. What should you do first?"
>
> **Answer**: Increase the warehouse size

**Pattern 2: Spilling Hierarchy Order**
> "In what order does Snowflake spill data when memory is exhausted?"
>
> **Answer**: Memory -> Local disk -> Remote storage

**Pattern 3: Monitoring Spilling**
> "Which view contains information about query spilling?"
>
> **Answer**: QUERY_HISTORY (in ACCOUNT_USAGE or INFORMATION_SCHEMA)

**Pattern 4: Operations Causing Spilling**
> "Which operation is most likely to cause memory spilling?"
>
> **Answer**: Large JOINs or GROUP BY with high cardinality

**Pattern 5: QAS and Remote Spilling**
> "With Query Acceleration Service enabled, you see bytes_spilled_to_remote_storage > 0. Is this a problem?"
>
> **Answer**: Not necessarily - QAS writes small amounts to remote storage by design

### 7.3 Exam Traps to Avoid

| Trap | Reality |
|------|---------|
| "Spilling means query failure" | Queries complete, just slower |
| "Add more clusters to reduce spilling" | Scaling OUT helps concurrency, not memory per query |
| "Local spilling is as bad as remote" | Remote spilling is MUCH worse |
| "Result cache prevents spilling" | Cache is for identical repeated queries, not memory management |
| "Clustering prevents spilling" | Clustering helps partition pruning, not memory usage |

### 7.4 Quick Decision Matrix

| Scenario | Solution |
|----------|----------|
| Query spills to local disk occasionally | May be acceptable, monitor |
| Query spills to remote storage | Definitely needs attention |
| Multiple queries spilling | Consider dedicated warehouses |
| ML/Snowpark workload spilling | Use Snowpark-optimized warehouse |
| Ad-hoc query spilling | Try Query Acceleration Service |

---

## 8. Quick Reference

### 8.1 Essential SQL Commands

```sql
-- Find queries with spilling
SELECT query_id,
       bytes_spilled_to_local_storage,
       bytes_spilled_to_remote_storage
FROM snowflake.account_usage.query_history
WHERE bytes_spilled_to_local_storage > 0
   OR bytes_spilled_to_remote_storage > 0;

-- Resize warehouse to reduce spilling
ALTER WAREHOUSE my_wh SET WAREHOUSE_SIZE = 'XLARGE';

-- Create Snowpark-optimized warehouse
CREATE WAREHOUSE my_wh
WITH WAREHOUSE_TYPE = 'SNOWPARK-OPTIMIZED'
     WAREHOUSE_SIZE = 'MEDIUM';

-- Enable Query Acceleration
ALTER WAREHOUSE my_wh SET ENABLE_QUERY_ACCELERATION = TRUE;
```

### 8.2 Spilling Indicators Summary

| Metric | Source | Indicates |
|--------|--------|-----------|
| bytes_spilled_to_local_storage | QUERY_HISTORY | Memory overflow to local SSD |
| bytes_spilled_to_remote_storage | QUERY_HISTORY | Memory + local disk overflow |
| Query Profile operators | Snowsight | Which operations are spilling |

### 8.3 Resolution Priority Order

1. **First**: Check Query Profile for spilling operators
2. **Then**: Optimize query if possible (filtering, batching)
3. **If needed**: Increase warehouse size
4. **For ML/UDF workloads**: Use Snowpark-optimized warehouse
5. **For analytical workloads**: Enable Query Acceleration Service

### 8.4 Memory Considerations by Workload

| Workload Type | Recommended Approach |
|---------------|---------------------|
| Simple queries | Standard warehouse, X-Small to Medium |
| Complex analytics | Standard warehouse, Large or bigger |
| Data transformations | Batch processing, Medium to Large |
| ML training | Snowpark-optimized warehouse |
| Ad-hoc reporting | Enable Query Acceleration |

---

## Study Checklist

- [ ] Understand the three-tier spilling hierarchy (Memory -> Local -> Remote)
- [ ] Know that remote spilling causes the worst performance degradation
- [ ] Recognize operations prone to spilling (JOINs, aggregations, sorts)
- [ ] Know how to query QUERY_HISTORY for spilling metrics
- [ ] Understand that increasing warehouse size is the primary solution
- [ ] Know when to use Snowpark-optimized warehouses
- [ ] Remember that QAS may show remote storage writes by design
- [ ] Understand the difference between scaling UP (more memory) vs OUT (more concurrency)
- [ ] Know that running queries use original size when warehouse is resized

---

*Last Updated: January 2025*
*Source: Snowflake Official Documentation - Performance Optimization*
