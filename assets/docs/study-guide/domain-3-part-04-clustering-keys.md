# Domain 3: Performance Concepts
## Part 4: Clustering Keys and Pruning

**Exam Weight:** This topic is part of Domain 3 (10-15% of exam)

---

## Overview

Clustering is Snowflake's mechanism for organizing data within micro-partitions to optimize query performance through partition pruning. Understanding when to use clustering keys, how to select them, and how to interpret clustering metrics is essential for the SnowPro Core exam.

---

## Section 1: Micro-Partitions and Natural Clustering

### What are Micro-Partitions?

All data in Snowflake tables is automatically divided into micro-partitions, which are contiguous units of storage with the following characteristics:

| Property | Value |
|----------|-------|
| **Size (uncompressed)** | 50 MB to 500 MB |
| **Actual stored size** | Smaller due to compression |
| **Organization** | Columnar within each partition |
| **Management** | Fully automatic (no user maintenance) |

### Metadata Maintained for Micro-Partitions

Snowflake stores metadata for each micro-partition, including:

- **Range of values** for each column (min/max)
- **Number of distinct values** for each column
- **NULL count** and other statistics

This metadata enables **partition pruning** - Snowflake's ability to skip reading micro-partitions that cannot contain relevant data.

### Benefits of Micro-Partitioning vs Traditional Partitioning

| Traditional Partitioning | Snowflake Micro-Partitioning |
|--------------------------|------------------------------|
| Manually defined | Automatically derived |
| Large partitions | Small (50-500 MB), fine-grained |
| Requires maintenance | No user maintenance |
| Prone to data skew | Uniform size prevents skew |
| Static boundaries | Dynamic, overlapping ranges allowed |

### Natural Clustering

**Definition:** The inherent ordering of data based on how it was loaded/inserted.

- Data loaded in order (e.g., by date) is naturally clustered on that dimension
- Works well for tables loaded chronologically
- Over time, DML operations (INSERT, UPDATE, DELETE, MERGE) can degrade natural clustering
- Tables with multi-terabyte (TB) data and heavy DML are most susceptible to degradation

---

## Section 2: What is Data Clustering?

### The Concept

Data clustering in Snowflake refers to how well data is organized (co-located) within micro-partitions based on specific columns.

**Well-clustered data:**
- Similar values are stored together in the same or nearby micro-partitions
- Enables efficient partition pruning during queries
- Reduces the number of partitions that must be scanned

**Poorly-clustered data:**
- Similar values are scattered across many micro-partitions
- Queries must scan more partitions to find matching data
- Results in longer query times and higher resource consumption

### Clustering Depth

**Definition:** The average depth of overlapping micro-partitions for specified columns.

| Depth Value | Meaning |
|-------------|---------|
| **0** | Empty table (no data) |
| **1** | Best possible - minimal overlap, excellent clustering |
| **2-3** | Good clustering |
| **Higher values** | Worse clustering - more overlap, more scanning required |

### Clustering Depth Illustrated

Consider 5 micro-partitions with values ranging from A to Z:

```
DEPTH 5 (worst):
MP1: A-----------Z    All partitions
MP2: A-----------Z    overlap completely
MP3: A-----------Z    Query for 'M' must
MP4: A-----------Z    scan ALL partitions
MP5: A-----------Z

DEPTH 3 (moderate):
MP1: A----F           Some overlap
MP2:   C------J       Query for 'M' scans
MP3:      F-----M     3 partitions
MP4:         K-----R
MP5:            O---Z

DEPTH 1 (best - constant state):
MP1: A---E            No overlap
MP2:      F---J       Query for 'M' scans
MP3:         K---O    only 1 partition
MP4:            P---T
MP5:               U-Z
```

### Constant State

**Definition:** When micro-partitions have no overlap in their value ranges, they are in a "constant state" and cannot be improved further by clustering.

- Constant state partitions are excluded from reclustering calculations
- In real tables with millions of partitions, achieving constant state across all partitions is not expected or necessary

---

## Section 3: Clustering Keys

### What is a Clustering Key?

A clustering key is a subset of columns (or expressions on columns) explicitly designated to co-locate data in micro-partitions.

```sql
-- Define clustering key at table creation
CREATE TABLE orders (
    order_id NUMBER,
    order_date DATE,
    customer_id NUMBER,
    region VARCHAR,
    amount NUMBER
) CLUSTER BY (order_date, region);

-- Add clustering key to existing table
ALTER TABLE orders CLUSTER BY (order_date, region);

-- View clustering key
SHOW TABLES LIKE 'orders';
-- Check the cluster_by column in the output
```

### When to Use Clustering Keys

Clustering keys are **NOT intended for all tables**. Use them when:

| Criterion | Guideline |
|-----------|-----------|
| **Table size** | Multi-terabyte (TB) tables with many micro-partitions |
| **Query patterns** | Queries frequently filter on specific columns |
| **Query frequency** | Table is queried often (benefits compound) |
| **DML frequency** | Table changes infrequently (lower maintenance cost) |
| **Natural clustering degradation** | Clustering depth is large |

### When NOT to Use Clustering Keys

- Small tables (minimal benefit, unnecessary cost)
- Tables with very frequent DML (high reclustering cost)
- Tables where queries don't filter on predictable columns
- Tables already well-clustered naturally

---

## Section 4: Strategies for Selecting Clustering Keys

### General Recommendations

| Guideline | Explanation |
|-----------|-------------|
| **2-4 columns maximum** | Diminishing returns beyond 3-4 columns |
| **Filter columns first** | Prioritize columns used in WHERE clauses |
| **JOIN columns second** | Consider columns used in JOIN predicates |
| **Moderate cardinality** | Not too low, not too high |
| **Order by cardinality** | Low cardinality columns BEFORE high cardinality |

### Cardinality Considerations

**Cardinality** = number of distinct values in a column

| Cardinality Level | Example | Clustering Suitability |
|-------------------|---------|------------------------|
| **Very Low** | IS_ACTIVE (2 values) | Poor - minimal pruning benefit |
| **Low-Moderate** | REGION (10-100 values) | Good candidate |
| **Moderate-High** | DATE (365-3650 values) | Good candidate |
| **Very High** | TIMESTAMP_NS (millions) | Poor - expensive to maintain |
| **Unique** | ORDER_ID (all unique) | Poor - cost exceeds benefit |

### High Cardinality Solutions

For columns with very high cardinality, use expressions to reduce distinct values:

```sql
-- Instead of clustering on nanosecond timestamp:
CREATE TABLE events CLUSTER BY (event_timestamp); -- Bad: too many values

-- Truncate to date or hour:
CREATE TABLE events CLUSTER BY (TO_DATE(event_timestamp)); -- Good

-- Or truncate to hour:
CREATE TABLE events CLUSTER BY (DATE_TRUNC('HOUR', event_timestamp)); -- Good
```

### Column Order in Multi-Column Clustering Keys

**Rule:** Order columns from **lowest cardinality to highest cardinality**

```sql
-- Good: region (low) before date (higher)
ALTER TABLE orders CLUSTER BY (region, order_date);

-- Less effective: date (higher) before region (lower)
ALTER TABLE orders CLUSTER BY (order_date, region);
```

**Reason:** Higher cardinality in the first position reduces the effectiveness of clustering on subsequent columns.

### VARCHAR Column Behavior

**Important:** Clustering on VARCHAR columns only uses the **first 5 bytes** (approximately 5-6 characters).

```sql
-- If all values start with "PRODUCT_":
-- Values like "PRODUCT_A123" and "PRODUCT_B456" look identical for clustering

-- Solution: Use substring starting after common prefix
ALTER TABLE products CLUSTER BY (SUBSTRING(product_code, 9, 10));
```

### Expressions in Clustering Keys

Clustering keys can include expressions, not just columns:

```sql
-- Cluster by expressions
CREATE TABLE events CLUSTER BY (
    TO_DATE(event_timestamp),
    UPPER(category)
);

-- Cluster by paths in VARIANT columns
CREATE TABLE json_data CLUSTER BY (
    data:"region"::STRING,
    data:"date"::DATE
);
```

**Note:** GEOGRAPHY, VARIANT, OBJECT, and ARRAY types cannot be used directly but can be used via expressions.

---

## Section 5: Clustering Information Functions

### SYSTEM$CLUSTERING_DEPTH

Returns a single number representing the average clustering depth.

```sql
-- For table with explicit clustering key
SELECT SYSTEM$CLUSTERING_DEPTH('my_table');

-- For specific columns (even without clustering key defined)
SELECT SYSTEM$CLUSTERING_DEPTH('my_table', '(col1, col2)');
```

**Interpreting Results:**

| Depth | Interpretation |
|-------|----------------|
| 0 | Empty table |
| 1-2 | Excellent clustering |
| 3-5 | Good clustering |
| 5-10 | Moderate - may benefit from clustering key |
| 10+ | Poor - likely needs clustering key |

### SYSTEM$CLUSTERING_INFORMATION

Returns detailed JSON with comprehensive clustering metrics.

```sql
-- For table's defined clustering key
SELECT SYSTEM$CLUSTERING_INFORMATION('my_table');

-- For specific columns
SELECT SYSTEM$CLUSTERING_INFORMATION('my_table', '(order_date, region)');
```

**JSON Output Fields:**

| Field | Description |
|-------|-------------|
| `cluster_by_keys` | The clustering key expression(s) |
| `total_partition_count` | Total micro-partitions in table |
| `total_constant_partition_count` | Partitions in constant state |
| `average_overlaps` | Average number of overlapping partitions |
| `average_depth` | Average clustering depth |
| `partition_depth_histogram` | Distribution of partition depths |

**Example Output:**

```json
{
  "cluster_by_keys": "LINEAR(order_date, region)",
  "total_partition_count": 12500,
  "total_constant_partition_count": 9850,
  "average_overlaps": 1.8,
  "average_depth": 2.1,
  "partition_depth_histogram": {
    "00000": 0,
    "00001": 9850,
    "00002": 1800,
    "00003": 650,
    "00004": 200
  }
}
```

**Histogram Interpretation:**
- `00001`: Partitions with depth 1 (constant state - best)
- `00002`: Partitions with depth 2
- Higher depths indicate more overlap

---

## Section 6: Partition Pruning

### How Partition Pruning Works

1. Query arrives with filter predicates (WHERE clause)
2. Snowflake checks micro-partition metadata (min/max values)
3. Partitions that cannot contain matching data are skipped
4. Only relevant partitions are scanned

### Pruning in Query Profile

Check query efficiency in the Query Profile:

| Metric | Location | Ideal |
|--------|----------|-------|
| **Partitions scanned** | TableScan operator | Low number |
| **Partitions total** | TableScan operator | Reference for ratio |
| **Pruning percentage** | Scanned/Total | Higher is better |

**Example:**
```
Partitions scanned: 85
Partitions total: 12,500
Pruning: 99.3% of partitions pruned
```

### Predicates that Enable Pruning

| Predicate Type | Example | Pruning Effective? |
|----------------|---------|-------------------|
| Equality | `WHERE region = 'US'` | Yes |
| Range | `WHERE date BETWEEN '2024-01-01' AND '2024-03-31'` | Yes |
| IN list | `WHERE region IN ('US', 'EU', 'APAC')` | Yes |
| IS NULL / IS NOT NULL | `WHERE col IS NULL` | Yes |
| LIKE (prefix) | `WHERE name LIKE 'ABC%'` | Yes |
| LIKE (contains) | `WHERE name LIKE '%ABC%'` | No (requires Search Optimization) |
| Subquery | `WHERE id IN (SELECT id FROM other)` | No |
| Functions on column | `WHERE UPPER(name) = 'ABC'` | Limited |

---

## Section 7: Reclustering and Automatic Clustering

### What is Reclustering?

Reclustering reorganizes data in micro-partitions according to the clustering key:

1. Identifies poorly clustered partitions
2. Reads affected rows
3. Physically regroups rows by clustering key values
4. Creates new micro-partitions
5. Deletes old micro-partitions (after Time Travel retention)

### Automatic Clustering

**Definition:** Snowflake's serverless service that automatically maintains clustering.

| Aspect | Behavior |
|--------|----------|
| **Triggering** | Automatic when beneficial |
| **Compute** | Serverless (no warehouse needed) |
| **Billing** | Serverless compute credits |
| **Transparency** | Non-blocking, runs in background |
| **Management** | No user intervention required |

### Managing Automatic Clustering

```sql
-- View automatic clustering status
SHOW TABLES LIKE 'my_table';
-- Check AUTO_CLUSTERING_ON column

-- Suspend automatic clustering (stops background maintenance)
ALTER TABLE my_table SUSPEND RECLUSTER;

-- Resume automatic clustering
ALTER TABLE my_table RESUME RECLUSTER;
```

### Credit and Storage Impact

| Cost Type | Impact |
|-----------|--------|
| **Compute credits** | Serverless credits for reclustering operations |
| **Storage** | New partitions created; old partitions retained for Time Travel |
| **Long-term storage** | After Time Travel + Fail-safe, storage normalizes |

### Estimating Automatic Clustering Costs

```sql
-- Estimate initial clustering cost
SELECT SYSTEM$ESTIMATE_AUTOMATIC_CLUSTERING_COSTS(
    'my_table',
    '(order_date, region)'
);
```

---

## Section 8: Defining and Managing Clustering Keys

### Creating a Clustered Table

```sql
-- At table creation
CREATE TABLE orders (
    order_id NUMBER,
    order_date DATE,
    customer_id NUMBER,
    region VARCHAR
) CLUSTER BY (order_date, region);
```

### Adding/Changing Clustering Key

```sql
-- Add clustering key to existing table
ALTER TABLE orders CLUSTER BY (order_date, region);

-- Change clustering key
ALTER TABLE orders CLUSTER BY (region, order_date, customer_id);
```

**Note:** Changing the clustering key:
- Does not immediately recluster existing data
- Triggers automatic clustering with new key over time
- May result in credit consumption

### Dropping Clustering Key

```sql
ALTER TABLE orders DROP CLUSTERING KEY;
```

**Effect:**
- Stops automatic reclustering
- Existing data organization is preserved (not reshuffled)
- Natural clustering from future loads applies

### Important Considerations

| Scenario | Behavior |
|----------|----------|
| **CLONE with clustering key** | Key is copied, but automatic clustering is SUSPENDED |
| **CTAS (CREATE TABLE AS SELECT)** | Clustering key is NOT copied |
| **After ALTER TABLE CLUSTER BY** | Existing data is reclustered gradually |

---

## Section 9: Key Exam Patterns and Tips

### Common Exam Question Types

**1. When to Use Clustering Keys**

Q: Which scenario would benefit most from a clustering key?
- A: Multi-terabyte table queried frequently with date range filters

Q: When should you NOT add a clustering key?
- A: Small tables, tables with constant DML, tables without predictable query patterns

**2. Clustering Key Selection**

Q: What is the recommended column order for clustering keys?
- A: Lowest cardinality to highest cardinality

Q: How many columns should a clustering key typically have?
- A: 3-4 maximum (more provides diminishing returns)

**3. Clustering Metrics**

Q: What does a clustering depth of 1 indicate?
- A: Excellent clustering - minimal partition overlap

Q: What function returns detailed clustering metrics as JSON?
- A: SYSTEM$CLUSTERING_INFORMATION

**4. Automatic Clustering**

Q: Does automatic clustering require a warehouse?
- A: No - it uses serverless compute resources

Q: How do you stop automatic clustering?
- A: ALTER TABLE table_name SUSPEND RECLUSTER

**5. Pruning**

Q: Which predicate does NOT benefit from partition pruning?
- A: Subqueries in WHERE clause, LIKE with leading wildcard

### Memory Aids

**"DEPTH = 1 is best"** - Remember that lower depth means better clustering (1 = minimal overlap)

**"Low-to-High Cardinality"** - Order clustering key columns from lowest to highest cardinality

**"TB Tables Only"** - Clustering keys are designed for multi-terabyte tables, not small tables

**"Automatic = Serverless"** - Automatic clustering runs on serverless resources, no warehouse needed

**"VARCHAR = 5 bytes"** - Only first 5 bytes of VARCHAR columns are used for clustering

### Quick Reference Commands

```sql
-- Check clustering depth (single number)
SELECT SYSTEM$CLUSTERING_DEPTH('table_name');
SELECT SYSTEM$CLUSTERING_DEPTH('table_name', '(col1, col2)');

-- Get detailed clustering info (JSON)
SELECT SYSTEM$CLUSTERING_INFORMATION('table_name');
SELECT SYSTEM$CLUSTERING_INFORMATION('table_name', '(col1, col2)');

-- Define clustering key
ALTER TABLE table_name CLUSTER BY (col1, col2);

-- Remove clustering key
ALTER TABLE table_name DROP CLUSTERING KEY;

-- Control automatic clustering
ALTER TABLE table_name SUSPEND RECLUSTER;
ALTER TABLE table_name RESUME RECLUSTER;

-- View clustering status
SHOW TABLES LIKE 'table_name';
```

---

## Section 10: Summary Comparison Tables

### Clustering vs No Clustering

| Aspect | Without Clustering Key | With Clustering Key |
|--------|------------------------|---------------------|
| Data organization | Natural (load order) | Explicitly defined |
| Maintenance | None | Automatic reclustering |
| Cost | No additional cost | Serverless compute + storage |
| Best for | Small tables, varied queries | Large tables, predictable queries |

### Natural vs Explicit Clustering

| Natural Clustering | Explicit Clustering (Keys) |
|-------------------|---------------------------|
| Based on data load order | Based on defined columns |
| Degrades with DML over time | Maintained automatically |
| Free (no extra cost) | Costs compute credits |
| Good for time-series data | Good for multi-dimensional queries |

### Clustering Functions Comparison

| Function | Returns | Use Case |
|----------|---------|----------|
| SYSTEM$CLUSTERING_DEPTH | Single number | Quick health check |
| SYSTEM$CLUSTERING_INFORMATION | JSON object | Detailed analysis |
| SYSTEM$ESTIMATE_AUTOMATIC_CLUSTERING_COSTS | Cost estimate | Planning/budgeting |

---

## Practice Questions

1. A table has 15 TB of sales data and is frequently queried by date and region. What is the recommended clustering key order?

<details>
<summary>Show Answer</summary>

**Answer:** `CLUSTER BY (region, sale_date)` - region (lower cardinality) before date (higher cardinality)
</details>

2. SYSTEM$CLUSTERING_DEPTH returns a value of 12 for a table. What does this indicate?

<details>
<summary>Show Answer</summary>

**Answer:** Poor clustering - high overlap between partitions; the table would benefit from a clustering key
</details>

3. What happens when you clone a table with a clustering key?

<details>
<summary>Show Answer</summary>

**Answer:** The clustering key is copied, but automatic clustering is suspended on the clone
</details>

4. Which type of WHERE clause predicate does NOT enable partition pruning?

<details>
<summary>Show Answer</summary>

**Answer:** Predicates with subqueries (e.g., `WHERE id IN (SELECT id FROM other_table)`)
</details>

5. How do you estimate the cost of adding a clustering key before implementation?

<details>
<summary>Show Answer</summary>

**Answer:** Use `SYSTEM$ESTIMATE_AUTOMATIC_CLUSTERING_COSTS('table', '(columns)')`
</details>
