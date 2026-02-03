# Domain 2: Account Access & Security
## Part 2: System-Defined Roles

This study guide covers the system-defined roles in Snowflake, their hierarchy, capabilities, and best practices for the SnowPro Core (COF-C02) certification exam.

---

## Table of Contents

1. [Overview of System-Defined Roles](#overview-of-system-defined-roles)
2. [Role Hierarchy Diagram](#role-hierarchy-diagram)
3. [Detailed Role Descriptions](#detailed-role-descriptions)
4. [Role Capabilities Comparison Table](#role-capabilities-comparison-table)
5. [Best Practices for ACCOUNTADMIN](#best-practices-for-accountadmin)
6. [Functional and Access Roles Pattern](#functional-and-access-roles-pattern)
7. [Exam Tips and Common Question Patterns](#exam-tips-and-common-question-patterns)

---

## Overview of System-Defined Roles

Snowflake provides a set of **system-defined roles** that are automatically created in every account. These roles have the following characteristics:

- **Cannot be dropped** - System-defined roles are permanent and cannot be deleted
- **Privileges cannot be revoked** - The privileges granted by Snowflake to these roles cannot be revoked
- **Additional privileges can be granted** - You can grant additional privileges to system-defined roles, but this is **not recommended**
- **Form a hierarchy** - Roles inherit privileges from lower roles in the hierarchy

### Key Concept: Role-Based Access Control (RBAC)

Snowflake uses Role-Based Access Control (RBAC) where:
- **Privileges** are granted to **roles**
- **Roles** are granted to **users** or other **roles**
- Users can only perform actions allowed by their **active role** in the current session

---

## Role Hierarchy Diagram

The following text-based diagram illustrates the system-defined role hierarchy:

```
                    +------------------+
                    |   ACCOUNTADMIN   |  <-- Top-level role (encapsulates SYSADMIN + SECURITYADMIN)
                    +------------------+
                           /    \
                          /      \
            +--------------+    +----------------+
            |   SYSADMIN   |    | SECURITYADMIN  |
            +--------------+    +----------------+
                   |                    |
                   |              +------------+
                   |              |  USERADMIN |
                   |              +------------+
                   |
        +---------------------+
        | Custom Roles        |
        | (should be granted  |
        |  to SYSADMIN)       |
        +---------------------+
                   |
        +---------------------+
        | Database Roles      |
        +---------------------+


    +==========================================================+
    |                        PUBLIC                            |
    | (Pseudo-role automatically granted to all users & roles) |
    +==========================================================+


    Note: ORGADMIN / GLOBALORGADMIN operates at the organization
    level and is NOT part of the account role hierarchy.
```

### ORGADMIN Is Separate from the Hierarchy

ORGADMIN (and its successor GLOBALORGADMIN) is a system-defined role, but it is **NOT included in the hierarchy** of account-level system-defined roles shown above.

- ORGADMIN manages **organization-level** tasks: creating accounts, viewing the list of accounts in the organization, renaming or dropping accounts, and viewing organization-level usage and billing.
- ORGADMIN does **not** inherit from, and is **not** inherited by, ACCOUNTADMIN, SYSADMIN, SECURITYADMIN, or any other account-level role.
- It exists in every account but is only meaningful when the account is part of a Snowflake organization and the ORGADMIN role has been enabled.
- For exam purposes, remember: the standard hierarchy is ACCOUNTADMIN > SECURITYADMIN > USERADMIN and ACCOUNTADMIN > SYSADMIN. ORGADMIN sits outside this hierarchy entirely.

### Privilege Inheritance Flow

```
Higher Role (Parent)
       ^
       |  Inherits all privileges
       |
Lower Role (Child)
```

When Role A is **granted to** Role B:
- Role B inherits all privileges of Role A
- Users with Role B can perform all actions that Role A can perform

---

## Detailed Role Descriptions

### ACCOUNTADMIN (Account Administrator)

**The most powerful role in the system.**

| Attribute | Description |
|-----------|-------------|
| **Full Name** | Account Administrator |
| **Position** | Top-level role in the system |
| **Composition** | Encapsulates SYSADMIN and SECURITYADMIN |

**Key Capabilities:**
- Configure account-level parameters
- View and manage Snowflake billing and credit data
- Stop any running SQL statements
- Access all account-level information
- Manage resource monitors

**Critical Points:**
- **NOT a superuser role** - Can only view/manage objects if ACCOUNTADMIN or a child role has privileges on those objects
- Should be granted to a **limited number of users**
- Users should use **MFA (Multi-Factor Authentication)**
- **At least two users** should have this role to avoid password recovery delays

---

### SECURITYADMIN (Security Administrator)

**Manages security and access grants globally.**

| Attribute | Description |
|-----------|-------------|
| **Full Name** | Security Administrator |
| **Key Privilege** | MANAGE GRANTS |
| **Inherits From** | USERADMIN |

**Key Capabilities:**
- **MANAGE GRANTS privilege** - Can grant and revoke any privilege on any object
- Create, monitor, and manage users and roles (inherited from USERADMIN)
- View objects and modify access grants even if not owner
- Manage grants in managed access schemas

**Important Limitation:**
- MANAGE GRANTS only allows modifying grants
- Does **NOT** allow creating objects
- To create an object (e.g., database role), SECURITYADMIN needs additional privileges

---

### USERADMIN (User and Role Administrator)

**Dedicated to user and role management only.**

| Attribute | Description |
|-----------|-------------|
| **Full Name** | User and Role Administrator |
| **Key Privileges** | CREATE USER, CREATE ROLE |

**Key Capabilities:**
- Create users in the account
- Create roles in the account
- Manage users and roles that it owns
- Modify properties of owned objects

**Limitation:**
- Can only modify objects (users/roles) that it owns or has OWNERSHIP privilege on

---

### SYSADMIN (System Administrator)

**Creates and manages objects (warehouses, databases, etc.).**

| Attribute | Description |
|-----------|-------------|
| **Full Name** | System Administrator |
| **Focus** | Object creation and management |

**Key Capabilities:**
- Create warehouses
- Create databases
- Create other account objects
- Grant privileges on objects to other roles (when owning or having appropriate privileges)

**Best Practice:**
- Custom roles should be assigned to SYSADMIN in a role hierarchy
- This allows SYSADMIN to manage all objects in the account
- If custom roles are NOT assigned to SYSADMIN, SYSADMIN cannot manage objects owned by those roles

---

### PUBLIC (Pseudo-Role)

**Automatically granted to every user and role.**

| Attribute | Description |
|-----------|-------------|
| **Type** | Pseudo-role |
| **Assignment** | Automatic - granted to all users and roles |

**Key Characteristics:**
- Objects owned by PUBLIC are available to **every user and role** in the account
- Typically used when explicit access control is not needed
- All users are treated as equal regarding access rights to PUBLIC-owned objects
- Can own securable objects like any other role

**Use Case:**
- Grant privileges to PUBLIC when you want all users to have access

---

### ORGADMIN / GLOBALORGADMIN (Organization Administrator)

**Operates at the organization level (not account level).**

| Role | Description |
|------|-------------|
| **GLOBALORGADMIN** | Preferred role for organization-level tasks (exists only in organization account) |
| **ORGADMIN** | Legacy role for organization operations (being phased out) |

**Key Capabilities:**
- Manage account lifecycle within the organization
- Create new accounts
- View list of accounts
- Rename accounts
- Manage account URLs
- View account editions
- Drop accounts
- View organization-level usage information

**Important:**
- **NOT part of the account role hierarchy**
- Operates separately from ACCOUNTADMIN
- GLOBALORGADMIN is the recommended replacement for ORGADMIN

---

## Role Capabilities Comparison Table

| Capability | ACCOUNTADMIN | SECURITYADMIN | USERADMIN | SYSADMIN | PUBLIC |
|------------|:------------:|:-------------:|:---------:|:--------:|:------:|
| Configure account parameters | Yes | No | No | No | No |
| View billing/credit data | Yes | No | No | No | No |
| Stop any SQL statement | Yes | No | No | No | No |
| MANAGE GRANTS privilege | Yes | Yes | No | No | No |
| Create users | Yes | Yes | Yes | No | No |
| Create roles | Yes | Yes | Yes | No | No |
| Create warehouses | Yes | No | No | Yes | No |
| Create databases | Yes | No | No | Yes | No |
| Inherit SYSADMIN privileges | Yes | No | No | N/A | No |
| Inherit SECURITYADMIN privileges | Yes | N/A | No | No | No |
| Inherit USERADMIN privileges | Yes | Yes | N/A | No | No |
| Granted to all users automatically | No | No | No | No | Yes |

### Privilege Inheritance Summary

| Role | Inherits Privileges From |
|------|-------------------------|
| ACCOUNTADMIN | SYSADMIN, SECURITYADMIN |
| SECURITYADMIN | USERADMIN |
| USERADMIN | (None - bottom of security hierarchy) |
| SYSADMIN | (None - but should have custom roles granted to it) |
| PUBLIC | (None - but is granted to all roles) |

---

## Best Practices for ACCOUNTADMIN

### 1. Control Assignment Carefully

```
BEST PRACTICE: Assign ACCOUNTADMIN to a limited number of users
```

- Only assign to select/limited number of people
- Require **MFA (Multi-Factor Authentication)** for all ACCOUNTADMIN users
- Assign to **at least two users** (password recovery procedures take up to 2 business days)
- Use current employee email addresses for Snowflake Support contact purposes

### 2. Avoid Creating Objects with ACCOUNTADMIN

```
BEST PRACTICE: Use SYSADMIN or custom roles to create objects
```

**Why:**
- Objects created by ACCOUNTADMIN require explicit grants for other users to access
- Creates access management complexity
- Defeats the purpose of role hierarchy

**Instead:**
- Create a hierarchy of roles aligned with business functions
- Assign these roles to SYSADMIN
- Create objects with appropriate lower-level roles

### 3. Avoid Using ACCOUNTADMIN for Automated Scripts

```
BEST PRACTICE: Use SYSADMIN or lower roles for automation
```

- All warehouse and database operations can be performed by SYSADMIN
- User/role management can be performed by SECURITYADMIN or USERADMIN
- Reduces security risk in automated workflows

### 4. Do Not Make ACCOUNTADMIN the Default Role

```
BEST PRACTICE: Assign additional roles to ACCOUNTADMIN users
```

- Assign additional roles and make one of them the default
- Forces users to explicitly switch to ACCOUNTADMIN when needed
- Prevents accidental object creation with ACCOUNTADMIN

### 5. First User Setup

When an account is provisioned:
1. First user is assigned ACCOUNTADMIN
2. This user should create additional users with USERADMIN role
3. All remaining users should be created by USERADMIN (or role with CREATE USER privilege)

---

## Functional and Access Roles Pattern

Snowflake recommends organizing custom roles into two categories:

### Access Roles

- Contain **specific permissions** on database or account objects
- Example: `db_fin_r` (read-only access to finance database)
- Example: `db_hr_rw` (read-write access to HR database)

### Functional Roles

- Represent **business functions** in your organization
- Are granted one or more **access roles**
- Example: `accountant`, `analyst`, `hr_manager`

### Recommended Hierarchy

```
                SYSADMIN
                    |
        +-----------+-----------+
        |                       |
   accountant              analyst
   (functional)           (functional)
        |                   /   \
        |                  /     \
   +---------+       +---------+ +---------+
   |db_fin_rw|       |db_fin_r | |db_hr_r  |
   |(access) |       |(access) | |(access) |
   +---------+       +---------+ +---------+
```

**Key Point:** Grant the highest-level functional roles to SYSADMIN so system administrators can manage all objects in the hierarchy.

---

## Exam Tips and Common Question Patterns

### High-Frequency Exam Topics

1. **Role Hierarchy Questions**
   - Know which role inherits from which
   - ACCOUNTADMIN = SYSADMIN + SECURITYADMIN
   - SECURITYADMIN inherits from USERADMIN

2. **ACCOUNTADMIN Characteristics**
   - NOT a superuser role
   - Can view billing data
   - Should have MFA enabled
   - At least 2 users should have this role

3. **MANAGE GRANTS Privilege**
   - Belongs to SECURITYADMIN (and ACCOUNTADMIN)
   - Allows granting/revoking privileges
   - Does NOT allow creating objects

4. **PUBLIC Role Questions**
   - Automatically granted to all users and roles
   - Objects owned by PUBLIC are accessible to everyone
   - Is a "pseudo-role"

5. **ORGADMIN vs ACCOUNTADMIN**
   - ORGADMIN operates at organization level
   - ACCOUNTADMIN operates at account level
   - They are separate hierarchies

### Common Question Patterns

**Pattern 1: "Which role can..."**
```
Q: Which role can create a warehouse?
A: SYSADMIN or ACCOUNTADMIN (SYSADMIN has CREATE WAREHOUSE privilege)

Q: Which role can view billing information?
A: ACCOUNTADMIN only

Q: Which role can grant privileges on any object?
A: SECURITYADMIN or ACCOUNTADMIN (via MANAGE GRANTS)
```

**Pattern 2: "What is true about..."**
```
Q: What is true about ACCOUNTADMIN?
A: It is NOT a superuser role
A: It should be assigned to at least two users
A: MFA should be required

Q: What is true about system-defined roles?
A: They cannot be dropped
A: Their default privileges cannot be revoked
```

**Pattern 3: "Best practice" Questions**
```
Q: What is a best practice for ACCOUNTADMIN?
A: Don't make it the default role for any user
A: Don't use it to create objects
A: Require MFA for all ACCOUNTADMIN users
A: Assign to at least 2 users
```

**Pattern 4: Privilege Inheritance**
```
Q: If Custom_Role_A is granted to SYSADMIN, which role(s) can
   access objects owned by Custom_Role_A?
A: Custom_Role_A, SYSADMIN, and ACCOUNTADMIN
```

### Memory Aids

**ACCOUNTADMIN = "Top Boss"**
- Combines SYSADMIN + SECURITYADMIN
- Sees billing, stops queries
- But NOT a superuser

**SECURITYADMIN = "Access Controller"**
- MANAGE GRANTS = control who gets what
- Inherits user/role management from USERADMIN

**USERADMIN = "People Manager"**
- CREATE USER + CREATE ROLE
- User and role lifecycle management

**SYSADMIN = "Builder"**
- Creates warehouses, databases, objects
- Custom roles should roll up here

**PUBLIC = "Everyone"**
- Auto-granted to all
- Last resort for shared access

### Common Mistakes to Avoid

1. **Thinking ACCOUNTADMIN is a superuser**
   - Wrong! It can only manage objects it (or child roles) has access to

2. **Confusing MANAGE GRANTS with object creation**
   - MANAGE GRANTS only controls access grants
   - Does not allow creating objects

3. **Forgetting PUBLIC is granted to roles too**
   - PUBLIC is granted to both users AND roles

4. **Mixing up ORGADMIN and ACCOUNTADMIN**
   - ORGADMIN = organization level (multiple accounts)
   - ACCOUNTADMIN = single account level

5. **Not understanding role hierarchy inheritance**
   - Parent roles inherit all privileges from child roles
   - ACCOUNTADMIN inherits everything from SYSADMIN and SECURITYADMIN

---

## Quick Reference Card

```
+------------------------------------------------------------------+
|                    SYSTEM-DEFINED ROLES                          |
+------------------------------------------------------------------+
| ACCOUNTADMIN   | Top-level | Billing | Not superuser | MFA req'd |
| SECURITYADMIN  | MANAGE GRANTS | Inherits USERADMIN              |
| USERADMIN      | CREATE USER/ROLE | User & role management        |
| SYSADMIN       | CREATE WAREHOUSE/DATABASE | Object management    |
| PUBLIC         | Auto-granted to ALL | Pseudo-role                |
| ORGADMIN       | Organization level | NOT in account hierarchy    |
+------------------------------------------------------------------+

HIERARCHY: ACCOUNTADMIN > SECURITYADMIN > USERADMIN
           ACCOUNTADMIN > SYSADMIN > Custom Roles > Database Roles
           PUBLIC is granted to ALL users and roles

CANNOT BE DROPPED: All system-defined roles
CANNOT BE REVOKED: Default privileges on system-defined roles
+------------------------------------------------------------------+
```

---

## Summary

Understanding system-defined roles is critical for the SnowPro Core exam. Key takeaways:

1. **ACCOUNTADMIN** is the top role but NOT a superuser
2. **SECURITYADMIN** manages access via MANAGE GRANTS
3. **USERADMIN** handles user and role creation
4. **SYSADMIN** creates and manages objects
5. **PUBLIC** is automatically granted to everyone
6. **ORGADMIN/GLOBALORGADMIN** operates at the organization level separately

Follow best practices: limit ACCOUNTADMIN access, use MFA, create proper role hierarchies, and align roles with business functions.

---

*Study Guide Version: 1.0*
*Last Updated: January 2025*
*Exam: SnowPro Core (COF-C02)*
