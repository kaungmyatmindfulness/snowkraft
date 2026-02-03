# SnowPro Core (COF-C02) Exam Tips

> Comprehensive exam preparation guide synthesized from all domain study materials

---

## Exam Overview

| Domain | Topic | Weight |
|--------|-------|--------|
| 1 | Snowflake AI Data Cloud Features & Architecture | 25-30% |
| 2 | Account Access & Security | 20-25% |
| 3 | Performance Concepts | 10-15% |
| 4 | Data Loading & Unloading | 10-15% |
| 5 | Data Transformations | 20-25% |
| 6 | Data Protection & Sharing | 5-10% |

**Passing Score:** 750/1000 scaled (not a simple 75%) | **Questions:** 100 | **Time:** 115 minutes

---

## Domain 1: Snowflake AI Data Cloud Features & Architecture (25-30%)

### Three-Layer Architecture

```
┌─────────────────────────────────────┐
│         Cloud Services Layer        │  Query parsing, optimization, DDL
│         (10% free threshold)        │
├─────────────────────────────────────┤
│          Compute Layer              │  Virtual Warehouses (MPP)
│     (Independent scaling)           │
├─────────────────────────────────────┤
│          Storage Layer              │  Micro-partitions (50-500 MB)
│     (Centralized, columnar)         │
└─────────────────────────────────────┘
```

### Critical Numbers to Memorize

| Topic | Value |
|-------|-------|
| Micro-partition size | 50-500 MB uncompressed |
| Result cache duration | 24 hours (max 31 days if reused) |
| Fail-safe period | 7 days (non-configurable) |
| Time Travel - Standard | 1 day max |
| Time Travel - Enterprise | 90 days max |
| Cloud Services free threshold | 10% of warehouse credits |
| VARIANT max size | 128 MB uncompressed |
| Warehouse billing minimum | 60 seconds per start |
| Clustering depth optimal | 1 (no overlap) |

### Virtual Warehouse Sizing

| Size | Credits/Hour |
|------|--------------|
| XS | 1 |
| S | 2 |
| M | 4 |
| L | 8 |
| XL | 16 |
| 2XL | 32 |
| 3XL | 64 |
| 4XL | 128 |
| 5XL | 256 |
| 6XL | 512 |

**Key insight:** Each size doubles both resources AND credits. Query running 2x faster on 2x warehouse costs the same.

### Multi-Cluster Warehouses (Enterprise+)

**Scaling Modes:**

| Mode | Behavior | Use Case |
|------|----------|----------|
| Auto-scale (default) | Clusters start/stop based on load | Variable concurrency |
| Maximized | All clusters start immediately | Consistent high concurrency |

**Scaling Policies (Auto-scale mode only):**

| Policy | Starts New Cluster | Shuts Down Cluster | Best For |
|--------|-------------------|--------------------|----------|
| Standard (default) | When query queued or estimated to queue | After 2-3 consecutive checks show load could be redistributed | Performance-focused workloads |
| Economy | Only after enough load to keep cluster busy for 6 minutes | After 5-6 consecutive checks show load could be redistributed | Cost-focused workloads |

**Key facts:**
- Min/Max clusters: 1-10
- Scale OUT (multi-cluster) = concurrency; scale UP (warehouse size) = query performance
- Multi-cluster warehouses require Enterprise edition or higher

### Edition Features

| Feature | Standard | Enterprise | Business Critical |
|---------|----------|------------|-------------------|
| Time Travel max | 1 day | 90 days | 90 days |
| Multi-cluster warehouses | No | Yes | Yes |
| Materialized views | No | Yes | Yes |
| Search optimization | No | Yes | Yes |
| Masking policies | No | Yes | Yes |
| Clustering keys (define) | Yes | Yes | Yes |
| Automatic reclustering | No | Yes | Yes |
| Query Acceleration Service | No | Yes | Yes |
| Row Access Policies | No | Yes | Yes |
| Tri-Secret Secure | No | No | Yes |
| Private connectivity | No | No | Yes |
| Failover groups | No | No | Yes |

**Edition hierarchy:** Standard < Enterprise < Business Critical < **Virtual Private Snowflake (VPS)**

VPS provides a completely separate Snowflake environment with dedicated infrastructure. It includes all Business Critical features plus full isolation from other Snowflake accounts.

### Table Types

| Type | Time Travel | Fail-safe | Session-Scoped |
|------|-------------|-----------|----------------|
| Permanent (Standard) | 0-1 day | 7 days | No |
| Permanent (Enterprise+) | 0-90 days | 7 days | No |
| Transient | 0-1 day | None | No |
| Temporary | 0-1 day | None | Yes |

### Common Domain 1 Traps

1. **60-second minimum billing** - Restart within 60 seconds still charges 60 seconds per restart
2. **Multi-cluster = concurrency, not performance** - Scale OUT for concurrency, scale UP for performance
3. **Result cache requires exact match** - Case-sensitive, includes whitespace and aliases
4. **Warehouse suspend clears warehouse cache** - Not result cache (that's in Cloud Services)
5. **Transient tables CANNOT have Fail-safe** - Regardless of edition
6. **JSON keys are CASE-SENSITIVE** - Column names are case-insensitive

---

## Domain 2: Account Access & Security (20-25%)

### Account Identifiers

| Format | Example | Notes |
|--------|---------|-------|
| Organization.Account Name | `myorg.myaccount` | Preferred format, globally unique |
| Account Locator | `xy12345` | Legacy format, region-dependent |
| URL format | `myorg-myaccount.snowflakecomputing.com` | Uses hyphens in URLs |

**Trap:** Account locator is NOT globally unique -- it can repeat across regions. Always prefer `organization.account_name` format.

### Role Hierarchy

```
ACCOUNTADMIN (top - combines SYSADMIN + SECURITYADMIN)
    ├── SECURITYADMIN (MANAGE GRANTS privilege)
    │       └── USERADMIN (CREATE USER, CREATE ROLE)
    └── SYSADMIN (CREATE WAREHOUSE, CREATE DATABASE)

PUBLIC = pseudo-role granted to ALL users automatically

ORGADMIN = SEPARATE (not in hierarchy, manages organization-level operations)
```

### Which Role Can...?

| Action | Required Role |
|--------|---------------|
| View billing/credit data | ACCOUNTADMIN |
| Configure account parameters | ACCOUNTADMIN |
| Grant privileges globally | SECURITYADMIN |
| Create users/roles | USERADMIN |
| Create warehouses/databases | SYSADMIN |
| Manage network policies | SECURITYADMIN |

### Container Privileges (All Required)

To query a table, you need:
```
USAGE on WAREHOUSE
USAGE on DATABASE
USAGE on SCHEMA
SELECT on TABLE
```

### Authentication Methods

| Method | Use Case | Best For |
|--------|----------|----------|
| Password + MFA | Interactive users | Humans using Snowsight |
| SSO (SAML) | Federated auth | Enterprise identity |
| Key-Pair | Programmatic | Service accounts, ETL |
| Snowflake OAuth | Partner apps | Tableau, Looker |
| External OAuth | Enterprise SSO | Okta, Azure AD |

### Network Policies

- **Purpose:** Restrict access by IP address (allow/block lists)
- **ALLOWED_IP_LIST:** Only these IPs can connect (whitelist)
- **BLOCKED_IP_LIST:** These IPs are denied even if in allowed list (blacklist overrides)
- **Scope:** Can be applied at account level OR individual user level
- **User-level overrides account-level** policy for that user
- **Required role:** SECURITYADMIN (or higher) to create and manage
- **At least one non-blocked IP** must remain to avoid lockout

```sql
CREATE NETWORK POLICY my_policy
  ALLOWED_IP_LIST = ('192.168.1.0/24')
  BLOCKED_IP_LIST = ('192.168.1.100');
ALTER ACCOUNT SET NETWORK_POLICY = my_policy;        -- Account level
ALTER USER jsmith SET NETWORK_POLICY = user_policy;   -- User level
```

### User Types

| Type | Password | MFA | Purpose |
|------|----------|-----|---------|
| PERSON | Yes | Required* | Human users |
| NULL | Yes | Required* | Functions same as PERSON |
| SERVICE | No | N/A | Automation (key-pair/OAuth only) |
| LEGACY_SERVICE | Yes | Exempt | Migration (deprecated) |

*\*MFA enforced for accounts created after BCR 2024_08 bundle; will become universal for all accounts.*

### Encryption Key Hierarchy

```
1. Root Key (HSM)
   └── 2. Account Master Key (one per account)
       └── 3. Table Master Key (one per table)
           └── 4. File Key (encrypts micro-partitions)
```

- **Key Rotation:** Every 30 days (automatic, all editions)
- **Periodic Rekeying:** After 1 year (Enterprise+ only, re-encrypts existing data)
- **Tri-Secret Secure:** Business Critical only, customer-managed key

### Common Domain 2 Traps

1. **ACCOUNTADMIN is NOT a superuser** - Can only access objects where it or child roles have privileges
2. **Owning a role ≠ having that role's privileges** - Must be explicitly granted
3. **DEFAULT_ROLE requires explicit grant** - If not granted, PUBLIC is used
4. **ALL privileges excludes OWNERSHIP** - OWNERSHIP is never included
5. **Service users cannot use passwords** - Must use key-pair or OAuth
6. **Two RSA key slots** - RSA_PUBLIC_KEY and RSA_PUBLIC_KEY_2 for rotation

---

## Domain 3: Performance Concepts (10-15%)

### Three Caching Layers

| Cache | Location | Duration | Cleared When |
|-------|----------|----------|--------------|
| Metadata | Cloud Services | Persistent | Never (auto-maintained) |
| Result | Cloud Services | 24h (max 31 days) | Data changes, query differs |
| Warehouse | Local SSD | Until suspend | Warehouse suspends/resizes |

### Result Cache Requirements (ALL must be met)

- Exact SQL text match (case-sensitive, including whitespace)
- No non-reusable functions (UUID_STRING, RANDOM, RANDSTR) or external functions
- Underlying table data unchanged (no DML, no reclustering/consolidation)
- Configuration options unchanged
- **SELECT queries:** role must have access privileges (NOT required to be same role)
- **SHOW queries:** must use exact same role
- No hybrid table queries

> **Trap:** Meeting ALL conditions does NOT guarantee cache reuse. Snowflake may still re-execute.

### Query Profile Key Metrics

| Metric | What It Means | Action |
|--------|---------------|--------|
| High Partitions Scanned/Total | Poor pruning | Add clustering key, better WHERE |
| Bytes Spilled to Local | Memory pressure | Monitor, larger warehouse |
| Bytes Spilled to Remote | SEVERE issue | Increase warehouse size immediately |
| High % from Cache | Good performance | Keep warehouse warm |

### Memory Spillage Hierarchy

```
1. Memory (RAM) → Fastest
2. Local Disk (SSD) → Moderate impact
3. Remote Storage → SEVERE impact (10-1000x slower)
```

### Clustering Depth Interpretation

| Depth | Assessment | Pruning |
|-------|------------|---------|
| 1 | Optimal | Best |
| 1-3 | Good | Minimal overlap |
| 3-5 | Moderate | Some overlap |
| 10+ | Poor | Needs clustering |

### What Prevents Partition Pruning

- Functions on column: `WHERE YEAR(col)`, `WHERE UPPER(col)`
- Expressions: `WHERE col * 1.1 > 100`
- Subqueries: `WHERE id IN (SELECT...)`
- LIKE with leading wildcard: `WHERE col LIKE '%pattern'`

### Auto-Suspend Guidelines

| Workload | Recommended Timeout |
|----------|-------------------|
| Tasks | Immediate (0 seconds) |
| Ad-hoc/DevOps | ~5 minutes |
| BI/Reporting | 10+ minutes |

### Common Domain 3 Traps

1. **Larger warehouse ≠ always faster** - Especially for data loading
2. **Suspending clears warehouse cache, NOT result cache**
3. **Result cache is 24 hours initially** - Extends to 31 days only if reused
4. **Multi-cluster improves concurrency, not query speed**
5. **LIMIT without ORDER BY still scans all rows**
6. **Clustering keys can be DEFINED in all editions** - But automatic reclustering (the background service that maintains clustering) requires Enterprise+

---

## Domain 4: Data Loading & Unloading (10-15%)

### Loading Methods Comparison

| Method | Latency | Compute | Use Case |
|--------|---------|---------|----------|
| COPY INTO | Minutes | User warehouse | Batch loads |
| Snowpipe | Minutes | Serverless | Continuous, event-driven |
| Snowpipe Streaming | Seconds | Serverless | Real-time row insertion |

### Stage Types

| Stage | Reference | Transform Support | Grantable |
|-------|-----------|-------------------|-----------|
| User | `@~` | Yes | No |
| Table | `@%table_name` | **No** | No |
| Named Internal | `@stage_name` | Yes | Yes |
| Named External | `@stage_name` | Yes | Yes |

### COPY INTO Critical Options

| Option | Default | Note |
|--------|---------|------|
| ON_ERROR (bulk) | ABORT_STATEMENT | Stops on first error |
| ON_ERROR (Snowpipe) | SKIP_FILE | Skips files with errors |
| PURGE | FALSE | Only removes successfully loaded files |
| FORCE | FALSE | **Can create duplicates!** |
| VALIDATION_MODE | N/A | Does NOT load data |

**VALIDATION_MODE Options (commonly tested):**

| Option | Behavior |
|--------|----------|
| RETURN_ERRORS | Returns all errors across all files |
| RETURN_n_ROWS | Validates and returns first n rows (e.g., `RETURN_5_ROWS`) |
| RETURN_ALL_ERRORS | Returns all errors for all files (even if ON_ERROR would skip) |

- VALIDATION_MODE is mutually exclusive with actual loading (data is NOT loaded)
- Use `VALIDATE()` function to query results of the most recent COPY INTO execution

```sql
COPY INTO my_table FROM @my_stage VALIDATION_MODE = 'RETURN_ERRORS';
SELECT * FROM TABLE(VALIDATE(my_table, JOB_ID => '_last'));
```

### File Format Support

| Format | Load | Unload |
|--------|------|--------|
| CSV | Yes | Yes |
| JSON | Yes | Yes |
| Parquet | Yes | Yes |
| Avro | Yes | No |
| ORC | Yes | No |
| XML | Yes | No |

### File Format Precedence (No Merging!)

```
COPY INTO statement > Stage > System defaults
```

Higher level completely overrides (doesn't merge with) lower levels.

### Load Metadata & Deduplication

- **64-day tracking:** Files tracked for 64 days to prevent reloading
- **After 64 days:** Use `FORCE = TRUE` or `LOAD_UNCERTAIN_FILES = TRUE`
- **Snowpipe:** 14-day metadata retention

### Column Position References

- CSV: `$1`, `$2`, `$3` (starts at $1, not $0)
- Semi-structured: `$1:element.nested::TYPE`

### Common Domain 4 Traps

1. **Table stages don't support transformations** - Only named/user stages
2. **PUT/GET require SnowSQL** - Not available in Snowsight
3. **PURGE only removes successful files** - Failed files remain
4. **File format options don't merge** - COPY completely overrides stage
5. **Snowpipe can't be controlled by resource monitors** - It's serverless
6. **AUTO_INGEST only works with external stages**

---

## Domain 5: Data Transformations (20-25%)

### DML Key Facts

- INSERT OVERWRITE: Truncates then inserts (atomic)
- UPDATE in streams: Appears as DELETE + INSERT with METADATA$ISUPDATE = TRUE
- MERGE: Multiple `WHEN MATCHED` AND multiple `WHEN NOT MATCHED` clauses allowed (clause without AND condition must be last of its type)
- Stream offset: Advances ONLY when DML consuming stream commits

### Aggregate Function Behaviors

| Function | NULL Handling |
|----------|---------------|
| COUNT(*) | Includes NULLs |
| COUNT(column) | Excludes NULLs |
| AVG | Ignores NULLs in both numerator AND denominator |
| APPROX_COUNT_DISTINCT | ~1.6% error (HyperLogLog) |
| LISTAGG | Ignores NULLs, returns STRING |
| ARRAY_AGG | Preserves NULLs, returns ARRAY |

### Window Function Rankings

| Function | Tie Handling |
|----------|--------------|
| RANK() | Skips after ties (1, 1, 3) |
| DENSE_RANK() | No skip (1, 1, 2) |
| ROW_NUMBER() | Arbitrary order for ties |

### String Function Indexing

| Function | Indexing |
|----------|----------|
| SUBSTR position | 1-based |
| SPLIT_PART | 1-based |
| SPLIT array | 0-based |
| ARRAY indexing | 0-based |

### NULL Gotchas

| Expression | Result |
|------------|--------|
| NOT IN with NULL in subquery | Returns NO rows |
| CASE WHEN x = NULL | Never TRUE (use IS NULL) |
| CONCAT with NULL | Treats NULL as empty string (`CONCAT('hi', NULL)` = `'hi'`) |
| `\|\|` with NULL | Propagates NULL (`'hi' \|\| NULL` = `NULL`) |
| CONCAT_WS with NULL | Skips NULLs (use this to ignore NULLs) |
| DECODE with NULL | CAN match NULL values |

### Stored Procedures vs UDFs

| Feature | Procedures | UDFs |
|---------|------------|------|
| Invocation | CALL | SELECT/expressions |
| Return value | Optional | Required |
| DDL support | Yes | No |
| Execute as | OWNER or CALLER | OWNER (default) or CALLER |
| Data Sharing | Cannot share | SQL/JS only |

### Transaction Behavior

- **AUTOCOMMIT:** ON by default (each statement auto-commits)
- **DDL statements:** Auto-commit IMMEDIATELY (cannot rollback)
- **Isolation level:** READ COMMITTED only (no SERIALIZABLE)
- **Streams:** Use REPEATABLE READ within transaction

### Semi-Structured Access

```sql
-- First level (colon)
col:element

-- Nested (dot)
col:level1.level2

-- Special characters (bracket)
col['user-id']

-- Array (zero-based)
col:array[0]
```

### FLATTEN Key Facts

- `OUTER => TRUE`: Like LEFT OUTER JOIN (preserves empty arrays)
- Output columns: SEQ, KEY, PATH, INDEX, VALUE, THIS
- `RECURSIVE => TRUE`: Flattens all nested levels
- Requires LATERAL keyword for table references

### Common Domain 5 Traps

1. **NOT IN with NULL returns no rows** - Use NOT EXISTS instead
2. **LAST_VALUE needs proper window frame** - Add `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`
3. **AVG doesn't count NULLs as zeros** - Ignores them completely
4. **DDL auto-commits inside transactions** - Cannot rollback DDL
5. **Stream offset only advances on committed DML**
6. **UDFs cannot perform DDL** - Only procedures can

---

## Domain 6: Data Protection & Sharing (5-10%)

### Time Travel vs Fail-safe

| Feature | Time Travel | Fail-safe |
|---------|-------------|-----------|
| Duration | 0-90 days (configurable) | 7 days (fixed) |
| User access | YES | NO (Snowflake only) |
| Self-service | YES (UNDROP, CLONE AT) | Contact support |
| Table types | All | Permanent only |
| Sequence | First | After Time Travel ends |

### Zero-Copy Cloning

- **Initial storage cost:** ZERO (metadata only)
- **Storage added:** When data is modified (new micro-partitions)
- **Recursive:** Database clone includes all schemas, tables, and child objects
- **Cloned tasks:** SUSPENDED by default
- **Cloned dynamic tables:** SUSPENDED
- **Cloned pipes (external stages):** State = STOPPED_CLONED
- **Cloned streams:** Offset NOT cloned (start fresh)
- **Internal named stages / user stages:** NOT cloned
- **Roles, grants, privileges:** CANNOT be cloned
- **Cloned tables:** Inherit clustering key metadata
- **COPY GRANTS:** Copies privileges EXCEPT OWNERSHIP

### Secure Views

- **Purpose:** Hide view definition and internal data from consumers
- **Required for data sharing** -- only secure views/UDFs can be shared
- **Created with:** `CREATE SECURE VIEW` or `ALTER VIEW ... SET SECURE`
- **Performance tradeoff:** Optimizer cannot push predicates through secure views (may scan more data)
- **Internal optimizations hidden:** Query profile shows less detail for secure view queries
- **Secure materialized views** also available (Enterprise+)

**Trap:** Secure views bypass some optimizer optimizations, so they can be slower than regular views. Use them only when data privacy requires it (sharing, row-level security).

### Data Sharing Architecture

- Data NEVER copied to consumer account
- Consumer pays ZERO for storage (only compute)
- Provider pays ALL storage costs
- Real-time access (changes immediately visible)
- Read-only for consumers
- One USAGE database per share (but secure views can join data from multiple databases via REFERENCE_USAGE)

### Functions in Shared Data

| Function | In Shared Data |
|----------|----------------|
| CURRENT_ACCOUNT() | Works (use for account-level filtering) |
| CURRENT_ROLE() | **Causes object to FAIL** (do not use) |
| CURRENT_USER() | **Causes object to FAIL** (do not use) |

### Reader Accounts (Managed)

- Created/owned by PROVIDER
- Provider PAYS all compute costs
- Can ONLY receive from ONE provider
- Maximum 20 per provider
- Cannot INSERT/UPDATE/DELETE
- Cannot share further

### Masking vs Row Access Policies

| Policy | What It Does | Returns |
|--------|--------------|---------|
| Masking | Transforms column values | Same data type |
| Row Access | Filters entire rows | BOOLEAN |

**Execution order:** Row Access first, then Masking

### Replication & Failover

| Feature | Edition |
|---------|---------|
| Database replication | All |
| Failover groups | Business Critical+ |

**RPO Calculation:** Max data loss = 2x replication interval

### Common Domain 6 Traps

1. **Fail-safe is always 7 days** - Non-configurable
2. **Users cannot query Fail-safe** - Only Snowflake Support
3. **UNDROP only works during Time Travel** - Not Fail-safe
4. **Transient tables have NO Fail-safe**
5. **Cross-region sharing requires replication** - Data IS copied
6. **CURRENT_ROLE()/CURRENT_USER() cause failures in shared data** - Use CURRENT_ACCOUNT() instead
7. **Time Travel and Fail-safe are sequential** - Not overlapping

---

## Cross-Domain: Key Topics Often Tested

### Streams & Tasks

**Stream Types:**

| Type | Tracks | Best For |
|------|--------|----------|
| Standard (Default) | INSERT, UPDATE, DELETE | Full CDC on tables/views |
| Append-only | INSERT only | High-performance, ignore deletes |
| Insert-only | INSERT only | External tables, directory tables |

**Stream Metadata Columns:** METADATA$ACTION, METADATA$ISUPDATE, METADATA$ROW_ID

**Stream Traps:**
- Stores only an offset, NOT a physical copy of data
- Becomes **stale** if offset falls outside Time Travel retention period
- CREATE OR REPLACE TABLE makes the stream stale
- Failed/rolled-back DML does NOT advance offset
- Multiple streams on same object track independently
- `SYSTEM$STREAM_HAS_DATA()` checks for unconsumed changes

**Task Graphs (DAGs):**
- Root task defines the schedule; children use `AFTER parent_task`
- Finalizer task: `FINALIZE = root_task` (runs after all tasks complete/fail)
- Max 1,000 tasks per graph, 100 parents/children per task
- ALL tasks in DAG must have same owner role and same schema
- Created in SUSPENDED state; use `ALTER TASK ... RESUME`
- `SYSTEM$TASK_DEPENDENTS_ENABLE('root_task')` enables entire DAG
- Privileges: CREATE TASK (schema), EXECUTE TASK (account), EXECUTE MANAGED TASK (serverless), OPERATE (resume/suspend)

### Dynamic Tables

| Concept | Detail |
|---------|--------|
| Purpose | Declarative data pipelines (define result as SQL query) |
| Target lag | How fresh data should be (e.g., '5 minutes') |
| DOWNSTREAM lag | Snowflake determines schedule from downstream consumers |
| Refresh modes | Incremental (changed data only) or Full |
| DML support | **No** (query-only definition) |
| Query rewrite | **No** (must reference directly, unlike materialized views) |
| Joins | **Yes** (unlike materialized views) |
| Edition | Standard+ (all editions) |
| Cloning | Cloned dynamic tables start SUSPENDED |

**Dynamic Tables vs Materialized Views vs Streams+Tasks:**

| Aspect | Dynamic Tables | Materialized Views | Streams+Tasks |
|--------|---------------|--------------------|---------------|
| Approach | Declarative | Automatic | Imperative |
| Joins | Yes | No (single table) | Yes |
| Query rewrite | No | Yes | No |
| DML in definition | No | No | Yes |
| Best for | Multi-stage ETL | Repeated aggregations | Complex procedural logic |

### Resource Monitors

| Property | Detail |
|----------|--------|
| Creation | ACCOUNTADMIN only |
| Assignment | Account-level OR individual warehouses |
| Per warehouse | Each warehouse: only ONE monitor |
| Serverless | CANNOT monitor serverless features (Snowpipe, auto-clustering, etc.) |

**Trigger Actions:** Notify (up to 5), Notify & Suspend (1), Notify & Suspend Immediately (1)

**Traps:**
- Account-level monitor does NOT override warehouse-level monitors
- Cloud services credits ARE counted toward monitor limits
- Suspension is NOT instantaneous (additional credits may be consumed)

### Account Usage vs Information Schema

| Aspect | ACCOUNT_USAGE | INFORMATION_SCHEMA |
|--------|---------------|-------------------|
| Location | SNOWFLAKE shared database | Each database |
| Data latency | 45 min to 3 hours | Real-time |
| Retention | 365 days | 7 days to 6 months |
| Dropped objects | Included | NOT included |
| Scope | Entire account | Single database |
| Access | IMPORTED PRIVILEGES on SNOWFLAKE DB | Any role with DB access |

**Key ACCOUNT_USAGE views:** QUERY_HISTORY, LOGIN_HISTORY, WAREHOUSE_METERING_HISTORY, STORAGE_USAGE, ACCESS_HISTORY (Enterprise+), TASK_HISTORY, COPY_HISTORY, TAG_REFERENCES

### Directory Tables

- **Purpose:** Catalog of staged files with metadata (filename, size, last modified, etc.)
- **Enabled on a stage:** `ALTER STAGE my_stage SET DIRECTORY = (ENABLE = TRUE)`
- **Queried with:** `SELECT * FROM DIRECTORY(@my_stage)`
- **Must be refreshed** manually (`ALTER STAGE my_stage REFRESH`) or auto-refreshed with event notifications
- **Use case:** File-level inventory of stage contents, useful with external tables and Snowpipe
- **Stream support:** Insert-only streams can track new files added to directory tables

### External Tables

| Property | Detail |
|----------|--------|
| Data location | External stage (S3, Azure, GCS) |
| Read/write | **Read-only** (no DML) |
| Storage cost | Zero Snowflake storage |
| Performance | Slower than native tables |
| Built-in columns | VALUE (VARIANT), METADATA$FILENAME |
| Partitioning | Auto or user-defined (strongly recommended) |
| Delta Lake | Supported via TABLE_FORMAT = DELTA |

### Hybrid Tables

| Property | Detail |
|----------|--------|
| Purpose | Low-latency OLTP workloads |
| PRIMARY KEY | **REQUIRED** (enforced) |
| Constraints | UNIQUE and FOREIGN KEY are **enforced** |
| Locking | Row-level locking |
| Result cache | Hybrid table queries do **NOT** use result cache |

**Trap:** Standard Snowflake tables have informational-only constraints (except NOT NULL). Hybrid tables actually enforce them.

### Snowflake Cortex AI

| Function | Purpose |
|----------|---------|
| AI_COMPLETE | Generate text completions using LLMs |
| AI_CLASSIFY | Classify text into categories |
| AI_SENTIMENT | Analyze sentiment (-1 to 1) |
| AI_SUMMARIZE | Summarize text content |
| AI_TRANSLATE | Translate between languages |
| AI_EMBED | Generate vector embeddings |
| AI_EXTRACT | Extract answers from documents |

- Called as SQL functions: `SELECT AI_COMPLETE('model', 'prompt')`
- Access via SNOWFLAKE.CORTEX_USER database role (granted to PUBLIC by default)
- Data stays within Snowflake's governance boundary

### Snowpark & Streamlit

**Snowpark:**
- Client library for Python, Java, Scala transformations
- DataFrame API (similar to PySpark/Pandas)
- **Pushdown execution:** All processing runs in Snowflake (not on client)
- **Lazy evaluation:** DataFrames not executed until action called (collect(), show())

**Streamlit:**
- Build interactive data apps directly on Snowflake
- Python-based, runs within Snowflake (Streamlit in Snowflake)

### Marketplace & Data Exchange

| Concept | Description |
|---------|-------------|
| **Share** | Low-level mechanism (CREATE SHARE, GRANT to accounts) |
| **Listing** | Enhanced sharing with metadata, descriptions, pricing |
| **Marketplace** | Public storefront for listings |
| **Data Exchange** | Private, invite-only hub for select group of members |

**Listing Types:** Free, Limited trial (1-90 days), Paid, Private

**Data Exchange:** Must be requested, admin manages membership, members can be providers/consumers/both

### Object Tagging & Classification

- Tags are schema-level objects (key = string, value = string)
- **Tag inheritance:** Tags on database/schema inherited by child objects
- **Tag-based masking:** Assign masking policy to tag, then tag columns -- automatic protection
- **Classification:** Automatic sensitive data detection (PII) via system tags
- System tags: SNOWFLAKE.CORE.SEMANTIC_CATEGORY, SNOWFLAKE.CORE.PRIVACY_CATEGORY

### Sequences

- Generate unique numbers across sessions (NOT guaranteed contiguous)
- `currval` is NOT supported in Snowflake
- Multiple `seq.NEXTVAL` references in same query return DIFFERENT values
- Schema-level object (reusable across tables), vs AUTOINCREMENT (column-level, one table)

### UDFs vs UDTFs vs External Functions

| Feature | UDF | UDTF | External Function |
|---------|-----|------|-------------------|
| Returns | Scalar value | Table (rows) | Scalar value |
| SQL syntax | SELECT udf(col) | TABLE(udtf(col)) | SELECT ext_func(col) |
| Code location | Inside Snowflake | Inside Snowflake | Outside (remote service) |
| Languages | SQL, JS, Python, Java, Scala | SQL, JS, Python, Java, Scala | Any (via proxy) |
| Sharing | SQL/JS only | SQL/JS only | No |

---

## Quick Reference: SQL Commands

### Time Travel
```sql
SELECT * FROM table AT(OFFSET => -3600);
SELECT * FROM table BEFORE(STATEMENT => 'query_id');
CREATE TABLE clone CLONE original AT(TIMESTAMP => '2024-01-01 00:00:00');
UNDROP TABLE table_name;
```

### Data Sharing
```sql
CREATE SHARE share_name;
GRANT USAGE ON DATABASE db TO SHARE share_name;
ALTER SHARE share_name ADD ACCOUNTS = org.account;
CREATE DATABASE shared_db FROM SHARE provider.share_name;
```

### Access Control
```sql
GRANT SELECT ON TABLE t TO ROLE analyst;
GRANT ROLE analyst TO USER john;
GRANT ROLE junior TO ROLE senior;
GRANT SELECT ON FUTURE TABLES IN SCHEMA s TO ROLE analyst;
USE SECONDARY ROLES ALL;
```

### Performance
```sql
ALTER SESSION SET USE_CACHED_RESULT = FALSE;
SELECT SYSTEM$CLUSTERING_DEPTH('table');
SELECT SYSTEM$CLUSTERING_INFORMATION('table');
ALTER WAREHOUSE wh SET ENABLE_QUERY_ACCELERATION = TRUE;
```

### Masking
```sql
CREATE MASKING POLICY mask AS (val STRING) RETURNS STRING ->
  CASE WHEN CURRENT_ROLE() = 'ADMIN' THEN val ELSE '***' END;
ALTER TABLE t MODIFY COLUMN col SET MASKING POLICY mask;
```

### Streams & Tasks
```sql
CREATE STREAM my_stream ON TABLE my_table;
CREATE STREAM my_stream ON TABLE my_table APPEND_ONLY = TRUE;
SELECT SYSTEM$STREAM_HAS_DATA('my_stream');

CREATE TASK my_task WAREHOUSE = wh SCHEDULE = 'USING CRON 0 * * * * UTC'
  AS INSERT INTO target SELECT * FROM my_stream;
CREATE TASK child_task WAREHOUSE = wh AFTER parent_task AS ...;
CREATE TASK finalizer WAREHOUSE = wh FINALIZE = root_task AS ...;
ALTER TASK my_task RESUME;
SELECT SYSTEM$TASK_DEPENDENTS_ENABLE('root_task');
EXECUTE TASK root_task;  -- manual test run
```

### Dynamic Tables
```sql
CREATE DYNAMIC TABLE my_dt TARGET_LAG = '5 minutes' WAREHOUSE = wh
  AS SELECT category, COUNT(*) FROM raw GROUP BY category;
ALTER DYNAMIC TABLE my_dt REFRESH;
ALTER DYNAMIC TABLE my_dt SUSPEND;
```

### Resource Monitors
```sql
CREATE RESOURCE MONITOR my_monitor WITH CREDIT_QUOTA = 1000
  FREQUENCY = MONTHLY START_TIMESTAMP = IMMEDIATELY
  TRIGGERS ON 75 PERCENT DO NOTIFY
           ON 90 PERCENT DO SUSPEND
           ON 100 PERCENT DO SUSPEND_IMMEDIATELY;
ALTER WAREHOUSE wh SET RESOURCE_MONITOR = my_monitor;
ALTER ACCOUNT SET RESOURCE_MONITOR = my_monitor;
```

### Object Tagging
```sql
CREATE TAG department ALLOWED_VALUES 'HR', 'Finance', 'Engineering';
ALTER TABLE t SET TAG department = 'HR';
SELECT SYSTEM$GET_TAG('department', 'my_table', 'TABLE');
```

### External Tables
```sql
CREATE EXTERNAL TABLE ext (
  col1 VARCHAR AS (VALUE:c1::VARCHAR)
) LOCATION = @ext_stage/path/ AUTO_REFRESH = TRUE
  FILE_FORMAT = (TYPE = PARQUET);
```

### Cortex AI
```sql
SELECT AI_COMPLETE('llama3.1-70b', 'Summarize: ' || text) FROM t;
SELECT AI_SENTIMENT(review_text) FROM reviews;
SELECT AI_TRANSLATE(description, 'en', 'fr') FROM products;
```

### Account Usage vs Information Schema
```sql
-- Account Usage (latency, 365-day retention)
SELECT * FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY
WHERE START_TIME > DATEADD(day, -7, CURRENT_TIMESTAMP());

-- Information Schema (real-time, limited retention)
SELECT * FROM TABLE(INFORMATION_SCHEMA.QUERY_HISTORY(
  DATE_RANGE_START => DATEADD(hour, -1, CURRENT_TIMESTAMP())));
```

---

## Exam Day Strategy

### Exam Format
- **Scoring:** Scaled score of 750/1000 to pass (not a simple 75% raw score)
- **Questions:** 100 | **Time:** 115 minutes (~69 seconds per question)
- **Retake policy:** 7-day wait between attempts, max 4 per 12 months, $175 each
- You do NOT need to pass each domain individually -- overall score determines outcome

### Time Management
- Flag difficult questions and return later
- Don't spend more than 2 minutes on any single question
- ~25-30% of questions are hard (combine multiple concepts)
- Questions are scenario-based, not rote memorization

### Question Patterns to Watch
1. **"Which edition..."** - Know feature/edition matrix
2. **"Which role can..."** - Memorize role hierarchy
3. **"What happens when..."** - Understand cache invalidation, failover, suspend behavior
4. **"Which is TRUE/FALSE..."** - Watch for absolute statements
5. **"Choose TWO / Select ALL..."** - Multiple caching layers, auth methods, edition features
6. **"Which is the best approach..."** - Dynamic tables vs streams+tasks, COPY vs Snowpipe

### Last-Minute Review Priorities
1. Role hierarchy and privileges (including ORGADMIN separation)
2. Time Travel/Fail-safe by edition and table type
3. Three-layer architecture and caching (result cache conditions)
4. Loading methods and COPY options (14-day vs 64-day metadata)
5. NULL handling in functions (`||` propagates NULL, `CONCAT` treats NULL as empty string!)
6. Edition feature matrix (clustering = all editions, multi-cluster = Enterprise+)
7. Streams & Tasks (stream types, staleness, DAG limits)
8. Dynamic Tables vs Materialized Views vs Streams+Tasks
9. Data Sharing (CURRENT_ACCOUNT works, CURRENT_ROLE/USER cause failures)
10. Resource monitors (cannot control serverless)

### COF-C03 Transition Notice

The **COF-C02 exam is being retired** and replaced by **COF-C03** on **February 16, 2026**. Key changes:
- Shift from knowledge to practical, hands-on experience
- New topic: "Establish Snowflake connectivity" (drivers, connectors, SnowCD)
- Stronger emphasis on AI/ML (Cortex, Snowpark, Streamlit)
- Candidates should have 6+ months of Snowflake experience

---

*Good luck on your SnowPro Core certification exam!*
