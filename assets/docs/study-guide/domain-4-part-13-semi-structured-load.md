# Domain 4: Data Loading & Unloading
## Part 13: Loading Semi-Structured Data

**Exam Weight:** This topic is part of Domain 4: Data Loading & Unloading (10-15% of exam)

---

## Overview

Semi-structured data loading is a fundamental capability in Snowflake that enables organizations to ingest JSON, Avro, ORC, Parquet, and XML data. Understanding how to load, store, query, and transform semi-structured data is essential for the SnowPro Core exam, as it represents a significant differentiation from traditional relational databases.

---

## Section 1: What is Semi-Structured Data?

### Definition and Characteristics

Semi-structured data is data that does not conform to traditional structured (tabular) data standards but contains tags, labels, or other markers that identify distinct entities within the data.

**Key Attributes Distinguishing Semi-Structured from Structured Data:**

| Characteristic | Structured Data | Semi-Structured Data |
|----------------|-----------------|---------------------|
| **Schema** | Fixed, predefined schema required | Flexible, self-describing, schema-on-read |
| **Structure** | Flat table format | Hierarchical with nested structures |
| **Entities** | Uniform attributes across rows | Different attributes allowed within same class |
| **Attribute Order** | Column order matters | Attribute order is not important |
| **Evolution** | Schema changes require ALTER TABLE | Can evolve dynamically (new attributes added anytime) |

### Hierarchical Data Structures

Semi-structured data is typically organized hierarchically using two fundamental building blocks:

| Data Type | Description | Syntax Example |
|-----------|-------------|----------------|
| **OBJECT** | Key-value pairs (dictionary/map/hash) | `{"key1": "value1", "key2": "value2"}` |
| **ARRAY** | Ordered list of elements | `[1, 2, 3]` or `["a", "b", "c"]` |

**Nesting Capabilities:**
- VARIANT can hold any data type including ARRAY or OBJECT
- ARRAY elements are always VARIANT type
- OBJECT values are always VARIANT type
- Hierarchies can be nested to almost any depth

**Example Hierarchy:**
```json
{
  "dealership": "Valley View Auto Sales",
  "salesperson": {
    "id": "55",
    "name": "Frank Beasley"
  },
  "vehicles": [
    {
      "make": "Honda",
      "extras": ["warranty", "paint protection"]
    }
  ]
}
```

**Exam Tip:** A Snowflake OBJECT is NOT the same as an "object" in object-oriented programming. It corresponds to a "dictionary", "hash", or "map" in other languages.

---

## Section 2: Supported Semi-Structured Formats

### Format Comparison Matrix

| Format | Load | Unload | Compression | Key Characteristics |
|--------|------|--------|-------------|---------------------|
| **JSON** | Yes | Yes | GZIP, BZIP2, Brotli, Zstd | Most common; human-readable |
| **Avro** | Yes | No | Auto-detected (internal) | Binary; schema in file |
| **ORC** | Yes | No | Auto-detected (internal) | Binary; from Hive ecosystem |
| **Parquet** | Yes | Yes | Auto-detected (Snappy, GZIP, LZO) | Binary columnar; widely used in data lakes |
| **XML** | Yes | No | GZIP, BZIP2, Brotli, Zstd | Markup language; supports attributes |

### JSON (JavaScript Object Notation)

**Characteristics:**
- Lightweight, plain-text format
- Based on JavaScript subset
- Human-readable
- Flexible implementation (Snowflake is liberal in acceptance)

**Supported Value Types:**
- Numbers (integer or floating point)
- Strings (in double quotes)
- Booleans (true or false)
- Arrays (in square brackets)
- Objects (in curly braces)
- Null

**JSON Syntax Rules:**
```json
{
  "name": "John Doe",           -- String
  "age": 35,                    -- Number
  "active": true,               -- Boolean
  "address": null,              -- Null
  "skills": ["SQL", "Python"],  -- Array
  "department": {               -- Nested Object
    "name": "Engineering",
    "code": "ENG"
  }
}
```

### Avro

**Characteristics:**
- Open-source serialization and RPC framework
- Originally developed for Apache Hadoop
- Schema defined in JSON, stored in file
- Data serialized in compact binary format
- Schema included with data for easy deserialization

**Avro Schema Example:**
```json
{
  "type": "record",
  "name": "person",
  "namespace": "example.avro",
  "fields": [
    {"name": "fullName", "type": "string"},
    {"name": "age", "type": ["int", "null"]},
    {"name": "gender", "type": ["string", "null"]}
  ]
}
```

### ORC (Optimized Row Columnar)

**Characteristics:**
- Binary format from Hive ecosystem
- Designed for efficient compression
- Optimized for reading, writing, and processing
- Map data deserialized into array of objects
- Union data deserialized into single object

**ORC Data Example (loaded into VARIANT):**
```json
{
  "boolean1": false,
  "byte1": 1,
  "int1": 65536,
  "double1": -15.0,
  "list": [
    {"int1": 3, "string1": "good"},
    {"int1": 4, "string1": "bad"}
  ]
}
```

### Parquet

**Characteristics:**
- Compressed, efficient columnar data format
- Designed for Hadoop ecosystem
- Uses Dremel record shredding algorithm
- Binary format (cannot be opened in text editor)
- Only writer v1 supported (v2 NOT supported)

**Parquet Loading:**
- Can load into single VARIANT column
- Can load directly into structured table columns
- Can use CREATE TABLE AS SELECT to extract columns

### XML (eXtensible Markup Language)

**Characteristics:**
- Markup language with tags and elements
- Elements have start/end tags with content
- Supports attributes within tags
- Each top-level element becomes separate row

**Querying XML:**
- Use `$` operator for element contents
- Use `@` operator for element/attribute names
- Use `@attribute_name` for specific attribute values
- Use XMLGET function for element extraction

**Exam Tip:** JSON, Avro, ORC, and Parquet data is queried similarly using dot notation and bracket notation. XML requires special operators and the XMLGET function.

---

## Section 3: The VARIANT Data Type

### Understanding VARIANT

VARIANT is the primary data type for storing semi-structured data in Snowflake.

**Key Characteristics:**

| Property | Description |
|----------|-------------|
| **Maximum Size** | Up to 128 MB uncompressed (practical limit usually smaller) |
| **Content** | Can hold any data type (string, number, boolean, null, ARRAY, OBJECT) |
| **Storage** | Optimized internal format with automatic subcolumnarization |
| **Querying** | Uses dot notation, bracket notation, or functions |

### VARIANT vs Structured Loading: When to Choose Each

**Load into VARIANT column when:**
- Schema is unknown or evolving
- Data has variable structure
- You need to explore data before defining schema
- Flexibility is more important than type safety

**Load into structured columns when:**
- Schema is well-defined and stable
- Query performance is critical
- Strong typing is required
- Data validation at load time is needed

### Decision Matrix: VARIANT vs Flattening

| Scenario | Recommendation | Reason |
|----------|----------------|--------|
| Mostly regular data with native types | Either approach works | Similar performance |
| Dates/timestamps as strings | Flatten to structured columns | Better performance, less storage |
| Numbers stored as strings | Flatten to structured columns | Better performance |
| Contains many arrays | Flatten to structured columns | Better pruning |
| Schema unknown | VARIANT | Flexibility for exploration |
| Non-ISO 8601 dates | Flatten to structured columns | VARIANT stores as string |

**Exam Tip:** For data that includes dates/timestamps, numbers in strings, or arrays, Snowflake recommends flattening into structured columns for better pruning and reduced storage consumption.

---

## Section 4: Loading Methods for Semi-Structured Data

### Method 1: Load Entire File into VARIANT Column

The simplest approach loads the entire semi-structured file into a single VARIANT column.

**Create Table with VARIANT Column:**
```sql
CREATE TABLE json_raw (
  src VARIANT
);
```

**Load JSON Data:**
```sql
COPY INTO json_raw
FROM @my_stage/data.json
FILE_FORMAT = (TYPE = JSON);
```

**Load Parquet Data:**
```sql
COPY INTO parquet_raw
FROM @my_stage/data.parquet
FILE_FORMAT = (TYPE = PARQUET);
```

### Method 2: Transform During Load (COPY SELECT)

Extract specific elements into structured columns during the load operation.

**JSON Example:**
```sql
COPY INTO home_sales (city, postal_code, sq_ft, price)
FROM (
  SELECT
    $1:location.city::VARCHAR,
    $1:location.zip::VARCHAR,
    $1:dimensions.sq_ft::NUMBER,
    $1:price::NUMBER
  FROM @my_stage/sales.json
)
FILE_FORMAT = (TYPE = JSON);
```

**Parquet Example:**
```sql
COPY INTO orders (custkey, orderdate, status, price)
FROM (
  SELECT
    $1:o_custkey::NUMBER,
    $1:o_orderdate::DATE,
    $1:o_orderstatus::VARCHAR,
    $1:o_totalprice::VARCHAR
  FROM @my_stage/orders.parquet
)
FILE_FORMAT = (TYPE = PARQUET);
```

**Exam Tip:** All semi-structured data from a staged file is accessed through the `$1` column reference in COPY transformations.

### Method 3: Schema Detection with INFER_SCHEMA

Automatically detect and create table structure from staged files.

**Detect Schema:**
```sql
SELECT *
FROM TABLE(
  INFER_SCHEMA(
    LOCATION => '@my_stage/data.parquet',
    FILE_FORMAT => 'my_parquet_format'
  )
);
```

**Create Table from Schema:**
```sql
CREATE TABLE my_table
USING TEMPLATE (
  SELECT ARRAY_AGG(OBJECT_CONSTRUCT(*))
  FROM TABLE(
    INFER_SCHEMA(
      LOCATION => '@my_stage/data.parquet',
      FILE_FORMAT => 'my_parquet_format'
    )
  )
);
```

**Supported Formats for INFER_SCHEMA:**
- Apache Avro
- Apache Parquet
- CSV
- JSON
- ORC

### Method 4: INSERT with PARSE_JSON

Parse JSON strings directly in INSERT statements.

```sql
INSERT INTO json_table (data)
SELECT PARSE_JSON('{"name": "John", "age": 30}');
```

---

## Section 5: Critical File Format Options for Semi-Structured Loading

### JSON File Format Options

| Option | Default | Description | Exam Importance |
|--------|---------|-------------|-----------------|
| **STRIP_OUTER_ARRAY** | FALSE | Remove outer array brackets | Very High |
| **STRIP_NULL_VALUES** | FALSE | Remove null key-value pairs | High |
| **ALLOW_DUPLICATE** | FALSE | Allow duplicate keys | Low |
| **ENABLE_OCTAL** | FALSE | Parse octal numbers | Low |

### STRIP_OUTER_ARRAY Deep Dive

**Without STRIP_OUTER_ARRAY (default):**
```json
[{"id": 1}, {"id": 2}, {"id": 3}]
```
Result: 1 row containing entire array as single VARIANT value

**With STRIP_OUTER_ARRAY = TRUE:**
```json
[{"id": 1}, {"id": 2}, {"id": 3}]
```
Result: 3 separate rows, each containing one object

**Why This Matters:**
- VARIANT has 16 MB compressed row limit
- Large JSON arrays exceed this limit
- STRIP_OUTER_ARRAY bypasses the limit
- Creates one row per array element

```sql
CREATE FILE FORMAT large_json_format
  TYPE = JSON
  STRIP_OUTER_ARRAY = TRUE;
```

**Exam Tip:** When asked about loading large JSON files that exceed size limits, STRIP_OUTER_ARRAY = TRUE is the correct answer.

### STRIP_NULL_VALUES Deep Dive

**Purpose:** Removes object keys with null values from loaded data.

**Impact on Subcolumnarization:**
- Elements with even ONE null value are NOT extracted to columnar format
- Removing nulls enables better subcolumnarization
- Improves query performance through better pruning
- Reduces storage consumption

**Best Practice:**
```sql
CREATE FILE FORMAT optimized_json
  TYPE = JSON
  STRIP_OUTER_ARRAY = TRUE
  STRIP_NULL_VALUES = TRUE;
```

**Exam Tip:** STRIP_NULL_VALUES improves query performance by enabling better subcolumnarization of semi-structured data.

---

## Section 6: Querying Semi-Structured Data

### Traversal Syntax

**Dot Notation (most common):**
```sql
SELECT src:dealership FROM car_sales;
SELECT src:salesperson.name FROM car_sales;
SELECT src:vehicle[0].make FROM car_sales;
```

**Bracket Notation:**
```sql
SELECT src['dealership'] FROM car_sales;
SELECT src['salesperson']['name'] FROM car_sales;
```

**Array Access:**
```sql
SELECT src:vehicle[0] FROM car_sales;       -- First element
SELECT src:vehicle[0].price FROM car_sales;  -- Nested access
```

### Key Rules for Element Access

| Rule | Description |
|------|-------------|
| Column names | Case-insensitive |
| Element names | Case-sensitive |
| Array index | Zero-based (starts at 0) |
| Return type | Always VARIANT |

**Example of Case Sensitivity:**
```sql
-- These are equivalent (column name):
src:salesperson.name
SRC:salesperson.name

-- This is DIFFERENT (element name):
SRC:Salesperson.Name  -- Will not match lowercase element
```

### Casting VARIANT Values

VARIANT values are returned with quotes. Cast to remove quotes:

**Without Cast:**
```sql
SELECT src:dealership FROM car_sales;
-- Returns: "Valley View Auto Sales" (with quotes)
```

**With Cast:**
```sql
SELECT src:dealership::VARCHAR FROM car_sales;
-- Returns: Valley View Auto Sales (without quotes)
```

**Common Casts:**
```sql
SELECT
  src:price::NUMBER as price,
  src:sale_date::DATE as sale_date,
  src:active::BOOLEAN as active,
  src:name::VARCHAR as name
FROM sales_data;
```

### GET and GET_PATH Functions

**GET Function:**
```sql
SELECT GET(src:vehicle, 0) FROM car_sales;
-- Returns first vehicle
```

**GET_PATH Function:**
```sql
SELECT GET_PATH(src, 'vehicle[0]:make') FROM car_sales;
-- Equivalent to: src:vehicle[0].make
```

**Exam Tip:** Dot notation and bracket notation are shorthand for GET and GET_PATH functions. The functions are useful for dynamic or irregular paths.

---

## Section 7: The FLATTEN Function

### Purpose and Syntax

FLATTEN is a table function that explodes nested arrays or objects into separate rows.

**Basic Syntax:**
```sql
SELECT *
FROM table_name,
LATERAL FLATTEN(input => table_name.variant_column);
```

### FLATTEN Output Columns

| Column | Description |
|--------|-------------|
| **SEQ** | Unique sequence number for input row |
| **KEY** | Key for key-value pair (OBJECT) or NULL (ARRAY) |
| **PATH** | Path to the element |
| **INDEX** | Index of element in array (NULL for OBJECT) |
| **VALUE** | The element value (VARIANT) |
| **THIS** | The value being flattened |

### FLATTEN Examples

**Flatten Array:**
```sql
SELECT
  value:name::VARCHAR as customer_name,
  value:address::VARCHAR as address
FROM car_sales,
LATERAL FLATTEN(input => src:customer);
```

**Flatten Nested Arrays:**
```sql
SELECT
  v.value:make::VARCHAR as make,
  v.value:model::VARCHAR as model,
  e.value::VARCHAR as extra
FROM car_sales,
LATERAL FLATTEN(input => src:vehicle) v,
LATERAL FLATTEN(input => v.value:extras) e;
```

**Flatten with RECURSIVE:**
```sql
SELECT
  key,
  path,
  value,
  TYPEOF(value) as type
FROM table_name,
LATERAL FLATTEN(input => variant_col, RECURSIVE => TRUE);
```

### FLATTEN Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| **INPUT** | VARIANT, OBJECT, or ARRAY to flatten | Required |
| **PATH** | Path to element within INPUT | None |
| **OUTER** | Include rows with zero output | FALSE |
| **RECURSIVE** | Recursively flatten nested elements | FALSE |
| **MODE** | OBJECT, ARRAY, or BOTH | BOTH |

**Exam Tip:** FLATTEN is essential for converting nested arrays into relational format. Use LATERAL keyword to join with the source table.

---

## Section 8: NULL Value Handling

### Two Types of NULL

| NULL Type | Description | Example |
|-----------|-------------|---------|
| **SQL NULL** | Value is missing or unknown | `NULL` keyword |
| **JSON null** | Explicit null value in JSON | `"field": null` |

### Distinguishing NULL Types

```sql
SELECT
  PARSE_JSON(NULL) as "SQL NULL",           -- Returns NULL
  PARSE_JSON('null') as "JSON NULL",        -- Returns null (string)
  PARSE_JSON('{"a": null}'):a as "JSON NULL" -- Returns null
;
```

### Converting JSON null to SQL NULL

Cast to VARCHAR to convert JSON null to SQL NULL:

```sql
SELECT
  PARSE_JSON('{"a": null}'):a as json_null,
  TO_CHAR(PARSE_JSON('{"a": null}'):a) as sql_null
;
-- json_null returns: null
-- sql_null returns: NULL
```

### Impact on Subcolumnarization

**Critical Rule:** Elements containing even a SINGLE "null" value are NOT extracted into columnar format.

**Solutions:**
1. Use STRIP_NULL_VALUES = TRUE during load
2. Extract to relational columns before loading
3. Replace null values during transformation

**Exam Tip:** JSON null values prevent subcolumnarization. Use STRIP_NULL_VALUES to improve query performance.

---

## Section 9: Schema Evolution for Semi-Structured Data

### Automatic Schema Evolution

Snowflake can automatically evolve table schemas when loading semi-structured data with new columns.

**Enable Schema Evolution:**
```sql
ALTER TABLE my_table SET ENABLE_SCHEMA_EVOLUTION = TRUE;
```

**Supported Operations:**
- Add new columns from source files
- Drop NOT NULL constraints when source omits field

**Requirements:**
- EVOLVE SCHEMA privilege on table
- MATCH_BY_COLUMN_NAME copy option
- Supported formats: Avro, Parquet, CSV, JSON, ORC

**Limitations:**
- Maximum 100 columns added per COPY (default)
- Maximum 1 schema change per COPY (default)
- Not supported with INSERT statements
- Not supported with tasks

**Example:**
```sql
-- Create table with schema detection
CREATE TABLE t1
USING TEMPLATE (
  SELECT ARRAY_AGG(OBJECT_CONSTRUCT(*))
  FROM TABLE(INFER_SCHEMA(LOCATION => '@stage/file.parquet', FILE_FORMAT => 'parquet_format'))
);

-- Enable schema evolution
ALTER TABLE t1 SET ENABLE_SCHEMA_EVOLUTION = TRUE;

-- Load data with new columns (table evolves automatically)
COPY INTO t1
FROM @stage
FILE_FORMAT = (TYPE = PARQUET)
MATCH_BY_COLUMN_NAME = CASE_INSENSITIVE;
```

---

## Section 10: Subcolumnarization and Performance

### What is Subcolumnarization?

When semi-structured data is loaded into VARIANT columns, Snowflake automatically extracts frequently-accessed elements into internal columnar format for improved query performance.

**Default Behavior:**
- Maximum 200 elements extracted per partition
- Extracted elements enable efficient columnar scanning
- Non-extracted elements require full VARIANT scan

### Elements NOT Extracted

| Condition | Reason |
|-----------|--------|
| Contains any "null" value | Preserves distinction between JSON null and SQL NULL |
| Multiple data types | Element stores different types across rows |
| Exceeds extraction limit | Beyond 200 elements per partition |

**Example of Multiple Types (prevents extraction):**
```json
Row 1: {"foo": 1}        -- Number
Row 2: {"foo": "1"}      -- String
-- "foo" will NOT be subcolumnarized due to inconsistent types
```

### Performance Optimization Strategies

1. **Use STRIP_NULL_VALUES = TRUE** during load
2. **Maintain consistent data types** across all rows
3. **Flatten to structured columns** for critical query paths
4. **Test both approaches** on representative data

**Exam Tip:** For optimal query performance on semi-structured data, ensure consistent data types and remove null values where possible.

---

## Section 11: Supported Functions for COPY Transformations

### Functions Supported in COPY INTO Transformations

Semi-structured data can be transformed during load using these functions:

| Category | Functions |
|----------|-----------|
| **Type Conversion** | CAST, ::, TO_VARIANT, TO_CHAR, TO_VARCHAR, TO_NUMBER, TO_DATE, TO_TIMESTAMP |
| **Semi-structured** | PARSE_JSON, PARSE_XML, GET, GET_PATH, CHECK_JSON, CHECK_XML, XMLGET |
| **Array** | ARRAY_CONSTRUCT, ARRAY_SIZE, SPLIT |
| **String** | CONCAT, SUBSTR, REPLACE, TRIM, UPPER, LOWER, REGEXP_REPLACE |
| **Conditional** | CASE, IFF, COALESCE, NULLIF, NVL, NVL2 |
| **Type Checking** | IS_ARRAY, IS_OBJECT, IS_BOOLEAN, IS_INTEGER, TYPEOF |

### NOT Supported in COPY Transformations

| Not Supported | Alternative |
|---------------|-------------|
| FLATTEN function | Load to VARIANT, then FLATTEN |
| JOIN | Load separately, join after |
| GROUP BY (aggregate) | Load raw, aggregate after |
| WHERE clause filtering | Load all, filter after |
| ORDER BY, LIMIT, TOP | Load all, order/limit after |

**Exam Tip:** COPY transformations do NOT support FLATTEN, JOINs, or aggregations. Load data first, then transform with SQL.

---

## Section 12: Common Loading Patterns

### Pattern 1: Load JSON Array to Separate Rows

```sql
-- Create file format
CREATE FILE FORMAT json_array_format
  TYPE = JSON
  STRIP_OUTER_ARRAY = TRUE;

-- Create target table
CREATE TABLE events (
  event_data VARIANT
);

-- Load data (each array element becomes a row)
COPY INTO events
FROM @stage/events.json
FILE_FORMAT = json_array_format;
```

### Pattern 2: Load Semi-Structured to Relational

```sql
-- Create target table
CREATE TABLE orders (
  order_id NUMBER,
  customer_name VARCHAR,
  order_date DATE,
  total_amount NUMBER(10,2)
);

-- Load with transformation
COPY INTO orders
FROM (
  SELECT
    $1:order_id::NUMBER,
    $1:customer.name::VARCHAR,
    $1:order_date::DATE,
    $1:total::NUMBER(10,2)
  FROM @stage/orders.json
)
FILE_FORMAT = (TYPE = JSON);
```

### Pattern 3: Load Parquet Directly to Table

```sql
-- Create table from Parquet schema
CREATE TABLE sales
USING TEMPLATE (
  SELECT ARRAY_AGG(OBJECT_CONSTRUCT(*))
  FROM TABLE(INFER_SCHEMA(LOCATION => '@stage/sales.parquet', FILE_FORMAT => 'parquet_fmt'))
);

-- Load with column matching
COPY INTO sales
FROM @stage/sales.parquet
FILE_FORMAT = (TYPE = PARQUET)
MATCH_BY_COLUMN_NAME = CASE_INSENSITIVE;
```

### Pattern 4: Split and Load Array Elements

```sql
-- Source JSON: {"ips": {"router1": "192.168.1.1", "router2": "192.168.0.1"}}

CREATE TABLE ip_addresses (
  router1_octets ARRAY,
  router2_octets ARRAY
);

COPY INTO ip_addresses
FROM (
  SELECT
    SPLIT($1:ips.router1, '.'),
    SPLIT($1:ips.router2, '.')
  FROM @stage/ips.json
)
FILE_FORMAT = (TYPE = JSON);
```

---

## Section 13: Exam Tips and Common Question Patterns

### High-Priority Topics

1. **VARIANT Data Type**
   - Maximum 16 MB compressed per row
   - Can hold any data type
   - Use STRIP_OUTER_ARRAY for large JSON arrays

2. **Semi-Structured Format Support**
   - JSON, Avro, ORC, Parquet, XML supported for loading
   - Only JSON and Parquet support unloading
   - Avro, ORC, XML are load-only

3. **Querying Syntax**
   - Dot notation: `column:element.subelement`
   - Bracket notation: `column['element']['subelement']`
   - Array access: `column:array[0]`
   - Case-sensitive for element names

4. **FLATTEN Function**
   - Explodes arrays/objects into rows
   - Use LATERAL keyword
   - RECURSIVE option for nested structures

5. **NULL Handling**
   - SQL NULL vs JSON null
   - JSON null prevents subcolumnarization
   - STRIP_NULL_VALUES improves performance

6. **Subcolumnarization**
   - Automatic optimization for VARIANT data
   - 200 element limit per partition
   - Consistent types required

### Common Exam Questions

**Question Pattern 1:** "How do you load a large JSON file with an outer array?"
- Answer: Use STRIP_OUTER_ARRAY = TRUE

**Question Pattern 2:** "What function explodes arrays into separate rows?"
- Answer: FLATTEN (with LATERAL)

**Question Pattern 3:** "Which formats support unloading?"
- Answer: CSV, JSON, Parquet (not Avro, ORC, XML)

**Question Pattern 4:** "How do you improve query performance on VARIANT data?"
- Answer: Use STRIP_NULL_VALUES, maintain consistent types, consider flattening

**Question Pattern 5:** "What is the difference between SQL NULL and JSON null?"
- Answer: SQL NULL is missing/unknown; JSON null is explicit null value stored as string "null"

**Question Pattern 6:** "How do you extract a nested element from semi-structured data?"
- Answer: Use dot notation (src:level1.level2) or bracket notation (src['level1']['level2'])

### Quick Reference Card

```
SEMI-STRUCTURED DATA TYPES:
--------------------------
VARIANT - Can hold any type
OBJECT  - Key-value pairs
ARRAY   - Ordered list of VARIANTs

SUPPORTED FORMATS:
-----------------
Load & Unload: JSON, Parquet
Load Only:     Avro, ORC, XML

KEY FILE FORMAT OPTIONS:
-----------------------
STRIP_OUTER_ARRAY = TRUE  (large JSON arrays)
STRIP_NULL_VALUES = TRUE  (performance)

QUERYING SYNTAX:
---------------
Dot:     column:element.nested[0]
Bracket: column['element']['nested'][0]
Cast:    column:element::VARCHAR

KEY FUNCTIONS:
-------------
FLATTEN()   - Explode arrays/objects to rows
PARSE_JSON() - Convert string to VARIANT
GET()       - Access element by index/key
GET_PATH()  - Access element by path
TYPEOF()    - Get element data type
```

---

## Practice Questions

### Question 1
A data engineer needs to load a JSON file containing 10 million records into Snowflake. The file structure has all records wrapped in a single outer array. What file format option should be used?

<details>
<summary>Show Answer</summary>

**Answer:** STRIP_OUTER_ARRAY = TRUE

This option removes the outer array brackets and creates a separate row for each array element. Without this option, the entire 10 million records would be loaded as a single VARIANT value, likely exceeding the 16 MB row limit.

```sql
CREATE FILE FORMAT large_json_format
  TYPE = JSON
  STRIP_OUTER_ARRAY = TRUE;
```
</details>

### Question 2
Given the following data in a VARIANT column called `src`:
```json
{"customer": [{"name": "John", "city": "NYC"}, {"name": "Jane", "city": "LA"}]}
```

What query returns each customer as a separate row?

<details>
<summary>Show Answer</summary>

**Answer:** Use FLATTEN to explode the customer array:

```sql
SELECT
  value:name::VARCHAR as customer_name,
  value:city::VARCHAR as city
FROM my_table,
LATERAL FLATTEN(input => src:customer);
```

Result:
| customer_name | city |
|---------------|------|
| John | NYC |
| Jane | LA |
</details>

### Question 3
A data engineer notices that queries on their VARIANT column are slow. Investigation reveals that the column contains many elements with null values. What is the recommended solution?

<details>
<summary>Show Answer</summary>

**Answer:** Use STRIP_NULL_VALUES = TRUE when loading the data.

Elements containing null values are not subcolumnarized by Snowflake. This means the engine must scan the entire VARIANT structure for those elements. By stripping null values during load, more elements can be extracted into columnar format, improving query performance.

```sql
CREATE FILE FORMAT optimized_json
  TYPE = JSON
  STRIP_NULL_VALUES = TRUE;
```
</details>

### Question 4
Which of the following semi-structured data formats can be unloaded from Snowflake? (Select all that apply)

A. JSON
B. Avro
C. ORC
D. Parquet
E. XML

<details>
<summary>Show Answer</summary>

**Answer:** A and D (JSON and Parquet)

Avro, ORC, and XML support loading only. They cannot be used as output formats with COPY INTO <location>.
</details>

### Question 5
A VARIANT column contains the following data:
```json
{"product": {"name": "Widget", "price": 29.99}}
```

Which two queries return the product name correctly? (Select two)

A. `SELECT src:product:name FROM products;`
B. `SELECT src:product.name FROM products;`
C. `SELECT src['product']['name'] FROM products;`
D. `SELECT src.product.name FROM products;`

<details>
<summary>Show Answer</summary>

**Answer:** B and C

- Option B uses correct dot notation: `src:product.name`
- Option C uses correct bracket notation: `src['product']['name']`
- Option A is incorrect (uses colon between product and name)
- Option D is incorrect (starts with dot instead of colon)

The colon is only used between the column name and first element.
</details>

### Question 6
A data engineer wants to automatically create a table structure based on the schema of staged Parquet files. What function should they use?

<details>
<summary>Show Answer</summary>

**Answer:** INFER_SCHEMA

```sql
CREATE TABLE my_table
USING TEMPLATE (
  SELECT ARRAY_AGG(OBJECT_CONSTRUCT(*))
  FROM TABLE(
    INFER_SCHEMA(
      LOCATION => '@my_stage/data.parquet',
      FILE_FORMAT => 'my_parquet_format'
    )
  )
);
```

INFER_SCHEMA detects column names and types from staged semi-structured files, enabling automatic table creation.
</details>

---

## Summary

Loading semi-structured data in Snowflake requires understanding:

1. **VARIANT data type**: The primary container for semi-structured data with 16 MB row limit
2. **Supported formats**: JSON, Avro, ORC, Parquet, XML (only JSON and Parquet support unload)
3. **STRIP_OUTER_ARRAY**: Critical for loading large JSON arrays
4. **STRIP_NULL_VALUES**: Improves query performance through better subcolumnarization
5. **Query syntax**: Dot notation and bracket notation for traversing hierarchies
6. **FLATTEN function**: Essential for converting nested structures to relational format
7. **NULL handling**: Understand SQL NULL vs JSON null and their impact
8. **Schema detection**: INFER_SCHEMA for automatic table creation
9. **Schema evolution**: Automatic column addition for evolving data
10. **Performance**: Consistent types and null handling for optimal subcolumnarization
