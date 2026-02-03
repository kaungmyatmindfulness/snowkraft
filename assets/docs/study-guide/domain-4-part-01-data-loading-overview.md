# Domain 4: Data Loading & Unloading
## Part 1: Data Loading Overview

**Exam Weight:** Domain 4 covers 10-15% of the exam

---

## Overview

Data loading is a fundamental operation in Snowflake that moves data from external sources into Snowflake tables. Understanding the different loading methods, file formats, staging areas, and best practices is essential for the SnowPro Core exam. This section covers the foundational concepts you need to master.

---

## Section 1: Data Loading Methods Comparison

Snowflake provides three main methods for loading data, each designed for specific use cases:

### Loading Methods Overview

| Method | Use Case | Compute | Latency | Best For |
|--------|----------|---------|---------|----------|
| **Bulk Loading (COPY)** | Large batch loads | User-managed warehouse | Minutes to hours | Historical data, batch ETL |
| **Snowpipe** | Continuous micro-batches | Serverless (Snowflake-managed) | Minutes | Near real-time file ingestion |
| **Snowpipe Streaming** | Real-time row insertion | Serverless (Snowflake-managed) | Seconds | Live streams, IoT, CDC |

### Bulk Loading Using COPY INTO

Bulk loading uses the `COPY INTO <table>` command to load data from staged files.

**Characteristics:**
- Uses customer-managed virtual warehouses
- Users must size the warehouse appropriately for the data volume
- Supports loading from both internal and external stages
- Best for loading large batches of historical or periodic data
- Data transformation supported during load

**Typical Workflow:**
1. Stage files (upload to stage or reference external storage)
2. Execute COPY INTO command
3. Files loaded into target table
4. Optionally purge staged files

```sql
-- Basic bulk load example
COPY INTO my_table
FROM @my_stage/data/
FILE_FORMAT = (TYPE = 'CSV');
```

### Continuous Loading Using Snowpipe

Snowpipe enables automated, continuous loading of micro-batches as files arrive.

**Characteristics:**
- Serverless compute (Snowflake-managed resources)
- Automatically scales based on workload
- Per-second billing based on actual compute used
- Data available within minutes of file arrival
- Uses pipe objects with embedded COPY statements

**Triggering Methods:**
1. **Cloud Event Notifications** - Automated via SQS (AWS), Event Grid (Azure), or Pub/Sub (GCS)
2. **REST API Calls** - Application submits file list for ingestion

**Pipe Definition:**
```sql
CREATE PIPE my_pipe
AS
COPY INTO my_table
FROM @my_stage
FILE_FORMAT = (TYPE = 'JSON');
```

### Continuous Loading Using Snowpipe Streaming

Snowpipe Streaming writes rows directly to tables without staging files.

**Characteristics:**
- Lowest latency option (seconds)
- No intermediate file staging required
- Uses Java SDK or REST API
- Data available within seconds
- Best for real-time streaming sources (Kafka, IoT, application events)

**Key Concepts:**
- **Channels** - Logical streaming connections to tables
- **Offset Tokens** - Track ingestion progress for exactly-once delivery
- Insert-only operations (no UPDATE/DELETE)

---

## Section 2: Bulk Loading vs Snowpipe Detailed Comparison

### Side-by-Side Comparison

| Aspect | Bulk Loading (COPY) | Snowpipe |
|--------|---------------------|----------|
| **Compute** | User-provided virtual warehouse | Snowflake-provided serverless compute |
| **Warehouse Sizing** | User must size appropriately | Automatic scaling |
| **Authentication** | User authentication required | Key pair authentication (REST) or cloud messaging |
| **Load History Retention** | 64 days (table metadata) | 14 days (pipe metadata) |
| **Transactions** | Single transaction per COPY statement | Files loaded in single transactions (batch dependent) |
| **Cost Model** | Per-second warehouse billing | Per-second compute billing for actual work |
| **File Order Guarantee** | Explicit file ordering possible | No guaranteed load order |
| **Best Use Case** | Scheduled batch loads | Continuous event-driven loads |

### Load History and Deduplication

**Bulk Loading (64-day metadata):**
- Snowflake tracks loaded files in table metadata
- Prevents reloading same files within 64 days
- Metadata tracks: file path, name, size, ETag, row counts
- After 64 days, use `LOAD_UNCERTAIN_FILES` or `FORCE` option

**Snowpipe (14-day metadata):**
- Load history stored in pipe metadata
- Files tracked by path and name (not ETag)
- Modified files with same name are NOT reloaded

> **Important:** Do not mix bulk loading and Snowpipe for the same files to avoid duplication or missed data.

---

## Section 3: Supported File Locations (Stages)

Snowflake uses "stages" to reference file locations in cloud storage.

### Stage Types

| Stage Type | Description | Scope | Created By |
|------------|-------------|-------|------------|
| **User Stage** | Personal storage for each user | Single user, multiple tables | Automatic (per user) |
| **Table Stage** | Dedicated storage per table | Multiple users, single table | Automatic (per table) |
| **Named Internal Stage** | Custom internal storage | Configurable | CREATE STAGE |
| **Named External Stage** | References cloud storage (S3/Azure/GCS) | Configurable | CREATE STAGE |

### Stage Reference Syntax

| Stage Type | Reference Syntax | Example |
|------------|------------------|---------|
| User Stage | `@~` | `PUT file:///data.csv @~` |
| Table Stage | `@%table_name` | `PUT file:///data.csv @%my_table` |
| Named Stage | `@stage_name` | `PUT file:///data.csv @my_stage` |

### Internal vs External Stages

| Aspect | Internal Stages | External Stages |
|--------|-----------------|-----------------|
| **Storage Location** | Snowflake-managed cloud storage | Customer's cloud storage (S3/Azure/GCS) |
| **File Upload Method** | PUT command | Cloud provider tools (AWS CLI, Azure CLI, gsutil) |
| **Encryption** | Automatic (Snowflake-managed) | Customer-managed or Snowflake-integrated |
| **Cost** | Included in Snowflake storage | Customer pays cloud provider |
| **Cross-Cloud Loading** | N/A | Supported (with data transfer charges) |

### External Stage Cloud Provider Support

| Cloud Provider | Internal Location Support | Bulk Loading | Snowpipe Auto | Snowpipe REST |
|----------------|---------------------------|--------------|---------------|---------------|
| **Amazon S3** | All Snowflake platforms | Yes | Yes | Yes |
| **Google Cloud Storage** | All Snowflake platforms | Yes | Yes | Yes |
| **Microsoft Azure** | All Snowflake platforms | Yes | Yes | Yes |

> **Note:** Archival storage classes (S3 Glacier, Azure Archive) are NOT supported - files must be restored before loading.

---

## Section 4: Supported File Formats

### File Format Matrix

| Format | Type | Description | Key Features |
|--------|------|-------------|--------------|
| **CSV/TSV** | Delimited | Comma or tab-separated values | Any single-byte delimiter supported |
| **JSON** | Semi-structured | JavaScript Object Notation | Nested objects, arrays supported |
| **Avro** | Semi-structured | Row-oriented Apache format | Auto-detects compression |
| **ORC** | Semi-structured | Optimized Row Columnar | Auto-detects compression |
| **Parquet** | Semi-structured | Columnar Apache format | Schema v1 supported, auto-detects compression |
| **XML** | Semi-structured | Extensible Markup Language | Top-level elements become rows |

### Semi-Structured Data Loading Behavior

| Format | Loading Behavior |
|--------|-----------------|
| JSON, Avro, ORC, Parquet | Each top-level object = one row |
| XML | Each top-level element = one row |

### Named File Formats

Named file formats are reusable database objects that encapsulate format settings.

**Benefits:**
- Consistency across multiple COPY operations
- Reduced syntax in COPY statements
- Easier maintenance of format configurations

```sql
-- Create a named file format
CREATE FILE FORMAT my_csv_format
  TYPE = 'CSV'
  FIELD_DELIMITER = ','
  SKIP_HEADER = 1
  NULL_IF = ('NULL', 'null', '')
  COMPRESSION = 'GZIP';

-- Use in COPY statement
COPY INTO my_table
FROM @my_stage
FILE_FORMAT = (FORMAT_NAME = 'my_csv_format');
```

### File Format Option Precedence

When file format options are specified in multiple locations, they apply in this order (highest to lowest priority):

1. **COPY INTO statement** - Inline options override all others
2. **Named file format** - Specified via FORMAT_NAME
3. **Stage object** - Default format for the stage
4. **Snowflake defaults** - Built-in default values

> **Key Point:** Options set in one location override ALL options set at lower precedence levels, not just the same options.

---

## Section 5: Data File Compression

### Compression Recommendations

Snowflake strongly recommends compressing data files for large data loads:

- **Reduces storage costs** in staging areas
- **Decreases data transfer time** from cloud storage
- **Improves load performance** through parallel decompression

### Automatic Compression Detection

Snowflake automatically detects compression format during loading. You can explicitly specify the COMPRESSION option if needed.

### Supported Compression Algorithms

| Format | CSV/Delimited | JSON | Parquet | Avro | ORC |
|--------|--------------|------|---------|------|-----|
| **GZIP** | Yes | Yes | N/A | N/A | N/A |
| **BZ2** | Yes | Yes | N/A | N/A | N/A |
| **BROTLI** | Yes | Yes | N/A | N/A | N/A |
| **ZSTD** | Yes | Yes | N/A | N/A | N/A |
| **DEFLATE** | Yes | Yes | N/A | N/A | N/A |
| **RAW_DEFLATE** | Yes | Yes | N/A | N/A | N/A |
| **SNAPPY** | N/A | N/A | Yes | Yes | Yes |
| **LZO** | N/A | N/A | Yes | N/A | Yes |

> **Note:** Parquet, Avro, and ORC files have internal compression that is automatically detected and processed.

---

## Section 6: File Sizing Best Practices

### Recommended File Sizes

| Scenario | Recommended Size | Rationale |
|----------|------------------|-----------|
| **Optimal Range** | 100-250 MB compressed | Balances parallelism and overhead |
| **Acceptable Range** | 10-100 MB compressed | Acceptable for smaller workloads |
| **Avoid** | > 100 GB | Processing overhead too high |
| **Snowpipe** | 100-250 MB compressed | Matches optimal parallel processing |

### Why File Size Matters

1. **Parallel Processing** - Number of parallel operations limited by number of files
2. **Compute Efficiency** - Very large files limit parallelism; very small files increase overhead
3. **Recovery** - Smaller files mean less reprocessing on failure

### Splitting Large Files

**Linux/Mac:**
```bash
split -l 100000 large_file.csv output_prefix
```

**Best Practices for Splitting:**
- Split by line count to maintain record integrity
- Ensure split points don't break records
- Keep consistent file sizes across splits

### Snowpipe-Specific Sizing

For Snowpipe, consider your data source's characteristics:

- **Buffer Size** - Target file size for accumulation
- **Flush Interval** - Time between file creation
- If data arrives slowly, balance file size vs latency requirements

---

## Section 7: Data Transformations During Load

Snowflake supports transforming data during the COPY operation:

### Supported Transformations

| Transformation | Description | Example Use Case |
|----------------|-------------|------------------|
| **Column Reordering** | Change column order from source to target | Source columns in different order than table |
| **Column Omission** | Skip unwanted columns | Load only relevant fields |
| **Column Subsetting** | Load specific columns | Select columns 1, 3, 5 only |
| **Type Casting** | Convert data types | String to date conversion |
| **TRUNCATECOLUMNS** | Truncate oversized strings | Prevent load failures on long text |
| **Sequence/Identity** | Add auto-increment values | Generate surrogate keys |

### Transformation Example

```sql
-- Reorder and cast columns during load
COPY INTO employees (id, full_name, hire_date)
FROM (
  SELECT $3::INTEGER,        -- Column 3 as ID
         $1 || ' ' || $2,    -- Concatenate first/last name
         $4::DATE            -- Column 4 as date
  FROM @my_stage/employees.csv
)
FILE_FORMAT = (TYPE = 'CSV');
```

### Supported Functions for Transformation

Key functions available during COPY transformations:

- **CAST / ::** - Type conversion
- **CONCAT / ||** - String concatenation
- **SUBSTR** - String extraction
- **TO_DATE, TO_TIMESTAMP** - Date/time conversion
- **FLATTEN** - Explode arrays/objects
- **SPLIT** - Split strings into arrays
- **PARSE_JSON** - Parse JSON strings
- **Metadata columns** - METADATA$FILENAME, METADATA$FILE_ROW_NUMBER

### Transformation Limitations

- **VALIDATION_MODE** not supported with transformations
- **WHERE clause** filtering not supported
- **ORDER BY, LIMIT** not supported
- **DISTINCT** may cause inconsistent error handling

---

## Section 8: Schema Detection and Evolution

### Schema Detection (INFER_SCHEMA)

Automatically detect column definitions from staged semi-structured files.

**Supported Formats:**
- Parquet
- Avro
- ORC
- JSON
- CSV

```sql
-- Detect schema from Parquet files
SELECT * FROM TABLE(
  INFER_SCHEMA(
    LOCATION => '@my_stage/data/',
    FILE_FORMAT => 'my_parquet_format'
  )
);
```

### Schema Evolution

Tables can automatically evolve to accommodate new columns in source data:

- **New columns** automatically added to target table
- Works with Snowpipe and bulk loading
- Controlled via `ENABLE_SCHEMA_EVOLUTION` table property

---

## Section 9: Alternatives to Loading Data

### External Tables

External tables allow you to query data that resides in external cloud storage (S3, Azure Blob, GCS) without loading it into Snowflake.

| Aspect | External Tables | Regular Tables |
|--------|-----------------|----------------|
| **Data Location** | External cloud storage (S3, Azure Blob, GCS) | Snowflake storage |
| **Source of Truth** | External storage | Snowflake |
| **DML Support** | **Read-only -- no INSERT, UPDATE, DELETE, or MERGE** | Full DML support |
| **Storage Cost** | **Zero Snowflake storage cost** (customer pays cloud provider) | Snowflake storage charges |
| **Query Performance** | **Slower than native tables** (remote storage access) | Faster (optimized micro-partitions) |
| **Best For** | Query subset of data lake, maintain external source of truth | Full analytical workloads |
| **Materialized Views** | Supported (read-only, improves performance) | Full support |

**Key Facts for the Exam:**

- **Built-in columns:** Every external table automatically includes two virtual columns:
  - `VALUE` (VARIANT) -- contains the row data
  - `METADATA$FILENAME` -- the name of the source file
- **Partitioning is recommended** for performance: supports both **auto-partitioning** (Snowflake infers partition columns from file path expressions) and **user-defined partitioning** (explicit partition column definitions)
- **Delta Lake support:** External tables can read Delta Lake format by setting `TABLE_FORMAT = DELTA` on the external table definition
- **Auto-refresh via event notifications:** External table metadata can be automatically refreshed using cloud event notifications (SQS, Pub/Sub, Event Grid), similar to Snowpipe
- **Materialized views over external tables** are the recommended way to improve query performance on external data -- the materialized view caches data locally in Snowflake
- **No Snowflake storage charges** because data stays in the customer's cloud storage

```sql
-- Create an external table
CREATE EXTERNAL TABLE my_ext_table (
  col1 VARCHAR AS (VALUE:col1::VARCHAR),
  col2 INTEGER AS (VALUE:col2::INTEGER)
)
WITH LOCATION = @my_external_stage
AUTO_REFRESH = TRUE
FILE_FORMAT = (TYPE = PARQUET);

-- Query with built-in columns
SELECT VALUE, METADATA$FILENAME FROM my_ext_table;

-- Create a materialized view for better performance
CREATE MATERIALIZED VIEW my_ext_mv AS
SELECT col1, col2 FROM my_ext_table;
```

### Apache Kafka Connector

Load data directly from Kafka topics:

- Uses Snowpipe or Snowpipe Streaming under the hood
- Automated ingestion from Kafka partitions
- Supports exactly-once delivery semantics

---

## Section 10: Exam Tips and Common Question Patterns

### High-Probability Exam Topics

1. **Bulk vs Snowpipe Selection**
   - Bulk: Scheduled batch loads, large historical data
   - Snowpipe: Continuous, event-driven, near real-time

2. **Load History Retention**
   - Bulk loading: 64 days
   - Snowpipe: 14 days

3. **Stage Types and Syntax**
   - User stage: `@~`
   - Table stage: `@%tablename`
   - Named stage: `@stagename`

4. **File Size Recommendations**
   - Optimal: 100-250 MB compressed
   - Maximum recommended: 100 GB

5. **Compute Resources**
   - Bulk loading: User-managed warehouse
   - Snowpipe: Serverless (Snowflake-managed)

### Common Exam Question Patterns

**Pattern 1: "Which method should you use when..."**
- Need data within seconds: Snowpipe Streaming
- Need data within minutes: Snowpipe
- Scheduled overnight batch: Bulk loading

**Pattern 2: "What is the default/recommended..."**
- File size: 100-250 MB compressed
- Load history retention (COPY): 64 days
- Load history retention (Snowpipe): 14 days

**Pattern 3: "Which file format supports..."**
- Schema detection: Parquet, Avro, ORC, JSON, CSV
- Internal compression: Parquet, Avro, ORC
- Semi-structured native loading: JSON, Avro, ORC, Parquet, XML

**Pattern 4: "How do you reference..."**
- Your user stage: `@~`
- A table's stage: `@%table_name`
- An external stage for S3: Named external stage with URL and credentials

### Key Facts to Memorize

| Fact | Value |
|------|-------|
| Bulk load metadata retention | 64 days |
| Snowpipe metadata retention | 14 days |
| Optimal file size | 100-250 MB compressed |
| Snowpipe latency | Minutes |
| Snowpipe Streaming latency | Seconds |
| Maximum files per FILES clause | 1,000 |
| User stage syntax | `@~` |
| Table stage syntax | `@%tablename` |

### Tricky Concepts

1. **File Format Option Precedence**
   - Options in COPY statement override format in stage
   - It's all-or-nothing (not merged)

2. **Archival Storage Not Supported**
   - S3 Glacier, Azure Archive require restoration first

3. **Snowpipe File Order**
   - No guaranteed load order (files may load out of arrival order)

4. **Load Deduplication**
   - Based on file path and name
   - Modified files with same name NOT reloaded by Snowpipe

5. **Transformation Limitations**
   - VALIDATION_MODE incompatible with SELECT transformations
   - No WHERE clause filtering during load

---

## Quick Reference Card

### Loading Method Selection Guide

```
Is latency critical (seconds)?
├── Yes: Snowpipe Streaming
└── No: Is it continuous/event-driven?
    ├── Yes: Snowpipe
    └── No: Bulk Loading (COPY)
```

### Stage Selection Guide

```
Who owns the storage?
├── Snowflake: Internal Stage
│   └── Single user? User Stage (@~)
│   └── Single table? Table Stage (@%table)
│   └── Multiple uses? Named Internal Stage
└── Customer: External Stage (S3/Azure/GCS)
```

### File Format Quick Reference

| Need | Use This Format |
|------|-----------------|
| Simple tabular data | CSV |
| Nested/hierarchical data | JSON |
| Columnar analytics | Parquet |
| Streaming from Java apps | Avro |
| Hadoop ecosystem compatibility | ORC |
| Document markup | XML |

---

## Summary

Data loading in Snowflake offers flexibility through multiple methods (bulk, Snowpipe, Snowpipe Streaming), diverse file format support, and powerful transformation capabilities. Key exam success factors:

1. **Know when to use each loading method** based on latency and workload requirements
2. **Understand stage types** and their reference syntax
3. **Memorize key numbers** (64-day retention, 100-250 MB file size, 14-day Snowpipe history)
4. **Understand file format options** and precedence rules
5. **Know transformation capabilities and limitations** during load operations

Master these concepts to confidently answer Domain 4 questions on the SnowPro Core exam.
