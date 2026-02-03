# Domain 6: Data Protection & Sharing
## Part 3: Zero-Copy Cloning

**Exam Weight:** This topic is part of Domain 6 (5-10% of exam)

---

## Table of Contents
1. [Zero-Copy Cloning Overview](#zero-copy-cloning-overview)
2. [How Zero-Copy Cloning Works](#how-zero-copy-cloning-works)
3. [Cloneable Objects](#cloneable-objects)
4. [Clone Syntax and Examples](#clone-syntax-and-examples)
5. [Cloning with Time Travel](#cloning-with-time-travel)
6. [Storage Implications](#storage-implications)
7. [Access Control and Privileges](#access-control-and-privileges)
8. [Cloning Considerations by Object Type](#cloning-considerations-by-object-type)
9. [Clone vs Copy: Key Differences](#clone-vs-copy-key-differences)
10. [Limitations and Restrictions](#limitations-and-restrictions)
11. [Exam Tips and Common Questions](#exam-tips-and-common-questions)
12. [Practice Questions](#practice-questions)

---

## Zero-Copy Cloning Overview

### What Is Zero-Copy Cloning?

Zero-copy cloning is a Snowflake feature that allows you to create a copy of a database, schema, or table without physically copying the underlying data. The clone initially shares the same micro-partitions as the source object.

**Key Characteristics:**

| Property | Description |
|----------|-------------|
| Speed | Nearly instantaneous, regardless of data size |
| Initial storage cost | Zero additional storage at creation time |
| Independence | Clone and source are independent after creation |
| Metadata operation | Creates new metadata pointing to existing micro-partitions |
| Recursive | Cloning a database clones all its schemas, tables, and other child objects recursively |
| Use cases | Development/testing, backups, data snapshots |

### Why Use Zero-Copy Cloning?

1. **Instant backups**: Create point-in-time snapshots for data protection
2. **Development environments**: Quickly provision dev/test environments with production data
3. **What-if analysis**: Test changes without affecting production
4. **Data versioning**: Maintain multiple versions of data for comparison
5. **Cost efficiency**: No storage cost until data diverges

---

## How Zero-Copy Cloning Works

### The Metadata-Only Operation

When you create a clone:

1. Snowflake creates new metadata entries for the cloned object
2. The new metadata points to the same micro-partitions as the source
3. No physical data is copied
4. Both objects share the same underlying storage initially

```
Source Table                    Cloned Table
+----------------+              +----------------+
|   Metadata     |              |   Metadata     |
|   (Table A)    |              |   (Table A')   |
+-------+--------+              +-------+--------+
        |                               |
        |                               |
        v                               v
+-------+-------------------------------+--------+
|              Shared Micro-partitions           |
|  [MP1] [MP2] [MP3] [MP4] [MP5] [MP6] [MP7]    |
+------------------------------------------------+
```

### After Modifications

When data is modified in either the clone or source:

```
Source Table (after INSERT)     Cloned Table (after UPDATE)
+----------------+              +----------------+
|   Metadata     |              |   Metadata     |
|   (Table A)    |              |   (Table A')   |
+-------+--------+              +-------+--------+
        |                               |
        v                               v
   [MP8] (new)                     [MP9] (new)
        |                               |
        v                               v
+-------+-------------------------------+--------+
|              Shared Micro-partitions           |
|  [MP1] [MP2] [MP3] [MP4] [MP5] [MP6] [MP7]    |
+------------------------------------------------+
```

**Important**: Only the changed micro-partitions incur additional storage costs.

---

## Cloneable Objects

### Objects That Can Be Cloned

| Object Type | Clone Directly | Clone via Container | Time Travel Support |
|-------------|----------------|---------------------|---------------------|
| Database | Yes | N/A | Yes |
| Schema | Yes | Yes (via database) | Yes |
| Table (standard) | Yes | Yes | Yes |
| Dynamic Table | Yes | Yes | Yes |
| Event Table | Yes | Yes | Yes |
| Stream | Yes | Yes | Yes |
| External Named Stage | Yes | Yes | No |
| File Format | No | Yes | No |
| Sequence | No | Yes | No |
| Task | No | Yes | No |
| Pipe (external stage) | No | Yes | No |
| View | No | Yes | No |
| Materialized View | No | Yes | No |
| Stored Procedure | No | Yes | No |
| UDF/UDTF | No | Yes | No |
| Database Role | Yes | Yes | No |

### Objects That Cannot Be Cloned Directly

| Object Type | Notes |
|-------------|-------|
| Internal Named Stage | Must use INCLUDE INTERNAL STAGES clause |
| Pipe (internal stage) | Not cloned when referencing internal stage |
| Hybrid Table | Only at database level, not schema or table level |
| User | Account-level object; cannot be cloned |
| Role (account-level) | Account-level object; roles, grants, and privileges cannot be cloned |
| Warehouse | Account-level object; cannot be cloned |
| Share | Cannot be cloned |
| Masking Policy | Cloned with schema, not individually |
| Row Access Policy | Cloned with schema, not individually |
| Tag | Cloned with database/schema |

---

## Clone Syntax and Examples

### Basic Clone Syntax

```sql
-- Clone a database
CREATE DATABASE <target_database> CLONE <source_database>;

-- Clone a schema
CREATE SCHEMA <target_schema> CLONE <source_schema>;

-- Clone a table
CREATE TABLE <target_table> CLONE <source_table>;

-- Clone with COPY GRANTS
CREATE TABLE <target_table> CLONE <source_table> COPY GRANTS;
```

### Common Clone Operations

```sql
-- Clone a production database for development
CREATE DATABASE dev_db CLONE prod_db;

-- Clone a schema within the same database
CREATE SCHEMA test_schema CLONE production_schema;

-- Clone a specific table
CREATE TABLE orders_backup CLONE orders;

-- Clone with grants preserved
CREATE DATABASE staging_db CLONE prod_db COPY GRANTS;

-- Clone a dynamic table
CREATE DYNAMIC TABLE dt_clone CLONE source_dt;
```

### Clone with Time Travel

```sql
-- Clone as of a specific timestamp
CREATE TABLE orders_snapshot CLONE orders
  AT (TIMESTAMP => '2024-01-15 10:30:00'::TIMESTAMP_LTZ);

-- Clone from a specific offset (seconds ago)
CREATE DATABASE db_restore CLONE prod_db
  AT (OFFSET => -3600);

-- Clone before a specific statement
CREATE SCHEMA schema_restore CLONE prod_schema
  BEFORE (STATEMENT => '8e5d0ca9-005e-44e6-b858-a8f5b37c5726');
```

---

## Cloning with Time Travel

### Time Travel Clone Capabilities

You can clone objects at a historical point in time using Time Travel:

| Object Type | Time Travel Clone Support |
|-------------|--------------------------|
| Database | Yes |
| Schema | Yes |
| Table | Yes |
| Dynamic Table | Yes |
| Event Table | Yes |
| Stream | Yes |

### Time Travel Clone Syntax Options

```sql
-- Using TIMESTAMP
CREATE TABLE t_clone CLONE source_table
  AT (TIMESTAMP => 'timestamp_value'::TIMESTAMP_LTZ);

-- Using OFFSET (seconds before current time)
CREATE DATABASE db_clone CLONE source_db
  AT (OFFSET => -86400);  -- 24 hours ago

-- Using STATEMENT UUID
CREATE SCHEMA s_clone CLONE source_schema
  BEFORE (STATEMENT => 'query_uuid');
```

### Considerations for Time Travel Cloning

1. **Data Retention**: Clone fails if Time Travel data has been purged
2. **Child Objects**: Child objects that didn't exist at the specified time are not cloned
3. **Workaround for Insufficient Retention**:

```sql
-- Skip tables without sufficient Time Travel data
CREATE DATABASE db_clone CLONE source_db
  AT (TIMESTAMP => '2024-01-01 00:00:00'::TIMESTAMP_LTZ)
  IGNORE TABLES WITH INSUFFICIENT DATA RETENTION;
```

4. **Hybrid Tables**: Cannot use AT/BEFORE clauses when cloning databases with hybrid tables at schema level

---

## Storage Implications

### Initial Clone: Zero Additional Storage

When a clone is first created:
- No additional storage is consumed
- Clone references the same micro-partitions as source
- Only metadata is created

### Storage After Modifications

Storage costs accrue when:

| Action | Storage Impact |
|--------|----------------|
| INSERT on clone | New micro-partitions owned by clone |
| UPDATE on clone | New micro-partitions for changed data |
| DELETE on clone | Metadata change; Time Travel storage |
| INSERT on source | New micro-partitions owned by source |
| UPDATE on source | New micro-partitions for changed data |

### Clone Groups and Storage Ownership

```
Clone Group Concept:

T1 (original)  -->  T2 (clone of T1)  -->  T3 (clone of T2)
   |                    |                      |
   |                    |                      |
   v                    v                      v
[Owned MPs]        [Owned MPs]            [Owned MPs]
                        +
                  [Referenced MPs from T1]
                                              +
                                        [Referenced MPs from T1 & T2]
```

**Key Points:**
- Each table in a clone group has an independent lifecycle
- Storage ownership transfers when tables are dropped
- The oldest table in the group owns shared micro-partitions

### Calculating Clone Storage

Use TABLE_STORAGE_METRICS view:

```sql
SELECT
  table_name,
  active_bytes,
  time_travel_bytes,
  failsafe_bytes,
  retained_for_clone_bytes
FROM snowflake.account_usage.table_storage_metrics
WHERE table_catalog = 'MY_DATABASE'
  AND table_schema = 'MY_SCHEMA';
```

---

## Access Control and Privileges

### Privileges Required to Clone

| Source Object | Required Privilege |
|---------------|-------------------|
| Database | CREATE DATABASE on account + USAGE on source |
| Schema | CREATE SCHEMA on database + USAGE on source |
| Table | CREATE TABLE on schema + SELECT on source |
| Dynamic Table | CREATE DYNAMIC TABLE + SELECT |

### Privilege Inheritance

**Database/Schema Clones:**
- Child objects inherit privileges from source
- Container (database/schema) does NOT inherit privileges
- Pipe ownership goes to the role that creates the clone

**Table Clones:**
- Do NOT automatically inherit privileges
- Use COPY GRANTS to preserve privileges

```sql
-- Clone with privileges preserved
CREATE TABLE target_table CLONE source_table COPY GRANTS;
CREATE SCHEMA target_schema CLONE source_schema COPY GRANTS;
CREATE DATABASE target_db CLONE source_db COPY GRANTS;
```

### COPY GRANTS Behavior

| Scenario | COPY GRANTS Behavior |
|----------|---------------------|
| Table clone | Copies all privileges except OWNERSHIP |
| Schema clone | Copies privileges on child objects |
| Database clone | Copies privileges on child objects |
| OWNERSHIP | Never copied; assigned to cloning role |

---

## Cloning Considerations by Object Type

### Tables and Clustering

- Clustering key is preserved in clone
- Automatic Clustering is **suspended** by default
- Must resume manually:

```sql
ALTER TABLE cloned_table RESUME RECLUSTER;
```

### Sequences

| Scenario | Behavior |
|----------|----------|
| Clone table only | References source sequence |
| Clone schema/database containing both | References cloned sequence |

```sql
-- Break reference to source sequence
ALTER TABLE cloned_table ALTER COLUMN id SET DEFAULT NULL;
```

### Streams

- Unconsumed records in streams are **inaccessible** after clone
- Stream history begins at clone creation time
- Consistent with Time Travel behavior

### Tasks

- Cloned tasks are **suspended** by default
- Must resume explicitly:

```sql
ALTER TASK cloned_task RESUME;
```

### Pipes

| Pipe Type | Clone Behavior |
|-----------|---------------|
| External stage reference | Cloned (but set to STOPPED_CLONED or paused) |
| Internal stage reference | NOT cloned |

Auto-ingest pipes in cloned state:
- `AUTO_INGEST = FALSE`: Paused
- `AUTO_INGEST = TRUE`: STOPPED_CLONED state

### Stages

| Stage Type | Clone Behavior |
|------------|---------------|
| External named stage | Cloned individually or with container |
| Internal named stage | Only with INCLUDE INTERNAL STAGES clause (NOT cloned by default) |
| User stage | NOT cloned |
| Table stage | Cloned but empty (files not copied) |

```sql
-- Clone including internal stages
CREATE DATABASE db_clone CLONE source_db
  INCLUDE INTERNAL STAGES;
```

### Policies (Masking, Row Access, etc.)

- Policies are NOT cloned individually
- When schema/database is cloned, policies are cloned
- Cloned objects reference cloned policies (if in same container)
- Foreign policy references are maintained

### Tags

- Tag associations are maintained in cloned objects
- Tags in the same schema/database are cloned
- Cloned objects map to cloned tags

### Dynamic Tables

- Cloned dynamic tables are **suspended** (CLONED_AUTO_SUSPENDED)
- Downstream dynamic tables: UPSTREAM_CLONED_AUTO_SUSPENDED
- Can clone dynamic table to regular table

```sql
-- Clone dynamic table to regular table
CREATE TABLE static_snapshot CLONE my_dynamic_table;
```

---

## Clone vs Copy: Key Differences

### Comparison Table

| Aspect | Zero-Copy Clone | Physical Copy (CTAS) |
|--------|-----------------|---------------------|
| Speed | Instant (metadata only) | Depends on data size |
| Initial storage | Zero | Full data size |
| Independence | Full (after creation) | Full |
| Time Travel support | Yes | No (new table history) |
| Preserves structure | Yes | Yes |
| Preserves clustering | Yes (suspended) | No |
| Preserves constraints | Yes | Yes |
| Warehouse required | No | Yes |

### When to Use Clone vs Copy

**Use Zero-Copy Clone when:**
- Creating backups or snapshots
- Setting up dev/test environments
- Testing changes before production
- Historical point-in-time recovery

**Use Physical Copy (CTAS) when:**
- Need to reorganize data
- Want to apply transformations
- Creating aggregated tables
- Migrating to different storage structure

### Code Comparison

```sql
-- Zero-Copy Clone (instant, no compute)
CREATE TABLE orders_backup CLONE orders;

-- Physical Copy via CTAS (requires compute, full storage)
CREATE TABLE orders_backup AS SELECT * FROM orders;

-- Physical Copy via INSERT (requires compute, full storage)
CREATE TABLE orders_backup LIKE orders;
INSERT INTO orders_backup SELECT * FROM orders;
```

---

## Limitations and Restrictions

### General Limitations

| Limitation | Description |
|------------|-------------|
| Temporary tables | Cannot clone temporary tables outside the session |
| Transient to permanent | Cannot clone transient object to permanent |
| Cross-account | Cannot clone directly across accounts |
| Active DDL | Avoid DDL on source during long clone operations |

### Hybrid Table Limitations

1. Must clone at database level (not schema or table)
2. NOT a zero-copy operation (data is physically copied)
3. Cannot use AT/BEFORE clauses
4. Incurs compute and storage costs

```sql
-- Valid: Clone database with hybrid tables
CREATE DATABASE clone_db CLONE source_db;

-- Invalid: Clone hybrid table directly
CREATE HYBRID TABLE ht_clone CLONE ht_source;  -- ERROR

-- Skip hybrid tables when cloning schema
CREATE SCHEMA schema_clone CLONE source_schema IGNORE HYBRID TABLES;
```

### Objects Not Cloned

| Object | Reason |
|--------|--------|
| Pipes (internal stage) | Reference internal storage |
| Data files in stages | Only metadata copied |
| Unconsumed stream records | Historical data inaccessible |
| Search optimization paths | May need maintenance after clone |
| WORM backup objects | Protected objects cannot be cloned |

---

## Exam Tips and Common Questions

### High-Frequency Exam Topics

1. **Zero additional storage initially**: Clones don't consume storage until modified
2. **Metadata-only operation**: No physical data copy at creation
3. **Independence after creation**: Changes to clone don't affect source and vice versa
4. **Time Travel integration**: Can clone at historical point in time
5. **Privilege inheritance**: Child objects inherit, containers don't

### Common Exam Question Patterns

**Pattern 1: Storage Cost Questions**
> "When does a cloned table start consuming additional storage?"
>
> Answer: When data modifications (INSERT, UPDATE, DELETE) create new micro-partitions

**Pattern 2: Time Travel Clone Questions**
> "What happens when you clone a table using Time Travel?"
>
> Answer: Creates a clone as the table existed at that point; fails if data retention exceeded

**Pattern 3: Privilege Questions**
> "What privileges are copied when cloning a table?"
>
> Answer: By default, none. Use COPY GRANTS to copy privileges (except OWNERSHIP)

**Pattern 4: Object State Questions**
> "What is the default state of cloned tasks?"
>
> Answer: Suspended - must be resumed manually

**Pattern 5: What Can Be Cloned**
> "Which objects support direct cloning?"
>
> Answer: Database, schema, table, dynamic table, event table, stream, external stage, database role

### Key Facts to Remember

| Fact | Detail |
|------|--------|
| Clone speed | Nearly instantaneous regardless of size |
| Initial storage | Zero for standard tables |
| Hybrid tables | Full copy, not zero-copy |
| Tasks after clone | Suspended by default |
| Pipes after clone | Paused or STOPPED_CLONED |
| Auto-Clustering | Suspended in cloned tables |
| Streams after clone | Historical records inaccessible |
| Internal stages | Need INCLUDE INTERNAL STAGES clause |
| COPY GRANTS | Optional; copies privileges except OWNERSHIP |

### Exam Traps to Avoid

1. **Trap**: "Clones consume storage immediately"
   - **Reality**: Only after modifications

2. **Trap**: "Cloned tasks run automatically"
   - **Reality**: Tasks are suspended by default

3. **Trap**: "All objects can be cloned directly"
   - **Reality**: Some objects only clone with their container

4. **Trap**: "Clones inherit all privileges"
   - **Reality**: Container privileges are NOT inherited; use COPY GRANTS

5. **Trap**: "Hybrid table cloning is zero-copy"
   - **Reality**: Hybrid tables are physically copied (size-of-data operation)

---

## Practice Questions

### Question 1
A developer creates a clone of a 5 TB production table. Immediately after creation, how much additional storage does the clone consume?

A) 5 TB
B) 2.5 TB
C) 0 TB
D) Depends on compression ratio

<details>
<summary>Show Answer</summary>

**Answer: C**
Zero-copy cloning creates only metadata initially. No additional storage is consumed until data is modified.
</details>

---

### Question 2
Which command correctly clones a table as it existed 2 hours ago?

A) `CREATE TABLE t_clone CLONE source_t TIME_TRAVEL => -7200;`
B) `CREATE TABLE t_clone CLONE source_t AT (OFFSET => -7200);`
C) `CREATE TABLE t_clone CLONE source_t BEFORE (HOURS => 2);`
D) `CREATE TABLE t_clone AS SELECT * FROM source_t AT (OFFSET => -7200);`

<details>
<summary>Show Answer</summary>

**Answer: B**
The correct syntax uses AT (OFFSET => seconds). OFFSET is specified in seconds (7200 = 2 hours).
</details>

---

### Question 3
When a database containing tasks is cloned, what is the default state of the cloned tasks?

A) Running
B) Scheduled
C) Suspended
D) Deleted

<details>
<summary>Show Answer</summary>

**Answer: C**
Cloned tasks are suspended by default and must be explicitly resumed.
</details>

---

### Question 4
Which objects can be cloned directly using CREATE ... CLONE syntax? (Select all that apply)

A) Table
B) Schema
C) Masking Policy
D) External Stage
E) Internal Named Stage

<details>
<summary>Show Answer</summary>

**Answer: A, B, D**
Masking policies cannot be cloned individually (only with their schema). Internal named stages require the INCLUDE INTERNAL STAGES clause and cannot be cloned directly.
</details>

---

### Question 5
A table is cloned, and then 1000 rows are inserted into the clone. Which statement is TRUE?

A) The source table now has 1000 additional rows
B) The clone consumes storage only for the new micro-partitions
C) Both tables now share the new micro-partitions
D) The entire clone must be rewritten

<details>
<summary>Show Answer</summary>

**Answer: B**
Clones are independent. New micro-partitions created by the INSERT are owned exclusively by the clone, consuming additional storage.
</details>

---

### Question 6
When cloning a schema that contains a table with a sequence, what happens to the sequence reference?

A) The cloned table references the source sequence
B) The cloned table references the cloned sequence
C) The cloned table loses the sequence reference
D) An error is thrown

<details>
<summary>Show Answer</summary>

**Answer: B**
When the container (schema or database) containing both the table and sequence is cloned, the cloned table references the cloned sequence.
</details>

---

### Question 7
What is required to clone a database that contains hybrid tables at a specific point in time?

A) Use AT (TIMESTAMP => ...) clause
B) This is not supported for hybrid tables
C) Use OFFSET clause only
D) Enable Time Travel on hybrid tables first

<details>
<summary>Show Answer</summary>

**Answer: B**
Hybrid tables cannot be cloned using AT/BEFORE clauses. Time Travel cloning is not supported for hybrid tables.
</details>

---

### Question 8
Which privilege is NEVER copied when using COPY GRANTS during cloning?

A) SELECT
B) INSERT
C) OWNERSHIP
D) UPDATE

<details>
<summary>Show Answer</summary>

**Answer: C**
OWNERSHIP is never copied with COPY GRANTS. The role that creates the clone becomes the owner.
</details>

---

## Summary

Zero-copy cloning is a powerful Snowflake feature that enables instant creation of data copies without duplicating physical storage. Key points:

- **Zero initial storage**: Clones share micro-partitions with source
- **Independence**: Clone and source are fully independent after creation
- **Time Travel support**: Clone at historical points for recovery
- **Use cases**: Dev/test environments, backups, what-if analysis
- **Limitations**: Hybrid tables are not zero-copy; some objects only clone with containers
- **Privileges**: Use COPY GRANTS to preserve access; OWNERSHIP always transfers

Understanding cloning behavior for different object types (tasks suspended, pipes paused, streams lose history) is essential for the exam.
