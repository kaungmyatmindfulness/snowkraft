# Domain 5: Data Transformations

## Part 02: SELECT Statements and Joins

**Exam Weight:** This topic is part of Domain 5 (20-25% of exam)

---

## Overview

Understanding SQL SELECT statements and JOIN operations is fundamental for data transformations in Snowflake. This section covers the various JOIN types supported by Snowflake, their syntax, use cases, and performance considerations. The SnowPro Core exam frequently tests your ability to identify correct JOIN behavior and syntax.

---

## Section 1: SELECT Statement Fundamentals

### The SELECT Statement Structure

The SELECT statement is the foundation of all queries in Snowflake. Understanding the order of clauses and their purposes is essential.

**Standard SELECT Syntax:**

```sql
SELECT [ALL | DISTINCT] column_list
FROM table_expression
[WHERE condition]
[GROUP BY column_list]
[HAVING condition]
[QUALIFY condition]
[ORDER BY column_list [ASC | DESC]]
[LIMIT number [OFFSET number]]
```

### Clause Execution Order

Understanding the logical execution order helps predict query behavior:

| Order | Clause | Purpose |
|-------|--------|---------|
| 1 | FROM / JOIN | Identify source tables |
| 2 | WHERE | Filter rows before grouping |
| 3 | GROUP BY | Aggregate rows into groups |
| 4 | HAVING | Filter groups after aggregation |
| 5 | SELECT | Select columns and expressions |
| 6 | DISTINCT | Remove duplicate rows |
| 7 | QUALIFY | Filter window function results |
| 8 | ORDER BY | Sort result set |
| 9 | LIMIT / OFFSET | Restrict returned rows |

### Key SELECT Features in Snowflake

**Column Aliases:**
```sql
SELECT
    employee_name AS name,
    salary * 12 AS annual_salary,
    department_id "Department ID"  -- Quoted identifier preserves case
FROM employees;
```

**DISTINCT vs ALL:**
- `ALL` (default): Returns all rows, including duplicates
- `DISTINCT`: Removes duplicate rows from result set

```sql
-- Returns unique combinations only
SELECT DISTINCT department, job_title
FROM employees;
```

**QUALIFY Clause (Snowflake-specific):**
Filters results of window functions, similar to how HAVING filters aggregates.

```sql
-- Get the top earner in each department
SELECT employee_name, department, salary
FROM employees
QUALIFY ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) = 1;
```

---

## Section 2: Types of Joins

Snowflake supports multiple JOIN types for combining data from two or more tables. Understanding the differences between these JOIN types is critical for the exam.

### Overview of Supported Join Types

| Join Type | Description | Returns |
|-----------|-------------|---------|
| **INNER JOIN** | Matches rows in both tables | Only matching rows |
| **LEFT OUTER JOIN** | All rows from left + matches from right | All left rows, NULLs for non-matches |
| **RIGHT OUTER JOIN** | All rows from right + matches from left | All right rows, NULLs for non-matches |
| **FULL OUTER JOIN** | All rows from both tables | All rows, NULLs for non-matches |
| **CROSS JOIN** | Cartesian product | Every combination (N x M rows) |
| **NATURAL JOIN** | Automatic join on same-named columns | Depends on underlying type |
| **LATERAL JOIN** | Reference preceding table in subquery | Correlated results |
| **ASOF JOIN** | Time-series closest match | One-to-one time alignment |

---

## Section 3: INNER JOIN

### Definition and Behavior

An INNER JOIN returns only the rows where there is a match in both tables based on the join condition.

**Key Characteristics:**
- Returns only matching rows from both tables
- Non-matching rows from either table are excluded
- Most commonly used join type
- Order of tables doesn't affect result (just column order)

### Syntax

```sql
-- Explicit JOIN syntax (recommended)
SELECT p.project_name, e.employee_name
FROM projects AS p
INNER JOIN employees AS e
    ON e.project_id = p.project_id
ORDER BY p.project_id;

-- INNER keyword is optional
SELECT p.project_name, e.employee_name
FROM projects p
JOIN employees e
    ON e.project_id = p.project_id;
```

### Example with Data

**projects table:**
| project_id | project_name |
|------------|--------------|
| 1 | Project Alpha |
| 2 | Project Beta |
| 3 | NewProject |

**employees table:**
| employee_id | employee_name | project_id |
|-------------|---------------|------------|
| 101 | Alice | 1 |
| 102 | Bob | 1 |
| 103 | Carol | 2 |
| 104 | NewEmployee | NULL |

**INNER JOIN Result:**
| project_name | employee_name |
|--------------|---------------|
| Project Alpha | Alice |
| Project Alpha | Bob |
| Project Beta | Carol |

**Note:**
- "NewProject" (project_id=3) is excluded (no matching employees)
- "NewEmployee" (project_id=NULL) is excluded (no matching project)

---

## Section 4: OUTER JOINS

### LEFT OUTER JOIN

Returns all rows from the left table and matching rows from the right table. Non-matching rows from the right side have NULL values.

```sql
SELECT p.project_name, e.employee_name
FROM projects AS p
LEFT OUTER JOIN employees AS e
    ON e.project_id = p.project_id
ORDER BY p.project_name;
```

**Result:**
| project_name | employee_name |
|--------------|---------------|
| NewProject | NULL |
| Project Alpha | Alice |
| Project Alpha | Bob |
| Project Beta | Carol |

**Note:** "NewProject" appears with NULL employee_name because no employees are assigned to it.

### RIGHT OUTER JOIN

Returns all rows from the right table and matching rows from the left table.

```sql
SELECT p.project_name, e.employee_name
FROM projects AS p
RIGHT OUTER JOIN employees AS e
    ON e.project_id = p.project_id
ORDER BY e.employee_name;
```

**Result:**
| project_name | employee_name |
|--------------|---------------|
| Project Alpha | Alice |
| Project Alpha | Bob |
| Project Beta | Carol |
| NULL | NewEmployee |

**Note:** "NewEmployee" appears with NULL project_name because they're not assigned to any project.

### FULL OUTER JOIN

Returns all rows from both tables, with NULLs where there's no match.

```sql
SELECT p.project_name, e.employee_name
FROM projects AS p
FULL OUTER JOIN employees AS e
    ON e.project_id = p.project_id
ORDER BY p.project_name, e.employee_name;
```

**Result:**
| project_name | employee_name |
|--------------|---------------|
| NULL | NewEmployee |
| NewProject | NULL |
| Project Alpha | Alice |
| Project Alpha | Bob |
| Project Beta | Carol |

### OUTER Keyword is Optional

The `OUTER` keyword can be omitted:

```sql
-- These are equivalent:
SELECT * FROM t1 LEFT OUTER JOIN t2 ON t1.id = t2.id;
SELECT * FROM t1 LEFT JOIN t2 ON t1.id = t2.id;

-- These are equivalent:
SELECT * FROM t1 RIGHT OUTER JOIN t2 ON t1.id = t2.id;
SELECT * FROM t1 RIGHT JOIN t2 ON t1.id = t2.id;

-- These are equivalent:
SELECT * FROM t1 FULL OUTER JOIN t2 ON t1.id = t2.id;
SELECT * FROM t1 FULL JOIN t2 ON t1.id = t2.id;
```

---

## Section 5: CROSS JOIN

### Definition and Behavior

A CROSS JOIN produces a Cartesian product - every row from the first table is combined with every row from the second table.

**Key Characteristics:**
- No join condition (ON clause)
- Result size = N x M rows (where N and M are row counts)
- Can be expensive for large tables
- Rarely used alone, often unintentional

**Warning:** CROSS JOINs can produce extremely large result sets. If table1 has 1000 rows and table2 has 1000 rows, the result has 1,000,000 rows.

### Syntax

```sql
SELECT p.project_name, e.employee_name
FROM projects AS p
CROSS JOIN employees AS e
ORDER BY p.project_id, e.employee_id;
```

### CROSS JOIN with Filter

Adding a WHERE clause to a CROSS JOIN can produce the same result as an INNER JOIN:

```sql
-- Cross join with filter
SELECT p.project_name, e.employee_name
FROM projects AS p
CROSS JOIN employees AS e
WHERE e.project_id = p.project_id
ORDER BY p.project_id;

-- Equivalent INNER JOIN
SELECT p.project_name, e.employee_name
FROM projects AS p
INNER JOIN employees AS e
    ON e.project_id = p.project_id
ORDER BY p.project_id;
```

**Important Exam Note:** While the results can be equivalent, placing the join condition in the ON clause (INNER JOIN) vs WHERE clause (CROSS JOIN) can produce different results with OUTER JOINs due to NULL handling.

### Legitimate Use Cases for CROSS JOIN

1. **Generate combinations:** Create all possible pairings
2. **Date/dimension expansion:** Pair every date with every product
3. **Small lookup tables:** When intentionally creating combinations

```sql
-- Generate all month-product combinations for analysis
SELECT
    d.month,
    p.product_name
FROM date_dimension d
CROSS JOIN products p
WHERE d.year = 2024;
```

---

## Section 6: NATURAL JOIN

### Definition and Behavior

A NATURAL JOIN automatically joins tables on all columns with the same name and compatible data types.

**Key Characteristics:**
- No ON clause needed - join condition is implicit
- Joins on ALL columns with matching names
- Output includes only ONE copy of shared columns
- Can be combined with OUTER join types

### Syntax

```sql
SELECT *
FROM projects NATURAL JOIN employees
ORDER BY employee_id;
```

**Important:** If both tables have a `project_id` column, the NATURAL JOIN automatically constructs: `ON projects.project_id = employees.project_id`

### Multiple Matching Columns

If two tables share multiple column names, NATURAL JOIN uses ALL of them:

```sql
-- If both tables have 'city' and 'province' columns:
-- NATURAL JOIN constructs:
-- ON table1.city = table2.city AND table1.province = table2.province
```

### NATURAL JOIN Restrictions

- Cannot use with an ON clause (condition is implicit)
- Can use with WHERE clause for additional filtering
- Can combine with LEFT/RIGHT/FULL OUTER

```sql
-- NATURAL LEFT OUTER JOIN
SELECT *
FROM projects
NATURAL LEFT OUTER JOIN employees;

-- NATURAL JOIN with WHERE filter
SELECT *
FROM projects
NATURAL JOIN employees
WHERE employee_name LIKE 'A%';
```

### Caution with NATURAL JOIN

**Exam Tip:** NATURAL JOINs can produce unexpected results if tables share column names unintentionally. Explicit ON clauses are generally preferred for clarity.

---

## Section 7: LATERAL JOIN

### Definition and Behavior

A LATERAL join allows an inline view (subquery) to reference columns from preceding table expressions in the FROM clause.

**Key Characteristics:**
- Subquery can reference columns from the left-hand table
- Similar to a correlated subquery but can return multiple rows and columns
- Commonly used with table functions like FLATTEN
- Evaluated once per row from the left table

### Syntax

```sql
SELECT *
FROM departments AS d,
    LATERAL (
        SELECT *
        FROM employees AS e
        WHERE e.department_id = d.department_id
    ) AS emp
ORDER BY d.department_id;
```

### LATERAL vs Correlated Subquery

| Feature | Correlated Subquery | LATERAL Join |
|---------|---------------------|--------------|
| Returns | Single value | Multiple rows and columns |
| Position | WHERE or SELECT clause | FROM clause |
| Reference | Outer query columns | Preceding table columns |

### Common Use Case: FLATTEN

The FLATTEN table function is commonly used with LATERAL to process semi-structured data:

```sql
-- Process array data with LATERAL FLATTEN
SELECT
    emp.employee_id,
    proj_names.value::string AS project_name
FROM employees AS emp,
    LATERAL FLATTEN(INPUT => emp.project_names) AS proj_names
ORDER BY employee_id;
```

### LATERAL with Explicit Keyword

```sql
SELECT
    value:name::string AS "Customer Name",
    value:address::string AS "Address"
FROM car_sales,
LATERAL FLATTEN(INPUT => src:customer);
```

**Important:** LATERAL allows the FLATTEN function to reference the `src` column from the `car_sales` table in each row.

---

## Section 8: ASOF JOIN

### Definition and Behavior

ASOF JOIN is designed for time-series data, matching rows based on the closest timestamp rather than exact matches.

**Key Characteristics:**
- Matches each row from the left table to the closest row from the right table
- Uses MATCH_CONDITION for temporal comparison
- Result cardinality equals left table cardinality
- Optimized for financial and time-series analysis

### Syntax

```sql
SELECT
    t.stock_symbol,
    t.trade_time,
    t.quantity,
    q.quote_time,
    q.price
FROM trades t
ASOF JOIN quotes q
    MATCH_CONDITION(t.trade_time >= q.quote_time)
    ON t.stock_symbol = q.stock_symbol;
```

### MATCH_CONDITION Operators

| Operator | Behavior |
|----------|----------|
| `>=` | Find closest row at or before |
| `>` | Find closest row strictly before |
| `<=` | Find closest row at or after |
| `<` | Find closest row strictly after |

### Use Cases

1. **Financial trading:** Match trades with most recent quotes
2. **IoT sensors:** Correlate readings from different devices
3. **Event analysis:** Find nearest events across systems

```sql
-- What was the stock price at the time of each trade?
SELECT
    t.trade_time,
    t.quantity,
    q.quote_time,
    q.bid_price
FROM trades t
ASOF JOIN quotes q
    MATCH_CONDITION(t.trade_time >= q.quote_time)
    ON t.stock_symbol = q.stock_symbol;
```

---

## Section 9: Join Conditions (ON vs WHERE vs USING)

### ON Clause

The ON clause specifies the join condition and is the recommended approach:

```sql
SELECT *
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id;
```

### WHERE Clause for Join Conditions

Using WHERE for join conditions works for INNER JOINs but can cause issues with OUTER JOINs:

```sql
-- Works like INNER JOIN
SELECT *
FROM orders o, customers c
WHERE o.customer_id = c.customer_id;
```

**Critical Difference with OUTER JOINs:**

```sql
-- LEFT JOIN with ON - preserves unmatched rows
SELECT *
FROM table1 t1
LEFT JOIN table2 t2 ON t1.id = t2.id;

-- LEFT JOIN with WHERE - filters out NULLs (acts like INNER JOIN!)
SELECT *
FROM table1 t1
LEFT JOIN table2 t2 ON t1.id = t2.id
WHERE t2.id IS NOT NULL;  -- This defeats the LEFT JOIN
```

### USING Clause

When columns have the same name in both tables, USING simplifies the syntax:

```sql
-- These are equivalent:
SELECT * FROM orders JOIN customers ON orders.customer_id = customers.customer_id;
SELECT * FROM orders JOIN customers USING (customer_id);

-- Multiple columns with USING:
SELECT * FROM t1 JOIN t2 USING (col1, col2);
```

---

## Section 10: DIRECTED Joins

### Purpose

The DIRECTED keyword enforces a specific scan order for joined tables.

```sql
-- Forces scanning o1 before o2
SELECT *
FROM t1 INNER DIRECTED JOIN t2
    ON t1.id = t2.id;
```

### Requirements

- Join type keyword (INNER, LEFT, etc.) is required when using DIRECTED
- Used for performance tuning when optimizer chooses suboptimal order

---

## Section 11: Join Elimination

### What is Join Elimination?

Snowflake's query optimizer can automatically eliminate unnecessary joins from a query plan to improve performance.

### Scenarios for Join Elimination

**1. Left Outer Join with No Right Columns:**
```sql
-- Snowflake can eliminate the join to dim_products
SELECT f.*
FROM fact_sales f
LEFT OUTER JOIN dim_products p
    ON f.product_id = p.product_id;
-- Optimized to: SELECT * FROM fact_sales;
```

**2. Self-Join Elimination:**
```sql
-- Join to same table on primary key
SELECT p1.product_id, p2.product_name
FROM dim_products p1, dim_products p2
WHERE p1.product_id = p2.product_id;
-- Optimized to single table scan
```

**3. Primary/Foreign Key Join Elimination:**
```sql
-- When foreign key references primary key
SELECT p.product_id, f.units_sold
FROM fact_sales f, dim_products p
WHERE f.product_id = p.product_id;
-- Can be optimized if only referencing fact table columns
```

**Exam Tip:** Join elimination requires properly defined constraints (PRIMARY KEY, FOREIGN KEY) even though Snowflake doesn't enforce them for data integrity.

---

## Section 12: Subqueries

### Types of Subqueries

**Correlated vs Uncorrelated:**

| Type | Description | Performance |
|------|-------------|-------------|
| **Uncorrelated** | Independent of outer query | Executes once |
| **Correlated** | References outer query columns | Executes per outer row |

```sql
-- Uncorrelated: subquery runs once
SELECT c1, c2
FROM table1
WHERE c1 = (SELECT MAX(x) FROM table2);

-- Correlated: subquery runs for each outer row
SELECT c1, c2
FROM table1
WHERE c1 = (SELECT x FROM table2 WHERE y = table1.c2);
```

### Scalar vs Non-Scalar Subqueries

| Type | Returns | Notes |
|------|---------|-------|
| **Scalar** | Single value (one row, one column) | Returns NULL if no rows |
| **Non-Scalar** | 0 to many rows, 1 to many columns | Used with IN, EXISTS, ANY/ALL |

```sql
-- Scalar subquery (returns one value)
SELECT employee_name
FROM employees
WHERE salary > (SELECT AVG(salary) FROM employees);

-- Non-scalar subquery with IN
SELECT employee_name
FROM employees
WHERE department_id IN (SELECT department_id FROM departments WHERE region = 'West');
```

### Subquery Operators

| Operator | Purpose |
|----------|---------|
| `IN` | Test membership in result set |
| `NOT IN` | Test non-membership |
| `EXISTS` | Test if subquery returns any rows |
| `NOT EXISTS` | Test if subquery returns no rows |
| `ANY / SOME` | Compare to any value in result |
| `ALL` | Compare to all values in result |

```sql
-- EXISTS example
SELECT customer_name
FROM customers c
WHERE EXISTS (
    SELECT 1 FROM orders o
    WHERE o.customer_id = c.customer_id
);

-- ALL example
SELECT product_name
FROM products
WHERE price > ALL (SELECT price FROM competitor_products);
```

---

## Section 13: Common Join Patterns

### Self-Join

Joining a table to itself, typically for hierarchical data:

```sql
-- Employee hierarchy
SELECT
    e.employee_name,
    m.employee_name AS manager_name
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.employee_id;
```

### Anti-Join

Finding rows that DON'T have matches:

```sql
-- Customers without orders (LEFT JOIN + NULL check)
SELECT c.customer_name
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id
WHERE o.order_id IS NULL;

-- Equivalent using NOT EXISTS
SELECT customer_name
FROM customers c
WHERE NOT EXISTS (
    SELECT 1 FROM orders o
    WHERE o.customer_id = c.customer_id
);
```

### Semi-Join

Finding rows that DO have matches (without duplicating):

```sql
-- Customers with orders (using EXISTS)
SELECT customer_name
FROM customers c
WHERE EXISTS (
    SELECT 1 FROM orders o
    WHERE o.customer_id = c.customer_id
);

-- Equivalent using IN
SELECT customer_name
FROM customers
WHERE customer_id IN (SELECT customer_id FROM orders);
```

### Multiple Table Join

```sql
SELECT
    o.order_id,
    c.customer_name,
    p.product_name,
    oi.quantity
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
JOIN order_items oi ON o.order_id = oi.order_id
JOIN products p ON oi.product_id = p.product_id;
```

---

## Section 14: Query Result Caching

### How Result Caching Works

When a query is executed, Snowflake caches the result for potential reuse.

**Cache Reuse Requirements:**
- Query text matches exactly (including whitespace and case)
- Underlying table data hasn't changed
- Cache hasn't expired (24-hour default)
- User has required privileges on tables
- Query doesn't use certain functions (RANDOM, CURRENT_TIMESTAMP, etc.)

### Cache Expiration

| Result Size | Token Expiration | Cache Duration |
|-------------|-----------------|----------------|
| < 100 KB | No token needed | 24 hours |
| >= 100 KB | 6 hours | 24 hours (max 31 days with reuse) |

**Important:** Each time a cached result is reused, the 24-hour retention is reset, up to a maximum of 31 days from the original query.

### Disabling Result Caching

```sql
-- Session level
ALTER SESSION SET USE_CACHED_RESULT = FALSE;

-- Query returns fresh results
SELECT * FROM sales;

-- Re-enable
ALTER SESSION SET USE_CACHED_RESULT = TRUE;
```

---

## Exam Tips and Common Question Patterns

### Key Concepts to Remember

1. **INNER JOIN** - Only matching rows from both tables
2. **LEFT/RIGHT OUTER JOIN** - All rows from one side, NULLs for non-matches
3. **FULL OUTER JOIN** - All rows from both tables, NULLs for non-matches
4. **CROSS JOIN** - Cartesian product (N x M rows)
5. **NATURAL JOIN** - Automatic join on same-named columns
6. **LATERAL JOIN** - Subquery can reference preceding table
7. **ASOF JOIN** - Time-series closest match

### Common Exam Questions

**Q: Which join type returns only matching rows from both tables?**
A: INNER JOIN

**Q: What happens in a LEFT OUTER JOIN when there's no match in the right table?**
A: Right table columns contain NULL values

**Q: How many rows does a CROSS JOIN produce?**
A: Number of rows in table1 multiplied by rows in table2

**Q: What is the purpose of LATERAL in a join?**
A: Allows the inline view to reference columns from preceding tables

**Q: What does ASOF JOIN match on?**
A: The closest timestamp match based on the MATCH_CONDITION

**Q: How long is query result cache valid by default?**
A: 24 hours (can extend up to 31 days with reuse)

### Common Pitfalls

1. **WHERE vs ON with OUTER JOINs:** Filtering in WHERE after an OUTER JOIN can eliminate the "outer" effect

2. **NATURAL JOIN surprises:** If tables share unexpected column names, joins may fail or produce wrong results

3. **CROSS JOIN performance:** Always consider cardinality - can produce massive result sets

4. **Correlated subqueries:** Can be slow because they execute once per outer row

5. **NULL handling in joins:** NULL values never match in join conditions

### Practice Scenarios

**Scenario 1:** "Get all customers and their orders, including customers with no orders"
- Answer: LEFT OUTER JOIN from customers to orders

**Scenario 2:** "Find products that have never been ordered"
- Answer: LEFT JOIN products to order_items WHERE order_item_id IS NULL

**Scenario 3:** "Match each trade with the most recent quote before the trade time"
- Answer: ASOF JOIN with MATCH_CONDITION(trade_time >= quote_time)

**Scenario 4:** "Explode an array column to get one row per element"
- Answer: LATERAL FLATTEN on the array column

---

## Summary Table

| Join Type | Syntax | Returns | Use Case |
|-----------|--------|---------|----------|
| INNER | `A JOIN B ON ...` | Matching rows only | Standard relationship queries |
| LEFT OUTER | `A LEFT JOIN B ON ...` | All A + matches from B | Preserve all left rows |
| RIGHT OUTER | `A RIGHT JOIN B ON ...` | All B + matches from A | Preserve all right rows |
| FULL OUTER | `A FULL JOIN B ON ...` | All A + All B | Find all unmatched rows |
| CROSS | `A CROSS JOIN B` | N x M rows | Generate combinations |
| NATURAL | `A NATURAL JOIN B` | Auto-join on same columns | Quick join (use carefully) |
| LATERAL | `A, LATERAL (subquery)` | Correlated results | FLATTEN, complex subqueries |
| ASOF | `A ASOF JOIN B MATCH_CONDITION(...)` | Time-aligned results | Time-series analysis |

---

## Additional Resources

- Snowflake Documentation: [Working with Joins](https://docs.snowflake.com/en/user-guide/querying-joins)
- Snowflake Documentation: [LATERAL Joins](https://docs.snowflake.com/en/user-guide/lateral-join-using)
- Snowflake Documentation: [ASOF JOIN](https://docs.snowflake.com/en/sql-reference/constructs/asof-join)
- Snowflake Documentation: [Subqueries](https://docs.snowflake.com/en/user-guide/querying-subqueries)
- Snowflake Documentation: [Result Caching](https://docs.snowflake.com/en/user-guide/querying-persisted-results)
