# Domain 4: Data Loading & Unloading
## Part 9: Data Transformation During Load

**Exam Weight:** This topic is part of Domain 4 (10-15% of exam) and relates to Domain 5: Data Transformations (20-25% of exam)

---

## Overview

Snowflake supports transforming data during the COPY INTO operation, eliminating the need for a separate ETL step. This feature enables column reordering, data type conversion, column omission, and loading subsets of columns directly during the load process. Understanding transformation capabilities is essential for efficient data loading and the SnowPro Core exam.

---

## Section 1: Core Concepts

### What is Data Transformation During Load?

Data transformation during load allows you to manipulate data as it is being loaded from staged files into Snowflake tables. Instead of loading raw data and then transforming it with subsequent SQL statements, you perform both operations in a single COPY INTO command.

### Key Benefits

| Benefit | Description |
|---------|-------------|
| **Efficiency** | Single operation combines loading and transformation |
| **Simplicity** | No need for staging tables or separate transformation steps |
| **Flexibility** | Handle schema mismatches between source and target |
| **Performance** | Reduces data movement and processing overhead |
| **Cost Savings** | Less compute time for loading and transforming separately |

### Transformation Capabilities

Snowflake COPY transformations support:

1. **Column reordering** - Load columns in different order than source file
2. **Column omission** - Skip columns that aren't needed
3. **Data type conversion** - Convert data types during load (e.g., string to date)
4. **Substring extraction** - Extract portions of text fields
5. **Sequence/identity population** - Auto-generate unique values
6. **Metadata inclusion** - Add file metadata as columns
7. **Semi-structured data extraction** - Extract specific elements from JSON/Parquet

**Exam Tip:** Transformation during load is NOT available for VALIDATION_MODE. You cannot validate a COPY statement that includes data transformations.

---

## Section 2: Transformation Syntax

### Basic COPY Transformation Syntax

```sql
COPY INTO target_table (col1, col2, col3)
FROM (
  SELECT
    expression1,
    expression2,
    expression3
  FROM @stage_name/file_path
)
FILE_FORMAT = (type = CSV);
```

### Key Syntax Elements

| Element | Description | Required |
|---------|-------------|----------|
| **Target columns** | Column list in parentheses after table name | No (if selecting all) |
| **Subquery** | SELECT statement wrapped in parentheses | Yes (for transformations) |
| **Positional references** | $1, $2, $3... reference source columns | Yes (for CSV) |
| **Stage reference** | @stage_name/path in FROM clause | Yes |
| **File format** | Specifies how to parse source data | Recommended |

### Positional Column References

For delimited (CSV) files, use positional notation to reference columns:

```sql
-- $1 = first column, $2 = second column, etc.
COPY INTO my_table (name, id, created_date)
FROM (
  SELECT $2, $1, $3   -- Reorder: second column first
  FROM @my_stage/data.csv
)
FILE_FORMAT = (type = CSV SKIP_HEADER = 1);
```

**Important:** Positional references start at $1, not $0.

### Accessing Semi-Structured Data

For semi-structured formats (JSON, Parquet, Avro, ORC), data is accessed through $1:

```sql
-- All semi-structured data is in $1
-- Use dot notation or bracket notation to access elements
COPY INTO my_table (city, zip_code, price)
FROM (
  SELECT
    $1:location.city::VARCHAR,
    $1:location.zip::INTEGER,
    $1:price::NUMBER
  FROM @my_stage/data.json
)
FILE_FORMAT = (type = JSON);
```

---

## Section 3: Supported File Formats for Transformation

### Format Support Matrix

| Format | Transformation Support | Column Reference |
|--------|------------------------|------------------|
| **CSV** | Yes | $1, $2, $3... (positional) |
| **JSON** | Yes | $1:element.path |
| **Parquet** | Yes | $1:element_name |
| **Avro** | Yes | $1:element_name |
| **ORC** | Yes | $1:element_name |
| **XML** | Yes | $1:element_name |

### Important Notes by Format

**CSV:**
- Each column has its own positional reference ($1, $2, $3...)
- ERROR_ON_COLUMN_COUNT_MISMATCH is ignored during transformations
- No requirement for source files to match target table structure

**Semi-Structured (JSON, Parquet, etc.):**
- All data is stored in a single column ($1)
- Use dot notation to navigate nested structures
- Type casting is typically required (::VARCHAR, ::NUMBER, etc.)

**Exam Tip:** ERROR_ON_COLUMN_COUNT_MISMATCH is automatically ignored when using transformation queries, allowing you to load from files with different column counts than your target table.

---

## Section 4: Supported Functions

### Function Categories for COPY Transformations

Snowflake supports a specific subset of functions within COPY transformation queries:

#### Conversion Functions

| Function | Description | Example |
|----------|-------------|---------|
| **CAST / ::** | Convert data types | `$1::INTEGER` |
| **TO_DATE** | Convert to date | `TO_DATE($3, 'YYYY-MM-DD')` |
| **TO_NUMBER** | Convert to number | `TO_NUMBER($2)` |
| **TO_TIMESTAMP** | Convert to timestamp | `TO_TIMESTAMP($4)` |
| **TO_BOOLEAN** | Convert to boolean | `TO_BOOLEAN($5)` |
| **TO_CHAR** | Convert to string | `TO_CHAR($1)` |
| **TO_VARIANT** | Convert to VARIANT | `TO_VARIANT($1)` |

#### String Functions

| Function | Description | Example |
|----------|-------------|---------|
| **SUBSTR/SUBSTRING** | Extract substring | `SUBSTR($1, 1, 10)` |
| **UPPER/LOWER** | Case conversion | `UPPER($2)` |
| **TRIM** | Remove whitespace | `TRIM($3)` |
| **CONCAT** | Concatenate strings | `CONCAT($1, $2)` |
| **REPLACE** | Replace characters | `REPLACE($1, '-', '')` |
| **SPLIT** | Split string to array | `SPLIT($1, ',')` |
| **LPAD/RPAD** | Pad strings | `LPAD($1, 10, '0')` |
| **LENGTH** | String length | `LENGTH($1)` |
| **ASCII** | ASCII code | `ASCII($1)` |

#### Numeric Functions

| Function | Description | Example |
|----------|-------------|---------|
| **ROUND** | Round number | `ROUND($1, 2)` |
| **CEIL/FLOOR** | Round up/down | `CEIL($1)` |
| **ABS** | Absolute value | `ABS($1)` |
| **MOD** | Modulo | `MOD($1, 10)` |
| **POWER** | Exponentiation | `POWER($1, 2)` |
| **SQRT** | Square root | `SQRT($1)` |

#### Conditional Functions

| Function | Description | Example |
|----------|-------------|---------|
| **CASE** | Conditional logic | `CASE WHEN $1 > 100 THEN 'HIGH' ELSE 'LOW' END` |
| **IFF** | Simple conditional | `IFF($1 > 0, 'POSITIVE', 'NEGATIVE')` |
| **NULLIF** | Return NULL if match | `NULLIF($1, '')` |
| **NVL/COALESCE** | NULL handling | `NVL($1, 'DEFAULT')` |
| **IFNULL** | Replace NULL | `IFNULL($1, 0)` |
| **ZEROIFNULL** | Replace NULL with zero | `ZEROIFNULL($1)` |

#### Safe Conversion Functions (TRY_*)

| Function | Description | Use Case |
|----------|-------------|----------|
| **TRY_CAST** | Safe type cast | Returns NULL on failure |
| **TRY_TO_DATE** | Safe date conversion | Returns NULL on invalid date |
| **TRY_TO_NUMBER** | Safe number conversion | Returns NULL on invalid number |
| **TRY_TO_TIMESTAMP** | Safe timestamp conversion | Returns NULL on invalid timestamp |
| **TRY_TO_BOOLEAN** | Safe boolean conversion | Returns NULL on invalid boolean |

#### Semi-Structured Functions

| Function | Description | Example |
|----------|-------------|---------|
| **PARSE_JSON** | Parse JSON string | `PARSE_JSON($1)` |
| **FLATTEN** | Expand arrays/objects | `FLATTEN(input => $1:array)` |
| **GET** | Get element by key | `GET($1, 'key')` |
| **GET_PATH** | Get nested element | `GET_PATH($1, 'a.b.c')` |

**Exam Tip:** TRY_TO_DATE and TRY_TO_TIME functions do NOT support the optional format argument within COPY statements.

### Unsupported Operations

The following are NOT supported in COPY transformations:

- **WHERE clause** - Cannot filter rows during load
- **ORDER BY** - Cannot sort results
- **LIMIT/TOP/FETCH** - Cannot limit rows
- **GROUP BY** - Cannot aggregate
- **DISTINCT** - Limited support (may cause ON_ERROR issues)
- **JOINs** - Cannot join with other tables
- **Subqueries** - Cannot nest SELECT statements

---

## Section 5: Common Transformation Patterns

### Pattern 1: Load Subset of Columns

Load only specific columns from a CSV file:

```sql
-- Source CSV has 10 columns, we only need 4
CREATE TABLE home_sales (
  city VARCHAR,
  zip INTEGER,
  sale_date DATE,
  price NUMBER
);

COPY INTO home_sales (city, zip, sale_date, price)
FROM (
  SELECT $1, $2, $6, $7  -- Only columns 1, 2, 6, 7
  FROM @mystage/sales.csv.gz
)
FILE_FORMAT = (type = CSV SKIP_HEADER = 1);
```

**Use Case:** Source files have more columns than needed.

### Pattern 2: Reorder Columns

Change column order during load:

```sql
-- Source: col1, col2, col3
-- Target: col3, col1, col2
COPY INTO my_table (col3, col1, col2)
FROM (
  SELECT $3, $1, $2  -- Reorder columns
  FROM @mystage/data.csv
)
FILE_FORMAT = (type = CSV);
```

**Use Case:** Source file column order doesn't match table definition.

### Pattern 3: Convert Data Types

Apply type conversions during load:

```sql
CREATE TABLE transactions (
  id INTEGER,
  amount NUMBER(10,2),
  trans_date DATE,
  created_at TIMESTAMP_NTZ
);

COPY INTO transactions (id, amount, trans_date, created_at)
FROM (
  SELECT
    $1::INTEGER,
    TO_NUMBER($2, 10, 2),
    TO_DATE($3, 'MM/DD/YYYY'),
    TO_TIMESTAMP_NTZ($4, 'YYYY-MM-DD HH24:MI:SS')
  FROM @mystage/transactions.csv
)
FILE_FORMAT = (type = CSV SKIP_HEADER = 1);
```

**Use Case:** Source data types differ from target table columns.

### Pattern 4: Include Sequence Values

Generate unique IDs during load:

```sql
-- Create a sequence
CREATE SEQUENCE seq1;

-- Create table with sequence column
CREATE TABLE my_table (
  id NUMBER DEFAULT seq1.NEXTVAL,
  name VARCHAR,
  email VARCHAR
);

-- Include sequence in COPY
COPY INTO my_table (id, name, email)
FROM (
  SELECT seq1.NEXTVAL, $1, $2
  FROM @mystage/users.csv
)
FILE_FORMAT = (type = CSV SKIP_HEADER = 1);
```

**Use Case:** Generate unique identifiers for each loaded row.

### Pattern 5: Use AUTOINCREMENT/IDENTITY

Let Snowflake auto-generate IDs by omitting the column:

```sql
CREATE TABLE my_table (
  id NUMBER AUTOINCREMENT START 1 INCREMENT 1,
  name VARCHAR,
  email VARCHAR
);

-- Omit the autoincrement column
COPY INTO my_table (name, email)
FROM (
  SELECT $1, $2  -- Skip id column
  FROM @mystage/users.csv
)
FILE_FORMAT = (type = CSV SKIP_HEADER = 1);
```

**Use Case:** Auto-generate sequential IDs without explicit sequence.

### Pattern 6: Load Semi-Structured Data into Separate Columns

Extract JSON elements into relational columns:

```sql
-- Source JSON: {"location":{"city":"Denver","zip":"80237"},"sqft":2000,"price":300000}

CREATE TABLE home_sales (
  city VARCHAR,
  zip VARCHAR,
  sqft INTEGER,
  price NUMBER
);

COPY INTO home_sales (city, zip, sqft, price)
FROM (
  SELECT
    $1:location.city::VARCHAR,
    $1:location.zip::VARCHAR,
    $1:sqft::INTEGER,
    $1:price::NUMBER
  FROM @mystage/sales.json
)
FILE_FORMAT = (type = JSON);
```

**Use Case:** Transform semi-structured data into relational format.

### Pattern 7: Load Parquet Data into Columns

Extract Parquet elements:

```sql
-- All Parquet data is in $1, access by element name
COPY INTO parquet_table (cust_key, order_date, order_status, price)
FROM (
  SELECT
    $1:custKey::NUMBER,
    $1:orderDate::DATE,
    $1:orderStatus::VARCHAR,
    $1:price::VARCHAR
  FROM @mystage/data.parquet
)
FILE_FORMAT = (type = PARQUET);
```

**Exam Tip:** All Parquet data is stored in a single column ($1). Access elements by their Parquet schema names.

### Pattern 8: Flatten Semi-Structured Data

Use FLATTEN to expand arrays:

```sql
-- Create table from flattened JSON
CREATE TABLE flattened_data AS
SELECT
  seq,
  key,
  path,
  index,
  value::VARIANT,
  this::VARIANT
FROM @mystage/data.json.gz,
  TABLE(FLATTEN(input => PARSE_JSON($1)));
```

**Use Case:** Expand JSON arrays into multiple rows.

### Pattern 9: Split and Transform

Split field values during load:

```sql
-- Split IP addresses into array columns
COPY INTO ip_data (ip_address, octet1, octet2, octet3, octet4)
FROM (
  SELECT
    $1:ip::VARCHAR,
    SPLIT($1:ip, '.')[0]::INTEGER,
    SPLIT($1:ip, '.')[1]::INTEGER,
    SPLIT($1:ip, '.')[2]::INTEGER,
    SPLIT($1:ip, '.')[3]::INTEGER
  FROM @mystage/ips.json
)
FILE_FORMAT = (type = JSON);
```

**Use Case:** Parse composite fields into separate columns.

---

## Section 6: Metadata Columns

### Available Metadata Columns

Snowflake provides metadata pseudo-columns that can be included during load:

| Column | Data Type | Description |
|--------|-----------|-------------|
| **METADATA$FILENAME** | VARCHAR | Full path and name of source file |
| **METADATA$FILE_ROW_NUMBER** | NUMBER | Row number within the file |
| **METADATA$FILE_CONTENT_KEY** | VARCHAR | Checksum of the file |
| **METADATA$FILE_LAST_MODIFIED** | TIMESTAMP_NTZ | Last modified time of file |
| **METADATA$START_SCAN_TIME** | TIMESTAMP_LTZ | When the row was scanned |

### Using Metadata in Transformations

```sql
CREATE TABLE loaded_data (
  filename VARCHAR,
  row_num INTEGER,
  load_time TIMESTAMP_LTZ,
  col1 VARCHAR,
  col2 VARCHAR
);

COPY INTO loaded_data (filename, row_num, load_time, col1, col2)
FROM (
  SELECT
    METADATA$FILENAME,
    METADATA$FILE_ROW_NUMBER,
    METADATA$START_SCAN_TIME,
    $1,
    $2
  FROM @mystage/data.csv
)
FILE_FORMAT = (type = CSV);
```

### Important Metadata Notes

1. **Metadata columns can only be queried by name** - Not included in SELECT *
2. **Cannot insert into existing rows** - Only during initial load
3. **METADATA$START_SCAN_TIME preferred** - More accurate than CURRENT_TIMESTAMP for load time

**Exam Tip:** Use METADATA$START_SCAN_TIME instead of CURRENT_TIMESTAMP default column values to capture accurate load time.

---

## Section 7: MATCH_BY_COLUMN_NAME Option

### What is MATCH_BY_COLUMN_NAME?

For semi-structured formats (Parquet, Avro, ORC), MATCH_BY_COLUMN_NAME loads data by matching source column names to target column names (case-insensitive).

### Syntax

```sql
COPY INTO my_table
FROM @mystage/data.parquet
FILE_FORMAT = (type = PARQUET)
MATCH_BY_COLUMN_NAME = CASE_INSENSITIVE;
```

### Options

| Value | Behavior |
|-------|----------|
| **NONE** | Default; requires column order to match |
| **CASE_INSENSITIVE** | Match by name, ignoring case |
| **CASE_SENSITIVE** | Match by name, case must match exactly |

### Limitation with Transformations

**MATCH_BY_COLUMN_NAME cannot be combined with COPY transformation queries.** You must choose one approach:

- Use transformation query (SELECT subquery) for explicit control
- Use MATCH_BY_COLUMN_NAME for automatic column matching

**Exam Tip:** MATCH_BY_COLUMN_NAME and transformation queries are mutually exclusive options.

---

## Section 8: TRUNCATECOLUMNS Option

### Purpose

The TRUNCATECOLUMNS (or ENFORCE_LENGTH) option truncates strings that exceed target column length instead of generating an error.

### Syntax

```sql
COPY INTO my_table
FROM @mystage/data.csv
FILE_FORMAT = (type = CSV)
TRUNCATECOLUMNS = TRUE;
```

### Behavior

| Setting | Behavior |
|---------|----------|
| **FALSE** (default) | Error if string exceeds column length |
| **TRUE** | Silently truncate to fit column length |

**Use Case:** When source data may contain strings longer than target column definitions.

---

## Section 9: Error Handling in Transformations

### ON_ERROR Option Considerations

The ON_ERROR copy option behavior may be affected by transformations:

```sql
COPY INTO my_table
FROM (SELECT $1::INTEGER, $2 FROM @mystage/data.csv)
FILE_FORMAT = (type = CSV)
ON_ERROR = CONTINUE;  -- May behave differently with transformations
```

### Limitations

1. **Scalar SQL UDFs** - Limited error handling support; may cause inconsistent ON_ERROR behavior
2. **DISTINCT keyword** - May lead to unexpected ON_ERROR behavior
3. **VALIDATION_MODE** - NOT supported with transformation queries

### Safe Conversion Pattern

Use TRY_* functions for safer transformations:

```sql
COPY INTO my_table (id, amount)
FROM (
  SELECT
    TRY_TO_NUMBER($1),   -- Returns NULL instead of error
    TRY_TO_NUMBER($2)
  FROM @mystage/data.csv
)
FILE_FORMAT = (type = CSV)
ON_ERROR = CONTINUE;
```

**Exam Tip:** VALIDATION_MODE parameter does not support COPY statements that transform data during a load.

---

## Section 10: Best Practices

### When to Use Transformation During Load

| Scenario | Recommended Approach |
|----------|---------------------|
| Simple column reordering | Use transformation query |
| Type conversions needed | Use transformation query |
| Subset of columns needed | Use transformation query |
| Complex transformations | Consider staging table + separate ETL |
| Need to validate data first | Load raw, then transform (VALIDATION_MODE incompatible) |
| High error rate expected | Use TRY_* functions in transformation |

### Performance Considerations

1. **Keep transformations simple** - Complex logic may slow loading
2. **Use appropriate functions** - TRY_* functions add overhead
3. **Consider file format** - Semi-structured formats require more parsing
4. **Test with VALIDATION_MODE first** - But remember: validation doesn't work with transformations

### Common Pitfalls

1. **Forgetting type casts** - Semi-structured elements need explicit casts
2. **Wrong positional references** - $1 is first column, not $0
3. **Using MATCH_BY_COLUMN_NAME with transforms** - They're mutually exclusive
4. **Expecting WHERE clause support** - Not available in COPY transformations
5. **Relying on VALIDATION_MODE** - Doesn't work with transformations

---

## Section 11: Exam Tips and Common Question Patterns

### High-Priority Topics

1. **Positional notation ($1, $2, $3...)** - Know this starts at $1
2. **Semi-structured access** - All data in $1, use dot notation
3. **Supported vs unsupported operations** - No WHERE, ORDER BY, LIMIT
4. **VALIDATION_MODE incompatibility** - Cannot validate transformation queries
5. **ERROR_ON_COLUMN_COUNT_MISMATCH** - Ignored during transformations
6. **MATCH_BY_COLUMN_NAME** - Cannot combine with transformation queries
7. **Metadata columns** - METADATA$FILENAME, METADATA$FILE_ROW_NUMBER
8. **Type conversion functions** - TO_DATE, TO_NUMBER, CAST, TRY_*

### Common Exam Questions

**Question Pattern 1:** "How do you reference the third column in a CSV file during a COPY transformation?"
- Answer: $3

**Question Pattern 2:** "How do you access a nested JSON element named 'city' inside a 'location' object?"
- Answer: $1:location.city::VARCHAR

**Question Pattern 3:** "Can you use VALIDATION_MODE with COPY transformations?"
- Answer: No, VALIDATION_MODE does not support transformation queries

**Question Pattern 4:** "What happens to ERROR_ON_COLUMN_COUNT_MISMATCH when using a transformation query?"
- Answer: It is ignored; source and target can have different column counts

**Question Pattern 5:** "How do you capture the source filename during load?"
- Answer: Include METADATA$FILENAME in the SELECT list

**Question Pattern 6:** "Can you filter rows using WHERE during a COPY transformation?"
- Answer: No, WHERE clause is not supported in COPY transformations

### Quick Reference Card

```
COPY TRANSFORMATION SYNTAX:
---------------------------
COPY INTO table (col1, col2)
FROM (
  SELECT expression1, expression2
  FROM @stage/file
)
FILE_FORMAT = (type = CSV);

COLUMN REFERENCES:
------------------
CSV:        $1, $2, $3, ... (positional)
JSON:       $1:key.nested::TYPE
Parquet:    $1:element_name::TYPE

SUPPORTED OPERATIONS:
---------------------
+ Column reordering
+ Type conversion (CAST, TO_*, TRY_*)
+ String functions (SUBSTR, TRIM, etc.)
+ Conditional logic (CASE, IFF, NVL)
+ Sequence/NEXTVAL
+ FLATTEN (for arrays)
+ Metadata columns

NOT SUPPORTED:
--------------
- WHERE clause
- ORDER BY
- LIMIT/TOP/FETCH
- GROUP BY
- JOINs
- Subqueries
- DISTINCT (limited)
- VALIDATION_MODE

METADATA COLUMNS:
-----------------
METADATA$FILENAME
METADATA$FILE_ROW_NUMBER
METADATA$FILE_CONTENT_KEY
METADATA$FILE_LAST_MODIFIED
METADATA$START_SCAN_TIME
```

---

## Practice Questions

### Question 1
A data engineer needs to load a CSV file where the columns are in order: ID, NAME, EMAIL, PHONE. The target table has columns in order: NAME, EMAIL, ID. How should the COPY statement be structured?

<details>
<summary>Show Answer</summary>

**Answer:**
```sql
COPY INTO target_table (name, email, id)
FROM (
  SELECT $2, $3, $1   -- NAME=$2, EMAIL=$3, ID=$1
  FROM @stage/file.csv
)
FILE_FORMAT = (type = CSV);
```

The transformation query allows reordering columns by specifying the positional references in the desired order.
</details>

### Question 2
A JSON file contains objects with the structure: `{"customer":{"name":"John","city":"Denver"},"amount":100}`. Write a COPY statement to load the customer name and amount into a table with columns (cust_name VARCHAR, total_amount NUMBER).

<details>
<summary>Show Answer</summary>

**Answer:**
```sql
COPY INTO target_table (cust_name, total_amount)
FROM (
  SELECT
    $1:customer.name::VARCHAR,
    $1:amount::NUMBER
  FROM @stage/data.json
)
FILE_FORMAT = (type = JSON);
```

Semi-structured data is accessed through $1 with dot notation for nested elements and explicit type casting.
</details>

### Question 3
A data engineer attempts to validate a COPY statement with transformations using VALIDATION_MODE=RETURN_ALL_ERRORS. What will happen?

<details>
<summary>Show Answer</summary>

**Answer:** The statement will fail or produce an error.

VALIDATION_MODE does not support COPY statements that transform data during a load. To validate data, you must use a COPY statement without transformation queries.
</details>

### Question 4
Which of the following operations are NOT supported in COPY transformation queries? (Select all that apply)

A. SUBSTR function
B. WHERE clause
C. TO_DATE function
D. ORDER BY clause
E. CASE expression
F. LIMIT clause

<details>
<summary>Show Answer</summary>

**Answer:** B, D, F (WHERE clause, ORDER BY clause, LIMIT clause)

COPY transformations do not support filtering with WHERE, sorting with ORDER BY, or limiting rows with LIMIT/TOP/FETCH. Functions like SUBSTR, TO_DATE, and CASE expressions are supported.
</details>

### Question 5
A data engineer wants to include the source filename as a column in the loaded data. What metadata column should be used?

<details>
<summary>Show Answer</summary>

**Answer:** METADATA$FILENAME

```sql
COPY INTO my_table (source_file, col1, col2)
FROM (
  SELECT METADATA$FILENAME, $1, $2
  FROM @stage/data.csv
)
FILE_FORMAT = (type = CSV);
```

METADATA$FILENAME returns the full path and name of the staged data file.
</details>

### Question 6
A Parquet file has columns named custKey, orderDate, and totalAmount. The target table has columns named CUST_KEY, ORDER_DATE, and TOTAL_AMOUNT. What are two valid approaches to load this data?

<details>
<summary>Show Answer</summary>

**Answer:**

**Approach 1: Transformation Query (explicit mapping)**
```sql
COPY INTO my_table (cust_key, order_date, total_amount)
FROM (
  SELECT
    $1:custKey::NUMBER,
    $1:orderDate::DATE,
    $1:totalAmount::NUMBER
  FROM @stage/data.parquet
)
FILE_FORMAT = (type = PARQUET);
```

**Approach 2: MATCH_BY_COLUMN_NAME (if column names match, ignoring case)**
Note: This won't work in this case because the names don't match (custKey vs CUST_KEY).

For MATCH_BY_COLUMN_NAME to work, Parquet columns would need to be named cust_key, order_date, and total_amount (matching the table column names).

The transformation query is the correct approach when column names differ.
</details>

---

## Summary

Data transformation during load is a powerful Snowflake capability that streamlines ETL processes. Key takeaways for the SnowPro Core exam:

1. **Transformation syntax** - Use SELECT subquery within COPY INTO
2. **Positional references** - CSV uses $1, $2, $3...; semi-structured uses $1:element
3. **Supported functions** - Conversion, string, numeric, conditional, and TRY_* functions
4. **Unsupported operations** - No WHERE, ORDER BY, LIMIT, GROUP BY, or JOINs
5. **VALIDATION_MODE** - Incompatible with transformation queries
6. **ERROR_ON_COLUMN_COUNT_MISMATCH** - Automatically ignored during transformations
7. **MATCH_BY_COLUMN_NAME** - Mutually exclusive with transformation queries
8. **Metadata columns** - METADATA$FILENAME, METADATA$FILE_ROW_NUMBER, etc.
9. **Type casting required** - Semi-structured elements need explicit ::TYPE casts
10. **Use TRY_* functions** - For safer conversions that return NULL instead of errors
