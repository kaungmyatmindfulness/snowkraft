# Domain 5: Data Transformations
## Part 4: Window Functions

**Exam Weight:** This topic is part of Domain 5 (20-25% of exam)

---

## Overview

Window functions are powerful analytic SQL functions that perform calculations across a set of rows related to the current row, known as a **window** or **partition**. Unlike aggregate functions that collapse multiple rows into one, window functions return a value for **each row** while still performing calculations across related rows. This capability is essential for time-series analysis, ranking, running totals, and moving averages.

---

## Section 1: Window Function Fundamentals

### What is a Window Function?

A window function operates on a group of related rows called a **partition**. The function results are computed for each partition, with respect to an implicit or explicit **window frame**.

**Key Concepts:**

| Term | Definition |
|------|------------|
| **Partition** | A logical group of rows based on a dimension (e.g., category, region, time period) |
| **Window Frame** | A fixed or variable set of rows relative to the current row |
| **Current Row** | The single input row for which the function result is being computed |
| **OVER Clause** | The syntax that defines window function behavior |

### Window Functions vs Aggregate Functions

| Characteristic | Aggregate Function | Window Function |
|----------------|-------------------|-----------------|
| **Input** | Multiple rows | Each row within a partition |
| **Output** | Single value per group | One value **per input row** |
| **Collapses rows** | Yes | No |
| **Requires GROUP BY** | Typically yes | No (uses OVER clause) |
| **Access to individual rows** | No | Yes |

**Example Comparison:**

```sql
-- Aggregate: Returns ONE row per category
SELECT menu_category, AVG(price) AS avg_price
FROM menu_items
GROUP BY menu_category;

-- Window: Returns EVERY row with the average alongside
SELECT menu_category, menu_item, price,
       AVG(price) OVER (PARTITION BY menu_category) AS avg_price
FROM menu_items;
```

### The OVER Clause

The OVER clause is what distinguishes a window function from a regular function. It consists of three main components:

```sql
function_name(arguments) OVER (
    [PARTITION BY partition_expression, ...]
    [ORDER BY sort_expression [ASC|DESC], ...]
    [window_frame_clause]
)
```

| Component | Purpose | Required? |
|-----------|---------|-----------|
| **PARTITION BY** | Divides result set into groups for separate calculations | Optional |
| **ORDER BY** | Sorts rows within each partition | Depends on function |
| **Window Frame** | Defines which rows to include relative to current row | Optional (has defaults) |

**An empty OVER clause is valid:** `function() OVER()` treats the entire result set as one partition.

---

## Section 2: Window Function Categories

Snowflake supports several categories of window functions:

### 2.1 Ranking Functions

Ranking functions assign a rank or position to each row within a partition based on the ORDER BY specification. **All ranking functions require an ORDER BY clause.**

| Function | Description | Handles Ties |
|----------|-------------|--------------|
| **ROW_NUMBER()** | Unique sequential integer for each row | Creates unique numbers (arbitrary for ties) |
| **RANK()** | Rank with gaps for tied values | Same rank for ties, skips next rank(s) |
| **DENSE_RANK()** | Rank without gaps for tied values | Same rank for ties, next rank is consecutive |
| **NTILE(n)** | Divides rows into n roughly equal buckets | Distributes evenly |
| **PERCENT_RANK()** | Relative rank as percentage (0 to 1) | (rank - 1) / (total rows - 1) |
| **CUME_DIST()** | Cumulative distribution (0 to 1) | Proportion of rows <= current value |

**Ranking Functions Comparison:**

```sql
SELECT
    employee,
    sales,
    ROW_NUMBER() OVER (ORDER BY sales DESC) AS row_num,
    RANK()       OVER (ORDER BY sales DESC) AS rank,
    DENSE_RANK() OVER (ORDER BY sales DESC) AS dense_rank
FROM employee_sales;

-- Results:
-- employee | sales | row_num | rank | dense_rank
-- ---------|-------|---------|------|------------
-- Alice    | 1000  |    1    |  1   |     1
-- Bob      |  800  |    2    |  2   |     2
-- Carol    |  800  |    3    |  2   |     2      -- Tie handling differs
-- David    |  600  |    4    |  4   |     3      -- RANK skips 3, DENSE_RANK doesn't
```

**Key Exam Point:** RANK() skips numbers after ties; DENSE_RANK() does not.

### 2.2 Value Functions (Navigation Functions)

Value functions access data from other rows relative to the current row without a self-join.

| Function | Description | Default Behavior |
|----------|-------------|------------------|
| **LAG(expr, offset, default)** | Value from a previous row | offset=1, default=NULL |
| **LEAD(expr, offset, default)** | Value from a following row | offset=1, default=NULL |
| **FIRST_VALUE(expr)** | First value in the window frame | Respects frame bounds |
| **LAST_VALUE(expr)** | Last value in the window frame | Respects frame bounds |
| **NTH_VALUE(expr, n)** | nth value in the window frame | Returns NULL if n > frame size |

**LAG and LEAD Examples:**

```sql
SELECT
    order_date,
    sales,
    LAG(sales, 1, 0) OVER (ORDER BY order_date) AS prev_day_sales,
    LEAD(sales, 1, 0) OVER (ORDER BY order_date) AS next_day_sales,
    sales - LAG(sales, 1) OVER (ORDER BY order_date) AS daily_change
FROM daily_sales;
```

**FIRST_VALUE and LAST_VALUE:**

```sql
SELECT
    region,
    month,
    revenue,
    FIRST_VALUE(revenue) OVER (
        PARTITION BY region
        ORDER BY month
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS first_month_revenue,
    LAST_VALUE(revenue) OVER (
        PARTITION BY region
        ORDER BY month
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS last_month_revenue
FROM regional_sales;
```

**Important:** LAST_VALUE requires careful frame specification. The default frame often excludes following rows, so you need `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` to get the true last value in the partition.

### 2.3 Aggregate Functions as Window Functions

Standard aggregate functions can operate as window functions when combined with OVER:

| Function | As Aggregate | As Window Function |
|----------|--------------|-------------------|
| **SUM()** | Total for group | Running total, partition total |
| **AVG()** | Average for group | Moving average, partition average |
| **COUNT()** | Count for group | Running count, partition count |
| **MIN()/MAX()** | Min/Max for group | Min/Max within window frame |

```sql
SELECT
    day,
    sales,
    SUM(sales) OVER () AS total_sales,  -- Grand total (same for all rows)
    SUM(sales) OVER (PARTITION BY region) AS region_total,
    SUM(sales) OVER (ORDER BY day) AS running_total  -- Cumulative sum
FROM daily_sales;
```

---

## Section 3: PARTITION BY Clause

### Purpose

PARTITION BY divides the result set into partitions on which the window function is applied separately. Without PARTITION BY, the entire result set is treated as a single partition.

### Syntax

```sql
OVER (PARTITION BY column1, column2, ...)
```

### Examples

**Single Partition Column:**

```sql
-- Rank products within each category
SELECT
    category,
    product_name,
    sales,
    RANK() OVER (PARTITION BY category ORDER BY sales DESC) AS category_rank
FROM products;
```

**Multiple Partition Columns:**

```sql
-- Rank salespeople within each region and quarter
SELECT
    region,
    quarter,
    salesperson,
    revenue,
    RANK() OVER (
        PARTITION BY region, quarter
        ORDER BY revenue DESC
    ) AS quarterly_rank
FROM sales_data;
```

**No PARTITION BY (Entire Result Set):**

```sql
-- Global ranking across all data
SELECT
    salesperson,
    revenue,
    RANK() OVER (ORDER BY revenue DESC) AS global_rank
FROM sales_data;
```

### Key Points for Exam

- PARTITION BY is optional
- When omitted, entire result set = one partition
- Multiple columns create finer-grained partitions
- Calculations reset at each partition boundary
- PARTITION BY and ORDER BY are independent (can use one without the other)

---

## Section 4: ORDER BY in Window Functions

### Purpose

The ORDER BY clause within OVER controls:
1. **Row ordering** for ranking functions
2. **Frame boundaries** for cumulative/sliding calculations
3. **Determinism** for consistent results

### Two Types of ORDER BY

Window functions often have **two separate ORDER BY clauses**:

```sql
SELECT
    branch_id,
    net_profit,
    RANK() OVER (ORDER BY net_profit DESC) AS sales_rank  -- Window ORDER BY
FROM store_sales
ORDER BY branch_id;  -- Query ORDER BY (final output order)
```

| ORDER BY Type | Location | Purpose |
|---------------|----------|---------|
| **Window ORDER BY** | Inside OVER() | Controls window function processing |
| **Query ORDER BY** | End of query | Controls final result order |

### Functions That Require ORDER BY

| Require ORDER BY | ORDER BY Optional | ORDER BY Not Allowed |
|------------------|-------------------|----------------------|
| RANK() | SUM() | (varies by function) |
| DENSE_RANK() | AVG() | |
| ROW_NUMBER() | COUNT() | |
| NTILE() | MIN()/MAX() | |
| LEAD()/LAG() | | |
| PERCENT_RANK() | | |
| CUME_DIST() | | |

### Implied Window Frames

**Caution:** For some functions, ORDER BY implies a default window frame.

```sql
-- Without ORDER BY: Frame = entire partition
SUM(sales) OVER (PARTITION BY region)

-- With ORDER BY: Implied frame = RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
SUM(sales) OVER (PARTITION BY region ORDER BY month)
```

**Snowflake Best Practice:** Declare window frames explicitly to avoid confusion.

### Deterministic Ordering

```sql
-- Non-deterministic: Rows with same order_date may appear in any order
ROW_NUMBER() OVER (ORDER BY order_date)

-- Deterministic: Add tiebreaker column
ROW_NUMBER() OVER (ORDER BY order_date, order_id)
```

---

## Section 5: Window Frame Specification

### What is a Window Frame?

A window frame defines which rows relative to the current row are included in the calculation. Frame specifications are crucial for running totals, moving averages, and sliding calculations.

### Frame Syntax

```sql
OVER (
    [PARTITION BY ...]
    ORDER BY ...
    { ROWS | RANGE | GROUPS } BETWEEN start_bound AND end_bound
)
```

### Frame Types

| Frame Type | Description | Boundary Interpretation |
|------------|-------------|------------------------|
| **ROWS** | Physical row offset | Exact number of rows |
| **RANGE** | Logical value range | Based on ORDER BY column values |
| **GROUPS** | Groups of tied rows | Counts groups, not individual rows |

### Frame Boundaries

| Boundary | Meaning |
|----------|---------|
| **UNBOUNDED PRECEDING** | First row of partition |
| **n PRECEDING** | n rows/range before current row |
| **CURRENT ROW** | The current row |
| **n FOLLOWING** | n rows/range after current row |
| **UNBOUNDED FOLLOWING** | Last row of partition |

### Common Frame Patterns

**Cumulative/Running Total:**

```sql
-- Running sum from start to current row
SUM(sales) OVER (
    ORDER BY day
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
)

-- Shorthand equivalent
SUM(sales) OVER (
    ORDER BY day
    ROWS UNBOUNDED PRECEDING
)
```

**Moving Average (Sliding Window):**

```sql
-- 3-day moving average (current + 2 preceding)
AVG(sales) OVER (
    ORDER BY day
    ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
)

-- 7-day centered average
AVG(sales) OVER (
    ORDER BY day
    ROWS BETWEEN 3 PRECEDING AND 3 FOLLOWING
)
```

**Entire Partition:**

```sql
-- Compare each row to partition total
sales / SUM(sales) OVER (PARTITION BY region) AS pct_of_region

-- Compare to first and last in partition
FIRST_VALUE(price) OVER (
    PARTITION BY product_category
    ORDER BY effective_date
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
) AS first_price
```

### ROWS vs RANGE

**ROWS BETWEEN** - Physical offset:

```sql
-- Always exactly 3 rows (current + 2 preceding)
AVG(price) OVER (
    ORDER BY date
    ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
)
```

**RANGE BETWEEN** - Logical offset based on values:

```sql
-- All rows within 3 hours of current row
AVG(temperature) OVER (
    ORDER BY timestamp
    RANGE BETWEEN INTERVAL '3 HOURS' PRECEDING AND CURRENT ROW
)

-- All rows with same date value as current row
SUM(amount) OVER (
    ORDER BY order_date
    RANGE BETWEEN CURRENT ROW AND CURRENT ROW
)
```

**Key Difference Illustrated:**

```sql
-- Data: (date, value): (Jan 1, 10), (Jan 1, 20), (Jan 2, 30), (Jan 3, 40)

-- ROWS: Fixed number of physical rows
SUM(value) OVER (ORDER BY date ROWS UNBOUNDED PRECEDING AND CURRENT ROW)
-- Result: 10, 30, 60, 100 (each row adds incrementally)

-- RANGE: Groups rows with same ORDER BY value
SUM(value) OVER (ORDER BY date RANGE UNBOUNDED PRECEDING AND CURRENT ROW)
-- Result: 30, 30, 60, 100 (Jan 1 rows both see 30 because they share the date)
```

### Default Window Frames

| Scenario | Default Frame |
|----------|---------------|
| No ORDER BY in OVER | Entire partition |
| ORDER BY without frame | RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW |

---

## Section 6: Practical Use Cases

### 6.1 Top-N per Group

```sql
-- Top 3 products by sales in each category
SELECT * FROM (
    SELECT
        category,
        product_name,
        sales,
        ROW_NUMBER() OVER (
            PARTITION BY category
            ORDER BY sales DESC
        ) AS rn
    FROM products
)
WHERE rn <= 3;
```

### 6.2 Year-over-Year Comparison

```sql
SELECT
    year,
    month,
    revenue,
    LAG(revenue, 12) OVER (ORDER BY year, month) AS same_month_last_year,
    revenue - LAG(revenue, 12) OVER (ORDER BY year, month) AS yoy_change
FROM monthly_revenue;
```

### 6.3 Running Totals and Percentages

```sql
SELECT
    order_date,
    daily_sales,
    SUM(daily_sales) OVER (
        ORDER BY order_date
        ROWS UNBOUNDED PRECEDING
    ) AS cumulative_sales,
    SUM(daily_sales) OVER () AS total_sales,
    ROUND(100.0 * SUM(daily_sales) OVER (ORDER BY order_date ROWS UNBOUNDED PRECEDING)
          / SUM(daily_sales) OVER (), 2) AS cumulative_pct
FROM sales;
```

### 6.4 Identifying Gaps and Islands

```sql
-- Assign group IDs to consecutive sequences
SELECT
    event_date,
    event_date - ROW_NUMBER() OVER (ORDER BY event_date) * INTERVAL '1 day' AS group_id
FROM events;
```

### 6.5 Moving Average for Time Series

```sql
SELECT
    date,
    stock_price,
    AVG(stock_price) OVER (
        ORDER BY date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS seven_day_ma,
    AVG(stock_price) OVER (
        ORDER BY date
        ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
    ) AS thirty_day_ma
FROM stock_prices;
```

---

## Section 7: Performance Considerations

### Optimization Tips

| Tip | Benefit |
|-----|---------|
| Use PARTITION BY to limit window size | Reduces memory and computation |
| Ensure deterministic ORDER BY | Consistent results across executions |
| Consider clustering on partition columns | Improves data locality |
| Use ROWS instead of RANGE when possible | ROWS is generally faster |

### When Window Functions Excel

- Calculating running totals without self-joins
- Top-N queries per group
- Time-series analysis (LAG, LEAD, moving averages)
- Comparing rows to group aggregates
- De-duplication with ROW_NUMBER

### When to Consider Alternatives

- Simple aggregations (GROUP BY may be simpler)
- Very large partitions (may cause spilling)
- Complex multi-step transformations (consider CTEs or subqueries)

---

## Section 8: Key Syntax Summary

### Complete Window Function Syntax

```sql
function_name ( [expression] ) OVER (
    [ PARTITION BY expr1, expr2, ... ]
    [ ORDER BY expr1 [ASC|DESC] [NULLS FIRST|LAST], ... ]
    [ { ROWS | RANGE | GROUPS }
      { frame_start | BETWEEN frame_start AND frame_end } ]
)
```

### Quick Reference Table

| Function Type | Common Functions | Requires ORDER BY | Supports Frame |
|---------------|-----------------|-------------------|----------------|
| Ranking | ROW_NUMBER, RANK, DENSE_RANK, NTILE | Yes | No |
| Distribution | PERCENT_RANK, CUME_DIST | Yes | No |
| Value/Navigation | LAG, LEAD, FIRST_VALUE, LAST_VALUE, NTH_VALUE | Yes (for LAG/LEAD) | Yes (for FIRST/LAST/NTH) |
| Aggregate | SUM, AVG, COUNT, MIN, MAX | Optional | Yes |

---

## Exam Tips and Common Question Patterns

### High-Priority Topics

1. **RANK vs DENSE_RANK vs ROW_NUMBER** - Know the differences for handling ties
2. **Window frame boundaries** - UNBOUNDED PRECEDING, CURRENT ROW, n PRECEDING/FOLLOWING
3. **ROWS vs RANGE** - Understand physical vs logical offsets
4. **Running totals and moving averages** - Common calculation patterns
5. **LAG and LEAD** - Accessing previous/next row values

### Common Exam Traps

| Trap | Correct Understanding |
|------|----------------------|
| Confusing RANK and DENSE_RANK | RANK skips numbers after ties; DENSE_RANK doesn't |
| Default LAST_VALUE behavior | Default frame may exclude following rows |
| ORDER BY location | Window ORDER BY (inside OVER) vs Query ORDER BY (end of query) |
| Frame with no ORDER BY | Frame clause requires ORDER BY in OVER |
| Forgetting deterministic ordering | Add tiebreaker columns for consistent results |

### Sample Exam Questions

**Question 1:** What is the output of RANK() for tied values 100, 100, 90 ordered descending?
- Answer: 1, 1, 3 (not 1, 2, 3)

**Question 2:** Which function would you use to calculate a 7-day moving average?
- Answer: AVG() with `ROWS BETWEEN 6 PRECEDING AND CURRENT ROW`

**Question 3:** What happens if you omit PARTITION BY in a window function?
- Answer: The entire result set is treated as a single partition

**Question 4:** For LAST_VALUE to return the actual last value in a partition, what frame must you specify?
- Answer: `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`

**Question 5:** What is the difference between `ROWS 2 PRECEDING` and `RANGE 2 PRECEDING`?
- Answer: ROWS counts physical rows; RANGE uses logical value difference from ORDER BY column

### Key Takeaways

1. Window functions return a value for **each row** unlike aggregate functions
2. The OVER clause with PARTITION BY, ORDER BY, and frame defines the window
3. Ranking functions (RANK, DENSE_RANK, ROW_NUMBER) **require** ORDER BY
4. Default window frames can be implicit - **always declare explicitly** for clarity
5. LAG/LEAD are powerful for row-to-row comparisons without self-joins
6. ROWS = physical offset, RANGE = logical (value-based) offset

---

## Practice SQL Snippets

```sql
-- Ranking within groups
SELECT product, category, sales,
       RANK() OVER (PARTITION BY category ORDER BY sales DESC) AS rank,
       DENSE_RANK() OVER (PARTITION BY category ORDER BY sales DESC) AS dense_rank,
       ROW_NUMBER() OVER (PARTITION BY category ORDER BY sales DESC) AS row_num
FROM products;

-- Running total with percentage
SELECT date, amount,
       SUM(amount) OVER (ORDER BY date ROWS UNBOUNDED PRECEDING) AS running_total,
       SUM(amount) OVER () AS grand_total,
       ROUND(100.0 * amount / SUM(amount) OVER (), 2) AS pct_of_total
FROM transactions;

-- Compare to previous period
SELECT month, revenue,
       LAG(revenue, 1) OVER (ORDER BY month) AS prev_month,
       revenue - LAG(revenue, 1) OVER (ORDER BY month) AS mom_change,
       LAG(revenue, 12) OVER (ORDER BY month) AS same_month_last_year
FROM monthly_data;

-- Top N per group using subquery
SELECT * FROM (
    SELECT department, employee, salary,
           ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS rn
    FROM employees
) WHERE rn <= 3;

-- Moving average
SELECT date, value,
       AVG(value) OVER (ORDER BY date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS ma3,
       AVG(value) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS ma7
FROM time_series;
```

---

## Additional Resources

- Snowflake Documentation: [Window Functions](https://docs.snowflake.com/en/sql-reference/functions-window)
- Snowflake Documentation: [Window Function Syntax and Usage](https://docs.snowflake.com/en/sql-reference/functions-window-syntax)
- Snowflake Documentation: [Analyzing Time-Series Data](https://docs.snowflake.com/en/user-guide/querying-time-series-data)
