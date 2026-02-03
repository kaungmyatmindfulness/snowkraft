# Domain 1: Snowflake Editions and Features

## Overview

Snowflake offers multiple editions to accommodate organizations with different requirements. Each successive edition builds on the previous one by adding features and/or higher levels of service. Understanding the differences between editions is critical for the SnowPro Core exam, as many questions test knowledge of which features require specific editions.

---

## 1. Snowflake Editions

### 1.1 Standard Edition

**Description:** The introductory level offering providing full, unlimited access to all of Snowflake's standard features. It provides a strong balance between features, level of support, and cost.

**Key Characteristics:**
- All core Snowflake functionality
- Time Travel up to **1 day** (24 hours) maximum
- Fail-safe protection (7 days)
- Basic security features (SSO, MFA, encryption)
- Premier support (for accounts provisioned after May 1, 2020)

### 1.2 Enterprise Edition

**Description:** Includes all Standard features plus additional capabilities designed specifically for the needs of large-scale enterprises and organizations.

**Key Additions Beyond Standard:**
- **Extended Time Travel** up to **90 days**
- **Multi-cluster virtual warehouses** for scaling compute to meet concurrency needs
- **Materialized views** with automatic maintenance
- **Search optimization service** for point lookup queries
- **Query acceleration service** for parallel processing
- **Column-level security** (Dynamic Data Masking)
- **Row-level security** (Row Access Policies)
- **Aggregation policies** and **Projection policies**
- **Differential privacy**
- **Data classification** for sensitive data
- **ACCESS_HISTORY view** for auditing
- **Periodic rekeying** of encrypted data
- **24-hour early access** to weekly releases
- **Data Quality and Data Metric Functions**
- **Synthetic data generation**
- **Snowflake Feature Store**
- **Create and manage Data Clean Rooms**

### 1.3 Business Critical Edition

**Description:** Formerly known as Enterprise for Sensitive Data (ESD). Offers even higher levels of data protection to support organizations with extremely sensitive data, particularly PHI data that must comply with HIPAA and HITRUST CSF regulations.

**Key Additions Beyond Enterprise:**
- **Tri-Secret Secure** (customer-managed encryption keys)
- **Private connectivity** to Snowflake service:
  - AWS PrivateLink
  - Azure Private Link
  - Google Cloud Private Service Connect
- **Private connectivity to internal stages**
- **Private connectivity for outbound traffic** (external stages, external volumes)
- **Cross-Region Connectivity for AWS PrivateLink**
- **Failover and failback** for business continuity and disaster recovery
- **Client connection redirect** between accounts
- **Amazon API Gateway private endpoints** for external functions
- **Support for PHI data** (HIPAA and HITRUST CSF compliance)
- **Support for PCI DSS**
- **Support for FedRAMP and ITAR** (in Government regions)
- **Support for IRAP - Protected data** (in Asia Pacific regions)

**Important Note:** Before storing PHI data in Snowflake, a signed Business Associate Agreement (BAA) must be in place between your organization and Snowflake Inc.

### 1.4 Virtual Private Snowflake (VPS)

**Description:** The highest level of security for organizations with the strictest requirements, such as financial institutions and enterprises handling highly sensitive data.

**Key Additions Beyond Business Critical:**
- **Completely isolated environment** from all other Snowflake accounts
- **Dedicated metadata store**
- **Dedicated pool of compute resources** (virtual warehouses do not share hardware with accounts outside VPS)
- **Private collaboration** while strictly upholding security and isolation requirements
- **Different account locator format** than other Snowflake editions

**VPS Limitations:**
- No access to Snowflake Marketplace (public listings)
- No Snowflake Data Clean Rooms collaboration (standard version)

---

## 2. Edition Comparison Table

| Feature | Standard | Enterprise | Business Critical | VPS |
|---------|:--------:|:----------:|:-----------------:|:---:|
| **Time Travel (max)** | 1 day | 90 days | 90 days | 90 days |
| **Fail-safe** | 7 days | 7 days | 7 days | 7 days |
| **Multi-cluster Warehouses** | No | Yes | Yes | Yes |
| **Materialized Views** | No | Yes | Yes | Yes |
| **Search Optimization** | No | Yes | Yes | Yes |
| **Query Acceleration** | No | Yes | Yes | Yes |
| **Column-level Security** | No | Yes | Yes | Yes |
| **Row-level Security** | No | Yes | Yes | Yes |
| **Tri-Secret Secure** | No | No | Yes | Yes |
| **Private Connectivity** | No | No | Yes | Yes |
| **Failover/Failback** | No | No | Yes | Yes |
| **HIPAA/HITRUST** | No | No | Yes | Yes |
| **PCI DSS** | No | No | Yes | Yes |
| **Dedicated Resources** | No | No | No | Yes |
| **Early Access (24hr)** | No | Yes | Yes | Yes |

---

## 3. Time Travel by Edition

### 3.1 Key Concepts

**Time Travel** allows accessing historical data (modified or deleted) within a defined retention period.

| Edition | Maximum Retention | Default |
|---------|:-----------------:|:-------:|
| Standard | 1 day (24 hours) | 1 day |
| Enterprise | 90 days | 1 day |
| Business Critical | 90 days | 1 day |
| VPS | 90 days | 1 day |

### 3.2 Configuration Parameters

| Parameter | Purpose |
|-----------|---------|
| `DATA_RETENTION_TIME_IN_DAYS` | Sets retention period for an object (0-90 days) |
| `MIN_DATA_RETENTION_TIME_IN_DAYS` | Account-level minimum (ACCOUNTADMIN only) |

**Important Rules:**
- Effective retention = `MAX(DATA_RETENTION_TIME_IN_DAYS, MIN_DATA_RETENTION_TIME_IN_DAYS)`
- Setting retention to 0 effectively disables Time Travel for that object
- Time Travel cannot be completely disabled at the account level

### 3.3 Object Type Considerations

| Object Type | Retention Options |
|-------------|-------------------|
| **Permanent tables** | 0 to 90 days (Enterprise+) |
| **Transient tables** | 0 to 1 day only |
| **Temporary tables** | 0 to 1 day only |

---

## 4. Fail-safe by Edition

### 4.1 Key Concepts

**Fail-safe** is a **non-configurable 7-day period** during which historical data may be recoverable by Snowflake. It is separate from and in addition to Time Travel.

**Critical Points:**
- Fail-safe is **not** for user access to historical data
- It is for disaster recovery by Snowflake support **only**
- Recovery may take several hours to several days
- Fail-safe is provided on a **best effort basis**
- Starts immediately after Time Travel period ends

### 4.2 Fail-safe by Object Type

| Object Type | Has Fail-safe? |
|-------------|:--------------:|
| Permanent tables | Yes (7 days) |
| Transient tables | **No** |
| Temporary tables | **No** |
| Transient databases | **No** |

### 4.3 Storage Costs

Fail-safe incurs additional storage costs:
- Historical data in Fail-safe consumes storage
- You can view Fail-safe storage in Snowsight under Cost Management
- No way to reduce or eliminate Fail-safe (for permanent objects)

---

## 5. Feature Availability Matrix

### 5.1 Security Features

| Feature | Standard | Enterprise | Business Critical | VPS |
|---------|:--------:|:----------:|:-----------------:|:---:|
| SOC 2 Type II | Yes | Yes | Yes | Yes |
| Federated Auth/SSO | Yes | Yes | Yes | Yes |
| OAuth | Yes | Yes | Yes | Yes |
| Network Policies | Yes | Yes | Yes | Yes |
| Automatic Encryption | Yes | Yes | Yes | Yes |
| Multi-Factor Auth | Yes | Yes | Yes | Yes |
| Object-level Access Control | Yes | Yes | Yes | Yes |
| Object Tags | Yes | Yes | Yes | Yes |
| Periodic Rekeying | No | Yes | Yes | Yes |
| Column-level Security | No | Yes | Yes | Yes |
| Row-level Security | No | Yes | Yes | Yes |
| Aggregation Policies | No | Yes | Yes | Yes |
| Projection Policies | No | Yes | Yes | Yes |
| Differential Privacy | No | Yes | Yes | Yes |
| Data Classification | No | Yes | Yes | Yes |
| ACCESS_HISTORY View | No | Yes | Yes | Yes |
| Tri-Secret Secure | No | No | Yes | Yes |
| Private Connectivity | No | No | Yes | Yes |
| PHI Data (HIPAA) | No | No | Yes | Yes |
| PCI DSS | No | No | Yes | Yes |

### 5.2 Compute and Performance Features

| Feature | Standard | Enterprise | Business Critical | VPS |
|---------|:--------:|:----------:|:-----------------:|:---:|
| Virtual Warehouses | Yes | Yes | Yes | Yes |
| Resource Monitors | Yes | Yes | Yes | Yes |
| Multi-cluster Warehouses | No | Yes | Yes | Yes |
| Query Acceleration | No | Yes | Yes | Yes |
| Search Optimization | No | Yes | Yes | Yes |
| Materialized Views | No | Yes | Yes | Yes |
| Clustering Keys | Yes | Yes | Yes | Yes |

### 5.3 Data Management Features

| Feature | Standard | Enterprise | Business Critical | VPS |
|---------|:--------:|:----------:|:-----------------:|:---:|
| Dynamic Tables | Yes | Yes | Yes | Yes |
| External Tables | Yes | Yes | Yes | Yes |
| Hybrid Tables | Yes | Yes | Yes | Yes |
| Iceberg Tables | Yes | Yes | Yes | Yes |
| Streams | Yes | Yes | Yes | Yes |
| Tasks | Yes | Yes | Yes | Yes |
| Database Replication | Yes | Yes | Yes | Yes |
| Failover/Failback | No | No | Yes | Yes |
| Client Redirect | No | No | Yes | Yes |

### 5.4 Data Sharing Features

| Feature | Standard | Enterprise | Business Critical | VPS |
|---------|:--------:|:----------:|:-----------------:|:---:|
| Snowflake Marketplace | Yes | Yes | Yes | No |
| Private Listings | Yes | Yes | Yes | Yes |
| Public Listings | Yes | Yes | Yes | No |
| Data Clean Rooms (join) | Yes | Yes | Yes | No |
| Data Clean Rooms (create) | No | Yes | Yes | Yes |
| Cross-cloud Auto-fulfillment | Yes | Yes | Yes | Yes |

---

## 6. Account Types (Pricing Models)

### 6.1 On Demand

- Usage-based pricing
- No long-term licensing requirements
- Pay for what you use
- Higher per-unit cost

### 6.2 Capacity

- Discounted pricing
- Based on upfront Capacity commitment
- Lower per-unit cost
- Requires commitment

**Note:** The Snowflake Edition combined with your region and account type (On Demand vs. Capacity) determines your unit costs for credits and storage.

---

## 7. Working with Editions

### 7.1 Viewing Account Edition

**Using Snowsight:**
1. Navigate to Admin > Accounts
2. View the Edition column

**Using SQL:**
```sql
SELECT CURRENT_ACCOUNT(), CURRENT_REGION();
-- Use ACCOUNT_USAGE.ACCOUNTS view for edition information
```

### 7.2 Changing Account Edition

- Upgrades can be requested through Snowflake
- Downgrades may require consultation
- Edition changes affect pricing immediately
- Features not available in lower edition become unavailable on downgrade

---

## 8. Exam Tips and Common Question Patterns

### 8.1 Edition Identification Questions

**Pattern:** "Which edition is required for [feature]?"

**High-Frequency Enterprise Features:**
- Multi-cluster warehouses
- Extended Time Travel (beyond 1 day)
- Materialized views
- Search optimization service
- Query acceleration service
- Column-level security / Dynamic Data Masking
- Row-level security / Row Access Policies

**High-Frequency Business Critical Features:**
- Tri-Secret Secure
- Private connectivity (PrivateLink)
- Failover and failback
- HIPAA compliance
- PCI DSS compliance

### 8.2 Time Travel Questions

**Common Traps:**
- Standard Edition maximum is **1 day**, not 7 days
- 90 days requires Enterprise **or higher**
- Transient/Temporary tables are limited to **1 day max** regardless of edition
- Default is 1 day for all editions

**Key Formula:**
```
Effective Retention = MAX(DATA_RETENTION_TIME_IN_DAYS, MIN_DATA_RETENTION_TIME_IN_DAYS)
```

### 8.3 Fail-safe Questions

**Key Facts to Remember:**
- Always **7 days** - non-configurable
- Not available for transient or temporary objects
- User cannot directly access Fail-safe data
- Snowflake support recovers data (best effort)
- Incurs storage costs

### 8.4 Security Feature Questions

**Enterprise vs Business Critical:**
- If it involves **masking, row access, or governance** = Enterprise
- If it involves **encryption keys (customer-managed)** = Business Critical
- If it involves **private network connectivity** = Business Critical
- If it involves **regulatory compliance (HIPAA, PCI)** = Business Critical

### 8.5 VPS Questions

**Unique VPS Facts:**
- Completely isolated environment
- Different account locator format
- Dedicated compute resources
- No Snowflake Marketplace access
- Used for highest security requirements

### 8.6 Trick Questions

1. **"What is the minimum Time Travel retention?"**
   - Answer: 0 days (can be disabled for objects)
   - But cannot be disabled account-wide

2. **"What happens to Time Travel data after retention expires?"**
   - Permanent tables: Moves to Fail-safe
   - Transient tables: Deleted (no Fail-safe)

3. **"Which edition includes Fail-safe?"**
   - All editions have Fail-safe for permanent objects
   - Transient/temporary objects never have Fail-safe

4. **"Can you access Fail-safe data directly?"**
   - No - only Snowflake support can recover it

---

## 9. Quick Reference Summary

### Edition Progression
```
Standard --> Enterprise --> Business Critical --> VPS
   |            |                |                 |
   |            |                |                 +-- Isolated environment
   |            |                +-- Private connectivity, compliance
   |            +-- Advanced features, extended Time Travel
   +-- Core features, 1-day Time Travel
```

### Time Travel Quick Reference
| Scenario | Max Retention |
|----------|:-------------:|
| Standard Edition, permanent table | 1 day |
| Enterprise Edition, permanent table | 90 days |
| Any Edition, transient table | 1 day |
| Any Edition, temporary table | 1 day |

### Fail-safe Quick Reference
| Object Type | Fail-safe |
|-------------|:---------:|
| Permanent table | 7 days |
| Transient table | None |
| Temporary table | None |
| External table | None |

---

## 10. Practice Questions

1. **Your organization requires 30-day Time Travel for audit purposes. Which minimum edition do you need?**

<details>
<summary>Show Answer</summary>

Answer: Enterprise Edition
</details>

2. **A customer needs to store PHI data in Snowflake. What edition is required?**

<details>
<summary>Show Answer</summary>

Answer: Business Critical Edition (with signed BAA)
</details>

3. **Which feature allows scaling virtual warehouses to handle concurrent query loads?**

<details>
<summary>Show Answer</summary>

Answer: Multi-cluster warehouses (Enterprise+ required)
</details>

4. **After Time Travel expires, how long is data retained in Fail-safe?**

<details>
<summary>Show Answer</summary>

Answer: 7 days (non-configurable)
</details>

5. **A transient table has DATA_RETENTION_TIME_IN_DAYS set to 5. What is the actual retention?**

<details>
<summary>Show Answer</summary>

Answer: 1 day (transient tables are limited to 0-1 day regardless of setting)
</details>

6. **Which edition provides dedicated compute resources isolated from all other Snowflake accounts?**

<details>
<summary>Show Answer</summary>

Answer: Virtual Private Snowflake (VPS)
</details>

7. **Your organization needs to use AWS PrivateLink for secure connectivity. Which edition is required?**

<details>
<summary>Show Answer</summary>

Answer: Business Critical Edition
</details>

8. **Which security feature requires Enterprise Edition: Multi-Factor Authentication or Row Access Policies?**

<details>
<summary>Show Answer</summary>

Answer: Row Access Policies (MFA is available in all editions)
</details>
