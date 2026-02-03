# Domain 3: Performance Concepts
## Part 7: Materialized Views for Performance

**Exam Weight:** This topic is part of Domain 3 (10-15% of exam)

**Edition Requirement:** Materialized Views require **Enterprise Edition** or higher

---

## Overview

Materialized views are pre-computed data sets derived from a query specification and stored for later use. Unlike regular views that execute their underlying query each time they are accessed, materialized views store actual query results, providing significant performance benefits for repetitive, expensive queries. This is an Enterprise Edition feature that is commonly tested on the SnowPro Core exam.

---

## Section 1: Materialized View Fundamentals

### What is a Materialized View?

A materialized view is a database object that:

- **Stores pre-computed query results** - Data is physically stored, not computed at query time
- **Automatically maintained by Snowflake** - Background service keeps data synchronized with base table
- **Transparently used by the optimizer** - Can be automatically substituted for base table queries
- **Always returns current data** - Even if maintenance is behind, Snowflake ensures accurate results

### Key Characteristics

| Characteristic | Description |
|---------------|-------------|
| **Storage** | Results are physically stored (consumes storage space) |
| **Maintenance** | Automatically refreshed by Snowflake background service |
| **Data Currency** | Always returns up-to-date results |
| **Query Rewrite** | Optimizer can automatically use MV for base table queries |
| **Single Table** | Must be based on a single table (no joins) |
| **Clustering** | Can have independent clustering key from base table |

### How Materialized Views Work

1. **Creation** - MV definition executes query and stores results
2. **Background Refresh** - Snowflake service monitors base table changes
3. **Incremental Updates** - Only changed data is processed (not full refresh)
4. **Query Time** - Returns stored results or combines MV with fresh base table data

```sql
-- Create a materialized view
CREATE MATERIALIZED VIEW mv_sales_summary AS
  SELECT
    region,
    product_category,
    SUM(sales_amount) AS total_sales,
    COUNT(*) AS transaction_count
  FROM sales_transactions
  WHERE sale_date >= '2024-01-01'
  GROUP BY region, product_category;
```

---

## Section 2: Materialized Views vs Regular Views

### Comparison Table

| Feature | Regular View | Materialized View |
|---------|-------------|-------------------|
| **Data Storage** | No (virtual) | Yes (physical) |
| **Query Execution** | Every access | Pre-computed |
| **Performance** | Depends on base query | Faster (uses stored results) |
| **Storage Cost** | None | Stores query results |
| **Maintenance Cost** | None | Background refresh credits |
| **Data Freshness** | Always current | Always current (automatic sync) |
| **Supports Clustering** | No | Yes |
| **Edition Required** | All editions | Enterprise+ |
| **Supports Joins** | Yes | No |
| **Supports Subqueries** | Yes | No (limited) |

### When to Use Each

**Use Regular Views When:**
- Query is simple and fast
- Data changes frequently
- Results vary based on parameters
- Cost is a primary concern
- Joins are required

**Use Materialized Views When:**
- Query is expensive (aggregations, complex filters)
- Query runs frequently
- Base table data changes infrequently
- Performance is critical
- Results are used by multiple queries/users

### Performance Comparison

| Scenario | Regular View | Materialized View |
|----------|-------------|-------------------|
| First query | Full computation | Read stored results |
| Repeated query | Full computation | Read stored results |
| After base table update | Full computation | Partial update + read |
| Complex aggregation | Slow | Fast |
| Simple lookup | Fast | Fast (overhead for simple queries) |

---

## Section 3: Query Rewrite and Optimizer Usage

### Automatic Query Rewrite

The Snowflake query optimizer can **automatically rewrite** queries against base tables to use materialized views without requiring explicit MV references:

```sql
-- Materialized view definition
CREATE MATERIALIZED VIEW mv_region_sales AS
  SELECT region, SUM(amount) AS total
  FROM sales
  WHERE year >= 2020
  GROUP BY region;

-- User query against base table
SELECT region, SUM(amount) AS total
FROM sales
WHERE year >= 2023  -- More restrictive than MV
GROUP BY region;

-- Optimizer may rewrite to use MV instead of base table
```

### Query Rewrite Patterns (Subsumption)

The optimizer uses **subsumption** rules to determine if an MV can satisfy a query:

| Pattern | Description | Example |
|---------|-------------|---------|
| **Range Subsumption** | MV range contains query range | MV: year > 2020; Query: year > 2023 |
| **OR Subsumption** | MV OR conditions cover query | MV: col IN (A,B,C); Query: col = B |
| **AND Subsumption** | MV AND filters are subset | MV: col1 = X; Query: col1 = X AND col2 = Y |
| **Aggregate Subsumption** | MV has finer grain than query | MV: GROUP BY col1, col2; Query: GROUP BY col1 |

### When Query Rewrite Does NOT Occur

The optimizer may skip MV usage when:

- Base table clustering provides equivalent pruning
- Query profile would not benefit from MV
- MV is suspended
- User lacks privileges on MV (but query rewrite still works for base table queries)

### Checking Query Rewrite Usage

```sql
-- View query plan to see if MV is used
EXPLAIN SELECT ... FROM base_table ...;

-- Check query profile for "MaterializedView" in objects accessed
```

---

## Section 4: Supported Operations and Limitations

### Supported Features in MV Definitions

**Aggregate Functions:**
| Function | Supported | Notes |
|----------|-----------|-------|
| SUM | Yes | Cannot be nested |
| COUNT | Yes | Cannot be nested |
| COUNT_IF | Yes | |
| AVG | Yes | Not in PIVOT |
| MIN | Yes | |
| MAX | Yes | |
| APPROX_COUNT_DISTINCT | Yes | HLL-based |

**Other Supported Features:**
- WHERE clauses with filters
- GROUP BY
- Column expressions
- CASE statements
- Deterministic functions
- CLUSTER BY (on the MV itself)
- SECURE option

### Limitations on MV Definitions

**NOT Supported:**
| Feature | Status |
|---------|--------|
| **JOINs (including self-joins)** | NOT supported |
| **Subqueries** | NOT supported |
| **Window functions** | NOT supported |
| **UDFs (all types)** | NOT supported |
| **Non-deterministic functions** | NOT supported |
| **DISTINCT with aggregates** | NOT supported |
| **Nested aggregates** | NOT supported |
| **HAVING clause** | NOT supported |
| **ORDER BY** | NOT supported |
| **LIMIT** | NOT supported |
| **Set operators (UNION, EXCEPT, INTERSECT)** | NOT supported |
| **FLATTEN** | NOT supported |
| **External tables** | NOT supported |
| **Dynamic tables** | NOT supported |
| **Other materialized views** | NOT supported |
| **Time Travel** | NOT supported |

### DML Limitations on MVs

| Operation | Allowed? |
|-----------|----------|
| SELECT | Yes |
| INSERT | No |
| UPDATE | No |
| DELETE | No |
| TRUNCATE | No |
| Direct CLONE | No |

---

## Section 5: Automatic Maintenance

### How Background Maintenance Works

Snowflake automatically maintains materialized views through a background service:

1. **Refresh Operation** - Inserts new rows when base table has INSERTs
2. **Compaction Operation** - Removes deleted rows from MV

```sql
-- Check maintenance status
SHOW MATERIALIZED VIEWS LIKE 'mv_name';

-- Key columns in output:
-- REFRESHED_ON: Last DML processed by refresh
-- COMPACTED_ON: Last DML processed by compaction
-- BEHIND_BY: Time lag behind base table updates
```

### Maintenance Triggers

| Event | MV Action |
|-------|-----------|
| INSERT into base table | Refresh operation |
| UPDATE base table | Refresh + compaction |
| DELETE from base table | Compaction operation |
| Base table reclustering | Refresh operation |

### Query Behavior During Maintenance Lag

Even when MV maintenance is behind:
- **Queries always return current data**
- Snowflake combines MV data with fresh base table changes
- Performance may be reduced until MV catches up
- Results are never stale or incorrect

### Suspending and Resuming Maintenance

```sql
-- Suspend maintenance (also disables querying)
ALTER MATERIALIZED VIEW mv_name SUSPEND;

-- Resume maintenance (required to query)
ALTER MATERIALIZED VIEW mv_name RESUME;
```

**Important:** Suspended MVs cannot be queried. Suspending defers costs but does not reduce them.

---

## Section 6: Cost Considerations

### Two Cost Categories

| Cost Type | Description |
|-----------|-------------|
| **Storage** | Physical storage for MV results |
| **Compute** | Credits for background maintenance |

### Maintenance Credit Usage

Maintenance costs are influenced by:

| Factor | Impact on Costs |
|--------|-----------------|
| Frequency of base table changes | More changes = more maintenance |
| Volume of changes per operation | Larger batches = more efficient |
| Number of MVs on the table | Each MV has independent maintenance |
| MV clustering (if different from base) | May require more micro-partition rewrites |
| Size of the MV result set | Larger results = more storage/processing |

### Cost Monitoring

```sql
-- View MV maintenance costs by day and object
SELECT
  DATE_TRUNC('day', start_time) AS day,
  materialized_view_name,
  SUM(credits_used) AS credits_used
FROM snowflake.account_usage.materialized_view_refresh_history
WHERE start_time >= DATEADD('month', -1, CURRENT_TIMESTAMP())
GROUP BY 1, 2
ORDER BY 3 DESC;

-- Information Schema function
SELECT * FROM TABLE(INFORMATION_SCHEMA.MATERIALIZED_VIEW_REFRESH_HISTORY());
```

### Credit Tracking

Maintenance credits are tracked in a Snowflake-provided warehouse:
- **Warehouse name:** `MATERIALIZED_VIEW_MAINTENANCE`
- **Cannot be controlled by resource monitors**
- **Visible in Admin > Cost Management > Consumption (Snowsight)**

### Cost Optimization Strategies

| Strategy | Benefit |
|----------|---------|
| Batch DML operations | Fewer, larger updates = less overhead |
| Limit number of MVs | Each MV has maintenance overhead |
| Use selective filters | Smaller MV = less storage/maintenance |
| Avoid clustering base table unnecessarily | Reclustering triggers MV refresh |
| Monitor BEHIND_BY | Identify problematic MVs |

---

## Section 7: Materialized Views and Clustering

### Key Concepts

- MVs can have their own clustering key
- MV clustering can differ from base table clustering
- Clustering MVs often more cost-effective than clustering large base tables

### Best Practices for Clustering

| Scenario | Recommendation |
|----------|----------------|
| New table with MV | Create MV first, then cluster MV (not table) |
| Existing clustered table | Consider removing table clustering if MV covers queries |
| Multiple MVs | Cluster only the MVs that benefit most |
| High-change base tables | Minimize clustered MVs (increases maintenance) |

```sql
-- Create MV with clustering
CREATE MATERIALIZED VIEW mv_sales_by_region
  CLUSTER BY (region)
AS
  SELECT region, SUM(amount) AS total
  FROM sales
  GROUP BY region;

-- Add clustering to existing MV
ALTER MATERIALIZED VIEW mv_name CLUSTER BY (column1, column2);

-- Remove clustering
ALTER MATERIALIZED VIEW mv_name DROP CLUSTERING KEY;
```

---

## Section 8: DDL Commands Reference

### Creating Materialized Views

```sql
-- Basic syntax
CREATE [ OR REPLACE ] [ SECURE ] MATERIALIZED VIEW [ IF NOT EXISTS ] <name>
  [ CLUSTER BY (<column_list>) ]
  [ COPY GRANTS ]
  [ COMMENT = '<string>' ]
AS <select_statement>;

-- Example with all options
CREATE OR REPLACE SECURE MATERIALIZED VIEW my_schema.mv_summary
  CLUSTER BY (region)
  COMMENT = 'Regional sales summary'
AS
  SELECT region, SUM(sales) AS total_sales
  FROM my_schema.sales_table
  WHERE year = 2024
  GROUP BY region;
```

### Managing Materialized Views

```sql
-- Show all materialized views
SHOW MATERIALIZED VIEWS;
SHOW MATERIALIZED VIEWS IN SCHEMA my_schema;
SHOW MATERIALIZED VIEWS LIKE 'mv_%';

-- Describe structure
DESCRIBE MATERIALIZED VIEW mv_name;
DESC MATERIALIZED VIEW mv_name;

-- Alter materialized view
ALTER MATERIALIZED VIEW mv_name SUSPEND;
ALTER MATERIALIZED VIEW mv_name RESUME;
ALTER MATERIALIZED VIEW mv_name CLUSTER BY (col1);
ALTER MATERIALIZED VIEW mv_name DROP CLUSTERING KEY;
ALTER MATERIALIZED VIEW mv_name RENAME TO new_name;
ALTER MATERIALIZED VIEW mv_name SET SECURE;
ALTER MATERIALIZED VIEW mv_name UNSET SECURE;

-- Drop materialized view
DROP MATERIALIZED VIEW [ IF EXISTS ] mv_name;
```

### Required Privileges

| Privilege | Purpose |
|-----------|---------|
| CREATE MATERIALIZED VIEW on schema | Create new MVs |
| SELECT on base table | Read data for MV |
| SELECT on MV | Query the MV |
| OWNERSHIP on MV | Full control |

---

## Section 9: Best Practices Summary

### Creating Materialized Views

1. **Filter data aggressively** - Include only needed rows/columns
2. **Use selective aggregations** - SUM, COUNT, AVG are ideal candidates
3. **Avoid SELECT *** - Explicitly list columns (base table changes can break MV)
4. **Use fully-qualified table names** - Prevents issues when objects are moved
5. **Consider query patterns** - Design MVs around actual query needs
6. **Start small** - Create few MVs, monitor costs, then expand

### Maintaining Materialized Views

1. **Batch DML operations** - Multiple small INSERTs cost more than one large INSERT
2. **Monitor BEHIND_BY** - Large lag indicates maintenance issues
3. **Avoid unnecessary base table clustering** - Triggers MV refresh
4. **Review costs regularly** - Use MATERIALIZED_VIEW_REFRESH_HISTORY

### When NOT to Use Materialized Views

| Scenario | Reason |
|----------|--------|
| Simple queries | Overhead not justified |
| Rapidly changing data | High maintenance cost |
| Queries requiring JOINs | Not supported |
| Queries with window functions | Not supported |
| Infrequently run queries | Cost exceeds benefit |

---

## Section 10: Troubleshooting

### Common Issues

| Problem | Cause | Solution |
|---------|-------|----------|
| Cannot query MV | MV is suspended | `ALTER MV RESUME` |
| MV shows INVALID | Base table column changed/dropped | Recreate MV |
| High maintenance costs | Frequent small DML operations | Batch operations |
| MV not used by optimizer | Base table pruning is sufficient | May not need MV |
| Division by zero errors | Data issue in base table | Fix data, then RESUME |

### Checking MV Health

```sql
-- Check if MV is active and current
SHOW MATERIALIZED VIEWS LIKE 'mv_name';

-- Look for:
-- is_valid = TRUE
-- is_suspended = FALSE
-- behind_by = small value

-- Get MV definition
SELECT GET_DDL('materialized_view', 'mv_name');
```

### Effects of Base Table Changes

| Base Table Change | MV Impact |
|-------------------|-----------|
| Add column | MV unchanged (no new column) |
| Drop/modify column in MV | MV suspended (INVALID) |
| Rename table | MV may point to wrong table |
| Swap table | MV may point to wrong table |
| Drop table | MV suspended |

---

## Exam Tips

### Frequently Tested Concepts

1. **Edition Requirement**
   - Materialized views require Enterprise Edition or higher
   - This is a common exam question

2. **Joins NOT Supported**
   - MVs can only be based on a SINGLE table
   - No JOINs, including self-joins

3. **Automatic Maintenance**
   - Snowflake automatically maintains MVs (no manual refresh needed)
   - Background service handles updates

4. **Always Current Data**
   - MVs always return current data, even if behind on maintenance
   - Snowflake combines MV with fresh base table data

5. **Query Rewrite**
   - Optimizer can automatically use MVs for base table queries
   - User does not need to reference MV explicitly

6. **Cost Components**
   - Storage (for storing results)
   - Compute (for maintenance via MATERIALIZED_VIEW_MAINTENANCE warehouse)

7. **Suspend/Resume**
   - SUSPEND stops maintenance AND queries
   - Cannot query a suspended MV

### Common Exam Question Patterns

**Question Type 1: Edition Requirements**
> "Which Snowflake edition supports materialized views?"
> - Answer: Enterprise Edition (or higher)

**Question Type 2: Feature Support**
> "Which of the following can be included in a materialized view definition?"
> - Look for: aggregates (SUM, COUNT, AVG), filters, GROUP BY
> - Exclude: JOINs, UDFs, window functions, subqueries

**Question Type 3: Automatic Maintenance**
> "How are materialized views kept synchronized with base tables?"
> - Answer: Automatically by Snowflake background service

**Question Type 4: Query Rewrite**
> "What happens when a user queries a base table that has a materialized view?"
> - Answer: The optimizer may automatically rewrite the query to use the MV

**Question Type 5: Cost Management**
> "Where are materialized view maintenance credits tracked?"
> - Answer: MATERIALIZED_VIEW_MAINTENANCE warehouse

**Question Type 6: Limitations**
> "Which operation is NOT supported on a materialized view?"
> - Common answers: INSERT, UPDATE, DELETE, TRUNCATE

### Memory Aids

**"MVs are like smart caches":**
- Pre-computed results (cache)
- Automatically updated (smart)
- Transparent to users (optimizer decides)

**"Single Table, Simple Aggregates":**
- ONE base table only
- Basic aggregate functions (SUM, COUNT, AVG, MIN, MAX)
- No complex features (JOINs, subqueries, UDFs)

**"Enterprise for Enterprise Features":**
- Materialized Views = Enterprise Edition
- (Same as Search Optimization Service, Query Acceleration)

---

## Quick Reference Card

### Commands Cheat Sheet

```sql
-- Create
CREATE MATERIALIZED VIEW mv AS SELECT ...;

-- View
SHOW MATERIALIZED VIEWS;
DESC MATERIALIZED VIEW mv;

-- Modify
ALTER MATERIALIZED VIEW mv SUSPEND;
ALTER MATERIALIZED VIEW mv RESUME;
ALTER MATERIALIZED VIEW mv CLUSTER BY (col);

-- Delete
DROP MATERIALIZED VIEW mv;

-- Monitor
SELECT * FROM TABLE(INFORMATION_SCHEMA.MATERIALIZED_VIEW_REFRESH_HISTORY());
```

### Key Constraints

| Constraint | Value |
|------------|-------|
| Edition | Enterprise+ |
| Base tables | Single table only |
| JOINs | Not supported |
| Subqueries | Not supported |
| Window functions | Not supported |
| UDFs | Not supported |
| DML on MV | Not allowed |

### Cost Tracking

| Resource | Location |
|----------|----------|
| Storage | Standard storage billing |
| Compute | MATERIALIZED_VIEW_MAINTENANCE warehouse |
| History | MATERIALIZED_VIEW_REFRESH_HISTORY |
