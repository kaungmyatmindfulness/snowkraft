# Domain 5: Data Transformations
## Part 5: Subqueries and Common Table Expressions (CTEs)

**Exam Weight:** This topic is part of Domain 5 (20-25% of exam)

---

## Overview

Subqueries and Common Table Expressions (CTEs) are fundamental SQL constructs for writing complex queries in Snowflake. Understanding when to use each approach, the differences between correlated and uncorrelated subqueries, and how to leverage recursive CTEs for hierarchical data is essential for the SnowPro Core exam.

---

## Section 1: Understanding Subqueries

### What is a Subquery?

A **subquery** is a query nested within another query. Subqueries can appear in:

- The **FROM clause** (also called derived tables or inline views)
- The **WHERE clause** (for filtering based on results from another query)
- The **SELECT list** (scalar subqueries returning a single value)

```sql
-- Subquery in WHERE clause
SELECT employee_name, salary
FROM employees
WHERE salary > (SELECT AVG(salary) FROM employees);

-- Subquery in FROM clause
SELECT dept_name, avg_salary
FROM (
    SELECT department_id, AVG(salary) AS avg_salary
    FROM employees
    GROUP BY department_id
) AS dept_averages
JOIN departments ON dept_averages.department_id = departments.id;
```

### Types of Subqueries

Snowflake categorizes subqueries along two dimensions:

| Dimension 1 | Dimension 2 |
|-------------|-------------|
| **Correlated vs Uncorrelated** | **Scalar vs Non-scalar** |

---

## Section 2: Correlated vs Uncorrelated Subqueries

### Uncorrelated Subqueries

**Definition:** A subquery that has no references to columns from the outer query. It can be evaluated independently and only needs to be executed once.

```sql
-- Uncorrelated subquery: finds the GDP of Brazil independently
SELECT country_name, gdp
FROM countries
WHERE gdp > (SELECT gdp FROM countries WHERE country_name = 'Brazil');
```

**Characteristics:**
- Executes once, regardless of how many rows are in the outer query
- Result is reused for evaluating each row of the outer query
- Generally more efficient than correlated subqueries
- The subquery stands alone - you could run it separately

### Correlated Subqueries

**Definition:** A subquery that references one or more columns from the outer query. It must be re-evaluated for each row processed by the outer query.

```sql
-- Correlated subquery: finds countries with above-average GDP for their continent
SELECT c1.country_name, c1.gdp
FROM countries c1
WHERE c1.gdp > (
    SELECT AVG(c2.gdp)
    FROM countries c2
    WHERE c2.continent = c1.continent  -- References outer query
);
```

**Characteristics:**
- Acts as a filter evaluated for each row in the outer query
- References columns from tables in the outer query
- Can be thought of as a row-by-row filter
- May have performance implications on large datasets

### Comparison Table

| Aspect | Uncorrelated Subquery | Correlated Subquery |
|--------|----------------------|---------------------|
| **Outer column references** | None | References outer query columns |
| **Execution frequency** | Once | Once per outer row |
| **Independence** | Can run standalone | Depends on outer query context |
| **Performance** | Generally better | Can be slower on large tables |
| **Typical use** | Get a single value or set | Row-by-row filtering |

### Example: Side-by-Side Comparison

```sql
-- UNCORRELATED: Get countries richer than Brazil
SELECT country_name
FROM countries
WHERE gdp > (SELECT gdp FROM countries WHERE country_name = 'Brazil');
-- Subquery runs ONCE, returns Brazil's GDP

-- CORRELATED: Get countries richer than their continent's average
SELECT c1.country_name
FROM countries c1
WHERE c1.gdp > (
    SELECT AVG(c2.gdp)
    FROM countries c2
    WHERE c2.continent = c1.continent  -- c1.continent comes from outer query
);
-- Subquery runs for EACH row, calculating that row's continent average
```

---

## Section 3: Scalar vs Non-Scalar Subqueries

### Scalar Subqueries

**Definition:** A subquery that returns exactly one value (one column, one row). If no rows qualify, it returns NULL.

```sql
-- Scalar subquery in SELECT list
SELECT
    employee_name,
    salary,
    (SELECT AVG(salary) FROM employees) AS company_avg_salary
FROM employees;

-- Scalar subquery in WHERE clause
SELECT employee_name, salary
FROM employees
WHERE salary = (SELECT MAX(salary) FROM employees);
```

**Usage Rules:**
- Can appear anywhere a value expression is allowed
- Must contain only ONE item in the SELECT list
- **Runtime error** if it returns more than one row
- Correlated scalar subqueries must be statically determinable to return one row (use aggregate functions)

**Key Limitation:**
```sql
-- This will ERROR if the subquery returns multiple rows
SELECT employee_name
FROM employees
WHERE manager_id = (SELECT id FROM managers WHERE department = 'Sales');

-- Fix: Use aggregate function to guarantee single row
SELECT employee_name
FROM employees
WHERE manager_id = (SELECT MAX(id) FROM managers WHERE department = 'Sales');
```

### Non-Scalar Subqueries

**Definition:** A subquery that can return zero, one, or multiple rows, each potentially containing multiple columns.

```sql
-- Non-scalar subquery with IN
SELECT employee_name
FROM employees
WHERE department_id IN (SELECT id FROM departments WHERE region = 'WEST');

-- Non-scalar subquery with EXISTS
SELECT department_name
FROM departments d
WHERE EXISTS (SELECT 1 FROM employees e WHERE e.department_id = d.id);
```

**Characteristics:**
- Returns 0, 1, or multiple rows
- Each row can have multiple columns
- Returns 0 rows (not NULL) if no qualifying rows
- Used with operators like IN, EXISTS, ANY, ALL

### Subquery Types Supported by Snowflake

| Subquery Type | Support Level |
|---------------|---------------|
| Uncorrelated scalar subqueries | Anywhere a value expression is allowed |
| Correlated scalar subqueries | WHERE clauses only (must return one row) |
| EXISTS subqueries | WHERE clauses (correlated or uncorrelated) |
| ANY / ALL subqueries | WHERE clauses (correlated or uncorrelated) |
| IN subqueries | WHERE clauses (correlated or uncorrelated) |

---

## Section 4: Subquery Operators

### IN / NOT IN

Tests whether a value matches any value in a list returned by the subquery.

```sql
-- IN: Find employees in specific departments
SELECT employee_name
FROM employees
WHERE department_id IN (
    SELECT id FROM departments WHERE budget > 1000000
);

-- NOT IN: Find employees NOT in specific departments
SELECT employee_name
FROM employees
WHERE department_id NOT IN (
    SELECT id FROM departments WHERE location = 'REMOTE'
);
```

**Warning with NULL values:**
```sql
-- NOT IN can produce unexpected results with NULLs
-- If subquery returns any NULL, NOT IN returns no rows
SELECT name FROM table1 WHERE id NOT IN (SELECT id FROM table2);
-- If table2.id contains NULL, this returns EMPTY result!

-- Safer alternative: Use NOT EXISTS
SELECT name FROM table1 t1
WHERE NOT EXISTS (SELECT 1 FROM table2 t2 WHERE t2.id = t1.id);
```

### EXISTS / NOT EXISTS

Tests whether a subquery returns any rows. The actual values returned are irrelevant - only existence matters.

```sql
-- EXISTS: Find departments that have employees
SELECT department_name
FROM departments d
WHERE EXISTS (
    SELECT 1  -- Value doesn't matter, often use 1 or *
    FROM employees e
    WHERE e.department_id = d.id
);

-- NOT EXISTS: Find departments with no employees
SELECT department_name
FROM departments d
WHERE NOT EXISTS (
    SELECT 1
    FROM employees e
    WHERE e.department_id = d.id
);
```

**Key Points:**
- EXISTS returns TRUE as soon as one row is found (efficient short-circuit)
- The SELECT list in EXISTS subquery is irrelevant (SELECT 1, SELECT *, etc.)
- NOT EXISTS handles NULLs more predictably than NOT IN
- Commonly used for correlated subqueries

### ANY / SOME and ALL

Compare a value to each value in a set returned by the subquery.

```sql
-- ANY/SOME: Value compared to any one value in the set
SELECT employee_name, salary
FROM employees
WHERE salary > ANY (SELECT salary FROM employees WHERE department = 'SALES');
-- Returns employees who earn more than AT LEAST ONE Sales employee

-- ALL: Value compared to all values in the set
SELECT employee_name, salary
FROM employees
WHERE salary > ALL (SELECT salary FROM employees WHERE department = 'SALES');
-- Returns employees who earn more than EVERY Sales employee
```

**Comparison Logic:**

| Expression | Equivalent To | Meaning |
|------------|---------------|---------|
| `x = ANY (subquery)` | `x IN (subquery)` | Equals at least one |
| `x > ANY (subquery)` | `x > MIN(subquery)` | Greater than the smallest |
| `x < ANY (subquery)` | `x < MAX(subquery)` | Less than the largest |
| `x > ALL (subquery)` | `x > MAX(subquery)` | Greater than the largest |
| `x < ALL (subquery)` | `x < MIN(subquery)` | Less than the smallest |

---

## Section 5: Common Table Expressions (CTEs)

### What is a CTE?

A **CTE (Common Table Expression)** is a named subquery defined in a WITH clause. Think of it as a temporary view that exists only for the duration of the query.

```sql
WITH my_cte (column1, column2) AS (
    SELECT col1, col2
    FROM some_table
    WHERE condition
)
SELECT * FROM my_cte;
```

### CTE Syntax

```sql
WITH
    cte_name1 AS (
        SELECT ...
    ),
    cte_name2 AS (
        SELECT ... FROM cte_name1 ...  -- Can reference previous CTEs
    )
SELECT ...
FROM cte_name1
JOIN cte_name2 ON ...;
```

**Syntax Components:**
- **WITH** keyword introduces the CTE clause
- **cte_name** is the name of the temporary view
- **Optional column list** `(col1, col2)` can rename output columns
- **AS** followed by the query definition in parentheses
- Multiple CTEs separated by commas

### CTE Naming Best Practices

**Avoid choosing CTE names that match:**
- Reserved keywords
- Existing tables, views, or materialized views

**Important:** If a CTE has the same name as a table, the CTE takes precedence within that query.

### CTE vs Subquery: When to Use Each

| Use Case | CTE | Subquery |
|----------|-----|----------|
| **Reference multiple times** | Yes - define once, use many times | No - must repeat the subquery |
| **Improve readability** | Yes - named, modular | Less readable when nested |
| **Recursive queries** | Yes - supports RECURSIVE | No |
| **Simple one-time use** | Either works | Simpler inline |
| **Building complex queries** | Yes - step by step | Harder to follow |

### CTE Examples

**Basic CTE:**
```sql
WITH high_salary_employees AS (
    SELECT employee_id, employee_name, salary, department_id
    FROM employees
    WHERE salary > 100000
)
SELECT
    d.department_name,
    COUNT(*) AS high_earners
FROM high_salary_employees h
JOIN departments d ON h.department_id = d.id
GROUP BY d.department_name;
```

**Multiple CTEs:**
```sql
WITH
    sales_by_region AS (
        SELECT region, SUM(amount) AS total_sales
        FROM orders
        GROUP BY region
    ),
    avg_sales AS (
        SELECT AVG(total_sales) AS average
        FROM sales_by_region
    )
SELECT
    s.region,
    s.total_sales,
    a.average,
    s.total_sales - a.average AS difference
FROM sales_by_region s
CROSS JOIN avg_sales a
ORDER BY s.total_sales DESC;
```

---

## Section 6: Recursive CTEs

### What is a Recursive CTE?

A **Recursive CTE** is a CTE that references itself, enabling you to process hierarchical or graph-structured data without knowing the depth in advance.

**Common Use Cases:**
- Organizational hierarchies (employee-manager relationships)
- Parts explosions (components and sub-components)
- Bill of materials
- Network/graph traversal
- Category trees

### Recursive CTE Syntax

```sql
WITH RECURSIVE cte_name AS (
    -- Anchor clause: starting point (no self-reference)
    SELECT ...

    UNION ALL

    -- Recursive clause: iterates, references cte_name
    SELECT ...
    FROM table JOIN cte_name ON ...
)
SELECT * FROM cte_name;
```

**Key Components:**

| Component | Description |
|-----------|-------------|
| **WITH RECURSIVE** | Indicates a recursive CTE |
| **Anchor clause** | The initial SELECT that starts the recursion (cannot reference cte_name) |
| **UNION ALL** | Combines anchor results with recursive results |
| **Recursive clause** | SELECT that references the cte_name to build next level |

### How Recursive CTEs Execute

1. **Anchor clause** executes first, producing initial rows
2. Results go into a "working table" accessible as `cte_name`
3. **Recursive clause** executes using the working table
4. New results are added to final output AND replace the working table
5. Steps 3-4 repeat until recursive clause returns no rows
6. Final accumulated results are returned

### Example: Organizational Hierarchy

**Setup:**
```sql
CREATE TABLE employees (
    employee_id INT,
    employee_name VARCHAR,
    manager_id INT,  -- References employee_id of manager
    title VARCHAR
);

INSERT INTO employees VALUES
    (1, 'Alice', NULL, 'CEO'),
    (2, 'Bob', 1, 'VP Sales'),
    (3, 'Carol', 1, 'VP Engineering'),
    (4, 'Dave', 2, 'Sales Manager'),
    (5, 'Eve', 3, 'Engineering Manager'),
    (6, 'Frank', 4, 'Sales Rep'),
    (7, 'Grace', 5, 'Engineer');
```

**Recursive Query - Show Hierarchy:**
```sql
WITH RECURSIVE org_hierarchy AS (
    -- Anchor: Start with the CEO (no manager)
    SELECT
        employee_id,
        employee_name,
        manager_id,
        title,
        0 AS level,
        employee_name AS path
    FROM employees
    WHERE manager_id IS NULL

    UNION ALL

    -- Recursive: Find direct reports of current level
    SELECT
        e.employee_id,
        e.employee_name,
        e.manager_id,
        e.title,
        oh.level + 1,
        oh.path || ' > ' || e.employee_name
    FROM employees e
    INNER JOIN org_hierarchy oh ON e.manager_id = oh.employee_id
)
SELECT
    REPEAT('    ', level) || employee_name AS indented_name,
    title,
    level,
    path
FROM org_hierarchy
ORDER BY path;
```

**Output:**
```
INDENTED_NAME          | TITLE               | LEVEL | PATH
-----------------------|---------------------|-------|---------------------------
Alice                  | CEO                 | 0     | Alice
    Bob                | VP Sales            | 1     | Alice > Bob
        Dave           | Sales Manager       | 2     | Alice > Bob > Dave
            Frank      | Sales Rep           | 3     | Alice > Bob > Dave > Frank
    Carol              | VP Engineering      | 1     | Alice > Carol
        Eve            | Engineering Manager | 2     | Alice > Carol > Eve
            Grace      | Engineer            | 3     | Alice > Carol > Eve > Grace
```

### Recursive CTE Restrictions

The recursive clause has important limitations:

| NOT Allowed in Recursive Clause | Reason |
|--------------------------------|--------|
| Aggregate functions (SUM, COUNT, etc.) | Could create infinite aggregation |
| Window functions | Require complete result set |
| GROUP BY | Aggregation not supported |
| DISTINCT | Requires complete evaluation |
| LIMIT | Not supported in recursive portion |
| Subqueries referencing cte_name | Only direct reference allowed |

### Preventing Infinite Loops

**Danger:** Incorrect recursive CTEs can loop forever.

**Common Causes:**
1. **Cyclic data** - e.g., A reports to B, B reports to A
2. **Incorrect column order** - passing wrong value as the recursive key
3. **Missing or wrong join condition**

**Prevention Strategies:**

```sql
-- Strategy 1: Limit recursion depth
WITH RECURSIVE cte AS (
    SELECT id, parent_id, 1 AS depth FROM table WHERE parent_id IS NULL
    UNION ALL
    SELECT t.id, t.parent_id, c.depth + 1
    FROM table t
    JOIN cte c ON t.parent_id = c.id
    WHERE c.depth < 10  -- Limit to 10 levels
)
SELECT * FROM cte;

-- Strategy 2: Track visited nodes (prevent cycles)
WITH RECURSIVE cte AS (
    SELECT id, parent_id, ARRAY_CONSTRUCT(id) AS visited
    FROM table WHERE parent_id IS NULL
    UNION ALL
    SELECT t.id, t.parent_id, ARRAY_APPEND(c.visited, t.id)
    FROM table t
    JOIN cte c ON t.parent_id = c.id
    WHERE NOT ARRAY_CONTAINS(t.id::VARIANT, c.visited)  -- Skip if already visited
)
SELECT * FROM cte;
```

---

## Section 7: LATERAL Joins and Correlated Subqueries

### What is a LATERAL Join?

A **LATERAL join** allows the right-hand side (an inline view) to reference columns from the left-hand table expression. It's similar to a correlated subquery but can return multiple rows and columns.

```sql
SELECT *
FROM left_table t1,
LATERAL (
    SELECT * FROM right_table t2
    WHERE t2.key = t1.key  -- References left table
    LIMIT 3
) AS lateral_result;
```

### LATERAL vs Correlated Subquery

| Aspect | Correlated Subquery | LATERAL Join |
|--------|---------------------|--------------|
| **Output rows** | One value | Multiple rows possible |
| **Output columns** | One column | Multiple columns possible |
| **Use case** | Filtering, single values | Row generation, FLATTEN |

### LATERAL with FLATTEN

The most common use of LATERAL is with the FLATTEN function for semi-structured data:

```sql
-- Without LATERAL (FLATTEN with implicit lateral behavior)
SELECT
    e.employee_name,
    p.value AS project_name
FROM employees e,
TABLE(FLATTEN(input => e.project_names)) p;

-- Explicit LATERAL syntax
SELECT
    e.employee_name,
    p.value AS project_name
FROM employees e,
LATERAL FLATTEN(input => e.project_names) p;
```

---

## Section 8: Subquery Limitations

### General Limitations

| Limitation | Details |
|------------|---------|
| **LIMIT clause** | Only allowed in uncorrelated scalar subqueries |
| **ANY/ALL/NOT EXISTS** | Some clauses not allowed inside these |
| **FLATTEN correlation** | Subqueries with correlation inside FLATTEN not supported |
| **Correlated scalar** | Must be determinable to return one row statically |

### Search Optimization and Scalar Subqueries

Snowflake's Search Optimization Service can improve performance for queries containing scalar subqueries, particularly those with equality predicates. This is an advanced topic covered separately.

---

## Section 9: Key Exam Patterns and Tips

### Common Exam Question Types

**1. Identifying Correlated vs Uncorrelated**

Q: Which subquery is correlated?
```sql
-- Option A
SELECT * FROM t1 WHERE col1 = (SELECT MAX(col1) FROM t2);
-- Option B
SELECT * FROM t1 WHERE col1 = (SELECT MAX(col2) FROM t2 WHERE t2.id = t1.id);
```
A: Option B is correlated (references t1.id from outer query)

**2. CTE vs Subquery**

Q: When should you use a CTE instead of a subquery?
- A: When you need to reference the result multiple times in the same query

Q: Can a CTE reference another CTE defined before it?
- A: Yes, CTEs can reference previously defined CTEs in the same WITH clause

**3. Recursive CTE**

Q: What keyword indicates a recursive CTE?
- A: WITH RECURSIVE

Q: What are the two parts of a recursive CTE?
- A: Anchor clause and recursive clause, joined by UNION ALL

Q: What happens if a recursive CTE creates an infinite loop?
- A: Query runs until timeout or cancelled; use depth limits to prevent

**4. EXISTS vs IN**

Q: Which handles NULL values more predictably?
- A: EXISTS/NOT EXISTS

Q: What does EXISTS return if the subquery finds no rows?
- A: FALSE (not NULL)

**5. Scalar Subquery Errors**

Q: What happens if a scalar subquery returns multiple rows?
- A: Runtime error

### Memory Aids

**"CORRELATED = References outer"** - If the subquery mentions columns from the outer query, it's correlated

**"Scalar = Single value"** - Scalar subqueries return exactly one row with one column

**"Anchor + Recursive = UNION ALL"** - Recursive CTEs always use UNION ALL between the two clauses

**"EXISTS short-circuits"** - EXISTS returns TRUE as soon as one row is found, making it efficient

**"CTE = Temporary View"** - Think of a CTE as a view that only exists for one query

**"LATERAL = Row-by-row inline view"** - LATERAL lets the inline view "see" each row from the left table

### Quick Reference: Subquery Operators

| Operator | Usage | Returns |
|----------|-------|---------|
| `IN` | `col IN (subquery)` | TRUE if col matches any row |
| `NOT IN` | `col NOT IN (subquery)` | TRUE if col matches no row (NULL-sensitive!) |
| `EXISTS` | `EXISTS (subquery)` | TRUE if subquery returns any rows |
| `NOT EXISTS` | `NOT EXISTS (subquery)` | TRUE if subquery returns no rows |
| `= ANY` | `col = ANY (subquery)` | Same as IN |
| `> ANY` | `col > ANY (subquery)` | TRUE if col > at least one value |
| `> ALL` | `col > ALL (subquery)` | TRUE if col > every value |

### Quick Reference: CTE Syntax

```sql
-- Non-recursive CTE
WITH cte_name AS (
    SELECT ...
)
SELECT * FROM cte_name;

-- Multiple CTEs
WITH
    cte1 AS (SELECT ...),
    cte2 AS (SELECT ... FROM cte1)
SELECT * FROM cte1 JOIN cte2;

-- Recursive CTE
WITH RECURSIVE cte_name AS (
    -- Anchor (no self-reference)
    SELECT ... WHERE starting_condition
    UNION ALL
    -- Recursive (references cte_name)
    SELECT ... FROM table JOIN cte_name ON ...
)
SELECT * FROM cte_name;
```

---

## Section 10: Summary Comparison Tables

### Subquery Classification

| Type | Definition | Example Use |
|------|------------|-------------|
| **Uncorrelated** | No outer references | Get a fixed value |
| **Correlated** | References outer query | Filter per row |
| **Scalar** | Returns one value | Use anywhere a value fits |
| **Non-scalar** | Returns 0+ rows | Use with IN, EXISTS |

### CTE vs Subquery vs View

| Feature | Subquery | CTE | View |
|---------|----------|-----|------|
| **Scope** | Single use in query | Single query | Permanent |
| **Reusability in query** | Must repeat | Reference multiple times | Reference multiple times |
| **Recursion** | No | Yes (WITH RECURSIVE) | No |
| **Storage** | None | None | Metadata only |
| **Best for** | Simple, one-time | Complex, multi-reference | Shared, permanent |

### EXISTS vs IN

| Consideration | EXISTS | IN |
|---------------|--------|-----|
| **NULL handling** | Safe | NOT IN with NULLs is problematic |
| **Short-circuit** | Yes | No |
| **Correlated typical** | Yes | Either |
| **Performance** | Often better for correlated | Better for small fixed lists |

---

## Practice Questions

1. What type of subquery is this?
   ```sql
   SELECT * FROM orders o
   WHERE total > (SELECT AVG(total) FROM orders WHERE region = o.region);
   ```

<details>
<summary>Show Answer</summary>

**Answer:** Correlated scalar subquery (references o.region from outer query)
</details>

2. How do you write a recursive CTE to traverse a 5-level category hierarchy?

<details>
<summary>Show Answer</summary>

**Answer:** Use WITH RECURSIVE with an anchor selecting root categories and a recursive clause joining on parent_id
</details>

3. What happens when NOT IN encounters a NULL in the subquery result?

<details>
<summary>Show Answer</summary>

**Answer:** The entire NOT IN condition returns no rows (FALSE for all)
</details>

4. Can a CTE defined second in the WITH clause reference the first CTE?

<details>
<summary>Show Answer</summary>

**Answer:** Yes, CTEs can reference any CTE defined before them in the same WITH clause
</details>

5. What is the difference between `> ANY` and `> ALL`?

<details>
<summary>Show Answer</summary>

**Answer:** `> ANY` is true if greater than at least one value; `> ALL` is true only if greater than every value
</details>

6. Why might EXISTS perform better than IN for correlated subqueries?

<details>
<summary>Show Answer</summary>

**Answer:** EXISTS short-circuits (returns TRUE immediately when first match found), while IN may evaluate all rows
</details>
