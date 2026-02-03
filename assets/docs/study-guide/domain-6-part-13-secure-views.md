# Domain 6: Data Protection & Sharing
## Part 13: Secure Views

**Exam Weight: 5-10%**

---

## Table of Contents
1. [What Are Secure Views?](#what-are-secure-views)
2. [Why Use Secure Views?](#why-use-secure-views)
3. [Secure vs Regular Views Comparison](#secure-vs-regular-views-comparison)
4. [How Optimizer Bypass Works](#how-optimizer-bypass-works)
5. [Creating and Managing Secure Views](#creating-and-managing-secure-views)
6. [Interacting with Secure Views](#interacting-with-secure-views)
7. [Using Secure Views with Access Control](#using-secure-views-with-access-control)
8. [Secure Views and Data Sharing](#secure-views-and-data-sharing)
9. [Best Practices for Secure Views](#best-practices-for-secure-views)
10. [Secure Materialized Views](#secure-materialized-views)
11. [Performance Considerations](#performance-considerations)
12. [Exam Tips and Common Question Patterns](#exam-tips-and-common-question-patterns)

---

## What Are Secure Views?

A **secure view** is a view that has been specifically designated to protect sensitive data by hiding the view definition and preventing certain query optimizer behaviors that could potentially expose underlying data.

### Key Characteristics

| Characteristic | Description |
|---------------|-------------|
| **View Definition Hidden** | The SELECT statement that defines the view is not visible to unauthorized users |
| **Optimizer Bypass** | The query optimizer cannot reorder predicates in ways that might expose hidden data |
| **Query Profile Protection** | Internal details are not exposed in Query Profile |
| **Error Message Redaction** | Some error messages may be redacted to prevent data leakage |
| **Data Sharing Ready** | Required when sharing views with other Snowflake accounts |

### Applies To Both View Types

```
+------------------------------------------+
|          SECURE VIEWS                     |
+------------------------------------------+
|                                           |
|   Non-Materialized Views                  |
|   +-----------------------------------+   |
|   | CREATE SECURE VIEW my_view AS ... |   |
|   +-----------------------------------+   |
|                                           |
|   Materialized Views                      |
|   +-----------------------------------+   |
|   | CREATE SECURE MATERIALIZED VIEW   |   |
|   | my_mv AS ...                      |   |
|   +-----------------------------------+   |
|                                           |
+------------------------------------------+
```

---

## Why Use Secure Views?

### Two Primary Reasons

#### 1. Prevent Data Exposure Through Optimizer Optimizations

For non-secure views, internal optimizations can indirectly expose data:
- Optimizer has access to underlying data in base tables
- This access might allow hidden data to be exposed through user code (UDFs)
- Programmatic methods could exploit optimizer behavior

**Secure views do NOT utilize these optimizations**, ensuring users have no access to underlying data through side-channel attacks.

#### 2. Hide View Definition

For non-secure views, the query expression (view definition) is visible to users through:
- `SHOW VIEWS` command
- `GET_DDL` function
- `INFORMATION_SCHEMA.VIEWS`

**With secure views**, the definition is visible ONLY to:
- Users granted the role that **owns** the view
- ACCOUNTADMIN role
- SNOWFLAKE.OBJECT_VIEWER database role (preferred for least privilege)
- Users with IMPORTED PRIVILEGES on SNOWFLAKE database

### When Should You Use Secure Views?

```
+--------------------------------------------------+
|              DECISION FRAMEWORK                   |
+--------------------------------------------------+
|                                                   |
|   USE SECURE VIEWS WHEN:                          |
|   +---------------------------------------------+ |
|   | - Data privacy is a requirement             | |
|   | - Limiting access to sensitive data         | |
|   | - Sharing data with external accounts       | |
|   | - Row-level security is needed              | |
|   | - View definition reveals business logic    | |
|   +---------------------------------------------+ |
|                                                   |
|   DO NOT USE SECURE VIEWS FOR:                    |
|   +---------------------------------------------+ |
|   | - Query convenience only                    | |
|   | - Simplifying complex joins                 | |
|   | - Views where security is not a concern     | |
|   | - Performance-critical applications         | |
|   +---------------------------------------------+ |
|                                                   |
+--------------------------------------------------+
```

**Key Trade-off**: Secure views can execute **more slowly** than non-secure views because optimizer optimizations are disabled.

---

## Secure vs Regular Views Comparison

### Comprehensive Comparison Table

| Feature | Regular View | Secure View |
|---------|--------------|-------------|
| **View Definition Visibility** | Visible to users with SELECT privilege | Hidden from non-owners |
| **Query Optimizer** | Full optimization available | Optimizer bypass for security |
| **Predicate Reordering** | Optimizer can reorder WHERE clauses | View's WHERE always executes first |
| **Query Profile Details** | Full details shown | Internals hidden |
| **Data Sharing** | Cannot be shared safely | Required for sharing |
| **Performance** | Optimal | May be slower |
| **Scanned Data Info** | Shown in query stats | Hidden from query stats |
| **SHOW VIEWS Output** | Shows TEXT column | TEXT column is NULL |
| **GET_DDL Function** | Returns definition | Returns NULL for non-owners |
| **Error Messages** | Full error details | May be redacted |
| **Use Case** | Query convenience | Data privacy and sharing |

### Visual Comparison: Data Access Flow

```
REGULAR VIEW:
+-------------+     +-------------------+     +------------+
|   User      | --> | Query Optimizer   | --> | Base Table |
| Query       |     | (Full access to   |     |            |
|             |     |  underlying data) |     |            |
+-------------+     +-------------------+     +------------+
                            |
                    Optimizer may reorder
                    predicates, potentially
                    exposing filtered data


SECURE VIEW:
+-------------+     +-------------------+     +------------+
|   User      | --> | Query Optimizer   | --> | Base Table |
| Query       |     | (NO access to     |     |            |
|             |     |  underlying data) |     |            |
+-------------+     +-------------------+     +------------+
                            |
                    View's WHERE clause
                    ALWAYS executes first,
                    then user's WHERE clause
```

---

## How Optimizer Bypass Works

### The Security Problem with Regular Views

Consider a view that restricts users to see only certain rows:

```sql
-- Base table with all widgets
CREATE TABLE widgets (
    id NUMBER,
    name VARCHAR,
    color VARCHAR,
    price NUMBER
);

-- Regular view restricting to red widgets only
CREATE VIEW red_widgets_view AS
    SELECT * FROM widgets WHERE color = 'Red';
```

A malicious user could try to determine if purple widgets exist:

```sql
-- Malicious query using division by zero as a side channel
SELECT *
    FROM red_widgets_view
    WHERE 1/IFF(color = 'Purple', 0, 1) = 1;
```

**With a Regular View**:
- Optimizer might reorder predicates
- User's WHERE clause could execute BEFORE view's WHERE clause
- If any purple widget exists, division-by-zero error occurs
- Error message reveals that purple widgets exist!

**With a Secure View**:
- View's WHERE clause ALWAYS executes first
- Purple widgets are filtered out before user's query runs
- Division-by-zero never occurs because no purple widgets remain
- No information leakage!

### Predicate Execution Order

```
SECURE VIEW PREDICATE EXECUTION:

Step 1: View's WHERE clause executes first
+---------------------------------------------+
| SELECT * FROM widgets WHERE color = 'Red'   |
| --> Returns only red widgets                |
+---------------------------------------------+
              |
              v
Step 2: User's WHERE clause executes second
+---------------------------------------------+
| WHERE 1/IFF(color = 'Purple', 0, 1) = 1     |
| --> Only sees red widgets, no purple exists |
| --> No division by zero, query succeeds     |
+---------------------------------------------+
```

---

## Creating and Managing Secure Views

### Creating Secure Views

```sql
-- Create a secure non-materialized view
CREATE SECURE VIEW secure_customer_view AS
    SELECT customer_id, name, email
    FROM customers
    WHERE region = 'US';

-- Create a secure materialized view
CREATE SECURE MATERIALIZED VIEW secure_sales_mv AS
    SELECT product_id, SUM(quantity) as total_qty
    FROM sales
    GROUP BY product_id;

-- Create or replace syntax
CREATE OR REPLACE SECURE VIEW widgets_view AS
    SELECT w.*
    FROM widgets AS w
    WHERE w.id IN (
        SELECT widget_id
        FROM widget_access_rules AS a
        WHERE UPPER(role_name) = CURRENT_ROLE()
    );
```

### Converting Existing Views

```sql
-- Convert regular view to secure view
ALTER VIEW my_view SET SECURE;

-- Convert secure view back to regular view
ALTER VIEW my_view UNSET SECURE;

-- For materialized views
ALTER MATERIALIZED VIEW my_mv SET SECURE;
ALTER MATERIALIZED VIEW my_mv UNSET SECURE;
```

### DDL Summary Table

| Operation | Non-Materialized View | Materialized View |
|-----------|----------------------|-------------------|
| Create Secure | `CREATE SECURE VIEW` | `CREATE SECURE MATERIALIZED VIEW` |
| Make Secure | `ALTER VIEW ... SET SECURE` | `ALTER MATERIALIZED VIEW ... SET SECURE` |
| Remove Secure | `ALTER VIEW ... UNSET SECURE` | `ALTER MATERIALIZED VIEW ... UNSET SECURE` |

---

## Interacting with Secure Views

### Viewing the Definition

**For Non-Owners (Unauthorized Users)**:
- `SHOW VIEWS`: TEXT column is NULL
- `GET_DDL`: Returns NULL
- `INFORMATION_SCHEMA.VIEWS`: VIEW_DEFINITION is NULL

**For Owners (Authorized Users)**:
- Full definition is visible through all methods

### Determining if a View is Secure

#### For Non-Materialized Views:

```sql
-- Using Information Schema
SELECT table_catalog, table_schema, table_name, is_secure
FROM mydb.information_schema.views
WHERE table_name = 'MYVIEW';

-- Using Account Usage
SELECT table_catalog, table_schema, table_name, is_secure
FROM snowflake.account_usage.views
WHERE table_name = 'MYVIEW';

-- Using SHOW command
SHOW VIEWS LIKE 'myview';
-- Check the "is_secure" column in results
```

#### For Materialized Views:

```sql
-- Using SHOW command (check is_secure column)
SHOW MATERIALIZED VIEWS LIKE 'my_mv';
```

### Query Profile Behavior

**Critical Exam Point**: The internals of a secure view are NOT exposed in Query Profile, even for the view owner. This is because non-owners might have access to an owner's Query Profile.

```
+--------------------------------------------------+
|              QUERY PROFILE VISIBILITY             |
+--------------------------------------------------+
|                                                   |
|   Regular View:                                   |
|   +---------------------------------------------+ |
|   | - Full operator tree visible                | |
|   | - Underlying table scans shown              | |
|   | - All statistics available                  | |
|   +---------------------------------------------+ |
|                                                   |
|   Secure View:                                    |
|   +---------------------------------------------+ |
|   | - View appears as a "black box"             | |
|   | - Internal operations hidden                | |
|   | - Applies even to view owner                | |
|   +---------------------------------------------+ |
|                                                   |
+--------------------------------------------------+
```

---

## Using Secure Views with Access Control

### Row-Level Security Pattern

Combine secure views with context functions for row-level access control:

```sql
-- Data table
CREATE TABLE widgets (
    id NUMBER DEFAULT widget_id_sequence.nextval,
    name VARCHAR,
    color VARCHAR,
    price NUMBER,
    created_on TIMESTAMP_LTZ
);

-- Access control table
CREATE TABLE widget_access_rules (
    widget_id NUMBER,
    role_name VARCHAR
);

-- Secure view with role-based filtering
CREATE OR REPLACE SECURE VIEW widgets_view AS
    SELECT w.*
    FROM widgets AS w
    WHERE w.id IN (
        SELECT widget_id
        FROM widget_access_rules AS a
        WHERE UPPER(role_name) = CURRENT_ROLE()
    );
```

### Context Functions for Access Control

| Function | Use Case | Data Sharing Behavior |
|----------|----------|----------------------|
| `CURRENT_ROLE()` | Filter by user's active role | Causes the shared object to **FAIL** when queried |
| `CURRENT_USER()` | Filter by username | Causes the shared object to **FAIL** when queried |
| `CURRENT_ACCOUNT()` | Filter by account | Works correctly with data sharing |
| `IS_ROLE_IN_SESSION()` | Check if role is active | Complex role hierarchies |

**Important**: Do **not** use `CURRENT_ROLE()` or `CURRENT_USER()` in secure objects that will be shared. The contextual values returned by these functions have no relevance in a consumer's account and will cause the shared object to **fail** when queried or used -- this is not merely a NULL return, but an outright query failure. Always use `CURRENT_ACCOUNT()` instead for consumer-based filtering.

---

## Secure Views and Data Sharing

### Requirement for Data Sharing

Snowflake **strongly recommends** sharing secure views and/or secure UDFs instead of directly sharing tables. This ensures sensitive data is not exposed to users in consumer accounts.

### Architecture for Shared Secure Views

```
PROVIDER ACCOUNT:
+-----------------------------------------------------------+
|  Database: mydb                                            |
|  +-------------------------+   +------------------------+  |
|  |  Schema: private        |   |  Schema: public        |  |
|  |  +-------------------+  |   |  +------------------+  |  |
|  |  | sensitive_data    |  |   |  | secure_view      |  |  |
|  |  | (base table)      |  |   |  | (shared object)  |  |  |
|  |  +-------------------+  |   |  +------------------+  |  |
|  |  +-------------------+  |   |                        |  |
|  |  | sharing_access    |  |   |  <-- ONLY this schema |  |
|  |  | (mapping table)   |  |   |      is shared        |  |
|  |  +-------------------+  |   +------------------------+  |
|  +-------------------------+                               |
+-----------------------------------------------------------+
              |
              | Share includes: public schema + secure_view
              v
+-----------------------------------------------------------+
|  CONSUMER ACCOUNT                                          |
|  +-------------------------------------------------------+ |
|  |  Can access ONLY the secure view                      | |
|  |  Cannot see base table or mapping table               | |
|  +-------------------------------------------------------+ |
+-----------------------------------------------------------+
```

### Using CURRENT_ACCOUNT for Data Sharing

```sql
-- Mapping table for account-based access
CREATE TABLE sharing_access (
    access_id VARCHAR,
    account_name VARCHAR
);

-- Secure view using CURRENT_ACCOUNT()
CREATE SECURE VIEW paid_sensitive_data AS
    SELECT d.*
    FROM sensitive_data d
    JOIN sharing_access a ON d.access_id = a.access_id
    WHERE a.account_name = CURRENT_ACCOUNT();
```

### Testing Shared Secure Views

Use the `SIMULATED_DATA_SHARING_CONSUMER` session parameter to test:

```sql
-- Set session to simulate a consumer account
ALTER SESSION SET SIMULATED_DATA_SHARING_CONSUMER = 'CONSUMER_ACCOUNT_NAME';

-- Query the secure view to see what the consumer would see
SELECT * FROM paid_sensitive_data;

-- Reset simulation
ALTER SESSION UNSET SIMULATED_DATA_SHARING_CONSUMER;
```

---

## Best Practices for Secure Views

### Avoid Exposing Sequence-Generated Columns

**Problem**: Sequence-generated IDs can reveal information about data distribution.

```
Example: User sees these IDs in secure view
+------+-------+------------+
| ID   | NAME  | CREATED_ON |
+------+-------+------------+
| 315  | A     | Jan 7      |
| 1455 | B     | Jan 15     |
+------+-------+------------+

User can deduce: ~1140 records created between Jan 7-15
```

**Solutions**:
1. Do not expose the sequence-generated column
2. Use `UUID_STRING()` for randomized identifiers
3. Programmatically obfuscate the identifiers

### Scanned Data Size Considerations

**Secure views do NOT expose**:
- Amount of data scanned (bytes)
- Number of micro-partitions scanned
- Total data size

However, users might still infer data quantity from query duration (a query that runs 2x longer might process 2x data).

**For extremely high-security situations**: Create separate tables per user/role containing only their accessible data.

### Summary of Best Practices

| Practice | Rationale |
|----------|-----------|
| Hide sequence-generated columns | Prevents inferring record counts |
| Use UUID_STRING() for identifiers | Randomized, non-sequential |
| Use CURRENT_ACCOUNT() for sharing | Works across accounts |
| Define clustering keys on base tables | Performance for shared data |
| Test with SIMULATED_DATA_SHARING_CONSUMER | Validate consumer view |
| Consider materializing per role | Highest security scenarios |

---

## Secure Materialized Views

### Key Differences from Regular Materialized Views

| Aspect | Regular MV | Secure MV |
|--------|-----------|-----------|
| Definition visibility | Visible | Hidden from non-owners |
| Query Profile | Full details | Internals hidden |
| Data Sharing | Cannot share safely | Can be shared |
| Automatic refresh | Yes | Yes |
| Storage cost | Yes | Yes |
| Performance | Optimal | Same as regular MV |

### When to Use Secure Materialized Views

- Pre-aggregated data for sharing
- Performance-sensitive secure data access
- Complex calculations that should be hidden
- Sharing frequently accessed data subsets

```sql
-- Example: Secure materialized view for sharing
CREATE SECURE MATERIALIZED VIEW regional_sales_summary AS
    SELECT
        region,
        SUM(amount) as total_sales,
        COUNT(*) as transaction_count
    FROM sales
    WHERE region IN (
        SELECT allowed_region
        FROM region_access
        WHERE account = CURRENT_ACCOUNT()
    )
    GROUP BY region;
```

---

## Performance Considerations

### Why Secure Views May Be Slower

1. **Optimizer Bypass**: Cannot use certain optimizations that require viewing underlying data
2. **Predicate Order Fixed**: View's WHERE must execute first, preventing optimal execution plans
3. **No Pruning Hints**: Optimizer cannot use user's predicates to prune partitions early

### Mitigation Strategies

| Strategy | Description |
|----------|-------------|
| **Clustering Keys** | Define on columns frequently filtered in secure view |
| **Materialized Views** | Pre-compute aggregations |
| **Appropriate Filtering** | Design view predicates to leverage clustering |
| **Index-like Structures** | Use search optimization service where applicable |

### Performance Trade-off Decision Framework

```
+--------------------------------------------------+
|        PERFORMANCE vs SECURITY TRADE-OFF          |
+--------------------------------------------------+
|                                                   |
|   HIGH SECURITY NEED + ACCEPTABLE PERFORMANCE     |
|   --> Use Secure View                             |
|                                                   |
|   LOW SECURITY NEED + HIGH PERFORMANCE NEED       |
|   --> Use Regular View                            |
|                                                   |
|   HIGH SECURITY NEED + HIGH PERFORMANCE NEED      |
|   --> Use Secure Materialized View                |
|   --> Or materialize data per role/user           |
|                                                   |
+--------------------------------------------------+
```

---

## Exam Tips and Common Question Patterns

### High-Priority Exam Topics

1. **Definition Visibility**: Know that secure view definitions are hidden from non-owners
2. **CURRENT_ROLE vs CURRENT_ACCOUNT**: CURRENT_ACCOUNT for data sharing; CURRENT_ROLE/CURRENT_USER cause shared objects to **fail** when queried
3. **Query Profile Behavior**: Internals hidden even from view owner
4. **Optimizer Bypass**: View's WHERE always executes first
5. **Data Sharing Requirement**: Secure views recommended/required for sharing

### Common Exam Question Patterns

#### Pattern 1: Definition Visibility
**Q**: Which users can see the definition of a secure view?
**A**: Only users with the role that owns the view, ACCOUNTADMIN, or SNOWFLAKE.OBJECT_VIEWER

#### Pattern 2: Data Sharing Functions
**Q**: Which context function should be used in a secure view that will be shared with other accounts?
**A**: `CURRENT_ACCOUNT()` - CURRENT_ROLE() and CURRENT_USER() cause shared objects to **fail** when queried

#### Pattern 3: Performance Trade-off
**Q**: Why might a secure view execute more slowly than a non-secure view?
**A**: Secure views bypass certain optimizer optimizations to prevent data exposure

#### Pattern 4: Query Profile
**Q**: Can the owner of a secure view see its internals in Query Profile?
**A**: No - internals are hidden even from owners because other users might access the owner's Query Profile

#### Pattern 5: Converting Views
**Q**: How do you convert an existing view to a secure view?
**A**: `ALTER VIEW view_name SET SECURE;`

### Key Facts to Memorize

| Fact | Detail |
|------|--------|
| Create syntax | `CREATE SECURE VIEW` |
| Convert syntax | `ALTER VIEW ... SET SECURE` |
| Check if secure | `IS_SECURE` column or `SHOW VIEWS` |
| Data sharing | Secure views strongly recommended |
| CURRENT_ROLE in sharing | Causes query **failure** (do not use) |
| CURRENT_ACCOUNT in sharing | Works correctly |
| Query Profile | Hidden even for owner |
| Error messages | May be redacted |
| Performance | May be slower |

### Comparison Questions: Know the Differences

| Question Type | Regular View | Secure View |
|--------------|--------------|-------------|
| Can unauthorized users see TEXT in SHOW VIEWS? | Yes | No (NULL) |
| Can GET_DDL return definition for non-owner? | Yes | No (NULL) |
| Can optimizer reorder predicates? | Yes | No |
| Can be safely shared? | No | Yes |
| Exposed in Query Profile? | Yes | No |

### Common Traps to Avoid

1. **Trap**: Thinking secure views are always needed
   - **Reality**: Only use for privacy requirements or data sharing

2. **Trap**: Assuming CURRENT_ROLE works in shared views
   - **Reality**: Causes the shared object to **fail** when queried; use CURRENT_ACCOUNT instead

3. **Trap**: Thinking view owner can see Query Profile details
   - **Reality**: Internals hidden even from owner

4. **Trap**: Confusing secure views with row access policies
   - **Reality**: Different features; secure views are manual, RAP is policy-based

5. **Trap**: Assuming no performance impact
   - **Reality**: Secure views can be slower due to optimizer bypass

---

## Quick Reference Card

### SQL Commands

```sql
-- Create secure view
CREATE SECURE VIEW view_name AS SELECT ...;

-- Create secure materialized view
CREATE SECURE MATERIALIZED VIEW mv_name AS SELECT ...;

-- Make existing view secure
ALTER VIEW view_name SET SECURE;

-- Remove secure designation
ALTER VIEW view_name UNSET SECURE;

-- Check if view is secure
SHOW VIEWS LIKE 'view_name';
SELECT is_secure FROM information_schema.views WHERE table_name = 'VIEW_NAME';

-- Test data sharing
ALTER SESSION SET SIMULATED_DATA_SHARING_CONSUMER = 'ACCOUNT_NAME';
```

### Context Functions Summary

| Function | Description | Data Sharing |
|----------|-------------|--------------|
| `CURRENT_ROLE()` | Active role | Causes query **failure** (do not use) |
| `CURRENT_USER()` | Current user | Causes query **failure** (do not use) |
| `CURRENT_ACCOUNT()` | Current account | Works correctly |
| `IS_ROLE_IN_SESSION()` | Role check | Causes query **failure** (do not use) |

### Decision Matrix

| Scenario | Recommendation |
|----------|---------------|
| Internal query simplification | Regular view |
| Row-level security needed | Secure view |
| Sharing with external accounts | Secure view (required) |
| Hiding business logic in view | Secure view |
| Performance-critical, no security need | Regular view |
| Shared aggregated data | Secure materialized view |
