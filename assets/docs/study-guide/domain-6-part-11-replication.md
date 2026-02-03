# Domain 6: Data Protection & Sharing - Database Replication

## Overview

Database replication in Snowflake enables organizations to replicate databases and account objects across multiple accounts within the same organization. This is critical for business continuity, disaster recovery, and data distribution across regions and cloud platforms.

**Exam Weight for Domain 6:** 5-10%

---

## 1. Key Concepts

### 1.1 Replication Fundamentals

**What is Replication?**
- Copying databases and account objects from a **source account** (primary) to one or more **target accounts** (secondary)
- Supports replication across **regions** and **cloud platforms** (AWS, Azure, GCP)
- Requires accounts to be in the **same Snowflake organization**

**Primary vs Secondary Objects:**
| Aspect | Primary Objects | Secondary Objects |
|--------|----------------|-------------------|
| Location | Source account | Target account |
| Access | Read-write | Read-only |
| DML/DDL | Allowed | Not allowed |
| Purpose | Main operational copy | Disaster recovery replica |

### 1.2 Replication Groups vs Failover Groups

**Replication Group:**
- Collection of objects replicated as a unit to target accounts
- Provides **read-only** access in target accounts
- Available to **all Snowflake editions**

**Failover Group:**
- Replication group that can also **fail over**
- Secondary can be **promoted to primary** (becomes read-write)
- Requires **Business Critical Edition** or higher

```
REPLICATION GROUP = Replication only (read-only secondaries)
FAILOVER GROUP    = Replication + Failover capability
```

### 1.3 Edition Requirements

| Feature | Standard | Enterprise | Business Critical | VPS |
|---------|----------|------------|-------------------|-----|
| Database Replication | Yes | Yes | Yes | Yes |
| Share Replication | Yes | Yes | Yes | Yes |
| Replication Group | Yes | Yes | Yes | Yes |
| Account Object Replication | No | No | Yes | Yes |
| Failover Group | No | No | Yes | Yes |
| Failover/Failback | No | No | Yes | Yes |
| Client Redirect | No | No | Yes | Yes |

**Key Point:** Database and share replication work on ALL editions. Full failover capabilities require Business Critical or higher.

---

## 2. Replicated Objects

### 2.1 Account-Level Objects (Business Critical+)

Objects that can be included in replication/failover groups:
- **Users** - Including authentication methods
- **Roles** - Including role hierarchies and privilege grants
- **Warehouses** - Replicated in suspended state
- **Resource Monitors** - With quota schedules
- **Network Policies** - Including network rules
- **Integrations** - Security, API, Notification, Storage, External Access
- **Account Parameters** - Account-level settings

### 2.2 Database Objects

| Object Type | Replicated? | Notes |
|-------------|-------------|-------|
| Schemas | Yes | All schemas by default |
| Permanent Tables | Yes | Including data |
| Transient Tables | Yes | Including data |
| Temporary Tables | No | Session-specific |
| Dynamic Tables | Yes | Behavior varies by group type |
| Views | Yes | Including secure views |
| Materialized Views | Yes | Definition only, data rebuilt |
| Streams | Yes | Offset tracking replicated |
| Tasks | Yes | Must be resumed/executed first |
| Stored Procedures | Yes | |
| UDFs | Yes | |
| Stages | Yes | Failover groups only |
| Pipes | Yes | Failover groups only |
| File Formats | Yes | |
| Sequences | Yes | |
| Policies | Yes | Masking, row access, etc. |
| Tags | Yes | |

### 2.3 Objects NOT Replicated

- External tables
- Hybrid tables
- Interactive tables
- Event tables
- Temporary objects
- Databases created from shares (inbound shares)

---

## 3. Replication Configuration

### 3.1 Prerequisites

**Step 1: Enable Replication for Accounts**

An organization administrator must enable replication:

```sql
-- View accounts in organization
SHOW ACCOUNTS;

-- Enable replication for each account
SELECT SYSTEM$GLOBAL_ACCOUNT_SET_PARAMETER(
    '<organization_name>.<account_name>',
    'ENABLE_ACCOUNT_DATABASE_REPLICATION',
    'true'
);
```

### 3.2 Creating a Failover Group (Source Account)

```sql
-- Grant privilege to create failover groups
USE ROLE ACCOUNTADMIN;
CREATE ROLE replication_admin;
GRANT CREATE FAILOVER GROUP ON ACCOUNT TO ROLE replication_admin;

-- Create the failover group
USE ROLE replication_admin;
CREATE FAILOVER GROUP my_failover_group
    OBJECT_TYPES = USERS, ROLES, WAREHOUSES, RESOURCE MONITORS,
                   DATABASES, INTEGRATIONS, NETWORK POLICIES
    ALLOWED_DATABASES = db1, db2
    ALLOWED_INTEGRATION_TYPES = API INTEGRATIONS
    ALLOWED_ACCOUNTS = myorg.myaccount2, myorg.myaccount3
    REPLICATION_SCHEDULE = '10 MINUTE';
```

**Key Parameters:**
- `OBJECT_TYPES` - Account object types to replicate
- `ALLOWED_DATABASES` - Specific databases to include
- `ALLOWED_ACCOUNTS` - Target accounts for replication
- `REPLICATION_SCHEDULE` - Frequency of automatic refreshes

### 3.3 Creating Secondary Failover Group (Target Account)

```sql
-- In target account
USE ROLE ACCOUNTADMIN;
CREATE ROLE replication_admin;
GRANT CREATE FAILOVER GROUP ON ACCOUNT TO ROLE replication_admin;

-- Create replica of the source failover group
USE ROLE replication_admin;
CREATE FAILOVER GROUP my_failover_group
    AS REPLICA OF myorg.source_account.my_failover_group;
```

### 3.4 Replication Schedule

**Best Practice:** Use `REPLICATION_SCHEDULE` for automatic refreshes.

```sql
-- Using interval
REPLICATION_SCHEDULE = '10 MINUTE'

-- Using cron expression
REPLICATION_SCHEDULE = 'USING CRON 0 */2 * * * America/Los_Angeles'
```

**Schedule Behavior:**
- Initial refresh executes automatically when secondary group is created
- Next refresh scheduled based on interval from previous refresh start time
- Only one refresh executes at a time (no overlapping)
- If refresh takes longer than interval, next one starts when current completes

### 3.5 Manual Refresh

```sql
-- Grant REPLICATE privilege
GRANT REPLICATE ON FAILOVER GROUP my_failover_group
    TO ROLE my_replication_role;

-- Execute manual refresh
USE ROLE my_replication_role;
ALTER FAILOVER GROUP my_failover_group REFRESH;
```

---

## 4. Failover and Failback

### 4.1 Failover Process

**Failover** = Promoting a secondary account to serve as the primary (source) account.

**When to Failover:**
- Region or cloud platform outage
- Planned disaster recovery drills
- Account migration

**Failover Steps:**

```sql
-- 1. Sign into TARGET account
-- 2. List failover groups
SHOW FAILOVER GROUPS;

-- 3. Suspend scheduled refreshes (optional, prevents conflicts)
ALTER FAILOVER GROUP my_failover_group SUSPEND;

-- 4. Verify no refresh in progress
SELECT phase_name, start_time, job_uuid
FROM TABLE(INFORMATION_SCHEMA.REPLICATION_GROUP_REFRESH_HISTORY('my_failover_group'))
WHERE phase_name <> 'COMPLETED' AND phase_name <> 'CANCELED';

-- 5. Promote secondary to primary
ALTER FAILOVER GROUP my_failover_group PRIMARY;
```

**Important:** Cannot failover while refresh is in progress. Must wait for completion or cancel.

### 4.2 Failover Privileges

```sql
-- Grant FAILOVER privilege in target account
GRANT FAILOVER ON FAILOVER GROUP my_failover_group
    TO ROLE my_failover_role;
```

### 4.3 Failback Process

**Failback** = Returning operations to the original primary account after an outage is resolved.

**Steps:**
1. **Refresh** the failover group in the original account
2. **Failover** back to the original account (promote it to primary)
3. **Resume** scheduled replication in all target accounts
4. **Redirect** clients back to the original account

```sql
-- In original account (now secondary), refresh first
ALTER FAILOVER GROUP my_failover_group REFRESH;

-- Then promote back to primary
ALTER FAILOVER GROUP my_failover_group PRIMARY;

-- Resume scheduled refreshes in target accounts
ALTER FAILOVER GROUP my_failover_group RESUME;
```

### 4.4 Recovery Strategies

| Strategy | When to Use | Steps |
|----------|-------------|-------|
| **Reads First** | Short outages, minimal downtime needed | 1. Redirect clients to secondary<br>2. Failover if outage extends |
| **Writes First** | Need current data before reads | 1. Failover immediately<br>2. Reconcile data with ETL<br>3. Redirect clients |
| **Both Simultaneously** | Urgent access needed | 1. Redirect clients<br>2. Failover concurrently<br>3. Accept potentially stale reads |

---

## 5. Cross-Region and Cross-Cloud Replication

### 5.1 Region Support

- All Snowflake regions support replication
- Can replicate across regions within same **Region Group**
- Cross-region-group replication (e.g., commercial to government) requires Snowflake Support approval

### 5.2 Cross-Cloud Replication

Snowflake supports replication between different cloud platforms:
- AWS <-> Azure
- AWS <-> GCP
- Azure <-> GCP

**Use Cases:**
- Multi-cloud strategy
- Cloud migration
- Geographic data distribution

### 5.3 Data Transfer Costs

**Replication Costs Include:**
- **Data Transfer** - Moving data between regions/clouds
- **Compute** - Resources for refresh operations

```sql
-- Monitor replication costs
SELECT * FROM SNOWFLAKE.ACCOUNT_USAGE.REPLICATION_GROUP_USAGE_HISTORY
WHERE REPLICATION_GROUP_NAME = 'MY_FAILOVER_GROUP';
```

---

## 6. Client Redirect

### 6.1 Purpose

Client Redirect provides a **connection URL** that can redirect Snowflake clients to different accounts during failover.

### 6.2 How It Works

1. Create a **connection** object with a URL
2. Clients connect using the connection URL
3. During failover, update the connection to point to the new primary
4. Clients automatically connect to the correct account

### 6.3 Benefits

- Seamless failover for client applications
- No application code changes needed
- Automatic redirection during disaster recovery

---

## 7. Monitoring Replication

### 7.1 Key Views and Functions

```sql
-- Show all failover groups
SHOW FAILOVER GROUPS;

-- Show databases in a failover group
SHOW DATABASES IN FAILOVER GROUP my_failover_group;

-- Check refresh history
SELECT * FROM TABLE(INFORMATION_SCHEMA.REPLICATION_GROUP_REFRESH_HISTORY('my_failover_group'));

-- Check refresh progress
SELECT * FROM TABLE(INFORMATION_SCHEMA.REPLICATION_GROUP_REFRESH_PROGRESS('my_failover_group'));

-- Monitor replication usage
SELECT * FROM SNOWFLAKE.ACCOUNT_USAGE.REPLICATION_GROUP_USAGE_HISTORY;
```

### 7.2 Refresh Phases

| Phase | Description |
|-------|-------------|
| SECONDARY_UPLOADING_INVENTORY | Uploading metadata to primary |
| PRIMARY_UPLOADING_METADATA | Primary preparing metadata |
| PRIMARY_UPLOADING_DATA | Primary preparing data |
| SECONDARY_DOWNLOADING_METADATA | Downloading metadata to secondary |
| SECONDARY_DOWNLOADING_DATA | Downloading data to secondary |
| COMPLETED | Refresh finished successfully |
| CANCELED | Refresh was canceled |

---

## 8. Important Considerations

### 8.1 Secondary Objects Are Read-Only

- All replicated objects in target accounts are **read-only**
- Cannot create/modify users, roles, etc. if those types are replicated
- New local databases/shares CAN be created in target accounts

### 8.2 Time Travel and Fail-safe

- Time Travel data is **NOT replicated**
- Historical data maintained independently per account
- Data retention period starts fresh in secondary after refresh

### 8.3 Replication Lag

- Secondary objects lag behind primary based on refresh schedule
- Maximum lag = **2x refresh interval** during normal operations
- Example: 30-minute schedule = up to 60-minute lag during outage

### 8.4 Constraints

- An object can only be in **one failover group**
- An object can be in multiple replication groups if targeting different accounts
- Cannot be in both replication AND failover group
- Secondary objects cannot be added to primary groups

---

## 9. Exam Tips and Common Question Patterns

### 9.1 High-Frequency Topics

1. **Edition Requirements**
   - Know which features require Business Critical
   - Database/share replication = All editions
   - Failover/failback = Business Critical+

2. **Primary vs Secondary**
   - Primary = read-write (source)
   - Secondary = read-only (replica)
   - Promotion changes secondary to primary

3. **Replication Groups vs Failover Groups**
   - Replication groups = read-only replicas
   - Failover groups = can be promoted to primary

4. **Objects NOT Replicated**
   - External tables
   - Temporary tables
   - Databases from inbound shares

### 9.2 Common Exam Scenarios

**Scenario 1:** "What edition is required for database replication?"
- **Answer:** All editions (Standard and above)

**Scenario 2:** "What edition is required for failover capability?"
- **Answer:** Business Critical or higher

**Scenario 3:** "Can you modify data in a secondary database?"
- **Answer:** No, secondary databases are read-only

**Scenario 4:** "How do you promote a secondary to primary?"
- **Answer:** `ALTER FAILOVER GROUP <name> PRIMARY` executed in target account

**Scenario 5:** "What happens to Time Travel data during replication?"
- **Answer:** It is NOT replicated; each account maintains independent Time Travel

### 9.3 Key SQL Commands to Remember

```sql
-- Create failover group (source)
CREATE FAILOVER GROUP <name>
    OBJECT_TYPES = ...
    ALLOWED_DATABASES = ...
    ALLOWED_ACCOUNTS = ...
    REPLICATION_SCHEDULE = ...;

-- Create secondary (target)
CREATE FAILOVER GROUP <name>
    AS REPLICA OF <org>.<account>.<group_name>;

-- Manual refresh
ALTER FAILOVER GROUP <name> REFRESH;

-- Promote to primary
ALTER FAILOVER GROUP <name> PRIMARY;

-- Suspend/Resume
ALTER FAILOVER GROUP <name> SUSPEND;
ALTER FAILOVER GROUP <name> RESUME;
```

### 9.4 Privilege Requirements

| Action | Privilege Needed |
|--------|-----------------|
| Create failover group | CREATE FAILOVER GROUP (on account) |
| Refresh secondary | REPLICATE (on group) |
| Promote to primary | FAILOVER (on group) |
| Modify group | MODIFY (on group) |
| View group details | MONITOR (on group) |

---

## 10. Quick Reference Card

### Objects Replicated Automatically with Database
- Tables (permanent, transient)
- Views (standard, materialized, secure)
- Schemas
- Stored procedures
- UDFs
- File formats
- Sequences
- Policies (masking, row access, etc.)

### Objects Requiring Specific Configuration
- Stages and Pipes (failover groups only)
- Integrations (must specify types)
- Network policies (Business Critical+)

### Objects NEVER Replicated
- External tables
- Hybrid tables
- Temporary tables
- Event tables
- Inbound shares

### Key Timing Considerations
- Initial refresh = automatic on secondary creation
- Scheduled refresh = based on REPLICATION_SCHEDULE
- Maximum lag = 2x refresh interval
- Failover blocked during active refresh

---

## Summary

Database replication is Snowflake's solution for business continuity and disaster recovery. Key points:

1. **Two approaches:** Replication groups (read-only) and Failover groups (can promote)
2. **Edition matters:** Full failover requires Business Critical+
3. **Cross-region/cloud:** Fully supported within same organization
4. **Secondary = Read-only:** Until promoted to primary
5. **Schedule wisely:** Balance freshness vs. cost
6. **Time Travel separate:** Each account maintains independently

Understanding these concepts is essential for the SnowPro Core exam, particularly for questions about disaster recovery, business continuity, and data protection strategies.
