# Domain 5: Data Transformations

## Part 10: Conditional Expressions and Logic

**Exam Weight:** This topic is part of Domain 5 (20-25% of exam)

---

## Overview

Conditional expressions are fundamental to SQL data transformations in Snowflake. They enable branching logic, NULL handling, and value substitution within queries. Mastering these functions is essential for the SnowPro Core exam and for writing efficient, readable SQL.

---

## Section 1: CASE Expression

### What is CASE?

The `CASE` expression is the most versatile conditional construct in SQL. It evaluates conditions and returns a value when the first condition is met (similar to IF-THEN-ELSE logic in programming languages).

### Two Forms of CASE

| Form | Description | Use When |
|------|-------------|----------|
| **Simple CASE** | Compares one expression to multiple values | Checking equality against known values |
| **Searched CASE** | Evaluates multiple Boolean conditions | Complex conditions with different columns/operators |

### Simple CASE Syntax

```sql
CASE expression
    WHEN value1 THEN result1
    WHEN value2 THEN result2
    ...
    ELSE default_result
END
```

**Example: Convert region codes to region names**
```sql
SELECT
    customer_id,
    region_code,
    CASE region_code
        WHEN 'NA' THEN 'North America'
        WHEN 'EU' THEN 'Europe'
        WHEN 'APAC' THEN 'Asia Pacific'
        WHEN 'LATAM' THEN 'Latin America'
        ELSE 'Unknown'
    END AS region_name
FROM customers;
```

### Searched CASE Syntax

```sql
CASE
    WHEN condition1 THEN result1
    WHEN condition2 THEN result2
    ...
    ELSE default_result
END
```

**Example: Categorize orders by value**
```sql
SELECT
    order_id,
    amount,
    CASE
        WHEN amount >= 10000 THEN 'Enterprise'
        WHEN amount >= 1000 THEN 'Business'
        WHEN amount >= 100 THEN 'Standard'
        ELSE 'Small'
    END AS order_tier
FROM orders;
```

### CASE Expression Rules

| Rule | Description |
|------|-------------|
| **First match wins** | Evaluation stops at the first TRUE condition |
| **ELSE is optional** | Returns NULL if no conditions match and no ELSE is specified |
| **Result types must be compatible** | All THEN/ELSE values must be implicitly convertible to a common type |
| **Can be nested** | CASE expressions can contain other CASE expressions |
| **Can appear anywhere** | SELECT, WHERE, GROUP BY, ORDER BY, HAVING clauses |

### CASE in Different Clauses

**In WHERE clause:**
```sql
SELECT * FROM orders
WHERE CASE
    WHEN priority = 'HIGH' THEN order_date > DATEADD(day, -7, CURRENT_DATE())
    ELSE order_date > DATEADD(day, -30, CURRENT_DATE())
END;
```

**In ORDER BY clause:**
```sql
SELECT customer_name, status
FROM customers
ORDER BY CASE status
    WHEN 'VIP' THEN 1
    WHEN 'Premium' THEN 2
    WHEN 'Standard' THEN 3
    ELSE 4
END;
```

**In aggregations (conditional counting):**
```sql
SELECT
    department,
    COUNT(*) AS total_employees,
    SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) AS active_count,
    SUM(CASE WHEN status = 'On Leave' THEN 1 ELSE 0 END) AS on_leave_count
FROM employees
GROUP BY department;
```

---

## Section 2: IFF Function

### What is IFF?

`IFF` is Snowflake's simplified conditional function for single-condition branching. It is a shorthand alternative to a simple CASE expression with one condition.

### Syntax

```sql
IFF(condition, true_value, false_value)
```

| Parameter | Description |
|-----------|-------------|
| `condition` | Boolean expression to evaluate |
| `true_value` | Value returned if condition is TRUE |
| `false_value` | Value returned if condition is FALSE or NULL |

### IFF Examples

**Basic usage:**
```sql
SELECT
    product_name,
    stock_quantity,
    IFF(stock_quantity > 0, 'In Stock', 'Out of Stock') AS availability
FROM products;
```

**With numeric values:**
```sql
SELECT
    employee_name,
    sales_amount,
    IFF(sales_amount >= quota, sales_amount * 0.10, 0) AS bonus
FROM sales_performance;
```

### IFF vs CASE Comparison

| Scenario | IFF | CASE |
|----------|-----|------|
| Single condition | Preferred (more concise) | Works but verbose |
| Multiple conditions | Not possible | Required |
| Readability | Simple cases only | Better for complex logic |

**Equivalent expressions:**
```sql
-- Using IFF
IFF(score >= 60, 'Pass', 'Fail')

-- Using CASE (equivalent)
CASE WHEN score >= 60 THEN 'Pass' ELSE 'Fail' END
```

### IFF NULL Behavior

**Important:** When the condition evaluates to NULL, `IFF` returns the `false_value`:

```sql
SELECT IFF(NULL, 'Yes', 'No');  -- Returns 'No'
SELECT IFF(NULL > 5, 'Yes', 'No');  -- Returns 'No' (NULL > 5 is NULL)
```

---

## Section 3: NULL Handling Functions

### Overview of NULL Handling

NULL values require special handling in SQL because:
- NULL compared to any value (including NULL) returns NULL, not TRUE or FALSE
- NULL propagates through most operations
- Different functions handle NULL in different ways

### COALESCE

Returns the first non-NULL expression from a list.

**Syntax:**
```sql
COALESCE(expr1, expr2, ..., exprN)
```

**Examples:**
```sql
-- Return first non-NULL contact method
SELECT
    customer_name,
    COALESCE(mobile_phone, home_phone, work_phone, 'No Phone') AS contact_number
FROM customers;

-- Default NULL values in calculations
SELECT
    order_id,
    subtotal,
    COALESCE(discount, 0) AS discount,
    subtotal - COALESCE(discount, 0) AS final_total
FROM orders;
```

### NVL

Oracle-compatible function that returns a substitute value when the expression is NULL.

**Syntax:**
```sql
NVL(expr, substitute_value)
```

**Example:**
```sql
SELECT
    employee_name,
    NVL(department, 'Unassigned') AS department
FROM employees;
```

### NVL2

Returns one value if the expression is NOT NULL, and another value if it IS NULL.

**Syntax:**
```sql
NVL2(expr, not_null_value, null_value)
```

| Parameter | Returned When |
|-----------|---------------|
| `not_null_value` | `expr` is NOT NULL |
| `null_value` | `expr` IS NULL |

**Example:**
```sql
SELECT
    customer_name,
    commission_rate,
    NVL2(commission_rate,
         'Commission: ' || TO_CHAR(commission_rate * 100) || '%',
         'No Commission') AS commission_status
FROM sales_reps;
```

### IFNULL

Alias for NVL. Returns substitute value when expression is NULL.

**Syntax:**
```sql
IFNULL(expr, substitute_value)
```

**Example:**
```sql
SELECT
    product_name,
    IFNULL(description, 'No description available') AS description
FROM products;
```

---

## Section 4: NULLIF and Related Functions

### NULLIF

Returns NULL if two expressions are equal; otherwise, returns the first expression.

**Syntax:**
```sql
NULLIF(expr1, expr2)
```

| Condition | Result |
|-----------|--------|
| `expr1 = expr2` | NULL |
| `expr1 <> expr2` | `expr1` |
| Either is NULL | Depends on comparison |

**Common Use Cases:**

**Prevent division by zero:**
```sql
-- Returns NULL instead of error when divisor is 0
SELECT
    revenue,
    costs,
    revenue / NULLIF(costs, 0) AS revenue_to_cost_ratio
FROM financials;
```

**Convert empty strings to NULL:**
```sql
SELECT
    customer_id,
    NULLIF(middle_name, '') AS middle_name
FROM customers;
```

**Replace placeholder values with NULL:**
```sql
SELECT
    product_id,
    NULLIF(price, -1) AS price  -- -1 used as 'unknown' placeholder
FROM products;
```

### ZEROIFNULL

Returns 0 if the expression is NULL; otherwise, returns the expression value.

**Syntax:**
```sql
ZEROIFNULL(expr)
```

**Example:**
```sql
SELECT
    product_name,
    ZEROIFNULL(discount_percentage) AS discount_pct
FROM products;

-- Useful in calculations
SELECT
    SUM(ZEROIFNULL(quantity) * price) AS total_revenue
FROM order_items;
```

### NULLIFZERO

Returns NULL if the expression equals 0; otherwise, returns the expression value.

**Syntax:**
```sql
NULLIFZERO(expr)
```

**Example:**
```sql
-- Useful for calculating averages excluding zero values
SELECT
    department,
    AVG(NULLIFZERO(sales_amount)) AS avg_nonzero_sales
FROM sales
GROUP BY department;

-- Prevent division by zero (alternative to NULLIF)
SELECT
    revenue / NULLIFZERO(transactions) AS revenue_per_transaction
FROM daily_stats;
```

---

## Section 5: DECODE Function

### What is DECODE?

`DECODE` is an Oracle-compatible function that compares an expression to multiple search values and returns corresponding results. It provides a compact alternative to simple CASE expressions.

### Syntax

```sql
DECODE(expr, search1, result1, [search2, result2, ...], [default])
```

| Parameter | Description |
|-----------|-------------|
| `expr` | Expression to evaluate |
| `searchN` | Value to compare against expr |
| `resultN` | Value returned if expr = searchN |
| `default` | Optional value if no match (NULL if omitted) |

### DECODE Examples

**Basic usage:**
```sql
SELECT
    order_id,
    status_code,
    DECODE(status_code,
           1, 'Pending',
           2, 'Processing',
           3, 'Shipped',
           4, 'Delivered',
           5, 'Cancelled',
           'Unknown') AS status_name
FROM orders;
```

**Without default (returns NULL):**
```sql
SELECT DECODE(region, 'US', 'United States', 'UK', 'United Kingdom');
-- Returns NULL if region is neither 'US' nor 'UK'
```

### DECODE vs CASE

| Aspect | DECODE | CASE |
|--------|--------|------|
| **Readability** | Compact for simple mappings | Clearer for complex logic |
| **Condition type** | Equality only | Any Boolean condition |
| **NULL handling** | Can match NULL values | NULL comparisons are tricky |
| **ANSI standard** | No (Oracle extension) | Yes |
| **Flexibility** | Limited | Full conditional logic |

**DECODE NULL behavior - special feature:**
```sql
-- DECODE can match NULL (unlike standard equality)
SELECT DECODE(NULL, NULL, 'Matched NULL', 'No Match');
-- Returns 'Matched NULL'

-- CASE cannot match NULL with equality
SELECT CASE NULL WHEN NULL THEN 'Matched' ELSE 'No Match' END;
-- Returns 'No Match' (NULL = NULL is NULL, not TRUE)
```

---

## Section 6: Comparison Functions

### EQUAL_NULL

Compares two expressions for equality, treating NULL values as equal.

**Syntax:**
```sql
EQUAL_NULL(expr1, expr2)
```

| Comparison | Result |
|------------|--------|
| Both NULL | TRUE |
| One NULL, one not | FALSE |
| Both same non-NULL value | TRUE |
| Different values | FALSE |

**Example:**
```sql
SELECT
    a.customer_id,
    b.customer_id,
    EQUAL_NULL(a.middle_name, b.middle_name) AS names_match
FROM customers_old a
JOIN customers_new b ON a.customer_id = b.customer_id;
```

### GREATEST and LEAST

Return the maximum or minimum value from a list of expressions.

**Syntax:**
```sql
GREATEST(expr1, expr2, ...)
LEAST(expr1, expr2, ...)
```

**NULL Behavior:** Returns NULL if ANY argument is NULL.

**Examples:**
```sql
-- Find the most recent date among multiple columns
SELECT
    customer_id,
    GREATEST(last_order_date, last_login_date, last_contact_date) AS most_recent_activity
FROM customers;

-- Find the earliest date
SELECT
    project_id,
    LEAST(planned_start, actual_start) AS earliest_start
FROM projects;

-- Handle NULLs with COALESCE
SELECT
    GREATEST(
        COALESCE(date1, '1900-01-01'),
        COALESCE(date2, '1900-01-01'),
        COALESCE(date3, '1900-01-01')
    ) AS max_date
FROM dates_table;
```

---

## Section 7: Conditional Function Comparison Matrix

### Quick Reference: When to Use Each Function

| Function | Purpose | Arguments | NULL Behavior |
|----------|---------|-----------|---------------|
| **CASE** | Multi-branch conditional | N conditions | Returns NULL if no match, no ELSE |
| **IFF** | Single-condition if-else | 3 (condition, true, false) | Returns false_value if condition is NULL |
| **COALESCE** | First non-NULL value | 2+ expressions | Skips NULLs, returns first non-NULL |
| **NVL** | Substitute for NULL | 2 (expr, substitute) | Returns substitute if expr is NULL |
| **NVL2** | Different values for NULL/not-NULL | 3 (expr, not_null, null) | Branching based on NULL status |
| **IFNULL** | Same as NVL | 2 (expr, substitute) | Returns substitute if expr is NULL |
| **NULLIF** | Convert value to NULL | 2 (expr1, expr2) | Returns NULL if equal |
| **ZEROIFNULL** | Convert NULL to 0 | 1 (expr) | Returns 0 if NULL |
| **NULLIFZERO** | Convert 0 to NULL | 1 (expr) | Returns NULL if 0 |
| **DECODE** | Value mapping (equality) | 3+ (expr, pairs, default) | Can match NULL values |
| **EQUAL_NULL** | NULL-safe equality | 2 (expr1, expr2) | Treats NULLs as equal |

### Function Equivalencies

```sql
-- These are equivalent:
COALESCE(x, y)                = NVL(x, y) = IFNULL(x, y)
COALESCE(x, y, z)            -- No NVL equivalent (NVL takes only 2 args)

IFF(cond, a, b)              = CASE WHEN cond THEN a ELSE b END

NVL2(x, a, b)                = CASE WHEN x IS NOT NULL THEN a ELSE b END
                             = IFF(x IS NOT NULL, a, b)

NULLIF(x, y)                 = CASE WHEN x = y THEN NULL ELSE x END

ZEROIFNULL(x)                = COALESCE(x, 0) = NVL(x, 0) = IFNULL(x, 0)

NULLIFZERO(x)                = NULLIF(x, 0)
```

---

## Section 8: Common Patterns and Best Practices

### Pattern 1: Safe Division

```sql
-- Avoid division by zero errors
SELECT
    metric_a / NULLIF(metric_b, 0) AS ratio,
    -- Or using NULLIFZERO:
    metric_a / NULLIFZERO(metric_b) AS ratio_alt
FROM metrics;
```

### Pattern 2: Conditional Aggregation

```sql
SELECT
    region,
    COUNT(*) AS total_orders,
    SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed,
    SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled,
    SUM(IFF(status = 'Pending', amount, 0)) AS pending_revenue
FROM orders
GROUP BY region;
```

### Pattern 3: Defaulting NULL Values in Joins

```sql
SELECT
    c.customer_id,
    c.customer_name,
    COALESCE(o.order_count, 0) AS order_count,
    COALESCE(o.total_spent, 0) AS total_spent
FROM customers c
LEFT JOIN (
    SELECT customer_id, COUNT(*) AS order_count, SUM(amount) AS total_spent
    FROM orders
    GROUP BY customer_id
) o ON c.customer_id = o.customer_id;
```

### Pattern 4: Dynamic Column Selection

```sql
SELECT
    customer_id,
    CASE preferred_contact
        WHEN 'email' THEN email_address
        WHEN 'phone' THEN phone_number
        WHEN 'mail' THEN mailing_address
        ELSE COALESCE(email_address, phone_number, 'No contact info')
    END AS contact_info
FROM customers;
```

### Pattern 5: Data Quality Flags

```sql
SELECT
    *,
    IFF(email IS NULL OR email = '', 1, 0) AS missing_email,
    IFF(phone IS NULL, 1, 0) AS missing_phone,
    CASE
        WHEN email IS NULL AND phone IS NULL THEN 'Critical'
        WHEN email IS NULL OR phone IS NULL THEN 'Warning'
        ELSE 'OK'
    END AS data_quality_status
FROM contacts;
```

### Pattern 6: Masking Policies with CASE

```sql
-- Dynamic Data Masking using CASE
CREATE MASKING POLICY ssn_mask AS (val STRING) RETURNS STRING ->
    CASE
        WHEN CURRENT_ROLE() IN ('HR_ADMIN', 'PAYROLL') THEN val
        WHEN CURRENT_ROLE() = 'HR_VIEWER' THEN 'XXX-XX-' || RIGHT(val, 4)
        ELSE '***-**-****'
    END;
```

### Pattern 7: Row Access Policies with CASE

```sql
CREATE ROW ACCESS POLICY regional_access AS (region_col VARCHAR) RETURNS BOOLEAN ->
    CASE
        WHEN CURRENT_ROLE() = 'ADMIN' THEN TRUE
        WHEN CURRENT_ROLE() = 'REGIONAL_MANAGER'
             AND region_col IN (SELECT region FROM user_region_mapping WHERE user_name = CURRENT_USER())
             THEN TRUE
        ELSE FALSE
    END;
```

---

## Section 9: Exam Tips and Common Question Patterns

### Frequently Tested Concepts

1. **CASE Expression Forms**
   - Distinguish between simple CASE and searched CASE
   - Know that ELSE is optional (returns NULL if omitted)
   - Understand first-match-wins evaluation order

2. **NULL Handling**
   - COALESCE returns first non-NULL from list
   - NVL takes exactly 2 arguments (unlike COALESCE)
   - NULLIF returns NULL when arguments are equal

3. **IFF Function**
   - Know that NULL condition returns false_value
   - Recognize IFF as shorthand for simple CASE

4. **DECODE Specialty**
   - DECODE can match NULL values (unlike CASE equality)
   - Not ANSI standard (Oracle compatibility)

5. **Division Safety**
   - NULLIF(x, 0) or NULLIFZERO(x) prevents division by zero

### Common Exam Traps

| Trap | Reality |
|------|---------|
| "NVL can take multiple arguments" | NVL takes exactly 2 arguments; use COALESCE for more |
| "CASE WHEN x = NULL works" | Use CASE WHEN x IS NULL (equality with NULL returns NULL) |
| "IFF returns NULL when condition is NULL" | IFF returns false_value when condition is NULL |
| "DECODE cannot compare NULL" | DECODE CAN match NULL values (unique feature) |
| "COALESCE and NVL are identical" | COALESCE takes 2+ arguments; NVL takes exactly 2 |

### Practice Questions

**Question 1:** What does the following expression return?
```sql
SELECT COALESCE(NULL, NULL, 'A', 'B', NULL);
```

- A) NULL
- B) 'A'
- C) 'B'
- D) Error

<details>
<summary>Show Answer</summary>

**Answer:** B - COALESCE returns the first non-NULL value, which is 'A'.
</details>

---

**Question 2:** What is the result of this query?
```sql
SELECT IFF(NULL, 'True', 'False');
```

- A) NULL
- B) 'True'
- C) 'False'
- D) Error

<details>
<summary>Show Answer</summary>

**Answer:** C - When the condition is NULL, IFF returns the false_value.
</details>

---

**Question 3:** Which function can compare NULL values as equal?

- A) CASE WHEN a = b
- B) IFF(a = b, true, false)
- C) DECODE(a, b, 'equal', 'not equal')
- D) Both A and B

<details>
<summary>Show Answer</summary>

**Answer:** C - DECODE has special NULL handling and can match NULL values. Standard equality (=) returns NULL when comparing NULL values.
</details>

---

**Question 4:** How do you prevent division by zero errors in Snowflake?

- A) Use TRY_DIVIDE function
- B) Use NULLIF(divisor, 0)
- C) Use IFF(divisor = 0, NULL, dividend/divisor)
- D) Both B and C

<details>
<summary>Show Answer</summary>

**Answer:** D - Both NULLIF and IFF can prevent division by zero. NULLIFZERO(divisor) also works.
</details>

---

**Question 5:** What does NVL2(expr, a, b) return?

- A) Returns a if expr is NULL, b otherwise
- B) Returns b if expr is NULL, a otherwise
- C) Returns NULL if both a and b are NULL
- D) Returns COALESCE(expr, a, b)

<details>
<summary>Show Answer</summary>

**Answer:** B - NVL2 returns the second argument (a) if expr is NOT NULL, and returns the third argument (b) if expr IS NULL.
</details>

---

**Question 6:** Which statement about masking policies is TRUE?

- A) Masking policies cannot use CASE expressions
- B) CASE expressions in masking policies can reference CURRENT_ROLE()
- C) IFF cannot be used in masking policy definitions
- D) Masking policies only support simple value replacement

<details>
<summary>Show Answer</summary>

**Answer:** B - Masking policies commonly use CASE with CURRENT_ROLE() to apply different masking based on the executing role.
</details>

---

## Section 10: Quick Reference

### Syntax Summary

```sql
-- CASE (searched form)
CASE WHEN condition1 THEN result1
     WHEN condition2 THEN result2
     ELSE default_result
END

-- CASE (simple form)
CASE expression
     WHEN value1 THEN result1
     WHEN value2 THEN result2
     ELSE default_result
END

-- IFF
IFF(condition, true_value, false_value)

-- NULL handling
COALESCE(expr1, expr2, ...)    -- First non-NULL
NVL(expr, substitute)           -- Substitute if NULL
NVL2(expr, not_null, null)      -- Branch on NULL status
IFNULL(expr, substitute)        -- Same as NVL
NULLIF(expr1, expr2)            -- NULL if equal
ZEROIFNULL(expr)                -- 0 if NULL
NULLIFZERO(expr)                -- NULL if 0

-- DECODE
DECODE(expr, search1, result1, search2, result2, ..., default)

-- Comparison
EQUAL_NULL(expr1, expr2)        -- NULL-safe equality
GREATEST(expr1, expr2, ...)     -- Maximum value
LEAST(expr1, expr2, ...)        -- Minimum value
```

### Decision Tree: Which Function to Use?

```
Need conditional logic?
|
+-- Single condition?
|   +-- Yes --> IFF(condition, true_value, false_value)
|   +-- No --> CASE WHEN ... END
|
Need to handle NULL?
|
+-- Replace NULL with default?
|   +-- One alternative --> NVL(expr, default) or IFNULL
|   +-- Multiple alternatives --> COALESCE(expr1, expr2, ...)
|   +-- Replace NULL with 0 --> ZEROIFNULL(expr)
|
+-- Convert value to NULL?
|   +-- Specific value --> NULLIF(expr, value)
|   +-- Zero --> NULLIFZERO(expr)
|
+-- Different action based on NULL?
|   +-- Yes --> NVL2(expr, not_null_result, null_result)
|
Need to map values?
|
+-- Simple equality mappings --> DECODE(expr, val1, res1, ...)
+-- Complex conditions --> CASE WHEN ... END
```

---

**Key Takeaway:** Conditional expressions form the backbone of data transformation logic in Snowflake. While CASE is the most versatile, functions like IFF, COALESCE, NVL, and NULLIF provide concise alternatives for common patterns. Understanding NULL behavior across these functions is critical for both exam success and writing robust production queries.
