# SnowPro Core (COF-C02): Scenario-Based Questions & Memory Aids

> Realistic exam scenario patterns, decision trees, and mnemonics for rapid recall

---

## SECTION 1: Scenario-Based Question Patterns

The COF-C02 exam is heavily scenario-based. Questions rarely ask "What is X?" -- instead they present a situation and ask you to choose the best approach, identify the root cause, or determine what happens next. The 33 patterns below cover the most frequently tested scenarios, grouped by the way the question stem begins.

---

### Theme 1: "A company needs to..." (Architecture Decisions)

---

#### Scenario 1: Sharing Data Across Cloud Regions

> A company on AWS us-east-1 needs to share data with a business partner whose Snowflake account is on Azure West Europe. What must the provider do before the consumer can access the data?

**Concept tested:** Cross-region / cross-cloud data sharing requires replication.

**Correct answer:** The provider must replicate the database to a Snowflake account in the consumer's region (or the consumer's cloud) before sharing. Cross-region sharing is not zero-copy -- data IS physically copied via replication.

**Why other options are wrong:**
- "Create a share and add the consumer account" -- This only works within the same region and cloud provider. Cross-region shares require replication first.
- "Use a reader account in the consumer's region" -- Reader accounts are created in the provider's region and cloud. They do not solve the cross-region problem.
- "Ask the consumer to create an external stage pointing to the provider's storage" -- This bypasses Snowflake's sharing entirely and does not maintain governance.

---

#### Scenario 2: Choosing Between Table Types for ETL Staging

> A company runs a nightly ETL pipeline that stages raw data into a landing table, transforms it into a production table, then truncates the landing table. The landing data does not need disaster recovery, and the team wants to minimize storage costs. Which table type should they use for the landing table?

**Concept tested:** Transient vs Permanent vs Temporary tables.

**Correct answer:** **Transient table.** It has Time Travel (up to 1 day) for operational recovery but NO Fail-safe, reducing storage costs. It persists across sessions (unlike temporary tables), which is necessary for a scheduled nightly pipeline.

**Why other options are wrong:**
- "Temporary table" -- Temporary tables are session-scoped. A nightly ETL pipeline likely runs across sessions or via tasks, so data would be lost when the session ends.
- "Permanent table with 0-day Time Travel" -- Even with 0-day Time Travel, permanent tables still have 7-day Fail-safe, adding unnecessary storage cost.
- "External table" -- External tables are read-only; you cannot INSERT or TRUNCATE them.

---

#### Scenario 3: Isolating Workloads for Cost and Performance

> A company has three workloads: a data science team running ad-hoc queries, a BI dashboard used by 200 concurrent users, and a nightly batch loading process. How should they configure their virtual warehouses?

**Concept tested:** Warehouse isolation, multi-cluster warehouses, and sizing strategy.

**Correct answer:** Use **three separate warehouses**: (1) A standard warehouse for data science (scale UP for complex queries), (2) A multi-cluster warehouse with auto-scaling for the BI dashboard (scale OUT for concurrency), (3) A dedicated warehouse for batch loading (suspend immediately after use).

**Why other options are wrong:**
- "One large warehouse for all workloads" -- Mixes cost attribution, causes queuing during peak BI usage, and cannot be independently tuned.
- "Two warehouses: one for queries, one for loading" -- The BI dashboard needs multi-cluster for 200 users, while data science needs a different size/config. Combining them causes contention.
- "Use multi-cluster for all three" -- Multi-cluster helps concurrency, not single-query performance. Data science ad-hoc queries benefit more from a larger single warehouse.

---

#### Scenario 4: Choosing an Edition for Regulatory Compliance

> A financial services company must meet HIPAA and PCI DSS compliance requirements. They need customer-managed encryption keys, private connectivity to avoid public internet exposure, and database failover to a secondary account for disaster recovery. Which Snowflake edition do they need?

**Concept tested:** Edition feature matrix -- Business Critical requirements.

**Correct answer:** **Business Critical** (or higher). It provides Tri-Secret Secure (customer-managed keys), AWS PrivateLink / Azure Private Link / GCP Private Service Connect, and failover/failback support via failover groups.

**Why other options are wrong:**
- "Enterprise" -- Enterprise has masking policies, multi-cluster, and materialized views, but NOT Tri-Secret Secure, private connectivity, or failover groups.
- "Standard" -- Standard lacks nearly all of these features (no multi-cluster, no masking, no private connectivity).
- "Enterprise with an add-on" -- These features are not add-ons; they are edition-gated.

---

#### Scenario 5: Non-Snowflake Consumers Need Data Access

> A data provider wants to share live data with a partner organization that does not have a Snowflake account and is not willing to create one. The partner needs to run SQL queries against the data. What is the best approach?

**Concept tested:** Reader accounts.

**Correct answer:** Create a **reader account** (managed account) for the partner. The provider creates and manages the account; the partner can query shared data without purchasing their own Snowflake license.

**Why other options are wrong:**
- "Export data to CSV and share via cloud storage" -- Loses real-time access, requires manual refresh, and bypasses Snowflake governance.
- "Create a Snowflake Marketplace listing" -- Marketplace listings still require the consumer to have a Snowflake account.
- "Use a secure direct share" -- A direct share requires the consumer to already have a Snowflake account.

**Follow-up trap:** The provider pays ALL compute costs for reader accounts. Reader accounts can only consume data from their single provider.

---

#### Scenario 6: Real-Time Dashboard with Freshness Under 5 Minutes

> A company needs to build a dashboard that shows aggregated sales data refreshed every 5 minutes. The source data arrives continuously into a raw table. The transformation involves joins across three tables. What is the best approach?

**Concept tested:** Dynamic Tables vs Materialized Views vs Streams+Tasks.

**Correct answer:** **Dynamic Table** with `TARGET_LAG = '5 minutes'`. Dynamic tables support joins, handle refresh scheduling automatically, and provide declarative pipeline definition.

**Why other options are wrong:**
- "Materialized view" -- Materialized views do NOT support joins (single-table only). This is the most common trap.
- "Stream + Task with 5-minute schedule" -- This works but is more complex to build and maintain. Dynamic tables are the simpler, declarative approach for this use case.
- "View with result caching" -- A regular view does not guarantee 5-minute freshness and the result cache is invalidated whenever underlying data changes.

---

#### Scenario 6B: Creating a Test Environment Without Doubling Storage

> A data engineer needs to create a full copy of the production database for testing. The production database is 2 TB. The team wants to avoid doubling their storage costs and needs the test environment available immediately. What should they do?

**Concept tested:** Zero-copy cloning.

**Correct answer:** Use `CREATE DATABASE test_db CLONE prod_db`. Zero-copy cloning creates a metadata-only copy that shares the underlying micro-partitions with the source. No data is physically copied at clone time, so it is nearly instant and incurs NO additional storage cost until the clone or source diverges (via INSERT, UPDATE, DELETE).

```sql
CREATE DATABASE test_db CLONE prod_db;
-- Instant. 0 bytes of additional storage initially.
-- Storage increases only as test_db diverges from prod_db.
```

**Why other options are wrong:**
- "CREATE DATABASE test_db AS SELECT from all production tables" -- This physically copies all data, doubling storage and taking significant time for 2 TB.
- "Use data sharing to share prod with a test account" -- Shares are read-only. The test environment needs to perform DML (inserts, updates) for testing.
- "Export to cloud storage and re-import" -- Extremely slow for 2 TB, doubles storage, and loses metadata like grants and constraints.

**Key facts for the exam:**
- Cloning works on databases, schemas, tables, streams, and other objects.
- Cloning is recursive: cloning a database clones all schemas, tables, and most objects within it.
- Internal stages are NOT cloned. Pipes are set to STOPPED_CLONED state. Tasks are SUSPENDED.
- A clone of a clone creates another metadata pointer -- not a copy of a copy.

---

#### Scenario 6C: Recovering an Accidentally Dropped Production Table

> A developer accidentally ran `DROP TABLE customers` on the production database 3 hours ago. The table contained critical business data. How should the administrator recover it?

**Concept tested:** Time Travel and UNDROP.

**Correct answer:** Use `UNDROP TABLE customers` to restore the table. Since the table was dropped only 3 hours ago (well within the Time Travel retention period), UNDROP instantly restores the table and all its data to the state at the moment it was dropped.

```sql
-- Restore the dropped table
UNDROP TABLE customers;

-- If you need data from BEFORE the drop (e.g., to check state at a specific time):
SELECT * FROM customers AT(OFFSET => -10800);  -- 3 hours ago in seconds
-- Or use a timestamp:
SELECT * FROM customers AT(TIMESTAMP => '2024-01-15 09:00:00'::TIMESTAMP_LTZ);
-- Or use a query ID:
SELECT * FROM customers BEFORE(STATEMENT => '<query_id_of_drop>');
```

**Why other options are wrong:**
- "Restore from Fail-safe" -- Fail-safe is only accessible by Snowflake support and is intended for catastrophic recovery AFTER Time Travel expires. It takes days, not seconds. Always try UNDROP or Time Travel first.
- "Re-load from the last backup" -- Snowflake does not require traditional backup/restore workflows. Time Travel and UNDROP are the native mechanisms.
- "Use a stream to replay the data" -- Streams capture changes going forward, not backward. A stream cannot reconstruct a dropped table.

**Key facts for the exam:**
- UNDROP works on tables, schemas, and databases.
- If a new object with the same name exists, you must rename it before running UNDROP.
- Time Travel retention: up to 1 day (Standard/Transient/Temporary), up to 90 days (Enterprise+ permanent tables).
- AT and BEFORE clauses support three references: TIMESTAMP, OFFSET (seconds), and STATEMENT (query ID).

---

### Theme 2: "A data engineer is troubleshooting..." (Performance / Debugging)

---

#### Scenario 7: Query Running Slowly Despite Large Warehouse

> A data engineer upgraded a warehouse from Medium to 2XL, but a specific query still takes the same amount of time. The Query Profile shows that 90% of the time is spent in a single node labeled "TableScan" with "Partitions scanned: 500 / Partitions total: 500." What is the most likely cause?

**Concept tested:** Partition pruning failure.

**Correct answer:** The query is scanning ALL partitions because the WHERE clause is not enabling pruning. The engineer should add or modify a **clustering key** on the filter columns and ensure the WHERE clause uses direct column comparisons (not wrapped in functions).

**Why other options are wrong:**
- "Increase warehouse size further" -- A larger warehouse adds more compute nodes to process partitions in parallel, but the query is scanning all 500 partitions regardless. The root cause is pruning, not compute.
- "Enable result caching" -- Result caching is on by default. If the underlying data has changed, the cache will not be used. This does not fix the fundamental scan problem.
- "Enable Query Acceleration Service" -- QAS can help with scan-heavy queries, but the root issue is that ALL partitions are being scanned. Fixing the clustering/pruning is a more effective solution.

---

#### Scenario 8: Queries Queuing During Peak Hours

> During morning peak hours, BI analysts report that their queries are queuing and taking 3x longer than usual. The warehouse is a single-cluster XL warehouse. What should the engineer do?

**Concept tested:** Multi-cluster warehouses for concurrency.

**Correct answer:** Convert the warehouse to a **multi-cluster warehouse** with auto-scaling (e.g., MIN_CLUSTER_COUNT = 1, MAX_CLUSTER_COUNT = 3). This scales OUT to handle concurrent users. Requires Enterprise edition or higher.

**Why other options are wrong:**
- "Increase the warehouse size to 2XL" -- Scaling UP improves individual query performance but does NOT reduce queuing. Queuing is a concurrency issue, not a compute issue.
- "Lower the auto-suspend timeout" -- This would actually make the problem worse by suspending the warehouse between queries and losing the warehouse cache.
- "Increase the statement timeout" -- This just lets queries run longer before being killed; it does not reduce queue time.

---

#### Scenario 9: Remote Spillage in Query Profile

> A data engineer sees "Bytes spilled to remote storage: 45 GB" in the Query Profile. What should they do first?

**Concept tested:** Memory spillage hierarchy and warehouse sizing.

**Correct answer:** **Increase the warehouse size.** Remote spillage means the query exceeded both in-memory and local SSD capacity, spilling to remote cloud storage (S3/Blob/GCS). This is 10-100x slower than local SSD. A larger warehouse provides more memory and local SSD.

**Why other options are wrong:**
- "Add a clustering key" -- Clustering helps with partition pruning, but remote spillage is a memory/compute issue, not a scanning issue.
- "Enable Query Acceleration Service" -- QAS offloads scan portions to serverless compute but does not provide more memory for the existing warehouse nodes.
- "Wait and re-run the query" -- Remote spillage is a structural problem that will recur on every execution with the same data volume.

**Important nuance:** Local spillage (to SSD) is less concerning -- it indicates moderate memory pressure. Remote spillage is SEVERE and requires immediate action.

---

#### Scenario 10: Unexpected Full Table Scan on a Clustered Table

> A table is clustered on `order_date`, but the query `SELECT * FROM orders WHERE YEAR(order_date) = 2024` still scans all partitions. Why?

**Concept tested:** Functions on clustered columns prevent pruning.

**Correct answer:** Wrapping the clustered column in a function (`YEAR(order_date)`) prevents the optimizer from using the clustering metadata for pruning. Rewrite the query to use **direct range comparisons**: `WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01'`.

**Why other options are wrong:**
- "The clustering key needs to be rebuilt" -- The clustering is fine; the problem is the query, not the cluster metadata.
- "Add YEAR(order_date) as a secondary clustering key" -- While this could technically work, the simpler and recommended fix is to rewrite the query predicate. Clustering on a computed expression is unusual and adds maintenance cost.
- "The table is too small for clustering to matter" -- The scenario states it is scanning all partitions, indicating the table is large enough for clustering to be relevant.

---

#### Scenario 11: Result Cache Not Being Used

> A data engineer runs the same SELECT query twice in 5 minutes, but the second execution takes just as long as the first. Both queries are identical. What could prevent result cache reuse?

**Concept tested:** Result cache invalidation conditions.

**Correct answer:** The most likely cause is that the **underlying table data changed** between executions (even a single INSERT, UPDATE, DELETE, or background reclustering operation invalidates the result cache for that table). Other possibilities: the query uses non-deterministic functions (RANDOM, UUID_STRING, CURRENT_TIMESTAMP), or the session parameter `USE_CACHED_RESULT` is set to FALSE.

**Why other options are wrong:**
- "The warehouse was suspended between queries" -- Suspending the warehouse clears the WAREHOUSE cache (local SSD), NOT the result cache. The result cache lives in Cloud Services and persists across suspensions.
- "A different role executed the second query" -- For SELECT queries, a different role CAN use the result cache as long as it has access privileges. (Only SHOW commands require the same role.)
- "The query is too large for caching" -- There is no size limit for result caching.

---

#### Scenario 12: Cloud Services Charges Unexpectedly High

> A company notices that cloud services charges exceed the 10% free threshold. The ACCOUNTADMIN sees no unusual query volume. What is the most likely cause?

**Concept tested:** Cloud Services Layer billing and the 10% adjustment.

**Correct answer:** The 10% threshold is based on daily warehouse compute consumption. If warehouse usage is LOW (e.g., the company uses serverless features heavily or suspends warehouses aggressively) but cloud services usage is NORMAL (DDL, metadata queries, SHOW/DESCRIBE), the ratio tips above 10%. Common causes: many small warehouses starting/stopping frequently, heavy use of INFORMATION_SCHEMA queries, excessive SHOW commands, or heavy security/access-control operations.

**Why other options are wrong:**
- "Cloud services credits are never charged" -- They are always metered; only the portion within 10% of warehouse credits is free.
- "Increase warehouse size to reduce cloud services cost" -- This just increases warehouse spend to make the ratio look better, which is wasteful. The right approach is to investigate which cloud services operations are consuming credits.
- "Switch to a higher edition" -- The 10% adjustment applies to all editions equally.

---

### Theme 3: "An administrator wants to..." (Security / Access)

---

#### Scenario 13: Granting Read-Only Access to a New Analyst

> An administrator needs to grant a new analyst read-only access to all tables in the `analytics` schema. The analyst should be able to run queries using the `REPORTING_WH` warehouse. What is the minimum set of grants required?

**Concept tested:** Container privileges (the privilege chain).

**Correct answer:**
```
GRANT USAGE ON WAREHOUSE REPORTING_WH TO ROLE analyst_role;
GRANT USAGE ON DATABASE analytics_db TO ROLE analyst_role;
GRANT USAGE ON SCHEMA analytics_db.analytics TO ROLE analyst_role;
GRANT SELECT ON ALL TABLES IN SCHEMA analytics_db.analytics TO ROLE analyst_role;
GRANT SELECT ON FUTURE TABLES IN SCHEMA analytics_db.analytics TO ROLE analyst_role;
GRANT ROLE analyst_role TO USER new_analyst;
```

**Why other options are wrong:**
- "Just GRANT SELECT on the tables" -- Without USAGE on the warehouse, database, and schema, the user cannot reach the tables at all. All four levels are required.
- "Grant USAGE on the database only" -- Skipping the schema USAGE and table SELECT means the analyst can see the database exists but cannot access any objects inside it.
- "Grant the SYSADMIN role" -- Violates least privilege. SYSADMIN can create/modify databases and warehouses.

**Trap:** `ON ALL TABLES` grants to existing tables only. `ON FUTURE TABLES` is needed for tables created later.

---

#### Scenario 14: Preventing a Service Account from Using Password Auth

> An administrator creates a service account for an ETL pipeline. The account should authenticate ONLY via key-pair. How should this be configured?

**Concept tested:** User types and key-pair authentication.

**Correct answer:** Create the user with `TYPE = SERVICE`. Service users cannot use password authentication -- they can only authenticate via key-pair or OAuth. Assign the RSA public key with `RSA_PUBLIC_KEY`.

```sql
CREATE USER etl_service
  TYPE = SERVICE
  RSA_PUBLIC_KEY = 'MIIBIjANBg...';
```

**Why other options are wrong:**
- "Create a normal user and set PASSWORD to NULL" -- A NULL-type user (or PERSON type) can still potentially use password auth if set later. The TYPE = SERVICE enforcement is stronger.
- "Create the user with MFA enabled" -- MFA adds a second factor to password auth but does not remove password auth entirely. Service accounts should not use passwords at all.
- "Set a network policy to block the user" -- Network policies control WHERE connections come from, not HOW they authenticate.

---

#### Scenario 15: Restricting Data Visibility by Region

> A multinational company stores customer data in a single table. European managers should only see European customers; US managers should only see US customers. How should the administrator implement this?

**Concept tested:** Row Access Policies.

**Correct answer:** Create a **Row Access Policy** that filters rows based on the user's role or a mapping table. The policy returns a BOOLEAN -- TRUE to allow the row, FALSE to filter it out. Attach the policy to the table.

```sql
CREATE ROW ACCESS POLICY region_filter AS (region VARCHAR) RETURNS BOOLEAN ->
  CASE
    WHEN IS_ROLE_IN_SESSION('EU_MANAGER') AND region = 'EU' THEN TRUE
    WHEN IS_ROLE_IN_SESSION('US_MANAGER') AND region = 'US' THEN TRUE
    WHEN IS_ROLE_IN_SESSION('GLOBAL_ADMIN') THEN TRUE
    ELSE FALSE
  END;

ALTER TABLE customers ADD ROW ACCESS POLICY region_filter ON (region);
```

**Why other options are wrong:**
- "Create separate views with WHERE clauses" -- This works but is harder to maintain, requires granting access to views instead of the table, and is not centrally enforced if someone accesses the table directly.
- "Use dynamic data masking" -- Masking hides column VALUES (e.g., replacing with '***'), not entire rows. It does not filter rows.
- "Create separate tables per region" -- Introduces data duplication and complex ETL to keep them in sync.

**Key fact:** Row Access Policies execute BEFORE masking policies. Enterprise edition or higher is required.

---

#### Scenario 16: Masking PII for Non-Privileged Roles

> An administrator needs to ensure that the `ssn` column shows the full value to the `HR_ADMIN` role but displays `XXX-XX-XXXX` to all other roles. What should they use?

**Concept tested:** Dynamic Data Masking policies.

**Correct answer:** Create a **masking policy** that checks the current role and returns either the real value or a masked string. The policy must return the same data type as the column.

```sql
CREATE MASKING POLICY ssn_mask AS (val STRING) RETURNS STRING ->
  CASE WHEN IS_ROLE_IN_SESSION('HR_ADMIN') THEN val ELSE 'XXX-XX-XXXX' END;

ALTER TABLE employees MODIFY COLUMN ssn SET MASKING POLICY ssn_mask;
```

**Note on CURRENT_ROLE() vs IS_ROLE_IN_SESSION():** This example uses `IS_ROLE_IN_SESSION()` (same as Scenario 15) because it checks ALL active roles -- primary and secondary. Using `CURRENT_ROLE()` only checks the primary active role, which means a user whose secondary role is HR_ADMIN would still see masked data. Prefer `IS_ROLE_IN_SESSION()` in policies for broader, more reliable role checking.

**Why other options are wrong:**
- "Create a secure view with a CASE statement" -- This works for a specific view but does not protect the base table. Anyone with direct table access bypasses the view logic.
- "Use a Row Access Policy" -- Row Access Policies filter rows, not column values. The requirement is to mask the value, not hide the row.
- "Encrypt the column" -- Encryption at the column level is not natively supported as a user-facing feature in Snowflake. All data is already encrypted at rest. The need here is role-based value transformation, not encryption.

**Trap:** Only ONE masking policy can be attached to a column at a time. To simplify management across many columns, use tag-based masking (attach the policy to a tag, then tag the columns).

---

#### Scenario 17: Determining Who Made Schema Changes

> An administrator needs to audit who dropped a table last week, what queries accessed sensitive columns, and whether any privilege grants were made. Where should they look?

**Concept tested:** ACCOUNT_USAGE views vs INFORMATION_SCHEMA.

**Correct answer:** Use the **SNOWFLAKE.ACCOUNT_USAGE** schema:
- `QUERY_HISTORY` -- to find DROP TABLE statements
- `ACCESS_HISTORY` -- to see which columns were read/written (Enterprise+ only)
- `GRANTS_TO_ROLES` / `GRANTS_TO_USERS` -- to audit privilege changes

ACCOUNT_USAGE retains data for 365 days, includes dropped objects, and covers the entire account.

**Why other options are wrong:**
- "Use INFORMATION_SCHEMA" -- INFORMATION_SCHEMA does NOT include dropped objects (the table is already gone), has shorter retention (7 days to 6 months), and is limited to one database at a time.
- "Check the query history in Snowsight" -- Snowsight shows query history but has limited filtering and retention. ACCOUNT_USAGE provides more comprehensive, queryable data.
- "Use Time Travel to find the dropped table" -- Time Travel can restore the table (UNDROP), but it does not tell you WHO dropped it or provide audit details.

---

#### Scenario 18: Network Restriction to Corporate IPs Only

> An administrator wants to ensure that users can only connect to Snowflake from the corporate office public IP range (203.0.113.0/24) and block all other access. What should they configure?

**Concept tested:** Network policies.

**Correct answer:** Create a **network policy** with an allowed list containing the corporate public IP range, then apply it at the account level.

```sql
CREATE NETWORK POLICY corp_only
  ALLOWED_IP_LIST = ('203.0.113.0/24');

ALTER ACCOUNT SET NETWORK_POLICY = corp_only;
```

**Note:** Network policies filter on the **public IP address** of the connecting client. Private/RFC 1918 ranges (10.x, 172.16-31.x, 192.168.x) are not routable over the public internet and would only apply if using private connectivity (e.g., AWS PrivateLink, which requires Business Critical edition).

**Why other options are wrong:**
- "Set up a firewall in the cloud provider" -- Cloud-level firewalls protect infrastructure but do not enforce access at the Snowflake account level. Users could connect from other network paths.
- "Use MFA to restrict access" -- MFA adds authentication security but does not restrict by network location.
- "Disable all users and re-enable them with IP restrictions" -- Network policies are the correct mechanism; per-user IP restrictions are done via network policies applied at the user level, not by disabling/enabling users.

**Trap:** If a network policy is set at both the account level AND the user level, the **user-level policy takes priority** for that specific user. Also, ACCOUNTADMIN should ensure they do not lock themselves out -- Snowflake has a bypass mechanism via support if this happens.

---

### Theme 4: "Data needs to be loaded from..." (Loading Scenarios)

---

#### Scenario 19: Continuous Loading from S3 with Minute-Level Latency

> New JSON files are continuously dropped into an S3 bucket every few minutes. The data needs to be available in Snowflake within minutes of arrival. The team wants a fully managed, serverless solution. What should they use?

**Concept tested:** Snowpipe with auto-ingest.

**Correct answer:** **Snowpipe** with `AUTO_INGEST = TRUE`. Configure an S3 event notification (SQS) to trigger Snowpipe when new files arrive. Snowpipe uses serverless compute, loads files within minutes, and requires no user-managed warehouse.

**Why other options are wrong:**
- "Scheduled COPY INTO via a task" -- Tasks can be scheduled at minimum 1-minute intervals, but require a running warehouse. Snowpipe is serverless and event-driven, making it more efficient for continuous small-file loading.
- "Snowpipe Streaming" -- Snowpipe Streaming inserts rows via API (not files). The scenario specifies files being dropped into S3, which is file-based ingestion.
- "Use an external table" -- External tables provide read-only access to data in place; they do not load data into Snowflake tables.

**Trap:** AUTO_INGEST only works with external stages (S3, Azure Blob, GCS). It cannot be used with internal stages.

---

#### Scenario 20: One-Time Historical Data Migration

> A company needs to perform a one-time migration of 500 GB of CSV data from an on-premises server into Snowflake. The data is in 50 files of varying sizes. What is the recommended approach?

**Concept tested:** Bulk loading with PUT + COPY INTO.

**Correct answer:** Use **SnowSQL** to PUT the files to an internal stage, then use **COPY INTO** to load them into the target table. For optimal performance, pre-split files to 100-250 MB compressed and load in parallel.

```sql
-- From SnowSQL
PUT file:///data/*.csv @my_stage AUTO_COMPRESS=TRUE PARALLEL=4;

-- Then load
COPY INTO target_table FROM @my_stage
  FILE_FORMAT = (TYPE = CSV SKIP_HEADER = 1)
  ON_ERROR = CONTINUE;
```

**Why other options are wrong:**
- "Use Snowpipe" -- Snowpipe is designed for continuous micro-batch loading, not one-time bulk migration. It would work but is less efficient for a single large batch.
- "INSERT INTO ... VALUES" -- Row-by-row insertion is extremely slow for 500 GB.
- "Load via Snowsight UI" -- Snowsight file upload has a 50 MB limit per file. Not suitable for 500 GB.

**Trap:** PUT and GET commands are only available in SnowSQL (and some connectors). They are NOT available in Snowsight.

---

#### Scenario 21: Loading Files with Bad Records

> A data engineer is loading 100 CSV files. Some files contain malformed rows (wrong number of columns, bad date formats). The engineer wants to load all valid data and skip only the bad rows -- not entire files. What ON_ERROR option should they use?

**Concept tested:** COPY INTO ON_ERROR options.

**Correct answer:** `ON_ERROR = CONTINUE`. This skips individual bad rows and continues loading the rest of the file and subsequent files.

**Why other options are wrong:**
- `ABORT_STATEMENT` (default) -- Stops the entire COPY operation on the first error. No data is loaded from ANY file.
- `SKIP_FILE` -- Skips the ENTIRE file that contains the error. Valid rows in that file are lost.
- `SKIP_FILE_<n>` / `SKIP_FILE_<n>%` -- Also skips the entire file if the error count/percentage exceeds the threshold.

**Follow-up trap:** After loading, use `VALIDATE()` or check `COPY_HISTORY` to identify which rows were skipped and why.

---

#### Scenario 22: Preventing Duplicate Loads After Pipeline Restart

> An ETL pipeline crashed and restarted. The engineer is worried that files already loaded will be loaded again, creating duplicates. What prevents this?

**Concept tested:** Load metadata tracking and the 64-day window.

**Correct answer:** Snowflake automatically tracks loaded files for **64 days** using load metadata. If a file with the same name and content is presented again within 64 days, COPY INTO will skip it by default. No additional configuration is needed.

**Why other options are wrong:**
- "Use FORCE = TRUE to control duplicates" -- FORCE = TRUE does the OPPOSITE: it forces re-loading regardless of metadata tracking and CAN create duplicates.
- "Set PURGE = TRUE to delete loaded files" -- PURGE removes files from the stage after successful loading, which prevents re-processing but also removes the source files permanently.
- "Snowflake uses a primary key to deduplicate" -- Snowflake does NOT enforce primary key constraints on standard tables. Load metadata tracking, not constraint enforcement, prevents duplicates.

**Trap:** After 64 days, the metadata expires. To reload or handle files beyond 64 days, use `FORCE = TRUE` or `LOAD_UNCERTAIN_FILES = TRUE`. Snowpipe has a shorter metadata window of 14 days.

---

#### Scenario 23: Sub-Second Latency Data Ingestion

> A company needs to ingest streaming data from IoT sensors with sub-second latency into Snowflake. The data arrives as individual rows from a Kafka pipeline. What should they use?

**Concept tested:** Snowpipe Streaming vs regular Snowpipe.

**Correct answer:** **Snowpipe Streaming** (via the Snowflake Ingest SDK or Kafka Connector with Snowpipe Streaming mode). It inserts rows directly into tables via API without staging files, achieving sub-second latency.

**Why other options are wrong:**
- "Regular Snowpipe" -- Snowpipe is file-based and has minute-level latency, not sub-second. It waits for files to arrive in a stage.
- "COPY INTO with a 1-second task schedule" -- Tasks have a minimum schedule of 1 minute. This cannot achieve sub-second latency.
- "INSERT INTO via a stored procedure" -- While this inserts rows, it requires a running warehouse and does not scale for high-throughput IoT scenarios. Snowpipe Streaming is serverless and optimized for this.

---

#### Scenario 24: File Format Mismatch During Load

> A data engineer creates a named stage with a CSV file format (FIELD_DELIMITER = '|'). The COPY INTO statement specifies a different file format with FIELD_DELIMITER = ','. Which delimiter is used?

**Concept tested:** File format precedence (no merging).

**Correct answer:** The **COPY INTO statement's file format overrides** the stage's file format completely. The comma delimiter (',') is used. File format options do NOT merge -- the higher-level specification completely replaces the lower level.

**Precedence:** COPY INTO statement > Stage definition > System defaults

**Why other options are wrong:**
- "The stage delimiter is used because it was defined first" -- Creation order does not matter; COPY INTO always takes precedence.
- "Snowflake merges both and uses the pipe delimiter" -- There is NO merging of file format options. The COPY INTO specification entirely overrides the stage.
- "An error is thrown due to conflicting definitions" -- No error. The COPY INTO specification simply wins.

---

### Theme 5: "A query returns unexpected results because..." (SQL / Transformation Gotchas)

---

#### Scenario 25: NOT IN Returns Zero Rows

> A data engineer runs `SELECT * FROM orders WHERE customer_id NOT IN (SELECT customer_id FROM blacklist)`. The blacklist table has 10 rows, one of which has a NULL customer_id. The query returns zero rows even though there are valid orders. Why?

**Concept tested:** NOT IN with NULL values.

**Correct answer:** When the subquery contains ANY NULL value, `NOT IN` returns no rows. This is because `x NOT IN (1, 2, NULL)` evaluates as `x != 1 AND x != 2 AND x != NULL`. The comparison `x != NULL` is UNKNOWN (not TRUE or FALSE), which causes the entire AND chain to return UNKNOWN, filtering out all rows.

**Fix:** Use `NOT EXISTS` instead, or filter NULLs from the subquery: `NOT IN (SELECT customer_id FROM blacklist WHERE customer_id IS NOT NULL)`.

**Why other options are wrong:**
- "The blacklist table is empty" -- The scenario states it has 10 rows.
- "NOT IN does not work with subqueries" -- NOT IN works fine with subqueries; the issue is specifically with NULL values.
- "The customer_id column types do not match" -- Type mismatches would cause an error, not zero rows.

---

#### Scenario 26: String Concatenation Returns NULL Unexpectedly

> A query concatenates first_name and last_name: `SELECT first_name || ' ' || last_name FROM employees`. Some rows return NULL even though the first_name is populated. Why?

**Concept tested:** NULL propagation with the `||` operator.

**Correct answer:** The `||` operator propagates NULLs. If ANY operand is NULL (in this case, `last_name` is NULL for some rows), the entire result is NULL. Use `CONCAT()`, `CONCAT_WS()`, or `COALESCE`/`NVL` to handle NULLs.

**Fix options:**
```sql
-- Option 1: CONCAT() treats NULLs as empty strings
SELECT CONCAT(first_name, ' ', last_name) FROM employees;

-- Option 2: CONCAT_WS skips NULLs entirely (no trailing space)
SELECT CONCAT_WS(' ', first_name, last_name) FROM employees;

-- Option 3: COALESCE replaces NULLs explicitly
SELECT first_name || ' ' || COALESCE(last_name, '') FROM employees;
```

**Critical distinction -- this IS tested on the exam:**
- `||` operator: **propagates NULLs** (any NULL operand makes the entire result NULL)
- `CONCAT()` function: **treats NULLs as empty strings** (never returns NULL due to a NULL argument)
- `CONCAT_WS()`: **skips NULLs entirely** and only places the separator between non-NULL values

**Why other options are wrong:**
- "CONCAT cannot take more than two arguments" -- Snowflake's CONCAT accepts any number of arguments.
- "The space character causes the NULL" -- A string literal is never NULL; the NULL comes from the last_name column.
- "Use CONCAT instead of ||" -- This actually IS a valid fix. Unlike `||`, `CONCAT()` in Snowflake treats NULL as an empty string. This behavioral difference is a key exam trap.

---

#### Scenario 27: AVG Gives Different Result Than Expected

> A table has 5 rows for a product with prices: 10, 20, NULL, 30, NULL. The engineer expects `AVG(price)` to return 12 (sum 60 / 5 rows) but gets 20 instead. Why?

**Concept tested:** AVG ignores NULLs in both the numerator AND denominator.

**Correct answer:** `AVG()` ignores NULL values entirely. It computes 60 / 3 (only non-NULL rows) = 20, not 60 / 5. If you want NULLs treated as zeros, use `AVG(COALESCE(price, 0))` which gives 60 / 5 = 12.

**Why other options are wrong:**
- "AVG rounds to the nearest integer" -- AVG does not round by default; the issue is about which rows are counted.
- "NULL values are treated as zero" -- This is the most common misconception. NULLs are EXCLUDED, not treated as zero.
- "The table has duplicate rows" -- The scenario specifies the exact values.

---

#### Scenario 28: LAST_VALUE Returns Same Value for All Rows

> A query uses `LAST_VALUE(salary) OVER (PARTITION BY dept ORDER BY hire_date)` to find the most recent salary per department, but every row shows the current row's salary instead of the last value. Why?

**Concept tested:** Default window frame for window functions.

**Correct answer:** The default window frame is `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`. This means `LAST_VALUE` only considers rows up to the current row, so it always returns the current row's value. To get the actual last value in the partition, specify the full frame:

```sql
LAST_VALUE(salary) OVER (
  PARTITION BY dept ORDER BY hire_date
  ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
)
```

**Why other options are wrong:**
- "LAST_VALUE does not work with ORDER BY" -- It does; the issue is the implicit window frame.
- "Use MAX instead" -- MAX gives the highest salary, not the most recent one by hire_date.
- "The data is not sorted correctly" -- ORDER BY in the OVER clause correctly defines the sort; the frame is the problem.

---

#### Scenario 29: JSON Key Access Returns NULL

> A VARIANT column `payload` contains `{"UserName": "Alice"}`. The query `SELECT payload:username FROM events` returns NULL. Why?

**Concept tested:** Semi-structured data key case sensitivity.

**Correct answer:** JSON keys are **case-sensitive** in Snowflake. The key is `UserName` (capital U, capital N), but the query references `username` (all lowercase). The correct query is `SELECT payload:UserName` or `SELECT payload:"UserName"`.

**Why other options are wrong:**
- "VARIANT columns do not support dot notation" -- The colon notation used here is correct for first-level access.
- "The data was not properly parsed on insert" -- If the data appears correctly when selecting `payload` directly, parsing is fine.
- "Use GET_PATH instead" -- GET_PATH would have the same case-sensitivity issue.

**Trap:** Column names in Snowflake are case-INsensitive (unless quoted), but JSON keys within VARIANT data are case-SENSITIVE. This asymmetry is heavily tested.

---

#### Scenario 30: DDL Inside Transaction Breaks Rollback

> A data engineer runs a transaction that creates a staging table, inserts data, and then rolls back due to an error. After rollback, the staging table still exists. Why?

**Concept tested:** DDL auto-commits inside transactions.

**Correct answer:** **DDL statements auto-commit immediately** in Snowflake, even inside an explicit transaction. The `CREATE TABLE` committed instantly and cannot be rolled back. Only DML statements (INSERT, UPDATE, DELETE, MERGE) are transaction-controlled.

```sql
BEGIN;
  CREATE TABLE staging (id INT);   -- AUTO-COMMITS immediately
  INSERT INTO staging VALUES (1);  -- Part of transaction
ROLLBACK;
-- staging table STILL EXISTS (DDL committed)
-- but the INSERT IS rolled back (DML)
```

**Why other options are wrong:**
- "The ROLLBACK syntax was incorrect" -- The syntax is fine; DDL simply does not participate in transactions.
- "Use SAVEPOINT before the CREATE TABLE" -- Savepoints only work for DML operations within a transaction. DDL still auto-commits.
- "Snowflake does not support transactions" -- Snowflake does support transactions, but only for DML. The isolation level is READ COMMITTED.

---

#### Scenario 30B: Stream Becomes Stale and Returns an Error

> A data engineer created a standard stream on a table to track changes for a downstream pipeline. The pipeline was paused for 3 weeks due to a project delay. When the pipeline resumes and queries the stream, it returns an error. What happened?

**Concept tested:** Stream staleness and the Time Travel retention dependency.

**Correct answer:** The stream became **stale**. A stream's offset relies on the underlying table's Time Travel data to reconstruct changes. If the stream is not consumed within the table's Time Travel retention period (plus the additional staleness grace period), the historical change data is purged and the stream can no longer provide a consistent change set. The stream must be recreated.

```sql
-- This will fail on a stale stream:
SELECT * FROM my_stream;  -- Error: stream is stale

-- Fix: recreate the stream
CREATE OR REPLACE STREAM my_stream ON TABLE my_table;
-- WARNING: all unconsumed changes are lost
```

**Why other options are wrong:**
- "Resume the stream with ALTER STREAM" -- There is no ALTER STREAM ... RESUME command. A stale stream cannot be un-staled; it must be recreated.
- "Increase the Time Travel retention period" -- Increasing the retention period going forward does not recover an already-stale stream. This is a preventive measure, not a fix.
- "The stream auto-recovers when queried" -- Stale streams do not self-heal. The offset is permanently invalid.

**Key facts for the exam:**
- Stream staleness depends on the table's DATA_RETENTION_TIME_IN_DAYS setting.
- To prevent staleness: consume streams regularly, or extend the table's Time Travel retention (up to 90 days on Enterprise+).
- Append-only streams and standard streams both have the same staleness behavior.
- Check staleness with: `SHOW STREAMS` (look for the `stale` column) or `SYSTEM$STREAM_HAS_DATA()`.

---

## SECTION 2: Memory Aids & Quick Decision Trees

---

### 1. "Which Loading Method Should I Use?"

```
START: How does data arrive?
  |
  +-- As FILES in cloud storage (S3/Azure/GCS)?
  |     |
  |     +-- How often?
  |     |     |
  |     |     +-- One-time or scheduled batch --> COPY INTO
  |     |     |     (uses your warehouse, most control)
  |     |     |
  |     |     +-- Continuously (new files every few minutes)
  |     |           |
  |     |           +-- Want serverless? --> SNOWPIPE (AUTO_INGEST)
  |     |           +-- Want warehouse control? --> COPY INTO via TASK
  |     |
  |     +-- From on-premises local files?
  |           --> PUT to internal stage, then COPY INTO
  |           (PUT requires SnowSQL, not available in Snowsight)
  |
  +-- As ROWS via API (streaming/real-time)?
  |     |
  |     +-- Need sub-second latency? --> SNOWPIPE STREAMING
  |     +-- Via Kafka? --> KAFKA CONNECTOR
  |           (supports both Snowpipe and Snowpipe Streaming modes)
  |
  +-- From ANOTHER Snowflake table?
        --> INSERT INTO ... SELECT
        --> CREATE TABLE ... AS SELECT (CTAS)
        --> CREATE TABLE ... CLONE (zero-copy)
```

**Quick lookup by latency:**

| Target Latency | Method |
|----------------|--------|
| Sub-second | Snowpipe Streaming |
| Minutes | Snowpipe (auto-ingest) |
| Minutes-Hours | COPY INTO (batch) |
| Scheduled | COPY INTO via Task |

#### Stage Types Quick Reference

**Mnemonic: "U-T-N-E"** -- User, Table, Named (internal), External

| Stage Syntax | Type | Created By | Scope | PUT/GET | Auto-Ingest |
|-------------|------|-----------|-------|---------|-------------|
| `@~` | User stage | Auto (every user has one) | Per-user | Yes | No |
| `@%table_name` | Table stage | Auto (every table has one) | Per-table | Yes | No |
| `@stage_name` (internal) | Named internal | CREATE STAGE | Flexible (any user/table) | Yes | No |
| `@stage_name` (external) | Named external | CREATE STAGE with URL | Points to S3/Azure/GCS | No (files already external) | Yes |

**Decision guide:**
- Quick ad-hoc upload for one user? --> `@~` (user stage)
- Loading into one specific table? --> `@%table_name` (table stage)
- Shared staging area for multiple tables/users? --> Named internal stage
- Data lives in cloud storage (S3/Azure/GCS)? --> Named external stage
- Need AUTO_INGEST with Snowpipe? --> Named external stage (ONLY option)

**Trap:** User stages (`@~`) and table stages (`@%table`) cannot be altered or dropped. Only named stages support ALTER STAGE and DROP STAGE.

#### Load vs Unload Format Support

**Mnemonic: "Load ALL six, Unload CJP"**

| Format | Load (COPY INTO table) | Unload (COPY INTO location) |
|--------|----------------------|---------------------------|
| CSV | Yes | Yes |
| JSON | Yes | Yes |
| Parquet | Yes | Yes |
| Avro | Yes | No |
| ORC | Yes | No |
| XML | Yes | No |

**Load supports 6 formats** (CSV, JSON, Parquet, Avro, ORC, XML).
**Unload supports 3 formats** (CSV, JSON, Parquet) -- remember "**CJP**" (the three you Can export).

**Trap:** You cannot unload data to Avro, ORC, or XML. If the exam asks about exporting to Avro format, the answer is that it is not supported for unloading.

---

### 2. "Which Table Type Should I Use?"

```
START: What is this table for?
  |
  +-- Production data (long-term, needs DR)?
  |     --> PERMANENT TABLE
  |     (Time Travel: up to 90 days on Enterprise+)
  |     (Fail-safe: 7 days, always)
  |
  +-- ETL staging / intermediate data?
  |     |
  |     +-- Needs to persist across sessions? --> TRANSIENT TABLE
  |     |     (Time Travel: up to 1 day, NO Fail-safe)
  |     |     (Lower storage cost than permanent)
  |     |
  |     +-- Only needed during current session? --> TEMPORARY TABLE
  |           (Time Travel: up to 1 day, NO Fail-safe)
  |           (Session-scoped: auto-dropped on session end)
  |           (Not visible to other sessions/users)
  |
  +-- Query acceleration for repeated aggregations?
  |     --> MATERIALIZED VIEW (not a table, but worth mentioning)
  |     (Enterprise+ only, single table, no joins)
  |
  +-- Data stays in external storage (S3/Azure/GCS)?
  |     --> EXTERNAL TABLE (read-only, no DML)
  |
  +-- Low-latency OLTP (point lookups, small updates)?
        --> HYBRID TABLE
        (PRIMARY KEY required and enforced)
        (Row-level locking, constraints enforced)
```

**Quick comparison grid:**

| Property | Permanent | Transient | Temporary | External | Hybrid |
|----------|-----------|-----------|-----------|----------|--------|
| Time Travel | 0-90 days | 0-1 day | 0-1 day | N/A | Yes |
| Fail-safe | 7 days | None | None | N/A | Yes |
| Persists across sessions | Yes | Yes | No | Yes | Yes |
| DML allowed | Yes | Yes | Yes | No | Yes |
| Storage cost | Highest | Medium | Medium | Zero | Varies |
| Constraints enforced | No* | No* | No* | N/A | Yes |

*Except NOT NULL, which is always enforced on all table types.

---

### 3. "Which Role Should Perform This Action?"

**Mnemonic: "ASUM-P"** -- ACCOUNTADMIN, SECURITYADMIN, USERADMIN, SYSADMIN, PUBLIC

```
ACCOUNTADMIN (the "master key" - use sparingly)
  |-- View billing and credit usage
  |-- Create resource monitors
  |-- Set account-level parameters
  |-- Enable features (e.g., replication, failover)
  |-- Anything that combines security + sysadmin duties
  |
SECURITYADMIN (the "bouncer")
  |-- MANAGE GRANTS privilege (grant/revoke anything to any role)
  |-- Create and manage network policies
  |-- Monitor access/audit
  |
USERADMIN (the "HR department")
  |-- CREATE USER, CREATE ROLE
  |-- Manage user properties (passwords, keys, types)
  |
SYSADMIN (the "builder")
  |-- CREATE WAREHOUSE, CREATE DATABASE
  |-- Manage all database objects (tables, schemas, etc.)
  |-- Best practice: all custom roles should roll up to SYSADMIN
  |
PUBLIC (the "lobby")
  |-- Automatically granted to every user
  |-- Used as default if user's DEFAULT_ROLE is not granted to them
  |
ORGADMIN (SEPARATE - not in the hierarchy)
  |-- Manages organization-level operations
  |-- View all accounts in the organization
  |-- Enable replication across accounts
```

**Rapid-fire lookup:**

| "I need to..." | Use this role |
|-----------------|---------------|
| See the bill | ACCOUNTADMIN |
| Create a resource monitor | ACCOUNTADMIN |
| Grant SELECT on a table | SECURITYADMIN (or object owner) |
| Create a new user | USERADMIN |
| Create a new custom role | USERADMIN |
| Create a warehouse | SYSADMIN |
| Create a database | SYSADMIN |
| Set a network policy | SECURITYADMIN |
| Enable replication | ACCOUNTADMIN |
| View organization accounts | ORGADMIN |

---

### 4. "Will This Query Use the Result Cache?"

**Checklist -- ALL must be TRUE for result cache reuse:**

```
[  ] 1. SQL text is EXACTLY the same
         (case-sensitive, whitespace matters, aliases matter)

[  ] 2. No data changes to underlying tables since last execution
         (no INSERT, UPDATE, DELETE, MERGE, reclustering, or consolidation)

[  ] 3. No non-deterministic functions in query
         (RANDOM, UUID_STRING, RANDSTR = disqualified)
         (CURRENT_TIMESTAMP, CURRENT_DATE = still eligible)

[  ] 4. No external functions used

[  ] 5. USE_CACHED_RESULT parameter is TRUE (default)

[  ] 6. Cache has not expired
         (24-hour base, extends to max 31 days if reused)

[  ] 7. For SELECT: executing role has required privileges
         (does NOT need to be the same role)

[  ] 8. For SHOW commands: must use EXACT same role

[  ] 9. Not querying a hybrid table

[  ] 10. Micro-partitions have not changed
          (includes background maintenance like reclustering)
```

**Mnemonic: "SEND-CUP-HR"**
- **S**ame SQL text
- **E**xact data unchanged
- **N**o non-deterministic functions
- **D**eterministic: no external functions
- **C**ache not expired (24h/31d)
- **U**SE_CACHED_RESULT = TRUE
- **P**rivileges sufficient
- **H**ybrid tables excluded
- **R**eclustering invalidates

**Things that DO NOT invalidate the result cache:**
- Suspending/resuming the warehouse (result cache is in Cloud Services, not the warehouse)
- A different user or role running the same SELECT query (privileges checked, but role does not need to match)
- Resizing the warehouse

---

### 5. "What Edition Do I Need?"

**Mnemonic: "Standard is Simple, Enterprise Enhances, Business Critical is Bulletproof"**

```
STANDARD ("S" features - Simple)
  Everything basic:
  + Clustering keys (define in all editions; Automatic Clustering service requires Enterprise+)
  + Time Travel (1 day max)
  + Dynamic tables
  + Object tagging
  + Database replication
  + External functions
  + Streams & tasks
  + Snowpark, Cortex AI functions

ENTERPRISE ("E" features - Enhanced)
  Everything in Standard PLUS:
  + Multi-cluster warehouses
  + Time Travel up to 90 days
  + Materialized views
  + Search Optimization Service
  + Query Acceleration Service
  + Dynamic Data Masking
  + Row Access Policies
  + Access History (column-level lineage)
  + Periodic rekeying (annual re-encryption)

BUSINESS CRITICAL ("BC" features - Bulletproof/Compliant)
  Everything in Enterprise PLUS:
  + Tri-Secret Secure (customer-managed keys)
  + AWS PrivateLink / Azure Private Link / GCP Private Service Connect
  + Failover/Failback (failover groups)
  + HIPAA, PCI DSS, SOC 1/2 Type II, HITRUST
  + Enhanced security for PHI/PII workloads
```

**"When in doubt" table -- most commonly confused:**

| Feature | Edition |
|---------|---------|
| Clustering keys (define) | All editions (Automatic Clustering: Enterprise+) |
| Multi-cluster warehouses | Enterprise |
| Materialized views | Enterprise |
| Masking policies | Enterprise |
| Row Access Policies | Enterprise |
| Search Optimization | Enterprise |
| Query Acceleration | Enterprise |
| Time Travel > 1 day | Enterprise |
| Private connectivity | Business Critical |
| Tri-Secret Secure | Business Critical |
| Failover groups | Business Critical |

**Common trap:** You can DEFINE clustering keys in ALL editions (even Standard), but the **Automatic Clustering** service -- which performs serverless background reclustering -- requires **Enterprise+**. Do NOT confuse clustering keys with multi-cluster warehouses, which also require Enterprise.

---

### 6. "Dynamic Table vs Materialized View vs Stream+Task?"

```
START: What is the transformation scenario?
  |
  +-- Does it involve JOINS across tables?
  |     |
  |     +-- YES --> Dynamic Table or Stream+Task
  |     |           (Materialized Views CANNOT do joins)
  |     |
  |     +-- NO (single table aggregation)
  |           |
  |           +-- Do you want automatic query rewrite?
  |                 (optimizer substitutes MV for base table queries)
  |                 |
  |                 +-- YES --> Materialized View
  |                 +-- NO --> Dynamic Table
  |
  +-- Do you need DML in the transformation (INSERT/MERGE/CALL)?
  |     |
  |     +-- YES --> Stream + Task (imperative/procedural)
  |     +-- NO --> Dynamic Table (declarative SQL only)
  |
  +-- Do you need complex procedural logic (IF/ELSE, loops)?
  |     |
  |     +-- YES --> Stream + Task (with stored procedure)
  |     +-- NO --> Dynamic Table (simpler)
  |
  +-- Do you want pipeline dependency management handled automatically?
        |
        +-- YES --> Dynamic Table (chain DTs, use DOWNSTREAM lag)
        +-- NO --> Stream + Task (manual DAG setup)
```

**Side-by-side summary:**

| Dimension | Dynamic Table | Materialized View | Stream + Task |
|-----------|--------------|-------------------|---------------|
| **Philosophy** | Declarative | Automatic | Imperative |
| **Joins** | Yes | No | Yes |
| **Query rewrite** | No | Yes | No |
| **DML in definition** | No | No | Yes |
| **Edition** | Standard+ | Enterprise+ | Standard+ |
| **Complex logic** | No (SQL only) | No | Yes (procedures) |
| **Best for** | Multi-step ETL | Repeated aggregations | Complex procedural logic |
| **Staleness risk** | No (managed lag) | No (auto-maintained) | Yes (stream can go stale) |

---

### 7. "How to Troubleshoot Slow Queries?" (Step-by-Step)

```
STEP 1: Check the Query Profile
  |
  +-- Look at the "Most Expensive Nodes" section
  |
  +-- Is there HIGH partition scan ratio?
  |     (Partitions Scanned / Partitions Total > 50%)
  |     |
  |     +-- YES --> Pruning problem
  |     |     +-- Is there a clustering key? --> Add one on filter columns
  |     |     +-- Is the WHERE clause wrapping columns in functions?
  |     |     |   --> Rewrite: YEAR(col) = 2024 --> col >= '2024-01-01'
  |     |     +-- Using LIKE with leading wildcard?
  |     |         --> '%pattern' cannot be pruned; use Search Optimization
  |     |
  |     +-- NO --> Go to Step 2
  |
STEP 2: Check for spillage
  |
  +-- Bytes spilled to LOCAL disk?
  |     --> Monitor; consider larger warehouse if performance matters
  |
  +-- Bytes spilled to REMOTE storage?
  |     --> CRITICAL: increase warehouse size immediately
  |     (10-100x slower than local SSD)
  |
  +-- No spillage? --> Go to Step 3
  |
STEP 3: Check for queuing
  |
  +-- Is the query waiting in queue?
  |     --> Concurrency issue
  |     +-- Enable multi-cluster warehouse (Enterprise+)
  |     +-- Or separate workloads to different warehouses
  |
  +-- No queuing? --> Go to Step 4
  |
STEP 4: Check for data skew / exploding joins
  |
  +-- Is one node processing vastly more data than others?
  |     --> Data skew or Cartesian product
  |     +-- Review JOIN conditions for missing predicates
  |     +-- Check for NULL join keys (NULLs match each other)
  |     +-- Use DISTINCT or GROUP BY to reduce cardinality before join
  |
  +-- No skew? --> Go to Step 5
  |
STEP 5: Consider acceleration features
  |
  +-- Is this an ad-hoc query with large scans?
  |     --> Enable Query Acceleration Service (Enterprise+)
  |
  +-- Is this a repeated aggregation on a single table?
  |     --> Create a Materialized View (Enterprise+)
  |
  +-- Is this a point lookup or substring search?
        --> Enable Search Optimization Service (Enterprise+)
```

---

### 8. Number Mnemonics for Key Values

#### The "Time Travel Timeline"

```
         DATA LIFECYCLE
         =============

    Time Travel         Fail-safe
  |<--- up to 90d --->|<--- 7d --->|  Data gone forever
  |                    |            |
  [Data written] ---> [TT expires] ---> [FS expires] ---> [Purged]

  Standard:  max 1 day TT  + 7 days FS = 8 days total protection
  Enterprise: max 90 days TT + 7 days FS = 97 days total protection
  Transient:  max 1 day TT  + 0 days FS = 1 day total protection
  Temporary:  max 1 day TT  + 0 days FS = 1 day total protection
```

#### Mnemonic: "50-500, 64, 14, 24/31, 7, 10%, 60"

Create a story to remember these numbers:

> "**50-500** micro-partitions are tracked for **64** days by COPY, but Snowpipe only tracks for **14** days. The result cache lasts **24** hours (up to **31** days). Fail-safe is always **7** days. Cloud Services is free up to **10%** of warehouse credits. And warehouses bill a minimum of **60** seconds."

| Number | What It Represents | Mnemonic Hook |
|--------|-------------------|---------------|
| **50-500 MB** | Micro-partition size (uncompressed) | "A partition is like a thick book (50 pages) to a small bookshelf (500 pages)" |
| **64 days** | COPY INTO metadata tracking window | "64 = Nintendo 64 -- old school, long memory" |
| **14 days** | Snowpipe metadata tracking window | "14 = two weeks -- Snowpipe has shorter memory" |
| **24 hours** | Result cache initial duration | "24 = a day -- cache lives for one day" |
| **31 days** | Result cache maximum extension | "31 = longest month -- cache can last up to a month" |
| **7 days** | Fail-safe duration (fixed) | "7 = a week -- Snowflake's safety net lasts one week" |
| **90 days** | Maximum Time Travel (Enterprise+) | "90 = a quarter -- three months of time travel" |
| **1 day** | Maximum Time Travel (Standard) | "1 = Standard gets standard one day" |
| **10%** | Cloud Services free threshold | "10% is the 'tithe' -- your first 10% of cloud services is free" |
| **60 seconds** | Minimum warehouse billing | "60 = one minute -- you always pay at least a minute" |
| **128 MB** | Maximum VARIANT column size | "128 = power of two -- max size for semi-structured data" |
| **1,000** | Max tasks per DAG | "1K tasks in a task graph" |
| **100** | Max parents or children per task | "100 connections per task node" |
| **20** | Max reader accounts per provider | "20 readers max" |
| **365 days** | ACCOUNT_USAGE data retention | "365 = one full year of account history" |
| **45 min - 3 hrs** | ACCOUNT_USAGE data latency | "ACCOUNT_USAGE is NOT real-time -- hours behind" |

#### Credit Doubling Pattern

**Mnemonic: "1-2-4-8-16-32-64-128-256-512"**

Each warehouse size doubles credits AND resources:

```
XS  = 1 credit/hour    (baseline)
S   = 2 credits/hour    (1 x 2)
M   = 4 credits/hour    (2 x 2)
L   = 8 credits/hour    (4 x 2)
XL  = 16 credits/hour   (8 x 2)
2XL = 32 credits/hour   (16 x 2)
3XL = 64 credits/hour   (32 x 2)
4XL = 128 credits/hour  (64 x 2)
5XL = 256 credits/hour  (128 x 2)
6XL = 512 credits/hour  (256 x 2)
```

**Key insight for the exam:** If a query runs 2x faster on a 2x warehouse, the COST IS THE SAME (half the time, double the rate). Scaling up saves time but not money for linearly scaling queries.

#### The Encryption Key Hierarchy

**Mnemonic: "RATF" -- Root, Account, Table, File** (4 levels deep)

```
1. Root Key           (HSM -- hardware security module)
   2. Account Master Key  (one per account)
      3. Table Master Key     (one per table)
         4. File Key              (encrypts micro-partitions)

Rotation: Every 30 days (all editions, automatic)
Rekeying: After 1 year (Enterprise+, re-encrypts existing data with new key)
Tri-Secret: Business Critical only (you + Snowflake = both keys needed)
```

#### Stream Metadata Columns

**Mnemonic: "AIR"** -- Action, IsUpdate, Row_id

| Column | Values | Purpose |
|--------|--------|---------|
| METADATA$**A**CTION | INSERT, DELETE | What happened |
| METADATA$**I**SUPDATE | TRUE, FALSE | Was this part of an UPDATE? |
| METADATA$**R**OW_ID | UUID | Unique row identifier |

**Key:** An UPDATE appears as a DELETE + INSERT pair, both with METADATA$ISUPDATE = TRUE.

#### FLATTEN Output Columns

**Mnemonic: "SKI-PIV-T"** -- Seq, Key, Index, Path, (this), Value

| Column | Type | Purpose |
|--------|------|---------|
| SEQ | NUMBER | Sequence counter for row ordering |
| KEY | VARCHAR | Key name for objects |
| INDEX | NUMBER | Array element index (zero-based) |
| PATH | VARCHAR | Full path to the element |
| VALUE | VARIANT | The flattened element value |
| THIS | VARIANT | The entire input element being flattened |

#### Clone Behavior Quick Reference

**Mnemonic: "Clone SSP-S" -- Streams fresh, Stages skipped, Pipes stopped, Suspended tasks**

| Object | Clone Behavior |
|--------|---------------|
| **S**treams | Offset NOT cloned (start fresh) |
| **S**tages (internal/user) | NOT cloned at all |
| **P**ipes (external) | State = STOPPED_CLONED |
| Tasks | Created in SUSPENDED state |
| Dynamic tables | Created in SUSPENDED state |
| Grants/privileges | NOT copied unless COPY GRANTS specified |
| Clustering keys | Metadata inherited |

#### The Privilege Chain

**Mnemonic: "WDST" -- Warehouse, Database, Schema, Table** (like "We Don't Skip Tiers")

```
To query a table, you need ALL FOUR:

  USAGE on WAREHOUSE    -- "can I compute?"
  USAGE on DATABASE     -- "can I enter the building?"
  USAGE on SCHEMA       -- "can I enter the room?"
  SELECT on TABLE       -- "can I read the book?"

Missing ANY one = access denied
```

#### ON_ERROR Options

**Mnemonic: "ACSS" -- Abort, Continue, Skip-file, Skip-file-N**

| Option | Behavior | Scope |
|--------|----------|-------|
| **A**BORT_STATEMENT | Stop everything (default for COPY) | Entire load |
| **C**ONTINUE | Skip bad rows, load rest | Per row |
| **S**KIP_FILE | Skip entire file with errors (default for Snowpipe) | Per file |
| **S**KIP_FILE_N / _N% | Skip file if errors exceed threshold | Per file |

**Trap:** ABORT_STATEMENT is the default for COPY INTO, but SKIP_FILE is the default for Snowpipe. They are different!

#### RPO for Replication

**Formula:** Maximum data loss = **2x the replication interval**

```
If replication runs every 10 minutes:
  - Best case RPO: 0 (failure right after replication)
  - Worst case RPO: 20 minutes (failure right BEFORE replication,
    plus the interval to complete the next one)
```

#### Auto-Suspend Guidelines

**Mnemonic: "TDA" -- Tasks=0, Dev=5, Analytics=10**

| Workload | Timeout | Reasoning |
|----------|---------|-----------|
| Tasks (batch) | 0 seconds (immediate) | No one waits; save cost |
| Dev/Ad-hoc | ~5 minutes | Balance cache warmth and cost |
| BI/Reporting | 10+ minutes | Keep warehouse cache hot for repeated queries |

---

### Quick-Reference: "Sounds Similar But Very Different"

These pairs are commonly confused on the exam:

| Term A | Term B | Key Difference |
|--------|--------|----------------|
| Clustering key | Multi-cluster warehouse | Clustering key = data organization. Multi-cluster = concurrency scaling. |
| Result cache | Warehouse cache | Result cache = Cloud Services (survives suspend). Warehouse cache = local SSD (lost on suspend). |
| Time Travel | Fail-safe | Time Travel = user self-service. Fail-safe = Snowflake support only. |
| COPY INTO table | COPY INTO location | COPY INTO table = loading. COPY INTO location = unloading. |
| ON_ERROR (COPY) | ON_ERROR (Snowpipe) | COPY default = ABORT_STATEMENT. Snowpipe default = SKIP_FILE. |
| Masking policy | Row Access Policy | Masking = transforms column values. Row access = filters entire rows. |
| Share | Listing | Share = low-level mechanism. Listing = enhanced with metadata/pricing. |
| Marketplace | Data Exchange | Marketplace = public. Data Exchange = private/invite-only. |
| CURRENT_ROLE() | IS_ROLE_IN_SESSION() | CURRENT_ROLE = active primary role only. IS_ROLE_IN_SESSION = checks all active roles (primary + secondary). |
| GRANT ROLE TO USER | GRANT ROLE TO ROLE | To user = direct assignment. To role = hierarchy building. |
| ON ALL TABLES | ON FUTURE TABLES | ALL = existing tables at time of grant. FUTURE = tables created after the grant. |
| Sequence | AUTOINCREMENT | Sequence = schema-level, reusable. AUTOINCREMENT = column-level, single table. |
| Standard stream | Append-only stream | Standard = tracks INSERT/UPDATE/DELETE. Append-only = INSERT only (more performant). |
| VALIDATE() | VALIDATION_MODE | VALIDATE() = post-load error inspection. VALIDATION_MODE = pre-load dry run (no data loaded). |
| CONCAT() | \|\| operator | CONCAT() treats NULL as empty string. \|\| propagates NULL (result is NULL if any operand is NULL). |

---

*Use these scenarios for practice: cover the answer, read the scenario, form your response, then check. The patterns repeat across the real exam with different domain contexts.*
