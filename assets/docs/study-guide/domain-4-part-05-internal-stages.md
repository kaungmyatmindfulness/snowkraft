# Domain 4: Data Loading & Unloading

## Part 5: Internal Stages

This section provides comprehensive coverage of Snowflake internal stages, including user stages, table stages, and named internal stages. Understanding internal stages is critical for the SnowPro Core exam, as they form the foundation for staging data within Snowflake-managed storage before loading into tables.

---

## 1. Overview of Internal Stages

**Internal stages** store data files within Snowflake's managed cloud storage infrastructure. Unlike external stages (which reference your organization's cloud storage), internal stages are fully managed by Snowflake, including storage, encryption, and access control.

### Key Characteristics of Internal Stages

| Feature | Description |
|---------|-------------|
| **Storage Location** | Snowflake-managed blob storage (S3, Azure Blob, GCS depending on cloud platform) |
| **Encryption** | All files automatically encrypted at rest |
| **Access Method** | PUT command (SnowSQL only) or Snowsight UI |
| **Supported Operations** | PUT, GET, LIST, REMOVE, COPY INTO |
| **Compression** | Auto-compression with GZIP by default |

### Data Flow with Internal Stages

```
Local Files --> PUT Command --> Internal Stage --> COPY INTO --> Snowflake Table
                                      ^
                                      |
                           Encrypted & Compressed
```

---

## 2. Three Types of Internal Stages

Snowflake provides three types of internal stages, each designed for different use cases:

### 2.1 User Stages (@~)

A **user stage** is a personal staging area automatically allocated to each Snowflake user account.

**Key Characteristics:**
- **Automatically created** when a user is created
- Designed for files staged and managed by a **single user**
- Can load data into **multiple tables**
- **Cannot be altered or dropped** - lifecycle tied to user account
- **Cannot set file format options** on the stage itself
- Only accessible by the owning user - no privilege grants possible
- No directory table support

**Reference Notation:** `@~`

```sql
-- List files in your user stage
LIST @~;

-- List files in a specific folder
LIST @~/mydata/;

-- Upload file to user stage (SnowSQL only)
PUT file:///tmp/data.csv @~;

-- Upload to specific folder
PUT file:///tmp/data.csv @~/mydata/;

-- Copy data from user stage
COPY INTO my_table
FROM @~/mydata/data.csv.gz
FILE_FORMAT = (TYPE = CSV);

-- Remove files from user stage
REMOVE @~/mydata/data.csv.gz;
```

**When to Use User Stages:**
- Personal data preparation and testing
- Ad-hoc data loads by individual analysts
- Staging files that only you will access
- Quick one-time data imports

---

### 2.2 Table Stages (@%)

A **table stage** is automatically allocated to each table created in Snowflake, providing a dedicated staging area for that specific table.

**Key Characteristics:**
- **Automatically created** with each table
- Designed for loading data into a **single table** only
- Can be accessed by **multiple users** (who have table privileges)
- **Cannot be altered or dropped** - lifecycle tied to table
- **Not a separate database object** - implicit stage tied to table
- **No grantable privileges** - access controlled via table OWNERSHIP
- **Does NOT support data transformations** during COPY
- Apache Iceberg tables do not have table stages
- No directory table support

**Reference Notation:** `@%table_name`

```sql
-- List files in table stage for 'customers' table
LIST @%customers;

-- Upload file to table stage (SnowSQL only)
PUT file:///tmp/customers.csv @%customers;

-- Copy data from table stage to its table
COPY INTO customers FROM @%customers;

-- With file format specification
COPY INTO customers
FROM @%customers
FILE_FORMAT = (TYPE = CSV SKIP_HEADER = 1);

-- Remove all files from table stage
REMOVE @%customers;
```

**Important Limitation - No Transformations:**
```sql
-- This WILL NOT work with table stages:
COPY INTO customers
FROM (SELECT $1, $2, CURRENT_TIMESTAMP() FROM @%customers);  -- ERROR!

-- Use named stages for transformations:
COPY INTO customers
FROM (SELECT $1, $2, CURRENT_TIMESTAMP() FROM @my_named_stage);  -- Works
```

**When to Use Table Stages:**
- Single-table data loads by multiple team members
- Simple file-to-table mapping without transformations
- When files are only needed for one specific table

---

### 2.3 Named Internal Stages (@stage_name)

A **named internal stage** is a user-created database object that provides maximum flexibility for data staging.

**Key Characteristics:**
- **Manually created** using CREATE STAGE command
- **Database object** residing in a schema
- Can load data into **any table** (with appropriate privileges)
- **Can be altered and dropped** like any database object
- **Supports file format options** at stage level
- Full role-based access control with **grantable privileges**
- **Supports data transformations** during COPY
- **Supports directory tables** for file metadata queries
- Configurable encryption options

**Reference Notation:** `@stage_name` or `@database.schema.stage_name`

```sql
-- Create a basic named internal stage
CREATE STAGE my_data_stage;

-- Create with specific encryption type
CREATE STAGE my_secure_stage
  ENCRYPTION = (TYPE = 'SNOWFLAKE_FULL');

-- Create with file format specification
CREATE STAGE my_csv_stage
  FILE_FORMAT = (TYPE = CSV SKIP_HEADER = 1 FIELD_DELIMITER = '|');

-- Create with directory table enabled
CREATE STAGE my_stage_with_dir
  DIRECTORY = (ENABLE = TRUE);

-- Create with comment
CREATE STAGE my_stage
  COMMENT = 'Stage for sales data loads';
```

**Stage Commands:**
```sql
-- List files
LIST @my_data_stage;

-- Upload files (SnowSQL only)
PUT file:///tmp/data.csv @my_data_stage/folder/;

-- Copy with transformations (supported!)
COPY INTO my_table
FROM (
  SELECT $1, $2, CURRENT_TIMESTAMP()
  FROM @my_data_stage
)
FILE_FORMAT = (TYPE = CSV);

-- Query directory table metadata
SELECT * FROM DIRECTORY(@my_stage_with_dir);

-- Alter stage properties
ALTER STAGE my_data_stage SET FILE_FORMAT = (TYPE = JSON);

-- Drop stage (files are deleted!)
DROP STAGE my_data_stage;
```

**When to Use Named Internal Stages:**
- Production data pipelines
- Multi-user, multi-table loading workflows
- When you need transformations during COPY
- When you need directory tables for metadata
- When you need configurable encryption

---

## 3. Stage Types Comparison

| Feature | User Stage (@~) | Table Stage (@%) | Named Internal Stage (@name) |
|---------|-----------------|------------------|------------------------------|
| **Reference Syntax** | `@~` | `@%table_name` | `@stage_name` |
| **Creation** | Automatic (per user) | Automatic (per table) | Manual (CREATE STAGE) |
| **Can Be Altered** | No | No | Yes |
| **Can Be Dropped** | No | No | Yes |
| **File Format on Stage** | No | No | Yes |
| **Access Control** | User only | Table owners | Role-based privileges |
| **Load to Multiple Tables** | Yes | No | Yes |
| **Supports Transformations** | Yes | **No** | Yes |
| **Directory Table Support** | No | No | Yes |
| **Multiple Users** | No | Yes (via table privileges) | Yes (via stage privileges) |
| **Grantable Privileges** | No | No | Yes (READ, WRITE) |

---

## 4. The PUT Command

The PUT command uploads files from a local file system to an internal stage. This is the primary method for getting data into internal stages.

### Basic Syntax

```sql
PUT file://<local_file_path> @<stage_name>[/<path>/]
  [ PARALLEL = <num_threads> ]
  [ AUTO_COMPRESS = TRUE | FALSE ]
  [ SOURCE_COMPRESSION = AUTO_DETECT | GZIP | BZ2 | BROTLI | ZSTD | DEFLATE | RAW_DEFLATE | NONE ]
  [ OVERWRITE = TRUE | FALSE ]
```

### PUT Command Options

| Option | Default | Description |
|--------|---------|-------------|
| **PARALLEL** | 4 | Number of threads for parallel upload (1-99) |
| **AUTO_COMPRESS** | TRUE | Automatically compress uncompressed files with GZIP |
| **SOURCE_COMPRESSION** | AUTO_DETECT | Specifies compression type of source files |
| **OVERWRITE** | FALSE | Overwrite existing files with same name |

### File Path Formats

| Operating System | Path Format | Example |
|------------------|-------------|---------|
| Linux/macOS | `file:///path/to/file` | `file:///tmp/data.csv` |
| Windows | `file://C:/path/to/file` or `file://C:\path\to\file` | `file://C:/data/file.csv` |

### PUT Command Examples

```sql
-- Basic upload to user stage
PUT file:///tmp/sales.csv @~;

-- Upload to table stage
PUT file:///tmp/customers.csv @%customers;

-- Upload to named stage with folder path
PUT file:///tmp/2024/jan/data.csv @my_stage/2024/jan/;

-- Upload with wildcards (multiple files)
PUT file:///tmp/data*.csv @my_stage;

-- Upload without auto-compression
PUT file:///tmp/data.csv @my_stage AUTO_COMPRESS = FALSE;

-- Upload with maximum parallelism
PUT file:///tmp/large_file.csv @my_stage PARALLEL = 99;

-- Overwrite existing files
PUT file:///tmp/data.csv @my_stage OVERWRITE = TRUE;

-- Upload pre-compressed file
PUT file:///tmp/data.csv.gz @my_stage SOURCE_COMPRESSION = GZIP;

-- Windows path example
PUT file://C:/Users/analyst/data.csv @my_stage;
```

### Critical PUT Command Restrictions

1. **SnowSQL Required for PUT Command**: The PUT SQL command cannot be executed from Snowsight worksheets
2. **Internal Stages Only**: Cannot use PUT with external stages (use cloud provider tools)
3. **Local Files Only**: Must be accessible from the machine running SnowSQL
4. **File Size**: No hard limit, but files should ideally be 100-250 MB compressed for optimal loading

> **Note:** While the PUT command requires SnowSQL, there are alternative methods to upload files to internal stages:
> - **Snowsight UI**: Drag-and-drop file upload interface (Data > Add Data)
> - **Snowflake Python API**: Programmatic file operations via `snowflake.core`
> - **Snowpark**: DataFrame `write` operations and file transfer APIs
> - **Snowflake CLI**: `snow stage copy` command
>
> For the exam, remember that the PUT *SQL command* specifically requires SnowSQL.

### PUT Command and File Naming

When files are uploaded:
- If AUTO_COMPRESS = TRUE (default), `.gz` extension is added to uncompressed files
- Original filename is preserved in the stage
- Duplicate uploads without OVERWRITE create files with version suffixes

```sql
-- Original file: data.csv
PUT file:///tmp/data.csv @my_stage;
-- Result in stage: data.csv.gz (auto-compressed)

PUT file:///tmp/data.csv @my_stage AUTO_COMPRESS = FALSE;
-- Result in stage: data.csv (no compression)
```

---

## 5. Stage Encryption

All data stored in internal stages is automatically encrypted. Snowflake provides two encryption options for named internal stages.

### Encryption Types

| Type | Description | Key Size |
|------|-------------|----------|
| **SNOWFLAKE_FULL** | Client-side + server-side encryption (default) | 128-bit client, AES-256 server |
| **SNOWFLAKE_SSE** | Server-side encryption only | AES-256 |

### How Encryption Works

**SNOWFLAKE_FULL (Default):**
1. Files encrypted client-side with 128-bit key before transfer
2. Files encrypted server-side with AES-256 at rest
3. Files decrypted automatically when downloaded via GET
4. Provides end-to-end encryption

**SNOWFLAKE_SSE:**
1. Files encrypted server-side only with AES-256
2. Enables access to files via scoped/presigned URLs
3. Required for unstructured data access features
4. Required for directory table file URLs

### Creating Stages with Encryption

```sql
-- Default encryption (SNOWFLAKE_FULL)
CREATE STAGE stage_full_encryption;

-- Explicit full encryption
CREATE STAGE stage_full
  ENCRYPTION = (TYPE = 'SNOWFLAKE_FULL');

-- Server-side only encryption
CREATE STAGE stage_sse
  ENCRYPTION = (TYPE = 'SNOWFLAKE_SSE');
```

### When to Use Each Encryption Type

| Use Case | Recommended Encryption |
|----------|------------------------|
| Standard data loading | SNOWFLAKE_FULL (default) |
| Unstructured data access | SNOWFLAKE_SSE |
| File URL access | SNOWFLAKE_SSE |
| Directory tables with FILE_URL | SNOWFLAKE_SSE |
| Maximum security (Tri-Secret Secure) | SNOWFLAKE_FULL |

### Important Encryption Notes

- Encryption type **cannot be changed** after stage creation
- User stages and table stages always use SNOWFLAKE_FULL encryption
- Files are encrypted during PUT upload automatically
- Files are decrypted during GET download automatically
- COPY INTO operations work transparently regardless of encryption type

---

## 6. Stage Commands Reference

### LIST Command

Lists files staged in a location.

```sql
-- List all files in user stage
LIST @~;

-- List files in table stage
LIST @%customers;

-- List files in named stage
LIST @my_stage;

-- List files in specific path
LIST @my_stage/2024/01/;

-- List with pattern filter
LIST @my_stage PATTERN = '.*[.]csv';

-- List with specific pattern
LIST @my_stage PATTERN = '.*sales.*[.]csv[.]gz';
```

**Output Columns:**
| Column | Description |
|--------|-------------|
| name | Full path and filename |
| size | File size in bytes |
| md5 | MD5 hash of file |
| last_modified | Timestamp of last modification |

### REMOVE Command

Removes files from a stage.

```sql
-- Remove specific file
REMOVE @my_stage/data.csv.gz;

-- Remove all files in path
REMOVE @my_stage/2024/01/;

-- Remove with pattern
REMOVE @my_stage PATTERN = '.*[.]csv[.]gz';

-- Remove from user stage
REMOVE @~/temp/;

-- Remove from table stage
REMOVE @%customers;
```

### GET Command

Downloads files from an internal stage to a local file system.

```sql
-- Download from user stage
GET @~/data.csv.gz file:///tmp/download/;

-- Download from named stage
GET @my_stage/folder/ file:///tmp/download/;

-- Download with parallel threads
GET @my_stage file:///tmp/ PARALLEL = 10;

-- Download with pattern filter
GET @my_stage file:///tmp/ PATTERN = '.*[.]csv[.]gz';
```

**GET Command Restrictions:**
- SnowSQL only (not available in Snowsight)
- Internal stages only (not external)
- Files are automatically decrypted during download

---

## 7. Privileges for Internal Stages

### Named Stage Privileges

| Privilege | Description |
|-----------|-------------|
| **USAGE** | Basic access to stage metadata |
| **READ** | Read files from stage (required for COPY INTO) |
| **WRITE** | Write files to stage (required for PUT and unload COPY INTO) |
| **OWNERSHIP** | Full control including DROP |

### Granting Stage Privileges

```sql
-- Grant read access
GRANT READ ON STAGE my_stage TO ROLE analyst_role;

-- Grant read and write access
GRANT READ, WRITE ON STAGE my_stage TO ROLE etl_role;

-- Grant all privileges
GRANT ALL PRIVILEGES ON STAGE my_stage TO ROLE admin_role;

-- Grant usage on future stages in schema
GRANT USAGE ON FUTURE STAGES IN SCHEMA my_schema TO ROLE data_role;
```

### Access Control Summary

| Stage Type | Access Controlled By |
|------------|---------------------|
| User Stage | Only owning user (no grants) |
| Table Stage | Table OWNERSHIP privilege |
| Named Stage | Explicit privilege grants |

---

## 8. Best Practices for Internal Stages

### File Organization

```
@my_stage/
  |-- year=2024/
  |    |-- month=01/
  |    |    |-- day=15/
  |    |    |    |-- data_001.csv.gz
  |    |    |    |-- data_002.csv.gz
  |    |-- month=02/
  |-- year=2023/
```

**Benefits:**
- Selective loading with path patterns
- Parallel COPY operations on different paths
- Easy data lifecycle management

### File Size Guidelines

| Scenario | Recommended Size |
|----------|-----------------|
| Bulk Loading | 100-250 MB compressed |
| Snowpipe | 100-250 MB compressed |
| Maximum per file | < 5 GB (recommended) |

### Cleanup Practices

```sql
-- Remove files after successful load
COPY INTO my_table FROM @my_stage;
REMOVE @my_stage PATTERN = '.*[.]csv[.]gz';

-- Use PURGE option in COPY to auto-delete
COPY INTO my_table FROM @my_stage PURGE = TRUE;
```

---

## 9. Exam Tips and Common Question Patterns

### Key Facts to Memorize

1. **Stage Reference Syntax:**
   - User stage: `@~`
   - Table stage: `@%table_name`
   - Named stage: `@stage_name`

2. **PUT Command:**
   - PUT SQL command requires SnowSQL (NOT Snowsight worksheets)
   - Alternative upload methods: Snowsight UI, Snowflake Python API, Snowpark, Snowflake CLI
   - Internal stages only (NOT external)
   - AUTO_COMPRESS = TRUE by default
   - PARALLEL = 4 by default

3. **Stage Limitations:**
   - User/Table stages CANNOT be altered or dropped
   - Table stages do NOT support transformations
   - Only named stages support directory tables

4. **Encryption:**
   - SNOWFLAKE_FULL = client + server encryption (default)
   - SNOWFLAKE_SSE = server-side only (for file URLs)
   - All internal stage data encrypted at rest with AES-256

5. **File Behavior:**
   - Uncompressed files auto-compressed with GZIP
   - Files decrypted automatically on GET download

### Common Exam Question Patterns

**Pattern 1: Stage Type Selection**
> "A team needs to load files into multiple tables with access controlled by roles. Which stage type is BEST?"

Answer: Named internal stage (supports multi-table loads and role-based access)

**Pattern 2: PUT Command Restrictions**
> "Why does a PUT command fail when executed in a Snowsight worksheet?"

Answer: PUT can only be executed from SnowSQL, not Snowsight

**Pattern 3: Table Stage Limitations**
> "Why does this query fail: COPY INTO t FROM (SELECT $1, UPPER($2) FROM @%t)?"

Answer: Table stages do not support transformations during COPY

**Pattern 4: Encryption Selection**
> "Which encryption type should be used for a stage that needs to support file URL access?"

Answer: SNOWFLAKE_SSE (server-side encryption)

**Pattern 5: Stage Reference**
> "What notation references the table stage for a table called 'orders'?"

Answer: `@%orders`

### Tricky Exam Distinctions

| Question | User Stage | Table Stage | Named Stage |
|----------|------------|-------------|-------------|
| Can be altered? | No | No | Yes |
| Supports transformations? | Yes | **No** | Yes |
| Supports directory tables? | No | No | Yes |
| Grantable privileges? | No | No | Yes |
| Auto-created? | Yes | Yes | **No** |

---

## 10. Practice Questions

### Question 1
Which internal stage type is automatically allocated for each Snowflake user account?

A) Table stage
B) User stage
C) Named internal stage
D) Shared stage

<details>
<summary>Show Answer</summary>

**Answer: B) User stage**

User stages are automatically allocated when a user is created. They are referenced with @~ notation and provide personal staging space.

</details>

### Question 2
A data engineer attempts to execute `PUT file:///data/file.csv @my_stage;` from a Snowsight SQL worksheet. What happens?

A) The file uploads successfully
B) The command fails - PUT requires SnowSQL
C) The command prompts for file selection in the browser
D) The file uploads but without compression

<details>
<summary>Show Answer</summary>

**Answer: B) The command fails - PUT requires SnowSQL**

The PUT command can only be executed from the SnowSQL command-line client, not from Snowsight worksheets or other interfaces.

</details>

### Question 3
Which of the following statements about table stages is FALSE?

A) Table stages are referenced using @%table_name notation
B) Table stages can be dropped when the table is dropped
C) Table stages support data transformations during COPY INTO
D) Table stages are automatically created with each table

<details>
<summary>Show Answer</summary>

**Answer: C) Table stages support data transformations during COPY INTO**

This statement is FALSE. Table stages do NOT support transformations (SELECT queries) during COPY INTO operations. Use named stages for transformation requirements.

</details>

### Question 4
What is the correct notation to reference a table stage for a table named `sales_data`?

A) `@sales_data`
B) `@~sales_data`
C) `@%sales_data`
D) `@#sales_data`

<details>
<summary>Show Answer</summary>

**Answer: C) @%sales_data**

Table stages use the @% prefix followed by the table name. The % symbol indicates a table stage.

</details>

### Question 5
Which encryption type should be specified when creating an internal stage that needs to support scoped URLs for unstructured data access?

A) SNOWFLAKE_FULL
B) SNOWFLAKE_SSE
C) AES_256
D) CLIENT_SIDE

<details>
<summary>Show Answer</summary>

**Answer: B) SNOWFLAKE_SSE**

SNOWFLAKE_SSE (server-side encryption) is required for stages that need to support file URL access, including scoped URLs and presigned URLs for unstructured data.

</details>

### Question 6
What is the default value for the AUTO_COMPRESS parameter in the PUT command?

A) FALSE
B) TRUE
C) GZIP
D) AUTO_DETECT

<details>
<summary>Show Answer</summary>

**Answer: B) TRUE**

By default, AUTO_COMPRESS is TRUE, which means uncompressed files are automatically compressed with GZIP when uploaded via PUT.

</details>

### Question 7
Which privilege must be granted on a named internal stage to allow a role to execute COPY INTO statements that read from the stage?

A) USAGE
B) READ
C) WRITE
D) SELECT

<details>
<summary>Show Answer</summary>

**Answer: B) READ**

The READ privilege is required to read files from a named stage, which is necessary for COPY INTO table operations that load data from the stage.

</details>

### Question 8
A user creates an internal stage with the following command:
`CREATE STAGE my_stage ENCRYPTION = (TYPE = 'SNOWFLAKE_FULL');`

Later, they want to change the encryption to SNOWFLAKE_SSE. What is the result?

A) ALTER STAGE command successfully changes the encryption
B) The stage must be dropped and recreated
C) Encryption automatically changes when files are uploaded
D) Both encryption types can be used simultaneously

<details>
<summary>Show Answer</summary>

**Answer: B) The stage must be dropped and recreated**

Encryption type cannot be changed after a stage is created. To change encryption settings, you must drop the stage (which deletes all files) and create a new stage with the desired encryption.

</details>

---

## 11. Summary

Internal stages provide Snowflake-managed storage for staging data files before loading into tables:

- **User Stages (@~)**: Personal, automatic, single-user access
- **Table Stages (@%)**: Automatic, single-table loading, no transformations
- **Named Stages (@name)**: Maximum flexibility, role-based access, supports all features

Key points for the exam:
- PUT SQL command works only with internal stages and requires SnowSQL (alternative upload methods exist: Snowsight UI, Python API, Snowpark, CLI)
- Table stages do NOT support transformations during COPY
- SNOWFLAKE_SSE encryption required for file URL access
- Only named stages support directory tables and can be altered/dropped
- All internal stage data is encrypted at rest automatically

Understanding the capabilities and limitations of each internal stage type is essential for both the SnowPro Core exam and effective Snowflake administration.
