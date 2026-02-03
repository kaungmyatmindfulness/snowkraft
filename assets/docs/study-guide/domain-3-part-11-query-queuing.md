# Domain 3: Performance Concepts

## Part 11: Query Queuing and Concurrency

This section covers query queuing and concurrency management in Snowflake warehouses. Understanding how Snowflake handles concurrent queries, when queuing occurs, and how to manage concurrency is essential for the SnowPro Core exam, particularly for questions about performance optimization and warehouse configuration.

---

## 1. Understanding Query Concurrency

### 1.1 How Snowflake Handles Concurrent Queries

When queries are submitted to a warehouse, Snowflake allocates compute resources to execute them. The warehouse has a finite amount of resources available per cluster, and queries must share these resources.

**Key Concepts:**

| Concept | Description |
|---------|-------------|
| **Concurrency** | Multiple queries executing simultaneously on the same warehouse |
| **Resource Sharing** | Concurrent queries share warehouse compute resources |
| **Queuing** | When resources are exhausted, additional queries wait in a queue |
| **MAX_CONCURRENCY_LEVEL** | Parameter that controls maximum concurrent queries per cluster |

**How Query Execution Works:**

1. Query is submitted to a warehouse
2. Snowflake checks if sufficient resources are available
3. If resources are available, query begins execution
4. If resources are exhausted, query is queued
5. Queued queries wait until resources become available
6. When resources free up, queued queries start in order

### 1.2 The MAX_CONCURRENCY_LEVEL Parameter

The **MAX_CONCURRENCY_LEVEL** parameter controls how many SQL statements (queries and DML) can run concurrently on a single warehouse cluster.

**Key Characteristics:**

| Property | Value |
|----------|-------|
| **Default Value** | 8 |
| **Scope** | Warehouse level (per cluster) |
| **Purpose** | Determines when queries are queued or clusters start |
| **Adjustable** | Yes, via ALTER WAREHOUSE |

**Important:** The default value of 8 means that by default, a single-cluster warehouse can run up to 8 concurrent queries before queuing begins.

```sql
-- View current MAX_CONCURRENCY_LEVEL for warehouses
SHOW PARAMETERS LIKE 'MAX_CONCURRENCY_LEVEL' IN ACCOUNT;

-- View MAX_CONCURRENCY_LEVEL for a specific warehouse
SHOW PARAMETERS LIKE 'MAX_CONCURRENCY_LEVEL' IN WAREHOUSE my_warehouse;
```

---

## 2. When Queries Are Queued

### 2.1 Queuing Triggers

Queries are placed in a queue when the warehouse's compute resources are exhausted. This happens when:

| Condition | Description |
|-----------|-------------|
| **Concurrency limit reached** | Number of running queries equals MAX_CONCURRENCY_LEVEL |
| **Resource exhaustion** | Warehouse memory or compute is fully utilized |
| **Warehouse starting** | Warehouse is suspended and resuming (QUEUED_PROVISIONING) |
| **Cluster repair** | Cluster experiencing issues (QUEUED_REPAIR) |

**Query Execution States:**

| State | Description |
|-------|-------------|
| **Running** | Query is actively executing on the warehouse |
| **Queued** | Query is waiting for resources to become available |
| **Blocked** | Query is waiting for a lock on a resource |
| **Success/Failed** | Query has completed execution |

### 2.2 Impact of Queuing on Performance

**Performance Implications:**

- **Total Query Time** = Queue Time + Execution Time
- Users experience longer response times when queries must wait
- Unpredictable query performance during peak usage
- Can cascade - slow queries hold resources longer, causing more queuing

**Finding Queued Time in Query History:**

```sql
-- Find queries with significant queue time (past 24 hours)
SELECT
  query_id,
  query_text,
  warehouse_name,
  start_time,
  QUEUED_PROVISIONING_TIME,
  QUEUED_REPAIR_TIME,
  QUEUED_OVERLOAD_TIME,
  TOTAL_ELAPSED_TIME
FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY
WHERE start_time > DATEADD('hour', -24, CURRENT_TIMESTAMP())
  AND (QUEUED_PROVISIONING_TIME > 0
       OR QUEUED_REPAIR_TIME > 0
       OR QUEUED_OVERLOAD_TIME > 0)
ORDER BY QUEUED_OVERLOAD_TIME DESC;
```

**Queue Time Columns in QUERY_HISTORY:**

| Column | Description |
|--------|-------------|
| **QUEUED_PROVISIONING_TIME** | Time spent waiting for warehouse to provision/resume |
| **QUEUED_REPAIR_TIME** | Time spent waiting for cluster repair |
| **QUEUED_OVERLOAD_TIME** | Time spent waiting due to warehouse being overloaded |

---

## 3. Managing Concurrency with MAX_CONCURRENCY_LEVEL

### 3.1 Lowering MAX_CONCURRENCY_LEVEL

You can reduce the maximum concurrency level to give each query more resources, which can improve individual query performance.

**When to Lower Concurrency:**

| Scenario | Benefit |
|----------|---------|
| Large, complex queries | More resources per query, faster execution |
| Memory-intensive workloads | Prevents out-of-memory errors |
| Multi-statement transactions | Better resource allocation |
| Consistent query performance | Reduces resource contention |

**How to Lower MAX_CONCURRENCY_LEVEL:**

```sql
-- Lower concurrency level on a warehouse
ALTER WAREHOUSE my_warehouse SET MAX_CONCURRENCY_LEVEL = 4;

-- Lower to run queries sequentially (one at a time)
ALTER WAREHOUSE my_warehouse SET MAX_CONCURRENCY_LEVEL = 1;

-- Reset to default
ALTER WAREHOUSE my_warehouse SET MAX_CONCURRENCY_LEVEL = 8;
```

**Trade-offs:**

| Pro | Con |
|-----|-----|
| More resources per query | More queries will be queued |
| Potentially faster individual queries | Lower overall throughput |
| Better for complex workloads | May increase wait times |

### 3.2 Increasing MAX_CONCURRENCY_LEVEL

In some cases, you may want to increase concurrency beyond the default of 8.

**When to Increase Concurrency:**

| Scenario | Benefit |
|----------|---------|
| Many small, simple queries | Higher throughput |
| Quick lookups | Reduced queuing |
| BI dashboards with many tiles | Faster dashboard load |

```sql
-- Increase concurrency level
ALTER WAREHOUSE my_warehouse SET MAX_CONCURRENCY_LEVEL = 12;
```

**Caution:** Increasing MAX_CONCURRENCY_LEVEL too high can degrade individual query performance because each query gets fewer resources.

### 3.3 STATEMENT_QUEUED_TIMEOUT_IN_SECONDS Parameter

This parameter controls how long a query can remain in the queue before being automatically canceled.

**Key Characteristics:**

| Property | Value |
|----------|-------|
| **Default Value** | 0 (no timeout - queries wait indefinitely) |
| **Scope** | Account, user, session, warehouse levels |
| **Purpose** | Prevent queries from waiting too long |

```sql
-- Set queue timeout at account level (5 minutes)
ALTER ACCOUNT SET STATEMENT_QUEUED_TIMEOUT_IN_SECONDS = 300;

-- Set queue timeout for a specific warehouse
ALTER WAREHOUSE my_warehouse SET STATEMENT_QUEUED_TIMEOUT_IN_SECONDS = 600;

-- Set queue timeout for current session
ALTER SESSION SET STATEMENT_QUEUED_TIMEOUT_IN_SECONDS = 120;
```

**Use Case:** Setting a queue timeout prevents queries from waiting indefinitely, which can be useful for interactive applications where users expect quick responses.

---

## 4. Multi-Cluster Warehouses and Concurrency

### 4.1 How Multi-Cluster Warehouses Improve Concurrency

Multi-cluster warehouses scale horizontally by adding additional clusters when concurrency increases, reducing or eliminating queuing.

**Single-Cluster vs. Multi-Cluster:**

| Aspect | Single-Cluster | Multi-Cluster |
|--------|----------------|---------------|
| **Max Concurrent Queries** | MAX_CONCURRENCY_LEVEL (default 8) | MAX_CONCURRENCY_LEVEL x Number of Clusters |
| **Scaling** | Vertical only (size) | Horizontal (clusters) + Vertical (size) |
| **Queuing** | Occurs when limit reached | Triggers new cluster start |
| **Edition Required** | All editions | Enterprise Edition or higher |

**Example:**
- Single-cluster Medium warehouse: Up to 8 concurrent queries (default)
- 3-cluster Medium warehouse: Up to 24 concurrent queries (8 x 3)

### 4.2 Multi-Cluster Warehouse Modes

**Maximized Mode:**

- MIN_CLUSTER_COUNT = MAX_CLUSTER_COUNT
- All clusters start when warehouse starts
- Static capacity - good for predictable, consistent load

```sql
-- Create maximized multi-cluster warehouse (3 clusters always running)
CREATE WAREHOUSE maximized_wh
  WAREHOUSE_SIZE = 'MEDIUM'
  MIN_CLUSTER_COUNT = 3
  MAX_CLUSTER_COUNT = 3;
```

**Auto-Scale Mode:**

- MIN_CLUSTER_COUNT < MAX_CLUSTER_COUNT
- Clusters start/stop dynamically based on load
- Elastic capacity - good for variable workloads

```sql
-- Create auto-scale multi-cluster warehouse
CREATE WAREHOUSE autoscale_wh
  WAREHOUSE_SIZE = 'MEDIUM'
  MIN_CLUSTER_COUNT = 1
  MAX_CLUSTER_COUNT = 5;
```

### 4.3 Scaling Policies

Scaling policies control when clusters are added or removed in Auto-scale mode.

**Standard Scaling Policy (Default):**

| Action | Trigger |
|--------|---------|
| **Start new cluster** | When a query is queued OR Snowflake estimates current clusters cannot handle additional queries |
| **Shutdown cluster** | After sustained period of low load, when queries finish |

**Economy Scaling Policy:**

| Action | Trigger |
|--------|---------|
| **Start new cluster** | Only when estimated workload can keep cluster busy for at least 6 minutes |
| **Shutdown cluster** | When estimated work remaining is less than 6 minutes |

```sql
-- Create warehouse with Standard scaling policy
CREATE WAREHOUSE standard_wh
  WAREHOUSE_SIZE = 'MEDIUM'
  MIN_CLUSTER_COUNT = 1
  MAX_CLUSTER_COUNT = 5
  SCALING_POLICY = 'STANDARD';

-- Create warehouse with Economy scaling policy
CREATE WAREHOUSE economy_wh
  WAREHOUSE_SIZE = 'MEDIUM'
  MIN_CLUSTER_COUNT = 1
  MAX_CLUSTER_COUNT = 5
  SCALING_POLICY = 'ECONOMY';

-- Change scaling policy on existing warehouse
ALTER WAREHOUSE my_wh SET SCALING_POLICY = 'ECONOMY';
```

**Choosing a Scaling Policy:**

| Policy | Best For | Trade-off |
|--------|----------|-----------|
| **Standard** | Minimizing queuing, responsive performance | Higher credit consumption |
| **Economy** | Controlling costs | More queuing, longer wait times |

---

## 5. Monitoring Queuing and Concurrency

### 5.1 Using Snowsight

**Warehouse Activity Chart:**

1. Navigate to **Compute > Warehouses**
2. Select the warehouse
3. View the **Warehouse Activity** chart
4. Look for **Queued load** (shown in a specific color)
5. Identify patterns - peaks indicate queuing

### 5.2 SQL Queries for Monitoring

**Find Warehouses with Queuing (Past Month):**

```sql
SELECT
  TO_DATE(start_time) AS date,
  warehouse_name,
  SUM(avg_running) AS sum_running,
  SUM(avg_queued_load) AS sum_queued
FROM SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_LOAD_HISTORY
WHERE TO_DATE(start_time) >= DATEADD('month', -1, CURRENT_TIMESTAMP())
GROUP BY 1, 2
HAVING SUM(avg_queued_load) > 0
ORDER BY date DESC, sum_queued DESC;
```

**Analyze Queue Time by Warehouse:**

```sql
SELECT
  warehouse_name,
  COUNT(*) AS query_count,
  AVG(QUEUED_OVERLOAD_TIME) AS avg_queue_time_ms,
  MAX(QUEUED_OVERLOAD_TIME) AS max_queue_time_ms,
  SUM(QUEUED_OVERLOAD_TIME) AS total_queue_time_ms
FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY
WHERE start_time > DATEADD('day', -7, CURRENT_TIMESTAMP())
  AND QUEUED_OVERLOAD_TIME > 0
GROUP BY warehouse_name
ORDER BY total_queue_time_ms DESC;
```

**Find Peak Concurrency Times:**

```sql
SELECT
  DATE_TRUNC('hour', start_time) AS hour,
  warehouse_name,
  MAX(avg_running) AS peak_running,
  MAX(avg_queued_load) AS peak_queued
FROM SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_LOAD_HISTORY
WHERE start_time > DATEADD('day', -7, CURRENT_TIMESTAMP())
GROUP BY 1, 2
HAVING MAX(avg_queued_load) > 0
ORDER BY hour DESC;
```

### 5.3 Key Views for Monitoring

| View | Purpose |
|------|---------|
| **WAREHOUSE_LOAD_HISTORY** | Shows running and queued load over time |
| **QUERY_HISTORY** | Shows queue times for individual queries |
| **WAREHOUSE_METERING_HISTORY** | Shows cluster activity and credit usage |

---

## 6. Strategies for Reducing Queuing

### 6.1 Option Comparison

| Strategy | When to Use | Considerations |
|----------|-------------|----------------|
| **Multi-cluster warehouse** | Variable concurrent workloads | Enterprise Edition, additional cost |
| **Increase MAX_CLUSTER_COUNT** | Already using multi-cluster | More credits consumed |
| **Create additional warehouses** | Isolate workloads | Requires query routing |
| **Increase warehouse size** | Queries are resource-bound | More credits, not always effective |
| **Schedule workloads** | Predictable batch jobs | Requires coordination |
| **Lower MAX_CONCURRENCY_LEVEL** | Prioritize individual query speed | More queuing |

### 6.2 Best Practices

**For Standard (Single-Cluster) Warehouses:**

1. **Create dedicated warehouses** for different workloads
2. **Route queries appropriately** - ETL, reporting, ad hoc each on own warehouse
3. **Schedule batch jobs** during off-peak hours
4. **Monitor queue times** and adjust warehouse size if needed

**For Multi-Cluster Warehouses:**

1. **Start with Auto-scale mode** (min=1, max=2 or 3)
2. **Monitor cluster utilization** over time
3. **Adjust max clusters** based on peak requirements
4. **Choose scaling policy** based on cost vs. performance priority
5. **Consider Economy policy** for non-time-sensitive workloads

---

## 7. Exam Tips and Common Question Patterns

### 7.1 Frequently Tested Concepts

1. **Default MAX_CONCURRENCY_LEVEL**: 8 queries per cluster
2. **Multi-cluster scaling policies**: Standard (minimize queuing) vs. Economy (minimize cost)
3. **When clusters start**: Query queued OR estimated insufficient resources (Standard policy)
4. **Edition requirement**: Multi-cluster warehouses require Enterprise Edition
5. **Queue timeout**: STATEMENT_QUEUED_TIMEOUT_IN_SECONDS parameter
6. **Monitoring views**: WAREHOUSE_LOAD_HISTORY, QUERY_HISTORY

### 7.2 Common Exam Traps

| Trap | Correct Understanding |
|------|----------------------|
| Larger warehouse size eliminates queuing | Size increases resources per cluster, but concurrency limit still applies |
| Multi-cluster scales based on warehouse size | Multi-cluster scales based on **concurrency/load**, not individual query size |
| Standard policy always starts clusters immediately | Standard starts clusters when queries queue OR when insufficient resources estimated |
| Economy policy never queues queries | Economy policy tolerates queuing to conserve credits |
| MAX_CONCURRENCY_LEVEL affects all warehouses | It is set per warehouse |
| Queuing only happens with multi-cluster | Single-cluster warehouses also queue when overloaded |

### 7.3 Key SQL Commands to Know

```sql
-- Check warehouse parameters
SHOW PARAMETERS IN WAREHOUSE my_warehouse;

-- Adjust concurrency level
ALTER WAREHOUSE my_warehouse SET MAX_CONCURRENCY_LEVEL = 4;

-- Set queue timeout
ALTER WAREHOUSE my_warehouse SET STATEMENT_QUEUED_TIMEOUT_IN_SECONDS = 300;

-- Create multi-cluster warehouse
CREATE WAREHOUSE my_wh
  WAREHOUSE_SIZE = 'MEDIUM'
  MIN_CLUSTER_COUNT = 1
  MAX_CLUSTER_COUNT = 5
  SCALING_POLICY = 'STANDARD';

-- Change scaling policy
ALTER WAREHOUSE my_wh SET SCALING_POLICY = 'ECONOMY';

-- View warehouse load history
SELECT * FROM SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_LOAD_HISTORY
WHERE warehouse_name = 'MY_WAREHOUSE';
```

### 7.4 Practice Questions

**Question 1:** What is the default value of MAX_CONCURRENCY_LEVEL for a Snowflake warehouse?

- A) 4
- B) 8
- C) 16
- D) Unlimited

**Answer:** B - The default MAX_CONCURRENCY_LEVEL is 8 queries per cluster.

---

**Question 2:** A multi-cluster warehouse is configured with SCALING_POLICY = 'ECONOMY'. When will a new cluster start?

- A) Immediately when any query is submitted
- B) When Snowflake estimates the workload can keep the cluster busy for at least 6 minutes
- C) When any query is queued
- D) Only when manually triggered by an administrator

**Answer:** B - Economy policy only starts new clusters when there is estimated sustained workload (at least 6 minutes).

---

**Question 3:** Which Snowflake edition is required to use multi-cluster warehouses?

- A) Standard Edition
- B) Enterprise Edition
- C) Business Critical Edition
- D) Virtual Private Snowflake

**Answer:** B - Multi-cluster warehouses require Enterprise Edition or higher.

---

**Question 4:** A user reports that their queries are taking longer than expected. Upon investigation, you find significant QUEUED_OVERLOAD_TIME in QUERY_HISTORY. What is the most likely cause?

- A) The queries are poorly written
- B) The warehouse is too small
- C) The warehouse has reached its concurrency limit and queries are waiting for resources
- D) The user does not have proper privileges

**Answer:** C - QUEUED_OVERLOAD_TIME indicates queries are waiting due to the warehouse being overloaded with concurrent queries.

---

**Question 5:** How can you configure a query to automatically cancel if it waits in the queue for more than 5 minutes?

- A) Set AUTO_CANCEL_QUEUE_TIME = 300
- B) Set STATEMENT_QUEUED_TIMEOUT_IN_SECONDS = 300
- C) Set MAX_QUEUE_TIME = 300
- D) This is not configurable in Snowflake

**Answer:** B - STATEMENT_QUEUED_TIMEOUT_IN_SECONDS controls the maximum time a query can wait in the queue before being canceled.

---

**Question 6:** In a multi-cluster warehouse with SCALING_POLICY = 'STANDARD', when does Snowflake start an additional cluster?

- A) Only when the current cluster is at 100% utilization
- B) When a query is queued, OR when Snowflake estimates current clusters cannot handle additional queries
- C) At the start of each hour
- D) Only when manually requested

**Answer:** B - Standard scaling policy starts clusters proactively when queries queue or when Snowflake estimates insufficient capacity.

---

**Question 7:** What is the difference between Maximized mode and Auto-scale mode for multi-cluster warehouses?

- A) Maximized mode uses larger warehouse sizes
- B) In Maximized mode, MIN_CLUSTER_COUNT = MAX_CLUSTER_COUNT; all clusters start together
- C) Auto-scale mode is only for Enterprise Edition
- D) Maximized mode has no concurrency limits

**Answer:** B - Maximized mode has equal min/max cluster counts, so all clusters start when the warehouse starts.

---

**Question 8:** Which column in QUERY_HISTORY shows the time a query spent waiting due to warehouse overload?

- A) QUEUE_TIME
- B) QUEUED_OVERLOAD_TIME
- C) WAIT_TIME
- D) BLOCKED_TIME

**Answer:** B - QUEUED_OVERLOAD_TIME specifically tracks time spent waiting due to warehouse being overloaded.

---

**Question 9:** A company wants to minimize credit consumption while accepting some query queuing. Which multi-cluster warehouse configuration should they use?

- A) SCALING_POLICY = 'STANDARD'
- B) SCALING_POLICY = 'ECONOMY'
- C) MAX_CLUSTER_COUNT = 1
- D) MAXIMIZED mode

**Answer:** B - Economy scaling policy prioritizes cost savings over immediate cluster startup.

---

**Question 10:** What is the effect of setting MAX_CONCURRENCY_LEVEL = 1 on a warehouse?

- A) The warehouse will not accept any queries
- B) Only one query can run at a time; all others will be queued
- C) The warehouse will automatically suspend
- D) This setting is not allowed

**Answer:** B - Setting MAX_CONCURRENCY_LEVEL to 1 means queries run sequentially, one at a time.

---

## 8. Quick Reference

### MAX_CONCURRENCY_LEVEL

| Property | Value |
|----------|-------|
| Default | 8 |
| Minimum | 1 |
| Scope | Per warehouse cluster |

### Scaling Policies

| Policy | Start Cluster | Stop Cluster | Best For |
|--------|---------------|--------------|----------|
| **Standard** | Query queued OR insufficient resources | Sustained low load | Minimizing wait times |
| **Economy** | 6+ minutes estimated work | < 6 minutes estimated work | Minimizing costs |

### Queue Time Columns in QUERY_HISTORY

| Column | Description |
|--------|-------------|
| QUEUED_PROVISIONING_TIME | Waiting for warehouse to start |
| QUEUED_REPAIR_TIME | Waiting for cluster repair |
| QUEUED_OVERLOAD_TIME | Waiting due to overload |

### Key Monitoring Views

| View | Purpose |
|------|---------|
| WAREHOUSE_LOAD_HISTORY | Running vs. queued load over time |
| QUERY_HISTORY | Individual query queue times |
| WAREHOUSE_METERING_HISTORY | Cluster count and credits |

### Multi-Cluster Upper Limits by Warehouse Size

| Warehouse Size | Max Clusters Allowed |
|----------------|---------------------|
| X-Small to Large | Up to 10 |
| X-Large | Up to 10 |
| 2X-Large | Up to 10 |
| 3X-Large+ | Varies (check documentation) |

---

**Key Takeaway:** Query queuing occurs when warehouse concurrency limits are reached or resources are exhausted. The MAX_CONCURRENCY_LEVEL parameter (default 8) controls per-cluster concurrency. Multi-cluster warehouses (Enterprise Edition) scale horizontally to handle increased concurrency. Standard scaling policy minimizes queuing, while Economy scaling policy minimizes cost. Understanding these concepts and how to monitor queuing using WAREHOUSE_LOAD_HISTORY and QUERY_HISTORY is essential for the SnowPro Core exam.
