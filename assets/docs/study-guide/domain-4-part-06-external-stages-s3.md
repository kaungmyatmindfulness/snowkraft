# Domain 4: Data Loading & Unloading

## Part 6: External Stages - AWS S3

**Exam Weight: 10-15%**

This section provides comprehensive coverage of AWS S3 external stages in Snowflake, including storage integration configuration, IAM role setup, S3 bucket policies, and best practices for secure data loading from Amazon S3.

---

## Table of Contents

1. [Overview of S3 External Stages](#overview-of-s3-external-stages)
2. [S3 Access Configuration Options](#s3-access-configuration-options)
3. [Option 1: Storage Integration (Recommended)](#option-1-storage-integration-recommended)
4. [AWS IAM Permissions Requirements](#aws-iam-permissions-requirements)
5. [Creating an S3 External Stage](#creating-an-s3-external-stage)
6. [S3 Data File Encryption](#s3-data-file-encryption)
7. [VPC Endpoint and Network Security](#vpc-endpoint-and-network-security)
8. [Loading Data from S3](#loading-data-from-s3)
9. [Storage Integration vs Direct Credentials Comparison](#storage-integration-vs-direct-credentials-comparison)
10. [Exam Tips and Common Question Patterns](#exam-tips-and-common-question-patterns)

---

## Overview of S3 External Stages

An **external stage** is a named Snowflake object that references data files stored in cloud storage outside of Snowflake. When using Amazon S3, external stages allow you to load data from and unload data to S3 buckets.

### Key Characteristics

| Feature | Description |
|---------|-------------|
| **Object Type** | Named database object (CREATE STAGE) |
| **Storage Location** | Amazon S3 bucket (managed by your AWS account) |
| **File Upload** | Use AWS tools (Console, CLI, SDK) - NOT the PUT command |
| **Authentication** | Storage integration (recommended) or direct credentials |
| **Cross-Cloud Support** | Can load from S3 regardless of Snowflake's cloud platform |

### S3 External Stage Data Flow

```
+-------------------+     +------------------+     +-------------------+
|   Data Source     |     |   Amazon S3      |     |   Snowflake       |
|                   |     |                  |     |                   |
|  Local Files      | --> |  S3 Bucket       | --> |  External Stage   |
|  Applications     |     |  /bucket/path/   |     |  @my_s3_stage     |
|  ETL Tools        |     |                  |     |                   |
+-------------------+     +------------------+     +-------------------+
                                   |                        |
                                   |                        v
                          AWS SDK/CLI             COPY INTO table_name
                          AWS Console             FROM @my_s3_stage
```

### S3 URL Formats

| Region Type | Protocol | Example URL |
|-------------|----------|-------------|
| **Public AWS Regions** | `s3://` | `s3://mybucket/path/` |
| **AWS China Regions** | `s3china://` | `s3china://mybucket/path/` |
| **AWS GovCloud Regions** | `s3gov://` | `s3gov://mybucket/path/` |

**Important**: Always append a forward slash (`/`) to the URL to filter to the specified folder path. Without it, all files and folders starting with that prefix are included.

---

## S3 Access Configuration Options

Snowflake provides three options for configuring secure access to private S3 buckets:

### Comparison of Access Options

| Option | Recommended | Description | Key Benefit |
|--------|-------------|-------------|-------------|
| **Option 1: Storage Integration** | **Yes** | Delegates authentication to Snowflake IAM entity | No credentials in stage definition |
| **Option 2: AWS IAM Role** | No (Deprecated) | Configures IAM role for Snowflake access | Role-based access without keys |
| **Option 3: IAM User Credentials** | No | Uses AWS access key ID and secret key | Simple setup for testing |

### Decision Flow

```
Should you use Storage Integration?
          |
          v
     +----+----+
     |   YES   |  <-- Production environments
     +---------+      Security-conscious organizations
          |           Reusable across multiple stages
          |           Centralized credential management
          v
  CREATE STORAGE INTEGRATION
          |
          v
  Reference in CREATE STAGE with STORAGE_INTEGRATION parameter
```

**Best Practice**: Snowflake highly recommends Option 1 (Storage Integration) for all production workloads. Options 2 and 3 require credentials in stage definitions, which is less secure.

---

## Option 1: Storage Integration (Recommended)

A **storage integration** is a named, first-class Snowflake object that stores an AWS IAM user ID and delegates authentication responsibility to that Snowflake-managed identity.

### Storage Integration Architecture

```
+------------------------------------------------------------------+
|                    STORAGE INTEGRATION FLOW                       |
+------------------------------------------------------------------+
|                                                                    |
|  1. Create Storage Integration in Snowflake                       |
|     +----------------------------------------------------+        |
|     | CREATE STORAGE INTEGRATION s3_int                  |        |
|     |   TYPE = EXTERNAL_STAGE                            |        |
|     |   STORAGE_PROVIDER = 'S3'                          |        |
|     |   STORAGE_AWS_ROLE_ARN = 'arn:aws:iam::...:role/x' |        |
|     |   STORAGE_ALLOWED_LOCATIONS = ('s3://bucket/')     |        |
|     +----------------------------------------------------+        |
|                              |                                     |
|                              v                                     |
|  2. Snowflake Creates IAM User (automatic)                        |
|     +----------------------------------------------------+        |
|     | STORAGE_AWS_IAM_USER_ARN:                          |        |
|     |   arn:aws:iam::123456789001:user/abc1-b-self1234   |        |
|     |                                                    |        |
|     | STORAGE_AWS_EXTERNAL_ID:                           |        |
|     |   MYACCOUNT_SFCRole=2_a123456/s0aBCDEfGHIJklmNoPq= |        |
|     +----------------------------------------------------+        |
|                              |                                     |
|                              v                                     |
|  3. AWS Admin Updates IAM Role Trust Policy                       |
|     +----------------------------------------------------+        |
|     | Trust Policy allows Snowflake IAM user to assume   |        |
|     | the role using the external ID for verification    |        |
|     +----------------------------------------------------+        |
|                              |                                     |
|                              v                                     |
|  4. Create Stage Referencing Storage Integration                   |
|     +----------------------------------------------------+        |
|     | CREATE STAGE my_s3_stage                           |        |
|     |   STORAGE_INTEGRATION = s3_int                     |        |
|     |   URL = 's3://mybucket/path/'                      |        |
|     +----------------------------------------------------+        |
|                                                                    |
+------------------------------------------------------------------+
```

### Step-by-Step Setup Process

#### Step 1: Configure Access Permissions in AWS

Create an IAM policy that grants Snowflake the required S3 permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:GetObjectVersion",
        "s3:DeleteObject",
        "s3:DeleteObjectVersion"
      ],
      "Resource": "arn:aws:s3:::<bucket>/<prefix>/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": "arn:aws:s3:::<bucket>",
      "Condition": {
        "StringLike": {
          "s3:prefix": ["<prefix>/*"]
        }
      }
    }
  ]
}
```

#### Step 2: Create IAM Role in AWS

1. Create an IAM role with trusted entity type "AWS Account"
2. Select "Another AWS account" and enter your own AWS account ID (temporarily)
3. Enable "Require external ID" and enter a placeholder (e.g., `0000`)
4. Attach the policy created in Step 1
5. Record the Role ARN (e.g., `arn:aws:iam::001234567890:role/myrole`)

#### Step 3: Create Storage Integration in Snowflake

```sql
CREATE STORAGE INTEGRATION s3_int
  TYPE = EXTERNAL_STAGE
  STORAGE_PROVIDER = 'S3'
  ENABLED = TRUE
  STORAGE_AWS_ROLE_ARN = 'arn:aws:iam::001234567890:role/myrole'
  STORAGE_ALLOWED_LOCATIONS = ('s3://mybucket/path1/', 's3://mybucket/path2/')
  STORAGE_BLOCKED_LOCATIONS = ('s3://mybucket/path1/sensitive/');
```

**Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `TYPE` | Yes | Must be `EXTERNAL_STAGE` |
| `STORAGE_PROVIDER` | Yes | Must be `'S3'` for AWS |
| `ENABLED` | Yes | Enable/disable the integration |
| `STORAGE_AWS_ROLE_ARN` | Yes | ARN of the IAM role in your AWS account |
| `STORAGE_ALLOWED_LOCATIONS` | Yes | List of allowed S3 locations (use `'*'` for all) |
| `STORAGE_BLOCKED_LOCATIONS` | No | List of blocked S3 locations |

#### Step 4: Retrieve Snowflake IAM User Information

```sql
DESC INTEGRATION s3_int;
```

**Output Properties:**

| Property | Description | Example |
|----------|-------------|---------|
| `STORAGE_AWS_IAM_USER_ARN` | Snowflake's IAM user for this account | `arn:aws:iam::123456789001:user/abc1-b-self1234` |
| `STORAGE_AWS_EXTERNAL_ID` | External ID for trust relationship | `MYACCOUNT_SFCRole=2_a123456/s0...` |
| `STORAGE_AWS_ROLE_ARN` | Your IAM role ARN | `arn:aws:iam::001234567890:role/myrole` |

**Critical**: Snowflake provisions a **single IAM user** for your entire Snowflake account. All S3 storage integrations use this same IAM user.

#### Step 5: Update IAM Role Trust Policy in AWS

Update the trust policy to allow Snowflake's IAM user to assume the role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "",
      "Effect": "Allow",
      "Principal": {
        "AWS": "<STORAGE_AWS_IAM_USER_ARN>"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "<STORAGE_AWS_EXTERNAL_ID>"
        }
      }
    }
  ]
}
```

**Security Note**: If you recreate a storage integration using `CREATE OR REPLACE`, it generates a **new external ID**. You must update the trust policy with the new external ID.

#### Step 6: Validate the Integration

```sql
-- Validate storage integration configuration
SELECT SYSTEM$VALIDATE_STORAGE_INTEGRATION('s3_int');
```

---

## AWS IAM Permissions Requirements

### Required Permissions for Data Loading

| Permission | Purpose | Required For |
|------------|---------|--------------|
| `s3:GetBucketLocation` | Determine bucket region | All operations |
| `s3:GetObject` | Read file contents | COPY INTO table |
| `s3:GetObjectVersion` | Read versioned objects | Versioned buckets |
| `s3:ListBucket` | List files in bucket | LIST command, COPY with patterns |

### Additional Permissions for Data Operations

| Permission | Purpose | Required For |
|------------|---------|--------------|
| `s3:PutObject` | Write files to bucket | COPY INTO stage (unload) |
| `s3:DeleteObject` | Remove files from bucket | PURGE option, REMOVE command |
| `s3:DeleteObjectVersion` | Remove versioned files | Versioned bucket operations |

### Read-Only Policy Example

For loading data without write/delete capabilities:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:GetObjectVersion"
      ],
      "Resource": "arn:aws:s3:::<bucket>/<prefix>/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": "arn:aws:s3:::<bucket>",
      "Condition": {
        "StringLike": {
          "s3:prefix": ["<prefix>/*"]
        }
      }
    }
  ]
}
```

### ARN Formats by Region Type

| Region Type | ARN Prefix |
|-------------|------------|
| Public AWS Regions | `arn:aws:s3:::` |
| AWS GovCloud Regions | `arn:aws-us-gov:s3:::` |
| AWS China Regions | `arn:aws-cn:s3:::` |

---

## Creating an S3 External Stage

### Using Storage Integration (Recommended)

```sql
-- Create external stage with storage integration
CREATE STAGE my_s3_stage
  STORAGE_INTEGRATION = s3_int
  URL = 's3://mybucket/load/files/'
  FILE_FORMAT = my_csv_format;
```

### Required Privileges

| Privilege | Required For |
|-----------|--------------|
| `CREATE STAGE` on schema | Creating the stage |
| `USAGE` on storage integration | Referencing the integration |
| `USAGE` on file format | Referencing named file format (if used) |

```sql
-- Grant privileges for stage creation
GRANT CREATE STAGE ON SCHEMA public TO ROLE data_loader;
GRANT USAGE ON INTEGRATION s3_int TO ROLE data_loader;
```

### Using Direct Credentials (Not Recommended)

```sql
-- Using IAM user credentials (avoid in production)
CREATE STAGE my_s3_stage_creds
  URL = 's3://mybucket/load/files/'
  CREDENTIALS = (
    AWS_KEY_ID = 'AKIAIOSFODNN7EXAMPLE'
    AWS_SECRET_KEY = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
  )
  FILE_FORMAT = my_csv_format;
```

**Warning**: Storing credentials directly in stage definitions is a security risk and should be avoided.

### Stage Properties

| Property | Description | Example |
|----------|-------------|---------|
| `URL` | S3 bucket and path | `'s3://mybucket/path/'` |
| `STORAGE_INTEGRATION` | Integration object name | `s3_int` |
| `FILE_FORMAT` | Default file format | `my_csv_format` or inline options |
| `ENCRYPTION` | Encryption settings | See encryption section |
| `COPY_OPTIONS` | Default COPY options | `(ON_ERROR = 'CONTINUE')` |

### Stage Inspection Commands

```sql
-- List files in stage
LIST @my_s3_stage;

-- Show stage properties
DESC STAGE my_s3_stage;

-- Show all stages
SHOW STAGES;
```

---

## S3 Data File Encryption

Snowflake supports both client-side and server-side encryption for S3 data files.

### Encryption Options

| Encryption Type | Code | Description |
|-----------------|------|-------------|
| **AWS_CSE** | Client-Side Encryption | Requires MASTER_KEY (128 or 256-bit, Base64-encoded) |
| **AWS_SSE_S3** | Server-Side with S3-Managed Keys | No additional configuration needed |
| **AWS_SSE_KMS** | Server-Side with AWS KMS | Optional KMS_KEY_ID parameter |

### Client-Side Encryption (CSE)

```sql
CREATE STAGE my_encrypted_stage
  STORAGE_INTEGRATION = s3_int
  URL = 's3://mybucket/encrypted/'
  ENCRYPTION = (
    TYPE = 'AWS_CSE'
    MASTER_KEY = 'base64encodedkey=='
  );
```

**Important Notes:**
- Master key must be 128-bit or 256-bit in Base64-encoded form
- Snowflake stores the master key in Snowflake (not AWS KMS)
- Only AWS V1 encryption standards are supported (V2 is not supported)

### Server-Side Encryption with S3-Managed Keys

```sql
CREATE STAGE my_sse_s3_stage
  STORAGE_INTEGRATION = s3_int
  URL = 's3://mybucket/data/'
  ENCRYPTION = (TYPE = 'AWS_SSE_S3');
```

### Server-Side Encryption with AWS KMS

```sql
CREATE STAGE my_sse_kms_stage
  STORAGE_INTEGRATION = s3_int
  URL = 's3://mybucket/data/'
  ENCRYPTION = (
    TYPE = 'AWS_SSE_KMS'
    KMS_KEY_ID = 'aws/key'
  );
```

**Note**: Using AWS KMS requires additional IAM policy configuration. Refer to AWS KMS documentation for details.

---

## VPC Endpoint and Network Security

### Snowflake VPC Configuration

Snowflake uses Amazon S3 gateway endpoints in each of its Amazon Virtual Private Clouds (VPCs).

**Key Points:**
- Network traffic between Snowflake and S3 does **NOT** traverse the public internet
- This applies regardless of the S3 bucket region
- Only applies when your Snowflake account is hosted on AWS

### Allowing VPC IDs

For additional security, you can restrict S3 bucket access to only Snowflake's VPC IDs:

```sql
-- Get Snowflake platform information
SELECT SYSTEM$GET_SNOWFLAKE_PLATFORM_INFO();
```

This returns VPC IDs that you can use in S3 bucket policies to restrict access.

### S3 Bucket Policy with VPC Restriction

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowSnowflakeVPC",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::mybucket",
        "arn:aws:s3:::mybucket/*"
      ],
      "Condition": {
        "StringEquals": {
          "aws:sourceVpc": "<snowflake-vpc-id>"
        }
      }
    }
  ]
}
```

**Important**: This feature requires your S3 bucket to be in the same AWS region as your Snowflake account.

---

## Loading Data from S3

### Basic COPY INTO Command

```sql
-- Load from named external stage
COPY INTO my_table
FROM @my_s3_stage
PATTERN = '.*sales.*[.]csv';
```

### Load with File Format Options

```sql
-- Load with inline file format
COPY INTO my_table
FROM @my_s3_stage
FILE_FORMAT = (
  TYPE = CSV
  FIELD_DELIMITER = '|'
  SKIP_HEADER = 1
  NULL_IF = ('NULL', 'null', '')
);
```

### Load Directly from S3 URL (with credentials)

```sql
-- Direct load (not recommended for production)
COPY INTO my_table
FROM s3://mybucket/data/files
CREDENTIALS = (
  AWS_KEY_ID = '...'
  AWS_SECRET_KEY = '...'
)
FILE_FORMAT = my_csv_format;
```

### Validation Mode

Before loading, validate data without inserting:

```sql
-- Return first 10 errors
COPY INTO my_table
FROM @my_s3_stage
VALIDATION_MODE = 'RETURN_10_ROWS';

-- Return all errors
COPY INTO my_table
FROM @my_s3_stage
VALIDATION_MODE = 'RETURN_ERRORS';
```

### Monitoring Data Loads

```sql
-- View COPY history
SELECT * FROM TABLE(INFORMATION_SCHEMA.COPY_HISTORY(
  TABLE_NAME => 'my_table',
  START_TIME => DATEADD(hours, -24, CURRENT_TIMESTAMP())
));

-- View load history via Information Schema
SELECT * FROM INFORMATION_SCHEMA.LOAD_HISTORY
WHERE TABLE_NAME = 'MY_TABLE'
ORDER BY LAST_LOAD_TIME DESC;
```

### Copy Files Between Stages

```sql
-- Copy files from one stage to another
COPY FILES
INTO @target_stage
FROM @source_stage
PATTERN = '.*[.]csv';
```

---

## Storage Integration vs Direct Credentials Comparison

### Feature Comparison

| Feature | Storage Integration | Direct Credentials |
|---------|--------------------|--------------------|
| **Security** | High - no credentials exposed | Low - credentials in stage definition |
| **Credential Rotation** | Automatic by Snowflake | Manual update required |
| **Reusability** | One integration for multiple stages | Credentials per stage |
| **IAM Role Support** | Yes (recommended) | Yes (deprecated method) |
| **IAM User Support** | Managed by Snowflake | Manual key management |
| **Audit Trail** | Centralized in AWS CloudTrail | Per-stage tracking |
| **Location Restrictions** | ALLOWED/BLOCKED locations | None built-in |

### When to Use Each Approach

**Use Storage Integration When:**
- Production environments
- Multiple stages accessing same bucket
- Security and compliance requirements
- Need centralized credential management
- Want location restrictions (allowed/blocked)

**Use Direct Credentials When:**
- Quick testing or prototyping
- One-time data loads
- Isolated development environments
- No access to create integrations

### Privilege Requirements Comparison

| Approach | Who Can Create | Required Privileges |
|----------|----------------|---------------------|
| Storage Integration | ACCOUNTADMIN or role with CREATE INTEGRATION | Global CREATE INTEGRATION privilege |
| Stage with Integration | Any role with grants | CREATE STAGE + USAGE on integration |
| Stage with Credentials | Any role with CREATE STAGE | CREATE STAGE on schema |

---

## Exam Tips and Common Question Patterns

### Key Concepts to Remember

1. **Storage Integration Benefits**
   - Avoids storing credentials in stage definitions
   - Single IAM user per Snowflake account for all S3 integrations
   - External ID provides additional security for trust relationships
   - ALLOWED/BLOCKED locations restrict where stages can point

2. **IAM Permission Requirements**
   - Minimum for loading: `s3:GetObject`, `s3:GetObjectVersion`, `s3:ListBucket`, `s3:GetBucketLocation`
   - Additional for unloading: `s3:PutObject`
   - Additional for purging: `s3:DeleteObject`, `s3:DeleteObjectVersion`

3. **URL Format Rules**
   - Always end URL with `/` to filter to folder path
   - Use `s3://` for public regions, `s3gov://` for GovCloud, `s3china://` for China

4. **Encryption Options**
   - AWS_CSE: Client-side, requires master key stored in Snowflake
   - AWS_SSE_S3: Server-side with S3-managed keys
   - AWS_SSE_KMS: Server-side with AWS KMS

### Common Exam Question Types

**Question Type 1: Identifying the Correct Access Method**
```
Q: What is the recommended way to configure Snowflake access to a private S3 bucket?

A: Storage Integration - because it avoids storing credentials in stage definitions
   and delegates authentication to a Snowflake IAM entity.
```

**Question Type 2: Required Permissions**
```
Q: Which S3 permissions are required to load data from S3 and automatically purge
   files after loading?

A: s3:GetObject, s3:GetObjectVersion, s3:ListBucket, s3:GetBucketLocation,
   AND s3:DeleteObject (for PURGE option)
```

**Question Type 3: Storage Integration Properties**
```
Q: After creating a storage integration, what information must you retrieve to
   configure the IAM role trust policy?

A: STORAGE_AWS_IAM_USER_ARN and STORAGE_AWS_EXTERNAL_ID (from DESC INTEGRATION)
```

**Question Type 4: Security Considerations**
```
Q: What happens to the external ID if you use CREATE OR REPLACE to recreate
   a storage integration?

A: A new external ID is generated, and you must update the IAM role trust
   policy with the new external ID.
```

**Question Type 5: Stage Creation**
```
Q: What privileges are needed to create an external stage that uses a
   storage integration?

A: CREATE STAGE on the schema AND USAGE on the storage integration
```

### Quick Reference Card

```
+------------------------------------------------------------------+
|           AWS S3 EXTERNAL STAGE QUICK REFERENCE                   |
+------------------------------------------------------------------+
|                                                                    |
|  Storage Integration Syntax:                                       |
|  --------------------------                                        |
|  CREATE STORAGE INTEGRATION <name>                                 |
|    TYPE = EXTERNAL_STAGE                                          |
|    STORAGE_PROVIDER = 'S3'                                        |
|    STORAGE_AWS_ROLE_ARN = 'arn:aws:iam::...:role/...'            |
|    STORAGE_ALLOWED_LOCATIONS = ('s3://bucket/path/')             |
|    ENABLED = TRUE;                                                |
|                                                                    |
|  External Stage Syntax:                                            |
|  ----------------------                                            |
|  CREATE STAGE <name>                                              |
|    STORAGE_INTEGRATION = <integration>                            |
|    URL = 's3://bucket/path/'                                      |
|    FILE_FORMAT = <format>;                                        |
|                                                                    |
|  Key Commands:                                                     |
|  -------------                                                     |
|  DESC INTEGRATION <name>;     -- Get IAM user ARN & external ID  |
|  LIST @<stage_name>;          -- List files in stage              |
|  SHOW STAGES;                 -- List all stages                  |
|  DESC STAGE <name>;           -- Show stage properties            |
|                                                                    |
|  S3 URL Protocols:                                                |
|  -----------------                                                 |
|  s3://       -- Public AWS regions                                |
|  s3gov://    -- AWS GovCloud                                      |
|  s3china://  -- AWS China regions                                 |
|                                                                    |
|  Minimum IAM Permissions for Loading:                              |
|  ------------------------------------                              |
|  s3:GetObject, s3:GetObjectVersion                                |
|  s3:ListBucket, s3:GetBucketLocation                              |
|                                                                    |
+------------------------------------------------------------------+
```

### Practice Questions

1. **True or False**: Snowflake creates a separate IAM user for each storage integration in your account.

<details>
<summary>Show Answer</summary>

**Answer**: False. Snowflake provisions a single IAM user for your entire Snowflake account, shared by all S3 storage integrations.
</details>

2. **Which storage integration parameter restricts the S3 locations that can be referenced by stages using that integration?**
   - A) STORAGE_AWS_ROLE_ARN
   - B) STORAGE_ALLOWED_LOCATIONS
   - C) STORAGE_PROVIDER
   - D) ENABLED

<details>
<summary>Show Answer</summary>

**Answer**: B) STORAGE_ALLOWED_LOCATIONS
</details>

3. **What must you update in AWS if you recreate a storage integration using CREATE OR REPLACE?**

<details>
<summary>Show Answer</summary>

**Answer**: The IAM role trust policy must be updated with the new STORAGE_AWS_EXTERNAL_ID.
</details>

4. **Which encryption type requires a master key to be stored in Snowflake?**
   - A) AWS_SSE_S3
   - B) AWS_SSE_KMS
   - C) AWS_CSE
   - D) SNOWFLAKE_FULL

<details>
<summary>Show Answer</summary>

**Answer**: C) AWS_CSE (Client-Side Encryption)
</details>

5. **What privilege is required to use a storage integration when creating an external stage?**

<details>
<summary>Show Answer</summary>

**Answer**: USAGE privilege on the storage integration.
</details>

---

## Summary

| Topic | Key Points |
|-------|------------|
| **Best Practice** | Use storage integrations for secure S3 access |
| **IAM Setup** | Create policy, create role, update trust policy with Snowflake IAM user ARN and external ID |
| **Single IAM User** | One Snowflake IAM user per account for all S3 integrations |
| **External ID Security** | Changes if integration is recreated; requires trust policy update |
| **Required Permissions** | GetObject, GetObjectVersion, ListBucket, GetBucketLocation (minimum) |
| **Encryption** | AWS_CSE, AWS_SSE_S3, or AWS_SSE_KMS options available |
| **URL Format** | End with `/` to filter to folder; use correct protocol for region type |
| **Privileges** | CREATE STAGE + USAGE on integration to create stages |
