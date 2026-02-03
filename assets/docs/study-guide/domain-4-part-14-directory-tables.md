# Domain 4: Data Loading & Unloading

## Part 14: Directory Tables

This section provides comprehensive coverage of directory tables in Snowflake, which are implicit objects layered on stages that store file-level metadata about staged data files. Directory tables are essential for managing unstructured data, building data processing pipelines, and querying file metadata without loading the files themselves.

---

## 1. What is a Directory Table?

A **directory table** is an implicit object layered on a stage (not a separate database object) that stores file-level metadata about the data files in the stage.

**Key Characteristics:**
- Conceptually similar to an external table because it stores file-level metadata
- Not a separate database object - it's part of the stage
- Has **no grantable privileges of its own** (access controlled through stage privileges)
- Available for both **internal stages** and **external stages** (named stages only)
- Automatically tracks file additions, modifications, and deletions when refreshed

**What Directory Tables Store:**
```
File Metadata --> Directory Table --> Queryable via SELECT FROM DIRECTORY()
   |                    |
   |- File paths        |- RELATIVE_PATH
   |- File sizes        |- SIZE
   |- Timestamps        |- LAST_MODIFIED
   |- Checksums         |- MD5, ETAG
   |- File URLs         |- FILE_URL
```

---

## 2. Directory Table Use Cases

Directory tables enable several important unstructured data workflows:

### 2.1 Query File Listings

Retrieve a list of all files on a stage with metadata including file size, last modified timestamp, and Snowflake file URLs.

### 2.2 Create Views of Unstructured Data

Join directory tables with Snowflake tables containing additional metadata to create comprehensive views that combine file URLs with structured data.

### 2.3 Build Data Processing Pipelines

Use directory tables with streams and tasks to construct automated file processing pipelines that respond to new file arrivals.

### 2.4 Process Unstructured Files

Access file URLs to process unstructured data (PDFs, images, documents) using Snowpark, external functions, or UDFs.

---

## 3. Creating and Enabling Directory Tables

### 3.1 Creating a Stage with a Directory Table

Enable a directory table when creating a new stage:

**Internal Stage:**
```sql
-- Create internal stage with directory table enabled
CREATE STAGE my_internal_stage
  DIRECTORY = (ENABLE = TRUE)
  ENCRYPTION = (TYPE = 'SNOWFLAKE_SSE')
  FILE_FORMAT = my_format;
```

**External Stage (AWS S3):**
```sql
-- Create external stage with directory table
CREATE STAGE my_s3_stage
  STORAGE_INTEGRATION = my_storage_int
  URL = 's3://mybucket/path/'
  DIRECTORY = (ENABLE = TRUE);
```

**External Stage (Google Cloud Storage):**
```sql
CREATE STAGE my_gcs_stage
  STORAGE_INTEGRATION = my_storage_int
  URL = 'gcs://mybucket/path/'
  DIRECTORY = (ENABLE = TRUE);
```

**External Stage (Microsoft Azure):**
```sql
CREATE STAGE my_azure_stage
  STORAGE_INTEGRATION = my_storage_int
  URL = 'azure://myaccount.blob.core.windows.net/container/path/'
  DIRECTORY = (ENABLE = TRUE);
```

### 3.2 Enabling Directory Table on Existing Stage

Add a directory table to an existing stage:

```sql
-- Enable directory table on existing stage
ALTER STAGE my_existing_stage SET DIRECTORY = (ENABLE = TRUE);

-- IMPORTANT: After enabling, you MUST refresh manually
ALTER STAGE my_existing_stage REFRESH;
```

### 3.3 Disabling Directory Tables

```sql
-- Disable directory table
ALTER STAGE my_stage SET DIRECTORY = (ENABLE = FALSE);
```

---

## 4. Directory Table Columns

When you query a directory table, the output includes the following columns:

| Column | Data Type | Description |
|--------|-----------|-------------|
| **RELATIVE_PATH** | TEXT | Path to the file relative to the stage location |
| **SIZE** | NUMBER | Size of the file in bytes |
| **LAST_MODIFIED** | TIMESTAMP_TZ | Timestamp when the file was last updated in the stage |
| **MD5** | HEX | MD5 checksum for the file |
| **ETAG** | HEX | ETag header for the file (cloud provider entity tag) |
| **FILE_URL** | TEXT | Snowflake file URL to access the file |

### FILE_URL Format

The FILE_URL has the following format:
```
https://<account_identifier>/<db_name>/<schema_name>/<stage_name>/<relative_path>
```

**Example:**
```
https://myorg-myaccount.snowflakecomputing.com/mydb/myschema/mystage/data/file.csv
```

**Note for Business Critical Accounts:** A `privatelink` segment is prepended to the URL just before `snowflakecomputing.com`, even if private connectivity is not enabled:
```
https://myorg-myaccount.privatelink.snowflakecomputing.com/...
```

---

## 5. Querying Directory Tables

### 5.1 Basic Syntax

```sql
SELECT * FROM DIRECTORY( @<stage_name> )
```

### 5.2 Query Examples

**Query All Files:**
```sql
-- Retrieve all file metadata from a directory table
SELECT * FROM DIRECTORY(@mystage);
```

**Filter by File Size:**
```sql
-- Get files larger than 100KB
SELECT FILE_URL, SIZE, LAST_MODIFIED
FROM DIRECTORY(@mystage)
WHERE SIZE > 100000;
```

**Filter by File Type:**
```sql
-- Get only CSV files
SELECT FILE_URL
FROM DIRECTORY(@mystage)
WHERE RELATIVE_PATH LIKE '%.csv';

-- Get only PDF files
SELECT FILE_URL, RELATIVE_PATH
FROM DIRECTORY(@mystage)
WHERE RELATIVE_PATH LIKE '%.pdf';
```

**Filter by Path:**
```sql
-- Get files in a specific folder
SELECT *
FROM DIRECTORY(@mystage)
WHERE RELATIVE_PATH LIKE '2024/01/%';
```

**Order by Modification Time:**
```sql
-- Get most recently modified files
SELECT RELATIVE_PATH, LAST_MODIFIED, SIZE
FROM DIRECTORY(@mystage)
ORDER BY LAST_MODIFIED DESC
LIMIT 10;
```

### 5.3 Creating Views with Directory Tables

Join directory tables with other Snowflake tables to create enriched views:

```sql
-- Create a view combining file URLs with metadata
CREATE VIEW reports_information AS
SELECT
    s.file_url AS report_link,
    s.last_modified,
    s.size,
    m.report_title,
    m.author,
    m.publish_date,
    m.department
FROM DIRECTORY(@my_pdf_stage) s
JOIN report_metadata m ON s.file_url = m.file_url;
```

---

## 6. Refreshing Directory Table Metadata

Directory tables must be refreshed to synchronize metadata with the actual files in the stage. Refresh operations detect:

- **New files** - Added to table metadata
- **Updated files** - Updated in table metadata
- **Deleted files** - Removed from table metadata

### 6.1 Manual Refresh

**Basic Refresh:**
```sql
-- Refresh entire directory table
ALTER STAGE my_stage REFRESH;
```

**Selective Refresh with SUBPATH:**
```sql
-- Refresh only files in a specific path (better performance)
ALTER STAGE my_stage REFRESH SUBPATH = '2024/01/31';
```

**Refresh Output Columns:**

| Column | Description |
|--------|-------------|
| file | Name and relative path of the staged file |
| status | REGISTERED_NEW, REGISTERED_UPDATE, REGISTER_SKIPPED, REGISTER_FAILED, UNREGISTERED, or UNREGISTER_FAILED |
| description | Detailed description of the registration status |

**Important Notes:**
- After creating a stage with a directory table, you **MUST** execute `ALTER STAGE ... REFRESH` to populate metadata
- Manual refreshes on external stages **block** simultaneous automated refreshes
- Manual refreshes perform list operations and can be slow for large stages
- Use selective SUBPATH for better performance on large stages

### 6.2 Automatic Refresh

Automatic refresh uses cloud event notification services to trigger metadata updates when files change.

**Internal Stages (Preview - AWS Only):**
```sql
-- Create internal stage with auto-refresh
CREATE STAGE my_int_stage
  DIRECTORY = (
    ENABLE = TRUE,
    AUTO_REFRESH = TRUE
  );
```

**Note:** Automated refresh for internal stages is currently only available for accounts hosted on **AWS**. It is not supported on Google Cloud or Azure.

**External Stages:**

Configure automatic refresh using cloud-specific event notification services:

| Cloud Provider | Event Notification Service |
|----------------|---------------------------|
| Amazon S3 | Amazon SQS (Simple Queue Service) |
| Google Cloud Storage | Google Cloud Pub/Sub |
| Microsoft Azure | Microsoft Azure Event Grid |

**External Stage with Auto-Refresh (AWS S3):**
```sql
CREATE STAGE my_s3_stage
  STORAGE_INTEGRATION = my_s3_int
  URL = 's3://mybucket/path/'
  DIRECTORY = (
    ENABLE = TRUE,
    AUTO_REFRESH = TRUE
  );
```

**AUTO_REFRESH Parameter:**
- `TRUE` - Snowflake enables triggering automatic refreshes when new or updated files are available
- `FALSE` - You must manually refresh using `ALTER STAGE ... REFRESH`

### 6.3 Cross-Cloud Auto-Refresh Support

Snowflake supports cross-cloud, cross-region automated directory table refreshes for external stages:

| Snowflake Account Host | Amazon S3 | Google Cloud Storage | Azure Blob Storage |
|------------------------|-----------|---------------------|-------------------|
| AWS | Supported | Supported | Supported |
| GCP | Supported | Supported | Supported |
| Azure | Supported | Supported | Supported |

---

## 7. Building Data Pipelines with Directory Tables

Directory tables can be combined with streams and tasks to build automated data processing pipelines.

### 7.1 Pipeline Architecture

```
Files Added → Stage with Directory Table → Stream → Task → Target Table
                      ↓
              Metadata changes captured by stream
                      ↓
              Task processes new files periodically
```

### 7.2 Creating a Stream on a Directory Table

```sql
-- Create a stream to track changes to the directory table
CREATE STREAM my_file_stream ON STAGE my_stage;
```

The stream records DML changes (inserts, updates, deletes) to the directory table metadata.

### 7.3 Complete Pipeline Example

**Step 1: Create Stage with Directory Table**
```sql
CREATE STAGE my_pdf_stage
  DIRECTORY = (ENABLE = TRUE)
  ENCRYPTION = (TYPE = 'SNOWFLAKE_SSE');
```

**Step 2: Create Stream on Directory Table**
```sql
CREATE STREAM my_pdf_stream ON STAGE my_pdf_stage;
```

**Step 3: Create Target Table**
```sql
CREATE TABLE processed_files (
  file_name VARCHAR,
  file_data VARIANT
);
```

**Step 4: Create Processing Task**
```sql
CREATE TASK process_new_files
  WAREHOUSE = my_warehouse
  SCHEDULE = '5 MINUTE'
  COMMENT = 'Process new files detected by stream'
  WHEN SYSTEM$STREAM_HAS_DATA('my_pdf_stream')
AS
  INSERT INTO processed_files
  SELECT
    relative_path AS file_name,
    PARSE_JSON(file_content) AS file_data
  FROM my_pdf_stream
  WHERE METADATA$ACTION = 'INSERT';
```

**Step 5: Resume the Task**
```sql
ALTER TASK process_new_files RESUME;
```

### 7.4 Using BUILD_SCOPED_FILE_URL

Access file content using scoped URLs in your pipeline:

```sql
-- Query using scoped file URL
SELECT
  relative_path AS file_name,
  BUILD_SCOPED_FILE_URL(@my_stage, relative_path) AS scoped_url
FROM DIRECTORY(@my_stage);
```

---

## 8. Access Control for Directory Tables

Directory tables have no grantable privileges of their own. Access is controlled through stage privileges.

### 8.1 Required Privileges by Operation

| Operation | Internal Stage | External Stage |
|-----------|---------------|----------------|
| **SELECT FROM DIRECTORY** | READ privilege | READ or USAGE privilege |
| **Upload files (PUT)** | WRITE privilege | N/A (use cloud tools) |
| **Remove files** | WRITE privilege | WRITE or USAGE privilege |
| **Refresh metadata** | WRITE privilege | WRITE or USAGE privilege |

### 8.2 Example Grant Statements

```sql
-- Grant read access to query directory table
GRANT READ ON STAGE my_stage TO ROLE data_analyst;

-- Grant write access to refresh metadata
GRANT WRITE ON STAGE my_stage TO ROLE data_engineer;

-- For external stages, USAGE also works
GRANT USAGE ON STAGE my_external_stage TO ROLE data_analyst;
```

---

## 9. Billing for Directory Tables

### 9.1 Automatic Refresh Charges

- Event notification overhead for automatic refresh is included in your charges
- Charges increase with the number of files added to stages with directory tables
- Appears as **Snowpipe charges** in billing (Snowpipe manages event notifications)
- Query `PIPE_USAGE_HISTORY` function or Account Usage view to estimate costs

### 9.2 Manual Refresh Charges

- Manual refresh uses **cloud services credits**
- Charged according to standard cloud services billing model
- Does **NOT** appear in PIPE_USAGE_HISTORY queries

### 9.3 Monitoring Costs

```sql
-- Query auto-refresh registration history and credits billed
SELECT *
FROM TABLE(INFORMATION_SCHEMA.AUTO_REFRESH_REGISTRATION_HISTORY(
  DATE_RANGE_START => DATEADD(day, -7, CURRENT_TIMESTAMP()),
  OBJECT_TYPE => 'DIRECTORY_TABLE'
));

-- Query directory table file registration history
SELECT *
FROM TABLE(INFORMATION_SCHEMA.STAGE_DIRECTORY_FILE_REGISTRATION_HISTORY(
  STAGE_NAME => 'my_stage'
));
```

---

## 10. Information Schema Functions

### 10.1 AUTO_REFRESH_REGISTRATION_HISTORY

Retrieve the history of data files registered in metadata and credits billed:

```sql
SELECT *
FROM TABLE(INFORMATION_SCHEMA.AUTO_REFRESH_REGISTRATION_HISTORY(
  DATE_RANGE_START => DATEADD(hour, -24, CURRENT_TIMESTAMP()),
  OBJECT_TYPE => 'DIRECTORY_TABLE',
  OBJECT_NAME => 'my_db.my_schema.my_stage'
));
```

### 10.2 STAGE_DIRECTORY_FILE_REGISTRATION_HISTORY

Retrieve metadata history including any errors found during refresh:

```sql
SELECT *
FROM TABLE(INFORMATION_SCHEMA.STAGE_DIRECTORY_FILE_REGISTRATION_HISTORY(
  STAGE_NAME => 'my_db.my_schema.my_stage',
  START_TIME => DATEADD(hour, -12, CURRENT_TIMESTAMP())
));
```

---

## 11. Important Considerations

### 11.1 Supported Stage Types

| Stage Type | Directory Table Support |
|------------|------------------------|
| User Stage (@~) | **Not Supported** |
| Table Stage (@%table) | **Not Supported** |
| Named Internal Stage | Supported |
| Named External Stage | Supported |

### 11.2 Auto-Refresh Limitations

- **Internal stages**: Auto-refresh currently only available on **AWS-hosted accounts**
- **Google Cloud and Azure**: Manual refresh required for internal stages
- **External stages**: Auto-refresh supported across all cloud platforms

### 11.3 Performance Considerations

- Use **SUBPATH** for selective refresh on large stages
- Prefer **event-based auto-refresh** over manual refresh for large/fast-growing stages
- Manual refresh performs LIST operations which can be expensive

### 11.4 Corruption Check for Internal Stages

If files downloaded from an internal stage are corrupted, verify that the stage has:
```sql
ENCRYPTION = (TYPE = 'SNOWFLAKE_SSE')
```

---

## 12. Exam Tips and Common Question Patterns

### Key Facts to Memorize

1. **Directory Table Nature:**
   - Implicit object layered on a stage
   - NOT a separate database object
   - No grantable privileges of its own

2. **Stage Support:**
   - Works with named internal and external stages
   - Does NOT work with user stages (@~) or table stages (@%table)

3. **Required Actions:**
   - Must run `ALTER STAGE ... REFRESH` after creating a stage with directory table
   - Auto-refresh for internal stages only on AWS accounts

4. **Query Syntax:**
   - `SELECT * FROM DIRECTORY(@stage_name)`
   - Not `SELECT * FROM @stage_name`

5. **Billing:**
   - Auto-refresh appears as Snowpipe charges
   - Manual refresh uses cloud services credits

6. **Event Services by Cloud:**
   - AWS: Amazon SQS
   - GCP: Google Cloud Pub/Sub
   - Azure: Microsoft Azure Event Grid

### Common Exam Question Patterns

**Pattern 1: Identifying Directory Table Purpose**
> "What Snowflake feature allows you to query file metadata without loading the files?"
- Answer: Directory table

**Pattern 2: Query Syntax**
> "Which SQL statement retrieves file URLs from a stage with a directory table?"
- Answer: `SELECT FILE_URL FROM DIRECTORY(@my_stage)`

**Pattern 3: Stage Type Support**
> "Which stage types support directory tables?"
- Answer: Named internal stages and named external stages (NOT user or table stages)

**Pattern 4: Refresh Requirements**
> "After enabling a directory table on a stage, what must you do?"
- Answer: Execute `ALTER STAGE ... REFRESH` to populate the metadata

**Pattern 5: Auto-Refresh Internal Stages**
> "On which cloud platform does Snowflake support auto-refresh for internal stage directory tables?"
- Answer: AWS only (Preview feature)

**Pattern 6: Billing Classification**
> "How do automatic directory table refresh charges appear in billing?"
- Answer: As Snowpipe charges

**Pattern 7: Event Notification Services**
> "Which AWS service is used for automatic directory table refresh?"
- Answer: Amazon SQS (Simple Queue Service)

**Pattern 8: Directory Table Columns**
> "Which column in a directory table provides a URL to access the file?"
- Answer: FILE_URL

### Tricky Distinctions

| Concept | Directory Table | External Table |
|---------|-----------------|----------------|
| Object Type | Implicit (part of stage) | Explicit database object |
| Grantable Privileges | No | Yes |
| Query Syntax | `DIRECTORY(@stage)` | Direct table reference |
| Stores | File metadata only | File metadata + data access |
| Refresh | Manual or auto | Auto with notification |

### Memory Aids

- **DIRECTORY()** = "DIRectory of files" - wraps stage reference
- **No User/Table stages** = "Named stages only need apply"
- **SQS for AWS** = "Simple Queue Service = Simple refresh"
- **Manual refresh first** = "Create then Refresh" (like "trust but verify")

---

## 13. Practice Questions

### Question 1
What is a directory table in Snowflake?

A) A separate database object that stores file metadata
B) An implicit object layered on a stage that stores file-level metadata
C) A system table that tracks all stages in an account
D) A view that combines data from multiple stages

<details>
<summary>Show Answer</summary>

**Answer: B) An implicit object layered on a stage that stores file-level metadata**

A directory table is not a separate database object. It's an implicit object that exists as part of a stage and stores metadata about the files in that stage.

</details>

### Question 2
Which of the following stage types support directory tables? (Select TWO)

A) User stage
B) Table stage
C) Named internal stage
D) Named external stage

<details>
<summary>Show Answer</summary>

**Answer: C) Named internal stage and D) Named external stage**

Directory tables are only supported on named stages (both internal and external). User stages (@~) and table stages (@%table) do not support directory tables.

</details>

### Question 3
After creating a stage with DIRECTORY = (ENABLE = TRUE), what must you do before querying the directory table?

A) Grant SELECT privilege on the directory table
B) Execute ALTER STAGE ... REFRESH
C) Wait for the automatic sync to complete
D) Create a view on the directory table

<details>
<summary>Show Answer</summary>

**Answer: B) Execute ALTER STAGE ... REFRESH**

After creating a stage with a directory table, you MUST execute ALTER STAGE ... REFRESH to manually populate the directory table metadata with the files currently in the stage.

</details>

### Question 4
Which column in a directory table provides a URL that can be used to access the file content?

A) RELATIVE_PATH
B) ETAG
C) FILE_URL
D) MD5

<details>
<summary>Show Answer</summary>

**Answer: C) FILE_URL**

The FILE_URL column contains a Snowflake file URL that can be used to access the actual file content. RELATIVE_PATH contains only the path, while ETAG and MD5 are checksums.

</details>

### Question 5
How do automatic directory table refresh charges appear in Snowflake billing?

A) As warehouse compute charges
B) As storage charges
C) As Snowpipe charges
D) As cloud services charges

<details>
<summary>Show Answer</summary>

**Answer: C) As Snowpipe charges**

Automatic refresh charges for directory tables appear as Snowpipe charges in billing because Snowpipe infrastructure is used for managing the event notifications.

</details>

### Question 6
Which event notification service is used for automatic directory table refresh on Google Cloud Storage?

A) Amazon SQS
B) Google Cloud Pub/Sub
C) Microsoft Azure Event Grid
D) Google Cloud Functions

<details>
<summary>Show Answer</summary>

**Answer: B) Google Cloud Pub/Sub**

Google Cloud Pub/Sub is the event notification service used for automatic directory table refresh when the external stage references Google Cloud Storage.

</details>

### Question 7
For which Snowflake account hosting platform is automatic refresh of internal stage directory tables currently supported?

A) AWS only
B) Azure only
C) GCP only
D) All platforms

<details>
<summary>Show Answer</summary>

**Answer: A) AWS only**

Automatic refresh for directory tables on internal stages is currently a preview feature only available for accounts hosted on AWS. Accounts on Google Cloud or Azure must use manual refresh.

</details>

### Question 8
Which SQL statement correctly queries a directory table?

A) `SELECT * FROM @my_stage`
B) `SELECT * FROM DIRECTORY(@my_stage)`
C) `SELECT * FROM TABLE(DIRECTORY('my_stage'))`
D) `DESCRIBE DIRECTORY my_stage`

<details>
<summary>Show Answer</summary>

**Answer: B) SELECT * FROM DIRECTORY(@my_stage)**

The correct syntax uses the DIRECTORY() function wrapped around the stage reference with the @ symbol.

</details>

### Question 9
What Snowflake object can be created on a directory table to build automated data processing pipelines?

A) Task
B) Stream
C) Pipe
D) Procedure

<details>
<summary>Show Answer</summary>

**Answer: B) Stream**

A stream can be created on a directory table (by specifying ON STAGE) to track changes to the file metadata. This stream can then be used with tasks to build automated processing pipelines.

</details>

### Question 10
Which privilege is required to refresh the metadata of a directory table on an internal stage?

A) READ privilege on the stage
B) WRITE privilege on the stage
C) OWNERSHIP privilege on the database
D) CREATE STAGE privilege on the schema

<details>
<summary>Show Answer</summary>

**Answer: B) WRITE privilege on the stage**

For internal stages, the WRITE privilege is required to refresh directory table metadata. For external stages, either WRITE or USAGE privilege is sufficient.

</details>

---

## 14. Summary

Directory tables provide a powerful way to manage and query metadata about files in Snowflake stages:

- **Implicit objects** layered on named stages (not user or table stages)
- Store file metadata including **paths, sizes, timestamps, checksums, and URLs**
- Query using `SELECT * FROM DIRECTORY(@stage_name)` syntax
- Require **manual refresh** after creation; support **auto-refresh** for external stages
- **Auto-refresh for internal stages** only available on AWS accounts (preview)
- **No grantable privileges** - access controlled through stage privileges
- Enable **data processing pipelines** when combined with streams and tasks
- **Billing**: Auto-refresh appears as Snowpipe charges; manual refresh uses cloud services credits

Understanding directory tables is essential for working with unstructured data in Snowflake and for building event-driven data pipelines that respond to file changes in cloud storage.
