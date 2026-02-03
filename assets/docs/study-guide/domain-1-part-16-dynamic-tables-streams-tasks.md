# Domain 1: Snowflake AI Data Cloud Features & Architecture

## Part 16: Dynamic Tables, Streams, and Tasks

This section covers the essential data pipeline components in Snowflake: Dynamic Tables for declarative data transformation, Streams for Change Data Capture (CDC), and Tasks for scheduling and automation. These features are critical for building modern ELT pipelines and represent a significant portion of exam questions.

---

## 1. Dynamic Tables

### 1.1 What Are Dynamic Tables?

Dynamic tables are a special type of table that **automatically refreshes** based on a defined query and target freshness. They simplify data transformation by allowing you to declare the **desired result** (declarative approach) rather than writing the transformation logic (imperative approach).

**Key Characteristics:**
- Define a query that specifies how data should be transformed from base objects
- Snowflake handles the refresh schedule automatically
- Data freshness is controlled via **target lag** settings
- Support both incremental and full refresh modes

**Basic Syntax:**
```sql
CREATE DYNAMIC TABLE my_dynamic_table
  WAREHOUSE = my_warehouse
  TARGET_LAG = '5 minutes'
AS
  SELECT
    customer_id,
    SUM(order_amount) as total_spent
  FROM orders
  GROUP BY customer_id;
```

### 1.2 Target Lag

**Target lag** determines how outdated data in a dynamic table can be relative to its source tables. It is a **target**, not a guarantee.

**Types of Target Lag:**

| Type | Description | Use Case |
|------|-------------|----------|
| **Time-based** | Specific duration (e.g., '5 minutes', '1 hour') | When you need data freshness within a known interval |
| **DOWNSTREAM** | Refreshes on demand when downstream dynamic tables refresh | For intermediate tables in a pipeline that don't need independent schedules |

**Setting Target Lag:**
```sql
-- Time-based target lag
CREATE DYNAMIC TABLE dt_orders
  WAREHOUSE = my_wh
  TARGET_LAG = '10 minutes'
AS SELECT * FROM raw_orders;

-- Downstream target lag (refreshes when dependent DTs need it)
ALTER DYNAMIC TABLE dt_intermediate SET TARGET_LAG = DOWNSTREAM;
```

**Important Considerations:**
- Target lag is measured relative to **root tables** in the graph, not directly upstream tables
- Shorter target lag = more frequent refreshes = higher cost
- Target lag may be exceeded due to warehouse size, data size, or query complexity

### 1.3 Dynamic Table Refresh Modes

Dynamic tables support two refresh modes:

| Refresh Mode | Description | Best For |
|--------------|-------------|----------|
| **Incremental** | Analyzes query and computes only changed data since last refresh | Large datasets with frequent small updates; simple queries |
| **Full** | Re-executes entire query and replaces all data | Complex queries; non-deterministic functions; small datasets |
| **AUTO** | Snowflake automatically selects most efficient mode | Default recommendation - lets Snowflake optimize |

**Refresh Mode Rules:**
- Incremental refresh requires deterministic functions and supported query patterns
- Dynamic tables with **incremental** refresh **cannot** be downstream from dynamic tables with **full** refresh
- Once set, refresh mode cannot be changed without recreating the table

**Check Refresh Mode:**
```sql
-- View refresh mode
SHOW DYNAMIC TABLES LIKE 'my_dynamic_table';
-- Check columns: text (user-specified), refresh_mode (actual), refresh_mode_reason
```

### 1.4 Creating and Managing Dynamic Tables

**Create with backfill (initialization):**
```sql
CREATE DYNAMIC TABLE product_summary
  WAREHOUSE = 'my_wh'
  TARGET_LAG = '1 hour'
  REFRESH_MODE = AUTO
  INITIALIZE = ON_CREATE  -- or ON_SCHEDULE
AS
  SELECT
    product_category,
    COUNT(*) as product_count,
    AVG(price) as avg_price
  FROM products
  GROUP BY product_category;
```

**Key Restrictions:**
- **No DML support:** Dynamic tables are query-only definitions. You cannot run INSERT, UPDATE, DELETE, or MERGE on a dynamic table directly.
- **No automatic query rewrite:** Unlike materialized views, the query optimizer does not automatically rewrite queries to use a dynamic table. You must reference the dynamic table explicitly.
- **Cloned dynamic tables start SUSPENDED:** When you clone a dynamic table (or clone a schema/database containing one), the cloned dynamic table starts in a SUSPENDED scheduling state and must be explicitly resumed.

**Common Operations:**
```sql
-- Suspend refreshes
ALTER DYNAMIC TABLE my_dt SUSPEND;

-- Resume refreshes
ALTER DYNAMIC TABLE my_dt RESUME;

-- Manual refresh
ALTER DYNAMIC TABLE my_dt REFRESH;

-- Change target lag
ALTER DYNAMIC TABLE my_dt SET TARGET_LAG = '30 minutes';

-- Change warehouse
ALTER DYNAMIC TABLE my_dt SET WAREHOUSE = new_warehouse;
```

### 1.5 Dynamic Tables vs. Materialized Views

| Aspect | Materialized Views | Dynamic Tables |
|--------|-------------------|----------------|
| **Purpose** | Improve query performance transparently | Build multi-level data pipelines |
| **Query Complexity** | Single base table only; no joins | Complex queries with joins and unions supported |
| **Data Freshness** | Always current (synchronous updates) | Current up to target lag (asynchronous) |
| **Query Rewriting** | Optimizer automatically rewrites queries | Must explicitly query the dynamic table |
| **Compute Model** | Background maintenance service | Uses specified virtual warehouse |
| **Use Case** | Accelerate slow queries on single tables | ELT pipelines, data transformation |

**When to Use Each:**
- **Materialized Views**: Simple aggregations on single tables where query acceleration is the goal
- **Dynamic Tables**: Complex transformations, multi-table joins, data pipeline orchestration

### 1.6 Dynamic Tables vs. Streams and Tasks

| Aspect | Streams + Tasks | Dynamic Tables |
|--------|----------------|----------------|
| **Approach** | Imperative (write transformation logic) | Declarative (specify desired result) |
| **Scheduling** | Manual control over schedules | Automatic based on target lag |
| **Complexity** | More control but more code | Simpler, less maintenance |
| **SQL Support** | Full SQL including procedural logic | Limited to queries that support refresh analysis |

**Choose Dynamic Tables when:**
- You want to avoid manually tracking dependencies
- You only need to specify target freshness, not exact schedules
- You want Snowflake to handle orchestration

**Choose Streams + Tasks when:**
- You need fine-grained control over refresh schedules
- Your transformation requires procedural logic
- You need to perform operations that dynamic tables don't support

### 1.7 Dynamic Table Cost Considerations

**Compute Costs:**
1. **Virtual Warehouse**: Required for refreshes; credits consumed based on warehouse size and refresh duration
2. **Cloud Services**: Detects changes in base objects; if no changes, warehouse stays suspended

**Storage Costs:**
- Materialized results storage
- Time Travel and Fail-safe storage
- Incremental refresh requires additional storage for row identifiers

**Cost Optimization Tips:**
- Use longer target lags when near real-time isn't required
- Test with dedicated warehouses to establish baseline costs
- Consider transient dynamic tables to reduce storage costs (no Fail-safe)

---

## 2. Streams

### 2.1 What Are Streams?

A **stream** is an object that records **change data capture (CDC)** information about DML changes (INSERT, UPDATE, DELETE) made to a table. Streams enable tracking of row-level changes for downstream processing.

**Key Concepts:**
- A stream stores an **offset** (not actual data)
- Changes are tracked between the offset and current table version
- Consuming a stream advances its offset
- Multiple streams can track the same table independently

**Think of a stream as a bookmark** - it marks a point in time in the table's history and shows you what changed since that point.

### 2.2 Stream Types

| Stream Type | Supported Sources | Tracks | Key Fact |
|------------|-------------------|--------|----------|
| **Standard (Default)** | Tables, views | INSERT, UPDATE, DELETE | Most comprehensive; performs join on insert/delete rows to compute net changes |
| **Append-only** | Tables, dynamic tables, Iceberg tables, views | INSERT only | More performant than Standard; ignores deletes/updates |
| **Insert-only** | External tables, directory tables | INSERT only | For external/unstructured data sources where updates/deletes are not tracked |

**Creating Streams:**
```sql
-- Standard stream (default)
CREATE STREAM orders_stream ON TABLE orders;

-- Append-only stream
CREATE STREAM orders_append_stream
  ON TABLE orders
  APPEND_ONLY = TRUE;

-- Stream on a view
CREATE STREAM view_stream ON VIEW customer_orders;

-- Stream on a dynamic table (must be incremental refresh mode)
CREATE STREAM dt_stream ON DYNAMIC TABLE product_summary;
```

### 2.3 Stream Metadata Columns

When you query a stream, you get metadata columns describing each change:

| Column | Description |
|--------|-------------|
| `METADATA$ACTION` | Type of change: INSERT or DELETE |
| `METADATA$ISUPDATE` | TRUE if the row is part of an UPDATE operation |
| `METADATA$ROW_ID` | Unique, immutable row identifier |

**Understanding METADATA$ACTION and METADATA$ISUPDATE:**

| Operation | METADATA$ACTION | METADATA$ISUPDATE |
|-----------|-----------------|-------------------|
| INSERT | INSERT | FALSE |
| DELETE | DELETE | FALSE |
| UPDATE (old values) | DELETE | TRUE |
| UPDATE (new values) | INSERT | TRUE |

**Example Query:**
```sql
SELECT
  *,
  METADATA$ACTION,
  METADATA$ISUPDATE,
  METADATA$ROW_ID
FROM orders_stream;
```

### 2.4 Stream Offset and Consumption

**Key Rules:**
1. Querying a stream **does not** advance its offset
2. Offset advances only when stream data is consumed in a **committed DML statement**
3. Within an explicit transaction, all queries see the same stream snapshot (repeatable read)

**Consuming Stream Data:**
```sql
-- This advances the stream offset (consumes the changes)
INSERT INTO orders_history
SELECT * FROM orders_stream;

-- Using explicit transaction for multiple statements
BEGIN;
  INSERT INTO processed_orders SELECT * FROM orders_stream;
  INSERT INTO audit_log VALUES (CURRENT_TIMESTAMP(), 'Processed orders');
COMMIT;

-- After COMMIT, stream offset advances
```

**Advancing Offset Without Processing:**
```sql
-- Recreate the stream
CREATE OR REPLACE STREAM orders_stream ON TABLE orders;

-- Or insert with a false condition (advances offset but inserts nothing)
INSERT INTO temp_table
SELECT * FROM orders_stream WHERE 1 = 0;
```

### 2.5 Stream Staleness

A stream becomes **stale** when its offset falls outside the data retention period of the source table.

**Prevention:**
- Consume stream records regularly (before retention period expires)
- Default extension: Snowflake extends retention up to 14 days for unconsumed streams
- Use `SYSTEM$STREAM_HAS_DATA()` function to prevent staleness when stream is empty

**Check Staleness:**
```sql
SHOW STREAMS LIKE 'orders_stream';
-- Check STALE and STALE_AFTER columns

DESCRIBE STREAM orders_stream;
```

**Important:** Once a stream is stale, it must be recreated -- it cannot be recovered.

### 2.6 Stream Exam Traps

| Trap | Explanation |
|------|-------------|
| Stream is a physical table | **FALSE** -- a stream stores only an offset (pointer), not actual data |
| Querying a stream advances offset | **FALSE** -- offset advances only when stream data is consumed in a committed DML statement |
| Failed DML advances offset | **FALSE** -- consuming a stream in a DML that fails or rolls back does NOT advance the offset |
| Recreating source table is safe | **FALSE** -- `CREATE OR REPLACE TABLE` on the source makes the stream stale |
| Multiple streams share an offset | **FALSE** -- multiple streams on the same object track independently |
| Streams on views work automatically | **FALSE** -- change tracking must be enabled on all underlying tables before creating a stream on a view |

**Useful Function:** `SYSTEM$STREAM_HAS_DATA('stream_name')` checks whether a stream contains unconsumed change data. This is commonly used in task WHEN conditions to avoid unnecessary processing.

### 2.7 Streams on Views

Streams can be created on views with these requirements:
- View must be a **non-materialized** view
- All underlying tables must have **change tracking enabled**
- View cannot contain non-deterministic functions or certain operations

**Enable Change Tracking:**
```sql
-- Enable on table
ALTER TABLE orders SET CHANGE_TRACKING = TRUE;

-- Create stream on view
CREATE STREAM orders_by_customer_stream ON VIEW orders_by_customer;
```

### 2.8 Multiple Stream Consumers

**Best Practice:** Create a **separate stream** for each consumer of change data.

**Reason:** When one consumer commits a DML transaction on a stream, the offset advances for all consumers of that same stream.

```sql
-- Separate streams for different consumers
CREATE STREAM orders_stream_for_warehouse ON TABLE orders;
CREATE STREAM orders_stream_for_analytics ON TABLE orders;
CREATE STREAM orders_stream_for_audit ON TABLE orders;
```

---

## 3. Tasks

### 3.1 What Are Tasks?

**Tasks** are objects that schedule and execute SQL statements or stored procedures. They automate data processing and can be triggered by schedules or events.

**Key Features:**
- Run SQL commands or stored procedures
- Support multiple languages (SQL, JavaScript, Python, Java, Scala)
- Can be organized into task graphs (DAGs)
- Can be triggered by streams (event-driven)

### 3.2 Compute Models

| Model | Description | Use Case |
|-------|-------------|----------|
| **Serverless** | Snowflake manages compute resources automatically | Variable workloads; predictable costs; schedule adherence |
| **User-managed** | You specify a virtual warehouse | Multiple concurrent tasks; warehouses already utilized |

**Serverless Task:**
```sql
CREATE TASK my_serverless_task
  SCHEDULE = '60 MINUTES'
AS
  INSERT INTO summary_table
  SELECT * FROM staging_table;
```

**User-managed Task:**
```sql
CREATE TASK my_warehouse_task
  WAREHOUSE = 'COMPUTE_WH'
  SCHEDULE = '60 MINUTES'
AS
  INSERT INTO summary_table
  SELECT * FROM staging_table;
```

**Serverless Task Limits:**
- Maximum compute equivalent: **XXLARGE** warehouse
- Snowflake automatically scales within the allowed range

**Serverless Size Control:**
```sql
CREATE TASK my_task
  SCHEDULE = '30 SECONDS'
  SERVERLESS_TASK_MIN_STATEMENT_SIZE = 'SMALL'
  SERVERLESS_TASK_MAX_STATEMENT_SIZE = 'LARGE'
AS
  ...;
```

### 3.3 Task Scheduling Options

**Time-based Scheduling:**
```sql
-- Every X minutes/hours
CREATE TASK hourly_task
  SCHEDULE = '60 MINUTES'
AS ...;

-- Every X seconds (minimum 1 second)
CREATE TASK frequent_task
  SCHEDULE = '30 SECONDS'
AS ...;

-- CRON expression
CREATE TASK daily_3am_task
  SCHEDULE = 'USING CRON 0 3 * * * America/Los_Angeles'
AS ...;
```

**CRON Format:** `minute hour day-of-month month day-of-week`

**Triggered Tasks (Event-driven):**
```sql
-- Runs when stream has data
CREATE TASK stream_triggered_task
  WHEN SYSTEM$STREAM_HAS_DATA('orders_stream')
AS
  INSERT INTO processed_orders
  SELECT * FROM orders_stream;

-- Combined: scheduled check of stream
CREATE TASK hourly_stream_check
  SCHEDULE = '1 HOUR'
  WHEN SYSTEM$STREAM_HAS_DATA('orders_stream')
AS ...;
```

### 3.4 Task Graphs (DAGs)

A **task graph** is a directed acyclic graph (DAG) of tasks with dependencies. It consists of:
- **Root task**: Has a schedule; initiates the graph
- **Child tasks**: Depend on parent tasks; run after predecessors complete
- **Finalizer task** (optional): Runs after all other tasks complete (success or failure)

**Creating a Task Graph:**
```sql
-- Root task
CREATE TASK root_task
  SCHEDULE = '1 HOUR'
AS
  CALL start_pipeline();

-- Child tasks (run in parallel after root)
CREATE TASK child_task_1
  AFTER root_task
AS
  INSERT INTO table_1 SELECT * FROM staging_1;

CREATE TASK child_task_2
  AFTER root_task
AS
  INSERT INTO table_2 SELECT * FROM staging_2;

-- Task dependent on multiple parents (runs after both complete)
CREATE TASK aggregate_task
  AFTER child_task_1, child_task_2
AS
  INSERT INTO summary SELECT * FROM table_1 JOIN table_2;

-- Finalizer task
CREATE TASK cleanup_task
  FINALIZE = root_task
AS
  CALL cleanup_pipeline();
```

**Task Graph Limits and Constraints:**
- Maximum 1,000 tasks per graph
- Maximum 100 parent tasks per child
- Maximum 100 child tasks per parent
- **All tasks in a DAG must have the same owner role and reside in the same schema**

### 3.5 Task States and Management

**Task States:**
- **Started (Resumed)**: Actively running on schedule or monitoring events
- **Suspended**: Not running; default state after creation

**Managing Tasks:**
```sql
-- Resume a task (start running)
ALTER TASK my_task RESUME;

-- Suspend a task
ALTER TASK my_task SUSPEND;

-- Resume all tasks in a graph
SELECT SYSTEM$TASK_DEPENDENTS_ENABLE('root_task');

-- Execute task manually (for testing)
EXECUTE TASK my_task;

-- Retry last failed run
EXECUTE TASK my_task RETRY LAST;
```

**Important:** Tasks are created in **suspended** state. You must explicitly **RESUME** them.

### 3.6 Task Failure Handling

**Auto-suspend after failures:**
```sql
CREATE TASK my_task
  SCHEDULE = '1 HOUR'
  SUSPEND_TASK_AFTER_NUM_FAILURES = 3  -- Suspend after 3 consecutive failures
AS ...;
```

**Auto-retry:**
```sql
-- On root task
ALTER TASK root_task SET TASK_AUTO_RETRY_ATTEMPTS = 2;
```

**Task Timeouts:**
```sql
CREATE TASK my_task
  SCHEDULE = '1 HOUR'
  USER_TASK_TIMEOUT_MS = 3600000  -- 1 hour timeout
AS ...;
```

### 3.7 Task Security

**Required Privileges:**

| Privilege | Level | Purpose |
|-----------|-------|---------|
| CREATE TASK | Schema | Create tasks |
| EXECUTE TASK | Account | Run user-managed warehouse tasks |
| EXECUTE MANAGED TASK | Account | Required for serverless tasks |
| OPERATE | Task | Resume or suspend a task |
| USAGE | Warehouse | Required for user-managed tasks |

**Create Task Admin Role:**
```sql
-- Grant ability to create tasks
GRANT CREATE TASK ON SCHEMA my_schema TO ROLE task_admin;

-- Grant ability to run user-managed warehouse tasks
GRANT EXECUTE TASK ON ACCOUNT TO ROLE task_admin;

-- Grant ability to run serverless tasks
GRANT EXECUTE MANAGED TASK ON ACCOUNT TO ROLE task_admin;

-- Grant ability to resume/suspend tasks
GRANT OPERATE ON TASK my_task TO ROLE task_admin;
```

---

## 4. Combining Streams and Tasks

The most common pattern combines streams (for CDC) with tasks (for scheduling):

```sql
-- 1. Create source table
CREATE TABLE orders (
  order_id INT,
  customer_id INT,
  amount DECIMAL(10,2),
  order_date TIMESTAMP
);

-- 2. Create stream on source
CREATE STREAM orders_stream ON TABLE orders;

-- 3. Create target table
CREATE TABLE orders_processed (
  order_id INT,
  customer_id INT,
  amount DECIMAL(10,2),
  order_date TIMESTAMP,
  processed_at TIMESTAMP
);

-- 4. Create task triggered by stream
CREATE TASK process_orders
  WAREHOUSE = 'COMPUTE_WH'
  WHEN SYSTEM$STREAM_HAS_DATA('orders_stream')
AS
  INSERT INTO orders_processed
  SELECT
    order_id,
    customer_id,
    amount,
    order_date,
    CURRENT_TIMESTAMP() as processed_at
  FROM orders_stream
  WHERE METADATA$ACTION = 'INSERT';

-- 5. Resume the task
ALTER TASK process_orders RESUME;
```

---

## 5. Exam Tips and Common Question Patterns

### 5.1 Dynamic Tables Questions

**Frequently Tested Concepts:**
1. **Target Lag**: Know the difference between time-based and DOWNSTREAM
2. **Refresh Modes**: Incremental vs. Full vs. AUTO - when each is appropriate
3. **Comparison with Materialized Views**: Key differences in use cases and behavior
4. **Cost Model**: Warehouse compute + Cloud Services + Storage

**Common Traps:**
- Dynamic tables cannot use query rewriting (unlike materialized views)
- Target lag is a **target**, not a guarantee
- Incremental refresh DTs cannot be downstream from full refresh DTs
- Changing refresh mode requires recreating the table

### 5.2 Streams Questions

**Frequently Tested Concepts:**
1. **Stream Types**: Know when to use Standard vs. Append-only vs. Insert-only
2. **Offset Behavior**: When does offset advance? (Committed DML only)
3. **Staleness**: What causes it, how to prevent it
4. **Metadata Columns**: What they mean, especially for UPDATE operations

**Common Traps:**
- Querying a stream does NOT advance its offset
- Stale streams cannot be recovered - must be recreated
- Standard streams track all DML; append-only only tracks INSERTs
- Updates appear as DELETE + INSERT pairs in standard streams

### 5.3 Tasks Questions

**Frequently Tested Concepts:**
1. **Compute Models**: Serverless vs. User-managed - trade-offs
2. **Scheduling**: CRON syntax, triggered tasks with streams
3. **Task Graphs**: Root tasks, child tasks, finalizer tasks
4. **Task States**: Tasks start SUSPENDED, must be explicitly RESUMED

**Common Traps:**
- Tasks are created SUSPENDED by default
- Root task defines schedule; child tasks cannot have schedules
- EXECUTE MANAGED TASK privilege required for serverless tasks
- Only one instance of a task graph runs at a time (unless ALLOW_OVERLAPPING_EXECUTION = TRUE)

### 5.4 Practice Questions

**Question 1:** What happens when you query a stream without using the result in a DML statement?
- A) The stream offset advances
- B) The stream becomes stale
- C) The stream offset does not advance
- D) An error is thrown

**Answer:** C - The stream offset only advances when data is consumed in a committed DML statement.

---

**Question 2:** Which refresh mode should you use for a dynamic table that performs complex joins with non-deterministic functions?
- A) INCREMENTAL
- B) FULL
- C) AUTO
- D) HYBRID

**Answer:** B - FULL refresh mode is required for queries with non-deterministic functions. Setting INCREMENTAL would fail.

---

**Question 3:** A task is created but never runs on schedule. What is the most likely issue?
- A) The warehouse is too small
- B) The task is still in SUSPENDED state
- C) The stream has no data
- D) The account lacks credits

**Answer:** B - Tasks are created in SUSPENDED state and must be explicitly resumed with ALTER TASK ... RESUME.

---

**Question 4:** In a task graph, when does the finalizer task run?
- A) Before the root task
- B) After the root task but before child tasks
- C) After all other tasks complete (or fail)
- D) Only when all tasks succeed

**Answer:** C - The finalizer task runs after all other tasks in the graph complete, regardless of success or failure.

---

**Question 5:** What type of stream should you create on an external table?
- A) Standard
- B) Append-only
- C) Insert-only
- D) Delta

**Answer:** C - External tables only support insert-only streams because external storage systems don't track updates/deletes.

---

**Question 6:** A dynamic table has TARGET_LAG = DOWNSTREAM but never refreshes. What is the likely cause?
- A) The warehouse is suspended
- B) There are no downstream dynamic tables consuming it
- C) The source table has no changes
- D) Both B and C are correct

**Answer:** D - DOWNSTREAM tables only refresh when downstream consumers need them. If there are no downstream consumers with time-based lags, or if there are no source changes to propagate, the table won't refresh.

---

## 6. Quick Reference

### Dynamic Tables

```sql
-- Create
CREATE DYNAMIC TABLE dt_name
  WAREHOUSE = wh_name
  TARGET_LAG = '5 minutes' | DOWNSTREAM
  REFRESH_MODE = AUTO | INCREMENTAL | FULL
AS SELECT ...;

-- Manage
ALTER DYNAMIC TABLE dt_name SUSPEND;
ALTER DYNAMIC TABLE dt_name RESUME;
ALTER DYNAMIC TABLE dt_name REFRESH;
ALTER DYNAMIC TABLE dt_name SET TARGET_LAG = '10 minutes';
```

### Streams

```sql
-- Create
CREATE STREAM stream_name ON TABLE table_name;
CREATE STREAM stream_name ON TABLE table_name APPEND_ONLY = TRUE;
CREATE STREAM stream_name ON VIEW view_name;

-- Query
SELECT *, METADATA$ACTION, METADATA$ISUPDATE FROM stream_name;

-- Check for data
SELECT SYSTEM$STREAM_HAS_DATA('stream_name');

-- Check status
SHOW STREAMS LIKE 'stream_name';
```

### Tasks

```sql
-- Create serverless
CREATE TASK task_name
  SCHEDULE = '60 MINUTES'
AS sql_statement;

-- Create user-managed
CREATE TASK task_name
  WAREHOUSE = 'WH_NAME'
  SCHEDULE = 'USING CRON 0 * * * * UTC'
AS sql_statement;

-- Create triggered
CREATE TASK task_name
  WHEN SYSTEM$STREAM_HAS_DATA('stream_name')
AS sql_statement;

-- Create child task
CREATE TASK child_task_name
  AFTER parent_task_name
AS sql_statement;

-- Manage
ALTER TASK task_name RESUME;
ALTER TASK task_name SUSPEND;
EXECUTE TASK task_name;

-- Resume all in graph
SELECT SYSTEM$TASK_DEPENDENTS_ENABLE('root_task');
```

---

**Key Takeaway:** Dynamic Tables, Streams, and Tasks are complementary technologies. Dynamic Tables provide a declarative approach for data pipelines, Streams enable change data capture, and Tasks provide scheduling and orchestration. Understanding when to use each - and how they can work together - is essential for the SnowPro Core exam.
