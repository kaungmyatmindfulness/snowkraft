# Domain 4: Data Loading & Unloading
## Part 8: File Format Configuration

**Exam Weight:** Domain 4 comprises 10-15% of the SnowPro Core exam

---

## Overview

File format configuration is a critical aspect of data loading and unloading in Snowflake. Understanding how to properly configure file formats for different data types, compression methods, and use cases is essential for successful data operations and the SnowPro Core certification exam.

---

## Section 1: File Format Objects Fundamentals

### What is a File Format Object?

A file format is a named database object that encapsulates instructions for parsing data files during COPY operations. File formats tell Snowflake:

- The type of data contained in files (CSV, JSON, Parquet, etc.)
- How fields and records are delimited
- Character encoding to use
- Compression algorithm applied
- Special handling rules (headers, null values, etc.)

### File Format Object Hierarchy

File formats exist within the standard Snowflake object hierarchy:

```
ORGANIZATION
  |__ ACCOUNT
        |__ DATABASE
              |__ SCHEMA
                    |__ FILE FORMAT
```

### Creating File Format Objects

**Basic Syntax:**
```sql
CREATE [ OR REPLACE ] FILE FORMAT [ IF NOT EXISTS ] <name>
  TYPE = { CSV | JSON | AVRO | ORC | PARQUET | XML }
  [ formatTypeOptions ]
  [ COMMENT = '<string_literal>' ];
```

**Example - Named File Format:**
```sql
CREATE OR REPLACE FILE FORMAT my_company_csv
  TYPE = CSV
  FIELD_DELIMITER = ','
  SKIP_HEADER = 1
  NULL_IF = ('NULL', 'null', '')
  EMPTY_FIELD_AS_NULL = TRUE
  COMPRESSION = AUTO
  COMMENT = 'Standard CSV format for company data loads';
```

### Named Format vs Inline Specification

| Approach | Syntax | Pros | Cons |
|----------|--------|------|------|
| **Named File Format** | `FILE_FORMAT = my_format` | Reusable, maintainable, version controlled | Extra object to manage |
| **Inline Specification** | `FILE_FORMAT = (TYPE = CSV ...)` | Quick, self-contained | Not reusable, harder to maintain |

**Best Practice:** Use named file formats for repeated loads with consistent format requirements.

### Where File Formats Can Be Applied

File formats can be specified in three locations:

```sql
-- 1. On a Named Stage (default for all loads from stage)
CREATE STAGE my_stage
  FILE_FORMAT = my_csv_format;

-- 2. On a COPY INTO Statement (overrides stage setting)
COPY INTO my_table
FROM @my_stage
FILE_FORMAT = my_custom_format;

-- 3. Inline in COPY INTO Statement
COPY INTO my_table
FROM @my_stage
FILE_FORMAT = (TYPE = CSV SKIP_HEADER = 1);
```

### File Format Precedence (Critical for Exam)

Options are NOT cumulative. Higher priority completely overrides lower:

```
PRIORITY (HIGHEST TO LOWEST):
1. COPY INTO statement FILE_FORMAT clause
2. Stage FILE_FORMAT setting
3. System defaults
```

**Exam Trap:** If a stage has `SKIP_HEADER = 1` but the COPY command specifies `FILE_FORMAT = (TYPE = CSV FIELD_DELIMITER = '|')`, the skip header setting is LOST because options don't merge.

---

## Section 2: CSV File Format Options (Detailed)

CSV is the most common format and has the most configuration options.

### Complete CSV Options Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| **TYPE** | String | - | Must be 'CSV' |
| **COMPRESSION** | String | AUTO | Compression algorithm |
| **RECORD_DELIMITER** | String | \\n | Row separator character |
| **FIELD_DELIMITER** | String | , | Column separator character |
| **FILE_EXTENSION** | String | null | Expected file extension |
| **PARSE_HEADER** | Boolean | FALSE | Use first row as column names |
| **SKIP_HEADER** | Integer | 0 | Number of header rows to skip |
| **SKIP_BLANK_LINES** | Boolean | FALSE | Skip empty lines |
| **DATE_FORMAT** | String | AUTO | Date parsing format |
| **TIME_FORMAT** | String | AUTO | Time parsing format |
| **TIMESTAMP_FORMAT** | String | AUTO | Timestamp parsing format |
| **BINARY_FORMAT** | String | HEX | Binary data encoding (HEX, BASE64, UTF8) |
| **ESCAPE** | String | NONE | Escape character for enclosed fields |
| **ESCAPE_UNENCLOSED_FIELD** | String | \\ | Escape character for unenclosed fields |
| **TRIM_SPACE** | Boolean | FALSE | Remove leading/trailing whitespace |
| **FIELD_OPTIONALLY_ENCLOSED_BY** | String | NONE | Quote character for fields |
| **NULL_IF** | List | (\\N) | Strings interpreted as NULL |
| **ERROR_ON_COLUMN_COUNT_MISMATCH** | Boolean | TRUE | Error if column counts differ |
| **REPLACE_INVALID_CHARACTERS** | Boolean | FALSE | Replace invalid UTF-8 chars |
| **EMPTY_FIELD_AS_NULL** | Boolean | FALSE | Treat empty string as NULL |
| **ENCODING** | String | UTF8 | Character encoding |

### Critical CSV Options Explained

#### SKIP_HEADER (Very High Exam Importance)

**Purpose:** Specifies number of rows to skip at the beginning of each file.

```sql
-- Skip 1 header row (most common)
CREATE FILE FORMAT csv_with_header
  TYPE = CSV
  SKIP_HEADER = 1;

-- Skip multiple header rows (rare but possible)
CREATE FILE FORMAT csv_multi_header
  TYPE = CSV
  SKIP_HEADER = 3;
```

**Common Error:** Forgetting SKIP_HEADER causes header row to be loaded as data:
```
-- Without SKIP_HEADER, this row gets loaded:
"name","age","department"  <-- Loaded as data!
"John",30,"Sales"
```

#### FIELD_DELIMITER

**Purpose:** Character(s) separating fields in each record.

```sql
-- Comma-separated (default)
FILE_FORMAT = (TYPE = CSV FIELD_DELIMITER = ',')

-- Pipe-separated
FILE_FORMAT = (TYPE = CSV FIELD_DELIMITER = '|')

-- Tab-separated (TSV)
FILE_FORMAT = (TYPE = CSV FIELD_DELIMITER = '\t')

-- Multi-character delimiter
FILE_FORMAT = (TYPE = CSV FIELD_DELIMITER = '||')
```

**Exam Tip:** Any single-byte character can be used as delimiter. Multi-byte delimiters are also supported.

#### RECORD_DELIMITER

**Purpose:** Character(s) separating records (rows).

```sql
-- Unix-style line ending (default)
FILE_FORMAT = (TYPE = CSV RECORD_DELIMITER = '\n')

-- Windows-style line ending
FILE_FORMAT = (TYPE = CSV RECORD_DELIMITER = '\r\n')

-- No record delimiter (entire file is one record)
FILE_FORMAT = (TYPE = CSV RECORD_DELIMITER = 'NONE')
```

#### FIELD_OPTIONALLY_ENCLOSED_BY

**Purpose:** Character used to enclose field values that may contain delimiters.

```sql
-- Double quotes (most common)
FILE_FORMAT = (TYPE = CSV
  FIELD_DELIMITER = ','
  FIELD_OPTIONALLY_ENCLOSED_BY = '"')
```

**Example Data:**
```csv
name,description,value
"Smith, John","A description, with commas",100
```

Without FIELD_OPTIONALLY_ENCLOSED_BY, "Smith" and "John" would be parsed as separate fields.

#### NULL_IF

**Purpose:** List of strings to interpret as SQL NULL values.

```sql
CREATE FILE FORMAT handle_nulls
  TYPE = CSV
  NULL_IF = ('NULL', 'null', 'N/A', 'n/a', '', '\\N');
```

**Exam Tip:** Default NULL_IF is `('\\N')` which represents the backslash-N escape sequence. You typically need to customize this based on your source data.

#### ENCODING

**Purpose:** Specifies character encoding of source files.

```sql
-- UTF-8 (default)
FILE_FORMAT = (TYPE = CSV ENCODING = 'UTF8')

-- ISO Latin-1
FILE_FORMAT = (TYPE = CSV ENCODING = 'ISO8859-1')

-- Windows encoding
FILE_FORMAT = (TYPE = CSV ENCODING = 'WINDOWS1252')
```

**Supported Encodings:** UTF8, UTF16, UTF16LE, UTF16BE, UTF32, UTF32LE, UTF32BE, ISO88591, ISO885915, WINDOWS1252, and others.

#### ERROR_ON_COLUMN_COUNT_MISMATCH

**Purpose:** Control behavior when file has different column count than target table.

```sql
-- Error on mismatch (default, recommended)
FILE_FORMAT = (TYPE = CSV ERROR_ON_COLUMN_COUNT_MISMATCH = TRUE)

-- Allow mismatch (useful for partial loads)
FILE_FORMAT = (TYPE = CSV ERROR_ON_COLUMN_COUNT_MISMATCH = FALSE)
```

**Behavior When FALSE:**
- Extra file columns: Ignored
- Missing file columns: Filled with NULL (if column allows) or error

### Common CSV File Format Configurations

**Standard CSV with Headers:**
```sql
CREATE FILE FORMAT standard_csv
  TYPE = CSV
  FIELD_DELIMITER = ','
  SKIP_HEADER = 1
  FIELD_OPTIONALLY_ENCLOSED_BY = '"'
  ESCAPE = '"'
  NULL_IF = ('', 'NULL', 'null')
  EMPTY_FIELD_AS_NULL = TRUE
  COMPRESSION = AUTO;
```

**Pipe-Delimited File:**
```sql
CREATE FILE FORMAT pipe_delimited
  TYPE = CSV
  FIELD_DELIMITER = '|'
  SKIP_HEADER = 1
  NULL_IF = ('NULL', '')
  COMPRESSION = GZIP;
```

**Tab-Separated Values (TSV):**
```sql
CREATE FILE FORMAT tsv_format
  TYPE = CSV
  FIELD_DELIMITER = '\t'
  SKIP_HEADER = 1
  RECORD_DELIMITER = '\n';
```

**Fixed-Width Simulation:**
```sql
-- Use NONE to treat entire line as single field, then parse with SQL
CREATE FILE FORMAT fixed_width
  TYPE = CSV
  FIELD_DELIMITER = 'NONE'
  RECORD_DELIMITER = '\n';

-- Parse during load
COPY INTO target_table
FROM (
  SELECT
    SUBSTR($1, 1, 10) AS field1,
    SUBSTR($1, 11, 20) AS field2,
    SUBSTR($1, 31, 10) AS field3
  FROM @my_stage
)
FILE_FORMAT = fixed_width;
```

---

## Section 3: JSON File Format Options (Detailed)

JSON format is essential for semi-structured data loading.

### Complete JSON Options Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| **TYPE** | String | - | Must be 'JSON' |
| **COMPRESSION** | String | AUTO | Compression algorithm |
| **DATE_FORMAT** | String | AUTO | Date parsing format |
| **TIME_FORMAT** | String | AUTO | Time parsing format |
| **TIMESTAMP_FORMAT** | String | AUTO | Timestamp parsing format |
| **BINARY_FORMAT** | String | HEX | Binary data encoding |
| **TRIM_SPACE** | Boolean | FALSE | Remove leading/trailing whitespace |
| **NULL_IF** | List | () | Strings interpreted as NULL |
| **FILE_EXTENSION** | String | null | Expected file extension |
| **ENABLE_OCTAL** | Boolean | FALSE | Parse octal numbers |
| **ALLOW_DUPLICATE** | Boolean | FALSE | Allow duplicate object keys |
| **STRIP_OUTER_ARRAY** | Boolean | FALSE | Remove outer array brackets |
| **STRIP_NULL_VALUES** | Boolean | FALSE | Remove null key-value pairs |
| **REPLACE_INVALID_CHARACTERS** | Boolean | FALSE | Replace invalid UTF-8 chars |
| **IGNORE_UTF8_ERRORS** | Boolean | FALSE | Ignore UTF-8 encoding errors |
| **SKIP_BYTE_ORDER_MARK** | Boolean | FALSE | Skip BOM character |

### Critical JSON Options Explained

#### STRIP_OUTER_ARRAY (Very High Exam Importance)

**Purpose:** Removes the outer array brackets, loading each top-level element as a separate row.

**Without STRIP_OUTER_ARRAY (default FALSE):**
```json
[
  {"id": 1, "name": "Alice"},
  {"id": 2, "name": "Bob"},
  {"id": 3, "name": "Charlie"}
]
```
Result: **1 row** containing entire array as single VARIANT value

**With STRIP_OUTER_ARRAY = TRUE:**
```json
[
  {"id": 1, "name": "Alice"},
  {"id": 2, "name": "Bob"},
  {"id": 3, "name": "Charlie"}
]
```
Result: **3 rows**, each containing one JSON object

**Why This Matters:**
- VARIANT columns have a **16 MB compressed limit per row**
- Without STRIP_OUTER_ARRAY, entire file loads as one row
- Large files will exceed this limit and fail
- STRIP_OUTER_ARRAY = TRUE is the solution

```sql
CREATE FILE FORMAT json_array_format
  TYPE = JSON
  STRIP_OUTER_ARRAY = TRUE;
```

**Exam Tip:** STRIP_OUTER_ARRAY is the most commonly tested JSON option. It's the answer to "How do you load large JSON arrays that exceed the VARIANT size limit?"

#### STRIP_NULL_VALUES (High Exam Importance)

**Purpose:** Removes object keys where the value is null.

**Without STRIP_NULL_VALUES (default FALSE):**
```json
{"id": 1, "name": "Alice", "phone": null}
```
Stored as: `{"id": 1, "name": "Alice", "phone": null}`

**With STRIP_NULL_VALUES = TRUE:**
```json
{"id": 1, "name": "Alice", "phone": null}
```
Stored as: `{"id": 1, "name": "Alice"}`

**Why This Matters for Performance:**
- Snowflake auto-extracts repeating JSON keys into columnar format
- Elements with even ONE null value are NOT extracted to columnar format
- Non-columnar elements require full JSON structure scan
- Removing nulls enables better subcolumnarization and query performance

```sql
CREATE FILE FORMAT optimized_json
  TYPE = JSON
  STRIP_OUTER_ARRAY = TRUE
  STRIP_NULL_VALUES = TRUE;
```

#### ALLOW_DUPLICATE

**Purpose:** Controls behavior when JSON contains duplicate keys.

```json
{
  "id": 1,
  "id": 2
}
```

**With ALLOW_DUPLICATE = FALSE (default):** Error thrown
**With ALLOW_DUPLICATE = TRUE:** Last value wins (id = 2)

Generally keep this FALSE to catch data quality issues.

#### ENABLE_OCTAL

**Purpose:** Allows parsing numbers with leading zeros as octal.

```json
{"value": 010}
```

**With ENABLE_OCTAL = FALSE (default):** Parsed as decimal 10
**With ENABLE_OCTAL = TRUE:** Parsed as octal (decimal 8)

Rarely needed; keep FALSE unless you specifically have octal data.

### Common JSON File Format Configurations

**Standard JSON with Arrays:**
```sql
CREATE FILE FORMAT json_standard
  TYPE = JSON
  STRIP_OUTER_ARRAY = TRUE
  COMPRESSION = AUTO;
```

**Optimized JSON for Performance:**
```sql
CREATE FILE FORMAT json_optimized
  TYPE = JSON
  STRIP_OUTER_ARRAY = TRUE
  STRIP_NULL_VALUES = TRUE
  COMPRESSION = GZIP;
```

**NDJSON (Newline-Delimited JSON):**
```sql
-- Each line is a separate JSON object
-- No outer array brackets needed
CREATE FILE FORMAT ndjson_format
  TYPE = JSON
  STRIP_OUTER_ARRAY = FALSE  -- Not needed for NDJSON
  COMPRESSION = AUTO;
```

**JSON with Date Parsing:**
```sql
CREATE FILE FORMAT json_with_dates
  TYPE = JSON
  STRIP_OUTER_ARRAY = TRUE
  DATE_FORMAT = 'YYYY-MM-DD'
  TIMESTAMP_FORMAT = 'YYYY-MM-DD HH24:MI:SS.FF3';
```

---

## Section 4: Parquet File Format Options

Parquet is a binary columnar format common in data lake scenarios.

### Complete Parquet Options Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| **TYPE** | String | - | Must be 'PARQUET' |
| **COMPRESSION** | String | AUTO | Compression (auto-detected) |
| **SNAPPY_COMPRESSION** | Boolean | TRUE | Use Snappy compression on unload |
| **BINARY_AS_TEXT** | Boolean | TRUE | Interpret binary columns as text |
| **USE_LOGICAL_TYPE** | Boolean | TRUE | Use schema logical types |
| **TRIM_SPACE** | Boolean | FALSE | Trim leading/trailing spaces |
| **REPLACE_INVALID_CHARACTERS** | Boolean | FALSE | Replace invalid UTF-8 chars |
| **NULL_IF** | List | () | Strings interpreted as NULL |
| **USE_VECTORIZED_SCANNER** | Boolean | FALSE | Use vectorized scanner |

### Key Parquet Characteristics

**Supported Writer Versions:**
- Parquet writer v1: Fully supported
- Parquet writer v2: Supported for Iceberg tables and with vectorized scanner

**Compression Types (Auto-Detected):**
- Snappy (most common)
- GZIP
- LZO
- BROTLI
- ZSTD

**Loading Behavior:**
- Loads into single VARIANT column by default
- Can extract to separate columns during load (ETL approach)

```sql
-- Load entire Parquet to VARIANT
COPY INTO parquet_table
FROM @my_stage/data.parquet
FILE_FORMAT = (TYPE = PARQUET);

-- Extract columns during load
COPY INTO structured_table (id, name, amount)
FROM (
  SELECT $1:id::INTEGER, $1:name::VARCHAR, $1:amount::DECIMAL
  FROM @my_stage/data.parquet
)
FILE_FORMAT = (TYPE = PARQUET);
```

### Common Parquet Configuration

```sql
CREATE FILE FORMAT parquet_standard
  TYPE = PARQUET
  COMPRESSION = AUTO
  BINARY_AS_TEXT = TRUE;
```

---

## Section 5: Avro File Format Options

Avro is a binary format with embedded schema, common in Apache ecosystem.

### Complete Avro Options Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| **TYPE** | String | - | Must be 'AVRO' |
| **COMPRESSION** | String | AUTO | Compression (auto-detected) |
| **TRIM_SPACE** | Boolean | FALSE | Trim leading/trailing spaces |
| **REPLACE_INVALID_CHARACTERS** | Boolean | FALSE | Replace invalid UTF-8 chars |
| **NULL_IF** | List | () | Strings interpreted as NULL |

### Key Avro Characteristics

- Binary format with embedded schema
- Schema defined in JSON within file header
- Compression auto-detected from file
- **Load only** - cannot unload to Avro format

```sql
CREATE FILE FORMAT avro_standard
  TYPE = AVRO
  COMPRESSION = AUTO;
```

---

## Section 6: ORC File Format Options

ORC (Optimized Row Columnar) is from the Hive ecosystem.

### Complete ORC Options Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| **TYPE** | String | - | Must be 'ORC' |
| **COMPRESSION** | String | AUTO | Compression (auto-detected) |
| **TRIM_SPACE** | Boolean | FALSE | Trim leading/trailing spaces |
| **REPLACE_INVALID_CHARACTERS** | Boolean | FALSE | Replace invalid UTF-8 chars |
| **NULL_IF** | List | () | Strings interpreted as NULL |

### Key ORC Characteristics

- Binary columnar format from Hive ecosystem
- Compression auto-detected from file
- **Load only** - cannot unload to ORC format
- Map data deserialized as array of objects

```sql
CREATE FILE FORMAT orc_standard
  TYPE = ORC;
```

---

## Section 7: XML File Format Options

XML is a markup language format with tag-based structure.

### Complete XML Options Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| **TYPE** | String | - | Must be 'XML' |
| **COMPRESSION** | String | AUTO | Compression algorithm |
| **IGNORE_UTF8_ERRORS** | Boolean | FALSE | Ignore UTF-8 encoding errors |
| **PRESERVE_SPACE** | Boolean | FALSE | Preserve whitespace in elements |
| **STRIP_OUTER_ELEMENT** | Boolean | FALSE | Remove outer XML element |
| **DISABLE_SNOWFLAKE_DATA** | Boolean | FALSE | Disable Snowflake data tags |
| **DISABLE_AUTO_CONVERT** | Boolean | FALSE | Disable automatic type conversion |
| **REPLACE_INVALID_CHARACTERS** | Boolean | FALSE | Replace invalid UTF-8 chars |

### Key XML Characteristics

- Each top-level element loads as a separate row
- **Load only** - cannot unload to XML format
- Use XMLGET function to query loaded XML

```sql
CREATE FILE FORMAT xml_standard
  TYPE = XML
  COMPRESSION = AUTO
  PRESERVE_SPACE = FALSE;
```

---

## Section 8: Compression Options

### Supported Compression Algorithms

| Algorithm | Extension | Load | Unload | Speed | Ratio | Best For |
|-----------|-----------|------|--------|-------|-------|----------|
| **AUTO** | Various | Yes | Yes | - | - | Auto-detection |
| **GZIP** | .gz | Yes | Yes | Medium | High | General purpose |
| **BZ2** | .bz2 | Yes | Yes | Slow | Very High | Maximum compression |
| **BROTLI** | .br | Yes | Yes | Medium | Very High | Web content |
| **ZSTD** | .zst | Yes | Yes | Fast | High | Large datasets |
| **DEFLATE** | .deflate | Yes | Yes | Medium | High | Legacy compatibility |
| **RAW_DEFLATE** | .raw_deflate | Yes | Yes | Medium | High | No headers |
| **LZO** | .lzo | Yes | No | Very Fast | Low | Speed critical |
| **SNAPPY** | .snappy | Yes | No | Very Fast | Low | Streaming data |
| **NONE** | (none) | Yes | Yes | N/A | N/A | Already compressed |

### AUTO Detection Behavior

When `COMPRESSION = AUTO`:
- Snowflake detects compression from file extension
- Falls back to file content inspection
- Recommended default for most scenarios

### Compression for Internal Stages

**PUT Command Default:**
- Files automatically compressed with GZIP
- Files automatically encrypted with 128-bit keys

```sql
-- Default behavior (auto-compress with GZIP)
PUT file:///data/myfile.csv @my_internal_stage;

-- Disable auto-compression
PUT file:///data/myfile.csv @my_internal_stage AUTO_COMPRESS = FALSE;
```

**Exam Tip:** Internal stages auto-compress with GZIP and auto-encrypt with 128-bit keys by default.

---

## Section 9: File Format for Unloading Data

### Supported Unload Formats

| Format | Unload Supported | Notes |
|--------|------------------|-------|
| CSV | Yes | Default format |
| JSON | Yes | Outputs NDJSON format |
| Parquet | Yes | Binary columnar |
| Avro | No | Load only |
| ORC | No | Load only |
| XML | No | Load only |

### Unload File Format Options

**CSV Unload:**
```sql
CREATE FILE FORMAT csv_unload
  TYPE = CSV
  FIELD_DELIMITER = ','
  COMPRESSION = GZIP
  FILE_EXTENSION = 'csv.gz';
```

**JSON Unload:**
```sql
CREATE FILE FORMAT json_unload
  TYPE = JSON
  COMPRESSION = GZIP
  FILE_EXTENSION = 'json.gz';
```

**Parquet Unload:**
```sql
CREATE FILE FORMAT parquet_unload
  TYPE = PARQUET
  SNAPPY_COMPRESSION = TRUE;
```

### Using File Formats in COPY INTO Location

```sql
-- Unload table to stage with file format
COPY INTO @my_stage/export/
FROM my_table
FILE_FORMAT = csv_unload
OVERWRITE = TRUE
SINGLE = FALSE
MAX_FILE_SIZE = 67108864;  -- 64 MB
```

---

## Section 10: File Format Management Commands

### DDL Commands

```sql
-- Create file format
CREATE FILE FORMAT my_format
  TYPE = CSV
  SKIP_HEADER = 1;

-- Create or replace (update existing)
CREATE OR REPLACE FILE FORMAT my_format
  TYPE = CSV
  SKIP_HEADER = 2;

-- Create if not exists
CREATE FILE FORMAT IF NOT EXISTS my_format
  TYPE = CSV;

-- Alter file format
ALTER FILE FORMAT my_format SET SKIP_HEADER = 1;
ALTER FILE FORMAT my_format SET COMPRESSION = GZIP;

-- Show all file formats
SHOW FILE FORMATS;
SHOW FILE FORMATS IN SCHEMA my_db.my_schema;
SHOW FILE FORMATS LIKE 'csv%';

-- Describe file format
DESCRIBE FILE FORMAT my_format;
DESC FILE FORMAT my_format;

-- Drop file format
DROP FILE FORMAT my_format;
DROP FILE FORMAT IF EXISTS my_format;
```

### Required Privileges

| Operation | Required Privilege |
|-----------|-------------------|
| CREATE FILE FORMAT | CREATE FILE FORMAT on schema |
| ALTER FILE FORMAT | OWNERSHIP on file format |
| DROP FILE FORMAT | OWNERSHIP on file format |
| USAGE | USAGE on file format |
| DESCRIBE | Any privilege on file format |

---

## Section 11: Common Configuration Patterns

### Pattern 1: Loading CSV with Headers and Handling Nulls

```sql
CREATE FILE FORMAT csv_production
  TYPE = CSV
  SKIP_HEADER = 1
  FIELD_DELIMITER = ','
  FIELD_OPTIONALLY_ENCLOSED_BY = '"'
  ESCAPE = '"'
  NULL_IF = ('', 'NULL', 'null', 'N/A', '\\N')
  EMPTY_FIELD_AS_NULL = TRUE
  TRIM_SPACE = TRUE
  ERROR_ON_COLUMN_COUNT_MISMATCH = TRUE
  COMPRESSION = AUTO;
```

### Pattern 2: Loading Large JSON Arrays

```sql
CREATE FILE FORMAT json_large_array
  TYPE = JSON
  STRIP_OUTER_ARRAY = TRUE
  STRIP_NULL_VALUES = TRUE
  COMPRESSION = AUTO;
```

### Pattern 3: Loading Parquet with Column Extraction

```sql
-- File format for Parquet
CREATE FILE FORMAT parquet_extract
  TYPE = PARQUET
  COMPRESSION = AUTO;

-- COPY with transformation
COPY INTO target_table (id, name, created_date, amount)
FROM (
  SELECT
    $1:id::INTEGER,
    $1:name::VARCHAR,
    $1:created_date::TIMESTAMP_NTZ,
    $1:amount::DECIMAL(18,2)
  FROM @my_stage
)
FILE_FORMAT = parquet_extract;
```

### Pattern 4: Unloading to CSV with Specific Formatting

```sql
CREATE FILE FORMAT csv_export
  TYPE = CSV
  FIELD_DELIMITER = '|'
  COMPRESSION = GZIP
  FILE_EXTENSION = 'csv.gz'
  NULL_IF = ()
  EMPTY_FIELD_AS_NULL = FALSE;

COPY INTO @export_stage/data_
FROM my_table
FILE_FORMAT = csv_export
HEADER = TRUE
OVERWRITE = TRUE;
```

### Pattern 5: Multi-Format Stage Setup

```sql
-- Create stage with default CSV format
CREATE STAGE multi_format_stage
  FILE_FORMAT = (TYPE = CSV SKIP_HEADER = 1);

-- Override for JSON files
COPY INTO json_table
FROM @multi_format_stage/json_data/
FILE_FORMAT = (TYPE = JSON STRIP_OUTER_ARRAY = TRUE);

-- Override for Parquet files
COPY INTO parquet_table
FROM @multi_format_stage/parquet_data/
FILE_FORMAT = (TYPE = PARQUET);
```

---

## Section 12: Troubleshooting File Format Issues

### Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Number of columns mismatch" | File has different columns than table | Set ERROR_ON_COLUMN_COUNT_MISMATCH = FALSE or fix file |
| "Invalid character" | Wrong encoding or delimiter | Check ENCODING, FIELD_DELIMITER settings |
| "Numeric value out of range" | Trying to load header as number | Add SKIP_HEADER = 1 |
| "Size limit exceeded" | VARIANT > 16 MB | Use STRIP_OUTER_ARRAY = TRUE for JSON |
| "Invalid JSON" | Malformed JSON syntax | Validate JSON or use ALLOW_DUPLICATE = TRUE |

### Validation Before Loading

```sql
-- Validate without loading (dry run)
COPY INTO my_table
FROM @my_stage
FILE_FORMAT = my_format
VALIDATION_MODE = RETURN_ERRORS;

-- Return first N rows for validation
COPY INTO my_table
FROM @my_stage
FILE_FORMAT = my_format
VALIDATION_MODE = RETURN_5_ROWS;
```

---

## Section 13: Exam Tips and Common Question Patterns

### High-Priority Topics for Exam

1. **STRIP_OUTER_ARRAY**
   - Most commonly tested JSON option
   - Solution for 16 MB VARIANT limit
   - Default is FALSE

2. **SKIP_HEADER**
   - Most common CSV configuration error
   - Default is 0 (no skip)
   - Forgetting causes data quality issues

3. **File Format Precedence**
   - COPY > Stage > Table
   - Options do NOT merge (complete override)

4. **Load vs Unload Support**
   - Load all 6 formats
   - Unload only CSV, JSON, Parquet

5. **Compression**
   - Internal stage default: GZIP
   - File format default: AUTO
   - Know common algorithms and use cases

### Common Exam Question Patterns

**Pattern 1:** "How do you load a JSON array that exceeds 16 MB?"
- Answer: STRIP_OUTER_ARRAY = TRUE

**Pattern 2:** "What happens if SKIP_HEADER is set on stage but not in COPY?"
- Answer: Stage setting is overridden; no headers skipped

**Pattern 3:** "Which formats can be unloaded?"
- Answer: CSV, JSON, Parquet only

**Pattern 4:** "What is the default compression for internal stages?"
- Answer: GZIP

**Pattern 5:** "A CSV load fails on the first row with type conversion error. What is the likely cause?"
- Answer: SKIP_HEADER not set; header row being parsed as data

### Quick Reference Card

```
FILE FORMAT SUPPORT:
-------------------
         | Load | Unload | Compression
---------|------|--------|------------
CSV      |  Yes |  Yes   | Multiple
JSON     |  Yes |  Yes   | Multiple
Parquet  |  Yes |  Yes   | Internal
Avro     |  Yes |  No    | Internal
ORC      |  Yes |  No    | Internal
XML      |  Yes |  No    | Multiple

KEY OPTIONS BY FORMAT:
---------------------
CSV:     SKIP_HEADER, FIELD_DELIMITER, NULL_IF
JSON:    STRIP_OUTER_ARRAY, STRIP_NULL_VALUES
Parquet: COMPRESSION (auto), BINARY_AS_TEXT
Avro:    COMPRESSION (auto)
ORC:     COMPRESSION (auto)
XML:     PRESERVE_SPACE, STRIP_OUTER_ELEMENT

PRECEDENCE:
-----------
1. COPY INTO options (highest)
2. Stage options
3. Table options
4. System defaults (lowest)

DEFAULTS:
---------
Format type: CSV
Delimiter: Comma (,)
Skip header: 0
Compression: AUTO
Encoding: UTF-8
```

---

## Practice Questions

### Question 1
A data engineer is loading a JSON file that contains an array of 10 million customer records. The COPY INTO command fails with a size limit error. What file format option should be used?

<details>
<summary>Show Answer</summary>

**Answer:** STRIP_OUTER_ARRAY = TRUE

This option removes the outer array brackets and loads each element as a separate row, bypassing the 16 MB VARIANT row limit.

```sql
CREATE FILE FORMAT json_customers
  TYPE = JSON
  STRIP_OUTER_ARRAY = TRUE;
```
</details>

### Question 2
A stage has a file format defined as:
```sql
CREATE STAGE my_stage
  FILE_FORMAT = (TYPE = CSV SKIP_HEADER = 1 FIELD_DELIMITER = ',');
```

A COPY command is executed:
```sql
COPY INTO my_table
FROM @my_stage
FILE_FORMAT = (TYPE = CSV FIELD_DELIMITER = '|');
```

What is the effective SKIP_HEADER value?

<details>
<summary>Show Answer</summary>

**Answer:** 0 (zero)

File format options are NOT cumulative. The COPY command's file format completely overrides the stage's file format. Since SKIP_HEADER is not specified in the COPY command, it defaults to 0.

To preserve the header skip, include it in the COPY command:
```sql
FILE_FORMAT = (TYPE = CSV FIELD_DELIMITER = '|' SKIP_HEADER = 1)
```
</details>

### Question 3
Which file format option should be set to TRUE to improve query performance on semi-structured JSON data by enabling better columnar extraction?

<details>
<summary>Show Answer</summary>

**Answer:** STRIP_NULL_VALUES = TRUE

When STRIP_NULL_VALUES is TRUE, Snowflake removes object keys with null values. This is important because:
- Elements with even one null value are NOT extracted into columnar format
- Non-columnar elements require full JSON structure scan
- Removing nulls allows more elements to be subcolumnarized
- Result: Better query performance through improved pruning
</details>

### Question 4
A data engineer needs to load pipe-delimited files with two header rows. The fields may contain the pipe character and are enclosed in double quotes. Create an appropriate file format.

<details>
<summary>Show Answer</summary>

```sql
CREATE FILE FORMAT pipe_with_headers
  TYPE = CSV
  FIELD_DELIMITER = '|'
  SKIP_HEADER = 2
  FIELD_OPTIONALLY_ENCLOSED_BY = '"'
  ESCAPE = '"';
```

Key points:
- FIELD_DELIMITER = '|' for pipe-separated
- SKIP_HEADER = 2 for two header rows
- FIELD_OPTIONALLY_ENCLOSED_BY = '"' to handle pipes within fields
- ESCAPE = '"' to handle escaped quotes within quoted fields
</details>

### Question 5
What is the default compression algorithm applied when files are uploaded to an internal stage using the PUT command?

<details>
<summary>Show Answer</summary>

**Answer:** GZIP

Files uploaded to internal stages via PUT are automatically:
1. Compressed with GZIP (unless AUTO_COMPRESS = FALSE)
2. Encrypted with 128-bit keys

To disable auto-compression:
```sql
PUT file:///data/file.csv @my_stage AUTO_COMPRESS = FALSE;
```
</details>

### Question 6
Which of the following file formats can be used for data unloading with COPY INTO <location>? (Select all that apply)

A. CSV
B. JSON
C. Parquet
D. Avro
E. ORC
F. XML

<details>
<summary>Show Answer</summary>

**Answer:** A, B, C (CSV, JSON, Parquet)

Avro, ORC, and XML support loading only. They cannot be used as target formats for COPY INTO <location>.

Note: JSON unload produces NDJSON (newline-delimited JSON) format.
</details>

---

## Summary

File format configuration is essential for successful data loading and unloading in Snowflake. Key takeaways:

1. **Named file formats** are reusable database objects that encapsulate parsing instructions
2. **Precedence matters**: COPY > Stage > Table > Defaults (no merging)
3. **STRIP_OUTER_ARRAY** solves the 16 MB VARIANT limit for JSON arrays
4. **SKIP_HEADER** is the most common CSV configuration issue
5. **Three formats support unloading**: CSV, JSON, Parquet
6. **Compression**: GZIP default for internal stages, AUTO for file formats
7. **STRIP_NULL_VALUES** improves JSON query performance
8. **Validate before loading** with VALIDATION_MODE to catch issues early
