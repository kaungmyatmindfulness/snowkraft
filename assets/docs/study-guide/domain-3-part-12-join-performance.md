# Domain 3: Performance Concepts

## Part 12: Join Optimization

This section covers join optimization in Snowflake, including join types, algorithms, elimination techniques, and best practices for improving join performance. Understanding join optimization is essential for the SnowPro Core exam, particularly for questions about query performance and tuning.

---

## 1. Join Types in Snowflake

### 1.1 Supported Join Types

Snowflake supports all standard SQL join types:

| Join Type | Description | Output |
|-----------|-------------|--------|
| **INNER JOIN** | Matches rows from both tables based on join condition | Only matching rows |
| **LEFT OUTER JOIN** | All rows from left table, matching rows from right | Left table rows + matched right |
| **RIGHT OUTER JOIN** | All rows from right table, matching rows from left | Right table rows + matched left |
| **FULL OUTER JOIN** | All rows from both tables | All rows, NULLs where no match |
| **CROSS JOIN** | Cartesian product of both tables | Every combination of rows |
| **NATURAL JOIN** | Auto-joins on columns with same name | Matching rows, removes duplicate columns |

### 1.2 Inner Join

An inner join pairs each row in one table with the matching rows in the other table. Only rows with matches in both tables appear in the result.

```sql
-- Explicit INNER JOIN syntax (recommended)
SELECT p.project_name, e.employee_name
FROM projects AS p INNER JOIN employees AS e
  ON e.project_id = p.project_id;

-- Implicit join (WHERE clause) - same result but less readable
SELECT p.project_name, e.employee_name
FROM projects AS p, employees AS e
WHERE e.project_id = p.project_id;
```

### 1.3 Outer Joins

Outer joins return all rows from one or both tables, with NULLs where no match exists.

```sql
-- LEFT OUTER JOIN: All projects, even those with no employees assigned
SELECT p.project_name, e.employee_name
FROM projects AS p LEFT OUTER JOIN employees AS e
  ON e.project_id = p.project_id;

-- RIGHT OUTER JOIN: All employees, even those not assigned to projects
SELECT p.project_name, e.employee_name
FROM projects AS p RIGHT OUTER JOIN employees AS e
  ON e.project_id = p.project_id;

-- FULL OUTER JOIN: All projects AND all employees
SELECT p.project_name, e.employee_name
FROM projects AS p FULL OUTER JOIN employees AS e
  ON e.project_id = p.project_id;
```

**Important:** When using outer joins with filters in the WHERE clause, be careful not to accidentally convert them to inner joins. Filters on the outer table that check for NULL can eliminate the "outer" rows.

### 1.4 Cross Join

A cross join creates a Cartesian product - every combination of rows from both tables.

```sql
-- Cross join (use with caution - can produce very large result sets)
SELECT p.project_name, e.employee_name
FROM projects AS p CROSS JOIN employees AS e;
```

**Warning:** If table A has 1,000 rows and table B has 10,000 rows, the cross join produces 10,000,000 rows. Cross joins are expensive and should be used carefully.

### 1.5 Natural Join

A natural join automatically joins tables on columns with the same name and compatible data types.

```sql
-- Natural join implicitly uses project_id as the join column
SELECT *
FROM projects NATURAL JOIN employees;
```

**Best Practice:** Avoid natural joins in production code - they can break unexpectedly if table schemas change. Use explicit JOIN ... ON syntax instead.

### 1.6 ASOF Join

ASOF joins are specialized joins for time-series data that match rows based on the closest timestamp rather than exact matches.

```sql
-- ASOF join for time-series data
SELECT s.symbol, s.trade_time, s.price, q.bid, q.ask
FROM trades s
ASOF JOIN quotes q
  MATCH_CONDITION (s.trade_time >= q.quote_time)
  ON s.symbol = q.symbol;
```

---

## 2. Join Algorithms in Snowflake

### 2.1 Hash Join (Most Common)

Snowflake uses hash-based join algorithms for most joins. The query optimizer determines the most efficient execution plan automatically.

**How Hash Joins Work:**
1. **Build phase**: Smaller table (build side) is read and a hash table is built on the join key
2. **Probe phase**: Larger table (probe side) is scanned and matched against the hash table

**Build Side vs. Probe Side:**

| Side | Characteristics | Best For |
|------|-----------------|----------|
| **Build Side** | Smaller table, used to create hash table | Dimension tables, filtered subsets |
| **Probe Side** | Larger table, scanned against hash table | Fact tables, large data volumes |

### 2.2 Broadcast Join

When one table is significantly smaller than the other, Snowflake may use a **broadcast join**:

- The smaller table is broadcast (copied) to all compute nodes
- Each node can then perform the join locally
- Eliminates the need for shuffling the larger table across nodes

**When Snowflake Uses Broadcast Joins:**
- Build side is small enough to fit in memory
- Cost optimizer determines broadcasting is more efficient than shuffling
- Typical for joins between a large fact table and small dimension tables

### 2.3 Shuffle Join (Hash Partition Join)

For joins between two large tables, Snowflake uses a shuffle join:

- Both tables are redistributed (shuffled) across compute nodes based on the join key
- Rows with the same join key end up on the same node
- Each node performs local joins on its partition

**When Shuffle Joins Are Used:**
- Both tables are too large to broadcast
- No optimization can avoid data redistribution

---

## 3. Join Order Optimization

### 3.1 Automatic Join Ordering

Snowflake's query optimizer automatically determines the optimal join order based on:

- Table sizes and statistics
- Join selectivity estimates
- Available memory and compute resources
- Micro-partition metadata

### 3.2 DIRECTED Keyword (Manual Join Order)

Use the `DIRECTED` keyword to enforce a specific join order when you know better than the optimizer:

```sql
-- Force o1 to be scanned before o2
SELECT *
FROM o1 INNER DIRECTED JOIN o2
  ON o1.id = o2.id;

-- DIRECTED can be used with any join type
SELECT *
FROM large_table LEFT DIRECTED JOIN small_table
  ON large_table.key = small_table.key;
```

**When to Use DIRECTED:**
- Optimizer chooses suboptimal join order
- Testing performance of different join orders
- Specific performance requirements based on data distribution

**Important:** The join type (INNER, LEFT, etc.) is required when using DIRECTED.

### 3.3 Best Practices for Join Order

1. **Join smaller tables first** when possible
2. **Apply filters early** to reduce intermediate result sizes
3. **Use appropriate join types** - don't use OUTER when INNER suffices
4. **Monitor query profiles** to verify join effectiveness

---

## 4. Join Elimination

### 4.1 What Is Join Elimination?

Join elimination is an optimization where Snowflake removes unnecessary joins from the query plan. This can dramatically improve performance by avoiding costly join operations entirely.

**Types of Join Elimination:**
- Eliminating joins to tables whose columns aren't used
- Eliminating self-joins when constraints guarantee unique matches
- Eliminating joins on primary key/foreign key relationships

### 4.2 Setting the RELY Property for Join Elimination

Snowflake only performs join elimination when you indicate that data complies with constraints using the **RELY** property.

**Important:** Snowflake does NOT enforce UNIQUE, PRIMARY KEY, and FOREIGN KEY constraints on standard tables. You must:
1. Ensure data integrity yourself
2. Set the RELY property to signal the optimizer can trust the constraints

```sql
-- Add primary key constraint with RELY
ALTER TABLE orders ADD PRIMARY KEY (order_id) RELY;

-- Add foreign key constraint with RELY
ALTER TABLE order_items ADD FOREIGN KEY (order_id)
  REFERENCES orders(order_id) RELY;

-- Add unique constraint with RELY
ALTER TABLE customers ADD UNIQUE (email) RELY;
```

**Warning:** If you set RELY but your data doesn't actually comply with the constraints, query results may be incorrect when join elimination is applied.

### 4.3 Examples of Join Elimination

**Example 1: Eliminating Unnecessary Left Outer Join**

When a LEFT OUTER JOIN returns all rows from the left table and only columns from the left table are selected:

```sql
-- Before optimization
SELECT orders.order_id, orders.order_date
FROM orders LEFT OUTER JOIN customers
  ON orders.customer_id = customers.customer_id;

-- With RELY constraints, Snowflake eliminates the join entirely
-- The customers table isn't needed since no customer columns are selected
```

**Example 2: Eliminating Self-Join**

When a table joins to itself on a unique/primary key:

```sql
-- Before optimization
SELECT t1.col1, t1.col2
FROM my_table t1 INNER JOIN my_table t2
  ON t1.pk_column = t2.pk_column;

-- With RELY on PRIMARY KEY, Snowflake eliminates the self-join
-- since each pk_column value matches exactly one row
```

**Example 3: Eliminating Join on Primary Key/Foreign Key**

```sql
-- Before optimization
SELECT order_items.item_id, order_items.quantity
FROM order_items INNER JOIN orders
  ON order_items.order_id = orders.order_id;

-- With RELY on FK relationship, join is eliminated
-- Every order_item row has exactly one matching orders row
```

---

## 5. Join Performance Optimization

### 5.1 Clustering Keys for Joins

Clustering keys can significantly improve join performance by co-locating related data in the same micro-partitions.

**Best Practice:** Consider including columns frequently used in JOIN conditions when defining clustering keys.

```sql
-- Cluster fact table on commonly joined columns
ALTER TABLE sales CLUSTER BY (customer_id, product_id);

-- If filtering by date AND joining on customer
ALTER TABLE orders CLUSTER BY (order_date, customer_id);
```

**Guidelines for Clustering with Joins:**
- Prioritize filter columns first, then join columns
- Limit to 3-4 columns maximum
- Order from lowest to highest cardinality

### 5.2 Search Optimization for Joins

The Search Optimization Service can improve join performance when the build side has a small number of distinct values.

```sql
-- Enable search optimization on the probe side table
ALTER TABLE sales ADD SEARCH OPTIMIZATION;

-- Specify specific columns for join optimization
ALTER TABLE sales ADD SEARCH OPTIMIZATION
  ON EQUALITY(product_id, customer_id);
```

**Search Optimization Works Best For:**
- Joins where one side (build side) has few distinct values
- Equality predicates in join conditions
- Large probe-side tables with search optimization enabled

**Limitations:**
- Disjuncts (OR) in join predicates not supported
- LIKE, ILIKE, RLIKE predicates not supported
- VARIANT column join predicates not supported

### 5.3 Reducing Join Data Volume

**Filter Early:**
```sql
-- Good: Filter before joining
SELECT *
FROM orders o
JOIN (
  SELECT * FROM customers WHERE region = 'WEST'
) c ON o.customer_id = c.customer_id;

-- Alternatively, use WHERE clause (optimizer may reorder)
SELECT *
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
WHERE c.region = 'WEST';
```

**Select Only Needed Columns:**
```sql
-- Good: Only select required columns
SELECT o.order_id, o.order_date, c.customer_name
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id;

-- Avoid: SELECT * returns unnecessary data
SELECT *
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id;
```

### 5.4 Avoiding Cartesian Products

Cartesian products (cross joins without filters) are expensive. Common causes:

1. **Missing join condition:**
```sql
-- Bad: Missing ON clause creates Cartesian product
SELECT * FROM orders, customers;

-- Good: Add proper join condition
SELECT * FROM orders o JOIN customers c ON o.customer_id = c.customer_id;
```

2. **Multiple comma-separated tables without conditions:**
```sql
-- Bad: Three-way Cartesian product
SELECT * FROM orders, customers, products;

-- Good: Proper multi-table join
SELECT *
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
JOIN products p ON o.product_id = p.product_id;
```

---

## 6. Lateral Joins

### 6.1 What Is a Lateral Join?

A lateral join allows the right-hand side (inline view or table function) to reference columns from the left-hand side. This enables row-by-row processing.

```sql
-- Lateral join with subquery
SELECT *
FROM departments AS d,
  LATERAL (SELECT * FROM employees WHERE department_id = d.department_id)
ORDER BY employee_id;
```

**Key Difference from Regular Joins:**
- Regular joins: Right side cannot reference left side during initial evaluation
- Lateral joins: Right side is evaluated for each row from the left side

### 6.2 Common Use Cases

**Flattening Semi-Structured Data:**
```sql
-- Use LATERAL with FLATTEN for arrays/variants
SELECT
  customer_id,
  f.value:item_name::STRING AS item_name,
  f.value:quantity::INT AS quantity
FROM orders,
  LATERAL FLATTEN(input => order_items) f;
```

**Top-N Per Group:**
```sql
-- Get top 3 orders per customer
SELECT customer_id, o.order_id, o.total
FROM customers c,
  LATERAL (
    SELECT order_id, total
    FROM orders
    WHERE customer_id = c.customer_id
    ORDER BY total DESC
    LIMIT 3
  ) o;
```

### 6.3 Lateral Join Performance

- Lateral joins process row-by-row, which can be slower than set-based operations
- Consider alternatives for large datasets (window functions, regular joins)
- Best for operations that require row-specific processing

---

## 7. Monitoring Join Performance

### 7.1 Query Profile Analysis

In the Query Profile, look for these join-related indicators:

| Metric | What It Indicates |
|--------|-------------------|
| **Join operator execution time** | Time spent in join operations |
| **Partitions scanned** | Number of micro-partitions read |
| **Bytes spilled to local/remote** | Memory pressure during join |
| **Build side vs. probe side rows** | Join selectivity and efficiency |

### 7.2 Identifying Join Issues

**High Bytes Spilled:**
- Join is too large for available memory
- Consider larger warehouse or breaking query into smaller parts

**Excessive Partitions Scanned:**
- Poor clustering alignment with join columns
- Consider adding clustering keys

**Long Join Operator Time:**
- Large intermediate results
- Missing filters or overly broad predicates

### 7.3 Finding Queries with Join Issues

```sql
-- Find queries with high spilling (potential join memory issues)
SELECT
  query_id,
  query_text,
  bytes_spilled_to_local_storage,
  bytes_spilled_to_remote_storage,
  total_elapsed_time
FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY
WHERE (bytes_spilled_to_local_storage > 0
  OR bytes_spilled_to_remote_storage > 0)
  AND start_time >= DATEADD('day', -7, CURRENT_TIMESTAMP())
ORDER BY bytes_spilled_to_remote_storage DESC
LIMIT 20;
```

---

## 8. Exam Tips and Common Question Patterns

### 8.1 Frequently Tested Concepts

1. **Join Types**: Know the difference between INNER, OUTER, CROSS, and NATURAL joins
2. **Join Elimination**: Understand RELY property requirements
3. **DIRECTED Keyword**: Know it enforces join order and requires join type
4. **Build vs. Probe Side**: Smaller table is typically the build side
5. **Clustering for Joins**: Join columns are candidates for clustering keys
6. **Search Optimization**: Works for joins with small build side

### 8.2 Common Exam Traps

| Trap | Correct Understanding |
|------|----------------------|
| Snowflake enforces PK/FK constraints | Standard tables do NOT enforce constraints |
| Natural joins are recommended | Explicit ON clauses are safer and preferred |
| Cross joins are always wrong | They have valid uses (e.g., generating combinations) |
| Larger warehouse always helps joins | Sometimes query restructuring is more effective |
| DIRECTED improves performance | DIRECTED only controls order, may help or hurt |
| Join elimination is automatic | Requires RELY property set on constraints |

### 8.3 Key SQL Commands to Know

```sql
-- DIRECTED join (enforce join order)
SELECT * FROM t1 INNER DIRECTED JOIN t2 ON t1.id = t2.id;

-- Add constraint with RELY for join elimination
ALTER TABLE t1 ADD PRIMARY KEY (id) RELY;
ALTER TABLE t2 ADD FOREIGN KEY (id) REFERENCES t1(id) RELY;

-- Enable search optimization for joins
ALTER TABLE large_table ADD SEARCH OPTIMIZATION ON EQUALITY(join_column);

-- Clustering for join performance
ALTER TABLE fact_table CLUSTER BY (date_col, dimension_key);

-- LATERAL join with FLATTEN
SELECT * FROM t, LATERAL FLATTEN(input => t.array_col);
```

### 8.4 Practice Questions

**Question 1:** What is required for Snowflake to perform join elimination on a primary key/foreign key relationship?
- A) Enterprise Edition or higher
- B) The RELY constraint property must be set
- C) Tables must be clustered
- D) Search optimization must be enabled

**Answer:** B - The RELY constraint property tells Snowflake it can trust the constraints for optimization purposes.

---

**Question 2:** Which keyword can be used to enforce the join order of tables in a query?
- A) ORDERED
- B) FORCED
- C) DIRECTED
- D) SEQUENTIAL

**Answer:** C - The DIRECTED keyword enforces that the left table is scanned before the right table.

---

**Question 3:** In a hash join, which table is typically used as the build side?
- A) The larger table
- B) The smaller table
- C) The table with more columns
- D) The table without indexes

**Answer:** B - The smaller table is typically used as the build side because the hash table needs to fit in memory.

---

**Question 4:** A query performs a LEFT OUTER JOIN but only selects columns from the left table. With RELY set on appropriate constraints, what can Snowflake do?
- A) Convert it to an INNER JOIN
- B) Eliminate the join entirely
- C) Use a broadcast join
- D) Create a materialized view

**Answer:** B - If no columns from the right table are needed and constraints ensure the join doesn't filter rows, Snowflake can eliminate the join entirely.

---

**Question 5:** Which join type creates a Cartesian product?
- A) INNER JOIN
- B) NATURAL JOIN
- C) CROSS JOIN
- D) FULL OUTER JOIN

**Answer:** C - A CROSS JOIN produces every combination of rows from both tables (Cartesian product).

---

**Question 6:** What is a key benefit of using the Search Optimization Service for join queries?
- A) It eliminates the need for join conditions
- B) It speeds up joins when the build side has few distinct values
- C) It automatically creates indexes on join columns
- D) It converts all joins to broadcast joins

**Answer:** B - Search Optimization can improve join performance when the build side has a small number of distinct values by creating efficient search access paths.

---

**Question 7:** A join query is spilling to remote storage. What does this indicate?
- A) The query is using optimal resources
- B) The warehouse is too small for the join operation
- C) Search optimization is working correctly
- D) Join elimination was applied

**Answer:** B - Spilling to remote storage indicates the intermediate results are too large for memory, suggesting a larger warehouse or query restructuring may help.

---

**Question 8:** When using the DIRECTED keyword in a join, what is required?
- A) Enterprise Edition
- B) The join type must be specified (e.g., INNER, LEFT)
- C) Both tables must be clustered
- D) Search optimization must be enabled

**Answer:** B - When using DIRECTED, the join type (INNER, LEFT, etc.) is required syntax.

---

## 9. Quick Reference

### Join Types Summary

| Join | Returns |
|------|---------|
| INNER | Matching rows only |
| LEFT OUTER | All left + matching right |
| RIGHT OUTER | All right + matching left |
| FULL OUTER | All rows from both |
| CROSS | Cartesian product |
| NATURAL | Auto-match on same-named columns |
| LATERAL | Row-by-row processing |

### Join Optimization Techniques

| Technique | Purpose | When to Use |
|-----------|---------|-------------|
| Clustering keys | Co-locate data for joins | Frequent joins on specific columns |
| Search optimization | Speed up selective joins | Small build side, large probe side |
| DIRECTED keyword | Control join order | Optimizer chooses suboptimal order |
| Join elimination | Remove unnecessary joins | RELY constraints set, columns unused |
| Filter early | Reduce join data volume | Large tables with selective filters |

### Key Commands

| Task | Command |
|------|---------|
| Force join order | `SELECT * FROM t1 INNER DIRECTED JOIN t2 ON ...` |
| Add PK with RELY | `ALTER TABLE t ADD PRIMARY KEY (col) RELY` |
| Add FK with RELY | `ALTER TABLE t ADD FOREIGN KEY (col) REFERENCES ... RELY` |
| Enable search opt for joins | `ALTER TABLE t ADD SEARCH OPTIMIZATION ON EQUALITY(col)` |
| Cluster for joins | `ALTER TABLE t CLUSTER BY (filter_col, join_col)` |

### Monitoring Queries

```sql
-- Find queries spilling to storage
SELECT query_id, bytes_spilled_to_remote_storage
FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY
WHERE bytes_spilled_to_remote_storage > 0;

-- Check partition pruning in query profile
-- Look for: Partitions scanned vs. Partitions total
```

---

**Key Takeaway:** Join optimization in Snowflake involves understanding join types, leveraging automatic optimizer decisions, using features like join elimination (with RELY constraints), and employing performance features such as clustering and search optimization. The exam tests knowledge of when to use different join types, how join elimination works, and what the DIRECTED keyword does for join ordering.
