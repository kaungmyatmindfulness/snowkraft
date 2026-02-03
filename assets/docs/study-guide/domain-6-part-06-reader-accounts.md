# Domain 6: Data Protection & Sharing
## Part 6: Reader Accounts (Managed Accounts)

**Exam Weight: 5-10%**

---

## Table of Contents
1. [Reader Account Overview](#reader-account-overview)
2. [Reader Account vs Full Consumer Account](#reader-account-vs-full-consumer-account)
3. [Creating Reader Accounts](#creating-reader-accounts)
4. [Configuring Reader Accounts](#configuring-reader-accounts)
5. [Reader Account Limitations](#reader-account-limitations)
6. [Provider Responsibilities and Billing](#provider-responsibilities-and-billing)
7. [Managing Reader Accounts](#managing-reader-accounts)
8. [Usage Monitoring and Resource Monitors](#usage-monitoring-and-resource-monitors)
9. [Client Redirect for High Availability](#client-redirect-for-high-availability)
10. [Exam Tips and Common Question Patterns](#exam-tips-and-common-question-patterns)

---

## Reader Account Overview

### What is a Reader Account?

A **reader account** (formerly known as a "read-only account") is a special type of Snowflake account that enables data providers to share data with consumers who:

- Are **not already Snowflake customers**
- Are **not ready to become licensed Snowflake customers**
- Do not want to sign a licensing agreement with Snowflake

### Key Characteristics

| Characteristic | Description |
|---------------|-------------|
| **Former Name** | Read-only account |
| **DDL Object Name** | MANAGED ACCOUNT |
| **Purpose** | Share data with non-Snowflake customers |
| **Owner** | The provider account that created it |
| **Cost to Consumer** | No setup or usage costs |
| **Licensing** | No Snowflake licensing agreement required |
| **Data Source** | Can ONLY consume data from its parent provider account |

### Architecture Overview

```
+------------------------------------------------------------------+
|                        PROVIDER ACCOUNT                            |
|  (Full Snowflake account - owns and manages reader accounts)       |
+------------------------------------------------------------------+
        |
        | Creates & manages via CREATE MANAGED ACCOUNT
        | Shares data via SHARES
        | Pays all compute costs
        |
        v
+------------------------------------------------------------------+
|                       READER ACCOUNT(S)                            |
|  +--------------------+  +--------------------+                    |
|  | Reader Account 1   |  | Reader Account 2   |                    |
|  | - Query only       |  | - Query only       |                    |
|  | - No data upload   |  | - No data upload   |                    |
|  | - Single provider  |  | - Single provider  |                    |
|  +--------------------+  +--------------------+                    |
|                                                                    |
|  * Maximum 20 reader accounts per provider (default)               |
|  * Same edition and region as provider                             |
+------------------------------------------------------------------+

IMPORTANT DISTINCTION:
+------------------------------------------------------------------+
|                    FULL CONSUMER ACCOUNTS                          |
|  +--------------------+  +--------------------+                    |
|  | Consumer Account A |  | Consumer Account B |                    |
|  | - Own Snowflake    |  | - Own Snowflake    |                    |
|  |   license          |  |   license          |                    |
|  | - Can receive      |  | - Can receive      |                    |
|  |   shares from      |  |   shares from      |                    |
|  |   ANY provider     |  |   ANY provider     |                    |
|  | - Full Snowflake   |  | - Full Snowflake   |                    |
|  |   functionality    |  |   functionality    |                    |
|  +--------------------+  +--------------------+                    |
+------------------------------------------------------------------+
```

---

## Reader Account vs Full Consumer Account

### Comparison Table

| Feature | Reader Account | Full Consumer Account |
|---------|---------------|----------------------|
| **Snowflake License Required** | No | Yes |
| **Licensing Agreement** | Not required | Required |
| **Data Providers** | Single provider only | Multiple providers |
| **Who Pays Compute** | Provider account | Consumer account |
| **Data Loading (INSERT/COPY INTO)** | Not allowed | Allowed |
| **Data Modification (UPDATE/DELETE)** | Not allowed | Allowed |
| **Snowflake Support** | Through provider only | Direct support |
| **Account Owner** | Provider account | Self-owned |
| **Storage Costs** | Provider (none for consumer) | Consumer pays own storage |
| **Compute Costs** | Provider pays ALL | Consumer pays own |

### When to Use Reader Accounts

**Use Reader Accounts When:**
- Consumer is not a Snowflake customer
- Consumer has no plans to become a Snowflake customer
- You want to provide data access without setup complexity
- Consumer needs read-only access to your data
- You are willing to absorb all compute costs

**Use Full Consumer Accounts When:**
- Consumer needs data from multiple providers
- Consumer needs full Snowflake functionality
- Consumer should pay their own compute costs
- Consumer needs direct Snowflake support

---

## Creating Reader Accounts

### Required Privileges

| Role/Privilege | Description |
|---------------|-------------|
| **ACCOUNTADMIN** | Default role that can create reader accounts |
| **CREATE ACCOUNT** | Global privilege that can be granted to other roles |

### DDL Commands for Reader Accounts

Snowflake uses the **MANAGED ACCOUNT** object for reader accounts:

| Command | Purpose |
|---------|---------|
| `CREATE MANAGED ACCOUNT` | Create a new reader account |
| `DROP MANAGED ACCOUNT` | Delete a reader account |
| `SHOW MANAGED ACCOUNTS` | List all reader accounts |

### Creating a Reader Account with SQL

```sql
-- Step 1: Use appropriate role
USE ROLE ACCOUNTADMIN;

-- Step 2: Create the reader account
CREATE MANAGED ACCOUNT reader_acct1
    ADMIN_NAME = 'admin_user',
    ADMIN_PASSWORD = 'SecurePassword123!',
    TYPE = READER;
```

**Key Parameters:**
- `ADMIN_NAME`: Username for the initial administrator
- `ADMIN_PASSWORD`: Password for the initial administrator
- `TYPE = READER`: Specifies this is a reader account (required)

### Account Creation Details

| Aspect | Detail |
|--------|--------|
| **Edition** | Same as provider account |
| **Region** | Same as provider account |
| **Initial User** | One admin user only |
| **Default Limit** | 20 reader accounts per provider |
| **Provisioning Time** | Wait up to 5 minutes after creation |

### Delegating Reader Account Creation

```sql
-- Grant CREATE ACCOUNT privilege to SYSADMIN
USE ROLE ACCOUNTADMIN;
GRANT CREATE ACCOUNT ON ACCOUNT TO ROLE SYSADMIN;

-- Now SYSADMIN can create and manage reader accounts
USE ROLE SYSADMIN;
CREATE MANAGED ACCOUNT my_reader_account ...;
```

### Creating via Snowsight UI

1. Sign in to Snowsight
2. Navigate to **Admin** > **Accounts**
3. Select the **Accounts** tab
4. Select the **Reader accounts** sub-tab
5. Click **+ New** to create a new reader account

---

## Configuring Reader Accounts

After creating a reader account, the provider must configure it before consumers can use it. **All configuration tasks are performed IN the reader account**, not the provider account.

### Configuration Tasks Overview

| Task | Required? | Who Performs | Description |
|------|----------|--------------|-------------|
| 1. Log in as admin | Yes | Provider | Use credentials from CREATE command |
| 2. Create custom roles | Optional | Provider | For fine-grained access control |
| 3. Create users | Yes | Provider | Users who will query the data |
| 4. Create resource monitors | Optional | Provider | **CRITICAL for cost control** |
| 5. Create virtual warehouses | Yes | Provider | Required to execute queries |
| 6. Create database from share | Yes | Provider | Makes shared data accessible |
| 7. Grant privileges | Yes | Provider | Allow users to query data |

### Task 1: Log Into the Reader Account

Use the admin credentials specified during account creation:
- Use Snowsight, SnowSQL, or any supported interface
- Log in with ADMIN_NAME and ADMIN_PASSWORD

### Task 2: Create Custom Roles (Optional)

```sql
-- In the reader account
CREATE ROLE data_viewer;
CREATE ROLE data_analyst;

-- Grant roles to users
GRANT ROLE data_viewer TO USER consumer_user1;
```

Reader accounts include standard system-defined roles:
- ACCOUNTADMIN
- SYSADMIN
- SECURITYADMIN
- PUBLIC

### Task 3: Create Users

```sql
-- Create users who will access shared data
CREATE USER consumer_user1
    PASSWORD = 'UserPassword123!'
    DEFAULT_ROLE = data_viewer
    MUST_CHANGE_PASSWORD = TRUE;
```

**Best Practice:** Grant SECURITYADMIN and SYSADMIN to at least one other user to help manage the account.

### Task 4: Create Resource Monitors (CRITICAL)

```sql
-- Create a resource monitor to limit credit consumption
CREATE RESOURCE MONITOR reader_monitor
    WITH CREDIT_QUOTA = 100  -- Monthly limit
    FREQUENCY = MONTHLY
    START_TIMESTAMP = IMMEDIATELY
    TRIGGERS
        ON 75 PERCENT DO NOTIFY
        ON 90 PERCENT DO NOTIFY
        ON 100 PERCENT DO SUSPEND;

-- Apply to all warehouses in the account
ALTER ACCOUNT SET RESOURCE_MONITOR = reader_monitor;
```

**WARNING:** Without resource monitors, warehouses can consume **UNLIMITED credits** charged to the provider account!

### Task 5: Create Virtual Warehouses

```sql
-- Create a warehouse for querying
CREATE WAREHOUSE reader_wh
    WAREHOUSE_SIZE = XSMALL
    AUTO_SUSPEND = 60           -- Suspend after 60 seconds idle
    AUTO_RESUME = TRUE
    INITIALLY_SUSPENDED = TRUE;
```

**Best Practices:**
- Set appropriate warehouse size (smaller = fewer credits)
- **Always enable AUTO_SUSPEND**
- Use smallest size that meets performance needs

### Task 6: Create Database from Share

```sql
-- Assuming provider account is 'ab12345' with shares 'share1' and 'share2'
CREATE DATABASE shared_db1 FROM SHARE ab12345.share1;
CREATE DATABASE shared_db2 FROM SHARE ab12345.share2;
```

### Task 7: Grant Privileges to Roles

**Option A: Using Database Roles (if provider used database roles)**
```sql
GRANT DATABASE ROLE shared_db1.dr1 TO ROLE PUBLIC;
```

**Option B: Direct Privileges (if provider granted directly to share)**
```sql
-- Grant access to shared databases
GRANT IMPORTED PRIVILEGES ON DATABASE shared_db1 TO ROLE PUBLIC;
GRANT IMPORTED PRIVILEGES ON DATABASE shared_db2 TO ROLE PUBLIC;

-- Grant warehouse usage
GRANT USAGE ON WAREHOUSE reader_wh TO ROLE PUBLIC;
```

---

## Reader Account Limitations

### What Reader Accounts CANNOT Do

Reader accounts are designed for **querying data only**. The following operations are **NOT allowed**:

#### Data Modification Commands (Blocked)

| Command | Status |
|---------|--------|
| `INSERT` | Blocked |
| `UPDATE` | Blocked |
| `DELETE` | Blocked |
| `MERGE` | Blocked |
| `COPY INTO <table>` | Blocked |

#### Other Restricted Operations

| Operation | Status | Notes |
|-----------|--------|-------|
| Upload new data | Blocked | Cannot load data into tables |
| Modify existing data | Blocked | Read-only access |
| Create data metric functions | Blocked | Cannot set DMFs on objects |
| Create masking policies | Blocked | |
| Create pipes (Snowpipe) | Blocked | |
| Create stages | Blocked | |
| Create storage integrations | Blocked | |
| Create image repositories | Blocked | |
| Unload via storage integration | Blocked | But COPY INTO <location> with credentials IS allowed |
| CALL stored procedures | Blocked | |
| SHOW PROCEDURES | Blocked | |

### What Reader Accounts CAN Do

| Operation | Allowed? | Notes |
|-----------|----------|-------|
| Query shared data (SELECT) | Yes | Primary purpose |
| Create materialized views | Yes | On shared data |
| Create views | Yes | On shared data |
| Create warehouses | Yes | Provider pays credits |
| Create users | Yes | Admin task |
| Create roles | Yes | Admin task |
| COPY INTO <location> with credentials | Yes | Export data to cloud storage |
| All other operations | Yes | Unless explicitly blocked |

---

## Provider Responsibilities and Billing

### Provider Cost Structure

```
+------------------------------------------------------------------+
|                    PROVIDER BILLING SUMMARY                        |
+------------------------------------------------------------------+
|                                                                    |
|   PROVIDER ACCOUNT PAYS FOR:                                       |
|   +---------------------------------------------------------+     |
|   | 1. All COMPUTE credits consumed by reader accounts      |     |
|   |    - Warehouse runtime                                   |     |
|   |    - Query execution                                     |     |
|   |                                                          |     |
|   | 2. Storage costs for source data                        |     |
|   |    - Only in provider account                            |     |
|   |    - No data copied to reader account                    |     |
|   +---------------------------------------------------------+     |
|                                                                    |
|   CONSUMER (READER ACCOUNT USER) PAYS FOR:                         |
|   +---------------------------------------------------------+     |
|   | NOTHING                                                  |     |
|   |    - No setup costs                                      |     |
|   |    - No usage costs                                      |     |
|   |    - No licensing fees                                   |     |
|   +---------------------------------------------------------+     |
|                                                                    |
+------------------------------------------------------------------+
```

### Critical Cost Management

| Risk | Solution |
|------|----------|
| Unlimited credit consumption | Create resource monitors |
| Large warehouse sizes | Mandate small warehouse sizes |
| Warehouses left running | Enable AUTO_SUSPEND |
| Uncontrolled user queries | Monitor usage via READER_ACCOUNT_USAGE |

### Provider Support Responsibilities

Since reader accounts have **no licensing agreement with Snowflake**:

| Aspect | Provider Responsibility |
|--------|------------------------|
| **User Support** | Provider handles all user questions |
| **Issue Resolution** | Provider investigates and resolves issues |
| **Snowflake Escalation** | Provider opens tickets with Snowflake Support |
| **Communication** | Provider relays Snowflake responses to users |

Reader account users **cannot contact Snowflake Support directly**.

---

## Managing Reader Accounts

### Viewing Reader Accounts

```sql
USE ROLE ACCOUNTADMIN;
SHOW MANAGED ACCOUNTS;
```

**Output includes:**
- Account name
- Account locator
- URL
- Created timestamp
- Status

### Dropping Reader Accounts

```sql
USE ROLE ACCOUNTADMIN;
DROP MANAGED ACCOUNT reader_acct1;
```

**Important Considerations:**

| Aspect | Detail |
|--------|--------|
| **Immediate Effect** | All access immediately revoked |
| **Objects Dropped** | All objects in the account are deleted |
| **Reversibility** | **Cannot be undone** |
| **Retention Period** | 7 days before account slot can be reused |
| **Replacement Restriction** | If you dropped a reader account to create a new one without exceeding the limit, you cannot create the new reader account for 7 days |

### Reader Account Limits

| Limit | Value | Notes |
|-------|-------|-------|
| **Maximum reader accounts** | 20 per provider | Contact Support to increase |
| **Retention after drop** | 7 days | Cannot create new account using that slot for 7 days |

---

## Usage Monitoring and Resource Monitors

### READER_ACCOUNT_USAGE Schema

Providers can monitor reader account activity using views in the **READER_ACCOUNT_USAGE** schema (in the SNOWFLAKE shared database):

```sql
-- Query reader account usage
SELECT * FROM SNOWFLAKE.READER_ACCOUNT_USAGE.QUERY_HISTORY
WHERE reader_account_name = 'READER_ACCT1';

-- Monitor credit consumption
SELECT * FROM SNOWFLAKE.READER_ACCOUNT_USAGE.WAREHOUSE_METERING_HISTORY;
```

### Resource Monitor Best Practices

```sql
-- Create account-level resource monitor
CREATE RESOURCE MONITOR reader_limit
    WITH CREDIT_QUOTA = 50
    FREQUENCY = MONTHLY
    START_TIMESTAMP = IMMEDIATELY
    TRIGGERS
        ON 50 PERCENT DO NOTIFY
        ON 80 PERCENT DO NOTIFY
        ON 100 PERCENT DO SUSPEND;

-- Apply to the reader account
ALTER ACCOUNT SET RESOURCE_MONITOR = reader_limit;
```

### Monitoring Checklist

- [ ] Create resource monitors in each reader account
- [ ] Set credit quotas based on budget
- [ ] Configure notification triggers
- [ ] Enable suspend triggers at 100%
- [ ] Review READER_ACCOUNT_USAGE regularly
- [ ] Track warehouse sizes and runtime

---

## Client Redirect for High Availability

### Business Critical Feature

Client Redirect allows failover between reader accounts in different regions (requires **Business Critical Edition or higher**).

### Configuration Approach

```
+------------------------------------------------------------------+
|                    HIGH AVAILABILITY SETUP                         |
+------------------------------------------------------------------+
|                                                                    |
|   +------------------------+   +------------------------+          |
|   | Reader Account 1       |   | Reader Account 2       |          |
|   | Region: US-WEST-2      |   | Region: US-EAST-1      |          |
|   | Role: PRIMARY          |   | Role: SECONDARY        |          |
|   +------------------------+   +------------------------+          |
|              |                           |                         |
|              +----------- CONNECTION ----+                         |
|                            |                                       |
|                  +-----------------+                                |
|                  | Client Redirect |                                |
|                  | Configuration   |                                |
|                  +-----------------+                                |
|                                                                    |
|   In case of Regional Outage:                                       |
|   - Redirect clients from PRIMARY to SECONDARY                      |
|   - Maintains consumer access to shared data                        |
|                                                                    |
+------------------------------------------------------------------+
```

### Key Points

- Requires Business Critical Edition
- Create reader accounts in different regions
- Configure one as primary connection
- Failover redirects to secondary region

---

## Exam Tips and Common Question Patterns

### High-Frequency Topics

1. **Reader Account Purpose and Characteristics**
   - Share data with non-Snowflake customers
   - Provider pays ALL compute costs
   - Consumer has no Snowflake licensing agreement
   - Can ONLY receive data from parent provider

2. **DDL Commands**
   - CREATE MANAGED ACCOUNT (not CREATE READER ACCOUNT)
   - TYPE = READER parameter
   - ADMIN_NAME and ADMIN_PASSWORD required

3. **Limitations**
   - No INSERT, UPDATE, DELETE, MERGE
   - No COPY INTO <table>
   - No data loading
   - But CAN create materialized views

4. **Billing Model**
   - Provider pays compute
   - Consumer pays nothing
   - Resource monitors critical for cost control

5. **Support Model**
   - No direct Snowflake support for consumers
   - Provider handles all support

### Common Question Patterns

**Pattern 1: "Which account type should be used when...?"**

| Scenario | Answer |
|----------|--------|
| Consumer is not a Snowflake customer | Reader account |
| Consumer needs data from multiple providers | Full consumer account |
| Provider wants consumer to pay compute | Full consumer account |
| Quick setup without licensing needed | Reader account |

**Pattern 2: "What command creates a reader account?"**
- Answer: `CREATE MANAGED ACCOUNT ... TYPE = READER`
- NOT: CREATE READER ACCOUNT (does not exist)

**Pattern 3: "Who pays for compute in a reader account?"**
- Answer: The **provider account** pays ALL compute costs
- Consumer pays nothing

**Pattern 4: "What can/cannot be done in a reader account?"**

| Can Do | Cannot Do |
|--------|-----------|
| SELECT queries | INSERT data |
| Create materialized views | UPDATE data |
| Create warehouses | DELETE data |
| COPY INTO <location> with credentials | COPY INTO <table> |

**Pattern 5: "How does support work for reader accounts?"**
- Answer: Reader account users contact the **provider**, not Snowflake
- Provider opens Snowflake tickets if needed

**Pattern 6: "What is the default limit for reader accounts?"**
- Answer: **20 reader accounts** per provider
- Can request increase from Snowflake Support
- 7-day retention period after dropping

### Key Differentiators to Remember

| Concept | Key Point |
|---------|-----------|
| **Object Name** | MANAGED ACCOUNT (not READER ACCOUNT) |
| **Data Source** | Single provider only |
| **Billing** | Provider pays everything |
| **Support** | Through provider only |
| **Edition** | Same as provider account |
| **Region** | Same as provider account |
| **Retention** | 7 days after drop |
| **Default Limit** | 20 per provider |

### Trick Questions to Watch For

1. **"Can a reader account consume data from multiple providers?"**
   - NO - only from the single provider that created it

2. **"Does the consumer pay storage costs for reader accounts?"**
   - NO - no data is copied; provider pays source storage

3. **"Can reader accounts create their own tables?"**
   - NO - cannot INSERT or COPY INTO tables

4. **"What privilege is needed to create reader accounts?"**
   - ACCOUNTADMIN role OR CREATE ACCOUNT global privilege

5. **"Can reader accounts export data?"**
   - YES - via COPY INTO <location> with connection credentials
   - NO - cannot use storage integrations

### Memory Aids

**"MANAGED" = Reader Account DDL**
- CREATE **MANAGED** ACCOUNT
- DROP **MANAGED** ACCOUNT
- SHOW **MANAGED** ACCOUNTS

**"Provider Pays Everything"**
- Compute: Provider
- Storage: Provider (source data)
- Support: Provider handles
- Licensing: Not required for consumer

**"Read-Only = Query Only"**
- SELECT: Yes
- INSERT/UPDATE/DELETE/MERGE: No
- Materialized views: Yes (derived from queries)
- Load data: No

---

## Quick Reference Card

### Creating a Reader Account

```sql
USE ROLE ACCOUNTADMIN;

CREATE MANAGED ACCOUNT my_reader
    ADMIN_NAME = 'admin',
    ADMIN_PASSWORD = 'SecurePass123!',
    TYPE = READER;
```

### Essential Configuration (In Reader Account)

```sql
-- 1. Create resource monitor (CRITICAL)
CREATE RESOURCE MONITOR cost_control
    WITH CREDIT_QUOTA = 100
    TRIGGERS ON 100 PERCENT DO SUSPEND;
ALTER ACCOUNT SET RESOURCE_MONITOR = cost_control;

-- 2. Create warehouse
CREATE WAREHOUSE query_wh
    WAREHOUSE_SIZE = XSMALL
    AUTO_SUSPEND = 60
    AUTO_RESUME = TRUE;

-- 3. Create database from share
CREATE DATABASE shared_data FROM SHARE provider_acct.my_share;

-- 4. Grant access
GRANT IMPORTED PRIVILEGES ON DATABASE shared_data TO ROLE PUBLIC;
GRANT USAGE ON WAREHOUSE query_wh TO ROLE PUBLIC;
```

### Managing Reader Accounts

```sql
-- View all reader accounts
SHOW MANAGED ACCOUNTS;

-- Drop a reader account
DROP MANAGED ACCOUNT my_reader;

-- Monitor usage
SELECT * FROM SNOWFLAKE.READER_ACCOUNT_USAGE.WAREHOUSE_METERING_HISTORY;
```
