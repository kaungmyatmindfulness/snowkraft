# Domain 6: Data Protection & Data Sharing

## Part 04: Data Sharing Overview

This section covers Snowflake's Secure Data Sharing capabilities, one of Snowflake's most powerful and differentiating features. Understanding how data sharing works, the roles of providers and consumers, share objects, and the zero-copy architecture is essential for the SnowPro Core exam. Data sharing represents 5-10% of the exam content, and questions frequently focus on the unique aspects of Snowflake's sharing model compared to traditional data exchange methods.

---

## 1. Introduction to Secure Data Sharing

### 1.1 What is Secure Data Sharing?

Secure Data Sharing is Snowflake's native capability that enables sharing selected database objects with other Snowflake accounts **without copying or moving data**. This is a fundamental differentiator from traditional data sharing methods like ETL, file transfers, or data replication.

**Key Characteristics:**
- Share data across Snowflake accounts instantly
- No data movement or copying required
- Real-time access to shared data
- Secure, governed, and controlled by the data provider
- No charges for storage on the consumer side
- Works within the same region by default

**What Makes Snowflake Data Sharing Unique:**

| Traditional Data Sharing | Snowflake Secure Data Sharing |
|-------------------------|------------------------------|
| Data must be copied or exported | No data copying or movement |
| Data becomes stale immediately | Real-time, always current data |
| Storage costs at both ends | No storage costs for consumers |
| Complex ETL pipelines required | Simple configuration via shares |
| Security gaps during transfer | Data never leaves provider's secure storage |
| Synchronization challenges | Single source of truth |

### 1.2 How Secure Data Sharing Works

Snowflake's Secure Data Sharing operates through the **services layer and metadata store** rather than moving actual data:

```
[Provider Account]
      |
   Creates SHARE object
      |
   Grants privileges on objects to SHARE
      |
   Adds consumer accounts to SHARE
      |
[Consumer Account]
      |
   Creates DATABASE FROM SHARE
      |
   Queries shared data (read-only)
      |
[Actual Data]
   - Remains in provider's storage
   - Never copied or moved
   - Consumer queries use provider's micro-partitions
```

**Critical Concept: Zero-Copy Architecture**
- Shared data does NOT take up storage in consumer accounts
- Consumers do NOT pay for shared data storage
- Consumers ONLY pay for compute resources (virtual warehouses) used to query the shared data
- Data updates by the provider are immediately visible to consumers

---

## 2. Data Sharing Architecture

### 2.1 The Share Object

A **SHARE** is a named Snowflake object that encapsulates all the information required to share a database. Think of it as a secure container that defines:

- What database objects are being shared
- Which accounts can access the shared objects
- What privileges are granted on those objects

**Share Object Characteristics:**
- Created and owned by the provider account
- Contains references to database objects (not copies)
- Can include objects from a single database
- Supports database roles for granular access control

### 2.2 Objects That Can Be Shared

Snowflake supports sharing the following database objects:

| Object Type | Notes |
|-------------|-------|
| **Tables** | Standard tables can be shared directly |
| **Dynamic Tables** | Supported for sharing |
| **External Tables** | Tables referencing external data |
| **Iceberg Tables** | Both managed and externally managed |
| **Secure Views** | Recommended for controlled access |
| **Secure Materialized Views** | Pre-computed secure views |
| **Secure UDFs** | User-defined functions (secure and non-secure) |

**Important Exam Points:**
- **Secure views are required** when sharing data that involves any filtering, joining, or logic. Secure UDFs (SQL and JavaScript only) can also be shared
- Views must be SECURE to prevent consumers from seeing the view definition
- Sharing is read-only - consumers cannot modify shared objects
- Only one USAGE database per share, but data from multiple databases is accessible via secure views with REFERENCE_USAGE on additional databases. The mechanism: (1) grant USAGE on the database where the secure view lives, (2) grant REFERENCE_USAGE on additional databases referenced by the view

### 2.3 Objects That Cannot Be Shared Directly

The following objects cannot be directly shared:
- Stages (internal or external)
- Pipes
- Streams
- Tasks
- Sequences
- Non-secure views (expose view definition)
- Account-level objects (warehouses, roles, users)

**Workaround:** Create secure views that reference these objects and share the views instead.

---

## 3. Provider and Consumer Roles

### 3.1 Data Providers

A **data provider** is any Snowflake account that creates shares and makes them available to other Snowflake accounts.

**Provider Responsibilities:**
- Create and manage share objects
- Determine which objects to include in shares
- Control which accounts can access shares
- Manage share security and access privileges
- Pay for storage of the shared data

**Provider Privileges Required:**

| Privilege | Description |
|-----------|-------------|
| `CREATE SHARE` | Required to create new shares |
| `OWNERSHIP` or `MANAGE GRANTS` on objects | Required to grant privileges to shares |
| `CREATE DATABASE` | If creating reader accounts |
| `CREATE ACCOUNT` | For creating managed (reader) accounts |

**Provider SQL Commands:**

```sql
-- Create a share
CREATE SHARE sales_share;

-- Grant privileges on database to share
GRANT USAGE ON DATABASE sales_db TO SHARE sales_share;

-- Grant privileges on schema to share
GRANT USAGE ON SCHEMA sales_db.public TO SHARE sales_share;

-- Grant privileges on table to share
GRANT SELECT ON TABLE sales_db.public.orders TO SHARE sales_share;

-- Add consumer accounts to share
ALTER SHARE sales_share ADD ACCOUNTS = org1.consumer_account;

-- View existing shares
SHOW SHARES;

-- View grants to a share
SHOW GRANTS TO SHARE sales_share;
```

### 3.2 Data Consumers

A **data consumer** is any Snowflake account that creates a database from a share provided by another account.

**Consumer Characteristics:**
- Creates a read-only database from the share
- Can query shared data but cannot modify it
- Pays only for compute (warehouse) used to query data
- Does NOT pay for storage of shared data
- Can create only ONE database per share

**Consumer Privileges Required:**

| Privilege | Description |
|-----------|-------------|
| `CREATE DATABASE` | Required to create database from share |
| `IMPORT SHARE` | Required to view and consume shares |
| `IMPORTED PRIVILEGES` | Granted on imported database to access objects |

**Consumer SQL Commands:**

```sql
-- View available shares
SHOW SHARES;

-- Create database from share
CREATE DATABASE sales_data FROM SHARE provider_org.provider_account.sales_share;

-- Grant access to other roles in consumer account
GRANT IMPORTED PRIVILEGES ON DATABASE sales_data TO ROLE analyst_role;

-- Query shared data
SELECT * FROM sales_data.public.orders;
```

### 3.3 Provider vs Consumer Summary

| Aspect | Provider | Consumer |
|--------|----------|----------|
| **Data Location** | Stores the actual data | No data storage required |
| **Storage Costs** | Pays for all storage | No storage charges |
| **Compute Costs** | Pays for own queries | Pays for own queries |
| **Access Control** | Full control over share | Read-only access |
| **Data Freshness** | Source of truth | Always sees current data |
| **Databases per Share** | N/A | Limited to ONE database per share |

---

## 4. Creating and Configuring Shares

### 4.1 Basic Share Creation Workflow

**Step 1: Create the Share**
```sql
CREATE SHARE customer_analytics_share
  COMMENT = 'Customer analytics data for partners';
```

**Step 2: Add Database and Objects**
```sql
-- Grant database usage
GRANT USAGE ON DATABASE analytics_db TO SHARE customer_analytics_share;

-- Grant schema usage
GRANT USAGE ON SCHEMA analytics_db.reporting TO SHARE customer_analytics_share;

-- Grant object access
GRANT SELECT ON TABLE analytics_db.reporting.customer_summary
  TO SHARE customer_analytics_share;

GRANT SELECT ON VIEW analytics_db.reporting.sales_metrics_secure
  TO SHARE customer_analytics_share;
```

**Step 3: Add Consumer Accounts**
```sql
ALTER SHARE customer_analytics_share
  ADD ACCOUNTS = partner_org.partner_account, partner_org.partner_account2;
```

### 4.2 Using Database Roles with Shares

Database roles provide **granular access control** within shares, allowing different consumers to access different subsets of shared objects.

**Benefits of Database Roles in Shares:**
- Segment access to different objects within the same share
- Consumers can grant specific database roles to their account roles
- More flexible than all-or-nothing IMPORTED PRIVILEGES approach

```sql
-- Provider creates database roles
CREATE DATABASE ROLE analytics_db.basic_access;
CREATE DATABASE ROLE analytics_db.premium_access;

-- Grant privileges to database roles
GRANT USAGE ON SCHEMA analytics_db.public TO DATABASE ROLE analytics_db.basic_access;
GRANT SELECT ON TABLE analytics_db.public.summary TO DATABASE ROLE analytics_db.basic_access;

GRANT USAGE ON SCHEMA analytics_db.detailed TO DATABASE ROLE analytics_db.premium_access;
GRANT SELECT ON ALL TABLES IN SCHEMA analytics_db.detailed
  TO DATABASE ROLE analytics_db.premium_access;

-- Grant database roles to share
GRANT DATABASE ROLE analytics_db.basic_access TO SHARE analytics_share;
GRANT DATABASE ROLE analytics_db.premium_access TO SHARE analytics_share;
```

**Consumer Side:**
```sql
-- Create database from share
CREATE DATABASE analytics FROM SHARE provider_org.provider.analytics_share;

-- Grant specific database role to account role
GRANT DATABASE ROLE analytics.basic_access TO ROLE analysts;
GRANT DATABASE ROLE analytics.premium_access TO ROLE data_scientists;
```

### 4.3 Share Management Commands

| Command | Purpose |
|---------|---------|
| `CREATE SHARE` | Create a new share |
| `ALTER SHARE ... ADD ACCOUNTS` | Add consumer accounts |
| `ALTER SHARE ... REMOVE ACCOUNTS` | Remove consumer accounts |
| `GRANT ... TO SHARE` | Add objects to share |
| `REVOKE ... FROM SHARE` | Remove objects from share |
| `DROP SHARE` | Delete a share |
| `SHOW SHARES` | List all shares |
| `DESCRIBE SHARE` | Show share details |
| `SHOW GRANTS TO SHARE` | List privileges granted to share |

---

## 5. Using Secure Views for Data Sharing

### 5.1 Why Use Secure Views?

Secure views are **strongly recommended** when sharing data because they:
- Hide the view definition from consumers
- Prevent data inference through query optimization
- Enable row-level and column-level security
- Allow filtering data based on consumer account

**Regular View vs Secure View:**

| Aspect | Regular View | Secure View |
|--------|--------------|-------------|
| Definition Visible | Yes | No |
| Query Optimization | Full optimization | Limited (for security) |
| Data Sharing | Not recommended | Recommended |
| Performance | Faster | Slightly slower |

### 5.2 Creating Secure Views for Sharing

**Basic Secure View:**
```sql
CREATE SECURE VIEW analytics_db.public.customer_metrics AS
SELECT
    customer_id,
    region,
    total_orders,
    total_revenue
FROM analytics_db.private.customer_details
WHERE region = 'NORTH_AMERICA';
```

**Account-Based Filtering with CURRENT_ACCOUNT():**
```sql
-- Mapping table for account-based access
CREATE TABLE account_access_mapping (
    snowflake_account VARCHAR,
    allowed_region VARCHAR
);

-- Secure view with account-based filtering
CREATE SECURE VIEW shared_regional_data AS
SELECT d.*
FROM sales_data d
JOIN account_access_mapping m
  ON d.region = m.allowed_region
WHERE m.snowflake_account = CURRENT_ACCOUNT();
```

This pattern allows different consumers to see different data based on their account.

### 5.3 Validating Secure Views

Before sharing, validate that secure views work correctly:

```sql
-- Enable validation mode
ALTER SESSION SET SECURE_DATA_SHARING_OVERRIDE = 'SIMULATED_DATA_SHARING_CONSUMER';

-- Simulate consumer account
ALTER SESSION SET SIMULATED_DATA_SHARING_CONSUMER = 'consumer_org.consumer_account';

-- Test the secure view
SELECT * FROM shared_regional_data;

-- Reset session
ALTER SESSION UNSET SECURE_DATA_SHARING_OVERRIDE;
ALTER SESSION UNSET SIMULATED_DATA_SHARING_CONSUMER;
```

---

## 6. Reader Accounts

### 6.1 What are Reader Accounts?

**Reader accounts** (formerly called "read-only accounts" or "managed accounts") enable providers to share data with **non-Snowflake customers** without requiring them to have their own Snowflake account.

**Key Characteristics:**
- Created, owned, and managed by the provider account
- Provider pays for all compute costs in reader accounts
- Reader accounts can ONLY consume data from the creating provider
- Limited functionality compared to full Snowflake accounts
- Quick way to share data externally

### 6.2 Reader Account Restrictions

**What Reader Accounts CANNOT Do:**

| Restriction | Description |
|-------------|-------------|
| Create database objects | Cannot create tables, views, etc. for persistent storage |
| Load data | Cannot use COPY INTO or INSERT statements |
| Share data | Cannot create their own shares |
| Use Snowpipe | No continuous data loading |
| Execute certain commands | CREATE SHARE, CREATE REPLICATION GROUP, etc. |

**What Reader Accounts CAN Do:**
- Query shared data from the provider
- Create temporary/transient tables for session use
- Create virtual warehouses (billed to provider)
- Use worksheets and Snowsight

### 6.3 Creating Reader Accounts

```sql
-- Create a reader account (requires ACCOUNTADMIN or CREATE ACCOUNT privilege)
CREATE MANAGED ACCOUNT reader_partner
  ADMIN_NAME = 'admin_user',
  ADMIN_PASSWORD = 'SecurePassword123!',
  TYPE = READER;

-- View reader accounts
SHOW MANAGED ACCOUNTS;

-- Share data with the reader account
ALTER SHARE analytics_share ADD ACCOUNTS = reader_partner;

-- Drop a reader account
DROP MANAGED ACCOUNT reader_partner;
```

**Provider Considerations:**
- Default limit of 20 reader accounts per provider
- Provider responsible for all credit charges
- Provider provides support (no direct Snowflake support for reader users)

---

## 7. Cross-Region and Cross-Cloud Sharing

### 7.1 Same-Region Sharing

By default, Secure Data Sharing works between accounts in the **same region** on the **same cloud platform**:

```
Provider Account (AWS us-east-1) --> Consumer Account (AWS us-east-1)
   Works directly with zero data movement
```

### 7.2 Cross-Region and Cross-Cloud Requirements

To share data across regions or cloud platforms, you must use **database replication**:

```
Provider Account (AWS us-east-1)
      |
      | Database Replication
      v
Secondary Account (Azure westus2)
      |
      | Share created in secondary account
      v
Consumer Account (Azure westus2)
```

**Steps for Cross-Region Sharing:**

1. **Enable replication** for your accounts
2. **Create a replication group** containing databases and shares
3. **Create secondary replication group** in target region
4. **Refresh replication** to sync data
5. **Share data** with consumers in the target region

```sql
-- In source account: Create replication group
CREATE REPLICATION GROUP my_share_rg
  OBJECT_TYPES = DATABASES, SHARES
  ALLOWED_DATABASES = analytics_db
  ALLOWED_SHARES = analytics_share
  ALLOWED_ACCOUNTS = org.target_account
  REPLICATION_SCHEDULE = '10 MINUTE';

-- In target account: Create secondary replication group
CREATE REPLICATION GROUP my_share_rg
  AS REPLICA OF org.source_account.my_share_rg;

-- Refresh replication
ALTER REPLICATION GROUP my_share_rg REFRESH;
```

**Important Exam Points:**
- Same-region sharing: No data movement, instant access
- Cross-region sharing: Requires replication (data IS copied)
- Cross-cloud sharing: Also requires replication
- Replication incurs additional storage and data transfer costs

---

## 8. Listings and Data Exchange

### 8.1 Sharing Options Overview

Snowflake provides multiple ways to share data:

| Option | Description | Use Case |
|--------|-------------|----------|
| **Direct Share** | Share directly with specific accounts | Known partners, same region |
| **Private Listing** | Share via listing with specific accounts | Data products with metadata |
| **Data Exchange** | Private marketplace for a group of accounts | Enterprise data sharing |
| **Snowflake Marketplace** | Public or private listings on marketplace | Commercial data products |

### 8.2 Direct Share vs Listing

**Direct Share:**
- Simple share to specific accounts
- Same region only
- No additional metadata or descriptions
- Basic usage tracking

**Listing:**
- Share with descriptive metadata
- Can include terms of use, sample queries
- Better discovery for consumers
- Enhanced usage analytics
- Can convert direct share to listing

```sql
-- Convert direct share to listing (done via Snowsight UI)
-- Listings are managed through the Snowflake Collaboration features
```

---

## 9. Data Sharing Best Practices

### 9.1 Security Best Practices

1. **Always use secure views** when sharing data
2. **Implement row-level security** using CURRENT_ACCOUNT() for multi-tenant sharing
3. **Validate secure views** before adding to shares
4. **Review shared objects regularly** for compliance
5. **Use database roles** for granular access control

### 9.2 Performance Best Practices

1. **Maintain clustering** on base tables used in secure views
2. **Monitor consumer query patterns** using DATA_SHARING_USAGE views
3. **Consider materialized views** for complex aggregations
4. **Be aware of secure view optimization limitations**

### 9.3 Operational Best Practices

1. **Document share contents** using comments
2. **Communicate changes** to consumers before modifying shares
3. **Use naming conventions** for shares and shared objects
4. **Set up alerts** for unusual consumption patterns
5. **Plan for cross-region needs** early

---

## 10. Monitoring Data Sharing

### 10.1 Provider Monitoring

```sql
-- View all outbound shares
SHOW SHARES;

-- View share details
DESCRIBE SHARE sales_share;

-- View grants to share
SHOW GRANTS TO SHARE sales_share;

-- View consumer accounts
SELECT * FROM SNOWFLAKE.ACCOUNT_USAGE.SHARES;

-- View sharing usage metrics
SELECT * FROM SNOWFLAKE.DATA_SHARING_USAGE.LISTING_CONSUMPTION_DAILY;
```

### 10.2 Consumer Monitoring

```sql
-- View available inbound shares
SHOW SHARES;

-- View databases created from shares
SHOW DATABASES;

-- Check imported database details
DESCRIBE DATABASE imported_analytics;
```

---

## 11. Exam Tips and Common Question Patterns

### 11.1 High-Frequency Exam Topics

1. **Zero-copy sharing** - No data movement, no storage charges for consumers
2. **Provider vs Consumer costs** - Provider pays storage, consumer pays compute
3. **Secure views requirement** - Recommended for hiding data logic
4. **Reader accounts** - For non-Snowflake customers, provider pays all costs
5. **Same-region limitation** - Cross-region requires replication
6. **IMPORTED PRIVILEGES** - Required privilege for consumers to access shared data
7. **One USAGE database per share** - But data from multiple databases can be exposed via secure views using REFERENCE_USAGE on additional databases

### 11.2 Common Question Patterns

**Question Type 1: Cost Attribution**
- "Who pays for storage of shared data?" --> Provider
- "Who pays for queries on shared data?" --> Consumer (their warehouse)
- "Who pays for reader account compute?" --> Provider

**Question Type 2: Technical Capabilities**
- "Can consumers modify shared tables?" --> No, read-only
- "Can you share data across regions directly?" --> No, requires replication
- "What type of view should be used for sharing?" --> Secure view

**Question Type 3: Object Sharing**
- "Which objects can be shared?" --> Tables, secure views, UDFs, etc.
- "Can stages be shared?" --> No, not directly
- "Can you share from multiple databases in one share?" --> One USAGE database per share, but secure views can reference additional databases via REFERENCE_USAGE

**Question Type 4: Access Control**
- "What privilege do consumers need?" --> CREATE DATABASE, IMPORT SHARE
- "How do consumers grant access to their users?" --> IMPORTED PRIVILEGES or database roles
- "What function filters data by consumer?" --> CURRENT_ACCOUNT()

### 11.3 Key Concepts to Remember

| Concept | Key Point |
|---------|-----------|
| **Data Movement** | NO data is copied or transferred |
| **Storage Costs** | Consumer pays ZERO for shared data storage |
| **Compute Costs** | Consumer pays for their own warehouse usage |
| **Data Freshness** | Always real-time, always current |
| **Access Type** | Read-only for consumers |
| **Share Scope** | One USAGE database per share (use REFERENCE_USAGE for multi-DB views) |
| **Cross-Region** | Requires replication |
| **Reader Accounts** | For non-Snowflake users, provider manages/pays |
| **Secure Views** | Strongly recommended for sharing |
| **Database Roles** | Enable granular access within shares |

### 11.4 SQL Commands to Know

```sql
-- Provider Commands
CREATE SHARE share_name;
GRANT USAGE ON DATABASE db TO SHARE share_name;
GRANT SELECT ON TABLE db.schema.table TO SHARE share_name;
ALTER SHARE share_name ADD ACCOUNTS = org.account;
SHOW SHARES;
DESCRIBE SHARE share_name;
DROP SHARE share_name;

-- Consumer Commands
CREATE DATABASE db_name FROM SHARE provider_org.provider.share_name;
GRANT IMPORTED PRIVILEGES ON DATABASE db_name TO ROLE role_name;

-- Reader Account Commands
CREATE MANAGED ACCOUNT account_name ADMIN_NAME='user' ADMIN_PASSWORD='pass' TYPE=READER;
SHOW MANAGED ACCOUNTS;
DROP MANAGED ACCOUNT account_name;
```

---

## 12. Practice Questions

### Question 1
A company wants to share sales data with a partner company that does not have a Snowflake account. What is the most appropriate solution?

A) Create a direct share to the partner's account
B) Export the data to S3 and share the bucket
C) Create a reader account for the partner
D) Use Snowflake Marketplace

<details>
<summary>Show Answer</summary>

**Answer: C** - Reader accounts are specifically designed for sharing data with non-Snowflake customers.
</details>

### Question 2
When a consumer queries data from a shared database, who pays for the compute resources?

A) The data provider
B) The data consumer
C) Both share the cost equally
D) Snowflake covers the cost

<details>
<summary>Show Answer</summary>

**Answer: B** - Consumers pay for their own compute resources (virtual warehouses) used to query shared data.
</details>

### Question 3
A provider wants to ensure that consumers cannot see the underlying table structure when querying shared data. What should they use?

A) Standard views
B) Secure views
C) Materialized views
D) Dynamic tables

<details>
<summary>Show Answer</summary>

**Answer: B** - Secure views hide the view definition from consumers, preventing them from seeing the underlying logic.
</details>

### Question 4
What is required to share data with an account in a different region?

A) Direct share with cross-region flag
B) Database replication to the target region
C) Nothing special, shares work across regions
D) Snowflake Marketplace listing

<details>
<summary>Show Answer</summary>

**Answer: B** - Cross-region sharing requires database replication because data must physically exist in the consumer's region.
</details>

### Question 5
How many databases can a consumer create from a single share?

A) Unlimited
B) One
C) Five
D) Depends on account tier

<details>
<summary>Show Answer</summary>

**Answer: B** - Consumers can create only ONE database from each share.
</details>

---

## 13. Summary

Secure Data Sharing is one of Snowflake's most distinctive features, enabling organizations to share live data without the traditional challenges of data movement, synchronization, and security risks. Key takeaways for the exam:

1. **Zero-copy architecture**: Data never moves; consumers access provider's storage through metadata references
2. **Cost model**: Providers pay for storage; consumers pay only for their compute
3. **Access is read-only**: Consumers cannot modify shared data
4. **Secure views are required**: Always use secure views when sharing data that involves filtering, joining, or logic. Secure UDFs (SQL/JavaScript) can also be shared
5. **Same-region default**: Cross-region sharing requires replication
6. **Reader accounts**: Enable sharing with non-Snowflake customers
7. **Database roles**: Provide granular access control within shares
8. **Real-time access**: Changes by providers are immediately visible to consumers

Understanding these concepts thoroughly will prepare you for the data sharing questions on the SnowPro Core certification exam.
