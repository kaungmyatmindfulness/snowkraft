# Domain 3: Performance Concepts
## Part 5: Search Optimization Service

**Exam Weight:** This topic is part of Domain 3 (10-15% of exam)

**Edition Requirement:** Enterprise Edition or higher

---

## Overview

The Search Optimization Service is a table-level property that can significantly improve the performance of selective point lookup queries and text searches. It creates and maintains a persistent data structure called a **search access path** that enables efficient micro-partition pruning.

---

## Section 1: What is Search Optimization?

### Core Concept

Search optimization creates a **search access path** - a persistent data structure that tracks which values might exist in each micro-partition. This allows Snowflake to skip micro-partitions that definitely do not contain the values being searched for.

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                    QUERY EXECUTION                           │
├─────────────────────────────────────────────────────────────┤
│  1. Query submitted with WHERE clause                       │
│  2. Search access path consulted                            │
│  3. Micro-partitions without matching values PRUNED         │
│  4. Only relevant micro-partitions scanned                  │
│  5. Results returned faster                                 │
└─────────────────────────────────────────────────────────────┘
```

### Key Characteristics

| Characteristic | Description |
|----------------|-------------|
| **Transparent** | Queries work the same; some are just faster |
| **Automatic Maintenance** | Maintained in background by Snowflake |
| **No Warehouse Required** | Maintenance uses serverless compute |
| **Background Build** | Does not block table operations |
| **Enterprise Edition** | Requires Enterprise Edition or higher |

---

## Section 2: When to Use Search Optimization

### Ideal Use Cases

1. **Point Lookup Queries** - Queries returning only one or a small number of distinct rows
   - Dashboard queries with highly selective filters
   - Data exploration looking for specific subsets
   - Applications retrieving small result sets

2. **Text and Substring Searches** - LIKE, ILIKE, RLIKE patterns
   - Log file analysis
   - Text mining applications
   - Pattern matching queries

3. **Semi-Structured Data Queries** - VARIANT, OBJECT, ARRAY columns
   - JSON document searches
   - Nested field lookups
   - Array element matching

4. **Geospatial Queries** - GEOGRAPHY data type searches

### Query Characteristics That Benefit Most

| Characteristic | Requirement |
|----------------|-------------|
| **Query Duration** | Originally runs for several seconds or longer |
| **Distinct Values** | Column has ~100,000+ distinct values |
| **Selectivity** | Query returns small number of rows |
| **Column Usage** | Filters on non-clustering key columns |

### When NOT to Use Search Optimization

- Queries already running sub-second
- Full table scans or large result sets
- Tables with very few distinct values
- Columns already served well by clustering
- Tables with very high churn rates (may increase costs)

---

## Section 3: Enabling Search Optimization

### Required Privileges

| Privilege | Requirement |
|-----------|-------------|
| **OWNERSHIP** | On the table |
| **ADD SEARCH OPTIMIZATION** | On the schema containing the table |

```sql
-- Grant schema-level privilege
GRANT ADD SEARCH OPTIMIZATION ON SCHEMA mydb.myschema
TO ROLE my_role;
```

### Enabling for Entire Table

Enables search optimization for point lookups on all eligible columns:

```sql
ALTER TABLE mytable ADD SEARCH OPTIMIZATION;
```

### Enabling for Specific Columns (Recommended)

**Best Practice:** Enable only for columns used in query predicates.

```sql
-- Enable EQUALITY search on specific columns
ALTER TABLE mytable ADD SEARCH OPTIMIZATION ON EQUALITY(col1, col2);

-- Enable SUBSTRING search
ALTER TABLE mytable ADD SEARCH OPTIMIZATION ON SUBSTRING(text_col);

-- Enable for VARIANT columns
ALTER TABLE mytable ADD SEARCH OPTIMIZATION ON EQUALITY(variant_col:path:to:element);

-- Enable FULL_TEXT search
ALTER TABLE mytable ADD SEARCH OPTIMIZATION ON FULL_TEXT(col1, col2, col3);

-- Enable GEO search
ALTER TABLE mytable ADD SEARCH OPTIMIZATION ON GEO(geography_col);
```

### Search Methods Summary

| Method | Use Case | Supports |
|--------|----------|----------|
| **EQUALITY** | Point lookups, IN predicates | =, IN |
| **SUBSTRING** | Pattern matching | LIKE, ILIKE, RLIKE, REGEXP, CONTAINS |
| **FULL_TEXT** | Text search functions | SEARCH, SEARCH_IP |
| **GEO** | Geospatial queries | GEOGRAPHY functions |

### Disabling Search Optimization

```sql
-- Remove from entire table
ALTER TABLE mytable DROP SEARCH OPTIMIZATION;

-- Remove from specific columns
ALTER TABLE mytable DROP SEARCH OPTIMIZATION ON EQUALITY(col1);
```

---

## Section 4: Point Lookup Queries

### Definition

Point lookup queries are queries expected to return a small number of rows, typically using equality predicates.

### Supported Predicates

```sql
-- Equality predicate
SELECT * FROM customers WHERE customer_id = 12345;

-- IN predicate
SELECT * FROM orders WHERE status IN ('PENDING', 'PROCESSING');

-- Multiple conditions with AND
SELECT * FROM sales
WHERE region = 'WEST' AND product_id = 'ABC123';
```

### Implicit vs Explicit Casting

**Important:** The cast must be on the constant, NOT the column.

```sql
-- SUPPORTED: Cast on constant (implicit or explicit)
SELECT * FROM test_table WHERE id = '123';  -- String cast to number

-- NOT SUPPORTED: Cast on column
SELECT * FROM test_table WHERE CAST(id AS NUMBER) = 123;
```

### Supported Data Types

- Fixed-point numbers (INTEGER, NUMERIC)
- String types (VARCHAR, BINARY)
- Date and time types (DATE, TIME, TIMESTAMP)
- Semi-structured types (VARIANT, OBJECT, ARRAY)
- GEOGRAPHY

---

## Section 5: Substring and Regular Expression Searches

### Supported Functions

| Function | Example |
|----------|---------|
| **LIKE** | `WHERE col LIKE '%search%'` |
| **LIKE ANY / ALL** | `WHERE col LIKE ANY ('%a%', '%b%')` |
| **ILIKE** | `WHERE col ILIKE '%SEARCH%'` (case-insensitive) |
| **RLIKE / REGEXP** | `WHERE col RLIKE '.*pattern.*'` |
| **CONTAINS** | `WHERE CONTAINS(col, 'search')` |
| **STARTSWITH** | `WHERE STARTSWITH(col, 'prefix')` |
| **ENDSWITH** | `WHERE ENDSWITH(col, 'suffix')` |

### Critical Rule: Minimum 5-Character Substrings

**Search optimization only works for substrings of 5 or more characters.**

```sql
-- OPTIMIZED (5+ characters)
SELECT * FROM logs WHERE message LIKE '%ERROR%';  -- "ERROR" = 5 chars

-- NOT OPTIMIZED (< 5 characters)
SELECT * FROM logs WHERE message LIKE '%ERR%';    -- "ERR" = 3 chars
```

### Regular Expression Patterns

For RLIKE/REGEXP queries:
- Pattern must contain at least one substring literal of 5+ characters
- The substring must appear at least once (not optional)

```sql
-- OPTIMIZED: Contains "email" and "snowflake" (5+ chars each)
WHERE col RLIKE '.*email=[\w\.]+@snowflake\.com.*'

-- OPTIMIZED: "Germany", "France", "Spain" all 5+ chars
WHERE col RLIKE '.*country=(Germany|France|Spain).*'

-- NOT OPTIMIZED: No substrings 5+ characters
WHERE col RLIKE '.*[0-9]{3}-?[0-9]{3}-?[0-9]{4}.*'

-- NOT OPTIMIZED: "tel=" is only 4 characters
WHERE col RLIKE '.*tel=[0-9]{3}-?[0-9]{3}-?[0-9]{4}.*'

-- NOT OPTIMIZED: Substring is optional with ?
WHERE col RLIKE '.*[a-zA-z]+(string)?[0-9]+.*'
```

---

## Section 6: VARIANT Column Searches (Semi-Structured Data)

### Enabling for VARIANT Columns

**Important:** Enabling search optimization at the table level does NOT enable it for VARIANT columns. You must explicitly specify VARIANT columns or paths.

```sql
-- Enable for entire VARIANT column
ALTER TABLE mytable ADD SEARCH OPTIMIZATION ON EQUALITY(variant_col);

-- Enable for specific path in VARIANT
ALTER TABLE mytable ADD SEARCH OPTIMIZATION ON EQUALITY(variant_col:user:id);

-- Enable SUBSTRING on VARIANT
ALTER TABLE mytable ADD SEARCH OPTIMIZATION ON SUBSTRING(variant_col);
```

### Supported Predicates for VARIANT

```sql
-- Equality on nested element
SELECT * FROM events WHERE src:user:id = 12345;

-- Casting to specific type
SELECT * FROM events WHERE src:user:name::VARCHAR = 'John';

-- DATE cast
SELECT * FROM events WHERE src:event_date::DATE = '2024-01-15';

-- ARRAY_CONTAINS
SELECT * FROM products WHERE ARRAY_CONTAINS('electronics'::VARIANT, tags);

-- ARRAYS_OVERLAP
SELECT * FROM items WHERE ARRAYS_OVERLAP(categories, ARRAY_CONSTRUCT('A', 'B'));
```

### Supported Data Types in VARIANT Predicates

| Type | Supported |
|------|-----------|
| FIXED (NUMBER, NUMERIC) | Yes |
| INTEGER | Yes |
| VARCHAR | Yes |
| DATE | Yes |
| TIME | Yes |
| TIMESTAMP variants | Yes |
| BOOLEAN (cast to VARCHAR) | Yes |

---

## Section 7: Text Queries with SEARCH and SEARCH_IP

### Overview

The SEARCH and SEARCH_IP functions perform full-text searches across one or more columns. Search optimization can accelerate these queries with the FULL_TEXT method.

### Enabling FULL_TEXT Search Optimization

```sql
-- Enable on specific columns
ALTER TABLE logs ADD SEARCH OPTIMIZATION ON FULL_TEXT(message, details);

-- Enable with specific analyzer
ALTER TABLE logs ADD SEARCH OPTIMIZATION ON FULL_TEXT(message ANALYZER => 'UNICODE_ANALYZER');

-- Enable on VARIANT column
ALTER TABLE events ADD SEARCH OPTIMIZATION ON FULL_TEXT(src);

-- Enable on all applicable columns
ALTER TABLE logs ADD SEARCH OPTIMIZATION ON FULL_TEXT(*);
```

### Available Analyzers

| Analyzer | Use Case |
|----------|----------|
| **DEFAULT_ANALYZER** | General text search |
| **UNICODE_ANALYZER** | Unicode text handling |
| **ENTITY_ANALYZER** | IP addresses (SEARCH_IP) |

### Important: Analyzer Matching

**The analyzer in the ALTER TABLE must match the analyzer in the SEARCH function for optimization to be used.**

```sql
-- Enable with UNICODE_ANALYZER
ALTER TABLE logs ADD SEARCH OPTIMIZATION ON FULL_TEXT(message ANALYZER => 'UNICODE_ANALYZER');

-- Query MUST use same analyzer
SELECT * FROM logs WHERE SEARCH(message, 'error', ANALYZER => 'UNICODE_ANALYZER');
```

---

## Section 8: Cost Considerations

### Cost Components

| Component | Description |
|-----------|-------------|
| **Storage** | Search access path requires additional storage |
| **Initial Build** | Compute resources to build initial search access path |
| **Maintenance** | Ongoing compute for keeping search access path current |

### Storage Costs

- Typical size: ~25% of original table size
- Worst case (all unique values): Up to 100% of table size
- Varies based on distinct values in columns

### Compute Costs

- Billed per-second (1-second increments)
- Uses serverless compute (no warehouse required)
- Initial build costs vary by table size
- Maintenance costs proportional to data changes

### Cost Estimation

```sql
-- Estimate costs before enabling
SELECT SYSTEM$ESTIMATE_SEARCH_OPTIMIZATION_COSTS('mytable');

-- Estimate for specific columns
SELECT SYSTEM$ESTIMATE_SEARCH_OPTIMIZATION_COSTS('mytable',
  'EQUALITY(col1), SUBSTRING(col2)');
```

**Important:** Estimates can vary up to 50% from actual costs (or more in rare cases).

### Reducing Costs

| Strategy | Description |
|----------|-------------|
| **Selective Columns** | Only enable for columns used in queries |
| **Batch DML** | Batch INSERT, UPDATE, DELETE operations |
| **Less Frequent Deletes** | Delete old data less frequently |
| **Disable Before Recluster** | Drop search optimization before major reclustering |

---

## Section 9: Monitoring Search Optimization

### Check Optimization Progress

```sql
-- View progress in SHOW TABLES
SHOW TABLES LIKE 'mytable';
-- Check SEARCH_OPTIMIZATION_PROGRESS column (100 = complete)
```

### View Configuration

```sql
-- Display search optimization configuration
DESCRIBE SEARCH OPTIMIZATION ON mytable;

-- Returns: expression_id, method, target, target_data_type, active
```

### Query Profile Indicators

In Query Profile, look for:
- **Search Optimization Access node** - Indicates search optimization was used
- **Partitions pruned by search optimization** - Number of micro-partitions skipped

### Why Search Optimization Might Not Be Used

| Reason | Explanation |
|--------|-------------|
| **Predicate Mismatch** | Query predicate doesn't match enabled search methods |
| **Cost-Based Decision** | Optimizer determined no benefit |
| **Predicate Limit Exceeded** | Too many predicates in query |
| **Build In Progress** | Search access path not yet complete |

---

## Section 10: Working with Search-Optimized Tables

### Operations That Preserve Search Optimization

| Operation | Search Optimization |
|-----------|---------------------|
| Add column | Preserved (new column added automatically if table-level) |
| Drop column | Preserved (column removed from search path) |
| Rename column | Preserved |
| Clone table | Cloned (zero-copy clone) |
| Undrop table | Restored |
| Database replication | Replicated to secondary |

### Operations That Invalidate Search Optimization

| Operation | Effect |
|-----------|--------|
| Change column default value | Search access path becomes invalid |
| CREATE TABLE ... LIKE | NOT copied to new table |
| Significant reclustering | May require rebuild |

### Cloning Considerations

When cloning a table with search optimization:
1. Search access path is also cloned (zero-copy)
2. If search path was out-of-date, BOTH tables incur maintenance costs
3. Consider disabling search optimization on clone immediately if not needed

```sql
-- Clone table
CREATE TABLE mytable_clone CLONE mytable;

-- Optionally disable search optimization on clone
ALTER TABLE mytable_clone DROP SEARCH OPTIMIZATION;
```

---

## Section 11: Comparison with Other Optimization Features

### Search Optimization vs Clustering

| Aspect | Search Optimization | Clustering |
|--------|---------------------|------------|
| **Target** | Point lookups, text search | Range queries, ordered data |
| **Columns** | Multiple columns independently | Limited cluster key columns |
| **Maintenance** | Automatic, serverless | Automatic (if enabled) |
| **Best For** | Highly selective queries | Large scans with range filters |

### Search Optimization vs Materialized Views

| Aspect | Search Optimization | Materialized Views |
|--------|---------------------|-------------------|
| **Data** | No data duplication (metadata only) | Stores pre-computed results |
| **Query Types** | Point lookups, pattern matching | Aggregations, joins |
| **Maintenance** | Automatic | Automatic |
| **Storage** | ~25% overhead | Full result storage |

### Search Optimization vs Query Acceleration Service

| Aspect | Search Optimization | Query Acceleration |
|--------|---------------------|-------------------|
| **Target** | Selective predicates | Large scans, spills |
| **Enablement** | Per table | Per warehouse |
| **Use Case** | Finding specific rows | Accelerating slow queries |

---

## Section 12: Exam Tips and Common Question Patterns

### Key Facts to Memorize

1. **Enterprise Edition Required** - Search optimization is an Enterprise Edition feature
2. **5-Character Minimum** - Substring searches require 5+ character patterns
3. **VARIANT Not Auto-Enabled** - Must explicitly enable for VARIANT columns
4. **No Warehouse Needed** - Maintenance uses serverless compute
5. **Cast on Constant** - Implicit casts must be on constants, not columns
6. **Analyzer Must Match** - FULL_TEXT analyzer must match SEARCH function

### Common Exam Question Patterns

**Pattern 1: Edition Requirements**
> "Which Snowflake edition is required for search optimization?"
> **Answer:** Enterprise Edition or higher

**Pattern 2: Substring Length**
> "A query uses `LIKE '%ABC%'`. Will search optimization help?"
> **Answer:** No, "ABC" is only 3 characters (minimum is 5)

**Pattern 3: VARIANT Columns**
> "After enabling search optimization on a table, VARIANT column queries are not faster. Why?"
> **Answer:** VARIANT columns must be explicitly enabled with `ON EQUALITY(variant_col)`

**Pattern 4: Casting Rules**
> "Which query can use search optimization?"
> - `WHERE CAST(id AS NUMBER) = 123` - NO (cast on column)
> - `WHERE id = '123'` - YES (implicit cast on constant)

**Pattern 5: Cost Components**
> "What contributes to search optimization costs?"
> **Answer:** Storage for search access path + compute for initial build + maintenance compute

### Tricky Scenarios

**Scenario 1: CREATE TABLE LIKE**
```sql
CREATE TABLE new_table LIKE existing_table;
```
**Result:** Search optimization is NOT copied to new table.

**Scenario 2: Clone**
```sql
CREATE TABLE new_table CLONE existing_table;
```
**Result:** Search optimization IS copied (zero-copy clone).

**Scenario 3: Regular Expression with Optional Substring**
```sql
WHERE col RLIKE '.*error(log)?.*'
```
**Result:** NOT optimized - "error" is 5 chars but "(log)?" makes it optional.

**Scenario 4: Query Not Using Search Optimization**
Check for:
- Predicate mismatch (wrong search method)
- Build not complete (progress < 100%)
- Cost-based decision by optimizer
- Predicate limit exceeded

---

## Section 13: Practice Questions

### Question 1
Which search method would you enable for queries using `WHERE message LIKE '%error_code%'`?

A) EQUALITY
B) FULL_TEXT
C) SUBSTRING
D) GEO

**Answer:** C) SUBSTRING - LIKE patterns use the SUBSTRING search method.

---

### Question 2
What is the minimum substring length for search optimization to be effective?

A) 3 characters
B) 4 characters
C) 5 characters
D) 10 characters

**Answer:** C) 5 characters

---

### Question 3
Which statement correctly enables search optimization for a VARIANT column?

A) `ALTER TABLE t ADD SEARCH OPTIMIZATION;`
B) `ALTER TABLE t ADD SEARCH OPTIMIZATION ON EQUALITY(variant_col);`
C) `ALTER TABLE t ADD SEARCH OPTIMIZATION ON VARIANT(variant_col);`
D) `ALTER TABLE t ENABLE SEARCH OPTIMIZATION FOR variant_col;`

**Answer:** B) - Must explicitly specify VARIANT columns; table-level enablement does not include VARIANT.

---

### Question 4
After cloning a table with search optimization, you want to remove search optimization from the clone to save costs. What is the correct approach?

A) Drop and recreate the cloned table
B) `ALTER TABLE clone DROP SEARCH OPTIMIZATION;`
C) Search optimization cannot be removed from clones
D) `TRUNCATE TABLE clone;`

**Answer:** B) `ALTER TABLE clone DROP SEARCH OPTIMIZATION;`

---

### Question 5
Which query profile indicator shows that search optimization was used?

A) Query Acceleration indicator
B) Search Optimization Access node
C) Micro-Partition Filter badge
D) Pruning Statistics panel

**Answer:** B) Search Optimization Access node

---

## Summary

| Topic | Key Points |
|-------|------------|
| **What It Is** | Table property creating search access paths for faster lookups |
| **Edition** | Enterprise Edition or higher required |
| **Best For** | Point lookups, text search, VARIANT queries, selective predicates |
| **Search Methods** | EQUALITY, SUBSTRING, FULL_TEXT, GEO |
| **SUBSTRING Rule** | Minimum 5-character patterns required |
| **VARIANT** | Must be explicitly enabled; not included in table-level enablement |
| **Costs** | Storage (~25% table size) + serverless compute for maintenance |
| **Monitoring** | SHOW TABLES (progress), DESCRIBE SEARCH OPTIMIZATION, Query Profile |
| **Cloning** | Search optimization is cloned; consider disabling if not needed |

---

*Study Guide Version: 1.0 | Last Updated: January 2025 | SnowPro Core COF-C02*
