# Domain 6: Data Protection & Sharing
## Part 12: Failover and Failback

**Exam Weight: 5-10%**

---

## Table of Contents
1. [Business Continuity Overview](#business-continuity-overview)
2. [Replication Groups vs Failover Groups](#replication-groups-vs-failover-groups)
3. [Failover Group Configuration](#failover-group-configuration)
4. [RPO and RTO Considerations](#rpo-and-rto-considerations)
5. [Planned Failover Process](#planned-failover-process)
6. [Unplanned Failover Process](#unplanned-failover-process)
7. [Client Redirect](#client-redirect)
8. [Failback Process](#failback-process)
9. [Monitoring Replication and Failover](#monitoring-replication-and-failover)
10. [Exam Tips and Common Question Patterns](#exam-tips-and-common-question-patterns)

---

## Business Continuity Overview

Snowflake's business continuity and disaster recovery (BCDR) capabilities enable organizations to maintain operations during regional outages, planned maintenance, or cloud platform issues.

### Key Concepts

| Feature | Description | Edition Required |
|---------|-------------|------------------|
| **Database Replication** | Replicate databases across accounts | All Editions |
| **Share Replication** | Replicate shares across accounts | All Editions |
| **Account Object Replication** | Replicate users, roles, warehouses, etc. | Business Critical |
| **Failover Groups** | Enable failover of replicated objects | Business Critical |
| **Client Redirect** | Redirect client connections | Business Critical |

### BCDR Architecture

```
+------------------------------------------------------------------+
|                     BUSINESS CONTINUITY ARCHITECTURE              |
+------------------------------------------------------------------+
|                                                                   |
|   SOURCE ACCOUNT (Region A)          TARGET ACCOUNT (Region B)   |
|   +------------------------+         +------------------------+   |
|   |                        |         |                        |   |
|   |   PRIMARY              |  Async  |   SECONDARY            |   |
|   |   FAILOVER GROUP       | ------> |   FAILOVER GROUP       |   |
|   |   (Read-Write)         | Repl.   |   (Read-Only)          |   |
|   |                        |         |                        |   |
|   |   - Databases          |         |   - Databases          |   |
|   |   - Users              |         |   - Users              |   |
|   |   - Roles              |         |   - Roles              |   |
|   |   - Warehouses         |         |   - Warehouses         |   |
|   |                        |         |                        |   |
|   +------------------------+         +------------------------+   |
|            |                                   ^                  |
|            |        FAILOVER (Promotion)       |                  |
|            +-----------------------------------+                  |
|                                                                   |
|   CLIENT REDIRECT                                                 |
|   +----------------------------------------------------------+   |
|   | Connection URL: org-connection.snowflakecomputing.com    |   |
|   | Resolves to: Currently active primary account            |   |
|   +----------------------------------------------------------+   |
|                                                                   |
+------------------------------------------------------------------+
```

### Supported Scenarios

1. **Planned Failovers**: Disaster recovery drills to test preparedness
2. **Unplanned Failovers**: Response to regional outages or cloud platform issues
3. **Account Migration**: Move accounts to different regions/cloud platforms
4. **Multiple Readable Secondaries**: Mitigate risk of multiple region outages

---

## Replication Groups vs Failover Groups

### Key Differences

| Aspect | Replication Group | Failover Group |
|--------|-------------------|----------------|
| **Purpose** | Replicate objects with point-in-time consistency | Replicate AND enable failover |
| **Access on Secondary** | Read-only | Read-only until promoted |
| **Failover Capability** | No | Yes |
| **Edition Required** | Standard (DB/Share only) | Business Critical |
| **Use Case** | Data distribution | Disaster recovery |

### Replication Group

A **replication group** is a defined collection of objects that are replicated as a unit to one or more target accounts. Secondary replicas provide **read-only access**.

```sql
-- Create a replication group (Standard Edition+)
CREATE REPLICATION GROUP my_rg
  OBJECT_TYPES = DATABASES
  ALLOWED_DATABASES = db1, db2
  ALLOWED_ACCOUNTS = myorg.myaccount2
  REPLICATION_SCHEDULE = '10 MINUTE';
```

### Failover Group

A **failover group** is a replication group that can also **fail over**. When a secondary failover group is promoted, it becomes the new primary with read-write access.

```sql
-- Create a failover group (Business Critical+)
CREATE FAILOVER GROUP my_fg
  OBJECT_TYPES = USERS, ROLES, WAREHOUSES, RESOURCE MONITORS, DATABASES
  ALLOWED_DATABASES = db1, db2
  ALLOWED_ACCOUNTS = myorg.myaccount2
  REPLICATION_SCHEDULE = '10 MINUTE';
```

### Replicated Objects

| Object Type | Replication Group | Failover Group | Notes |
|-------------|-------------------|----------------|-------|
| Databases | All Editions | Business Critical | Core data replication |
| Shares | All Editions | Business Critical | Outbound shares only |
| Users | Business Critical | Business Critical | Including authentication |
| Roles | Business Critical | Business Critical | Including hierarchies |
| Warehouses | Business Critical | Business Critical | Replicated in suspended state |
| Resource Monitors | Business Critical | Business Critical | Including quotas |
| Network Policies | Business Critical | Business Critical | Security controls |
| Integrations | Business Critical | Business Critical | API, Security, Storage |
| Parameters | Business Critical | Business Critical | Account-level parameters |

---

## Failover Group Configuration

### Prerequisites

1. Enable replication for accounts in the same organization
2. Accounts must be in different regions
3. Business Critical Edition (or higher) required for failover groups
4. Organization administrator must enable replication

### Step-by-Step Configuration

#### Step 1: Enable Replication for Accounts

```sql
-- Execute as Organization Administrator
SHOW ACCOUNTS;

-- Enable replication for each account
SELECT SYSTEM$GLOBAL_ACCOUNT_SET_PARAMETER(
  'myorg.myaccount1',
  'ENABLE_ACCOUNT_DATABASE_REPLICATION',
  'true'
);

SELECT SYSTEM$GLOBAL_ACCOUNT_SET_PARAMETER(
  'myorg.myaccount2',
  'ENABLE_ACCOUNT_DATABASE_REPLICATION',
  'true'
);
```

#### Step 2: Create Primary Failover Group (Source Account)

```sql
-- On source account
USE ROLE ACCOUNTADMIN;

-- Create role for managing failover groups (optional)
CREATE ROLE failover_admin;
GRANT CREATE FAILOVER GROUP ON ACCOUNT TO ROLE failover_admin;

-- Create the primary failover group
CREATE FAILOVER GROUP production_fg
  OBJECT_TYPES = USERS, ROLES, WAREHOUSES, DATABASES, INTEGRATIONS
  ALLOWED_DATABASES = prod_db, analytics_db
  ALLOWED_INTEGRATION_TYPES = API INTEGRATIONS
  ALLOWED_ACCOUNTS = myorg.myaccount2, myorg.myaccount3
  REPLICATION_SCHEDULE = '10 MINUTE';
```

#### Step 3: Create Secondary Failover Group (Target Account)

```sql
-- On target account
USE ROLE ACCOUNTADMIN;

-- Create secondary failover group as replica of primary
CREATE FAILOVER GROUP production_fg
  AS REPLICA OF myorg.myaccount1.production_fg;
```

#### Step 4: Grant Necessary Privileges

```sql
-- On both accounts
-- Grant REPLICATE privilege (for refresh operations)
GRANT REPLICATE ON FAILOVER GROUP production_fg TO ROLE failover_admin;

-- Grant FAILOVER privilege (for promoting to primary)
GRANT FAILOVER ON FAILOVER GROUP production_fg TO ROLE failover_admin;
```

### Replication Schedule Options

```sql
-- Interval-based schedule
REPLICATION_SCHEDULE = '10 MINUTE'  -- Every 10 minutes

-- Cron-based schedule
REPLICATION_SCHEDULE = 'USING CRON 0 */2 * * * America/Los_Angeles'  -- Every 2 hours
```

### Viewing Failover Groups

```sql
-- View all failover groups linked to the account
SHOW FAILOVER GROUPS;

-- View databases in a failover group
SHOW DATABASES IN FAILOVER GROUP production_fg;

-- View shares in a failover group
SHOW SHARES IN FAILOVER GROUP production_fg;
```

---

## RPO and RTO Considerations

### Recovery Point Objective (RPO)

**RPO** defines the maximum acceptable amount of data loss measured in time.

```
+------------------------------------------------------------------+
|                    RPO CALCULATION                                |
+------------------------------------------------------------------+
|                                                                   |
|   Timeline:                                                       |
|                                                                   |
|   Last Refresh    Current Time    Outage Occurs                  |
|       |              |                |                           |
|   ----+--------------|----------------+------>                   |
|       |<-- Refresh Interval -->|                                 |
|                                |<--- Potential Data Loss         |
|                                                                   |
|   Formula:                                                        |
|   Maximum RPO = 2 x Replication Interval                         |
|                                                                   |
|   Example:                                                        |
|   - Replication every 30 minutes                                 |
|   - Maximum data loss = 60 minutes (worst case)                  |
|                                                                   |
+------------------------------------------------------------------+
```

**Key Points**:
- Secondary replicas lag behind primary by the replication schedule
- Maximum lag = 2x the replication interval
- Shorter intervals = Lower RPO but higher cost

### Recovery Time Objective (RTO)

**RTO** defines the maximum acceptable downtime before business operations must resume.

**Factors Affecting RTO**:
1. Time to detect the outage
2. Time to make failover decision
3. Time to execute failover commands
4. Time for DNS propagation (Client Redirect)
5. Time to validate and resume operations

### RPO/RTO Planning Matrix

| Replication Interval | Maximum RPO | Typical RTO | Cost Impact |
|---------------------|-------------|-------------|-------------|
| 1 minute | 2 minutes | Minutes | High |
| 10 minutes | 20 minutes | Minutes | Medium |
| 30 minutes | 60 minutes | Minutes | Low |
| 1 hour | 2 hours | Minutes | Low |

### Best Practices for RPO/RTO

1. **Choose replication interval based on business requirements**
2. **Document failover procedures and test regularly**
3. **Monitor replication lag continuously**
4. **Automate detection and alerting**
5. **Practice failover drills to measure actual RTO**

---

## Planned Failover Process

Planned failovers are used for:
- Disaster recovery drills
- Maintenance windows
- Account migrations
- Testing BCDR procedures

### Pre-Failover Checklist

1. Verify replication is up-to-date
2. Suspend scheduled replication (optional)
3. Confirm target account is ready
4. Notify stakeholders
5. Document current state

### Failover Steps

#### Using Snowsight (Recommended for Bulk Failover)

1. Sign in to Snowsight using the **target account**
2. Navigate to **Admin > Accounts**
3. Select **Replication** > **Initiate Failover**
4. Select failover groups to promote
5. Select connections to promote
6. Confirm and execute failover

#### Using SQL

```sql
-- On TARGET account (the account you want to promote)

-- Step 1: View failover groups
SHOW FAILOVER GROUPS;

-- Step 2: Suspend scheduled replication (optional but recommended)
ALTER FAILOVER GROUP production_fg SUSPEND;

-- Step 3: Verify no refresh is in progress
SELECT phase_name, start_time, job_uuid
FROM TABLE(INFORMATION_SCHEMA.REPLICATION_GROUP_REFRESH_HISTORY('production_fg'))
WHERE phase_name <> 'COMPLETED' AND phase_name <> 'CANCELED';

-- Step 4: Promote secondary to primary
ALTER FAILOVER GROUP production_fg PRIMARY;

-- Step 5: Verify promotion
SHOW FAILOVER GROUPS;
```

### Post-Failover Tasks

1. **Resume replication on new secondary accounts**
```sql
-- On each account that is now a secondary
ALTER FAILOVER GROUP production_fg RESUME;
```

2. **Update Client Redirect (if using)**
```sql
-- Promote connection to new primary
ALTER CONNECTION myconnection PRIMARY;
```

3. **Reopen Snowpipe Streaming channels (if applicable)**
4. **Update ETL pipelines to point to new primary**
5. **Validate data integrity**

---

## Unplanned Failover Process

Unplanned failovers occur in response to:
- Regional outages
- Cloud platform failures
- Network issues
- Unexpected service disruptions

### Recovery Priority Options

#### Option 1: Prioritize Reads First

Best for: Short-term outages where read access is critical

```
Sequence:
1. Redirect clients to secondary (read-only)
2. Wait for outage resolution or escalate to writes
3. Promote secondary if extended outage
```

```sql
-- Step 1: Redirect clients immediately
ALTER CONNECTION myconnection PRIMARY;

-- Step 2: If outage persists, promote failover group
ALTER FAILOVER GROUP production_fg PRIMARY;
```

#### Option 2: Prioritize Writes First

Best for: Data integrity is paramount, can tolerate brief downtime

```
Sequence:
1. Promote secondary failover group to primary
2. Resume ETL pipelines on new primary
3. Reconcile any missing data
4. Redirect clients
```

```sql
-- Step 1: Promote failover group
ALTER FAILOVER GROUP production_fg PRIMARY;

-- Step 2: Resume data pipelines
-- (ETL-specific commands)

-- Step 3: Redirect clients after data reconciliation
ALTER CONNECTION myconnection PRIMARY;
```

#### Option 3: Prioritize Both Simultaneously

Best for: Immediate access needed with acceptable stale data

```
Sequence:
1. Redirect clients (accepts potentially stale data)
2. Promote failover group simultaneously
3. Reconcile data as it arrives
```

### Handling Refresh In Progress

If a refresh is in progress when failover is needed:

```sql
-- Check refresh status
SELECT phase_name, start_time, job_uuid
FROM TABLE(INFORMATION_SCHEMA.REPLICATION_GROUP_REFRESH_HISTORY('production_fg'))
WHERE phase_name <> 'COMPLETED' AND phase_name <> 'CANCELED';

-- Option A: Wait for refresh to complete (recommended for data consistency)
-- Option B: Cancel refresh and failover immediately
ALTER FAILOVER GROUP production_fg SUSPEND IMMEDIATE;

-- Then proceed with failover
ALTER FAILOVER GROUP production_fg PRIMARY;
```

**Warning**: Canceling during `SECONDARY_DOWNLOADING_METADATA` or `SECONDARY_DOWNLOADING_DATA` phases may result in inconsistent state.

---

## Client Redirect

Client Redirect enables seamless redirection of client connections without changing application configuration.

### Connection Object Architecture

```
+------------------------------------------------------------------+
|                    CLIENT REDIRECT FLOW                           |
+------------------------------------------------------------------+
|                                                                   |
|   Application Connection String:                                  |
|   organization_name-connection_name.snowflakecomputing.com       |
|                                                                   |
|                          |                                        |
|                          v                                        |
|   +--------------------------------------------------+           |
|   |           SNOWFLAKE DNS RESOLUTION               |           |
|   +--------------------------------------------------+           |
|                          |                                        |
|              +-----------+-----------+                            |
|              |                       |                            |
|              v                       v                            |
|   +-------------------+   +-------------------+                   |
|   | PRIMARY           |   | SECONDARY         |                   |
|   | CONNECTION        |   | CONNECTION        |                   |
|   | (Account 1)       |   | (Account 2)       |                   |
|   +-------------------+   +-------------------+                   |
|                                                                   |
|   On Failover: Secondary promoted to Primary                     |
|   DNS automatically resolves to new primary account              |
|                                                                   |
+------------------------------------------------------------------+
```

### Configuring Client Redirect

#### Step 1: Create Primary Connection (Source Account)

```sql
-- On source account
CREATE CONNECTION myconnection;

-- Enable failover to specific accounts
ALTER CONNECTION myconnection
  ENABLE FAILOVER TO ACCOUNTS myorg.myaccount2, myorg.myaccount3;

-- View connection details
SHOW CONNECTIONS;
```

#### Step 2: Create Secondary Connection (Target Accounts)

```sql
-- On each target account
CREATE CONNECTION myconnection
  AS REPLICA OF myorg.myaccount1.myconnection;
```

#### Step 3: Configure Client Applications

Update applications to use the connection URL:

```
# Connection URL format
organization_name-connection_name.snowflakecomputing.com

# Example
myorg-myconnection.snowflakecomputing.com

# For Private Connectivity
myorg-myconnection.privatelink.snowflakecomputing.com
```

### Supported Clients

| Client | Configuration |
|--------|--------------|
| Snowsight | Use `organization-connection` as account name |
| SnowSQL | `accountname = myorg-myconnection` |
| Python Connector | `account = 'myorg-myconnection'` |
| JDBC | `jdbc:snowflake://myorg-myconnection.snowflakecomputing.com/` |
| ODBC | `SERVER = myorg-myconnection.snowflakecomputing.com` |
| Snowpark | `account: "myorg-myconnection"` |

### Failing Over Client Connections

```sql
-- On target account to redirect connections
ALTER CONNECTION myconnection PRIMARY;
```

---

## Failback Process

Failback returns operations to the original primary account after an outage is resolved.

### Failback Steps

```sql
-- Step 1: Refresh the original account (now secondary)
ALTER FAILOVER GROUP production_fg REFRESH;

-- Step 2: Verify data is synchronized
SELECT phase_name, start_time, end_time
FROM TABLE(INFORMATION_SCHEMA.REPLICATION_GROUP_REFRESH_PROGRESS('production_fg'));

-- Step 3: Promote original account back to primary
-- (Execute on original account)
ALTER FAILOVER GROUP production_fg PRIMARY;

-- Step 4: Redirect client connections back
ALTER CONNECTION myconnection PRIMARY;

-- Step 5: Resume scheduled replication on new secondary
-- (Execute on DR account)
ALTER FAILOVER GROUP production_fg RESUME;
```

### Failback Diagram

```
+------------------------------------------------------------------+
|                     FAILBACK SEQUENCE                             |
+------------------------------------------------------------------+
|                                                                   |
|   DURING OUTAGE:                                                  |
|   Account 1 (Original Primary)    Account 2 (DR Site)            |
|   [UNAVAILABLE]                   [PRIMARY - Active]             |
|                                                                   |
|   OUTAGE RESOLVED:                                                |
|   Account 1                       Account 2                       |
|   [SECONDARY]  <-- Refresh --    [PRIMARY - Active]              |
|                                                                   |
|   FAILBACK COMPLETE:                                              |
|   Account 1                       Account 2                       |
|   [PRIMARY - Active]              [SECONDARY]                     |
|                                                                   |
+------------------------------------------------------------------+
```

---

## Monitoring Replication and Failover

### Key Monitoring Functions

#### View Refresh Progress

```sql
-- Current refresh progress
SELECT phase_name, start_time, end_time
FROM TABLE(INFORMATION_SCHEMA.REPLICATION_GROUP_REFRESH_PROGRESS('production_fg'));

-- Historical refresh information
SELECT *
FROM TABLE(INFORMATION_SCHEMA.REPLICATION_GROUP_REFRESH_HISTORY('production_fg'));
```

### Refresh Phases

| Phase | Description |
|-------|-------------|
| `SECONDARY_SYNCHRONIZING_MEMBERSHIP` | Syncing group membership |
| `SECONDARY_UPLOADING_INVENTORY` | Uploading inventory to primary |
| `PRIMARY_UPLOADING_METADATA` | Primary uploading metadata |
| `PRIMARY_UPLOADING_DATA` | Primary uploading data changes |
| `SECONDARY_DOWNLOADING_METADATA` | Secondary downloading metadata |
| `SECONDARY_DOWNLOADING_DATA` | Secondary downloading data |
| `COMPLETED` | Refresh completed successfully |
| `CANCELED` | Refresh was canceled |

### Replication Lag Monitoring

```sql
-- Check replication lag
SELECT
  TIMESTAMPDIFF(MINUTE,
    MAX(CASE WHEN phase_name = 'COMPLETED' THEN end_time END),
    CURRENT_TIMESTAMP()
  ) AS minutes_since_last_refresh
FROM TABLE(INFORMATION_SCHEMA.REPLICATION_GROUP_REFRESH_HISTORY('production_fg'));
```

### Error Notifications

Configure error notifications for replication failures:

```sql
-- Create notification integration
CREATE NOTIFICATION INTEGRATION replication_alerts
  TYPE = EMAIL
  ENABLED = TRUE
  ALLOWED_RECIPIENTS = ('admin@company.com');

-- Alert on replication failures
CREATE ALERT replication_failure_alert
  WAREHOUSE = alert_wh
  SCHEDULE = '1 MINUTE'
  IF (EXISTS (
    SELECT 1 FROM TABLE(INFORMATION_SCHEMA.REPLICATION_GROUP_REFRESH_HISTORY('production_fg'))
    WHERE phase_name = 'FAILED' AND start_time > DATEADD('HOUR', -1, CURRENT_TIMESTAMP())
  ))
  THEN CALL SYSTEM$SEND_EMAIL(...);
```

---

## Exam Tips and Common Question Patterns

### High-Frequency Topics

1. **Edition Requirements**
   - Database/Share replication: All editions
   - Failover groups: Business Critical or higher
   - Client Redirect: Business Critical or higher

2. **Replication vs Failover Groups**
   - Replication groups: Read-only replicas
   - Failover groups: Can be promoted to primary

3. **RPO Calculation**
   - Maximum RPO = 2x replication interval
   - Shorter intervals = Lower RPO, higher cost

4. **Primary vs Secondary**
   - Primary: Read-write
   - Secondary: Read-only until promoted

### Common Question Patterns

**Pattern 1: Edition Requirements**

Q: "Which Snowflake edition is required for failover groups?"
A: Business Critical Edition (or higher)

Q: "Can Standard Edition accounts use database replication?"
A: Yes, database and share replication are available to all editions

**Pattern 2: RPO Scenarios**

Q: "With a 15-minute replication schedule, what is the maximum potential data loss?"
A: 30 minutes (2x the replication interval)

**Pattern 3: Failover Process**

Q: "What happens to secondary failover groups after a failover?"
A: Scheduled refreshes are suspended and must be manually resumed

Q: "Which command promotes a secondary failover group to primary?"
A: `ALTER FAILOVER GROUP <name> PRIMARY;`

**Pattern 4: Client Redirect**

Q: "What is the purpose of Client Redirect?"
A: Enables seamless redirection of client connections without changing application configuration

Q: "Do secondary connections need to have the same name as the primary?"
A: Yes, the connection name must match across all accounts

**Pattern 5: Read vs Write Recovery**

Q: "During an outage, how can you provide read-only access quickly?"
A: Use Client Redirect to point to the secondary account (which has read-only replicas)

### Key Facts to Memorize

| Fact | Value/Answer |
|------|--------------|
| Maximum RPO formula | 2x replication interval |
| Minimum edition for failover groups | Business Critical |
| Command to promote secondary | `ALTER FAILOVER GROUP <name> PRIMARY;` |
| Secondary failover group access | Read-only until promoted |
| Replication schedule types | Interval-based or Cron-based |
| Accounts must be in | Different regions |
| Connection URL format | `org-connection.snowflakecomputing.com` |

### Memorization Tips

**FAILOVER Mnemonic**: "Failover Always Involves Linking Organizational Versions, Enabling Recovery"
- **F**ailover groups
- **A**cross regions
- **I**n same organization
- **L**ink primary and secondary
- **O**bjects replicated
- **V**ia scheduled refresh
- **E**nable with Business Critical
- **R**ecovery point/time objectives

**RPO Rule**: "Double the interval for worst-case scenario"

**Edition Rule**: "Free replication, paid failover" (Database replication = all editions; Failover = Business Critical+)

### Practice Scenario Questions

1. **Scenario**: Your company requires maximum 10 minutes of data loss during a disaster. What replication schedule should you configure?
   - **Answer**: 5-minute replication schedule (RPO = 2 x 5 = 10 minutes)

2. **Scenario**: During a planned failover drill, the ALTER FAILOVER GROUP PRIMARY command fails. What should you check?
   - **Answer**: Check if a refresh operation is in progress; wait for completion or suspend/cancel it

3. **Scenario**: You need to redirect client applications to a DR account during an outage. What's the fastest approach?
   - **Answer**: Use Client Redirect with `ALTER CONNECTION <name> PRIMARY;` on the target account

4. **Scenario**: After promoting a failover group, scheduled refreshes have stopped on other secondary accounts. What command restores them?
   - **Answer**: `ALTER FAILOVER GROUP <name> RESUME;` on each secondary account

---

## Quick Reference Card

### Essential Commands

| Operation | Command |
|-----------|---------|
| Create failover group | `CREATE FAILOVER GROUP <name> OBJECT_TYPES = ... ALLOWED_ACCOUNTS = ...` |
| Create secondary | `CREATE FAILOVER GROUP <name> AS REPLICA OF <org.account.group>` |
| Manual refresh | `ALTER FAILOVER GROUP <name> REFRESH` |
| Promote to primary | `ALTER FAILOVER GROUP <name> PRIMARY` |
| Suspend replication | `ALTER FAILOVER GROUP <name> SUSPEND` |
| Resume replication | `ALTER FAILOVER GROUP <name> RESUME` |
| View groups | `SHOW FAILOVER GROUPS` |
| Create connection | `CREATE CONNECTION <name>` |
| Enable failover | `ALTER CONNECTION <name> ENABLE FAILOVER TO ACCOUNTS ...` |
| Redirect connection | `ALTER CONNECTION <name> PRIMARY` |

### Required Privileges

| Action | Required Privilege |
|--------|-------------------|
| Create failover group | CREATE FAILOVER GROUP |
| Refresh secondary | REPLICATE on the group |
| Promote to primary | FAILOVER on the group |
| Create connection | ACCOUNTADMIN role |

### Replicated Objects (Business Critical+)

- Databases
- Users
- Roles (including hierarchies)
- Warehouses (suspended state)
- Resource monitors
- Network policies
- Integrations (Security, API, Storage)
- Account parameters
- Shares (outbound only)

---

*Last Updated: January 2025*
*Based on Official Snowflake Documentation*
