# Domain 5: Data Transformations

## Part 16: Sampling and Estimation Functions

This section covers table sampling techniques and estimation functions in Snowflake. These features enable efficient data exploration, statistical analysis, and performance optimization when working with large datasets. Understanding sampling methods and approximate functions is essential for the SnowPro Core exam.

---

## 1. Table Sampling Overview

### 1.1 What Is Table Sampling?

**Table sampling** is a technique for randomly selecting a subset of rows from a table without reading the entire dataset. This is valuable for:

- **Data exploration**: Quickly preview large datasets
- **Development/testing**: Create representative subsets for testing
- **Statistical analysis**: Generate samples for statistical calculations
- **Machine learning**: Create training and test datasets
- **Performance optimization**: Reduce query execution time for exploratory work

**Key Characteristics:**
- Results are non-deterministic by default (different each execution)
- Can be made deterministic using SEED/REPEATABLE
- Works with both fraction-based and fixed-size approaches
- Significantly faster than scanning entire tables

### 1.2 Sampling Syntax

Snowflake supports two equivalent keywords for sampling:

```sql
-- Using SAMPLE keyword
SELECT * FROM table_name SAMPLE (percentage);

-- Using TABLESAMPLE keyword (SQL standard)
SELECT * FROM table_name TABLESAMPLE (percentage);
```

**Important:** `SAMPLE` and `TABLESAMPLE` are interchangeable and produce identical results.

---

## 2. Sampling Methods

### 2.1 ROW (BERNOULLI) Sampling

**ROW sampling** (also called BERNOULLI) applies probability independently to each row. Each row has the specified probability of being included in the result.

**Syntax:**
```sql
-- Using ROW keyword
SELECT * FROM orders SAMPLE ROW (10);

-- Using BERNOULLI keyword (equivalent)
SELECT * FROM orders SAMPLE BERNOULLI (10);
```

**Characteristics:**

| Aspect | Description |
|--------|-------------|
| **Randomness** | High - truly random row selection |
| **Granularity** | Row-level probability |
| **Performance** | Must examine every row (slower on very large tables) |
| **Result variance** | Higher variance in result count |
| **Best for** | Statistical sampling, ML train/test splits |

**How It Works:**
1. Snowflake iterates through each row
2. For each row, generates a random number (0-100)
3. If random number < specified percentage, includes the row
4. Result count varies around the expected percentage

**Example:**
```sql
-- Sample approximately 5% of customers
SELECT customer_id, name, signup_date
FROM customers
SAMPLE BERNOULLI (5);

-- With 1 million rows:
-- Expected: ~50,000 rows
-- Actual: Could be 48,000 to 52,000 (varies each execution)
```

### 2.2 BLOCK (SYSTEM) Sampling

**BLOCK sampling** (also called SYSTEM) applies probability to blocks of rows rather than individual rows. Entire micro-partitions are either included or excluded.

**Syntax:**
```sql
-- Using BLOCK keyword
SELECT * FROM orders SAMPLE BLOCK (10);

-- Using SYSTEM keyword (equivalent)
SELECT * FROM orders SAMPLE SYSTEM (10);
```

**Characteristics:**

| Aspect | Description |
|--------|-------------|
| **Randomness** | Lower - samples groups of rows together |
| **Granularity** | Micro-partition level |
| **Performance** | Faster on large tables (skips entire partitions) |
| **Result variance** | Higher variance, less uniform distribution |
| **Best for** | Quick estimates on very large tables |

**How It Works:**
1. Snowflake identifies micro-partitions in the table
2. For each micro-partition, decides include/exclude based on probability
3. Returns all rows from selected micro-partitions
4. Can be 10-100x faster than ROW sampling on billion-row tables

**Example:**
```sql
-- Sample approximately 1% of event logs (fast method)
SELECT event_type, COUNT(*) as count
FROM event_logs  -- Assume billions of rows
SAMPLE SYSTEM (1)
GROUP BY event_type;

-- Performance: May complete in seconds vs minutes for ROW sampling
```

### 2.3 Sampling Method Comparison

| Feature | ROW (BERNOULLI) | BLOCK (SYSTEM) |
|---------|-----------------|----------------|
| **Keyword aliases** | ROW, BERNOULLI | BLOCK, SYSTEM |
| **Selection unit** | Individual rows | Micro-partitions |
| **Randomness quality** | High (statistically uniform) | Lower (clustered) |
| **Performance** | Slower (reads all data) | Faster (skips partitions) |
| **Result distribution** | Even across table | May cluster by partition order |
| **Typical use case** | Statistical analysis, ML | Quick estimates, previews |
| **Small table behavior** | Works well | May return all or nothing |

**Decision Guide:**
```
Choose ROW (BERNOULLI) when:
- Statistical accuracy is important
- Creating ML training/test splits
- Table size is moderate (< 100M rows)
- Distribution uniformity matters

Choose BLOCK (SYSTEM) when:
- Speed is the priority
- Approximate results are acceptable
- Table is very large (> 1B rows)
- Quick data preview needed
```

---

## 3. Deterministic Sampling with Seeds

### 3.1 Using SEED and REPEATABLE

To make sampling reproducible across executions, use the SEED or REPEATABLE keyword **with BLOCK (SYSTEM) sampling only**:

```sql
-- Using SEED keyword (BLOCK/SYSTEM only)
SELECT * FROM customers SAMPLE BLOCK (10) SEED (42);

-- Using REPEATABLE keyword (equivalent)
SELECT * FROM customers SAMPLE SYSTEM (10) REPEATABLE (42);
```

**Important:**
- `SEED` and `REPEATABLE` are interchangeable
- **SEED only works with BLOCK/SYSTEM sampling, NOT with ROW/BERNOULLI**
- SEED is not supported for fixed-size sampling
- SEED is not supported on views or subqueries

**Characteristics:**
- Seed value must be an integer between 0 and 2,147,483,647 (inclusive)
- Same seed + same data = same sample
- Results may change if underlying data changes
- Useful for reproducible analysis and testing

**Example Use Cases:**
```sql
-- Reproducible sample using BLOCK with SEED
CREATE OR REPLACE TABLE sample_data AS
SELECT * FROM feature_table
SAMPLE BLOCK (80) SEED (12345);

-- Alternative: Hash-based deterministic split (works with any sampling)
CREATE OR REPLACE TABLE training_data AS
SELECT * FROM feature_table
WHERE ABS(HASH(record_id)) % 100 < 80;

-- Consistent test set (exclude training rows)
CREATE OR REPLACE TABLE test_data AS
SELECT * FROM feature_table
WHERE record_id NOT IN (SELECT record_id FROM training_data);

-- Reproducible A/B test control group using BLOCK sampling
SELECT customer_id
FROM customers
SAMPLE SYSTEM (10) SEED (2024)
WHERE region = 'NORTH';
```

### 3.2 Seed Behavior and Limitations

| Aspect | Behavior |
|--------|----------|
| **Same seed, same data** | Produces identical sample |
| **Same seed, different data** | Sample may differ |
| **Table copy with same seed** | May produce different sample |
| **With ROW/BERNOULLI sampling** | **NOT supported** |
| **With fixed-size sampling** | NOT supported |
| **With views or subqueries** | NOT supported |
| **Seed range** | 0 to 2,147,483,647 (inclusive) |

---

## 4. Fixed-Size Sampling

### 4.1 Specifying Exact Row Count

Instead of a percentage, you can specify an exact number of rows to return:

```sql
-- Return exactly 1000 rows
SELECT * FROM products SAMPLE (1000 ROWS);

-- Return exactly 100 rows for quick preview
SELECT * FROM logs SAMPLE (100 ROWS);
```

**Characteristics:**

| Aspect | Description |
|--------|-------------|
| **Row count** | Exact (not approximate) |
| **Range** | 0 to 1,000,000 rows |
| **Consistency** | Always returns specified count (if table has enough rows) |
| **SEED support** | NOT supported |
| **BLOCK support** | NOT supported |

### 4.2 Fixed-Size vs. Fraction-Based Comparison

| Feature | Fixed-Size | Fraction-Based |
|---------|------------|----------------|
| **Syntax** | `SAMPLE (N ROWS)` | `SAMPLE (P)` |
| **Result size** | Exact | Approximate |
| **Maximum** | 1,000,000 rows | No limit |
| **SEED support** | No | BLOCK/SYSTEM only |
| **BLOCK method** | No | Yes |
| **Predictability** | Consistent count | Variable count |
| **Best for** | Quick previews, fixed samples | Statistical sampling, ML |

**Example:**
```sql
-- Fixed-size: Always 500 rows
SELECT * FROM orders SAMPLE (500 ROWS);

-- Fraction-based: ~5% of rows (varies)
SELECT * FROM orders SAMPLE (5);

-- Cannot combine fixed-size with SEED (ERROR)
-- SELECT * FROM orders SAMPLE (500 ROWS) SEED (42);  -- Invalid!
```

---

## 5. Estimation Functions Overview

### 5.1 Why Use Estimation Functions?

Estimation functions provide **approximate results** that are significantly faster and use less memory than exact calculations. They are ideal when:

- Dataset is very large (billions of rows)
- Approximate results are acceptable
- Performance/cost is critical
- Real-time or interactive analytics required

**Trade-off:** Small accuracy loss for major performance gains (often 10-100x faster).

### 5.2 Types of Estimation Functions

Snowflake provides four categories of estimation functions:

| Category | Algorithm | Primary Function | Use Case |
|----------|-----------|------------------|----------|
| **Cardinality** | HyperLogLog | `HLL()`, `APPROX_COUNT_DISTINCT()` | Count unique values |
| **Similarity** | MinHash | `MINHASH()`, `APPROXIMATE_SIMILARITY()` | Compare dataset overlap |
| **Frequency** | Space-Saving | `APPROX_TOP_K()` | Find most common values |
| **Percentile** | t-Digest | `APPROX_PERCENTILE()` | Calculate percentile values |

---

## 6. Cardinality Estimation (HyperLogLog)

### 6.1 Overview

**HyperLogLog (HLL)** estimates the number of distinct values in a column. It is a state-of-the-art cardinality estimation algorithm capable of handling trillions of rows.

**Key Characteristics:**
- Average relative error: **~1.62%**
- Memory efficient: ~4KB per aggregation group (vs. unbounded for COUNT DISTINCT)
- Significantly faster than `COUNT(DISTINCT)` on large datasets
- Can estimate distinct counts in the range of 983,767 to 1,016,234 for a true count of 1,000,000

### 6.2 HyperLogLog Functions

| Function | Description |
|----------|-------------|
| `HLL(expr)` | Returns approximate distinct count |
| `APPROX_COUNT_DISTINCT(expr)` | Alias for HLL |
| `HLL_ACCUMULATE(expr)` | Returns HLL state (for combining) |
| `HLL_COMBINE(state)` | Merges multiple HLL states |
| `HLL_ESTIMATE(state)` | Computes count from HLL state |
| `HLL_EXPORT(state)` | Converts state to JSON OBJECT |
| `HLL_IMPORT(object)` | Converts JSON back to HLL state |

### 6.3 Basic Usage

```sql
-- Approximate count (fast)
SELECT APPROX_COUNT_DISTINCT(user_id) AS approx_users
FROM page_views;  -- Returns ~1,000,000

-- Exact count (slower, more memory)
SELECT COUNT(DISTINCT user_id) AS exact_users
FROM page_views;  -- Returns 1,000,000

-- HLL with GROUP BY
SELECT region,
       HLL(customer_id) AS unique_customers
FROM orders
GROUP BY region;
```

### 6.4 Advanced HLL: Pre-aggregation Pattern

The power of HLL is the ability to pre-compute and combine states:

```sql
-- Step 1: Pre-aggregate daily HLL states
CREATE OR REPLACE TABLE daily_uniques AS
SELECT
  visit_date,
  HLL_EXPORT(HLL_ACCUMULATE(source_ip)) AS hll_state
FROM page_views
GROUP BY visit_date;

-- Step 2: Combine states to get monthly uniques
SELECT
  DATE_TRUNC('month', visit_date) AS month,
  HLL_ESTIMATE(
    HLL_COMBINE(
      HLL_IMPORT(hll_state)
    )
  ) AS monthly_unique_ips
FROM daily_uniques
GROUP BY month;

-- Performance: Combines pre-computed states in seconds
-- vs. re-scanning raw data (minutes)
```

**Use Case:** Build rollup tables that can answer cardinality questions at different granularities without re-scanning raw data.

### 6.5 When to Use HLL vs. COUNT(DISTINCT)

```
Use APPROX_COUNT_DISTINCT / HLL when:
- Table has > 1 million rows
- Approximate result is acceptable (~1.6% error)
- Query performance is critical
- Multiple GROUP BY dimensions exist
- Building pre-aggregation tables

Use COUNT(DISTINCT) when:
- Exact count is required
- Table is small (< 1 million rows)
- Results will be used for precise reporting
- Compliance requires exact numbers
```

---

## 7. Similarity Estimation (MinHash)

### 7.1 Overview

**MinHash** estimates the **Jaccard similarity** between two or more datasets. The Jaccard index measures overlap:

```
J(A,B) = |A intersection B| / |A union B|
```

- **1.0** = identical sets
- **0.0** = no overlap
- **0.5** = 50% similarity

### 7.2 MinHash Functions

| Function | Description |
|----------|-------------|
| `MINHASH(k, expr)` | Generates MinHash state with k hash values |
| `MINHASH_COMBINE(state1, state2)` | Merges MinHash states |
| `APPROXIMATE_SIMILARITY(state)` | Computes Jaccard index from states |
| `APPROXIMATE_JACCARD_INDEX(state)` | Alias for APPROXIMATE_SIMILARITY |

**Parameter k:**
- Higher k = more accuracy but slower
- Maximum k = 1024
- Recommended: k = 100 for good balance

### 7.3 Basic Usage

```sql
-- Step 1: Generate MinHash states for each dataset
WITH states AS (
  SELECT 'Dataset_A' AS name,
         MINHASH(100, customer_id) AS mh_state
  FROM orders_2023
  UNION ALL
  SELECT 'Dataset_B' AS name,
         MINHASH(100, customer_id) AS mh_state
  FROM orders_2024
)
-- Step 2: Calculate similarity
SELECT APPROXIMATE_SIMILARITY(mh_state) AS similarity
FROM states;
-- Returns: 0.75 (75% customer overlap between years)
```

### 7.4 Comparing Multiple Datasets

```sql
-- Compare customer overlap across regions
WITH region_states AS (
  SELECT region,
         MINHASH(100, customer_id) AS mh_state
  FROM orders
  GROUP BY region
)
SELECT
  a.region AS region_1,
  b.region AS region_2,
  APPROXIMATE_SIMILARITY(a.mh_state, b.mh_state) AS similarity
FROM region_states a
CROSS JOIN region_states b
WHERE a.region < b.region
ORDER BY similarity DESC;
```

### 7.5 Use Cases for MinHash

- **Customer overlap analysis**: How many customers do two segments share?
- **Product catalog comparison**: Similarity between suppliers' catalogs
- **Data deduplication**: Identify near-duplicate records
- **A/B test validation**: Ensure test groups don't overlap
- **Market basket analysis**: Similar purchasing patterns

---

## 8. Frequency Estimation (APPROX_TOP_K)

### 8.1 Overview

**APPROX_TOP_K** uses the Space-Saving algorithm to estimate the most frequently occurring values in a column. It's ideal for finding "top N" patterns in large datasets.

### 8.2 Syntax and Parameters

```sql
APPROX_TOP_K(expr, k [, counters])
```

| Parameter | Description | Default |
|-----------|-------------|---------|
| **expr** | Column or expression to analyze | Required |
| **k** | Number of top values to return | Required |
| **counters** | Number of counters for accuracy | k * 3 |

**Counter Guidelines:**
- More counters = higher accuracy but more memory
- Maximum counters = 100,000
- Rule of thumb: counters = k * 10 for good accuracy

### 8.3 Basic Usage

```sql
-- Find top 10 most purchased products
SELECT APPROX_TOP_K(product_id, 10) AS top_products
FROM purchases;

-- Returns: ARRAY of objects
-- [{"value": "PROD_001", "count": 50234},
--  {"value": "PROD_002", "count": 48921}, ...]

-- With custom counter count for better accuracy
SELECT APPROX_TOP_K(product_id, 10, 10000) AS top_products
FROM purchases;
```

### 8.4 APPROX_TOP_K Family Functions

| Function | Description |
|----------|-------------|
| `APPROX_TOP_K(expr, k, counters)` | Returns top k frequent values |
| `APPROX_TOP_K_ACCUMULATE(expr, counters)` | Returns intermediate state |
| `APPROX_TOP_K_COMBINE(state)` | Merges multiple states |
| `APPROX_TOP_K_ESTIMATE(state, k)` | Estimates top k from combined state |

### 8.5 Use Cases

```sql
-- Trending hashtags in social data
SELECT APPROX_TOP_K(hashtag, 20, 5000) AS trending
FROM social_posts
WHERE post_time > DATEADD('hour', -1, CURRENT_TIMESTAMP());

-- Most common error codes
SELECT APPROX_TOP_K(error_code, 10) AS frequent_errors
FROM application_logs
WHERE log_date = CURRENT_DATE();

-- Top customer segments by activity
SELECT APPROX_TOP_K(customer_segment, 5) AS active_segments
FROM user_activity;
```

---

## 9. Percentile Estimation (APPROX_PERCENTILE)

### 9.1 Overview

**APPROX_PERCENTILE** uses the t-Digest algorithm to estimate percentile values. It calculates what value a certain percentage of data falls below.

**Key Characteristics:**
- Constant memory usage regardless of data size
- Suitable for large-scale percentile calculations
- Independent of the specific percentile requested
- Can query multiple percentiles from same state

### 9.2 Syntax

```sql
APPROX_PERCENTILE(expr, percentile)
```

| Parameter | Description | Range |
|-----------|-------------|-------|
| **expr** | Numeric column | Required |
| **percentile** | Desired percentile | 0.0 to 1.0 |

**Common Percentiles:**
- 0.5 = Median (50th percentile)
- 0.9 = 90th percentile (P90)
- 0.95 = 95th percentile (P95)
- 0.99 = 99th percentile (P99)

### 9.3 Basic Usage

```sql
-- Calculate P95 response time
SELECT APPROX_PERCENTILE(response_time_ms, 0.95) AS p95
FROM api_logs;

-- Multiple percentiles in one query
SELECT
  APPROX_PERCENTILE(response_time_ms, 0.5) AS median,
  APPROX_PERCENTILE(response_time_ms, 0.9) AS p90,
  APPROX_PERCENTILE(response_time_ms, 0.95) AS p95,
  APPROX_PERCENTILE(response_time_ms, 0.99) AS p99
FROM api_logs;

-- Compare with exact calculation
SELECT
  APPROX_PERCENTILE(amount, 0.5) AS approx_median,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY amount) AS exact_median
FROM transactions;
```

### 9.4 APPROX_PERCENTILE Family Functions

| Function | Description |
|----------|-------------|
| `APPROX_PERCENTILE(expr, p)` | Returns estimated percentile value |
| `APPROX_PERCENTILE_ACCUMULATE(expr)` | Returns t-Digest state |
| `APPROX_PERCENTILE_COMBINE(state)` | Merges t-Digest states |
| `APPROX_PERCENTILE_ESTIMATE(state, p)` | Estimates percentile from state |

### 9.5 Use Cases

```sql
-- SLA monitoring: Track P95 latency by endpoint
SELECT
  endpoint,
  APPROX_PERCENTILE(latency_ms, 0.95) AS p95_latency
FROM request_logs
WHERE request_time > DATEADD('hour', -1, CURRENT_TIMESTAMP())
GROUP BY endpoint
HAVING p95_latency > 500;  -- Alert on slow endpoints

-- Revenue analysis: Median transaction by segment
SELECT
  customer_segment,
  APPROX_PERCENTILE(transaction_amount, 0.5) AS median_transaction,
  APPROX_PERCENTILE(transaction_amount, 0.9) AS p90_transaction
FROM transactions
GROUP BY customer_segment;

-- Performance baseline: Calculate service level indicators
SELECT
  DATE_TRUNC('hour', event_time) AS hour,
  APPROX_PERCENTILE(processing_time, 0.5) AS p50,
  APPROX_PERCENTILE(processing_time, 0.95) AS p95,
  APPROX_PERCENTILE(processing_time, 0.99) AS p99
FROM job_metrics
GROUP BY hour
ORDER BY hour;
```

---

## 10. Estimation Function Comparison

### 10.1 Accuracy and Performance Summary

| Function | Algorithm | Typical Error | Speed Improvement | Memory Savings |
|----------|-----------|---------------|-------------------|----------------|
| `APPROX_COUNT_DISTINCT` | HyperLogLog | ~1.6% | 10-100x faster | ~4KB vs unbounded |
| `APPROXIMATE_SIMILARITY` | MinHash | ~3% (k=100) | 50-500x faster | Fixed per state |
| `APPROX_TOP_K` | Space-Saving | 5-10% | 5-50x faster | Bounded by counters |
| `APPROX_PERCENTILE` | t-Digest | 2-5% | 10-100x faster | Constant |

### 10.2 Decision Matrix

| Requirement | Recommended Function |
|-------------|---------------------|
| Count unique values | `APPROX_COUNT_DISTINCT()` / `HLL()` |
| Compare dataset overlap | `MINHASH()` + `APPROXIMATE_SIMILARITY()` |
| Find most common values | `APPROX_TOP_K()` |
| Calculate percentiles | `APPROX_PERCENTILE()` |
| Exact count required | `COUNT(DISTINCT)` |
| Exact percentile required | `PERCENTILE_CONT()` / `PERCENTILE_DISC()` |

---

## 11. Practical Scenarios

### 11.1 Machine Learning: Train/Test Split

```sql
-- Create reproducible 80/20 train/test split using BLOCK sampling with SEED
CREATE OR REPLACE TABLE ml_training AS
SELECT * FROM feature_data
SAMPLE BLOCK (80) SEED (42);

-- Alternative: Hash-based deterministic split (more common for ML)
-- This approach works regardless of sampling method
CREATE OR REPLACE TABLE ml_training_hash AS
SELECT * FROM feature_data
WHERE ABS(HASH(record_id)) % 100 < 80;

-- Test set excludes training rows
CREATE OR REPLACE TABLE ml_test AS
SELECT * FROM feature_data
WHERE record_id NOT IN (SELECT record_id FROM ml_training);

-- Verify split percentages
SELECT
  'training' AS dataset, COUNT(*) AS rows FROM ml_training
UNION ALL
SELECT
  'test' AS dataset, COUNT(*) AS rows FROM ml_test;
```

**Note:** SEED only works with BLOCK/SYSTEM sampling. For truly random but reproducible ML splits, hash-based methods are often preferred as they provide consistent results without the clustering effects of BLOCK sampling.

### 11.2 Quick Data Quality Check

```sql
-- Fast quality check on large table using BLOCK sampling
SELECT
  COUNT(*) AS sample_rows,
  COUNT(DISTINCT customer_id) AS unique_customers,
  AVG(order_total) AS avg_order,
  MIN(order_date) AS earliest_order,
  MAX(order_date) AS latest_order
FROM orders
SAMPLE BLOCK (1);  -- ~1% sample, very fast
```

### 11.3 Development Environment Setup

```sql
-- Create dev environment with 0.1% of production data (reproducible)
CREATE OR REPLACE TABLE dev_orders AS
SELECT * FROM prod_orders
SAMPLE BLOCK (0.1) SEED (12345);

-- Same seed ensures consistent dev dataset
-- Note: SEED only works with BLOCK/SYSTEM sampling
```

### 11.4 Real-Time Dashboard Metrics

```sql
-- Dashboard: Unique visitors and P95 latency (last hour)
SELECT
  DATE_TRUNC('minute', event_time) AS minute,
  HLL(user_id) AS unique_users,
  APPROX_PERCENTILE(page_load_ms, 0.95) AS p95_load_time
FROM page_events
WHERE event_time > DATEADD('hour', -1, CURRENT_TIMESTAMP())
GROUP BY minute
ORDER BY minute;
```

### 11.5 Customer Overlap Analysis

```sql
-- Which marketing campaigns reached overlapping customers?
WITH campaign_customers AS (
  SELECT
    campaign_name,
    MINHASH(100, customer_id) AS customer_hash
  FROM campaign_responses
  GROUP BY campaign_name
)
SELECT
  a.campaign_name AS campaign_1,
  b.campaign_name AS campaign_2,
  ROUND(APPROXIMATE_SIMILARITY(a.customer_hash, b.customer_hash) * 100, 1)
    AS overlap_pct
FROM campaign_customers a
CROSS JOIN campaign_customers b
WHERE a.campaign_name < b.campaign_name
ORDER BY overlap_pct DESC;
```

---

## 12. Exam Tips and Common Question Patterns

### 12.1 Frequently Tested Concepts

1. **Sampling synonyms**: SAMPLE = TABLESAMPLE, ROW = BERNOULLI, BLOCK = SYSTEM, SEED = REPEATABLE
2. **SEED limitations**: SEED/REPEATABLE only works with BLOCK/SYSTEM sampling (not ROW/BERNOULLI, not fixed-size, not views/subqueries)
3. **Fixed-size limitations**: Cannot use SEED or BLOCK with ROWS syntax
4. **Percentage range**: 0 to 100 (not 0 to 1)
5. **Fixed-size max**: 1,000,000 rows
6. **HLL accuracy**: ~1.62% average relative error
7. **MinHash requires two steps**: Generate state, then calculate similarity

### 12.2 Common Exam Traps

| Trap | Correct Understanding |
|------|----------------------|
| SAMPLE (0.1) means 0.1% | SAMPLE (0.1) means 0.1% (valid). Percentage, not decimal. |
| SAMPLE (10) SEED (42) works | SEED only works with BLOCK/SYSTEM, not default BERNOULLI |
| SAMPLE (50 ROWS) SEED (42) works | Fixed-size sampling does NOT support SEED |
| SAMPLE BERNOULLI (80) SEED (42) works | BERNOULLI/ROW sampling does NOT support SEED |
| BLOCK sampling is more random | ROW sampling is more random; BLOCK samples partitions |
| HLL is exact | HLL is approximate (~1.6% error) |
| APPROX functions require Enterprise | Most APPROX functions work on all editions |
| MINHASH returns similarity directly | MINHASH returns state; use APPROXIMATE_SIMILARITY |

### 12.3 Key Syntax to Memorize

```sql
-- Fraction-based ROW sampling
SELECT * FROM t SAMPLE ROW (10);
SELECT * FROM t SAMPLE BERNOULLI (10);

-- Fraction-based BLOCK sampling
SELECT * FROM t SAMPLE BLOCK (10);
SELECT * FROM t SAMPLE SYSTEM (10);

-- Deterministic sampling (BLOCK/SYSTEM only)
SELECT * FROM t SAMPLE BLOCK (10) SEED (42);
SELECT * FROM t SAMPLE SYSTEM (10) REPEATABLE (42);

-- Fixed-size sampling
SELECT * FROM t SAMPLE (1000 ROWS);

-- Estimation functions
SELECT APPROX_COUNT_DISTINCT(col) FROM t;
SELECT HLL(col) FROM t;
SELECT APPROX_PERCENTILE(col, 0.95) FROM t;
SELECT APPROX_TOP_K(col, 10) FROM t;
```

### 12.4 Practice Questions

**Question 1:** What is the difference between `SAMPLE (50)` and `SAMPLE (50 ROWS)`?

- A) They are equivalent
- B) SAMPLE (50) returns 50%, SAMPLE (50 ROWS) returns exactly 50 rows
- C) SAMPLE (50) returns 50 rows, SAMPLE (50 ROWS) returns 50%
- D) SAMPLE (50 ROWS) is not valid syntax

**Answer:** B - SAMPLE (50) is fraction-based with 50% probability for each row; SAMPLE (50 ROWS) is fixed-size returning exactly 50 rows.

---

**Question 2:** Which syntax is INVALID for table sampling?

- A) `SELECT * FROM t SAMPLE (100 ROWS) SEED (42);`
- B) `SELECT * FROM t SAMPLE BERNOULLI (10);`
- C) `SELECT * FROM t TABLESAMPLE (5);`
- D) `SELECT * FROM t SAMPLE BLOCK (1);`

**Answer:** A - Fixed-size sampling (ROWS) does not support SEED.

---

**Question 3:** What is the approximate error rate of HyperLogLog (HLL)?

- A) 0.16%
- B) 1.62%
- C) 5%
- D) 10%

**Answer:** B - HyperLogLog has an average relative error of approximately 1.62%.

---

**Question 4:** Which sampling method is faster on very large tables but less random?

- A) ROW (BERNOULLI)
- B) BLOCK (SYSTEM)
- C) Fixed-size (ROWS)
- D) SEED-based sampling

**Answer:** B - BLOCK/SYSTEM sampling is faster because it samples entire micro-partitions, but results are less uniformly distributed.

---

**Question 5:** Which function estimates the similarity between two datasets?

- A) APPROX_COUNT_DISTINCT
- B) APPROX_TOP_K
- C) APPROXIMATE_SIMILARITY
- D) APPROX_PERCENTILE

**Answer:** C - APPROXIMATE_SIMILARITY (used with MINHASH) estimates the Jaccard similarity between datasets.

---

**Question 6:** What is the maximum number of rows that can be returned using fixed-size sampling?

- A) 10,000
- B) 100,000
- C) 1,000,000
- D) No limit

**Answer:** C - Fixed-size sampling supports 0 to 1,000,000 rows.

---

**Question 7:** Which function would you use to find the 99th percentile of response times efficiently on a billion-row table?

- A) PERCENTILE_CONT(0.99)
- B) APPROX_PERCENTILE(response_time, 0.99)
- C) MEDIAN(response_time)
- D) AVG(response_time) * 0.99

**Answer:** B - APPROX_PERCENTILE provides efficient approximate percentile calculation suitable for large tables.

---

**Question 8:** To create a reproducible sample for ML training, which syntax is correct?

- A) `SAMPLE (80) SEED (42)`
- B) `SAMPLE (80 ROWS) SEED (42)`
- C) `SAMPLE BLOCK (80) SEED (42)`
- D) `SAMPLE BERNOULLI (80) SEED (42)`

**Answer:** C - SEED/REPEATABLE only works with BLOCK (SYSTEM) sampling. Option A defaults to BERNOULLI which doesn't support SEED, option B uses fixed-size which doesn't support SEED, and option D explicitly uses BERNOULLI which doesn't support SEED.

---

## 13. Quick Reference

### Sampling Keywords

| Keyword | Alias | Description |
|---------|-------|-------------|
| SAMPLE | TABLESAMPLE | Initiates sampling |
| ROW | BERNOULLI | Row-level probability |
| BLOCK | SYSTEM | Partition-level probability |
| SEED | REPEATABLE | Deterministic results |
| ROWS | - | Fixed-size sampling |

### Estimation Functions Summary

| Function | Purpose | Algorithm |
|----------|---------|-----------|
| `HLL()` / `APPROX_COUNT_DISTINCT()` | Unique count | HyperLogLog |
| `MINHASH()` + `APPROXIMATE_SIMILARITY()` | Set overlap | MinHash |
| `APPROX_TOP_K()` | Frequent values | Space-Saving |
| `APPROX_PERCENTILE()` | Percentile values | t-Digest |

### Sampling Syntax Quick Reference

```sql
-- Fraction-based (approximate row count)
table SAMPLE (percent)                              -- Defaults to BERNOULLI
table SAMPLE ROW|BERNOULLI (percent)                -- No SEED support
table SAMPLE BLOCK|SYSTEM (percent)                 -- Supports SEED
table SAMPLE BLOCK|SYSTEM (percent) SEED (integer)  -- Deterministic (BLOCK/SYSTEM only)

-- Fixed-size (exact row count)
table SAMPLE (count ROWS)  -- No SEED, no BLOCK
```

### Key Constraints

- Percentage range: 0 to 100
- Fixed-size range: 0 to 1,000,000 rows
- Fixed-size: Cannot use SEED or BLOCK
- SEED/REPEATABLE: Only works with BLOCK/SYSTEM sampling
- SEED: Not supported on views or subqueries
- Seed range: 0 to 2,147,483,647
- HLL precision: 12 bits (4096 sub-streams)
- HLL memory: Max ~4KB per group
- MinHash k: Max 1024

---

**Key Takeaway:** Table sampling and estimation functions are essential tools for working efficiently with large datasets in Snowflake. Understanding when to use ROW vs. BLOCK sampling, and when approximate functions like HLL and APPROX_PERCENTILE are appropriate, enables faster queries and lower costs while maintaining acceptable accuracy for analytical workloads.
