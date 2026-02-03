# Domain 5: Data Transformations

## Part 15: Transactions

This section covers Snowflake's transaction management, including implicit and explicit transactions, ACID compliance, isolation levels, and how transactions interact with various Snowflake features like stored procedures and streams. Understanding transactions is essential for maintaining data integrity and for the SnowPro Core exam.

---

## 1. Transaction Fundamentals

### 1.1 What Is a Transaction?

A **transaction** is a sequence of SQL statements that Snowflake processes as a single unit. All statements in a transaction either succeed together (commit) or fail together (rollback), ensuring data consistency.

**ACID Compliance:**

Snowflake is fully ACID-compliant:

| Property | Description |
|----------|-------------|
| **Atomicity** | All statements in a transaction succeed or fail as a unit |
| **Consistency** | Data moves from one valid state to another |
| **Isolation** | Concurrent transactions don't interfere with each other |
| **Durability** | Committed changes persist even after system failures |

**Key Point:** The **Transaction Manager** in Snowflake's Cloud Services Layer coordinates transactions across all virtual warehouses, ensuring data is consistently accessible.

### 1.2 Transaction Types

Snowflake supports two types of transactions:

| Type | Description | Started By |
|------|-------------|------------|
| **Implicit** | Automatically created for single statements when AUTOCOMMIT is ON | Any DML/DDL statement |
| **Explicit** | Manually controlled by the user | BEGIN TRANSACTION statement |

---

## 2. Implicit Transactions (AUTOCOMMIT)

### 2.1 How AUTOCOMMIT Works

When `AUTOCOMMIT` is **ON** (the default), each SQL statement is automatically wrapped in its own transaction:

1. Statement executes
2. If successful, Snowflake automatically commits
3. If error occurs, Snowflake automatically rolls back

```sql
-- With AUTOCOMMIT ON (default):
INSERT INTO orders VALUES (1, 'Product A', 100);
-- This INSERT is automatically committed if successful

UPDATE orders SET amount = 150 WHERE order_id = 1;
-- This UPDATE is a separate transaction, also auto-committed
```

### 2.2 AUTOCOMMIT Parameter

```sql
-- Check current AUTOCOMMIT setting
SHOW PARAMETERS LIKE 'AUTOCOMMIT';

-- Disable AUTOCOMMIT for the session
ALTER SESSION SET AUTOCOMMIT = FALSE;

-- Enable AUTOCOMMIT (default behavior)
ALTER SESSION SET AUTOCOMMIT = TRUE;
```

**Important:** When `AUTOCOMMIT = FALSE`:
- You must explicitly call `COMMIT` or `ROLLBACK`
- All statements remain in the open transaction until explicitly ended
- If session disconnects, uncommitted changes are rolled back

**Snowflake Recommendation:** Snowflake explicitly recommends **keeping AUTOCOMMIT enabled** and **using explicit transactions as much as possible**. This avoids the risk of long-running open transactions that can cause lock contention and resource issues.

### 2.3 AUTOCOMMIT Scope

The AUTOCOMMIT parameter can be set at multiple levels:

| Level | Scope | Command |
|-------|-------|---------|
| **Account** | All sessions in account | `ALTER ACCOUNT SET AUTOCOMMIT = ...` |
| **User** | All sessions for user | `ALTER USER SET AUTOCOMMIT = ...` |
| **Session** | Current session only | `ALTER SESSION SET AUTOCOMMIT = ...` |

Session settings override user settings, which override account settings.

---

## 3. Explicit Transactions

### 3.1 BEGIN TRANSACTION

Use `BEGIN` or `BEGIN TRANSACTION` to start an explicit transaction:

```sql
-- Start an explicit transaction
BEGIN TRANSACTION;
-- or simply:
BEGIN;
```

**Best Practice:** Use `BEGIN TRANSACTION` instead of just `BEGIN` in stored procedures to avoid confusion with the Snowflake Scripting `BEGIN ... END` block.

### 3.2 COMMIT

The `COMMIT` statement makes all changes in the transaction permanent:

```sql
BEGIN TRANSACTION;

INSERT INTO accounts (id, balance) VALUES (101, 1000);
UPDATE accounts SET balance = balance - 500 WHERE id = 100;
UPDATE accounts SET balance = balance + 500 WHERE id = 101;

COMMIT;
-- All three statements are now permanently saved
```

**Key Points:**
- After COMMIT, changes are visible to other transactions
- COMMIT ends the current transaction
- A new implicit transaction begins with the next statement (if AUTOCOMMIT is ON)

### 3.3 ROLLBACK

The `ROLLBACK` statement undoes all changes in the transaction:

```sql
BEGIN TRANSACTION;

DELETE FROM important_data WHERE status = 'old';
-- Oops! Wrong condition

ROLLBACK;
-- The DELETE is undone - data is restored
```

**When ROLLBACK Occurs:**
- Explicitly called with `ROLLBACK` statement
- Session disconnects with uncommitted transaction
- Error occurs and `TRANSACTION_ABORT_ON_ERROR = TRUE`
- Statement timeout expires

### 3.4 Complete Transaction Example

```sql
BEGIN TRANSACTION;

-- Transfer funds between accounts
DECLARE
  source_balance NUMBER;
BEGIN
  -- Check source account has sufficient funds
  SELECT balance INTO source_balance
  FROM accounts WHERE account_id = 100;

  IF (source_balance >= 500) THEN
    UPDATE accounts SET balance = balance - 500 WHERE account_id = 100;
    UPDATE accounts SET balance = balance + 500 WHERE account_id = 101;
    COMMIT;
  ELSE
    ROLLBACK;
    RETURN 'Insufficient funds';
  END IF;
END;
```

---

## 4. Transaction Isolation Levels

### 4.1 Read Committed Isolation

Snowflake supports only **READ COMMITTED** isolation level for transactions (this is the default and cannot be changed).

**What Read Committed Means:**
- A statement sees only data committed **before** the statement began executing
- Within a transaction, each statement can see changes committed by other transactions between statements
- Prevents dirty reads (reading uncommitted data)

```sql
-- Transaction 1                    -- Transaction 2
BEGIN TRANSACTION;                  BEGIN TRANSACTION;
SELECT * FROM t1; -- sees 10 rows
                                    INSERT INTO t1 VALUES (11);
                                    COMMIT;
SELECT * FROM t1; -- sees 11 rows (includes Transaction 2's insert)
COMMIT;
```

### 4.2 Isolation Level Parameter

```sql
-- Check current isolation level setting
SHOW PARAMETERS LIKE 'TRANSACTION_DEFAULT_ISOLATION_LEVEL';

-- Result: READ COMMITTED (this is the only supported value)
```

**Exam Tip:** Snowflake only supports READ COMMITTED isolation. It does NOT support:
- READ UNCOMMITTED
- REPEATABLE READ (except for streams - see below)
- SERIALIZABLE

### 4.3 Streams and Repeatable Read

**Special Case:** Streams support **repeatable read isolation** within a transaction:

```sql
BEGIN TRANSACTION;

-- First query of stream
SELECT * FROM my_stream;  -- Returns rows A, B, C

-- Meanwhile, new changes are made to source table...

-- Second query of same stream in same transaction
SELECT * FROM my_stream;  -- Still returns A, B, C (same snapshot)

COMMIT;
```

This differs from regular table behavior where each SELECT within a transaction could see newly committed rows.

---

## 5. DDL and DML in Transactions

### 5.1 DML Statements in Transactions

DML statements (INSERT, UPDATE, DELETE, MERGE) work normally within explicit transactions:

```sql
BEGIN TRANSACTION;

INSERT INTO orders VALUES (1, 'Product A');
UPDATE inventory SET quantity = quantity - 1 WHERE product = 'Product A';
DELETE FROM pending_orders WHERE order_id = 1;

COMMIT;
-- All three DML statements committed atomically
```

### 5.2 DDL Statements Are Auto-Committed

**Critical Concept:** DDL statements (CREATE, ALTER, DROP, etc.) are **automatically committed** as individual transactions, even within an explicit transaction block:

```sql
BEGIN TRANSACTION;

INSERT INTO t1 VALUES (1);        -- Part of explicit transaction
CREATE TABLE t2 (id INT);         -- Auto-committed immediately!
INSERT INTO t1 VALUES (2);        -- New implicit transaction starts

ROLLBACK;
-- Only the second INSERT is rolled back
-- The CREATE TABLE was already committed
-- The first INSERT was committed when CREATE TABLE executed
```

**DDL Auto-Commit Behavior:**
1. When DDL is encountered, any pending DML is committed first
2. The DDL statement executes and commits
3. A new transaction begins for subsequent statements

### 5.3 DDL Statement Examples

The following statements auto-commit:

```sql
-- All these statements auto-commit immediately:
CREATE TABLE ...
CREATE VIEW ...
CREATE FUNCTION ...
CREATE PROCEDURE ...
ALTER TABLE ...
DROP TABLE ...
GRANT ...
REVOKE ...
```

---

## 6. Transaction Parameters

### 6.1 Key Session Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `AUTOCOMMIT` | TRUE | Auto-commit each statement |
| `TRANSACTION_ABORT_ON_ERROR` | FALSE | Abort transaction if statement fails |
| `TRANSACTION_DEFAULT_ISOLATION_LEVEL` | READ COMMITTED | Isolation level (read-only) |
| `LOCK_TIMEOUT` | 43200 (12 hours) | Seconds to wait for locks |
| `STATEMENT_TIMEOUT_IN_SECONDS` | 0 (disabled) | Max statement execution time |

### 6.2 TRANSACTION_ABORT_ON_ERROR

Controls transaction behavior when a statement fails:

```sql
-- Default behavior (FALSE): Transaction continues after error
ALTER SESSION SET TRANSACTION_ABORT_ON_ERROR = FALSE;

BEGIN TRANSACTION;
INSERT INTO t1 VALUES (1);
INSERT INTO t1 VALUES ('invalid');  -- Error: wrong type
INSERT INTO t1 VALUES (2);          -- This still executes
COMMIT;                              -- Commits rows 1 and 2

-- With TRUE: Transaction aborts on first error
ALTER SESSION SET TRANSACTION_ABORT_ON_ERROR = TRUE;

BEGIN TRANSACTION;
INSERT INTO t1 VALUES (1);
INSERT INTO t1 VALUES ('invalid');  -- Error: transaction aborted
INSERT INTO t1 VALUES (2);          -- Error: transaction already aborted
COMMIT;                              -- Error: must ROLLBACK first
ROLLBACK;                            -- Required to end aborted transaction
```

### 6.3 LOCK_TIMEOUT

```sql
-- Set lock timeout to 5 minutes (300 seconds)
ALTER SESSION SET LOCK_TIMEOUT = 300;

-- Set to 0 for immediate failure if lock unavailable
ALTER SESSION SET LOCK_TIMEOUT = 0;
```

---

## 7. Locking and Concurrency

### 7.1 How Snowflake Handles Locks

Snowflake uses **multi-version concurrency control (MVCC)**, which minimizes locking:

- **Readers never block writers**
- **Writers never block readers**
- Only write-write conflicts require serialization

### 7.2 Resource Locking

Snowflake acquires locks for:
- DML operations on tables (row-level logical locks)
- DDL operations on objects (object-level locks)
- Schema modifications

**Lock Types:**
| Operation | Lock Level | Conflicts With |
|-----------|------------|----------------|
| SELECT | None (uses MVCC) | Nothing |
| INSERT | Row-level | Other INSERTs to same rows |
| UPDATE/DELETE | Row-level | Other modifications to same rows |
| DDL | Object-level | Other DDL on same object |

### 7.3 Deadlock Handling

**What Is a Deadlock?**
When two transactions each hold a lock the other needs:

```
Transaction 1: Holds lock A, waiting for lock B
Transaction 2: Holds lock B, waiting for lock A
```

**Snowflake's Deadlock Resolution:**
- Snowflake automatically detects deadlocks
- One transaction is chosen as the "victim" and rolled back
- The victim receives a deadlock error
- The other transaction proceeds

**Preventing Deadlocks:**
1. Access resources in consistent order
2. Keep transactions short
3. Avoid user interaction within transactions
4. Use LOCK_TIMEOUT to fail fast

```sql
-- Reduce lock timeout to avoid long waits
ALTER SESSION SET LOCK_TIMEOUT = 60;

BEGIN TRANSACTION;
-- Access tables in consistent order (e.g., alphabetically)
UPDATE accounts SET ...;
UPDATE orders SET ...;
UPDATE transactions SET ...;
COMMIT;
```

---

## 8. Scoped Transactions in Stored Procedures

### 8.1 What Are Scoped Transactions?

In Snowflake Scripting, transactions can be **scoped** to a stored procedure, meaning:
- The procedure manages its own transaction independently
- Parent transaction (if any) is not affected by procedure's transaction
- Useful for autonomous operations that must commit regardless of caller

### 8.2 Caller's Rights vs. Owner's Rights

| Execution Context | Transaction Behavior |
|-------------------|---------------------|
| **Caller's Rights** | Shares caller's transaction context |
| **Owner's Rights** | Has its own transaction scope |

```sql
-- Caller's Rights procedure (default)
CREATE OR REPLACE PROCEDURE process_data()
RETURNS STRING
LANGUAGE SQL
EXECUTE AS CALLER
AS
$$
BEGIN
  INSERT INTO log_table VALUES (CURRENT_TIMESTAMP(), 'Processing');
  -- This INSERT is part of caller's transaction
  RETURN 'Done';
END;
$$;

-- Owner's Rights procedure
CREATE OR REPLACE PROCEDURE audit_action(action STRING)
RETURNS STRING
LANGUAGE SQL
EXECUTE AS OWNER
AS
$$
BEGIN
  BEGIN TRANSACTION;
  INSERT INTO audit_log VALUES (CURRENT_TIMESTAMP(), action);
  COMMIT;  -- Commits independently of caller's transaction
  RETURN 'Logged';
END;
$$;
```

### 8.3 Transaction Control in Procedures

**Best Practice:** Use `BEGIN TRANSACTION` (not just `BEGIN`) to clearly indicate transaction start:

```sql
CREATE OR REPLACE PROCEDURE transfer_funds(
  from_account INT,
  to_account INT,
  amount NUMBER
)
RETURNS STRING
LANGUAGE SQL
AS
$$
DECLARE
  balance NUMBER;
BEGIN
  -- Use BEGIN TRANSACTION to distinguish from scripting BEGIN
  BEGIN TRANSACTION;

  SELECT current_balance INTO balance
  FROM accounts WHERE id = :from_account;

  IF (balance >= amount) THEN
    UPDATE accounts SET current_balance = current_balance - :amount
    WHERE id = :from_account;

    UPDATE accounts SET current_balance = current_balance + :amount
    WHERE id = :to_account;

    COMMIT;
    RETURN 'Transfer successful';
  ELSE
    ROLLBACK;
    RETURN 'Insufficient funds';
  END IF;

EXCEPTION
  WHEN OTHER THEN
    ROLLBACK;
    RETURN 'Error: ' || SQLERRM;
END;
$$;
```

---

## 9. Transactions with Streams

### 9.1 Stream Offset Advancement

A stream's offset advances **only** when:
1. The stream is consumed in a DML statement
2. The DML statement's transaction **commits successfully**

```sql
-- Querying a stream does NOT advance offset
SELECT * FROM my_stream;  -- Offset unchanged

-- Consuming in DML advances offset (after commit)
INSERT INTO processed_data
SELECT * FROM my_stream;
-- Offset advances when this auto-commits (or explicit COMMIT)
```

### 9.2 Explicit Transactions with Streams

Use explicit transactions to ensure multiple statements see the same stream data:

```sql
BEGIN TRANSACTION;

-- All statements in this transaction see the same stream snapshot
INSERT INTO table_a SELECT col1, col2 FROM my_stream;
INSERT INTO table_b SELECT col1, col3 FROM my_stream;
INSERT INTO audit_log SELECT COUNT(*) FROM my_stream;

COMMIT;
-- Stream offset advances to transaction start time
```

**Without explicit transaction:**
```sql
-- Each statement might see different stream data!
INSERT INTO table_a SELECT * FROM my_stream;
-- Other transaction commits changes...
INSERT INTO table_b SELECT * FROM my_stream;  -- May see different data
```

### 9.3 Stream Locking Behavior

When a stream is consumed within a transaction:
- The stream is **locked** to prevent concurrent modifications
- Other transactions can track new changes to the source table
- Those changes don't appear in the locked stream until the transaction commits

---

## 10. Exam Tips and Common Question Patterns

### 10.1 Frequently Tested Concepts

1. **AUTOCOMMIT behavior** - Default is ON; each statement auto-commits
2. **DDL auto-commit** - DDL commits immediately, even in explicit transactions
3. **Isolation level** - Only READ COMMITTED is supported
4. **Stream isolation** - Streams use REPEATABLE READ within transactions
5. **Offset advancement** - Only on committed DML that consumes stream data
6. **TRANSACTION_ABORT_ON_ERROR** - Controls behavior after statement errors

### 10.2 Common Exam Traps

| Trap | Reality |
|------|---------|
| "Snowflake supports SERIALIZABLE isolation" | Only READ COMMITTED is supported |
| "DDL can be rolled back" | DDL auto-commits immediately |
| "Querying a stream advances its offset" | Only DML consumption in committed transaction advances offset |
| "BEGIN starts a transaction in stored procedures" | Use BEGIN TRANSACTION to avoid confusion with scripting |
| "AUTOCOMMIT must be disabled for transactions" | Explicit transactions work with AUTOCOMMIT ON |

### 10.3 Practice Questions

**Question 1:** What happens when a DDL statement is executed within an explicit transaction?

- A) The DDL waits for the transaction to commit
- B) The DDL rolls back with the transaction if ROLLBACK is called
- C) The DDL auto-commits, along with any pending DML before it
- D) The DDL fails because it cannot be in a transaction

**Answer:** C - DDL statements auto-commit immediately, first committing any pending DML, then committing the DDL itself.

---

**Question 2:** Which isolation level does Snowflake support for transactions?

- A) READ UNCOMMITTED
- B) READ COMMITTED
- C) REPEATABLE READ
- D) SERIALIZABLE

**Answer:** B - Snowflake only supports READ COMMITTED isolation for transactions. (Note: Streams support repeatable read within transactions, but tables use read committed.)

---

**Question 3:** When does a stream's offset advance?

- A) When the stream is queried with SELECT
- B) When the stream is referenced in a WHERE clause
- C) When stream data is consumed in a committed DML statement
- D) When the source table receives new data

**Answer:** C - Stream offset advances only when stream data is consumed by a DML statement that commits successfully.

---

**Question 4:** What is the effect of setting TRANSACTION_ABORT_ON_ERROR = TRUE?

- A) All transactions are automatically rolled back
- B) The entire transaction aborts when any statement fails
- C) Errors are silently ignored
- D) Only DDL errors abort the transaction

**Answer:** B - When TRUE, any statement error causes the entire transaction to abort; you must then ROLLBACK before continuing.

---

**Question 5:** A stored procedure contains the following code. What is the issue?

```sql
CREATE PROCEDURE my_proc()
RETURNS STRING
AS
$$
BEGIN
  INSERT INTO t1 VALUES (1);
  COMMIT;
END;
$$;
```

- A) No issue; this is correct
- B) The BEGIN is ambiguous - could be transaction or scripting block
- C) COMMIT cannot be in a stored procedure
- D) INSERT requires explicit transaction

**Answer:** B - The `BEGIN` is ambiguous. Use `BEGIN TRANSACTION` to clearly start a transaction, separate from the scripting `BEGIN...END` block.

---

**Question 6:** What is the default value of the LOCK_TIMEOUT parameter?

- A) 60 seconds
- B) 300 seconds
- C) 3600 seconds
- D) 43200 seconds (12 hours)

**Answer:** D - The default LOCK_TIMEOUT is 43200 seconds (12 hours).

---

## 11. Quick Reference

### Transaction Syntax

```sql
-- Start explicit transaction
BEGIN TRANSACTION;
-- or
BEGIN;

-- Commit transaction
COMMIT;

-- Rollback transaction
ROLLBACK;
```

### Key Parameters

```sql
-- Check/set AUTOCOMMIT
SHOW PARAMETERS LIKE 'AUTOCOMMIT';
ALTER SESSION SET AUTOCOMMIT = FALSE;

-- Check/set abort on error
SHOW PARAMETERS LIKE 'TRANSACTION_ABORT_ON_ERROR';
ALTER SESSION SET TRANSACTION_ABORT_ON_ERROR = TRUE;

-- Check/set lock timeout
SHOW PARAMETERS LIKE 'LOCK_TIMEOUT';
ALTER SESSION SET LOCK_TIMEOUT = 300;

-- Check isolation level (read-only)
SHOW PARAMETERS LIKE 'TRANSACTION_DEFAULT_ISOLATION_LEVEL';
```

### Transaction in Stored Procedure

```sql
CREATE OR REPLACE PROCEDURE safe_transfer(amount NUMBER)
RETURNS STRING
LANGUAGE SQL
AS
$$
BEGIN
  BEGIN TRANSACTION;  -- Not just BEGIN!

  -- Your DML statements here

  COMMIT;
  RETURN 'Success';
EXCEPTION
  WHEN OTHER THEN
    ROLLBACK;
    RETURN SQLERRM;
END;
$$;
```

### Stream Consumption Pattern

```sql
-- Ensure consistent view of stream data
BEGIN TRANSACTION;

INSERT INTO target_table
SELECT * FROM my_stream;

INSERT INTO audit_log
SELECT 'Processed', COUNT(*) FROM my_stream;

COMMIT;
-- Stream offset advances here
```

---

## 12. Summary Table

| Concept | Key Point |
|---------|-----------|
| AUTOCOMMIT | ON by default; each statement auto-commits |
| Explicit Transactions | Use BEGIN TRANSACTION ... COMMIT/ROLLBACK |
| DDL Behavior | Always auto-commits, even in explicit transactions |
| Isolation Level | READ COMMITTED only (REPEATABLE READ for streams) |
| Deadlocks | Snowflake auto-detects and rolls back one transaction |
| LOCK_TIMEOUT | Default 12 hours; set to 0 for immediate failure |
| Stream Offset | Advances only on committed DML consumption |
| Stored Procedures | Use BEGIN TRANSACTION, not just BEGIN |

---

**Key Takeaway:** Snowflake's transaction management is designed for simplicity and high concurrency. Understanding AUTOCOMMIT behavior, DDL auto-commit, and the READ COMMITTED isolation level are essential for both the exam and real-world Snowflake development. Pay special attention to how streams interact with transactions, as this is a common exam topic.
