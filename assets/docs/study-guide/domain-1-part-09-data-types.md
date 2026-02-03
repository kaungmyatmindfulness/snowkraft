# Domain 1: Snowflake AI Data Cloud Features & Architecture

## Part 9: Data Types

### Overview

Understanding Snowflake's data types is essential for the SnowPro Core exam. This section covers the complete range of data types available in Snowflake, with particular emphasis on semi-structured data handling---a key differentiator for Snowflake's architecture.

---

## 1. Data Type Categories

Snowflake organizes data types into several categories:

| Category | Data Types | Common Use Cases |
|----------|-----------|------------------|
| **Numeric** | NUMBER, INTEGER, FLOAT, DOUBLE | Financial calculations, counts, measurements |
| **String** | VARCHAR, CHAR, STRING, TEXT | Names, descriptions, identifiers |
| **Binary** | BINARY, VARBINARY | Files, encrypted data, images |
| **Logical** | BOOLEAN | Flags, true/false conditions |
| **Date/Time** | DATE, TIME, TIMESTAMP variants | Temporal data, scheduling, auditing |
| **Semi-Structured** | VARIANT, OBJECT, ARRAY | JSON, Parquet, Avro, XML data |
| **Geospatial** | GEOGRAPHY, GEOMETRY | Location data, spatial analysis |
| **Vector** | VECTOR | Machine learning embeddings |

---

## 2. Numeric Data Types

### NUMBER (DECIMAL, NUMERIC)

The primary numeric data type with configurable precision and scale.

```sql
-- Syntax: NUMBER(precision, scale)
-- Precision: Total number of digits (1-38, default 38)
-- Scale: Digits after decimal point (0-precision, default 0)

CREATE TABLE financial_data (
    amount NUMBER(12,2),        -- Up to 10 digits, 2 decimal places
    percentage NUMBER(5,4),     -- Like 0.1234 or 1.2345
    whole_number NUMBER(10,0),  -- Integer values only
    big_number NUMBER           -- Default: 38 digits, no decimals
);
```

**Key Points:**
- Maximum precision is 38 digits
- Scale cannot exceed precision
- Stored as fixed-point, providing exact arithmetic
- Synonyms: DECIMAL, NUMERIC, INT, INTEGER, BIGINT, SMALLINT, TINYINT, BYTEINT

### Integer Type Aliases

| Alias | Equivalent | Range |
|-------|-----------|-------|
| TINYINT | NUMBER(3,0) | -128 to 127 |
| SMALLINT | NUMBER(5,0) | -32,768 to 32,767 |
| INT / INTEGER | NUMBER(38,0) | Full 38-digit range |
| BIGINT | NUMBER(38,0) | Full 38-digit range |

> **Exam Tip:** In Snowflake, INT, INTEGER, and BIGINT are all aliases for NUMBER(38,0)---they do NOT have the typical size restrictions found in other databases.

### FLOAT (DOUBLE, DOUBLE PRECISION, REAL)

Approximate numeric data type for scientific calculations.

```sql
CREATE TABLE measurements (
    temperature FLOAT,
    velocity DOUBLE,
    coefficient DOUBLE PRECISION
);
```

**Key Points:**
- Double-precision 64-bit IEEE 754 floating-point
- FLOAT, DOUBLE, DOUBLE PRECISION, and REAL are synonymous in Snowflake
- Range: approximately +/- 1.7976931348623157E+308
- Subject to floating-point rounding errors
- NOT suitable for financial calculations requiring exact precision

**When to Use Each:**

| Use Case | Recommended Type |
|----------|-----------------|
| Currency/financial | NUMBER with appropriate scale |
| Scientific measurements | FLOAT |
| Exact counts | NUMBER(38,0) or INTEGER |
| Percentages | NUMBER(5,4) or similar |
| Machine learning features | FLOAT |

---

## 3. String Data Types

### VARCHAR (STRING, TEXT)

Variable-length character data.

```sql
CREATE TABLE customers (
    customer_id VARCHAR(20),     -- Up to 20 characters
    name VARCHAR,                -- Default: 16,777,216 characters (16 MB)
    email STRING,                -- Synonym for VARCHAR
    description TEXT             -- Synonym for VARCHAR
);
```

**Key Points:**
- Maximum length: 16,777,216 characters (16 MB)
- VARCHAR, STRING, and TEXT are functionally identical
- Storage is based on actual string length, not declared length
- UTF-8 encoded
- Specifying length is optional and primarily for documentation

### CHAR (CHARACTER, NCHAR)

Fixed-length character data.

```sql
CREATE TABLE codes (
    country_code CHAR(2),        -- Always 2 characters, padded if shorter
    state_code CHAR(3)
);
```

**Key Points:**
- Right-padded with spaces to declared length
- Maximum length: 16,777,216 characters
- Trailing spaces are significant in CHAR columns
- Use VARCHAR unless you specifically need fixed-length padding

> **Exam Tip:** When comparing CHAR values, be aware that trailing spaces are preserved and can affect equality comparisons.

---

## 4. Binary Data Types

### BINARY (VARBINARY)

For storing binary data.

```sql
CREATE TABLE documents (
    file_content BINARY,
    hash_value BINARY(32),       -- Fixed 32 bytes for SHA-256
    encrypted_data VARBINARY
);
```

**Key Points:**
- Maximum size: 8,388,608 bytes (8 MB)
- BINARY and VARBINARY are synonymous
- Common uses: file content, encryption keys, hashes
- Displayed as hexadecimal strings

---

## 5. Logical Data Type

### BOOLEAN

True/false values.

```sql
CREATE TABLE settings (
    is_active BOOLEAN,
    has_premium BOOLEAN DEFAULT FALSE
);

-- Valid BOOLEAN literals
INSERT INTO settings VALUES (TRUE, FALSE);
INSERT INTO settings VALUES ('yes', 'no');     -- Converted to TRUE/FALSE
INSERT INTO settings VALUES (1, 0);            -- Converted to TRUE/FALSE
```

**Key Points:**
- Three possible values: TRUE, FALSE, NULL
- String values 'true', 'yes', 'on', '1' convert to TRUE
- String values 'false', 'no', 'off', '0' convert to FALSE
- Cannot be used as primary key
- Takes 1 byte of storage

---

## 6. Date and Time Data Types

### DATE

Calendar date without time component.

```sql
CREATE TABLE events (
    event_date DATE
);

INSERT INTO events VALUES
    ('2024-01-15'),
    (CURRENT_DATE),
    (DATE '2024-12-31');

-- Date arithmetic
SELECT event_date + 30 AS thirty_days_later FROM events;
```

**Key Points:**
- Range: 0001-01-01 to 9999-12-31
- No time zone component
- Takes 4 bytes of storage
- Default display format: YYYY-MM-DD

### TIME

Time of day without date component.

```sql
CREATE TABLE schedules (
    start_time TIME,
    end_time TIME(3)             -- 3 fractional seconds precision
);

INSERT INTO schedules VALUES
    ('09:30:00', '17:30:00.500');
```

**Key Points:**
- Precision: 0 to 9 fractional seconds (default 9)
- Range: 00:00:00 to 23:59:59.999999999
- No date or time zone component
- Takes 8 bytes of storage

### TIMESTAMP Variants

Snowflake provides three TIMESTAMP types to handle different time zone scenarios:

| Type | Full Name | Time Zone Behavior |
|------|-----------|-------------------|
| TIMESTAMP_NTZ | Timestamp without Time Zone | Stores local time, no time zone |
| TIMESTAMP_LTZ | Timestamp with Local Time Zone | Stores UTC, displays in session time zone |
| TIMESTAMP_TZ | Timestamp with Time Zone | Stores UTC + time zone offset |

```sql
-- Setting session time zone affects TIMESTAMP_LTZ display
ALTER SESSION SET TIMEZONE = 'America/New_York';

CREATE TABLE audit_log (
    local_time TIMESTAMP_NTZ,    -- Wall clock time, no conversion
    utc_time TIMESTAMP_LTZ,      -- Stored as UTC, displayed in session TZ
    exact_time TIMESTAMP_TZ      -- Stored with explicit time zone
);

INSERT INTO audit_log VALUES (
    '2024-01-15 10:30:00',
    '2024-01-15 10:30:00',
    '2024-01-15 10:30:00 -05:00'
);
```

**Choosing the Right TIMESTAMP:**

| Scenario | Recommended Type |
|----------|-----------------|
| Event scheduling, appointments | TIMESTAMP_NTZ |
| Audit trails, log timestamps | TIMESTAMP_LTZ |
| Cross-timezone coordination | TIMESTAMP_TZ |
| Data warehouse ETL timestamps | TIMESTAMP_LTZ |

> **Exam Tip:** The default TIMESTAMP type is controlled by the TIMESTAMP_TYPE_MAPPING session parameter. Default is TIMESTAMP_NTZ.

**TIMESTAMP Precision:**
- All TIMESTAMP types support 0-9 fractional seconds precision
- Default precision is 9 (nanoseconds)
- Example: TIMESTAMP_NTZ(3) stores milliseconds

---

## 7. Semi-Structured Data Types

This is one of the most important topics for the SnowPro Core exam. Snowflake's native support for semi-structured data is a key platform differentiator.

### VARIANT

The universal container type that can hold any data type.

```sql
CREATE TABLE events (
    event_data VARIANT
);

-- VARIANT can hold different types
INSERT INTO events (event_data) SELECT PARSE_JSON('{"name": "Alice", "age": 30}');
INSERT INTO events (event_data) SELECT PARSE_JSON('[1, 2, 3, 4, 5]');
INSERT INTO events (event_data) SELECT TO_VARIANT(123.45);
INSERT INTO events (event_data) SELECT TO_VARIANT(CURRENT_TIMESTAMP());
```

**Key Characteristics:**
- Maximum size: 128 MB (uncompressed data). In practice, usually smaller due to internal overhead.
- Can hold any scalar value, ARRAY, or OBJECT
- Used to store JSON, Avro, Parquet, ORC, XML data
- Internally stored in optimized columnar format
- Values preserve their original type information

### OBJECT

A collection of key-value pairs (like a JSON object or dictionary).

```sql
-- Creating OBJECT values
SELECT OBJECT_CONSTRUCT(
    'name', 'Alice',
    'city', 'Seattle',
    'active', TRUE
) AS user_info;

-- Result: {"active": true, "city": "Seattle", "name": "Alice"}
```

**Key Characteristics:**
- Keys must be strings (VARCHAR)
- Values are VARIANT type
- Keys are case-sensitive
- No duplicate keys allowed
- Unordered (order not guaranteed)

### ARRAY

An ordered list of values.

```sql
-- Creating ARRAY values
SELECT ARRAY_CONSTRUCT(1, 2, 3, 4, 5) AS numbers;
SELECT ARRAY_CONSTRUCT('a', 'b', 'c') AS letters;
SELECT ARRAY_CONSTRUCT(
    OBJECT_CONSTRUCT('id', 1),
    OBJECT_CONSTRUCT('id', 2)
) AS objects_array;
```

**Key Characteristics:**
- Zero-indexed (first element is [0])
- Elements are VARIANT type
- Can contain mixed types
- Maximum 128 MB uncompressed total size
- Maintains insertion order

### Data Type Hierarchy

```
VARIANT (universal container)
    |
    +-- OBJECT (key-value pairs)
    |       |
    |       +-- Values are VARIANT
    |
    +-- ARRAY (ordered list)
    |       |
    |       +-- Elements are VARIANT
    |
    +-- Scalar Values
            +-- String
            +-- Number
            +-- Boolean
            +-- Date/Timestamp
            +-- NULL
```

### Supported Semi-Structured Formats

| Format | Description | How Snowflake Stores It |
|--------|-------------|------------------------|
| JSON | JavaScript Object Notation | Native VARIANT |
| Avro | Apache binary format with schema | Single VARIANT column |
| ORC | Optimized Row Columnar (Hive) | Single VARIANT column |
| Parquet | Columnar storage format | VARIANT or native columns |
| XML | Extensible Markup Language | Single VARIANT column |

---

## 8. Querying Semi-Structured Data

### Traversal Notation

Snowflake provides two syntaxes for accessing nested elements:

#### Colon (Dot) Notation

```sql
SELECT
    src:customer_id,              -- First level
    src:address.city,             -- Nested object
    src:address.state,            -- Nested object
    src:orders[0],                -- First array element
    src:orders[0].amount          -- Nested in array
FROM json_table;
```

**Syntax Rules:**
- Colon (`:`) after column name for first-level access
- Dot (`.`) for subsequent nested levels
- Square brackets (`[]`) with index for arrays (zero-based)

#### Bracket Notation

Alternative syntax, especially useful for keys with special characters:

```sql
SELECT
    src['customer_id'],
    src['address']['city'],
    src['street-address'],        -- Hyphen in key name
    src['orders'][0]['amount']
FROM json_table;
```

### Case Sensitivity

This is a critical concept for the exam:

| Component | Case Sensitivity |
|-----------|-----------------|
| Column names | Case INSENSITIVE |
| Element names (JSON keys) | Case SENSITIVE |

```sql
-- These are equivalent (column name)
SELECT payload:customer_id FROM t;
SELECT PAYLOAD:customer_id FROM t;

-- These are NOT equivalent (element name)
SELECT payload:customer_id FROM t;   -- Works if JSON has "customer_id"
SELECT payload:Customer_Id FROM t;   -- Returns NULL if key doesn't match exactly
```

> **Exam Tip:** NULL values when querying semi-structured data are often caused by case mismatch in element names.

### Casting VARIANT Values

Values extracted from VARIANT retain their JSON representation (strings have quotes). Cast to native types:

```sql
-- Without casting - strings have quotes
SELECT payload:name FROM json_table;
-- Returns: "Alice" (with quotes)

-- With casting - proper string value
SELECT payload:name::VARCHAR FROM json_table;
-- Returns: Alice (without quotes)
```

**Casting Methods:**

```sql
-- Double-colon notation (most common)
payload:amount::DECIMAL(10,2)
payload:created_date::DATE
payload:is_active::BOOLEAN
payload:count::INTEGER

-- TO_ functions
TO_VARCHAR(payload:name)
TO_DATE(payload:created_date)
TO_NUMBER(payload:amount)

-- AS_ functions (VARIANT-specific, preserves NULL)
AS_VARCHAR(payload:name)
AS_INTEGER(payload:count)
AS_DATE(payload:created_date)
```

**When to Cast:**
- Removing quotes from strings
- Enabling proper comparisons and JOINs
- Improving query performance (subcolumnarization)
- Proper date/number arithmetic

---

## 9. The FLATTEN Function

FLATTEN is essential for working with nested structures. It converts arrays and objects into rows.

### Basic FLATTEN

```sql
-- Flatten a simple array
SELECT value
FROM TABLE(FLATTEN(input => ARRAY_CONSTRUCT(1, 2, 3)));
-- Returns 3 rows: 1, 2, 3

-- Flatten with path
SELECT value
FROM TABLE(FLATTEN(input => payload, path => 'orders'));
```

### FLATTEN Output Columns

| Column | Description |
|--------|-------------|
| SEQ | Unique sequence number for the source record |
| KEY | Key name (for objects, NULL for arrays) |
| PATH | Path to the element |
| INDEX | Array index (NULL for objects) |
| VALUE | The actual element value (most commonly used) |
| THIS | Parent element being flattened |

### LATERAL FLATTEN Pattern

The most common pattern combines table data with flattened arrays:

```sql
-- Table with nested array
SELECT
    c.customer_id,
    c.customer_name,
    f.value:product_id::INTEGER AS product_id,
    f.value:quantity::INTEGER AS quantity,
    f.value:price::DECIMAL(10,2) AS price
FROM customers c,
LATERAL FLATTEN(input => c.orders_array) f;
```

**Before LATERAL FLATTEN (one row per customer):**
```
customer_id | orders_array
1           | [{"product": "A", "qty": 2}, {"product": "B", "qty": 1}]
```

**After LATERAL FLATTEN (one row per order):**
```
customer_id | product | qty
1           | A       | 2
1           | B       | 1
```

### Recursive Flattening

For deeply nested structures:

```sql
SELECT key, path, value
FROM TABLE(FLATTEN(input => payload, recursive => TRUE));
```

### FLATTEN Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| INPUT | The VARIANT, OBJECT, or ARRAY to flatten | Required |
| PATH | Path to element to flatten | Root |
| OUTER | If TRUE, include rows with empty results | FALSE |
| RECURSIVE | Flatten all nested levels | FALSE |
| MODE | 'OBJECT', 'ARRAY', or 'BOTH' | 'BOTH' |

---

## 10. Semi-Structured Functions

### Construction Functions

```sql
-- PARSE_JSON: Convert string to VARIANT
SELECT PARSE_JSON('{"name": "Alice", "age": 30}');

-- TRY_PARSE_JSON: Returns NULL on invalid JSON (no error)
SELECT TRY_PARSE_JSON('invalid json');  -- Returns NULL

-- OBJECT_CONSTRUCT: Build an object
SELECT OBJECT_CONSTRUCT('key1', 'value1', 'key2', 'value2');

-- OBJECT_CONSTRUCT_KEEP_NULL: Include NULL values
SELECT OBJECT_CONSTRUCT_KEEP_NULL('a', 1, 'b', NULL);

-- ARRAY_CONSTRUCT: Build an array
SELECT ARRAY_CONSTRUCT(1, 2, 3);
```

### Conversion Functions

```sql
-- TO_JSON: Convert VARIANT to JSON string
SELECT TO_JSON(variant_column);

-- TO_VARIANT: Convert value to VARIANT
SELECT TO_VARIANT(123.45);
SELECT TO_VARIANT(CURRENT_DATE);
```

### ARRAY Functions

```sql
-- Array size
ARRAY_SIZE(my_array)

-- Array contains
ARRAY_CONTAINS('value'::VARIANT, my_array)

-- Array element access
my_array[0]
GET(my_array, 0)

-- Aggregate into array
SELECT ARRAY_AGG(column_name) FROM table;

-- Append to array
ARRAY_APPEND(my_array, new_value)

-- Array concatenation
ARRAY_CAT(array1, array2)

-- Array distinct
ARRAY_DISTINCT(my_array)

-- Array slice
ARRAY_SLICE(my_array, start_index, end_index)
```

### OBJECT Functions

```sql
-- Get all keys
OBJECT_KEYS(my_object)

-- Insert key-value
OBJECT_INSERT(my_object, 'new_key', 'new_value')

-- Delete key
OBJECT_DELETE(my_object, 'key_to_remove')

-- Pick specific keys
OBJECT_PICK(my_object, 'key1', 'key2')
```

### Type Checking Functions

```sql
-- Check if VARIANT is specific type
IS_ARRAY(variant_value)
IS_OBJECT(variant_value)
IS_NULL_VALUE(variant_value)    -- Checks for JSON null
IS_INTEGER(variant_value)
IS_DECIMAL(variant_value)
IS_BOOLEAN(variant_value)

-- Get type name
TYPEOF(variant_value)
-- Returns: 'ARRAY', 'BOOLEAN', 'DATE', 'DOUBLE', 'INTEGER',
--          'NULL_VALUE', 'OBJECT', 'TIME', 'TIMESTAMP_LTZ',
--          'TIMESTAMP_NTZ', 'TIMESTAMP_TZ', 'VARCHAR'
```

---

## 11. NULL Handling in Semi-Structured Data

Snowflake distinguishes between two types of NULL in semi-structured data:

| Type | Description | Representation |
|------|-------------|----------------|
| SQL NULL | Missing or unknown value | NULL |
| JSON null | Explicit null in JSON | VARIANT containing 'null' string |

```sql
-- JSON null is stored as VARIANT 'null'
SELECT PARSE_JSON('{"a": null}'):a;
-- Returns: null (VARIANT null, not SQL NULL)

-- Check for JSON null
SELECT IS_NULL_VALUE(PARSE_JSON('{"a": null}'):a);
-- Returns: TRUE

-- Convert JSON null to SQL NULL
SELECT NULLIF(PARSE_JSON('{"a": null}'):a, 'null'::VARIANT);
-- OR
SELECT payload:field::VARCHAR;  -- Casting to VARCHAR converts to SQL NULL
```

> **Exam Tip:** JSON null values and SQL NULL values are different. Use IS_NULL_VALUE() to check for JSON nulls.

---

## 12. Geospatial Data Types

### GEOGRAPHY

For data representing features on Earth's surface (spherical).

```sql
CREATE TABLE locations (
    location_name VARCHAR,
    coordinates GEOGRAPHY
);

-- Insert GeoJSON point
INSERT INTO locations VALUES
    ('Seattle', ST_GEOGRAPHYFROMWKB(ST_ASWKB(TO_GEOGRAPHY(
        '{"type": "Point", "coordinates": [-122.3321, 47.6062]}'
    ))));

-- Using WKT (Well-Known Text)
INSERT INTO locations VALUES
    ('Portland', TO_GEOGRAPHY('POINT(-122.6784 45.5152)'));
```

**Key Points:**
- Uses spherical Earth model
- Coordinates are longitude, latitude (in that order)
- Supports GeoJSON, WKT, WKB formats
- Suitable for GPS coordinates and geographic analysis
- Functions prefixed with ST_

### GEOMETRY

For data in a Cartesian (flat) coordinate system.

```sql
CREATE TABLE floor_plan (
    room_name VARCHAR,
    shape GEOMETRY
);

-- Insert polygon
INSERT INTO floor_plan VALUES
    ('Conference Room', TO_GEOMETRY('POLYGON((0 0, 10 0, 10 20, 0 20, 0 0))'));
```

**Key Points:**
- Uses flat, Euclidean plane
- Suitable for architectural plans, CAD, gaming
- No Earth curvature considerations
- Functions prefixed with ST_

**Choosing Between GEOGRAPHY and GEOMETRY:**

| Use Case | Recommended Type |
|----------|-----------------|
| GPS coordinates | GEOGRAPHY |
| Global mapping | GEOGRAPHY |
| Building floor plans | GEOMETRY |
| Game worlds | GEOMETRY |
| Engineering drawings | GEOMETRY |

---

## 13. VECTOR Data Type

For storing machine learning embeddings and vector data.

```sql
CREATE TABLE embeddings (
    document_id INTEGER,
    text_embedding VECTOR(FLOAT, 1536),  -- OpenAI embedding dimension
    image_embedding VECTOR(FLOAT, 512)
);

-- Insert vector
INSERT INTO embeddings VALUES (
    1,
    [0.1, 0.2, 0.3, ...]::VECTOR(FLOAT, 1536),
    [0.5, 0.6, 0.7, ...]::VECTOR(FLOAT, 512)
);
```

**Key Points:**
- Used for ML embeddings (text, image, audio)
- Fixed dimension specified at column creation
- Supports similarity functions (cosine, dot product, Euclidean)
- Essential for semantic search and RAG applications

---

## 14. Subcolumnarization

When loading semi-structured data into VARIANT columns, Snowflake automatically extracts frequently accessed elements into optimized columnar storage.

**How It Works:**
1. Snowflake analyzes the structure of loaded data
2. Consistent elements are extracted to separate internal columns
3. Queries on extracted elements perform like native columns
4. Remaining nested data stays in parsed VARIANT form

**Best Practices:**
- Keep element data types consistent
- Avoid JSON nulls where possible (prevents extraction)
- Remove null values during load with STRIP_NULL_VALUES option
- Consider flattening to separate columns for frequently queried data

---

## 15. Data Type Conversion

### Explicit Casting

```sql
-- Using :: operator
SELECT '123'::INTEGER;
SELECT amount::DECIMAL(10,2);
SELECT event_date::VARCHAR;

-- Using CAST function
SELECT CAST('123' AS INTEGER);
SELECT CAST(amount AS DECIMAL(10,2));

-- Using TRY_ functions (returns NULL on failure)
SELECT TRY_CAST('abc' AS INTEGER);  -- Returns NULL, not error
SELECT TRY_TO_NUMBER('12.34');
SELECT TRY_TO_DATE('invalid');
```

### Implicit Conversion Rules

Snowflake performs automatic type conversion in some cases:

| From | To | Conversion |
|------|----|----|
| VARCHAR | NUMBER | When string contains valid number |
| NUMBER | VARCHAR | Automatic |
| DATE | TIMESTAMP | Adds midnight time |
| BOOLEAN | VARCHAR | 'true' or 'false' |
| VARCHAR | BOOLEAN | 'true'/'yes'/'1' to TRUE |

> **Exam Tip:** Use TRY_ variants of conversion functions when data quality is uncertain to avoid query failures.

---

## 16. Exam Tips and Common Question Patterns

### Key Concepts to Remember

1. **VARIANT Size Limit:** 128 MB uncompressed per value (internal overhead may reduce practical maximum)

2. **Timestamp Default:** TIMESTAMP_NTZ is the default unless TIMESTAMP_TYPE_MAPPING is changed

3. **Integer Aliases:** INT, INTEGER, BIGINT are all NUMBER(38,0) in Snowflake

4. **Case Sensitivity:** Column names are case-insensitive; JSON keys are case-sensitive

5. **FLATTEN Returns:** The VALUE column contains the actual element; INDEX for arrays, KEY for objects

6. **Two Types of NULL:** SQL NULL (missing) vs JSON null (explicit 'null' value)

7. **Colon vs Bracket:** Both work for traversal; brackets needed for special characters in keys

### Common Exam Question Types

**Data Type Selection:**
- "Which data type is appropriate for storing currency values?" (NUMBER with appropriate precision/scale)
- "What type should store GPS coordinates?" (GEOGRAPHY)

**Semi-Structured Queries:**
- "Which query correctly extracts a nested value?" (Colon notation with proper path)
- "Why does this query return NULL?" (Case mismatch in JSON key)

**FLATTEN Usage:**
- "How do you convert an array to multiple rows?" (LATERAL FLATTEN)
- "What does the VALUE column in FLATTEN output contain?" (The actual element)

**Type Casting:**
- "How do you safely convert a string to a number?" (TRY_TO_NUMBER or TRY_CAST)
- "Why do extracted strings have quotes?" (Need to cast to VARCHAR)

### Practice Questions

1. What is the maximum size of a VARCHAR column in Snowflake?

<details>
<summary>Show Answer</summary>

Answer: 16,777,216 characters (16 MB)
</details>

2. Which TIMESTAMP type stores the time zone offset with the value?

<details>
<summary>Show Answer</summary>

Answer: TIMESTAMP_TZ
</details>

3. What function converts JSON text into a VARIANT value?

<details>
<summary>Show Answer</summary>

Answer: PARSE_JSON
</details>

4. How do you access the third element of an array in a VARIANT column named 'data'?

<details>
<summary>Show Answer</summary>

Answer: data[2] (zero-indexed)
</details>

5. What is the difference between GEOGRAPHY and GEOMETRY types?

<details>
<summary>Show Answer</summary>

Answer: GEOGRAPHY uses spherical Earth model; GEOMETRY uses flat Cartesian plane
</details>

---

## Summary

Snowflake's data type system provides:

- **Precision numeric types** for exact financial calculations
- **Flexible string types** with massive capacity
- **Three timestamp variants** for any time zone scenario
- **Native semi-structured support** with VARIANT, OBJECT, and ARRAY
- **Powerful traversal and flattening** for nested data
- **Specialized types** for geospatial and vector data

Understanding when to use each type and how to query semi-structured data effectively is essential for both the exam and real-world Snowflake development.
