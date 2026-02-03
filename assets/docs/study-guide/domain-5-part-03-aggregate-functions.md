# Domain 5: Data Transformations

## Part 3: Aggregate Functions and GROUP BY

This section covers aggregate functions and grouping operations in Snowflake, essential topics for the SnowPro Core exam. Understanding how to summarize, group, and analyze data using aggregate functions is fundamental to SQL-based data transformations.

---

## 1. Understanding Aggregate Functions

### 1.1 What Are Aggregate Functions?

**Aggregate functions** process multiple rows and return a single result. Unlike scalar functions (which return one value per row), aggregate functions collapse multiple input rows into a single output value.

**Key Characteristics:**
- Take multiple rows as input
- Return a single value (per group, if GROUP BY is used)
- Most aggregate functions ignore NULL values (except COUNT(*))
- Can be used with or without GROUP BY
- Can be combined with DISTINCT to process only unique values

**Basic Syntax:**
```sql
-- Without GROUP BY (aggregates all rows)
SELECT COUNT(*) FROM sales;

-- With GROUP BY (aggregates per group)
SELECT region, COUNT(*)
FROM sales
GROUP BY region;
```

### 1.2 Aggregate vs. Other Function Types

| Function Type | Input | Output | Example |
|--------------|-------|--------|---------|
| **Scalar** | 1 row | 1 value | `UPPER('hello')` returns `'HELLO'` |
| **Aggregate** | Multiple rows | 1 value | `SUM(amount)` returns total |
| **Window** | Multiple rows | 1 value per row | `SUM(amount) OVER (PARTITION BY region)` |
| **Table** | 0+ rows | 0+ rows | `FLATTEN(array_col)` |

---

## 2. Core Aggregate Functions

### 2.1 COUNT Functions

**COUNT(*)** - Counts all rows, including those with NULL values

```sql
-- Count all rows in table
SELECT COUNT(*) FROM employees;

-- Count all rows per department
SELECT department, COUNT(*) AS employee_count
FROM employees
GROUP BY department;
```

**COUNT(column)** - Counts non-NULL values in a column

```sql
-- Count non-NULL email addresses
SELECT COUNT(email) FROM employees;

-- If 100 rows exist but 5 have NULL emails, returns 95
```

**COUNT(DISTINCT column)** - Counts unique non-NULL values

```sql
-- Count unique departments
SELECT COUNT(DISTINCT department) FROM employees;

-- Count unique customers who placed orders
SELECT COUNT(DISTINCT customer_id) FROM orders;
```

**Key Exam Points:**
- `COUNT(*)` includes NULLs; `COUNT(column)` excludes NULLs
- `COUNT(DISTINCT column)` counts unique non-NULL values only
- For large datasets, consider `APPROX_COUNT_DISTINCT()` for faster approximate results

### 2.2 SUM Function

**SUM(column)** - Returns the total of numeric values

```sql
-- Total sales amount
SELECT SUM(amount) FROM sales;

-- Total sales per region
SELECT region, SUM(amount) AS total_sales
FROM sales
GROUP BY region;

-- Sum with condition using CASE
SELECT
    SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) AS completed_sales,
    SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS pending_sales
FROM orders;
```

**Key Points:**
- Ignores NULL values
- Returns NULL if all values are NULL
- Works with numeric types (NUMBER, FLOAT, INTEGER)

### 2.3 AVG Function

**AVG(column)** - Returns the arithmetic mean of numeric values

```sql
-- Average order amount
SELECT AVG(amount) FROM orders;

-- Average salary per department
SELECT department, AVG(salary) AS avg_salary
FROM employees
GROUP BY department;

-- Average with rounding
SELECT ROUND(AVG(amount), 2) AS avg_amount FROM orders;
```

**Important Behavior:**
- **Ignores NULL values in both numerator and denominator**
- This means `AVG(column)` = `SUM(column) / COUNT(column)`, not `SUM(column) / COUNT(*)`

```sql
-- Example: Values are 100, 200, NULL, 300
-- AVG = (100 + 200 + 300) / 3 = 200
-- NOT (100 + 200 + 0 + 300) / 4 = 150
```

### 2.4 MIN and MAX Functions

**MIN(column)** - Returns the smallest value

**MAX(column)** - Returns the largest value

```sql
-- Find salary range
SELECT MIN(salary) AS lowest, MAX(salary) AS highest
FROM employees;

-- Find date range
SELECT MIN(order_date) AS first_order, MAX(order_date) AS last_order
FROM orders;

-- Min/Max with strings (alphabetical comparison)
SELECT MIN(product_name), MAX(product_name) FROM products;
```

**Key Points:**
- Work with numeric, date/time, and string types
- Ignore NULL values
- For strings, comparison is alphabetical (lexicographic)

### 2.5 NULL Handling Summary

| Function | NULL Handling |
|----------|--------------|
| `COUNT(*)` | **Includes** NULLs (counts all rows) |
| `COUNT(column)` | **Excludes** NULLs |
| `COUNT(DISTINCT column)` | **Excludes** NULLs |
| `SUM(column)` | **Ignores** NULLs |
| `AVG(column)` | **Ignores** NULLs in both sum and count |
| `MIN(column)` | **Ignores** NULLs |
| `MAX(column)` | **Ignores** NULLs |

---

## 3. GROUP BY Clause

### 3.1 Basic GROUP BY

GROUP BY divides rows into groups based on column values, then applies aggregate functions to each group.

```sql
-- Sales by region
SELECT region, SUM(amount) AS total_sales
FROM sales
GROUP BY region;

-- Orders by customer and year
SELECT
    customer_id,
    YEAR(order_date) AS order_year,
    COUNT(*) AS order_count
FROM orders
GROUP BY customer_id, YEAR(order_date);
```

**Syntax Rules:**
- Non-aggregated columns in SELECT must appear in GROUP BY
- GROUP BY can include columns not in SELECT
- GROUP BY can use expressions (like `YEAR(date)`)
- Column aliases cannot be used in GROUP BY (use the original expression)

```sql
-- CORRECT
SELECT YEAR(order_date) AS order_year, COUNT(*)
FROM orders
GROUP BY YEAR(order_date);

-- INCORRECT (alias not allowed in GROUP BY)
SELECT YEAR(order_date) AS order_year, COUNT(*)
FROM orders
GROUP BY order_year;  -- ERROR in standard SQL
```

### 3.2 GROUP BY with Multiple Columns

```sql
-- Sales by region and product category
SELECT
    region,
    product_category,
    SUM(amount) AS total_sales,
    COUNT(*) AS transaction_count
FROM sales
GROUP BY region, product_category
ORDER BY region, total_sales DESC;
```

### 3.3 GROUP BY ALL

Snowflake supports `GROUP BY ALL` which automatically groups by all non-aggregated columns in the SELECT list.

```sql
-- Automatically groups by region and product_category
SELECT region, product_category, SUM(amount)
FROM sales
GROUP BY ALL;

-- Equivalent to:
SELECT region, product_category, SUM(amount)
FROM sales
GROUP BY region, product_category;
```

---

## 4. HAVING Clause

### 4.1 HAVING vs. WHERE

| Clause | Filters | When Applied |
|--------|---------|--------------|
| **WHERE** | Individual rows | Before grouping |
| **HAVING** | Groups | After grouping |

```sql
-- WHERE filters rows before aggregation
SELECT region, SUM(amount) AS total_sales
FROM sales
WHERE amount > 100  -- Filters individual sales over $100
GROUP BY region;

-- HAVING filters groups after aggregation
SELECT region, SUM(amount) AS total_sales
FROM sales
GROUP BY region
HAVING SUM(amount) > 10000;  -- Only regions with total > $10,000
```

### 4.2 Combining WHERE and HAVING

```sql
-- Find regions with total 2024 sales over $1 million
SELECT region, SUM(amount) AS total_sales
FROM sales
WHERE YEAR(sale_date) = 2024     -- Filter to 2024 sales (before grouping)
GROUP BY region
HAVING SUM(amount) > 1000000     -- Only regions over $1M (after grouping)
ORDER BY total_sales DESC;
```

### 4.3 HAVING with COUNT

```sql
-- Find customers with more than 10 orders
SELECT customer_id, COUNT(*) AS order_count
FROM orders
GROUP BY customer_id
HAVING COUNT(*) > 10;

-- Find products ordered by at least 100 unique customers
SELECT product_id, COUNT(DISTINCT customer_id) AS customer_count
FROM order_items
GROUP BY product_id
HAVING COUNT(DISTINCT customer_id) >= 100;
```

---

## 5. Advanced Grouping: GROUPING SETS, ROLLUP, CUBE

### 5.1 GROUPING SETS

GROUPING SETS allows multiple groupings in a single query, producing results equivalent to UNION ALL of multiple GROUP BY queries.

```sql
-- Multiple groupings in one query
SELECT region, product_category, SUM(amount) AS total_sales
FROM sales
GROUP BY GROUPING SETS (
    (region, product_category),  -- Group by both
    (region),                    -- Group by region only
    (product_category),          -- Group by product_category only
    ()                           -- Grand total (no grouping)
);
```

**Result Structure:**
| region | product_category | total_sales |
|--------|-----------------|-------------|
| East | Electronics | 50000 |
| East | Clothing | 30000 |
| West | Electronics | 45000 |
| West | Clothing | 35000 |
| East | NULL | 80000 |
| West | NULL | 80000 |
| NULL | Electronics | 95000 |
| NULL | Clothing | 65000 |
| NULL | NULL | 160000 |

### 5.2 ROLLUP

ROLLUP creates subtotals from right to left (hierarchical subtotals).

```sql
-- Hierarchical subtotals: year > quarter > month
SELECT
    YEAR(sale_date) AS year,
    QUARTER(sale_date) AS quarter,
    MONTH(sale_date) AS month,
    SUM(amount) AS total_sales
FROM sales
GROUP BY ROLLUP (YEAR(sale_date), QUARTER(sale_date), MONTH(sale_date))
ORDER BY year, quarter, month;
```

**ROLLUP(A, B, C) produces:**
- (A, B, C) - Most detailed level
- (A, B) - Subtotal per A and B
- (A) - Subtotal per A
- () - Grand total

**Use Case:** Financial reports with hierarchical totals (Year > Quarter > Month)

### 5.3 CUBE

CUBE produces all possible grouping combinations (power set).

```sql
-- All possible grouping combinations
SELECT region, product_category, SUM(amount) AS total_sales
FROM sales
GROUP BY CUBE (region, product_category)
ORDER BY region, product_category;
```

**CUBE(A, B) produces:**
- (A, B) - Group by both
- (A) - Group by A only
- (B) - Group by B only
- () - Grand total

**Use Case:** Multi-dimensional analysis where all combinations are needed

### 5.4 GROUPING and GROUPING_ID Functions

These functions help identify which rows are subtotals.

**GROUPING(column)** - Returns 1 if column is aggregated (NULL due to grouping), 0 otherwise

```sql
SELECT
    region,
    product_category,
    SUM(amount) AS total_sales,
    GROUPING(region) AS is_region_total,
    GROUPING(product_category) AS is_category_total
FROM sales
GROUP BY ROLLUP (region, product_category);
```

**GROUPING_ID(columns...)** - Returns a bitmap indicating which columns are aggregated

```sql
SELECT
    region,
    product_category,
    SUM(amount) AS total_sales,
    GROUPING_ID(region, product_category) AS grouping_level
FROM sales
GROUP BY CUBE (region, product_category);
-- grouping_level: 0 = both specified, 1 = product_category aggregated,
--                 2 = region aggregated, 3 = grand total
```

---

## 6. String Aggregation Functions

### 6.1 LISTAGG

LISTAGG concatenates values from multiple rows into a single string.

```sql
-- Concatenate employee names by department
SELECT
    department,
    LISTAGG(employee_name, ', ') AS employees
FROM employees
GROUP BY department;

-- With ordering within the group
SELECT
    department,
    LISTAGG(employee_name, ', ') WITHIN GROUP (ORDER BY employee_name) AS employees
FROM employees
GROUP BY department;
```

**Syntax:**
```sql
LISTAGG( [ DISTINCT ] column [, delimiter ] )
    [ WITHIN GROUP ( ORDER BY order_expression ) ]
```

**Key Points:**
- Default delimiter is empty string
- Use WITHIN GROUP (ORDER BY ...) to control concatenation order
- DISTINCT removes duplicates before concatenation
- Maximum result size is 16 MB

### 6.2 ARRAY_AGG

ARRAY_AGG collects values into an array instead of a string.

```sql
-- Collect order IDs per customer into an array
SELECT
    customer_id,
    ARRAY_AGG(order_id) AS order_ids
FROM orders
GROUP BY customer_id;

-- With ordering
SELECT
    customer_id,
    ARRAY_AGG(order_id) WITHIN GROUP (ORDER BY order_date) AS order_ids
FROM orders
GROUP BY customer_id;

-- With DISTINCT
SELECT
    department,
    ARRAY_AGG(DISTINCT job_title) AS unique_titles
FROM employees
GROUP BY department;
```

**Key Points:**
- Returns ARRAY type (semi-structured data)
- Preserves NULL values (unlike LISTAGG which ignores them)
- Use WITHIN GROUP (ORDER BY ...) for deterministic ordering
- Useful for storing related values as structured data

### 6.3 OBJECT_AGG

OBJECT_AGG creates key-value pair objects.

```sql
-- Create object with product_id as key and quantity as value
SELECT
    order_id,
    OBJECT_AGG(product_id::VARCHAR, quantity) AS product_quantities
FROM order_items
GROUP BY order_id;
```

---

## 7. Statistical Aggregate Functions

### 7.1 MEDIAN

Returns the middle value in a sorted list.

```sql
SELECT MEDIAN(salary) FROM employees;

SELECT department, MEDIAN(salary) AS median_salary
FROM employees
GROUP BY department;
```

### 7.2 MODE

Returns the most frequent value.

```sql
SELECT MODE(product_category) FROM sales;
```

### 7.3 STDDEV and VARIANCE

```sql
-- Standard deviation and variance
SELECT
    department,
    AVG(salary) AS avg_salary,
    STDDEV(salary) AS salary_stddev,
    VARIANCE(salary) AS salary_variance
FROM employees
GROUP BY department;

-- STDDEV_POP and STDDEV_SAMP for population vs sample
SELECT STDDEV_POP(amount), STDDEV_SAMP(amount) FROM sales;
```

### 7.4 PERCENTILE Functions

```sql
-- 50th percentile (median) using continuous interpolation
SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary)
FROM employees;

-- 90th percentile
SELECT PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY amount)
FROM sales;

-- PERCENTILE_DISC returns actual value from dataset
SELECT PERCENTILE_DISC(0.5) WITHIN GROUP (ORDER BY salary)
FROM employees;
```

---

## 8. Approximate (Estimation) Functions

For very large datasets, approximate functions provide faster results with acceptable accuracy.

### 8.1 APPROX_COUNT_DISTINCT

Returns approximate count of distinct values using HyperLogLog algorithm.

```sql
-- Approximate distinct count (much faster on large tables)
SELECT APPROX_COUNT_DISTINCT(customer_id) FROM events;

-- Compare exact vs approximate
SELECT
    COUNT(DISTINCT user_id) AS exact_count,
    APPROX_COUNT_DISTINCT(user_id) AS approx_count
FROM clickstream;
```

**Key Points:**
- Average relative error: ~1.6%
- Significantly faster on large datasets (billions of rows)
- Uses much less memory than COUNT(DISTINCT)
- Alias: `HLL()` (HyperLogLog)

### 8.2 APPROX_TOP_K

Returns approximate most frequent values.

```sql
-- Find top 10 most common products
SELECT APPROX_TOP_K(product_id, 10) FROM sales;
```

### 8.3 APPROX_PERCENTILE

Returns approximate percentile values.

```sql
-- Approximate 95th percentile response time
SELECT APPROX_PERCENTILE(response_time, 0.95) FROM api_logs;
```

### 8.4 MINHASH and APPROXIMATE_SIMILARITY

Estimate similarity between datasets (Jaccard similarity).

```sql
-- Step 1: Generate MINHASH states
WITH states AS (
    SELECT 'store_a' AS store, MINHASH(100, customer_id) AS mh
    FROM sales_store_a
    UNION ALL
    SELECT 'store_b' AS store, MINHASH(100, customer_id) AS mh
    FROM sales_store_b
)
-- Step 2: Calculate similarity
SELECT APPROXIMATE_SIMILARITY(mh) AS customer_overlap
FROM states;
```

---

## 9. DISTINCT in Aggregations

### 9.1 Using DISTINCT with Aggregate Functions

```sql
-- Count distinct customers
SELECT COUNT(DISTINCT customer_id) FROM orders;

-- Sum distinct order amounts (unusual but valid)
SELECT SUM(DISTINCT amount) FROM orders;

-- Average of distinct values
SELECT AVG(DISTINCT rating) FROM reviews;
```

### 9.2 DISTINCT vs. GROUP BY for Uniqueness

```sql
-- Both return unique values, but DISTINCT is for selection
SELECT DISTINCT region FROM sales;

-- GROUP BY is for aggregation
SELECT region, COUNT(*) FROM sales GROUP BY region;
```

---

## 10. Aggregation Policies (Enterprise Edition)

Snowflake supports **Aggregation Policies** to enforce minimum group sizes for privacy protection.

### 10.1 Overview

Aggregation policies ensure that queries must aggregate data into groups of a minimum size, preventing exposure of individual records.

```sql
-- Create aggregation policy (requires appropriate privileges)
CREATE AGGREGATION POLICY min_group_size_policy
  AS () RETURNS AGGREGATION_CONSTRAINT ->
    AGGREGATION_CONSTRAINT(MIN_GROUP_SIZE => 10);

-- Apply to a table
ALTER TABLE sensitive_data
  SET AGGREGATION POLICY min_group_size_policy;
```

### 10.2 Allowed Aggregate Functions with Aggregation Policies

When an aggregation policy is active, only certain functions are allowed:
- COUNT, COUNT(DISTINCT)
- SUM, AVG
- MIN, MAX
- COVAR_SAMP, STDDEV, VARIANCE
- And other approved functions

**Important Limitations:**
- Cannot use GROUPING SETS, ROLLUP, or CUBE
- Cannot use window functions
- Cannot use correlated subqueries

---

## 11. Exam Tips and Common Question Patterns

### 11.1 Frequently Tested Concepts

| Topic | Key Points |
|-------|------------|
| **NULL Handling** | COUNT(*) includes NULLs; all others ignore NULLs |
| **AVG Behavior** | Divides by count of non-NULL values, not total rows |
| **WHERE vs HAVING** | WHERE filters rows before grouping; HAVING filters groups after |
| **ROLLUP vs CUBE** | ROLLUP = hierarchical (right-to-left); CUBE = all combinations |
| **Estimation Functions** | APPROX_COUNT_DISTINCT uses HyperLogLog, ~1.6% error |
| **LISTAGG vs ARRAY_AGG** | LISTAGG = string; ARRAY_AGG = array (preserves NULLs) |

### 11.2 Common Exam Traps

| Trap | Correct Understanding |
|------|----------------------|
| AVG includes NULL as zero | AVG **ignores** NULLs entirely |
| HAVING filters individual rows | HAVING filters **groups**, not rows |
| GROUP BY alias works in Snowflake | Aliases in GROUP BY may cause issues; use full expression |
| COUNT(column) counts all rows | COUNT(column) counts **non-NULL** values only |
| CUBE and ROLLUP are the same | ROLLUP = hierarchical; CUBE = all combinations |

### 11.3 Practice Questions

**Question 1:** A table has 100 rows. One column has 10 NULL values. What does `COUNT(*)` return? What does `COUNT(column)` return?

**Answer:** COUNT(*) returns 100 (counts all rows). COUNT(column) returns 90 (excludes NULLs).

---

**Question 2:** What is the difference between WHERE and HAVING?

**Answer:** WHERE filters individual rows before grouping. HAVING filters groups after aggregation.

---

**Question 3:** Which aggregate function is used for cardinality estimation with HyperLogLog?

**Answer:** APPROX_COUNT_DISTINCT (or HLL).

---

**Question 4:** A column has values 100, 200, NULL, 300. What does AVG(column) return?

**Answer:** 200. AVG ignores NULLs, so it calculates (100 + 200 + 300) / 3 = 200.

---

**Question 5:** What does ROLLUP(A, B, C) produce?

**Answer:** Four grouping levels: (A, B, C), (A, B), (A), and () for grand total.

---

**Question 6:** Which function concatenates values into a comma-separated string?

**Answer:** LISTAGG with a comma delimiter: `LISTAGG(column, ', ')`

---

**Question 7:** What is the difference between LISTAGG and ARRAY_AGG?

**Answer:** LISTAGG produces a string; ARRAY_AGG produces an array. ARRAY_AGG preserves NULLs; LISTAGG ignores them.

---

## 12. Quick Reference

### Common Aggregate Functions

| Function | Purpose | NULL Handling |
|----------|---------|---------------|
| `COUNT(*)` | Count all rows | Includes NULLs |
| `COUNT(col)` | Count non-NULL values | Excludes NULLs |
| `COUNT(DISTINCT col)` | Count unique non-NULL values | Excludes NULLs |
| `SUM(col)` | Sum of values | Ignores NULLs |
| `AVG(col)` | Average of values | Ignores NULLs |
| `MIN(col)` | Minimum value | Ignores NULLs |
| `MAX(col)` | Maximum value | Ignores NULLs |
| `LISTAGG(col, delim)` | Concatenate to string | Ignores NULLs |
| `ARRAY_AGG(col)` | Collect into array | Preserves NULLs |
| `APPROX_COUNT_DISTINCT(col)` | Approximate distinct count | Ignores NULLs |

### Grouping Constructs

| Construct | Description |
|-----------|-------------|
| `GROUP BY col1, col2` | Group by specified columns |
| `GROUP BY ALL` | Group by all non-aggregated columns |
| `GROUP BY ROLLUP(a, b)` | Hierarchical subtotals |
| `GROUP BY CUBE(a, b)` | All grouping combinations |
| `GROUP BY GROUPING SETS((a, b), (a), ())` | Specified grouping combinations |

### Key SQL Patterns

```sql
-- Basic aggregation
SELECT department, COUNT(*), AVG(salary)
FROM employees
GROUP BY department;

-- With HAVING
SELECT department, COUNT(*) AS cnt
FROM employees
GROUP BY department
HAVING COUNT(*) > 10;

-- ROLLUP for subtotals
SELECT year, quarter, SUM(revenue)
FROM sales
GROUP BY ROLLUP(year, quarter);

-- String aggregation
SELECT department, LISTAGG(name, ', ') WITHIN GROUP (ORDER BY name)
FROM employees
GROUP BY department;

-- Array aggregation
SELECT customer_id, ARRAY_AGG(DISTINCT product_id)
FROM orders
GROUP BY customer_id;

-- Approximate distinct count
SELECT APPROX_COUNT_DISTINCT(user_id) FROM events;
```

---

**Key Takeaway:** Aggregate functions are fundamental to data analysis in Snowflake. Understanding NULL handling, the difference between WHERE and HAVING, and when to use advanced grouping constructs (ROLLUP, CUBE, GROUPING SETS) is essential for the SnowPro Core exam. For large datasets, leverage approximate functions like APPROX_COUNT_DISTINCT for faster results with acceptable accuracy.
