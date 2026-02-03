# Domain 3: Performance Concepts

## Part 8: Result Cache and Caching Strategies

This section covers the caching mechanisms in Snowflake, with a focus on the Result Cache (persisted query results). Understanding caching is critical for performance optimization and a frequently tested topic on the SnowPro Core exam.

---

## 1. Snowflake's Three-Layer Caching Architecture

Snowflake employs three distinct caching mechanisms, each serving a different purpose in the query execution pipeline.

### 1.1 Overview of Cache Layers

| Cache Type | Location | Purpose | Persistence |
|------------|----------|---------|-------------|
| **Metadata Cache** | Cloud Services Layer | Object information and statistics | Always available |
| **Result Cache** | Cloud Services Layer | Persisted query results | 24 hours (extendable to 31 days) |
| **Warehouse Cache** | Virtual Warehouse (Local SSD) | Raw micro-partition data | Until warehouse suspends |

**Visual Representation:**
```
User Query
    |
    v
[Cloud Services Layer]
    |-- Metadata Cache (object info, row counts, MIN/MAX)
    |-- Result Cache (query results for 24 hours)
    |
    v
[Virtual Warehouse]
    |-- Local Disk Cache (SSD) - micro-partitions
    |
    v
[Cloud Storage Layer]
    |-- Persistent table data
```

---

## 2. Metadata Cache

### 2.1 What is the Metadata Cache?

The Metadata Cache is a highly available service in the Cloud Services Layer that maintains information and statistics about database objects.

**Alternative Names (used interchangeably on exams):**
- Metadata Store
- Cloud Services Layer
- Services Layer
- Metadata Management Service

### 2.2 What the Metadata Cache Stores

| Category | Examples |
|----------|----------|
| **Object Structure** | Table schemas, column definitions, data types |
| **Statistics** | Row counts, table sizes, distinct value counts |
| **Micro-partition Info** | MIN/MAX values per column per partition |
| **Clustering Info** | Clustering depth, clustering keys |
| **Object Relationships** | Database/schema hierarchy |

### 2.3 Queries That Use Only Metadata Cache (No Warehouse Required)

These queries execute without consuming warehouse credits:

```sql
-- Row count queries
SELECT COUNT(*) FROM my_table;

-- MIN/MAX on columns (uses partition metadata)
SELECT MIN(order_date), MAX(order_date) FROM orders;

-- Context functions
SELECT CURRENT_USER();
SELECT CURRENT_WAREHOUSE();
SELECT CURRENT_DATABASE();

-- Describe commands
DESCRIBE TABLE my_table;
DESCRIBE VIEW my_view;

-- Show commands
SHOW TABLES;
SHOW DATABASES;
SHOW WAREHOUSES;

-- System functions (some)
SELECT SYSTEM$CLUSTERING_INFORMATION('my_table', '(column_name)');
```

**Key Exam Tip:** If the metadata cache has the answer, a warehouse is not needed. This is why `SELECT COUNT(*)` returns instantly even on multi-billion row tables.

---

## 3. Result Cache (Persisted Query Results)

### 3.1 What is the Result Cache?

The Result Cache stores the complete results of executed queries in the Cloud Services Layer for potential reuse by subsequent identical queries.

**Alternative Names (used interchangeably on exams):**
- Persisted Query Results
- Query Result Cache
- Result Set Cache
- 24-Hour Cache

### 3.2 Result Cache Behavior

**Default Behavior:**
- Results cached for **24 hours** after query execution
- Each time a cached result is reused, the retention period **resets to 24 hours**
- Maximum retention: **31 days** from original execution
- After 31 days, results are purged regardless of reuse

**Result Reuse Benefits:**
- Query bypasses execution entirely
- No warehouse credits consumed
- Instant response time
- Available across different warehouses
- Available to different users (with proper privileges)

### 3.3 Cache Hit Requirements (When Result Cache IS Used)

For the Result Cache to return a cached result, **ALL** of the following conditions must be met:

| Requirement | Description |
|-------------|-------------|
| **Exact Query Match** | New query must syntactically match the original exactly |
| **Same Case** | `SELECT * FROM table` != `select * from table` |
| **Same Formatting** | Extra whitespace or comments break the match |
| **No Table Aliases** | `SELECT * FROM table t` != `SELECT * FROM table` |
| **No Data Changes** | Underlying table data has not changed |
| **No Partition Changes** | Micro-partitions not reclustered or consolidated |
| **Results Still Cached** | Within 24-hour window (or extended period) |
| **Proper Privileges** | Role has required access to cached query tables |
| **Same Configuration** | Session parameters affecting results unchanged |
| **No Non-Reusable Functions** | Query doesn't use certain functions (see below) |

**Important Caveat:** Meeting all of the above conditions does NOT guarantee cache reuse. Snowflake may still choose to re-execute the query at its discretion.

### 3.4 When Result Cache is NOT Used

**Query Differences That Prevent Cache Hits:**

```sql
-- Original query (populates cache)
SELECT DISTINCT(severity) FROM weather_events;

-- These WILL NOT use the cache:
SELECT DISTINCT(severity) FROM weather_events;  -- SAME (cache hit!)
SELECT DISTINCT(severity) FROM weather_events we;  -- Table alias added
select distinct(severity) from weather_events;  -- Different case
SELECT DISTINCT(severity)  FROM weather_events;  -- Extra whitespace
```

**Non-Reusable Functions That Prevent Cache Reuse:**

Snowflake's official documentation uses the term "non-reusable functions" (not "non-deterministic") for functions that prevent result cache reuse. These are:

| Function | Reason |
|----------|--------|
| `UUID_STRING()` | Generates unique values each call |
| `RANDOM()` | Returns random values each call |
| `RANDSTR()` | Returns random strings each call |

**Note:** CURRENT_TIMESTAMP() and CURRENT_DATE() are NOT listed as non-reusable functions in the official docs. They may still return cached results if all other conditions are met.

```sql
-- These queries will NEVER use result cache (even if run twice identically):
SELECT *, RANDOM() FROM customers;
SELECT *, UUID_STRING() FROM products;
SELECT *, RANDSTR(10, RANDOM()) FROM items;
```

**External functions** also prevent result cache reuse because their results are not controlled by Snowflake.

**Other Conditions That Prevent Cache Reuse:**

| Condition | Description |
|-----------|-------------|
| **Data Changes** | Any DML on underlying tables (INSERT, UPDATE, DELETE) |
| **Micro-partition Changes** | Reclustering or consolidation of partitions |
| **Hybrid Tables** | Queries selecting from hybrid tables |
| **External Functions** | Query includes external function calls |
| **Session Parameter Changes** | Parameters affecting result generation changed |

### 3.5 The USE_CACHED_RESULT Parameter

Controls whether result caching is enabled. Can be set at multiple levels:

```sql
-- Disable result caching at session level
ALTER SESSION SET USE_CACHED_RESULT = FALSE;

-- Disable result caching at user level
ALTER USER my_user SET USE_CACHED_RESULT = FALSE;

-- Disable result caching at account level (requires ACCOUNTADMIN)
ALTER ACCOUNT SET USE_CACHED_RESULT = FALSE;

-- Re-enable result caching
ALTER SESSION SET USE_CACHED_RESULT = TRUE;
```

**Default Value:** `TRUE` (result caching enabled)

**When to Disable Result Cache:**
- Benchmarking queries (to measure actual execution time)
- Testing query performance optimizations
- Ensuring queries always read fresh data
- Debugging unexpected query behavior

### 3.6 Result Cache and Security

**Role-Based Access:**
- For **SELECT queries**: The executing role must have necessary privileges on all tables in the cached query
- For **SHOW queries**: The executing role must **match** the role that generated the cached results

```sql
-- User A with ANALYST role runs:
SELECT * FROM sales_data;  -- Cache populated

-- User B with ANALYST role runs same query:
SELECT * FROM sales_data;  -- Cache HIT (same role, same privileges)

-- User C with VIEWER role runs same query:
SELECT * FROM sales_data;  -- Cache HIT IF VIEWER has SELECT on sales_data

-- SHOW commands are different:
SHOW TABLES;  -- Cache populated by ANALYST

-- Same SHOW by different role:
SHOW TABLES;  -- NO cache hit (roles must match for SHOW)
```

---

## 4. Warehouse Cache (Local Disk Cache)

### 4.1 What is the Warehouse Cache?

The Warehouse Cache is local SSD storage on each virtual warehouse node that stores raw micro-partition files retrieved from cloud storage.

**Alternative Names (used interchangeably on exams):**
- Local Disk Cache
- SSD Cache
- Data Cache
- Raw Data Cache
- Warehouse Local Storage

### 4.2 Warehouse Cache Characteristics

| Characteristic | Description |
|----------------|-------------|
| **Contents** | Raw micro-partition files (not aggregated results) |
| **Location** | Local SSD on warehouse compute nodes |
| **Scope** | Specific to one warehouse (not shared) |
| **Lifecycle** | Cleared when warehouse is suspended |
| **Size** | Increases with warehouse size |

### 4.3 Warehouse Cache vs Result Cache

| Aspect | Result Cache | Warehouse Cache |
|--------|--------------|-----------------|
| **Location** | Cloud Services Layer | Warehouse Local SSD |
| **Contents** | Query results | Raw micro-partitions |
| **Shared Across Warehouses** | Yes | No |
| **Shared Across Users** | Yes (with privileges) | Yes (same warehouse) |
| **Query Match Required** | Exact syntactic match | Any query using same data |
| **Cleared When** | 24 hours + 31 day max | Warehouse suspension |

### 4.4 Optimizing Warehouse Cache

**Keep Warehouse Running for Frequent Queries:**
```sql
-- Recommended auto-suspend settings by use case:
-- Tasks: Immediate suspension (0 seconds)
-- DevOps/Data Science: ~5 minutes (ad-hoc queries)
-- BI/Reporting: 10+ minutes (repetitive queries)

ALTER WAREHOUSE my_wh SET AUTO_SUSPEND = 600;  -- 10 minutes
```

**Trade-off Considerations:**
- Longer auto-suspend = better cache utilization = higher idle costs
- Shorter auto-suspend = lower costs = cold cache on resume

### 4.5 Monitoring Cache Performance

```sql
-- Query to check cache utilization by warehouse
SELECT warehouse_name,
       COUNT(*) AS query_count,
       SUM(bytes_scanned) AS bytes_scanned,
       SUM(bytes_scanned * percentage_scanned_from_cache) AS bytes_from_cache,
       SUM(bytes_scanned * percentage_scanned_from_cache) /
         NULLIF(SUM(bytes_scanned), 0) AS cache_hit_ratio
FROM snowflake.account_usage.query_history
WHERE start_time >= DATEADD(month, -1, CURRENT_TIMESTAMP())
  AND bytes_scanned > 0
GROUP BY warehouse_name
ORDER BY cache_hit_ratio;
```

---

## 5. Post-Processing with RESULT_SCAN

### 5.1 What is RESULT_SCAN?

The `RESULT_SCAN` function allows you to query the results of a previously executed query as if it were a table. This uses the persisted query results.

### 5.2 RESULT_SCAN Syntax

```sql
-- Query results of most recent query
SELECT * FROM TABLE(RESULT_SCAN(LAST_QUERY_ID()));

-- Query results of a specific query by ID
SELECT * FROM TABLE(RESULT_SCAN('<query_id>'));
```

### 5.3 Common Use Cases

**Processing SHOW Command Output:**
```sql
-- Find all empty tables
SHOW TABLES;

SELECT "schema_name", "name" AS "table_name", "rows"
FROM TABLE(RESULT_SCAN(LAST_QUERY_ID()))
WHERE "rows" = 0;
```

**Building Complex Queries Incrementally:**
```sql
-- First, get aggregated data
SELECT customer_id, SUM(amount) as total
FROM orders
GROUP BY customer_id;

-- Then filter the results
SELECT *
FROM TABLE(RESULT_SCAN(LAST_QUERY_ID()))
WHERE total > 10000;
```

**Processing Stored Procedure Output:**
```sql
CALL my_stored_procedure();

SELECT * FROM TABLE(RESULT_SCAN(LAST_QUERY_ID()))
WHERE status = 'FAILED';
```

### 5.4 Alternative: Pipe Operator

The pipe operator (`->>`) can process results without displaying intermediate results:

```sql
-- Show tables and filter in one statement
SHOW TABLES ->> WHERE "rows" = 0;
```

---

## 6. Exam Tips and Common Question Patterns

### 6.1 Frequently Tested Concepts

1. **Three Cache Types**: Know all three caches and their locations
2. **Result Cache Duration**: 24 hours, extendable to 31 days maximum
3. **Exact Match Requirement**: Query must match syntactically exactly
4. **USE_CACHED_RESULT**: Parameter to enable/disable result caching
5. **Warehouse Suspension**: Clears local cache (not result cache)
6. **Metadata Queries**: No warehouse required for COUNT(*), SHOW, DESCRIBE

### 6.2 Common Exam Traps

| Trap | Reality |
|------|---------|
| "Result cache lasts 31 days" | No - 24 hours, EXTENDED up to 31 days if reused |
| "Uppercase/lowercase don't matter" | They DO matter for cache hits |
| "Adding a comment won't affect cache" | It WILL prevent cache hit |
| "Suspending warehouse clears result cache" | No - result cache is in Cloud Services |
| "Result cache is per-warehouse" | No - it's shared across warehouses |

### 6.3 Practice Questions

**Question 1:** A query was run at 9 AM and the results were cached. At 8 AM the next day, the same query was run and used the cache. When will this cached result expire?

- A) 9 AM the original day (24 hours from first run)
- B) 8 AM the next day (immediately)
- C) 8 AM two days later (24 hours from reuse)
- D) 9 AM 31 days from the original run

**Answer:** C - Each reuse resets the 24-hour retention period.

---

**Question 2:** Which of the following queries will NOT use the result cache if run twice identically?

- A) `SELECT * FROM orders WHERE order_date > '2024-01-01'`
- B) `SELECT COUNT(*) FROM customers`
- C) `SELECT *, UUID_STRING() AS row_id FROM products`
- D) `SELECT SUM(amount) FROM sales GROUP BY region`

**Answer:** C - UUID_STRING() is a non-reusable function that prevents result caching.

---

**Question 3:** What happens to the warehouse cache when a warehouse is suspended?

- A) It is preserved for 24 hours
- B) It is moved to the result cache
- C) It is cleared/purged
- D) It is compressed and archived

**Answer:** C - The warehouse cache is cleared when the warehouse suspends.

---

**Question 4:** Which parameter controls whether query results are cached?

- A) RESULT_CACHE_ENABLED
- B) USE_CACHED_RESULT
- C) QUERY_CACHE_ACTIVE
- D) CACHE_RESULTS

**Answer:** B - USE_CACHED_RESULT is the correct parameter name.

---

**Question 5:** A user wants to ensure their benchmark query doesn't use any cached results. What should they do?

- A) Suspend and resume the warehouse
- B) Run `ALTER SESSION SET USE_CACHED_RESULT = FALSE`
- C) Add a random comment to the query
- D) Both A and B, but not C

**Answer:** D - Suspending clears warehouse cache, and disabling USE_CACHED_RESULT prevents result cache use. Adding a comment would prevent result cache but not warehouse cache.

---

**Question 6:** Which of the following operations does NOT require a running warehouse?

- A) `SELECT * FROM my_table LIMIT 10`
- B) `SELECT COUNT(*) FROM my_table`
- C) `SELECT MAX(amount) FROM orders`
- D) `SELECT * FROM my_table WHERE id = 1`

**Answer:** B - COUNT(*) uses metadata cache. MAX() might use metadata if simple, but typically requires warehouse for processing. A and D definitely need a warehouse.

---

## 7. Quick Reference

### Cache Type Summary

| Cache | Location | Duration | Trigger to Clear | Shared |
|-------|----------|----------|------------------|--------|
| Metadata | Cloud Services | Persistent | Object changes | Yes |
| Result | Cloud Services | 24h (31d max) | Data changes, expiration | Yes |
| Warehouse | Local SSD | Until suspend | Warehouse suspension | No |

### Result Cache Checklist

For result cache to be used:
- [ ] Exact same query text (case-sensitive)
- [ ] No table aliases added/removed
- [ ] No non-reusable functions (UUID_STRING, RANDOM, RANDSTR)
- [ ] No external functions
- [ ] Table data unchanged
- [ ] Micro-partitions unchanged
- [ ] USE_CACHED_RESULT = TRUE
- [ ] Within 24-hour (or extended) window
- [ ] Role has proper privileges

### Key SQL Commands

```sql
-- Disable result cache for testing
ALTER SESSION SET USE_CACHED_RESULT = FALSE;

-- Check if query used cache (in query history)
SELECT query_id, query_text,
       bytes_scanned,
       percentage_scanned_from_cache
FROM snowflake.account_usage.query_history
WHERE query_id = '<your_query_id>';

-- Use RESULT_SCAN for post-processing
SELECT * FROM TABLE(RESULT_SCAN(LAST_QUERY_ID()));
```

---

**Key Takeaway:** The Result Cache provides significant performance benefits by avoiding redundant query execution. Understanding the exact conditions for cache hits - particularly the requirement for syntactically identical queries and unchanged underlying data - is essential for both exam success and real-world performance optimization. Remember that even when all conditions are met, Snowflake may still choose to re-execute the query rather than return cached results.
