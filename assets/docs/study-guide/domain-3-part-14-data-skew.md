# Domain 3: Performance Concepts
## Part 14: Data Skew and Distribution

**Exam Weight:** This topic is part of Domain 3 (10-15% of exam)

---

## Overview

Data skew and distribution issues are critical performance considerations in Snowflake. Understanding how data is distributed across micro-partitions, recognizing skew in the Query Profile, and knowing mitigation strategies are essential for the SnowPro Core exam and real-world optimization.

---

## Section 1: Understanding Data Distribution in Snowflake

### How Snowflake Distributes Data

Snowflake automatically distributes data across micro-partitions when data is loaded:

| Aspect | Behavior |
|--------|----------|
| **Partition Size** | 50-500 MB uncompressed per micro-partition |
| **Distribution Method** | Based on insertion order (natural clustering) |
| **Column Storage** | Columnar format within each partition |
| **Metadata** | Min/max values, distinct counts stored per partition |

### Natural Data Distribution

When data is loaded into Snowflake tables:

1. Rows are grouped into micro-partitions (50-500 MB each)
2. Columns are stored independently within partitions
3. Metadata is collected for query pruning
4. Natural clustering reflects the load order

**Well-distributed data characteristics:**
- Uniform partition sizes
- Balanced workload during parallel query execution
- Efficient partition pruning
- Minimal overlap in value ranges across partitions

### What Causes Data Distribution Issues?

| Cause | Description | Impact |
|-------|-------------|--------|
| **Skewed values** | One or few values dominate the dataset | Uneven partition scanning |
| **Poor join keys** | Keys with many-to-many relationships | Exploding joins |
| **DML over time** | Frequent updates/deletes | Degraded clustering |
| **Uneven loading** | Inconsistent batch sizes | Variable partition utilization |

---

## Section 2: What is Data Skew?

### Definition

**Data skew** occurs when data is not evenly distributed across the processing resources (workers) during query execution. This results in some workers handling significantly more data than others, creating bottlenecks.

### Types of Skew

| Skew Type | Description | Example |
|-----------|-------------|---------|
| **Value Skew** | One or few values appear disproportionately often | 90% of orders from one region |
| **Partition Skew** | Some micro-partitions are much larger than others | Rarely occurs in Snowflake due to uniform partitioning |
| **Join Skew** | Uneven matching during join operations | One key matches millions of rows |
| **Processing Skew** | Workers receive uneven amounts of work | Some workers finish while others are still processing |

### Why Micro-Partitioning Reduces Traditional Skew

Snowflake's micro-partitioning design inherently prevents some types of skew:

```
Traditional Partitioning:
Partition A: 10 GB (DATE = 2024-01-01)
Partition B: 500 MB (DATE = 2024-01-02)
Partition C: 25 GB (DATE = 2024-01-03)  <- SKEWED

Snowflake Micro-partitions:
MP1: 100 MB (DATE values: 2024-01-01 to 2024-01-03)
MP2: 100 MB (DATE values: 2024-01-01 to 2024-01-03)
MP3: 100 MB (DATE values: 2024-01-01 to 2024-01-03)
... uniform sizes throughout
```

**Key Benefit:** Micro-partitions can overlap in value ranges, allowing uniform sizes even with skewed data distributions.

---

## Section 3: Identifying Data Skew in Query Profile

### Query Profile Overview

The Query Profile is your primary tool for identifying skew and distribution issues. Access it through:

1. **Snowsight:** Query History > Select Query > Query Profile tab
2. **Classic Console:** History > Query Profile

### Key Metrics to Examine

#### Statistics Pane - Pruning Section

| Metric | Description | Skew Indicator |
|--------|-------------|----------------|
| **Partitions scanned** | Number of partitions read | High ratio to total indicates poor pruning |
| **Partitions total** | Total partitions in table | Reference baseline |

```
Good Pruning (no skew concern):
Partitions scanned: 85
Partitions total: 12,500
Ratio: 0.68%

Poor Pruning (potential skew):
Partitions scanned: 11,200
Partitions total: 12,500
Ratio: 89.6%
```

#### Statistics Pane - Spilling Section

| Metric | Description | Skew Indicator |
|--------|-------------|----------------|
| **Bytes spilled to local storage** | Data that didn't fit in memory, spilled to local SSD | Processing or memory skew |
| **Bytes spilled to remote storage** | Data spilled to remote cloud storage | Severe memory constraints |

**Critical:** Remote spillage significantly impacts performance and often indicates data distribution problems.

#### Operator Node Analysis

In the execution plan, examine:

1. **TableScan operators:** Check partitions scanned vs total
2. **Join operators:** Compare input rows to output rows
3. **Aggregate operators:** Look for unexpected row counts
4. **Most Expensive Nodes pane:** Identify bottlenecks

### Identifying Skew Patterns

**Pattern 1: Uneven TableScan Times**
```
TableScan [1]: 2% of query time
TableScan [2]: 45% of query time  <- Potential skew
TableScan [3]: 3% of query time
```

**Pattern 2: Disproportionate Row Counts**
```
Join Input (left): 1,000,000 rows
Join Input (right): 500,000 rows
Join Output: 500,000,000 rows  <- EXPLODING JOIN
```

**Pattern 3: Spillage Present**
```
Bytes spilled to local storage: 2.5 GB
Bytes spilled to remote storage: 15 GB  <- SEVERE ISSUE
```

---

## Section 4: Exploding Joins

### What is an Exploding Join?

An **exploding join** occurs when a join operation produces significantly more rows than the input tables contain. This happens when:

- Join condition matches rows in a many-to-many relationship
- Join condition is missing (cross join)
- Join condition is too broad or incorrect

### Types of Exploding Joins

| Type | Cause | Result |
|------|-------|--------|
| **Cross Join (Cartesian Product)** | No join condition | All rows x All rows |
| **Many-to-Many Join** | Non-unique keys on both sides | Multiplicative row count |
| **Duplicate Key Join** | Unexpected duplicates in data | More matches than expected |

### Identifying Exploding Joins in Query Profile

**Query Insights pane alerts:**
- `QUERY_INSIGHT_JOIN_WITH_NO_JOIN_CONDITION`
- `QUERY_INSIGHT_INEFFICIENT_JOIN_CONDITION`
- `QUERY_INSIGHT_EXPLODING_JOIN`
- `QUERY_INSIGHT_NESTED_EXPLODING_JOIN`

**Join operator statistics to examine:**

```
Normal Join:
Input rows (left): 1,000,000
Input rows (right): 500,000
Output rows: 950,000  <- Reasonable

Exploding Join:
Input rows (left): 1,000,000
Input rows (right): 500,000
Output rows: 50,000,000,000  <- 50 BILLION (Explosion!)
```

### Cross Join (Cartesian Product) Example

```sql
-- Accidental cross join (missing join condition)
SELECT a.*, b.*
FROM orders a, customers b;  -- NO join condition = cross join

-- Explicit cross join (sometimes intentional)
SELECT a.*, b.*
FROM orders a CROSS JOIN customers b;

-- Result: orders (1M rows) x customers (100K rows) = 100 BILLION rows!
```

### Many-to-Many Join Example

```sql
-- Both tables have duplicate keys
-- orders: multiple orders per customer
-- order_items: multiple items per order

SELECT *
FROM orders o
JOIN order_items i ON o.date = i.date;  -- date is not unique!

-- If 1000 orders on 2024-01-01 and 5000 items on same date:
-- Result for that date alone: 1000 x 5000 = 5,000,000 rows
```

---

## Section 5: Causes of Performance Issues from Skew

### Impact of Data Skew on Query Execution

| Issue | Cause | Symptom |
|-------|-------|---------|
| **Worker Imbalance** | One worker gets most data | Query waits for slowest worker |
| **Memory Pressure** | Large intermediate results | Spillage to storage |
| **Network Overhead** | Redistributing skewed data | High "Bytes sent over network" |
| **Resource Waste** | Other workers idle waiting | Low overall utilization |

### Spilling: The Memory Overflow Problem

When intermediate results don't fit in memory:

```
Stage 1: Local Spillage
- Data spills to local SSD
- Moderate performance impact
- Common with large aggregations

Stage 2: Remote Spillage
- Data spills to cloud storage (S3/Azure Blob/GCS)
- SEVERE performance impact
- Indicates need for optimization
```

**Query Profile indicators:**
- **Bytes spilled to local storage** > 0: Memory pressure
- **Bytes spilled to remote storage** > 0: Critical performance issue

### Inefficient Pruning from Poor Distribution

When data isn't well-distributed by query filters:

```
Query: SELECT * FROM orders WHERE region = 'US'

Well-clustered (good distribution):
- 'US' data in partitions 1-100
- Scans: 100 partitions (5%)
- Fast execution

Poorly-clustered (bad distribution):
- 'US' data scattered across all partitions
- Scans: 2000 partitions (100%)
- Slow execution
```

---

## Section 6: Mitigation Strategies

### Strategy 1: Improve Join Conditions

**Problem:** Missing or inefficient join conditions

**Solution:** Add proper join predicates

```sql
-- Before: Accidental cross join
SELECT a.*, b.*
FROM table_a a, table_b b
WHERE a.date = '2024-01-01';

-- After: Proper join condition
SELECT a.*, b.*
FROM table_a a
JOIN table_b b ON a.id = b.a_id
WHERE a.date = '2024-01-01';
```

### Strategy 2: Filter Before Joining

**Problem:** Large intermediate results from joins

**Solution:** Apply filters early using subqueries or CTEs

```sql
-- Before: Filter applied after join
SELECT *
FROM large_table a
JOIN huge_table b ON a.key = b.key
WHERE a.date = '2024-01-01';

-- After: Filter in subquery (early filtering)
SELECT *
FROM (SELECT * FROM large_table WHERE date = '2024-01-01') a
JOIN huge_table b ON a.key = b.key;
```

### Strategy 3: Use Clustering Keys

**Problem:** Poor natural clustering causing scan inefficiency

**Solution:** Define clustering keys on frequently filtered columns

```sql
-- Add clustering key for common filter columns
ALTER TABLE orders CLUSTER BY (region, order_date);

-- Verify clustering improvement
SELECT SYSTEM$CLUSTERING_DEPTH('orders', '(region, order_date)');
```

### Strategy 4: Use a Larger Warehouse

**Problem:** Memory pressure causing spillage

**Solution:** Increase warehouse size for more memory

```sql
-- Scale up for memory-intensive queries
ALTER WAREHOUSE my_wh SET WAREHOUSE_SIZE = 'LARGE';

-- Scale back down after query
ALTER WAREHOUSE my_wh SET WAREHOUSE_SIZE = 'SMALL';
```

| Warehouse Size | Memory (approx.) | Use Case |
|----------------|------------------|----------|
| X-Small | 8 GB | Simple queries |
| Small | 16 GB | Standard workloads |
| Medium | 32 GB | Moderate complexity |
| Large | 64 GB | Heavy joins/aggregations |
| X-Large+ | 128 GB+ | Very large datasets |

### Strategy 5: Process Data in Smaller Batches

**Problem:** Single query processes too much data

**Solution:** Break into smaller, manageable batches

```sql
-- Instead of processing all at once:
SELECT * FROM huge_table WHERE processing_needed = TRUE;

-- Process in batches:
SELECT * FROM huge_table
WHERE processing_needed = TRUE
  AND batch_id BETWEEN 1 AND 1000;

-- Then next batch:
SELECT * FROM huge_table
WHERE processing_needed = TRUE
  AND batch_id BETWEEN 1001 AND 2000;
```

### Strategy 6: Address Duplicate/Skewed Keys

**Problem:** Join keys have unexpected duplicates

**Solution:** Deduplicate or add additional join conditions

```sql
-- Identify duplicates
SELECT join_key, COUNT(*) as cnt
FROM table_a
GROUP BY join_key
HAVING COUNT(*) > 1
ORDER BY cnt DESC
LIMIT 10;

-- Option 1: Deduplicate
WITH deduped AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY key ORDER BY ts DESC) rn
    FROM table_a
)
SELECT * FROM deduped WHERE rn = 1;

-- Option 2: Add more join conditions to be more specific
SELECT *
FROM table_a a
JOIN table_b b ON a.key = b.key AND a.date = b.date;
```

### Strategy 7: Avoid UNION When UNION ALL Suffices

**Problem:** UNION removes duplicates unnecessarily

**Solution:** Use UNION ALL when duplicates aren't a concern

```sql
-- UNION performs expensive deduplication
SELECT * FROM table_a
UNION
SELECT * FROM table_b;

-- UNION ALL is faster (no deduplication)
SELECT * FROM table_a
UNION ALL
SELECT * FROM table_b;
```

---

## Section 7: Query Insights for Automatic Detection

### Available Query Insights

Snowflake automatically detects common issues and surfaces them in Query Profile:

| Insight Code | Issue | Recommendation |
|--------------|-------|----------------|
| `QUERY_INSIGHT_JOIN_WITH_NO_JOIN_CONDITION` | Cross join detected | Add join condition |
| `QUERY_INSIGHT_INEFFICIENT_JOIN_CONDITION` | Complex condition after join | Simplify condition |
| `QUERY_INSIGHT_EXPLODING_JOIN` | Join produces many more rows | Review join condition |
| `QUERY_INSIGHT_NESTED_EXPLODING_JOIN` | Nested exploding joins | Review child join conditions |
| `QUERY_INSIGHT_REMOTE_SPILLAGE` | Data spilled to remote storage | Use larger warehouse or optimize |

### Accessing Query Insights Programmatically

```sql
-- Query the QUERY_INSIGHTS view
SELECT
    query_id,
    insight_type,
    insight_message,
    recommendation
FROM snowflake.account_usage.query_insights
WHERE query_id = '<your_query_id>';
```

---

## Section 8: Exam Tips and Common Question Patterns

### Common Exam Question Types

**1. Identifying Skew in Query Profile**

Q: Which Query Profile statistic indicates data skew causing memory issues?
- A: Bytes spilled to remote storage

Q: What does it mean when "Partitions scanned" is nearly equal to "Partitions total"?
- A: Poor partition pruning, likely due to poor clustering or missing filters

**2. Exploding Joins**

Q: A join produces 10 billion rows from two tables with 1 million rows each. What is this called?
- A: Exploding join (or Cartesian product if no join condition)

Q: What Query Insight indicates a join is producing too many rows?
- A: QUERY_INSIGHT_EXPLODING_JOIN

**3. Mitigation Strategies**

Q: How do you reduce remote spillage for memory-intensive queries?
- A: Use a larger warehouse size, or process data in smaller batches

Q: What is the most efficient way to combine two result sets when duplicates don't matter?
- A: UNION ALL (avoids expensive deduplication)

**4. Understanding Micro-Partition Benefits**

Q: How does Snowflake's micro-partitioning help prevent data skew?
- A: Uniform partition sizes (50-500 MB) and overlapping value ranges prevent disproportionate partition sizes

### Memory Aids

**"Exploding = Bad"** - If join output >> input rows, there's a problem

**"Remote Spill = Red Alert"** - Remote spillage is a critical performance issue

**"Prune Before Join"** - Filter data early to reduce join input size

**"UNION ALL for Speed"** - Use UNION ALL unless deduplication is specifically needed

**"Larger WH = More Memory"** - Scaling up warehouse size increases available memory

### Quick Reference: Query Profile Locations

| Metric | Pane Location |
|--------|---------------|
| Partitions scanned/total | Statistics > Pruning |
| Bytes spilled | Statistics > Spilling |
| Join row counts | Operator node details |
| Performance recommendations | Query Insights |
| Most time-consuming operations | Most Expensive Nodes |

---

## Section 9: Practical Examples

### Example 1: Diagnosing an Exploding Join

**Scenario:** Query runs for 2 hours and consumes excessive resources

**Query:**
```sql
SELECT *
FROM orders o
JOIN order_details d ON o.order_date = d.order_date;
```

**Query Profile Analysis:**
- Join operator shows: Input 10M rows, Output 500B rows
- Query Insight: QUERY_INSIGHT_EXPLODING_JOIN

**Root Cause:** Order_date is not a unique key; many orders share the same date

**Solution:**
```sql
SELECT *
FROM orders o
JOIN order_details d ON o.order_id = d.order_id;  -- Use unique key
```

### Example 2: Addressing Remote Spillage

**Scenario:** Query shows "Bytes spilled to remote storage: 50 GB"

**Analysis:**
- Large aggregation on 10 TB table
- Medium warehouse insufficient memory

**Solutions:**
1. Scale up warehouse:
```sql
ALTER WAREHOUSE my_wh SET WAREHOUSE_SIZE = 'X-LARGE';
```

2. Or process in batches:
```sql
-- Process by month instead of all at once
SELECT region, SUM(amount)
FROM sales
WHERE sale_date BETWEEN '2024-01-01' AND '2024-01-31'
GROUP BY region;
```

### Example 3: Poor Partition Pruning

**Scenario:** Table has clustering key on (region, date) but queries on date only

**Query Profile:**
- Partitions scanned: 95,000
- Partitions total: 100,000 (95% scanned)

**Root Cause:** Clustering key order is (region, date) but queries filter on date without region

**Solutions:**

1. Change clustering key order:
```sql
ALTER TABLE sales CLUSTER BY (date, region);  -- Date first
```

2. Or add region filter to queries:
```sql
SELECT * FROM sales WHERE date = '2024-01-01' AND region IN ('US', 'EU');
```

---

## Section 10: Summary Tables

### Skew Indicators Quick Reference

| Indicator | Location | What It Means |
|-----------|----------|---------------|
| High Partitions scanned ratio | Statistics > Pruning | Poor clustering/filtering |
| Remote spillage > 0 | Statistics > Spilling | Critical memory issue |
| Join output >> inputs | Join operator | Exploding join |
| One node much slower | Most Expensive Nodes | Processing skew |
| Query Insights warnings | Query Insights pane | Automatic detection of issues |

### Mitigation Strategy Quick Reference

| Problem | Primary Solution | Secondary Solutions |
|---------|------------------|---------------------|
| Exploding joins | Fix join condition | Add filters, deduplicate keys |
| Remote spillage | Larger warehouse | Batch processing, optimize query |
| Poor pruning | Clustering keys | Add filter predicates |
| UNION overhead | Use UNION ALL | Review if dedup needed |
| Memory pressure | Scale up warehouse | Reduce data volume |

### Join Types and Row Behavior

| Join Type | Row Behavior | Risk Level |
|-----------|--------------|------------|
| INNER JOIN | Matching rows only | Low (with good key) |
| LEFT/RIGHT OUTER | All from one side | Low-Medium |
| FULL OUTER | All from both sides | Medium |
| CROSS JOIN | All x All | HIGH (always explodes) |

---

## Practice Questions

1. A query's Query Profile shows "Bytes spilled to remote storage: 25 GB". What is the most immediate solution?

<details>
<summary>Show Answer</summary>

**Answer:** Increase the warehouse size to provide more memory for the query
</details>

2. A join between a 5 million row table and a 2 million row table produces 10 billion rows. What type of problem is this?

<details>
<summary>Show Answer</summary>

**Answer:** An exploding join, likely caused by a many-to-many relationship on the join key
</details>

3. What Query Insight indicates a missing join condition?

<details>
<summary>Show Answer</summary>

**Answer:** QUERY_INSIGHT_JOIN_WITH_NO_JOIN_CONDITION
</details>

4. How does Snowflake's micro-partitioning help prevent partition skew compared to traditional partitioning?

<details>
<summary>Show Answer</summary>

**Answer:** Micro-partitions have uniform sizes (50-500 MB) and can have overlapping value ranges, preventing the disproportionate partition sizes common in traditional partitioning
</details>

5. A table is clustered on (customer_id, order_date). Queries that filter only on order_date show poor pruning. Why?

<details>
<summary>Show Answer</summary>

**Answer:** The clustering key has customer_id first, so the data is primarily organized by customer_id. Queries filtering only on order_date cannot efficiently prune because order_date values are scattered across partitions organized by customer_id
</details>

6. What is the difference between local spillage and remote spillage in terms of performance impact?

<details>
<summary>Show Answer</summary>

**Answer:** Local spillage (to SSD) has moderate performance impact, while remote spillage (to cloud storage) has severe performance impact due to much higher latency accessing remote storage
</details>
