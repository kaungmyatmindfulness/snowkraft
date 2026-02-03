# Domain 1: Snowflake AI Data Cloud Features & Architecture
## Part 6: Caching Mechanisms

**Exam Weight:** This topic is part of Domain 1 (25-30% of exam)

---

## Overview

Snowflake employs multiple caching layers to optimize query performance and reduce costs. Understanding how these caches work, when they are used, and what causes invalidation is critical for the SnowPro Core exam. Caching questions frequently appear because they test understanding of Snowflake's multi-layer architecture.

---

## Section 1: The Three Cache Layers

Snowflake uses three distinct caching mechanisms, each operating at a different layer of the architecture:

| Cache Type | Layer | Location | Persistence | Primary Purpose |
|------------|-------|----------|-------------|-----------------|
| **Query Result Cache** | Cloud Services | Cloud Services Layer | 24 hours (extendable to 31 days) | Avoid re-executing identical queries |
| **Warehouse Cache (Data Cache)** | Compute | Local SSD on warehouse nodes | Until warehouse suspends | Avoid re-reading data from remote storage |
| **Metadata Cache** | Cloud Services | Cloud Services Layer | Continuous | Optimize query compilation and planning |

### Architecture Visualization

```
                    +------------------------+
                    |   Cloud Services Layer |
                    |                        |
                    |  +------------------+  |
                    |  | Query Result     |  |  <-- Result Cache (24h)
                    |  | Cache            |  |
                    |  +------------------+  |
                    |                        |
                    |  +------------------+  |
                    |  | Metadata Cache   |  |  <-- Metadata Cache
                    |  +------------------+  |
                    +------------------------+
                              |
                    +------------------------+
                    |     Compute Layer      |
                    |    (Warehouses)        |
                    |                        |
                    |  +------------------+  |
                    |  | Warehouse Cache  |  |  <-- Local SSD Cache
                    |  | (Data Cache)     |  |
                    |  +------------------+  |
                    +------------------------+
                              |
                    +------------------------+
                    |     Storage Layer      |
                    |   (Cloud Storage)      |
                    |  S3 / Azure Blob / GCS |
                    +------------------------+
```

---

## Section 2: Query Result Cache (Persisted Query Results)

### What is the Query Result Cache?

The Query Result Cache stores the complete results of executed queries in the Cloud Services layer. When an identical query is submitted, Snowflake can return the cached result without re-executing the query or consuming warehouse compute resources.

### Key Characteristics

| Characteristic | Details |
|----------------|---------|
| **Location** | Cloud Services Layer |
| **Retention Period** | 24 hours from last access |
| **Maximum Retention** | 31 days from initial execution |
| **Warehouse Required** | NO - Results returned without warehouse |
| **Compute Cost** | NO warehouse credits consumed |
| **Storage Cost** | Included in cloud services |
| **Scope** | Available to any user with appropriate privileges |

### Conditions for Result Cache Reuse

For a cached result to be reused, ALL of the following conditions must be met:

1. **Exact Query Match** - The new query must match the previous query EXACTLY
   - Same syntax (including whitespace, capitalization differences)
   - Same table aliases
   - Same parameter values

2. **Unchanged Underlying Data** - The table data must not have changed
   - No DML operations (INSERT, UPDATE, DELETE, MERGE)
   - No micro-partition changes (reclustering, consolidation)

3. **No Non-Reusable Functions** - Query cannot include:
   - `UUID_STRING()`, `RANDOM()`, `RANDSTR()`
   - External functions

4. **No Hybrid Tables** - Queries against hybrid tables do not use result cache

5. **No Micro-Partition Changes** - Table data not changed by reclustering or consolidation

6. **Configuration Options Unchanged** - Session/query parameters that affect results must match

7. **Persisted Result Available** - Result has not expired or been purged

8. **Appropriate Privileges** - Different rules for query types:
   - **SELECT queries:** The executing role must have the necessary access privileges on all referenced tables (does NOT need to be the same role that created the cache)
   - **SHOW queries:** Must use the exact same role that generated the cached result

> **Exam Trap:** Meeting ALL of the above conditions does NOT guarantee that Snowflake reuses the query results. Snowflake may still choose to re-execute the query.

### Result Cache Expiration Rules

| Event | Impact on Cache |
|-------|-----------------|
| 24 hours since last access | Cache expires |
| Cache accessed (reused) | 24-hour timer resets |
| Maximum 31 days reached | Cache purged regardless of access |
| Underlying data changes | Cache invalidated immediately |
| Role loses privileges | Cache unavailable to that role |

### Controlling Result Cache Behavior

The `USE_CACHED_RESULT` session parameter controls result cache behavior:

```sql
-- Disable result cache for current session
ALTER SESSION SET USE_CACHED_RESULT = FALSE;

-- Re-enable result cache
ALTER SESSION SET USE_CACHED_RESULT = TRUE;

-- Check current setting
SHOW PARAMETERS LIKE 'USE_CACHED_RESULT';
```

**Default Value:** TRUE (result caching enabled)

**Can be set at:**
- Account level
- User level
- Session level

### Query Result Cache Example

```sql
-- First execution: Query runs against warehouse
SELECT department, SUM(sales)
FROM sales_data
WHERE year = 2024
GROUP BY department;
-- Execution time: 45 seconds
-- Warehouse credits consumed

-- Second execution (within 24 hours, no data changes)
SELECT department, SUM(sales)
FROM sales_data
WHERE year = 2024
GROUP BY department;
-- Execution time: <1 second
-- NO warehouse credits consumed (result from cache)

-- This query will NOT use cache (different capitalization)
select department, sum(sales)
from sales_data
where year = 2024
group by department;
-- Query re-executes - syntax doesn't match exactly
```

### Using RESULT_SCAN for Post-Processing

You can query cached results using the `RESULT_SCAN` table function:

```sql
-- Execute a query
SHOW TABLES IN SCHEMA my_schema;

-- Query the cached results of the previous command
SELECT "name", "rows"
FROM TABLE(RESULT_SCAN(LAST_QUERY_ID()))
WHERE "rows" = 0;
```

---

## Section 3: Warehouse Cache (Local Disk Cache / Data Cache)

### What is the Warehouse Cache?

The Warehouse Cache (also called Data Cache or Local Disk Cache) stores raw table data (micro-partitions) on the local SSD storage of virtual warehouse compute nodes. When subsequent queries need the same data, it can be read from fast local storage instead of remote cloud storage.

### Key Characteristics

| Characteristic | Details |
|----------------|---------|
| **Location** | Local SSD on warehouse nodes |
| **What's Cached** | Micro-partition data (table columns) |
| **Scope** | Per-warehouse (not shared between warehouses) |
| **Retention** | Until warehouse suspends or data evicted |
| **Warehouse Required** | YES - must have active warehouse |
| **Compute Cost** | YES - warehouse credits consumed |
| **Storage** | Limited by local SSD capacity |

### How Warehouse Cache Works

1. Query requests data from specific micro-partitions
2. Warehouse checks local SSD cache for those partitions
3. **Cache Hit:** Data read from fast local SSD
4. **Cache Miss:** Data fetched from remote cloud storage, then cached
5. Subsequent queries benefit from cached data

### Warehouse Cache Behavior

```
+---------------------+     Cache Hit     +----------------+
|  Query Execution    | ----------------> | Local SSD      |
|  (Warehouse Node)   |                   | (Fast Access)  |
+---------------------+                   +----------------+
         |
         | Cache Miss
         v
+---------------------+
|  Cloud Storage      |  <-- Slower, but data is cached
|  (S3/Azure/GCS)     |      for next query
+---------------------+
```

### Cache Invalidation Events

The warehouse cache is cleared when:

| Event | Impact |
|-------|--------|
| **Warehouse Suspended** | Cache completely cleared |
| **Warehouse Resized** | New nodes have empty cache |
| **Underlying Data Changes** | Affected micro-partitions invalidated |
| **Cache Capacity Exceeded** | Oldest entries evicted (LRU policy) |

### Auto-Suspend Impact on Cache

**Critical Exam Concept:** Suspending a warehouse clears its cache!

| AUTO_SUSPEND Setting | Cache Behavior | Use Case |
|---------------------|----------------|----------|
| Short (1-5 min) | Frequent cache clearing | Ad-hoc queries, cost-sensitive |
| Medium (5-10 min) | Balanced | General workloads |
| Long (10+ min) | Cache preserved longer | Frequent similar queries |
| Disabled (NULL/0) | Cache always warm | BI dashboards, repeated reports |

**Snowflake Recommendation:** For query warehouses (BI, SELECT use cases), set auto-suspend to at least 10 minutes to preserve cache benefits.

### Measuring Cache Performance

You can measure cache utilization using the `QUERY_HISTORY` view:

```sql
-- Find percentage of data scanned from cache by warehouse
SELECT
  warehouse_name,
  COUNT(*) AS query_count,
  SUM(bytes_scanned) AS total_bytes_scanned,
  SUM(bytes_scanned * percentage_scanned_from_cache) AS bytes_from_cache,
  ROUND(
    SUM(bytes_scanned * percentage_scanned_from_cache) /
    NULLIF(SUM(bytes_scanned), 0) * 100, 2
  ) AS cache_hit_percentage
FROM snowflake.account_usage.query_history
WHERE start_time >= DATEADD(month, -1, CURRENT_TIMESTAMP())
  AND bytes_scanned > 0
GROUP BY warehouse_name
ORDER BY cache_hit_percentage DESC;
```

### Optimizing Warehouse Cache

**Best Practices:**

1. **Set appropriate AUTO_SUSPEND** - Match to query patterns
2. **Use dedicated warehouses** - Similar queries on same warehouse
3. **Right-size warehouses** - Larger warehouses have more cache capacity
4. **Avoid unnecessary resizing** - New nodes start with empty cache
5. **Consider workload patterns** - Group related queries together

---

## Section 4: Metadata Cache

### What is the Metadata Cache?

The Metadata Cache stores information about database objects (tables, views, schemas) and their statistical properties in the Cloud Services layer. This enables fast query compilation and optimization without accessing the underlying data.

### Key Characteristics

| Characteristic | Details |
|----------------|---------|
| **Location** | Cloud Services Layer |
| **What's Cached** | Object definitions, statistics, micro-partition info |
| **Scope** | Global (shared across all warehouses and sessions) |
| **Retention** | Continuously updated |
| **Warehouse Required** | NO - metadata queries can run without warehouse |

### Metadata Cache Enables

1. **Query Compilation** - Parse and validate SQL without data access
2. **Partition Pruning** - Determine which micro-partitions to scan
3. **Query Optimization** - Generate efficient execution plans
4. **Aggregate Functions** - Answer certain queries directly from metadata:
   - `COUNT(*)` on tables
   - `MIN()`/`MAX()` on clustering columns
   - Row counts, table sizes

### Metadata-Only Queries

Some queries can be answered entirely from metadata without warehouse:

```sql
-- These may return instantly without warehouse credits
SELECT COUNT(*) FROM large_table;  -- If no filters
SELECT MIN(date_column) FROM partitioned_table;  -- Clustering column
SELECT MAX(id) FROM table_with_id;  -- Min/max metadata tracked
```

**Important:** Results depend on table structure and clustering. Not all COUNT/MIN/MAX queries use metadata-only paths.

### Metadata Cache vs. Other Caches

| Query Type | Cache Used | Warehouse Needed? |
|------------|------------|-------------------|
| `SHOW TABLES` | Metadata | No |
| `DESCRIBE TABLE` | Metadata | No |
| `SELECT COUNT(*)` (simple) | Metadata (sometimes) | Maybe |
| `SELECT * FROM table LIMIT 10` | Warehouse + Result | Yes (first time) |
| Repeated identical query | Result Cache | No |
| Query on same data, different filter | Warehouse Cache | Yes |

---

## Section 5: Cache Type Comparison

### Complete Comparison Table

| Feature | Query Result Cache | Warehouse Cache | Metadata Cache |
|---------|-------------------|-----------------|----------------|
| **Layer** | Cloud Services | Compute (Warehouse) | Cloud Services |
| **Storage Location** | Snowflake-managed | Local SSD | Snowflake-managed |
| **What's Stored** | Complete query results | Raw micro-partition data | Object metadata, statistics |
| **Retention** | 24 hours (up to 31 days) | Until suspend/resize | Continuous |
| **Warehouse Required** | No | Yes | No |
| **Compute Credits** | No | Yes | No |
| **Scope** | Cross-user (with privileges) | Per-warehouse | Global |
| **Invalidation** | Data changes, 24h expiry | Suspend, resize, eviction | Object changes |
| **Control Parameter** | USE_CACHED_RESULT | AUTO_SUSPEND timing | N/A (automatic) |

### When Each Cache is Used

```
Query Submitted
      |
      v
+------------------+
| Is exact query   |    YES    +-----------------+
| result cached?   | --------> | Return Result   |
| (Result Cache)   |           | (No warehouse)  |
+------------------+           +-----------------+
      | NO
      v
+------------------+
| Compile query    |  <-- Uses Metadata Cache
| Plan execution   |
+------------------+
      |
      v
+------------------+
| Is data in       |    YES    +-----------------+
| warehouse cache? | --------> | Read from SSD   |
| (Data Cache)     |           | (Fast)          |
+------------------+           +-----------------+
      | NO
      v
+------------------+           +-----------------+
| Read from cloud  | --------> | Store in        |
| storage          |           | warehouse cache |
+------------------+           +-----------------+
      |
      v
+------------------+
| Store result in  |
| result cache     |
+------------------+
```

---

## Section 6: Cache Invalidation Summary

### Conditions That Invalidate Each Cache

| Event | Result Cache | Warehouse Cache | Metadata Cache |
|-------|--------------|-----------------|----------------|
| DML on table (INSERT/UPDATE/DELETE) | Invalidated | Affected partitions invalidated | Updated |
| DDL on table (ALTER) | May invalidate | May invalidate | Updated |
| Warehouse suspended | Preserved | **Cleared** | Preserved |
| Warehouse resized | Preserved | New nodes empty | Preserved |
| 24 hours elapsed | Expires | No effect | No effect |
| Micro-partition reclustering | Invalidated | Affected partitions invalidated | Updated |
| Time Travel query | Result still cached | N/A | N/A |
| Session ends | Preserved | Preserved | Preserved |
| Account-level changes | May invalidate | No effect | Updated |

---

## Section 7: Exam Tips and Common Question Patterns

### High-Frequency Exam Topics

1. **Result Cache Duration** - 24 hours, extends up to 31 days with reuse
2. **Warehouse Cache Clearing** - Suspending clears the cache
3. **USE_CACHED_RESULT** - Parameter that controls result caching
4. **No Warehouse Needed** - Result cache hits don't require compute
5. **Exact Match Required** - Query must be identical for result cache

### Common Exam Scenarios

**Scenario 1: Query runs instantly without warehouse**
- **Answer:** Query result cache hit - identical query was previously run

**Scenario 2: Same query runs slowly after warehouse was suspended/resumed**
- **Answer:** Warehouse cache was cleared during suspension

**Scenario 3: How to disable result caching for testing?**
- **Answer:** `ALTER SESSION SET USE_CACHED_RESULT = FALSE;`

**Scenario 4: Why doesn't COUNT(*) query use warehouse?**
- **Answer:** May be answered from metadata cache (object statistics)

**Scenario 5: Query takes same time despite data not changing**
- **Answer:** Different warehouse used (no shared warehouse cache) OR cache evicted

### Memory Aid: "R-W-M" Cache Layers

- **R**esult Cache - Returns **R**eady results (no warehouse)
- **W**arehouse Cache - **W**arm data on local storage (needs warehouse)
- **M**etadata Cache - **M**anages object statistics (query planning)

### Key Facts to Memorize

| Fact | Value |
|------|-------|
| Result cache default retention | 24 hours |
| Maximum result cache retention | 31 days |
| Parameter to disable result cache | USE_CACHED_RESULT = FALSE |
| What clears warehouse cache | Suspending warehouse |
| Recommended AUTO_SUSPEND for cache | 10+ minutes |
| Result cache scope | Cross-user (with privileges) |
| Warehouse cache scope | Per-warehouse only |

---

## Section 8: Practice Questions

### Question 1
A user reports that their query returned in milliseconds without any warehouse credits being consumed. What is the most likely explanation?

- A) The query was optimized by the query optimizer
- B) The query result was served from the result cache
- C) The warehouse was already running
- D) The data was in the warehouse cache

<details>
<summary>Show Answer</summary>

**Answer: B) The query result was served from the result cache**

The result cache is the only cache that can return results without consuming warehouse credits. Warehouse cache still requires an active warehouse (credits consumed).

</details>

### Question 2
Which of the following conditions will cause the query result cache to be invalidated? (Select TWO)

- A) The warehouse is suspended
- B) A DML operation modifies the underlying table
- C) 24 hours have passed since the result was last accessed
- D) A new user runs the same query
- E) The warehouse is resized

<details>
<summary>Show Answer</summary>

**Answer: B and C**

- B) DML operations invalidate the result cache because the underlying data has changed
- C) Results expire after 24 hours of not being accessed

A, D, and E do not affect the result cache. Warehouse operations only affect the warehouse cache. Different users can access cached results if they have appropriate privileges.

</details>

### Question 3
What is the impact of setting AUTO_SUSPEND to a very short duration (e.g., 60 seconds)?

- A) Improved query performance due to faster cache refresh
- B) Reduced warehouse cache effectiveness due to frequent clearing
- C) Result cache is cleared more frequently
- D) Metadata cache becomes stale

<details>
<summary>Show Answer</summary>

**Answer: B) Reduced warehouse cache effectiveness due to frequent clearing**

When a warehouse suspends, its local SSD cache is cleared. Short auto-suspend durations mean the cache is frequently cleared, reducing the benefit of cached data for subsequent queries. The result cache and metadata cache are not affected by warehouse suspension.

</details>

### Question 4
A query on a 10TB table returns in 3 seconds on the first execution and 0.5 seconds on subsequent executions using the same warehouse. The underlying data has not changed. What cache is responsible for the performance improvement?

- A) Query result cache
- B) Warehouse cache
- C) Metadata cache
- D) Both A and B

<details>
<summary>Show Answer</summary>

**Answer: D) Both A and B**

If the query is IDENTICAL, the result cache may be returning the result (sub-second). If the query is similar but not identical, the warehouse cache would provide the speedup by reading from local SSD instead of cloud storage. The question mentions "same warehouse" and doesn't specify if queries are identical, so both caches could be contributing.

</details>

### Question 5
A data engineer needs to benchmark query performance without using any cached data. What steps should they take? (Select TWO)

- A) Set USE_CACHED_RESULT = FALSE
- B) Suspend and resume the warehouse before each test
- C) Use a different database
- D) Drop and recreate the table
- E) Run the query with a LIMIT clause

<details>
<summary>Show Answer</summary>

**Answer: A and B**

- A) Disables the result cache, ensuring the query is re-executed
- B) Clears the warehouse cache, ensuring data is read from cloud storage

These two steps together eliminate both caching layers for accurate benchmarking.

</details>

### Question 6
How long can a query result remain in the cache if it is accessed (reused) regularly?

- A) 24 hours
- B) 7 days
- C) 30 days
- D) 31 days

<details>
<summary>Show Answer</summary>

**Answer: D) 31 days**

Each time a cached result is reused, the 24-hour retention period resets. However, there is a maximum retention limit of 31 days from the date the query was first executed, regardless of how often it is accessed.

</details>

### Question 7
Which cache layer can be shared across different virtual warehouses?

- A) Warehouse cache only
- B) Query result cache only
- C) Both warehouse cache and query result cache
- D) Query result cache and metadata cache

<details>
<summary>Show Answer</summary>

**Answer: D) Query result cache and metadata cache**

The query result cache and metadata cache are stored in the Cloud Services layer and are shared across all warehouses and sessions (subject to privileges). The warehouse cache is local to each warehouse and cannot be shared.

</details>

### Question 8
Which of the following queries will NOT benefit from the result cache?

- A) A query that includes CURRENT_DATE() in the SELECT clause
- B) A query that includes COUNT(*) aggregate
- C) A query that includes UUID_STRING() function
- D) A query that joins two large tables

<details>
<summary>Show Answer</summary>

**Answer: C) A query that includes UUID_STRING() function**

UUID_STRING() is a non-deterministic function that returns different values each time it's called. Queries with non-deterministic functions cannot use the result cache because the results would differ between executions. Note: CURRENT_DATE() behavior depends on context but may be cached in some cases.

</details>

---

## Summary

Understanding Snowflake's caching mechanisms is essential for:

1. **Performance Optimization** - Leveraging caches to minimize query latency
2. **Cost Management** - Avoiding unnecessary compute charges with result cache
3. **Architecture Knowledge** - Understanding how the three layers interact
4. **Troubleshooting** - Diagnosing why queries may be slower than expected

**Key Takeaways:**
- Result cache = free (no warehouse needed), 24-hour retention
- Warehouse cache = fast local reads, cleared on suspend
- Metadata cache = query optimization, always available
- Suspending warehouses clears the warehouse cache
- USE_CACHED_RESULT controls result caching behavior
