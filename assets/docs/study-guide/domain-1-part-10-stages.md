# Domain 1: Snowflake AI Data Cloud Features & Architecture

## Part 10: Stages (Internal and External)

This section provides comprehensive coverage of Snowflake stages, which serve as temporary holding areas for data files during the loading and unloading process. Stages are a foundational concept for the SnowPro Core exam and are critical for understanding data movement in Snowflake.

---

## 1. What is a Stage?

A **stage** is a location where data files are stored (staged) so that the data in the files can be loaded into a table or where data from tables can be unloaded to files.

**Key Characteristics:**
- Stages act as an intermediary between source data and Snowflake tables
- The COPY INTO command uses stages as the source for loading and the target for unloading
- Stages can reference cloud storage managed by your organization (external) or storage managed by Snowflake (internal)
- All staged files are automatically encrypted

**Basic Data Flow:**
```
Source Files --> Stage --> COPY INTO --> Snowflake Table
Snowflake Table --> COPY INTO --> Stage --> Target Files
```

---

## 2. Types of Stages

Snowflake supports two main categories of stages: **Internal Stages** (Snowflake-managed) and **External Stages** (user-managed cloud storage).

### 2.1 Internal Stages

Internal stages store data files within Snowflake's cloud storage. Snowflake manages the underlying blob storage infrastructure. There are three types of internal stages:

#### User Stage

- **Automatically allocated** to each Snowflake user
- Designed for files staged and managed by a **single user** but loaded into **multiple tables**
- **Cannot be altered or dropped**
- **Cannot set file format options** on the stage (must specify in COPY INTO command)
- Only accessible by the owning user

**Reference Notation:** `@~`

```sql
-- List files in user stage
LIST @~;

-- Upload file to user stage (SnowSQL only)
PUT file:///data/myfile.csv @~/folder_name;

-- Copy data from user stage
COPY INTO my_table FROM @~/folder_name/myfile.csv;
```

#### Table Stage

- **Automatically allocated** to each table created in Snowflake
- Designed for files staged by **one or more users** but loaded into a **single table**
- **Cannot be altered or dropped**
- **Not a separate database object** - it's an implicit stage tied to the table
- **No grantable privileges** - must have OWNERSHIP privilege on the table
- **Does not support transformations** during loading (no query as source for COPY)
- Apache Iceberg tables do not support table stages

**Reference Notation:** `@%table_name`

```sql
-- List files in table stage
LIST @%mytable;

-- Upload file to table stage (SnowSQL only)
PUT file:///data/myfile.csv @%mytable;

-- Copy data from table stage
COPY INTO mytable FROM @%mytable;
```

#### Named Internal Stage

- **User-created database objects** with maximum flexibility
- Users with appropriate privileges can load data into **any table**
- Can be **altered and dropped**
- Security/access rules apply like any database object
- Supports **file format options** and other stage properties
- **Recommended** for regular data loads involving multiple users or tables

**Reference Notation:** `@stage_name`

```sql
-- Create named internal stage
CREATE STAGE my_internal_stage
  ENCRYPTION = (TYPE = 'SNOWFLAKE_SSE');

-- Create with file format
CREATE STAGE my_csv_stage
  FILE_FORMAT = (TYPE = CSV SKIP_HEADER = 1);

-- List files
LIST @my_internal_stage;

-- Upload file (SnowSQL only)
PUT file:///data/myfile.csv @my_internal_stage/path/;

-- Copy data
COPY INTO my_table FROM @my_internal_stage/path/;
```

### 2.2 External Stages

External stages reference data files stored in cloud storage outside of Snowflake. You can load data from or unload data to Amazon S3, Google Cloud Storage, or Microsoft Azure regardless of your Snowflake account's cloud platform.

**Key Characteristics:**
- Always **named stages** (user-created database objects)
- Require **URL** to cloud storage location
- Require **authentication** (storage integration or direct credentials)
- Files must be uploaded using **cloud provider tools** (not PUT command)
- Support loading from S3, GCS, and Azure Blob Storage

**Reference Notation:** `@stage_name`

#### Creating External Stages

**Amazon S3 Example:**
```sql
-- Using storage integration (recommended)
CREATE STAGE my_s3_stage
  STORAGE_INTEGRATION = s3_int
  URL = 's3://mybucket/path/'
  FILE_FORMAT = my_csv_format;

-- Using direct credentials (not recommended for production)
CREATE STAGE my_s3_stage
  URL = 's3://mybucket/path/'
  CREDENTIALS = (AWS_KEY_ID = '...' AWS_SECRET_KEY = '...')
  FILE_FORMAT = my_csv_format;
```

**Azure Blob Storage Example:**
```sql
CREATE STAGE my_azure_stage
  STORAGE_INTEGRATION = azure_int
  URL = 'azure://myaccount.blob.core.windows.net/mycontainer/path/'
  FILE_FORMAT = my_csv_format;
```

**Google Cloud Storage Example:**
```sql
CREATE STAGE my_gcs_stage
  STORAGE_INTEGRATION = gcs_int
  URL = 'gcs://mybucket/path/'
  FILE_FORMAT = my_csv_format;
```

---

## 3. Stage Types Comparison Table

| Feature | User Stage | Table Stage | Named Internal Stage | External Stage |
|---------|------------|-------------|---------------------|----------------|
| **Reference** | `@~` | `@%table_name` | `@stage_name` | `@stage_name` |
| **Creation** | Automatic (per user) | Automatic (per table) | Manual (CREATE STAGE) | Manual (CREATE STAGE) |
| **Storage Location** | Snowflake-managed | Snowflake-managed | Snowflake-managed | External cloud storage |
| **Can Alter/Drop** | No | No | Yes | Yes |
| **File Format Options** | No (specify in COPY) | No (specify in COPY) | Yes | Yes |
| **Access Control** | User only | Table owners | Role-based privileges | Role-based privileges |
| **Load to Multiple Tables** | Yes | No | Yes | Yes |
| **Load Transformations** | Yes | No | Yes | Yes |
| **PUT Command** | Yes | Yes | Yes | No (use cloud tools) |
| **Directory Table Support** | No | No | Yes | Yes |
| **Encryption** | Auto (128-bit) | Auto (128-bit) | Configurable | Depends on source |

---

## 4. Stage URL Syntax Reference

### Internal Stage URLs

| Stage Type | URL Syntax | Example |
|------------|------------|---------|
| User Stage | `@~` or `@~/path/` | `@~/staged/data.csv` |
| Table Stage | `@%table_name` or `@%table_name/path/` | `@%customers/2024/` |
| Named Internal | `@stage_name` or `@stage_name/path/` | `@my_stage/folder/file.csv` |

### External Stage URLs

| Cloud Provider | URL Format | Example |
|----------------|------------|---------|
| Amazon S3 | `s3://bucket/path/` | `s3://mybucket/data/files/` |
| Azure Blob | `azure://account.blob.core.windows.net/container/path/` | `azure://myaccount.blob.core.windows.net/mycontainer/data/` |
| Google Cloud Storage | `gcs://bucket/path/` | `gcs://mybucket/data/files/` |

---

## 5. Stage Commands Reference

### PUT Command (Internal Stages Only)

Uploads files from a local file system to an internal stage.

```sql
-- Upload to user stage
PUT file:///path/to/file.csv @~;

-- Upload to table stage
PUT file:///path/to/file.csv @%mytable;

-- Upload to named internal stage with folder
PUT file:///path/to/file.csv @my_stage/folder/;

-- Windows path example
PUT file://C:\data\file.csv @my_stage;

-- Upload with options
PUT file:///path/to/file.csv @my_stage
  AUTO_COMPRESS = FALSE
  PARALLEL = 4;
```

**Important:** PUT command can only be executed from **SnowSQL** (command line), not from Snowsight worksheets.

### GET Command (Internal Stages Only)

Downloads files from an internal stage to a local file system.

```sql
-- Download from user stage
GET @~ file:///local/path/;

-- Download from named stage
GET @my_stage/folder/ file:///local/path/;

-- Download with options
GET @my_stage file:///local/path/
  PARALLEL = 10
  PATTERN = '.*mydata.*[.]csv';
```

**Important:** GET command can only be executed from **SnowSQL**, not from Snowsight. Files are automatically decrypted during download.

### LIST Command

Lists files in a stage.

```sql
-- List user stage
LIST @~;

-- List table stage
LIST @%mytable;

-- List named stage
LIST @my_stage;

-- List with pattern filter
LIST @my_stage PATTERN = '.*[.]csv';
```

### REMOVE Command

Removes files from a stage.

```sql
-- Remove specific file
REMOVE @my_stage/folder/file.csv;

-- Remove all files in path
REMOVE @my_stage/folder/;

-- Remove with pattern
REMOVE @my_stage PATTERN = '.*[.]csv';
```

---

## 6. Directory Tables

A **directory table** is an implicit object layered on a stage that stores file-level metadata about staged files.

### What is a Directory Table?

- Not a separate database object - conceptually similar to an external table
- Available for both internal and external named stages
- Stores metadata: file paths, sizes, timestamps, ETags, file URLs
- Has no grantable privileges of its own
- Useful for querying file information and building data pipelines

### Enabling Directory Tables

```sql
-- Create stage with directory table enabled
CREATE STAGE my_stage
  DIRECTORY = (ENABLE = TRUE);

-- Enable directory table on existing stage
ALTER STAGE my_stage SET DIRECTORY = (ENABLE = TRUE);

-- Refresh directory table metadata
ALTER STAGE my_stage REFRESH;
```

### Directory Table Columns

| Column | Type | Description |
|--------|------|-------------|
| RELATIVE_PATH | TEXT | Path to the file |
| SIZE | NUMBER | File size in bytes |
| LAST_MODIFIED | TIMESTAMP_TZ | Last modification timestamp |
| MD5 | HEX | MD5 checksum |
| ETAG | HEX | ETag header |
| FILE_URL | TEXT | Snowflake file URL |

### Querying Directory Tables

```sql
-- Query all files in stage
SELECT * FROM DIRECTORY(@my_stage);

-- Get file URLs for CSV files
SELECT FILE_URL
FROM DIRECTORY(@my_stage)
WHERE RELATIVE_PATH LIKE '%.csv';

-- Filter by file size
SELECT RELATIVE_PATH, SIZE
FROM DIRECTORY(@my_stage)
WHERE SIZE > 100000;

-- Join with other tables for enriched views
SELECT
  d.FILE_URL,
  d.LAST_MODIFIED,
  m.document_type,
  m.department
FROM DIRECTORY(@my_stage) d
JOIN file_metadata m ON d.RELATIVE_PATH = m.file_path;
```

### Directory Table Auto-Refresh

For external stages, you can configure automatic metadata refresh using cloud event notifications:
- **AWS S3**: SNS/SQS notifications
- **Azure**: Event Grid notifications
- **GCS**: Pub/Sub notifications

```sql
-- Enable auto-refresh for external stage
ALTER STAGE my_external_stage SET DIRECTORY = (
  ENABLE = TRUE,
  AUTO_REFRESH = TRUE
);
```

### Billing for Directory Tables

- Auto-refresh incurs Snowpipe-like overhead charges
- Manual refresh (ALTER STAGE REFRESH) uses cloud services credits
- Query the PIPE_USAGE_HISTORY for auto-refresh costs

---

## 7. Stage Properties and Options

### Internal Stage Encryption

```sql
-- Server-side encryption (default)
CREATE STAGE my_stage
  ENCRYPTION = (TYPE = 'SNOWFLAKE_SSE');

-- Full encryption (client + server)
CREATE STAGE my_stage
  ENCRYPTION = (TYPE = 'SNOWFLAKE_FULL');
```

| Encryption Type | Description |
|-----------------|-------------|
| SNOWFLAKE_SSE | Server-side encryption (128-bit key, default) |
| SNOWFLAKE_FULL | Client-side + server-side encryption |

### File Format Association

```sql
-- Create stage with file format object reference
CREATE STAGE my_stage
  FILE_FORMAT = my_csv_format;

-- Create stage with inline file format options
CREATE STAGE my_stage
  FILE_FORMAT = (TYPE = CSV SKIP_HEADER = 1 FIELD_DELIMITER = '|');
```

### Copy Options on Stages

```sql
-- Stage with copy options
CREATE STAGE my_stage
  COPY_OPTIONS = (ON_ERROR = CONTINUE);
```

---

## 8. Storage Integrations

A **storage integration** is a Snowflake object that encapsulates authentication information for accessing external cloud storage.

### Why Use Storage Integrations?

- Avoid hardcoding credentials in stage definitions
- Centralized credential management
- Support for IAM roles (AWS) and service principals (Azure)
- Required for Snowpipe auto-ingest

### Creating Storage Integrations

**AWS S3:**
```sql
CREATE STORAGE INTEGRATION s3_int
  TYPE = EXTERNAL_STAGE
  STORAGE_PROVIDER = 'S3'
  ENABLED = TRUE
  STORAGE_AWS_ROLE_ARN = 'arn:aws:iam::123456789012:role/snowflake-role'
  STORAGE_ALLOWED_LOCATIONS = ('s3://mybucket/path1/', 's3://mybucket/path2/')
  STORAGE_BLOCKED_LOCATIONS = ('s3://mybucket/sensitive/');
```

**Azure Blob Storage:**
```sql
CREATE STORAGE INTEGRATION azure_int
  TYPE = EXTERNAL_STAGE
  STORAGE_PROVIDER = 'AZURE'
  ENABLED = TRUE
  AZURE_TENANT_ID = '...'
  STORAGE_ALLOWED_LOCATIONS = ('azure://account.blob.core.windows.net/container/path/');
```

**Google Cloud Storage:**
```sql
CREATE STORAGE INTEGRATION gcs_int
  TYPE = EXTERNAL_STAGE
  STORAGE_PROVIDER = 'GCS'
  ENABLED = TRUE
  STORAGE_ALLOWED_LOCATIONS = ('gcs://mybucket/path/');
```

---

## 9. Best Practices for Staging Data

### Organizing Data by Path

Partition staged data into logical paths for efficient loading:

```
/region/country/city/year/month/day/hour/
Example: /us/california/san_francisco/2024/01/15/08/
```

**Benefits:**
- Execute concurrent COPY statements matching file subsets
- Take advantage of parallel operations
- Selectively load data partitions

### File Size Recommendations

| Scenario | Recommended Size |
|----------|-----------------|
| Bulk Loading | 100-250 MB compressed |
| Snowpipe | 100-250 MB compressed |
| Maximum Recommended | < 100 GB |

**Why File Size Matters:**
- Optimal parallelism during loading
- Efficient use of warehouse resources
- Reduced overhead per file

### Stage Selection Guidelines

| Use Case | Recommended Stage |
|----------|-------------------|
| Single user, multiple tables | User Stage |
| Multiple users, single table | Table Stage |
| Multiple users, multiple tables | Named Internal Stage |
| Data in cloud storage | External Stage |
| Regular scheduled loads | Named Stage (internal or external) |
| Snowpipe auto-ingest | External Stage with storage integration |

---

## 10. Exam Tips and Common Question Patterns

### Key Facts to Memorize

1. **Stage Reference Notation:**
   - User stage: `@~`
   - Table stage: `@%table_name`
   - Named stage: `@stage_name`

2. **PUT Command Limitations:**
   - Works only with **internal stages** (not external)
   - Must be executed from **SnowSQL** (not Snowsight worksheets)
   - Files are auto-compressed with GZIP by default

3. **GET Command Limitations:**
   - Works only with **internal stages**
   - Must be executed from **SnowSQL**
   - Files are auto-decrypted during download

4. **Internal Stage Defaults:**
   - 128-bit encryption automatically applied
   - GZIP compression applied to uncompressed files
   - Load history stored for 64 days (bulk loading)

5. **External Stage Requirements:**
   - Require URL to cloud storage
   - Need storage integration or credentials
   - Use cloud provider tools to upload files (AWS CLI, gsutil, etc.)

### Common Exam Question Patterns

**Pattern 1: Stage Type Identification**
> "Which stage type is automatically created for each user?"
- Answer: User stage

**Pattern 2: Stage Reference Syntax**
> "What notation is used to reference a table stage for a table named 'customers'?"
- Answer: `@%customers`

**Pattern 3: Command Restrictions**
> "Why would a PUT command fail in Snowsight?"
- Answer: PUT command can only be executed from SnowSQL, not Snowsight worksheets

**Pattern 4: Stage Capabilities**
> "Which internal stage type allows you to set file format options?"
- Answer: Named internal stage

**Pattern 5: External Stage Authentication**
> "What Snowflake object encapsulates authentication for external stages?"
- Answer: Storage integration

**Pattern 6: Directory Tables**
> "How do you query file metadata from a named stage?"
- Answer: `SELECT * FROM DIRECTORY(@stage_name)`

**Pattern 7: Stage Limitations**
> "Which stage type cannot be used with transformations during COPY INTO?"
- Answer: Table stage

### Tricky Distinctions

| Question | User Stage | Table Stage | Named Stage |
|----------|------------|-------------|-------------|
| Can set file format? | No | No | Yes |
| Can alter/drop? | No | No | Yes |
| Supports transformations? | Yes | **No** | Yes |
| Multiple table loads? | Yes | **No** | Yes |
| Has grantable privileges? | No | **No** | Yes |

### Memory Aids

- **@~** = "tilde" sounds like "my tile" = MY user stage
- **@%** = percent sign on table = TABLE stage
- **@name** = explicitly named = NAMED stage
- **PUT** = "Push Up To" internal stages only
- **GET** = "Grab Everything To" local from internal only

---

## 11. Practice Questions

### Question 1
Which of the following stage types is automatically created when a new table is created in Snowflake?

A) User stage
B) Table stage
C) Named internal stage
D) External stage

<details>
<summary>Show Answer</summary>

**Answer: B) Table stage**

A table stage is automatically allocated for each table created in Snowflake. It is referenced using the @%table_name notation.

</details>

### Question 2
You need to load data files that will be accessed by multiple users and loaded into multiple tables. Which stage type is MOST appropriate?

A) User stage
B) Table stage
C) Named internal stage
D) Any of the above

<details>
<summary>Show Answer</summary>

**Answer: C) Named internal stage**

Named internal stages are recommended when multiple users need to access files and load data into multiple tables. They offer the most flexibility with configurable permissions and properties.

</details>

### Question 3
What happens when you try to execute a PUT command from a Snowsight worksheet?

A) The command executes successfully
B) The command fails - PUT only works in SnowSQL
C) The command works but with reduced functionality
D) The command requires additional permissions

<details>
<summary>Show Answer</summary>

**Answer: B) The command fails - PUT only works in SnowSQL**

The PUT command can only be executed from the SnowSQL command-line client, not from the Snowsight web interface.

</details>

### Question 4
Which SQL command retrieves metadata about files stored in a named stage called 'my_data_stage'?

A) `LIST @my_data_stage`
B) `SELECT * FROM @my_data_stage`
C) `SELECT * FROM DIRECTORY(@my_data_stage)`
D) Both A and C

<details>
<summary>Show Answer</summary>

**Answer: D) Both A and C**

LIST returns basic file information (name, size, hash, timestamp). DIRECTORY() returns richer metadata including FILE_URL and ETAG, but requires the directory table to be enabled on the stage.

</details>

### Question 5
A data engineer needs to create an external stage referencing an S3 bucket. What is the recommended approach for authentication?

A) Include AWS credentials directly in the CREATE STAGE statement
B) Use a storage integration object
C) Use environment variables
D) Store credentials in a config file

<details>
<summary>Show Answer</summary>

**Answer: B) Use a storage integration object**

Storage integrations are the recommended approach as they avoid hardcoding credentials, centralize credential management, and support IAM roles for enhanced security.

</details>

### Question 6
Which of the following statements about table stages is TRUE?

A) Table stages can be altered to add file format options
B) Table stages support data transformations during COPY INTO
C) Table stages are implicit objects tied to tables
D) Table stages can be shared across multiple tables

<details>
<summary>Show Answer</summary>

**Answer: C) Table stages are implicit objects tied to tables**

Table stages are not separate database objects - they are implicit stages tied to tables. They cannot be altered, don't support transformations, and are specific to a single table.

</details>

### Question 7
What is the correct URL format for creating an external stage pointing to Azure Blob Storage?

A) `azure://container/path/`
B) `wasb://container@account/path/`
C) `azure://account.blob.core.windows.net/container/path/`
D) `https://account.blob.core.windows.net/container/path/`

<details>
<summary>Show Answer</summary>

**Answer: C) `azure://account.blob.core.windows.net/container/path/`**

The correct Azure Blob Storage URL format for Snowflake stages uses the azure:// prefix followed by the full storage account hostname, container name, and path.

</details>

### Question 8
Which stage property determines how files are automatically compressed when uploaded to an internal stage?

A) COMPRESSION
B) AUTO_COMPRESS
C) FILE_FORMAT
D) Internal stages do not compress files

<details>
<summary>Show Answer</summary>

**Answer: B) AUTO_COMPRESS**

The AUTO_COMPRESS option (default TRUE) in the PUT command determines whether uncompressed files are automatically compressed using GZIP when uploaded to internal stages.

</details>

---

## 12. Summary

Stages are fundamental to data movement in Snowflake. Key takeaways:

- **Internal stages** (user, table, named) store data in Snowflake-managed cloud storage
- **External stages** reference data in your organization's cloud storage (S3, GCS, Azure)
- Use **storage integrations** for secure external stage authentication
- **Directory tables** provide queryable metadata about staged files
- **PUT/GET commands** work only with internal stages and only from SnowSQL
- Choose the appropriate stage type based on access patterns and flexibility requirements

Understanding stage types, their capabilities, limitations, and reference syntax is essential for both the SnowPro Core exam and practical Snowflake administration.
