# Domain 4: Data Loading & Unloading

## Part 11: Data Unloading (COPY INTO Location)

This section provides comprehensive coverage of data unloading in Snowflake, which involves extracting data from tables and writing it to files in a stage or cloud storage. Data unloading is a critical concept for the SnowPro Core exam and is essential for understanding data export, data lake integration, and data sharing scenarios.

---

## 1. Overview of Data Unloading

**Data unloading** (also called data export or bulk export) is the process of extracting data from Snowflake tables and writing it to files in a stage. This is the reverse of data loading.

### Why Unload Data?

- **Data archival** - Export historical data for long-term storage
- **Data lake integration** - Transform and export data to a data lake
- **Data sharing** - Share data with external systems or partners
- **ETL/ELT processes** - Export transformed data for downstream processing
- **Backup** - Create file-based backups of table data
- **Cross-platform migration** - Move data to other systems

### Basic Unload Process

The unloading process consists of two main steps:

```
Step 1: COPY INTO <location>
Snowflake Table --> One or more files in a Stage

Step 2: Download/Retrieve Files
Stage --> Local file system (GET) or Cloud storage tools
```

**Key Points:**
- Uses the `COPY INTO <location>` command (note: different from `COPY INTO <table>` for loading)
- Requires a running virtual warehouse to execute
- Files can be unloaded to internal or external stages
- Supports query-based unloading (unload results of a SELECT statement)

---

## 2. COPY INTO Location Syntax

The `COPY INTO <location>` command exports data from a table to files.

### Basic Syntax

```sql
COPY INTO { internalStage | externalStage | externalLocation }
FROM { [<namespace>.]<table_name> | ( <query> ) }
[ PARTITION BY <expr> ]
[ FILE_FORMAT = ( { FORMAT_NAME = '<file_format_name>' | TYPE = { CSV | JSON | PARQUET } [ formatTypeOptions ] } ) ]
[ copyOptions ]
[ HEADER ]
```

### Key Components

| Component | Description |
|-----------|-------------|
| `internalStage` | User stage (`@~`), table stage (`@%table`), or named internal stage (`@stage_name`) |
| `externalStage` | Named external stage referencing cloud storage |
| `externalLocation` | Direct URL to cloud storage with credentials |
| `FROM` | Source table or query |
| `PARTITION BY` | Expression to partition output files |
| `FILE_FORMAT` | Output file format specification |
| `HEADER` | Include column headers in output (CSV only) |

---

## 3. Unload Destinations

### 3.1 Internal Stages

Internal stages store files within Snowflake-managed cloud storage.

#### User Stage (@~)

```sql
-- Unload to user stage
COPY INTO @~/unload/
FROM mytable
FILE_FORMAT = (TYPE = CSV);

-- Unload with path prefix
COPY INTO @~/data/export/
FROM mytable;
```

#### Table Stage (@%table_name)

```sql
-- Unload to table's own stage
COPY INTO @%mytable/unload/
FROM mytable
FILE_FORMAT = (TYPE = CSV);
```

#### Named Internal Stage

```sql
-- Create internal stage for unloading
CREATE OR REPLACE STAGE my_unload_stage
  FILE_FORMAT = my_csv_format;

-- Unload to named internal stage
COPY INTO @my_unload_stage/export/
FROM mytable;
```

### 3.2 External Stages

External stages reference cloud storage managed by your organization.

#### Amazon S3

```sql
-- Create external stage for S3
CREATE OR REPLACE STAGE my_s3_stage
  URL = 's3://mybucket/unload/'
  STORAGE_INTEGRATION = s3_int
  FILE_FORMAT = my_csv_format;

-- Unload to S3 via stage
COPY INTO @my_s3_stage/data/
FROM mytable;

-- Unload directly to S3 (ad hoc)
COPY INTO 's3://mybucket/unload/'
FROM mytable
STORAGE_INTEGRATION = s3_int
FILE_FORMAT = (TYPE = CSV);
```

**Required S3 Permissions for Unloading:**
- `s3:PutObject` - Write files
- `s3:DeleteObject` - Overwrite files

#### Microsoft Azure

```sql
-- Create external stage for Azure
CREATE OR REPLACE STAGE my_azure_stage
  URL = 'azure://myaccount.blob.core.windows.net/container/unload/'
  STORAGE_INTEGRATION = azure_int
  FILE_FORMAT = my_csv_format;

-- Unload to Azure
COPY INTO @my_azure_stage/data/
FROM mytable;

-- Direct unload with SAS token
COPY INTO 'azure://myaccount.blob.core.windows.net/container/unload/'
FROM mytable
CREDENTIALS = (AZURE_SAS_TOKEN = '...')
FILE_FORMAT = (TYPE = CSV);
```

**Supported Azure Storage Types:**
- Blob storage
- Data Lake Storage Gen2 (ADLS Gen2)
- General purpose v1 and v2

#### Google Cloud Storage

```sql
-- Create external stage for GCS
CREATE OR REPLACE STAGE my_gcs_stage
  URL = 'gcs://mybucket/unload/'
  STORAGE_INTEGRATION = gcs_int
  FILE_FORMAT = my_csv_format;

-- Unload to GCS
COPY INTO @my_gcs_stage/data/
FROM mytable;
```

### Stage Comparison for Unloading

| Stage Type | Use Case | Download Method |
|------------|----------|-----------------|
| User Stage (`@~`) | Personal exports, single user | GET command |
| Table Stage (`@%table`) | Table-specific exports | GET command |
| Named Internal Stage | Shared exports, team use | GET command |
| External Stage (S3/Azure/GCS) | Cloud integration, data lake | Cloud provider tools |

---

## 4. Supported File Formats

### Output File Formats

| Format | Support | Notes |
|--------|---------|-------|
| **CSV** (Delimited) | Full support | Default format, supports any single-byte delimiter |
| **JSON** | Full support | Outputs in NDJSON (newline-delimited JSON) format |
| **Parquet** | Full support | Columnar format, preserves data types |

### Specifying File Formats

```sql
-- Using named file format
COPY INTO @mystage/
FROM mytable
FILE_FORMAT = (FORMAT_NAME = 'my_csv_format');

-- Using inline format options
COPY INTO @mystage/
FROM mytable
FILE_FORMAT = (TYPE = CSV COMPRESSION = GZIP FIELD_DELIMITER = '|');

-- JSON format
COPY INTO @mystage/
FROM mytable
FILE_FORMAT = (TYPE = JSON);

-- Parquet format
COPY INTO @mystage/
FROM mytable
FILE_FORMAT = (TYPE = PARQUET);
```

### Creating Named File Formats for Unloading

```sql
-- CSV file format for unloading
CREATE OR REPLACE FILE FORMAT my_csv_unload_format
  TYPE = 'CSV'
  FIELD_DELIMITER = ','
  COMPRESSION = 'GZIP';

-- JSON file format for unloading
CREATE OR REPLACE FILE FORMAT my_json_unload_format
  TYPE = 'JSON';
```

---

## 5. Copy Options for Unloading

### SINGLE Option

Controls whether data is unloaded to a single file or multiple files.

```sql
-- Unload to single file (default is FALSE)
COPY INTO @mystage/myfile.csv.gz
FROM mytable
FILE_FORMAT = (TYPE = CSV COMPRESSION = GZIP)
SINGLE = TRUE
MAX_FILE_SIZE = 5368709120;  -- 5GB limit

-- Unload to multiple files (default behavior)
COPY INTO @mystage/export/
FROM mytable
SINGLE = FALSE;  -- Default
```

**Important:**
- Default: `SINGLE = FALSE` (multiple files)
- When `SINGLE = TRUE`, specify a filename in the path
- Single file unloading may be slower due to reduced parallelism
- Increase `MAX_FILE_SIZE` for large single-file exports

### MAX_FILE_SIZE Option

Specifies the maximum size of each file (in bytes).

```sql
-- Set max file size to 100MB
COPY INTO @mystage/
FROM mytable
MAX_FILE_SIZE = 104857600;

-- Set to 500MB for larger files
COPY INTO @mystage/
FROM mytable
MAX_FILE_SIZE = 524288000;
```

**Default Values:**
- Default: 16777216 bytes (16 MB)
- Maximum: 5368709120 bytes (5 GB)

### OVERWRITE Option

Controls whether existing files are overwritten.

```sql
-- Overwrite existing files (default is FALSE)
COPY INTO @mystage/data/
FROM mytable
OVERWRITE = TRUE;

-- Preserve existing files (default)
COPY INTO @mystage/data/
FROM mytable
OVERWRITE = FALSE;
```

### HEADER Option

Includes column names as the first row (CSV only).

```sql
-- Include header row
COPY INTO @mystage/
FROM mytable
FILE_FORMAT = (TYPE = CSV)
HEADER = TRUE;
```

### INCLUDE_QUERY_ID Option

Includes the query ID in the generated file names.

```sql
COPY INTO @mystage/
FROM mytable
INCLUDE_QUERY_ID = TRUE;

-- Output file name: data_01a1-0000-0000-0000-0000abc12345_0_0_0.csv.gz
```

### DETAILED_OUTPUT Option

Returns detailed information about unloaded files.

```sql
COPY INTO @mystage/
FROM mytable
DETAILED_OUTPUT = TRUE;

-- Returns: FILE_NAME, FILE_SIZE, ROW_COUNT
```

---

## 6. File Naming and Prefixes

### Default File Naming

When unloading data, Snowflake generates file names automatically:

```
<prefix>data_<node_id>_<thread_id>_<file_num>.<extension>[.compression]
```

**Example:** `data_0_0_0.csv.gz`

### Custom File Prefixes

```sql
-- Specify custom prefix in path
COPY INTO @mystage/sales/2024/
FROM mytable;
-- Files: sales/2024/data_0_0_0.csv.gz

-- Add specific prefix
COPY INTO @mystage/export_
FROM mytable;
-- Files: export_data_0_0_0.csv.gz
```

### File Extensions

The file extension is automatically appended based on:
1. File format type (csv, json, parquet)
2. Compression type (gz for gzip, etc.)

```sql
-- Resulting file: data_0_0_0.csv.gz
COPY INTO @mystage/
FROM mytable
FILE_FORMAT = (TYPE = CSV COMPRESSION = GZIP);

-- Resulting file: data_0_0_0.parquet
COPY INTO @mystage/
FROM mytable
FILE_FORMAT = (TYPE = PARQUET);
```

---

## 7. Partitioned Data Unloading

The `PARTITION BY` option enables unloading data into a directory structure based on column values or expressions.

### Basic Partition By

```sql
-- Partition by date column
COPY INTO @mystage/
FROM mytable
PARTITION BY (sale_date)
FILE_FORMAT = (TYPE = CSV);

-- Output structure:
-- mystage/sale_date=2024-01-15/data_0_0_0.csv.gz
-- mystage/sale_date=2024-01-16/data_0_0_0.csv.gz
```

### Partitioning with Expressions

```sql
-- Partition by year and month
COPY INTO @mystage/
FROM (
  SELECT *,
    YEAR(order_date) AS year,
    MONTH(order_date) AS month
  FROM orders
)
PARTITION BY (year, month)
FILE_FORMAT = (TYPE = PARQUET);

-- Output structure:
-- mystage/year=2024/month=1/data_0_0_0.parquet
-- mystage/year=2024/month=2/data_0_0_0.parquet
```

### Partitioning with TO_VARCHAR

```sql
-- Create date-based folder structure
COPY INTO @mystage/
FROM (
  SELECT *,
    TO_VARCHAR(created_at, 'YYYY/MM/DD') AS date_path
  FROM events
)
PARTITION BY (date_path)
FILE_FORMAT = (TYPE = JSON);
```

### Benefits of Partitioned Unloading

- **Data lake compatibility** - Create Hive-style partition structures
- **Query efficiency** - External tools can prune partitions
- **Organization** - Logical file organization by business dimensions
- **Incremental processing** - Process specific partitions

---

## 8. Unloading with Queries

You can unload the results of a SELECT query instead of an entire table.

### Query-Based Unloading

```sql
-- Unload filtered data
COPY INTO @mystage/active_customers/
FROM (
  SELECT customer_id, name, email
  FROM customers
  WHERE status = 'ACTIVE'
)
FILE_FORMAT = (TYPE = CSV)
HEADER = TRUE;

-- Unload with transformations
COPY INTO @mystage/sales_summary/
FROM (
  SELECT
    region,
    product_category,
    SUM(amount) AS total_sales,
    COUNT(*) AS transaction_count
  FROM sales
  GROUP BY region, product_category
)
FILE_FORMAT = (TYPE = PARQUET);

-- Unload with joins
COPY INTO @mystage/order_details/
FROM (
  SELECT o.order_id, o.order_date, c.customer_name, p.product_name
  FROM orders o
  JOIN customers c ON o.customer_id = c.id
  JOIN products p ON o.product_id = p.id
  WHERE o.order_date >= '2024-01-01'
)
FILE_FORMAT = (TYPE = JSON);
```

### Unloading Relational Data to JSON

```sql
-- Convert relational table to JSON objects
COPY INTO @mystage/
FROM (
  SELECT OBJECT_CONSTRUCT(
    'id', id,
    'first_name', first_name,
    'last_name', last_name,
    'email', email
  ) AS json_record
  FROM employees
)
FILE_FORMAT = (TYPE = JSON);
```

### Unloading to Parquet with Multiple Columns

```sql
-- Preserve multiple columns in Parquet
COPY INTO @mystage/
FROM (
  SELECT
    id,
    name,
    created_at,
    metadata
  FROM my_table
)
FILE_FORMAT = (TYPE = PARQUET)
HEADER = TRUE;
```

---

## 9. GET Command (Downloading from Internal Stages)

The GET command downloads files from internal stages to a local file system. This is the final step when unloading to internal stages.

### GET Syntax

```sql
GET <stage_path> file://<local_path>
[ PATTERN = '<regex_pattern>' ]
[ PARALLEL = <integer> ];
```

### GET Examples

```sql
-- Download from user stage
GET @~/unload/data_0_0_0.csv.gz file:///tmp/data/;

-- Download from named stage
GET @my_stage/export/ file:///home/user/downloads/;

-- Download with pattern filter
GET @my_stage/ file:///tmp/
PATTERN = '.*sales.*[.]csv[.]gz';

-- Download with parallel threads
GET @my_stage/data/ file:///tmp/data/
PARALLEL = 10;
```

### GET Command Characteristics

| Feature | Description |
|---------|-------------|
| **Execution** | SnowSQL only (not Snowsight) |
| **Decryption** | Automatic decryption during download |
| **Target** | Internal stages only |
| **External Stages** | Use cloud provider tools instead |

**Important:** The GET command can ONLY be executed from **SnowSQL** (command-line client), not from Snowsight worksheets.

---

## 10. Handling NULL Values and Empty Strings

### The Challenge

CSV files cannot inherently distinguish between NULL values and empty strings. This can cause data integrity issues when re-loading unloaded data.

### File Format Options for NULL Handling

| Option | Description |
|--------|-------------|
| `FIELD_OPTIONALLY_ENCLOSED_BY` | Enclose string fields in quotes |
| `EMPTY_FIELD_AS_NULL` | Treatment of empty fields |
| `NULL_IF` | String representation of NULL |

### Recommended Approach: Use Enclosing Quotes

```sql
-- Create file format with quote enclosure
CREATE OR REPLACE FILE FORMAT my_csv_format
  TYPE = 'CSV'
  FIELD_OPTIONALLY_ENCLOSED_BY = '0x27'  -- Single quote
  NULL_IF = ('null');

-- Unload data
COPY INTO @~/export/
FROM my_table
FILE_FORMAT = (FORMAT_NAME = 'my_csv_format');

-- Output:
-- 1,'null','NULL value'
-- 2,'','Empty string'
```

### Alternative: Without Quotes

```sql
CREATE OR REPLACE FILE FORMAT my_csv_format
  TYPE = 'CSV'
  EMPTY_FIELD_AS_NULL = FALSE
  NULL_IF = ('null');

-- Output:
-- 1,null,NULL value
-- 2,,Empty string
```

### Round-Trip Data Integrity

When unloading and reloading data, use matching file format options:

```sql
-- Unload
COPY INTO @mystage/
FROM source_table
FILE_FORMAT = (
  TYPE = CSV
  FIELD_OPTIONALLY_ENCLOSED_BY = '"'
  NULL_IF = ('\\N')
);

-- Reload with same format
COPY INTO target_table
FROM @mystage/
FILE_FORMAT = (
  TYPE = CSV
  FIELD_OPTIONALLY_ENCLOSED_BY = '"'
  NULL_IF = ('\\N')
);
```

---

## 11. Compression Options

### Supported Compression Types

| Compression | Extension | Notes |
|-------------|-----------|-------|
| **GZIP** | .gz | Default for CSV/JSON |
| **BROTLI** | .br | High compression ratio |
| **ZSTD** | .zst | Fast compression |
| **DEFLATE** | .deflate | Standard deflate |
| **RAW_DEFLATE** | .raw_deflate | Without headers |
| **LZO** | .lzo | Fast decompression |
| **SNAPPY** | .snappy | Default for Parquet |
| **NONE** | (none) | No compression |

### Specifying Compression

```sql
-- GZIP compression (default for CSV)
COPY INTO @mystage/
FROM mytable
FILE_FORMAT = (TYPE = CSV COMPRESSION = GZIP);

-- No compression
COPY INTO @mystage/
FROM mytable
FILE_FORMAT = (TYPE = CSV COMPRESSION = NONE);

-- Parquet with Snappy (default)
COPY INTO @mystage/
FROM mytable
FILE_FORMAT = (TYPE = PARQUET COMPRESSION = SNAPPY);
```

### Single File with Compression

When using `SINGLE = TRUE` with compression, include the file extension:

```sql
-- Correct: Include compression extension
COPY INTO @mystage/myfile.csv.gz
FROM mytable
FILE_FORMAT = (TYPE = CSV COMPRESSION = GZIP)
SINGLE = TRUE;
```

---

## 12. Type Conversion for Parquet

### Default Numeric Handling

By default, fixed-point numbers are unloaded as DECIMAL columns in Parquet, which may lose precision information.

### Explicit Type Conversion

```sql
-- Convert numeric types for Parquet
COPY INTO @mystage/
FROM (
  SELECT
    id::INTEGER AS id,
    amount::DOUBLE AS amount,
    quantity::INTEGER AS quantity
  FROM sales
)
FILE_FORMAT = (TYPE = PARQUET);
```

### Snowflake to Parquet Type Mapping

| Snowflake Type | Parquet Physical Type | Parquet Logical Type |
|----------------|----------------------|---------------------|
| TINYINT | INT32 | INT(8) |
| SMALLINT | INT32 | INT(16) |
| INTEGER | INT32 | INT(32) |
| BIGINT | INT64 | INT(64) |
| DOUBLE | DOUBLE | - |
| NUMBER (default) | FIXED_LEN_BYTE_ARRAY | DECIMAL |

---

## 13. Unload Options Comparison Table

| Option | Default | Description |
|--------|---------|-------------|
| `SINGLE` | FALSE | Unload to single file |
| `MAX_FILE_SIZE` | 16 MB | Maximum file size |
| `OVERWRITE` | FALSE | Overwrite existing files |
| `HEADER` | FALSE | Include header row (CSV) |
| `INCLUDE_QUERY_ID` | FALSE | Add query ID to file names |
| `DETAILED_OUTPUT` | FALSE | Return detailed file info |
| `PARTITION BY` | - | Partition output by expression |

---

## 14. Managing Unloaded Files

### LIST Command

View unloaded files in a stage:

```sql
LIST @mystage/export/;

-- Output shows:
-- name, size, md5, last_modified
```

### REMOVE Command

Clean up unloaded files:

```sql
-- Remove specific file
REMOVE @mystage/export/data_0_0_0.csv.gz;

-- Remove all files in path
REMOVE @mystage/export/;

-- Remove with pattern
REMOVE @mystage/ PATTERN = '.*[.]csv[.]gz';
```

### Best Practice: Clean Up After Download

```sql
-- After downloading files, remove from stage
-- This improves future COPY INTO <table> performance
REMOVE @mystage/processed/;
```

---

## 15. Exam Tips and Common Question Patterns

### Key Facts to Memorize

1. **Command Syntax:**
   - `COPY INTO <location>` = Unload (export data)
   - `COPY INTO <table>` = Load (import data)

2. **Stage Destinations:**
   - Internal: `@~` (user), `@%table` (table), `@stage_name` (named)
   - External: Cloud storage via named stage or direct URL

3. **Default Behavior:**
   - SINGLE = FALSE (multiple files)
   - OVERWRITE = FALSE
   - HEADER = FALSE
   - Compression = GZIP (CSV/JSON), SNAPPY (Parquet)

4. **GET Command:**
   - Only works with internal stages
   - Only executable from SnowSQL
   - Automatically decrypts files

5. **File Format Support:**
   - Unloading supports: CSV, JSON, Parquet
   - Does NOT support: Avro, ORC, XML

### Common Exam Questions

**Question Pattern 1: Stage Selection**
> "A user needs to unload data to their organization's S3 bucket. What type of stage should they use?"
- Answer: External stage with storage integration

**Question Pattern 2: GET Command**
> "From which interface can you execute the GET command?"
- Answer: SnowSQL only (not Snowsight)

**Question Pattern 3: File Format**
> "What format does Snowflake use when unloading to JSON?"
- Answer: NDJSON (newline-delimited JSON)

**Question Pattern 4: Single File**
> "What is the default value of the SINGLE option?"
- Answer: FALSE (unloads to multiple files by default)

**Question Pattern 5: NULL Handling**
> "How can you distinguish NULL values from empty strings in unloaded CSV files?"
- Answer: Use FIELD_OPTIONALLY_ENCLOSED_BY with NULL_IF

### Critical Distinctions

| Concept | Key Point |
|---------|-----------|
| **Internal vs External** | GET command only for internal stages |
| **SINGLE option** | Default FALSE; specify filename when TRUE |
| **Query unloading** | Supports SELECT with transformations |
| **PARTITION BY** | Creates directory structure for data lake |
| **File naming** | `data_<node>_<thread>_<file>.<ext>.<compression>` |
| **Warehouse requirement** | Always requires running warehouse |

### Watch Out For

1. **GET command restrictions** - Cannot use with external stages
2. **SINGLE = TRUE** - Remember to specify full filename with extension
3. **Parquet limitations** - Cannot add headers
4. **Compression extension** - Must match COMPRESSION setting when SINGLE = TRUE
5. **Storage integration** - Required for external stages (recommended over direct credentials)

---

## 16. Quick Reference: Complete Unload Example

```sql
-- Step 1: Create file format
CREATE OR REPLACE FILE FORMAT my_unload_format
  TYPE = 'CSV'
  COMPRESSION = 'GZIP'
  FIELD_OPTIONALLY_ENCLOSED_BY = '"'
  NULL_IF = ('\\N');

-- Step 2: Create external stage (for cloud storage)
CREATE OR REPLACE STAGE my_unload_stage
  URL = 's3://mybucket/exports/'
  STORAGE_INTEGRATION = my_s3_int
  FILE_FORMAT = my_unload_format;

-- Step 3: Unload data with partitioning
COPY INTO @my_unload_stage/
FROM (
  SELECT *,
    DATE_TRUNC('MONTH', order_date) AS month_partition
  FROM orders
  WHERE order_date >= '2024-01-01'
)
PARTITION BY (month_partition)
HEADER = TRUE
OVERWRITE = TRUE
MAX_FILE_SIZE = 104857600;

-- Step 4: Verify unloaded files
LIST @my_unload_stage/;

-- For internal stages, download with GET (SnowSQL only):
-- GET @my_internal_stage/ file:///local/path/;
```

---

## 17. Summary

Data unloading in Snowflake provides flexible options for exporting data to files:

1. **Destinations**: Internal stages (user, table, named) or external cloud storage
2. **Formats**: CSV, JSON, Parquet with configurable compression
3. **Features**: Query-based unloading, partitioning, single/multiple files
4. **Retrieval**: GET command (internal) or cloud provider tools (external)
5. **Best Practices**: Use storage integrations, partition for data lakes, handle NULLs carefully

Understanding the COPY INTO <location> command and its options is essential for the SnowPro Core exam, particularly the differences between internal and external stages, file format options, and the role of the GET command.
