# Domain 6: Data Protection & Sharing
## Part 5: Configuring Shares

**Exam Weight: 5-10%**

---

## Table of Contents
1. [Secure Data Sharing Overview](#secure-data-sharing-overview)
2. [Creating and Managing Shares](#creating-and-managing-shares)
3. [Shareable Object Types](#shareable-object-types)
4. [Adding Objects to Shares](#adding-objects-to-shares)
5. [Granting Access to Consumer Accounts](#granting-access-to-consumer-accounts)
6. [Secure Views for Sharing](#secure-views-for-sharing)
7. [Database Roles in Shares](#database-roles-in-shares)
8. [Reader Accounts](#reader-accounts)
9. [Share Management Commands](#share-management-commands)
10. [Best Practices for Data Sharing](#best-practices-for-data-sharing)
11. [Exam Tips and Common Question Patterns](#exam-tips-and-common-question-patterns)

---

## Secure Data Sharing Overview

Snowflake's Secure Data Sharing enables organizations to share data between accounts without copying or transferring the data. Data consumers access shared data in real-time through read-only database objects.

### Key Characteristics

| Feature | Description |
|---------|-------------|
| **Zero-Copy Sharing** | Data is not copied or moved; consumers read directly from provider's storage |
| **Real-Time Access** | New and modified rows are immediately available to consumers |
| **Secure by Design** | Only secure views are supported (not standard views) |
| **Cross-Account** | Share data with accounts in same or different regions/clouds |
| **Provider-Controlled** | Provider maintains full control over shared data |

### Provider vs Consumer Roles

```
+------------------------------------------------------------------+
|                    DATA SHARING ARCHITECTURE                      |
+------------------------------------------------------------------+
|                                                                   |
|   DATA PROVIDER                          DATA CONSUMER            |
|   +---------------------------+         +---------------------------+
|   |                           |         |                           |
|   |  1. Creates SHARE object  |  --->   |  1. Views available shares|
|   |                           |         |                           |
|   |  2. Adds objects to share |         |  2. Creates DATABASE from |
|   |     (tables, views, UDFs) |         |     the share             |
|   |                           |         |                           |
|   |  3. Grants access to      |         |  3. Grants IMPORTED       |
|   |     consumer accounts     |         |     PRIVILEGES to roles   |
|   |                           |         |                           |
|   |  Storage Layer            |         |  Queries provider's       |
|   |  (Owns the data)          |         |  storage directly         |
|   +---------------------------+         +---------------------------+
|                                                                   |
+------------------------------------------------------------------+
```

### Data Sharing Participants

| Participant | Description | Capabilities |
|-------------|-------------|--------------|
| **Provider** | Account that owns and shares data | Creates shares, adds objects, grants access |
| **Consumer** | Account that accesses shared data | Creates database from share, queries data |
| **Reader Account** | Managed account for non-Snowflake customers | Limited capabilities, provider-managed |

---

## Creating and Managing Shares

### Share Creation Syntax

```sql
-- Basic share creation
CREATE SHARE share_name;

-- Share with comment
CREATE SHARE sales_share
  COMMENT = 'Sales data for partner organizations';

-- Create or replace existing share
CREATE OR REPLACE SHARE analytics_share
  COMMENT = 'Analytics data share';
```

### Required Privileges for Share Creation

| Task | Required Privilege | Object | Notes |
|------|-------------------|--------|-------|
| Create shares | CREATE SHARE | Account | Only ACCOUNTADMIN by default |
| Grant privileges to share | OWNERSHIP | Object being shared | Owner of object or MANAGE GRANTS |
| Add consumer accounts | OWNERSHIP | Share | Or MANAGE GRANTS |

### Delegating Share Creation Privileges

```sql
-- Grant CREATE SHARE to a custom role
GRANT CREATE SHARE ON ACCOUNT TO ROLE data_steward;

-- Warning: This allows the role to expose any objects they own
-- Use with caution in sensitive environments
```

---

## Shareable Object Types

Snowflake supports sharing the following object types:

### Database-Level Objects

| Object Type | Notes |
|-------------|-------|
| **Databases** | Container for all shared objects |
| **Schemas** | Required for sharing schema-level objects |

### Schema-Level Objects

| Object Type | Privilege Required | Special Notes |
|-------------|-------------------|---------------|
| **Tables** | SELECT | Full tables or filtered via secure views |
| **Dynamic Tables** | SELECT | Automatically refreshed data |
| **External Tables** | SELECT | Data in external storage |
| **Iceberg Tables** | SELECT | Managed and externally managed |
| **Delta Lake Tables** | SELECT | With Delta Direct integration |
| **Secure Views** | SELECT | Required for filtering/securing data |
| **Secure Materialized Views** | SELECT | Pre-computed secure views |
| **Regular Views** | SELECT | Only with SECURE_OBJECTS_ONLY = FALSE |
| **Semantic Views** | SELECT, REFERENCES | New view type for AI/ML |
| **Secure UDFs** | USAGE | User-defined functions |
| **Cortex Search Services** | - | AI-powered search |
| **Models** | - | USER_MODEL, CORTEX_FINETUNED, DOC_AI |

### Objects NOT Shareable

| Object Type | Reason |
|-------------|--------|
| Stages | Security restrictions |
| Pipes | Account-specific |
| Streams | Cannot be modified cross-account |
| Tasks | Account-specific execution |
| File Formats | Use via secure views instead |
| Sequences | Account-specific |

---

## Adding Objects to Shares

### Step-by-Step Share Configuration

The process for configuring a share involves multiple steps:

```
Step 1: Create Share
        |
        v
Step 2: Grant USAGE on Database
        |
        v
Step 3: Grant USAGE on Schema(s)
        |
        v
Step 4: Grant SELECT on Objects (tables, views, etc.)
        |
        v
Step 5: Add Consumer Accounts
```

### SQL Commands for Adding Objects

```sql
-- Step 1: Create the share
CREATE SHARE sales_share;

-- Step 2: Grant USAGE on the database
GRANT USAGE ON DATABASE sales_db TO SHARE sales_share;

-- Step 3: Grant USAGE on schemas
GRANT USAGE ON SCHEMA sales_db.public TO SHARE sales_share;

-- Step 4: Grant SELECT on tables/views
GRANT SELECT ON TABLE sales_db.public.orders TO SHARE sales_share;
GRANT SELECT ON TABLE sales_db.public.customers TO SHARE sales_share;

-- Or grant on all tables in schema
GRANT SELECT ON ALL TABLES IN SCHEMA sales_db.public TO SHARE sales_share;
```

### Important Constraints

| Constraint | Description |
|------------|-------------|
| **One Database per Share** | USAGE can only be granted to one database per share |
| **REFERENCE_USAGE for Multi-DB** | Use for secure views referencing multiple databases |
| **No Future Grants on Shares** | Shared database roles don't support future grants |
| **Recreated Objects Not Auto-Shared** | Must re-grant privileges after DROP/CREATE |

### Sharing Multiple Databases

When a secure view references objects from multiple databases:

```sql
-- Create share and grant USAGE on primary database
CREATE SHARE multi_db_share;
GRANT USAGE ON DATABASE primary_db TO SHARE multi_db_share;
GRANT USAGE ON SCHEMA primary_db.public TO SHARE multi_db_share;

-- Grant REFERENCE_USAGE on additional databases
GRANT REFERENCE_USAGE ON DATABASE secondary_db TO SHARE multi_db_share;

-- Grant SELECT on the secure view that references both
GRANT SELECT ON VIEW primary_db.public.combined_view TO SHARE multi_db_share;
```

---

## Granting Access to Consumer Accounts

### Adding Consumer Accounts to Shares

```sql
-- Add a single consumer account
ALTER SHARE sales_share ADD ACCOUNTS = org1.account1;

-- Add multiple consumer accounts
ALTER SHARE sales_share ADD ACCOUNTS = org1.account1, org2.account2;

-- Remove a consumer account
ALTER SHARE sales_share REMOVE ACCOUNTS = org1.account1;

-- Set accounts (replaces all existing)
ALTER SHARE sales_share SET ACCOUNTS = org1.account1, org1.account2;
```

### Account Identifier Formats

| Format | Example | Use Case |
|--------|---------|----------|
| **Organization.Account** | myorg.account1 | Recommended format |
| **Account Locator** | xy12345 | Legacy format |

### Consumer Actions After Receiving Share

```sql
-- Consumer: View available shares
SHOW SHARES;

-- Consumer: See share details
DESCRIBE SHARE provider_org.sales_share;

-- Consumer: Create database from share
CREATE DATABASE shared_sales FROM SHARE provider_org.sales_share;

-- Consumer: Grant access to roles
GRANT IMPORTED PRIVILEGES ON DATABASE shared_sales TO ROLE analyst;
```

---

## Secure Views for Sharing

### Why Secure Views are Required

Snowflake requires secure views for sharing (not standard views) for these reasons:

| Reason | Explanation |
|--------|-------------|
| **Data Protection** | Prevents view definition exposure |
| **Query Optimization** | Prevents optimizations that could leak data |
| **Row-Level Security** | Enables filtering by consumer account |
| **Business Logic Protection** | Hides implementation details |

### Creating Secure Views for Sharing

```sql
-- Basic secure view
CREATE OR REPLACE SECURE VIEW sales_db.public.v_orders AS
SELECT order_id, customer_id, order_date, total_amount
FROM sales_db.public.orders
WHERE region = 'US';

-- Secure view with consumer-based filtering
CREATE OR REPLACE SECURE VIEW sales_db.public.v_customer_orders AS
SELECT o.order_id, o.order_date, o.total_amount
FROM sales_db.public.orders o
JOIN sales_db.public.customer_accounts ca
  ON o.customer_id = ca.customer_id
WHERE ca.consumer_account = CURRENT_ACCOUNT();
```

### Secure View Best Practices

```sql
-- DO: Use CURRENT_ACCOUNT() for consumer-based filtering
WHERE consumer_account = CURRENT_ACCOUNT()

-- DON'T: Use CURRENT_USER() or CURRENT_ROLE()
-- These functions cause the shared object to FAIL when queried by a consumer.
-- The contextual values have no relevance in a consumer's account.
```

### Testing Secure Views Before Sharing

```sql
-- Simulate consumer account to test the view
ALTER SESSION SET SIMULATED_DATA_SHARING_CONSUMER = 'consumer_org.consumer_account';

-- Query the secure view (results will be filtered for simulated consumer)
SELECT * FROM sales_db.public.v_customer_orders;

-- Reset simulation
ALTER SESSION UNSET SIMULATED_DATA_SHARING_CONSUMER;
```

### Sharing Non-Secure Views (Special Case)

```sql
-- Create share that allows non-secure views (use with caution)
CREATE SHARE allow_non_secure_share SECURE_OBJECTS_ONLY = FALSE
  COMMENT = 'Share allows non-secure views - handle with care';

-- Grant non-secure view to share
GRANT SELECT ON VIEW non_secure_view TO SHARE allow_non_secure_share;
```

---

## Database Roles in Shares

### Overview

Database roles provide granular access control within shares, allowing consumers to grant different levels of access to different users.

### Creating Database Roles for Sharing

```sql
-- Create database roles in the source database
CREATE DATABASE ROLE sales_db.analyst_role;
CREATE DATABASE ROLE sales_db.executive_role;

-- Grant privileges to database roles
GRANT USAGE ON SCHEMA sales_db.public TO DATABASE ROLE sales_db.analyst_role;
GRANT SELECT ON VIEW sales_db.public.v_basic_metrics TO DATABASE ROLE sales_db.analyst_role;

GRANT USAGE ON SCHEMA sales_db.public TO DATABASE ROLE sales_db.executive_role;
GRANT SELECT ON VIEW sales_db.public.v_detailed_metrics TO DATABASE ROLE sales_db.executive_role;
```

### Granting Database Roles to Shares

```sql
-- Create share
CREATE SHARE segmented_share;

-- Grant USAGE on database
GRANT USAGE ON DATABASE sales_db TO SHARE segmented_share;

-- Grant database roles to share
GRANT DATABASE ROLE sales_db.analyst_role TO SHARE segmented_share;
GRANT DATABASE ROLE sales_db.executive_role TO SHARE segmented_share;

-- Add consumer accounts
ALTER SHARE segmented_share ADD ACCOUNTS = consumer_org.consumer_account;
```

### Consumer Side: Using Database Roles

```sql
-- Consumer creates database from share
CREATE DATABASE shared_sales FROM SHARE provider_org.segmented_share;

-- Consumer grants database roles to account roles
GRANT DATABASE ROLE shared_sales.analyst_role TO ROLE junior_analyst;
GRANT DATABASE ROLE shared_sales.executive_role TO ROLE exec_team;
```

### Database Role Constraints

| Constraint | Description |
|------------|-------------|
| Cannot be activated directly | Must be granted to account roles |
| No future grants support | Must explicitly grant on each new object |
| Same database only | Can only contain objects from parent database |
| Account roles cannot be granted to database roles | One-way relationship |

---

## Reader Accounts

### What are Reader Accounts?

Reader accounts are Snowflake accounts created and managed by a data provider to enable data consumers who are not Snowflake customers to access shared data.

### Reader Account Characteristics

| Characteristic | Description |
|----------------|-------------|
| **Created by Provider** | Provider account creates and manages reader accounts |
| **Provider-Funded** | Provider pays for all compute and storage costs |
| **Limited Capabilities** | Cannot share data, create shares, or replicate |
| **Managed Resources** | Provider controls warehouses and resource monitors |

### Creating Reader Accounts

```sql
-- Create a reader account (managed account)
CREATE MANAGED ACCOUNT reader_partner1
  ADMIN_NAME = 'partner_admin'
  ADMIN_PASSWORD = 'SecureP@ssword123!'
  TYPE = READER
  COMMENT = 'Reader account for Partner1 organization';

-- View managed accounts
SHOW MANAGED ACCOUNTS;
```

### Configuring Reader Accounts

```sql
-- Create warehouse for reader account (run as provider)
-- Must use reader account context
USE ROLE ACCOUNTADMIN;

-- Create resource monitor for the reader account
CREATE RESOURCE MONITOR reader_partner1_monitor
  WITH CREDIT_QUOTA = 100
  FREQUENCY = MONTHLY
  START_TIMESTAMP = IMMEDIATELY
  TRIGGERS
    ON 75 PERCENT DO NOTIFY
    ON 100 PERCENT DO SUSPEND;

-- Create warehouse for reader
CREATE WAREHOUSE reader_partner1_wh
  WITH WAREHOUSE_SIZE = 'XSMALL'
  AUTO_SUSPEND = 60
  AUTO_RESUME = TRUE
  RESOURCE_MONITOR = reader_partner1_monitor;
```

### Sharing with Reader Accounts

```sql
-- Add reader account to share
ALTER SHARE sales_share ADD ACCOUNTS = reader_partner1;

-- Reader account (partner) creates database from share
-- (executed in reader account context)
CREATE DATABASE shared_data FROM SHARE provider_org.sales_share;
```

### Reader Account Limitations

| Limitation | Impact |
|------------|--------|
| Cannot create shares | Reader accounts cannot become providers |
| No replication | Cannot replicate databases |
| Provider-dependent | Relies on provider for warehouse resources |
| Limited storage | Cannot store significant local data |
| No Snowflake Marketplace | Cannot access or publish to marketplace |

---

## Share Management Commands

### Viewing Shares

```sql
-- List all shares (owned and consumed)
SHOW SHARES;

-- Filter shares by type
SHOW SHARES LIKE '%sales%';

-- View shares in a failover group
SHOW SHARES IN FAILOVER GROUP my_fg;
```

### Describing Shares

```sql
-- View objects in a share (as provider)
DESCRIBE SHARE my_share;

-- View objects in an inbound share (as consumer)
DESC SHARE provider_org.sales_share;
```

### Sample DESCRIBE SHARE Output

```
+----------+----------+-------------------------------+-------------+
| kind     | name     | database_name                 | schema_name |
+----------+----------+-------------------------------+-------------+
| DATABASE | SALES_DB |                               |             |
| SCHEMA   | PUBLIC   | SALES_DB                      |             |
| TABLE    | ORDERS   | SALES_DB                      | PUBLIC      |
| VIEW     | V_SALES  | SALES_DB                      | PUBLIC      |
+----------+----------+-------------------------------+-------------+
```

### Modifying Shares

```sql
-- Alter share properties
ALTER SHARE my_share SET COMMENT = 'Updated share description';

-- Revoke object from share
REVOKE SELECT ON TABLE sales_db.public.orders FROM SHARE my_share;

-- Drop a share
DROP SHARE my_share;
```

### Viewing Grant Information

```sql
-- View all privileges granted to a share
SHOW GRANTS TO SHARE my_share;

-- View accounts that have access to a share
SHOW GRANTS OF SHARE my_share;
```

---

## Best Practices for Data Sharing

### 1. Share Design Principles

| Principle | Recommendation |
|-----------|----------------|
| **Minimal Exposure** | Share only necessary data |
| **Use Secure Views** | Always use secure views for filtering |
| **Document Shares** | Use COMMENT property to describe purpose |
| **Regular Auditing** | Review share access periodically |

### 2. Security Considerations

```sql
-- NEVER use CURRENT_USER() or CURRENT_ROLE() in secure views for sharing.
-- These functions cause the shared object to FAIL when queried by a consumer.
-- The contextual values have no relevance in a consumer's account.

-- DO: Use CURRENT_ACCOUNT() for consumer-based filtering
CREATE SECURE VIEW v_customer_data AS
SELECT * FROM data WHERE consumer_account = CURRENT_ACCOUNT();

-- DON'T: Use CURRENT_USER() - not meaningful in consumer context
```

### 3. Performance Considerations

| Consideration | Recommendation |
|---------------|----------------|
| **Consumer Compute** | Consumers use their own warehouses |
| **Change Tracking** | Enable for tables if consumers need streams |
| **Data Retention** | Extend retention for tables supporting consumer streams |

### 4. Stream Support for Shared Objects

```sql
-- Enable change tracking for stream support (provider side)
ALTER TABLE shared_table SET CHANGE_TRACKING = TRUE;

-- Extend data retention for consumer streams
ALTER TABLE shared_table SET DATA_RETENTION_TIME_IN_DAYS = 14;
```

---

## Exam Tips and Common Question Patterns

### High-Frequency Topics

1. **Share Creation and Privileges**
   - CREATE SHARE requires ACCOUNTADMIN or CREATE SHARE privilege
   - Provider controls all aspects of the share
   - Consumer creates database FROM SHARE

2. **Shareable Objects**
   - Know which objects CAN be shared (tables, secure views, UDFs)
   - Know which CANNOT be shared (stages, streams, tasks)
   - Secure views required (not standard views by default)

3. **Required Grant Sequence**
   - USAGE on database
   - USAGE on schema(s)
   - SELECT on tables/views

4. **Reader Accounts**
   - Provider creates and funds reader accounts
   - Limited capabilities (cannot create shares)
   - Used for non-Snowflake customers

### Common Question Patterns

**Pattern 1: "What is required to share a table?"**
```
Answer sequence:
1. CREATE SHARE
2. GRANT USAGE ON DATABASE TO SHARE
3. GRANT USAGE ON SCHEMA TO SHARE
4. GRANT SELECT ON TABLE TO SHARE
5. ALTER SHARE ADD ACCOUNTS
```

**Pattern 2: "Which objects can be shared?"**
- YES: Tables, Secure Views, Secure MVs, Secure UDFs, Dynamic Tables
- NO: Stages, Streams, Tasks, Pipes, Sequences

**Pattern 3: "What privilege does consumer need?"**
- Consumer grants IMPORTED PRIVILEGES on created database
- Not regular SELECT privileges on individual objects

**Pattern 4: "True or False about data sharing"**
- TRUE: Data is not copied (zero-copy)
- TRUE: Secure views are required (by default)
- TRUE: Consumers query provider's storage
- FALSE: Standard views can be shared (require SECURE_OBJECTS_ONLY = FALSE)
- FALSE: Consumer pays for provider's storage

### Key Commands to Remember

| Command | Purpose |
|---------|---------|
| `CREATE SHARE` | Create a new share |
| `GRANT ... TO SHARE` | Add objects to share |
| `ALTER SHARE ADD ACCOUNTS` | Grant consumer access |
| `CREATE DATABASE FROM SHARE` | Consumer creates database |
| `GRANT IMPORTED PRIVILEGES` | Consumer grants access to roles |
| `SHOW SHARES` | List shares |
| `DESC SHARE` | View share contents |

### Quick Reference: Share Configuration Workflow

```
PROVIDER ACCOUNT                          CONSUMER ACCOUNT
================                          ================

1. CREATE SHARE share_name
           |
2. GRANT USAGE ON DATABASE db TO SHARE
           |
3. GRANT USAGE ON SCHEMA db.schema TO SHARE
           |
4. GRANT SELECT ON TABLE/VIEW TO SHARE
           |
5. ALTER SHARE ADD ACCOUNTS = consumer_account
           |
           +--------------------------------> 6. SHOW SHARES (view available)
                                                     |
                                              7. DESC SHARE provider.share
                                                     |
                                              8. CREATE DATABASE db FROM SHARE
                                                     |
                                              9. GRANT IMPORTED PRIVILEGES TO ROLE
```

### Memorization Tips

**Share Creation Mnemonic: "DUSTS"**
- **D**atabase USAGE grant
- **U**sage on schema grant
- **S**elect on objects grant
- **T**o share
- **S**hare with accounts

**Shareable Objects Mnemonic: "TVDU"**
- **T**ables (regular, dynamic, external, Iceberg)
- **V**iews (secure views, secure MVs)
- **D**ata (via secure views)
- **U**DFs (secure UDFs)

**NOT Shareable: "STEPS"**
- **S**tages
- **T**asks
- **E**xternal (file formats)
- **P**ipes
- **S**treams (but consumers can create their own)

---

## Quick Reference Card

### Minimum Steps to Share Data

| Step | Provider Action | SQL Command |
|------|-----------------|-------------|
| 1 | Create share | `CREATE SHARE share_name;` |
| 2 | Add database | `GRANT USAGE ON DATABASE db TO SHARE share_name;` |
| 3 | Add schema | `GRANT USAGE ON SCHEMA db.schema TO SHARE share_name;` |
| 4 | Add objects | `GRANT SELECT ON TABLE/VIEW TO SHARE share_name;` |
| 5 | Add consumers | `ALTER SHARE share_name ADD ACCOUNTS = account_id;` |

### Consumer Minimum Steps

| Step | Consumer Action | SQL Command |
|------|-----------------|-------------|
| 1 | View shares | `SHOW SHARES;` |
| 2 | Create database | `CREATE DATABASE db FROM SHARE provider.share_name;` |
| 3 | Grant access | `GRANT IMPORTED PRIVILEGES ON DATABASE db TO ROLE role_name;` |

### Privilege Matrix

| Entity | Required For | Granted By |
|--------|--------------|------------|
| CREATE SHARE | Creating shares | ACCOUNTADMIN (by default) |
| USAGE on database | Accessing database | Provider (to share) |
| USAGE on schema | Accessing schema objects | Provider (to share) |
| SELECT on table/view | Querying data | Provider (to share) |
| IMPORTED PRIVILEGES | Consumer access | Consumer ACCOUNTADMIN |

---

*Last Updated: January 2025*
*Based on Official Snowflake Documentation*
