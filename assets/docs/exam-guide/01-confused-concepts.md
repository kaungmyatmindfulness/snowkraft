# SnowPro Core COF-C02: Frequently Confused Concepts

## Comprehensive Comparison Tables for Exam Preparation

This document covers 20 commonly confused concept groups with detailed comparison tables and key exam tips for each.

---

## Table of Contents

1. [Dynamic Tables vs Materialized Views vs Streams+Tasks](#1-dynamic-tables-vs-materialized-views-vs-streamstasks)
2. [Snowpipe vs Snowpipe Streaming vs COPY INTO](#2-snowpipe-vs-snowpipe-streaming-vs-copy-into)
3. [External Tables vs Regular Tables vs Hybrid Tables](#3-external-tables-vs-regular-tables-vs-hybrid-tables)
4. [Permanent vs Transient vs Temporary Tables](#4-permanent-vs-transient-vs-temporary-tables)
5. [UDF vs UDTF vs Stored Procedure vs External Function](#5-udf-vs-udtf-vs-stored-procedure-vs-external-function)
6. [Standard Stream vs Append-only Stream vs Insert-only Stream](#6-standard-stream-vs-append-only-stream-vs-insert-only-stream)
7. [ACCOUNT_USAGE vs INFORMATION_SCHEMA](#7-account_usage-vs-information_schema)
8. [Database Replication vs Failover Groups](#8-database-replication-vs-failover-groups)
9. [Share vs Listing vs Marketplace vs Data Exchange](#9-share-vs-listing-vs-marketplace-vs-data-exchange)
10. [Masking Policy vs Row Access Policy](#10-masking-policy-vs-row-access-policy)
11. [Clustering Key vs Search Optimization vs Query Acceleration Service](#11-clustering-key-vs-search-optimization-vs-query-acceleration-service)
12. [Key Rotation vs Periodic Rekeying vs Tri-Secret Secure](#12-key-rotation-vs-periodic-rekeying-vs-tri-secret-secure)
13. [PERSON User vs SERVICE User vs LEGACY_SERVICE User](#13-person-user-vs-service-user-vs-legacy_service-user)
14. [GRANT vs FUTURE GRANTS vs MANAGED ACCESS Schemas](#14-grant-vs-future-grants-vs-managed-access-schemas)
15. [Reader Account vs Full Account (Consumer)](#15-reader-account-vs-full-account-consumer)
16. [Regular View vs Secure View vs Materialized View](#16-regular-view-vs-secure-view-vs-materialized-view)
17. [System-Defined Role Hierarchy (ACCOUNTADMIN vs SECURITYADMIN vs SYSADMIN vs USERADMIN)](#17-system-defined-role-hierarchy-accountadmin-vs-securityadmin-vs-sysadmin-vs-useradmin)
18. [Stage Types (User Stage vs Table Stage vs Named Internal Stage vs External Stage)](#18-stage-types-user-stage-vs-table-stage-vs-named-internal-stage-vs-external-stage)
19. [Zero-Copy Cloning vs Time Travel vs Fail-safe](#19-zero-copy-cloning-vs-time-travel-vs-fail-safe)
20. [Warehouse Scaling: Up/Down vs Out/In (Multi-Cluster Warehouses)](#20-warehouse-scaling-updown-vs-outin-multi-cluster-warehouses)

---

## 1. Dynamic Tables vs Materialized Views vs Streams+Tasks

| Aspect | Dynamic Tables | Materialized Views | Streams + Tasks |
|--------|---------------|-------------------|----------------|
| **Approach** | Declarative (define desired result) | Declarative (define query) | Imperative (write transformation logic) |
| **Purpose** | Multi-level data pipelines | Accelerate queries transparently | CDC-driven custom pipelines |
| **Source Complexity** | Supports JOINs, UNIONs, subqueries, multiple tables | Single base table ONLY; no JOINs | Tracks one source table per stream |
| **Data Freshness** | Target lag (minutes to hours, configurable) | Always current (synchronous maintenance) | Depends on task schedule |
| **Query Rewriting** | No -- must reference the dynamic table explicitly | Yes -- optimizer rewrites queries automatically | No -- must query target table explicitly |
| **Compute Model** | User-specified virtual warehouse | Background cloud services (serverless maintenance) | User-specified warehouse OR serverless tasks |
| **DML Support** | No INSERT/UPDATE/DELETE/MERGE on the DT itself | No DML on the MV itself | Full DML via stored procedures or SQL in tasks |
| **Refresh Mode** | Incremental, Full, or AUTO | Always incremental (maintained by Snowflake) | Fully custom (you write the logic) |
| **Scheduling** | Automatic via target lag | Automatic (always current) | Manual CRON/interval or event-driven via SYSTEM$STREAM_HAS_DATA |
| **Pipeline Chaining** | Yes -- DTs can source from other DTs (DAG of DTs) | No -- cannot chain materialized views | Yes -- task graphs (DAGs) with predecessors |
| **Cloning Behavior** | Cloned DTs start SUSPENDED and must be explicitly resumed | Cloned along with source table | Streams/tasks cloned; tasks start suspended |
| **Edition Required** | Standard+ | Enterprise+ | Standard+ |
| **Cost Drivers** | Warehouse credits for refresh + storage | Cloud services credits for maintenance + storage | Warehouse or serverless credits + storage |
| **Best For** | ELT pipelines, multi-table transformations | Speeding up aggregations on a single large table | Complex procedural logic, fine-grained scheduling |

> **Key Exam Tip**: The exam loves to test the distinction between materialized views (single table, automatic query rewrite, always current) and dynamic tables (multi-table JOINs, no query rewrite, target lag). If a question mentions "the optimizer automatically rewrites queries," the answer is materialized view. If a question mentions "declarative pipeline with target lag," it is dynamic tables. If a question mentions "imperative approach" or "procedural logic," think streams + tasks.

---

## 2. Snowpipe vs Snowpipe Streaming vs COPY INTO

| Aspect | COPY INTO (Bulk Loading) | Snowpipe | Snowpipe Streaming |
|--------|--------------------------|----------|--------------------|
| **Execution Model** | Manual -- user executes command | Automatic -- triggered by file arrival | Automatic -- rows inserted via SDK/API |
| **Data Input** | Files in a stage | Files in a stage | Rows (no files, no staging) |
| **Compute** | User-owned virtual warehouse | Snowflake-managed serverless compute | Snowflake-managed serverless compute |
| **Latency** | Batch (on-demand) | Near real-time (~1 minute) | Real-time (seconds, typically 5-10s) |
| **Triggering** | User runs SQL command | Cloud event notifications (AUTO_INGEST=TRUE) or REST API | Snowflake Ingest SDK (Java) -- no REST API, no staging |
| **Error Handling** | ON_ERROR parameter (default ABORT_STATEMENT) | ON_ERROR parameter (default SKIP_FILE) | Application-level via SDK (no ON_ERROR parameter -- errors handled programmatically in client code) |
| **Load History Retention** | 64 days (table metadata) | 14 days (pipe metadata) | N/A (offset token based) |
| **Transaction Control** | User can wrap in explicit transactions | Each file is a separate transaction | Per-channel commit semantics |
| **Authentication (API)** | Standard Snowflake auth | Key pair + JWT (REST API) | Key pair + JWT |
| **Stage Required** | Yes (internal or external) | Yes (external for auto-ingest; internal for REST API) | No -- rows go directly to table |
| **Data Ordering** | User controls load order | No ordering guarantee | Ordered within a single channel |
| **File Size Recommendation** | Larger files optimal (100-250 MB) | 100-250 MB compressed | N/A (row-based, batch 10-16 MB) |
| **Resource Monitor Control** | Yes (warehouse-based) | No (serverless exempt) | No (serverless exempt) |
| **Cost Model** | Warehouse credits (per-second) | Credits per GB loaded | Throughput-based credits per uncompressed GB (high-perf) |
| **Best For** | Large batch loads, scheduled ETL | Continuous file-based ingestion | Real-time streaming, IoT, CDC |

> **Key Exam Tip**: The #1 tested distinction is that Snowpipe Streaming writes rows DIRECTLY to tables WITHOUT staging files, while traditional Snowpipe and COPY INTO both require files in a stage. Also remember: COPY INTO retains load history for 64 days vs Snowpipe's 14 days -- this difference is a frequent exam question. The default ON_ERROR also differs: ABORT_STATEMENT for COPY INTO vs SKIP_FILE for Snowpipe.

---

## 3. External Tables vs Regular Tables vs Hybrid Tables

| Aspect | Regular (Native) Tables | External Tables | Hybrid Tables |
|--------|------------------------|----------------|---------------|
| **Data Location** | Snowflake-managed storage | External cloud storage (S3, GCS, Azure Blob) | Snowflake storage (row-optimized) |
| **Data Management** | Full DML (INSERT/UPDATE/DELETE/MERGE) | Read-only; no DML | Full DML with row-level locking |
| **Storage Format** | Columnar micro-partitions | Customer-managed files (Parquet, CSV, etc.) | Row-oriented storage |
| **Primary Key** | Optional, not enforced | N/A | Required and ENFORCED |
| **Referential Integrity** | Not enforced | Not supported | Enforced foreign keys |
| **Consistency** | Strong consistency (ACID) | Eventual consistency (manual refresh of metadata) | Strong consistency (ACID) with row-level locking |
| **Time Travel** | Yes (1 or 90 days) | No | Limited (currently) |
| **Fail-safe** | Yes (permanent tables) | No | Limited (currently) |
| **Clustering** | Auto micro-partitioning + optional clustering keys | No (depends on external file organization) | Index-based (B-tree on primary key) |
| **Query Performance** | Optimized -- columnar scans, pruning | Slower -- Snowflake must read external files | Fast point lookups; slower for analytics scans |
| **Streams Supported** | Standard, append-only | Insert-only ONLY | No |
| **Replication** | Yes | No | No |
| **Use Case** | General analytics, data warehousing | Query data in-place in data lake | Transactional/OLTP workloads, upserts |
| **Edition Required** | Standard+ | Standard+ | Enterprise+ (preview) |

> **Key Exam Tip**: External tables are READ-ONLY and only support INSERT-ONLY streams. Hybrid tables enforce primary keys and foreign keys -- the only table type in Snowflake that does. If a question asks about "enforced primary keys" or "row-level locking," the answer is hybrid tables. External tables cannot participate in Time Travel or Fail-safe.

---

## 4. Permanent vs Transient vs Temporary Tables

| Aspect | Permanent Table | Transient Table | Temporary Table |
|--------|----------------|-----------------|-----------------|
| **Keyword** | `CREATE TABLE` (default) | `CREATE TRANSIENT TABLE` | `CREATE TEMPORARY TABLE` |
| **Persistence** | Until explicitly dropped | Until explicitly dropped | Session only -- dropped at session end |
| **Time Travel (Standard)** | 0 or 1 day | 0 or 1 day | 0 or 1 day |
| **Time Travel (Enterprise+)** | 0 to 90 days | 0 or 1 day (max 1) | 0 or 1 day (max 1) |
| **Fail-safe** | 7 days | None | None |
| **Visible to Other Sessions** | Yes | Yes | No -- only visible to creating session |
| **Visible to Other Users** | Yes | Yes (if granted) | No -- session-scoped |
| **Cloning Target** | Any table type | Any table type | Any table type |
| **Database/Schema Types** | Any | Any | Any |
| **Storage Costs** | Full (data + Time Travel + Fail-safe) | Reduced (data + Time Travel, no Fail-safe) | Minimal (session lifetime only) |
| **Replication** | Yes | Yes | No |
| **Use Case** | Production data, long-term storage | Staging data, ETL intermediaries | Session-local scratch work, temp calculations |

> **Key Exam Tip**: The most tested difference is Fail-safe: permanent tables have 7 days of Fail-safe; transient and temporary tables have NONE. This directly impacts storage cost and data recovery options. Both transient and temporary tables max out at 1 day of Time Travel even on Enterprise Edition (where permanent tables can have up to 90 days). Temporary tables are session-scoped -- invisible to other sessions and other users.

---

## 5. UDF vs UDTF vs Stored Procedure vs External Function

| Aspect | UDF (Scalar) | UDTF (Tabular) | Stored Procedure | External Function |
|--------|-------------|---------------|-----------------|-------------------|
| **Returns** | Single scalar value per input row | Tabular result set (rows and columns) | Single value, result set, or nothing | Single scalar value per input row |
| **Called With** | SELECT, WHERE, expressions | TABLE() function in FROM clause | CALL statement | SELECT, WHERE, expressions (like UDF) |
| **Side Effects** | No (pure function, no DDL/DML) | No (pure function, no DDL/DML) | Yes -- can execute DDL, DML, CALL other procs | No |
| **Transaction Control** | Cannot manage transactions | Cannot manage transactions | Can use BEGIN/COMMIT/ROLLBACK | Cannot manage transactions |
| **Languages** | SQL, JavaScript, Python, Java, Scala | SQL, JavaScript, Python, Java, Scala | SQL, JavaScript, Python, Java, Scala | Remote service (AWS Lambda, Azure Function, GCP Cloud Function) |
| **Execution Context** | Runs inside Snowflake | Runs inside Snowflake | Caller's rights OR Owner's rights | Runs OUTSIDE Snowflake (remote service) |
| **Use in SQL** | Anywhere an expression is valid | Only in FROM clause | Cannot embed in SELECT | Anywhere an expression is valid |
| **Shareable** | Yes (secure UDFs) | Yes (secure UDTFs) | No -- cannot share procedures | Yes (via API integration) |
| **Overloading** | Yes (same name, different signatures) | Yes | Yes | Yes |
| **Owner's Rights** | Always runs as owner | Always runs as owner | Configurable (caller's or owner's rights) | N/A |
| **Use Case** | Data transformation, calculated fields | Flattening, generating rows, splitting | Administrative tasks, ETL orchestration, DDL | Integration with external ML models, APIs |

> **Note**: Snowpark is a library/framework (not a language). Snowpark APIs are available within Python, Java, and Scala UDFs, UDTFs, and stored procedures, enabling DataFrame-style programming in those languages.

> **Key Exam Tip**: The critical distinction is that stored procedures CAN execute DDL/DML and manage transactions, while UDFs/UDTFs CANNOT. UDFs are used in SELECT/WHERE; procedures are invoked with CALL. External functions run OUTSIDE Snowflake via API integrations and require an API Gateway (e.g., AWS API Gateway). UDTFs are called in the FROM clause wrapped in TABLE(). Procedures can run with either caller's rights or owner's rights; UDFs always run with owner's rights.

---

## 6. Standard Stream vs Append-only Stream vs Insert-only Stream

| Aspect | Standard Stream | Append-only Stream | Insert-only Stream |
|--------|----------------|-------------------|-------------------|
| **DML Operations Tracked** | INSERT, UPDATE, DELETE | INSERT only | INSERT only |
| **Supported Sources** | Tables, views | Tables, dynamic tables, Iceberg tables, views | External tables, directory tables |
| **How UPDATEs Appear** | DELETE (old) + INSERT (new) pair with METADATA$ISUPDATE = TRUE | Not tracked | N/A (not applicable to external tables) |
| **How DELETEs Appear** | DELETE row with METADATA$ISUPDATE = FALSE | Not tracked | N/A |
| **Net Change Computation** | Yes -- computes net changes (e.g., insert then delete = no rows) | No -- only appended rows shown | No -- only inserted records shown |
| **Performance** | Higher overhead (joins inserts/deletes for net changes) | More performant (no delete/update tracking) | Lowest overhead |
| **Creation Syntax** | `CREATE STREAM ... ON TABLE t` | `CREATE STREAM ... ON TABLE t APPEND_ONLY = TRUE` | `CREATE STREAM ... ON EXTERNAL TABLE t` (auto insert-only) |
| **METADATA$ACTION Values** | INSERT and DELETE | INSERT only | INSERT only |
| **METADATA$ISUPDATE** | TRUE for update pairs, FALSE otherwise | Always FALSE | Always FALSE |
| **Use Case** | Full CDC tracking, data synchronization | Append-only data flows (logs, events) | External table / directory table ingestion |

> **Key Exam Tip**: The exam tests what stream type is required for external tables -- the answer is ALWAYS insert-only. Standard streams compute net changes (an insert followed by a delete of the same row cancels out), while append-only streams show every INSERT regardless of subsequent changes. Remember: updates in standard streams appear as a DELETE + INSERT pair, both with METADATA$ISUPDATE = TRUE.

---

## 7. ACCOUNT_USAGE vs INFORMATION_SCHEMA

| Aspect | ACCOUNT_USAGE (Shared Database) | INFORMATION_SCHEMA (Per-Database) |
|--------|-------------------------------|----------------------------------|
| **Location** | `SNOWFLAKE.ACCOUNT_USAGE` schema | `<database>.INFORMATION_SCHEMA` |
| **Scope** | Entire account (all databases) | Single database only |
| **Includes Dropped Objects** | Yes -- shows dropped objects with `DELETED` column | No -- only current/active objects |
| **Data Latency** | 45 minutes to 3 hours (varies by view) | Real-time (no latency) |
| **Historical Data Retention** | 1 year (365 days) for most views | No history -- current state only |
| **Access Control** | Requires IMPORTED PRIVILEGES on SNOWFLAKE database (granted to ACCOUNTADMIN by default) | Available to any role with USAGE on the database |
| **Number of Views** | 200+ views | ~20 standard views + table functions |
| **Query History** | Yes -- QUERY_HISTORY view (up to 365 days) | Yes -- QUERY_HISTORY table function (up to 7 days for current account) |
| **Login History** | Yes -- LOGIN_HISTORY view | Yes -- LOGIN_HISTORY table function (limited) |
| **Storage Metrics** | Yes -- STORAGE_USAGE, TABLE_STORAGE_METRICS | Yes -- TABLE_STORAGE_METRICS (database only) |
| **Cost/Usage Data** | Yes -- WAREHOUSE_METERING_HISTORY, PIPE_USAGE_HISTORY, etc. | No |
| **Policy References** | Yes -- POLICY_REFERENCES view (account-wide) | Yes -- POLICY_REFERENCES table function (database only) |
| **Performance** | Querying large views may take longer | Generally faster (smaller scope) |
| **Typical Use Case** | Account-wide auditing, compliance, cost analysis | Application-level metadata queries, schema introspection |

### Key Views Unique to Each

**ACCOUNT_USAGE Only (no INFORMATION_SCHEMA equivalent):**
- `WAREHOUSE_METERING_HISTORY` -- warehouse credit usage
- `STORAGE_USAGE` -- account-level storage metrics
- `PIPE_USAGE_HISTORY` -- Snowpipe credit usage
- `ACCESS_HISTORY` -- data access audit trail
- `COPY_HISTORY` -- data loading history (account-wide)
- `REPLICATION_GROUP_USAGE_HISTORY` -- replication costs
- `MASKING_POLICIES` / `ROW_ACCESS_POLICIES` -- governance policy definitions
- `TASK_HISTORY` -- task execution history (365-day retention)

**INFORMATION_SCHEMA Only (no ACCOUNT_USAGE equivalent):**
- `POLICY_REFERENCES()` table function (per-database, real-time)
- `COPY_HISTORY()` table function (per-table, real-time)
- `REPLICATION_GROUP_REFRESH_HISTORY()` table function

> **Key Exam Tip**: The two most tested distinctions are: (1) ACCOUNT_USAGE has a latency of 45 min to 3 hours while INFORMATION_SCHEMA is real-time; (2) ACCOUNT_USAGE includes dropped objects while INFORMATION_SCHEMA does not. If a question asks about "auditing across the entire account" or "seeing dropped objects," the answer is ACCOUNT_USAGE. If the question needs "real-time" metadata, the answer is INFORMATION_SCHEMA.

---

## 8. Database Replication vs Failover Groups

| Aspect | Database Replication (Replication Group) | Failover Group |
|--------|----------------------------------------|----------------|
| **Purpose** | Replicate databases for read-only access in other accounts | Replicate + enable failover for disaster recovery |
| **Secondary Access** | Read-only (cannot be promoted) | Read-only until promoted to primary |
| **Failover Capability** | No -- secondary stays read-only | Yes -- secondary can be promoted with `ALTER FAILOVER GROUP ... PRIMARY` |
| **Edition Required** | All editions (for databases and shares) | Business Critical or higher |
| **Object Types** | Databases, Shares only | Databases, Shares, Users, Roles, Warehouses, Resource Monitors, Network Policies, Integrations, Parameters |
| **Account Object Replication** | No (databases and shares only) | Yes (users, roles, warehouses, etc.) |
| **Client Redirect** | Not supported | Supported (connection objects for seamless failover) |
| **Failback** | N/A | Yes -- original primary can be re-promoted after outage |
| **RPO Calculation** | N/A (no failover) | Maximum RPO = 2x replication interval |
| **Use Case** | Data distribution, read replicas | Business continuity, disaster recovery |
| **Cross-Region** | Yes | Yes |
| **Cross-Cloud** | Yes | Yes |
| **Replication Schedule** | Interval or CRON based | Interval or CRON based |
| **Time Travel Replicated** | No -- each account maintains independently | No -- each account maintains independently |

> **Key Exam Tip**: The exam frequently asks what edition is required. Database/Share replication works on ALL editions. Failover groups (with promotion capability and account object replication) require Business Critical or higher. The RPO formula is MAX RPO = 2x the replication interval (e.g., 10-min schedule = 20-min max data loss). Remember: `ALTER FAILOVER GROUP <name> PRIMARY` is the command to promote a secondary.

---

## 9. Share vs Listing vs Marketplace vs Data Exchange

| Aspect | Share | Listing | Snowflake Marketplace | Data Exchange |
|--------|-------|---------|----------------------|---------------|
| **What It Is** | A named object containing references to shared database objects | A packaging mechanism for data products (wraps a share) | Snowflake's public data marketplace | A private, curated marketplace (branded hub) |
| **Visibility** | Private -- only designated consumer accounts | Can be private (direct) or public (marketplace/exchange) | Public -- any Snowflake customer can discover | Private -- only invited members of the exchange |
| **Discovery** | No discovery -- provider must know consumer account locator | Discoverable via Marketplace or Data Exchange | Global discovery via Snowsight | Discoverable within the exchange group |
| **Consumer Types** | Snowflake accounts only (or reader accounts) | Snowflake accounts (or external via EXTERNAL access) | Any Snowflake account | Members of the exchange |
| **Cross-Region** | Same region only (without replication) | Same region or cross-region via auto-fulfillment (listing replication) | Cross-region via auto-fulfillment | Cross-region via auto-fulfillment |
| **Pricing** | No charge mechanism | Free or paid (with monetization support) | Free or paid | Free or paid |
| **Data Products** | Raw database objects | Curated data products with descriptions, samples, usage docs | Curated third-party and first-party data products | Curated data products among exchange members |
| **Who Creates** | Provider (ACCOUNTADMIN or role with CREATE SHARE) | Provider via Snowsight Provider Studio | Data providers (Snowflake partners, companies) | Exchange admin provisions providers |
| **Governance** | Provider controls access | Provider + Snowflake (Marketplace) or exchange admin | Snowflake reviews listings | Exchange admin controls membership and policies |
| **Who Manages** | Provider account | Provider via Provider Studio | Snowflake manages marketplace infrastructure | Organization that created the exchange |
| **Best For** | Direct 1:1 sharing between known accounts | Productizing data for broader distribution | Discovering and acquiring third-party datasets | Controlled sharing within a community/industry |

> **Key Exam Tip**: A Share is the underlying technical object. A Listing is the packaging/publishing mechanism for shares. The Marketplace is Snowflake's public storefront. A Data Exchange is a private, invite-only marketplace. The exam may test that shares are same-region only unless replication is configured, and that Listings support cross-region auto-fulfillment. Remember: a reader account can ONLY consume shares from its parent provider.

---

## 10. Masking Policy vs Row Access Policy

| Aspect | Masking Policy (DDM) | Row Access Policy (RLS) |
|--------|---------------------|------------------------|
| **Security Level** | Column-level security | Row-level security |
| **What It Controls** | How column VALUES appear to users | Which ROWS are visible to users |
| **Return Type** | Same data type as the column (e.g., STRING -> STRING) | BOOLEAN (TRUE = show row, FALSE = hide row) |
| **Effect on Data** | Values transformed/masked; rows still visible | Rows completely hidden; visible data unmodified |
| **Underlying Data** | Unchanged -- masking applied at query time only | Unchanged -- filtering applied at query time only |
| **Evaluation Order** | Evaluated SECOND (after row access policy) | Evaluated FIRST (before masking policy) |
| **Object Level** | Schema-level object | Schema-level object |
| **Applied To** | Individual columns | Entire table/view (referencing specific columns in signature) |
| **Columns Per Policy** | One column directly masked; optional conditional columns | One or more columns in signature for filtering logic |
| **Column Overlap** | A column can be in a masking policy OR a row access policy, NOT both | A column can be in a masking policy OR a row access policy, NOT both |
| **Tag-Based Application** | Yes -- can assign to tags for automatic protection | No -- must be applied directly to tables/views |
| **Materialized Views** | Cannot apply directly to MV columns (apply to source table) | Cannot create MV on table with row access policy |
| **Prevents DML** | No -- masking does not block INSERT/UPDATE/DELETE | No -- does not prevent INSERT; rows filtered on SELECT |
| **Edition Required** | Enterprise+ | Enterprise+ |
| **Apply Privilege** | APPLY MASKING POLICY ON ACCOUNT | APPLY ROW ACCESS POLICY ON ACCOUNT |
| **ALTER Command** | ALTER TABLE ... MODIFY COLUMN ... SET MASKING POLICY | ALTER TABLE ... ADD ROW ACCESS POLICY ... ON (columns) |
| **Remove Command** | ALTER TABLE ... MODIFY COLUMN ... UNSET MASKING POLICY | ALTER TABLE ... DROP ROW ACCESS POLICY |
| **Body Update** | ALTER MASKING POLICY ... SET BODY -> | ALTER ROW ACCESS POLICY ... SET BODY -> |
| **Key Context Functions** | CURRENT_ROLE(), IS_ROLE_IN_SESSION(), INVOKER_ROLE() | CURRENT_ROLE(), IS_ROLE_IN_SESSION(), IS_DATABASE_ROLE_IN_SESSION() |

> **Key Exam Tip**: The most tested points are: (1) Row access policies are evaluated FIRST, then masking policies apply to the surviving rows. (2) A column cannot be referenced in BOTH a masking policy and a row access policy simultaneously. (3) Masking policies return the SAME data type as the input; row access policies ALWAYS return BOOLEAN. (4) You cannot create a materialized view on a table that has a row access policy.

---

## 11. Clustering Key vs Search Optimization vs Query Acceleration Service

| Aspect | Clustering Key | Search Optimization Service (SOS) | Query Acceleration Service (QAS) |
|--------|---------------|----------------------------------|----------------------------------|
| **What It Does** | Organizes data in micro-partitions by specified columns | Creates search access paths for point lookups | Offloads scan-intensive query portions to serverless compute |
| **How It Helps** | Improves partition pruning for range/equality filters | Improves selective point lookups and text searches | Reduces wall-clock time for large scan/filter queries |
| **Best For** | Range queries (WHERE date BETWEEN), high-cardinality filters | Equality lookups (WHERE id = 123), LIKE/ILIKE patterns, GEOGRAPHY searches | Ad hoc analytics, unpredictable workloads, outlier queries |
| **Maintenance** | Automatic Clustering Service (background reclustering) | Automatic background maintenance (search access path) | No maintenance -- on-demand per query |
| **Compute Model** | Serverless (Automatic Clustering Service) | Serverless (background maintenance compute) | Serverless (shared QAS resources per query) |
| **Scope** | Table-level (specific columns) | Table-level (specific columns or all) | Warehouse-level (enabled on warehouse) |
| **Enablement** | `ALTER TABLE ... CLUSTER BY (col1, col2)` | `ALTER TABLE ... ADD SEARCH OPTIMIZATION ON EQUALITY(col)` | `ALTER WAREHOUSE ... SET ENABLE_QUERY_ACCELERATION = TRUE` |
| **Cost Control** | No direct cap (monitor via AUTOMATIC_CLUSTERING_HISTORY) | No direct cap (monitor via SEARCH_OPTIMIZATION_HISTORY) | Scale factor 0-10 limits max serverless compute per query |
| **When NOT Useful** | Small tables; tables without range-filtered queries | Full table scans; low-selectivity queries | Queries that are not scan-intensive |
| **Edition Required** | Enterprise+ (for Automatic Clustering) | Enterprise+ | Enterprise+ |
| **Resource Monitor** | Not controlled by resource monitors (serverless) | Not controlled by resource monitors (serverless) | Not controlled by resource monitors (serverless) |
| **Applies To** | The table's physical data layout | A metadata structure alongside the table | The warehouse processing queries |
| **Data Table Impact** | Data physically reorganized | No data reorganization | No data change |
| **Can Be Combined** | Yes -- with SOS and QAS | Yes -- with clustering and QAS | Yes -- with clustering and SOS |

> **Key Exam Tip**: All three are Enterprise Edition features and all use serverless compute. The exam differentiates them by query pattern: clustering keys help with RANGE scans and ORDER BY on large tables; search optimization helps with selective POINT LOOKUPS (WHERE id = 'xyz') and LIKE patterns; QAS helps with OUTLIER queries that scan large amounts of data. Clustering modifies physical data layout; SOS adds metadata structures; QAS offloads compute at query time. They are complementary -- not mutually exclusive.

---

## 12. Key Rotation vs Periodic Rekeying vs Tri-Secret Secure

| Aspect | Key Rotation | Periodic Rekeying | Tri-Secret Secure |
|--------|-------------|-------------------|-------------------|
| **What Happens** | New encryption key created; old key retired | Existing data re-encrypted with new key; old key destroyed | Customer-managed key (CMK) combined with Snowflake key to create composite master key |
| **Key State Change** | Active -> Retired | Retired -> Destroyed | Creates a composite key from two independently managed keys |
| **Data Re-encrypted?** | No -- only new data uses new key | Yes -- existing data is decrypted and re-encrypted | No (affects key wrapping hierarchy, not data re-encryption) |
| **Frequency** | Every 30 days (automatic) | After key has been retired for 1 year | Ongoing -- CMK always required for data access |
| **Edition Required** | All editions (automatic) | Enterprise Edition or higher | Business Critical Edition or higher |
| **Customer Action** | None required (fully automatic) | Enable: `ALTER ACCOUNT SET PERIODIC_DATA_REKEYING = TRUE` | Set up customer-managed key in cloud KMS (AWS KMS, Azure Key Vault, GCP Cloud KMS) |
| **Purpose** | Limit exposure if a key is compromised | Ensure old retired keys are destroyed and data uses current keys | Give customers control to revoke Snowflake's access to their data |
| **Downtime** | None | None (online process) | None |
| **Fail-safe Impact** | No impact | Rekeyed files have additional Fail-safe storage costs | No direct impact |
| **Key Provider** | Snowflake | Snowflake | Snowflake + Customer (dual control) |
| **Revocation Power** | Snowflake controls all keys | Snowflake controls all keys | Customer can revoke CMK to render data unreadable |

### Encryption Key Hierarchy

```
Root Key (Snowflake-managed, stored in HSM)
└── Account Master Key (one per account)
    └── Table Master Key (one per table)
        └── File Key (one per micro-partition file)
            └── Encrypted Data

Key Rotation:   Rotates Account Master Keys and Table Master Keys every 30 days
Periodic Rekeying: Re-encrypts File Keys (and thus data) with new Table Master Keys
Tri-Secret Secure: Customer-managed key wraps the Root Key (composite master key)
```

> **Key Exam Tip**: Key rotation (every 30 days, all editions) creates NEW keys but does NOT re-encrypt existing data. Periodic rekeying (Enterprise+, after 1 year) actually RE-ENCRYPTS data and DESTROYS old keys. Tri-Secret Secure (Business Critical+) adds a CUSTOMER-MANAGED KEY -- the customer can revoke this key to prevent Snowflake from reading the data. The hierarchy of editions is the most common exam question: All -> Enterprise (rekeying) -> Business Critical (Tri-Secret Secure).

---

## 13. PERSON User vs SERVICE User vs LEGACY_SERVICE User

| Aspect | PERSON (or NULL) | SERVICE | LEGACY_SERVICE |
|--------|-----------------|---------|----------------|
| **Intended For** | Human users (interactive) | Applications, services, ETL tools | Legacy applications being migrated |
| **MFA Enrollment** | Required (enforced for accounts created after Aug 2024) | Not allowed | Not required (exempt) |
| **Password Authentication** | Allowed | Not allowed (no PASSWORD property) | Allowed |
| **SAML SSO** | Allowed | Not allowed | Allowed |
| **Key Pair Auth** | Allowed | Required (primary auth method) | Allowed |
| **OAuth** | Allowed | Allowed | Allowed |
| **Snowsight Access** | Full access | Not applicable (no interactive login) | Limited |
| **Name Properties** | FIRST_NAME, LAST_NAME, etc. available | Cannot set FIRST_NAME, LAST_NAME, MIDDLE_NAME | Can set name properties |
| **MUST_CHANGE_PASSWORD** | Available | Not available | Available |
| **ALTER USER RESET PASSWORD** | Available | Not available | Available |
| **Future Direction** | Standard going forward | Standard for non-human identities | Being deprecated -- migrate to SERVICE |
| **TYPE = NULL Behavior** | Same as PERSON | N/A | N/A |

> **Key Exam Tip**: The exam tests why user types matter: SERVICE users CANNOT use passwords or SAML, ensuring they authenticate only via key pair or OAuth -- this prevents MFA enforcement issues. LEGACY_SERVICE is a transitional type being phased out. If TYPE is NULL (legacy default), it behaves identically to PERSON. Accounts created after August 2024 enforce MFA for all PERSON/NULL users who use password authentication.

---

## 14. GRANT vs FUTURE GRANTS vs MANAGED ACCESS Schemas

| Aspect | Standard GRANT | FUTURE GRANTS | MANAGED ACCESS Schema |
|--------|---------------|---------------|----------------------|
| **What It Does** | Grants privileges on existing objects | Pre-grants privileges on objects not yet created | Changes who can grant privileges on schema objects |
| **Timing** | Applies immediately to existing objects | Applies when matching objects are created in the future | Changes governance model for entire schema |
| **Scope** | Specific object | All future objects of a type in a database or schema | All objects within the schema |
| **Syntax** | `GRANT SELECT ON TABLE t TO ROLE r` | `GRANT SELECT ON FUTURE TABLES IN SCHEMA s TO ROLE r` | `CREATE SCHEMA s WITH MANAGED ACCESS` |
| **Retroactive** | No -- applies to named object only | No -- does not apply to objects that already exist | Yes -- immediately changes privilege management for all schema objects |
| **Who Can Grant on Objects** | Object owner (or role with MANAGE GRANTS) | N/A (pre-grants, not authorization change) | Only schema owner or role with MANAGE GRANTS (NOT the object owner) |
| **Object Owner Grants** | Object owner can grant privileges on their objects | N/A | Object owner CANNOT grant privileges (centralized control) |
| **Use Case** | Standard privilege management | Automating access for ETL-created tables, views | Centralized security governance, compliance |
| **Revocation** | `REVOKE ... ON TABLE t FROM ROLE r` | `REVOKE ... ON FUTURE TABLES IN SCHEMA s FROM ROLE r` | N/A (schema property, not a revokable grant) |
| **Convert Existing Schema** | N/A | N/A | `ALTER SCHEMA s SET MANAGED ACCESS` |
| **Key Privilege** | OWNERSHIP or specific privilege | OWNERSHIP on schema or MANAGE GRANTS | Schema OWNERSHIP or MANAGE GRANTS |

> **Key Exam Tip**: The most tested distinction is MANAGED ACCESS schemas vs normal schemas. In a managed access schema, the OBJECT OWNER cannot grant privileges on their objects -- only the SCHEMA OWNER or a role with MANAGE GRANTS can. This is Snowflake's mechanism for centralized privilege control. FUTURE GRANTS only apply to objects created AFTER the grant is set up -- they do NOT retroactively apply to existing objects. Both FUTURE GRANTS and regular GRANTS can coexist, but FUTURE GRANTS do not override existing grants.

---

## 15. Reader Account vs Full Account (Consumer)

| Aspect | Reader Account (Managed Account) | Full Consumer Account |
|--------|-------------------------------|---------------------|
| **Snowflake License** | Not required | Required (own Snowflake contract) |
| **Who Creates It** | Provider account (via `CREATE MANAGED ACCOUNT`) | Customer signs up with Snowflake directly |
| **Who Pays Compute** | Provider account pays all compute costs | Consumer pays their own compute costs |
| **Who Pays Storage** | No storage cost (data stays in provider's storage) | No storage cost for shared data; pays for own data |
| **Data Sources** | Can ONLY consume shares from its parent provider | Can consume shares from ANY provider |
| **Number of Providers** | Exactly one (the parent provider) | Unlimited |
| **Data Loading** | NOT allowed (no INSERT, COPY INTO) | Allowed (full Snowflake capabilities) |
| **DML Operations** | NOT allowed (read-only queries only) | Allowed |
| **DDL Operations** | Very limited (can create warehouses, users within account) | Full DDL capabilities |
| **Own Data Storage** | Cannot store own data | Can store their own data |
| **Snowflake Support** | Only through the provider | Direct Snowflake support |
| **Snowsight Access** | Limited | Full access |
| **Account Edition** | Same as provider account | Whatever edition they purchase |
| **Account Region** | Same as provider account | Any region |
| **Max Per Provider** | 20 reader accounts (default limit) | No limit |
| **Marketplace Access** | No | Yes |
| **Data Exchange** | No | Yes |
| **Object Name in DDL** | MANAGED ACCOUNT | ACCOUNT |
| **Resource Monitors** | Provider can set resource monitors on reader account warehouses | Consumer manages their own resource monitors |

> **Key Exam Tip**: The #1 exam question is: "Who pays for compute in a reader account?" The answer is the PROVIDER. Reader accounts exist for sharing data with non-Snowflake customers -- they have NO Snowflake license and can ONLY consume data from their single parent provider. They cannot load their own data or access the Marketplace. If the question mentions sharing with "non-Snowflake customers," the answer involves reader accounts.

---

## 16. Regular View vs Secure View vs Materialized View

| Aspect | Regular View | Secure View | Materialized View |
|--------|-------------|-------------|-------------------|
| **Definition** | Named SQL query executed at query time | View with DDL/definition hidden from consumers | Pre-computed query results stored physically |
| **Data Storage** | No data stored (virtual) | No data stored (virtual) | Results stored in Snowflake storage |
| **DDL Visibility** | Visible via `GET_DDL()` and `SHOW VIEWS` | Hidden -- `GET_DDL()` returns only to owner; `TEXT` column is NULL for non-owners | Visible via `GET_DDL()` and `SHOW MATERIALIZED VIEWS` |
| **Query Optimizer** | Full optimization (predicate pushdown, filter rewriting) | Limited optimization -- optimizer CANNOT push predicates through the view boundary (prevents data leakage) | Full optimization; automatic query rewriting |
| **Performance** | Standard (query executed each time) | Potentially slower than regular views due to optimizer restrictions | Fastest for repeated queries (reads pre-computed results) |
| **Automatic Query Rewrite** | No | No | Yes -- optimizer can transparently substitute the MV |
| **Creation Syntax** | `CREATE VIEW v AS ...` | `CREATE SECURE VIEW v AS ...` or `ALTER VIEW v SET SECURE` | `CREATE MATERIALIZED VIEW mv AS ...` |
| **DML on View** | No (query base tables directly) | No (query base tables directly) | No DML on the MV itself |
| **Source Complexity** | Any valid SELECT (JOINs, subqueries, etc.) | Any valid SELECT | Single base table ONLY; no JOINs, no UDFs, no UNION |
| **Data Sharing** | Cannot be shared | Required for sharing -- ONLY secure views/UDFs can be shared | Cannot be shared directly (share the secure view instead) |
| **Row Access Policy Interaction** | Compatible | Compatible | Cannot create MV on a table with a row access policy |
| **Clustering/Maintenance** | N/A | N/A | Background serverless maintenance (automatic refresh) |
| **Edition Required** | Standard+ | Standard+ | Enterprise+ |
| **Cost** | Compute only (at query time) | Compute only (at query time) | Storage + background maintenance credits |
| **Best For** | Simplifying complex queries, logical abstraction | Data sharing, hiding business logic, column-level security | Accelerating expensive aggregations on a single large table |

> **Key Exam Tip**: The exam heavily tests three points: (1) Secure views are REQUIRED for data sharing -- regular views and materialized views cannot be shared directly. (2) The optimizer CANNOT push predicates through a secure view boundary, which may reduce performance but prevents data leakage. (3) Materialized views support only a SINGLE base table with no JOINs, no UDFs, and no nested views. If a question mentions "hidden DDL" or "data sharing," the answer is secure view. If a question mentions "pre-computed results" or "automatic query rewriting," the answer is materialized view.

---

## 17. System-Defined Role Hierarchy (ACCOUNTADMIN vs SECURITYADMIN vs SYSADMIN vs USERADMIN)

| Aspect | ACCOUNTADMIN | SECURITYADMIN | SYSADMIN | USERADMIN |
|--------|-------------|--------------|----------|-----------|
| **Hierarchy Position** | Top-level (inherits all roles below) | Reports to ACCOUNTADMIN | Reports to ACCOUNTADMIN | Reports to SECURITYADMIN |
| **Primary Purpose** | Full account control (use sparingly) | Manage grants and security policies | Manage all databases, schemas, warehouses, and other objects | Manage users and roles |
| **Create/Manage Users** | Yes (inherited) | Yes (inherited from USERADMIN) | No | Yes |
| **Create/Manage Roles** | Yes (inherited) | Yes (inherited from USERADMIN) | No | Yes |
| **Grant Privileges** | Yes (MANAGE GRANTS inherited) | Yes (has MANAGE GRANTS) | Only on objects it owns or is granted | No (unless granted) |
| **Create Databases** | Yes (inherited) | No | Yes | No |
| **Create Warehouses** | Yes (inherited) | No | Yes | No |
| **Manage Network Policies** | Yes | Yes (CREATE NETWORK POLICY) | No | No |
| **Manage Resource Monitors** | Yes | No | No | No |
| **Access ACCOUNT_USAGE** | Yes (IMPORTED PRIVILEGES on SNOWFLAKE db) | No (unless granted) | No (unless granted) | No (unless granted) |
| **Set Account-Level Parameters** | Yes | No | No | No |
| **View Billing/Usage** | Yes | No | No | No |
| **MFA Requirement** | Strongly recommended (all PERSON users) | Strongly recommended | Recommended | Recommended |
| **Best Practice** | Avoid daily use; assign to limited users; always use MFA | Use for security administration | Create all objects under SYSADMIN (not ACCOUNTADMIN) | Use for user/role lifecycle management |

### Role Hierarchy (top to bottom)

```
ACCOUNTADMIN
├── SECURITYADMIN
│   └── USERADMIN
├── SYSADMIN
│   └── (custom roles should be granted to SYSADMIN)
└── (all other system and custom roles)

PUBLIC (granted to every user automatically, lowest privilege)
```

> **Key Exam Tip**: The exam tests three critical best practices: (1) Create objects using SYSADMIN, NOT ACCOUNTADMIN -- if you create objects under ACCOUNTADMIN, SYSADMIN cannot manage them unless explicitly granted. (2) Custom roles should be granted TO SYSADMIN so they participate in the hierarchy. (3) SECURITYADMIN owns the MANAGE GRANTS privilege, which allows granting any privilege on any object to any role -- this is why it sits above USERADMIN but below ACCOUNTADMIN. (4) ACCOUNTADMIN is the ONLY role that can create resource monitors and view billing information.

---

## 18. Stage Types (User Stage vs Table Stage vs Named Internal Stage vs External Stage)

| Aspect | User Stage | Table Stage | Named Internal Stage | External Stage |
|--------|-----------|-------------|---------------------|----------------|
| **Reference Syntax** | `@~` | `@%table_name` | `@stage_name` | `@stage_name` (points to cloud storage) |
| **Scope** | Per-user (each user has one) | Per-table (each table has one) | Schema-level object | Schema-level object |
| **Creation** | Automatic (exists for every user) | Automatic (exists for every table) | `CREATE STAGE my_stage` | `CREATE STAGE my_stage URL='s3://bucket/path/'` |
| **Cloud Storage** | Snowflake-managed internal | Snowflake-managed internal | Snowflake-managed internal | Customer-managed (S3, GCS, Azure Blob) |
| **File Format Options** | Set in COPY INTO command only | Set in COPY INTO command only | Yes -- can define default file format on stage | Yes -- can define default file format on stage |
| **COPY INTO Load** | Yes | Yes (load into its own table only) | Yes | Yes |
| **COPY INTO Unload** | Yes | Yes (unload from its own table only) | Yes | Yes |
| **Snowpipe Support** | No | No | Yes | Yes (AUTO_INGEST with event notifications) |
| **Multiple Users** | No (private to one user) | Shared by users with table privileges | Shared via stage privileges (USAGE, READ, WRITE) | Shared via stage privileges |
| **Multiple Tables** | Yes (can load to any table user has access to) | No (bound to one table) | Yes (can load to any table) | Yes (can load to any table) |
| **DROP Behavior** | Cannot be dropped | Dropped when table is dropped | Explicit `DROP STAGE` | Explicit `DROP STAGE` |
| **Directory Table** | No | No | Yes (optional: `ENABLE_DIRECTORY = TRUE`) | Yes (optional) |
| **Access Control** | Implicit (user's own stage) | Implicit (table-level privileges) | Explicit GRANT (USAGE, READ, WRITE) | Explicit GRANT + storage integration |
| **Best For** | Ad hoc file uploads by individual users | Loading data destined for a single table | Shared loading workflows, organized data pipelines | Data lake integration, cross-cloud loading |

> **Key Exam Tip**: The exam frequently tests stage syntax: `@~` = user stage, `@%table_name` = table stage, `@stage_name` = named stage. Key distinctions: (1) User and table stages do NOT support file format options defined on the stage itself -- you must specify them in the COPY INTO command. (2) Snowpipe only works with named stages (internal or external), NOT user or table stages. (3) Table stages are bound to a single table -- you cannot use one table's stage to load into a different table. (4) External stages require a storage integration for secure authentication to cloud providers.

---

## 19. Zero-Copy Cloning vs Time Travel vs Fail-safe

| Aspect | Zero-Copy Cloning | Time Travel | Fail-safe |
|--------|-------------------|-------------|-----------|
| **Purpose** | Create instant copies of objects for dev/test/backup | Recover data from a specific point in time | Disaster recovery (last resort, Snowflake-managed) |
| **Who Initiates** | User (via `CREATE ... CLONE`) | User (via AT/BEFORE queries or UNDROP) | Snowflake Support ONLY (user cannot access directly) |
| **Access Method** | `CREATE TABLE t_clone CLONE t` | `SELECT ... AT(TIMESTAMP => ...)` or `UNDROP TABLE/SCHEMA/DATABASE` | Contact Snowflake Support (best-effort recovery) |
| **Timing** | Instant (metadata-only operation) | Available during retention period | Available after Time Travel expires |
| **Storage Cost** | Zero initially -- only divergent data costs storage | Included in Time Travel storage (proportional to changes) | Additional storage for 7 days beyond Time Travel |
| **Retention Period** | N/A (clone exists until dropped) | 0-90 days (edition-dependent) | 7 days (permanent tables only) |
| **Objects Supported** | Databases, schemas, tables, streams, stages, file formats, sequences, tasks | Tables, schemas, databases | Tables, schemas, databases (permanent only) |
| **Data Independence** | Clone is fully independent -- changes to source or clone do not affect the other | Reads historical state of original object | N/A (recovery creates a new copy) |
| **DML on Result** | Full DML on the clone | Read-only (AT/BEFORE queries); UNDROP restores to active state | N/A (Snowflake performs recovery) |
| **Transient/Temporary Tables** | Can be cloned | Time Travel: 0-1 day max | No Fail-safe |
| **Edition Required** | Standard+ | Standard (1 day); Enterprise+ (up to 90 days) | Standard+ (permanent tables only) |
| **Metadata vs Data** | Copies metadata pointers (shares micro-partitions until changes) | Retains historical micro-partitions | Moves expired Time Travel data to Fail-safe storage |

### Timeline Visualization

```
  Data Change     Time Travel Window        Fail-safe Window
  Occurs Here     (user-accessible)         (Snowflake-only)
      |           |<--- 0-90 days --->|<--- 7 days --->|
      v           v                    v                 v
  [CHANGE] -----> [TIME TRAVEL] -----> [FAIL-SAFE] -----> [DATA PURGED]

  Zero-Copy Clone: Created at any point; independent copy from that moment forward
```

> **Key Exam Tip**: The exam tests these distinctions heavily: (1) Zero-copy cloning is INSTANT and initially consumes NO additional storage -- it copies metadata pointers, not data. (2) Time Travel is USER-accessible; Fail-safe is SNOWFLAKE-ONLY (requires contacting Snowflake Support). (3) Fail-safe applies ONLY to permanent tables -- transient and temporary tables have NO Fail-safe. (4) The UNDROP command works within the Time Travel window, not Fail-safe. (5) Total data protection window = Time Travel + 7-day Fail-safe (e.g., 90-day TT + 7-day FS = 97 days max on Enterprise+).

---

## 20. Warehouse Scaling: Up/Down vs Out/In (Multi-Cluster Warehouses)

| Aspect | Scaling Up/Down (Vertical) | Scaling Out/In (Horizontal -- Multi-Cluster) |
|--------|---------------------------|----------------------------------------------|
| **What Changes** | Warehouse SIZE (XS, S, M, L, XL, 2XL, 3XL, 4XL, 5XL, 6XL) | NUMBER of clusters (1 to 10) |
| **How to Change** | `ALTER WAREHOUSE SET WAREHOUSE_SIZE = 'X-LARGE'` | `ALTER WAREHOUSE SET MIN_CLUSTER_COUNT / MAX_CLUSTER_COUNT` |
| **When It Helps** | Complex queries that need more compute (large sorts, big JOINs) | High concurrency -- many users/queries running simultaneously |
| **Problem Solved** | Queries running slow due to insufficient compute | Queries queuing due to insufficient concurrency |
| **Scaling Speed** | Immediate (new queries use new size; running queries finish on old size) | Automatic (clusters added/removed based on load) |
| **Edition Required** | Standard+ (all sizes) | Enterprise+ (multi-cluster warehouses) |
| **Cost Impact** | Larger size = proportionally more credits per second (each size doubles) | More clusters = multiplicative credits (3 clusters = 3x cost) |
| **Idle Behavior** | Warehouse suspends after AUTO_SUSPEND timeout | Extra clusters scale in (shut down) based on scaling policy |
| **Scaling Policy: Standard** | N/A | Favors starting additional clusters to minimize queuing (performance-oriented) |
| **Scaling Policy: Economy** | N/A | Favors conserving credits; only starts clusters if load sustained for 6+ minutes (cost-oriented) |
| **Max Clusters** | N/A (single cluster) | 10 clusters maximum |
| **Best Practice** | Start small, scale up if query profile shows spilling to disk | Use Standard policy for user-facing workloads; Economy for batch/background |

### Sizing Quick-Reference

| Size | Nodes | Credits/Hour | Relative Power |
|------|-------|-------------|----------------|
| X-Small (XS) | 1 | 1 | 1x |
| Small (S) | 2 | 2 | 2x |
| Medium (M) | 4 | 4 | 4x |
| Large (L) | 8 | 8 | 8x |
| X-Large (XL) | 16 | 16 | 16x |
| 2X-Large | 32 | 32 | 32x |
| 3X-Large | 64 | 64 | 64x |
| 4X-Large | 128 | 128 | 128x |
| 5X-Large | 256 | 256 | 256x |
| 6X-Large | 512 | 512 | 512x |

> **Key Exam Tip**: The exam tests the difference between vertical and horizontal scaling: (1) Scaling UP (bigger size) helps with complex, slow individual queries. Scaling OUT (more clusters) helps with concurrency/queuing. (2) Multi-cluster warehouses require Enterprise Edition or higher. (3) Standard scaling policy is performance-first (adds clusters aggressively); Economy policy is cost-first (waits 6 minutes before adding clusters). (4) Each warehouse size DOUBLES the compute and credit cost of the previous size. (5) If the query profile shows "bytes spilling to local/remote storage," consider scaling UP. If queries are queuing, consider scaling OUT.

---

## Quick-Reference: Edition Requirements Summary

This is one of the most heavily tested areas. Memorize which features require which edition.

| Feature | Standard | Enterprise | Business Critical |
|---------|----------|-----------|-------------------|
| Database/Share Replication | Yes | Yes | Yes |
| Dynamic Tables | Yes | Yes | Yes |
| Streams and Tasks | Yes | Yes | Yes |
| Snowpipe / Snowpipe Streaming | Yes | Yes | Yes |
| Time Travel (up to 90 days) | No (1 day max) | Yes | Yes |
| Materialized Views | No | Yes | Yes |
| Search Optimization Service | No | Yes | Yes |
| Query Acceleration Service | No | Yes | Yes |
| Clustering Keys (Automatic Clustering) | No | Yes | Yes |
| Dynamic Data Masking | No | Yes | Yes |
| Row Access Policies | No | Yes | Yes |
| Periodic Rekeying | No | Yes | Yes |
| External Tokenization | No | Yes | Yes |
| Failover Groups | No | No | Yes |
| Account Object Replication | No | No | Yes |
| Client Redirect | No | No | Yes |
| Tri-Secret Secure (Customer-managed keys) | No | No | Yes |
| Private Connectivity (PrivateLink, Private Service Connect) | No | No | Yes |
| HIPAA / PCI DSS Compliance | No | No | Yes |
| Hybrid Tables | No | Yes (preview) | Yes |
| Multi-Cluster Warehouses | No | Yes | Yes |
| Secure Views / Secure UDFs | Yes | Yes | Yes |
| Zero-Copy Cloning | Yes | Yes | Yes |

---

## Quick-Reference: Default ON_ERROR Behavior

| Loading Method | Default ON_ERROR |
|---------------|-----------------|
| COPY INTO | ABORT_STATEMENT |
| Snowpipe | SKIP_FILE |
| Snowpipe Streaming | N/A -- no ON_ERROR parameter; error handling is managed at the application/SDK level |

---

## Quick-Reference: Load History Retention

| Loading Method | Retention Period | Storage Location |
|---------------|-----------------|-----------------|
| COPY INTO | 64 days | Table metadata |
| Snowpipe | 14 days | Pipe metadata |

---

## Quick-Reference: Time Travel and Fail-safe by Table Type

| Table Type | Time Travel (Standard) | Time Travel (Enterprise+) | Fail-safe |
|------------|----------------------|--------------------------|-----------|
| Permanent | 0-1 day | 0-90 days | 7 days |
| Transient | 0-1 day | 0-1 day | None |
| Temporary | 0-1 day | 0-1 day | None |
| External | None | None | None |

---

*Generated for SnowPro Core COF-C02 exam preparation. Cross-reference with official Snowflake documentation for the most current feature details.*
