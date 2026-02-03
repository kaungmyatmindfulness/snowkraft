# Domain 1: Snowflake AI Data Cloud Features & Architecture
## Part 11: File Formats

**Exam Weight:** This topic is part of Domain 1 (25-30% of exam) and Domain 4: Data Loading & Unloading (10-15% of exam)

---

## Overview

File formats are a fundamental concept in Snowflake data loading and unloading. They define how Snowflake parses and interprets data files during COPY operations. Understanding file format types, options, compression methods, and best practices is essential for the SnowPro Core exam.

---

## Section 1: Supported File Formats

### File Format Categories

Snowflake supports two main categories of file formats:

| Category | Format Types | Description |
|----------|--------------|-------------|
| **Structured** | Delimited (CSV, TSV, etc.) | Character-separated values with defined record and field delimiters |
| **Semi-structured** | JSON, Avro, ORC, Parquet, XML | Self-describing formats with flexible schemas |

### Detailed Format Comparison

| Format | Type | Load | Unload | Compression Support | Key Characteristics |
|--------|------|------|--------|---------------------|---------------------|
| **CSV** | Structured | Yes | Yes | GZIP, BZIP2, Brotli, Zstd, Deflate, Raw Deflate | Default format; any single-byte delimiter supported |
| **JSON** | Semi-structured | Yes | Yes | GZIP, BZIP2, Brotli, Zstd, Deflate, Raw Deflate | Stored in VARIANT; outputs NDJSON on unload |
| **Avro** | Semi-structured | Yes | No | Auto-detected (internal compression) | Binary format; automatic compressed file handling |
| **ORC** | Semi-structured | Yes | No | Auto-detected (internal compression) | Binary format from Hive ecosystem |
| **Parquet** | Semi-structured | Yes | Yes | Auto-detected (Snappy, GZIP, LZO) | Binary columnar format; only v1 writer supported |
| **XML** | Semi-structured | Yes | No | GZIP, BZIP2, Brotli, Zstd, Deflate, Raw Deflate | Top-level elements become separate rows |

### Key Exam Point: Load vs Unload Support

```
LOAD ONLY:        Avro, ORC, XML
LOAD AND UNLOAD:  CSV, JSON, Parquet
```

**Exam Tip:** Only CSV, JSON, and Parquet can be unloaded. Avro, ORC, and XML support loading only.

---

## Section 2: Named File Formats vs Inline Specifications

### What is a Named File Format?

A named file format is a **database object** that encapsulates file parsing instructions. Named file formats are:

- Reusable across multiple COPY statements
- Stored in schema with CREATE FILE FORMAT
- Recommended for consistent, repeated data loading

### Creating Named File Formats

**Via SQL:**
```sql
CREATE OR REPLACE FILE FORMAT my_csv_format
  TYPE = CSV
  FIELD_DELIMITER = ','
  SKIP_HEADER = 1
  NULL_IF = ('NULL', 'null', '')
  COMPRESSION = GZIP;
```

**Via Snowsight:**
1. Navigate to: Catalog > Database Explorer
2. Select database and schema
3. Click Create > File Format
4. Configure options and create

### Inline File Format Specification

Alternatively, specify options directly in the COPY command:

```sql
COPY INTO my_table
FROM @my_stage
FILE_FORMAT = (TYPE = CSV SKIP_HEADER = 1 FIELD_DELIMITER = '|');
```

### Where File Formats Can Be Applied

File formats can be specified in three locations:

| Location | Syntax Example | Use Case |
|----------|----------------|----------|
| **Named Stage** | `CREATE STAGE s1 FILE_FORMAT = my_format` | Default for all loads from stage |
| **COPY Statement** | `COPY INTO t1 FILE_FORMAT = my_format` | Override stage settings |
| **Table Definition** | `CREATE TABLE t1 ... STAGE_FILE_FORMAT = my_format` | Table-specific defaults |

### Precedence Rules

**Important:** File format options are NOT cumulative. Options set at one level OVERRIDE all options at lower levels.

```
Priority (Highest to Lowest):
1. COPY INTO statement options
2. Named stage options
3. Table definition options
4. System defaults
```

**Exam Tip:** If file format is set on both a stage and a COPY command, the COPY command settings take precedence and completely replace stage settings.

---

## Section 3: CSV File Format Options

### Essential CSV Options

| Option | Description | Default | Exam Importance |
|--------|-------------|---------|-----------------|
| **TYPE** | Specifies CSV format | - | Required |
| **FIELD_DELIMITER** | Character separating fields | `,` | High |
| **RECORD_DELIMITER** | Character separating records | `\n` | Medium |
| **SKIP_HEADER** | Number of header rows to skip | 0 | Very High |
| **ENCODING** | Character encoding | UTF-8 | Medium |
| **COMPRESSION** | Compression algorithm | AUTO | High |
| **FIELD_OPTIONALLY_ENCLOSED_BY** | Quote character | None | High |
| **ESCAPE** | Escape character | None | Medium |
| **ESCAPE_UNENCLOSED_FIELD** | Escape for unenclosed fields | `\` | Low |
| **NULL_IF** | Strings to interpret as NULL | `\\N` | High |
| **EMPTY_FIELD_AS_NULL** | Treat empty as NULL | TRUE | Medium |
| **TRIM_SPACE** | Remove leading/trailing spaces | FALSE | Medium |
| **ERROR_ON_COLUMN_COUNT_MISMATCH** | Error if column counts differ | TRUE | Medium |
| **DATE_FORMAT** | Date parsing format | AUTO | Medium |
| **TIME_FORMAT** | Time parsing format | AUTO | Medium |
| **TIMESTAMP_FORMAT** | Timestamp parsing format | AUTO | Medium |

### Common CSV File Format Examples

**Standard CSV with Headers:**
```sql
CREATE FILE FORMAT standard_csv
  TYPE = CSV
  SKIP_HEADER = 1
  FIELD_DELIMITER = ','
  FIELD_OPTIONALLY_ENCLOSED_BY = '"'
  ESCAPE = '"'
  NULL_IF = ('', 'NULL', 'null');
```

**Pipe-Delimited File:**
```sql
CREATE FILE FORMAT pipe_delimited
  TYPE = CSV
  FIELD_DELIMITER = '|'
  RECORD_DELIMITER = '\n'
  SKIP_HEADER = 1;
```

**Tab-Separated Values (TSV):**
```sql
CREATE FILE FORMAT tsv_format
  TYPE = CSV
  FIELD_DELIMITER = '\t'
  SKIP_HEADER = 1;
```

### CSV Loading Best Practices

1. **Always specify SKIP_HEADER** for files with headers
2. **Use FIELD_OPTIONALLY_ENCLOSED_BY** when fields may contain delimiters
3. **Set NULL_IF** to handle various NULL representations
4. **Use TRIM_SPACE = TRUE** when fields have unwanted leading spaces

---

## Section 4: JSON File Format Options

### Essential JSON Options

| Option | Description | Default | Exam Importance |
|--------|-------------|---------|-----------------|
| **TYPE** | Specifies JSON format | - | Required |
| **COMPRESSION** | Compression algorithm | AUTO | High |
| **STRIP_OUTER_ARRAY** | Remove outer array brackets | FALSE | Very High |
| **STRIP_NULL_VALUES** | Remove null key-value pairs | FALSE | High |
| **ALLOW_DUPLICATE** | Allow duplicate keys | FALSE | Low |
| **ENABLE_OCTAL** | Parse octal numbers | FALSE | Low |
| **DATE_FORMAT** | Date parsing format | AUTO | Medium |
| **TIME_FORMAT** | Time parsing format | AUTO | Medium |
| **TIMESTAMP_FORMAT** | Timestamp parsing format | AUTO | Medium |
| **IGNORE_UTF8_ERRORS** | Replace invalid UTF-8 | FALSE | Low |

### Critical Option: STRIP_OUTER_ARRAY

**Purpose:** Removes the outer array brackets and loads each element as a separate row.

**Without STRIP_OUTER_ARRAY (default FALSE):**
```json
[{"id": 1}, {"id": 2}, {"id": 3}]
```
Result: 1 row containing entire array

**With STRIP_OUTER_ARRAY = TRUE:**
```json
[{"id": 1}, {"id": 2}, {"id": 3}]
```
Result: 3 separate rows

**Why This Matters:**
- VARIANT columns have a **16 MB compressed limit per row**
- Without STRIP_OUTER_ARRAY, entire file loads as one row
- Large files will exceed this limit
- Use STRIP_OUTER_ARRAY = TRUE to bypass the limit

**Exam Tip:** STRIP_OUTER_ARRAY is the solution for loading large JSON files that would exceed the 16 MB VARIANT row limit.

### Critical Option: STRIP_NULL_VALUES

**Purpose:** Removes object keys with null values from loaded data.

**Why Use It:**
- Improves subcolumnarization performance
- Elements with even one null value are NOT extracted into columnar format
- Removing nulls allows better query optimization

```sql
CREATE FILE FORMAT optimized_json
  TYPE = JSON
  STRIP_OUTER_ARRAY = TRUE
  STRIP_NULL_VALUES = TRUE;
```

### JSON Loading Example

```sql
-- Create optimized JSON file format
CREATE FILE FORMAT my_json_format
  TYPE = JSON
  STRIP_OUTER_ARRAY = TRUE
  STRIP_NULL_VALUES = TRUE
  COMPRESSION = GZIP;

-- Load JSON to VARIANT column
COPY INTO json_table
FROM @my_stage/data.json.gz
FILE_FORMAT = my_json_format;
```

---

## Section 5: Parquet, Avro, and ORC Options

### Parquet File Format

| Option | Description | Default |
|--------|-------------|---------|
| **TYPE** | Specifies Parquet format | - |
| **COMPRESSION** | Compression type (auto-detected) | AUTO |
| **BINARY_AS_TEXT** | Interpret binary as text | TRUE |
| **USE_LOGICAL_TYPE** | Use schema logical types | TRUE |

**Parquet Characteristics:**
- Binary columnar storage format
- Compression handled internally (Snappy, GZIP, LZO, etc.)
- Only Parquet writer v1 supported (v2 NOT supported)
- Commonly used for data lake scenarios

```sql
CREATE FILE FORMAT my_parquet_format
  TYPE = PARQUET
  COMPRESSION = AUTO;
```

### Avro File Format

| Option | Description | Default |
|--------|-------------|---------|
| **TYPE** | Specifies Avro format | - |
| **COMPRESSION** | Compression type (auto-detected) | AUTO |
| **TRIM_SPACE** | Trim leading/trailing spaces | FALSE |

**Avro Characteristics:**
- Binary format from Apache ecosystem
- Schema embedded in file
- Automatic compression detection
- Load only (cannot unload)

```sql
CREATE FILE FORMAT my_avro_format
  TYPE = AVRO
  COMPRESSION = AUTO;
```

### ORC File Format

| Option | Description | Default |
|--------|-------------|---------|
| **TYPE** | Specifies ORC format | - |
| **COMPRESSION** | Compression type (auto-detected) | AUTO |
| **TRIM_SPACE** | Trim leading/trailing spaces | FALSE |

**ORC Characteristics:**
- Optimized Row Columnar format from Hive
- Automatic compression detection
- Load only (cannot unload)

```sql
CREATE FILE FORMAT my_orc_format
  TYPE = ORC;
```

---

## Section 6: XML File Format Options

### XML-Specific Options

| Option | Description | Default |
|--------|-------------|---------|
| **TYPE** | Specifies XML format | - |
| **COMPRESSION** | Compression algorithm | AUTO |
| **PRESERVE_SPACE** | Preserve whitespace | FALSE |
| **STRIP_OUTER_ELEMENT** | Remove outer XML element | FALSE |
| **DISABLE_SNOWFLAKE_DATA** | Disable Snowflake data tags | FALSE |
| **DISABLE_AUTO_CONVERT** | Disable automatic type conversion | FALSE |
| **IGNORE_UTF8_ERRORS** | Replace invalid UTF-8 | FALSE |

**XML Loading Behavior:**
- Each top-level element loads as a separate row
- Elements identified by matching start/close tags

```sql
CREATE FILE FORMAT my_xml_format
  TYPE = XML
  PRESERVE_SPACE = FALSE;
```

---

## Section 7: Compression Options

### Compression Algorithm Comparison

| Algorithm | File Extension | Performance | Compression Ratio | Best For |
|-----------|----------------|-------------|-------------------|----------|
| **GZIP** | .gz | Moderate | High | General purpose (default) |
| **BZIP2** | .bz2 | Slow | Very High | Maximum compression |
| **Brotli** | .br | Moderate | Very High | Web content |
| **Zstd** | .zst | Fast | High | Large datasets |
| **Deflate** | .deflate | Moderate | High | Legacy compatibility |
| **Raw Deflate** | .raw_deflate | Moderate | High | No headers |
| **LZO** | .lzo | Very Fast | Moderate | Speed-critical |
| **Snappy** | .snappy | Very Fast | Moderate | Streaming data |

### Auto-Detection Behavior

When `COMPRESSION = AUTO` (the default):
- Snowflake automatically detects compression type
- Based on file extension and file content
- Works for both loading and unloading

### Internal Compression (Stages)

**For Internal Stages:**
- Files automatically compressed with GZIP when PUT
- Unless `AUTO_COMPRESS = FALSE` specified
- Files automatically encrypted with 128-bit keys

```sql
-- Disable auto-compression during PUT
PUT file:///data/file.csv @my_stage AUTO_COMPRESS = FALSE;
```

---

## Section 8: Default Behavior Summary

### When No File Format Specified

If no file format is specified in a COPY command, Snowflake assumes:

| Setting | Default Value |
|---------|---------------|
| Format Type | CSV |
| Field Delimiter | Comma (,) |
| Record Delimiter | Newline (\n) |
| Skip Header | 0 (no headers skipped) |
| Encoding | UTF-8 |
| Compression | AUTO |

**Exam Tip:** Without any file format specification, COPY assumes CSV with default options. This often causes errors when loading files with headers (first row treated as data).

---

## Section 9: File Format Management

### File Format DDL Commands

```sql
-- Create file format
CREATE FILE FORMAT my_format TYPE = CSV;

-- Create or replace
CREATE OR REPLACE FILE FORMAT my_format TYPE = JSON;

-- Alter file format
ALTER FILE FORMAT my_format SET SKIP_HEADER = 1;

-- Show file formats
SHOW FILE FORMATS;
SHOW FILE FORMATS IN SCHEMA my_schema;

-- Describe file format
DESCRIBE FILE FORMAT my_format;

-- Drop file format
DROP FILE FORMAT my_format;
```

### Required Privileges

| Operation | Required Privilege |
|-----------|-------------------|
| CREATE FILE FORMAT | CREATE FILE FORMAT on schema |
| ALTER FILE FORMAT | OWNERSHIP on file format |
| DROP FILE FORMAT | OWNERSHIP on file format |
| USE FILE FORMAT | USAGE on file format |

---

## Section 10: Exam Tips and Common Question Patterns

### High-Priority Topics

1. **Load vs Unload Support**
   - Know which formats support unloading (CSV, JSON, Parquet only)
   - Avro, ORC, XML are load-only

2. **STRIP_OUTER_ARRAY**
   - JSON-specific option
   - Bypasses 16 MB VARIANT limit
   - Creates separate rows from array elements

3. **File Format Precedence**
   - COPY command > Stage > Table
   - Options are NOT cumulative (override completely)

4. **SKIP_HEADER for CSV**
   - Most common error source
   - Forgetting causes header row to be treated as data

5. **Compression**
   - AUTO detection is default
   - GZIP is default for internal stage PUT
   - Know common compression types and use cases

### Common Exam Questions

**Question Pattern 1:** "Which file formats support data unloading?"
- Answer: CSV, JSON, Parquet

**Question Pattern 2:** "How do you load a large JSON file that exceeds the VARIANT size limit?"
- Answer: Use STRIP_OUTER_ARRAY = TRUE

**Question Pattern 3:** "What happens if file format is set on both stage and COPY command?"
- Answer: COPY command takes precedence, completely overriding stage settings

**Question Pattern 4:** "What is the default file format type when none is specified?"
- Answer: CSV with comma delimiter, no header skip

**Question Pattern 5:** "Which compression algorithm is automatically applied to files in internal stages?"
- Answer: GZIP (unless AUTO_COMPRESS = FALSE)

### Quick Reference Card

```
FORMAT SUPPORT MATRIX:
----------------------
         |  Load  | Unload
---------+--------+--------
CSV      |   Yes  |   Yes
JSON     |   Yes  |   Yes
Parquet  |   Yes  |   Yes
Avro     |   Yes  |   No
ORC      |   Yes  |   No
XML      |   Yes  |   No

KEY DEFAULTS:
-------------
Default format type: CSV
Default delimiter: Comma (,)
Default compression: AUTO
Default skip header: 0
Default encoding: UTF-8

CRITICAL OPTIONS:
-----------------
CSV: SKIP_HEADER, FIELD_DELIMITER, NULL_IF
JSON: STRIP_OUTER_ARRAY, STRIP_NULL_VALUES
Parquet: COMPRESSION (auto-detected)
```

---

## Practice Questions

### Question 1
A data engineer needs to load a large JSON file containing millions of records into Snowflake. The file structure is an array of objects at the root level. What file format option should be used to ensure each object becomes a separate row?

<details>
<summary>Show Answer</summary>

**Answer:** STRIP_OUTER_ARRAY = TRUE

This option removes the outer array brackets and loads each element as a separate row, preventing the 16 MB VARIANT row limit from being exceeded.

```sql
CREATE FILE FORMAT json_large_file
  TYPE = JSON
  STRIP_OUTER_ARRAY = TRUE;
```
</details>

### Question 2
A COPY INTO command uses a stage that has a file format defined with SKIP_HEADER = 1. The same COPY command also specifies FILE_FORMAT = (TYPE = CSV FIELD_DELIMITER = '|'). How many header rows will be skipped?

<details>
<summary>Show Answer</summary>

**Answer:** 0 (zero) header rows will be skipped.

File format options are NOT cumulative. The COPY command's file format specification completely overrides the stage's file format. Since SKIP_HEADER is not specified in the COPY command, it defaults to 0.
</details>

### Question 3
Which of the following file formats can be used for both loading and unloading data in Snowflake? (Select all that apply)

A. CSV
B. JSON
C. Avro
D. ORC
E. Parquet
F. XML

<details>
<summary>Show Answer</summary>

**Answer:** A, B, E (CSV, JSON, Parquet)

Avro, ORC, and XML support loading only. They cannot be used as unload formats with COPY INTO <location>.
</details>

### Question 4
What is the default compression algorithm applied to files uploaded to an internal stage using the PUT command?

<details>
<summary>Show Answer</summary>

**Answer:** GZIP

By default, files uploaded to internal stages are automatically compressed using GZIP unless AUTO_COMPRESS = FALSE is specified in the PUT command.
</details>

### Question 5
A data engineer creates a file format with the following definition:
```sql
CREATE FILE FORMAT test_format
  TYPE = JSON
  STRIP_NULL_VALUES = TRUE;
```

Why might this improve query performance on the loaded data?

<details>
<summary>Show Answer</summary>

**Answer:** STRIP_NULL_VALUES = TRUE removes object keys containing null values, which improves subcolumnarization.

In Snowflake, elements with even a single null value are NOT extracted into columnar format. When the engine queries non-extracted elements, it must scan the entire JSON structure for each row. By removing null values during load, more elements can be subcolumnarized, improving query performance through better pruning and reduced scanning.
</details>

### Question 6
A data engineer attempts to load a CSV file with the following COPY command, but the first row of data is not loading correctly:

```sql
COPY INTO employee_table
FROM @stage1/employees.csv
FILE_FORMAT = (TYPE = CSV);
```

The CSV file has column headers in the first row. What is the most likely issue and solution?

<details>
<summary>Show Answer</summary>

**Answer:** The SKIP_HEADER option is not set, so the header row is being treated as data.

**Solution:**
```sql
COPY INTO employee_table
FROM @stage1/employees.csv
FILE_FORMAT = (TYPE = CSV SKIP_HEADER = 1);
```

When no file format is specified or SKIP_HEADER is not set, it defaults to 0, meaning no rows are skipped and the header row is loaded as data.
</details>

---

## Summary

File formats are essential for successful data loading and unloading in Snowflake. Key takeaways for the SnowPro Core exam:

1. **Know the six supported formats:** CSV, JSON, Avro, ORC, Parquet, XML
2. **Remember load vs unload support:** Only CSV, JSON, and Parquet support unloading
3. **Understand STRIP_OUTER_ARRAY:** Critical for large JSON files exceeding 16 MB
4. **File format precedence:** COPY command overrides stage settings completely
5. **Default behavior:** Without specification, assumes CSV with standard defaults
6. **SKIP_HEADER for CSV:** Most common configuration error when forgotten
7. **Compression:** GZIP default for internal stages; AUTO detection available
8. **Named file formats:** Best practice for reusable, consistent data loading
