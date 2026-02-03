# Domain 2: Account Access & Security - Data Encryption

## Overview

Data encryption is a fundamental security feature in Snowflake that protects customer data at rest and in transit. This section covers Snowflake's encryption architecture, key management hierarchy, Tri-Secret Secure for enhanced control, and end-to-end encryption capabilities.

**Exam Weight**: Domain 2 (Account Access & Security) accounts for 20-25% of the SnowPro Core exam.

---

## 1. Encryption Fundamentals in Snowflake

### Default Encryption

Snowflake encrypts **all customer data by default** - there is no configuration required to enable basic encryption. This includes:

- **Data at Rest**: All data stored in Snowflake tables is automatically encrypted
- **Data in Transit**: All data moving between Snowflake and clients uses TLS (Transport Layer Security)
- **Encryption Algorithm**: AES-256 (Advanced Encryption Standard with 256-bit keys)

### Key Principles

| Principle | Description |
|-----------|-------------|
| Automatic | Encryption is enabled by default with no customer action required |
| Always-On | Cannot be disabled - all data is always encrypted |
| Transparent | No impact on query performance or user experience |
| Complete | Applies to all customer data, metadata, and temporary files |

---

## 2. Encryption Key Hierarchy

Snowflake uses a **hierarchical key model** that provides multiple layers of protection. Understanding this hierarchy is critical for the exam.

### The Four-Level Key Hierarchy

```
                    +------------------+
                    |    ROOT KEY      |  <- Stored in HSM
                    +------------------+
                            |
                            v
                    +------------------+
                    | ACCOUNT MASTER   |  <- One per account
                    |      KEY         |
                    +------------------+
                            |
                            v
                    +------------------+
                    |  TABLE MASTER    |  <- One per table
                    |      KEY         |
                    +------------------+
                            |
                            v
                    +------------------+
                    |    FILE KEY      |  <- One per file
                    +------------------+
```

### Key Level Details

| Key Level | Scope | Purpose |
|-----------|-------|---------|
| **Root Key** | Cloud Provider HSM | Top of hierarchy, stored in Hardware Security Module |
| **Account Master Key (AMK)** | One per Snowflake account | Wraps all table master keys for the account |
| **Table Master Key (TMK)** | One per table | Encrypts file keys for a specific table |
| **File Key** | One per micro-partition | Directly encrypts the data in each file |

### Key Wrapping Concept

- **Wrapping** means a parent key encrypts (protects) child keys
- Root key wraps account master key
- Account master key wraps table master keys
- Table master keys wrap file keys
- **File keys are the only keys that directly encrypt raw data**

### Hardware Security Module (HSM)

Snowflake relies on cloud-hosted HSMs for secure key storage:

| Cloud Provider | HSM Usage |
|----------------|-----------|
| **AWS** | HSM creates and stores the root key |
| **Azure** | HSM creates and stores the root key |
| **Google Cloud** | Cloud KMS API with multi-tenant HSM partitions |

---

## 3. Encryption Key Rotation

### Automatic Key Rotation

Snowflake automatically rotates keys **every 30 days**:

- Active keys are retired
- New keys are generated
- Retired keys remain available for decryption only
- Eventually, retired keys are destroyed

### Key States

```
+----------+    30 days    +----------+    Rekeying    +-----------+
|  ACTIVE  | ------------> | RETIRED  | ------------> | DESTROYED |
+----------+               +----------+               +-----------+
     |                          |
     | Encrypts new data        | Decrypts existing data only
     v                          v
```

| State | Encryption | Decryption | Duration |
|-------|------------|------------|----------|
| **Active** | Yes | Yes | 30 days |
| **Retired** | No | Yes | Until rekeyed |
| **Destroyed** | No | No | N/A |

### Example: Table Master Key Rotation Over Time

```
APRIL:     TMK v1 (Active)    -> Encrypts/decrypts April data
MAY:       TMK v1 (Retired)   -> Decrypts April data only
           TMK v2 (Active)    -> Encrypts/decrypts May data
JUNE:      TMK v1 (Retired)   -> Decrypts April data only
           TMK v2 (Retired)   -> Decrypts May data only
           TMK v3 (Active)    -> Encrypts/decrypts June data
```

---

## 4. Periodic Rekeying (Enterprise Edition)

### What is Rekeying?

**Periodic rekeying** is different from key rotation:

| Feature | Key Rotation | Periodic Rekeying |
|---------|--------------|-------------------|
| What happens | New key created, old key retired | Data re-encrypted with new key |
| Key state | Active -> Retired | Retired -> Destroyed |
| Data affected | New data only | Existing data |
| Frequency | Every 30 days (automatic) | After 1 year of retirement |
| Edition | All editions | **Enterprise Edition and higher** |

### Rekeying Process

1. After a key has been retired for **one year**, Snowflake creates a new key
2. Data encrypted with the old key is decrypted and re-encrypted with the new key
3. The old key is destroyed (can no longer be used)
4. Process happens online with **no downtime or performance impact**

### Enabling Periodic Rekeying

```sql
-- Requires ACCOUNTADMIN role
ALTER ACCOUNT SET PERIODIC_DATA_REKEYING = TRUE;
```

### Impact on Time Travel and Fail-safe

- Time Travel and Fail-safe retention periods are **not affected** by rekeying
- Additional storage charges apply during the 7-day Fail-safe period for rekeyed files
- Both old and new encrypted versions exist during the Fail-safe window

---

## 5. Tri-Secret Secure (Business Critical Edition)

### Overview

**Tri-Secret Secure** provides three levels of data protection through a dual-key encryption model:

1. Snowflake-maintained key
2. Customer-managed key (CMK)
3. User authentication

```
+------------------------+     +------------------------+
|  SNOWFLAKE-MAINTAINED  |  +  |   CUSTOMER-MANAGED     |
|         KEY            |     |       KEY (CMK)        |
+------------------------+     +------------------------+
              |                           |
              +-------------+-------------+
                            |
                            v
              +---------------------------+
              |     COMPOSITE MASTER      |
              |          KEY              |
              +---------------------------+
                            |
                            v
              +---------------------------+
              |   Wraps Account Master    |
              |        Key Hierarchy      |
              +---------------------------+
```

### Key Characteristics

| Aspect | Detail |
|--------|--------|
| **Edition Required** | Business Critical (or higher) |
| **CMK Location** | Customer's cloud provider KMS |
| **Composite Key** | Combines Snowflake key + CMK |
| **Data Protection** | CMK revocation stops all data access |
| **Compliance** | Supports SOC 2, PCI-DSS, HIPAA, HITRUST CSF |

### Cloud Provider Key Management Services

| Cloud | Key Management Service |
|-------|----------------------|
| **AWS** | AWS Key Management Service (KMS) |
| **Azure** | Azure Key Vault |
| **Google Cloud** | Cloud Key Management Service (Cloud KMS) |

### CMK Self-Registration Process

1. Create the CMK in your cloud provider's KMS
2. Call `SYSTEM$REGISTER_CMK_INFO` to register the CMK
3. Call `SYSTEM$GET_CMK_INFO` to verify registration
4. Call `SYSTEM$GET_CMK_CONFIG` to generate cloud policy
5. Apply the KMS policy on your cloud provider
6. Call `SYSTEM$VERIFY_CMK_INFO` to confirm connectivity
7. Contact Snowflake Support to enable Tri-Secret Secure

### Important CMK Requirements

| Requirement | Description |
|-------------|-------------|
| **Confidentiality** | Key must remain secure and confidential at all times |
| **Integrity** | Key must be protected against modification or deletion |
| **Availability** | Key must be continuously available (10-minute tolerance) |

**Critical Warning**: If the CMK becomes unavailable for more than 10 minutes, all data operations cease. If the CMK is destroyed, all data becomes permanently unreadable.

### Checking CMK Status

```sql
-- Check registration and activation status
SELECT SYSTEM$GET_CMK_INFO();
```

Status messages:
- `...is being activated...` - Rekeying in progress
- `...is activated...` - Tri-Secret Secure is active
- `...is being rekeyed...` - CMK change in progress

---

## 6. End-to-End Encryption (E2EE)

### What is E2EE?

End-to-end encryption ensures data is protected throughout its entire lifecycle:

```
+----------------+        +----------------+        +----------------+
|    CLIENT      |  TLS   |   SNOWFLAKE    |  TLS   |    STORAGE     |
|  (User/App)    | -----> |    SERVICE     | -----> |  (Cloud/VPC)   |
+----------------+        +----------------+        +----------------+
    Encrypted               Encrypted                  Encrypted
    at Source               in Transit                 at Rest
```

### Data Flow with E2EE

#### Internal Stages (Snowflake-provided)

1. User uploads data files
2. Snowflake client **automatically encrypts** files before transmission
3. Files are encrypted in transit (TLS)
4. Files remain encrypted in the internal stage
5. Data is re-encrypted when loaded into tables

#### External Stages (Customer-provided)

1. User optionally encrypts files with **client-side encryption**
2. Files uploaded to external stage (S3, GCS, Azure Blob)
3. Snowflake loads and decrypts using provided master key
4. Data is re-encrypted in Snowflake's format

### Client-Side Encryption

Client-side encryption uses a **master key** that you create and share with Snowflake:

```sql
-- Create stage with client-side encryption
CREATE STAGE encrypted_customer_stage
  URL = 's3://customer-bucket/data/'
  CREDENTIALS = (
    AWS_KEY_ID = 'ABCDEFGH'
    AWS_SECRET_KEY = '12345678'
  )
  ENCRYPTION = (
    MASTER_KEY = 'eSxX...='  -- Base64-encoded 128-bit or 256-bit AES key
  );
```

### Client-Side Encryption Protocol

```
+--------+    1. Generate     +--------+
| CLIENT | ----------------> | RANDOM |
+--------+    encryption     |  KEY   |
     |        key            +--------+
     |                            |
     | 2. Encrypt data           | 3. Encrypt random
     |    with random key        |    key with master key
     v                            v
+--------+                  +---------+
| ENCRYPT|                  | ENCRYPT |
|  DATA  |                  |  KEY    |
+--------+                  +---------+
     |                            |
     +--------+    4. Upload     +---+
              |    both          |
              v                  v
        +----------------------------+
        |      CLOUD STORAGE         |
        | (Encrypted file + metadata)|
        +----------------------------+
```

### Encryption Options by Cloud Provider

#### AWS S3

| Type | Description | Key Configuration |
|------|-------------|-------------------|
| **AWS_CSE** | Client-side encryption | Requires `MASTER_KEY` (128 or 256-bit AES) |
| **AWS_SSE_S3** | Server-side encryption (S3 managed) | No additional settings |
| **AWS_SSE_KMS** | Server-side encryption (KMS managed) | Optional `KMS_KEY_ID` |

#### Google Cloud Storage

| Type | Description | Key Configuration |
|------|-------------|-------------------|
| **Default SSE** | Server-side encryption (GCS managed) | Automatic |
| **GCS_SSE_KMS** | Server-side encryption (Cloud KMS) | Optional `KMS_KEY_ID` |

**Note**: Snowflake supports AWS V1 encryption standards only (V2 is not supported).

---

## 7. Encryption Summary Diagram

```
+===========================================================================+
|                     SNOWFLAKE ENCRYPTION ARCHITECTURE                      |
+===========================================================================+
|                                                                           |
|  EXTERNAL                        SNOWFLAKE                     STORAGE    |
|  --------                        ---------                     -------    |
|                                                                           |
|  +----------+     TLS 1.2+     +-------------+               +---------+  |
|  |  CLIENT  | --------------> |   SERVICE   |               |  CLOUD  |  |
|  +----------+   Encrypted     |    LAYER    |               | STORAGE |  |
|       |        in Transit     +-------------+               +---------+  |
|       |                              |                           ^        |
|       |                              | AES-256                   |        |
|       |                              v                     AES-256|        |
|       |                       +-------------+                    |        |
|       |                       |   COMPUTE   |--------------------+        |
|       |                       |    LAYER    |     Encrypted               |
|       |                       +-------------+     at Rest                 |
|       |                                                                   |
|  +----v-----+                                                             |
|  | OPTIONAL |     For External Stages:                                    |
|  | CLIENT-  |     - AWS_CSE (client-side)                                 |
|  |   SIDE   |     - AWS_SSE_S3/KMS (server-side)                          |
|  | ENCRYPT  |     - GCS_SSE_KMS                                           |
|  +----------+                                                             |
|                                                                           |
+===========================================================================+
|                          KEY HIERARCHY                                    |
+===========================================================================+
|                                                                           |
|     [HSM]              [Standard]           [Tri-Secret Secure]           |
|       |                    |                        |                     |
|   Root Key           Root Key              Root Key + CMK                 |
|       |                    |                        |                     |
|       v                    v                        v                     |
|   Account            Account                Composite Master              |
|   Master Key         Master Key             Key                           |
|       |                    |                        |                     |
|       v                    v                        v                     |
|   Table Master       Table Master           Table Master                  |
|   Keys               Keys                   Keys                          |
|       |                    |                        |                     |
|       v                    v                        v                     |
|   File Keys          File Keys              File Keys                     |
|                                                                           |
+===========================================================================+
```

---

## 8. Exam Tips and Common Question Patterns

### Key Facts to Remember

1. **All Snowflake data is encrypted by default** - no configuration needed
2. **AES-256** is the encryption algorithm used
3. **Key rotation occurs automatically every 30 days**
4. **Periodic rekeying requires Enterprise Edition** and must be enabled
5. **Tri-Secret Secure requires Business Critical Edition**
6. **HSM** (Hardware Security Module) stores the root key
7. **Only file keys directly encrypt data** - other keys wrap child keys
8. **CMK unavailability > 10 minutes** stops all data operations

### Common Exam Question Patterns

#### Pattern 1: Edition Requirements

**Q**: Which Snowflake edition is required for Tri-Secret Secure?
- A) Standard
- B) Enterprise
- C) Business Critical
- D) Virtual Private Snowflake

**Answer**: C - Business Critical Edition (or higher)

#### Pattern 2: Key Hierarchy

**Q**: In Snowflake's encryption key hierarchy, which key directly encrypts customer data?
- A) Root Key
- B) Account Master Key
- C) Table Master Key
- D) File Key

**Answer**: D - File keys directly encrypt the data; all other keys wrap child keys

#### Pattern 3: Key Rotation

**Q**: How often does Snowflake automatically rotate encryption keys?
- A) Every 7 days
- B) Every 30 days
- C) Every 90 days
- D) Every 365 days

**Answer**: B - Keys are rotated every 30 days

#### Pattern 4: Tri-Secret Secure

**Q**: What happens if a customer-managed key (CMK) becomes unavailable in Tri-Secret Secure?
- A) Snowflake uses a backup key automatically
- B) Data operations continue using cached keys
- C) Data operations halt after approximately 10 minutes
- D) Only write operations are affected

**Answer**: C - Snowflake can handle temporary unavailability up to 10 minutes; after that, all data operations cease

#### Pattern 5: Client-Side Encryption

**Q**: What is required to use client-side encryption when loading data from an external stage?
- A) Enterprise Edition
- B) A 128-bit or 256-bit Base64-encoded master key
- C) AWS KMS integration only
- D) Tri-Secret Secure enabled

**Answer**: B - Client-side encryption requires a master key (128 or 256-bit AES) in Base64 format

#### Pattern 6: Periodic Rekeying

**Q**: What is the primary difference between key rotation and periodic rekeying?
- A) Key rotation is manual; rekeying is automatic
- B) Key rotation creates new keys; rekeying re-encrypts existing data with new keys
- C) Key rotation requires Enterprise Edition; rekeying requires Standard
- D) There is no difference

**Answer**: B - Key rotation creates new keys for new data; periodic rekeying re-encrypts existing data and destroys old keys

### Exam Traps to Avoid

| Trap | Reality |
|------|---------|
| "Encryption can be disabled for performance" | Encryption is always on and cannot be disabled |
| "ACCOUNTADMIN can access the root key" | Root key is in HSM, not accessible to any role |
| "Periodic rekeying causes downtime" | Rekeying is online with no impact on workloads |
| "CMK gives Snowflake access to your KMS" | Snowflake never has direct access to your KMS - only uses the key through APIs |
| "Client-side encryption is required for external stages" | It's optional but recommended |

### Quick Reference: Encryption Features by Edition

| Feature | Standard | Enterprise | Business Critical |
|---------|----------|------------|-------------------|
| Default AES-256 encryption | Yes | Yes | Yes |
| Automatic key rotation (30 days) | Yes | Yes | Yes |
| Hierarchical key model | Yes | Yes | Yes |
| HSM-protected root key | Yes | Yes | Yes |
| Periodic rekeying | No | Yes | Yes |
| Tri-Secret Secure (CMK) | No | No | Yes |
| HIPAA/HITRUST compliance | No | No | Yes |

---

## 9. Practice Questions

### Question 1

What encryption standard does Snowflake use to encrypt customer data at rest?

- A) AES-128
- B) AES-256
- C) RSA-2048
- D) TLS 1.3

<details>
<summary>Show Answer</summary>

**Answer**: B - Snowflake uses AES-256 (Advanced Encryption Standard with 256-bit keys) for data at rest.

</details>

### Question 2

In Snowflake's hierarchical key model, how many levels of keys exist?

- A) Two (Root and File keys)
- B) Three (Root, Account, and Table keys)
- C) Four (Root, Account, Table, and File keys)
- D) Five (Root, Organization, Account, Table, and File keys)

<details>
<summary>Show Answer</summary>

**Answer**: C - The hierarchy has four levels: Root Key, Account Master Key, Table Master Key, and File Key.

</details>

### Question 3

A company using Snowflake Business Critical Edition wants complete control over their encryption keys. Which feature should they implement?

- A) Periodic Rekeying
- B) Client-Side Encryption
- C) Tri-Secret Secure
- D) AWS SSE-KMS

<details>
<summary>Show Answer</summary>

**Answer**: C - Tri-Secret Secure allows customers to maintain their own encryption key (CMK) that combines with Snowflake's key to create a composite master key.

</details>

### Question 4

Which SQL command would you use to check the status of your customer-managed key in Tri-Secret Secure?

- A) `SHOW ENCRYPTION KEYS`
- B) `DESCRIBE CMK_STATUS`
- C) `SELECT SYSTEM$GET_CMK_INFO()`
- D) `CALL CHECK_CMK_STATUS()`

<details>
<summary>Show Answer</summary>

**Answer**: C - The `SYSTEM$GET_CMK_INFO()` system function returns the registration and activation status of your CMK.

</details>

### Question 5

What is the maximum time Snowflake can tolerate a customer-managed key being unavailable before data operations are affected?

- A) 1 minute
- B) 10 minutes
- C) 1 hour
- D) 24 hours

<details>
<summary>Show Answer</summary>

**Answer**: B - Snowflake can handle temporary CMK unavailability for up to 10 minutes. After that, all data operations cease.

</details>

### Question 6

Which of the following is TRUE about encryption key rotation in Snowflake?

- A) It must be manually triggered by an administrator
- B) It occurs automatically every 30 days
- C) It requires Enterprise Edition
- D) It re-encrypts all existing data

<details>
<summary>Show Answer</summary>

**Answer**: B - Key rotation is automatic and occurs every 30 days in all editions. Note: Key rotation creates new keys for new data; periodic rekeying (Enterprise+) re-encrypts existing data.

</details>

### Question 7

When creating an external stage with client-side encryption, what format must the MASTER_KEY be in?

- A) Hexadecimal
- B) Base64-encoded
- C) Plain text
- D) SHA-256 hash

<details>
<summary>Show Answer</summary>

**Answer**: B - The master key must be a 128-bit or 256-bit AES key in Base64-encoded format.

</details>

### Question 8

Which key in Snowflake's hierarchy is stored in a Hardware Security Module (HSM)?

- A) File Key
- B) Table Master Key
- C) Account Master Key
- D) Root Key

<details>
<summary>Show Answer</summary>

**Answer**: D - The Root Key is stored in the cloud provider's Hardware Security Module (HSM) for maximum security.

</details>

---

## 10. Summary

Snowflake provides comprehensive encryption protection through:

1. **Always-on AES-256 encryption** for all data at rest and TLS for data in transit
2. **Hierarchical key model** with four levels (Root, Account, Table, File)
3. **Automatic key rotation** every 30 days to limit key exposure
4. **Periodic rekeying** (Enterprise+) to fully retire old keys after one year
5. **Tri-Secret Secure** (Business Critical+) for customer-controlled encryption keys
6. **End-to-end encryption** with optional client-side encryption for external stages

Understanding these encryption mechanisms, their edition requirements, and how they work together is essential for the SnowPro Core certification exam.
