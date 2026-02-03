# Domain 3: Warehouse Load and Monitoring

**SnowPro Core (COF-C02) Study Guide** | **Exam Weight: Part of 10-15%**

---

## Table of Contents

1. [Overview of Warehouse Monitoring](#1-overview-of-warehouse-monitoring)
2. [Warehouse Load Concepts](#2-warehouse-load-concepts)
3. [Key Monitoring Views](#3-key-monitoring-views)
4. [WAREHOUSE_LOAD_HISTORY View](#4-warehouse_load_history-view)
5. [WAREHOUSE_METERING_HISTORY View](#5-warehouse_metering_history-view)
6. [Understanding Query Load Charts](#6-understanding-query-load-charts)
7. [Query Status Types](#7-query-status-types)
8. [Utilization Analysis Queries](#8-utilization-analysis-queries)
9. [Right-Sizing Warehouses](#9-right-sizing-warehouses)
10. [Multi-Cluster Warehouse Monitoring](#10-multi-cluster-warehouse-monitoring)
11. [Cost Analysis Queries](#11-cost-analysis-queries)
12. [Exam Tips and Common Patterns](#12-exam-tips-and-common-patterns)
13. [Quick Reference](#13-quick-reference)

---

## 1. Overview of Warehouse Monitoring

### 1.1 Why Monitor Warehouses?

Warehouse monitoring serves three critical purposes:

| Purpose | Description | Benefit |
|---------|-------------|---------|
| **Performance Optimization** | Identify bottlenecks and queuing | Faster query execution |
| **Cost Management** | Track credit consumption | Reduce unnecessary spending |
| **Capacity Planning** | Understand usage patterns | Right-size warehouses |

### 1.2 Monitoring Components

| Component | Data Source | Retention |
|-----------|-------------|-----------|
| **Load Monitoring** | Snowsight UI charts | 14 days (visual) |
| **Load History** | WAREHOUSE_LOAD_HISTORY view | 14 days |
| **Metering History** | WAREHOUSE_METERING_HISTORY view | 1 year (Account Usage) |
| **Query History** | QUERY_HISTORY view | 1 year (Account Usage) |

### 1.3 Required Privileges

| Action | Required Privilege |
|--------|-------------------|
| View warehouse load chart in Snowsight | MONITOR on warehouse |
| Query ACCOUNT_USAGE views | Imported privileges from SNOWFLAKE database |
| Query Information Schema views | USAGE on database |

---

## 2. Warehouse Load Concepts

### 2.1 What is Query Load?

**Query load** measures the average number of queries that were running or queued within a specific time interval.

**Formula:**
```
Query Load = Total Execution Time (seconds) / Interval Duration (seconds)
```

### 2.2 Load Calculation Example

For a 5-minute (300-second) interval with 5 queries:

| Query | Status | Execution Time | Calculation | Load Contribution |
|-------|--------|----------------|-------------|-------------------|
| Query 1 | Running | 30 sec | 30 / 300 | 0.10 |
| Query 2 | Running | 201 sec | 201 / 300 | 0.67 |
| Query 3 | Running | 15 sec | 15 / 300 | 0.05 |
| Query 4 | Running | 30 sec | 30 / 300 | 0.10 |
| Query 5 | Queued | 24 sec | 24 / 300 | 0.08 |
| **Total** | | | | **1.00** |

**Key Insight:** A load of 1.0 means one query was running (or queued) continuously during the interval. Load > 1.0 indicates concurrent execution or significant queuing.

### 2.3 Load Interpretation

| Load Value | Interpretation | Action |
|------------|----------------|--------|
| < 0.5 | Under-utilized | Consider downsizing or consolidating |
| 0.5 - 1.0 | Moderate utilization | Monitor for trends |
| 1.0 - 2.0 | Good utilization | Normal operation |
| > 2.0 | Heavy load | Monitor for queuing |
| High queued load | Overloaded | Scale up or out |

---

## 3. Key Monitoring Views

### 3.1 Account Usage vs Information Schema

| Schema | Retention | Latency | Best For |
|--------|-----------|---------|----------|
| **ACCOUNT_USAGE** | 1 year | Up to 45 min | Historical analysis, trends |
| **INFORMATION_SCHEMA** | 7 days to 6 months | Real-time to 3 hours | Recent/current monitoring |

### 3.2 Primary Monitoring Views

| View | Schema | Purpose |
|------|--------|---------|
| `WAREHOUSE_LOAD_HISTORY` | ACCOUNT_USAGE | Query load metrics (running/queued) |
| `WAREHOUSE_METERING_HISTORY` | ACCOUNT_USAGE | Credit consumption by warehouse |
| `QUERY_HISTORY` | ACCOUNT_USAGE | Individual query execution details |
| `METERING_DAILY_HISTORY` | ACCOUNT_USAGE | Daily credit totals with billing |
| `METERING_HISTORY` | ACCOUNT_USAGE | Hourly metering for all services |

### 3.3 Schema Access

```sql
-- Grant access to ACCOUNT_USAGE schema
USE ROLE ACCOUNTADMIN;
GRANT IMPORTED PRIVILEGES ON DATABASE SNOWFLAKE TO ROLE my_analyst_role;

-- The analyst can now query:
SELECT * FROM SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_LOAD_HISTORY;
SELECT * FROM SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_METERING_HISTORY;
```

---

## 4. WAREHOUSE_LOAD_HISTORY View

### 4.1 View Purpose

The **WAREHOUSE_LOAD_HISTORY** view provides insight into the workload processed by each warehouse, showing the average number of queries running and queued.

### 4.2 Key Columns

| Column | Data Type | Description |
|--------|-----------|-------------|
| `START_TIME` | TIMESTAMP_LTZ | Start of the interval |
| `END_TIME` | TIMESTAMP_LTZ | End of the interval |
| `WAREHOUSE_ID` | NUMBER | Internal warehouse ID |
| `WAREHOUSE_NAME` | VARCHAR | Name of the warehouse |
| `AVG_RUNNING` | FLOAT | Average number of running queries |
| `AVG_QUEUED_LOAD` | FLOAT | Average number of queued queries |
| `AVG_QUEUED_PROVISIONING` | FLOAT | Average queries waiting for provisioning |
| `AVG_BLOCKED` | FLOAT | Average blocked queries (transaction locks) |

### 4.3 Data Characteristics

| Characteristic | Value |
|----------------|-------|
| **Retention** | 14 days |
| **Interval Granularity** | 5 minutes |
| **Latency** | Up to 3 hours |
| **Cloud Services Warehouse** | Excluded (WAREHOUSE_ID = 0) |

### 4.4 Basic Query Examples

**Query: Daily Load Summary by Warehouse**
```sql
SELECT
    TO_DATE(START_TIME) AS date,
    WAREHOUSE_NAME,
    SUM(AVG_RUNNING) AS total_running_load,
    SUM(AVG_QUEUED_LOAD) AS total_queued_load
FROM SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_LOAD_HISTORY
WHERE START_TIME >= DATEADD(day, -7, CURRENT_TIMESTAMP())
GROUP BY 1, 2
ORDER BY date DESC, WAREHOUSE_NAME;
```

**Query: Find Warehouses with Queuing**
```sql
SELECT
    TO_DATE(START_TIME) AS date,
    WAREHOUSE_NAME,
    SUM(AVG_RUNNING) AS sum_running,
    SUM(AVG_QUEUED_LOAD) AS sum_queued
FROM SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_LOAD_HISTORY
WHERE START_TIME >= DATEADD(month, -1, CURRENT_TIMESTAMP())
GROUP BY 1, 2
HAVING SUM(AVG_QUEUED_LOAD) > 0
ORDER BY sum_queued DESC;
```

---

## 5. WAREHOUSE_METERING_HISTORY View

### 5.1 View Purpose

The **WAREHOUSE_METERING_HISTORY** view provides hourly credit consumption data for each warehouse, including cloud services credits.

### 5.2 Key Columns

| Column | Data Type | Description |
|--------|-----------|-------------|
| `START_TIME` | TIMESTAMP_LTZ | Start of the hour |
| `END_TIME` | TIMESTAMP_LTZ | End of the hour |
| `WAREHOUSE_ID` | NUMBER | Internal warehouse ID |
| `WAREHOUSE_NAME` | VARCHAR | Name of the warehouse |
| `CREDITS_USED` | FLOAT | Total credits (compute + cloud services) |
| `CREDITS_USED_COMPUTE` | FLOAT | Credits for compute resources |
| `CREDITS_USED_CLOUD_SERVICES` | FLOAT | Credits for cloud services |

### 5.3 Data Characteristics

| Characteristic | Value |
|----------------|-------|
| **Retention** | 1 year (365 days) |
| **Interval Granularity** | 1 hour |
| **Latency** | Up to 3 hours |
| **Includes** | All warehouse types (standard, multi-cluster) |

### 5.4 Credit Consumption Queries

**Query: Credits by Warehouse (Last 30 Days)**
```sql
SELECT
    WAREHOUSE_NAME,
    SUM(CREDITS_USED_COMPUTE) AS compute_credits,
    SUM(CREDITS_USED_CLOUD_SERVICES) AS cloud_services_credits,
    SUM(CREDITS_USED) AS total_credits
FROM SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_METERING_HISTORY
WHERE START_TIME >= DATEADD(day, -30, CURRENT_TIMESTAMP())
    AND WAREHOUSE_ID > 0  -- Exclude cloud services only
GROUP BY WAREHOUSE_NAME
ORDER BY total_credits DESC;
```

**Query: Hourly Credit Consumption Pattern**
```sql
SELECT
    DATE_PART('HOUR', START_TIME) AS hour_of_day,
    WAREHOUSE_NAME,
    AVG(CREDITS_USED_COMPUTE) AS avg_credits
FROM SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_METERING_HISTORY
WHERE START_TIME >= DATEADD(day, -30, CURRENT_TIMESTAMP())
    AND WAREHOUSE_ID > 0
GROUP BY 1, 2
ORDER BY WAREHOUSE_NAME, hour_of_day;
```

---

## 6. Understanding Query Load Charts

### 6.1 Snowsight Load Monitoring Chart

To view the warehouse load chart in Snowsight:
1. Navigate to **Compute** > **Warehouses**
2. Select a warehouse name
3. View the **Warehouse Activity** tile

### 6.2 Chart Features

| Feature | Description |
|---------|-------------|
| **Time Range** | 1 hour (min) to 2 weeks (max) |
| **Intervals** | 1 minute to 1 day (auto-adjusted) |
| **Default View** | Past 2 weeks in 1-day intervals |
| **Refresh** | Near real-time |

### 6.3 Chart Bar Components

Each bar in the chart represents total query load, broken down by status:

| Color/Status | Description |
|--------------|-------------|
| **Running** | Actively executing queries |
| **Queued (Provisioning)** | Waiting for compute resources to provision |
| **Blocked** | Waiting due to transaction locks |
| **Queued** | Waiting due to warehouse overload |

### 6.4 Reading the Chart

| Scenario | Chart Pattern | Interpretation |
|----------|---------------|----------------|
| Consistent bars | Steady utilization | Normal operation |
| Tall bars with "Queued" | Heavy concurrency | Consider scaling |
| Tall bars with "Blocked" | Lock contention | Review transactions |
| Small gaps | Intermittent usage | Consider auto-suspend |
| Large gaps | Sparse usage | Reduce size or consolidate |

---

## 7. Query Status Types

### 7.1 Query States in Load Monitoring

| Status | Description | Impact |
|--------|-------------|--------|
| **Running** | Query actively using compute resources | Normal execution |
| **Queued (Provisioning)** | Waiting for warehouse to start/scale | Occurs after resume |
| **Queued** | Waiting due to insufficient resources | Performance impact |
| **Blocked** | Waiting for transaction lock | Concurrency issue |

### 7.2 Queued vs Queued (Provisioning)

| Type | Cause | Duration | Solution |
|------|-------|----------|----------|
| **Queued (Provisioning)** | Warehouse starting up | First few minutes after resume | Normal behavior |
| **Queued** | Warehouse overloaded | Depends on running queries | Scale up/out |

### 7.3 Blocked Queries

Blocked queries occur when:
- A query needs a lock held by another query
- Common with concurrent DML on same tables
- Not resolved by increasing warehouse size

**Finding Blocked Queries:**
```sql
SELECT
    QUERY_ID,
    QUERY_TEXT,
    WAREHOUSE_NAME,
    BLOCKED_START_TIME,
    BLOCKED_END_TIME,
    DATEDIFF(second, BLOCKED_START_TIME, BLOCKED_END_TIME) AS blocked_seconds
FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY
WHERE BLOCKED_START_TIME IS NOT NULL
    AND START_TIME >= DATEADD(day, -7, CURRENT_TIMESTAMP())
ORDER BY blocked_seconds DESC;
```

---

## 8. Utilization Analysis Queries

### 8.1 Warehouse Efficiency Analysis

**Query: Identify Under-Utilized Warehouses**
```sql
WITH daily_usage AS (
    SELECT
        WAREHOUSE_NAME,
        TO_DATE(START_TIME) AS usage_date,
        SUM(AVG_RUNNING) AS total_running,
        SUM(AVG_QUEUED_LOAD) AS total_queued,
        COUNT(*) AS intervals  -- 5-min intervals
    FROM SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_LOAD_HISTORY
    WHERE START_TIME >= DATEADD(day, -30, CURRENT_TIMESTAMP())
    GROUP BY 1, 2
)
SELECT
    WAREHOUSE_NAME,
    AVG(total_running / intervals) AS avg_running_load,
    AVG(total_queued / intervals) AS avg_queued_load,
    COUNT(DISTINCT usage_date) AS days_active
FROM daily_usage
GROUP BY WAREHOUSE_NAME
HAVING avg_running_load < 0.5  -- Under 50% utilization
ORDER BY avg_running_load;
```

**Query: Peak Hours Analysis**
```sql
SELECT
    DATE_PART('HOUR', START_TIME) AS hour_of_day,
    WAREHOUSE_NAME,
    AVG(AVG_RUNNING) AS avg_running,
    AVG(AVG_QUEUED_LOAD) AS avg_queued,
    MAX(AVG_RUNNING + AVG_QUEUED_LOAD) AS peak_load
FROM SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_LOAD_HISTORY
WHERE START_TIME >= DATEADD(day, -14, CURRENT_TIMESTAMP())
GROUP BY 1, 2
ORDER BY WAREHOUSE_NAME, hour_of_day;
```

### 8.2 Queuing Analysis

**Query: Warehouses with Significant Queuing**
```sql
SELECT
    WAREHOUSE_NAME,
    TO_DATE(START_TIME) AS date,
    SUM(AVG_RUNNING) AS total_running,
    SUM(AVG_QUEUED_LOAD) AS total_queued,
    ROUND(100 * SUM(AVG_QUEUED_LOAD) / NULLIF(SUM(AVG_RUNNING) + SUM(AVG_QUEUED_LOAD), 0), 2) AS queue_pct
FROM SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_LOAD_HISTORY
WHERE START_TIME >= DATEADD(day, -7, CURRENT_TIMESTAMP())
GROUP BY 1, 2
HAVING total_queued > 0
ORDER BY queue_pct DESC;
```

### 8.3 Credit Efficiency Analysis

**Query: Cost Per Query by Warehouse**
```sql
WITH warehouse_queries AS (
    SELECT
        WAREHOUSE_NAME,
        COUNT(*) AS query_count
    FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY
    WHERE START_TIME >= DATEADD(day, -30, CURRENT_TIMESTAMP())
        AND WAREHOUSE_NAME IS NOT NULL
    GROUP BY WAREHOUSE_NAME
),
warehouse_credits AS (
    SELECT
        WAREHOUSE_NAME,
        SUM(CREDITS_USED) AS total_credits
    FROM SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_METERING_HISTORY
    WHERE START_TIME >= DATEADD(day, -30, CURRENT_TIMESTAMP())
        AND WAREHOUSE_ID > 0
    GROUP BY WAREHOUSE_NAME
)
SELECT
    c.WAREHOUSE_NAME,
    c.total_credits,
    q.query_count,
    ROUND(c.total_credits / NULLIF(q.query_count, 0), 4) AS credits_per_query
FROM warehouse_credits c
JOIN warehouse_queries q ON c.WAREHOUSE_NAME = q.WAREHOUSE_NAME
ORDER BY credits_per_query DESC;
```

---

## 9. Right-Sizing Warehouses

### 9.1 Warehouse Sizing Guidelines

| Scenario | Indicator | Action |
|----------|-----------|--------|
| **Slow queries, low load** | AVG_RUNNING < 1, long execution times | Increase size |
| **High queuing** | AVG_QUEUED_LOAD consistently > 0 | Scale up or out |
| **Low utilization** | AVG_RUNNING < 0.5 for extended periods | Decrease size |
| **Variable workload** | Large load fluctuations | Use multi-cluster |
| **Excessive credits** | High cost, moderate load | Decrease size |

### 9.2 Size vs Concurrency Decision

| Need | Solution | Benefit |
|------|----------|---------|
| **Faster individual queries** | Increase warehouse size | More compute per query |
| **Handle more concurrent users** | Add multi-cluster or separate warehouses | More total capacity |
| **Improve both** | Increase size AND add clusters | Best of both |

### 9.3 Right-Sizing Query

**Query: Warehouse Size Recommendation**
```sql
WITH load_stats AS (
    SELECT
        WAREHOUSE_NAME,
        AVG(AVG_RUNNING) AS avg_running,
        AVG(AVG_QUEUED_LOAD) AS avg_queued,
        MAX(AVG_RUNNING) AS max_running,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY AVG_RUNNING) AS p95_running
    FROM SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_LOAD_HISTORY
    WHERE START_TIME >= DATEADD(day, -14, CURRENT_TIMESTAMP())
    GROUP BY WAREHOUSE_NAME
),
warehouse_info AS (
    SELECT "name" AS warehouse_name, "size" AS warehouse_size
    FROM TABLE(RESULT_SCAN(LAST_QUERY_ID()))
)
SELECT
    l.WAREHOUSE_NAME,
    l.avg_running,
    l.avg_queued,
    l.p95_running,
    CASE
        WHEN l.avg_queued > 0.5 THEN 'Scale OUT (multi-cluster or separate warehouse)'
        WHEN l.p95_running > 2 AND l.avg_running > 1 THEN 'Scale UP (increase size)'
        WHEN l.avg_running < 0.3 THEN 'Scale DOWN (decrease size)'
        ELSE 'Appropriate size'
    END AS recommendation
FROM load_stats l
ORDER BY l.avg_queued DESC, l.avg_running DESC;

-- Run this first to get warehouse sizes
SHOW WAREHOUSES;
```

### 9.4 Credit Consumption by Size

| Warehouse Size | Credits/Hour | Credits/Second |
|----------------|--------------|----------------|
| X-Small | 1 | 0.0003 |
| Small | 2 | 0.0006 |
| Medium | 4 | 0.0011 |
| Large | 8 | 0.0022 |
| X-Large | 16 | 0.0044 |
| 2X-Large | 32 | 0.0089 |
| 3X-Large | 64 | 0.0178 |
| 4X-Large | 128 | 0.0356 |

**Key Insight:** Credits double with each size increase, but execution time may not halve. Test before permanently resizing.

---

## 10. Multi-Cluster Warehouse Monitoring

### 10.1 Multi-Cluster Specific Metrics

| Metric | Description |
|--------|-------------|
| **STARTED_CLUSTERS** | Number of currently running clusters |
| **MIN_CLUSTER_COUNT** | Minimum clusters configured |
| **MAX_CLUSTER_COUNT** | Maximum clusters configured |
| **SCALING_POLICY** | Standard or Economy |

### 10.2 Viewing Multi-Cluster Status

```sql
SHOW WAREHOUSES;

-- Filter to show multi-cluster details
SELECT
    "name" AS warehouse_name,
    "state" AS state,
    "size" AS size,
    "min_cluster_count" AS min_clusters,
    "max_cluster_count" AS max_clusters,
    "started_clusters" AS running_clusters,
    "scaling_policy" AS scaling_policy
FROM TABLE(RESULT_SCAN(LAST_QUERY_ID()))
WHERE "max_cluster_count" > 1
ORDER BY "name";
```

### 10.3 Multi-Cluster Credit Calculation

For multi-cluster warehouses, total credits = Size Credits x Active Clusters x Time

**Example: Medium warehouse with variable clusters**
| Hour | Clusters Running | Credits Used |
|------|------------------|--------------|
| 1 | 1 | 4 |
| 2 | 3 | 12 |
| 3 | 2 | 8 |
| **Total** | | **24** |

### 10.4 Scaling Policy Impact

| Policy | Behavior | Best For |
|--------|----------|----------|
| **Standard** | Starts clusters proactively to minimize queuing | Performance-critical workloads |
| **Economy** | Starts clusters only when load sustained >6 min | Cost-sensitive workloads |

**Query: Monitor Cluster Scaling**
```sql
-- Multi-cluster warehouse activity over time
SELECT
    WAREHOUSE_NAME,
    START_TIME,
    CREDITS_USED,
    CREDITS_USED / NULLIF((
        SELECT CASE "size"
            WHEN 'X-Small' THEN 1
            WHEN 'Small' THEN 2
            WHEN 'Medium' THEN 4
            WHEN 'Large' THEN 8
            WHEN 'X-Large' THEN 16
            ELSE 1
        END
        FROM TABLE(RESULT_SCAN(LAST_QUERY_ID()))
        WHERE "name" = wmh.WAREHOUSE_NAME
    ), 0) AS estimated_clusters
FROM SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_METERING_HISTORY wmh
WHERE WAREHOUSE_NAME = 'MY_MULTI_CLUSTER_WH'
    AND START_TIME >= DATEADD(day, -7, CURRENT_TIMESTAMP())
ORDER BY START_TIME;
```

---

## 11. Cost Analysis Queries

### 11.1 Daily Cost Trending

**Query: Daily Credit Consumption by Warehouse**
```sql
SELECT
    TO_DATE(START_TIME) AS date,
    WAREHOUSE_NAME,
    SUM(CREDITS_USED_COMPUTE) AS compute_credits,
    SUM(CREDITS_USED_CLOUD_SERVICES) AS cloud_services_credits,
    SUM(CREDITS_USED) AS total_credits
FROM SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_METERING_HISTORY
WHERE START_TIME >= DATEADD(day, -30, CURRENT_TIMESTAMP())
    AND WAREHOUSE_ID > 0
GROUP BY 1, 2
ORDER BY date DESC, total_credits DESC;
```

### 11.2 Anomaly Detection

**Query: Warehouse Usage Anomalies (vs 7-day Average)**
```sql
WITH daily_credits AS (
    SELECT
        TO_DATE(START_TIME) AS date,
        WAREHOUSE_NAME,
        SUM(CREDITS_USED) AS credits
    FROM SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_METERING_HISTORY
    WHERE WAREHOUSE_ID > 0
    GROUP BY 1, 2
)
SELECT
    date,
    WAREHOUSE_NAME,
    credits,
    AVG(credits) OVER (
        PARTITION BY WAREHOUSE_NAME
        ORDER BY date
        ROWS BETWEEN 7 PRECEDING AND 1 PRECEDING
    ) AS avg_7day,
    ROUND(100 * (credits / NULLIF(avg_7day, 0) - 1), 2) AS pct_vs_avg
FROM daily_credits
WHERE date >= DATEADD(day, -30, CURRENT_DATE())
QUALIFY ABS(pct_vs_avg) > 50  -- More than 50% deviation
ORDER BY date DESC, ABS(pct_vs_avg) DESC;
```

### 11.3 Cloud Services Analysis

**Query: Cloud Services Cost Ratio**
```sql
SELECT
    WAREHOUSE_NAME,
    SUM(CREDITS_USED_COMPUTE) AS compute_credits,
    SUM(CREDITS_USED_CLOUD_SERVICES) AS cloud_services_credits,
    ROUND(100 * SUM(CREDITS_USED_CLOUD_SERVICES) /
          NULLIF(SUM(CREDITS_USED_COMPUTE), 0), 2) AS cloud_services_pct
FROM SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_METERING_HISTORY
WHERE START_TIME >= DATEADD(day, -30, CURRENT_TIMESTAMP())
    AND WAREHOUSE_ID > 0
GROUP BY WAREHOUSE_NAME
HAVING cloud_services_pct > 10  -- Exceeds the 10% free threshold
ORDER BY cloud_services_pct DESC;
```

**Note:** Cloud services exceeding 10% of warehouse credits indicates potential optimization opportunities.

---

## 12. Exam Tips and Common Patterns

### 12.1 Key Concepts to Remember

| Concept | Key Point |
|---------|-----------|
| **Query Load Definition** | Ratio of execution time to interval time |
| **Load > 1** | Multiple concurrent queries or queuing |
| **Queued vs Queued (Provisioning)** | Provisioning = startup; Queued = overload |
| **WAREHOUSE_LOAD_HISTORY retention** | 14 days |
| **WAREHOUSE_METERING_HISTORY retention** | 1 year (365 days) |
| **MONITOR privilege** | Required to view load charts |
| **Multi-cluster credit calculation** | Size x Clusters x Time |

### 12.2 Common Exam Question Patterns

**Pattern 1: "Which view shows warehouse credit consumption?"**
- Answer: WAREHOUSE_METERING_HISTORY
- Trap: WAREHOUSE_LOAD_HISTORY shows query load, not credits

**Pattern 2: "What does a query load of 2.0 indicate?"**
- Answer: On average, 2 queries were running/queued during the interval
- Trap: Does not mean the warehouse is at 200% capacity

**Pattern 3: "What causes Queued (Provisioning) status?"**
- Answer: Warehouse is starting up after being suspended
- Trap: Not the same as queuing due to overload

**Pattern 4: "How long is WAREHOUSE_LOAD_HISTORY retained?"**
- Answer: 14 days
- Trap: WAREHOUSE_METERING_HISTORY is 1 year

**Pattern 5: "What privilege is needed to view the load monitoring chart?"**
- Answer: MONITOR on the warehouse
- Trap: USAGE alone is not sufficient

**Pattern 6: "How do you reduce query queuing?"**
- Answers: Scale up (increase size), Scale out (multi-cluster), Create additional warehouses
- Trap: Scaling up improves individual query speed but may not reduce queuing

### 12.3 Monitoring View Comparison (Exam Favorite)

| View | Shows | Retention | Granularity |
|------|-------|-----------|-------------|
| WAREHOUSE_LOAD_HISTORY | Running/queued queries | 14 days | 5 minutes |
| WAREHOUSE_METERING_HISTORY | Credit consumption | 1 year | 1 hour |
| QUERY_HISTORY | Individual query details | 1 year | Per query |
| METERING_DAILY_HISTORY | Daily totals with billing | 1 year | 1 day |

### 12.4 Common Mistakes to Avoid

| Mistake | Correct Understanding |
|---------|----------------------|
| Load chart shows credit usage | Load chart shows query activity, not credits |
| Higher load = inefficient | High load with no queuing = efficient utilization |
| Size up always reduces queuing | Size up speeds queries; scale out handles concurrency |
| METERING shows query details | METERING shows credits; QUERY_HISTORY shows query details |
| Economy policy saves money always | Economy may increase execution time, offsetting savings |

### 12.5 Scenario-Based Questions

**Scenario 1:** "Your warehouse shows consistent queuing during business hours."
- **Solution:** Enable multi-cluster with Auto-scale mode, or create separate warehouses for different workloads

**Scenario 2:** "Queries are slow but the warehouse shows low load (<0.5)."
- **Solution:** Increase warehouse size (queries not competing, just need more resources)

**Scenario 3:** "You need to identify which warehouse consumed the most credits last month."
- **Solution:** Query WAREHOUSE_METERING_HISTORY grouped by WAREHOUSE_NAME

**Scenario 4:** "Users complain about slow queries after warehouse resumes."
- **Solution:** This is expected (Queued Provisioning); consider keeping warehouse running or accept brief delay

---

## 13. Quick Reference

### 13.1 Key Views and Columns

**WAREHOUSE_LOAD_HISTORY**
```sql
SELECT
    START_TIME,
    WAREHOUSE_NAME,
    AVG_RUNNING,      -- Running query load
    AVG_QUEUED_LOAD,  -- Queued due to overload
    AVG_QUEUED_PROVISIONING,  -- Queued during startup
    AVG_BLOCKED       -- Blocked by locks
FROM SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_LOAD_HISTORY
WHERE START_TIME >= DATEADD(day, -14, CURRENT_TIMESTAMP());
```

**WAREHOUSE_METERING_HISTORY**
```sql
SELECT
    START_TIME,
    WAREHOUSE_NAME,
    CREDITS_USED,            -- Total credits
    CREDITS_USED_COMPUTE,    -- Compute only
    CREDITS_USED_CLOUD_SERVICES  -- Cloud services
FROM SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_METERING_HISTORY
WHERE START_TIME >= DATEADD(day, -30, CURRENT_TIMESTAMP())
    AND WAREHOUSE_ID > 0;  -- Exclude cloud services only pseudo-warehouse
```

### 13.2 Essential Queries for the Exam

**Find Warehouses with Queuing:**
```sql
SELECT WAREHOUSE_NAME, SUM(AVG_QUEUED_LOAD) AS total_queued
FROM SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_LOAD_HISTORY
WHERE START_TIME >= DATEADD(month, -1, CURRENT_TIMESTAMP())
GROUP BY WAREHOUSE_NAME
HAVING total_queued > 0;
```

**Credit Consumption by Warehouse:**
```sql
SELECT WAREHOUSE_NAME, SUM(CREDITS_USED) AS total_credits
FROM SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_METERING_HISTORY
WHERE START_TIME >= DATEADD(month, -1, CURRENT_TIMESTAMP())
GROUP BY WAREHOUSE_NAME
ORDER BY total_credits DESC;
```

**Hourly Usage Pattern:**
```sql
SELECT
    DATE_PART('HOUR', START_TIME) AS hour,
    AVG(CREDITS_USED_COMPUTE) AS avg_credits
FROM SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_METERING_HISTORY
WHERE WAREHOUSE_NAME = 'MY_WAREHOUSE'
GROUP BY hour
ORDER BY hour;
```

### 13.3 Key Numbers to Remember

| Item | Value |
|------|-------|
| WAREHOUSE_LOAD_HISTORY retention | 14 days |
| WAREHOUSE_METERING_HISTORY retention | 1 year |
| Load chart minimum time range | 1 hour |
| Load chart maximum time range | 2 weeks |
| WAREHOUSE_LOAD_HISTORY interval | 5 minutes |
| WAREHOUSE_METERING_HISTORY interval | 1 hour |
| Account Usage latency | Up to 45 minutes |
| Multi-cluster Economy policy threshold | 6 minutes sustained load |

### 13.4 Privilege Requirements

| Task | Minimum Privilege |
|------|-------------------|
| View load chart in Snowsight | MONITOR on warehouse |
| Query ACCOUNT_USAGE views | Imported privileges on SNOWFLAKE DB |
| Create/modify warehouses | OWNERSHIP or CREATE WAREHOUSE |
| Resize running warehouse | MODIFY on warehouse |

---

## Summary

**Warehouse monitoring enables informed decisions about:**
1. **Performance:** Identify queuing and concurrency bottlenecks
2. **Cost:** Track and optimize credit consumption
3. **Capacity:** Right-size warehouses based on actual usage

**For the exam, remember:**
- WAREHOUSE_LOAD_HISTORY = query activity (14 days)
- WAREHOUSE_METERING_HISTORY = credit consumption (1 year)
- Query Load = execution time / interval time
- Queued (Provisioning) = startup; Queued = overload
- Scale UP for faster queries; Scale OUT for more concurrency
- MONITOR privilege required for load charts
- Multi-cluster credits = Size x Clusters x Time
