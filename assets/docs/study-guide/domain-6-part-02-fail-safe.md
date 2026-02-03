# Domain 6: Data Protection & Sharing - Fail-safe

## Overview

Fail-safe is a critical component of Snowflake's Continuous Data Protection (CDP) framework. It provides a last-resort data recovery mechanism that protects against catastrophic data loss due to system failures, security breaches, or extreme operational issues. Understanding how Fail-safe works, how it differs from Time Travel, and its associated costs is essential for the SnowPro Core exam.

**Exam Weight**: Domain 6 (Data Protection & Sharing) accounts for 5-10% of the SnowPro Core exam.

---

## 1. What is Fail-safe?

### Definition

Fail-safe provides a **non-configurable 7-day period** during which historical data **may be recoverable by Snowflake**. This period starts immediately after the Time Travel retention period ends.

### Key Characteristics

| Characteristic | Description |
|----------------|-------------|
| **Duration** | 7 days (fixed, non-configurable) |
| **When It Starts** | Immediately after Time Travel retention period ends |
| **Who Can Access** | Only Snowflake (not users or administrators) |
| **Recovery Method** | Contact Snowflake Support |
| **Purpose** | Last-resort recovery for system failures or extreme events |
| **Service Level** | Best-effort basis |

### Fail-safe in the Data Lifecycle

```
+------------------+     +------------------+     +------------------+
|   ACTIVE DATA    | --> |   TIME TRAVEL    | --> |    FAIL-SAFE     |
|                  |     |   (1-90 days*)   |     |    (7 days)      |
+------------------+     +------------------+     +------------------+
        |                        |                        |
   User can                 User can               Only Snowflake
   read/write               query, clone,          can attempt
                            UNDROP                 recovery
```
*Time Travel period varies by edition and table type

---

## 2. Fail-safe vs Time Travel: Critical Comparison

Understanding the distinction between Fail-safe and Time Travel is one of the most commonly tested topics on the exam.

### Key Differences

| Aspect | Time Travel | Fail-safe |
|--------|-------------|-----------|
| **Duration** | 0-90 days (configurable) | 7 days (fixed) |
| **Configurability** | Yes (DATA_RETENTION_TIME_IN_DAYS) | No |
| **Who Can Access** | Users with appropriate privileges | Only Snowflake Support |
| **Self-Service** | Yes (SELECT, CLONE, UNDROP) | No (must contact Snowflake) |
| **Purpose** | User-initiated recovery, historical queries | Disaster recovery (last resort) |
| **Recovery Time** | Immediate | Hours to days |
| **Applies To** | All table types | Permanent tables only |
| **When It Applies** | During retention period | After Time Travel ends |

### What You Can Do in Each Period

| Action | Time Travel | Fail-safe |
|--------|-------------|-----------|
| Query historical data | Yes (AT/BEFORE clause) | No |
| Clone data at a point in time | Yes (CREATE ... CLONE AT) | No |
| Restore dropped objects | Yes (UNDROP) | No (Snowflake must restore) |
| Self-service recovery | Yes | No |

### Timeline Example

```
Day 0         Day 1         Day 90        Day 97
  |-------------|-------------|-------------|
  |   UPDATE    |             |             |
  |   occurs    |             |             |
  |             |             |             |
  |<-------- Time Travel ----->|             |
  |  (up to 90 days with      |<- Fail-safe->|
  |   Enterprise Edition)      |  (7 days)   |
  |                            |             |
  | User can:                  | Only        |
  | - Query history            | Snowflake   |
  | - Clone at timestamp       | can attempt |
  | - UNDROP objects           | recovery    |
```

---

## 3. When Fail-safe Applies

### Table Types and Fail-safe

**Critical Exam Point**: Fail-safe only applies to **permanent tables**. Transient and temporary tables have **no Fail-safe period**.

| Table Type | Time Travel | Fail-safe | Total Protection |
|------------|-------------|-----------|------------------|
| **Permanent (Standard Edition)** | 0-1 day | 7 days | 1-8 days |
| **Permanent (Enterprise Edition)** | 0-90 days | 7 days | 7-97 days |
| **Transient** | 0-1 day | None | 0-1 day |
| **Temporary** | 0-1 day | None | 0-1 day |

### Implications by Table Type

```sql
-- Permanent table: Full CDP protection
CREATE TABLE important_data (
    id INT,
    data VARCHAR
);
-- Time Travel: configurable (up to 90 days with Enterprise)
-- Fail-safe: 7 days (automatic)

-- Transient table: Reduced protection, lower storage costs
CREATE TRANSIENT TABLE etl_staging (
    id INT,
    data VARCHAR
);
-- Time Travel: 0-1 day maximum
-- Fail-safe: NONE

-- Temporary table: Session-scoped, no recovery after drop
CREATE TEMPORARY TABLE session_temp (
    id INT,
    data VARCHAR
);
-- Time Travel: 0-1 day (ends when table dropped or session ends)
-- Fail-safe: NONE
```

### Long-Running Queries and Fail-safe

**Important**: A long-running Time Travel query will delay moving data into Fail-safe until the query completes. This ensures query consistency but may temporarily extend effective Time Travel period.

---

## 4. The Fail-safe Recovery Process

### When to Use Fail-safe

Fail-safe is intended **only** for use when:

1. All other recovery options have been exhausted
2. Time Travel period has already expired
3. Data loss is due to extreme operational failures (not user error)

### Recovery Steps

1. **Contact Snowflake Support** - Submit a support ticket
2. **Provide Details** - Include account information, object names, timestamps
3. **Wait for Assessment** - Snowflake evaluates if recovery is possible
4. **Recovery Execution** - If possible, Snowflake attempts to restore data
5. **Verification** - Confirm recovered data integrity

### Recovery Timeline

| Phase | Duration |
|-------|----------|
| Support ticket submission | Immediate |
| Initial assessment | Hours |
| Recovery process | **Several hours to several days** |
| Total estimated time | Variable (not guaranteed) |

### Important Caveats

| Caveat | Description |
|--------|-------------|
| **Best Effort** | Recovery is not guaranteed |
| **No SLA** | No guaranteed recovery time |
| **Not for Historical Queries** | Cannot be used to query old data |
| **Last Resort Only** | Use Time Travel first for all recovery needs |
| **Compute Charges** | Recovery uses serverless compute (billing applies) |
| **Snowpipe Streaming Classic** | Fail-safe does **NOT** support tables that contain data ingested by Snowpipe Streaming Classic |

---

## 5. Storage Costs for Fail-safe

### How Fail-safe Storage is Calculated

Snowflake maintains historical data in Fail-safe, which incurs storage costs:

- **Calculated Daily**: Fees are calculated for each 24-hour period
- **Incremental Storage**: Only changed data is stored (not full table copies)
- **Full Copy on DROP/TRUNCATE**: Full table copy is retained when tables are dropped or truncated

### Storage Cost Factors

| Factor | Impact |
|--------|--------|
| **Table Size** | Larger tables = higher Fail-safe storage |
| **Change Frequency** | More changes = more historical versions |
| **DROP/TRUNCATE** | Full table copy retained for entire period |
| **Table Type** | Permanent tables only (transient/temporary = no cost) |

### Viewing Fail-safe Storage

To view Fail-safe storage usage in Snowsight:

1. Select **Admin** > **Cost Management** > **Consumption**
2. Filter **Usage Type** to **Storage**
3. Review the **Storage Breakdown** column for Fail-safe storage

**Note**: Requires ACCOUNTADMIN role to view storage metrics.

### Billing for Fail-safe Recovery

When Snowflake performs a Fail-safe recovery:

- Uses **Snowflake-managed serverless compute**
- Standard serverless compute billing applies
- Monitor via METERING_DAILY_HISTORY or METERING_HISTORY views
- Filter for service type: `FAILSAFE_RECOVERY`

```sql
-- View Fail-safe recovery compute costs
SELECT *
FROM SNOWFLAKE.ACCOUNT_USAGE.METERING_DAILY_HISTORY
WHERE SERVICE_TYPE = 'FAILSAFE_RECOVERY';
```

### Cost Optimization Strategies

| Strategy | When to Use |
|----------|-------------|
| Use transient tables | ETL staging, temporary processing |
| Use temporary tables | Session-scoped data |
| Keep permanent tables | Long-lived, critical business data |
| Minimize Time Travel | Reduce retention for non-critical tables |

---

## 6. Continuous Data Protection (CDP) Summary

Fail-safe is one component of Snowflake's comprehensive CDP framework:

```
+================================================================+
|            CONTINUOUS DATA PROTECTION (CDP)                     |
+================================================================+
|                                                                 |
|  +-------------------+  +------------------+  +---------------+ |
|  |   TIME TRAVEL     |  |    FAIL-SAFE     |  |    BACKUP     | |
|  |  (User-controlled)|  | (Snowflake-only) |  |  (Optional)   | |
|  +-------------------+  +------------------+  +---------------+ |
|                                                                 |
|  Features:                                                      |
|  - Query historical data (Time Travel)                          |
|  - UNDROP objects (Time Travel)                                 |
|  - Clone at timestamp (Time Travel)                             |
|  - Disaster recovery (Fail-safe)                                |
|  - Account replication (Backup)                                 |
|                                                                 |
+================================================================+
```

### CDP Protection by Table Type Summary

```
PERMANENT TABLE (Enterprise Edition):
|<------------- Active Data ------------>|
|<-- Time Travel (0-90 days) -->|<-- Fail-safe (7 days) -->|

TRANSIENT TABLE:
|<------------- Active Data ------------>|
|<-- Time Travel (0-1 day) -->| No Fail-safe

TEMPORARY TABLE:
|<---- Active Data (session-scoped) ---->|
|<-- Time Travel (0-1 day) -->| No Fail-safe
```

---

## 7. Exam Tips and Common Question Patterns

### Key Facts to Remember

1. **Fail-safe is always 7 days** - This is non-configurable
2. **Only Snowflake can access Fail-safe data** - Users cannot query or restore directly
3. **Fail-safe starts after Time Travel ends** - They are sequential, not overlapping
4. **Permanent tables only** - Transient and temporary tables have no Fail-safe
5. **Best-effort recovery** - Not guaranteed, may take hours to days
6. **Contact Snowflake Support** - The only way to initiate Fail-safe recovery
7. **Storage costs apply** - Even though you cannot access the data directly
8. **Snowpipe Streaming Classic excluded** - Fail-safe does NOT support tables with data ingested by Snowpipe Streaming Classic

### Common Exam Question Patterns

#### Pattern 1: Duration

**Q**: How long is the Fail-safe period in Snowflake?
- A) 1 day
- B) 7 days
- C) 30 days
- D) 90 days

**Answer**: B - Fail-safe is a fixed, non-configurable 7-day period.

#### Pattern 2: Who Can Access

**Q**: Who can access data during the Fail-safe period?
- A) Users with ACCOUNTADMIN role
- B) Users with SYSADMIN role
- C) Any user with SELECT privilege
- D) Only Snowflake Support

**Answer**: D - Only Snowflake can access and potentially recover data during Fail-safe.

#### Pattern 3: Table Types

**Q**: Which table types have a Fail-safe period?
- A) All table types
- B) Permanent and transient tables only
- C) Permanent tables only
- D) Transient and temporary tables only

**Answer**: C - Only permanent tables have a Fail-safe period.

#### Pattern 4: Time Travel vs Fail-safe

**Q**: What is the primary difference between Time Travel and Fail-safe?
- A) Time Travel is longer than Fail-safe
- B) Fail-safe is user-accessible; Time Travel is not
- C) Time Travel is user-accessible; Fail-safe requires Snowflake Support
- D) They are the same feature with different names

**Answer**: C - Time Travel allows self-service recovery; Fail-safe requires contacting Snowflake Support.

#### Pattern 5: When Fail-safe Begins

**Q**: When does the Fail-safe period begin for a table?
- A) When the table is created
- B) When data is first inserted
- C) Immediately after the Time Travel period ends
- D) When the table is dropped

**Answer**: C - Fail-safe begins immediately after the Time Travel retention period ends.

#### Pattern 6: Transient Tables

**Q**: A company wants to minimize storage costs for their ETL staging tables. What table type should they use?
- A) Permanent with 90-day Time Travel
- B) Permanent with 0-day Time Travel
- C) Transient
- D) External

**Answer**: C - Transient tables have maximum 1-day Time Travel and no Fail-safe, minimizing storage costs.

#### Pattern 7: Recovery Time

**Q**: How long does Fail-safe data recovery typically take?
- A) Immediate (real-time)
- B) A few minutes
- C) Several hours to several days
- D) 7 days exactly

**Answer**: C - Fail-safe recovery may take several hours to several days to complete.

### Exam Traps to Avoid

| Trap | Reality |
|------|---------|
| "Users can query Fail-safe data" | Only Snowflake can access Fail-safe data |
| "Fail-safe can be extended or reduced" | Fail-safe is always exactly 7 days (non-configurable) |
| "Transient tables have Fail-safe" | Transient and temporary tables have NO Fail-safe |
| "Fail-safe is guaranteed recovery" | It is best-effort only |
| "Fail-safe replaces the need for backups" | Fail-safe is a last resort; regular backups are still recommended |
| "Time Travel and Fail-safe overlap" | They are sequential: Time Travel first, then Fail-safe |
| "UNDROP works during Fail-safe" | UNDROP only works during Time Travel; Fail-safe requires Snowflake Support |

### Quick Reference: Time Travel + Fail-safe by Edition

| Edition | Table Type | Max Time Travel | Fail-safe | Max Total Protection |
|---------|------------|-----------------|-----------|---------------------|
| Standard | Permanent | 1 day | 7 days | 8 days |
| Standard | Transient | 1 day | 0 days | 1 day |
| Enterprise | Permanent | 90 days | 7 days | 97 days |
| Enterprise | Transient | 1 day | 0 days | 1 day |
| Any | Temporary | 1 day | 0 days | 1 day |

---

## 8. Practice Questions

### Question 1

A table has a Time Travel retention period of 14 days. How long after the data is modified can Snowflake potentially recover it through Fail-safe?

- A) 14 days
- B) 7 days
- C) 21 days
- D) 28 days

<details>
<summary>Show Answer</summary>

**Answer**: C - The total protection period is Time Travel (14 days) + Fail-safe (7 days) = 21 days. Note that during the first 14 days, the user can recover; during days 15-21, only Snowflake can attempt recovery.

</details>

### Question 2

A data engineer needs to recover data that was accidentally deleted 10 days ago. The table is a permanent table with a 7-day Time Travel retention period. What should they do?

- A) Use SELECT with AT clause to query historical data
- B) Use UNDROP to restore the data
- C) Contact Snowflake Support for Fail-safe recovery
- D) The data is permanently lost

<details>
<summary>Show Answer</summary>

**Answer**: C - Since 10 days have passed and Time Travel is only 7 days, the data is now in the Fail-safe period (days 8-14). The only option is to contact Snowflake Support for best-effort recovery.

</details>

### Question 3

Which statement about Fail-safe storage costs is TRUE?

- A) Fail-safe storage is free for all editions
- B) Storage costs only apply if recovery is requested
- C) Storage costs apply whether or not recovery is requested
- D) Fail-safe storage costs are the same as Time Travel costs

<details>
<summary>Show Answer</summary>

**Answer**: C - Fail-safe storage incurs costs continuously for the 7-day period, regardless of whether recovery is ever requested. This is automatic for all permanent tables.

</details>

### Question 4

A company has a transient table with DATA_RETENTION_TIME_IN_DAYS set to 1. What is the maximum total data protection period for this table?

- A) 1 day
- B) 7 days
- C) 8 days
- D) 90 days

<details>
<summary>Show Answer</summary>

**Answer**: A - Transient tables have no Fail-safe period, so the maximum protection is the Time Travel period only (1 day maximum for transient tables).

</details>

### Question 5

Which of the following operations can a user perform on data during the Fail-safe period?

- A) SELECT using AT clause
- B) CREATE ... CLONE AT
- C) UNDROP
- D) None of the above

<details>
<summary>Show Answer</summary>

**Answer**: D - Users cannot perform any operations on Fail-safe data. All listed operations are Time Travel features that only work during the Time Travel retention period.

</details>

### Question 6

What SQL command would show the Fail-safe storage usage for tables in your account?

- A) SHOW FAILSAFE STORAGE
- B) SELECT * FROM TABLE_STORAGE_METRICS
- C) DESCRIBE FAILSAFE
- D) VIEW FAIL_SAFE_BYTES IN SNOWSIGHT

<details>
<summary>Show Answer</summary>

**Answer**: B - The TABLE_STORAGE_METRICS view (or INFORMATION_SCHEMA.TABLE_STORAGE_METRICS) shows FAILSAFE_BYTES for each table. Note that viewing storage in Snowsight is also valid but "D" is not proper syntax.

</details>

### Question 7

A long-running Time Travel query is executing against a table. What happens to the Fail-safe transition for that data?

- A) The data immediately moves to Fail-safe
- B) The data is duplicated in both Time Travel and Fail-safe
- C) The transition to Fail-safe is delayed until the query completes
- D) The query fails with an error

<details>
<summary>Show Answer</summary>

**Answer**: C - A long-running Time Travel query delays moving data into Fail-safe until the query completes, ensuring query consistency.

</details>

### Question 8

Which Snowflake edition is required to have Fail-safe protection?

- A) Only Enterprise Edition and higher
- B) Only Business Critical Edition and higher
- C) All editions (Standard and higher)
- D) Virtual Private Snowflake only

<details>
<summary>Show Answer</summary>

**Answer**: C - Fail-safe is included in all Snowflake editions (Standard and higher) for permanent tables. It is not edition-specific like some Time Travel extensions.

</details>

---

## 9. Summary

Fail-safe is Snowflake's last-resort data recovery mechanism that provides:

1. **7-day non-configurable protection** after Time Travel ends
2. **Snowflake-only access** - users cannot query or restore directly
3. **Best-effort recovery** through Snowflake Support
4. **Permanent tables only** - transient and temporary tables are excluded
5. **Storage costs** that apply regardless of whether recovery is needed
6. **Part of CDP** - works with Time Travel for comprehensive data protection

### Key Takeaways for the Exam

- Fail-safe is **not** a substitute for proper backup strategies
- Always use Time Travel first - it is self-service and immediate
- Fail-safe is for **disaster recovery**, not for accessing historical data
- Choose table types wisely to balance protection vs. storage costs
- Transient tables are ideal for ETL staging where Fail-safe is not needed
- Permanent tables should be used for critical business data requiring full CDP protection
