# Domain 5: Data Transformations
## Part 1: DML Operations (INSERT, UPDATE, DELETE, MERGE)

**Exam Weight:** This topic is part of Domain 5 (20-25% of exam)

---

## Overview

Data Manipulation Language (DML) operations are fundamental to managing data in Snowflake tables. Understanding the syntax, behavior, and best practices for INSERT, UPDATE, DELETE, MERGE, and TRUNCATE is essential for the SnowPro Core exam. These operations affect how data is stored, how Time Travel works, and how streams track changes.

---

## Section 1: INSERT Statement

### Basic INSERT Syntax

The INSERT statement adds new rows to a table. Snowflake supports multiple variations:

```sql
-- Insert using VALUES syntax (single row)
INSERT INTO table_name (column1, column2, column3)
VALUES ('value1', 'value2', 'value3');

-- Insert using VALUES syntax (multiple rows)
INSERT INTO table_name (column1, column2, column3)
VALUES
    ('value1a', 'value2a', 'value3a'),
    ('value1b', 'value2b', 'value3b'),
    ('value1c', 'value2c', 'value3c');

-- Insert without specifying columns (must match table structure)
INSERT INTO table_name
VALUES ('value1', 'value2', 'value3');
```

### INSERT with SELECT

```sql
-- Insert from another table
INSERT INTO target_table (col1, col2, col3)
SELECT col1, col2, col3
FROM source_table
WHERE condition;

-- Insert all columns from source (tables must be structurally compatible)
INSERT INTO target_table
SELECT * FROM source_table;

-- Insert with transformations
INSERT INTO target_table (id, name, created_date)
SELECT
    id,
    UPPER(name),
    CURRENT_DATE()
FROM source_table;
```

### INSERT OVERWRITE

**Key Exam Concept:** INSERT OVERWRITE truncates the target table and inserts new rows in a single atomic transaction.

```sql
-- Truncate and replace all data atomically
INSERT OVERWRITE INTO target_table
SELECT * FROM source_table;

-- Practical example: Refresh a snapshot table
INSERT OVERWRITE INTO sales_snapshot
SELECT * FROM sales_staging
WHERE snapshot_date = CURRENT_DATE();
```

| Aspect | INSERT | INSERT OVERWRITE |
|--------|--------|------------------|
| **Behavior** | Appends rows | Truncates then inserts |
| **Transaction** | Single operation | Single atomic operation |
| **Use case** | Incremental loads | Full refresh/replace |
| **Table structure** | Preserved | Preserved |
| **Existing data** | Retained | Removed |

### INSERT with Column Omission

When columns are omitted, Snowflake uses default values or NULL:

```sql
-- Table with defaults
CREATE TABLE employees (
    id NUMBER AUTOINCREMENT,
    name VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
    status VARCHAR DEFAULT 'ACTIVE'
);

-- Insert omitting columns with defaults
INSERT INTO employees (name)
VALUES ('John Smith');
-- id: auto-generated, created_at: current timestamp, status: 'ACTIVE'
```

### INSERT with Sequences and AUTOINCREMENT

```sql
-- Using a sequence
CREATE SEQUENCE order_seq START = 1 INCREMENT = 1;

INSERT INTO orders (order_id, customer_name)
VALUES (order_seq.NEXTVAL, 'Customer A');

-- Using AUTOINCREMENT column
CREATE TABLE users (
    id NUMBER AUTOINCREMENT START 1 INCREMENT 1,
    username VARCHAR
);

INSERT INTO users (username) VALUES ('alice'), ('bob');
-- IDs are automatically generated: 1, 2
```

---

## Section 2: UPDATE Statement

### Basic UPDATE Syntax

```sql
-- Update specific rows
UPDATE table_name
SET column1 = 'new_value'
WHERE condition;

-- Update multiple columns
UPDATE employees
SET
    salary = salary * 1.10,
    last_review_date = CURRENT_DATE(),
    status = 'REVIEWED'
WHERE department = 'Engineering';

-- Update with NULL
UPDATE customers
SET phone_number = NULL
WHERE customer_id = 12345;
```

### UPDATE with Subquery

```sql
-- Update using values from another table
UPDATE target_table t
SET t.column1 = (
    SELECT s.value
    FROM source_table s
    WHERE s.id = t.id
)
WHERE EXISTS (
    SELECT 1
    FROM source_table s
    WHERE s.id = t.id
);

-- Update with correlated subquery
UPDATE orders o
SET total_amount = (
    SELECT SUM(quantity * unit_price)
    FROM order_items oi
    WHERE oi.order_id = o.order_id
);
```

### UPDATE with JOIN (FROM Clause)

```sql
-- Update using JOIN syntax
UPDATE target_table t
SET t.status = s.new_status,
    t.updated_at = CURRENT_TIMESTAMP()
FROM source_table s
WHERE t.id = s.id
  AND s.effective_date <= CURRENT_DATE();
```

### UPDATE Behavior and Streams

**Key Exam Concept:** When a stream tracks a table, UPDATE operations appear as a DELETE followed by an INSERT (with METADATA$ISUPDATE = TRUE).

```sql
-- In stream output for an UPDATE:
-- Row with old values: METADATA$ACTION = 'DELETE', METADATA$ISUPDATE = TRUE
-- Row with new values: METADATA$ACTION = 'INSERT', METADATA$ISUPDATE = TRUE
```

---

## Section 3: DELETE Statement

### Basic DELETE Syntax

```sql
-- Delete specific rows
DELETE FROM table_name
WHERE condition;

-- Delete all rows matching condition
DELETE FROM orders
WHERE order_date < '2020-01-01';

-- Delete with subquery
DELETE FROM customers
WHERE customer_id NOT IN (
    SELECT DISTINCT customer_id
    FROM orders
    WHERE order_date >= DATEADD(year, -2, CURRENT_DATE())
);
```

### DELETE with USING Clause

```sql
-- Delete using another table for filtering
DELETE FROM target_table t
USING source_table s
WHERE t.id = s.id
  AND s.status = 'INACTIVE';

-- Multiple tables in USING
DELETE FROM orders o
USING customers c, regions r
WHERE o.customer_id = c.customer_id
  AND c.region_id = r.region_id
  AND r.region_name = 'Discontinued';
```

### DELETE vs TRUNCATE

| Aspect | DELETE | TRUNCATE |
|--------|--------|----------|
| **Syntax** | `DELETE FROM table WHERE...` | `TRUNCATE TABLE table` |
| **Row selection** | Can use WHERE clause | Removes ALL rows |
| **Time Travel** | Creates change records | Creates change records |
| **Recovery** | Recoverable via Time Travel | Recoverable via Time Travel |
| **Performance** | Slower (row-by-row) | Faster (metadata operation) |
| **Triggers streams** | Yes | Yes |
| **Transaction log** | Logs each row | Logs single operation |

```sql
-- TRUNCATE syntax
TRUNCATE TABLE table_name;

-- TRUNCATE is equivalent to DELETE without WHERE
-- But more efficient for removing all rows
```

### DELETE and Storage

**Important:** DELETE and TRUNCATE do not immediately free storage. Deleted data is retained for Time Travel and Fail-safe periods.

```sql
-- Check storage usage
SELECT
    TABLE_NAME,
    ACTIVE_BYTES,
    TIME_TRAVEL_BYTES,
    FAILSAFE_BYTES
FROM INFORMATION_SCHEMA.TABLE_STORAGE_METRICS
WHERE TABLE_NAME = 'MY_TABLE';
```

---

## Section 4: MERGE Statement (UPSERT)

### MERGE Overview

MERGE combines INSERT, UPDATE, and DELETE operations in a single statement. It is commonly used for UPSERT (Update or Insert) patterns.

**Key Exam Concept:** MERGE is the most efficient way to synchronize data between tables.

### Basic MERGE Syntax

```sql
MERGE INTO target_table t
USING source_table s
ON t.id = s.id
WHEN MATCHED THEN
    UPDATE SET t.column1 = s.column1, t.column2 = s.column2
WHEN NOT MATCHED THEN
    INSERT (id, column1, column2)
    VALUES (s.id, s.column1, s.column2);
```

### MERGE with All Clauses

```sql
MERGE INTO target_table t
USING source_table s
ON t.id = s.id

-- Update when matched and condition is true
WHEN MATCHED AND s.action = 'UPDATE' THEN
    UPDATE SET
        t.name = s.name,
        t.amount = s.amount,
        t.updated_at = CURRENT_TIMESTAMP()

-- Delete when matched and condition is true
WHEN MATCHED AND s.action = 'DELETE' THEN
    DELETE

-- Insert when not matched
WHEN NOT MATCHED AND s.action != 'DELETE' THEN
    INSERT (id, name, amount, created_at)
    VALUES (s.id, s.name, s.amount, CURRENT_TIMESTAMP());
```

### MERGE Clause Order and Restrictions

A single MERGE statement can include **multiple** matching and not-matching clauses. Both WHEN MATCHED and WHEN NOT MATCHED support multiple instances.

| Clause | Description | Limit |
|--------|-------------|-------|
| `WHEN MATCHED ... UPDATE` | Update existing rows | Multiple allowed (with different AND conditions) |
| `WHEN MATCHED ... DELETE` | Delete existing rows | Multiple allowed (with different AND conditions) |
| `WHEN NOT MATCHED ... INSERT` | Insert new rows | Multiple allowed (with different AND conditions) |

**Ordering constraint:** A clause **without** an AND sub-clause must be the **last** clause of its type. This prevents unreachable cases. For example, a bare `WHEN NOT MATCHED THEN INSERT ...` must come after any `WHEN NOT MATCHED AND <condition> THEN INSERT ...` clauses.

```sql
-- Multiple WHEN MATCHED and WHEN NOT MATCHED clauses
MERGE INTO employees e
USING updates u
ON e.emp_id = u.emp_id
WHEN MATCHED AND u.change_type = 'SALARY' THEN
    UPDATE SET e.salary = u.new_value
WHEN MATCHED AND u.change_type = 'TITLE' THEN
    UPDATE SET e.job_title = u.new_value
WHEN MATCHED AND u.change_type = 'TERMINATE' THEN
    DELETE
WHEN NOT MATCHED AND u.department = 'ENGINEERING' THEN
    INSERT (emp_id, name, salary, job_title, department)
    VALUES (u.emp_id, u.name, u.new_value, u.job_title, 'ENGINEERING')
WHEN NOT MATCHED THEN
    INSERT (emp_id, name, salary, job_title)
    VALUES (u.emp_id, u.name, u.new_value, u.job_title);
```

### MERGE with Subquery as Source

```sql
MERGE INTO inventory i
USING (
    SELECT
        product_id,
        SUM(quantity) as total_qty
    FROM daily_sales
    WHERE sale_date = CURRENT_DATE()
    GROUP BY product_id
) s
ON i.product_id = s.product_id
WHEN MATCHED THEN
    UPDATE SET i.quantity = i.quantity - s.total_qty
WHEN NOT MATCHED THEN
    INSERT (product_id, quantity)
    VALUES (s.product_id, -s.total_qty);
```

### MERGE with Streams (CDC Pattern)

**Key Exam Concept:** MERGE is commonly used with streams to process change data capture (CDC).

```sql
-- Create stream on source table
CREATE STREAM customer_changes ON TABLE customers;

-- Process stream changes into target
MERGE INTO customer_history h
USING customer_changes c
ON h.customer_id = c.customer_id

WHEN MATCHED AND c.METADATA$ACTION = 'DELETE' AND c.METADATA$ISUPDATE = FALSE THEN
    UPDATE SET h.is_deleted = TRUE, h.deleted_at = CURRENT_TIMESTAMP()

WHEN MATCHED AND c.METADATA$ISUPDATE = TRUE THEN
    UPDATE SET
        h.name = c.name,
        h.email = c.email,
        h.updated_at = CURRENT_TIMESTAMP()

WHEN NOT MATCHED AND c.METADATA$ACTION = 'INSERT' THEN
    INSERT (customer_id, name, email, created_at)
    VALUES (c.customer_id, c.name, c.email, CURRENT_TIMESTAMP());
```

### MERGE Output

MERGE returns a summary of operations performed:

```
+-------------------------+-------------------------+
| number of rows inserted | number of rows updated  |
|-------------------------|-------------------------|
|                     150 |                     340 |
+-------------------------+-------------------------+
```

---

## Section 5: TRUNCATE Statement

### TRUNCATE Syntax and Behavior

```sql
-- Remove all rows from a table
TRUNCATE TABLE schema_name.table_name;

-- Shorthand (TABLE keyword optional)
TRUNCATE schema_name.table_name;

-- With IF EXISTS
TRUNCATE TABLE IF EXISTS my_table;
```

### TRUNCATE Characteristics

| Characteristic | Behavior |
|----------------|----------|
| **Speed** | Very fast (metadata operation) |
| **WHERE clause** | Not supported (removes ALL rows) |
| **Time Travel** | Supported - can recover via AT/BEFORE |
| **Auto-commit** | Yes - cannot be rolled back in transaction |
| **Resets sequences** | No - AUTOINCREMENT continues from last value |
| **Storage** | Immediate logical delete, physical cleanup follows retention |
| **Streams** | Recorded as change (all rows appear as DELETE) |

### TRUNCATE vs DROP and RECREATE

```sql
-- TRUNCATE: Keeps table structure, removes data
TRUNCATE TABLE my_table;

-- DROP and CREATE: Removes everything, resets table
DROP TABLE my_table;
CREATE TABLE my_table (...);  -- AUTOINCREMENT resets to START value
```

### Recovering from TRUNCATE with Time Travel

```sql
-- View table state before TRUNCATE
SELECT * FROM my_table
BEFORE (STATEMENT => 'truncate_statement_id');

-- Restore truncated data
CREATE TABLE my_table_restored AS
SELECT * FROM my_table
BEFORE (STATEMENT => 'truncate_statement_id');

-- Or use AT with timestamp
SELECT * FROM my_table
AT (TIMESTAMP => '2024-01-15 10:30:00'::TIMESTAMP);
```

---

## Section 6: DML and Time Travel

### How DML Affects Time Travel

All DML operations (INSERT, UPDATE, DELETE, MERGE, TRUNCATE) create change records that are preserved for Time Travel.

```sql
-- View historical data after DML operations
SELECT * FROM my_table
AT (OFFSET => -60*30);  -- 30 minutes ago

-- Query using statement ID
SELECT * FROM my_table
BEFORE (STATEMENT => 'statement_id_of_dml');

-- Query using timestamp
SELECT * FROM my_table
AT (TIMESTAMP => '2024-01-15 14:00:00'::TIMESTAMP);
```

### Time Travel Storage Impact

| Data Retention Period | Applies To |
|----------------------|------------|
| **Time Travel (0-90 days)** | Recoverable via AT/BEFORE clauses |
| **Fail-safe (7 days)** | Snowflake recovery only (Enterprise+) |

```sql
-- Configure retention at table level
ALTER TABLE my_table SET DATA_RETENTION_TIME_IN_DAYS = 30;

-- Check current retention setting
SHOW TABLES LIKE 'my_table';
-- Check the "retention_time" column
```

---

## Section 7: DML and Streams

### Stream Metadata Columns

When DML operations occur on a table with a stream, the changes are captured:

| Metadata Column | Description |
|-----------------|-------------|
| `METADATA$ACTION` | 'INSERT' or 'DELETE' |
| `METADATA$ISUPDATE` | TRUE if row is part of an UPDATE |
| `METADATA$ROW_ID` | Unique identifier for the row |

### DML Operations in Stream Output

| DML Operation | Stream Output |
|---------------|---------------|
| **INSERT** | Single row: ACTION='INSERT', ISUPDATE=FALSE |
| **DELETE** | Single row: ACTION='DELETE', ISUPDATE=FALSE |
| **UPDATE** | Two rows: old (DELETE, ISUPDATE=TRUE) + new (INSERT, ISUPDATE=TRUE) |
| **TRUNCATE** | All rows as DELETE, ISUPDATE=FALSE |

```sql
-- Create a stream
CREATE STREAM my_stream ON TABLE my_table;

-- Perform DML
INSERT INTO my_table VALUES (1, 'Alice');
UPDATE my_table SET name = 'Alicia' WHERE id = 1;
DELETE FROM my_table WHERE id = 1;

-- Query stream to see changes
SELECT
    *,
    METADATA$ACTION,
    METADATA$ISUPDATE,
    METADATA$ROW_ID
FROM my_stream;
```

### Stream Offset Advancement

**Key Exam Concept:** A stream's offset advances ONLY when a DML statement that consumes the stream is committed.

```sql
-- This advances the stream offset
INSERT INTO target_table
SELECT * FROM my_stream;  -- Offset advances after commit

-- This does NOT advance the offset
SELECT * FROM my_stream;  -- Read-only, no offset change
```

---

## Section 8: DML Best Practices

### Performance Considerations

| Best Practice | Explanation |
|---------------|-------------|
| **Batch operations** | Combine multiple rows in single INSERT |
| **Use MERGE for UPSERT** | More efficient than separate UPDATE/INSERT |
| **Use INSERT OVERWRITE** | Better than DELETE + INSERT for full refresh |
| **Limit UPDATE scope** | Use precise WHERE clauses |
| **Consider clustering** | Heavy DML can degrade clustering |

### Transaction Handling

```sql
-- Explicit transaction for multiple DML operations
BEGIN;
    UPDATE accounts SET balance = balance - 100 WHERE id = 1;
    UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;

-- Rollback on error
BEGIN;
    UPDATE accounts SET balance = balance - 100 WHERE id = 1;
    -- If this fails, previous UPDATE is also rolled back
    UPDATE accounts SET balance = balance + 100 WHERE id = 999;  -- Error!
ROLLBACK;
```

### Multi-Statement DML vs MERGE

```sql
-- Less efficient: Separate statements
DELETE FROM target WHERE id IN (SELECT id FROM source WHERE action = 'DELETE');
UPDATE target t SET t.value = s.value FROM source s WHERE t.id = s.id AND s.action = 'UPDATE';
INSERT INTO target SELECT * FROM source WHERE action = 'INSERT';

-- More efficient: Single MERGE
MERGE INTO target t USING source s ON t.id = s.id
WHEN MATCHED AND s.action = 'DELETE' THEN DELETE
WHEN MATCHED AND s.action = 'UPDATE' THEN UPDATE SET t.value = s.value
WHEN NOT MATCHED AND s.action = 'INSERT' THEN INSERT (id, value) VALUES (s.id, s.value);
```

---

## Section 9: Common Exam Patterns and Tips

### Exam Question Types

**1. INSERT Variations**

Q: What is the effect of including the OVERWRITE keyword in an INSERT statement?
- A: It truncates the target table before inserting new rows (atomic operation)

Q: Can you insert data without specifying column names?
- A: Yes, if values match the table structure in order and data type

**2. UPDATE Behavior**

Q: How does an UPDATE appear in a stream?
- A: As two rows - a DELETE (old values) and INSERT (new values), both with METADATA$ISUPDATE = TRUE

Q: Can UPDATE modify rows across multiple tables in one statement?
- A: No, UPDATE affects only one table (use MERGE for multi-table operations)

**3. DELETE vs TRUNCATE**

Q: What is the main difference between DELETE and TRUNCATE?
- A: DELETE can use WHERE clause for selective removal; TRUNCATE removes ALL rows

Q: Is TRUNCATE recoverable?
- A: Yes, via Time Travel (AT/BEFORE clauses) within the retention period

**4. MERGE Statement**

Q: How many WHEN NOT MATCHED clauses can MERGE have?
- A: Multiple -- both WHEN MATCHED and WHEN NOT MATCHED support multiple instances with different AND conditions. The only constraint is that a clause without an AND sub-clause must be the last of its type.

Q: What is MERGE commonly used with for CDC processing?
- A: Streams - to process captured changes into target tables

**5. DML and Streams**

Q: Under which condition does a stream's offset advance?
- A: When a DML operation that reads from the stream is committed

Q: Which stream type tracks only INSERT operations?
- A: Append-only stream (APPEND_ONLY = TRUE)

### Memory Aids

**"MERGE = UPSERT"** - MERGE combines INSERT, UPDATE, and DELETE in one statement

**"INSERT OVERWRITE = Truncate + Insert"** - Atomic operation to replace all data

**"UPDATE = DELETE + INSERT in streams"** - Updates appear as two rows in stream output

**"Stream offset = DML commit"** - Reading a stream alone does not advance the offset

**"TRUNCATE = Fast, no WHERE"** - Faster than DELETE but removes everything

### Quick Reference Commands

```sql
-- INSERT variations
INSERT INTO t VALUES (...);
INSERT INTO t (cols) SELECT ... FROM s;
INSERT OVERWRITE INTO t SELECT ... FROM s;

-- UPDATE patterns
UPDATE t SET col = value WHERE condition;
UPDATE t SET col = s.col FROM source s WHERE t.id = s.id;

-- DELETE patterns
DELETE FROM t WHERE condition;
DELETE FROM t USING s WHERE t.id = s.id;

-- MERGE pattern
MERGE INTO t USING s ON t.id = s.id
WHEN MATCHED THEN UPDATE SET ...
WHEN MATCHED THEN DELETE
WHEN NOT MATCHED THEN INSERT ...;

-- TRUNCATE
TRUNCATE TABLE t;

-- Recover from DML via Time Travel
SELECT * FROM t AT (OFFSET => -3600);  -- 1 hour ago
SELECT * FROM t BEFORE (STATEMENT => 'stmt_id');
```

---

## Section 10: Summary Comparison Tables

### DML Operations Comparison

| Operation | Rows Affected | WHERE Clause | Subquery Support | Stream Impact |
|-----------|---------------|--------------|------------------|---------------|
| **INSERT** | Adds new | N/A | Yes (SELECT) | INSERT rows |
| **UPDATE** | Modifies existing | Yes (required for partial) | Yes | DELETE + INSERT |
| **DELETE** | Removes existing | Yes (optional) | Yes | DELETE rows |
| **MERGE** | Any combination | Via ON clause | Yes (source) | Varies by action |
| **TRUNCATE** | Removes all | No | No | DELETE all rows |

### DELETE vs TRUNCATE vs DROP

| Aspect | DELETE (no WHERE) | TRUNCATE | DROP |
|--------|-------------------|----------|------|
| **Removes rows** | Yes | Yes | Yes (removes table) |
| **Removes table** | No | No | Yes |
| **Time Travel** | Yes | Yes | Yes (UNDROP) |
| **Resets AUTOINCREMENT** | No | No | Yes (on recreate) |
| **Performance** | Slower | Fast | Instant |
| **WHERE support** | Yes | No | N/A |

### MERGE Clause Summary

| Clause | Purpose | Maximum Count |
|--------|---------|---------------|
| `WHEN MATCHED ... UPDATE` | Update matching rows | Multiple (with AND conditions) |
| `WHEN MATCHED ... DELETE` | Delete matching rows | Multiple (with AND conditions) |
| `WHEN NOT MATCHED ... INSERT` | Insert non-matching rows | Multiple (with AND conditions) |

**Note:** A clause without an AND sub-clause must be the last of its type to avoid unreachable cases.

---

## Practice Questions

1. A data engineer needs to replace all rows in a reporting table with fresh data from a staging table. What is the most efficient single-statement approach?

<details>
<summary>Show Answer</summary>

**Answer:** `INSERT OVERWRITE INTO reporting_table SELECT * FROM staging_table;` - This truncates and inserts atomically in one transaction.
</details>

2. When a stream captures an UPDATE operation, how many rows appear in the stream output for each updated row?

<details>
<summary>Show Answer</summary>

**Answer:** Two rows - one with METADATA$ACTION='DELETE' and METADATA$ISUPDATE=TRUE (old values), and one with METADATA$ACTION='INSERT' and METADATA$ISUPDATE=TRUE (new values).
</details>

3. What happens to a stream's offset when you run `SELECT * FROM my_stream;`?

<details>
<summary>Show Answer</summary>

**Answer:** Nothing - the offset only advances when a DML operation that consumes the stream is committed.
</details>

4. A MERGE statement has the following structure. Is it valid?
   ```sql
   MERGE INTO t USING s ON t.id = s.id
   WHEN NOT MATCHED AND s.type = 'A' THEN INSERT ...
   WHEN NOT MATCHED AND s.type = 'B' THEN INSERT ...;
   ```

<details>
<summary>Show Answer</summary>

**Answer:** Yes, this is valid. A single MERGE statement can include multiple WHEN NOT MATCHED clauses (and multiple WHEN MATCHED clauses), as long as each clause uses a different AND condition. The only constraint is that a clause without an AND sub-clause must be the last of its type -- since both clauses here have AND conditions, the ordering is valid.
</details>

5. After running TRUNCATE TABLE on a table, can you recover the data?

<details>
<summary>Show Answer</summary>

**Answer:** Yes, using Time Travel with `SELECT * FROM table_name BEFORE (STATEMENT => 'truncate_statement_id');` or by querying at a timestamp before the TRUNCATE occurred.
</details>

6. Which DML operation is most efficient for synchronizing data between a source and target table (inserting new rows, updating changed rows, and deleting removed rows)?

<details>
<summary>Show Answer</summary>

**Answer:** MERGE - it can handle all three operations in a single statement with WHEN MATCHED (UPDATE/DELETE) and WHEN NOT MATCHED (INSERT) clauses.
</details>
