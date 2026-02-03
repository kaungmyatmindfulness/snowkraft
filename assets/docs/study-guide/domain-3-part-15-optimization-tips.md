# Domain 3: Performance Concepts
## Part 15: Query Optimization Best Practices

**Exam Weight: 10-15%**

---

## Table of Contents
1. [Query Optimization Overview](#query-optimization-overview)
2. [SELECT Statement Best Practices](#select-statement-best-practices)
3. [Filter and Predicate Optimization](#filter-and-predicate-optimization)
4. [LIMIT and TOP Usage](#limit-and-top-usage)
5. [ORDER BY Optimization](#order-by-optimization)
6. [Join Optimization](#join-optimization)
7. [Partition Pruning](#partition-pruning)
8. [SQL Anti-Patterns to Avoid](#sql-anti-patterns-to-avoid)
9. [Query Optimization Checklist](#query-optimization-checklist)
10. [Exam Tips and Common Question Patterns](#exam-tips-and-common-question-patterns)

---

## Query Optimization Overview

Snowflake's query optimizer automatically generates efficient execution plans, but writing well-structured SQL significantly improves performance. Understanding how Snowflake processes queries enables you to write more efficient code.

### SQL Execution Order

Understanding SQL execution order is critical for optimization:

```
1. Row Operations (Data Reduction)
   +-- FROM clause (table access)
   +-- JOIN operations (table combinations)
   +-- WHERE clause (row filtering) <-- Pruning happens here

2. Grouping Operations
   +-- GROUP BY (aggregation)
   +-- HAVING (filter on aggregated results)

3. Result Processing
   +-- SELECT (column selection)
   +-- DISTINCT (duplicate removal)
   +-- ORDER BY (sorting)
   +-- LIMIT/TOP (result limiting)
```

**Key Insight**: WHERE executes early in the process, making it the most effective place to reduce data volume.

### Three Types of Caching

| Cache Type | Location | Retention | Use Case |
|------------|----------|-----------|----------|
| **Metadata Cache** | Cloud Services Layer | Persistent | COUNT(*), SHOW, DESCRIBE |
| **Result Cache** | Cloud Services Layer | 24 hours (up to 31 days) | Exact query repetition |
| **Warehouse Cache** | Local SSD | Until suspend/resize | Column data reuse |

---

## SELECT Statement Best Practices

### Avoid SELECT *

**Anti-Pattern:**
```sql
-- BAD: Retrieves all columns, wastes I/O and network bandwidth
SELECT * FROM customer_orders;
```

**Best Practice:**
```sql
-- GOOD: Retrieves only needed columns
SELECT customer_id, order_date, total_amount
FROM customer_orders;
```

**Why It Matters:**
- Snowflake uses columnar storage (micro-partitions)
- Selecting fewer columns means reading fewer column files
- Reduces I/O, network transfer, and processing time
- Improves result cache efficiency (smaller result sets cache better)

### Column Selection Guidelines

| Scenario | Recommendation |
|----------|----------------|
| Exploration/debugging | SELECT * acceptable temporarily |
| Production queries | List specific columns always |
| Views/stored procedures | Never use SELECT * (schema changes break code) |
| Large tables (1M+ rows) | Critical to select only needed columns |

### Projection Pushdown

Snowflake automatically applies projection pushdown, reading only requested columns from storage. However, SELECT * prevents this optimization by forcing all columns to be read.

```sql
-- Query profile will show "Columns scanned: 3"
SELECT customer_id, order_date, total
FROM orders
WHERE order_date > '2024-01-01';

-- Query profile will show "Columns scanned: ALL"
SELECT *
FROM orders
WHERE order_date > '2024-01-01';
```

---

## Filter and Predicate Optimization

### Use WHERE Clauses Early

**Principle**: Filter data as early as possible in the query to reduce the amount of data processed by subsequent operations.

**Anti-Pattern:**
```sql
-- BAD: Filtering after aggregation (HAVING processes more data)
SELECT region, SUM(sales) as total_sales
FROM sales_table
GROUP BY region
HAVING region = 'US';
```

**Best Practice:**
```sql
-- GOOD: Filter before aggregation (WHERE reduces data first)
SELECT region, SUM(sales) as total_sales
FROM sales_table
WHERE region = 'US'
GROUP BY region;
```

### Avoid Functions on Filter Columns

**Critical Concept**: Applying functions to filter columns prevents partition pruning and index usage.

**Anti-Pattern:**
```sql
-- BAD: Function on column prevents pruning
SELECT * FROM orders
WHERE YEAR(order_date) = 2024;

-- BAD: CAST on column prevents pruning
SELECT * FROM orders
WHERE CAST(order_date AS VARCHAR) = '2024-01-15';

-- BAD: Arithmetic on column prevents pruning
SELECT * FROM products
WHERE price * 1.1 > 100;
```

**Best Practice:**
```sql
-- GOOD: Date range allows partition pruning
SELECT * FROM orders
WHERE order_date >= '2024-01-01'
  AND order_date < '2025-01-01';

-- GOOD: Direct comparison allows pruning
SELECT * FROM orders
WHERE order_date = '2024-01-15';

-- GOOD: Transform the constant, not the column
SELECT * FROM products
WHERE price > 100 / 1.1;
```

### Search Optimization Considerations

For tables with Search Optimization enabled:

**Supported (Uses Search Optimization):**
```sql
-- Equality searches
WHERE customer_id = 12345

-- IN clauses
WHERE status IN ('ACTIVE', 'PENDING')

-- IS NULL checks
WHERE cancelled_date IS NULL
```

**Not Supported (Does NOT use Search Optimization):**
```sql
-- Function applied to column
WHERE CAST(customer_id AS VARCHAR) = '12345'

-- Arithmetic expressions
WHERE customer_id + 0 = 12345
```

### Filter Pushdown

Snowflake pushes filters down as close to the data source as possible:

```
Query with WHERE clause
        |
        v
+-------------------+
| WHERE condition   | <-- Pushed to scan level
+-------------------+
        |
        v
+-------------------+
| Partition pruning | <-- Eliminates micro-partitions
+-------------------+
        |
        v
+-------------------+
| Column scan       | <-- Only scans matching partitions
+-------------------+
```

---

## LIMIT and TOP Usage

### Basic Usage

LIMIT and TOP are equivalent in Snowflake:

```sql
-- These produce identical results
SELECT * FROM orders LIMIT 100;
SELECT TOP 100 * FROM orders;
```

### LIMIT with ORDER BY (Top-K Pruning)

**Key Feature**: When LIMIT is combined with ORDER BY, Snowflake can apply Top-K pruning optimization.

**How Top-K Pruning Works:**
- Snowflake stops scanning when it determines remaining rows cannot be in the top K results
- Most effective on large tables
- Requires ORDER BY column to be certain data types

**Eligible Data Types for Top-K Pruning:**
- INTEGER types
- DATE and TIMESTAMP types
- VARCHAR/STRING types (including collated strings)
- VARIANT fields cast to supported types

**Example:**
```sql
-- Top-K pruning can be applied
SELECT * FROM orders
ORDER BY order_date DESC
LIMIT 10;

-- Works with VARIANT if cast
SELECT * FROM events
ORDER BY TO_TIMESTAMP(event_data:timestamp)
LIMIT 100;
```

**Important Caveats:**

1. **Aggregates with ORDER BY**: Top-K pruning only applies if ORDER BY column is also a GROUP BY column:
```sql
-- CAN use Top-K (c2 is in GROUP BY)
SELECT c1, c2, COUNT(*) as cnt
FROM mytable
GROUP BY c1, c2
ORDER BY c2, c1
LIMIT 5;

-- CANNOT use Top-K (agg_col is not in GROUP BY)
SELECT c1, c2, COUNT(*) as agg_col
FROM mytable
GROUP BY c1, c2
ORDER BY agg_col
LIMIT 5;
```

2. **DESC with NULLs**: For descending order on nullable columns, specify NULLS LAST:
```sql
-- Enables pruning for DESC on nullable columns
SELECT * FROM orders
ORDER BY cancelled_date DESC NULLS LAST
LIMIT 10;
```

### LIMIT Without ORDER BY

Without ORDER BY, LIMIT simply returns any K rows (non-deterministic):

```sql
-- Returns 100 arbitrary rows (order not guaranteed)
SELECT customer_id, order_total
FROM orders
LIMIT 100;
```

**Performance Note**: This can still be faster than retrieving all rows, but does not benefit from Top-K pruning.

### LIMIT with OFFSET

```sql
-- Skip first 100 rows, return next 50
SELECT * FROM orders
ORDER BY order_date
LIMIT 50 OFFSET 100;
```

**Warning**: Large OFFSET values can be slow because Snowflake must still process all preceding rows.

---

## ORDER BY Optimization

### Single ORDER BY Principle

**Anti-Pattern:**
```sql
-- BAD: Redundant sorting in subquery
SELECT * FROM (
  SELECT * FROM large_table ORDER BY date
)
WHERE amount > 1000
ORDER BY date DESC;
```

**Best Practice:**
```sql
-- GOOD: Single sort at end
SELECT *
FROM large_table
WHERE amount > 1000
ORDER BY date DESC;
```

### ORDER BY with LIMIT

Always combine ORDER BY with LIMIT when only top results are needed:

**Anti-Pattern:**
```sql
-- BAD: Sorts entire result set
SELECT * FROM orders
ORDER BY total_amount DESC;
-- Then only look at first 10 rows in application
```

**Best Practice:**
```sql
-- GOOD: "Sort with Limit" operator is much more efficient
SELECT * FROM orders
ORDER BY total_amount DESC
LIMIT 10;
```

### ORDER BY in Subqueries

Order is not preserved through subqueries unless explicitly specified:

```sql
-- Outer query determines final order
SELECT * FROM (
  SELECT * FROM orders ORDER BY date  -- This order may be ignored
) subq
WHERE status = 'COMPLETE'
ORDER BY total DESC;  -- Final order
```

**Best Practice**: Only ORDER BY in the outermost query.

### Avoiding Unnecessary ORDER BY

| Scenario | Recommendation |
|----------|----------------|
| INSERT/COPY INTO | Never use ORDER BY (no ordering guarantee) |
| UNION ALL | Remove ORDER BY from individual queries |
| CTEs | Avoid ORDER BY unless LIMIT also present |
| Subqueries | Order in outer query only |

---

## Join Optimization

### Join Order and Table Size

Snowflake automatically optimizes join order, but understanding the pattern helps write better queries:

- Smaller table (dimension) should be on the right side for hash joins
- Larger table (fact) should be on the left side
- Snowflake handles this automatically in most cases

### Preventing Join Explosion

**Join explosion** occurs when non-unique join keys produce duplicate rows:

**Anti-Pattern:**
```sql
-- BAD: Non-unique join key causes row multiplication
SELECT o.*, p.*
FROM orders o
JOIN products p ON o.product_category = p.category;
-- If 1 order matches 5 products, creates 5 rows per order
```

**Best Practice:**
```sql
-- GOOD: Unique join key
SELECT o.*, p.*
FROM orders o
JOIN products p ON o.product_id = p.product_id;
```

**Detection**: Check query profile for row counts increasing after join operators.

### Join Elimination

Snowflake can automatically eliminate unnecessary joins:

```sql
-- If only selecting from orders and p.name is never NULL,
-- Snowflake may eliminate the join entirely
SELECT o.order_id, o.order_date
FROM orders o
LEFT JOIN products p ON o.product_id = p.product_id;
```

### Join with Filters

Always push filters to the appropriate side of the join:

```sql
-- GOOD: Filter applied before join (reduces rows to join)
SELECT o.*, c.customer_name
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
WHERE o.order_date >= '2024-01-01'
  AND c.region = 'US';
```

---

## Partition Pruning

### Understanding Micro-Partitions

- Snowflake stores data in micro-partitions (50-500MB compressed)
- Each micro-partition has metadata: min/max values, distinct counts
- Pruning eliminates partitions that cannot contain matching rows

### Pruning Statistics in Query Profile

Check these metrics in the query profile:

| Metric | Meaning |
|--------|---------|
| **Partitions scanned** | Micro-partitions actually read |
| **Partitions total** | Total micro-partitions in table |
| **Percentage scanned** | (Scanned / Total) * 100 |

**Target**: Percentage scanned should be as low as possible for filtered queries.

### Clustering for Better Pruning

For large tables (TB+) with poor pruning:

```sql
-- Check clustering information
SELECT SYSTEM$CLUSTERING_INFORMATION('orders', '(order_date)');

-- Add clustering key
ALTER TABLE orders CLUSTER BY (order_date);
```

**Clustering Key Guidelines:**
- Maximum 3-4 columns recommended
- Order columns from lowest to highest cardinality
- Choose columns frequently used in WHERE, JOIN, ORDER BY
- Medium cardinality works best (not too unique, not too few values)

---

## SQL Anti-Patterns to Avoid

### Anti-Pattern 1: SELECT *
```sql
-- AVOID
SELECT * FROM large_table;

-- PREFER
SELECT col1, col2, col3 FROM large_table;
```
**Impact**: Unnecessary I/O, network transfer, and memory usage.

### Anti-Pattern 2: Functions on Filter Columns
```sql
-- AVOID
WHERE YEAR(date_col) = 2024

-- PREFER
WHERE date_col >= '2024-01-01' AND date_col < '2025-01-01'
```
**Impact**: Prevents partition pruning, forces full table scan.

### Anti-Pattern 3: Missing WHERE Clause
```sql
-- AVOID
SELECT customer_id, SUM(amount)
FROM orders
GROUP BY customer_id;

-- PREFER (when applicable)
SELECT customer_id, SUM(amount)
FROM orders
WHERE order_date >= '2024-01-01'
GROUP BY customer_id;
```
**Impact**: Full table scan, maximum I/O.

### Anti-Pattern 4: HAVING Instead of WHERE
```sql
-- AVOID
SELECT region, SUM(sales)
FROM sales
GROUP BY region
HAVING region = 'WEST';

-- PREFER
SELECT region, SUM(sales)
FROM sales
WHERE region = 'WEST'
GROUP BY region;
```
**Impact**: HAVING filters after grouping; WHERE filters before (more efficient).

### Anti-Pattern 5: High Cardinality GROUP BY
```sql
-- AVOID (millions of groups)
SELECT customer_id, timestamp, COUNT(*)
FROM events
GROUP BY customer_id, timestamp;

-- PREFER (reduce cardinality)
SELECT customer_id, DATE_TRUNC('day', timestamp), COUNT(*)
FROM events
GROUP BY 1, 2;
```
**Impact**: High memory usage, potential spilling to disk.

### Anti-Pattern 6: ORDER BY Without LIMIT
```sql
-- AVOID (unless order truly needed)
SELECT * FROM large_table ORDER BY date;

-- PREFER
SELECT * FROM large_table ORDER BY date LIMIT 1000;
```
**Impact**: Expensive sorting operation on full result set.

### Anti-Pattern 7: Cartesian Joins
```sql
-- AVOID (unless intentional)
SELECT * FROM table1, table2;
-- or
SELECT * FROM table1 CROSS JOIN table2;

-- PREFER
SELECT * FROM table1 JOIN table2 ON table1.id = table2.id;
```
**Impact**: Exponential row growth (rows1 x rows2).

### Anti-Pattern 8: Unnecessary DISTINCT
```sql
-- AVOID (if data is already unique)
SELECT DISTINCT order_id FROM orders;

-- PREFER (if order_id is already unique/primary key)
SELECT order_id FROM orders;
```
**Impact**: Forces sorting/hashing to eliminate duplicates.

### Anti-Pattern 9: Non-Sargable Predicates
```sql
-- AVOID
WHERE UPPER(name) = 'JOHN'
WHERE amount + 100 > 500
WHERE COALESCE(status, 'UNKNOWN') = 'ACTIVE'

-- PREFER
WHERE name = 'John'  -- (if case-insensitive collation)
WHERE amount > 400
WHERE status = 'ACTIVE'
```
**Impact**: Prevents use of pruning and search optimization.

### Anti-Pattern 10: Using UNION Instead of UNION ALL
```sql
-- AVOID (unless duplicates must be removed)
SELECT * FROM table1
UNION
SELECT * FROM table2;

-- PREFER (when duplicates are acceptable or impossible)
SELECT * FROM table1
UNION ALL
SELECT * FROM table2;
```
**Impact**: UNION requires sorting/deduplication; UNION ALL does not.

---

## Query Optimization Checklist

Use this checklist before running queries on large tables:

### Column Selection
- [ ] Selected only required columns (no SELECT *)
- [ ] Excluded LOB columns (VARIANT, OBJECT, ARRAY) if not needed

### Filtering
- [ ] Added WHERE clause to reduce data early
- [ ] Avoided functions on filter columns
- [ ] Used date ranges instead of date functions
- [ ] Pushed filters as close to base tables as possible

### Aggregation
- [ ] Used WHERE instead of HAVING when possible
- [ ] Minimized GROUP BY cardinality
- [ ] Added filters before GROUP BY

### Sorting and Limiting
- [ ] Combined ORDER BY with LIMIT
- [ ] Used single ORDER BY in outermost query only
- [ ] Avoided ORDER BY in subqueries/CTEs

### Joins
- [ ] Used unique/indexed columns for join keys
- [ ] Verified no join explosion (row count multiplication)
- [ ] Added filters to reduce rows before joining

### Caching
- [ ] Query can benefit from result cache (no time functions if possible)
- [ ] USE_CACHED_RESULT is enabled (default)
- [ ] Warehouse not recently suspended (warm cache)

### Pruning
- [ ] WHERE clause uses clustered columns
- [ ] Checked partition statistics in query profile
- [ ] Considered adding clustering key for large tables

---

## Exam Tips and Common Question Patterns

### Key Concepts for Exam

1. **SELECT * Impact**
   - Retrieves all columns
   - Prevents projection pushdown optimization
   - Increases I/O, network, and processing time

2. **Function on Filter Column**
   - Prevents partition pruning
   - Search optimization cannot be used
   - Always apply functions to constants, not columns

3. **LIMIT and TOP**
   - Equivalent syntax in Snowflake
   - Top-K pruning only with ORDER BY
   - Most effective on large tables

4. **ORDER BY Best Practices**
   - Single ORDER BY in outermost query
   - Always pair with LIMIT when possible
   - "Sort with Limit" operator is optimized

5. **WHERE vs HAVING**
   - WHERE filters before grouping (preferred)
   - HAVING filters after grouping
   - Use WHERE whenever the column is not aggregated

6. **Result Cache Requirements**
   - Exact query match (case-sensitive)
   - No time context functions (CURRENT_TIMESTAMP, etc.)
   - Table data unchanged
   - 24-hour retention, up to 31 days if reused

### Common Exam Scenarios

**Scenario 1: Query runs slowly on large table**
- Question pattern: "How can you improve query performance?"
- Look for: Missing WHERE clause, SELECT *, functions on filter columns
- Answer: Add filters, select specific columns, remove functions from predicates

**Scenario 2: Partition pruning not working**
- Question pattern: "Why is partition pruning not effective?"
- Look for: Functions on clustered columns, missing WHERE clause
- Answer: Use direct comparisons, add date ranges, check clustering

**Scenario 3: LIMIT not improving performance**
- Question pattern: "Query with LIMIT 10 still scans all rows"
- Look for: Missing ORDER BY, function on ORDER BY column
- Answer: Add ORDER BY on supported data type for Top-K pruning

**Scenario 4: High credit consumption**
- Question pattern: "How to reduce query costs?"
- Look for: SELECT *, missing filters, large result sets
- Answer: Optimize query, use caching, add clustering

### Practice Questions

**Question 1**: Which query will benefit from partition pruning on a table clustered by order_date?

A) `SELECT * FROM orders WHERE YEAR(order_date) = 2024`
B) `SELECT * FROM orders WHERE order_date >= '2024-01-01'`
C) `SELECT * FROM orders WHERE DATE_TRUNC('month', order_date) = '2024-01'`
D) `SELECT * FROM orders WHERE TO_CHAR(order_date, 'YYYY') = '2024'`

<details>
<summary>Show Answer</summary>

**B) SELECT * FROM orders WHERE order_date >= '2024-01-01'**

Options A, C, and D apply functions to the order_date column, preventing partition pruning. Only option B uses a direct comparison that allows Snowflake to prune partitions.

</details>

---

**Question 2**: A query with LIMIT 100 is still scanning millions of rows. What is the most likely cause?

A) The table has too many micro-partitions
B) The query does not have an ORDER BY clause
C) The LIMIT value is too high
D) The warehouse is too small

<details>
<summary>Show Answer</summary>

**B) The query does not have an ORDER BY clause**

Top-K pruning (which allows Snowflake to stop scanning early) only applies when both LIMIT and ORDER BY are present. Without ORDER BY, Snowflake must scan to find any 100 rows but cannot prune based on sorted order.

</details>

---

**Question 3**: Which approach is most efficient for filtering data before aggregation?

A) Use HAVING clause with the filter condition
B) Use WHERE clause with the filter condition
C) Use a subquery with the filter and aggregate in the outer query
D) Filter in the application after retrieving aggregated data

<details>
<summary>Show Answer</summary>

**B) Use WHERE clause with the filter condition**

WHERE filters rows before aggregation, reducing the amount of data that needs to be grouped and aggregated. HAVING filters after aggregation, meaning all data must first be processed. This is a fundamental SQL optimization principle.

</details>

---

**Question 4**: A user reports that the result cache is not being used despite running the same query multiple times. Which is the most likely cause?

A) The warehouse was suspended between queries
B) The query contains CURRENT_TIMESTAMP() function
C) The table is too large for result caching
D) Result caching only works for SELECT statements

<details>
<summary>Show Answer</summary>

**B) The query contains CURRENT_TIMESTAMP() function**

Time context functions like CURRENT_TIMESTAMP(), CURRENT_DATE(), etc., produce different results for each execution, preventing result cache reuse. The query must match exactly for cache hits, and changing function outputs break this match.

</details>

---

**Question 5**: Which statement about SELECT * is TRUE?

A) SELECT * is optimized by Snowflake to only read needed columns
B) SELECT * can prevent projection pushdown optimization
C) SELECT * improves result cache hit rates
D) SELECT * is recommended for production queries

<details>
<summary>Show Answer</summary>

**B) SELECT * can prevent projection pushdown optimization**

SELECT * forces Snowflake to read all columns from storage, even if downstream operations only need a few columns. This prevents the projection pushdown optimization that would otherwise skip unnecessary column data.

</details>

---

**Question 6**: What is the impact of applying a function to a column used in a WHERE clause?

A) Improved query performance through function optimization
B) Partition pruning and search optimization are disabled
C) The query will return incorrect results
D) The warehouse will consume more credits per hour

<details>
<summary>Show Answer</summary>

**B) Partition pruning and search optimization are disabled**

When a function is applied to a column (e.g., WHERE UPPER(name) = 'JOHN'), Snowflake cannot use the column's metadata to prune partitions or leverage search optimization. The function must be evaluated for every row.

</details>

---

### Quick Reference Card

```
+------------------------------------------------------+
|           QUERY OPTIMIZATION QUICK REFERENCE          |
+------------------------------------------------------+

ALWAYS DO:
  [X] Select only needed columns
  [X] Add WHERE clauses early
  [X] Use direct comparisons (no functions on columns)
  [X] Combine ORDER BY with LIMIT
  [X] Join on unique columns
  [X] Check partition statistics in query profile

NEVER DO:
  [ ] SELECT * on large tables
  [ ] Functions on filter columns
  [ ] ORDER BY without LIMIT (unless needed)
  [ ] HAVING when WHERE works
  [ ] Cartesian joins (no join condition)
  [ ] UNION when UNION ALL works

PERFORMANCE HIERARCHY (fastest to slowest):
  1. Metadata cache (COUNT(*), SHOW)
  2. Result cache (exact query repeat)
  3. Warehouse cache (local SSD)
  4. Storage layer (remote)

PARTITION PRUNING CHECKLIST:
  - WHERE uses clustered columns: Yes
  - No functions on clustered columns: Yes
  - Direct comparisons used: Yes
  - Date ranges instead of date functions: Yes

TOP-K PRUNING REQUIREMENTS:
  - ORDER BY present: Yes
  - LIMIT present: Yes
  - ORDER BY column type supported: Yes
  - (INTEGER, DATE, TIMESTAMP, VARCHAR)
  - For DESC + NULL: NULLS LAST specified

+------------------------------------------------------+
```

---

## Summary

Query optimization in Snowflake follows these core principles:

1. **Minimize Data Early**: Use WHERE clauses and column selection to reduce data volume as early as possible in query execution.

2. **Preserve Pruning**: Avoid functions on filter columns to allow partition pruning and search optimization.

3. **Leverage Caching**: Write queries that can benefit from result cache (avoid time functions, use exact syntax).

4. **Optimize Sorting**: Always pair ORDER BY with LIMIT; use single sort in outermost query.

5. **Write Efficient Joins**: Use unique join keys, push filters before joins, verify no row explosion.

6. **Monitor Performance**: Check query profile for partition statistics, I/O metrics, and spilling indicators.

Following these best practices will significantly improve query performance and reduce credit consumption on the Snowflake platform.
