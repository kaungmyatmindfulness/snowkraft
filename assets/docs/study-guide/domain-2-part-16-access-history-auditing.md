# Domain 2: Account Access & Security

## Part 16: Access History and Auditing

This section covers Snowflake's comprehensive auditing capabilities, including the ACCESS_HISTORY view for tracking data access, LOGIN_HISTORY for authentication monitoring, QUERY_HISTORY for query auditing, and related Account Usage views essential for security compliance and governance.

---

## 1. Understanding Snowflake Auditing Architecture

### 1.1 Two-Tier Metadata Access

Snowflake provides two primary mechanisms for accessing audit and historical data:

| Schema | Retention | Latency | Access |
|--------|-----------|---------|--------|
| **INFORMATION_SCHEMA** | 7 days (varies by function) | Near real-time (minutes) | Per-database access |
| **ACCOUNT_USAGE** | 365 days (1 year) | Up to 2 hours | ACCOUNTADMIN or granted role |

**Key Differences:**

```sql
-- INFORMATION_SCHEMA: Database-scoped, real-time, 7-day retention
SELECT * FROM mydb.INFORMATION_SCHEMA.QUERY_HISTORY();

-- ACCOUNT_USAGE: Account-scoped, 2-hour latency, 365-day retention
SELECT * FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY
WHERE START_TIME > DATEADD(day, -30, CURRENT_TIMESTAMP());
```

**Important:** ACCOUNT_USAGE views have up to 2-hour latency. Use INFORMATION_SCHEMA table functions for real-time monitoring.

### 1.2 Granting Access to Account Usage

By default, only ACCOUNTADMIN can query ACCOUNT_USAGE views:

```sql
-- Grant access to a custom role
GRANT IMPORTED PRIVILEGES ON DATABASE SNOWFLAKE TO ROLE security_analyst;

-- Or grant specific database role
GRANT DATABASE ROLE SNOWFLAKE.USAGE_VIEWER TO ROLE security_analyst;
```

---

## 2. ACCESS_HISTORY View

### 2.1 Overview and Purpose

The ACCESS_HISTORY view provides a **unified picture of data access** in Snowflake, tracking:
- What data was accessed (read operations)
- When access occurred
- How the accessed data was modified (write operations)
- Which policies were applied during access

**Location:** `SNOWFLAKE.ACCOUNT_USAGE.ACCESS_HISTORY`

**Edition Requirement:** Enterprise Edition or higher. ACCESS_HISTORY is not available on Standard Edition accounts.

**Primary Use Cases:**
- **Compliance**: Demonstrate who accessed what data and when, for regulatory audits
- **Auditing**: Verify that security policies (masking, row access) are being applied correctly
- **Data Lineage**: Track how data flows from source tables through views and transformations to target tables, at the column level

### 2.2 Key Columns

| Column | Description |
|--------|-------------|
| `query_id` | Unique identifier for the SQL statement |
| `query_start_time` | When the query began execution |
| `user_name` | User who executed the query |
| `direct_objects_accessed` | Objects explicitly referenced in the query |
| `base_objects_accessed` | Underlying source objects (e.g., base tables of views) |
| `objects_modified` | Objects written to by the query |
| `object_modified_by_ddl` | Objects modified by DDL statements |
| `policies_referenced` | Policies applied during query execution |
| `parent_query_id` | For nested queries (stored procedures, etc.) |
| `root_query_id` | Top-level query in a chain |

### 2.3 Understanding Object Access Columns

**Scenario: Querying a View Built on a Table**

```sql
-- View v1 is defined as: SELECT c1, c2 FROM base_table WHERE c3 > 10
SELECT * FROM v1;
```

**ACCESS_HISTORY records:**
- `direct_objects_accessed`: `v1` (the view queried directly)
- `base_objects_accessed`: `base_table` (underlying data source) with columns `c1`, `c2`, `c3`

**Key Concept:** Snowflake tracks the complete lineage from the query to the actual data sources.

### 2.4 Column Lineage

Column lineage extends ACCESS_HISTORY to track data flow from source to target columns:

```sql
-- Creating a table from another
CREATE TABLE table_1 AS SELECT c1, c2 FROM base_table;
```

**ACCESS_HISTORY records:**
- `direct_objects_accessed` and `base_objects_accessed`: `base_table` with columns `c1`, `c2`
- `objects_modified`: `table_1` with columns and their **source lineage**

The `objects_modified` column includes a `directSources` array showing exactly which source columns contributed to each target column.

### 2.5 Querying ACCESS_HISTORY

**Return User Access History:**

```sql
SELECT
    query_id,
    query_start_time,
    user_name,
    direct_objects_accessed,
    base_objects_accessed
FROM SNOWFLAKE.ACCOUNT_USAGE.ACCESS_HISTORY
ORDER BY user_name, query_start_time DESC;
```

**Find All Access to a Specific Table:**

```sql
SELECT
    query_id,
    query_start_time,
    user_name,
    direct_objects_accessed
FROM SNOWFLAKE.ACCOUNT_USAGE.ACCESS_HISTORY,
    LATERAL FLATTEN(base_objects_accessed) f1
WHERE f1.value:objectName::STRING = 'MY_DATABASE.MY_SCHEMA.SENSITIVE_TABLE'
  AND query_start_time > DATEADD(day, -7, CURRENT_TIMESTAMP());
```

**Track Write Operations:**

```sql
SELECT
    query_id,
    query_start_time,
    user_name,
    objects_modified
FROM SNOWFLAKE.ACCOUNT_USAGE.ACCESS_HISTORY
WHERE ARRAY_SIZE(objects_modified) > 0
ORDER BY query_start_time DESC;
```

### 2.6 Policies Referenced Column

The `policies_referenced` column tracks which security policies were applied:

```sql
SELECT
    query_id,
    user_name,
    obj.value:policyName::STRING AS policy_name,
    obj.value:policyKind::STRING AS policy_type
FROM SNOWFLAKE.ACCOUNT_USAGE.ACCESS_HISTORY ah,
    LATERAL FLATTEN(ah.policies_referenced) AS obj
WHERE policy_type IN ('MASKING_POLICY', 'ROW_ACCESS_POLICY');
```

**Benefits:**
- Track policy enforcement without complex joins
- Audit both masking and row access policy usage
- Identify queries where policies were applied

### 2.7 Organization-Level Access History

For multi-account organizations, use the ORGANIZATION_USAGE schema:

```sql
-- Available only in organization account
SELECT * FROM SNOWFLAKE.ORGANIZATION_USAGE.ACCESS_HISTORY;
```

**Note:** ORGANIZATION_USAGE.ACCESS_HISTORY is a **premium view** that incurs:
- Compute costs for serverless tasks that populate the view
- Storage costs for the aggregated data

---

## 3. LOGIN_HISTORY View

### 3.1 Overview

LOGIN_HISTORY tracks all authentication attempts to your Snowflake account:

**Location:** `SNOWFLAKE.ACCOUNT_USAGE.LOGIN_HISTORY`

**Alternative:** `INFORMATION_SCHEMA.LOGIN_HISTORY()` table function (7-day retention)

### 3.2 Key Columns

| Column | Description |
|--------|-------------|
| `event_timestamp` | When the login attempt occurred |
| `user_name` | User attempting to log in |
| `client_ip` | IP address of the client |
| `reported_client_type` | Client application type (JDBC, ODBC, Snowsight, etc.) |
| `is_success` | Whether login succeeded ('YES'/'NO') |
| `first_authentication_factor` | Primary auth method (PASSWORD, OAUTH, etc.) |
| `second_authentication_factor` | MFA method if used (MFA_TOKEN, etc.) |
| `login_details` | JSON with additional details (error messages, etc.) |
| `connection` | Connection name for client redirect scenarios |

### 3.3 Common Auditing Queries

**Monitor Failed Login Attempts:**

```sql
SELECT
    event_timestamp,
    user_name,
    client_ip,
    reported_client_type,
    error_code,
    error_message
FROM SNOWFLAKE.ACCOUNT_USAGE.LOGIN_HISTORY
WHERE is_success = 'NO'
  AND event_timestamp > DATEADD(hour, -24, CURRENT_TIMESTAMP())
ORDER BY event_timestamp DESC;
```

**Find Users Using MFA:**

```sql
SELECT
    user_name,
    COUNT(*) as login_count,
    MIN(event_timestamp) as first_login,
    MAX(event_timestamp) as last_login
FROM SNOWFLAKE.ACCOUNT_USAGE.LOGIN_HISTORY
WHERE second_authentication_factor IS NOT NULL
  AND is_success = 'YES'
GROUP BY user_name
ORDER BY login_count DESC;
```

**Identify Users NOT Using MFA:**

```sql
SELECT
    event_timestamp,
    user_name,
    is_success
FROM SNOWFLAKE.ACCOUNT_USAGE.LOGIN_HISTORY
WHERE second_authentication_factor IS NULL
  AND first_authentication_factor = 'PASSWORD'
  AND is_success = 'YES'
ORDER BY event_timestamp DESC;
```

**Track MFA Token Caching:**

```sql
SELECT
    event_timestamp,
    user_name,
    is_success
FROM SNOWFLAKE.ACCOUNT_USAGE.LOGIN_HISTORY
WHERE second_authentication_factor = 'MFA_TOKEN';
```

### 3.4 Malicious IP Protection Monitoring

Snowflake's Malicious IP Protection blocks access from known malicious IP addresses:

```sql
-- View blocked login attempts
SELECT
    event_timestamp,
    user_name,
    client_ip,
    login_details
FROM SNOWFLAKE.ACCOUNT_USAGE.LOGIN_HISTORY
WHERE NOT is_success
  AND login_details IS NOT NULL
ORDER BY event_timestamp DESC;
```

**Login Details JSON includes:**
```json
{
  "malicious_ip_protection_info": {
    "result": "BLOCKED",
    "riskClassification": "HIGH",
    "categories": ["ANONYMOUS_VPN", "MALICIOUS_BEHAVIOR"]
  }
}
```

---

## 4. QUERY_HISTORY View

### 4.1 Overview

QUERY_HISTORY provides comprehensive query execution metadata:

**Location:** `SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY`

**Retention:** 365 days

### 4.2 Key Columns for Security Auditing

| Column | Description |
|--------|-------------|
| `query_id` | Unique query identifier |
| `query_text` | The SQL statement executed |
| `user_name` | User who ran the query |
| `role_name` | Role used for execution |
| `warehouse_name` | Warehouse that processed the query |
| `execution_status` | SUCCESS, FAIL, INCIDENT |
| `error_code` / `error_message` | For failed queries |
| `start_time` / `end_time` | Query timing |
| `bytes_scanned` | Data volume accessed |
| `rows_produced` | Result set size |
| `query_tag` | Custom tag for categorization |

### 4.3 Security-Focused Queries

**Find Queries Accessing Sensitive Data:**

```sql
SELECT
    query_id,
    query_text,
    user_name,
    role_name,
    start_time
FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY
WHERE LOWER(query_text) LIKE '%sensitive_table%'
  AND execution_status = 'SUCCESS'
ORDER BY start_time DESC;
```

**Monitor Bulk Data Exports:**

```sql
SELECT
    user_name,
    query_id,
    query_text,
    rows_produced,
    bytes_scanned
FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY
WHERE (LOWER(query_text) LIKE '%copy into%'
       OR LOWER(query_text) LIKE '%get %')
  AND rows_produced > 100000
ORDER BY rows_produced DESC;
```

**Track DDL Changes:**

```sql
SELECT
    query_id,
    user_name,
    role_name,
    query_text,
    start_time
FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY
WHERE query_type IN ('CREATE', 'ALTER', 'DROP', 'GRANT', 'REVOKE')
ORDER BY start_time DESC
LIMIT 100;
```

---

## 5. SESSIONS View

### 5.1 Overview

The SESSIONS view tracks user session information:

**Location:** `SNOWFLAKE.ACCOUNT_USAGE.SESSIONS`

### 5.2 Key Use Cases

**Track Session Duration:**

```sql
SELECT
    user_name,
    session_id,
    created_on,
    DATEDIFF(minute, created_on, COALESCE(destroyed_on, CURRENT_TIMESTAMP())) as session_minutes
FROM SNOWFLAKE.ACCOUNT_USAGE.SESSIONS
WHERE created_on > DATEADD(day, -7, CURRENT_TIMESTAMP())
ORDER BY session_minutes DESC;
```

**Join with LOGIN_HISTORY:**

```sql
SELECT
    lh.user_name,
    lh.event_timestamp as login_time,
    s.session_id,
    lh.client_ip,
    lh.reported_client_type
FROM SNOWFLAKE.ACCOUNT_USAGE.SESSIONS s
JOIN SNOWFLAKE.ACCOUNT_USAGE.LOGIN_HISTORY lh
    ON s.login_event_id = lh.event_id
WHERE lh.is_success = 'YES';
```

---

## 6. Additional Security-Related Views

### 6.1 GRANTS_TO_ROLES View

Track privilege grants for compliance:

```sql
-- View all direct grants to users
SELECT *
FROM SNOWFLAKE.ACCOUNT_USAGE.GRANTS_TO_ROLES
WHERE granted_to = 'USER';

-- Find users with ACCOUNTADMIN privileges
SELECT
    grantee_name,
    granted_on,
    privilege
FROM SNOWFLAKE.ACCOUNT_USAGE.GRANTS_TO_ROLES
WHERE privilege = 'USAGE'
  AND granted_on = 'ROLE'
  AND name = 'ACCOUNTADMIN';
```

### 6.2 POLICY_REFERENCES View

Track policy assignments:

```sql
-- Find all masking policy assignments
SELECT
    policy_name,
    policy_kind,
    ref_entity_name,
    ref_column_name
FROM SNOWFLAKE.ACCOUNT_USAGE.POLICY_REFERENCES
WHERE policy_kind = 'MASKING_POLICY';
```

### 6.3 TAG_REFERENCES View

Track tag assignments for data classification:

```sql
-- Find all PII-tagged columns
SELECT
    object_database,
    object_schema,
    object_name,
    column_name,
    tag_value
FROM SNOWFLAKE.ACCOUNT_USAGE.TAG_REFERENCES
WHERE tag_name = 'PII'
  AND domain = 'COLUMN';
```

---

## 7. Session Policies and Auditing

### 7.1 Session Timeout Configuration

Session policies control idle timeout behavior:

```sql
-- Create a session policy
CREATE SESSION POLICY strict_session_policy
    SESSION_IDLE_TIMEOUT_MINS = 30
    SESSION_UI_IDLE_TIMEOUT_MINS = 15;

-- Apply to account
ALTER ACCOUNT SET SESSION POLICY strict_session_policy;

-- Apply to specific user
ALTER USER analyst SET SESSION POLICY strict_session_policy;
```

**Key Properties:**
- `SESSION_IDLE_TIMEOUT_MINS`: For programmatic clients (default: 240 minutes)
- `SESSION_UI_IDLE_TIMEOUT_MINS`: For Snowsight (default: 240 minutes)
- Minimum value: 5 minutes
- Maximum value: 240 minutes (4 hours)

### 7.2 User-Level vs Account-Level Policies

- User-level session policy **takes precedence** over account-level
- Changes take effect on **next login** (not current sessions)

---

## 8. Best Practices for Security Auditing

### 8.1 Regular Audit Queries

**Weekly Security Report:**

```sql
-- Compile weekly security summary
WITH login_stats AS (
    SELECT
        'Total Logins' as metric,
        COUNT(*) as value
    FROM SNOWFLAKE.ACCOUNT_USAGE.LOGIN_HISTORY
    WHERE event_timestamp > DATEADD(week, -1, CURRENT_TIMESTAMP())
),
failed_logins AS (
    SELECT
        'Failed Logins' as metric,
        COUNT(*) as value
    FROM SNOWFLAKE.ACCOUNT_USAGE.LOGIN_HISTORY
    WHERE is_success = 'NO'
      AND event_timestamp > DATEADD(week, -1, CURRENT_TIMESTAMP())
),
unique_users AS (
    SELECT
        'Unique Users' as metric,
        COUNT(DISTINCT user_name) as value
    FROM SNOWFLAKE.ACCOUNT_USAGE.LOGIN_HISTORY
    WHERE is_success = 'YES'
      AND event_timestamp > DATEADD(week, -1, CURRENT_TIMESTAMP())
)
SELECT * FROM login_stats
UNION ALL SELECT * FROM failed_logins
UNION ALL SELECT * FROM unique_users;
```

### 8.2 Monitoring Service Accounts

```sql
-- Verify service account authentication methods
SELECT
    user_name,
    first_authentication_factor,
    second_authentication_factor,
    client_ip,
    COUNT(*) as login_count
FROM INFORMATION_SCHEMA.LOGIN_HISTORY(
    TIME_RANGE_START => DATEADD(day, -7, CURRENT_TIMESTAMP())
)
WHERE user_name IN ('SERVICE_USER_1', 'SERVICE_USER_2')
GROUP BY 1, 2, 3, 4
ORDER BY login_count DESC;
```

---

## 9. Exam Tips and Common Question Patterns

### 9.1 Key Facts to Remember

| Topic | Key Point |
|-------|-----------|
| **ACCOUNT_USAGE Latency** | Up to 2 hours delay |
| **ACCOUNT_USAGE Retention** | 365 days (1 year) |
| **INFORMATION_SCHEMA Retention** | 7 days (varies by function) |
| **Default Access** | ACCOUNTADMIN only for ACCOUNT_USAGE |
| **ACCESS_HISTORY Edition** | Enterprise Edition or higher required |
| **ACCESS_HISTORY Columns** | `direct_objects_accessed` vs `base_objects_accessed` |
| **ACCESS_HISTORY Lineage** | Tracks read/write operations at the column level via `objects_modified` with `directSources` |
| **Session Policy Precedence** | User-level > Account-level |
| **MFA Tracking** | `second_authentication_factor` column in LOGIN_HISTORY |

### 9.2 Common Exam Question Patterns

**Pattern 1: Choosing the Right View**
- "Which view should you query to find who accessed a specific table in the last 6 months?"
- Answer: ACCOUNT_USAGE.ACCESS_HISTORY (365-day retention)

**Pattern 2: Access Control for Auditing**
- "Who can query ACCOUNT_USAGE views by default?"
- Answer: ACCOUNTADMIN (can grant to others via IMPORTED PRIVILEGES)

**Pattern 3: Understanding Latency**
- "A query was run 30 minutes ago. Which schema should you use to find it?"
- Answer: INFORMATION_SCHEMA (real-time); ACCOUNT_USAGE may not have it yet (2-hour latency)

**Pattern 4: ACCESS_HISTORY Column Interpretation**
- "When querying a view, which column shows the underlying table?"
- Answer: `base_objects_accessed` (view is in `direct_objects_accessed`)

**Pattern 5: Policy Tracking**
- "How do you determine which masking policies were applied to a query?"
- Answer: `policies_referenced` column in ACCESS_HISTORY

### 9.3 Tricky Distinctions

**ACCESS_HISTORY vs QUERY_HISTORY:**
- ACCESS_HISTORY: Focuses on **what data** was accessed/modified
- QUERY_HISTORY: Focuses on **query execution** details (timing, warehouse, errors)

**LOGIN_HISTORY Table Function vs View:**
- Table Function: `INFORMATION_SCHEMA.LOGIN_HISTORY()` - 7 days, real-time
- View: `ACCOUNT_USAGE.LOGIN_HISTORY` - 365 days, up to 2-hour latency

**direct_objects_accessed vs base_objects_accessed:**
- Direct: Objects explicitly named in the SQL query
- Base: Underlying source objects (tables behind views, UDFs, etc.)

### 9.4 Quick Reference: Security Views in ACCOUNT_USAGE

| View | Primary Use |
|------|-------------|
| `ACCESS_HISTORY` | Track data access and modifications |
| `LOGIN_HISTORY` | Monitor authentication attempts |
| `QUERY_HISTORY` | Audit query execution |
| `SESSIONS` | Track user sessions |
| `GRANTS_TO_ROLES` | Monitor privilege assignments |
| `GRANTS_TO_USERS` | Direct user grants (UBAC) |
| `USERS` | User account information |
| `ROLES` | Role definitions |
| `POLICY_REFERENCES` | Policy assignments |
| `TAG_REFERENCES` | Tag assignments for data classification |

---

## 10. Practice Questions

1. **A security analyst needs to find all queries that accessed the CUSTOMER_PII table in the last 90 days. Which view and column should they query?**

<details>
<summary>Show Answer</summary>

Answer: Query `SNOWFLAKE.ACCOUNT_USAGE.ACCESS_HISTORY` and use `LATERAL FLATTEN(base_objects_accessed)` to filter for the table name.
</details>

2. **You notice LOGIN_HISTORY results are missing recent entries from the past hour. What is the most likely explanation?**

<details>
<summary>Show Answer</summary>

Answer: ACCOUNT_USAGE views have up to 2-hour latency. Use `INFORMATION_SCHEMA.LOGIN_HISTORY()` table function for real-time data.
</details>

3. **A masking policy is set on a column. How can you verify which queries had the policy applied?**

<details>
<summary>Show Answer</summary>

Answer: Query ACCESS_HISTORY and examine the `policies_referenced` column for entries with `policyKind = 'MASKING_POLICY'`.
</details>

4. **What is the difference between SESSION_IDLE_TIMEOUT_MINS and SESSION_UI_IDLE_TIMEOUT_MINS in a session policy?**

<details>
<summary>Show Answer</summary>

Answer: `SESSION_IDLE_TIMEOUT_MINS` applies to programmatic clients (JDBC, ODBC, CLI), while `SESSION_UI_IDLE_TIMEOUT_MINS` applies to Snowsight.
</details>

5. **The ACCESS_HISTORY view shows a table in both direct_objects_accessed and base_objects_accessed for a query. What does this indicate?**

<details>
<summary>Show Answer</summary>

Answer: The table was accessed directly in the query (e.g., `SELECT * FROM table`) rather than through a view or other abstraction.
</details>
