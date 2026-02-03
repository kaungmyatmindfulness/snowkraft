# Domain 5: Data Transformations

## Part 11: Data Type Conversion

Data type conversion is a fundamental aspect of data transformations in Snowflake. Understanding how to convert between data types---both explicitly and implicitly---is essential for the SnowPro Core exam. This section covers conversion functions, the CAST operator, TRY_* functions for safe conversions, and the rules governing automatic type coercion.

---

## 1. Overview of Data Type Conversion

### 1.1 Why Type Conversion Matters

Type conversion is necessary when:
- Loading data from external sources (files often contain strings)
- Extracting values from VARIANT/semi-structured data
- Comparing or joining columns with different types
- Formatting data for reports or exports
- Performing arithmetic on string representations of numbers

**Key Principle:** Snowflake is strongly typed, but provides flexible conversion mechanisms to handle real-world data scenarios.

### 1.2 Conversion Categories

| Category | Description | Methods |
|----------|-------------|---------|
| **Explicit Conversion** | Programmer-specified type changes | CAST, ::, TO_* functions |
| **Implicit Conversion** | Automatic type coercion by Snowflake | Follows precedence rules |
| **Safe Conversion** | Returns NULL instead of error on failure | TRY_CAST, TRY_TO_* functions |

---

## 2. Explicit Conversion Methods

### 2.1 The CAST Function

The ANSI SQL standard function for type conversion.

```sql
-- Basic syntax
CAST(expression AS target_data_type)

-- Examples
SELECT CAST('123' AS INTEGER);                    -- 123
SELECT CAST(123.456 AS DECIMAL(10,2));           -- 123.46
SELECT CAST('2024-01-15' AS DATE);               -- 2024-01-15
SELECT CAST(TRUE AS VARCHAR);                     -- 'true'
SELECT CAST('10:30:00' AS TIME);                 -- 10:30:00
```

**CAST Characteristics:**
- ANSI SQL standard syntax
- Throws an error if conversion fails
- Works with all Snowflake data types
- More verbose but more readable for complex expressions

### 2.2 The Double-Colon (::) Operator

Snowflake's shorthand casting operator, equivalent to CAST.

```sql
-- Syntax
expression::target_data_type

-- Examples
SELECT '123'::INTEGER;                            -- 123
SELECT 123.456::DECIMAL(10,2);                   -- 123.46
SELECT '2024-01-15'::DATE;                       -- 2024-01-15
SELECT event_timestamp::DATE;                     -- Extract date from timestamp
SELECT json_data:price::NUMBER(10,2);            -- Cast VARIANT element
```

**:: Operator Characteristics:**
- Snowflake-specific shorthand
- Functionally identical to CAST
- More concise, preferred in practice
- Excellent for VARIANT data extraction

### 2.3 CAST vs :: Comparison

| Aspect | CAST | :: Operator |
|--------|------|-------------|
| Standard | ANSI SQL | Snowflake-specific |
| Syntax | `CAST(expr AS type)` | `expr::type` |
| Readability | Better for complex expressions | More concise |
| Performance | Identical | Identical |
| Error behavior | Throws error on failure | Throws error on failure |

```sql
-- These are equivalent
SELECT CAST(src:amount AS DECIMAL(10,2)) FROM orders;
SELECT src:amount::DECIMAL(10,2) FROM orders;
```

> **Exam Tip:** Both CAST and :: produce identical results. The :: operator is more commonly used in Snowflake code due to its brevity.

---

## 3. TO_* Conversion Functions

Snowflake provides specialized conversion functions for each target data type with additional formatting options.

### 3.1 Numeric Conversion Functions

#### TO_NUMBER / TO_DECIMAL / TO_NUMERIC

Convert strings or other types to numeric values.

```sql
-- Basic syntax
TO_NUMBER(string_expr [, format_string] [, precision, scale])
TO_DECIMAL(string_expr [, format_string] [, precision, scale])
TO_NUMERIC(string_expr [, format_string] [, precision, scale])

-- Examples
SELECT TO_NUMBER('12345');                        -- 12345
SELECT TO_NUMBER('12,345.67', '99,999.99');      -- 12345.67 (with format)
SELECT TO_NUMBER('$1,234.56', '$9,999.99');      -- 1234.56
SELECT TO_DECIMAL('123.456', 10, 2);             -- 123.46
SELECT TO_NUMERIC('-999.99');                     -- -999.99
```

**Format String Elements:**
| Element | Description |
|---------|-------------|
| `9` | Digit position |
| `0` | Digit with leading zeros |
| `.` | Decimal point |
| `,` | Thousands separator |
| `$` | Dollar sign |
| `S` | Sign (+ or -) |
| `MI` | Minus sign for negatives |

#### TO_DOUBLE

Convert to double-precision floating-point.

```sql
SELECT TO_DOUBLE('3.14159');                      -- 3.14159
SELECT TO_DOUBLE('1.23e10');                      -- 12300000000
SELECT TO_DOUBLE(variant_col:measurement);        -- From VARIANT
```

### 3.2 String Conversion Functions

#### TO_VARCHAR / TO_CHAR

Convert values to string representation.

```sql
-- Basic syntax
TO_VARCHAR(expression [, format_string])
TO_CHAR(expression [, format_string])

-- Numeric to string
SELECT TO_VARCHAR(12345);                         -- '12345'
SELECT TO_VARCHAR(1234.56, '999,999.99');        -- '1,234.56'
SELECT TO_CHAR(123.45, '$999.99');               -- '$123.45'

-- Date/time to string
SELECT TO_VARCHAR(CURRENT_DATE, 'YYYY-MM-DD');   -- '2024-01-15'
SELECT TO_CHAR(CURRENT_TIMESTAMP, 'HH24:MI:SS'); -- '14:30:45'

-- Boolean to string
SELECT TO_VARCHAR(TRUE);                          -- 'true'
```

**Common Date/Time Format Elements:**
| Element | Description | Example |
|---------|-------------|---------|
| `YYYY` | 4-digit year | 2024 |
| `YY` | 2-digit year | 24 |
| `MM` | 2-digit month | 01-12 |
| `MON` | Abbreviated month | JAN |
| `MONTH` | Full month name | JANUARY |
| `DD` | Day of month | 01-31 |
| `DY` | Abbreviated day | MON |
| `DAY` | Full day name | MONDAY |
| `HH24` | Hour (24-hour) | 00-23 |
| `HH12` | Hour (12-hour) | 01-12 |
| `MI` | Minute | 00-59 |
| `SS` | Second | 00-59 |
| `FF` | Fractional seconds | .123456789 |
| `AM/PM` | Meridiem indicator | AM or PM |
| `TZH:TZM` | Timezone offset | -05:00 |

### 3.3 Date and Time Conversion Functions

#### TO_DATE

Convert strings or timestamps to DATE.

```sql
-- Basic syntax
TO_DATE(expression [, format_string])

-- Examples
SELECT TO_DATE('2024-01-15');                     -- 2024-01-15
SELECT TO_DATE('15-Jan-2024', 'DD-MON-YYYY');    -- 2024-01-15
SELECT TO_DATE('01/15/2024', 'MM/DD/YYYY');      -- 2024-01-15
SELECT TO_DATE(CURRENT_TIMESTAMP);                -- Current date
SELECT TO_DATE(1705276800);                       -- From Unix epoch
```

#### TO_TIME

Convert strings to TIME.

```sql
-- Basic syntax
TO_TIME(expression [, format_string])

-- Examples
SELECT TO_TIME('14:30:00');                       -- 14:30:00
SELECT TO_TIME('2:30 PM', 'HH12:MI AM');         -- 14:30:00
SELECT TO_TIME('143045', 'HH24MISS');            -- 14:30:45
```

#### TO_TIMESTAMP / TO_TIMESTAMP_*

Convert to TIMESTAMP variants.

```sql
-- Generic timestamp (uses TIMESTAMP_TYPE_MAPPING parameter)
SELECT TO_TIMESTAMP('2024-01-15 14:30:00');

-- Specific timestamp types
SELECT TO_TIMESTAMP_NTZ('2024-01-15 14:30:00');  -- No time zone
SELECT TO_TIMESTAMP_LTZ('2024-01-15 14:30:00');  -- Local time zone
SELECT TO_TIMESTAMP_TZ('2024-01-15 14:30:00 -05:00'); -- With time zone

-- From Unix epoch (seconds)
SELECT TO_TIMESTAMP(1705332600);                  -- 2024-01-15 14:30:00

-- From Unix epoch with scale (milliseconds, microseconds, nanoseconds)
SELECT TO_TIMESTAMP(1705332600000, 3);           -- Milliseconds
SELECT TO_TIMESTAMP(1705332600000000, 6);        -- Microseconds
```

**Epoch Scale Parameter:**
| Scale | Unit | Example Value |
|-------|------|---------------|
| 0 | Seconds | 1705332600 |
| 3 | Milliseconds | 1705332600000 |
| 6 | Microseconds | 1705332600000000 |
| 9 | Nanoseconds | 1705332600000000000 |

### 3.4 Boolean Conversion

#### TO_BOOLEAN

Convert strings or numbers to BOOLEAN.

```sql
-- Basic syntax
TO_BOOLEAN(expression)

-- String conversions
SELECT TO_BOOLEAN('true');                        -- TRUE
SELECT TO_BOOLEAN('yes');                         -- TRUE
SELECT TO_BOOLEAN('on');                          -- TRUE
SELECT TO_BOOLEAN('1');                           -- TRUE
SELECT TO_BOOLEAN('t');                           -- TRUE
SELECT TO_BOOLEAN('false');                       -- FALSE
SELECT TO_BOOLEAN('no');                          -- FALSE
SELECT TO_BOOLEAN('off');                         -- FALSE
SELECT TO_BOOLEAN('0');                           -- FALSE
SELECT TO_BOOLEAN('f');                           -- FALSE

-- Numeric conversions
SELECT TO_BOOLEAN(1);                             -- TRUE
SELECT TO_BOOLEAN(0);                             -- FALSE
SELECT TO_BOOLEAN(-1);                            -- TRUE (any non-zero)
```

**Valid Boolean String Inputs:**
| TRUE Values | FALSE Values |
|-------------|--------------|
| 'true', 'TRUE' | 'false', 'FALSE' |
| 't', 'T' | 'f', 'F' |
| 'yes', 'YES' | 'no', 'NO' |
| 'on', 'ON' | 'off', 'OFF' |
| '1' | '0' |
| Any non-zero number | 0 |

### 3.5 Binary Conversion Functions

#### TO_BINARY

Convert hexadecimal or Base64 strings to BINARY.

```sql
-- From hexadecimal (default)
SELECT TO_BINARY('48454C4C4F', 'HEX');           -- Binary for 'HELLO'

-- From Base64
SELECT TO_BINARY('SEVMTE8=', 'BASE64');          -- Binary for 'HELLO'

-- From UTF-8 string
SELECT TO_BINARY('HELLO', 'UTF-8');              -- Binary representation
```

#### HEX_ENCODE / HEX_DECODE

Convert between binary and hexadecimal representation.

```sql
SELECT HEX_ENCODE(TO_BINARY('HELLO', 'UTF-8')); -- '48454C4C4F'
SELECT HEX_DECODE_STRING('48454C4C4F');         -- 'HELLO'
```

#### BASE64_ENCODE / BASE64_DECODE

Convert between binary and Base64 representation.

```sql
SELECT BASE64_ENCODE(TO_BINARY('HELLO', 'UTF-8')); -- 'SEVMTE8='
SELECT BASE64_DECODE_STRING('SEVMTE8=');           -- 'HELLO'
```

---

## 4. TRY_* Functions: Safe Type Conversion

### 4.1 The Problem with Standard Conversion

Standard conversion functions throw errors on invalid input:

```sql
-- These will cause errors
SELECT CAST('abc' AS INTEGER);                    -- Error!
SELECT TO_NUMBER('not a number');                 -- Error!
SELECT TO_DATE('invalid date');                   -- Error!
```

### 4.2 TRY_* Functions Return NULL on Failure

TRY_* functions return NULL instead of raising an error when conversion fails.

```sql
-- Safe conversions return NULL on failure
SELECT TRY_CAST('abc' AS INTEGER);                -- NULL (no error)
SELECT TRY_TO_NUMBER('not a number');             -- NULL
SELECT TRY_TO_DATE('invalid date');               -- NULL
SELECT TRY_TO_BOOLEAN('maybe');                   -- NULL

-- Successful conversions work normally
SELECT TRY_CAST('123' AS INTEGER);                -- 123
SELECT TRY_TO_NUMBER('456.78');                   -- 456.78
SELECT TRY_TO_DATE('2024-01-15');                 -- 2024-01-15
```

### 4.3 Complete TRY_* Function Reference

| Standard Function | Safe Alternative | Returns on Failure |
|-------------------|------------------|-------------------|
| CAST | TRY_CAST | NULL |
| TO_NUMBER | TRY_TO_NUMBER | NULL |
| TO_DECIMAL | TRY_TO_DECIMAL | NULL |
| TO_NUMERIC | TRY_TO_NUMERIC | NULL |
| TO_DOUBLE | TRY_TO_DOUBLE | NULL |
| TO_DATE | TRY_TO_DATE | NULL |
| TO_TIME | TRY_TO_TIME | NULL |
| TO_TIMESTAMP | TRY_TO_TIMESTAMP | NULL |
| TO_TIMESTAMP_NTZ | TRY_TO_TIMESTAMP_NTZ | NULL |
| TO_TIMESTAMP_LTZ | TRY_TO_TIMESTAMP_LTZ | NULL |
| TO_TIMESTAMP_TZ | TRY_TO_TIMESTAMP_TZ | NULL |
| TO_BOOLEAN | TRY_TO_BOOLEAN | NULL |
| TO_BINARY | TRY_TO_BINARY | NULL |
| HEX_DECODE_STRING | TRY_HEX_DECODE_STRING | NULL |
| BASE64_DECODE_STRING | TRY_BASE64_DECODE_STRING | NULL |

### 4.4 When to Use TRY_* Functions

**Use TRY_* functions when:**
- Data quality is uncertain
- Processing user-provided input
- Loading data from external sources
- Working with VARIANT data that may have inconsistent types
- You want to filter out bad data rather than fail the query

**Pattern: Identify Bad Data**
```sql
-- Find rows with invalid numeric values
SELECT *
FROM source_data
WHERE TRY_TO_NUMBER(string_column) IS NULL
  AND string_column IS NOT NULL;
```

**Pattern: Clean Data During Load**
```sql
-- Transform with fallback values
SELECT
    id,
    COALESCE(TRY_TO_NUMBER(price_string), 0) AS price,
    COALESCE(TRY_TO_DATE(date_string), CURRENT_DATE) AS order_date
FROM staging_table;
```

**Pattern: Data Validation Report**
```sql
-- Count valid vs invalid conversions
SELECT
    COUNT(*) AS total_rows,
    COUNT(TRY_TO_NUMBER(amount)) AS valid_numbers,
    COUNT(*) - COUNT(TRY_TO_NUMBER(amount)) AS invalid_numbers
FROM raw_data;
```

> **Exam Tip:** TRY_* functions are essential for ETL processes and data quality handling. Remember that they return NULL on failure, not an error.

---

## 5. Implicit Type Conversion

### 5.1 What Is Implicit Conversion?

Snowflake automatically converts data types in certain situations without explicit CAST or conversion functions. This is called **implicit conversion** or **type coercion**.

```sql
-- Implicit conversion examples
SELECT '123' + 456;                               -- 579 (string to number)
SELECT 100 || ' items';                           -- '100 items' (number to string)
SELECT CURRENT_DATE = '2024-01-15';              -- TRUE (string to date)
```

### 5.2 Implicit Conversion Rules

**String to Number:**
```sql
-- Implicit conversion in arithmetic
SELECT '10' + 5;                                  -- 15
SELECT '3.14' * 2;                               -- 6.28
SELECT 100 / '4';                                -- 25
```

**Number to String:**
```sql
-- Implicit conversion in concatenation
SELECT 'Total: ' || 123;                         -- 'Total: 123'
SELECT 'Price: $' || 99.99;                      -- 'Price: $99.99'
```

**Date/Timestamp Conversions:**
```sql
-- String to date in comparisons
SELECT * FROM orders WHERE order_date > '2024-01-01';

-- Date to timestamp (adds midnight)
SELECT DATEDIFF('hour', DATE '2024-01-15', TIMESTAMP '2024-01-15 12:00:00');
-- Result: 12 (date is treated as midnight)
```

**Boolean Conversions:**
```sql
-- String to boolean in conditionals
INSERT INTO settings (is_active) VALUES ('true');  -- Converted to TRUE
INSERT INTO settings (is_active) VALUES ('yes');   -- Converted to TRUE
INSERT INTO settings (is_active) VALUES (1);       -- Converted to TRUE
```

### 5.3 Type Precedence in Mixed Expressions

When mixing types in expressions, Snowflake follows a precedence hierarchy:

**Numeric Precedence (lowest to highest):**
1. INTEGER/NUMBER (fixed-point)
2. FLOAT/DOUBLE (floating-point)

```sql
-- Integer + Float = Float
SELECT 10 + 3.14;                                -- 13.14 (FLOAT)
SELECT 10::NUMBER + 3.14::FLOAT;                 -- 13.14 (FLOAT)
```

**Timestamp Precedence:**
1. DATE
2. TIMESTAMP_NTZ
3. TIMESTAMP_LTZ
4. TIMESTAMP_TZ

```sql
-- Mixed timestamp comparison
-- Lower precedence type is converted to higher
SELECT CASE WHEN date_col = timestamp_col THEN 'match' END;
-- date_col is converted to timestamp for comparison
```

### 5.4 Common Implicit Conversion Scenarios

| Operation | From Type | To Type | Example |
|-----------|-----------|---------|---------|
| Arithmetic | VARCHAR | NUMBER | `'10' + 5` |
| Concatenation | NUMBER | VARCHAR | `100 \|\| 'x'` |
| Comparison | VARCHAR | DATE | `date_col > '2024-01-01'` |
| Assignment | VARCHAR | BOOLEAN | `INSERT... VALUES ('true')` |
| UNION | Compatible types | Common type | Mixed column types |

### 5.5 When Implicit Conversion Fails

Implicit conversion has limits:

```sql
-- These will fail
SELECT 'abc' + 10;                               -- Error: not a valid number
SELECT 'not-a-date' > CURRENT_DATE;             -- Error: invalid date format
```

**Best Practice:** Rely on explicit conversion for clarity and to catch errors early.

---

## 6. VARIANT Data Type Conversion

### 6.1 Extracting and Casting from VARIANT

Values extracted from VARIANT columns need explicit casting to remove JSON formatting:

```sql
-- Without casting - JSON format retained
SELECT json_data:name FROM table;                 -- "John" (with quotes)

-- With casting - proper value
SELECT json_data:name::VARCHAR FROM table;        -- John (without quotes)
```

### 6.2 Common VARIANT Casting Patterns

```sql
-- Casting various types from VARIANT
SELECT
    payload:customer_id::INTEGER AS customer_id,
    payload:amount::DECIMAL(10,2) AS amount,
    payload:order_date::DATE AS order_date,
    payload:is_active::BOOLEAN AS is_active,
    payload:created_at::TIMESTAMP_NTZ AS created_at
FROM events;
```

### 6.3 Safe Extraction with TRY_CAST

```sql
-- Handle potentially invalid VARIANT data
SELECT
    TRY_CAST(payload:quantity AS INTEGER) AS quantity,
    TRY_CAST(payload:price AS DECIMAL(10,2)) AS price
FROM raw_events
WHERE TRY_CAST(payload:quantity AS INTEGER) IS NOT NULL;
```

### 6.4 AS_* Functions for VARIANT

Snowflake provides AS_* functions specifically for VARIANT that handle type checking:

```sql
-- AS_* functions return NULL if type doesn't match
SELECT AS_INTEGER(variant_col);                   -- NULL if not integer
SELECT AS_VARCHAR(variant_col);                   -- NULL if not string
SELECT AS_DATE(variant_col);                      -- NULL if not date

-- Comparison with ::
SELECT variant_col::INTEGER;                      -- Error if not convertible
SELECT AS_INTEGER(variant_col);                   -- NULL if not convertible
```

**AS_* Function List:**
| Function | Returns NULL If |
|----------|-----------------|
| AS_INTEGER | Not an integer |
| AS_DOUBLE | Not a number |
| AS_VARCHAR | Not a string |
| AS_DATE | Not a date |
| AS_TIMESTAMP_* | Not a timestamp |
| AS_BOOLEAN | Not a boolean |
| AS_ARRAY | Not an array |
| AS_OBJECT | Not an object |
| AS_BINARY | Not binary |

---

## 7. Conversion During Data Loading

### 7.1 COPY INTO with Type Conversion

Convert data types during the COPY INTO process:

```sql
-- CSV with string data, converting during load
CREATE TABLE orders (
    order_id INTEGER,
    amount DECIMAL(10,2),
    order_date DATE
);

COPY INTO orders (order_id, amount, order_date)
FROM (
    SELECT
        $1::INTEGER,                              -- Column 1 as integer
        $2::DECIMAL(10,2),                       -- Column 2 as decimal
        TO_DATE($3, 'MM/DD/YYYY')                -- Column 3 as date
    FROM @my_stage/orders.csv
)
FILE_FORMAT = (TYPE = 'CSV');
```

### 7.2 Semi-Structured Data Loading with Conversion

```sql
-- Load JSON with conversion to relational columns
COPY INTO products (id, name, price, created)
FROM (
    SELECT
        $1:id::INTEGER,
        $1:name::VARCHAR,
        $1:price::DECIMAL(10,2),
        $1:created_at::TIMESTAMP_NTZ
    FROM @my_stage/products.json
)
FILE_FORMAT = (TYPE = 'JSON');
```

### 7.3 Using TRY_* Functions During Load

Handle potentially bad data during loading:

```sql
-- Safe loading with fallback values
COPY INTO staging_table (id, amount, date_field)
FROM (
    SELECT
        TRY_TO_NUMBER($1),
        COALESCE(TRY_TO_DECIMAL($2, 10, 2), 0),
        COALESCE(TRY_TO_DATE($3), CURRENT_DATE)
    FROM @my_stage/data.csv
)
FILE_FORMAT = (TYPE = 'CSV')
ON_ERROR = 'CONTINUE';
```

---

## 8. Special Conversion Cases

### 8.1 NULL Handling in Conversions

```sql
-- NULL converts to NULL of any type
SELECT CAST(NULL AS INTEGER);                     -- NULL (INTEGER)
SELECT NULL::VARCHAR;                             -- NULL (VARCHAR)
SELECT TO_DATE(NULL);                             -- NULL (DATE)

-- Empty string behavior varies
SELECT CAST('' AS INTEGER);                       -- Error!
SELECT TRY_CAST('' AS INTEGER);                  -- NULL
SELECT TO_DATE('');                              -- Error!
SELECT TRY_TO_DATE('');                          -- NULL
```

### 8.2 Precision and Scale in Numeric Conversions

```sql
-- Truncation vs rounding
SELECT CAST(123.456 AS DECIMAL(10,2));           -- 123.46 (rounded)
SELECT TRUNCATE(123.456, 2);                     -- 123.45 (truncated)

-- Overflow handling
SELECT CAST(999999999999 AS DECIMAL(5,0));       -- Error: out of range
SELECT TRY_CAST(999999999999 AS DECIMAL(5,0));   -- NULL
```

### 8.3 Timezone Considerations in Timestamp Conversion

```sql
-- Convert between timestamp types
ALTER SESSION SET TIMEZONE = 'America/New_York';

-- NTZ to LTZ (interprets as session timezone)
SELECT '2024-01-15 10:00:00'::TIMESTAMP_NTZ::TIMESTAMP_LTZ;
-- Treats 10:00 as New York time, stores as UTC

-- LTZ to NTZ (displays in session timezone)
SELECT CURRENT_TIMESTAMP::TIMESTAMP_NTZ;
-- Converts current UTC to session timezone, strips TZ info

-- TZ to other types
SELECT '2024-01-15 10:00:00 -08:00'::TIMESTAMP_TZ::TIMESTAMP_LTZ;
-- Converts from Pacific to UTC, then displays in session TZ
```

---

## 9. Conversion Function Performance

### 9.1 Best Practices for Performance

**Pre-convert during ETL:**
```sql
-- Better: Convert once during load
CREATE TABLE orders AS
SELECT
    order_id::INTEGER AS order_id,
    amount::DECIMAL(10,2) AS amount
FROM staging;

-- Worse: Convert in every query
SELECT order_id::INTEGER, amount::DECIMAL(10,2)
FROM staging
WHERE ...;
```

**Use appropriate data types from the start:**
```sql
-- Define columns with proper types
CREATE TABLE events (
    event_id INTEGER,
    amount DECIMAL(10,2),
    event_date DATE
);

-- Rather than storing everything as strings
```

### 9.2 Conversion in WHERE Clauses

```sql
-- Avoid: Converting column in WHERE (prevents pruning)
SELECT * FROM orders WHERE order_date::VARCHAR LIKE '2024%';

-- Better: Convert the literal
SELECT * FROM orders WHERE order_date >= '2024-01-01'::DATE;
```

---

## 10. Exam Tips and Common Question Patterns

### 10.1 Key Concepts to Remember

1. **CAST vs :: Operator:** Functionally identical; :: is more common in Snowflake code

2. **TRY_* Functions:** Return NULL instead of error on conversion failure---essential for data quality handling

3. **TO_* Functions:** Provide format string options for fine-grained control

4. **Implicit Conversion:** Automatic in many cases but has limits and precedence rules

5. **VARIANT Casting:** Always cast when extracting to remove JSON formatting

6. **AS_* Functions:** For VARIANT, return NULL if type doesn't match (type-safe extraction)

7. **Timestamp Types:** Conversions between NTZ/LTZ/TZ are affected by session timezone

8. **Empty Strings:** Are NOT the same as NULL and will cause conversion errors

### 10.2 Common Exam Question Patterns

**Conversion Syntax:**
- "Which statement correctly converts a string to an integer?"
- "What is the difference between CAST and ::?"

**TRY_* Functions:**
- "How do you convert a string to a number without raising an error if the string is invalid?"
- "What does TRY_TO_DATE return when given an invalid date string?"

**VARIANT Data:**
- "Why does extracting a string from VARIANT include quotes?"
- "How do you safely extract a number from VARIANT data?"

**Implicit Conversion:**
- "What is the result of '10' + 5 in Snowflake?"
- "Which implicit conversions does Snowflake perform automatically?"

**Format Strings:**
- "How do you convert a date to 'MM/DD/YYYY' format?"
- "What function converts a number with currency formatting?"

### 10.3 Practice Questions

1. What does `TRY_CAST('abc' AS INTEGER)` return?
   - Answer: NULL (not an error)

2. How do you convert a VARIANT field to remove JSON quotes from a string value?
   - Answer: Use ::VARCHAR or TO_VARCHAR() to cast the extracted value

3. What is the result of `SELECT '100' + 50`?
   - Answer: 150 (implicit conversion of string to number)

4. Which function converts a Unix timestamp (seconds) to a TIMESTAMP?
   - Answer: TO_TIMESTAMP(unix_seconds) or TO_TIMESTAMP(value, 0)

5. How do you format a number as currency (e.g., '$1,234.56')?
   - Answer: TO_CHAR(1234.56, '$9,999.99')

6. What is the difference between AS_INTEGER and ::INTEGER for VARIANT data?
   - Answer: AS_INTEGER returns NULL if not an integer; :: throws an error if conversion fails

7. How do you safely convert data during COPY INTO to handle bad values?
   - Answer: Use TRY_* functions with COALESCE for fallback values

8. What does empty string ('') convert to when cast to INTEGER?
   - Answer: It causes an error; use TRY_CAST to return NULL instead

---

## Summary

Data type conversion in Snowflake involves:

- **Explicit Conversion:** CAST function and :: operator for programmer-controlled type changes
- **TO_* Functions:** Specialized converters with format string support for each data type
- **TRY_* Functions:** Safe conversion alternatives that return NULL instead of errors
- **Implicit Conversion:** Automatic type coercion following Snowflake's precedence rules
- **VARIANT Handling:** Casting required to extract properly typed values from semi-structured data

**Best Practices:**
1. Use TRY_* functions when data quality is uncertain
2. Cast VARIANT extractions explicitly to ensure proper typing
3. Pre-convert data during ETL rather than in every query
4. Use format strings for specific date/number formatting needs
5. Be aware of implicit conversion rules to avoid unexpected behavior

Understanding type conversion is fundamental for data loading, transformation, and query writing in Snowflake---and is frequently tested on the SnowPro Core exam.
