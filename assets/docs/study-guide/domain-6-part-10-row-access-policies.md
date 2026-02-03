# Domain 6: Data Protection & Sharing

## Part 10: Row Access Policies

This section covers row access policies in Snowflake, which implement row-level security to control which rows users can see in query results. Understanding row access policies is essential for the SnowPro Core exam, as they represent a key component of Snowflake's data governance and security capabilities.

---

## 1. Introduction to Row Access Policies

### 1.1 What Is a Row Access Policy?

A **row access policy** is a schema-level object that determines whether a given row in a table or view can be viewed from SELECT statements and certain DML operations. Row access policies implement row-level security (RLS) in Snowflake.

**Key Characteristics:**

| Characteristic | Description |
|---------------|-------------|
| Schema-level object | Policies are created within a schema |
| Returns Boolean | Policy body must return TRUE (show row) or FALSE (hide row) |
| Evaluated at runtime | Snowflake evaluates the policy when queries execute |
| Transparent to users | Users do not see the policy logic; rows simply appear or do not appear |
| Can reference mapping tables | Policies can use lookup tables to determine access |

### 1.2 Row Access Policy vs. Masking Policy

| Feature | Row Access Policy | Masking Policy |
|---------|------------------|----------------|
| Purpose | Filter which rows are visible | Mask/transform column values |
| Return type | BOOLEAN | Same as column data type |
| Effect | Rows hidden completely | Column values transformed |
| Evaluation order | Evaluated FIRST | Evaluated after row access policies |

**Important:** When both policies exist on an object, row access policies are evaluated first, then masking policies are applied to the visible rows.

### 1.3 What Row Access Policies Cannot Do

Row access policies have specific limitations:

- **Do NOT prevent INSERT** - Users can still insert rows they cannot see
- **Do NOT prevent UPDATE/DELETE on visible rows** - Users can modify rows they can see
- **Cannot be attached to streams directly** - But policies on underlying tables are enforced when streams access them
- **Cannot use external tables as mapping tables** - May cause issues with cloning

---

## 2. Row Access Policy Syntax

### 2.1 CREATE ROW ACCESS POLICY

**Full Syntax:**
```sql
CREATE [ OR REPLACE ] ROW ACCESS POLICY [ IF NOT EXISTS ] <policy_name>
  AS ( <arg_name> <arg_data_type> [, <arg_name> <arg_data_type> ... ] )
  RETURNS BOOLEAN ->
  <body>
  [ COMMENT = '<string>' ];
```

**Components Explained:**

| Component | Description |
|-----------|-------------|
| `<policy_name>` | Name of the policy (schema-level object) |
| `AS (<signature>)` | Arguments representing columns from the protected table/view |
| `RETURNS BOOLEAN` | Required - policy must return TRUE or FALSE |
| `<body>` | Expression that determines row visibility |

**Simple Example:**
```sql
CREATE OR REPLACE ROW ACCESS POLICY rap_it_admin
  AS (empl_id VARCHAR)
  RETURNS BOOLEAN ->
    'it_admin' = CURRENT_ROLE();
```

This policy:
- Takes one argument (`empl_id`) matching a column in the protected table
- Returns TRUE (shows row) only if the current role is `it_admin`

### 2.2 Policy Signature

The **signature** specifies the column(s) from the table/view that are passed to the policy for evaluation:

```sql
AS (region VARCHAR, department VARCHAR)
```

**Key Points:**
- Argument names must match column names in the protected table
- Data types must match the column data types
- Multiple arguments can be specified
- Arguments are used in the policy body to make filtering decisions

### 2.3 Policy Body Examples

**Role-Based Access:**
```sql
CREATE OR REPLACE ROW ACCESS POLICY rap_role_based
  AS (region VARCHAR)
  RETURNS BOOLEAN ->
    CURRENT_ROLE() IN ('ADMIN', 'MANAGER')
    OR
    region = 'PUBLIC';
```

**User-Based Access:**
```sql
CREATE OR REPLACE ROW ACCESS POLICY rap_user_based
  AS (owner_email VARCHAR)
  RETURNS BOOLEAN ->
    owner_email = CURRENT_USER();
```

**Mapping Table Lookup:**
```sql
CREATE OR REPLACE ROW ACCESS POLICY security.sales_policy
  AS (sales_region VARCHAR)
  RETURNS BOOLEAN ->
  CASE
    WHEN 'sales_executive_role' = CURRENT_ROLE() THEN TRUE
    WHEN EXISTS (
      SELECT 1 FROM security.salesmanagerregions
      WHERE sales_manager = CURRENT_ROLE()
        AND region = sales_region
    ) THEN TRUE
    ELSE FALSE
  END;
```

---

## 3. Applying Row Access Policies

### 3.1 Two Methods to Apply Policies

**Method 1: At Object Creation**
```sql
-- Apply during table creation
CREATE TABLE sales (
  id INT,
  region VARCHAR,
  amount DECIMAL(10,2)
)
WITH ROW ACCESS POLICY sales_policy ON (region);

-- Apply during view creation
CREATE VIEW sales_v
  WITH ROW ACCESS POLICY sales_policy ON (region)
  AS SELECT * FROM sales;
```

**Method 2: Using ALTER Statement**
```sql
-- Add policy to existing table
ALTER TABLE sales ADD ROW ACCESS POLICY rap_sales ON (region);

-- Add policy to existing view
ALTER VIEW sales_v ADD ROW ACCESS POLICY rap_sales_view ON (region);
```

### 3.2 Removing Row Access Policies

```sql
-- Drop policy from table
ALTER TABLE sales DROP ROW ACCESS POLICY rap_sales;

-- Drop policy from view
ALTER VIEW sales_v DROP ROW ACCESS POLICY rap_sales_view;

-- Replace policy (drop and add in one statement)
ALTER TABLE sales DROP ROW ACCESS POLICY old_policy,
                  ADD ROW ACCESS POLICY new_policy ON (region);
```

### 3.3 Modifying Policy Definition

```sql
-- Update policy body without detaching from tables
ALTER ROW ACCESS POLICY rap_sales SET BODY ->
  CASE
    WHEN IS_ROLE_IN_SESSION('ADMIN') THEN TRUE
    ELSE region = 'PUBLIC'
  END;
```

**Important:** ALTER ROW ACCESS POLICY does not require dropping the policy from tables first. Tables remain protected during the update.

---

## 4. Mapping Tables

### 4.1 What Is a Mapping Table?

A **mapping table** (also called an entitlement table or authorization table) stores the relationship between roles/users and the data they can access. Row access policies query mapping tables to determine row visibility.

**Example Mapping Table:**
```sql
CREATE TABLE security.salesmanagerregions (
  sales_manager VARCHAR,
  region VARCHAR
);

INSERT INTO security.salesmanagerregions VALUES
  ('sales_manager_east', 'EAST'),
  ('sales_manager_west', 'WEST'),
  ('sales_manager_central', 'CENTRAL');
```

### 4.2 Policy with Mapping Table Lookup

```sql
CREATE OR REPLACE ROW ACCESS POLICY security.sales_policy
  AS (sales_region VARCHAR)
  RETURNS BOOLEAN ->
  CASE
    -- Executives see all regions
    WHEN 'sales_executive_role' = CURRENT_ROLE() THEN TRUE
    -- Managers see their assigned regions
    WHEN EXISTS (
      SELECT 1 FROM security.salesmanagerregions
      WHERE sales_manager = CURRENT_ROLE()
        AND region = sales_region
    ) THEN TRUE
    ELSE FALSE
  END;
```

### 4.3 Best Practices for Mapping Tables

| Practice | Reason |
|----------|--------|
| Store in same database as protected data | Important for cloning and replication |
| Create in a dedicated security schema | Centralized management |
| Grant SELECT to policy owner only | Prevent unauthorized access to entitlement data |
| Use memoizable functions | Improve query performance |
| Protect mapping tables with their own row access policy | Defense in depth |

### 4.4 Protecting the Mapping Table

You can protect the mapping table itself with a row access policy:

```sql
-- Create policy for mapping table
CREATE OR REPLACE ROW ACCESS POLICY governance.policies.rap_map_exempt
  AS (allowed_roles VARCHAR)
  RETURNS BOOLEAN ->
  IS_ROLE_IN_SESSION(allowed_roles);

-- Apply to mapping table
ALTER TABLE security.role_mapping
  ADD ROW ACCESS POLICY governance.policies.rap_map_exempt
  ON (allowed_roles);
```

---

## 5. Context Functions in Row Access Policies

### 5.1 Commonly Used Context Functions

| Function | Description | Use Case |
|----------|-------------|----------|
| `CURRENT_ROLE()` | Returns current active role | Role-based access |
| `CURRENT_USER()` | Returns current user name | User-based access |
| `IS_ROLE_IN_SESSION(role)` | TRUE if role is in active hierarchy | Role hierarchy checking |
| `IS_DATABASE_ROLE_IN_SESSION(role)` | TRUE if database role is active | Database role checking |
| `INVOKER_ROLE()` | Returns role that invoked the view | View-based access |
| `CURRENT_ACCOUNT()` | Returns current account | Cross-account sharing |

### 5.2 CURRENT_ROLE vs IS_ROLE_IN_SESSION

**CURRENT_ROLE():**
- Returns only the exact active role
- Does NOT consider role hierarchy
- Simpler but less flexible

```sql
-- Only exact match
WHEN CURRENT_ROLE() = 'ANALYST' THEN TRUE
```

**IS_ROLE_IN_SESSION(role_name):**
- Returns TRUE if the role is in the current session's role hierarchy
- Considers role inheritance
- Recommended for most use cases

```sql
-- Considers role hierarchy
WHEN IS_ROLE_IN_SESSION('ANALYST') THEN TRUE
```

### 5.3 IS_DATABASE_ROLE_IN_SESSION

For database roles (especially useful with data sharing):

```sql
CREATE OR REPLACE ROW ACCESS POLICY rap_shared_data
  AS (authz_role VARCHAR)
  RETURNS BOOLEAN ->
  IS_DATABASE_ROLE_IN_SESSION(authz_role);
```

**Key Point:** Use IS_DATABASE_ROLE_IN_SESSION when:
- Sharing policy-protected data
- Using database-specific roles
- Consumer accounts need role-based access to shared data

### 5.4 Example: Comprehensive Policy with Multiple Context Functions

```sql
CREATE OR REPLACE ROW ACCESS POLICY comprehensive_rap
  AS (region VARCHAR, sensitivity_level VARCHAR)
  RETURNS BOOLEAN ->
  CASE
    -- Admins see everything
    WHEN IS_ROLE_IN_SESSION('ADMIN') THEN TRUE
    -- Specific user override
    WHEN CURRENT_USER() = 'SERVICE_ACCOUNT' THEN TRUE
    -- Regional managers see their region
    WHEN IS_ROLE_IN_SESSION('REGIONAL_MANAGER')
      AND EXISTS (
        SELECT 1 FROM security.region_assignments
        WHERE manager_role = CURRENT_ROLE() AND region = region
      ) THEN TRUE
    -- Low sensitivity data visible to all authenticated users
    WHEN sensitivity_level = 'LOW' THEN TRUE
    ELSE FALSE
  END;
```

---

## 6. Privileges and Administration

### 6.1 Row Access Policy Privileges

| Privilege | Description | Typical Role |
|-----------|-------------|--------------|
| CREATE ROW ACCESS POLICY | Create new policies in schema | Schema owner, RAP admin |
| OWNERSHIP | Full control over the policy | Policy creator |
| APPLY | Add/remove policy from tables | RAP admin, table owner |
| APPLY ROW ACCESS POLICY (on ACCOUNT) | Apply any policy to any table | Security admin |

### 6.2 Privilege Examples

**Centralized Management Approach:**
```sql
-- Grant policy creation
GRANT CREATE ROW ACCESS POLICY ON SCHEMA security.policies
  TO ROLE rap_admin;

-- Grant global apply privilege
GRANT APPLY ROW ACCESS POLICY ON ACCOUNT TO ROLE rap_admin;
```

**Hybrid Management Approach:**
```sql
-- Central role creates policies
GRANT CREATE ROW ACCESS POLICY ON SCHEMA security.policies
  TO ROLE rap_admin;

-- Team-specific apply privilege
GRANT APPLY ON ROW ACCESS POLICY security.rap_finance
  TO ROLE finance_role;
```

### 6.3 Required Privileges by Operation

| Operation | Required Privilege |
|-----------|-------------------|
| Create policy | CREATE ROW ACCESS POLICY on schema |
| Alter policy | OWNERSHIP on the policy |
| Add policy to table | APPLY ROW ACCESS POLICY on account OR (OWNERSHIP on table + APPLY on policy) |
| Drop policy from table | Same as add |
| Drop policy | OWNERSHIP on policy OR OWNERSHIP on schema |
| Show policies | APPLY ROW ACCESS POLICY OR OWNERSHIP on policy |

### 6.4 Ownership Transfer

```sql
-- Transfer policy ownership
GRANT OWNERSHIP ON ROW ACCESS POLICY security.sales_policy
  TO ROLE mapping_role;
```

---

## 7. Monitoring Row Access Policies

### 7.1 Discovering Policies

**List All Policies:**
```sql
SHOW ROW ACCESS POLICIES;

-- In specific database/schema
SHOW ROW ACCESS POLICIES IN SCHEMA security.policies;
```

**View Policy Details:**
```sql
DESCRIBE ROW ACCESS POLICY security.sales_policy;

-- Get DDL
SELECT GET_DDL('ROW_ACCESS_POLICY', 'security.sales_policy');
```

### 7.2 Account Usage Views

**ROW_ACCESS_POLICIES View:**
```sql
SELECT *
FROM SNOWFLAKE.ACCOUNT_USAGE.ROW_ACCESS_POLICIES
WHERE DELETED IS NULL;
```

**POLICY_REFERENCES View (find protected objects):**
```sql
SELECT *
FROM SNOWFLAKE.ACCOUNT_USAGE.POLICY_REFERENCES
WHERE POLICY_KIND = 'ROW_ACCESS_POLICY';
```

### 7.3 Information Schema POLICY_REFERENCES

**Find Objects Protected by a Policy:**
```sql
SELECT *
FROM mydb.INFORMATION_SCHEMA.POLICY_REFERENCES(
  POLICY_NAME => 'mydb.policies.rap1'
);
```

**Find Policies on a Table:**
```sql
SELECT *
FROM mydb.INFORMATION_SCHEMA.POLICY_REFERENCES(
  REF_ENTITY_NAME => 'mydb.schema.table1',
  REF_ENTITY_DOMAIN => 'TABLE'
);
```

---

## 8. Row Access Policies with Other Features

### 8.1 Row Access Policies and Masking Policies

**Evaluation Order:**
1. Row access policy evaluated first (rows filtered)
2. Masking policy evaluated on visible rows only

**Column Restriction:**
- A column can be in a row access policy signature OR a masking policy signature
- The same column cannot be in BOTH policy signatures simultaneously

### 8.2 Row Access Policies and Views

**Nested Policies:**
- Policy on base table is evaluated first
- Policy on view is evaluated second
- Both must return TRUE for rows to be visible

```sql
-- Table has policy
ALTER TABLE t1 ADD ROW ACCESS POLICY rap_t1 ON (region);

-- View on table also has policy
CREATE VIEW v1 WITH ROW ACCESS POLICY rap_v1 ON (region)
  AS SELECT * FROM t1;

-- Query on v1 evaluates: rap_t1 first, then rap_v1
```

### 8.3 Row Access Policies and Materialized Views

**Limitations:**
- Cannot create materialized view from table with row access policy
- Cannot add row access policy to table if materialized view exists on it
- Can add row access policy to materialized view (if base table has no policy)

**Alternative:** Use dynamic tables instead:
```sql
-- Dynamic table can have row access policy
CREATE DYNAMIC TABLE dt_sales
  WITH ROW ACCESS POLICY rap_sales ON (region)
  ...
```

### 8.4 Row Access Policies and Streams

- Cannot attach policy directly to stream object
- Policy on underlying table IS enforced when stream accesses the table
- Stream returns only rows the querying role can see

### 8.5 Row Access Policies and Cloning

**Cloning Behavior:**
- Row access policies ARE copied when cloning databases/schemas
- Policy assignments to tables ARE preserved in clone
- Mapping tables in same database ARE cloned

**Warning:** If mapping table is external (different database), the cloned policy may reference non-existent data.

### 8.6 Row Access Policies and Data Sharing

- Policies on shared tables are evaluated in consumer account
- Use IS_DATABASE_ROLE_IN_SESSION for shared data access control
- Mapping tables should be in same database as shared tables

---

## 9. Performance Considerations

### 9.1 Performance Impact

| Factor | Impact |
|--------|--------|
| Simple role checks | Minimal overhead |
| Mapping table lookups | May slow queries significantly |
| COUNT(*) queries | Require full table scan (Snowflake cannot use metadata) |
| Complex CASE expressions | Evaluated for every row |

### 9.2 Optimization Techniques

**Use Memoizable Functions:**
```sql
-- Create memoizable function
CREATE OR REPLACE FUNCTION get_allowed_regions()
  RETURNS TABLE(region VARCHAR)
  MEMOIZABLE
AS
$$
  SELECT region FROM security.region_mapping
  WHERE role_name = CURRENT_ROLE()
$$;

-- Use in policy
CREATE OR REPLACE ROW ACCESS POLICY rap_optimized
  AS (region VARCHAR)
  RETURNS BOOLEAN ->
  region IN (SELECT region FROM TABLE(get_allowed_regions()));
```

**Benefits of Memoizable Functions:**
- Results cached during query execution
- Reduces repeated mapping table lookups
- Significant performance improvement for large datasets

### 9.3 Search Optimization Service

The search optimization service CAN improve query performance on tables with row access policies. Enable it for frequently queried protected tables.

---

## 10. Troubleshooting Row Access Policies

### 10.1 Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| No rows returned | Policy returns FALSE | Check CURRENT_ROLE(), mapping tables |
| Cannot create policy | Missing CREATE privilege | Grant CREATE ROW ACCESS POLICY on schema |
| Cannot apply policy | Missing APPLY privilege | Grant APPLY ROW ACCESS POLICY or APPLY on policy |
| Slow queries | Complex policy with subqueries | Use memoizable functions |
| Error: "Row access policy must return BOOLEAN" | Wrong return type | Ensure RETURNS BOOLEAN in policy |

### 10.2 Testing Policies

**Use POLICY_CONTEXT Function:**
```sql
SELECT POLICY_CONTEXT(
  'ROW_ACCESS_POLICY',
  'mydb.schema.my_policy',
  'ANALYST'  -- role to simulate
);
```

**Assume Role for Testing:**
```sql
USE ROLE analyst;
SELECT * FROM protected_table;  -- See what analyst sees
```

### 10.3 Auditing

Query execution logs in ACCESS_HISTORY show:
- Who queried protected tables
- What policies were in effect
- Row counts before/after filtering (if enabled)

---

## 11. Exam Tips and Common Question Patterns

### 11.1 Frequently Tested Concepts

1. **Policy Return Type:** Row access policies MUST return BOOLEAN (TRUE/FALSE)
2. **Evaluation Order:** Row access policies are evaluated BEFORE masking policies
3. **CURRENT_ROLE vs IS_ROLE_IN_SESSION:** IS_ROLE_IN_SESSION considers role hierarchy
4. **Privileges:** CREATE ROW ACCESS POLICY on schema vs APPLY ROW ACCESS POLICY on account
5. **Mapping Tables:** Best stored in same database as protected data
6. **Cannot Prevent:** Policies do not prevent INSERT or UPDATE/DELETE on visible rows

### 11.2 Common Exam Traps

| Trap | Correct Understanding |
|------|----------------------|
| Row access policy prevents all DML | NO - only affects SELECT and which rows are visible |
| CURRENT_ROLE() considers hierarchy | NO - use IS_ROLE_IN_SESSION() for hierarchy |
| Policy returns the row data | NO - returns BOOLEAN; TRUE shows row, FALSE hides it |
| Same column can have both policies | NO - column can be in RAP OR masking policy, not both |
| Policies are evaluated in parallel | NO - RAP first, then masking policy |
| Can attach policy to stream | NO - attach to underlying table instead |

### 11.3 Practice Questions

**Question 1:** What does a row access policy return?

- A) The row data if access is allowed
- B) A filtered subset of columns
- C) BOOLEAN (TRUE or FALSE)
- D) The user's role name

**Answer:** C - Row access policies must return BOOLEAN. TRUE means show the row; FALSE means hide it.

---

**Question 2:** When both a row access policy and masking policy are on a table, which is evaluated first?

- A) Masking policy
- B) Row access policy
- C) They are evaluated simultaneously
- D) The order depends on policy creation time

**Answer:** B - Row access policies are always evaluated first. Masking policies are then applied only to the rows that pass the row access policy.

---

**Question 3:** Which context function should you use to check if a role is in the current session's role hierarchy?

- A) CURRENT_ROLE()
- B) IS_ROLE_IN_SESSION()
- C) HAS_ROLE()
- D) CHECK_ROLE_HIERARCHY()

**Answer:** B - IS_ROLE_IN_SESSION() returns TRUE if the specified role is in the current session's active role hierarchy. CURRENT_ROLE() only returns the exact active role without considering hierarchy.

---

**Question 4:** A row access policy is set on table T1. What happens when a user with insufficient privileges tries to INSERT a row?

- A) The INSERT fails with a permission error
- B) The INSERT succeeds but the user cannot see the inserted row
- C) The INSERT is blocked by the row access policy
- D) The row is inserted but immediately deleted

**Answer:** B - Row access policies do NOT prevent INSERT operations. The user can insert rows but may not be able to see them in subsequent queries if the policy returns FALSE.

---

**Question 5:** Where should mapping tables used in row access policies be stored?

- A) In any database accessible to the policy
- B) In an external stage
- C) In the same database as the protected data
- D) In the SNOWFLAKE shared database

**Answer:** C - Mapping tables should be stored in the same database as the protected data. This is especially important for cloning and replication operations.

---

**Question 6:** Which privilege allows a role to add any row access policy to any table in the account?

- A) APPLY ON ROW ACCESS POLICY <policy_name>
- B) CREATE ROW ACCESS POLICY ON ACCOUNT
- C) APPLY ROW ACCESS POLICY ON ACCOUNT
- D) OWNERSHIP ON ALL ROW ACCESS POLICIES

**Answer:** C - APPLY ROW ACCESS POLICY ON ACCOUNT grants the ability to apply any row access policy to any table/view in the account.

---

**Question 7:** A table has a row access policy. Can a materialized view be created on this table?

- A) Yes, with no restrictions
- B) Yes, but only if the policy returns TRUE for all rows
- C) No, materialized views cannot be created on tables with row access policies
- D) Yes, but the materialized view must have the same policy

**Answer:** C - Materialized views cannot be created from tables that have row access policies. This is a key limitation. Use dynamic tables as an alternative.

---

## 12. Quick Reference

### Row Access Policy DDL Commands

```sql
-- Create policy
CREATE ROW ACCESS POLICY <name> AS (<signature>) RETURNS BOOLEAN -> <body>;

-- Alter policy body
ALTER ROW ACCESS POLICY <name> SET BODY -> <new_body>;

-- Drop policy
DROP ROW ACCESS POLICY <name>;

-- Show policies
SHOW ROW ACCESS POLICIES [IN SCHEMA <schema>];

-- Describe policy
DESCRIBE ROW ACCESS POLICY <name>;

-- Get DDL
SELECT GET_DDL('ROW_ACCESS_POLICY', '<fully_qualified_name>');
```

### Applying/Removing Policies

```sql
-- Add to table (at creation)
CREATE TABLE t1 (...) WITH ROW ACCESS POLICY <policy> ON (<columns>);

-- Add to existing table
ALTER TABLE t1 ADD ROW ACCESS POLICY <policy> ON (<columns>);

-- Remove from table
ALTER TABLE t1 DROP ROW ACCESS POLICY <policy>;

-- Replace policy
ALTER TABLE t1 DROP ROW ACCESS POLICY old_policy,
               ADD ROW ACCESS POLICY new_policy ON (<columns>);
```

### Key Context Functions

| Function | Returns | Considers Hierarchy |
|----------|---------|-------------------|
| CURRENT_ROLE() | Active role name | No |
| CURRENT_USER() | Current user name | N/A |
| IS_ROLE_IN_SESSION(role) | BOOLEAN | Yes |
| IS_DATABASE_ROLE_IN_SESSION(role) | BOOLEAN | Yes |
| INVOKER_ROLE() | View owner's role | No |

### Monitoring Queries

```sql
-- List policies
SHOW ROW ACCESS POLICIES;

-- Find policy assignments
SELECT * FROM SNOWFLAKE.ACCOUNT_USAGE.POLICY_REFERENCES
WHERE POLICY_KIND = 'ROW_ACCESS_POLICY';

-- Find policies on specific table
SELECT * FROM <db>.INFORMATION_SCHEMA.POLICY_REFERENCES(
  REF_ENTITY_NAME => '<table_name>',
  REF_ENTITY_DOMAIN => 'TABLE'
);
```

---

**Key Takeaway:** Row access policies provide row-level security by filtering query results based on policy conditions. They return BOOLEAN values, are evaluated before masking policies, and commonly use context functions like IS_ROLE_IN_SESSION() with mapping tables to determine access. Understanding the policy syntax, privileges (CREATE vs APPLY), context functions, and interactions with other features like materialized views is essential for the SnowPro Core exam.
