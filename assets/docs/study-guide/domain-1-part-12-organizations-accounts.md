# Domain 1: Organizations and Accounts

**Exam Weight: Part of 25-30%** | **SnowPro Core (COF-C02)**

---

## Table of Contents

1. [Organization Overview](#1-organization-overview)
2. [Account Types and Hierarchy](#2-account-types-and-hierarchy)
3. [Account Identifiers](#3-account-identifiers)
4. [Organization Administrator Roles](#4-organization-administrator-roles)
5. [Account Management Operations](#5-account-management-operations)
6. [Account URLs and Connectivity](#6-account-urls-and-connectivity)
7. [Account Parameters](#7-account-parameters)
8. [Premium Views and Organization Usage](#8-premium-views-and-organization-usage)
9. [Key Exam Patterns](#9-key-exam-patterns)
10. [Quick Reference](#10-quick-reference)

---

## 1. Organization Overview

### 1.1 What is an Organization?

An **organization** is a first-class Snowflake object that links all accounts owned by a business entity. It provides:

- **Unified Management:** Central view of all accounts across regions and cloud platforms
- **Self-Service Account Creation:** Organization administrators can create new accounts
- **Cross-Account Monitoring:** View usage data across all accounts in the organization
- **Simplified Administration:** Manage accounts without contacting Snowflake support

### 1.2 Organization Creation

| Scenario | How Organization is Created |
|----------|----------------------------|
| **Self-Service Signup** | Organization automatically created with system-generated name |
| **Enterprise Setup** | Snowflake creates organization with custom name |

**Key Points:**
- Customers never directly create an organization
- Additional accounts can be added after initial account creation
- Organization names can be changed (system-generated to user-friendly)

### 1.3 Viewing Organization Information

**Using SQL:**
```sql
-- Get current organization name (any role)
SELECT CURRENT_ORGANIZATION_NAME();

-- Get current account name (any role)
SELECT CURRENT_ACCOUNT_NAME();

-- Get full account identifier
SELECT CURRENT_ORGANIZATION_NAME() || '-' || CURRENT_ACCOUNT_NAME();
```

**Using Snowsight:**
- Navigate to Admin > Accounts (requires ORGADMIN/GLOBALORGADMIN)
- Organization name displayed above account list

### 1.4 Changing Organization Name

- Contact **Snowflake Support** to change organization name
- Renaming affects all account URLs in the organization
- Original URLs continue working for 365 days after rename
- Best practice: Change organization name before using it in account identifiers

### 1.5 Deleting an Organization

1. Delete all accounts except the account being used for deletion
2. Contact Snowflake Support to delete the last account and organization

---

## 2. Account Types and Hierarchy

### 2.1 Types of Accounts in an Organization

| Account Type | Purpose | Features |
|-------------|---------|----------|
| **Organization Account** | Special administrative account | Premium views, organization-level object management, GLOBALORGADMIN role |
| **Regular Accounts** | Standard Snowflake workload accounts | Full Snowflake functionality |
| **Reader Accounts** | Share data with non-Snowflake users | Limited functionality, created by data provider |

### 2.2 Organization Account

**Definition:** A special account for organization administrators to manage multi-account organizations.

**Capabilities:**
- View organization-level data from all accounts (including query history)
- Manage organization-level objects (organization users, user groups)
- Enable Snowflake Marketplace terms for entire organization
- Manage account lifecycle (create, delete accounts)
- Enable replication for accounts

**Requirements:**
- Requires **Enterprise Edition** or higher
- Only ONE organization account per organization
- Cannot convert existing ORGADMIN-enabled account to organization account

**Creating Organization Account:**
```sql
-- From an ORGADMIN-enabled account
USE ROLE ORGADMIN;

CREATE ORGANIZATION ACCOUNT my_org_account
  ADMIN_NAME = 'admin_user'
  ADMIN_PASSWORD = 'SecurePassword123!'
  EMAIL = 'admin@company.com'
  REGION = aws_us_west_2;
```

### 2.3 Account Hierarchy

```
Organization (e.g., ACME)
    |
    +-- Organization Account (special admin account)
    |       |
    |       +-- GLOBALORGADMIN role
    |       +-- Premium ORGANIZATION_USAGE views
    |
    +-- Account 1 (aws_us_east_1)
    |       |
    |       +-- ORGADMIN role (if enabled)
    |
    +-- Account 2 (azure_westus2)
    |
    +-- Account 3 (gcp_us_central1)
    |
    +-- Reader Account (for data sharing)
```

---

## 3. Account Identifiers

### 3.1 Two Identifier Formats

| Format | Structure | Preferred? |
|--------|-----------|------------|
| **Account Name** | `orgname-account_name` | Yes (preferred) |
| **Account Locator** | `xy12345` (with region/cloud suffixes) | No (legacy) |

### 3.2 Format 1: Account Name (Preferred)

**Structure:** `organization_name-account_name`

**Characteristics:**
- Account names must be unique within organization
- Account names can be changed (more flexibility)
- Shorter and more intuitive
- NOT globally unique across all Snowflake organizations

**Examples:**
```
myorg-production
myorg-development
acme-analytics
```

**Finding Account Identifier (SQL):**
```sql
-- Get account identifier for client connections
SELECT CURRENT_ORGANIZATION_NAME() || '-' || CURRENT_ACCOUNT_NAME();

-- Example output: MYORG-PRODUCTION
```

### 3.3 Format 2: Account Locator (Legacy)

**Definition:** Snowflake-assigned identifier when account is created

**Characteristics:**
- Cannot be changed once assigned
- May require region/cloud suffixes depending on location
- Still supported but **discouraged**

**Account Locator Formats by Region:**

| Cloud/Region | Account Identifier Format | Example |
|--------------|--------------------------|---------|
| AWS US West 2 (default) | `account_locator` | `xy12345` |
| AWS US East 1 | `account_locator.us-east-1` | `xy12345.us-east-1` |
| AWS EU regions | `account_locator.eu-west-1` | `xy12345.eu-west-1` |
| Azure | `account_locator.cloud_region.azure` | `xy12345.west-us-2.azure` |
| GCP | `account_locator.cloud_region.gcp` | `xy12345.us-central1.gcp` |
| US Government (FedRAMP High+) | `account_locator.fhplus.us-gov-west-1.aws` | `xy12345.fhplus.us-gov-west-1.aws` |
| US Government (DoD) | `account_locator.dod.us-gov-west-1.aws` | `xy12345.dod.us-gov-west-1.aws` |

**Finding Account Locator (SQL):**
```sql
-- Get account locator
SELECT CURRENT_ACCOUNT();

-- Get region
SELECT CURRENT_REGION();
```

### 3.4 Where Account Identifiers Are Used

| Use Case | Format |
|----------|--------|
| **Client Connections** | `orgname-account_name` (hyphen separator) |
| **SQL Statements** | `orgname.account_name` (dot separator) |
| **Data Sharing** | `orgname.account_name` (dot separator) |
| **Replication/Failover** | `orgname.account_name` (dot separator) |
| **Account URLs** | `https://orgname-account_name.snowflakecomputing.com` |

### 3.5 Account Names with Underscores

- Account names can include underscores (SQL standard)
- URLs support hyphen version: `my_account` becomes `my-account` in URL
- Some features don't accept underscores in URLs (use hyphens)

**Example:**
```
Account name: data_warehouse
URL: https://myorg-data-warehouse.snowflakecomputing.com
```

### 3.6 Legacy Accounts and Account Names

For accounts created before Organizations feature:
- Account locator becomes the default account name
- Account names can be changed to be more user-friendly
- Must remain unique within organization

---

## 4. Organization Administrator Roles

### 4.1 Two Administrator Role Options

| Role | Account | Status |
|------|---------|--------|
| **GLOBALORGADMIN** | Organization Account | Current/Recommended |
| **ORGADMIN** | ORGADMIN-enabled accounts | Being phased out |

### 4.2 GLOBALORGADMIN Role

**Location:** Only in the organization account

**Capabilities:**
- All organization-level tasks
- Access to premium ORGANIZATION_USAGE views
- Manage organization users and user groups
- Create and manage accounts
- Assign privileges to other roles

**Using GLOBALORGADMIN:**
```sql
-- In organization account
USE ROLE GLOBALORGADMIN;

-- View all accounts
SHOW ACCOUNTS;

-- Create new account
CREATE ACCOUNT new_account ...;
```

**Assignable Privileges (by GLOBALORGADMIN):**

| Privilege | Purpose |
|-----------|---------|
| APPLY TAG | Apply tags to objects |
| MANAGE ACCOUNTS | Create, alter, delete accounts |
| MANAGE LISTING AUTO FULFILLMENT | Manage Marketplace listing fulfillment |
| MANAGE ORGANIZATION CONTACTS | Manage organization contacts |
| MANAGE ORGANIZATION TERMS | Manage Marketplace terms |
| PURCHASE DATA EXCHANGE LISTING | Purchase Data Exchange listings |

### 4.3 ORGADMIN Role

**Location:** ORGADMIN-enabled accounts (not organization account)

**Status:** Being phased out (Snowflake will notify customers 3+ months in advance)

**Limitations:**
- Maximum 8 accounts can have ORGADMIN enabled by default
- Cannot be enabled for reader accounts

**Enabling ORGADMIN for an Account:**
```sql
-- From account with ORGADMIN already enabled
USE ROLE ORGADMIN;

ALTER ACCOUNT my_account1 SET IS_ORG_ADMIN = TRUE;
```

**Disabling ORGADMIN:**
```sql
-- From a different ORGADMIN-enabled account
USE ROLE ORGADMIN;

ALTER ACCOUNT my_account1 SET IS_ORG_ADMIN = FALSE;
```

### 4.4 Comparison: GLOBALORGADMIN vs ORGADMIN

| Feature | GLOBALORGADMIN | ORGADMIN |
|---------|---------------|----------|
| Location | Organization account only | Any ORGADMIN-enabled account |
| Premium views | Full access | Limited access |
| Organization users | Yes | No |
| Recommended | Yes | No (being phased out) |
| Max accounts | 1 (org account) | 8 (by default) |

---

## 5. Account Management Operations

### 5.1 Creating Accounts

**Required Role:** ORGADMIN or GLOBALORGADMIN

**Using Snowsight:**
- Admin > Accounts > + Account

**Using SQL:**
```sql
USE ROLE ORGADMIN;

CREATE ACCOUNT new_production_account
  ADMIN_NAME = 'admin_user'
  ADMIN_PASSWORD = 'SecurePassword123!'
  ADMIN_RSA_PUBLIC_KEY = 'MIIBIjANBg...'  -- Optional
  EMAIL = 'admin@company.com'
  EDITION = ENTERPRISE
  REGION = aws_us_east_1
  COMMENT = 'Production workloads';
```

**Required Parameters:**
- `ADMIN_NAME`: Initial admin user name
- `ADMIN_PASSWORD` or `ADMIN_RSA_PUBLIC_KEY`: Authentication
- `EMAIL`: Admin email address
- `EDITION`: Snowflake edition
- `REGION`: Cloud region for account

**Constraints:**
- Can only create accounts in regions enabled for your organization
- Contact Snowflake Support to enable additional regions

### 5.2 Viewing Accounts

**Using Snowsight:**
- Admin > Accounts (as ORGADMIN/GLOBALORGADMIN)

**Using SQL:**
```sql
USE ROLE ORGADMIN;

-- List all accounts in organization
SHOW ACCOUNTS;

-- List accounts with specific details
SHOW ORGANIZATION ACCOUNTS;
```

### 5.3 Renaming Accounts

```sql
USE ROLE ORGADMIN;

ALTER ACCOUNT old_account_name RENAME TO new_account_name;
```

**Key Points:**
- Account names must remain unique within organization
- Renaming affects account URLs
- Old URLs work for 365 days after rename

### 5.4 Changing Account Edition

```sql
USE ROLE ORGADMIN;

-- Upgrade edition
ALTER ACCOUNT my_account SET EDITION = BUSINESS_CRITICAL;
```

**Edition Hierarchy:**
1. Standard
2. Enterprise
3. Business Critical

### 5.5 Deleting Accounts

```sql
USE ROLE ORGADMIN;

-- Drop account (with grace period)
DROP ACCOUNT my_old_account;

-- Immediate deletion (no recovery)
DROP ACCOUNT my_old_account GRACE_PERIOD_IN_DAYS = 0;
```

**Default Grace Period:** 3 days (can recover during this period)

---

## 6. Account URLs and Connectivity

### 6.1 Standard Account URL Formats

| Type | Format |
|------|--------|
| **Account Name** | `https://orgname-accountname.snowflakecomputing.com` |
| **Connection Name** | `https://orgname-connectionname.snowflakecomputing.com` |
| **Legacy Locator** | `https://accountlocator.region.snowflakecomputing.com` |

### 6.2 Private Connectivity URLs

For AWS PrivateLink, Azure Private Link, or GCP Private Service Connect:

```
https://orgname-accountname.privatelink.snowflakecomputing.com
```

### 6.3 Okta-Specific URLs

Okta SSO requires additional segments:

| Type | Format |
|------|--------|
| **Account Name** | `https://orgname-accountname.okta.snowflakecomputing.com` |
| **Account Locator** | `https://accountlocator.region.okta.snowflakecomputing.com` |

### 6.4 Managing Account URLs

**View Current URLs:**
```sql
USE ROLE ORGADMIN;

SELECT SYSTEM$GET_ACCOUNT_URLS('account_name');
```

**Delete Old URLs (after rename):**
- Old URLs persist for 365 days
- Can manually delete earlier if needed

---

## 7. Account Parameters

### 7.1 Viewing Account Parameters

```sql
-- View all account parameters
SHOW PARAMETERS IN ACCOUNT;

-- View specific parameter
SHOW PARAMETERS LIKE 'NETWORK_POLICY' IN ACCOUNT;
```

### 7.2 Setting Account Parameters

**Required Role:** ACCOUNTADMIN

```sql
USE ROLE ACCOUNTADMIN;

-- Set a parameter
ALTER ACCOUNT SET NETWORK_POLICY = 'my_network_policy';

-- Reset to default
ALTER ACCOUNT UNSET NETWORK_POLICY;
```

### 7.3 Common Account Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `NETWORK_POLICY` | Network rules for account access | None |
| `TIMEZONE` | Default timezone for account | UTC |
| `TIMESTAMP_TYPE_MAPPING` | Default timestamp type | TIMESTAMP_NTZ |
| `STATEMENT_TIMEOUT_IN_SECONDS` | Max query execution time | 172800 (48 hrs) |
| `REQUIRE_STORAGE_INTEGRATION_FOR_STAGE_CREATION` | Require storage integration for external stages | FALSE |
| `PREVENT_UNLOAD_TO_INLINE_URL` | Prevent COPY INTO with inline URLs | FALSE |

### 7.4 Parameter Hierarchy

Parameters can be set at multiple levels (most specific wins):

```
Account Level (broadest)
    |
    +-- User Level
    |
    +-- Session Level (most specific)
```

---

## 8. Premium Views and Organization Usage

### 8.1 ORGANIZATION_USAGE Schema

**Location:** `SNOWFLAKE.ORGANIZATION_USAGE`

**Access:** Available to ACCOUNTADMIN in any account, but premium views require organization account

### 8.2 Standard vs Premium Views

| View Type | Available In | Examples |
|-----------|--------------|----------|
| **Standard** | Any account | WAREHOUSE_METERING_HISTORY, STORAGE_USAGE |
| **Premium** | Organization account only | ACCESS_HISTORY, TAG_REFERENCES |

### 8.3 Premium Views in Organization Account

The organization account provides additional views not available in regular accounts:

- **ACCESS_HISTORY:** Cross-account query access history
- **TAG_REFERENCES:** Organization-wide tag references
- Enhanced visibility across all accounts

### 8.4 Using ORGANIZATION_USAGE

```sql
-- View warehouse usage across organization
SELECT * FROM SNOWFLAKE.ORGANIZATION_USAGE.WAREHOUSE_METERING_HISTORY
WHERE START_TIME > DATEADD(day, -7, CURRENT_TIMESTAMP());

-- View storage usage by account
SELECT * FROM SNOWFLAKE.ORGANIZATION_USAGE.STORAGE_USAGE
ORDER BY USAGE_DATE DESC;

-- From organization account: view access history
SELECT * FROM SNOWFLAKE.ORGANIZATION_USAGE.ACCESS_HISTORY
WHERE QUERY_START_TIME > DATEADD(day, -1, CURRENT_TIMESTAMP());
```

---

## 9. Key Exam Patterns

### 9.1 Account Identifier Questions

**Pattern:** Which format identifies an account?

**Key Facts:**
- Preferred: `orgname-account_name` (hyphen for URLs/connections)
- SQL statements: `orgname.account_name` (dot separator)
- Legacy: Account locator with region suffixes (still supported)

**Example Question:**
> Which is the correct way to specify an account for data sharing?
> - A) `myorg-myaccount`
> - B) `myorg.myaccount` [CORRECT]
> - C) `myaccount.myorg`
> - D) `myaccount@myorg`

### 9.2 ORGADMIN vs GLOBALORGADMIN Questions

**Pattern:** Which role can perform organization-level tasks?

**Key Facts:**
- GLOBALORGADMIN: Organization account only, full access
- ORGADMIN: ORGADMIN-enabled accounts, being phased out
- Premium views: Only in organization account

**Example Question:**
> Where can premium ORGANIZATION_USAGE views be accessed?
> - A) Any account with ORGADMIN
> - B) Only the organization account [CORRECT]
> - C) Any account with ACCOUNTADMIN
> - D) All accounts in the organization

### 9.3 Account Locator Format Questions

**Pattern:** What identifier format for specific region?

**Key Facts:**
- AWS US West 2: Just locator (`xy12345`)
- AWS other regions: Locator + region (`xy12345.us-east-1`)
- Azure: Locator + region + `azure`
- GCP: Locator + region + `gcp`
- US Gov FedRAMP: Add `fhplus` segment

### 9.4 Organization Account Questions

**Pattern:** What can/cannot be done with organization account?

**Key Facts:**
- Requires Enterprise Edition or higher
- Only ONE per organization
- Cannot convert existing ORGADMIN account
- Contains premium ORGANIZATION_USAGE views
- GLOBALORGADMIN role only exists here

### 9.5 Account Management Questions

**Pattern:** Who can create/delete/manage accounts?

**Key Facts:**
- ORGADMIN or GLOBALORGADMIN can manage accounts
- Accounts can only be created in enabled regions
- Grace period for account deletion (default 3 days)
- Account names must be unique within organization

---

## 10. Quick Reference

### 10.1 SQL Functions for Account Information

| Function | Returns |
|----------|---------|
| `CURRENT_ORGANIZATION_NAME()` | Organization name |
| `CURRENT_ACCOUNT_NAME()` | Account name |
| `CURRENT_ACCOUNT()` | Account locator |
| `CURRENT_REGION()` | Account region |

### 10.2 Account Identifier Formats Summary

| Context | Format | Example |
|---------|--------|---------|
| URL/Connection | Hyphen | `myorg-myaccount` |
| SQL Statements | Dot | `myorg.myaccount` |
| Data Sharing | Dot | `myorg.myaccount` |
| Replication | Dot | `myorg.myaccount` |

### 10.3 Key Commands

```sql
-- View organization name
SELECT CURRENT_ORGANIZATION_NAME();

-- View all accounts (ORGADMIN/GLOBALORGADMIN)
SHOW ACCOUNTS;

-- Create account
CREATE ACCOUNT name ADMIN_NAME = 'user' EMAIL = 'email' EDITION = ENTERPRISE REGION = aws_us_east_1;

-- Rename account
ALTER ACCOUNT old_name RENAME TO new_name;

-- Drop account
DROP ACCOUNT account_name;

-- Enable ORGADMIN for account
ALTER ACCOUNT account_name SET IS_ORG_ADMIN = TRUE;

-- View account parameters
SHOW PARAMETERS IN ACCOUNT;
```

### 10.4 Comparison Table: Account Types

| Feature | Organization Account | Regular Account | Reader Account |
|---------|---------------------|-----------------|----------------|
| Purpose | Organization admin | Standard workloads | Share data externally |
| GLOBALORGADMIN | Yes | No | No |
| ORGADMIN | No | If enabled | No |
| Premium views | Yes | No | No |
| Create other accounts | Yes | If ORGADMIN enabled | No |
| Full Snowflake features | Limited | Yes | Limited |

### 10.5 Exam Tips

1. **Account identifier format matters:** Hyphen for URLs, dot for SQL
2. **GLOBALORGADMIN is the future:** ORGADMIN being phased out
3. **Organization account is special:** Premium views, one per org
4. **Account locator needs suffixes:** Except AWS US West 2
5. **Account names are changeable:** Locators are not
6. **Grace period exists:** 3 days default for account deletion
7. **Region restrictions:** Must be enabled for organization

---

## References

- [Snowflake Documentation: Introduction to Organizations](https://docs.snowflake.com/en/user-guide/organizations)
- [Snowflake Documentation: Account Identifiers](https://docs.snowflake.com/en/user-guide/admin-account-identifier)
- [Snowflake Documentation: Organization Administrators](https://docs.snowflake.com/en/user-guide/organization-administrators)
- [Snowflake Documentation: Organization Accounts](https://docs.snowflake.com/en/user-guide/organization-accounts)
- [Snowflake Documentation: Managing Accounts](https://docs.snowflake.com/en/user-guide/organizations-manage-accounts)
