# Domain 4: Data Loading & Unloading
## Part 10: Schema Detection and Evolution

**Exam Weight:** This topic is part of Domain 4: Data Loading & Unloading (10-15% of exam)

---

## Overview

Schema detection and evolution are powerful Snowflake features that automate the process of creating and maintaining table schemas based on the structure of incoming data files. These features are particularly valuable when dealing with semi-structured data that evolves over time, allowing tables to automatically adapt to new columns without manual intervention.

---

## Section 1: Schema Detection Fundamentals

### What is Schema Detection?

Schema detection is the ability to automatically identify and extract column definitions from staged data files. Snowflake can analyze files in a stage and infer:

- Column names
- Data types
- Nullability constraints
- Column ordering

### Supported File Formats for Schema Detection

| File Format | Schema Detection Support | Notes |
|-------------|-------------------------|-------|
| **Parquet** | Full support | Embedded schema in file metadata |
| **Avro** | Full support | Schema embedded in file |
| **ORC** | Full support | Schema embedded in file |
| **JSON** | Full support | Types inferred from data values |
| **CSV** | Supported with PARSE_HEADER | Requires header row for column names |

**Exam Tip:** Schema detection works with all major semi-structured formats. For CSV files, the `PARSE_HEADER` option must be enabled to detect column names from the first row.

---

## Section 2: The INFER_SCHEMA Function

### Function Overview

`INFER_SCHEMA` is a table function that detects the file metadata schema (column definitions) in a set of staged data files.

### Basic Syntax

```sql
SELECT *
FROM TABLE(
    INFER_SCHEMA(
        LOCATION => '@<stage_name>/<path>',
        FILE_FORMAT => '<file_format_name>'
    )
);
```

### INFER_SCHEMA Parameters

| Parameter | Description | Required |
|-----------|-------------|----------|
| **LOCATION** | Stage location containing files to analyze | Yes |
| **FILE_FORMAT** | Named file format or inline specification | Yes |
| **FILES** | Specific files to analyze (optional) | No |
| **IGNORE_CASE** | Ignore case for column name comparison | No |

### INFER_SCHEMA Output Columns

The function returns a table with the following columns:

| Output Column | Description |
|---------------|-------------|
| **COLUMN_NAME** | Name of the detected column |
| **TYPE** | Inferred Snowflake data type |
| **NULLABLE** | Whether the column allows NULL values |
| **EXPRESSION** | Expression to extract the column (for semi-structured data) |
| **FILENAMES** | Files where this column was found |
| **ORDER_ID** | Position of the column in the source file |

### INFER_SCHEMA Example

```sql
-- Create a file format for Parquet files
CREATE OR REPLACE FILE FORMAT my_parquet_format
    TYPE = PARQUET;

-- Detect schema from staged Parquet files
SELECT *
FROM TABLE(
    INFER_SCHEMA(
        LOCATION => '@my_stage/data/',
        FILE_FORMAT => 'my_parquet_format'
    )
);

-- Example output:
-- +-------------+-------------------+----------+------------+------------------+----------+
-- | COLUMN_NAME | TYPE              | NULLABLE | EXPRESSION | FILENAMES        | ORDER_ID |
-- +-------------+-------------------+----------+------------+------------------+----------+
-- | id          | NUMBER(38,0)      | FALSE    | $1:id      | data/file1.parq  | 0        |
-- | name        | VARCHAR(16777216) | TRUE     | $1:name    | data/file1.parq  | 1        |
-- | created_at  | TIMESTAMP_NTZ(6)  | TRUE     | $1:created | data/file1.parq  | 2        |
-- +-------------+-------------------+----------+------------+------------------+----------+
```

### Using INFER_SCHEMA with ICEBERG Tables

For Iceberg tables, use the `KIND` parameter:

```sql
SELECT *
FROM TABLE(
    INFER_SCHEMA(
        LOCATION => '@my_stage/iceberg_files/',
        FILE_FORMAT => 'my_parquet_format',
        KIND => 'ICEBERG'
    )
);
```

**Exam Tip:** The `KIND => 'ICEBERG'` parameter is required when inferring schema for Iceberg table creation.

---

## Section 3: GENERATE_COLUMN_DESCRIPTION Function

### Function Purpose

`GENERATE_COLUMN_DESCRIPTION` transforms INFER_SCHEMA output into a format suitable for column definitions in DDL statements.

### Usage with INFER_SCHEMA

```sql
-- Generate column description from staged files
SELECT GENERATE_COLUMN_DESCRIPTION(
    ARRAY_AGG(OBJECT_CONSTRUCT(*)),
    'TABLE'
)
FROM TABLE(
    INFER_SCHEMA(
        LOCATION => '@my_stage/data/',
        FILE_FORMAT => 'my_parquet_format'
    )
);
```

### Output Types

| Mode | Description | Use Case |
|------|-------------|----------|
| **'TABLE'** | Standard table column definitions | Regular tables |
| **'EXTERNAL_TABLE'** | External table column definitions | External tables |

---

## Section 4: CREATE TABLE USING TEMPLATE

### Automatic Table Creation from Schema Detection

The `USING TEMPLATE` clause allows creating tables with column definitions automatically derived from staged files.

### Syntax

```sql
CREATE [OR REPLACE] TABLE <table_name>
    USING TEMPLATE (
        SELECT ARRAY_AGG(OBJECT_CONSTRUCT(*))
        FROM TABLE(
            INFER_SCHEMA(
                LOCATION => '@<stage>/<path>',
                FILE_FORMAT => '<format>'
            )
        )
    );
```

### Complete Example: Schema Detection to Table Creation

```sql
-- Step 1: Create file format
CREATE OR REPLACE FILE FORMAT my_parquet_format
    TYPE = PARQUET;

-- Step 2: Create table using detected schema
CREATE OR REPLACE TABLE sales_data
    USING TEMPLATE (
        SELECT ARRAY_AGG(OBJECT_CONSTRUCT(*))
        FROM TABLE(
            INFER_SCHEMA(
                LOCATION => '@my_stage/sales/',
                FILE_FORMAT => 'my_parquet_format'
            )
        )
    );

-- Step 3: Load data with column matching
COPY INTO sales_data
FROM @my_stage/sales/
FILE_FORMAT = (TYPE = PARQUET)
MATCH_BY_COLUMN_NAME = CASE_INSENSITIVE;
```

### With Column Ordering

To ensure consistent column ordering:

```sql
CREATE TABLE ordered_table
    USING TEMPLATE (
        SELECT ARRAY_AGG(OBJECT_CONSTRUCT(*))
        WITHIN GROUP (ORDER BY order_id)
        FROM TABLE(
            INFER_SCHEMA(
                LOCATION => '@my_stage/data/',
                FILE_FORMAT => 'my_parquet_format'
            )
        )
    );
```

**Exam Tip:** The `WITHIN GROUP (ORDER BY order_id)` clause ensures columns are created in the same order as they appear in the source file.

---

## Section 5: Table Schema Evolution

### What is Schema Evolution?

Schema evolution is Snowflake's ability to automatically modify table schemas to accommodate new data structures during loading. This enables:

- **Automatic column addition** - New columns added when detected in source files
- **NOT NULL constraint removal** - Constraints dropped when columns are missing from new data

### Enabling Schema Evolution

Schema evolution requires three conditions to be met:

| Requirement | Description |
|-------------|-------------|
| **Table Parameter** | `ENABLE_SCHEMA_EVOLUTION = TRUE` on the target table |
| **COPY Option** | `MATCH_BY_COLUMN_NAME` option in COPY statement |
| **Privileges** | `EVOLVE SCHEMA` or `OWNERSHIP` privilege on the table |

### Setting Up Schema Evolution

**For New Tables:**
```sql
CREATE TABLE evolving_table (
    id NUMBER,
    name VARCHAR
)
ENABLE_SCHEMA_EVOLUTION = TRUE;
```

**For Existing Tables:**
```sql
ALTER TABLE existing_table
SET ENABLE_SCHEMA_EVOLUTION = TRUE;
```

### Granting EVOLVE SCHEMA Privilege

```sql
-- Grant privilege to allow schema evolution
GRANT EVOLVE SCHEMA ON TABLE my_table TO ROLE data_loader_role;
```

**Exam Tip:** The `EVOLVE SCHEMA` privilege is a specific table privilege that allows a role to trigger schema evolution during data loads without having full `OWNERSHIP` of the table.

---

## Section 6: MATCH_BY_COLUMN_NAME Option

### Purpose

The `MATCH_BY_COLUMN_NAME` option in COPY INTO commands loads data by matching source column names to target table columns, rather than by position.

### Option Values

| Value | Description |
|-------|-------------|
| **NONE** | Disabled (default) - load by position |
| **CASE_SENSITIVE** | Match column names exactly (case-sensitive) |
| **CASE_INSENSITIVE** | Match column names ignoring case |

### Usage Example

```sql
-- Load with case-insensitive column matching
COPY INTO my_table
FROM @my_stage/data.parquet
FILE_FORMAT = (TYPE = PARQUET)
MATCH_BY_COLUMN_NAME = CASE_INSENSITIVE;
```

### Important Behaviors

**With CASE_INSENSITIVE:**
- All column names are converted to uppercase in the target table
- Source columns 'CustomerID', 'customerid', 'CUSTOMERID' all match to 'CUSTOMERID'

**With CASE_SENSITIVE:**
- Exact case matching required
- 'CustomerID' and 'customerid' are treated as different columns

### MATCH_BY_COLUMN_NAME with Schema Evolution

When combined with `ENABLE_SCHEMA_EVOLUTION = TRUE`:

```sql
-- Schema-evolving load
COPY INTO evolving_table
FROM @my_stage/new_data.parquet
FILE_FORMAT = (TYPE = PARQUET)
MATCH_BY_COLUMN_NAME = CASE_INSENSITIVE;
```

New columns in the source file are automatically added to the table.

---

## Section 7: CSV Schema Evolution Requirements

### Additional CSV Requirements

For CSV files, schema evolution requires additional configuration:

| Option | Required Setting | Purpose |
|--------|------------------|---------|
| **PARSE_HEADER** | TRUE | Enables reading column names from first row |
| **ERROR_ON_COLUMN_COUNT_MISMATCH** | FALSE | Allows files with different column counts |

### Complete CSV Schema Evolution Example

```sql
-- Create CSV file format with schema evolution support
CREATE OR REPLACE FILE FORMAT csv_evolving
    TYPE = CSV
    PARSE_HEADER = TRUE
    ERROR_ON_COLUMN_COUNT_MISMATCH = FALSE;

-- Create table with schema evolution
CREATE TABLE csv_target (
    id NUMBER,
    name VARCHAR
)
ENABLE_SCHEMA_EVOLUTION = TRUE;

-- Load CSV with schema evolution
COPY INTO csv_target
FROM @my_stage/data.csv
FILE_FORMAT = csv_evolving
MATCH_BY_COLUMN_NAME = CASE_INSENSITIVE;
```

**Exam Tip:** For CSV schema evolution, you must set `PARSE_HEADER = TRUE` and `ERROR_ON_COLUMN_COUNT_MISMATCH = FALSE`. These are commonly tested options.

---

## Section 8: Schema Evolution Types

### Types of Schema Changes

| Evolution Type | Description | Tracked |
|----------------|-------------|---------|
| **ADD_COLUMN** | New column added to table | Yes |
| **DROP_NOT_NULL** | NOT NULL constraint removed | Yes |

### SchemaEvolutionRecord

Snowflake tracks schema changes in the `SchemaEvolutionRecord` column visible via `DESCRIBE TABLE`:

```sql
DESCRIBE TABLE evolving_table;

-- Output includes schema evolution record column:
-- | name | type    | ... | schema evolution record                                    |
-- |------|---------|-----|-----------------------------------------------------------|
-- | COL4 | VARCHAR | ... | {"evolutionType":"ADD_COLUMN","evolutionMode":"COPY",...} |
```

### Schema Evolution Record Fields

| Field | Description |
|-------|-------------|
| **evolutionType** | Type of change (ADD_COLUMN, DROP_NOT_NULL) |
| **evolutionMode** | Method used (COPY, SNOWPIPE) |
| **fileName** | File that triggered evolution |
| **triggeringTime** | When evolution occurred |
| **queryId** | Query ID that triggered evolution |

---

## Section 9: Schema Evolution Limitations

### Key Limitations

| Limitation | Details |
|------------|---------|
| **Maximum new columns** | 100 columns per COPY operation (default) |
| **Maximum schema changes** | 1 schema per COPY operation (default) |
| **Supported operations** | COPY INTO and Snowpipe only |
| **Not supported** | INSERT statements, direct Snowpipe Streaming SDK |
| **Tasks** | Schema evolution not supported in tasks |

### What Schema Evolution Cannot Do

- **Column removal** - Columns are never automatically dropped
- **Data type changes** - Types are not automatically modified
- **Column renaming** - Columns are not renamed
- **Adding NOT NULL** - NOT NULL constraints are not added

**Exam Tip:** Schema evolution can only ADD columns or DROP NOT NULL constraints. It cannot remove columns, change data types, or add new constraints.

### Requesting Higher Limits

Contact Snowflake Support to request:
- More than 100 added columns per COPY
- More than 1 schema per COPY operation

---

## Section 10: Schema Evolution Across Ingestion Methods

### Ingestion Method Comparison

| Method | Architecture | Schema Evolution | Tracking |
|--------|-------------|------------------|----------|
| **COPY INTO** | File-based batch | Fully supported | Visible in tracking |
| **Snowpipe** | Auto-loading | Fully supported | Visible in tracking |
| **Snowpipe Streaming (High-Performance)** | Row-level streaming | Fully supported | Visible in tracking |
| **Kafka Connector (Classic)** | Streaming with Kafka | Supported (limited) | Always NULL |
| **Snowpipe Streaming SDK (Direct)** | Direct SDK usage | Not supported | N/A |

### Kafka Connector Configuration

For Kafka connector with Snowpipe Streaming:

```properties
# Enable schema detection and evolution
snowflake.ingestion.method=SNOWPIPE_STREAMING
snowflake.enable.schematization=TRUE
```

**Behavior Notes:**
- New tables created by Kafka connector automatically have `ENABLE_SCHEMA_EVOLUTION = TRUE`
- Existing tables require manual `ENABLE_SCHEMA_EVOLUTION = TRUE` setting
- Schema registry (optional) provides type definitions for Avro/Protobuf

---

## Section 11: Complete Workflow Example

### End-to-End Schema Detection and Evolution

```sql
-- 1. Create Parquet file format
CREATE OR REPLACE FILE FORMAT parquet_format
    TYPE = PARQUET;

-- 2. Inspect the schema of staged files
SELECT *
FROM TABLE(
    INFER_SCHEMA(
        LOCATION => '@my_stage/products/',
        FILE_FORMAT => 'parquet_format'
    )
);

-- 3. Create table using detected schema
CREATE OR REPLACE TABLE products
    USING TEMPLATE (
        SELECT ARRAY_AGG(OBJECT_CONSTRUCT(*))
        WITHIN GROUP (ORDER BY order_id)
        FROM TABLE(
            INFER_SCHEMA(
                LOCATION => '@my_stage/products/',
                FILE_FORMAT => 'parquet_format'
            )
        )
    );

-- 4. Enable schema evolution
ALTER TABLE products SET ENABLE_SCHEMA_EVOLUTION = TRUE;

-- 5. Grant EVOLVE SCHEMA privilege
GRANT EVOLVE SCHEMA ON TABLE products TO ROLE etl_role;

-- 6. Initial data load
COPY INTO products
FROM @my_stage/products/
FILE_FORMAT = parquet_format
MATCH_BY_COLUMN_NAME = CASE_INSENSITIVE;

-- 7. Verify table structure
DESCRIBE TABLE products;

-- 8. Load new data with additional columns (schema evolves automatically)
COPY INTO products
FROM @my_stage/products_v2/
FILE_FORMAT = parquet_format
MATCH_BY_COLUMN_NAME = CASE_INSENSITIVE;

-- 9. Check schema evolution records
DESCRIBE TABLE products;
-- New columns will show evolution records
```

---

## Section 12: Exam Tips and Common Question Patterns

### High-Priority Topics

1. **INFER_SCHEMA Function**
   - Know the required parameters (LOCATION, FILE_FORMAT)
   - Understand output columns (COLUMN_NAME, TYPE, NULLABLE, ORDER_ID)
   - Remember it works with staged files only

2. **CREATE TABLE USING TEMPLATE**
   - Uses INFER_SCHEMA output
   - ARRAY_AGG(OBJECT_CONSTRUCT(*)) pattern
   - WITHIN GROUP (ORDER BY order_id) for column ordering

3. **Schema Evolution Requirements**
   - ENABLE_SCHEMA_EVOLUTION = TRUE on table
   - MATCH_BY_COLUMN_NAME in COPY statement
   - EVOLVE SCHEMA or OWNERSHIP privilege

4. **MATCH_BY_COLUMN_NAME Values**
   - NONE (default), CASE_SENSITIVE, CASE_INSENSITIVE
   - CASE_INSENSITIVE converts to uppercase

5. **CSV-Specific Requirements**
   - PARSE_HEADER = TRUE
   - ERROR_ON_COLUMN_COUNT_MISMATCH = FALSE

6. **Evolution Limitations**
   - Only ADD_COLUMN and DROP_NOT_NULL
   - Cannot remove columns or change types
   - Not supported in tasks or INSERT statements

### Common Exam Questions

**Question Pattern 1:** "Which function is used to detect column definitions from staged files?"
- Answer: INFER_SCHEMA

**Question Pattern 2:** "What three requirements must be met for schema evolution to occur?"
- Answer: ENABLE_SCHEMA_EVOLUTION = TRUE, MATCH_BY_COLUMN_NAME option, EVOLVE SCHEMA or OWNERSHIP privilege

**Question Pattern 3:** "Which privilege allows schema evolution without table ownership?"
- Answer: EVOLVE SCHEMA

**Question Pattern 4:** "What additional options are required for CSV schema evolution?"
- Answer: PARSE_HEADER = TRUE and ERROR_ON_COLUMN_COUNT_MISMATCH = FALSE

**Question Pattern 5:** "What types of schema changes can automatic evolution perform?"
- Answer: Add new columns and drop NOT NULL constraints

**Question Pattern 6:** "Which ingestion methods support schema evolution?"
- Answer: COPY INTO, Snowpipe, Snowpipe Streaming (High-Performance), Kafka connector (limited)

**Question Pattern 7:** "What is the default limit for new columns added per COPY operation?"
- Answer: 100 columns

### Quick Reference Card

```
SCHEMA DETECTION FUNCTIONS:
---------------------------
INFER_SCHEMA         - Detect schema from staged files
GENERATE_COLUMN_DESCRIPTION - Format for DDL

CREATE TABLE USING TEMPLATE:
----------------------------
Uses INFER_SCHEMA output
ARRAY_AGG(OBJECT_CONSTRUCT(*)) pattern
ORDER BY order_id for column order

SCHEMA EVOLUTION REQUIREMENTS:
------------------------------
1. ENABLE_SCHEMA_EVOLUTION = TRUE (table)
2. MATCH_BY_COLUMN_NAME (COPY option)
3. EVOLVE SCHEMA or OWNERSHIP privilege

MATCH_BY_COLUMN_NAME VALUES:
----------------------------
NONE             - Default (positional)
CASE_SENSITIVE   - Exact match
CASE_INSENSITIVE - Uppercase conversion

EVOLUTION TYPES:
----------------
ADD_COLUMN       - New columns added
DROP_NOT_NULL    - Constraint removed

CSV REQUIREMENTS:
-----------------
PARSE_HEADER = TRUE
ERROR_ON_COLUMN_COUNT_MISMATCH = FALSE

SUPPORTED FORMATS:
------------------
Parquet, Avro, ORC, JSON, CSV

LIMITATIONS:
------------
Max 100 new columns per COPY (default)
Max 1 schema per COPY (default)
Not supported in tasks or INSERT
```

---

## Practice Questions

### Question 1
A data engineer needs to create a table with column definitions automatically derived from Parquet files in a stage. Which SQL function should be used?

<details>
<summary>Show Answer</summary>

**Answer:** INFER_SCHEMA

Use the following pattern:
```sql
CREATE TABLE my_table
    USING TEMPLATE (
        SELECT ARRAY_AGG(OBJECT_CONSTRUCT(*))
        FROM TABLE(
            INFER_SCHEMA(
                LOCATION => '@my_stage/data/',
                FILE_FORMAT => 'my_parquet_format'
            )
        )
    );
```
</details>

### Question 2
A table has `ENABLE_SCHEMA_EVOLUTION = TRUE` set. A COPY INTO command loads data, but new columns from the source file are not being added. Which of the following could be the issue? (Select all that apply)

A. Missing MATCH_BY_COLUMN_NAME option
B. Role lacks EVOLVE SCHEMA privilege
C. Source file is CSV format
D. INSERT statement was used instead of COPY

<details>
<summary>Show Answer</summary>

**Answer:** A, B, D

A is correct: MATCH_BY_COLUMN_NAME must be specified in the COPY statement.
B is correct: The role needs EVOLVE SCHEMA or OWNERSHIP privilege.
D is correct: INSERT statements do not support schema evolution; only COPY INTO and Snowpipe do.

C is not necessarily an issue - CSV is supported, but requires PARSE_HEADER = TRUE.
</details>

### Question 3
What is the purpose of setting `ERROR_ON_COLUMN_COUNT_MISMATCH = FALSE` when using schema evolution with CSV files?

<details>
<summary>Show Answer</summary>

**Answer:** This setting allows loading CSV files that have a different number of columns than the target table, which is required for schema evolution to add new columns from CSV files.

By default, ERROR_ON_COLUMN_COUNT_MISMATCH is TRUE, which would cause an error when the CSV file has more columns than the target table, preventing schema evolution from occurring.
</details>

### Question 4
Which MATCH_BY_COLUMN_NAME value should be used if source files have inconsistent column name casing (e.g., 'CustomerID' in some files and 'customerid' in others)?

<details>
<summary>Show Answer</summary>

**Answer:** CASE_INSENSITIVE

This value ignores case when matching column names between source files and the target table. All column names will be converted to uppercase in Snowflake.

```sql
COPY INTO my_table
FROM @my_stage
FILE_FORMAT = (TYPE = PARQUET)
MATCH_BY_COLUMN_NAME = CASE_INSENSITIVE;
```
</details>

### Question 5
A data engineer loads Parquet files into a table with schema evolution enabled. After the load, they run DESCRIBE TABLE and see the following in the schema evolution record column for a column named 'category':

```json
{"evolutionType":"DROP_NOT_NULL","evolutionMode":"COPY","fileName":"data_v2.parquet",...}
```

What does this indicate?

<details>
<summary>Show Answer</summary>

**Answer:** The 'category' column originally had a NOT NULL constraint, but the data in 'data_v2.parquet' did not include this column (or included NULL values), so Snowflake automatically dropped the NOT NULL constraint to allow the load to succeed.

This is one of two automatic schema evolution types:
1. ADD_COLUMN - adding new columns
2. DROP_NOT_NULL - removing NOT NULL constraints when columns are missing
</details>

### Question 6
Which of the following statements about schema evolution are TRUE? (Select all that apply)

A. Schema evolution can automatically add new columns
B. Schema evolution can automatically remove unused columns
C. Schema evolution can automatically change data types
D. Schema evolution can automatically drop NOT NULL constraints
E. Schema evolution works with Snowpipe data loads

<details>
<summary>Show Answer</summary>

**Answer:** A, D, E

A is correct: ADD_COLUMN is a supported evolution type.
D is correct: DROP_NOT_NULL is a supported evolution type.
E is correct: Snowpipe supports schema evolution.

B is incorrect: Schema evolution cannot remove columns.
C is incorrect: Schema evolution cannot change data types.
</details>

---

## Summary

Schema detection and evolution are essential features for modern data pipelines:

1. **INFER_SCHEMA** - Detects column definitions from staged files (Parquet, Avro, ORC, JSON, CSV)
2. **CREATE TABLE USING TEMPLATE** - Creates tables with auto-detected schemas
3. **Schema Evolution Requirements** - Three conditions: table parameter, COPY option, and privilege
4. **MATCH_BY_COLUMN_NAME** - Enables column matching by name (CASE_SENSITIVE or CASE_INSENSITIVE)
5. **Evolution Types** - Only ADD_COLUMN and DROP_NOT_NULL are automatic
6. **CSV Requirements** - PARSE_HEADER = TRUE and ERROR_ON_COLUMN_COUNT_MISMATCH = FALSE
7. **Limitations** - Max 100 columns, not supported in tasks or INSERT statements
8. **EVOLVE SCHEMA Privilege** - Specific privilege for schema evolution without ownership
