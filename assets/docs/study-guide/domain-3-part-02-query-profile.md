# Domain 3: Performance Concepts
## Part 2: Query Profile Analysis

**Exam Weight:** This topic is part of Domain 3 (10-15% of exam)

---

## Overview

The Query Profile is Snowflake's primary tool for understanding query execution and identifying performance bottlenecks. It provides a visual representation of how a query was executed, including operator nodes, statistics, and metrics. Mastering Query Profile analysis is essential for the SnowPro Core exam and for optimizing Snowflake workloads in practice.

---

## Section 1: Accessing the Query Profile

### In Snowsight

1. Navigate to **Monitoring** > **Query History**
2. Select a query by clicking its Query ID
3. Click the **Query Profile** tab

### From Worksheets

After running a query:
1. View the **Query Details** pane
2. Select the **...** (more menu) > **View Query Profile**
3. The query profile opens in a new browser tab

### Programmatic Access

```sql
-- Get performance statistics for a query's operators
SELECT * FROM TABLE(GET_QUERY_OPERATOR_STATS('<query_id>'));

-- View query history with performance metrics
SELECT
    query_id,
    query_text,
    total_elapsed_time,
    bytes_scanned,
    partitions_scanned,
    partitions_total
FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY
WHERE query_id = '<query_id>';
```

---

## Section 2: Query Profile Components

### Profile Overview Panel

When viewing the Query Profile without selecting a specific operator, you see overall statistics:

| Statistic | Description |
|-----------|-------------|
| Total Execution Time | Wall-clock time for query execution |
| Rows Produced | Total rows returned by the query |
| Partitions Scanned | Micro-partitions accessed |
| Partitions Total | Total micro-partitions in scanned tables |
| Bytes Scanned | Total data read from storage |
| Percentage Scanned from Cache | Data read from warehouse cache vs. storage |

### Most Expensive Nodes Pane

The Query Profile automatically identifies operators consuming the most resources:

- Lists operators by processing time (descending)
- Helps quickly identify bottlenecks
- Click any node to navigate to it in the operator tree

### Operator Tree

The graphical representation of query execution showing:

- **Nodes** - Individual operations (TableScan, Filter, Join, etc.)
- **Edges** - Data flow between operators
- **Statistics** - Per-operator metrics
- **Row Counts** - Number of rows processed at each stage

---

## Section 3: Operator Node Types

### Data Access Operators

| Operator | Description | Key Metrics |
|----------|-------------|-------------|
| **TableScan** | Reads data from a table | Partitions scanned, bytes read, pruning efficiency |
| **IndexScan** | Reads using a secondary index (hybrid tables) | Access predicates, index name |
| **ExternalScan** | Reads from external tables/stages | Files scanned, external bytes |
| **ValuesClause** | Generates inline data | Rows produced |

### Filter Operators

| Operator | Description | Performance Indicator |
|----------|-------------|----------------------|
| **Filter** | Applies WHERE clause conditions | High input vs. low output = good selectivity |
| **JoinFilter** | Filters before join operations | Reduces join input size |

### Join Operators

| Operator | Description | When Used |
|----------|-------------|-----------|
| **Join** | Combines rows from multiple sources | Standard join operations |
| **HashJoin** | Hash-based join algorithm | Equi-joins, larger datasets |
| **MergeJoin** | Merge-based join on sorted data | Sorted inputs |
| **NestedLoops** | Nested loop join | Small tables, non-equi joins |
| **CrossJoin** | Cartesian product | No join condition (often indicates a problem) |

### Aggregation Operators

| Operator | Description | Notes |
|----------|-------------|-------|
| **Aggregate** | Performs GROUP BY, SUM, COUNT, etc. | Watch for high cardinality |
| **WindowFunction** | OVER clause operations | ROW_NUMBER, RANK, LAG, LEAD |
| **Sort** | ORDER BY operations | Memory intensive for large datasets |
| **SortWithLimit** | ORDER BY with LIMIT | More efficient than separate operations |

### Data Movement Operators

| Operator | Description | Performance Impact |
|----------|-------------|-------------------|
| **Projection** | Selects specific columns | Reduces data width |
| **UnionAll** | Combines result sets | Multiple inputs merged |
| **Flatten** | Expands semi-structured data | Can multiply row counts |
| **Generator** | Produces sequences | Used with table functions |

### DML Operators

| Operator | Description | Context |
|----------|-------------|---------|
| **Insert** | Writes data to tables | COPY, INSERT statements |
| **Update** | Modifies existing rows | UPDATE statements |
| **Delete** | Removes rows | DELETE statements |
| **Merge** | Combines INSERT/UPDATE/DELETE | MERGE statements |

---

## Section 4: Key Statistics and Metrics

### Per-Operator Statistics

When you click on an operator node, detailed statistics appear:

| Category | Metrics | Interpretation |
|----------|---------|----------------|
| **Processing** | % of total time | Identifies expensive operations |
| **Local Disk I/O** | Bytes written/read | Indicates local spillage |
| **Remote Disk I/O** | Bytes written/read | Indicates remote spillage (worse) |
| **Network** | Bytes sent/received | Data transfer between nodes |
| **Synchronization** | Wait time | Parallel processing coordination |
| **Initialization** | Setup time | Query compilation and planning |

### TableScan Specific Statistics

| Statistic | Description | Optimal Value |
|-----------|-------------|---------------|
| **Partitions scanned** | Micro-partitions read | Low (good pruning) |
| **Partitions total** | Total table partitions | Reference only |
| **Bytes scanned** | Data read from storage | Minimize |
| **Percentage scanned from cache** | Cache hit rate | High (>80%) |
| **Scan progress** | Completion percentage | 100% when done |

### Query Acceleration Statistics

When QAS is enabled and used:

| Statistic | Description |
|-----------|-------------|
| **Partitions scanned by service** | Partitions offloaded to QAS |
| **Scans selected for acceleration** | Number of accelerated table scans |

---

## Section 5: Identifying Performance Bottlenecks

### Spillage Issues

**What is Spillage?**
When a query processes more data than fits in warehouse memory, data "spills" to disk.

| Spillage Type | Performance Impact | Severity |
|---------------|-------------------|----------|
| **Local Disk** | Moderate slowdown | Medium |
| **Remote Disk** | Severe slowdown | High |

**Identifying Spillage in Query Profile:**
- Look for "Bytes spilled to local storage" or "Bytes spilled to remote storage"
- Check operators with high processing time

**Finding Queries with Spillage:**
```sql
SELECT
    query_id,
    SUBSTR(query_text, 1, 50) AS partial_query_text,
    user_name,
    warehouse_name,
    bytes_spilled_to_local_storage,
    bytes_spilled_to_remote_storage
FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY
WHERE (bytes_spilled_to_local_storage > 0
       OR bytes_spilled_to_remote_storage > 0)
AND start_time::DATE > DATEADD('days', -45, CURRENT_DATE)
ORDER BY bytes_spilled_to_remote_storage DESC,
         bytes_spilled_to_local_storage DESC
LIMIT 10;
```

**Solutions for Spillage:**
1. Use a larger warehouse (more memory)
2. Process data in smaller batches
3. Optimize query to reduce intermediate data

### Poor Partition Pruning

**What is Pruning?**
Snowflake's ability to skip micro-partitions that don't contain relevant data based on metadata.

**Indicators of Poor Pruning:**
- High ratio of partitions scanned to partitions total
- Large bytes scanned for queries returning few rows

**Pruning Efficiency Calculation:**
```
Pruning Efficiency = 1 - (Partitions Scanned / Partitions Total)
```

| Efficiency | Assessment |
|------------|------------|
| > 90% | Excellent |
| 70-90% | Good |
| 50-70% | Fair |
| < 50% | Poor - consider clustering |

**Improving Pruning:**
1. Add WHERE clauses on clustering key columns
2. Define/modify clustering keys
3. Use time-based filters on timestamp columns

### Exploding Joins

**What is an Exploding Join?**
A join that produces significantly more rows than input tables, indicating potential issues.

**Identifying in Query Profile:**
- Join operator output rows >> input rows
- Query Insights flag: "Exploding join"

**Common Causes:**
- Missing or incorrect join conditions
- Many-to-many relationships
- Cartesian products (CrossJoin operator)

**Solutions:**
1. Verify join conditions are correct
2. Add additional join predicates
3. Use DISTINCT or aggregation if appropriate

### Inefficient Filters

**Filter Performance Indicators:**

| Scenario | Query Insight | Recommendation |
|----------|--------------|----------------|
| No filter on table scan | "No filter on table scan" | Add WHERE clause |
| Filter not applicable | "Filter not applicable" | Make filter more selective |
| Filter not selective | "Filter not selective" | Use different predicates |
| LIKE with leading wildcard | "LIKE filter with leading wildcard" | Avoid `LIKE '%pattern'` |

### Queue Time

**Understanding Queue Time:**
- Query waits in queue when warehouse resources are exhausted
- High queue time indicates warehouse is overloaded

**Identifying Queue Issues:**
- Check "Queued" time in Query History
- Query Insight: "Query was in the queue for the warehouse for too long"

**Solutions:**
1. Increase warehouse size
2. Use multi-cluster warehouse
3. Distribute workload across multiple warehouses

---

## Section 6: Query Insights

### Overview

Query Insights are automatic recommendations Snowflake provides when performance issues are detected. They appear in the Query Profile tab with highlighted operator nodes.

### Common Insight Types

| Insight Type ID | Description | Recommendation |
|-----------------|-------------|----------------|
| `QUERY_INSIGHT_NO_FILTER_ON_TOP_OF_TABLE_SCAN` | No WHERE clause | Add filtering conditions |
| `QUERY_INSIGHT_INAPPLICABLE_FILTER_ON_TABLE_SCAN` | Filter doesn't reduce rows | Use more selective predicates |
| `QUERY_INSIGHT_UNSELECTIVE_FILTER` | Filter removes few rows | Improve filter selectivity |
| `QUERY_INSIGHT_LIKE_WITH_LEADING_WILDCARD` | Pattern starts with `%` | Restructure pattern or use search optimization |
| `QUERY_INSIGHT_FILTER_WITH_CLUSTERING_KEY` | Filter uses clustering key | Positive - query benefits from clustering |
| `QUERY_INSIGHT_SEARCH_OPTIMIZATION_USED` | Search optimization applied | Positive - query benefited |
| `QUERY_INSIGHT_JOIN_WITH_NO_JOIN_CONDITION` | Cross join detected | Add join condition |
| `QUERY_INSIGHT_INEFFICIENT_JOIN_CONDITION` | Complex join condition | Simplify join predicate |
| `QUERY_INSIGHT_EXPLODING_JOIN` | Join multiplies rows | Review join conditions |
| `QUERY_INSIGHT_INEFFICIENT_AGGREGATE` | Unnecessary DISTINCT/GROUP BY | Remove redundant aggregation |
| `QUERY_INSIGHT_UNNECESSARY_UNION_DISTINCT` | UNION instead of UNION ALL | Use UNION ALL for disjoint sets |
| `QUERY_INSIGHT_REMOTE_SPILLAGE` | Data spilled to remote storage | Use larger warehouse or batch processing |
| `QUERY_INSIGHT_QUEUED_OVERLOAD` | Long queue time | Scale warehouse or distribute workload |

### Accessing Query Insights

**In Snowsight:**
1. Navigate to Query Profile tab
2. View the Query Insights pane on the right
3. Click "View" next to any insight for details

**Via SQL:**
```sql
SELECT *
FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_INSIGHTS
WHERE query_id = '<query_id>';
```

### Limitations

Query Insights are NOT produced for:
- Multi-step query plans
- Queries on secure objects
- Hybrid table (Unistore) queries
- Native App queries
- EXPLAIN queries
- Queries using result cache

---

## Section 7: Hybrid Table Query Profiles

### Scan Mode Attribute

For hybrid tables, the Query Profile shows a **Scan Mode** attribute:

| Scan Mode | Description | Use Case |
|-----------|-------------|----------|
| `ROW_BASED` | Reads from row store or uses indexes | OLTP operations, point lookups |
| `COLUMN_BASED` | Reads from object storage | Analytical queries, large scans |

### Index Scan Operators

Hybrid tables can show **IndexScan** operators (not available for standard tables):

- **Fully qualified index name** displayed
- **Access predicates** show conditions applied to index
- Predicate placeholders indicate pushed-down constants: `COLUMN = (:SFAP_PRE_NR_1)`

### Columnar Cache Statistics

For hybrid table scans:
- **Percentage scanned from cache** shows columnar warehouse cache usage
- Cache contains data read from hybrid table storage provider
- Standard query result cache does NOT apply to hybrid tables

### Throttling Indicator

The Profile Overview may show **Hybrid Table Requests Throttling** percentage:
- High percentage indicates excessive read/write requests
- Suggests quota limits being reached
- Consider request optimization or quota increase

---

## Section 8: Performance Optimization Techniques

### Using Query Profile for Optimization

**Step-by-Step Analysis:**

1. **Identify the Most Expensive Nodes**
   - Check the "Most Expensive Nodes" pane
   - Focus on operators using >20% of total time

2. **Analyze TableScan Operators**
   - Check partition pruning efficiency
   - Verify cache hit rate
   - Look for spillage indicators

3. **Examine Join Operators**
   - Compare input vs. output row counts
   - Check for CrossJoin operators
   - Verify join conditions are correct

4. **Review Filter Effectiveness**
   - High input to low output ratio = good
   - Check Query Insights for filter warnings

5. **Check for Spillage**
   - Local disk I/O indicates spillage
   - Remote disk I/O is more severe

### Cache Optimization

**Warehouse Cache:**
- Data cached on warehouse for faster subsequent queries
- Cache cleared when warehouse suspends
- Larger warehouses = larger cache

**Auto-Suspend Guidelines:**

| Use Case | Recommended Timeout | Reasoning |
|----------|---------------------|-----------|
| Tasks | Immediate (60 seconds) | Cache not beneficial |
| DevOps/Ad-hoc | 5 minutes | Varied queries |
| BI/Analytics | 10+ minutes | Repeated queries benefit from cache |

**Finding Cache Usage:**
```sql
SELECT
    warehouse_name,
    COUNT(*) AS query_count,
    SUM(bytes_scanned) AS bytes_scanned,
    SUM(bytes_scanned * percentage_scanned_from_cache) AS bytes_from_cache,
    SUM(bytes_scanned * percentage_scanned_from_cache) /
        NULLIF(SUM(bytes_scanned), 0) AS cache_hit_rate
FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY
WHERE start_time >= DATEADD(month, -1, CURRENT_TIMESTAMP())
AND bytes_scanned > 0
GROUP BY warehouse_name
ORDER BY cache_hit_rate;
```

### Warehouse Sizing for Performance

**When to Increase Size:**
- High spillage (local or remote)
- Complex queries with many operators
- Large data volumes

**Size Impact:**
- Each size doubles compute and memory
- Larger warehouse = more parallelism
- Cost doubles with each size increase

**When to Use Multi-Cluster Instead:**
- High concurrency (many users)
- Queuing issues
- Variable workload patterns

---

## Exam Tips and Common Question Patterns

### High-Frequency Topics

1. **Query Profile Access** - Know where to find it (Snowsight, Query History)
2. **Operator Types** - Understand common operators (TableScan, Filter, Join, Aggregate)
3. **Spillage** - Local vs. remote, causes and solutions
4. **Partition Pruning** - What it is and how to identify poor pruning
5. **Query Insights** - Types and meanings
6. **Cache** - Warehouse cache behavior, auto-suspend impact

### Common Exam Questions

**Q: What does high "bytes spilled to remote storage" indicate?**
A: Query used more memory than available, causing severe performance degradation. Solution: use larger warehouse or process in batches.

**Q: How do you identify poor partition pruning?**
A: Compare "Partitions scanned" to "Partitions total" - high ratio indicates poor pruning.

**Q: What happens to the warehouse cache when the warehouse suspends?**
A: The cache is dropped/cleared.

**Q: Which operator indicates a potential missing join condition?**
A: CrossJoin operator or Query Insight "Join with no join condition"

**Q: What tool provides automatic performance recommendations in Query Profile?**
A: Query Insights

**Q: What does COLUMN_BASED scan mode indicate for hybrid tables?**
A: Query is reading from object storage (analytical pattern)

**Q: Which function provides programmatic access to Query Profile statistics?**
A: GET_QUERY_OPERATOR_STATS

### Key Distinctions to Remember

| Concept | Key Point |
|---------|-----------|
| Local vs. Remote Spillage | Remote spillage is much worse for performance |
| TableScan vs. IndexScan | IndexScan only appears for hybrid tables with secondary indexes |
| Warehouse Cache vs. Result Cache | Warehouse cache stores raw data; result cache stores query results |
| Filter Selectivity | High selectivity = few rows pass through = good |
| Pruning | Fewer partitions scanned relative to total = better |

### Tricky Scenarios

1. **Spillage with QAS Enabled** - QAS writes small amounts to remote storage for bookkeeping; don't confuse with actual spillage
2. **High Cache Hit Rate but Poor Performance** - Cache helps but doesn't fix bad query design
3. **Good Pruning but Slow Query** - Pruning is one factor; check other operators
4. **CrossJoin in Query Profile** - Not always bad; some queries legitimately need Cartesian products

---

## Practice Questions

### Question 1
What view in the Account Usage schema provides Query Insights for executed queries?

- A) QUERY_HISTORY
- B) QUERY_INSIGHTS
- C) QUERY_PROFILE
- D) QUERY_ACCELERATION_ELIGIBLE

<details>
<summary>Show Answer</summary>

**Answer: B) QUERY_INSIGHTS**

The QUERY_INSIGHTS view in SNOWFLAKE.ACCOUNT_USAGE contains the insights generated for queries.

</details>

### Question 2
A TableScan operator shows 95 partitions scanned out of 1000 total partitions. What is the pruning efficiency?

- A) 9.5%
- B) 90.5%
- C) 95%
- D) 5%

<details>
<summary>Show Answer</summary>

**Answer: B) 90.5%**

Pruning Efficiency = 1 - (Partitions Scanned / Partitions Total)
= 1 - (95 / 1000) = 1 - 0.095 = 0.905 = 90.5%

This is excellent pruning - only 9.5% of partitions needed to be scanned.

</details>

### Question 3
Which type of spillage has the most severe impact on query performance?

- A) Local disk spillage
- B) Remote disk spillage
- C) Cache spillage
- D) Memory spillage

<details>
<summary>Show Answer</summary>

**Answer: B) Remote disk spillage**

Remote disk spillage (to cloud storage) has the most severe performance impact due to network latency. Local disk spillage is faster but still slower than in-memory processing.

</details>

### Question 4
What does the Query Insight "QUERY_INSIGHT_EXPLODING_JOIN" indicate?

- A) The join is using too much memory
- B) The join is producing many more rows than input tables
- C) The join condition is missing
- D) The join is using an inefficient algorithm

<details>
<summary>Show Answer</summary>

**Answer: B) The join is producing many more rows than input tables**

An exploding join returns many more rows than are in the tables being joined, often indicating a problem with join conditions or unintended many-to-many relationships.

</details>

### Question 5
In a hybrid table Query Profile, what does "ROW_BASED" scan mode indicate?

- A) The query is scanning all rows in the table
- B) The query is reading from the row store or using indexes
- C) The query is performing row-by-row processing
- D) The query is using a row-level filter

<details>
<summary>Show Answer</summary>

**Answer: B) The query is reading from the row store or using indexes**

ROW_BASED scan mode indicates the query is accessing the hybrid table's row store, which is optimized for OLTP operations and point lookups.

</details>

### Question 6
Which SQL function can be used to programmatically access Query Profile operator statistics?

- A) SYSTEM$QUERY_PROFILE
- B) GET_QUERY_STATISTICS
- C) GET_QUERY_OPERATOR_STATS
- D) SYSTEM$GET_PROFILE_STATS

<details>
<summary>Show Answer</summary>

**Answer: C) GET_QUERY_OPERATOR_STATS**

The GET_QUERY_OPERATOR_STATS table function returns performance statistics for each operator in a query's execution plan.

</details>

### Question 7
What is the recommended auto-suspend timeout for BI and analytics warehouses to optimize cache usage?

- A) 60 seconds (immediate)
- B) 5 minutes
- C) 10+ minutes
- D) Never suspend

<details>
<summary>Show Answer</summary>

**Answer: C) 10+ minutes**

BI and analytics workloads often run similar queries repeatedly, so maintaining the warehouse cache (by not suspending too quickly) improves performance. 10+ minutes is recommended.

</details>

### Question 8
Which Query Insight indicates that a filter is starting with a wildcard character in a LIKE pattern?

- A) QUERY_INSIGHT_UNSELECTIVE_FILTER
- B) QUERY_INSIGHT_INAPPLICABLE_FILTER_ON_TABLE_SCAN
- C) QUERY_INSIGHT_LIKE_WITH_LEADING_WILDCARD
- D) QUERY_INSIGHT_NO_FILTER_ON_TOP_OF_TABLE_SCAN

<details>
<summary>Show Answer</summary>

**Answer: C) QUERY_INSIGHT_LIKE_WITH_LEADING_WILDCARD**

This insight appears when a LIKE filter starts with `%`, which prevents efficient index/pruning usage and often results in full table scans.

</details>

### Question 9
A query shows high "Percentage scanned from cache" but is still slow. What should you investigate next?

- A) Increase warehouse size
- B) Check for spillage and expensive operators
- C) Enable Query Acceleration Service
- D) Clear the warehouse cache

<details>
<summary>Show Answer</summary>

**Answer: B) Check for spillage and expensive operators**

Good cache hit rate means data access is efficient, but the query could still have problems like spillage, exploding joins, or expensive operations. Check the Most Expensive Nodes and spillage statistics.

</details>

### Question 10
Which operator type would you expect to see for a secondary index lookup on a hybrid table?

- A) TableScan
- B) IndexScan
- C) SecondaryLookup
- D) HybridScan

<details>
<summary>Show Answer</summary>

**Answer: B) IndexScan**

IndexScan operators appear when a secondary index is used to scan a hybrid table. TableScan is used for primary key index scans, and IndexScan for other indexes.

</details>

---

## Quick Reference Card

### Query Profile Access
```
Snowsight: Monitoring > Query History > [Query ID] > Query Profile
Worksheet: Query Details > ... > View Query Profile
SQL: SELECT * FROM TABLE(GET_QUERY_OPERATOR_STATS('<query_id>'));
```

### Key Operators
```
Data Access:  TableScan, IndexScan, ExternalScan
Filtering:    Filter, JoinFilter
Joins:        Join, HashJoin, MergeJoin, CrossJoin
Aggregation:  Aggregate, WindowFunction, Sort
Data Movement: Projection, UnionAll, Flatten
DML:          Insert, Update, Delete, Merge
```

### Performance Red Flags
```
- Bytes spilled to remote storage > 0
- Partitions scanned / Partitions total > 50%
- CrossJoin operator (unless intentional)
- Query Insights with warnings
- Long queue time
```

### Key Statistics
```
Pruning Efficiency = 1 - (Partitions Scanned / Partitions Total)
Cache Hit Rate = Bytes from Cache / Total Bytes Scanned
```

### Spillage Solutions
```
1. Use larger warehouse (more memory)
2. Process data in smaller batches
3. Optimize query to reduce intermediate results
```

### Query Insights Categories
```
Positive:  FILTER_WITH_CLUSTERING_KEY, SEARCH_OPTIMIZATION_USED
Negative:  REMOTE_SPILLAGE, EXPLODING_JOIN, NO_FILTER_ON_TABLE_SCAN
Warning:   UNSELECTIVE_FILTER, LIKE_WITH_LEADING_WILDCARD
```

---

*Last Updated: January 2026*
*Source: Official Snowflake Documentation*
