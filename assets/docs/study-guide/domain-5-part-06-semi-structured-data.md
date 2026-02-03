# Domain 5: Data Transformations

## Part 6: Querying Semi-Structured Data

This section covers how to query and manipulate semi-structured data in Snowflake. Understanding VARIANT, OBJECT, and ARRAY data types, along with functions like FLATTEN, PARSE_JSON, and various access patterns, is essential for the SnowPro Core exam. Domain 5 (Data Transformations) accounts for 20-25% of the exam.

---

## 1. Semi-Structured Data Types

### 1.1 Overview of Semi-Structured Data

Semi-structured data differs from traditional structured data by not conforming to fixed schemas. It contains tags or markup that identify individual entities within the data, allowing for flexible and evolving schemas with nested hierarchical structures.

**Supported Semi-Structured Formats:**
- JSON (JavaScript Object Notation)
- Avro
- ORC (Optimized Row Columnar)
- Parquet
- XML

### 1.2 Core Data Types

Snowflake provides three primary data types for semi-structured data:

| Data Type | Description | Analogous To |
|-----------|-------------|--------------|
| **VARIANT** | Universal container that can hold any data type including ARRAY and OBJECT | Any value |
| **OBJECT** | Collection of key-value pairs | JSON object, dictionary, map |
| **ARRAY** | Ordered collection of elements | List, array |

**VARIANT Characteristics:**
- Foundation for building hierarchical data structures
- Can hold scalar values, arrays, or objects
- Maximum size: 16 MB compressed (approximately 128 MB uncompressed)
- Returns values with type information preserved

**OBJECT Characteristics:**
- Corresponds to a "dictionary" or "map" (NOT object-oriented programming objects)
- Keys are strings; values can be any VARIANT type
- Unordered collection of key-value pairs

**ARRAY Characteristics:**
- Zero-indexed ordered collection
- Elements can be any VARIANT type
- Can contain mixed data types

### 1.3 Creating Semi-Structured Data

```sql
-- Create a table with a VARIANT column
CREATE TABLE events (
  event_id INT,
  event_data VARIANT
);

-- Insert using PARSE_JSON
INSERT INTO events (event_id, event_data)
SELECT 1, PARSE_JSON('{
  "event_type": "click",
  "timestamp": "2024-01-15T10:30:00Z",
  "user": {"id": 123, "name": "John"},
  "tags": ["web", "mobile", "conversion"]
}');

-- Create using OBJECT_CONSTRUCT
INSERT INTO events (event_id, event_data)
SELECT 2, OBJECT_CONSTRUCT(
  'event_type', 'purchase',
  'amount', 99.99,
  'items', ARRAY_CONSTRUCT('item1', 'item2')
);
```

---

## 2. Accessing VARIANT Data

### 2.1 Colon Notation (First-Level Access)

Use a colon `:` between the VARIANT column name and any first-level element:

```sql
-- Basic syntax: <column>:<level1_element>
SELECT src:dealership FROM car_sales;

-- Result: "Valley View Auto Sales" (as VARIANT, with quotes)
```

**Important:** The colon operator returns VARIANT values, not strings. VARIANT values containing strings appear with double quotes in output.

### 2.2 Dot Notation (Nested Access)

Use dot notation to traverse paths in JSON objects:

```sql
-- Syntax: <column>:<level1>.<level2>.<level3>
SELECT src:salesperson.name FROM car_sales;

-- With quoted element names (required for special characters or case-sensitivity)
SELECT src:"salesperson"."name" FROM car_sales;
```

**When to Use Quotes in Dot Notation:**
- Element names with special characters (spaces, hyphens)
- Case-sensitive element names
- Element names that are SQL reserved words

```sql
-- Element with hyphen requires quotes
SELECT data:"user-id" FROM events;

-- Case-sensitive access
SELECT data:"UserName" FROM events;  -- Different from data:username
```

### 2.3 Bracket Notation

Use bracket notation as an alternative to dot notation:

```sql
-- Syntax: <column>['<level1>']['<level2>']
SELECT src['salesperson']['name'] FROM car_sales;

-- Equivalent to dot notation
SELECT src:salesperson.name FROM car_sales;
```

**Bracket Notation Characteristics:**
- Enclose element names in single quotes
- Useful for dynamic key access
- Works with variables for key names

### 2.4 Array Index Access

Access specific array elements using zero-based indexing:

```sql
-- Access first element (index 0)
SELECT src:customer[0] FROM car_sales;

-- Access nested element within array
SELECT src:customer[0].name FROM car_sales;

-- Access second vehicle's make
SELECT src:vehicle[1].make FROM car_sales;
```

**Key Point:** Array indices start at 0, not 1.

### 2.5 Comparison of Access Methods

| Method | Syntax | Use Case |
|--------|--------|----------|
| Colon | `col:key` | First-level element access |
| Dot | `col:key1.key2` | Nested object traversal |
| Bracket | `col['key']` | Dynamic keys, special characters |
| Index | `col:array[0]` | Array element access |
| Combined | `col:array[0].key` | Complex nested structures |

```sql
-- All equivalent ways to access nested data
SELECT src:vehicle[0].make FROM car_sales;
SELECT src:vehicle[0]:make FROM car_sales;
SELECT src['vehicle'][0]['make'] FROM car_sales;
SELECT GET_PATH(src, 'vehicle[0].make') FROM car_sales;
```

---

## 3. Type Casting VARIANT Values

### 3.1 Why Casting Matters

VARIANT values preserve their original type but often need casting for:
- Removing surrounding double quotes from string output
- Performing arithmetic operations
- Date/time comparisons and calculations
- Joining with relational columns

### 3.2 Casting Syntax

```sql
-- Using :: operator (recommended)
SELECT src:price::NUMBER AS price FROM sales;
SELECT src:customer[0].name::VARCHAR AS customer_name FROM car_sales;
SELECT src:order_date::DATE AS order_date FROM orders;

-- Using CAST function
SELECT CAST(src:price AS NUMBER) AS price FROM sales;

-- Using conversion functions
SELECT TO_NUMBER(src:price) AS price FROM sales;
SELECT TO_VARCHAR(src:customer[0].name) AS customer_name FROM car_sales;
SELECT TO_DATE(src:order_date) AS order_date FROM orders;
```

### 3.3 Common Casting Patterns

| Source Type | Target Type | Example |
|-------------|-------------|---------|
| VARIANT string | VARCHAR | `data:name::VARCHAR` |
| VARIANT number | NUMBER/FLOAT | `data:price::NUMBER(10,2)` |
| VARIANT string | DATE | `data:date::DATE` |
| VARIANT string | TIMESTAMP | `data:ts::TIMESTAMP_NTZ` |
| VARIANT boolean | BOOLEAN | `data:is_active::BOOLEAN` |

```sql
-- Practical example: Calculations require casting
SELECT
  src:vehicle[0].price::NUMBER * 1.08 AS price_with_tax,
  src:dealership::VARCHAR AS dealership,
  src:sale_date::DATE AS sale_date
FROM car_sales;
```

---

## 4. The FLATTEN Function

### 4.1 What FLATTEN Does

FLATTEN is a table function that "explodes" nested values into separate rows. It produces a lateral view of VARIANT, OBJECT, or ARRAY data, returning one row for each element.

**Core Use Cases:**
- Converting arrays into rows
- Expanding nested objects
- Joining semi-structured data with relational data

### 4.2 FLATTEN Syntax

```sql
FLATTEN( INPUT => <expr>
        [, PATH => '<path>']
        [, OUTER => TRUE | FALSE]
        [, RECURSIVE => TRUE | FALSE]
        [, MODE => 'OBJECT' | 'ARRAY' | 'BOTH'] )
```

**Parameters:**

| Parameter | Description | Default |
|-----------|-------------|---------|
| INPUT | The VARIANT, OBJECT, or ARRAY to flatten | Required |
| PATH | Path to element within INPUT to flatten | Root element |
| OUTER | If TRUE, include rows with zero results (like LEFT OUTER JOIN) | FALSE |
| RECURSIVE | If TRUE, flatten nested sub-elements | FALSE |
| MODE | What to flatten: 'OBJECT', 'ARRAY', or 'BOTH' | 'BOTH' |

### 4.3 FLATTEN Output Columns

FLATTEN returns multiple columns describing each element:

| Column | Description |
|--------|-------------|
| SEQ | Unique sequence number for the input record |
| KEY | Key for key-value pairs (NULL for array elements) |
| PATH | Path to the element within the original structure |
| INDEX | Index of element if from an array (NULL otherwise) |
| VALUE | The value of the element (VARIANT) |
| THIS | The element that contains the flattened value |

```sql
-- View all FLATTEN output columns
SELECT
  f.seq,
  f.key,
  f.path,
  f.index,
  f.value,
  f.this
FROM events,
LATERAL FLATTEN(INPUT => event_data:tags) f;
```

### 4.4 Basic FLATTEN Examples

**Flattening an Array:**

```sql
-- Sample data
CREATE TABLE car_sales (src VARIANT);
INSERT INTO car_sales SELECT PARSE_JSON('{
  "customer": [
    {"name": "John", "address": "123 Main St"},
    {"name": "Jane", "address": "456 Oak Ave"}
  ]
}');

-- Flatten the customer array
SELECT
  f.value:name::VARCHAR AS customer_name,
  f.value:address::VARCHAR AS customer_address
FROM car_sales,
LATERAL FLATTEN(INPUT => src:customer) f;

-- Result:
-- customer_name | customer_address
-- John          | 123 Main St
-- Jane          | 456 Oak Ave
```

**Flattening an Object:**

```sql
-- Flatten object to get key-value pairs
SELECT
  f.key AS attribute_name,
  f.value::VARCHAR AS attribute_value
FROM events,
LATERAL FLATTEN(INPUT => event_data:user) f;
```

### 4.5 LATERAL FLATTEN

The LATERAL keyword allows the FLATTEN function to reference columns from preceding tables in the FROM clause:

```sql
-- LATERAL is typically used (often implicit)
SELECT
  c.src:dealership::VARCHAR AS dealership,
  f.value:name::VARCHAR AS customer_name
FROM car_sales c,
LATERAL FLATTEN(INPUT => c.src:customer) f;

-- LATERAL is implied when FLATTEN follows a comma
SELECT
  src:dealership::VARCHAR AS dealership,
  f.value:name::VARCHAR AS customer_name
FROM car_sales,
FLATTEN(INPUT => src:customer) f;
```

### 4.6 Nested FLATTEN (Multiple Levels)

For deeply nested structures, chain multiple FLATTEN calls:

```sql
-- Data structure:
-- vehicle: [
--   { make: "Honda", extras: ["warranty", "tint"] },
--   { make: "Toyota", extras: ["leather", "sunroof"] }
-- ]

SELECT
  vm.value:make::VARCHAR AS make,
  ve.value::VARCHAR AS extra
FROM car_sales,
LATERAL FLATTEN(INPUT => src:vehicle) vm,
LATERAL FLATTEN(INPUT => vm.value:extras) ve;

-- Result:
-- make   | extra
-- Honda  | warranty
-- Honda  | tint
-- Toyota | leather
-- Toyota | sunroof
```

### 4.7 OUTER Parameter

Use OUTER => TRUE to preserve rows even when the array is empty or NULL (similar to LEFT OUTER JOIN):

```sql
-- Without OUTER: rows with empty/null arrays are excluded
SELECT
  src:id::INT AS id,
  f.value::VARCHAR AS tag
FROM events,
LATERAL FLATTEN(INPUT => src:tags) f;

-- With OUTER: all rows included, NULL for missing elements
SELECT
  src:id::INT AS id,
  f.value::VARCHAR AS tag
FROM events,
LATERAL FLATTEN(INPUT => src:tags, OUTER => TRUE) f;
```

### 4.8 RECURSIVE Parameter

Use RECURSIVE => TRUE to flatten all nested levels:

```sql
-- Discover all keys in complex nested structure
SELECT DISTINCT
  REGEXP_REPLACE(f.path, '\\[[0-9]+\\]', '[]') AS "Path",
  TYPEOF(f.value) AS "Type"
FROM my_table,
LATERAL FLATTEN(variant_column, RECURSIVE => TRUE) f
ORDER BY 1;
```

---

## 5. Key Functions for Semi-Structured Data

### 5.1 PARSE_JSON

Parses a JSON string and returns a VARIANT value:

```sql
-- Basic usage
SELECT PARSE_JSON('{"name": "John", "age": 30}');

-- With column data
SELECT PARSE_JSON(json_string_column) AS parsed_data
FROM raw_data;

-- NULL handling
SELECT PARSE_JSON(NULL);      -- Returns SQL NULL
SELECT PARSE_JSON('null');    -- Returns VARIANT null (different!)
```

**Important Distinction:**
- `PARSE_JSON(NULL)` returns SQL NULL
- `PARSE_JSON('null')` returns JSON null (VARIANT containing the string "null")

### 5.2 TRY_PARSE_JSON

Safe version that returns NULL on parse errors instead of raising an error:

```sql
-- Returns NULL instead of error for invalid JSON
SELECT TRY_PARSE_JSON('invalid json');  -- Returns NULL
SELECT TRY_PARSE_JSON('{"valid": true}');  -- Returns VARIANT
```

### 5.3 TO_JSON and TO_VARIANT

```sql
-- Convert VARIANT to JSON string
SELECT TO_JSON(PARSE_JSON('{"a": 1}'));  -- Returns '{"a":1}'

-- Convert value to VARIANT
SELECT TO_VARIANT(123);
SELECT TO_VARIANT('hello');
SELECT TO_VARIANT(CURRENT_DATE());
```

### 5.4 TYPEOF

Returns the data type of a VARIANT value:

```sql
SELECT
  data:name,
  TYPEOF(data:name) AS name_type,
  data:age,
  TYPEOF(data:age) AS age_type,
  data:active,
  TYPEOF(data:active) AS active_type
FROM events;

-- Possible return values: NULL_VALUE, BOOLEAN, INTEGER, REAL,
-- VARCHAR, ARRAY, OBJECT
```

### 5.5 GET, GET_PATH, and GET_IGNORE_CASE

```sql
-- GET: Extract element by key or index
SELECT GET(src:vehicle, 0) FROM car_sales;  -- Same as src:vehicle[0]
SELECT GET(src, 'dealership') FROM car_sales;  -- Same as src:dealership

-- GET_PATH: Extract using path string (useful for dynamic paths)
SELECT GET_PATH(src, 'vehicle[0].make') FROM car_sales;
SELECT GET_PATH(src, 'customer[0]:name') FROM car_sales;

-- GET_IGNORE_CASE: Case-insensitive key lookup
SELECT GET_IGNORE_CASE(src, 'DEALERSHIP') FROM car_sales;
```

### 5.6 OBJECT Functions

```sql
-- OBJECT_CONSTRUCT: Build an object from key-value pairs
SELECT OBJECT_CONSTRUCT(
  'name', 'John',
  'age', 30,
  'city', 'NYC'
);

-- OBJECT_KEYS: Return array of keys
SELECT OBJECT_KEYS(src:salesperson) FROM car_sales;
-- Returns: ["id", "name"]

-- OBJECT_DELETE: Remove a key
SELECT OBJECT_DELETE(src:salesperson, 'id') FROM car_sales;

-- OBJECT_INSERT: Add or update a key
SELECT OBJECT_INSERT(src:salesperson, 'department', 'Sales') FROM car_sales;

-- OBJECT_PICK: Select specific keys
SELECT OBJECT_PICK(src, 'dealership', 'sale_date') FROM car_sales;
```

### 5.7 ARRAY Functions

```sql
-- ARRAY_CONSTRUCT: Build an array
SELECT ARRAY_CONSTRUCT(1, 2, 3, 'four', NULL);

-- ARRAY_SIZE: Get array length
SELECT ARRAY_SIZE(src:customer) FROM car_sales;

-- ARRAY_CONTAINS: Check if value exists
SELECT ARRAY_CONTAINS('warranty'::VARIANT, src:vehicle[0]:extras)
FROM car_sales;

-- ARRAY_APPEND: Add element to end
SELECT ARRAY_APPEND(src:tags, 'new_tag') FROM events;

-- ARRAY_SLICE: Extract portion of array
SELECT ARRAY_SLICE(src:customer, 0, 2) FROM car_sales;  -- Elements 0 and 1

-- ARRAY_AGG: Aggregate values into array
SELECT ARRAY_AGG(DISTINCT product_name) FROM orders;
```

---

## 6. NULL Handling in Semi-Structured Data

### 6.1 Two Types of NULL

Snowflake distinguishes between:

| Type | Description | How to Check |
|------|-------------|--------------|
| SQL NULL | Missing or unknown value | `IS NULL` |
| JSON null | Explicit null in JSON | `= 'null'` or check TYPEOF |

```sql
-- Demonstrate the difference
SELECT
  PARSE_JSON(NULL) AS sql_null,          -- SQL NULL
  PARSE_JSON('null') AS json_null,       -- VARIANT null
  PARSE_JSON('{"a": null}'):a AS obj_null;  -- VARIANT null

-- Check for SQL NULL
SELECT * FROM events WHERE data:field IS NULL;

-- Check for JSON null
SELECT * FROM events WHERE data:field = 'null';
SELECT * FROM events WHERE TYPEOF(data:field) = 'NULL_VALUE';

-- Convert JSON null to SQL NULL for comparisons
SELECT TO_VARCHAR(data:field) AS field_value
FROM events;  -- JSON null becomes SQL NULL when cast
```

### 6.2 Handling Missing Keys

When accessing a key that does not exist, Snowflake returns SQL NULL:

```sql
-- Returns NULL if 'nonexistent' key is missing
SELECT data:nonexistent FROM events;

-- Use COALESCE or NVL for defaults
SELECT COALESCE(data:optional_field::VARCHAR, 'default') FROM events;
SELECT NVL(data:optional_field::VARCHAR, 'default') FROM events;
```

---

## 7. Performance Considerations

### 7.1 Subcolumnarization

When semi-structured data is loaded into VARIANT columns, Snowflake automatically extracts frequently accessed elements into separate internal columns for better query performance:

**Elements NOT Extracted:**
- Elements containing JSON null values
- Elements with mixed data types across rows
- More than 200 unique paths per partition (default limit)

**Best Practices:**
- Avoid using JSON null when possible
- Maintain consistent data types for the same path
- Consider flattening frequently-queried nested structures into relational columns

### 7.2 When to Flatten to Relational Columns

**Keep in VARIANT When:**
- Schema is unpredictable or evolving
- Not sure about query patterns yet
- Data is accessed infrequently

**Flatten to Relational Columns When:**
- Frequently filtering or joining on specific fields
- Using non-native types (dates, timestamps in JSON are stored as strings)
- Need optimal query performance
- Working with deeply nested arrays

```sql
-- Example: Extract frequently-used fields to relational columns
CREATE TABLE events_optimized AS
SELECT
  event_data:event_id::INT AS event_id,
  event_data:event_type::VARCHAR AS event_type,
  event_data:timestamp::TIMESTAMP_NTZ AS event_timestamp,
  event_data AS raw_data  -- Keep full VARIANT for flexibility
FROM events_raw;
```

### 7.3 Search Optimization for Semi-Structured Data

Search optimization can be enabled on VARIANT columns to improve point lookup performance:

```sql
-- Enable search optimization on VARIANT paths
ALTER TABLE events ADD SEARCH OPTIMIZATION ON EQUALITY(event_data:user_id);
ALTER TABLE events ADD SEARCH OPTIMIZATION ON EQUALITY(event_data:event_type);
```

---

## 8. Common Query Patterns

### 8.1 Filtering on VARIANT Fields

```sql
-- Filter on nested field (must cast for comparison)
SELECT * FROM events
WHERE event_data:event_type::VARCHAR = 'click';

-- Filter on array contents
SELECT * FROM events
WHERE ARRAY_CONTAINS('mobile'::VARIANT, event_data:tags);

-- Filter on nested object field
SELECT * FROM events
WHERE event_data:user.country::VARCHAR = 'USA';
```

### 8.2 Aggregating Semi-Structured Data

```sql
-- Count by nested field
SELECT
  event_data:event_type::VARCHAR AS event_type,
  COUNT(*) AS count
FROM events
GROUP BY event_type;

-- Sum with casting
SELECT
  SUM(order_data:amount::NUMBER) AS total_amount
FROM orders;

-- Array aggregation
SELECT
  customer_id,
  ARRAY_AGG(order_data:product_name) AS products_ordered
FROM orders
GROUP BY customer_id;
```

### 8.3 Joining VARIANT Data

```sql
-- Join on extracted VARIANT field
SELECT
  e.event_data:event_type::VARCHAR AS event_type,
  u.user_name
FROM events e
JOIN users u ON e.event_data:user_id::INT = u.user_id;
```

### 8.4 Discovering Schema

```sql
-- List all unique keys and their types
SELECT DISTINCT
  REGEXP_REPLACE(f.path, '\\[[0-9]+\\]', '[]') AS path_pattern,
  TYPEOF(f.value) AS data_type,
  COUNT(*) AS occurrences
FROM my_table,
LATERAL FLATTEN(variant_column, RECURSIVE => TRUE) f
GROUP BY 1, 2
ORDER BY 1, 2;
```

---

## 9. Exam Tips and Common Question Patterns

### 9.1 Frequently Tested Concepts

1. **VARIANT Data Type**: Maximum size, what it can contain, returns VARIANT not VARCHAR
2. **Access Patterns**: Colon vs dot vs bracket notation and when to use each
3. **FLATTEN Function**: Parameters (INPUT, OUTER, RECURSIVE, MODE), output columns
4. **LATERAL FLATTEN**: Why LATERAL is needed, how it joins data
5. **Type Casting**: Why it is necessary, `::` syntax vs CAST function
6. **NULL Types**: Difference between SQL NULL and JSON null
7. **PARSE_JSON**: Basic syntax, NULL behavior

### 9.2 Common Exam Traps

| Trap | Correct Understanding |
|------|----------------------|
| VARIANT values are strings | VARIANT preserves original type; strings shown with quotes |
| Array indices start at 1 | Arrays are zero-indexed (first element is [0]) |
| `PARSE_JSON(NULL)` equals `PARSE_JSON('null')` | They are different: SQL NULL vs JSON null |
| All VARIANT elements are extracted to columns | Elements with JSON null or mixed types are NOT extracted |
| FLATTEN always returns rows | Empty arrays return no rows unless OUTER => TRUE |
| Dot notation is case-insensitive | Dot notation IS case-insensitive by default; use quotes for case-sensitivity |

### 9.3 Key Syntax to Memorize

```sql
-- Access patterns
column:element              -- First level
column:level1.level2        -- Nested (dot notation)
column['level1']['level2']  -- Nested (bracket notation)
column:array[0]             -- Array index
column:array[0].field       -- Combined

-- FLATTEN
LATERAL FLATTEN(INPUT => column:array)
LATERAL FLATTEN(INPUT => column:array, OUTER => TRUE)
LATERAL FLATTEN(column, RECURSIVE => TRUE)

-- PARSE_JSON
SELECT PARSE_JSON('{"key": "value"}')
SELECT TRY_PARSE_JSON(possibly_invalid_json)

-- Type casting
column:field::VARCHAR
column:field::NUMBER
column:field::DATE
```

### 9.4 Practice Questions

**Question 1:** What does the following query return?
```sql
SELECT PARSE_JSON('null');
```
- A) SQL NULL
- B) An error
- C) A VARIANT containing JSON null
- D) The string 'null'

**Answer:** C - `PARSE_JSON('null')` returns a VARIANT containing JSON null, which is different from SQL NULL.

---

**Question 2:** Given a VARIANT column `data` containing `{"items": [{"name": "A"}, {"name": "B"}]}`, how do you get the name of the second item?
- A) `data:items:1:name`
- B) `data:items[1].name`
- C) `data:items[2].name`
- D) `data.items.1.name`

**Answer:** B - Use array index [1] for the second element (zero-indexed) and dot notation for the nested field.

---

**Question 3:** Which FLATTEN parameter should be set to TRUE to include rows even when the array being flattened is empty?
- A) RECURSIVE
- B) MODE
- C) OUTER
- D) INCLUDE_EMPTY

**Answer:** C - `OUTER => TRUE` behaves like a LEFT OUTER JOIN, including rows even when FLATTEN produces no results.

---

**Question 4:** What output columns does the FLATTEN function produce?
- A) KEY, VALUE only
- B) SEQ, KEY, PATH, INDEX, VALUE, THIS
- C) ROW_NUMBER, KEY, VALUE
- D) INDEX, ELEMENT, PARENT

**Answer:** B - FLATTEN returns SEQ, KEY, PATH, INDEX, VALUE, and THIS columns.

---

**Question 5:** Which function safely parses JSON and returns NULL instead of an error for invalid input?
- A) PARSE_JSON
- B) TRY_PARSE_JSON
- C) SAFE_PARSE_JSON
- D) TO_JSON

**Answer:** B - TRY_PARSE_JSON returns NULL for invalid JSON instead of raising an error.

---

**Question 6:** What is the result of `TYPEOF(PARSE_JSON('{"a": null}'):a)`?
- A) NULL
- B) VARCHAR
- C) NULL_VALUE
- D) VARIANT

**Answer:** C - The TYPEOF function returns 'NULL_VALUE' for JSON null values.

---

**Question 7:** To access a key named "user-id" (with hyphen) in a VARIANT column, which syntax is correct?
- A) `data:user-id`
- B) `data:"user-id"`
- C) `data:user_id`
- D) `data.[user-id]`

**Answer:** B - Keys with special characters like hyphens require double quotes in dot notation.

---

**Question 8:** What happens when you query a key that does not exist in a VARIANT column?
- A) An error is raised
- B) SQL NULL is returned
- C) JSON null is returned
- D) An empty string is returned

**Answer:** B - Accessing a non-existent key returns SQL NULL.

---

## 10. Quick Reference

### Data Types

| Type | Purpose | Example |
|------|---------|---------|
| VARIANT | Universal container | `PARSE_JSON('{"a":1}')` |
| OBJECT | Key-value pairs | `OBJECT_CONSTRUCT('a', 1)` |
| ARRAY | Ordered list | `ARRAY_CONSTRUCT(1, 2, 3)` |

### Access Patterns

| Pattern | Syntax | Example |
|---------|--------|---------|
| Colon | `col:key` | `src:dealership` |
| Dot | `col:key1.key2` | `src:user.name` |
| Bracket | `col['key']` | `src['user']['name']` |
| Index | `col:arr[n]` | `src:items[0]` |

### FLATTEN Parameters

| Parameter | Values | Default |
|-----------|--------|---------|
| INPUT | VARIANT/OBJECT/ARRAY | Required |
| PATH | String path | Root |
| OUTER | TRUE/FALSE | FALSE |
| RECURSIVE | TRUE/FALSE | FALSE |
| MODE | 'OBJECT'/'ARRAY'/'BOTH' | 'BOTH' |

### Essential Functions

| Function | Purpose |
|----------|---------|
| `PARSE_JSON(string)` | Parse JSON string to VARIANT |
| `TRY_PARSE_JSON(string)` | Safe JSON parsing |
| `TO_JSON(variant)` | Convert VARIANT to JSON string |
| `TYPEOF(variant)` | Get data type name |
| `FLATTEN(input)` | Explode array/object to rows |
| `GET(var, key)` | Extract by key or index |
| `GET_PATH(var, path)` | Extract by path string |
| `OBJECT_CONSTRUCT(...)` | Build OBJECT from pairs |
| `ARRAY_CONSTRUCT(...)` | Build ARRAY from values |
| `ARRAY_SIZE(array)` | Get array length |

---

**Key Takeaway:** Mastering semi-structured data in Snowflake requires understanding the VARIANT data type and its access patterns (colon, dot, and bracket notation), the FLATTEN function for expanding arrays and objects into rows, and proper type casting for operations and comparisons. Remember the distinction between SQL NULL and JSON null, and know when to flatten data into relational columns for performance optimization.
