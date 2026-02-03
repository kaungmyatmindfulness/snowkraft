# Domain 3: Performance Concepts - Warehouse Sizing for Performance

## Overview

This study guide covers warehouse sizing strategies for optimizing performance in Snowflake. Understanding how to properly size and scale warehouses is critical for the SnowPro Core exam (10-15% weight for Domain 3) and for real-world Snowflake administration.

---

## 1. Warehouse Sizes and Credit Consumption

### Available Warehouse Sizes

Snowflake offers warehouses in the following sizes, with each size doubling the compute resources and credit consumption of the previous size:

| Warehouse Size | Credits/Hour (Gen1) | Credits/Second | Notes |
|----------------|---------------------|----------------|-------|
| X-Small (XS) | 1 | 0.0003 | Default for CREATE WAREHOUSE |
| Small (S) | 2 | 0.0006 | |
| Medium (M) | 4 | 0.0011 | |
| Large (L) | 8 | 0.0022 | |
| X-Large (XL) | 16 | 0.0044 | Default in Snowsight UI |
| 2X-Large (2XL) | 32 | 0.0089 | |
| 3X-Large (3XL) | 64 | 0.0178 | |
| 4X-Large (4XL) | 128 | 0.0356 | |
| 5X-Large (5XL) | 256 | 0.0711 | Available in AWS and Azure |
| 6X-Large (6XL) | 512 | 0.1422 | Available in AWS and Azure |

### Key Concept: Doubling Pattern

Each warehouse size increase doubles both:
- The compute resources available
- The credits consumed per hour

This means that if a query runs twice as fast on a larger warehouse, the total credit cost remains the same.

### Per-Second Billing

Snowflake uses **per-second billing** with a **60-second minimum** each time a warehouse starts:

| Running Time | X-Small Credits | X-Large Credits | 5X-Large Credits |
|--------------|-----------------|-----------------|------------------|
| 0-60 seconds | 0.017 | 0.267 | 4.268 |
| 61 seconds | 0.017 | 0.271 | 4.336 |
| 2 minutes | 0.033 | 0.533 | 8.532 |
| 10 minutes | 0.167 | 2.667 | 42.668 |
| 1 hour | 1.000 | 16.000 | 256.000 |

---

## 2. Scale Up vs Scale Out

Snowflake provides two distinct scaling strategies:

### Scale Up: Resizing a Warehouse

**What it does:** Increases the compute resources within a single warehouse by changing its size.

**Best for:**
- Improving performance of complex, resource-intensive queries
- Reducing execution time for individual queries
- Queries that spill to storage due to insufficient memory

**Key characteristics:**
- Can be done while the warehouse is running
- New resources are available for queued and new queries
- Does NOT impact queries already running
- Larger cache available with larger warehouses

**When to use:**
- Single complex queries taking too long
- Memory spillage occurring (bytes spilling to local/remote storage)
- Large data transformations
- Complex joins and aggregations

### Scale Out: Multi-Cluster Warehouses (Enterprise Edition)

**What it does:** Adds additional clusters of the same size to handle more concurrent queries.

**Best for:**
- Handling high concurrency (many users/queries simultaneously)
- Workloads with fluctuating demand
- Reducing query queuing

**Key characteristics:**
- Requires Enterprise Edition or higher
- Can be configured for auto-scaling or maximized mode
- Each cluster has the same size as the original
- Credits multiply based on number of active clusters

**When to use:**
- Many concurrent users experiencing query queuing
- Workloads that spike at certain times
- BI dashboards with many simultaneous users

### Comparison Table

| Aspect | Scale Up (Resize) | Scale Out (Multi-Cluster) |
|--------|------------------|---------------------------|
| **Purpose** | Improve individual query performance | Handle more concurrent queries |
| **Edition Required** | All editions | Enterprise or higher |
| **Resource Change** | More resources per cluster | More clusters of same size |
| **Best For** | Complex queries, data loading | High concurrency workloads |
| **Cost Model** | Higher credits/hour for single cluster | Credits multiply by cluster count |
| **Configuration** | Change warehouse SIZE | Set MIN/MAX_CLUSTER_COUNT |

---

## 3. Selecting Warehouse Size

### Initial Size Selection Guidelines

**For Data Loading:**
- Warehouse size should match the number and size of files being loaded
- Smaller warehouses (Small, Medium, Large) are generally sufficient
- Using larger warehouses may not improve performance and will consume more credits
- Data loading performance is influenced more by file count than warehouse size

**For Testing/Development:**
- Start with smaller sizes (X-Small, Small, Medium)
- Adequate for small-scale testing environments

**For Production Queries:**
- Start larger (Large, X-Large, or higher)
- Per-second billing allows flexibility to adjust
- Match size to query complexity

### The Experimentation Approach

Snowflake recommends experimenting with different warehouse sizes:

1. Run the same queries against multiple warehouse sizes (e.g., Medium, Large, X-Large)
2. Use queries that typically complete in 5-10 minutes
3. Compare execution times and credit costs
4. Find the optimal size-to-performance ratio

### Important Considerations

**Larger is NOT always faster:**
- Small, basic queries do not benefit from larger warehouses
- Simple queries (basic SELECTs, small data sets) run efficiently on smaller warehouses
- Only complex queries with large data scans benefit from upsizing

**Query Complexity Matters:**
- Number and size of tables being queried
- JOIN complexity
- Aggregation operations
- Filter selectivity

---

## 4. Warehouse Cache Optimization

### How the Cache Works

Each running warehouse maintains a cache of recently accessed table data:
- Larger warehouses have larger caches
- Cache improves performance for subsequent similar queries
- Cache is **dropped when the warehouse suspends**

### Cache and Auto-Suspend Trade-offs

| Use Case | Recommended Auto-Suspend | Reason |
|----------|-------------------------|--------|
| Tasks | Immediate (0 seconds) | Tasks are discrete; cache not beneficial |
| DevOps/Ad-hoc Queries | ~5 minutes | Queries are unique; cache less important |
| BI/Reporting Queries | 10+ minutes | Similar queries benefit from cache |

### Impact of Resizing on Cache

- **Increasing size:** Adds compute resources and expands cache
- **Decreasing size:** Removes compute resources and **drops associated cache data**

---

## 5. Multi-Cluster Warehouse Details

### Operating Modes

**Maximized Mode:**
- Set MIN_CLUSTER_COUNT = MAX_CLUSTER_COUNT (both > 1)
- All clusters start immediately when warehouse starts
- Best for predictable, consistently high workloads

**Auto-Scale Mode:**
- Set MIN_CLUSTER_COUNT < MAX_CLUSTER_COUNT
- Clusters start/stop automatically based on demand
- Best for fluctuating workloads

### Scaling Policies (Auto-Scale Mode)

| Policy | Behavior | Cost Impact |
|--------|----------|-------------|
| **Standard** | Starts new clusters quickly to minimize queuing | Higher credit usage |
| **Economy** | Keeps clusters fully loaded before adding more | Lower cost, some queuing |

### Maximum Clusters by Warehouse Size

| Warehouse Size | Max Cluster Count | Default Max |
|----------------|-------------------|-------------|
| X-Small to Medium | 300 | 10 |
| Large | 160 | 10 |
| X-Large | 80 | 10 |
| 2X-Large | 40 | 10 |
| 3X-Large | 20 | 10 |
| 4X-Large to 6X-Large | 10 | 10 |

### Credit Calculation for Multi-Cluster

Total credits = (Warehouse size credits) x (Number of active clusters) x (Time running)

**Example:** Medium (4 credits/hour) with 3 clusters running for 1 hour = 12 credits

---

## 6. Memory Spillage and Performance

### What is Memory Spillage?

When a query requires more memory than the warehouse provides:
1. First spills to **local disk storage** (slower)
2. If still insufficient, spills to **remote cloud storage** (much slower)

### Identifying Spillage

Query the QUERY_HISTORY view for:
- `bytes_spilled_to_local_storage`
- `bytes_spilled_to_remote_storage`

### Solutions for Memory Spillage

1. **Scale up** the warehouse to provide more memory
2. **Process data in smaller batches**
3. **Optimize the query** to reduce memory requirements
4. Consider **Snowpark-optimized warehouses** for memory-intensive workloads

---

## 7. Query Acceleration Service (Enterprise Edition)

### What is QAS?

The Query Acceleration Service offloads portions of query processing to serverless compute resources.

**Best for:**
- Ad hoc analytics
- Queries with unpredictable data volumes
- Queries with large scans and selective filters
- "Outlier" queries that consume more resources than typical queries

### QAS vs Resizing

| Aspect | QAS | Resizing |
|--------|-----|----------|
| **Billing** | Separate serverless credits | Warehouse credits |
| **Scope** | Only accelerates eligible queries | Affects all queries |
| **Configuration** | Scale factor (0 = unlimited) | Warehouse size |
| **Best For** | Mixed workloads with outliers | Consistently complex queries |

### Scale Factor

- Controls maximum serverless compute as a multiplier of warehouse consumption
- Scale factor of 5 = serverless can use up to 5x warehouse credit rate
- Scale factor of 0 = no limit (maximum performance)

---

## 8. Best Practices Summary

### Warehouse Sizing Best Practices

1. **Start with experimentation** - Test queries on different sizes to find optimal balance
2. **Don't focus solely on size** - Per-second billing allows flexibility
3. **Match workloads to warehouses** - Run similar queries on the same warehouse
4. **Consider the cache trade-off** - Balance auto-suspend timing vs cache benefits
5. **Use multi-cluster for concurrency** - Not for improving individual query performance

### Performance Optimization Order

1. **Optimize queries first** - Better SQL often beats bigger warehouses
2. **Optimize storage** - Clustering, partitioning, micro-partition pruning
3. **Right-size the warehouse** - Match to workload needs
4. **Scale out for concurrency** - Use multi-cluster warehouses
5. **Consider QAS** - For eligible outlier queries

### Cost-Performance Trade-offs

| Goal | Strategy |
|------|----------|
| Minimize cost | Use smaller warehouses, aggressive auto-suspend |
| Maximize performance | Larger warehouses, longer suspend timeout for cache |
| Balance both | Right-size for typical workload, use QAS for outliers |

---

## Exam Tips and Common Question Patterns

### Key Facts to Memorize

1. **Credit doubling:** Each size increase doubles credits (XS=1, S=2, M=4, L=8, XL=16...)
2. **Billing minimum:** 60-second minimum when warehouse starts
3. **Multi-cluster requirement:** Enterprise Edition or higher
4. **Cache behavior:** Dropped on suspend; larger warehouse = larger cache
5. **Resize impact:** Does not affect currently running queries

### Common Exam Question Patterns

**Scenario: Slow complex queries**
- Answer: Scale UP (increase warehouse size)

**Scenario: Many users experiencing query queuing**
- Answer: Scale OUT (multi-cluster warehouse) or create additional warehouses

**Scenario: Data loading performance**
- Answer: File count/size matters more than warehouse size; smaller warehouses often sufficient

**Scenario: Queries spilling to storage**
- Answer: Increase warehouse size for more memory

**Scenario: Cost optimization with variable workloads**
- Answer: Auto-scale multi-cluster with Economy scaling policy

**Scenario: BI dashboards with repeated queries**
- Answer: Keep warehouse running longer (10+ min auto-suspend) to utilize cache

### Trap Answers to Avoid

- "Larger warehouse always means faster queries" - FALSE for simple queries
- "Multi-cluster warehouses improve individual query performance" - FALSE (they improve concurrency)
- "Resizing a warehouse affects currently running queries" - FALSE (only new/queued queries)
- "Data loading always benefits from larger warehouses" - FALSE (file count matters more)

### Sample Exam Questions

**Q1:** A user reports that their complex analytical query is running slowly on a Small warehouse. What is the BEST first action?

A) Create a multi-cluster warehouse
B) Increase the warehouse size to Large or X-Large
C) Enable Query Acceleration Service
D) Reduce the auto-suspend timeout

**Answer:** B - Scale up is the appropriate solution for improving complex query performance

---

**Q2:** Your company's BI tool has 50 concurrent users running reports, and users are experiencing significant query queuing. You are using Enterprise Edition. What is the recommended solution?

A) Increase the warehouse size from Medium to 2X-Large
B) Create a multi-cluster warehouse with auto-scale mode
C) Disable auto-suspend to maintain cache
D) Enable Query Acceleration Service

**Answer:** B - Multi-cluster warehouses are designed for handling concurrency issues

---

**Q3:** Which of the following statements about warehouse sizing is TRUE?

A) Larger warehouses always result in faster query execution
B) Each warehouse size increase doubles the credit consumption
C) Multi-cluster warehouses are available in all Snowflake editions
D) Resizing a warehouse immediately impacts currently running queries

**Answer:** B - The credit doubling pattern is a key characteristic

---

**Q4:** A query is showing significant bytes_spilled_to_remote_storage in the query profile. What does this indicate and what is the recommended action?

A) The query result set is too large; add LIMIT clause
B) The warehouse ran out of memory; increase warehouse size
C) The query is using too many JOINs; simplify the query
D) The cache is full; clear the warehouse cache

**Answer:** B - Memory spillage to remote storage indicates insufficient memory; scale up the warehouse

---

## Quick Reference Card

```
WAREHOUSE SIZING QUICK REFERENCE
================================

SIZES & CREDITS (per hour):
XS=1 | S=2 | M=4 | L=8 | XL=16 | 2XL=32 | 3XL=64 | 4XL=128 | 5XL=256 | 6XL=512

BILLING:
- Per-second billing
- 60-second minimum per start

SCALE UP (Resize):
- More resources per cluster
- Better for: Complex queries, memory issues
- All editions

SCALE OUT (Multi-cluster):
- More clusters of same size
- Better for: Concurrency, queuing
- Enterprise Edition required

CACHE:
- Dropped on suspend
- Larger warehouse = larger cache
- BI workloads: 10+ min auto-suspend

MULTI-CLUSTER MODES:
- Maximized: MIN = MAX (static clusters)
- Auto-scale: MIN < MAX (dynamic)

MEMORY SPILLAGE:
- Local disk first, then remote
- Solution: Increase warehouse size
```

---

*Study guide based on official Snowflake documentation. For the most current information, always refer to docs.snowflake.com.*
