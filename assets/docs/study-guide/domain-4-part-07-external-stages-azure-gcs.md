# Domain 4: Data Loading & Unloading

## Part 07: External Stages - Azure Blob Storage & Google Cloud Storage

This section covers external stages for Microsoft Azure Blob Storage and Google Cloud Storage (GCS), including storage integrations, authentication methods, encryption options, and cross-cloud considerations. Understanding these cloud-specific configurations is essential for the SnowPro Core exam as they represent common enterprise deployment scenarios.

---

## 1. Overview of External Stages

### 1.1 What is an External Stage?

An **external stage** is a named Snowflake object that points to a location in cloud storage outside of Snowflake's internal storage. External stages allow you to load data from and unload data to cloud storage services.

**Supported Cloud Storage Services:**
| Cloud Platform | Storage Service | URL Prefix |
|----------------|-----------------|------------|
| Amazon Web Services | Amazon S3 | `s3://` |
| Microsoft Azure | Azure Blob Storage | `azure://` |
| Google Cloud Platform | Google Cloud Storage | `gcs://` |

### 1.2 Authentication Options

Snowflake provides two primary methods to authenticate with external cloud storage:

| Method | Description | Best For |
|--------|-------------|----------|
| **Storage Integration** | Delegates authentication to a cloud identity (service principal or service account) | Production environments, multiple users |
| **Direct Credentials** | Uses storage-specific tokens/keys in the stage definition | Simple setups, quick testing |

**Key Insight:** Storage integrations are the **recommended approach** for production because they centralize credential management and eliminate the need to store secrets in stage definitions.

---

## 2. Azure Blob Storage Configuration

### 2.1 Azure URL Format

Azure Blob Storage URLs follow this pattern:

```
azure://<storage_account>.blob.core.windows.net/<container>/<path>/
```

**Components:**
- `<storage_account>`: Your Azure storage account name
- `<container>`: The container within the storage account
- `<path>`: Optional folder path within the container

**Example:**
```
azure://myaccount.blob.core.windows.net/mycontainer/load/files/
```

### 2.2 Option 1: Azure Storage Integration (Recommended)

A storage integration delegates authentication to an **Azure service principal**, which is an identity created for services like Snowflake to access Azure resources.

**Benefits:**
- Centralized credential management
- No SAS tokens needed in stage definitions
- Easier access management for multiple users
- Secrets are securely stored within Snowflake

#### Step 1: Create the Storage Integration

```sql
CREATE STORAGE INTEGRATION azure_int
  TYPE = EXTERNAL_STAGE
  STORAGE_PROVIDER = 'AZURE'
  ENABLED = TRUE
  AZURE_TENANT_ID = '<tenant_id>'
  STORAGE_ALLOWED_LOCATIONS = ('azure://myaccount.blob.core.windows.net/mycontainer1/path1/',
                                'azure://myaccount.blob.core.windows.net/mycontainer2/path2/')
  STORAGE_BLOCKED_LOCATIONS = ('azure://myaccount.blob.core.windows.net/mycontainer1/path1/sensitivedata/');
```

**Key Parameters:**

| Parameter | Description |
|-----------|-------------|
| `TYPE` | Must be `EXTERNAL_STAGE` |
| `STORAGE_PROVIDER` | Set to `'AZURE'` |
| `AZURE_TENANT_ID` | Your Azure AD tenant ID (find in Azure Portal > Azure Active Directory > Properties) |
| `STORAGE_ALLOWED_LOCATIONS` | List of container/path combinations the integration can access |
| `STORAGE_BLOCKED_LOCATIONS` | Optional list of locations to explicitly block |
| `ENABLED` | Set to `TRUE` to enable the integration |

**Important:** Only users with the `ACCOUNTADMIN` role or the `CREATE INTEGRATION` privilege can create storage integrations.

#### Step 2: Retrieve Integration Properties

```sql
DESC STORAGE INTEGRATION azure_int;
```

**Critical Output Values:**

| Property | Description |
|----------|-------------|
| `AZURE_CONSENT_URL` | URL to the Microsoft permissions request page |
| `AZURE_MULTI_TENANT_APP_NAME` | Name of the Snowflake client application in your Azure AD |

#### Step 3: Grant Consent in Azure Portal

1. Navigate to the `AZURE_CONSENT_URL` in a web browser
2. Click **Accept** on the Microsoft permissions request page
3. This allows the Azure service principal to obtain access tokens

#### Step 4: Assign Azure Role to Service Principal

1. In Azure Portal, go to **Storage Accounts** > select your storage account
2. Click **Access Control (IAM)** > **Add role assignment**
3. Search for the Snowflake service principal (use the string **before** the underscore in `AZURE_MULTI_TENANT_APP_NAME`)
4. Assign the appropriate role:

| Azure Role | Permissions | Use Case |
|------------|-------------|----------|
| `Storage Blob Data Reader` | Read only | Data loading only |
| `Storage Blob Data Contributor` | Read and write | Data loading and unloading |

**Note:** Role assignments may take up to **5 minutes** to propagate. Snowflake caches credentials for up to **60 minutes**.

#### Step 5: Create External Stage with Integration

```sql
CREATE STAGE my_azure_stage
  STORAGE_INTEGRATION = azure_int
  URL = 'azure://myaccount.blob.core.windows.net/mycontainer/load/files/'
  FILE_FORMAT = my_csv_format;
```

### 2.3 Option 2: SAS Token Authentication

A **Shared Access Signature (SAS) token** grants limited access to objects in your storage account without exposing your account keys.

#### Step 1: Generate SAS Token in Azure Portal

1. Go to **Storage Accounts** > select your account
2. Under **Security + networking**, choose **Shared access signature**
3. Select required services (Blob)
4. Select resource types (Container, Object)
5. Set permissions:
   - **Read** and **List** for loading data
   - Add **Write** and **Delete** for unloading
6. Set start and expiry dates
7. Click **Generate SAS and connection string**
8. Copy the **SAS token** (starts with `?`)

#### Step 2: Create Stage with SAS Token

```sql
CREATE STAGE my_azure_stage
  URL = 'azure://myaccount.blob.core.windows.net/mycontainer/load/files'
  CREDENTIALS = (AZURE_SAS_TOKEN = '?sv=2016-05-31&ss=b&srt=sco&sp=rwdl&se=2024-06-27T10:05:50Z&...')
  ENCRYPTION = (TYPE = 'AZURE_CSE' MASTER_KEY = 'kPx...')
  FILE_FORMAT = my_csv_format;
```

### 2.4 Azure Encryption Options

| Encryption Type | Description | Required Parameter |
|-----------------|-------------|-------------------|
| `AZURE_CSE` | Client-side encryption using a master key | `MASTER_KEY` |
| None (Default) | Server-side encryption managed by Azure | None |

**Example with Client-Side Encryption:**
```sql
ENCRYPTION = (TYPE = 'AZURE_CSE' MASTER_KEY = 'your_base64_encoded_key')
```

---

## 3. Google Cloud Storage Configuration

### 3.1 GCS URL Format

Google Cloud Storage URLs follow this pattern:

```
gcs://<bucket>/<path>/
```

**Components:**
- `<bucket>`: Your GCS bucket name
- `<path>`: Optional folder path within the bucket

**Example:**
```
gcs://mybucket1/path1/
```

### 3.2 GCS Storage Integration (Required)

Unlike AWS S3 and Azure, **GCS only supports storage integrations** for authentication. Direct credentials are not available for GCS.

#### Step 1: Create the Storage Integration

```sql
CREATE STORAGE INTEGRATION gcs_int
  TYPE = EXTERNAL_STAGE
  STORAGE_PROVIDER = 'GCS'
  ENABLED = TRUE
  STORAGE_ALLOWED_LOCATIONS = ('gcs://mybucket1/path1/', 'gcs://mybucket2/path2/')
  STORAGE_BLOCKED_LOCATIONS = ('gcs://mybucket1/path1/sensitivedata/');
```

**Key Differences from Azure:**
- No tenant ID required
- No consent URL process
- GCS uses a Snowflake-managed service account

#### Step 2: Retrieve GCS Service Account

```sql
DESC STORAGE INTEGRATION gcs_int;
```

**Critical Output:**

| Property | Description |
|----------|-------------|
| `STORAGE_GCP_SERVICE_ACCOUNT` | Snowflake's service account for your account (e.g., `service-account-id@project1-123456.iam.gserviceaccount.com`) |

**Important:** Snowflake provisions a **single Cloud Storage service account** for your entire Snowflake account. All GCS integrations use that same service account.

#### Step 3: Create Custom IAM Role in GCP

Create a custom IAM role with the required permissions based on your use case:

**Required Permissions by Operation:**

| Operation | Required Permissions |
|-----------|---------------------|
| **Data Loading Only** | `storage.buckets.get`, `storage.objects.get`, `storage.objects.list` |
| **Data Loading with Purge** | Above + `storage.objects.delete` |
| **Data Unloading Only** | `storage.buckets.get`, `storage.objects.create`, `storage.objects.delete`, `storage.objects.list` |
| **Load + Unload** | `storage.buckets.get`, `storage.objects.create`, `storage.objects.delete`, `storage.objects.get`, `storage.objects.list` |

**Steps in Google Cloud Console:**
1. Sign in as a project editor
2. Navigate to **IAM & Admin** > **Roles**
3. Click **Create Role**
4. Enter role title (e.g., "Snowflake Data Loader")
5. Add the required permissions
6. Click **Create**

#### Step 4: Assign Custom Role to Snowflake Service Account

1. Go to **Cloud Storage** > **Buckets**
2. Select your bucket
3. Click **Permissions** > **View by principals** > **Grant access**
4. Under **Add principals**, paste the `STORAGE_GCP_SERVICE_ACCOUNT` value
5. Under **Assign roles**, select your custom IAM role
6. Click **Save**

#### Step 5: Create External Stage with Integration

```sql
CREATE STAGE my_gcs_stage
  URL = 'gcs://mybucket1/path1'
  STORAGE_INTEGRATION = gcs_int
  FILE_FORMAT = my_csv_format;
```

### 3.3 GCS Encryption Options

GCS always encrypts data on the server side by default. Snowflake also supports customer-managed encryption keys (CMEK) through Cloud KMS.

| Encryption Type | Description | Optional Parameter |
|-----------------|-------------|-------------------|
| Default | Google-managed server-side encryption | None |
| `GCS_SSE_KMS` | Customer-managed keys via Cloud KMS | `KMS_KEY_ID` |

**Example with Cloud KMS:**
```sql
CREATE STAGE my_gcs_stage
  URL = 'gcs://load/encrypted_files/'
  STORAGE_INTEGRATION = gcs_int
  ENCRYPTION = (TYPE = 'GCS_SSE_KMS' KMS_KEY_ID = 'your_kms_key_id')
  FILE_FORMAT = my_csv_format;
```

**Note:** When using CMEK, you must grant the Snowflake service account permissions on your Cloud KMS key.

---

## 4. Azure vs GCS Comparison

### 4.1 Storage Integration Comparison

| Feature | Azure Blob Storage | Google Cloud Storage |
|---------|-------------------|---------------------|
| **Storage Provider** | `'AZURE'` | `'GCS'` |
| **Authentication Identity** | Azure Service Principal | GCP Service Account |
| **Tenant/Project ID** | `AZURE_TENANT_ID` required | Not required |
| **Consent Process** | Required (AZURE_CONSENT_URL) | Not required |
| **Identity Assignment** | Azure IAM role assignment | GCP IAM role assignment |
| **Direct Credentials** | SAS Token supported | Not supported |

### 4.2 URL Format Comparison

| Cloud | URL Pattern | Example |
|-------|------------|---------|
| Azure | `azure://<account>.blob.core.windows.net/<container>/<path>/` | `azure://myaccount.blob.core.windows.net/data/files/` |
| GCS | `gcs://<bucket>/<path>/` | `gcs://mybucket/data/files/` |

### 4.3 IAM Roles Comparison

| Operation | Azure Role | GCS Permissions |
|-----------|-----------|-----------------|
| Read Only | `Storage Blob Data Reader` | `storage.objects.get`, `storage.objects.list`, `storage.buckets.get` |
| Read/Write | `Storage Blob Data Contributor` | Above + `storage.objects.create`, `storage.objects.delete` |

### 4.4 Encryption Comparison

| Cloud | Client-Side Encryption | Server-Side Encryption | Customer-Managed Keys |
|-------|----------------------|----------------------|---------------------|
| Azure | `AZURE_CSE` (requires MASTER_KEY) | Default (Azure-managed) | Supported |
| GCS | Not supported | Default (Google-managed) | `GCS_SSE_KMS` (requires KMS_KEY_ID) |

---

## 5. Private Connectivity Options

### 5.1 Azure Private Link

Enable private connectivity to Azure Blob Storage using the `USE_PRIVATELINK_ENDPOINT` parameter:

```sql
CREATE STORAGE INTEGRATION azure_private_int
  TYPE = EXTERNAL_STAGE
  STORAGE_PROVIDER = AZURE
  AZURE_TENANT_ID = '<tenant_id>'
  STORAGE_ALLOWED_LOCATIONS = ('azure://mystorageaccount.blob.core.windows.net/mycontainer/')
  USE_PRIVATELINK_ENDPOINT = TRUE
  ENABLED = TRUE;
```

### 5.2 GCS Private Service Connect

Similarly for GCS:

```sql
CREATE STORAGE INTEGRATION gcs_private_int
  TYPE = EXTERNAL_STAGE
  STORAGE_PROVIDER = 'GCS'
  STORAGE_ALLOWED_LOCATIONS = ('gcs://mybucket/path/')
  USE_PRIVATELINK_ENDPOINT = TRUE
  ENABLED = TRUE;
```

**Requirements:**
- Your Snowflake account must have private connectivity enabled
- The cloud storage must be configured for private endpoints
- Additional network configuration required on the cloud provider side

---

## 6. Loading Data from External Stages

### 6.1 Using Named Stage

```sql
COPY INTO my_table
  FROM @my_azure_stage
  FILE_FORMAT = my_csv_format;
```

### 6.2 Direct Load from Azure (with credentials)

```sql
COPY INTO my_table
  FROM 'azure://myaccount.blob.core.windows.net/mycontainer/data/files'
  CREDENTIALS = (AZURE_SAS_TOKEN = '?sv=...')
  FILE_FORMAT = (TYPE = CSV FIELD_DELIMITER = '|' SKIP_HEADER = 1);
```

### 6.3 Direct Load from GCS (with integration)

```sql
COPY INTO my_table
  FROM 'gcs://mybucket/data/files'
  STORAGE_INTEGRATION = gcs_int
  FILE_FORMAT = my_csv_format;
```

---

## 7. Cross-Cloud Considerations

### 7.1 Data Egress Costs

When your Snowflake account and cloud storage are in different regions or cloud providers, data transfer incurs **egress charges** from the storage provider.

| Scenario | Egress Charges |
|----------|---------------|
| Same cloud, same region | Minimal or none |
| Same cloud, different region | Regional egress applies |
| Different cloud providers | Full internet egress applies |

### 7.2 Best Practices for Cross-Cloud

1. **Co-locate when possible**: Keep storage in the same cloud and region as your Snowflake account
2. **Use storage integrations**: They support cross-cloud access but consider costs
3. **Monitor data transfer**: Use cloud provider tools to track egress
4. **Consider data replication**: For large datasets, replicate data to the same cloud as Snowflake

### 7.3 Government Regions

Azure blob storage in **government regions** has special restrictions:
- Storage integration access is limited to Snowflake accounts in the same government region
- Cross-region access from outside government regions requires direct credentials

---

## 8. Modifying External Stages

### 8.1 Updating Stage Properties

```sql
ALTER STAGE my_azure_stage
  SET STORAGE_INTEGRATION = new_azure_int;

ALTER STAGE my_gcs_stage
  SET FILE_FORMAT = new_format;
```

### 8.2 Important Limitations

- You **cannot** disable authentication or encryption settings for a stage
- You **cannot** change from storage integration to credentials if the stage already uses an integration
- To change authentication type, you must **drop and recreate** the stage

---

## 9. Exam Tips and Common Question Patterns

### 9.1 Key Concepts to Remember

1. **Storage Integration vs Direct Credentials:**
   - Storage integrations are recommended for production
   - Azure supports both; GCS requires storage integrations
   - Integrations centralize credential management

2. **Azure-Specific Details:**
   - Requires `AZURE_TENANT_ID`
   - Uses `AZURE_CONSENT_URL` for permission grant
   - Service principal found in `AZURE_MULTI_TENANT_APP_NAME`
   - Supports SAS tokens as alternative authentication

3. **GCS-Specific Details:**
   - Only supports storage integrations (no direct credentials)
   - Uses `STORAGE_GCP_SERVICE_ACCOUNT`
   - One service account per Snowflake account for all GCS integrations
   - Requires custom IAM role creation

4. **URL Formats:**
   - Azure: `azure://<account>.blob.core.windows.net/<container>/<path>/`
   - GCS: `gcs://<bucket>/<path>/`

5. **Permissions:**
   - `ACCOUNTADMIN` or `CREATE INTEGRATION` privilege required for integrations
   - Cloud IAM roles must be assigned to Snowflake identities

### 9.2 Common Exam Questions

**Q: What is required to create an external stage for GCS?**
A: A storage integration. GCS does not support direct credentials.

**Q: Which Azure role allows both loading and unloading data?**
A: `Storage Blob Data Contributor`

**Q: Where do you find the Snowflake service account for GCS?**
A: In the `STORAGE_GCP_SERVICE_ACCOUNT` property from `DESC STORAGE INTEGRATION`

**Q: How do you grant Snowflake access to Azure storage?**
A: Navigate to the `AZURE_CONSENT_URL` and click Accept, then assign an Azure IAM role to the Snowflake service principal

**Q: What happens if you revoke Snowflake's access to Azure storage?**
A: Users may still access data for up to 60 minutes due to credential caching

**Q: Can you use a SAS token with GCS?**
A: No. GCS requires storage integrations.

### 9.3 Quick Reference Card

| Topic | Azure | GCS |
|-------|-------|-----|
| Storage Provider | `'AZURE'` | `'GCS'` |
| URL Prefix | `azure://` | `gcs://` |
| Tenant/Project ID | Required | Not required |
| Identity Type | Service Principal | Service Account |
| Direct Credentials | SAS Token | Not supported |
| Consent Required | Yes | No |
| Encryption Option | `AZURE_CSE` | `GCS_SSE_KMS` |
| Read-Only Role | Storage Blob Data Reader | Custom IAM role |
| Read-Write Role | Storage Blob Data Contributor | Custom IAM role |

---

## 10. Summary

**Azure Blob Storage Key Points:**
- Two authentication options: Storage Integration (recommended) or SAS Token
- Requires Azure AD tenant ID for storage integrations
- Consent URL process grants Snowflake permission to obtain tokens
- Assign `Storage Blob Data Reader` or `Storage Blob Data Contributor` role

**Google Cloud Storage Key Points:**
- Only storage integrations supported (no direct credentials)
- Single GCP service account per Snowflake account
- Create custom IAM roles with specific permissions
- Assign custom role to Snowflake's service account on the bucket

**Cross-Cloud Considerations:**
- Data egress costs apply for cross-region and cross-cloud access
- Co-locate storage with Snowflake account when possible
- Government regions have special restrictions

**For the Exam:**
- Know the differences between Azure and GCS configuration
- Understand when to use storage integrations vs direct credentials
- Remember URL formats for each cloud provider
- Know the required IAM roles and permissions for each operation
