# Domain 1: Resource Monitors and Cost Management

**SnowPro Core (COF-C02) Study Guide** | **Exam Weight: Part of 25-30%**

---

## Table of Contents

1. [Overview of Cost Management](#1-overview-of-cost-management)
2. [Resource Monitors Fundamentals](#2-resource-monitors-fundamentals)
3. [Resource Monitor Properties](#3-resource-monitor-properties)
4. [Threshold Actions (Triggers)](#4-threshold-actions-triggers)
5. [Creating Resource Monitors](#5-creating-resource-monitors)
6. [Resource Monitor Assignment](#6-resource-monitor-assignment)
7. [Budgets vs Resource Monitors](#7-budgets-vs-resource-monitors)
8. [Cost Controls for Warehouses](#8-cost-controls-for-warehouses)
9. [Cloud Services Billing](#9-cloud-services-billing)
10. [Exam Tips and Common Patterns](#10-exam-tips-and-common-patterns)
11. [Quick Reference](#11-quick-reference)

---

## 1. Overview of Cost Management

### 1.1 Cost Management Framework

Snowflake's cost management framework consists of three pillars:

| Pillar | Description | Tools |
|--------|-------------|-------|
| **Visibility** | Understanding where costs come from | Account Usage views, Cost Explorer, Budgets dashboard |
| **Control** | Setting limits and receiving alerts | Resource Monitors, Budgets, Access Controls |
| **Optimization** | Reducing unnecessary spending | Warehouse sizing, auto-suspend, query optimization |

### 1.2 What Consumes Credits?

| Credit Consumer | Type | Cost Control Method |
|-----------------|------|---------------------|
| Virtual Warehouses | User-managed compute | Resource Monitors, Budgets |
| Serverless Features | Snowflake-managed | Budgets only |
| Cloud Services | Metadata operations | 10% daily adjustment |

**Key Insight:** Resource monitors can only control **user-managed virtual warehouses**, not serverless features.

---

## 2. Resource Monitors Fundamentals

### 2.1 What is a Resource Monitor?

A **resource monitor** is a first-class Snowflake object that:
- Tracks credit usage by virtual warehouses
- Sets credit quotas (spending limits)
- Triggers actions when thresholds are reached
- Sends notifications and/or suspends warehouses

### 2.2 Key Characteristics

| Characteristic | Detail |
|----------------|--------|
| **Scope** | Monitors user-managed virtual warehouses only |
| **Cannot Monitor** | Serverless features (Snowpipe, Search Optimization, etc.) |
| **Creation Privilege** | Only ACCOUNTADMIN can create resource monitors |
| **Assignment Limit** | Each warehouse can be assigned to only ONE resource monitor |
| **Maximum Warehouses** | A resource monitor can monitor up to 500 warehouses |

### 2.3 Types of Resource Monitors

| Type | Description | Scope |
|------|-------------|-------|
| **Account-level** | Monitors all warehouses in the account | Set via ALTER ACCOUNT |
| **Warehouse-level** | Monitors specific assigned warehouses | Set via ALTER WAREHOUSE |

**Important:** An account-level resource monitor does NOT override warehouse-level monitors. If either reaches its threshold with a suspend action, the warehouse is suspended.

---

## 3. Resource Monitor Properties

### 3.1 Credit Quota

The **credit quota** specifies the number of Snowflake credits allocated to the monitor for a specified interval.

```sql
CREATE RESOURCE MONITOR my_monitor
  WITH CREDIT_QUOTA = 1000;  -- 1000 credits per interval
```

**Key Points:**
- Any positive number can be specified
- Quota accounts for BOTH warehouse credits AND cloud services credits
- Resource monitor limits do NOT apply the daily 10% cloud services adjustment
- When quota is reached, the defined actions are triggered

### 3.2 Schedule Properties

| Property | Description | Default |
|----------|-------------|---------|
| **FREQUENCY** | Reset interval | MONTHLY |
| **START_TIMESTAMP** | When monitoring begins | Immediately |
| **END_TIMESTAMP** | When monitoring ends | Never (continuous) |

**Frequency Options:**
- MONTHLY (default)
- DAILY
- WEEKLY
- YEARLY
- NEVER (credits never reset)

```sql
CREATE RESOURCE MONITOR quarterly_budget
  WITH CREDIT_QUOTA = 5000
       FREQUENCY = MONTHLY
       START_TIMESTAMP = IMMEDIATELY
       TRIGGERS ON 100 PERCENT DO SUSPEND;
```

### 3.3 Schedule Behavior

| Aspect | Behavior |
|--------|----------|
| **Reset Time** | Always 12:00 AM UTC |
| **Monthly Frequency** | Resets on same day each month (e.g., 15th) |
| **Month-End Dates** | If start is 31st, resets on last day of shorter months |
| **Custom Schedule** | Cannot revert to default (must drop and recreate) |

---

## 4. Threshold Actions (Triggers)

### 4.1 Available Actions

Resource monitors support three types of actions:

| Action | Behavior | Running Queries |
|--------|----------|-----------------|
| **NOTIFY** | Sends alert notification only | Continue running |
| **SUSPEND** | Sends notification + suspends warehouses | Allowed to complete |
| **SUSPEND_IMMEDIATE** | Sends notification + suspends immediately | Cancelled mid-execution |

### 4.2 Action Limits Per Monitor

| Action Type | Maximum Count |
|-------------|---------------|
| Suspend | 1 |
| Suspend Immediate | 1 |
| Notify | 5 |

### 4.3 Threshold Configuration

Thresholds are specified as percentages of the credit quota:

```sql
CREATE RESOURCE MONITOR limit1
  WITH CREDIT_QUOTA = 1000
  TRIGGERS
    ON 50 PERCENT DO NOTIFY
    ON 75 PERCENT DO NOTIFY
    ON 90 PERCENT DO SUSPEND
    ON 100 PERCENT DO SUSPEND_IMMEDIATE;
```

**Key Points:**
- Thresholds can exceed 100% (e.g., ON 110 PERCENT)
- A resource monitor MUST have at least one action defined
- Without actions, nothing happens when quota is reached

### 4.4 Notification Recipients

| Monitor Type | Notification Recipients |
|--------------|------------------------|
| **Account-level** | All account admins with notifications enabled + users in NOTIFY_USERS list |
| **Warehouse-level** | Account admin with OWNERSHIP privilege (if notifications enabled) |

**Enabling Notifications:**
1. Users must verify their email
2. Users must enable "notifications from resource monitors" in settings
3. Non-admins must be added to NOTIFY_USERS list

```sql
ALTER RESOURCE MONITOR my_monitor
  SET NOTIFY_USERS = (USER1, USER2, USER3);
```

---

## 5. Creating Resource Monitors

### 5.1 Required Privileges

| Action | Required Role |
|--------|---------------|
| Create resource monitor | ACCOUNTADMIN |
| Modify resource monitor | ACCOUNTADMIN or MODIFY privilege |
| View resource monitor | ACCOUNTADMIN, MONITOR, or MODIFY privilege |
| Assign to account | ACCOUNTADMIN |
| Assign to warehouse | ACCOUNTADMIN |

### 5.2 Basic Creation Examples

**Example 1: Simple monitor with suspend action**
```sql
CREATE OR REPLACE RESOURCE MONITOR limit1
  WITH CREDIT_QUOTA = 1000
  TRIGGERS ON 100 PERCENT DO SUSPEND;
```

**Example 2: Monitor with multiple thresholds**
```sql
CREATE OR REPLACE RESOURCE MONITOR limit1
  WITH CREDIT_QUOTA = 1000
  TRIGGERS
    ON 50 PERCENT DO NOTIFY
    ON 75 PERCENT DO NOTIFY
    ON 90 PERCENT DO SUSPEND
    ON 100 PERCENT DO SUSPEND_IMMEDIATE;
```

**Example 3: Monitor with custom schedule**
```sql
CREATE OR REPLACE RESOURCE MONITOR weekly_limit
  WITH CREDIT_QUOTA = 2000
       FREQUENCY = WEEKLY
       START_TIMESTAMP = '2024-01-15 00:00 PST'
  TRIGGERS
    ON 80 PERCENT DO SUSPEND
    ON 100 PERCENT DO SUSPEND_IMMEDIATE;
```

### 5.3 Modifying Resource Monitors

```sql
-- Change credit quota
ALTER RESOURCE MONITOR limit1 SET CREDIT_QUOTA = 3000;

-- Add notification users
ALTER RESOURCE MONITOR limit1 SET NOTIFY_USERS = (USER1, USER2);
```

**Important:** You cannot change a customized schedule back to default. You must drop and recreate the monitor.

### 5.4 DDL Commands for Resource Monitors

| Command | Purpose |
|---------|---------|
| `CREATE RESOURCE MONITOR` | Create a new monitor |
| `ALTER RESOURCE MONITOR` | Modify existing monitor properties |
| `DROP RESOURCE MONITOR` | Delete a monitor |
| `SHOW RESOURCE MONITORS` | List all monitors visible to current role |

---

## 6. Resource Monitor Assignment

### 6.1 Account-Level Assignment

To monitor all warehouses in an account:

```sql
-- Create the monitor
CREATE RESOURCE MONITOR my_account_rm
  WITH CREDIT_QUOTA = 10000
  TRIGGERS ON 100 PERCENT DO SUSPEND;

-- Assign to account
ALTER ACCOUNT SET RESOURCE_MONITOR = my_account_rm;
```

### 6.2 Warehouse-Level Assignment

To assign a specific warehouse to a monitor:

```sql
ALTER WAREHOUSE my_wh SET RESOURCE_MONITOR = my_rm;
```

To remove a warehouse from a monitor:
```sql
ALTER WAREHOUSE my_wh SET RESOURCE_MONITOR = NULL;
```

### 6.3 Assignment Rules

| Rule | Description |
|------|-------------|
| **One Monitor Per Warehouse** | A warehouse can only be assigned to one resource monitor |
| **Multiple Warehouses Per Monitor** | A monitor can have multiple warehouses assigned (up to 500) |
| **Account + Warehouse** | Warehouses can be subject to BOTH account-level AND warehouse-level monitors |
| **First Threshold Wins** | If either monitor reaches a suspend threshold, the warehouse suspends |

### 6.4 Resource Monitor Hierarchy Diagram

```
Account-Level Resource Monitor (5000 credits)
        |
        |-- Controls ALL warehouses in account
        |
        +-- Warehouse A (also assigned to WH Monitor 1: 1000 credits)
        +-- Warehouse B (also assigned to WH Monitor 1: 1000 credits)
        +-- Warehouse C (also assigned to WH Monitor 2: 2000 credits)
        +-- Warehouse D (no warehouse-level monitor)
```

**Behavior:**
- If WH Monitor 1 reaches its limit, Warehouses A and B suspend
- If Account Monitor reaches its limit, ALL warehouses suspend

---

## 7. Budgets vs Resource Monitors

### 7.1 Feature Comparison

| Feature | Resource Monitors | Budgets |
|---------|-------------------|---------|
| **Monitors Warehouses** | Yes | Yes |
| **Monitors Serverless** | No | Yes |
| **Suspend Capability** | Yes | No (notification only) |
| **Reset Interval** | Configurable | Monthly only |
| **Granularity** | Account or warehouse | Account, custom object groups |
| **Creation Privilege** | ACCOUNTADMIN | ACCOUNTADMIN or granted roles |
| **Threshold Actions** | Notify, Suspend | Notify only |
| **Maximum Per Account** | Unlimited | 100 custom budgets |

### 7.2 When to Use Each

| Use Case | Recommended Tool |
|----------|------------------|
| Prevent warehouse overuse with hard limits | Resource Monitors |
| Monitor serverless feature costs | Budgets |
| Track departmental spending | Custom Budgets |
| Auto-suspend runaway warehouses | Resource Monitors |
| Get proactive spending alerts | Both |

### 7.3 Budget Key Concepts

```sql
-- Budgets use the BUDGET class
-- Account budget monitors all account spending
-- Custom budgets monitor specific object groups
```

**Budget Notifications:**
- Send daily alerts when spending projected to exceed limit
- Configurable to email, cloud queues (SNS, Event Grid, PubSub), or webhooks
- Refresh interval: 6.5 hours (default) or 1 hour (low latency, costs 12x more)

---

## 8. Cost Controls for Warehouses

### 8.1 Access Control Privileges

| Privilege | Scope | Purpose |
|-----------|-------|---------|
| **CREATE WAREHOUSE** | Account | Control who can create new warehouses |
| **MODIFY** | Warehouse | Control who can resize or change settings |
| **USAGE** | Warehouse | Control who can use the warehouse |

**Best Practice:** Create a dedicated role for warehouse management and grant it to limited users.

### 8.2 Auto-Suspend Settings

| Setting | Description | Default |
|---------|-------------|---------|
| **AUTO_SUSPEND** | Seconds of inactivity before suspend | 600 (10 min) |
| **AUTO_RESUME** | Automatically resume when query submitted | TRUE |

```sql
-- Find warehouses without auto-suspend
SHOW WAREHOUSES;
SELECT "name" FROM TABLE(RESULT_SCAN(LAST_QUERY_ID()))
WHERE IFNULL("auto_suspend", 0) = 0;

-- Find warehouses without auto-resume
SELECT "name" FROM TABLE(RESULT_SCAN(LAST_QUERY_ID()))
WHERE "auto_resume" = 'false';
```

**Best Practice:** Every warehouse with auto-suspend should also have auto-resume enabled.

### 8.3 Statement Timeout Parameters

| Parameter | Purpose | Scope |
|-----------|---------|-------|
| **STATEMENT_TIMEOUT_IN_SECONDS** | Max query execution time | Account, User, Session, Warehouse |
| **STATEMENT_QUEUED_TIMEOUT_IN_SECONDS** | Max time query can be queued | Account, User, Session, Warehouse |

```sql
-- View current timeout settings
SHOW PARAMETERS LIKE 'STATEMENT_TIMEOUT_IN_SECONDS' IN ACCOUNT;
SHOW PARAMETERS LIKE 'STATEMENT_TIMEOUT_IN_SECONDS' IN WAREHOUSE my_wh;

-- Set timeouts
ALTER WAREHOUSE my_wh SET STATEMENT_TIMEOUT_IN_SECONDS = 3600;  -- 1 hour
ALTER WAREHOUSE my_wh SET STATEMENT_QUEUED_TIMEOUT_IN_SECONDS = 1800;  -- 30 min
```

---

## 9. Cloud Services Billing

### 9.1 The 10% Daily Adjustment

Cloud services usage is **only charged if it exceeds 10% of daily warehouse usage**.

| Calculation | Formula |
|-------------|---------|
| Daily Adjustment | Lesser of (10% of warehouse credits) OR (actual cloud services credits) |
| Billed Amount | Warehouse + Cloud Services - Adjustment |

### 9.2 Example Calculation

| Day | Warehouse Credits | Cloud Services | 10% of Warehouse | Adjustment | Billed |
|-----|-------------------|----------------|------------------|------------|--------|
| 1 | 100 | 5 | 10 | 5 | 100 |
| 2 | 100 | 15 | 10 | 10 | 105 |
| 3 | 50 | 8 | 5 | 5 | 53 |

### 9.3 Key Points for Exam

- Serverless compute does NOT factor into the 10% adjustment
- Adjustment is calculated daily (UTC timezone)
- Monthly adjustment = sum of daily adjustments
- Monthly adjustment may be significantly less than 10%

### 9.4 Resource Monitors and Cloud Services

**Important Exam Point:** Resource monitor credit quotas include BOTH warehouse and cloud services usage, but do NOT apply the 10% adjustment.

Example: If your monitor has a 1000 credit quota:
- Warehouse uses 700 credits
- Cloud services uses 300 credits
- Total = 1000 credits (threshold reached)
- The 10% adjustment is NOT applied to resource monitor calculations

---

## 10. Exam Tips and Common Patterns

### 10.1 Frequently Tested Concepts

| Concept | Key Point |
|---------|-----------|
| **Who can create resource monitors?** | Only ACCOUNTADMIN |
| **What do resource monitors track?** | User-managed virtual warehouses only |
| **Can resource monitors suspend serverless features?** | No |
| **How many warehouses per monitor?** | Each warehouse can only belong to ONE monitor |
| **SUSPEND vs SUSPEND_IMMEDIATE** | SUSPEND waits for queries to complete |
| **Default schedule** | Monthly, starts immediately |
| **Notification requirement** | Users must enable notifications to receive alerts |

### 10.2 Common Exam Question Patterns

**Pattern 1: "Which role can create resource monitors?"**
- Answer: ACCOUNTADMIN only
- Trap: SYSADMIN, SECURITYADMIN cannot create resource monitors

**Pattern 2: "What happens when a resource monitor's quota is reached?"**
- Answer: Depends on defined actions (NOTIFY, SUSPEND, SUSPEND_IMMEDIATE)
- Trap: Nothing happens if no actions are defined

**Pattern 3: "Can resource monitors track Snowpipe costs?"**
- Answer: No, resource monitors only track user-managed warehouses
- Trap: Use Budgets for serverless features

**Pattern 4: "A warehouse is assigned to both account and warehouse monitors..."**
- Answer: If either reaches suspend threshold, warehouse suspends
- Trap: Account monitor does NOT override warehouse monitor

**Pattern 5: "How is cloud services billing calculated?"**
- Answer: Only charged if exceeds 10% of daily warehouse usage
- Trap: Serverless compute does NOT factor into the 10% adjustment

### 10.3 Common Mistakes to Avoid

| Mistake | Correct Understanding |
|---------|----------------------|
| Resource monitors can track all costs | Only tracks user-managed warehouses |
| SYSADMIN can create resource monitors | Only ACCOUNTADMIN can create them |
| SUSPEND cancels running queries | SUSPEND waits; SUSPEND_IMMEDIATE cancels |
| 10% adjustment applies to resource monitors | Resource monitors count ALL credits (no adjustment) |
| One monitor can be assigned to a warehouse | One warehouse to one monitor (not vice versa) |

### 10.4 Scenario-Based Questions

**Scenario 1:** "Your company wants to prevent any warehouse from running if the monthly budget is exceeded."
- **Solution:** Create account-level resource monitor with SUSPEND_IMMEDIATE at 100%

**Scenario 2:** "You want to monitor Snowpipe and Search Optimization costs."
- **Solution:** Use Budgets (not resource monitors)

**Scenario 3:** "A query is running when the suspend threshold is reached. What happens?"
- **With SUSPEND:** Query completes, then warehouse suspends
- **With SUSPEND_IMMEDIATE:** Query is cancelled immediately

---

## 11. Quick Reference

### 11.1 SQL Quick Reference

```sql
-- Create resource monitor
CREATE RESOURCE MONITOR monitor_name
  WITH CREDIT_QUOTA = <credits>
       [FREQUENCY = MONTHLY | DAILY | WEEKLY | YEARLY | NEVER]
       [START_TIMESTAMP = <timestamp>]
       [END_TIMESTAMP = <timestamp>]
  TRIGGERS
    ON <percentage> PERCENT DO NOTIFY
    ON <percentage> PERCENT DO SUSPEND
    ON <percentage> PERCENT DO SUSPEND_IMMEDIATE;

-- Assign to account
ALTER ACCOUNT SET RESOURCE_MONITOR = monitor_name;

-- Assign to warehouse
ALTER WAREHOUSE wh_name SET RESOURCE_MONITOR = monitor_name;

-- View resource monitors
SHOW RESOURCE MONITORS;

-- Modify monitor
ALTER RESOURCE MONITOR monitor_name SET CREDIT_QUOTA = <new_quota>;
ALTER RESOURCE MONITOR monitor_name SET NOTIFY_USERS = (user1, user2);

-- Remove from warehouse
ALTER WAREHOUSE wh_name SET RESOURCE_MONITOR = NULL;

-- Drop monitor
DROP RESOURCE MONITOR monitor_name;
```

### 11.2 Key Numbers to Remember

| Item | Value |
|------|-------|
| Maximum notify actions per monitor | 5 |
| Maximum suspend actions | 1 |
| Maximum suspend immediate actions | 1 |
| Maximum warehouses per monitor | 500 |
| Maximum custom budgets per account | 100 |
| Cloud services free threshold | 10% of daily warehouse usage |
| Default auto-suspend | 600 seconds (10 minutes) |
| Budget refresh interval (default) | 6.5 hours |
| Budget refresh interval (low latency) | 1 hour |

### 11.3 Privilege Reference

| Object | Privilege | Grants Ability To |
|--------|-----------|-------------------|
| Resource Monitor | MODIFY | Change quota, schedule, triggers |
| Resource Monitor | MONITOR | View usage and settings |
| Account | ACCOUNTADMIN | Create resource monitors, assign to account |
| Warehouse | ACCOUNTADMIN | Assign warehouse to resource monitor |

### 11.4 Views and Functions

| View/Function | Purpose |
|---------------|---------|
| `SHOW RESOURCE MONITORS` | List all resource monitors |
| `SHOW WAREHOUSES` | Shows resource_monitor column for each warehouse |
| `SNOWFLAKE.ACCOUNT_USAGE.RESOURCE_MONITORS` | Historical resource monitor data |
| `SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_METERING_HISTORY` | Historical warehouse credit usage |

---

## Summary

**Resource Monitors are essential for cost control:**
1. Only ACCOUNTADMIN can create them
2. They monitor user-managed warehouses only (not serverless)
3. Each warehouse can belong to only one monitor
4. Actions: NOTIFY, SUSPEND (graceful), SUSPEND_IMMEDIATE (hard stop)
5. Cloud services are counted but the 10% adjustment is NOT applied
6. For serverless cost tracking, use Budgets instead

**For the exam, remember:**
- Who can create (ACCOUNTADMIN)
- What they monitor (warehouses only)
- How thresholds work (percentages, can exceed 100%)
- Difference between SUSPEND and SUSPEND_IMMEDIATE
- That account and warehouse monitors work independently (both can suspend)
