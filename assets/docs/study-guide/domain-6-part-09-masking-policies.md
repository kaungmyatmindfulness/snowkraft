# Domain 6: Data Protection & Sharing - Dynamic Data Masking

## Overview

Dynamic Data Masking (DDM) is a Column-level Security feature in Snowflake that uses masking policies to selectively mask plain-text data in table and view columns at query time. Unlike static masking, the actual data remains unchanged in the database - masking is applied dynamically when queries are executed based on the user's role and the policy conditions. This is an **Enterprise Edition feature** and is fundamental to Snowflake's data governance capabilities.

---

## Lesson 1: Understanding Dynamic Data Masking

### Learning Objectives
- Understand what Dynamic Data Masking is and how it works
- Learn the key benefits and use cases
- Recognize the differences between DDM and other masking approaches
- Understand query runtime behavior with masking policies

### Key Concepts

**What is Dynamic Data Masking?**

Dynamic Data Masking is a Column-level Security feature that:
- Uses masking policies to selectively mask data at query time
- Does NOT modify the underlying data in tables
- Applies masking based on SQL execution context and role hierarchy
- Works on both tables and views
- Is a schema-level object (requires database and schema to exist)

**How Masking Works at Query Runtime**

At query runtime, Snowflake rewrites the query to apply the masking policy expression:
- The policy applies wherever the column is referenced (projections, JOINs, WHERE, ORDER BY, GROUP BY)
- Different users can see different results from the same query
- Nested policies are evaluated in sequence (table policy first, then view policy)

```sql
-- Original user query
SELECT email, city FROM customers WHERE city = 'San Mateo';

-- Snowflake rewrites to:
SELECT <masking_policy_expression>(email), city
FROM customers
WHERE city = 'San Mateo';
```

**Key Benefits of Dynamic Data Masking**

| Benefit | Description |
|---------|-------------|
| **Ease of Use** | Write a policy once, apply to thousands of columns |
| **Separation of Duties** | Security officers control policies, not object owners |
| **Data Authorization** | Contextual access based on role or custom entitlements |
| **Governance Support** | Can prohibit even ACCOUNTADMIN from viewing data |
| **Data Sharing** | Easily mask data before sharing with consumers |
| **Change Management** | Update policy conditions without reapplying to columns |

**Important Limitations**

- Masking policies CANNOT be applied to:
  - Virtual columns
  - Materialized view columns (apply to source table instead)
- Input and output data types must match (cannot return different types)
- Cannot use masked columns as conditional columns in another policy
- A column cannot have both a masking policy and be referenced in a row access policy signature

### Important Terms/Definitions

- **Masking Policy**: A schema-level object containing conditions that determine how data is masked
- **Column-level Security**: Security applied at the column level rather than table or row level
- **Policy Body**: The SQL expression that defines masking logic (uses CASE/WHEN)
- **Execution Context**: The session context (role, account, etc.) that determines masking behavior
- **External Tokenization**: Related feature using external functions for tokenization/detokenization

### Exam Tips

- DDM is an **Enterprise Edition** feature
- Masking policies are **schema-level** objects
- The underlying data is **NOT modified** - masking happens at query time only
- Input and output data types in the policy signature **must match**
- A column can only have ONE masking policy directly applied at a time
- Object owners do NOT automatically have permission to unset masking policies

### Practice Questions

1. **Question**: What happens to the underlying data when a Dynamic Data Masking policy is applied to a column?
   - A) The data is encrypted in storage
   - B) The data is permanently replaced with masked values
   - C) The data remains unchanged; masking occurs at query time
   - D) The data is moved to a secure vault

   <details>
   <summary>Show Answer</summary>

   **Answer**: C - Dynamic Data Masking does not modify the underlying data. Masking is applied dynamically when queries are executed, based on policy conditions.

   </details>

2. **Question**: Which Snowflake edition is required for Dynamic Data Masking?
   - A) Standard Edition
   - B) Enterprise Edition or higher
   - C) Business Critical Edition only
   - D) All editions with Data Governance add-on

   <details>
   <summary>Show Answer</summary>

   **Answer**: B - Dynamic Data Masking is an Enterprise Edition feature, also available in Business Critical and VPS editions.

   </details>

3. **Question**: At which level are masking policies defined in Snowflake?
   - A) Account level
   - B) Database level
   - C) Schema level
   - D) Table level

   <details>
   <summary>Show Answer</summary>

   **Answer**: C - Masking policies are schema-level objects. A database and schema must exist before a masking policy can be created.

   </details>

---

## Lesson 2: Creating Masking Policies

### Learning Objectives
- Master the CREATE MASKING POLICY syntax
- Understand policy signature and return types
- Learn common masking patterns and expressions
- Apply best practices for policy design

### Key Concepts

**Masking Policy Syntax**

```sql
CREATE [ OR REPLACE ] MASKING POLICY [ IF NOT EXISTS ] <name>
  AS ( <arg_name> <arg_type> [, <arg_name> <arg_type> ... ] )
  RETURNS <arg_type>
  -> <body>
  [ COMMENT = '<string_literal>' ]
  [ EXEMPT_OTHER_POLICIES = { TRUE | FALSE } ]
```

**Basic Masking Policy Structure**

```sql
CREATE OR REPLACE MASKING POLICY email_mask AS (val STRING)
RETURNS STRING ->
  CASE
    WHEN CURRENT_ROLE() IN ('ANALYST') THEN val
    ELSE '*********'
  END;
```

**Components Explained:**

| Component | Description |
|-----------|-------------|
| `AS (val STRING)` | Input parameter with data type (must match column type) |
| `RETURNS STRING` | Return type (must match input type) |
| `->` | Separates signature from policy body |
| `CASE ... END` | Conditional logic determining masking |

**Common Masking Patterns**

**1. Full Mask - Return Fixed Value**
```sql
CREATE OR REPLACE MASKING POLICY full_mask AS (val STRING)
RETURNS STRING ->
  CASE
    WHEN CURRENT_ROLE() IN ('ANALYST', 'ADMIN') THEN val
    ELSE '**MASKED**'
  END;
```

**2. Return NULL for Unauthorized Users**
```sql
CREATE OR REPLACE MASKING POLICY null_mask AS (val STRING)
RETURNS STRING ->
  CASE
    WHEN CURRENT_ROLE() IN ('ANALYST') THEN val
    ELSE NULL
  END;
```

**3. Partial Masking (Email Example)**
```sql
CREATE OR REPLACE MASKING POLICY email_partial_mask AS (val STRING)
RETURNS STRING ->
  CASE
    WHEN CURRENT_ROLE() IN ('ANALYST') THEN val
    WHEN CURRENT_ROLE() IN ('SUPPORT') THEN REGEXP_REPLACE(val, '.+\@', '*****@')
    ELSE '********'
  END;
```
*Result: user@domain.com -> *****@domain.com*

**4. Hash-based Masking**
```sql
CREATE OR REPLACE MASKING POLICY hash_mask AS (val STRING)
RETURNS STRING ->
  CASE
    WHEN CURRENT_ROLE() IN ('ANALYST') THEN val
    ELSE SHA2(val)  -- returns hash of the value
  END;
```

**5. Account-based Masking (Production vs Non-Production)**
```sql
CREATE OR REPLACE MASKING POLICY prod_mask AS (val STRING)
RETURNS STRING ->
  CASE
    WHEN CURRENT_ACCOUNT() IN ('<prod_account_identifier>') THEN val
    ELSE '*********'
  END;
```

**6. Timestamp/Date Masking**
```sql
CREATE OR REPLACE MASKING POLICY date_mask AS (val TIMESTAMP_NTZ)
RETURNS TIMESTAMP_NTZ ->
  CASE
    WHEN CURRENT_ROLE() IN ('ANALYST') THEN val
    ELSE DATE_FROM_PARTS(0001, 01, 01)::TIMESTAMP_NTZ
  END;
```

**7. Numeric Masking**
```sql
CREATE OR REPLACE MASKING POLICY salary_mask AS (val NUMBER)
RETURNS NUMBER ->
  CASE
    WHEN CURRENT_ROLE() IN ('HR', 'FINANCE') THEN val
    ELSE 0
  END;
```

**Using Custom Entitlement Tables**

```sql
CREATE OR REPLACE MASKING POLICY entitlement_mask AS (val STRING)
RETURNS STRING ->
  CASE
    WHEN EXISTS (
      SELECT 1 FROM governance.entitlements
      WHERE mask_method = 'unmask' AND role = CURRENT_ROLE()
    ) THEN val
    ELSE '********'
  END;
```

**Important**: Always use `EXISTS` when including subqueries in masking policy bodies.

### Exam Tips

- Policy input and return types **must be identical**
- Use `CURRENT_ROLE()` for session-based role checking
- Use `EXISTS` (not direct subquery) for entitlement table lookups
- Hash functions (SHA2) may cause collisions - consider External Tokenization for 1:1 mapping
- You can use UDFs in masking policy bodies (requires USAGE privilege on the UDF)

### Practice Questions

1. **Question**: What is the correct syntax for the masking policy arrow separator?
   - A) `=>`
   - B) `->`
   - C) `::`
   - D) `-->`

   <details>
   <summary>Show Answer</summary>

   **Answer**: B - The arrow `->` separates the policy signature from its body in masking policy definitions.

   </details>

2. **Question**: A masking policy has `AS (val STRING) RETURNS STRING`. Which columns can this policy be applied to?
   - A) Any column regardless of data type
   - B) Only STRING/VARCHAR columns
   - C) STRING and NUMBER columns
   - D) STRING and VARIANT columns

   <details>
   <summary>Show Answer</summary>

   **Answer**: B - The masking policy input type must match the column data type. A STRING policy can only be applied to STRING/VARCHAR columns.

   </details>

3. **Question**: Which approach is recommended when using a subquery in a masking policy body?
   - A) Direct subquery in CASE WHEN
   - B) Using EXISTS clause
   - C) Using IN clause with subquery
   - D) Creating a temporary table first

   <details>
   <summary>Show Answer</summary>

   **Answer**: B - Always use EXISTS when including a subquery in the masking policy body. This is the supported and recommended approach.

   </details>

---

## Lesson 3: Applying and Managing Masking Policies

### Learning Objectives
- Learn how to apply masking policies to columns
- Understand the privilege requirements for policy management
- Master ALTER commands for policy updates
- Learn how to monitor and audit masking policies

### Key Concepts

**Required Privileges**

| Privilege | Purpose |
|-----------|---------|
| `CREATE MASKING POLICY` | Create new masking policies (schema-level privilege) |
| `APPLY MASKING POLICY` | Set/unset policies on columns (account-level privilege) |
| `APPLY ON MASKING POLICY` | Decentralized: allow specific role to set/unset specific policy |
| `OWNERSHIP` | Full control over the masking policy |
| `USAGE` | Required on parent database and schema |

**Granting Privileges**

```sql
-- Grant ability to create masking policies
GRANT CREATE MASKING POLICY ON SCHEMA mydb.myschema TO ROLE masking_admin;

-- Grant ability to apply any masking policy on account
GRANT APPLY MASKING POLICY ON ACCOUNT TO ROLE masking_admin;

-- Decentralized: Allow table_owner to set/unset specific policy
GRANT APPLY ON MASKING POLICY ssn_mask TO ROLE table_owner;
```

**Applying Masking Policy to Columns**

**Method 1: Using ALTER TABLE**
```sql
-- Apply to existing table column
ALTER TABLE IF EXISTS user_info
  MODIFY COLUMN email SET MASKING POLICY email_mask;

-- Apply to view column
ALTER VIEW user_info_v
  MODIFY COLUMN email SET MASKING POLICY email_mask;
```

**Method 2: At Table/View Creation**
```sql
-- Apply during table creation
CREATE TABLE employees (
    id NUMBER,
    email STRING WITH MASKING POLICY email_mask,
    ssn STRING WITH MASKING POLICY ssn_mask,
    salary NUMBER WITH MASKING POLICY salary_mask
);

-- Apply during view creation
CREATE VIEW employee_view AS
  SELECT id, email, department
  FROM employees
  WITH MASKING POLICY email_mask ON COLUMN email;
```

**Removing Masking Policy**

```sql
ALTER TABLE user_info MODIFY COLUMN email UNSET MASKING POLICY;
ALTER VIEW user_info_v MODIFY COLUMN email UNSET MASKING POLICY;
```

**Replacing Masking Policy (FORCE keyword)**

```sql
-- Replace existing policy directly
ALTER TABLE user_info MODIFY COLUMN email
  SET MASKING POLICY new_email_mask FORCE;
```

**Updating Policy Definition**

```sql
-- Update policy without unsetting from columns
ALTER MASKING POLICY email_mask SET BODY ->
  CASE
    WHEN CURRENT_ROLE() IN ('ANALYST', 'SUPPORT') THEN val
    ELSE REGEXP_REPLACE(val, '.+\@', '*****@')
  END;
```

**Key DDL Commands**

| Command | Purpose |
|---------|---------|
| `CREATE MASKING POLICY` | Create new policy |
| `ALTER MASKING POLICY` | Modify policy definition |
| `DROP MASKING POLICY` | Delete policy (must be unset first) |
| `SHOW MASKING POLICIES` | List all masking policies |
| `DESCRIBE MASKING POLICY` | View policy details |

**Auditing Masking Policies**

```sql
-- List all masking policies in account
SELECT * FROM SNOWFLAKE.ACCOUNT_USAGE.MASKING_POLICIES;

-- Find all objects with masking policies applied
SELECT * FROM SNOWFLAKE.ACCOUNT_USAGE.POLICY_REFERENCES
WHERE POLICY_KIND = 'MASKING_POLICY';

-- Using Information Schema function
SELECT * FROM TABLE(
  INFORMATION_SCHEMA.POLICY_REFERENCES(
    POLICY_NAME => 'email_mask'
  )
);
```

### Exam Tips

- Cannot DROP a masking policy while it is applied to any column - must UNSET first
- `ALTER MASKING POLICY ... SET BODY` updates without unsetting from columns
- Use `FORCE` keyword to replace existing policy in one statement
- ACCOUNTADMIN has APPLY MASKING POLICY by default
- Object owners do NOT automatically have unset privileges
- Use `GET_DDL` function or `DESCRIBE MASKING POLICY` to view current policy definition

### Practice Questions

1. **Question**: What happens if you try to DROP a masking policy that is currently applied to columns?
   - A) The policy is dropped and columns become unmasked
   - B) The operation fails with an error
   - C) The policy is dropped and columns show NULL
   - D) Snowflake prompts for confirmation

   <details>
   <summary>Show Answer</summary>

   **Answer**: B - You cannot drop a masking policy while it is associated with one or more columns. You must first UNSET the policy from all columns, then DROP it.

   </details>

2. **Question**: Which privilege allows a role to set and unset any masking policy on any column in the account?
   - A) OWNERSHIP on the masking policy
   - B) APPLY ON MASKING POLICY
   - C) APPLY MASKING POLICY ON ACCOUNT
   - D) CREATE MASKING POLICY

   <details>
   <summary>Show Answer</summary>

   **Answer**: C - The global APPLY MASKING POLICY ON ACCOUNT privilege allows setting and unsetting any masking policy on any column.

   </details>

3. **Question**: How can you update a masking policy definition without first removing it from columns?
   - A) DROP and recreate the policy
   - B) Use ALTER MASKING POLICY ... SET BODY
   - C) Use CREATE OR REPLACE MASKING POLICY
   - D) This is not possible

   <details>
   <summary>Show Answer</summary>

   **Answer**: B - `ALTER MASKING POLICY ... SET BODY` allows updating the policy definition while it remains applied to columns, ensuring continuous protection.

   </details>

---

## Lesson 4: Conditional Masking Policies

### Learning Objectives
- Understand conditional masking with multiple column arguments
- Learn how to create and apply conditional masking policies
- Recognize use cases and limitations
- Master conditional policy patterns

### Key Concepts

**What is Conditional Masking?**

Conditional masking uses additional columns (besides the target column) to determine whether data should be masked. This provides more flexibility by allowing masking decisions based on other data values in the same row.

**Standard vs Conditional Masking Policy**

| Type | Arguments | Description |
|------|-----------|-------------|
| **Standard** | Single column (val) | Masks based on role/context only |
| **Conditional** | Multiple columns | Masks based on role AND other column values |

**Conditional Masking Policy Syntax**

```sql
CREATE OR REPLACE MASKING POLICY email_visibility
AS (email VARCHAR, visibility STRING)  -- Multiple arguments
RETURNS VARCHAR ->
  CASE
    WHEN CURRENT_ROLE() = 'ADMIN' THEN email
    WHEN visibility = 'PUBLIC' THEN email
    ELSE '***MASKED***'
  END;
```

**Applying Conditional Masking Policy**

```sql
-- Apply policy specifying which columns map to which arguments
ALTER TABLE contacts
  MODIFY COLUMN email
  SET MASKING POLICY email_visibility
  USING (email, visibility_status);
```

The `USING` clause maps:
- `email` (first argument) -> `email` column (target to mask)
- `visibility` (second argument) -> `visibility_status` column (condition column)

**Multi-Condition Example**

```sql
CREATE OR REPLACE MASKING POLICY sensitive_data_mask
AS (val STRING, data_class STRING, region STRING)
RETURNS STRING ->
  CASE
    WHEN CURRENT_ROLE() = 'DATA_ADMIN' THEN val
    WHEN data_class = 'PUBLIC' AND region = 'US' THEN val
    WHEN data_class = 'INTERNAL' AND CURRENT_ROLE() IN ('ANALYST') THEN val
    ELSE 'RESTRICTED'
  END;
```

**Conditional Masking Limitations**

- All columns specified must reside in the **same table or view**
- A masked column **cannot be** a conditional column in another policy
- Conditional columns **cannot be used** as mapping table columns
- Column arguments map by **name** (not position) when used with tag-based masking
- Minimize conditional columns for better query performance

### Exam Tips

- First argument is ALWAYS the column being masked
- Additional arguments are conditional columns used for decision logic
- Use `USING` clause in ALTER TABLE to map columns to arguments
- All columns in a conditional policy must be in the same table
- Conditional masking adds overhead - minimize conditional columns

### Practice Questions

1. **Question**: In a conditional masking policy `AS (email VARCHAR, visibility STRING)`, which column is being masked?
   - A) The visibility column
   - B) The email column
   - C) Both columns equally
   - D) Neither - this is invalid syntax

   <details>
   <summary>Show Answer</summary>

   **Answer**: B - The first argument (email) is always the column being masked. Additional arguments (visibility) are conditional columns used to determine masking logic.

   </details>

2. **Question**: When applying a conditional masking policy, what SQL clause is used to map table columns to policy arguments?
   - A) WHERE
   - B) WITH
   - C) USING
   - D) MAPPING

   <details>
   <summary>Show Answer</summary>

   **Answer**: C - The `USING` clause maps table columns to the corresponding policy arguments when applying the masking policy.

   </details>

---

## Lesson 5: Context Functions in Masking Policies

### Learning Objectives
- Master CURRENT_ROLE vs INVOKER_ROLE usage
- Understand IS_ROLE_IN_SESSION for role hierarchy
- Learn IS_GRANTED_TO_INVOKER_ROLE for view contexts
- Apply appropriate context functions for different scenarios

### Key Concepts

**Context Functions Overview**

| Function | Target | Use Case |
|----------|--------|----------|
| `CURRENT_ROLE()` | Session role | Direct table queries |
| `INVOKER_ROLE()` | Executing role | Views, stored procedures |
| `IS_ROLE_IN_SESSION()` | Role hierarchy | Check if role is in session hierarchy |
| `IS_GRANTED_TO_INVOKER_ROLE()` | Invoker hierarchy | Check role inheritance in invoker context |
| `CURRENT_ACCOUNT()` | Account | Environment-based masking (prod/dev) |

**CURRENT_ROLE() - Session Context**

Returns the active role in the current session. Not affected by execution context of views or procedures.

```sql
CREATE OR REPLACE MASKING POLICY session_mask AS (val STRING)
RETURNS STRING ->
  CASE
    WHEN CURRENT_ROLE() IN ('ANALYST', 'ADMIN') THEN val
    ELSE '********'
  END;
```

**INVOKER_ROLE() - Execution Context**

Returns the role based on execution context:

| Context | INVOKER_ROLE Returns |
|---------|---------------------|
| Direct query on table | CURRENT_ROLE |
| View | View owner role |
| UDF | UDF owner role |
| Caller's rights procedure | CURRENT_ROLE |
| Owner's rights procedure | Procedure owner role |
| Task | Task owner role |

```sql
CREATE OR REPLACE MASKING POLICY view_mask AS (val STRING)
RETURNS STRING ->
  CASE
    WHEN INVOKER_ROLE() IN ('ANALYST') THEN val
    ELSE '********'
  END;
```

**IS_ROLE_IN_SESSION() - Role Hierarchy Check**

Returns TRUE if the specified role is in the CURRENT_ROLE hierarchy:

```sql
CREATE OR REPLACE MASKING POLICY hierarchy_mask AS (val STRING)
RETURNS STRING ->
  CASE
    WHEN IS_ROLE_IN_SESSION('ANALYST') THEN val
    ELSE '********'
  END;
```

This allows a role that inherits ANALYST privileges (e.g., ADMIN who is granted ANALYST) to see unmasked data.

**IS_GRANTED_TO_INVOKER_ROLE() - Invoker Hierarchy Check**

Checks if a role is in the INVOKER_ROLE hierarchy - useful for views:

```sql
CREATE OR REPLACE MASKING POLICY invoker_hierarchy_mask AS (val STRING)
RETURNS STRING ->
  CASE
    WHEN IS_GRANTED_TO_INVOKER_ROLE('PAYROLL') THEN val
    WHEN IS_GRANTED_TO_INVOKER_ROLE('ANALYST') THEN REGEXP_REPLACE(val, '[0-9]', '*', 7)
    ELSE '*******'
  END;
```

**Combining Context Functions**

```sql
CREATE OR REPLACE MASKING POLICY combined_mask AS (val STRING)
RETURNS STRING ->
  CASE
    -- Direct access with specific session role
    WHEN CURRENT_ROLE() IN ('CSR_EMPL_INFO') THEN SHA2(val)
    -- View access by specific owner
    WHEN INVOKER_ROLE() IN ('DBA_EMPL_INFO') THEN val
    ELSE NULL
  END;
```

**CURRENT_DATABASE and CURRENT_SCHEMA in Policies**

When used in a policy body, these return the database/schema of the **protected table**, not the session's current database/schema.

### Exam Tips

- `CURRENT_ROLE()` = session role (what user activated)
- `INVOKER_ROLE()` = execution context role (view owner, procedure owner, etc.)
- `IS_ROLE_IN_SESSION()` checks if role is in the CURRENT_ROLE hierarchy
- `IS_GRANTED_TO_INVOKER_ROLE()` checks if role is in the INVOKER_ROLE hierarchy
- For views, the view owner's role is checked with INVOKER_ROLE
- CURRENT_DATABASE/CURRENT_SCHEMA in policy body = protected object's db/schema

### Practice Questions

1. **Question**: A user with the ANALYST role queries a view. The view is owned by the DBA role. A masking policy uses INVOKER_ROLE(). What role is checked?
   - A) ANALYST
   - B) DBA
   - C) PUBLIC
   - D) ACCOUNTADMIN

   <details>
   <summary>Show Answer</summary>

   **Answer**: B - When querying a view, INVOKER_ROLE() returns the view owner role (DBA), not the user's session role.

   </details>

2. **Question**: Which context function should you use to check if a role is in the current session's role hierarchy?
   - A) CURRENT_ROLE()
   - B) INVOKER_ROLE()
   - C) IS_ROLE_IN_SESSION()
   - D) IS_GRANTED_TO_INVOKER_ROLE()

   <details>
   <summary>Show Answer</summary>

   **Answer**: C - IS_ROLE_IN_SESSION() returns TRUE if the specified role is in the CURRENT_ROLE hierarchy, accounting for role inheritance.

   </details>

3. **Question**: A policy uses CURRENT_DATABASE() in its body. The user's session has database 'ANALYTICS' active, but the protected table is in 'WAREHOUSE_DB'. What does CURRENT_DATABASE() return?
   - A) ANALYTICS
   - B) WAREHOUSE_DB
   - C) NULL
   - D) An error

   <details>
   <summary>Show Answer</summary>

   **Answer**: B - When CURRENT_DATABASE() is used in a policy body, it returns the database containing the protected table, not the session's current database.

   </details>

---

## Lesson 6: Tag-based Masking Policies

### Learning Objectives
- Understand how tag-based masking policies work
- Learn to assign masking policies to tags
- Apply tag-based masking at different object levels
- Recognize benefits and limitations

### Key Concepts

**What are Tag-based Masking Policies?**

Tag-based masking combines object tagging with masking policies:
- Assign a masking policy to a tag using ALTER TAG
- When a tagged column's data type matches the policy's data type, masking is automatically applied
- Eliminates need to manually apply policies to every column
- Requires **Enterprise Edition**

**How It Works**

1. Create a tag
2. Create masking policy(s) for each data type
3. Assign masking policy to the tag
4. Set the tag on database, schema, table, or column
5. Columns matching the policy data type are automatically protected

**Tag-based Masking at Different Levels**

| Level | Behavior | Use Case |
|-------|----------|----------|
| **Database** | All matching columns in all schemas/tables protected | Blanket protection |
| **Schema** | All matching columns in schema's tables protected | Schema-level governance |
| **Table** | All matching columns in table protected | Table-level control |
| **Column** | Specific column protected | Granular control |

**Creating Tag-based Masking Policy**

```sql
-- Step 1: Create a tag
CREATE TAG governance.tags.pii_data;

-- Step 2: Create masking policies for different data types
CREATE MASKING POLICY pii_string_mask AS (val STRING)
RETURNS STRING ->
  CASE
    WHEN IS_ROLE_IN_SESSION('DATA_ADMIN') THEN val
    ELSE '***MASKED***'
  END;

CREATE MASKING POLICY pii_number_mask AS (val NUMBER)
RETURNS NUMBER ->
  CASE
    WHEN IS_ROLE_IN_SESSION('DATA_ADMIN') THEN val
    ELSE 0
  END;

-- Step 3: Assign masking policies to the tag
ALTER TAG governance.tags.pii_data
  SET MASKING POLICY pii_string_mask;

ALTER TAG governance.tags.pii_data
  SET MASKING POLICY pii_number_mask;

-- Step 4: Apply tag to table (protects all columns by type)
ALTER TABLE hr.employees SET TAG governance.tags.pii_data = 'sensitive';
```

**Policy Precedence**

When both a direct masking policy and tag-based masking policy apply:
- **Direct policy takes precedence** over tag-based policy
- This allows exceptions to blanket tag-based protections

**Using SYSTEM$GET_TAG Functions**

Masking policies can use tag values in conditions:

```sql
CREATE MASKING POLICY tag_based_mask AS (val STRING)
RETURNS STRING ->
  CASE
    WHEN SYSTEM$GET_TAG_ON_CURRENT_COLUMN('pii_data') = 'public' THEN val
    WHEN IS_ROLE_IN_SESSION('ADMIN') THEN val
    ELSE '***MASKED***'
  END;
```

**Replacing Policy on Tag**

```sql
-- Option 1: Unset then set (brief unprotected window)
ALTER TAG security UNSET MASKING POLICY ssn_mask;
ALTER TAG security SET MASKING POLICY ssn_mask_v2;

-- Option 2: Use FORCE (atomic replacement)
ALTER TAG security SET MASKING POLICY ssn_mask_v2 FORCE;
```

**Key Privileges for Tag-based Masking**

```sql
-- Centralized approach
GRANT APPLY MASKING POLICY ON ACCOUNT TO ROLE data_engineer;
GRANT APPLY TAG ON ACCOUNT TO ROLE data_engineer;

-- Decentralized approach (for schema owners)
GRANT APPLY MASKING POLICY ON ACCOUNT TO ROLE schema_owner;
GRANT APPLY ON TAG governance.tags.pii_data TO ROLE schema_owner;
```

**Limitations**

- A tag can have only ONE masking policy per data type
- Cannot assign masking policies to system tags
- Cannot drop tag or policy while they are associated
- Materialized views cannot be created on tag-masked tables
- Conditional column arguments map by name (not position) with tag-based policies

### Exam Tips

- Tag-based masking requires **Enterprise Edition**
- One masking policy per data type per tag
- Direct policy on column **overrides** tag-based policy
- Use `FORCE` keyword for atomic policy replacement on tags
- Tag-based masking automatically protects NEW columns added to tables
- Cannot drop the tag OR the policy while they are associated

### Practice Questions

1. **Question**: How many masking policies for the STRING data type can be assigned to a single tag?
   - A) Unlimited
   - B) 5
   - C) 1
   - D) 50

   <details>
   <summary>Show Answer</summary>

   **Answer**: C - A tag can have only one masking policy for each data type. If you need a STRING policy, you can have only one STRING masking policy on that tag.

   </details>

2. **Question**: A column has both a direct masking policy and a tag-based masking policy. Which takes precedence?
   - A) Tag-based masking policy
   - B) Direct masking policy
   - C) The most restrictive policy
   - D) Neither - this causes an error

   <details>
   <summary>Show Answer</summary>

   **Answer**: B - When a column has both a direct masking policy and a tag-based masking policy, the direct masking policy takes precedence.

   </details>

3. **Question**: What happens to new columns added to a table that has a tag-based masking policy?
   - A) They are not protected
   - B) They are automatically protected if data type matches
   - C) They require manual policy application
   - D) The ALTER TABLE fails

   <details>
   <summary>Show Answer</summary>

   **Answer**: B - New columns added to a table with tag-based masking are automatically protected when their data type matches a masking policy assigned to the tag.

   </details>

---

## Lesson 7: Memoizable Functions in Masking Policies

### Learning Objectives
- Understand memoizable functions for performance optimization
- Learn to implement mapping table lookups efficiently
- Apply memoizable functions in masking policies
- Recognize when to use this pattern

### Key Concepts

**What are Memoizable Functions?**

Memoizable functions cache their results, making them ideal for:
- Repeated lookups against mapping/entitlement tables
- Authorization checks in masking policies
- Performance optimization when same values are queried repeatedly

**Creating a Memoizable Function**

```sql
CREATE OR REPLACE FUNCTION is_role_authorized(role_name VARCHAR)
RETURNS BOOLEAN
MEMOIZABLE
AS
$$
  SELECT ARRAY_CONTAINS(
    role_name::VARIANT,
    (SELECT ARRAY_AGG(role) FROM governance.auth_roles WHERE is_authorized = TRUE)
  )
$$;
```

**Using Memoizable Functions in Policies**

```sql
-- Create the memoizable function
CREATE FUNCTION is_role_authorized(arg1 VARCHAR)
RETURNS BOOLEAN
MEMOIZABLE
AS $$
  SELECT ARRAY_CONTAINS(
    arg1::VARIANT,
    (SELECT ARRAY_AGG(role) FROM auth_role WHERE is_authorized = TRUE)
  )
$$;

-- Use in masking policy
CREATE OR REPLACE MASKING POLICY empl_id_mask AS (val VARCHAR)
RETURNS VARCHAR ->
  CASE
    WHEN is_role_authorized(CURRENT_ROLE()) THEN val
    ELSE NULL
  END;
```

**Example: Authorization Table Pattern**

Authorization table structure:
```
+---------------+---------------+
| ROLE          | IS_AUTHORIZED |
+---------------+---------------+
| DATA_ENGINEER | TRUE          |
| DATA_STEWARD  | TRUE          |
| IT_ADMIN      | TRUE          |
| PUBLIC        | FALSE         |
+---------------+---------------+
```

The memoizable function caches the list of authorized roles, avoiding repeated table scans.

**Benefits**

- **Performance**: Cached results reduce query overhead
- **Flexibility**: Authorization logic separated from policy
- **Maintainability**: Update authorization table without changing policy
- **Scalability**: Handles large numbers of roles efficiently

### Exam Tips

- Memoizable functions cache results for performance
- Use for mapping table lookups in policies
- The MEMOIZABLE keyword must be specified when creating the function
- Results are cached per session
- Ideal for authorization checks against entitlement tables

### Practice Questions

1. **Question**: What is the primary benefit of using a memoizable function in a masking policy?
   - A) Stronger encryption
   - B) Cached results for better performance
   - C) Automatic policy updates
   - D) Cross-account access

   <details>
   <summary>Show Answer</summary>

   **Answer**: B - Memoizable functions cache their results, which significantly improves performance when the same values are repeatedly checked against authorization tables.

   </details>

---

## Lesson 8: Advanced Masking Patterns

### Learning Objectives
- Master VARIANT and semi-structured data masking
- Learn GEOGRAPHY data type masking
- Understand JavaScript UDF usage in policies
- Apply encryption/decryption patterns

### Key Concepts

**Masking VARIANT (JSON) Data**

```sql
-- Mask specific fields in JSON using OBJECT_INSERT
CREATE OR REPLACE MASKING POLICY json_mask AS (val VARIANT)
RETURNS VARIANT ->
  CASE
    WHEN CURRENT_ROLE() IN ('ANALYST') THEN val
    ELSE OBJECT_INSERT(val, 'USER_IPADDRESS', '****', true)
  END;
```

**JavaScript UDF for Complex JSON Masking**

```sql
-- Create JavaScript UDF to mask multiple fields
CREATE OR REPLACE FUNCTION full_location_masking(v VARIANT)
RETURNS VARIANT
LANGUAGE JAVASCRIPT
AS $$
  if ("latitude" in V) {
    V["latitude"] = "**latitudeMask**";
  }
  if ("longitude" in V) {
    V["longitude"] = "**longitudeMask**";
  }
  if ("location" in V) {
    V["location"] = "**locationMask**";
  }
  return V;
$$;

-- Use in masking policy
CREATE OR REPLACE MASKING POLICY json_location_mask AS (val VARIANT)
RETURNS VARIANT ->
  CASE
    WHEN CURRENT_ROLE() IN ('ANALYST') THEN val
    ELSE full_location_masking(val)
  END;
```

**Masking GEOGRAPHY Data**

```sql
CREATE MASKING POLICY mask_geo_point AS (val GEOGRAPHY)
RETURNS GEOGRAPHY ->
  CASE
    WHEN CURRENT_ROLE() IN ('ANALYST') THEN val
    ELSE TO_GEOGRAPHY('POINT(-122.35 37.55)')  -- Fixed location
  END;
```

**Encryption/Decryption Pattern**

```sql
-- Decrypt previously encrypted data for authorized users
CREATE OR REPLACE MASKING POLICY decrypt_mask AS (val BINARY)
RETURNS BINARY ->
  CASE
    WHEN CURRENT_ROLE() IN ('ANALYST') THEN DECRYPT(val, $passphrase)
    ELSE val  -- Return encrypted value
  END;
```

**SSN Masking Pattern (Last 4 Digits)**

```sql
CREATE OR REPLACE MASKING POLICY ssn_mask AS (val STRING)
RETURNS STRING ->
  CASE
    WHEN CURRENT_ROLE() IN ('HR') THEN val
    WHEN CURRENT_ROLE() IN ('SUPPORT') THEN
      CONCAT('***-**-', RIGHT(val, 4))  -- Show last 4 only
    ELSE '***-**-****'
  END;
```

**Phone Number Masking**

```sql
CREATE OR REPLACE MASKING POLICY phone_mask AS (val STRING)
RETURNS STRING ->
  CASE
    WHEN CURRENT_ROLE() IN ('SUPPORT') THEN val
    ELSE REGEXP_REPLACE(val, '[0-9]', '*')  -- Replace all digits
  END;
```

**Credit Card Masking**

```sql
CREATE OR REPLACE MASKING POLICY cc_mask AS (val STRING)
RETURNS STRING ->
  CASE
    WHEN CURRENT_ROLE() IN ('FINANCE') THEN val
    ELSE CONCAT('****-****-****-', RIGHT(val, 4))
  END;
```

### Exam Tips

- VARIANT masking can use OBJECT_INSERT to mask specific JSON fields
- JavaScript UDFs allow complex masking logic for semi-structured data
- GEOGRAPHY data returns as fixed point for unauthorized users
- Input/output types must still match (VARIANT -> VARIANT, GEOGRAPHY -> GEOGRAPHY)
- UDFs in policies require USAGE privilege on the UDF

### Practice Questions

1. **Question**: Which function is used to mask a specific field within a VARIANT column?
   - A) JSON_MASK()
   - B) OBJECT_INSERT()
   - C) VARIANT_MASK()
   - D) FIELD_REPLACE()

   <details>
   <summary>Show Answer</summary>

   **Answer**: B - OBJECT_INSERT can be used to insert/replace values in JSON objects stored in VARIANT columns, effectively masking specific fields.

   </details>

2. **Question**: When using a JavaScript UDF in a masking policy for VARIANT data, what must the UDF return?
   - A) STRING
   - B) OBJECT
   - C) VARIANT
   - D) JSON

   <details>
   <summary>Show Answer</summary>

   **Answer**: C - The UDF must return VARIANT to match the masking policy signature. Input and output types must be identical.

   </details>

---

## Lesson 9: Troubleshooting and Best Practices

### Learning Objectives
- Diagnose common masking policy errors
- Apply best practices for policy design
- Understand performance considerations
- Learn audit and compliance approaches

### Key Concepts

**Common Error Messages and Solutions**

| Error | Cause | Solution |
|-------|-------|----------|
| `Cannot DROP as it is associated with entities` | Policy still applied to columns | UNSET policy from all columns first |
| `Insufficient privileges to CREATE MASKING POLICY` | Missing CREATE privilege | Grant CREATE MASKING POLICY on schema |
| `Masking policy does not exist or not authorized` | Missing policy or APPLY privilege | Grant APPLY ON MASKING POLICY or APPLY MASKING POLICY |
| `Column already attached to another masking policy` | Column has existing policy | Use FORCE keyword or UNSET first |
| `Masking policy function argument and return type mismatch` | CASE returns different types | Ensure all CASE branches return same type |
| `Cannot attach to VIRTUAL_COLUMN` | Virtual columns not supported | Apply to source table columns |
| `Unsupported feature CREATE ON MASKING POLICY COLUMN` | Feature not supported for object type | Check documentation for supported objects |

**Best Practices**

**1. Policy Design**
- Keep policies simple and readable
- Use meaningful policy names reflecting purpose
- Document policy logic with comments
- Test policies in non-production first

**2. Performance**
- Minimize subqueries in policy bodies
- Use memoizable functions for mapping table lookups
- Limit conditional columns
- Avoid expensive functions (complex regex, external functions) when possible

**3. Security**
- Follow least-privilege principle
- Separate policy administration from data access
- Regularly audit policy assignments
- Test policies with all relevant roles

**4. Management**
- Use centralized schema for governance policies
- Implement naming conventions
- Document all policies and assignments
- Use tag-based masking for scalability

**Viewing Policy Definitions**

```sql
-- Using GET_DDL
SELECT GET_DDL('MASKING_POLICY', 'mydb.myschema.email_mask');

-- Using DESCRIBE
DESCRIBE MASKING POLICY mydb.myschema.email_mask;

-- View all policies
SHOW MASKING POLICIES IN SCHEMA mydb.myschema;
```

**Monitoring Policy Usage**

```sql
-- Query history shows masking policy names in Query Profile
-- Access history tracks policy usage
SELECT * FROM SNOWFLAKE.ACCOUNT_USAGE.ACCESS_HISTORY
WHERE QUERY_ID = '<query_id>';

-- Policy references
SELECT * FROM SNOWFLAKE.ACCOUNT_USAGE.POLICY_REFERENCES
WHERE POLICY_KIND = 'MASKING_POLICY';
```

### Exam Tips

- Always UNSET policy before dropping
- Use GET_DDL or DESCRIBE to view current policy definition
- POLICY_REFERENCES view shows all policy assignments
- Masking policy names appear in Query Profile, not query text
- Test with multiple roles to verify masking behavior
- IF EXISTS in ALTER may return success without making changes

### Practice Questions

1. **Question**: You receive the error "Policy cannot be dropped as it is associated with one or more entities." What should you do first?
   - A) Use DROP POLICY FORCE
   - B) Contact Snowflake Support
   - C) UNSET the policy from all columns
   - D) Recreate the policy with a different name

   <details>
   <summary>Show Answer</summary>

   **Answer**: C - You must first UNSET (remove) the masking policy from all columns where it is applied before you can DROP the policy.

   </details>

2. **Question**: Where can you find which masking policies were applied to a specific query?
   - A) QUERY_HISTORY view
   - B) Query Profile
   - C) SQL Text column
   - D) ACCESS_HISTORY view

   <details>
   <summary>Show Answer</summary>

   **Answer**: B - The masking policy names used in a query can be found in the Query Profile. They are not included in the SQL Text or QUERY_HISTORY view.

   </details>

---

## Quick Reference: Masking Policy Cheat Sheet

### Policy Syntax

```sql
CREATE MASKING POLICY <name> AS (val <type>)
RETURNS <type> ->
  CASE
    WHEN <condition> THEN val
    ELSE <masked_value>
  END;
```

### Common Context Functions

| Function | Returns | Use For |
|----------|---------|---------|
| CURRENT_ROLE() | Session role | Direct access |
| INVOKER_ROLE() | Execution role | Views, procedures |
| IS_ROLE_IN_SESSION('role') | TRUE/FALSE | Role hierarchy |
| CURRENT_ACCOUNT() | Account ID | Env-based masking |

### Key Privileges

| Privilege | Level | Purpose |
|-----------|-------|---------|
| CREATE MASKING POLICY | Schema | Create policies |
| APPLY MASKING POLICY | Account | Set/unset any policy |
| APPLY ON MASKING POLICY | Policy | Set/unset specific policy |

### Important DDL Commands

| Command | Purpose |
|---------|---------|
| CREATE MASKING POLICY | Create new policy |
| ALTER MASKING POLICY ... SET BODY | Update policy definition |
| ALTER TABLE ... SET MASKING POLICY | Apply to column |
| ALTER TABLE ... UNSET MASKING POLICY | Remove from column |
| DROP MASKING POLICY | Delete policy |
| SHOW MASKING POLICIES | List policies |
| DESCRIBE MASKING POLICY | View details |

### Key Exam Points

1. Enterprise Edition required for DDM
2. Masking is at query time - data unchanged
3. Input and output types must match
4. UNSET before DROP
5. Direct policy overrides tag-based policy
6. Use EXISTS for subqueries in policy body
7. CURRENT_DATABASE/SCHEMA in policy = protected object's db/schema
8. One masking policy per data type per tag

---

## Additional Resources

- Snowflake Documentation: [Understanding Dynamic Data Masking](https://docs.snowflake.com/en/user-guide/security-column-ddm-intro)
- Snowflake Documentation: [Using Dynamic Data Masking](https://docs.snowflake.com/en/user-guide/security-column-ddm-use)
- Snowflake Documentation: [Tag-based Masking Policies](https://docs.snowflake.com/en/user-guide/tag-based-masking-policies)
- Snowflake Documentation: [Advanced Column-level Security](https://docs.snowflake.com/en/user-guide/security-column-advanced)
