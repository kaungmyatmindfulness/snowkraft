# Domain 5: Data Transformations
## Part 13: User-Defined Functions (UDFs)

**Exam Weight:** This topic is part of Domain 5 (20-25% of exam)

---

## Overview

User-Defined Functions (UDFs) extend Snowflake's capabilities beyond built-in system functions. They allow you to create custom logic that can be reused across queries, encapsulate business rules, and leverage multiple programming languages. Understanding UDFs is essential for the SnowPro Core exam, including the different types, supported languages, when to use them vs. stored procedures, and security considerations.

---

## Section 1: UDF Fundamentals

### What is a UDF?

A **User-Defined Function (UDF)** is a custom function that executes code you define to perform operations not available through Snowflake's built-in functions. UDFs are called like built-in functions and return values that can be used in SQL expressions.

**Key Characteristics:**
- Always returns a value (scalar, table, or aggregate result)
- Called using standard function syntax: `function_name(arguments)`
- Supports multiple handler languages
- Can be shared via Secure Data Sharing (SQL and JavaScript only)
- Executes within the virtual warehouse context

### UDFs vs. Stored Procedures

Understanding the distinction between UDFs and stored procedures is a common exam topic:

| Aspect | User-Defined Functions | Stored Procedures |
|--------|----------------------|-------------------|
| **Return Value** | Always returns a value | Returns a value optionally |
| **SQL Usage** | Used in SELECT, WHERE, expressions | Called with CALL statement |
| **Side Effects** | Designed for calculations only | Can perform DDL/DML operations |
| **Transaction Control** | Cannot manage transactions | Can commit/rollback |
| **Best For** | Calculations, transformations | Administrative tasks, workflows |

**Exam Tip:** A function is for *calculating and returning a value*; a stored procedure is for *performing operations with side effects*.

---

## Section 2: Types of UDFs

### Scalar UDFs

**Definition:** Return a single value for each input row. Most common UDF type.

```sql
-- Scalar UDF: Calculate circle area
CREATE OR REPLACE FUNCTION area_of_circle(radius FLOAT)
  RETURNS FLOAT
  AS
  $$
    pi() * radius * radius
  $$;

-- Usage
SELECT product_name, area_of_circle(dimension) AS area
FROM products;
```

**Characteristics:**
- One output per input row
- Can be used anywhere a scalar expression is valid
- Limit: 500 input arguments

### User-Defined Table Functions (UDTFs)

**Definition:** Return a set of rows (tabular result) for each input. Called using the `TABLE()` syntax in the FROM clause.

```sql
-- UDTF: Split string into words
CREATE OR REPLACE FUNCTION split_text(input_text VARCHAR)
  RETURNS TABLE (word VARCHAR)
  AS
  $$
    SELECT value AS word
    FROM TABLE(SPLIT_TO_TABLE(input_text, ' '))
  $$;

-- Usage: MUST use TABLE() keyword
SELECT * FROM TABLE(split_text('Hello World'));
```

**Characteristics:**
- Returns 0, 1, or multiple rows per input
- Accessed in FROM clause with `TABLE(function_name(args))`
- Limit: 500 input arguments and 500 output columns
- Supports partitioning with `OVER (PARTITION BY ...)`

### User-Defined Aggregate Functions (UDAFs)

**Definition:** Operate across multiple rows to produce a single aggregated result, similar to built-in functions like SUM or AVG.

**Characteristics:**
- Created with `CREATE AGGREGATE FUNCTION`
- Available for Python only
- Requires special handler methods: `accumulate()`, `merge()`, `finish()`
- Maximum serialized state: 64 MB
- Cannot be used as window functions (no OVER clause)

### Vectorized UDFs

**Definition:** Process batches of rows as Pandas DataFrames instead of row-by-row, providing better performance for batch operations.

```python
# Vectorized UDF example
from _snowflake import vectorized
import pandas

@vectorized(input=pandas.DataFrame)
def add_values(df):
    return df[0] + df[1]
```

**Characteristics:**
- Available for Python only
- Receive data as Pandas DataFrames
- Return Pandas Series, arrays, or lists
- Batch size configurable with `max_batch_size`
- Best for operations that benefit from batch processing

---

## Section 3: Supported Handler Languages

Snowflake supports five languages for writing UDF handlers:

### Language Comparison Table

| Language | Handler Location | Sharable via Secure Data Sharing | Key Use Cases |
|----------|-----------------|----------------------------------|---------------|
| **SQL** | Inline only | Yes | Simple expressions, queries |
| **JavaScript** | Inline only | Yes | String manipulation, JSON processing |
| **Python** | Inline or staged | No | ML/analytics, Pandas operations |
| **Java** | Inline or staged | No | Enterprise libraries, complex logic |
| **Scala** | Inline or staged | No | JVM ecosystem, functional programming |

### SQL UDFs

**Simplest option** for SQL-based calculations and queries.

```sql
CREATE OR REPLACE FUNCTION calculate_discount(price NUMBER, discount_pct NUMBER)
  RETURNS NUMBER
  AS
  $$
    price * (1 - discount_pct / 100)
  $$;
```

**SQL UDF Limitations:**
- Cannot contain DDL statements
- Cannot contain DML other than SELECT
- Dynamic SQL not supported (use stored procedures instead)
- Precision/scale constraints on NUMBER are ignored
- VARCHAR length constraints are ignored

### JavaScript UDFs

**Best for** string processing, JSON manipulation, and complex logic without external dependencies.

```sql
CREATE OR REPLACE FUNCTION format_phone(phone VARCHAR)
  RETURNS VARCHAR
  LANGUAGE JAVASCRIPT
  AS
  $$
    // JavaScript has no integer type - all numbers are doubles
    // Arguments must be referenced in UPPERCASE in JavaScript
    var cleaned = PHONE.replace(/\D/g, '');
    return '(' + cleaned.slice(0,3) + ') ' + cleaned.slice(3,6) + '-' + cleaned.slice(6);
  $$;
```

**JavaScript Data Type Mappings:**
| SQL Type | JavaScript Type |
|----------|-----------------|
| NUMBER, FLOAT | Number (double) |
| VARCHAR | String |
| BINARY | Uint8Array |
| DATE, TIMESTAMP | Date object |
| VARIANT | Native JS types |
| NULL | undefined |

**JavaScript UDF Limitations:**
- Source code limited to ~100 KB compressed
- `eval()` function is disabled
- Cannot import external libraries
- No browser APIs (window, document, etc.)
- Global state preservation between rows is unreliable
- Returned VARIANT objects limited to several MB

### Python UDFs

**Most versatile** for analytics, ML, and leveraging the Python ecosystem.

```sql
CREATE OR REPLACE FUNCTION calculate_sentiment(text VARCHAR)
  RETURNS FLOAT
  LANGUAGE PYTHON
  RUNTIME_VERSION = '3.12'
  PACKAGES = ('textblob')
  HANDLER = 'analyze'
  AS
  $$
def analyze(text):
    from textblob import TextBlob
    return TextBlob(text).sentiment.polarity
  $$;
```

**Supported Python Versions:** 3.10, 3.11, 3.12, 3.13 (3.9 deprecated)

**Python UDF Features:**
- PACKAGES clause for importing libraries
- Vectorized UDFs with Pandas DataFrames
- Aggregate functions (UDAFs)
- Inline or staged handler code

### Java UDFs

**Best for** enterprise Java libraries and complex business logic.

```sql
CREATE OR REPLACE FUNCTION hash_value(input VARCHAR)
  RETURNS VARCHAR
  LANGUAGE JAVA
  RUNTIME_VERSION = '11'
  HANDLER = 'HashUtils.computeHash'
  AS
  $$
  import java.security.MessageDigest;

  public class HashUtils {
    public static String computeHash(String input) throws Exception {
      MessageDigest md = MessageDigest.getInstance("SHA-256");
      byte[] hash = md.digest(input.getBytes());
      StringBuilder hex = new StringBuilder();
      for (byte b : hash) {
        hex.append(String.format("%02x", b));
      }
      return hex.toString();
    }
  }
  $$;
```

**Supported Java Versions:** 11.x, 17.x

**Java UDF Notes:**
- Handler format: `ClassName.methodName`
- Can package in JAR files and upload to stages
- NULL handling: Java primitives cannot accept NULL (use wrapper classes)

### Scala UDFs

**Best for** functional programming and JVM-based data processing.

**Supported Scala Versions:** 2.12, 2.13 (preview)

---

## Section 4: Creating UDFs

### CREATE FUNCTION Syntax

```sql
CREATE [ OR REPLACE ] [ SECURE ] FUNCTION [ IF NOT EXISTS ]
  function_name ( [ arg_name arg_type [, ...] ] )
  RETURNS return_type
  [ LANGUAGE language_name ]
  [ { CALLED ON NULL INPUT | RETURNS NULL ON NULL INPUT | STRICT } ]
  [ { VOLATILE | IMMUTABLE } ]
  [ RUNTIME_VERSION = 'version' ]
  [ PACKAGES = ( 'package_name' [, ...] ) ]
  [ IMPORTS = ( 'stage_path' [, ...] ) ]
  [ HANDLER = 'handler_name' ]
  AS $$ handler_code $$;
```

### Key Clauses Explained

| Clause | Description |
|--------|-------------|
| `SECURE` | Hides function definition from non-owners |
| `RETURNS TABLE (...)` | Declares UDTF output columns |
| `LANGUAGE` | Handler language (SQL, JAVASCRIPT, PYTHON, JAVA, SCALA) |
| `CALLED ON NULL INPUT` | Execute even when arguments are NULL (default) |
| `RETURNS NULL ON NULL INPUT` / `STRICT` | Return NULL if any argument is NULL |
| `VOLATILE` | May return different results for same input (default) |
| `IMMUTABLE` | Same inputs always produce same outputs |
| `RUNTIME_VERSION` | Language version (required for Python, Java) |
| `PACKAGES` | Third-party packages to include |
| `IMPORTS` | Files to import from stages |
| `HANDLER` | Entry point (required for Python, Java, Scala) |

### Using Dollar-Quoted Strings

The `$$` delimiters allow including single quotes in code without escaping:

```sql
-- Without $$ requires escaping
CREATE FUNCTION greet(name VARCHAR)
  RETURNS VARCHAR
  AS 'SELECT ''Hello, '' || name || ''!''';

-- With $$ - no escaping needed
CREATE FUNCTION greet(name VARCHAR)
  RETURNS VARCHAR
  AS $$SELECT 'Hello, ' || name || '!'$$;
```

---

## Section 5: Calling/Executing UDFs

### Calling Scalar UDFs

Scalar UDFs can be used anywhere scalar expressions are valid:

```sql
-- In SELECT
SELECT my_function(column1, column2) FROM table1;

-- In WHERE
SELECT * FROM table1 WHERE my_function(value) > 100;

-- With arguments by name
SELECT my_function(arg1 => 'value1', arg2 => 'value2');

-- With arguments by position
SELECT my_function('value1', 'value2');
```

**Important:** You cannot mix named and positional arguments in the same call.

### Calling Table Functions (UDTFs)

UDTFs are called with the `TABLE()` keyword in the FROM clause:

```sql
-- Basic UDTF call
SELECT * FROM TABLE(my_udtf('argument'));

-- Joining UDTF with a table
SELECT t.id, f.output_column
FROM my_table t, TABLE(my_udtf(t.input_column)) f;

-- With partitioning
SELECT * FROM my_table,
  TABLE(my_udtf(column1, column2)
    OVER (PARTITION BY category ORDER BY date));
```

### UDTF Partitioning

Partitioning allows grouping rows for processing:

```sql
-- Process rows grouped by symbol
SELECT * FROM stocks,
  TABLE(analyze_stock(symbol, price, volume)
    OVER (PARTITION BY symbol));

-- Empty OVER() processes all rows as single partition
SELECT * FROM data,
  TABLE(aggregate_udtf(value) OVER ());
```

---

## Section 6: Secure UDFs

### What Makes a UDF Secure?

Secure UDFs restrict visibility of implementation details to only users with the owning role. This provides data privacy when the function accesses sensitive data.

```sql
-- Creating a secure UDF
CREATE OR REPLACE SECURE FUNCTION mask_ssn(ssn VARCHAR)
  RETURNS VARCHAR
  AS $$ 'XXX-XX-' || RIGHT(ssn, 4) $$;

-- Making existing UDF secure
ALTER FUNCTION my_function(VARCHAR) SET SECURE;
```

### Secure UDF Visibility

| Detail | Visible to Non-Owners |
|--------|----------------------|
| Function body/code | No |
| Import paths | No |
| Handler name | No |
| Packages list | No |
| Parameter types | Yes |
| Return type | Yes |
| Handler language | Yes |
| NULL handling | Yes |
| Volatility | Yes |

### When to Use Secure UDFs

**Use Secure UDFs when:**
- Function provides access to sensitive data
- Implementation logic must be protected
- Preventing users from deducing data through function behavior

**Do NOT use Secure UDFs when:**
- Function is for query convenience only
- No sensitive data exposure concerns
- Performance is critical (secure UDFs bypass optimizations)

### Secure UDF Performance Trade-off

**Important:** Secure UDFs bypass query optimizer optimizations like pushdown. Regular UDF optimizations can expose underlying data through programmatic probing, which secure UDFs prevent.

**Exam Tip:** Questions may test whether you understand that secure UDFs can reduce performance due to disabled optimizations.

### Verify Secure Status

```sql
SHOW FUNCTIONS;
-- Check IS_SECURE column: 'Y' = secure, 'N' = not secure
```

---

## Section 7: Access Control and Privileges

### Required Privileges Summary

| Operation | Database | Schema | Stage | Function |
|-----------|----------|--------|-------|----------|
| **Create UDF** | USAGE | USAGE, CREATE FUNCTION | USAGE/READ* | - |
| **Own UDF** | USAGE | USAGE | USAGE/READ* | OWNERSHIP |
| **Execute UDF** | USAGE | USAGE | USAGE/READ* | USAGE |

*Stage privileges required only if function depends on staged files

### Granting UDF Privileges

```sql
-- Grant USAGE to execute the function
GRANT USAGE ON FUNCTION my_udf(NUMBER, NUMBER) TO ROLE analyst_role;

-- Grant OWNERSHIP
GRANT OWNERSHIP ON FUNCTION my_udf(NUMBER, NUMBER) TO ROLE dev_role;

-- Note: Function signature (name + parameter types) required
```

### Security Benefit: Privilege Separation

UDF callers need only USAGE privilege on the function. They do NOT need access to underlying objects referenced within the function:

```sql
-- Admin creates function accessing sensitive table
CREATE FUNCTION get_total_salary(dept VARCHAR)
  RETURNS NUMBER
  AS $$
    SELECT SUM(salary) FROM employee_salaries WHERE department = dept
  $$;

-- User can execute function without SELECT on employee_salaries
GRANT USAGE ON FUNCTION get_total_salary(VARCHAR) TO ROLE reporting;
```

---

## Section 8: External Functions

### What are External Functions?

External functions call code that executes **outside Snowflake**, typically through cloud service APIs (AWS Lambda, Azure Functions, Google Cloud Functions).

```sql
-- External function definition (simplified)
CREATE EXTERNAL FUNCTION sentiment_analysis(text VARCHAR)
  RETURNS VARIANT
  API_INTEGRATION = my_api_integration
  AS 'https://my-api-gateway.com/sentiment';
```

### External Function Components

1. **Remote Service:** The actual code running outside Snowflake (any language)
2. **Proxy Service:** API Gateway relaying requests (AWS API Gateway, Azure API Management)
3. **API Integration:** Snowflake object storing authentication credentials

### External Functions vs. UDFs

| Aspect | External Functions | Regular UDFs |
|--------|-------------------|--------------|
| **Code Location** | Outside Snowflake | Within Snowflake |
| **Languages** | Any language | SQL, JS, Python, Java, Scala |
| **Libraries** | Unrestricted | Snowflake-supported only |
| **Performance** | Higher latency | Lower latency |
| **Data Sharing** | Cannot share | SQL/JS can share |
| **Return Type** | Scalar only | Scalar, table, aggregate |
| **Setup Complexity** | High (cloud setup) | Low |

### External Function Limitations

- **Scalar only:** Must return one value per row
- **Cannot be shared** via Secure Data Sharing
- **10 MB response limit** per batch
- **Latency overhead** from network calls
- **Additional costs** from cloud providers

---

## Section 9: UDF Design Considerations

### Handler Code Location

| Location | Best For | Languages |
|----------|---------|-----------|
| **Inline** | Simple functions, quick iteration | All |
| **Staged** | Complex code, shared libraries | Python, Java, Scala |

### NULL Handling Options

```sql
-- Default: function called even with NULL arguments
CREATE FUNCTION my_func(x NUMBER)
  RETURNS NUMBER
  CALLED ON NULL INPUT
  AS $$ x * 2 $$;

-- Return NULL if any argument is NULL
CREATE FUNCTION my_func(x NUMBER)
  RETURNS NUMBER
  RETURNS NULL ON NULL INPUT  -- or STRICT
  AS $$ x * 2 $$;
```

### Immutability for Performance

```sql
-- IMMUTABLE: same inputs always produce same outputs
-- Enables caching and optimization
CREATE FUNCTION celsius_to_fahrenheit(c FLOAT)
  RETURNS FLOAT
  IMMUTABLE
  AS $$ c * 9/5 + 32 $$;
```

### Memoizable Functions

SQL scalar UDFs can be memoizable for caching results:

**Requirements:**
- Arguments must be constant VARCHAR, NUMBER, TIMESTAMP, or BOOLEAN
- Cannot reference other memoizable functions
- 10 KB cache limit per session
- Cache invalidates when underlying tables change

---

## Section 10: Best Practices

### Performance Optimization

1. **Choose appropriate language:**
   - SQL for simple expressions (fastest)
   - JavaScript for string/JSON processing
   - Python for ML and analytics with libraries
   - Java/Scala for enterprise libraries

2. **Use IMMUTABLE when applicable** to enable caching

3. **Consider vectorized UDFs** for batch operations in Python

4. **Minimize external calls** (external functions add latency)

5. **Initialize resources once** in `__init__` or `initialize()` methods

### Security Best Practices

1. **Use SECURE keyword** for functions accessing sensitive data

2. **Avoid exposing sequence-generated IDs** (use UUID_STRING instead)

3. **Test with CURRENT_ROLE and CURRENT_USER** - these return NULL for shared data consumers

4. **Match data types** between columns, UDFs, and masking policies

### Code Organization

1. **Use `$$` delimiters** to avoid escaping issues

2. **Stage complex code** in JAR/Python files for maintainability

3. **Document functions** with COMMENT clause

4. **Use consistent naming conventions** across UDFs

---

## Section 11: Exam Tips and Common Questions

### Key Concepts to Remember

1. **UDFs return values; stored procedures perform operations**
   - Question: "What should you use to calculate a tax rate?" Answer: UDF
   - Question: "What should you use to archive old data?" Answer: Stored Procedure

2. **TABLE() keyword is required for UDTFs**
   ```sql
   SELECT * FROM TABLE(my_udtf(args))  -- Correct
   SELECT * FROM my_udtf(args)         -- Error
   ```

3. **Shareable languages:** Only SQL and JavaScript UDFs can be shared via Secure Data Sharing

4. **Secure UDFs hide implementation but reduce performance**

5. **Python vectorized UDFs** use Pandas DataFrames for batch processing

6. **External functions** require API Integration and run outside Snowflake

### Common Exam Question Patterns

**Pattern 1: Choosing UDF vs. Stored Procedure**
> "A developer needs to create reusable logic that transforms product codes in a SELECT statement..."
- Answer: UDF (used in SELECT expressions)

**Pattern 2: Language Selection**
> "A data scientist needs to use scikit-learn for predictions..."
- Answer: Python UDF with PACKAGES clause

**Pattern 3: Security Considerations**
> "How can you prevent users from viewing function source code?"
- Answer: Create as SECURE function

**Pattern 4: UDTF Invocation**
> "How do you call a table function?"
- Answer: `SELECT * FROM TABLE(function_name(args))`

**Pattern 5: Privilege Requirements**
> "What privilege allows a user to execute a UDF?"
- Answer: USAGE on the function

**Pattern 6: Data Sharing Limitations**
> "Which UDF types can be shared?"
- Answer: SQL and JavaScript only (not Python, Java, Scala)

### Quick Reference: Limits

| Limit | Value |
|-------|-------|
| Input arguments (scalar UDF) | 500 |
| Input arguments (UDTF) | 500 |
| Output columns (UDTF) | 500 |
| JavaScript source size | ~100 KB compressed |
| UDAF aggregate_state size | 64 MB |
| External function response | 10 MB per batch |
| Memoizable function cache | 10 KB per session |

---

## Summary

User-Defined Functions are essential for extending Snowflake's capabilities:

- **Scalar UDFs** return single values per row
- **UDTFs** return tabular results using `TABLE()` syntax
- **UDAFs** aggregate across rows (Python only)
- **Vectorized UDFs** process Pandas DataFrames for performance
- **Five languages supported:** SQL, JavaScript, Python, Java, Scala
- **SECURE keyword** protects implementation but impacts performance
- **External functions** call code outside Snowflake via API integrations
- Only **SQL and JavaScript** UDFs can be shared via Secure Data Sharing

Understanding when to use each UDF type, which language to choose, and the security/performance trade-offs will help you succeed on the SnowPro Core exam.
