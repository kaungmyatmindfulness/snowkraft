# Domain 1: Snowflake AI Data Cloud Features & Architecture
## Part 3: Database Objects

**Exam Weight**: Domain 1 represents 25-30% of the SnowPro Core (COF-C02) exam

---

## Section Overview

This section covers Snowflake's database objects, including the object hierarchy, table types, view types, and naming conventions. Understanding these concepts is fundamental to working with data in Snowflake and represents a significant portion of exam questions.

---

## 1. Snowflake Object Hierarchy

### Learning Objectives
- Understand the complete Snowflake object hierarchy from Organization to schema-level objects
- Identify which objects exist at each level
- Understand the relationship between containers and contained objects

### Key Concepts

**Object Hierarchy Overview**

Snowflake organizes objects in a hierarchical structure. Each level contains and manages the objects below it:

```
ORGANIZATION (Optional - Enterprise+ Edition)
    |
    +-- ACCOUNT (Billable unit)
            |
            +-- DATABASE (Container for schemas)
                    |
                    +-- SCHEMA (Container for objects)
                            |
                            +-- TABLES
                            +-- VIEWS
                            +-- STAGES
                            +-- FILE FORMATS
                            +-- SEQUENCES
                            +-- PIPES
                            +-- STREAMS
                            +-- TASKS
                            +-- PROCEDURES
                            +-- FUNCTIONS
                            +-- etc.
```

**Hierarchy Diagram (Text-Based)**

```
+-------------------------------------------------------------------+
|                         ORGANIZATION                               |
|  (Optional - manages multiple accounts, Enterprise+ Edition)      |
+-------------------------------------------------------------------+
                              |
        +---------------------+---------------------+
        |                     |                     |
+---------------+     +---------------+     +---------------+
|   ACCOUNT 1   |     |   ACCOUNT 2   |     |   ACCOUNT N   |
| (Prod - AWS)  |     | (Dev - Azure) |     | (Test - GCP)  |
+---------------+     +---------------+     +---------------+
        |
        +-- Virtual Warehouses (Account-level compute)
        +-- Users & Roles (Account-level security)
        +-- Resource Monitors (Account-level governance)
        +-- Network Policies (Account-level network)
        |
+-------+-------+-------+
|               |       |
+----------+ +----------+ +----------+
| DATABASE | | DATABASE | | DATABASE |
|   (RAW)  | |  (CURATED)| | (SANDBOX)|
+----------+ +----------+ +----------+
      |
      +-- SCHEMA (PUBLIC - default)
      +-- SCHEMA (STAGING)
      +-- SCHEMA (ANALYTICS)
            |
            +-- Tables, Views, Stages, etc.
```

**Account-Level Objects**
- Virtual Warehouses
- Users and Roles
- Resource Monitors
- Network Policies
- Shares
- Storage Integrations
- Databases

**Database-Level Objects**
- Schemas

**Schema-Level Objects**
- Tables (all types)
- Views (all types)
- Stages (named stages)
- File Formats
- Sequences
- Pipes
- Streams
- Tasks
- User-Defined Functions (UDFs)
- Stored Procedures

### Important Terms/Definitions

| Term | Definition |
|------|------------|
| **Organization** | Top-level container that links accounts belonging to the same business entity. Enables centralized account management. |
| **Account** | The primary Snowflake entity. Contains all databases, warehouses, and users. Represents a billable unit. |
| **Database** | A logical container for schemas. All data in Snowflake is maintained in databases. |
| **Schema** | A logical grouping of database objects. Each database can contain multiple schemas. |
| **PUBLIC Schema** | The default schema created automatically in every new database. |
| **INFORMATION_SCHEMA** | A read-only schema in every database containing metadata views about objects in that database. |

### Exam Tips
- Snowflake places NO hard limits on the number of databases, schemas, or objects you can create
- Every database automatically includes the INFORMATION_SCHEMA schema
- The PUBLIC schema is created by default in new databases
- Organizations require Enterprise Edition or higher
- Virtual Warehouses are account-level objects, not database-level

---

## 2. Table Types

### Learning Objectives
- Understand all Snowflake table types and their use cases
- Know the differences in Time Travel and Fail-safe between table types
- Identify when to use each table type
- Understand storage implications for each type

### Key Concepts

**Overview of Table Types**

Snowflake supports multiple table types, each designed for specific use cases:

1. **Permanent Tables** (default)
2. **Transient Tables**
3. **Temporary Tables**
4. **External Tables**
5. **Dynamic Tables**
6. **Hybrid Tables**
7. **Iceberg Tables**

### Permanent, Transient, and Temporary Tables

**Permanent Tables**
- Default table type when no keyword is specified
- Full Time Travel support (up to 90 days with Enterprise Edition)
- 7-day Fail-safe period for disaster recovery
- Highest storage costs due to Time Travel and Fail-safe data retention

**Transient Tables**
- Created using the `TRANSIENT` keyword
- Persist until explicitly dropped
- Available to all users with appropriate privileges
- NO Fail-safe period (key difference from permanent)
- Time Travel limited to 0 or 1 day
- Lower storage costs than permanent tables
- Ideal for transitory data that doesn't need disaster recovery protection

**Temporary Tables**
- Created using the `TEMPORARY` or `TEMP` keyword
- Exist only for the duration of the session that created them
- NOT visible to other users or sessions
- Do NOT require CREATE TABLE privilege on the schema
- NO Fail-safe period
- Time Travel limited to 0 or 1 day (or remainder of session)
- Can have the same name as a permanent table (shadows the permanent table)

### Table Type Comparison Chart

| Feature | Permanent (Standard) | Permanent (Enterprise+) | Transient | Temporary |
|---------|---------------------|------------------------|-----------|-----------|
| **Persistence** | Until dropped | Until dropped | Until dropped | Session only |
| **Visibility** | All users with privileges | All users with privileges | All users with privileges | Current session only |
| **Time Travel (days)** | 0-1 | 0-90 | 0-1 | 0-1 (or session end) |
| **Fail-safe (days)** | 7 | 7 | 0 (None) | 0 (None) |
| **Cloning Options** | All table types | All table types | Transient, Temporary | Transient, Temporary |
| **Storage Cost** | Highest | Highest | Medium | Low (session-bound) |
| **Use Case** | Production data | Production data | ETL staging, development | Session-specific work |

```sql
-- Creating different table types
CREATE TABLE my_permanent_table (id INT, name VARCHAR);  -- Default: Permanent

CREATE TRANSIENT TABLE my_transient_table (id INT, name VARCHAR);

CREATE TEMPORARY TABLE my_temp_table (id INT, name VARCHAR);
-- or
CREATE TEMP TABLE my_temp_table (id INT, name VARCHAR);
```

**Transient Databases and Schemas**
- You can create transient databases and schemas
- All tables created within a transient schema are automatically transient
- All schemas created within a transient database are automatically transient

```sql
CREATE TRANSIENT DATABASE my_staging_db;
CREATE TRANSIENT SCHEMA my_staging_schema;
```

### External Tables

**Key Characteristics**
- Query data stored in external cloud storage (S3, Azure Blob, GCS)
- Data remains in your cloud storage, not loaded into Snowflake
- **Read-only** - cannot perform DML operations (INSERT, UPDATE, DELETE)
- Support for partitioning to improve query performance
- Metadata stored in Snowflake, data stored externally

**Use Cases**
- Query data lake files without loading
- Access historical archives
- Query streaming data landing zones
- Data sharing across platforms

```sql
CREATE EXTERNAL TABLE my_ext_table
  WITH LOCATION = @my_stage/path/
  FILE_FORMAT = (TYPE = PARQUET)
  AUTO_REFRESH = TRUE;
```

**External Table Features**
- Support for multiple file formats (Parquet, ORC, Avro, JSON, CSV)
- Automatic or manual metadata refresh
- Partition columns for query optimization
- Materialized views can be created on external tables for better performance

### Dynamic Tables

**Key Characteristics**
- Automatically refresh based on a defined query and target lag
- Simplify data transformation pipelines
- No manual scheduling or update management required
- Use declarative approach - define the result, not the process

**How Dynamic Tables Work**
1. Define a query that specifies how data should be transformed
2. Set a target lag (how fresh data should be)
3. Snowflake automatically refreshes the table to maintain the target lag

**Target Lag Options**
- Time-based (e.g., `TARGET_LAG = '1 minute'`, `'5 minutes'`, `'1 hour'`)
- DOWNSTREAM - refreshes based on downstream table dependencies

```sql
CREATE DYNAMIC TABLE my_dynamic_table
  TARGET_LAG = '1 minute'
  WAREHOUSE = my_wh
  AS
  SELECT customer_id, SUM(amount) as total
  FROM orders
  GROUP BY customer_id;
```

**Use Cases**
- Data transformation pipelines
- Slowly Changing Dimensions (SCD)
- Incremental aggregations
- Streaming to batch transitions

### Hybrid Tables

**Key Characteristics**
- Optimized for low-latency, high-throughput transactional workloads
- Row-based storage (unlike standard columnar tables)
- Enforce PRIMARY KEY, UNIQUE, and FOREIGN KEY constraints
- Support ACID transactions with row-level locking
- Combine with standard tables for hybrid transactional-analytical workloads

**Key Differences from Standard Tables**
| Feature | Standard Tables | Hybrid Tables |
|---------|-----------------|---------------|
| Storage | Columnar | Row-based (primary) + Columnar (async) |
| Constraints | Not enforced | Enforced (PK, UNIQUE, FK) |
| Locking | Partition-level | Row-level |
| Best for | Analytics, OLAP | Transactions, OLTP |
| Latency | Higher | Lower |

```sql
CREATE HYBRID TABLE my_hybrid_table (
  id INT PRIMARY KEY,
  name VARCHAR NOT NULL,
  email VARCHAR UNIQUE,
  department_id INT,
  FOREIGN KEY (department_id) REFERENCES departments(id)
);
```

**Limitations**
- Cannot be temporary or transient
- Cannot be created in transient databases or schemas
- Larger storage footprint than standard tables

### Iceberg Tables

**Key Characteristics**
- Use Apache Iceberg open table format
- Store data in Parquet files in external cloud storage (external volume)
- Enable interoperability with other compute engines (Spark, Trino, etc.)
- Two catalog options:
  - **Snowflake-managed**: Full Snowflake platform support
  - **External catalog**: Limited support, read from external catalogs

**Benefits**
- Open table format - no vendor lock-in
- Query from multiple compute engines
- Full Snowflake DML support (for Snowflake-managed)
- Time Travel support (for Snowflake-managed)

```sql
-- Create external volume first
CREATE EXTERNAL VOLUME my_ext_vol
  STORAGE_LOCATIONS = (
    (NAME = 's3_loc' STORAGE_PROVIDER = 'S3'
     STORAGE_AWS_ROLE_ARN = 'arn:aws:iam::...'
     STORAGE_BASE_URL = 's3://my-bucket/iceberg/')
  );

-- Create Iceberg table
CREATE ICEBERG TABLE my_iceberg_table (
  id INT,
  name VARCHAR,
  created_at TIMESTAMP
)
  CATALOG = 'SNOWFLAKE'
  EXTERNAL_VOLUME = 'my_ext_vol'
  BASE_LOCATION = 'my_table/';
```

**Storage Note**
- Data and metadata stored in your external cloud storage
- No Snowflake storage costs for the table data
- Cloud provider bills you for storage
- NO Fail-safe for Iceberg tables

### Important Terms/Definitions

| Term | Definition |
|------|------------|
| **Micro-partition** | Contiguous unit of storage (50-500 MB uncompressed) used by Snowflake for automatic data organization |
| **Time Travel** | Feature allowing access to historical data at any point within the retention period |
| **Fail-safe** | 7-day period for disaster recovery by Snowflake (permanent tables only) |
| **Target Lag** | The maximum acceptable staleness for a dynamic table's data |
| **External Volume** | Named account-level object that connects Snowflake to external cloud storage for Iceberg tables |
| **Row Store** | Primary storage format for hybrid tables, optimized for transactional access |

### Exam Tips

- **Default table type is permanent** - if no keyword specified, it's permanent
- **Fail-safe is only for permanent tables** - transient and temporary have NO Fail-safe
- **Transient tables reduce storage costs** - no Fail-safe storage
- **Temporary tables are session-scoped** - dropped when session ends
- **External tables are read-only** - no INSERT, UPDATE, DELETE
- **Dynamic tables eliminate scheduling** - refresh is automatic based on target lag
- **Hybrid tables enforce constraints** - PRIMARY KEY, UNIQUE, FOREIGN KEY
- **Iceberg tables use external storage** - no Snowflake storage costs
- You cannot convert between table types directly (permanent to transient or vice versa) - must recreate or clone

---

## 3. View Types

### Learning Objectives
- Understand the three types of views in Snowflake
- Know when to use each view type
- Understand security implications of secure vs. non-secure views
- Understand maintenance and cost implications of materialized views

### Key Concepts

**Overview of View Types**

Snowflake supports three types of views:

1. **Standard Views** (Non-materialized)
2. **Secure Views**
3. **Materialized Views**

### Standard Views (Non-materialized)

**Key Characteristics**
- A named definition of a query
- Results are computed at query time
- No data storage - just stores the query definition
- Can be based on any valid SELECT statement
- Can include joins, subqueries, aggregations, etc.

```sql
CREATE VIEW sales_summary AS
SELECT
  region,
  product_category,
  SUM(amount) as total_sales
FROM sales
GROUP BY region, product_category;
```

**View Definition Visibility**
- For non-secure views, the definition is visible to users with SELECT privilege
- Can be seen via SHOW VIEWS, GET_DDL, Information Schema

### Secure Views

**Key Characteristics**
- Hide the view definition from unauthorized users
- Prevent internal optimizations that could expose underlying data
- Definition visible only to view owner and users with OWNERSHIP privilege
- Required for Secure Data Sharing

**Why Use Secure Views?**
1. **Hide internal logic** - prevent exposure of business logic or table structures
2. **Prevent data leakage** - internal optimizations in non-secure views could expose filtered data
3. **Data Sharing requirement** - secure views are required when sharing data

```sql
CREATE SECURE VIEW customer_data AS
SELECT customer_id, name, email
FROM customers
WHERE region = CURRENT_USER();

-- Convert existing view to secure
ALTER VIEW my_view SET SECURE;

-- Convert secure view back to non-secure
ALTER VIEW my_view UNSET SECURE;
```

**Secure View Trade-offs**
| Aspect | Secure View | Non-Secure View |
|--------|-------------|-----------------|
| Definition visibility | Owner only | All with SELECT |
| Query optimization | Limited | Full |
| Query performance | May be slower | Faster |
| Query Profile details | Hidden | Visible |
| Data Sharing | Supported | Not for sharing |

**When to Use Secure Views**
- When view definition contains sensitive business logic
- When using row-level security based on user context
- When sharing data with other accounts
- When underlying table structure should be hidden

**When NOT to Use Secure Views**
- Views created purely for query convenience
- When performance is critical and data security is not a concern
- Internal views where all users can see underlying tables

### Materialized Views

**Key Characteristics**
- Pre-computed and stored query results
- Automatically maintained by Snowflake background services
- Faster query performance than base tables or standard views
- **Requires Enterprise Edition or higher**
- Incur storage and compute costs for maintenance

```sql
CREATE MATERIALIZED VIEW mv_sales_by_region AS
SELECT
  region,
  DATE_TRUNC('month', sale_date) as month,
  SUM(amount) as total_sales,
  COUNT(*) as transaction_count
FROM sales
GROUP BY region, DATE_TRUNC('month', sale_date);
```

**How Materialized Views Work**
1. Query results are computed and stored
2. Background service automatically updates when base data changes
3. Query optimizer can automatically use MVs even when querying base table
4. Always current - Snowflake ensures data is up-to-date

**Materialized View Benefits**
- Pre-computed results for faster queries
- Automatic transparent maintenance
- Can be used implicitly by query optimizer
- Support clustering for additional performance
- Can be created on external tables for improved external data query performance

**Materialized View Costs**
- **Storage**: Results are stored, consuming storage space
- **Maintenance compute**: Background refresh consumes serverless credits
- **Initial creation**: First computation uses warehouse resources

**When to Create Materialized Views**
- Query results are needed frequently
- Query is resource-intensive (complex aggregations, many joins)
- Base table data changes relatively infrequently compared to query frequency
- External tables need better query performance

**Materialized View Limitations**
- Cannot be based on other views (only on base tables)
- Limited SQL constructs supported
- Cannot include:
  - Non-deterministic functions (CURRENT_TIMESTAMP, RANDOM, etc.)
  - User-defined functions (UDFs)
  - Window functions with ORDER BY
  - GROUP BY with HAVING

### View Type Comparison Chart

| Feature | Standard View | Secure View | Materialized View |
|---------|--------------|-------------|-------------------|
| **Data Storage** | None | None | Yes - stores results |
| **Query Performance** | Same as query | May be slower | Faster |
| **Maintenance** | None | None | Automatic |
| **Storage Cost** | None | None | Yes |
| **Compute Cost** | At query time | At query time | Background maintenance |
| **Definition Visible** | Yes | Owner only | Yes |
| **Enterprise Required** | No | No | Yes |
| **Data Sharing Support** | No | Yes | No (directly) |
| **Can be Secure** | N/A (is secure) | Yes | Yes |

### Important Terms/Definitions

| Term | Definition |
|------|------------|
| **View** | A named query definition that presents data from one or more tables |
| **Secure View** | A view that hides its definition and prevents optimization-based data exposure |
| **Materialized View** | A view that pre-computes and stores results for faster query performance |
| **Query Rewrite** | Optimizer feature that automatically substitutes materialized views for base table queries |
| **View Definition** | The SQL SELECT statement that defines what data the view returns |

### Exam Tips

- **Secure views are required for Data Sharing** - you cannot share non-secure views
- **Materialized views require Enterprise Edition** - not available in Standard Edition
- **Secure views may have slower performance** - optimizer cannot use all optimizations
- **Materialized views are automatically maintained** - no manual refresh needed
- **Non-secure views expose their definition** - users with SELECT can see the SQL
- **Secure views hide Query Profile details** - even from the owner
- Both standard and materialized views can be made secure

---

## 4. Micro-Partitions and Columnar Storage

### Learning Objectives
- Understand how Snowflake stores data in micro-partitions
- Know the benefits of columnar storage
- Understand automatic compression and optimization

### Key Concepts

**Micro-Partitions**

Snowflake automatically organizes data into micro-partitions:

- **Size**: 50-500 MB of uncompressed data per micro-partition
- **Automatic**: No user intervention required
- **Immutable**: Micro-partitions are never modified, only created/replaced
- **Columnar**: Data within micro-partitions is stored by column

**Micro-Partition Metadata**

Snowflake maintains metadata for each micro-partition:
- Range of values for each column (min/max)
- Number of distinct values
- NULL count
- Additional properties for query optimization

**Benefits of Micro-Partitioning**

1. **Automatic management** - no manual partitioning required
2. **Fine-grained pruning** - skip irrelevant micro-partitions during queries
3. **Efficient DML** - operations work with individual micro-partitions
4. **No skew** - small uniform partitions prevent data skew issues

**Columnar Storage Benefits**

- Scan only columns needed for the query
- Better compression ratios (similar values together)
- Efficient aggregations on specific columns
- Reduced I/O for typical analytical queries

### Exam Tips

- Micro-partitions are 50-500 MB of **uncompressed** data
- Snowflake automatically chooses compression algorithms per column
- Columnar storage enables efficient column pruning
- Micro-partition metadata enables partition pruning

---

## 5. Object Naming Conventions

### Learning Objectives
- Understand Snowflake object naming rules
- Know when to use quoted identifiers
- Understand fully qualified names

### Key Concepts

**Identifier Rules**

**Unquoted Identifiers**
- Start with a letter (A-Z, a-z) or underscore (_)
- Contain only letters, digits (0-9), underscores (_), and dollar signs ($)
- Stored and resolved as **uppercase** (case-insensitive)
- Maximum 255 characters

```sql
CREATE TABLE MyTable (...)  -- Stored as MYTABLE
SELECT * FROM mytable;       -- Resolves to MYTABLE
SELECT * FROM MYTABLE;       -- Resolves to MYTABLE
```

**Quoted Identifiers (Double Quotes)**
- Can contain any character including spaces and special characters
- **Case-sensitive** - stored exactly as specified
- Must be referenced with exact case in double quotes
- Required for mixed-case names, spaces, or reserved words

```sql
CREATE TABLE "My Table" (...);     -- Stored as "My Table"
SELECT * FROM "My Table";          -- Must use quotes
SELECT * FROM "my table";          -- ERROR - different identifier

CREATE TABLE "Select" (...);       -- Using reserved word
SELECT * FROM "Select";            -- Must use quotes
```

**Fully Qualified Names**

Objects can be referenced using fully qualified names:

```
database_name.schema_name.object_name
```

Examples:
```sql
SELECT * FROM mydb.myschema.mytable;
SELECT * FROM "My DB"."My Schema"."My Table";
```

**Current Context**

When database and schema context is set, you can use short names:
```sql
USE DATABASE mydb;
USE SCHEMA myschema;
SELECT * FROM mytable;  -- Resolves to mydb.myschema.mytable
```

### Important Naming Considerations

| Rule | Unquoted | Quoted |
|------|----------|--------|
| Case sensitivity | Case-insensitive (uppercase) | Case-sensitive |
| Spaces allowed | No | Yes |
| Special characters | Limited (_ and $) | Any character |
| Reserved words | Not allowed | Allowed |
| Numbers at start | Not allowed | Allowed |

### Exam Tips

- Unquoted identifiers are **always stored as uppercase**
- Double-quoted identifiers are **case-sensitive**
- Fully qualified names: `database.schema.object`
- Default schema is PUBLIC if not specified
- INFORMATION_SCHEMA exists in every database

---

## 6. Practice Questions

### Question 1
Which table type does NOT have a Fail-safe period?

- A) Permanent table
- B) Transient table
- C) External table
- D) Both B and C

<details>
<summary>Show Answer</summary>

**Answer: D) Both B and C**

Transient tables and external tables do not have Fail-safe. Temporary tables also lack Fail-safe. Only permanent tables have the 7-day Fail-safe period.

</details>

### Question 2
What is the maximum Time Travel retention period for a permanent table in Enterprise Edition?

- A) 1 day
- B) 7 days
- C) 30 days
- D) 90 days

<details>
<summary>Show Answer</summary>

**Answer: D) 90 days**

Permanent tables in Enterprise Edition (and higher) support up to 90 days of Time Travel. Standard Edition is limited to 1 day.

</details>

### Question 3
Which statement about secure views is TRUE?

- A) Secure views always perform better than non-secure views
- B) Secure view definitions are visible to all users with SELECT privilege
- C) Secure views are required for Secure Data Sharing
- D) Secure views cannot be used with materialized views

<details>
<summary>Show Answer</summary>

**Answer: C) Secure views are required for Secure Data Sharing**

When sharing data with other accounts, secure views are required. Secure views may have reduced performance (due to limited optimizations), and their definitions are hidden from non-owners.

</details>

### Question 4
What is the size range for a Snowflake micro-partition (uncompressed)?

- A) 1-10 MB
- B) 10-50 MB
- C) 50-500 MB
- D) 500 MB - 1 GB

<details>
<summary>Show Answer</summary>

**Answer: C) 50-500 MB**

Micro-partitions contain between 50 MB and 500 MB of uncompressed data. The actual stored size is smaller due to compression.

</details>

### Question 5
Which table type enforces PRIMARY KEY constraints?

- A) Permanent tables
- B) Transient tables
- C) Hybrid tables
- D) External tables

<details>
<summary>Show Answer</summary>

**Answer: C) Hybrid tables**

Hybrid tables are the only Snowflake table type that enforces PRIMARY KEY, UNIQUE, and FOREIGN KEY constraints. Standard tables only define constraints but do not enforce them.

</details>

### Question 6
What happens to a temporary table when the session that created it ends?

- A) It becomes a permanent table
- B) It becomes a transient table
- C) It is automatically dropped
- D) It remains but becomes invisible

<details>
<summary>Show Answer</summary>

**Answer: C) It is automatically dropped**

Temporary tables exist only for the duration of the session that created them. When the session ends, the temporary table and its data are automatically dropped.

</details>

### Question 7
Which feature requires Enterprise Edition or higher?

- A) Transient tables
- B) Temporary tables
- C) Materialized views
- D) External tables

<details>
<summary>Show Answer</summary>

**Answer: C) Materialized views**

Materialized views require Enterprise Edition or higher. All other listed table types are available in Standard Edition.

</details>

### Question 8
How are unquoted identifiers stored in Snowflake?

- A) Lowercase
- B) Uppercase
- C) Mixed case (as typed)
- D) Case-insensitive with original case preserved

<details>
<summary>Show Answer</summary>

**Answer: B) Uppercase**

Unquoted identifiers are stored and resolved as uppercase in Snowflake, making them case-insensitive. Quoted identifiers (double quotes) preserve case and are case-sensitive.

</details>

### Question 9
What is the primary benefit of Dynamic Tables?

- A) Faster query performance than permanent tables
- B) Lower storage costs than transient tables
- C) Automatic refresh without manual scheduling
- D) Support for ACID transactions

<details>
<summary>Show Answer</summary>

**Answer: C) Automatic refresh without manual scheduling**

Dynamic Tables automatically refresh based on a defined target lag, eliminating the need for manual scheduling or complex ETL pipelines. Snowflake handles all refresh operations.

</details>

### Question 10
Which statement about Iceberg tables is FALSE?

- A) They use the Apache Iceberg open table format
- B) They store data in external cloud storage
- C) They have a 7-day Fail-safe period like permanent tables
- D) They enable interoperability with other compute engines

<details>
<summary>Show Answer</summary>

**Answer: C) They have a 7-day Fail-safe period like permanent tables**

Iceberg tables do NOT have Fail-safe. Data is stored in your external cloud storage, and Snowflake does not maintain Fail-safe copies. You are responsible for data protection in your cloud storage.

</details>

### Question 11
A user creates a table named `MyTable` without using quotes. How must they reference it in subsequent queries?

- A) `"MyTable"` only
- B) `mytable`, `MYTABLE`, or `MyTable` (any case)
- C) `MyTable` only (exact case)
- D) `"MYTABLE"` only

<details>
<summary>Show Answer</summary>

**Answer: B) `mytable`, `MYTABLE`, or `MyTable` (any case)**

Unquoted identifiers are stored as uppercase and are case-insensitive when referenced without quotes. `mytable`, `MYTABLE`, `MyTable`, etc., all resolve to the same object.

</details>

### Question 12
Which schema is automatically created in every new database?

- A) SYSTEM
- B) METADATA
- C) PUBLIC
- D) DEFAULT

<details>
<summary>Show Answer</summary>

**Answer: C) PUBLIC**

Every new database automatically includes a PUBLIC schema (default) and an INFORMATION_SCHEMA (read-only metadata).

</details>

---

## 7. Key Takeaways Summary

### Object Hierarchy
- Organization > Account > Database > Schema > Objects
- No hard limits on number of objects at any level
- Virtual Warehouses are account-level, not database-level

### Table Types
- **Permanent**: Default, full Time Travel, 7-day Fail-safe
- **Transient**: No Fail-safe, reduced storage costs
- **Temporary**: Session-scoped, no Fail-safe, no visibility to others
- **External**: Read-only, data in cloud storage
- **Dynamic**: Auto-refreshing, declarative pipelines
- **Hybrid**: Transactional, enforced constraints, row-based
- **Iceberg**: Open format, external storage, interoperability

### View Types
- **Standard**: Query definition only, no storage
- **Secure**: Hidden definition, required for Data Sharing
- **Materialized**: Pre-computed, auto-maintained, Enterprise+

### Storage Concepts
- Micro-partitions: 50-500 MB uncompressed
- Columnar storage within micro-partitions
- Automatic compression per column

### Naming Rules
- Unquoted = uppercase, case-insensitive
- Quoted (double quotes) = case-sensitive, any characters
- Fully qualified: `database.schema.object`
