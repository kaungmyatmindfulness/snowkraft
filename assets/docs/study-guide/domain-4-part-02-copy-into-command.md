# Domain 4: Data Loading & Unloading

## Part 2: COPY INTO Command for Loading Data

This section covers the COPY INTO &lt;table&gt; command, the primary method for bulk loading data into Snowflake. Understanding the COPY command syntax, options, error handling, and validation modes is essential for the SnowPro Core exam, as data loading accounts for 10-15% of exam questions.

---

## 1. COPY INTO &lt;table&gt; Overview

### 1.1 What Is the COPY INTO Command?

The **COPY INTO &lt;table&gt;** command is Snowflake's primary mechanism for bulk loading data from staged files into tables. It copies data from internal stages, external stages, or external cloud storage locations into a target table.

**Key Characteristics:**
- Most important data loading method for the exam
- Requires a user-created virtual warehouse
- Supports both structured and semi-structured file formats
- Maintains load metadata to prevent duplicate loading
- Supports data transformation during the load process

**Basic Syntax:**
```sql
COPY INTO <table_name>
FROM { internalStage | externalStage | externalLocation }
[ FILES = ( '<file_name>' [ , '<file_name>' ] [ , ... ] ) ]
[ PATTERN = '<regex_pattern>' ]
[ FILE_FORMAT = ( { FORMAT_NAME = '<file_format_name>' |
                    TYPE = { CSV | JSON | AVRO | ORC | PARQUET | XML } [ ... ] } ) ]
[ copyOptions ]
[ VALIDATION_MODE = RETURN_<n>_ROWS | RETURN_ERRORS | RETURN_ALL_ERRORS ]
```

### 1.2 Data Flow: Stage to Table

```
                                   COPY INTO <table>
                                        |
+------------------+               +----v-----+               +--------------+
|  Staged Files    |  ---------->  | Virtual  |  ---------->  |   Target     |
| (Internal/       |               | Warehouse|               |   Table      |
|  External Stage) |               +----------+               +--------------+
+------------------+                    |
                                 File Format +
                                 Copy Options
```

**Loading Process:**
1. Files are staged in an internal or external stage
2. COPY INTO command is executed with a virtual warehouse
3. Warehouse reads files according to file format specifications
4. Data is loaded, transformed (if specified), and inserted into target table
5. Load metadata is recorded to prevent duplicate loading

---

## 2. Selecting Files to Load

### 2.1 Three Methods for File Selection

The COPY command supports three options for identifying files to load:

| Method | Parameter | Description | Performance |
|--------|-----------|-------------|-------------|
| **Path/Prefix** | FROM clause | Load all files at a path | Medium |
| **File List** | FILES | Specify exact file names | Fastest |
| **Pattern** | PATTERN | Regular expression match | Slowest |

### 2.2 Loading by Path (Default)

Load all files from a specified stage location:

```sql
-- Load all files from named stage
COPY INTO my_table FROM @my_stage;

-- Load files from a specific path in the stage
COPY INTO my_table FROM @my_stage/data/2024/01/;

-- Load from table stage
COPY INTO my_table FROM @%my_table;

-- Load from user stage
COPY INTO my_table FROM @~;
```

### 2.3 Loading Specific Files (FILES Parameter)

Specify a discrete list of files to load:

```sql
COPY INTO my_table
FROM @my_stage/data/
FILES = ('file1.csv', 'file2.csv', 'file3.csv');
```

**Key Points:**
- **Maximum 1,000 files** can be specified in the FILES parameter
- This is generally the **fastest** file selection method
- File names must match exactly (case-sensitive for cloud storage)

### 2.4 Loading by Pattern (PATTERN Parameter)

Use regular expressions to match file names:

```sql
-- Load files starting with 'data_' and ending in '.csv'
COPY INTO my_table
FROM @my_stage
PATTERN = 'data_.*\.csv';

-- Load files for specific date ranges
COPY INTO my_table
FROM @my_stage
PATTERN = '.*2024-01-[0-9]{2}.*\.csv';

-- Load files with specific prefixes
COPY INTO my_table
FROM @my_stage
PATTERN = '.*sales_[0-9]+\.csv';
```

**Important Notes:**
- Pattern matching is the **slowest** method (scans all file metadata)
- Uses Java regular expression syntax
- Applied differently for bulk loads vs. Snowpipe:
  - **Bulk loading**: Applied to entire storage location path
  - **Snowpipe**: Applied after trimming stage path from location

**Best Practice:** Use path-based loading when possible. Reserve PATTERN for cases where cloud provider event filtering is insufficient.

---

## 3. Critical COPY Options

### 3.1 Complete COPY Options Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| **ON_ERROR** | String | ABORT_STATEMENT | Error handling behavior |
| **PURGE** | Boolean | FALSE | Delete files after successful load |
| **FORCE** | Boolean | FALSE | Reload files regardless of load status |
| **SIZE_LIMIT** | Number | None | Maximum data size to load (bytes) |
| **RETURN_FAILED_ONLY** | Boolean | FALSE | Return only rows that failed |
| **TRUNCATECOLUMNS** | Boolean | FALSE | Truncate strings exceeding column length |
| **MATCH_BY_COLUMN_NAME** | String | NONE | Match file columns to table columns by name |
| **ENFORCE_LENGTH** | Boolean | TRUE | Enforce VARCHAR length limits |
| **LOAD_UNCERTAIN_FILES** | Boolean | FALSE | Load files with unknown status |

### 3.2 ON_ERROR Option (Critical for Exam)

The ON_ERROR option controls how the COPY command handles errors. This is one of the most frequently tested topics.

**ON_ERROR Values:**

| Value | Behavior | Use Case |
|-------|----------|----------|
| **ABORT_STATEMENT** | Stop entire operation on first error | Production loads requiring data integrity (default for bulk) |
| **CONTINUE** | Skip failed rows, continue loading | Data exploration, tolerating some bad records |
| **SKIP_FILE** | Skip entire file with any error | Skip problematic files |
| **SKIP_FILE_n** | Skip file if error count >= n | Skip files exceeding error threshold |
| **SKIP_FILE_n%** | Skip file if error percentage >= n% | Skip files with high error rates |

**Examples:**

```sql
-- Default: Abort on any error
COPY INTO my_table
FROM @my_stage
ON_ERROR = ABORT_STATEMENT;

-- Continue despite errors (load all good rows)
COPY INTO my_table
FROM @my_stage
ON_ERROR = CONTINUE;

-- Skip entire file if any error occurs
COPY INTO my_table
FROM @my_stage
ON_ERROR = SKIP_FILE;

-- Skip file if 10 or more errors
COPY INTO my_table
FROM @my_stage
ON_ERROR = SKIP_FILE_10;

-- Skip file if 5% or more rows have errors
COPY INTO my_table
FROM @my_stage
ON_ERROR = 'SKIP_FILE_5%';
```

**Exam Tip:** The default ON_ERROR for bulk loading is **ABORT_STATEMENT**. For Snowpipe, the default is **SKIP_FILE**.

### 3.3 PURGE Option

Automatically remove successfully loaded files from the stage:

```sql
COPY INTO my_table
FROM @my_stage
PURGE = TRUE;
```

**Key Points:**
- Only removes files that were **successfully** loaded
- Files that failed to load remain in the stage
- Helps manage stage storage and costs
- Use cautiously - deleted files cannot be recovered from Snowflake
- **Silent failure:** If the PURGE operation fails for any reason, **no error is returned**. The data load itself succeeds, but the staged files remain. This is important for troubleshooting -- if files persist in a stage after a COPY with PURGE = TRUE, it does not necessarily mean the load failed.

### 3.4 FORCE Option

Bypass the duplicate file detection and reload files:

```sql
COPY INTO my_table
FROM @my_stage
FORCE = TRUE;
```

**When to Use:**
- Re-loading data after fixing file errors
- Loading the same file to multiple tables
- Testing and development scenarios

**Warning:** FORCE can cause **duplicate data** if used carelessly. Snowflake does not deduplicate rows.

### 3.5 TRUNCATECOLUMNS Option

Truncate string values that exceed column length instead of failing:

```sql
COPY INTO my_table
FROM @my_stage
TRUNCATECOLUMNS = TRUE;  -- Also written as ENFORCE_LENGTH = FALSE
```

**Behavior:**
- With TRUNCATECOLUMNS = FALSE (default): Error if string exceeds column length
- With TRUNCATECOLUMNS = TRUE: Silently truncate string to fit column

---

## 4. Load Metadata and Duplicate Prevention

### 4.1 How Load Metadata Works

Snowflake maintains detailed metadata for each table to prevent loading the same file multiple times:

**Tracked Metadata Includes:**
- File name (including path)
- File size
- ETag (checksum) for the file
- Number of rows parsed
- Timestamp of last load
- Any errors encountered

### 4.2 The 64-Day Rule

**Critical Exam Concept:** Load metadata expires after **64 days**.

| Scenario | Load Behavior |
|----------|---------------|
| File loaded within 64 days | COPY skips file (prevents duplicates) |
| File LAST_MODIFIED within 64 days | COPY can determine load status |
| File older than 64 days, never loaded | COPY may skip file by default |
| File older than 64 days, loaded within 64 days | COPY skips file |

**What is LAST_MODIFIED?**
- The timestamp when the file was initially staged OR last modified
- Whichever is more recent

**Three Conditions That Make a File "New/Unknown" to COPY INTO:**

Snowflake treats a file as new (status unknown) and may skip it by default when ANY of these conditions is true:

1. **The file's LAST_MODIFIED date is older than 64 days** -- the file was staged or last modified more than 64 days ago
2. **The initial data load into the table occurred more than 64 days earlier** -- the very first COPY INTO for the table happened so long ago that early metadata has aged out
3. **The file was already loaded more than 64 days earlier** -- the file's specific load record has expired from the metadata

When a file is in this "unknown" state, COPY INTO skips it by default to avoid potential duplicates. Use `LOAD_UNCERTAIN_FILES = TRUE` or `FORCE = TRUE` to override this behavior.

### 4.3 Loading Older Files

When files have metadata older than 64 days and their load status is unknown:

**Option 1: LOAD_UNCERTAIN_FILES**
```sql
COPY INTO my_table
FROM @my_stage
LOAD_UNCERTAIN_FILES = TRUE;
```
- References available load metadata to avoid duplicates
- Attempts to load files with expired metadata

**Option 2: FORCE**
```sql
COPY INTO my_table
FROM @my_stage
FORCE = TRUE;
```
- Loads ALL files regardless of load status
- Risk of duplicate data

**Best Practice:** Use LOAD_UNCERTAIN_FILES for historical data. Use FORCE only when you are certain duplicates are acceptable or will be handled downstream.

---

## 5. Validation Mode

### 5.1 VALIDATION_MODE Overview

VALIDATION_MODE allows you to **dry run** a COPY command to validate data without actually loading it.

**Key Point:** When VALIDATION_MODE is specified, **no data is loaded** - only validation is performed.

### 5.2 VALIDATION_MODE Values

| Value | Behavior |
|-------|----------|
| **RETURN_n_ROWS** | Validate first n rows, fail on first error |
| **RETURN_ERRORS** | Return all errors from validated rows |
| **RETURN_ALL_ERRORS** | Return ALL errors including partial load errors |

**Examples:**

```sql
-- Validate first 100 rows
COPY INTO my_table
FROM @my_stage
FILE_FORMAT = (TYPE = CSV SKIP_HEADER = 1)
VALIDATION_MODE = RETURN_10_ROWS;

-- Return all errors found during validation
COPY INTO my_table
FROM @my_stage
FILE_FORMAT = (TYPE = CSV SKIP_HEADER = 1)
VALIDATION_MODE = RETURN_ERRORS;

-- Return all errors including partial load scenarios
COPY INTO my_table
FROM @my_stage
FILE_FORMAT = (TYPE = CSV SKIP_HEADER = 1)
VALIDATION_MODE = RETURN_ALL_ERRORS;
```

### 5.3 Validating Past COPY Executions

Use the **VALIDATE** table function to check errors from a previously executed COPY:

```sql
-- Validate using job ID
SELECT * FROM TABLE(VALIDATE(my_table, JOB_ID => '019323dc-0500-4321-0000-0001234abcd'));

-- Validate the most recent COPY job
SELECT * FROM TABLE(VALIDATE(my_table, JOB_ID => '_last'));
```

**VALIDATE Output Columns:**
- ERROR
- FILE
- LINE
- CHARACTER
- BYTE_OFFSET
- CATEGORY
- CODE
- SQL_STATE
- COLUMN_NAME
- ROW_NUMBER
- ROW_START_LINE
- REJECTED_RECORD

### 5.4 Limitations of VALIDATION_MODE

**Important:** VALIDATION_MODE does NOT work with:
- Data transformations (SELECT from stage with column expressions)
- MATCH_BY_COLUMN_NAME option
- Some file format configurations

> **Exam Trap:** VALIDATION_MODE does **NOT** support COPY statements that transform data during loading. If you specify VALIDATION_MODE together with a data transformation query (e.g., `COPY INTO table FROM (SELECT $1, UPPER($2) FROM @stage)`), the COPY command **returns an error** -- it will not silently ignore the validation or skip the transformation. You must remove the VALIDATION_MODE parameter or remove the transformation to proceed.

---

## 6. Load Metadata Columns

### 6.1 Available Metadata Columns

When loading data, you can include metadata about the source files:

| Metadata Column | Description | Data Type |
|-----------------|-------------|-----------|
| **METADATA$FILENAME** | Full path and name of source file | VARCHAR |
| **METADATA$FILE_ROW_NUMBER** | Row number within the file | NUMBER |
| **METADATA$FILE_CONTENT_KEY** | Checksum/ETag of the source file | VARCHAR |
| **METADATA$FILE_LAST_MODIFIED** | Last modified timestamp of file | TIMESTAMP_NTZ |
| **METADATA$START_SCAN_TIME** | When Snowflake started scanning the row | TIMESTAMP_LTZ |

### 6.2 Loading Metadata into Tables

Use data transformation syntax to include metadata columns:

```sql
-- Create table with metadata columns
CREATE TABLE my_table (
  id INTEGER,
  name VARCHAR,
  source_file VARCHAR,
  row_num INTEGER,
  load_time TIMESTAMP_LTZ
);

-- Load data with metadata
COPY INTO my_table
FROM (
  SELECT
    $1::INTEGER,
    $2::VARCHAR,
    METADATA$FILENAME,
    METADATA$FILE_ROW_NUMBER,
    METADATA$START_SCAN_TIME
  FROM @my_stage
)
FILE_FORMAT = (TYPE = CSV SKIP_HEADER = 1);
```

### 6.3 Querying Metadata Directly from Stage

You can query metadata without loading:

```sql
SELECT
  METADATA$FILENAME,
  METADATA$FILE_ROW_NUMBER,
  METADATA$FILE_CONTENT_KEY,
  METADATA$FILE_LAST_MODIFIED,
  METADATA$START_SCAN_TIME,
  $1, $2, $3
FROM @my_stage
(FILE_FORMAT => 'my_csv_format');
```

**Use Case:** METADATA$START_SCAN_TIME is recommended over CURRENT_TIMESTAMP for capturing accurate load times, as it reflects when Snowflake actually processed each row.

---

## 7. Monitoring Load History with COPY_HISTORY

### 7.1 COPY_HISTORY Table Function

Query load history for the past 14 days for a specific table:

```sql
SELECT *
FROM TABLE(INFORMATION_SCHEMA.COPY_HISTORY(
  TABLE_NAME => 'MY_TABLE',
  START_TIME => DATEADD(hours, -24, CURRENT_TIMESTAMP())
));
```

**Key Columns:**
- FILE_NAME
- STAGE_LOCATION
- STATUS (Loaded, Load Failed, Partially Loaded)
- ROW_COUNT
- ROW_PARSED
- FIRST_ERROR_MESSAGE
- FIRST_ERROR_LINE_NUMBER
- FIRST_ERROR_CHARACTER_POS
- ERROR_COUNT
- ERROR_LIMIT
- LOAD_TIME (when load started)

### 7.2 COPY_HISTORY View (Account Usage)

For historical data up to 365 days:

```sql
SELECT
  file_name,
  table_name,
  status,
  row_count,
  first_error_message,
  last_load_time
FROM SNOWFLAKE.ACCOUNT_USAGE.COPY_HISTORY
WHERE table_name = 'MY_TABLE'
  AND last_load_time > DATEADD(day, -7, CURRENT_TIMESTAMP())
ORDER BY last_load_time DESC;
```

**Key Differences:**

| Aspect | COPY_HISTORY Function | COPY_HISTORY View |
|--------|----------------------|-------------------|
| Location | INFORMATION_SCHEMA | ACCOUNT_USAGE |
| History | 14 days | 365 days |
| Latency | Near real-time | Up to 2 hours |
| Scope | Single table | All tables in account |
| Requires | USAGE on table | Access to SNOWFLAKE database |

---

## 8. Data Transformation During Load

### 8.1 Transformation Capabilities

The COPY command supports transformations using a SELECT subquery:

**Supported Transformations:**
- Column reordering
- Column omission
- Data type casting
- String truncation
- Function application (limited)
- Including metadata columns

**Basic Transformation Syntax:**
```sql
COPY INTO target_table
FROM (
  SELECT
    $1::INTEGER AS id,
    $2::VARCHAR AS name,
    $3::DATE AS birth_date,
    UPPER($4) AS city,
    METADATA$FILENAME AS source_file
  FROM @my_stage
)
FILE_FORMAT = (TYPE = CSV SKIP_HEADER = 1);
```

### 8.2 Column Notation

Access columns in staged files:

| Notation | Description | Example |
|----------|-------------|---------|
| **$1, $2, $3...** | Column position (1-indexed) | SELECT $1, $3 FROM @stage |
| **$1:field** | JSON/VARIANT field access | SELECT $1:name FROM @stage |
| **METADATA$** | File metadata columns | SELECT METADATA$FILENAME |

### 8.3 Transformation Examples

```sql
-- Reorder and cast columns
COPY INTO employees
FROM (
  SELECT $3::INTEGER, $1::VARCHAR, $2::DATE
  FROM @my_stage
)
FILE_FORMAT = my_csv_format;

-- Load JSON with field extraction
COPY INTO customers
FROM (
  SELECT
    $1:id::INTEGER,
    $1:name::VARCHAR,
    $1:email::VARCHAR,
    $1:signup_date::DATE
  FROM @my_stage
)
FILE_FORMAT = (TYPE = JSON);

-- Load with computed columns
COPY INTO sales_summary
FROM (
  SELECT
    $1::DATE AS sale_date,
    $2::INTEGER AS quantity,
    $3::DECIMAL(10,2) AS unit_price,
    ($2::INTEGER * $3::DECIMAL(10,2)) AS total_amount
  FROM @my_stage
)
FILE_FORMAT = my_csv_format;
```

### 8.4 Transformation Limitations

**Cannot use in transformations:**
- WHERE clause filtering
- ORDER BY, LIMIT, FETCH, TOP
- Aggregate functions
- Window functions
- VALIDATION_MODE (not compatible with transformations)

---

## 9. MATCH_BY_COLUMN_NAME Option

### 9.1 Overview

Automatically match columns in source files to table columns by name:

```sql
COPY INTO my_table
FROM @my_stage
FILE_FORMAT = (TYPE = JSON)
MATCH_BY_COLUMN_NAME = CASE_INSENSITIVE;
```

**Values:**
- **NONE** (default): Match by column position
- **CASE_SENSITIVE**: Match by name, exact case
- **CASE_INSENSITIVE**: Match by name, ignore case

### 9.2 Use Cases

**Best for:**
- JSON, Parquet, Avro files with named columns
- CSV files with PARSE_HEADER = TRUE
- Schema evolution scenarios

**Example with CSV and PARSE_HEADER:**
```sql
-- CSV file has header: id,name,email
CREATE TABLE users (id INTEGER, name VARCHAR, email VARCHAR);

COPY INTO users
FROM @my_stage
FILE_FORMAT = (TYPE = CSV PARSE_HEADER = TRUE)
MATCH_BY_COLUMN_NAME = CASE_INSENSITIVE;
```

### 9.3 Schema Evolution

Enable automatic schema evolution when loading:

```sql
ALTER TABLE my_table SET ENABLE_SCHEMA_EVOLUTION = TRUE;

COPY INTO my_table
FROM @my_stage
FILE_FORMAT = (TYPE = PARQUET)
MATCH_BY_COLUMN_NAME = CASE_INSENSITIVE;
```

**Requirements for schema evolution:**
- Table has ENABLE_SCHEMA_EVOLUTION = TRUE
- COPY uses MATCH_BY_COLUMN_NAME
- Role has EVOLVE SCHEMA or OWNERSHIP privilege

---

## 10. Exam Tips and Common Question Patterns

### 10.1 Frequently Tested Concepts

1. **ON_ERROR default**: ABORT_STATEMENT for bulk loading (SKIP_FILE for Snowpipe)
2. **Load metadata expiration**: 64 days
3. **FILES parameter limit**: Maximum 1,000 files
4. **VALIDATION_MODE**: Does NOT load data, only validates
5. **FORCE option**: Bypasses duplicate detection, risks duplicate data
6. **PURGE option**: Removes ONLY successfully loaded files
7. **File selection speed**: FILES (fastest) > Path > PATTERN (slowest)

### 10.2 Common Exam Traps

| Trap | Correct Understanding |
|------|----------------------|
| FORCE loads unique data only | FORCE can create duplicates |
| PURGE removes all files | PURGE only removes successfully loaded files |
| Load metadata lasts forever | Metadata expires after 64 days |
| VALIDATION_MODE loads partial data | VALIDATION_MODE loads NO data |
| VALIDATION_MODE works with transformations | VALIDATION_MODE returns an **error** when used with data transformations |
| ON_ERROR = CONTINUE skips files | ON_ERROR = CONTINUE skips ROWS, not files |
| PATTERN is fastest for file selection | FILES (discrete list) is fastest |
| PURGE failure causes an error | PURGE failures are **silent** -- no error is returned |

### 10.3 Key SQL Commands to Know

```sql
-- Basic COPY with common options
COPY INTO my_table
FROM @my_stage
FILE_FORMAT = my_format
ON_ERROR = CONTINUE
PURGE = TRUE;

-- COPY with validation (no load)
COPY INTO my_table
FROM @my_stage
VALIDATION_MODE = RETURN_ERRORS;

-- COPY with specific files
COPY INTO my_table
FROM @my_stage
FILES = ('data1.csv', 'data2.csv');

-- COPY with pattern
COPY INTO my_table
FROM @my_stage
PATTERN = '.*2024.*\.csv';

-- COPY with transformation
COPY INTO my_table
FROM (SELECT $1, $2::DATE, UPPER($3) FROM @my_stage)
FILE_FORMAT = my_format;

-- Validate past COPY
SELECT * FROM TABLE(VALIDATE(my_table, JOB_ID => '_last'));

-- Query COPY history
SELECT * FROM TABLE(INFORMATION_SCHEMA.COPY_HISTORY(
  TABLE_NAME => 'MY_TABLE',
  START_TIME => DATEADD(day, -7, CURRENT_TIMESTAMP())
));
```

### 10.4 Practice Questions

**Question 1:** What is the default ON_ERROR behavior for bulk loading with COPY INTO?
- A) CONTINUE
- B) SKIP_FILE
- C) ABORT_STATEMENT
- D) SKIP_FILE_10%

**Answer:** C - ABORT_STATEMENT is the default for bulk loading. The entire operation stops on the first error.

---

**Question 2:** How long does Snowflake retain load metadata for tables?
- A) 14 days
- B) 30 days
- C) 64 days
- D) 365 days

**Answer:** C - Load metadata expires after 64 days. Files older than 64 days with unknown load status may be skipped by default.

---

**Question 3:** Which COPY option allows you to reload a file that was previously loaded successfully?
- A) PURGE = TRUE
- B) FORCE = TRUE
- C) LOAD_UNCERTAIN_FILES = TRUE
- D) ON_ERROR = CONTINUE

**Answer:** B - FORCE = TRUE bypasses the duplicate file detection and reloads files regardless of their previous load status.

---

**Question 4:** What is the maximum number of files that can be specified in the FILES parameter?
- A) 100
- B) 500
- C) 1,000
- D) Unlimited

**Answer:** C - The FILES parameter supports a maximum of 1,000 files per COPY statement.

---

**Question 5:** What does VALIDATION_MODE = RETURN_ERRORS do?
- A) Loads data and returns only the rows with errors
- B) Validates without loading and returns all errors found
- C) Loads data and aborts on first error, returning it
- D) Validates without loading and returns only the first error

**Answer:** B - VALIDATION_MODE performs validation WITHOUT loading any data and returns all errors encountered.

---

**Question 6:** Which file selection method is generally the fastest?
- A) Path-based loading
- B) PATTERN with regular expression
- C) FILES with discrete file list
- D) All methods have the same performance

**Answer:** C - Providing a discrete list of files (FILES parameter) is generally the fastest method. PATTERN matching is the slowest.

---

**Question 7:** What happens when ON_ERROR = CONTINUE and a row fails to load?
- A) The entire file is skipped
- B) The COPY command aborts immediately
- C) The failed row is skipped, loading continues
- D) The failed row is loaded with NULL values

**Answer:** C - With ON_ERROR = CONTINUE, failed rows are skipped and loading continues with subsequent rows.

---

**Question 8:** Which metadata column provides the most accurate timestamp for when a row was loaded?
- A) CURRENT_TIMESTAMP
- B) METADATA$FILE_LAST_MODIFIED
- C) METADATA$START_SCAN_TIME
- D) LOAD_TIME

**Answer:** C - METADATA$START_SCAN_TIME provides an accurate representation of when Snowflake actually processed each record, unlike CURRENT_TIMESTAMP which may vary.

---

## 11. Quick Reference

### ON_ERROR Values Summary

| Value | Behavior |
|-------|----------|
| ABORT_STATEMENT | Stop on first error (default for bulk) |
| CONTINUE | Skip failed rows, continue loading |
| SKIP_FILE | Skip entire file on any error |
| SKIP_FILE_n | Skip file if n or more errors |
| SKIP_FILE_n% | Skip file if n% or more rows fail |

### VALIDATION_MODE Values Summary

| Value | Behavior |
|-------|----------|
| RETURN_n_ROWS | Validate n rows, stop on first error |
| RETURN_ERRORS | Return all errors from validation |
| RETURN_ALL_ERRORS | Include partial load errors |

### File Selection Methods

| Method | Speed | Limit |
|--------|-------|-------|
| FILES | Fastest | 1,000 files |
| Path | Medium | None |
| PATTERN | Slowest | None |

### Key Time Periods

| Item | Retention |
|------|-----------|
| Load metadata (table) | 64 days |
| Snowpipe load metadata | 14 days |
| COPY_HISTORY function | 14 days |
| COPY_HISTORY view | 365 days |

### Metadata Columns

| Column | Description |
|--------|-------------|
| METADATA$FILENAME | Source file path and name |
| METADATA$FILE_ROW_NUMBER | Row position in file |
| METADATA$FILE_CONTENT_KEY | File checksum/ETag |
| METADATA$FILE_LAST_MODIFIED | File last modified time |
| METADATA$START_SCAN_TIME | Row scan timestamp |

---

**Key Takeaway:** The COPY INTO command is the foundation of bulk data loading in Snowflake. Understanding the ON_ERROR options, load metadata retention (64 days), validation modes, and file selection methods is critical for the SnowPro Core exam. Remember that VALIDATION_MODE does not load data, FORCE can create duplicates, and load metadata prevents reloading the same files within 64 days.
