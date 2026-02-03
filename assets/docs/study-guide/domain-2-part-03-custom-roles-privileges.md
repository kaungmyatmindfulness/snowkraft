# Domain 2: Account Access & Security

## Part 3: Custom Roles and Privileges

This section covers custom role creation, privilege management, GRANT/REVOKE statements, future grants, and role hierarchy concepts. Understanding these topics is essential for the SnowPro Core exam, as access control questions frequently appear and require knowledge of both concepts and SQL syntax.

---

## 1. Access Control Framework Overview

### 1.1 Access Control Models in Snowflake

Snowflake uses a hybrid access control model combining two approaches:

| Model | Description | How It Works in Snowflake |
|-------|-------------|---------------------------|
| **Discretionary Access Control (DAC)** | Object owners can grant access to their objects | Each object has an owner who can grant privileges to other roles |
| **Role-Based Access Control (RBAC)** | Access privileges are assigned to roles, not users | Privileges are granted to roles; roles are granted to users |

**Key Principle:** Users do not directly receive privileges on objects. Instead:
1. Privileges are granted to **roles**
2. Roles are granted to **users**
3. Users assume roles to gain privileges

### 1.2 Core Access Control Concepts

```
Users --> Roles --> Privileges --> Objects
```

**Definitions:**

| Concept | Description |
|---------|-------------|
| **User** | A person or system that can connect to Snowflake |
| **Role** | A named entity that privileges can be granted to; granted to users or other roles |
| **Privilege** | A defined level of access to an object |
| **Securable Object** | An entity (database, schema, table, etc.) that can be secured with privileges |

---

## 2. Creating Custom Roles

### 2.1 Why Create Custom Roles?

System-defined roles (ACCOUNTADMIN, SECURITYADMIN, SYSADMIN, USERADMIN, PUBLIC) have broad permissions. Custom roles allow you to:

- Follow the **principle of least privilege**
- Create job-specific access patterns
- Separate duties between teams
- Implement granular access control

### 2.2 Role Creation Syntax

**Basic Syntax:**
```sql
CREATE ROLE [IF NOT EXISTS] <role_name>
  [ COMMENT = '<string>' ];
```

**Examples:**
```sql
-- Create a basic role
CREATE ROLE data_analyst;

-- Create role with comment
CREATE ROLE etl_developer
  COMMENT = 'Role for ETL pipeline development and management';

-- Create role only if it doesn't exist
CREATE OR REPLACE ROLE reporting_user;
```

### 2.3 Who Can Create Roles?

| Role/Privilege | Can Create Custom Roles? |
|---------------|-------------------------|
| USERADMIN | Yes (system role designed for user/role management) |
| SECURITYADMIN | Yes (inherits USERADMIN privileges) |
| ACCOUNTADMIN | Yes (highest-level role) |
| Any role with CREATE ROLE privilege | Yes |

**Grant CREATE ROLE privilege:**
```sql
-- Allow a custom role to create other roles
GRANT CREATE ROLE ON ACCOUNT TO ROLE role_admin;
```

### 2.4 Role Ownership

When you create a role, your current active role becomes the **owner** of that new role.

**Key Points:**
- The owner role does NOT automatically inherit privileges granted to the owned role
- To inherit privileges, the owned role must be **granted to** the owner role
- Only the owner (or SECURITYADMIN/ACCOUNTADMIN) can drop or modify the role

```sql
-- Transfer ownership of a role
GRANT OWNERSHIP ON ROLE data_analyst TO ROLE security_admin;
```

---

## 3. Role Hierarchy

### 3.1 What Is a Role Hierarchy?

A role hierarchy is created when roles are granted to other roles. The higher role **inherits all privileges** from the lower role.

```
        SYSADMIN
           |
    +------+------+
    |             |
ETL_ADMIN    ANALYST_ADMIN
    |             |
ETL_USER     ANALYST_USER
```

In this hierarchy:
- SYSADMIN inherits all privileges from ETL_ADMIN and ANALYST_ADMIN
- ETL_ADMIN inherits all privileges from ETL_USER
- A user with SYSADMIN can perform all actions that ETL_USER or ANALYST_USER can

### 3.2 Creating a Role Hierarchy

**Grant a role to another role:**
```sql
-- Create the hierarchy
CREATE ROLE junior_analyst;
CREATE ROLE senior_analyst;
CREATE ROLE analytics_manager;

-- Build the hierarchy (bottom-up)
GRANT ROLE junior_analyst TO ROLE senior_analyst;
GRANT ROLE senior_analyst TO ROLE analytics_manager;
GRANT ROLE analytics_manager TO ROLE sysadmin;  -- Connect to system hierarchy
```

**Best Practice:** Always connect custom role hierarchies to SYSADMIN so that system administrators can manage objects owned by custom roles.

### 3.3 Best Practices for Role Hierarchies

| Practice | Description |
|----------|-------------|
| Connect to SYSADMIN | Custom role hierarchies should ultimately be granted to SYSADMIN |
| Functional vs. Access Roles | Create separate access roles (object privileges) and functional roles (granted to users) |
| Avoid circular grants | A role cannot be granted to itself or create circular dependencies |
| Limit ACCOUNTADMIN usage | Use ACCOUNTADMIN sparingly; prefer lower-privileged roles |

**Functional Role Pattern:**
```sql
-- Access roles (hold object privileges)
CREATE ROLE sales_db_read;
CREATE ROLE sales_db_write;

-- Functional roles (granted to users)
CREATE ROLE sales_analyst;
CREATE ROLE sales_engineer;

-- Build hierarchy
GRANT ROLE sales_db_read TO ROLE sales_analyst;
GRANT ROLE sales_db_read TO ROLE sales_engineer;
GRANT ROLE sales_db_write TO ROLE sales_engineer;

-- Grant to users
GRANT ROLE sales_analyst TO USER alice;
GRANT ROLE sales_engineer TO USER bob;
```

---

## 4. Privilege Types

### 4.1 Global (Account-Level) Privileges

Global privileges apply to the entire account and are granted with `ON ACCOUNT`:

| Privilege | Description |
|-----------|-------------|
| CREATE DATABASE | Create databases in the account |
| CREATE ROLE | Create roles in the account |
| CREATE USER | Create users in the account |
| CREATE WAREHOUSE | Create warehouses in the account |
| CREATE INTEGRATION | Create integrations in the account |
| CREATE SHARE | Create outbound data shares |
| IMPORT SHARE | Import shares from other accounts |
| EXECUTE TASK | Run tasks |
| EXECUTE MANAGED TASK | Run serverless tasks |
| MANAGE GRANTS | Grant/revoke privileges on any object |
| MONITOR USAGE | Access Account Usage and Organization Usage views |
| APPLY MASKING POLICY | Apply masking policies to columns |
| APPLY ROW ACCESS POLICY | Apply row access policies to tables/views |

**Example:**
```sql
-- Grant ability to create databases
GRANT CREATE DATABASE ON ACCOUNT TO ROLE developer;

-- Grant ability to view account usage data
GRANT MONITOR USAGE ON ACCOUNT TO ROLE analyst;
GRANT IMPORTED PRIVILEGES ON DATABASE snowflake TO ROLE analyst;
```

### 4.2 Object-Specific Privileges

Different objects support different privileges:

**Database Privileges:**

| Privilege | Description |
|-----------|-------------|
| USAGE | Use the database; see it in SHOW DATABASES |
| CREATE SCHEMA | Create schemas in the database |
| MODIFY | Modify database properties |
| MONITOR | View usage and history |
| OWNERSHIP | Full control; only one role can own an object |

**Schema Privileges:**

| Privilege | Description |
|-----------|-------------|
| USAGE | Use the schema; see it in SHOW SCHEMAS |
| CREATE TABLE | Create tables in the schema |
| CREATE VIEW | Create views in the schema |
| CREATE FUNCTION | Create UDFs in the schema |
| CREATE PROCEDURE | Create stored procedures |
| CREATE SEQUENCE | Create sequences |
| CREATE STAGE | Create stages |
| CREATE PIPE | Create pipes |
| CREATE STREAM | Create streams |
| CREATE TASK | Create tasks |
| MODIFY | Modify schema properties |
| MONITOR | View schema usage |
| OWNERSHIP | Full control over the schema |

**Table Privileges:**

| Privilege | Description |
|-----------|-------------|
| SELECT | Query the table |
| INSERT | Insert rows |
| UPDATE | Update rows |
| DELETE | Delete rows |
| TRUNCATE | Truncate the table |
| REFERENCES | Create foreign key constraints |
| OWNERSHIP | Full control over the table |

**View Privileges:**

| Privilege | Description |
|-----------|-------------|
| SELECT | Query the view |
| REFERENCES | Reference in views |
| OWNERSHIP | Full control |

**Warehouse Privileges:**

| Privilege | Description |
|-----------|-------------|
| USAGE | Use the warehouse to execute queries |
| OPERATE | Start, stop, suspend, resume the warehouse |
| MODIFY | Change warehouse properties (size, etc.) |
| MONITOR | View warehouse usage and queries |
| OWNERSHIP | Full control |

### 4.3 The ALL Privilege

`ALL` grants all applicable privileges except OWNERSHIP:

```sql
-- Grant all table privileges except OWNERSHIP
GRANT ALL ON TABLE sales TO ROLE analyst;

-- Equivalent to:
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES ON TABLE sales TO ROLE analyst;
```

---

## 5. GRANT Statements

### 5.1 Granting Privileges to Roles

**Basic Syntax:**
```sql
GRANT <privilege> [, <privilege>, ...]
  ON <object_type> <object_name>
  TO ROLE <role_name>
  [ WITH GRANT OPTION ];
```

**Examples:**

```sql
-- Grant warehouse usage
GRANT USAGE ON WAREHOUSE compute_wh TO ROLE analyst;

-- Grant database usage
GRANT USAGE ON DATABASE sales_db TO ROLE analyst;

-- Grant schema usage
GRANT USAGE ON SCHEMA sales_db.public TO ROLE analyst;

-- Grant table select
GRANT SELECT ON TABLE sales_db.public.orders TO ROLE analyst;

-- Grant multiple privileges
GRANT SELECT, INSERT, UPDATE ON TABLE customers TO ROLE data_entry;

-- Grant all privileges on all tables in schema
GRANT SELECT ON ALL TABLES IN SCHEMA sales_db.public TO ROLE analyst;

-- Grant with grant option (allows grantee to grant to others)
GRANT SELECT ON TABLE sensitive_data TO ROLE manager WITH GRANT OPTION;
```

### 5.2 WITH GRANT OPTION

When you grant a privilege with `WITH GRANT OPTION`, the grantee can grant that same privilege to other roles:

```sql
-- Manager can now grant SELECT to other roles
GRANT SELECT ON TABLE reports TO ROLE manager WITH GRANT OPTION;

-- Manager grants to analyst
USE ROLE manager;
GRANT SELECT ON TABLE reports TO ROLE analyst;
```

**Important:** The grantee can only grant the specific privilege they received with GRANT OPTION, not additional privileges.

### 5.3 Granting Roles to Users

```sql
-- Grant a role to a user
GRANT ROLE analyst TO USER john;

-- Grant multiple roles
GRANT ROLE analyst, developer TO USER jane;

-- Set as default role
ALTER USER john SET DEFAULT_ROLE = analyst;
```

### 5.4 Granting Roles to Other Roles (Creating Hierarchy)

```sql
-- Create role hierarchy
GRANT ROLE junior_analyst TO ROLE senior_analyst;
GRANT ROLE senior_analyst TO ROLE analytics_lead;
```

---

## 6. REVOKE Statements

### 6.1 Revoking Privileges

**Basic Syntax:**
```sql
REVOKE <privilege> [, <privilege>, ...]
  ON <object_type> <object_name>
  FROM ROLE <role_name>
  [ CASCADE | RESTRICT ];
```

**Examples:**

```sql
-- Revoke table select
REVOKE SELECT ON TABLE orders FROM ROLE analyst;

-- Revoke multiple privileges
REVOKE INSERT, UPDATE, DELETE ON TABLE customers FROM ROLE viewer;

-- Revoke all privileges
REVOKE ALL ON TABLE sensitive_data FROM ROLE temp_role;

-- Revoke from all tables in schema
REVOKE SELECT ON ALL TABLES IN SCHEMA hr.private FROM ROLE general_user;
```

### 6.2 CASCADE vs RESTRICT

When revoking privileges that were granted WITH GRANT OPTION:

| Option | Behavior |
|--------|----------|
| CASCADE | Also revokes privileges that the grantee granted to others |
| RESTRICT | Fails if the grantee has granted privileges to others |

```sql
-- Revoke and cascade to all downstream grants
REVOKE SELECT ON TABLE data FROM ROLE manager CASCADE;

-- Revoke only if no downstream grants exist
REVOKE SELECT ON TABLE data FROM ROLE manager RESTRICT;
```

### 6.3 Revoking Roles

```sql
-- Revoke role from user
REVOKE ROLE analyst FROM USER john;

-- Revoke role from another role (breaks hierarchy)
REVOKE ROLE junior_analyst FROM ROLE senior_analyst;
```

---

## 7. Future Grants

### 7.1 What Are Future Grants?

Future grants automatically apply specified privileges to objects that will be created in the future. This eliminates the need to manually grant privileges each time a new object is created.

### 7.2 Defining Future Grants

**Syntax:**
```sql
GRANT <privilege> ON FUTURE <object_type_plural>
  IN SCHEMA <schema_name>
  TO ROLE <role_name>;

GRANT <privilege> ON FUTURE <object_type_plural>
  IN DATABASE <database_name>
  TO ROLE <role_name>;
```

**Examples:**

```sql
-- Future tables in a specific schema
GRANT SELECT ON FUTURE TABLES IN SCHEMA analytics.reports TO ROLE analyst;

-- Future tables in entire database
GRANT SELECT ON FUTURE TABLES IN DATABASE analytics TO ROLE analyst;

-- Future views in schema
GRANT SELECT ON FUTURE VIEWS IN SCHEMA analytics.dashboards TO ROLE viewer;

-- Multiple privileges
GRANT SELECT, INSERT ON FUTURE TABLES IN SCHEMA etl.staging TO ROLE etl_user;

-- Future schemas in database
GRANT USAGE ON FUTURE SCHEMAS IN DATABASE sales_db TO ROLE sales_team;
```

### 7.3 Schema vs Database Level Future Grants

**Important Rule:** When future grants are defined at both schema and database levels for the same object type, the **schema-level grants take precedence**.

```sql
-- Database level grant
GRANT SELECT ON FUTURE TABLES IN DATABASE d1 TO ROLE r1;

-- Schema level grant (takes precedence for d1.s1)
GRANT SELECT, INSERT ON FUTURE TABLES IN SCHEMA d1.s1 TO ROLE r2;

-- New tables in d1.s1: r2 gets SELECT, INSERT; r1 does NOT get SELECT
-- New tables in d1.s2: r1 gets SELECT (database-level applies)
```

### 7.4 Revoking Future Grants

```sql
-- Revoke future grants
REVOKE SELECT ON FUTURE TABLES IN SCHEMA analytics.reports FROM ROLE analyst;

REVOKE ALL ON FUTURE TABLES IN DATABASE staging FROM ROLE temp_role;
```

### 7.5 Future Grants and Cloning

When cloning databases or schemas:
- Future grants defined on the source are **copied** to the clone
- Objects within the clone get privileges based on future grants defined at clone time

---

## 8. Managed Access Schemas

### 8.1 What Is a Managed Access Schema?

In a **managed access schema**, object owners lose the ability to grant privileges on their objects. Only:
- The **schema owner** (role with OWNERSHIP on the schema)
- Roles with the **MANAGE GRANTS** privilege

can grant privileges on objects in that schema.

### 8.2 Creating Managed Access Schemas

```sql
-- Create a managed access schema
CREATE SCHEMA secure_data WITH MANAGED ACCESS;

-- Convert existing schema to managed access
ALTER SCHEMA my_schema SET MANAGED_ACCESS = TRUE;

-- Remove managed access
ALTER SCHEMA my_schema SET MANAGED_ACCESS = FALSE;
```

### 8.3 Benefits of Managed Access

| Benefit | Description |
|---------|-------------|
| Centralized control | Only schema owner controls access |
| Security | Object creators cannot grant unintended access |
| Compliance | Easier to audit and control data access |
| Consistency | Uniform privilege management across objects |

---

## 9. Viewing Grants and Privileges

### 9.1 SHOW GRANTS Commands

```sql
-- Show grants on a specific object
SHOW GRANTS ON TABLE sales.orders;

-- Show grants to a specific role
SHOW GRANTS TO ROLE analyst;

-- Show grants of a role (what roles are granted to it)
SHOW GRANTS OF ROLE analyst;

-- Show future grants in schema
SHOW FUTURE GRANTS IN SCHEMA analytics.reports;

-- Show future grants in database
SHOW FUTURE GRANTS IN DATABASE analytics;
```

### 9.2 Using INFORMATION_SCHEMA

```sql
-- View table privileges
SELECT *
FROM information_schema.table_privileges
WHERE table_name = 'ORDERS';

-- View all grants
SELECT *
FROM snowflake.account_usage.grants_to_roles
WHERE grantee_name = 'ANALYST';
```

---

## 10. Secondary Roles

### 10.1 What Are Secondary Roles?

Secondary roles allow users to combine privileges from multiple roles in a single session without switching between them.

**Primary Role:** The main active role for the session
**Secondary Roles:** Additional roles whose privileges are also available

### 10.2 Enabling Secondary Roles

```sql
-- Enable all granted roles as secondary roles
USE SECONDARY ROLES ALL;

-- Disable secondary roles (use only primary role)
USE SECONDARY ROLES NONE;

-- Check current secondary roles
SELECT CURRENT_SECONDARY_ROLES();
```

### 10.3 How Secondary Roles Work

When secondary roles are active:
- Combined privileges from primary + secondary roles are available
- Object ownership actions use the primary role only
- Both primary and secondary role hierarchies are considered

---

## 11. Exam Tips and Common Question Patterns

### 11.1 Frequently Tested Concepts

1. **Role Hierarchy Inheritance:** Parent roles inherit ALL privileges from child roles
2. **OWNERSHIP vs ALL:** OWNERSHIP is never included in ALL privilege grants
3. **Future Grants Precedence:** Schema-level future grants override database-level
4. **Managed Access:** Object owners cannot grant privileges in managed access schemas
5. **WITH GRANT OPTION:** Allows grantee to grant the same privilege to others
6. **CREATE ROLE:** Requires USERADMIN, SECURITYADMIN, ACCOUNTADMIN, or CREATE ROLE privilege

### 11.2 Common Exam Traps

| Trap | Correct Understanding |
|------|----------------------|
| Owning a role grants its privileges | NO - must be granted the role to inherit privileges |
| ALL includes OWNERSHIP | NO - OWNERSHIP is never included in ALL |
| Future grants on database apply everywhere | NO - schema-level takes precedence |
| Object owners always control access | NO - not in managed access schemas |
| Users directly receive privileges | NO - privileges go to roles, roles to users |

### 11.3 Practice Questions

**Question 1:** Role A owns Role B. Which statement is TRUE?

- A) Role A automatically inherits all privileges granted to Role B
- B) Role A can grant Role B to other roles
- C) Users with Role A can use Role B's privileges
- D) Role B is automatically granted to Role A

**Answer:** B - Owning a role allows managing it (grant, revoke, drop) but does NOT grant the owned role's privileges. To inherit privileges, Role B must be explicitly granted to Role A.

---

**Question 2:** You need to ensure all future tables in schema SALES.REPORTING automatically have SELECT granted to role ANALYST. Which statement is correct?

- A) `GRANT SELECT ON ALL FUTURE TABLES IN SCHEMA SALES.REPORTING TO ROLE ANALYST`
- B) `GRANT SELECT ON FUTURE TABLES IN SCHEMA SALES.REPORTING TO ROLE ANALYST`
- C) `GRANT FUTURE SELECT ON TABLES IN SCHEMA SALES.REPORTING TO ROLE ANALYST`
- D) `GRANT SELECT ON NEW TABLES IN SCHEMA SALES.REPORTING TO ROLE ANALYST`

**Answer:** B - The correct syntax uses `ON FUTURE TABLES` (not ALL FUTURE, FUTURE SELECT, or NEW).

---

**Question 3:** In a managed access schema, who can grant SELECT on a table to a role?

- A) The table owner only
- B) Any user with SELECT privilege on the table
- C) The schema owner or a role with MANAGE GRANTS
- D) Only ACCOUNTADMIN

**Answer:** C - In managed access schemas, only the schema owner (OWNERSHIP on schema) or roles with MANAGE GRANTS privilege can grant privileges on objects.

---

**Question 4:** You have database-level future grants for tables to role R1, and schema-level future grants for tables to role R2 in schema S1. A new table is created in S1. Which role(s) receive privileges?

- A) Both R1 and R2
- B) Only R1
- C) Only R2
- D) Neither

**Answer:** C - Schema-level future grants take precedence over database-level grants for the same object type. Only R2 receives the privileges.

---

**Question 5:** What privilege is required to run serverless tasks?

- A) EXECUTE TASK
- B) EXECUTE MANAGED TASK
- C) Both A and B
- D) CREATE TASK

**Answer:** C - Serverless tasks require both EXECUTE TASK (to run tasks) and EXECUTE MANAGED TASK (for serverless compute).

---

**Question 6:** A user needs to create a custom role. Which of the following roles can they use?

- A) PUBLIC
- B) SYSADMIN
- C) USERADMIN
- D) Any role with USAGE on a database

**Answer:** C - USERADMIN (or higher: SECURITYADMIN, ACCOUNTADMIN) can create roles. SYSADMIN cannot create roles unless explicitly granted CREATE ROLE.

---

## 12. Quick Reference

### Grant Syntax Summary

```sql
-- Privileges to roles
GRANT <privilege> ON <object_type> <name> TO ROLE <role>;

-- Roles to users
GRANT ROLE <role_name> TO USER <user_name>;

-- Roles to roles (hierarchy)
GRANT ROLE <child_role> TO ROLE <parent_role>;

-- Future grants
GRANT <privilege> ON FUTURE <objects> IN SCHEMA <schema> TO ROLE <role>;
GRANT <privilege> ON FUTURE <objects> IN DATABASE <db> TO ROLE <role>;

-- All existing objects
GRANT <privilege> ON ALL <objects> IN SCHEMA <schema> TO ROLE <role>;
```

### Revoke Syntax Summary

```sql
-- Privileges from roles
REVOKE <privilege> ON <object_type> <name> FROM ROLE <role>;

-- Roles from users
REVOKE ROLE <role_name> FROM USER <user_name>;

-- Future grants
REVOKE <privilege> ON FUTURE <objects> IN SCHEMA <schema> FROM ROLE <role>;

-- With cascade
REVOKE <privilege> ON <object> FROM ROLE <role> CASCADE;
```

### Key Privileges by Object Type

| Object | Key Privileges |
|--------|---------------|
| Account | CREATE DATABASE, CREATE ROLE, CREATE USER, CREATE WAREHOUSE, MANAGE GRANTS |
| Database | USAGE, CREATE SCHEMA, MODIFY, MONITOR, OWNERSHIP |
| Schema | USAGE, CREATE TABLE/VIEW/FUNCTION/etc., MODIFY, MONITOR, OWNERSHIP |
| Table | SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, OWNERSHIP |
| View | SELECT, REFERENCES, OWNERSHIP |
| Warehouse | USAGE, OPERATE, MODIFY, MONITOR, OWNERSHIP |

---

**Key Takeaway:** Snowflake's access control model combines DAC and RBAC principles. Privileges are granted to roles, roles are granted to users, and role hierarchies enable privilege inheritance. Understanding GRANT/REVOKE syntax, future grants, managed access schemas, and the principle of least privilege is essential for both the exam and real-world Snowflake administration.
