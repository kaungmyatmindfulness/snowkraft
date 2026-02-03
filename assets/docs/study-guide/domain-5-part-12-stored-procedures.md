# Domain 5: Data Transformations

## Part 12: Stored Procedures

This section covers stored procedures in Snowflake, including creation syntax, supported programming languages, Snowflake Scripting, execution rights models, error handling, and returning results. Stored procedures are essential for encapsulating complex business logic, performing administrative tasks, and creating reusable code blocks. Understanding the differences between stored procedures and UDFs, as well as caller's rights vs owner's rights execution models, is critical for the SnowPro Core exam.

---

## 1. Introduction to Stored Procedures

### 1.1 What is a Stored Procedure?

A **stored procedure** is a named collection of SQL statements with optional procedural logic that can be stored and executed in Snowflake. Unlike User-Defined Functions (UDFs), stored procedures are designed to **perform actions** rather than just return values.

**Key Characteristics:**
- Schema-level database objects (created within a specific database and schema)
- Modularize commonly executed administrative tasks
- Can perform both DDL (CREATE, ALTER, DROP) and DML (INSERT, UPDATE, DELETE) operations
- May or may not return a value
- Invoked using the **CALL** command (not part of SELECT statements)
- Support multiple programming languages

**Use Cases:**
- Data processing and ETL workflows
- Administrative automation (cleanup, archiving)
- Complex business logic encapsulation
- Scheduled maintenance tasks
- Controlled access to sensitive operations

**Nesting:** Stored procedures can call other stored procedures (nesting). A procedure can also call itself recursively in all supported languages.

### 1.2 Stored Procedures vs User-Defined Functions (UDFs)

| Feature | Stored Procedures | UDFs |
|---------|-------------------|------|
| **Primary Purpose** | Perform actions | Return calculated values |
| **Invocation** | CALL command (standalone) | Part of SQL expressions (SELECT) |
| **Return Value** | Optional | Required |
| **Return Value Usage** | Cannot be used directly in SQL | Can be used in queries |
| **DDL/DML Operations** | Fully supported | Limited (side effects discouraged) |
| **Snowflake JavaScript API** | Yes | No |
| **Recursive Capability** | Yes (all languages) | JavaScript only |
| **Execution Rights** | Caller's OR Owner's | Owner's rights ONLY |
| **Can be Overloaded** | Yes | Yes |

**Key Exam Point:** UDFs always run with owner's rights. Stored procedures can be configured to run with either owner's rights (default) or caller's rights.

---

## 2. Supported Programming Languages

Snowflake supports five languages for creating stored procedures:

### 2.1 Language Overview

| Language | Use Cases | Key Features |
|----------|-----------|--------------|
| **SQL (Snowflake Scripting)** | Simple procedural logic, SQL-native workflows | Native SQL, no external dependencies |
| **JavaScript** | Complex logic, established ecosystem | First supported language, built-in API |
| **Python** | Data science, ML integration | Anaconda packages available |
| **Java** | Enterprise applications, JVM ecosystem | Runs in JVM sandbox |
| **Scala** | Functional programming, JVM compatibility | Runs in JVM sandbox |

**Mnemonic to Remember Languages:** "**J**ust **J**oin **P**ython **S**cala **S**QL" (JavaScript, Java, Python, Scala, SQL)

**Handler Code Deployment:**

| Language | Inline Code | Staged Code (JAR/Python files) |
|----------|-------------|-------------------------------|
| **SQL (Snowflake Scripting)** | ✅ Yes | ❌ No |
| **JavaScript** | ✅ Yes | ❌ No |
| **Python** | ✅ Yes | ✅ Yes |
| **Java** | ✅ Yes | ✅ Yes |
| **Scala** | ✅ Yes | ✅ Yes |

**Key Point:** JavaScript and SQL Scripting require inline code only. Java, Python, and Scala support both inline code and pre-compiled files uploaded to a stage.

**Languages NOT Supported:**
- Go
- C#
- Swift
- C++
- Ruby

### 2.2 SQL (Snowflake Scripting)

Snowflake Scripting extends SQL with procedural programming capabilities:

```sql
CREATE OR REPLACE PROCEDURE calculate_totals(table_name VARCHAR)
RETURNS VARCHAR
LANGUAGE SQL
AS
DECLARE
  row_count INTEGER;
  total_amount FLOAT;
BEGIN
  -- Dynamic SQL using table_name parameter
  SELECT COUNT(*), SUM(amount) INTO :row_count, :total_amount
  FROM IDENTIFIER(:table_name);

  RETURN 'Processed ' || row_count || ' rows, total: ' || total_amount;
END;
```

**Key Features of Snowflake Scripting:**
- DECLARE section for variable declarations
- BEGIN/END execution block
- EXCEPTION section for error handling (optional)
- FOR, WHILE, REPEAT, LOOP constructs
- IF/ELSE, CASE branching
- Cursors and result sets for iteration

### 2.3 JavaScript

JavaScript was the first language supported for stored procedures:

```sql
CREATE OR REPLACE PROCEDURE process_orders(days_old INTEGER)
RETURNS STRING
LANGUAGE JAVASCRIPT
EXECUTE AS OWNER
AS
$$
  // JavaScript code with Snowflake API access
  var sql_stmt = `DELETE FROM orders WHERE created_at < DATEADD('day', -${DAYS_OLD}, CURRENT_DATE())`;
  var statement = snowflake.createStatement({sqlText: sql_stmt});
  var result = statement.execute();

  return "Cleanup completed successfully";
$$;
```

**JavaScript Procedure Features:**
- Access to Snowflake JavaScript API
- `snowflake.execute()` - Execute SQL statements
- `snowflake.createStatement()` - Create reusable statement objects
- ResultSet objects for iterating over results
- Can call itself recursively
- **Cannot** include external libraries

### 2.4 Python

Python procedures leverage Snowflake's curated Anaconda packages:

```sql
CREATE OR REPLACE PROCEDURE analyze_sentiment(text_column VARCHAR)
RETURNS VARIANT
LANGUAGE PYTHON
RUNTIME_VERSION = '3.8'
PACKAGES = ('snowflake-snowpark-python', 'pandas')
HANDLER = 'main'
AS
$$
def main(session, text_column):
    import pandas as pd

    # Use Snowpark for data operations
    df = session.table("reviews")
    results = df.select(text_column).to_pandas()

    # Process data
    return {"processed_rows": len(results)}
$$;
```

**Python Procedure Features:**
- Access to Snowflake's curated Anaconda packages
- Snowpark integration for DataFrame operations
- Requires RUNTIME_VERSION and HANDLER specification
- Good for ML/data science workloads

### 2.5 Java and Scala

Both run in Snowflake's JVM sandbox:

```sql
-- Java procedure
CREATE OR REPLACE PROCEDURE java_hello(name STRING)
RETURNS STRING
LANGUAGE JAVA
RUNTIME_VERSION = '11'
HANDLER = 'MyHandler.greet'
AS
$$
public class MyHandler {
  public static String greet(String name) {
    return "Hello, " + name + "!";
  }
}
$$;

-- Scala procedure
CREATE OR REPLACE PROCEDURE scala_hello(name STRING)
RETURNS STRING
LANGUAGE SCALA
RUNTIME_VERSION = '2.12'
HANDLER = 'MyHandler.greet'
AS
$$
object MyHandler {
  def greet(name: String): String = s"Hello, $name!"
}
$$;
```

**JVM Procedure Features:**
- Support for Java 8, 9, 10, 11
- Can use inline code or pre-compiled JAR files
- Requires HANDLER parameter specifying class/method
- Standard Java/Scala libraries only

---

## 3. Snowflake Scripting in Depth

### 3.1 Block Structure

A Snowflake Scripting block has three sections:

```sql
DECLARE
  -- Variable declarations (optional)
  variable_name data_type [ DEFAULT expression ];
BEGIN
  -- Main execution block (required)
  SQL statements and procedural logic
EXCEPTION
  -- Error handling (optional)
  WHEN exception_name THEN
    handler_statements;
END;
```

**Important Notes:**
- Only BEGIN/END is mandatory; DECLARE and EXCEPTION are optional
- In SnowSQL and classic console, wrap blocks in `$$` delimiters
- Snowsight does not require delimiters for anonymous blocks

### 3.2 Variables and Assignment

```sql
DECLARE
  -- Explicit type declaration
  counter INTEGER DEFAULT 0;
  message VARCHAR;

  -- Using LET for type inference
  LET result := 'initial value';
BEGIN
  -- Assignment with colon-equals
  counter := counter + 1;

  -- Assignment from query
  SELECT MAX(amount) INTO :message FROM sales;

  RETURN message;
END;
```

**Variable Scope:**
- Variables declared in DECLARE are scoped to that block only
- Inner blocks can access outer block variables
- Variable names are case-insensitive

### 3.3 Control Flow Constructs

**Conditional Branching:**
```sql
BEGIN
  IF condition1 THEN
    statement1;
  ELSEIF condition2 THEN
    statement2;
  ELSE
    statement3;
  END IF;

  -- CASE expression
  CASE variable
    WHEN 'value1' THEN statement1;
    WHEN 'value2' THEN statement2;
    ELSE default_statement;
  END CASE;
END;
```

**Loops:**
```sql
BEGIN
  -- FOR loop with counter
  FOR i IN 1 TO 10 DO
    INSERT INTO log_table VALUES (i);
  END FOR;

  -- FOR loop with cursor
  FOR record IN cursor_name DO
    -- process record.column_name
  END FOR;

  -- WHILE loop
  WHILE counter < 100 DO
    counter := counter + 1;
  END WHILE;

  -- REPEAT loop (executes at least once)
  REPEAT
    counter := counter - 1;
  UNTIL counter <= 0
  END REPEAT;

  -- LOOP with EXIT
  LOOP
    IF done THEN
      BREAK;  -- or EXIT
    END IF;
    CONTINUE;  -- skip to next iteration
  END LOOP;
END;
```

### 3.4 Cursors and Result Sets

**Cursors** allow row-by-row iteration over query results:

```sql
DECLARE
  -- Declare cursor
  order_cursor CURSOR FOR
    SELECT order_id, customer_id FROM orders WHERE status = 'pending';
BEGIN
  -- Open and iterate
  FOR record IN order_cursor DO
    UPDATE orders SET status = 'processed' WHERE order_id = record.order_id;
  END FOR;
END;
```

**Result Sets** hold query results for later processing:

```sql
DECLARE
  result_set RESULTSET;
BEGIN
  -- Execute query when assigned
  result_set := (SELECT * FROM customers WHERE region = 'WEST');

  -- Return as table
  RETURN TABLE(result_set);
END;
```

**Key Difference:**
- **Cursors** execute when called (in the FOR loop)
- **Result Sets** execute when the query is assigned to the variable

---

## 4. Caller's Rights vs Owner's Rights

### 4.1 Understanding Execution Rights

The **EXECUTE AS** clause determines whose privileges are used when the procedure accesses database objects:

| Execution Model | Privileges Used | Session Context | Use Case |
|-----------------|-----------------|-----------------|----------|
| **EXECUTE AS OWNER** (default) | Procedure creator's | Creator's | Privilege encapsulation |
| **EXECUTE AS CALLER** | Procedure executor's | Caller's | User-specific operations |
| **EXECUTE AS RESTRICTED CALLER** | Caller's (limited) | Caller's | Caller's rights with restrictions |

**Note:** `EXECUTE AS RESTRICTED CALLER` is a caller's rights mode that may not run with all of the caller's privileges. It provides additional security constraints compared to regular caller's rights.

### 4.2 Owner's Rights (EXECUTE AS OWNER)

**Default behavior** - the procedure runs with the privileges of the role that owns it.

```sql
CREATE OR REPLACE PROCEDURE delete_old_records()
RETURNS VARCHAR
LANGUAGE SQL
EXECUTE AS OWNER  -- This is the default
AS
BEGIN
  -- Runs with OWNER's privileges
  -- Caller doesn't need DELETE privilege on sensitive_data
  DELETE FROM sensitive_data WHERE created_at < DATEADD('year', -7, CURRENT_DATE());
  RETURN 'Cleanup completed';
END;
```

**Benefits:**
- Callers only need USAGE privilege on the procedure
- Provides "privilege encapsulation" - hide sensitive operations
- Callers don't need direct access to underlying tables
- Ideal for administrative procedures

**Limitations:**
- Cannot access caller's session variables
- Cannot read most caller's session parameters (only ~30 whitelisted parameters)
- Session context is the owner's
- Cannot call `GET_DDL()` (prevents non-owner from viewing code)
- Cannot execute `SHOW PARAMETERS`
- Cannot perform `ALTER USER` statements implicitly using current user
- Cannot use `LIST` command (in JavaScript/Snowflake Scripting handlers only)
- Cannot query `INFORMATION_SCHEMA` functions returning user-specific results

### 4.3 Caller's Rights (EXECUTE AS CALLER)

The procedure runs with the privileges of the user executing it:

```sql
CREATE OR REPLACE PROCEDURE get_my_data()
RETURNS TABLE(id INT, name VARCHAR)
LANGUAGE SQL
EXECUTE AS CALLER  -- Must be explicitly specified
AS
BEGIN
  -- Runs with CALLER's privileges
  -- Can access caller's session context
  RETURN TABLE(
    SELECT id, name FROM user_data
    WHERE owner = CURRENT_USER()
  );
END;
```

**Benefits:**
- Caller's session context is available
- Can access caller's session variables and parameters
- User-specific operations based on CURRENT_USER()
- More transparent privilege model

**Requirements:**
- Caller must have necessary privileges on all accessed objects
- Must be explicitly specified with `EXECUTE AS CALLER`

### 4.4 Comparison Matrix

| Aspect | EXECUTE AS OWNER | EXECUTE AS CALLER | EXECUTE AS RESTRICTED CALLER |
|--------|------------------|-------------------|------------------------------|
| **Privileges** | Owner's | Caller's | Caller's (limited) |
| **Session Variables** | Owner's | Caller's | Caller's |
| **CURRENT_USER()** | Returns owner | Returns caller | Returns caller |
| **CURRENT_ROLE()** | Returns owner's role | Returns caller's role | Returns caller's role |
| **Object Access** | Uses owner's grants | Uses caller's grants | Uses caller's grants (restricted) |
| **Caller Requirements** | USAGE on procedure only | Privileges on all objects | Privileges on all objects |
| **Security Model** | Definer's rights | Invoker's rights | Invoker's rights (restricted) |

**Exam Trap:** UDFs always run with owner's rights. Only stored procedures support all three execution models (OWNER, CALLER, RESTRICTED CALLER).

---

## 5. Error Handling

### 5.1 Exception Handling Structure

```sql
DECLARE
  my_exception EXCEPTION (-20001, 'Custom error message');
BEGIN
  -- Main logic
  IF some_condition THEN
    RAISE my_exception;
  END IF;
EXCEPTION
  WHEN my_exception THEN
    RETURN 'Custom error occurred: ' || SQLERRM;
  WHEN STATEMENT_ERROR THEN
    RETURN 'SQL error: ' || SQLCODE || ' - ' || SQLERRM;
  WHEN OTHER THEN
    RETURN 'Unexpected error: ' || SQLERRM;
END;
```

### 5.2 Built-in Exceptions

| Exception | Description |
|-----------|-------------|
| **STATEMENT_ERROR** | Raised for SQL execution errors |
| **EXPRESSION_ERROR** | Raised for expression evaluation errors |
| **OTHER** | Catches any exception not explicitly handled |

### 5.3 Exception Functions

| Function | Description |
|----------|-------------|
| **SQLCODE** | Returns the error code of the last exception |
| **SQLERRM** | Returns the error message of the last exception |
| **SQLSTATE** | Returns the SQLSTATE code |

### 5.4 Custom Exceptions

```sql
DECLARE
  invalid_input EXCEPTION (-20100, 'Invalid input provided');
  processing_failed EXCEPTION (-20200, 'Processing failed');
BEGIN
  IF input_param IS NULL THEN
    RAISE invalid_input;
  END IF;

  -- ... processing logic ...

EXCEPTION
  WHEN invalid_input THEN
    INSERT INTO error_log VALUES (CURRENT_TIMESTAMP, 'Invalid input');
    RETURN NULL;
  WHEN processing_failed THEN
    -- Custom handling
    RAISE;  -- Re-raise the exception
END;
```

### 5.5 Important Notes on Error Handling

**Procedures do NOT automatically roll back on failure:**
- Each statement commits independently (auto-commit)
- For transaction control, use explicit BEGIN TRANSACTION / COMMIT / ROLLBACK
- Failed statements leave previously committed changes intact

```sql
BEGIN
  BEGIN TRANSACTION;
    INSERT INTO table1 VALUES (1);
    INSERT INTO table2 VALUES (2);
    -- If this fails, previous INSERT is NOT rolled back automatically
  COMMIT;
EXCEPTION
  WHEN OTHER THEN
    ROLLBACK;  -- Must explicitly rollback
    RAISE;
END;
```

---

## 6. Returning Results

### 6.1 Scalar Return Values

```sql
CREATE OR REPLACE PROCEDURE count_records(table_name VARCHAR)
RETURNS INTEGER
LANGUAGE SQL
AS
DECLARE
  rec_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO :rec_count FROM IDENTIFIER(:table_name);
  RETURN rec_count;
END;

-- Calling
CALL count_records('my_table');
-- Returns: 1000
```

### 6.2 Returning Tables (Tabular Results)

```sql
CREATE OR REPLACE PROCEDURE get_top_customers(limit_count INTEGER)
RETURNS TABLE(customer_id INT, total_purchases FLOAT)
LANGUAGE SQL
AS
DECLARE
  result_set RESULTSET;
BEGIN
  result_set := (
    SELECT customer_id, SUM(amount) as total_purchases
    FROM orders
    GROUP BY customer_id
    ORDER BY total_purchases DESC
    LIMIT :limit_count
  );
  RETURN TABLE(result_set);
END;

-- Calling
CALL get_top_customers(10);
-- Returns table with customer_id and total_purchases columns
```

### 6.3 Returning VARIANT (JSON)

```sql
CREATE OR REPLACE PROCEDURE get_stats()
RETURNS VARIANT
LANGUAGE SQL
AS
BEGIN
  RETURN OBJECT_CONSTRUCT(
    'total_rows', (SELECT COUNT(*) FROM data_table),
    'last_updated', CURRENT_TIMESTAMP(),
    'status', 'success'
  );
END;

-- Returns: {"total_rows": 5000, "last_updated": "2024-01-15...", "status": "success"}
```

### 6.4 Handling Procedure Output

**Important:** Procedure return values cannot be used directly in SQL expressions.

```sql
-- This does NOT work:
SELECT count_records('my_table');  -- Error!

-- Correct approaches:
CALL count_records('my_table');

-- Store in variable (within another procedure)
DECLARE
  result INTEGER;
BEGIN
  CALL count_records('my_table') INTO :result;
END;
```

---

## 7. Creating and Managing Stored Procedures

### 7.1 CREATE PROCEDURE Syntax

```sql
CREATE [ OR REPLACE ] [ TEMP | TEMPORARY ] [ SECURE ] PROCEDURE procedure_name (
    [ parameter_name parameter_type [ DEFAULT default_value ] ]
    [, ...]
)
[ COPY GRANTS ]
RETURNS { data_type | TABLE ( column_name column_type [, ...] ) }
[ NOT NULL ]
LANGUAGE { SQL | JAVASCRIPT | PYTHON | JAVA | SCALA }
[ RUNTIME_VERSION = 'version' ]      -- For Python, Java, Scala
[ PACKAGES = ( 'package_name', ... ) ] -- For Python
[ HANDLER = 'handler_name' ]         -- For Python, Java, Scala
[ EXECUTE AS { CALLER | OWNER | RESTRICTED CALLER } ]
[ COMMENT = 'comment_string' ]
AS
procedure_body
;
```

**Important Notes:**
- `SECURE` keyword is available for Java, JavaScript, Python, and Scala procedures only (NOT for SQL/Snowflake Scripting)
- `TEMP`/`TEMPORARY` creates session-scoped procedures that auto-drop after the session ends
- `COPY GRANTS` preserves existing grants when using `CREATE OR REPLACE`

### 7.2 Granting Procedure Privileges

```sql
-- Grant execute privilege
GRANT USAGE ON PROCEDURE my_procedure(VARCHAR, INTEGER) TO ROLE analyst;

-- For owner's rights procedures, this is all that's needed
-- Caller doesn't need privileges on underlying objects

-- For caller's rights procedures, also grant object access
GRANT SELECT ON TABLE source_table TO ROLE analyst;
```

### 7.3 Viewing Procedure Information

```sql
-- List procedures
SHOW PROCEDURES;
SHOW PROCEDURES LIKE 'my_%';

-- View procedure definition
DESCRIBE PROCEDURE my_procedure(VARCHAR, INTEGER);

-- Check if procedure is secure
SHOW PROCEDURES LIKE 'my_procedure';
-- Look at IS_SECURE column in results
```

### 7.4 Dropping and Altering Procedures

```sql
-- Drop procedure (must include argument types for overloaded procedures)
DROP PROCEDURE my_procedure(VARCHAR);
DROP PROCEDURE IF EXISTS my_procedure(VARCHAR, INTEGER);

-- Rename procedure
ALTER PROCEDURE my_procedure(VARCHAR) RENAME TO new_procedure_name;

-- Change execution rights (requires recreation)
CREATE OR REPLACE PROCEDURE my_procedure(...)
EXECUTE AS CALLER  -- Changed from OWNER
AS ...;
```

---

## 8. Anonymous Blocks

### 8.1 What are Anonymous Blocks?

Anonymous blocks are Snowflake Scripting code that executes immediately without being stored as a procedure.

```sql
-- Anonymous block - executes immediately
DECLARE
  result VARCHAR;
BEGIN
  result := 'Hello from anonymous block!';
  RETURN result;
END;
```

**Key Differences from Stored Procedures:**
- No CREATE PROCEDURE statement needed
- No CALL statement required
- Executes immediately when submitted
- Not stored for reuse
- Perfect for testing logic before creating a procedure

### 8.2 Use Cases for Anonymous Blocks

```sql
-- One-time data cleanup
BEGIN
  DELETE FROM temp_data WHERE created_at < DATEADD('day', -30, CURRENT_DATE());

  UPDATE statistics SET last_cleanup = CURRENT_TIMESTAMP();

  RETURN 'Cleanup completed';
END;

-- Testing procedure logic
DECLARE
  test_input VARCHAR := 'test_value';
  result VARCHAR;
BEGIN
  -- Test your logic here before wrapping in CREATE PROCEDURE
  IF test_input IS NOT NULL THEN
    result := 'Valid input: ' || test_input;
  ELSE
    result := 'Invalid input';
  END IF;

  RETURN result;
END;
```

---

## 9. Best Practices

### 9.1 Security Best Practices

1. **Use owner's rights for administrative tasks** that require elevated privileges
2. **Use caller's rights for user-specific operations** where users should only access their own data
3. **Grant USAGE on procedures** rather than direct object access when possible
4. **Avoid dynamic SQL** with user input to prevent SQL injection
5. **Validate all input parameters** before processing

### 9.2 Performance Best Practices

1. **Minimize round trips** - batch operations when possible
2. **Use appropriate data types** for parameters and return values
3. **Avoid cursors for bulk operations** - use set-based SQL instead
4. **Consider warehouse size** for memory-intensive Python/Java procedures
5. **Use transactions appropriately** - explicit transaction control when needed

### 9.3 Code Organization

1. **Use meaningful procedure names** that describe the action
2. **Document with COMMENT** clause
3. **Handle errors explicitly** - don't rely on auto-rollback
4. **Log important operations** for auditing
5. **Version procedures** using naming conventions or separate schemas

---

## 10. Exam Tips and Common Question Patterns

### 10.1 Key Facts to Remember

| Topic | Key Point |
|-------|-----------|
| **Invocation** | CALL command, not SELECT |
| **Languages** | SQL, JavaScript, Python, Java, Scala |
| **Default Execution** | EXECUTE AS OWNER |
| **UDF vs Procedure Rights** | UDFs = owner's only; Procedures = configurable |
| **Return Value** | Optional for procedures, required for UDFs |
| **DDL/DML** | Fully supported in procedures |
| **Auto-rollback** | Does NOT happen; must use explicit transactions |
| **JavaScript API** | Only available in procedures, not UDFs |
| **Recursive calls** | Supported in all languages (procedures); JavaScript only (UDFs) |
| **SECURE keyword** | Java, JavaScript, Python, Scala can be SECURE; SQL (Snowflake Scripting) cannot |

### 10.2 Common Exam Question Patterns

**Question Pattern 1: How to invoke a stored procedure?**
- Answer: CALL procedure_name(arguments)
- Not: SELECT, EXECUTE, RUN

**Question Pattern 2: What is the default execution context?**
- Answer: EXECUTE AS OWNER
- Callers only need USAGE on the procedure

**Question Pattern 3: Which languages are supported?**
- Answer: SQL, JavaScript, Python, Java, Scala
- Not: Go, C#, Swift, C++

**Question Pattern 4: UDF vs Stored Procedure execution rights?**
- UDFs: Always owner's rights
- Procedures: Configurable (caller's or owner's)

**Question Pattern 5: What happens on error?**
- Procedures do NOT automatically rollback
- Must use explicit ROLLBACK in EXCEPTION handler

**Question Pattern 6: What can procedures do that UDFs cannot?**
- Perform DDL operations
- Use Snowflake JavaScript API
- Run with caller's rights
- Not return a value

### 10.3 Tricky Scenarios

**Scenario 1:** User A creates a procedure with EXECUTE AS OWNER that deletes from TABLE_X. User B (who has no access to TABLE_X) is granted USAGE on the procedure. Can User B run it?
- **Answer:** Yes - the procedure runs with User A's privileges

**Scenario 2:** A procedure fails midway through multiple INSERT statements. What happens to the committed INSERTs?
- **Answer:** They remain committed. Snowflake does not auto-rollback.

**Scenario 3:** You want a procedure to access the caller's session variables. Which execution mode should you use?
- **Answer:** EXECUTE AS CALLER

---

## 11. Practice Questions

### Question 1
Which command is used to execute a stored procedure in Snowflake?

A) SELECT procedure_name()
B) CALL procedure_name()
C) EXECUTE procedure_name()
D) RUN procedure_name()

<details>
<summary>Show Answer</summary>

**Answer: B) CALL procedure_name()**

Stored procedures are invoked using the CALL command. Unlike UDFs, they cannot be called within SELECT statements.
</details>

### Question 2
What is the default execution context for stored procedures in Snowflake?

A) EXECUTE AS CALLER
B) EXECUTE AS OWNER
C) EXECUTE AS ADMIN
D) EXECUTE AS PUBLIC

<details>
<summary>Show Answer</summary>

**Answer: B) EXECUTE AS OWNER**

By default, stored procedures run with the privileges of the procedure's owner. This enables privilege encapsulation where callers only need USAGE on the procedure.
</details>

### Question 3
Which of the following languages can be used to create stored procedures in Snowflake? (Select ALL that apply)

A) JavaScript
B) Python
C) Go
D) Java
E) C#

<details>
<summary>Show Answer</summary>

**Answer: A, B, D**

Snowflake supports JavaScript, Python, Java, Scala, and SQL (Snowflake Scripting) for stored procedures. Go and C# are not supported.
</details>

### Question 4
What happens when a stored procedure encounters an error without explicit exception handling?

A) All statements are automatically rolled back
B) Only the failed statement is rolled back; previous statements remain committed
C) The entire transaction is paused for manual intervention
D) The procedure continues execution ignoring the error

<details>
<summary>Show Answer</summary>

**Answer: B) Only the failed statement is rolled back; previous statements remain committed**

Snowflake procedures do not automatically rollback on failure. Each statement commits independently unless explicit transaction control is used.
</details>

### Question 5
A user needs to create a procedure that allows callers to access objects they don't normally have privileges on. Which execution context should be used?

A) EXECUTE AS CALLER
B) EXECUTE AS OWNER
C) EXECUTE AS DEFINER
D) EXECUTE AS INVOKER

<details>
<summary>Show Answer</summary>

**Answer: B) EXECUTE AS OWNER**

Owner's rights (EXECUTE AS OWNER) allows the procedure to run with the creator's privileges, enabling callers to perform operations they couldn't do directly. This is the default behavior.
</details>

### Question 6
Which statement about UDFs and stored procedures is TRUE?

A) Both UDFs and stored procedures can run with caller's rights
B) UDFs always run with owner's rights; stored procedures can use either
C) Stored procedures always run with owner's rights; UDFs can use either
D) Both always run with caller's rights

<details>
<summary>Show Answer</summary>

**Answer: B) UDFs always run with owner's rights; stored procedures can use either**

This is a key distinction. UDFs are restricted to owner's rights only, while stored procedures support both EXECUTE AS OWNER and EXECUTE AS CALLER.
</details>

---

## 12. Summary

Stored procedures in Snowflake are powerful schema-level objects for encapsulating business logic and administrative tasks. Key takeaways:

1. **Five supported languages:** SQL (Snowflake Scripting), JavaScript, Python, Java, Scala
2. **CALL command** for invocation (not SELECT)
3. **EXECUTE AS OWNER** is the default execution context
4. **Procedures can perform DDL/DML** operations unlike UDFs
5. **No automatic rollback** on failure - use explicit transaction control
6. **Snowflake Scripting** uses DECLARE/BEGIN/EXCEPTION/END structure
7. **Anonymous blocks** execute immediately without storage
8. **Return values are optional** and cannot be used directly in SQL expressions

Understanding the differences between caller's rights and owner's rights, along with the distinction between stored procedures and UDFs, is essential for the SnowPro Core exam.
