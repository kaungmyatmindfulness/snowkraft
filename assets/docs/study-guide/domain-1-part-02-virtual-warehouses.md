# Domain 1: Snowflake AI Data Cloud Features & Architecture
## Part 2: Virtual Warehouses

**Exam Weight:** This topic is part of Domain 1 (25-30% of exam)

---

## Overview

Virtual warehouses are clusters of compute resources in Snowflake that provide the processing power for executing queries and performing DML operations. Understanding warehouse sizing, scaling, and optimization is critical for the SnowPro Core exam.

---

## Section 1: Virtual Warehouse Fundamentals

### What is a Virtual Warehouse?

A virtual warehouse (often called simply a "warehouse") is a cluster of compute resources that provides CPU, memory, and temporary storage to perform:

- **SELECT statements** - Retrieving data from tables and views
- **DML operations** - INSERT, UPDATE, DELETE, MERGE
- **Data loading** - COPY INTO <table>
- **Data unloading** - COPY INTO <location>

### Warehouse Types

Snowflake supports two warehouse types:

| Type | Use Case | Key Characteristic |
|------|----------|-------------------|
| **Standard** | General-purpose queries, ETL, analytics | Default type, balanced resources |
| **Snowpark-optimized** | ML training, large memory workloads | 16x more memory per node |

### Key Warehouse Properties

| Property | Description | Default |
|----------|-------------|---------|
| SIZE | Compute resources per cluster | X-Small |
| AUTO_SUSPEND | Minutes of inactivity before suspending | 10 minutes |
| AUTO_RESUME | Automatically start when queries submitted | TRUE |
| MIN_CLUSTER_COUNT | Minimum clusters (multi-cluster) | 1 |
| MAX_CLUSTER_COUNT | Maximum clusters (multi-cluster) | 1 |
| SCALING_POLICY | How clusters scale (Standard/Economy) | Standard |
| INITIALLY_SUSPENDED | Start state when created | FALSE |

---

## Section 2: Warehouse Sizes and Credit Consumption

### Size-to-Credit Mapping (Gen1 Warehouses)

| Warehouse Size | Credits/Hour | Credits/Second | Compute Multiplier |
|----------------|--------------|----------------|-------------------|
| X-Small (XS) | 1 | 0.0003 | 1x (baseline) |
| Small (S) | 2 | 0.0006 | 2x |
| Medium (M) | 4 | 0.0011 | 4x |
| Large (L) | 8 | 0.0022 | 8x |
| X-Large (XL) | 16 | 0.0044 | 16x |
| 2X-Large (2XL) | 32 | 0.0089 | 32x |
| 3X-Large (3XL) | 64 | 0.0178 | 64x |
| 4X-Large (4XL) | 128 | 0.0356 | 128x |
| 5X-Large (5XL) | 256 | 0.0711 | 256x |
| 6X-Large (6XL) | 512 | 0.1422 | 512x |

**Key Pattern:** Each size increase DOUBLES the credits consumed and compute resources available.

### Credit Billing Examples (Gen1 Standard Warehouses)

| Running Time | X-Small | X-Large | 5X-Large |
|--------------|---------|---------|----------|
| 0-60 seconds | 0.017 | 0.267 | 4.268 |
| 61 seconds | 0.017 | 0.271 | 4.336 |
| 2 minutes | 0.033 | 0.533 | 8.532 |
| 10 minutes | 0.167 | 2.667 | 42.668 |
| 1 hour | 1.000 | 16.000 | 256.000 |

### Billing Rules

1. **Per-Second Billing** - Charged by the second after first 60 seconds
2. **60-Second Minimum** - Every warehouse start incurs at least 60 seconds of charges
3. **Credit Rounding** - No benefit to stopping before 60 seconds

**Example Scenario:**
- Warehouse runs for 61 seconds, shuts down, restarts, runs for 30 seconds
- Total billed: 121 seconds (60 + 1 + 60)

---

## Section 3: Auto-Suspend and Auto-Resume

### Auto-Suspend

**Definition:** Automatically suspends a warehouse after a specified period of inactivity.

| Setting | Behavior |
|---------|----------|
| Enabled (default) | Warehouse suspends after timeout period |
| Disabled | Warehouse runs continuously until manually suspended |
| Timeout values | 60 seconds to 10+ minutes recommended |

**Best Practices:**
- Set auto-suspend to 5-10 minutes or less for cost savings
- Match timeout to gaps in your query workload
- Avoid 1-2 minute timeouts if queries have 2-3 minute gaps (causes thrashing)

**Disabling Auto-Suspend:**
- Use `NULL` or `0` in SQL
- Select "Never" in Snowsight
- Consider costs: Large warehouses running 24/7 are expensive

### Auto-Resume

**Definition:** Automatically resumes a suspended warehouse when a query is submitted.

| Setting | Behavior |
|---------|----------|
| Enabled (default) | Warehouse starts automatically when queries arrive |
| Disabled | Warehouse must be manually started |

**Use Cases for Disabling:**
- Strict cost control requirements
- Controlled user access to compute resources
- Budget management scenarios

### Important Notes

- Auto-suspend/resume apply to the **entire warehouse**, not individual clusters
- For multi-cluster warehouses:
  - Auto-suspend occurs only when minimum clusters are running with no activity
  - Auto-resume only applies when the entire warehouse is suspended (no clusters running)

---

## Section 4: Multi-Cluster Warehouses

**Enterprise Edition Feature**

### What is a Multi-Cluster Warehouse?

A warehouse that can dynamically scale by adding or removing clusters based on workload demand. Each cluster has the same size and compute resources.

### Multi-Cluster Modes

| Mode | Configuration | Behavior |
|------|---------------|----------|
| **Maximized** | MIN = MAX (both > 1) | All clusters start immediately and run continuously |
| **Auto-scale** | MIN < MAX | Clusters start/stop based on demand |

### Maximum Cluster Limits by Size

| Warehouse Size | Max Allowed Clusters | Default Max |
|----------------|---------------------|-------------|
| X-Small | 300 | 10 |
| Small | 300 | 10 |
| Medium | 300 | 10 |
| Large | 160 | 10 |
| X-Large | 80 | 10 |
| 2X-Large | 40 | 10 |
| 3X-Large | 20 | 10 |
| 4X-Large | 10 | 10 |
| 5X-Large | 10 | 10 |
| 6X-Large | 10 | 10 |

### Scaling Policies

| Policy | Description | New Cluster Starts When... | Cluster Shuts Down When... |
|--------|-------------|---------------------------|---------------------------|
| **Standard** (default) | Favors performance over cost | Query queues OR Snowflake estimates insufficient resources | Sustained low load, queries finish |
| **Economy** | Favors cost savings over performance | Estimated 6+ minutes of work available | Less than 6 minutes of work estimated |

### Multi-Cluster Credit Calculation

**Formula:** Total Credits = Warehouse Size Credits x Number of Clusters x Time

**Example (Medium 3-Cluster in Auto-scale for 2 hours):**

| Time Period | Cluster 1 | Cluster 2 | Cluster 3 | Total |
|-------------|-----------|-----------|-----------|-------|
| 1st Hour | 4 | 0 | 0 | 4 |
| 2nd Hour | 4 | 4 | 2 (30 min) | 10 |
| **Total** | 8 | 4 | 2 | **14** |

### When to Use Multi-Cluster Warehouses

**Good for:**
- High user concurrency
- Fluctuating workloads
- Query queuing problems

**Not ideal for:**
- Improving slow individual queries (resize instead)
- Data loading performance

---

## Section 5: Scaling Strategies

### Scale Up (Resize) vs. Scale Out (Multi-Cluster)

| Strategy | Method | Best For |
|----------|--------|----------|
| **Scale Up** | Increase warehouse size | Complex queries, large data scans |
| **Scale Out** | Add clusters (multi-cluster) | High concurrency, many users |

### Resizing Considerations

1. **Immediate effect** on new and queued queries
2. **No impact** on currently running queries
3. **Cache is dropped** when downsizing (may impact performance)
4. Larger is NOT always faster for small queries
5. Resizing 5XL/6XL to 4XL or smaller incurs brief double-billing

### Warehouse Caching

- Each warehouse maintains a **local data cache**
- Cache improves performance for repeated queries on same data
- Cache is **dropped when warehouse suspends**
- Larger warehouses = larger cache capacity

**Trade-off:** Suspending saves credits but loses cache. Consider for workloads with repeated queries on similar data.

---

## Section 6: Query Acceleration Service (QAS)

**Enterprise Edition Feature**

### What is QAS?

QAS offloads portions of eligible queries to shared serverless compute resources, speeding up query execution without changing warehouse size.

### How It Works

1. Identifies query operations that can benefit from parallelization
2. Offloads those operations to serverless compute
3. Reduces demand on warehouse resources
4. Improves overall warehouse performance

### Best Candidates for QAS

| Workload Type | Example |
|--------------|---------|
| Ad hoc analytics | Exploratory queries with varying complexity |
| Unpredictable data volumes | Queries that sometimes scan large datasets |
| Large scans with selective filters | WHERE clauses that filter large tables |
| INSERT/COPY operations | Loading many rows in parallel |

### Eligible SQL Commands

- SELECT
- INSERT
- CREATE TABLE AS SELECT (CTAS)
- COPY INTO <table>

### Why Queries May Be Ineligible

- Not enough partitions to scan
- Filters not selective enough
- GROUP BY cardinality too high
- Nondeterministic functions (SEQ, RANDOM)
- Query structure doesn't benefit from parallelization

### Scale Factor

The **QUERY_ACCELERATION_MAX_SCALE_FACTOR** controls maximum serverless resources:

| Scale Factor | Meaning |
|--------------|---------|
| 0 | Unlimited (maximize performance) |
| 1-10 | Multiplier of warehouse credit consumption |
| 8 (default) | Up to 8x warehouse credits for QAS |

**Example:** Medium warehouse (4 credits/hr) with scale factor 5
- Can use up to 20 additional credits/hour for QAS
- Total potential: 24 credits/hour

### Enabling QAS

```sql
-- Enable with default scale factor (8)
ALTER WAREHOUSE my_wh SET ENABLE_QUERY_ACCELERATION = TRUE;

-- Enable with unlimited scale factor
ALTER WAREHOUSE my_wh SET
  ENABLE_QUERY_ACCELERATION = TRUE
  QUERY_ACCELERATION_MAX_SCALE_FACTOR = 0;
```

### Identifying QAS Candidates

```sql
-- Find queries that would benefit from QAS
SELECT query_id, eligible_query_acceleration_time
FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_ACCELERATION_ELIGIBLE
WHERE start_time > DATEADD('day', -7, CURRENT_TIMESTAMP())
ORDER BY eligible_query_acceleration_time DESC;

-- Check specific query
SELECT PARSE_JSON(SYSTEM$ESTIMATE_QUERY_ACCELERATION('<query_id>'));
```

### QAS Cost

- Billed separately from warehouse credits
- Per-second billing only when service is in use
- Credits consumed based on actual resources used

---

## Section 7: Generation 2 (Gen2) Warehouses

### What is Gen2?

An updated version of standard warehouses with:
- Faster underlying hardware
- Improved delete, update, merge operations
- Enhanced table scan operations
- Better query performance for most workloads

### Creating Gen2 Warehouses

```sql
-- Using GENERATION clause (recommended)
CREATE WAREHOUSE my_wh GENERATION = '2';

-- Using RESOURCE_CONSTRAINT clause
CREATE WAREHOUSE my_wh RESOURCE_CONSTRAINT = STANDARD_GEN_2;

-- Convert existing warehouse
ALTER WAREHOUSE my_wh SET GENERATION = '2';
```

### Gen2 Limitations

- Not available for 5X-Large and 6X-Large sizes
- Not available in all regions
- Only applies to Standard warehouses (not Snowpark-optimized)

### Converting Between Generations

- Can convert while warehouse is running or suspended
- Running queries continue on original generation
- New queries use new generation
- Brief double-billing during transition if not suspended first

---

## Section 8: Warehouse Best Practices

### Sizing Guidelines

| Scenario | Recommended Approach |
|----------|---------------------|
| Data loading | Start small (S, M, L), scale based on file count |
| Simple queries | X-Small to Medium sufficient |
| Complex analytics | Large to 4X-Large based on data volume |
| Testing | Start small, experiment with sizes |
| Production | Match size to query complexity |

### Cost Optimization

1. **Enable auto-suspend** with appropriate timeout
2. **Use multi-cluster** for concurrency, not performance
3. **Right-size warehouses** - larger is not always better
4. **Consider QAS** for ad hoc workloads instead of permanent upsizing
5. **Monitor warehouse load** to identify over/under-provisioned warehouses

### Performance Optimization

1. **Group similar queries** on the same warehouse
2. **Use separate warehouses** for different workload types
3. **Enable QAS** for warehouses with outlier queries
4. **Consider caching** when setting auto-suspend timeouts
5. **Resize for complexity**, add clusters for concurrency

---

## Exam Tips and Common Question Patterns

### High-Frequency Topics

1. **Credit consumption by size** - Know the doubling pattern
2. **60-second minimum billing** - Understand the implications
3. **Multi-cluster scaling policies** - Standard vs. Economy differences
4. **Auto-suspend/resume behavior** - Especially for multi-cluster
5. **QAS eligibility** - What workloads benefit

### Common Exam Questions

**Q: What happens to credits when a warehouse runs for 45 seconds?**
A: Billed for 60 seconds (minimum charge)

**Q: How do credits scale when increasing warehouse size?**
A: They double with each size increase

**Q: Which scaling policy should you use for cost optimization?**
A: Economy policy (waits for 6 minutes of estimated work)

**Q: What happens to the cache when a warehouse is suspended?**
A: The cache is dropped/cleared

**Q: Multi-cluster warehouses are best for improving what?**
A: Query concurrency (not individual query performance)

**Q: QAS uses what type of compute resources?**
A: Serverless compute resources (billed separately)

### Key Distinctions to Remember

| Concept | Key Point |
|---------|-----------|
| Resize vs. Multi-cluster | Resize = query performance; Multi-cluster = concurrency |
| Standard vs. Economy | Standard favors performance; Economy favors cost |
| Auto-suspend timeout | Applies to entire warehouse, not individual clusters |
| QAS scale factor | 0 = unlimited; 8 = default |
| Gen1 vs. Gen2 | Gen2 has improved performance on newer hardware |

### Tricky Scenarios

1. **Restarting within 60 seconds** - Still charged 60-second minimum for each start
2. **Resizing while running** - No impact on currently executing queries
3. **Multi-cluster with MIN=MAX** - This is Maximized mode, not Auto-scale
4. **QAS for multi-cluster** - Consider higher scale factor for multiple clusters

---

## Practice Questions

### Question 1
A warehouse runs for 30 seconds, suspends, then runs again for 45 seconds. How many seconds are billed?

- A) 75 seconds
- B) 90 seconds
- C) 105 seconds
- D) 120 seconds

<details>
<summary>Show Answer</summary>

**Answer: D) 120 seconds**

First run: 60 seconds (minimum)
Second run: 60 seconds (minimum)
Total: 120 seconds

</details>

### Question 2
Which warehouse feature should you use to handle fluctuating numbers of concurrent users?

- A) Increase warehouse size
- B) Enable Query Acceleration Service
- C) Use multi-cluster warehouse in Auto-scale mode
- D) Decrease auto-suspend timeout

<details>
<summary>Show Answer</summary>

**Answer: C) Use multi-cluster warehouse in Auto-scale mode**

Multi-cluster warehouses are designed for concurrency. Auto-scale mode automatically adjusts clusters based on demand.

</details>

### Question 3
A Medium warehouse has a QAS scale factor of 5. What is the maximum additional hourly credit consumption for QAS?

- A) 5 credits
- B) 8 credits
- C) 20 credits
- D) 32 credits

<details>
<summary>Show Answer</summary>

**Answer: C) 20 credits**

Medium warehouse = 4 credits/hour
Scale factor 5 = up to 5x the warehouse credits
4 x 5 = 20 additional credits/hour maximum

</details>

### Question 4
What is the credit consumption per hour for a Large warehouse?

- A) 4 credits
- B) 8 credits
- C) 16 credits
- D) 32 credits

<details>
<summary>Show Answer</summary>

**Answer: B) 8 credits**

Large warehouse consumes 8 credits per hour.

</details>

### Question 5
Which scaling policy prioritizes cost over performance in a multi-cluster warehouse?

- A) Standard
- B) Economy
- C) Maximized
- D) Conservative

<details>
<summary>Show Answer</summary>

**Answer: B) Economy**

Economy policy waits until there is estimated 6 minutes of work before starting a new cluster, prioritizing cost savings.

</details>

### Question 6
What happens to the warehouse cache when the warehouse is suspended?

- A) Cache is persisted to storage
- B) Cache is dropped
- C) Cache is shared with other warehouses
- D) Cache is compressed and retained

<details>
<summary>Show Answer</summary>

**Answer: B) Cache is dropped**

When a warehouse suspends, its cache is cleared. This may cause slower performance for initial queries after resuming.

</details>

### Question 7
Which workloads are BEST suited for Query Acceleration Service?

- A) Simple queries with predictable execution times
- B) Ad hoc analytics with large scans and selective filters
- C) Data loading with small files
- D) Real-time streaming data

<details>
<summary>Show Answer</summary>

**Answer: B) Ad hoc analytics with large scans and selective filters**

QAS excels at ad hoc workloads with unpredictable data volumes and queries that have large scans with selective filters.

</details>

### Question 8
In a multi-cluster warehouse running in Auto-scale mode, when does auto-suspend occur?

- A) When any cluster is idle
- B) When the maximum number of clusters are idle
- C) When the minimum number of clusters are running and there is no activity
- D) Immediately after each query completes

<details>
<summary>Show Answer</summary>

**Answer: C) When the minimum number of clusters are running and there is no activity**

Auto-suspend applies to the entire warehouse and only triggers when already at minimum clusters with no activity for the timeout period.

</details>

### Question 9
What is the maximum number of clusters allowed for a 2X-Large multi-cluster warehouse?

- A) 10
- B) 20
- C) 40
- D) 80

<details>
<summary>Show Answer</summary>

**Answer: C) 40**

2X-Large warehouses can have a maximum of 40 clusters.

</details>

### Question 10
A 3X-Large multi-cluster warehouse runs 2 clusters for the first hour and 3 clusters for the second hour. What is the total credit consumption?

- A) 128 credits
- B) 192 credits
- C) 256 credits
- D) 320 credits

<details>
<summary>Show Answer</summary>

**Answer: D) 320 credits**

3X-Large = 64 credits/hour per cluster
First hour: 64 x 2 = 128 credits
Second hour: 64 x 3 = 192 credits
Total: 128 + 192 = 320 credits

</details>

---

## Quick Reference Card

### Credit Consumption (Gen1)
```
XS=1 | S=2 | M=4 | L=8 | XL=16 | 2XL=32 | 3XL=64 | 4XL=128 | 5XL=256 | 6XL=512
```

### Key SQL Commands
```sql
-- Create warehouse
CREATE WAREHOUSE my_wh
  WAREHOUSE_SIZE = 'MEDIUM'
  AUTO_SUSPEND = 300
  AUTO_RESUME = TRUE;

-- Create multi-cluster warehouse
CREATE WAREHOUSE my_mcw
  WAREHOUSE_SIZE = 'LARGE'
  MIN_CLUSTER_COUNT = 1
  MAX_CLUSTER_COUNT = 5
  SCALING_POLICY = 'STANDARD';

-- Enable QAS
ALTER WAREHOUSE my_wh SET
  ENABLE_QUERY_ACCELERATION = TRUE
  QUERY_ACCELERATION_MAX_SCALE_FACTOR = 8;

-- Resize warehouse
ALTER WAREHOUSE my_wh SET WAREHOUSE_SIZE = 'XLARGE';

-- Check warehouse status
SHOW WAREHOUSES LIKE 'my_wh';
```

### Multi-Cluster Modes
```
Maximized: MIN = MAX (e.g., MIN=3, MAX=3) - All clusters always running
Auto-scale: MIN < MAX (e.g., MIN=1, MAX=5) - Clusters scale with demand
```

### Scaling Policies
```
Standard (default): Start clusters when queuing or resources needed
Economy: Start clusters only when 6+ minutes of work estimated
```

---

*Last Updated: January 2026*
*Source: Official Snowflake Documentation*
