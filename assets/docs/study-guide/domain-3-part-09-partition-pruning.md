# Domain 3: Performance Concepts
## Part 9: Partition Pruning

**Exam Weight:** This topic is part of Domain 3 (10-15% of exam)

---

## Overview

Partition pruning is one of Snowflake's most important query optimization techniques. It allows the query engine to skip reading micro-partitions that cannot contain relevant data, dramatically reducing I/O and improving query performance. Understanding how pruning works and how to maximize its effectiveness is essential for both the SnowPro Core exam and real-world Snowflake optimization.

---

## Section 1: Understanding Micro-Partitions

### What Are Micro-Partitions?

Micro-partitions are Snowflake's fundamental unit of data storage. All table data is automatically divided into these contiguous units of storage.

**Key Characteristics:**

| Property | Description |
|----------|-------------|
| Size | 50-500 MB of uncompressed data per partition |
| Format | Columnar storage format |
| Compression | Automatically compressed |
| Encryption | AES-256 encrypted at rest |
| Management | Fully automatic (no user intervention) |

**Why Micro-Partitions Matter:**

1. **Granular Pruning** - Large tables can have millions of micro-partitions, enabling precise data skipping
2. **Columnar Storage** - Within each partition, data is stored by column, not by row
3. **Metadata Tracking** - Snowflake maintains statistics about each partition's contents

### Partition Metadata

For each micro-partition, Snowflake automatically collects and maintains:

- **Range Information** - Min/max values for each column
- **Count Statistics** - Number of distinct values, null counts
- **Physical Location** - Where the data resides in cloud storage

This metadata is stored in the Cloud Services Layer and consulted during query compilation.

---

## Section 2: How Partition Pruning Works

### The Two-Stage Pruning Process

Snowflake performs pruning at two levels:

**1. Partition-Level Pruning**
- Eliminates entire micro-partitions that cannot contain matching data
- Based on partition metadata (min/max values)
- Happens during query compilation

**2. Column-Level Pruning**
- Within remaining partitions, only referenced columns are read
- Leverages columnar storage format
- Further reduces I/O

### Pruning Decision Process

```
Query: SELECT * FROM sales WHERE order_date = '2024-01-15'

Step 1: Cloud Services examines partition metadata
        - Partition A: order_date range [2024-01-01, 2024-01-10] -> SKIP
        - Partition B: order_date range [2024-01-11, 2024-01-20] -> SCAN
        - Partition C: order_date range [2024-01-21, 2024-01-31] -> SKIP

Step 2: Only Partition B is scanned
        - Reads only columns referenced in SELECT/WHERE
        - Returns matching rows
```

### Pruning Efficiency Formula

```
Pruning Efficiency = 1 - (Partitions Scanned / Partitions Total)

Example:
- Table has 10,000 partitions
- Query scans 100 partitions
- Efficiency = 1 - (100/10,000) = 99% pruning
```

**Efficiency Guidelines:**

| Pruning Rate | Assessment | Action |
|--------------|------------|--------|
| > 95% | Excellent | Maintain current approach |
| 80-95% | Good | Minor optimization possible |
| 50-80% | Fair | Consider clustering or query changes |
| < 50% | Poor | Investigate clustering keys |

---

## Section 3: Query Patterns That Enable Pruning

### Effective Pruning Patterns

**1. Equality Predicates**
```sql
-- Highly effective for pruning
SELECT * FROM orders WHERE order_date = '2024-01-15';
SELECT * FROM customers WHERE region = 'WEST';
```

**2. Range Predicates**
```sql
-- Effective when data is clustered on the range column
SELECT * FROM orders
WHERE order_date BETWEEN '2024-01-01' AND '2024-01-31';
```

**3. IN Lists**
```sql
-- Multiple equality checks, each can enable pruning
SELECT * FROM products WHERE category_id IN (101, 102, 103);
```

**4. Combined Predicates**
```sql
-- Multiple filters can compound pruning benefits
SELECT * FROM sales
WHERE region = 'EAST'
  AND sale_date >= '2024-01-01';
```

### Patterns That Prevent Pruning

**1. Functions on Filtered Columns**
```sql
-- BAD: Function prevents pruning
SELECT * FROM orders WHERE YEAR(order_date) = 2024;

-- GOOD: Use range instead
SELECT * FROM orders
WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01';
```

**2. Expressions on Filtered Columns**
```sql
-- BAD: Expression prevents pruning
SELECT * FROM products WHERE price * 1.1 > 100;

-- GOOD: Transform the constant instead
SELECT * FROM products WHERE price > 90.91;
```

**3. Non-Deterministic Functions**
```sql
-- Cannot prune: result varies
SELECT * FROM audit_log WHERE log_time > CURRENT_TIMESTAMP() - INTERVAL '1 HOUR';
```

**4. LIKE with Leading Wildcard**
```sql
-- BAD: Cannot use range metadata
SELECT * FROM customers WHERE name LIKE '%Smith';

-- BETTER: Prefix patterns can potentially prune
SELECT * FROM customers WHERE name LIKE 'Smith%';
```

**5. OR Conditions Across Different Columns**
```sql
-- May reduce pruning effectiveness
SELECT * FROM orders
WHERE customer_id = 123 OR product_id = 456;
```

---

## Section 4: Partition Statistics in Query Profile

### Accessing Pruning Statistics

In Snowsight Query Profile, look for the **TableScan** operator to find pruning statistics:

| Metric | Description |
|--------|-------------|
| **Partitions scanned** | Number of micro-partitions actually read |
| **Partitions total** | Total micro-partitions in the table |
| **Bytes scanned** | Amount of data read from storage |

### Interpreting Pruning Statistics

**Good Pruning Example:**
```
Partitions scanned: 50
Partitions total: 10,000
Interpretation: 99.5% of partitions pruned - excellent!
```

**Poor Pruning Example:**
```
Partitions scanned: 8,500
Partitions total: 10,000
Interpretation: Only 15% pruned - investigate clustering
```

### Query Profile Indicators

**High Remote Disk I/O (>50%)** combined with high partitions scanned often indicates:
- Cold warehouse cache (recently resumed)
- Poor partition pruning
- Missing WHERE clauses
- Data not well-clustered for the query pattern

**Healthy Query Profile Characteristics:**
- Low partitions scanned vs. total
- High percentage from cache (after warm-up)
- Processing time dominates over I/O time

---

## Section 5: Clustering and Pruning Relationship

### Natural Clustering

Data is naturally clustered based on how it was loaded:

| Data Loading Pattern | Natural Clustering |
|---------------------|-------------------|
| Sequential timestamps | Well clustered on time columns |
| Random insertion order | Poorly clustered |
| Bulk loads by region | Well clustered on region |

**Key Point:** Natural clustering degrades over time as DML operations (UPDATE, DELETE, MERGE) modify data.

### Clustering Keys

Clustering keys explicitly define how data should be organized across micro-partitions:

```sql
-- Create table with clustering key
CREATE TABLE sales (
    sale_id INT,
    sale_date DATE,
    region VARCHAR,
    amount DECIMAL
) CLUSTER BY (sale_date, region);

-- Add clustering key to existing table
ALTER TABLE sales CLUSTER BY (sale_date, region);
```

### Clustering Metrics

**SYSTEM$CLUSTERING_INFORMATION** returns:
- **total_partition_count** - Number of micro-partitions
- **total_constant_partition_count** - Partitions with non-overlapping ranges
- **average_overlaps** - Average number of overlapping partitions
- **average_depth** - Partitions to search for any value

**SYSTEM$CLUSTERING_DEPTH** returns:
- Single numeric value: average depth

### Interpreting Clustering Depth

| Depth | Meaning | Pruning Impact |
|-------|---------|----------------|
| 1 | Perfect clustering | Optimal pruning |
| 1-5 | Well clustered | Good pruning |
| 5-10 | Moderately clustered | Fair pruning |
| 10+ | Poorly clustered | Poor pruning |

```sql
-- Check clustering on a table
SELECT SYSTEM$CLUSTERING_DEPTH('sales', '(sale_date)');

-- Get comprehensive clustering info
SELECT SYSTEM$CLUSTERING_INFORMATION('sales', '(sale_date, region)');
```

### Clustering Key Best Practices

| Guideline | Rationale |
|-----------|-----------|
| Maximum 3-4 columns | More columns = higher maintenance cost |
| Choose columns in WHERE clauses | Directly improves pruning for common queries |
| Low cardinality columns first | Better overlap reduction |
| Avoid very high cardinality | UUIDs, timestamps defeat clustering purpose |
| Avoid very low cardinality | Boolean columns provide minimal benefit |

**Cardinality Transformation:**
```sql
-- HIGH cardinality timestamp: Use date truncation
CLUSTER BY (TO_DATE(order_timestamp), region)

-- HIGH cardinality ID: Use modulo or truncation
CLUSTER BY (TRUNC(customer_id, -3), region)
```

---

## Section 6: Automatic Clustering

### How Automatic Clustering Works

Once a clustering key is defined, Snowflake's Automatic Clustering service:

1. **Monitors** table changes from DML operations
2. **Evaluates** whether reclustering would improve organization
3. **Reclusters** data in the background using serverless compute
4. **Maintains** clustering without user intervention

### Automatic Clustering Characteristics

| Aspect | Behavior |
|--------|----------|
| Trigger | Automatic when table would benefit |
| Compute | Serverless (Snowflake-managed) |
| DML Impact | Does not block concurrent operations |
| Cost | Credits for compute + storage for new partitions |

### Managing Automatic Clustering

```sql
-- Suspend automatic clustering
ALTER TABLE sales SUSPEND RECLUSTER;

-- Resume automatic clustering
ALTER TABLE sales RESUME RECLUSTER;

-- Remove clustering key entirely
ALTER TABLE sales DROP CLUSTERING KEY;
```

### Monitoring Clustering Costs

```sql
-- View clustering history
SELECT * FROM SNOWFLAKE.ACCOUNT_USAGE.AUTOMATIC_CLUSTERING_HISTORY
WHERE start_time >= DATEADD(day, -7, CURRENT_TIMESTAMP())
ORDER BY start_time DESC;
```

---

## Section 7: Top-K Pruning Optimization

### What is Top-K Pruning?

Top-K pruning is a specialized optimization for queries with ORDER BY and LIMIT clauses. It stops scanning when it determines that remaining rows cannot qualify for the result set.

### When Top-K Pruning Applies

All conditions must be met:

1. Query contains both **ORDER BY** and **LIMIT** clauses
2. First ORDER BY column uses supported data types:
   - INTEGER, DATE, TIMESTAMP (integer-representable)
   - VARCHAR, BINARY (string/binary types)
   - Properly cast VARIANT fields
3. For joins: ORDER BY column from the larger table
4. For aggregates: First ORDER BY column must also be a GROUP BY column (not aggregated)
5. DESC with nullable fields requires **NULLS LAST**

### Valid Top-K Pruning Examples

```sql
-- Simple case: works well
SELECT * FROM orders
ORDER BY order_date DESC
LIMIT 100;

-- With filter: still applies
SELECT * FROM orders
WHERE status = 'PENDING'
ORDER BY created_at
LIMIT 50;

-- Grouped query: ORDER BY matches GROUP BY
SELECT region, COUNT(*) as cnt
FROM orders
GROUP BY region
ORDER BY region
LIMIT 10;
```

### Invalid Top-K Pruning Examples

```sql
-- BAD: Expression on ORDER BY column
SELECT * FROM orders
ORDER BY UPPER(customer_name)
LIMIT 10;

-- BAD: Ordering by aggregated column first
SELECT region, SUM(amount) as total
FROM orders
GROUP BY region
ORDER BY total DESC  -- total is aggregated
LIMIT 5;

-- BAD: DESC on nullable without NULLS LAST
SELECT * FROM orders
ORDER BY cancelled_date DESC  -- nullable column
LIMIT 10;

-- GOOD: Add NULLS LAST
SELECT * FROM orders
ORDER BY cancelled_date DESC NULLS LAST
LIMIT 10;
```

---

## Section 8: Improving Pruning Effectiveness

### Strategy 1: Query Optimization

**Add Explicit Filters:**
```sql
-- Before: Full table scan
SELECT * FROM sales;

-- After: Enable date-based pruning
SELECT * FROM sales
WHERE sale_date >= DATEADD(day, -30, CURRENT_DATE());
```

**Avoid Functions on Filtered Columns:**
```sql
-- Before: Cannot prune
SELECT * FROM orders WHERE DATE_TRUNC('month', order_date) = '2024-01-01';

-- After: Can prune
SELECT * FROM orders
WHERE order_date >= '2024-01-01' AND order_date < '2024-02-01';
```

### Strategy 2: Clustering Keys

**Identify Candidate Tables:**
- Large tables (terabytes)
- Frequently queried
- Consistent filter patterns
- Relatively stable (not high-DML)

**Choose Appropriate Columns:**
```sql
-- Analyze query patterns first
SELECT * FROM SNOWFLAKE.ACCOUNT_USAGE.ACCESS_HISTORY
WHERE query_start_time >= DATEADD(day, -30, CURRENT_TIMESTAMP())
  AND base_objects_accessed LIKE '%MY_TABLE%';

-- Then define clustering key based on common filters
ALTER TABLE my_table CLUSTER BY (common_filter_col1, common_filter_col2);
```

### Strategy 3: Search Optimization Service

For point lookups (equality searches), consider Search Optimization:

```sql
-- Enable search optimization
ALTER TABLE customers ADD SEARCH OPTIMIZATION;

-- Enable on specific columns (more targeted)
ALTER TABLE customers ADD SEARCH OPTIMIZATION ON EQUALITY(customer_id, email);
```

**Search Optimization vs. Clustering:**

| Feature | Best For | Mechanism |
|---------|----------|-----------|
| Clustering | Range queries, common filters | Reorganizes data |
| Search Optimization | Point lookups, equality | Creates access paths |

---

## Section 9: Exam Tips and Common Question Patterns

### High-Frequency Exam Topics

1. **Micro-partition characteristics** - Size (50-500 MB), automatic management, columnar format
2. **Pruning metrics** - Partitions scanned vs. total, how to interpret
3. **Clustering depth** - Lower is better, 1 is optimal
4. **Query patterns** - What enables vs. prevents pruning
5. **SYSTEM$ functions** - CLUSTERING_DEPTH vs. CLUSTERING_INFORMATION

### Common Exam Questions

**Q: What size are micro-partitions in Snowflake?**
A: 50-500 MB of uncompressed data

**Q: How does Snowflake determine which partitions to prune?**
A: By comparing query predicates against partition metadata (min/max values)

**Q: What indicates good partition pruning in Query Profile?**
A: Partitions scanned is a small fraction of partitions total

**Q: What is the optimal clustering depth?**
A: 1 (each value found in only one partition)

**Q: Which function returns only the clustering depth metric?**
A: SYSTEM$CLUSTERING_DEPTH

**Q: What prevents partition pruning?**
A: Functions or expressions applied to filtered columns

**Q: What edition is required for clustering keys?**
A: Enterprise Edition or higher

### Key Distinctions to Remember

| Concept | Key Point |
|---------|-----------|
| Partition pruning | Skips entire micro-partitions based on metadata |
| Column pruning | Reads only referenced columns within partitions |
| Natural clustering | Based on load order, degrades with DML |
| Clustering keys | Explicitly defined, automatically maintained |
| Clustering depth | Lower = better; 1 = optimal |
| Automatic clustering | Serverless, background, costs credits |

### Tricky Scenarios

1. **Functions prevent pruning** - Even simple functions like YEAR() on filter columns prevent metadata-based pruning
2. **Clustering is not free** - Reclustering consumes compute credits and creates new partitions (storage)
3. **High cardinality clustering** - Clustering on UUIDs or timestamps provides minimal benefit
4. **Query Profile shows "total"** - This is table-wide, not query-specific; compare against "scanned"
5. **Top-K with aggregates** - ORDER BY column must be in GROUP BY, not an aggregate function

---

## Practice Questions

### Question 1
A query shows the following in Query Profile: Partitions scanned: 8,000, Partitions total: 10,000. What does this indicate?

- A) Excellent pruning efficiency
- B) Good pruning efficiency
- C) Poor pruning efficiency
- D) Partitions total is the number scanned

<details>
<summary>Show Answer</summary>

**Answer: C) Poor pruning efficiency**

Only 20% of partitions were pruned (2,000 out of 10,000). Good pruning should eliminate the majority of partitions. This query likely needs better WHERE clauses or table clustering.

</details>

### Question 2
Which query pattern will enable the most effective partition pruning?

- A) `SELECT * FROM orders WHERE YEAR(order_date) = 2024`
- B) `SELECT * FROM orders WHERE order_date BETWEEN '2024-01-01' AND '2024-12-31'`
- C) `SELECT * FROM orders WHERE order_date::VARCHAR LIKE '2024%'`
- D) `SELECT * FROM orders WHERE EXTRACT(YEAR FROM order_date) = 2024`

<details>
<summary>Show Answer</summary>

**Answer: B) SELECT * FROM orders WHERE order_date BETWEEN '2024-01-01' AND '2024-12-31'**

Range predicates on the raw column enable Snowflake to compare against partition min/max metadata. Options A, C, and D apply functions to the column, preventing effective pruning.

</details>

### Question 3
What does a clustering depth of 1 indicate?

- A) The table has only one partition
- B) Each value exists in only one partition (optimal)
- C) The table needs clustering
- D) Clustering has failed

<details>
<summary>Show Answer</summary>

**Answer: B) Each value exists in only one partition (optimal)**

A depth of 1 means any given value is found in exactly one micro-partition, enabling maximum pruning efficiency.

</details>

### Question 4
Which system function provides the most comprehensive clustering information?

- A) SYSTEM$CLUSTERING_DEPTH
- B) SYSTEM$CLUSTERING_INFORMATION
- C) SYSTEM$PARTITION_STATS
- D) SYSTEM$TABLE_METADATA

<details>
<summary>Show Answer</summary>

**Answer: B) SYSTEM$CLUSTERING_INFORMATION**

This function returns total partitions, constant partitions, average overlap, average depth, and a histogram. SYSTEM$CLUSTERING_DEPTH returns only the depth metric.

</details>

### Question 5
A table has millions of rows with a column containing only TRUE/FALSE values. Should you cluster on this column?

- A) Yes, Boolean columns are ideal for clustering
- B) No, the cardinality is too low to benefit
- C) Yes, but only with Enterprise Edition
- D) No, Boolean columns cannot be used in clustering keys

<details>
<summary>Show Answer</summary>

**Answer: B) No, the cardinality is too low to benefit**

With only 2 distinct values, clustering on a Boolean column provides minimal benefit. You would need to scan approximately half the table regardless. Medium cardinality columns (hundreds to thousands of distinct values) are ideal.

</details>

### Question 6
What happens to natural clustering over time as DML operations occur?

- A) It improves automatically
- B) It remains constant
- C) It degrades
- D) It converts to explicit clustering

<details>
<summary>Show Answer</summary>

**Answer: C) It degrades**

DML operations (UPDATE, DELETE, MERGE) modify data across partitions, gradually degrading the natural clustering that existed from the original load order.

</details>

### Question 7
When will Top-K pruning NOT be applied?

- A) Query has ORDER BY with LIMIT
- B) ORDER BY column is an INTEGER
- C) ORDER BY is on an aggregated SUM column
- D) Query uses NULLS LAST with DESC

<details>
<summary>Show Answer</summary>

**Answer: C) ORDER BY is on an aggregated SUM column**

For grouped queries, Top-K pruning only works when the first ORDER BY column is also a GROUP BY column, not an aggregated value like SUM or COUNT.

</details>

### Question 8
In Query Profile, what does high Remote Disk I/O combined with scanning most partitions indicate?

- A) Excellent query performance
- B) Result cache is being used
- C) Poor clustering or missing filters
- D) Warehouse is too large

<details>
<summary>Show Answer</summary>

**Answer: C) Poor clustering or missing filters**

High Remote Disk I/O means data is being read from cloud storage (not cache), and scanning most partitions indicates pruning is ineffective. This suggests adding WHERE clauses or clustering keys.

</details>

### Question 9
Which Snowflake edition is required to use clustering keys?

- A) Standard Edition
- B) Enterprise Edition or higher
- C) Business Critical only
- D) Any edition

<details>
<summary>Show Answer</summary>

**Answer: B) Enterprise Edition or higher**

Clustering keys and Automatic Clustering are Enterprise Edition features. Standard Edition relies on natural clustering only.

</details>

### Question 10
A table has 100 million rows and is queried 3 times per day with the same date filter. Is clustering recommended?

- A) Yes, always cluster large tables
- B) No, query frequency is too low to justify reclustering costs
- C) Yes, but only with Search Optimization
- D) No, clustering only works on small tables

<details>
<summary>Show Answer</summary>

**Answer: B) No, query frequency is too low to justify reclustering costs**

Clustering incurs ongoing compute and storage costs for maintenance. With only 3 queries per day, the cost of reclustering likely exceeds the performance benefit. Clustering is most valuable for frequently queried tables.

</details>

---

## Quick Reference Card

### Micro-Partition Facts
```
Size: 50-500 MB uncompressed
Storage: Columnar format
Encryption: AES-256
Management: Fully automatic
Metadata: Min/max values, distinct counts, nulls
```

### Pruning Metrics
```
Partitions scanned: Actual partitions read
Partitions total: All partitions in table
Efficiency = 1 - (scanned/total)
Goal: scanned << total
```

### Clustering Metrics
```
SYSTEM$CLUSTERING_DEPTH: Returns average depth only
SYSTEM$CLUSTERING_INFORMATION: Returns comprehensive JSON

Depth interpretation:
  1 = Optimal
  1-5 = Well clustered
  5-10 = Moderate
  10+ = Poor
```

### Query Patterns
```
ENABLE pruning:
  - Equality: WHERE col = value
  - Range: WHERE col BETWEEN a AND b
  - IN list: WHERE col IN (a, b, c)

PREVENT pruning:
  - Functions: WHERE YEAR(col) = 2024
  - Expressions: WHERE col * 2 > 100
  - Leading wildcard: WHERE col LIKE '%abc'
```

### Key SQL Commands
```sql
-- Check clustering depth
SELECT SYSTEM$CLUSTERING_DEPTH('table', '(column)');

-- Get full clustering info
SELECT SYSTEM$CLUSTERING_INFORMATION('table', '(col1, col2)');

-- Define clustering key
ALTER TABLE t CLUSTER BY (col1, col2);

-- Suspend/resume automatic clustering
ALTER TABLE t SUSPEND RECLUSTER;
ALTER TABLE t RESUME RECLUSTER;

-- Remove clustering key
ALTER TABLE t DROP CLUSTERING KEY;
```

### Edition Requirements
```
Standard: Natural clustering only
Enterprise+: Clustering keys, Automatic Clustering, Search Optimization
```

---

*Last Updated: January 2026*
*Source: Official Snowflake Documentation*
