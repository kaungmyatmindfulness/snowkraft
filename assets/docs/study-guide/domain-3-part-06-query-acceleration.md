# Domain 3: Performance Concepts

## Part 6: Query Acceleration Service (QAS)

This section covers the Query Acceleration Service (QAS), an Enterprise Edition feature that improves warehouse performance by offloading portions of eligible queries to shared compute resources. Understanding QAS is essential for the SnowPro Core exam, particularly for questions about performance optimization and cost management.

---

## 1. What Is the Query Acceleration Service?

### 1.1 Overview

The **Query Acceleration Service (QAS)** accelerates parts of the query workload in a warehouse by offloading portions of query processing to shared compute resources provided by Snowflake. It reduces the impact of **outlier queries** - queries that consume significantly more resources than typical queries.

**Key Characteristics:**
- **Enterprise Edition feature** (or higher)
- Offloads work to serverless compute resources
- Reduces wall-clock time for scanning and filtering operations
- Billed separately from warehouse usage (serverless credits)
- Performance depends on service availability

**How It Works:**
1. Query is submitted to the warehouse
2. Snowflake identifies scan-heavy portions eligible for acceleration
3. Eligible portions are offloaded to shared QAS compute resources
4. These scan-heavy portions are **parallelized** across the serverless resources, reducing total query time
5. Results are combined and returned

### 1.2 Workloads That Benefit from QAS

QAS is particularly effective for:

| Workload Type | Description |
|--------------|-------------|
| **Ad hoc analytics** | Unpredictable queries with varying complexity |
| **Unpredictable data volumes** | Queries where the amount of data scanned varies significantly |
| **Large scans with selective filters** | Queries scanning many partitions but returning few rows |
| **Aggregate queries over large datasets** | GROUP BY, SUM, COUNT, etc. over many partitions |
| **Large INSERT/COPY operations** | Bulk data loading with many rows |

**Example Use Cases:**
- Business analysts running exploratory queries
- Data scientists performing ad hoc analysis
- ETL jobs with variable data volumes
- Reporting systems with unpredictable query patterns

---

## 2. Query Eligibility

### 2.1 SQL Commands That QAS Can Accelerate

The Query Acceleration Service supports:

| Command | Description |
|---------|-------------|
| **SELECT** | Standard query operations |
| **INSERT** | Insert statements with large data volumes |
| **CREATE TABLE AS SELECT (CTAS)** | Creating tables from query results |
| **COPY INTO &lt;table&gt;** | Bulk loading operations |

**Important:** QAS may accelerate an entire query, or just a subquery/clause within the query.

### 2.2 Eligible Query Patterns

Queries are eligible for QAS when they have portions that can run in parallel. Two main patterns:

**Pattern 1: Large Scans with Aggregation or Selective Filters**
```sql
-- Example: Large scan with selective filter
SELECT customer_id, order_total
FROM orders
WHERE order_date = '2024-01-15'  -- Selective filter
AND region = 'WEST';

-- Example: Large scan with aggregation
SELECT product_category, SUM(sales_amount)
FROM sales
GROUP BY product_category;
```

**Pattern 2: Large Scans Inserting Many Rows**
```sql
-- Example: Bulk insert
INSERT INTO orders_archive
SELECT * FROM orders
WHERE order_date < DATEADD('year', -1, CURRENT_DATE);

-- Example: COPY with transformation
COPY INTO target_table
FROM @my_stage/data/
FILE_FORMAT = (TYPE = 'CSV');
```

### 2.3 Common Reasons Queries Are Ineligible

| Reason | Explanation |
|--------|-------------|
| **Not enough partitions** | The scan is too small - QAS overhead would outweigh benefits |
| **Filters not selective enough** | Returning too much data relative to what is scanned |
| **High cardinality GROUP BY** | Too many distinct groups for effective parallelization |
| **Non-deterministic functions** | Functions like `RANDOM()` or `SEQ()` prevent acceleration |
| **Certain LIMIT clauses** | Some LIMIT patterns cannot be accelerated (though QAS now handles many LIMIT scenarios) |

**Key Point:** Snowflake only marks a query as eligible when there is high confidence that QAS would improve performance. The eligibility threshold depends on query plan and warehouse size.

---

## 3. Enabling and Configuring QAS

### 3.1 Enabling Query Acceleration

Enable QAS at the warehouse level using CREATE WAREHOUSE or ALTER WAREHOUSE:

```sql
-- Enable QAS when creating a warehouse
CREATE WAREHOUSE my_warehouse
  WAREHOUSE_SIZE = 'MEDIUM'
  ENABLE_QUERY_ACCELERATION = TRUE;

-- Enable QAS on an existing warehouse
ALTER WAREHOUSE my_warehouse
  SET ENABLE_QUERY_ACCELERATION = TRUE;

-- Disable QAS
ALTER WAREHOUSE my_warehouse
  SET ENABLE_QUERY_ACCELERATION = FALSE;
```

**Verify QAS Status:**
```sql
SHOW WAREHOUSES LIKE 'my_warehouse';
-- Check columns: enable_query_acceleration, query_acceleration_max_scale_factor
```

### 3.2 Scale Factor Configuration

The **scale factor** is a **cost control mechanism** that sets an upper bound on compute resources QAS can use. It acts as a multiplier based on warehouse size.

**How Scale Factor Works:**

| Setting | Behavior |
|---------|----------|
| **Default (8)** | QAS can use up to 8x the warehouse size in compute resources |
| **Custom (1-10)** | Set specific limit based on needs |
| **0** | No upper bound - QAS uses as many resources as needed and available |

**Example Calculation:**
- Medium warehouse = 4 credits/hour
- Scale factor = 5
- Maximum additional QAS cost = 4 x 5 = 20 credits/hour

```sql
-- Set scale factor when creating warehouse
CREATE WAREHOUSE analytics_wh
  WAREHOUSE_SIZE = 'MEDIUM'
  ENABLE_QUERY_ACCELERATION = TRUE
  QUERY_ACCELERATION_MAX_SCALE_FACTOR = 5;

-- Modify scale factor on existing warehouse
ALTER WAREHOUSE analytics_wh
  SET QUERY_ACCELERATION_MAX_SCALE_FACTOR = 10;

-- Remove upper bound limit
ALTER WAREHOUSE analytics_wh
  SET QUERY_ACCELERATION_MAX_SCALE_FACTOR = 0;
```

**Scale Factor Best Practices:**
- Start with the default (8) and monitor usage
- For multi-cluster warehouses, consider increasing scale factor so all clusters benefit
- Use `QUERY_ACCELERATION_ELIGIBLE` view to determine appropriate scale factors
- Set to 0 only when cost is not a concern and maximum performance is priority

**Important Notes:**
- Scale factor applies to the **entire warehouse** (all clusters in multi-cluster)
- Not all queries use the full scale factor - QAS only uses what is needed
- Actual resource availability depends on service capacity and concurrent requests

---

## 4. Identifying Eligible Queries and Warehouses

### 4.1 Using SYSTEM$ESTIMATE_QUERY_ACCELERATION Function

This function assesses whether a **previously executed query** would benefit from QAS:

```sql
-- Check if a specific query is eligible
SELECT PARSE_JSON(
  SYSTEM$ESTIMATE_QUERY_ACCELERATION('query-uuid-here')
);
```

**Eligible Query Result:**
```json
{
  "estimatedQueryTimes": {
    "1": 171,
    "2": 152,
    "4": 133,
    "8": 120,
    "10": 115
  },
  "ineligibleReason": null,
  "originalQueryTime": 300.291,
  "queryUUID": "8cd54bf0-1651-5b1c-ac9c-6a9582ebd20f",
  "status": "eligible",
  "upperLimitScaleFactor": 10
}
```

**Ineligible Query Result:**
```json
{
  "estimatedQueryTimes": {},
  "ineligibleReason": "NO_LARGE_ENOUGH_SCAN",
  "originalQueryTime": 20.291,
  "queryUUID": "cf23522b-3b91-cf14-9fe0-988a292a4bfa",
  "status": "ineligible",
  "upperLimitScaleFactor": 0
}
```

**Result Fields:**

| Field | Description |
|-------|-------------|
| **estimatedQueryTimes** | Estimated execution times at various scale factors |
| **ineligibleReason** | Why query cannot be accelerated (null if eligible) |
| **originalQueryTime** | Actual execution time in seconds |
| **status** | "eligible" or "ineligible" |
| **upperLimitScaleFactor** | Maximum beneficial scale factor |

### 4.2 Using QUERY_ACCELERATION_ELIGIBLE View

Query the Account Usage view to identify eligible queries and warehouses:

```sql
-- Find queries with most eligible acceleration time (past week)
SELECT query_id, eligible_query_acceleration_time
FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_ACCELERATION_ELIGIBLE
WHERE start_time > DATEADD('day', -7, CURRENT_TIMESTAMP())
ORDER BY eligible_query_acceleration_time DESC;

-- Find eligible queries for a specific warehouse
SELECT query_id, eligible_query_acceleration_time
FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_ACCELERATION_ELIGIBLE
WHERE warehouse_name = 'MY_WAREHOUSE'
  AND start_time > DATEADD('day', -7, CURRENT_TIMESTAMP())
ORDER BY eligible_query_acceleration_time DESC;

-- Find warehouses with most eligible queries
SELECT warehouse_name, COUNT(query_id) AS num_eligible_queries
FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_ACCELERATION_ELIGIBLE
WHERE start_time > DATEADD('day', -7, CURRENT_TIMESTAMP())
GROUP BY warehouse_name
ORDER BY num_eligible_queries DESC;

-- Find warehouses with most total eligible time
SELECT warehouse_name,
       SUM(eligible_query_acceleration_time) AS total_eligible_time
FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_ACCELERATION_ELIGIBLE
WHERE start_time > DATEADD('day', -7, CURRENT_TIMESTAMP())
GROUP BY warehouse_name
ORDER BY total_eligible_time DESC;

-- Find maximum scale factor needed for a warehouse
SELECT MAX(upper_limit_scale_factor)
FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_ACCELERATION_ELIGIBLE
WHERE warehouse_name = 'MY_WAREHOUSE'
  AND start_time > DATEADD('day', -7, CURRENT_TIMESTAMP());
```

---

## 5. Monitoring QAS Usage

### 5.1 Query Profile in Snowsight

When QAS accelerates a query, the Query Profile shows:

**Profile Overview Panel:**
- **Partitions scanned by service**: Number of files offloaded to QAS
- **Scans selected for acceleration**: Number of table scans being accelerated

**TableScan Operator Details:**
- Shows partitions scanned by QAS for each individual scan operation

### 5.2 QUERY_HISTORY View

Monitor accelerated queries using Account Usage:

```sql
-- Find queries with most bytes scanned by QAS (past 24 hours)
SELECT
  query_id,
  query_text,
  warehouse_name,
  start_time,
  end_time,
  query_acceleration_bytes_scanned,
  query_acceleration_partitions_scanned,
  query_acceleration_upper_limit_scale_factor
FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY
WHERE query_acceleration_partitions_scanned > 0
  AND start_time >= DATEADD(hour, -24, CURRENT_TIMESTAMP())
ORDER BY query_acceleration_bytes_scanned DESC;

-- Find queries with most partitions scanned by QAS
SELECT
  query_id,
  query_text,
  warehouse_name,
  query_acceleration_partitions_scanned
FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY
WHERE query_acceleration_partitions_scanned > 0
  AND start_time >= DATEADD(hour, -24, CURRENT_TIMESTAMP())
ORDER BY query_acceleration_partitions_scanned DESC;
```

**Key QUERY_HISTORY Columns for QAS:**

| Column | Description |
|--------|-------------|
| QUERY_ACCELERATION_BYTES_SCANNED | Total bytes scanned by QAS |
| QUERY_ACCELERATION_PARTITIONS_SCANNED | Total partitions scanned by QAS |
| QUERY_ACCELERATION_UPPER_LIMIT_SCALE_FACTOR | Maximum scale factor used |

**Note:** The sum of QAS-scanned bytes/partitions plus warehouse-scanned bytes/partitions may exceed non-QAS totals due to intermediary results generated by the service.

---

## 6. Cost and Billing

### 6.1 QAS Billing Model

**Key Cost Characteristics:**
- QAS uses **serverless compute resources**
- Billed **by the second**, only when the service is in use
- Credits billed **separately from warehouse usage**
- Cost is the same regardless of how many queries use QAS simultaneously

**Credit Rate:**
- Refer to the "Serverless Feature Credit Table" in the Snowflake Service Consumption Table
- Different from standard warehouse credit rates

### 6.2 Viewing QAS Costs

**Account Usage - QUERY_ACCELERATION_HISTORY View:**
```sql
-- Total credits used by each warehouse (month-to-date)
SELECT
  warehouse_name,
  SUM(credits_used) AS total_credits_used
FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_ACCELERATION_HISTORY
WHERE start_time >= DATE_TRUNC(month, CURRENT_DATE)
GROUP BY warehouse_name
ORDER BY total_credits_used DESC;
```

**Organization Usage - QUERY_ACCELERATION_HISTORY View:**
```sql
-- Credits by warehouse across all accounts in organization
SELECT
  account_name,
  warehouse_name,
  SUM(credits_used) AS total_credits_used
FROM SNOWFLAKE.ORGANIZATION_USAGE.QUERY_ACCELERATION_HISTORY
WHERE usage_date >= DATE_TRUNC(month, CURRENT_DATE)
GROUP BY account_name, warehouse_name
ORDER BY total_credits_used DESC;
```

**Information Schema - QUERY_ACCELERATION_HISTORY Function:**
```sql
-- Query acceleration history for past 12 hours
SELECT
  start_time,
  end_time,
  credits_used,
  warehouse_name,
  num_files_scanned,
  num_bytes_scanned
FROM TABLE(INFORMATION_SCHEMA.QUERY_ACCELERATION_HISTORY(
  date_range_start => DATEADD(H, -12, CURRENT_TIMESTAMP)
));
```

### 6.3 Evaluating Cost vs. Performance

**Compare Costs Before and After QAS:**
```sql
-- Compare warehouse compute + QAS costs over time
WITH credits AS (
  SELECT 'QAS' AS credit_type,
         TO_DATE(end_time) AS credit_date,
         SUM(credits_used) AS num_credits
  FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_ACCELERATION_HISTORY
  WHERE warehouse_name = 'MY_WAREHOUSE'
  GROUP BY credit_date
  UNION ALL
  SELECT 'WAREHOUSE' AS credit_type,
         TO_DATE(end_time) AS credit_date,
         SUM(credits_used) AS num_credits
  FROM SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_METERING_HISTORY
  WHERE warehouse_name = 'MY_WAREHOUSE'
  GROUP BY credit_date
)
SELECT
  credit_date,
  SUM(IFF(credit_type = 'QAS', num_credits, 0)) AS qas_credits,
  SUM(IFF(credit_type = 'WAREHOUSE', num_credits, 0)) AS warehouse_credits,
  qas_credits + warehouse_credits AS total_credits
FROM credits
GROUP BY credit_date
ORDER BY credit_date;
```

---

## 7. QAS vs. Other Performance Options

### 7.1 Comparison Table

| Approach | Use Case | Cost Model | When to Use |
|----------|----------|------------|-------------|
| **Query Acceleration Service** | Outlier queries, ad hoc analytics | Serverless (per-second) | Variable workloads with occasional heavy queries |
| **Warehouse Scaling Up** | All queries too slow | Fixed (based on size) | Consistent workload needs more compute |
| **Warehouse Scaling Out (Multi-cluster)** | Query queuing, concurrency issues | Fixed (per cluster) | High concurrent user load |
| **Materialized Views** | Repeated expensive aggregations | Background maintenance | Predictable, repeated queries |
| **Clustering** | Large table scan performance | Automatic maintenance | Tables frequently filtered by specific columns |
| **Search Optimization** | Point lookups, equality predicates | Maintenance service | Tables with frequent point lookups |

### 7.2 When to Choose QAS

**Choose QAS when:**
- Workload has unpredictable, varying query patterns
- Some queries are "outliers" that take much longer than average
- You want to improve performance without over-provisioning warehouses
- Ad hoc analytics is common

**Consider alternatives when:**
- All queries are consistently slow (scale up warehouse)
- High concurrent users (scale out with multi-cluster)
- Same aggregations run repeatedly (materialized views)
- Large table scans always filter on same columns (clustering)

---

## 8. Exam Tips and Common Question Patterns

### 8.1 Frequently Tested Concepts

1. **Edition Requirement**: QAS requires Enterprise Edition or higher
2. **Eligibility Criteria**: Large scans with selective filters or aggregations
3. **Scale Factor**: Cost control mechanism (default 8, 0 = no limit)
4. **Billing**: Serverless credits, billed separately from warehouse
5. **Enabling**: Warehouse-level property (ENABLE_QUERY_ACCELERATION)
6. **Monitoring**: QUERY_ACCELERATION_ELIGIBLE view, SYSTEM$ESTIMATE_QUERY_ACCELERATION function

### 8.2 Common Exam Traps

| Trap | Correct Understanding |
|------|----------------------|
| QAS accelerates all queries | Only eligible queries with specific patterns are accelerated |
| Scale factor increases query speed | Scale factor is a **cost control**, not a speed setting |
| QAS is always cost-effective | Must evaluate cost vs. performance benefit for your workload |
| QAS replaces warehouse sizing | QAS complements, not replaces, proper warehouse sizing |
| Performance is guaranteed | Performance depends on service availability |
| QAS works on Standard Edition | Enterprise Edition or higher required |

### 8.3 Key SQL Commands to Know

```sql
-- Enable QAS
ALTER WAREHOUSE wh_name SET ENABLE_QUERY_ACCELERATION = TRUE;

-- Set scale factor
ALTER WAREHOUSE wh_name SET QUERY_ACCELERATION_MAX_SCALE_FACTOR = 5;

-- Check if query is eligible
SELECT PARSE_JSON(SYSTEM$ESTIMATE_QUERY_ACCELERATION('query-uuid'));

-- View eligible queries
SELECT * FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_ACCELERATION_ELIGIBLE;

-- View QAS costs
SELECT * FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_ACCELERATION_HISTORY;

-- Check warehouse QAS settings
SHOW WAREHOUSES LIKE 'wh_name';
```

### 8.4 Practice Questions

**Question 1:** Which Snowflake edition is required to use the Query Acceleration Service?
- A) Standard Edition
- B) Enterprise Edition
- C) Business Critical Edition
- D) Virtual Private Snowflake

**Answer:** B - Query Acceleration Service requires Enterprise Edition or higher.

---

**Question 2:** What does setting QUERY_ACCELERATION_MAX_SCALE_FACTOR = 0 do?
- A) Disables query acceleration
- B) Sets the minimum acceleration level
- C) Removes the upper bound on compute resources for QAS
- D) Causes an error

**Answer:** C - Setting scale factor to 0 removes the upper limit, allowing QAS to use as many resources as needed and available.

---

**Question 3:** A query scans 10 partitions from a small table and completes in 2 seconds. Why might this query be ineligible for QAS?
- A) The query runs too fast
- B) There aren't enough partitions to scan for QAS benefits to outweigh latency
- C) QAS only works on queries over 1 minute
- D) Small tables are never eligible

**Answer:** B - If there aren't enough partitions to scan, the benefits of QAS are offset by the latency in acquiring resources for the service.

---

**Question 4:** Which view shows the amount of query execution time eligible for acceleration?
- A) QUERY_HISTORY
- B) QUERY_ACCELERATION_HISTORY
- C) QUERY_ACCELERATION_ELIGIBLE
- D) WAREHOUSE_METERING_HISTORY

**Answer:** C - QUERY_ACCELERATION_ELIGIBLE shows eligible_query_acceleration_time for each query.

---

**Question 5:** How is the Query Acceleration Service billed?
- A) Per query accelerated
- B) Per warehouse per hour
- C) Per second of serverless compute used
- D) Flat monthly fee

**Answer:** C - QAS is billed by the second for the serverless compute resources it uses.

---

**Question 6:** What type of queries are most likely to benefit from QAS?
- A) Simple point lookups on small tables
- B) Large scans with selective filters or aggregations
- C) Queries using non-deterministic functions
- D) Queries with LIMIT 10 and no ORDER BY

**Answer:** B - QAS is most effective for queries with large scans combined with selective filters or aggregations.

---

**Question 7:** A medium warehouse (4 credits/hour) has QAS enabled with scale factor 5. What is the maximum additional hourly cost from QAS?
- A) 4 credits
- B) 5 credits
- C) 9 credits
- D) 20 credits

**Answer:** D - Maximum QAS cost = warehouse credits (4) x scale factor (5) = 20 credits/hour.

---

**Question 8:** Which function helps determine if a previously executed query would benefit from QAS?
- A) SYSTEM$QUERY_ACCELERATION_STATUS
- B) SYSTEM$ESTIMATE_QUERY_ACCELERATION
- C) QUERY_ACCELERATION_CHECK
- D) GET_QUERY_ACCELERATION_ESTIMATE

**Answer:** B - SYSTEM$ESTIMATE_QUERY_ACCELERATION takes a query UUID and returns eligibility information.

---

## 9. Quick Reference

### Enabling QAS

```sql
-- Enable on warehouse
CREATE WAREHOUSE my_wh
  ENABLE_QUERY_ACCELERATION = TRUE
  QUERY_ACCELERATION_MAX_SCALE_FACTOR = 8;

-- Or modify existing
ALTER WAREHOUSE my_wh
  SET ENABLE_QUERY_ACCELERATION = TRUE;
```

### Scale Factor Settings

| Value | Behavior |
|-------|----------|
| 0 | No limit (max acceleration) |
| 1-10 | Multiplier for cost control |
| 8 | Default value |

### Key Views and Functions

| Resource | Purpose |
|----------|---------|
| `QUERY_ACCELERATION_ELIGIBLE` | Find eligible queries/warehouses |
| `QUERY_ACCELERATION_HISTORY` | View QAS credit usage |
| `QUERY_HISTORY` | See QAS stats for executed queries |
| `SYSTEM$ESTIMATE_QUERY_ACCELERATION` | Evaluate specific query eligibility |

### Supported Commands

- SELECT
- INSERT
- CREATE TABLE AS SELECT (CTAS)
- COPY INTO &lt;table&gt;

### Eligibility Patterns

- Large scans + selective filters
- Large scans + aggregations
- Large scans + many rows inserted

---

**Key Takeaway:** The Query Acceleration Service is a powerful Enterprise Edition feature that improves performance for outlier queries by offloading work to serverless compute. It is most effective for ad hoc analytics and workloads with unpredictable query patterns. Understanding how to enable, configure (scale factor), monitor, and evaluate the cost-benefit of QAS is essential for the SnowPro Core exam.
