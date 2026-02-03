# Domain 2: Account Access & Security

## Part 1: Access Control Overview

**Exam Weight: 20-25%**

---

## Table of Contents

1. [Access Control Framework](#access-control-framework)
2. [DAC vs RBAC vs UBAC Comparison](#dac-vs-rbac-vs-ubac-comparison)
3. [Securable Objects](#securable-objects)
4. [Roles](#roles)
5. [System-Defined Roles](#system-defined-roles)
6. [Custom Roles](#custom-roles)
7. [Privileges](#privileges)
8. [Role Hierarchy and Privilege Inheritance](#role-hierarchy-and-privilege-inheritance)
9. [Primary and Secondary Roles](#primary-and-secondary-roles)
10. [Access Control Best Practices](#access-control-best-practices)
11. [Exam Tips and Common Question Patterns](#exam-tips-and-common-question-patterns)

---

## Access Control Framework

Snowflake's access control framework combines three complementary models to provide flexible and secure access management:

### The Three Pillars

| Model                                  | Description                                                   | Key Characteristic |
| -------------------------------------- | ------------------------------------------------------------- | ------------------ |
| **DAC** (Discretionary Access Control) | Each object has an owner who can grant access to that object  | Ownership-based    |
| **RBAC** (Role-Based Access Control)   | Privileges are assigned to roles, which are assigned to users | Role-centric       |
| **UBAC** (User-Based Access Control)   | Privileges can be assigned directly to users                  | User-centric       |

### Key Components

1. **Securable Object**: An entity to which access can be granted. Unless allowed by a grant, access is **denied by default**.

2. **Role**: An entity to which privileges can be granted. Roles are assigned to users or other roles.

3. **Privilege**: A defined level of access to an object. Multiple privileges control granularity of access granted.

4. **User**: A user identity recognized by Snowflake that can be assigned roles and receive privilege grants.

---

## DAC vs RBAC vs UBAC Comparison

### Text-Based Access Control Model Diagram

```
+------------------------------------------------------------------+
|                    ACCESS CONTROL FRAMEWORK                       |
+------------------------------------------------------------------+
|                                                                   |
|   DAC (Discretionary Access Control)                             |
|   +---------------------------------------------------------+    |
|   |  Role 1 (Owner)                                         |    |
|   |     |                                                    |    |
|   |     +-- OWNERSHIP --> Object 1                          |    |
|   |     +-- OWNERSHIP --> Object 2                          |    |
|   |                                                          |    |
|   |  * Owner can grant privileges on owned objects          |    |
|   +---------------------------------------------------------+    |
|                                                                   |
|   RBAC (Role-Based Access Control)                               |
|   +---------------------------------------------------------+    |
|   |                                                          |    |
|   |   Object 1                                               |    |
|   |      |                                                   |    |
|   |      +-- privileges granted to --> Role 2               |    |
|   |                                          |               |    |
|   |                                          +-- granted to --> User 1    |
|   |                                          +-- granted to --> User 2    |
|   |                                                          |    |
|   |  * Users access objects through role membership         |    |
|   +---------------------------------------------------------+    |
|                                                                   |
|   UBAC (User-Based Access Control)                               |
|   +---------------------------------------------------------+    |
|   |                                                          |    |
|   |   Object 2                                               |    |
|   |      |                                                   |    |
|   |      +-- privileges granted directly to --> User 3      |    |
|   |      +-- privileges granted directly to --> User 4      |    |
|   |                                                          |    |
|   |  * Requires USE SECONDARY ROLES = ALL for enforcement   |    |
|   +---------------------------------------------------------+    |
|                                                                   |
+------------------------------------------------------------------+
```

### Detailed Comparison Table

| Aspect                  | DAC                            | RBAC                    | UBAC                     |
| ----------------------- | ------------------------------ | ----------------------- | ------------------------ |
| **Primary Concept**     | Ownership determines control   | Roles determine access  | Direct user grants       |
| **Grant Authority**     | Object owner grants privileges | Admin grants to roles   | Admin grants to users    |
| **Scalability**         | Moderate                       | High                    | Low                      |
| **Management Overhead** | Medium                         | Low                     | High                     |
| **Best For**            | Object-level control           | Enterprise environments | Exceptions/special cases |
| **Snowflake Default**   | Combined with RBAC             | Primary model           | Optional extension       |

### When to Use Each Model

**DAC (Discretionary Access Control)**

- When object creators need to manage their own objects
- For development environments where teams own their schemas
- The OWNERSHIP privilege implements DAC

**RBAC (Role-Based Access Control)** - _Recommended Primary Approach_

- For production environments
- When consistent access patterns exist across users
- For enterprise-level governance
- When audit compliance is required

**UBAC (User-Based Access Control)**

- For exceptions to role-based policies
- When specific users need temporary access
- For service accounts with unique requirements
- Note: Only enforced when `USE SECONDARY ROLES = ALL`

---

## Securable Objects

### Object Hierarchy

Every securable object resides within a logical container hierarchy:

```
+------------------------------------------------------------------+
|                         ORGANIZATION                              |
|  (Top-most container)                                            |
+------------------------------------------------------------------+
                                |
                                v
+------------------------------------------------------------------+
|                           ACCOUNT                                 |
|  Contains: Users, Roles, Warehouses, Resource Monitors,          |
|            Integrations, Databases                                |
+------------------------------------------------------------------+
                                |
                                v
+------------------------------------------------------------------+
|                          DATABASE                                 |
|  Contains: Schemas, Database Roles                               |
+------------------------------------------------------------------+
                                |
                                v
+------------------------------------------------------------------+
|                           SCHEMA                                  |
|  Contains: Tables, Views, Stages, File Formats, Sequences,       |
|            Pipes, Streams, Tasks, UDFs, Stored Procedures,       |
|            Materialized Views, External Tables, etc.              |
+------------------------------------------------------------------+
```

### Key Points About Securable Objects

1. **Ownership**: Each securable object is owned by a single role
2. **Default Access**: Access is denied unless explicitly granted
3. **Privilege Source**: Users perform SQL actions based on privileges granted to their active roles
4. **Container Access**: To access an object, you need USAGE on all containers above it

### Required Privileges for Object Access

To SELECT from a table `db1.schema1.table1`:

```
USAGE on WAREHOUSE
USAGE on DATABASE db1
USAGE on SCHEMA db1.schema1
SELECT on TABLE db1.schema1.table1
```

---

## Roles

Roles are the primary entities to which privileges are granted. They serve as the bridge between users and object access.

### Role Types

| Role Type             | Scope                 | Use Case                    |
| --------------------- | --------------------- | --------------------------- |
| **Account Roles**     | Entire account        | General access control      |
| **Database Roles**    | Single database       | Database-specific access    |
| **Application Roles** | Snowflake Native Apps | Consumer access in apps     |
| **Instance Roles**    | Class instances       | Snowpark Container Services |

### Role Type Characteristics

**Account Roles**

- Can be activated as primary or secondary roles
- Can be granted to users and other account roles
- Can contain database roles in their hierarchy

**Database Roles**

- Cannot be activated directly in a session
- Must be granted to an account role
- Cannot have account roles granted to them
- Scope is limited to the containing database
- USAGE on the database is automatically granted when database role is created

---

## System-Defined Roles

Snowflake provides several built-in roles that cannot be dropped:

### System Role Hierarchy Diagram

```
                    +----------------+
                    | ACCOUNTADMIN   |  <-- Top-level role (use sparingly)
                    +----------------+
                           |
            +--------------+--------------+
            |                             |
            v                             v
    +---------------+            +---------------+
    | SECURITYADMIN |            |   SYSADMIN    |
    +---------------+            +---------------+
            |                             |
            v                             |
    +---------------+                     |
    |   USERADMIN   |                     |
    +---------------+                     |
                                          |
                                          v
    +------------------------------------------+
    |           Custom Account Roles           |
    |     (Should be granted to SYSADMIN)      |
    +------------------------------------------+
                         |
                         v
    +------------------------------------------+
    |           Custom Database Roles          |
    +------------------------------------------+
                         |
                         v
                  +------------+
                  |   PUBLIC   |  <-- Granted to all users/roles
                  +------------+
```

### Detailed System Role Descriptions

| Role              | Key Privileges                    | Primary Purpose                                   |
| ----------------- | --------------------------------- | ------------------------------------------------- |
| **ACCOUNTADMIN**  | All privileges                    | Top-level role; combines SYSADMIN + SECURITYADMIN |
| **SECURITYADMIN** | MANAGE GRANTS, inherits USERADMIN | Manage grants and security                        |
| **USERADMIN**     | CREATE USER, CREATE ROLE          | Manage users and roles                            |
| **SYSADMIN**      | CREATE WAREHOUSE, CREATE DATABASE | Manage warehouses and databases                   |
| **PUBLIC**        | None by default                   | Pseudo-role granted to all                        |

### ACCOUNTADMIN

- **Top-level role** in the system
- Encapsulates SYSADMIN and SECURITYADMIN
- Should be granted to a **limited number of users**
- Should **NOT** be set as any user's default role
- Use for account-level operations only

### SECURITYADMIN

- Granted the **MANAGE GRANTS** privilege
- Can modify any grant, including revoking privileges
- Inherits USERADMIN privileges
- Cannot create objects without additional privileges

### USERADMIN

- Granted **CREATE USER** and **CREATE ROLE** privileges
- Can manage users and roles it owns
- Only the role with OWNERSHIP on an object can manage it

### SYSADMIN

- Creates warehouses and databases
- Should inherit all custom roles (recommended hierarchy)
- Can grant privileges on warehouses, databases, and other objects

### PUBLIC

- **Pseudo-role** automatically granted to every user and role
- Any object granted to PUBLIC is accessible by all users
- Can own securable objects
- Use with caution for sensitive data

### ORGADMIN

- Organization-level role for multi-account management
- Performs organization-level tasks
- Manages account lifecycle
- Views organization-level usage
- **Not included** in the standard account role hierarchy

---

## Custom Roles

### Creating Custom Roles

Custom roles can be created by:

- **USERADMIN** role (or higher)
- Any role with **CREATE ROLE** privilege

### Best Practices for Custom Roles

1. **Create role hierarchies** aligned with business functions
2. **Grant custom roles to SYSADMIN** to enable central management
3. **Use descriptive names** that indicate purpose
4. **Document role purposes** and privilege grants

### Role Hierarchy Benefits

```
Without Hierarchy:                  With Hierarchy:

  SYSADMIN    Custom Role           SYSADMIN
      |            |                    |
      |            |                    +-- Custom Role
      |            |                            |
      X            |                            +-- owned objects
  (cannot access)  |                    (SYSADMIN can manage)
                   |
               owned objects
```

**Important**: If a custom role is NOT assigned to SYSADMIN through a role hierarchy, system administrators cannot manage objects owned by that role.

---

## Privileges

### Privilege Categories

| Category             | Examples                                         | Applies To       |
| -------------------- | ------------------------------------------------ | ---------------- |
| **Global (Account)** | CREATE DATABASE, CREATE WAREHOUSE, MANAGE GRANTS | Account level    |
| **Object**           | USAGE, SELECT, INSERT, UPDATE, DELETE            | Specific objects |
| **Schema**           | CREATE TABLE, CREATE VIEW, CREATE FUNCTION       | Schema objects   |

### Common Privileges by Object Type

#### Database Privileges

| Privilege            | Description                                    |
| -------------------- | ---------------------------------------------- |
| USAGE                | Required to access any objects in the database |
| CREATE SCHEMA        | Create schemas in the database                 |
| CREATE DATABASE ROLE | Create database roles                          |
| MODIFY               | Modify database properties                     |
| MONITOR              | View database metadata                         |
| OWNERSHIP            | Full control; required to alter database       |

#### Schema Privileges

| Privilege        | Description                              |
| ---------------- | ---------------------------------------- |
| USAGE            | Required to access objects in the schema |
| CREATE TABLE     | Create tables in the schema              |
| CREATE VIEW      | Create views in the schema               |
| CREATE FUNCTION  | Create UDFs in the schema                |
| CREATE PROCEDURE | Create stored procedures                 |
| MODIFY           | Modify schema properties                 |
| OWNERSHIP        | Full control over the schema             |

#### Table Privileges

| Privilege  | Description                      |
| ---------- | -------------------------------- |
| SELECT     | Query data from the table        |
| INSERT     | Insert rows into the table       |
| UPDATE     | Update existing rows             |
| DELETE     | Delete rows from the table       |
| TRUNCATE   | Remove all rows from the table   |
| REFERENCES | Reference table in foreign key   |
| OWNERSHIP  | Full control; transfer ownership |

#### Warehouse Privileges

| Privilege | Description                   |
| --------- | ----------------------------- |
| USAGE     | Use the warehouse for queries |
| OPERATE   | Start, stop, suspend, resume  |
| MODIFY    | Change warehouse properties   |
| MONITOR   | View warehouse usage/history  |
| OWNERSHIP | Full control over warehouse   |

### The OWNERSHIP Privilege

- **Special privilege** that grants full control
- Every object has exactly **one owner role**
- Owner can grant privileges to other roles
- Owner role does NOT inherit privileges of the owned role
- Transfer ownership using `GRANT OWNERSHIP`

### The ALL PRIVILEGES Shorthand

- Grants all privileges **except OWNERSHIP**
- Example: `GRANT ALL PRIVILEGES ON TABLE t1 TO ROLE r1;`
- Does not transfer ownership

---

## Role Hierarchy and Privilege Inheritance

### How Inheritance Works

When a role is granted to another role:

- The **parent role inherits all privileges** of the child role
- Inheritance flows **upward** in the hierarchy
- The owner of a role does **NOT** inherit that role's privileges

### Inheritance Example

```
                 +--------+
                 | Role 1 |  <-- Has Privileges A, B, C
                 +--------+
                     |
              granted to
                     |
                 +--------+
                 | Role 2 |  <-- Has Privilege B + inherits C
                 +--------+
                     |
              granted to
                     |
                 +--------+
                 | Role 3 |  <-- Has Privilege C only
                 +--------+

Privilege Flow:
- Role 3: Privilege C
- Role 2: Privilege B + C (inherited)
- Role 1: Privilege A + B + C (inherited)
- User with Role 1: All three privileges
```

### Database Roles in Hierarchies

Key constraints for database roles:

1. **Cannot be activated directly** in a session
2. **Must be granted** to an account role
3. **Account roles cannot be granted** to database roles
4. Database roles can be granted to other database roles (same database)

---

## Primary and Secondary Roles

### Session Role Context

Every active user session has:

- **One primary role** (current role)
- **Zero or more secondary roles**

### Primary Role

- Set at session initiation (default role or specified)
- Changed using `USE ROLE <role_name>`
- **Owns all objects created** during the session
- Required for `CREATE` statements authorization

### Secondary Roles

- Activated using `USE SECONDARY ROLES ALL`
- Provide additional privileges for the session
- Useful for cross-database joins
- Cannot create objects (creation uses primary role only)

### Primary vs Secondary Role Authorization

| Operation            | Authorization Source          |
| -------------------- | ----------------------------- |
| CREATE object        | Primary role only             |
| SELECT/DML           | Primary + all secondary roles |
| DDL on owned objects | Any role owning the object    |
| Other operations     | Primary + secondary roles     |

### Example Use Case

```sql
-- Set primary role
USE ROLE analyst;

-- Enable all granted roles as secondary
USE SECONDARY ROLES ALL;

-- Now can access objects across all granted roles
SELECT * FROM db1.schema1.table1  -- analyst has access
JOIN db2.schema2.table2           -- different role has access
ON ...;
```

---

## Access Control Best Practices

### 1. ACCOUNTADMIN Role Management

- Grant to a **limited number of users**
- **Never set as default role**
- Enable **MFA** for all ACCOUNTADMIN users
- Avoid using for day-to-day operations
- Set up **email notification** for console logins

### 2. Role Hierarchy Design

```
Recommended Structure:

        SYSADMIN
            |
    +-------+-------+
    |       |       |
  Role A  Role B  Role C  (functional roles)
    |       |       |
    +---+---+       |
        |           |
    Role D      Role E    (team/project roles)
```

### 3. Avoid ACCOUNTADMIN for Scripts

- Create custom roles for automated scripts
- Grant only necessary privileges
- Assign custom roles to SYSADMIN hierarchy

### 4. Use Managed Access Schemas

In managed access schemas:

- Only the **schema owner** or MANAGE GRANTS privilege holder can grant privileges
- Centralizes privilege management
- Prevents object owners from granting access

```sql
CREATE SCHEMA mydb.managed_schema WITH MANAGED ACCESS;
```

### 5. Use Future Grants

Simplify grant management with future grants:

```sql
-- Grant SELECT on all future tables in schema to role
GRANT SELECT ON FUTURE TABLES IN SCHEMA myschema TO ROLE analyst;
```

**Note**: Schema-level future grants take precedence over database-level future grants.

---

## Exam Tips and Common Question Patterns

### High-Frequency Topics

1. **System-defined roles and their purposes**
   - Know the hierarchy: ACCOUNTADMIN > SECURITYADMIN > USERADMIN
   - Know what privileges each has
   - Understand SYSADMIN's role in object management

2. **OWNERSHIP privilege**
   - Owner role does NOT inherit owned role's privileges
   - Only one role can own an object
   - Owner can grant privileges to others

3. **Role hierarchy and inheritance**
   - Privileges flow upward (child to parent)
   - Custom roles should be granted to SYSADMIN
   - Database roles cannot be activated directly

4. **Access requirements**
   - USAGE required on all containers (database, schema)
   - Plus specific privilege on the object itself

### Common Question Patterns

**Pattern 1: "Which role should be used for...?"**

- Account setup/configuration: ACCOUNTADMIN
- Creating users/roles: USERADMIN
- Creating warehouses/databases: SYSADMIN
- Managing grants: SECURITYADMIN

**Pattern 2: "What privileges are needed to...?"**

- Query a table: USAGE on warehouse + USAGE on database + USAGE on schema + SELECT on table
- Create a table: USAGE on database + USAGE on schema + CREATE TABLE on schema
- Modify a warehouse: MODIFY on warehouse (or OWNERSHIP)

**Pattern 3: "True or False about role inheritance"**

- TRUE: Child role privileges are inherited by parent role
- FALSE: Owner role inherits owned role's privileges
- TRUE: ACCOUNTADMIN inherits SYSADMIN privileges

**Pattern 4: "What happens when...?"**

- Object created: Owned by current primary role
- Role granted to another role: Parent inherits privileges
- User not granted any role: PUBLIC role is used

### Key Differentiators to Remember

| Concept A     | Concept B      | Key Difference                                                 |
| ------------- | -------------- | -------------------------------------------------------------- |
| SECURITYADMIN | USERADMIN      | SECURITYADMIN has MANAGE GRANTS; USERADMIN creates users/roles |
| OWNERSHIP     | ALL PRIVILEGES | OWNERSHIP can transfer; ALL PRIVILEGES cannot                  |
| Primary role  | Secondary role | Primary creates objects; both authorize queries                |
| Account role  | Database role  | Account roles can be activated; database roles cannot          |
| DAC           | RBAC           | DAC is ownership-based; RBAC is role-based                     |

### Memorization Tips

**ACCOUNTADMIN Mnemonic**: "ACCOUNTADMIN = ACCOUNT Administrator + Data IN access" (top-level, should be limited)

**Privilege Flow**: "Privileges flow UP" - child role privileges flow up to parent roles

**USAGE Cascade**: "To use an object, USAGE all the way up" - need USAGE on database AND schema

**Ownership Rule**: "Owners don't inherit, they control" - owning a role doesn't give you its privileges

### Practice Questions Focus Areas

1. Scenarios asking which role to use for specific tasks
2. Privilege requirements for common operations
3. Role hierarchy and inheritance scenarios
4. Differences between role types
5. Best practices for ACCOUNTADMIN
6. Understanding managed access schemas
7. Primary vs secondary role behavior

---

## Quick Reference Card

### Minimum Privileges for Common Operations

| Operation        | Required Privileges                                   |
| ---------------- | ----------------------------------------------------- |
| Query a table    | USAGE (warehouse, database, schema) + SELECT (table)  |
| Insert data      | USAGE (warehouse, database, schema) + INSERT (table)  |
| Create table     | USAGE (database, schema) + CREATE TABLE (schema)      |
| Create schema    | USAGE (database) + CREATE SCHEMA (database)           |
| Create database  | CREATE DATABASE (account level)                       |
| Create warehouse | CREATE WAREHOUSE (account level)                      |
| Grant privileges | OWNERSHIP on object OR MANAGE GRANTS global privilege |

### System Roles Quick Reference

| Role          | Creates               | Manages              | Key Privilege                     |
| ------------- | --------------------- | -------------------- | --------------------------------- |
| ACCOUNTADMIN  | Everything            | Everything           | All                               |
| SECURITYADMIN | Nothing directly      | Grants, Users, Roles | MANAGE GRANTS                     |
| USERADMIN     | Users, Roles          | Users, Roles it owns | CREATE USER, CREATE ROLE          |
| SYSADMIN      | Warehouses, Databases | Objects              | CREATE WAREHOUSE, CREATE DATABASE |
| PUBLIC        | Nothing               | Nothing              | None (pseudo-role)                |

---

_Last Updated: January 2025_
_Based on Official Snowflake Documentation_
