# Domain 4: Data Loading & Unloading
## Part 12: Error Handling During Loading

**Exam Weight:** This topic is part of Domain 4 (10-15% of exam)

---

## Overview

Understanding how to handle errors during data loading is critical for building robust data pipelines in Snowflake. This section covers the ON_ERROR copy option, VALIDATION_MODE, COPY_HISTORY view, and troubleshooting techniques for both bulk loading (COPY INTO) and continuous loading (Snowpipe).

---

## Section 1: ON_ERROR Copy Option

### What is ON_ERROR?

The ON_ERROR parameter controls how Snowflake handles errors encountered during data loading. It determines whether to abort the entire operation, skip problematic files or rows, or continue loading valid data.

### ON_ERROR Options Table

| Option | Behavior | Use Case |
|--------|----------|----------|
| **ABORT_STATEMENT** | Aborts the entire load operation upon first error | Production loads requiring data integrity |
| **CONTINUE** | Loads valid rows, skips rows with errors | Large files where some data loss is acceptable |
| **SKIP_FILE** | Skips files containing errors | Multiple files where some may have issues |
| **SKIP_FILE_<num>** | Skips file if error count exceeds threshold | Balance between tolerance and quality |
| **SKIP_FILE_<num>%** | Skips file if error percentage exceeds threshold | Percentage-based error tolerance |

### Default ON_ERROR Values

| Load Type | Default Value |
|-----------|---------------|
| **COPY INTO (Bulk)** | ABORT_STATEMENT |
| **Snowpipe** | SKIP_FILE |

### ON_ERROR Option Details

#### ABORT_STATEMENT (Default for Bulk Loading)
```sql
COPY INTO my_table
FROM @my_stage/data.csv
ON_ERROR = ABORT_STATEMENT;
```
- Stops loading immediately when first error is encountered
- No data is loaded into the table
- Best for critical data loads where quality is paramount
- Returns error message with details about the failure

#### CONTINUE
```sql
COPY INTO my_table
FROM @my_stage/data.csv
ON_ERROR = CONTINUE;
```
- Continues loading valid rows even when errors occur
- Error rows are skipped and not loaded
- Load completes with partial success
- Use VALIDATE function afterward to review errors

#### SKIP_FILE (Default for Snowpipe)
```sql
COPY INTO my_table
FROM @my_stage/
ON_ERROR = SKIP_FILE;
```
- Skips entire files that contain any errors
- Other error-free files in the same load operation proceed
- Files with errors are not loaded at all

#### SKIP_FILE_<num>
```sql
COPY INTO my_table
FROM @my_stage/
ON_ERROR = SKIP_FILE_5;
```
- Skips file only if error count exceeds the specified number
- If errors <= threshold, file is skipped with partial load (like CONTINUE)
- Useful for tolerating minor issues while rejecting severely corrupted files

#### SKIP_FILE_<num>%
```sql
COPY INTO my_table
FROM @my_stage/
ON_ERROR = 'SKIP_FILE_10%';
```
- Skips file only if error percentage exceeds threshold
- Calculated as: (error_rows / total_rows) * 100
- Better for files of varying sizes

---

## Section 2: VALIDATION_MODE Copy Option

### What is VALIDATION_MODE?

VALIDATION_MODE validates data files without actually loading them. This is useful for:
- Pre-validating data before production loads
- Identifying all errors in problematic files
- Testing file format configurations

### VALIDATION_MODE Options

| Option | Description | Returns |
|--------|-------------|---------|
| **RETURN_ERRORS** | Returns all errors in the first file with errors | Error rows from one file |
| **RETURN_ALL_ERRORS** | Returns all errors across all files | All error rows |
| **RETURN_n_ROWS** | Validates and returns first n rows | n rows for verification |

**Important:** No data is loaded when VALIDATION_MODE is specified.

### Using VALIDATION_MODE

#### Return All Errors
```sql
COPY INTO my_table
FROM @my_stage/myfile.csv.gz
VALIDATION_MODE = RETURN_ALL_ERRORS;

-- Store the query ID for later use
SET qid = last_query_id();

-- Query the validation results
SELECT rejected_record FROM TABLE(RESULT_SCAN($qid));
```

#### Validate Specific Number of Rows
```sql
COPY INTO my_table
FROM @my_stage/myfile.csv.gz
VALIDATION_MODE = RETURN_10_ROWS;
```
- Returns the first 10 rows that would be loaded
- Useful for verifying file format and transformations

### VALIDATION_MODE vs VALIDATE Function

| Feature | VALIDATION_MODE | VALIDATE Function |
|---------|-----------------|-------------------|
| When Used | Before loading | After failed load |
| Data Loaded | No | Partial (if CONTINUE) |
| Scope | Files in COPY statement | Results from previous COPY |
| Error Details | Validates parsing | Returns parse errors |

### VALIDATE Table Function

The VALIDATE function retrieves errors from a previous COPY INTO operation:

```sql
-- After a COPY operation
COPY INTO my_table FROM @my_stage ON_ERROR = CONTINUE;
SET job_id = last_query_id();

-- Retrieve errors from the load
SELECT * FROM TABLE(VALIDATE(my_table, JOB_ID => $job_id));
```

**Columns Returned by VALIDATE:**
- ERROR: Error message describing the issue
- FILE: File name where error occurred
- LINE: Line number in the file
- CHARACTER: Character position of error
- BYTE_OFFSET: Byte position in file
- CATEGORY: Error category
- CODE: Numeric error code
- SQL_STATE: SQL state code
- COLUMN_NAME: Column with the error
- ROW_NUMBER: Row number in file
- ROW_START_LINE: Starting line of the row
- REJECTED_RECORD: The problematic record data

---

## Section 3: COPY_HISTORY View and Functions

### COPY_HISTORY Table Function

Returns data loading history for a specific table within the last 14 days.

```sql
SELECT *
FROM TABLE(INFORMATION_SCHEMA.COPY_HISTORY(
    TABLE_NAME => 'MY_TABLE',
    START_TIME => DATEADD(hours, -24, CURRENT_TIMESTAMP())
));
```

### COPY_HISTORY View (Account Usage)

Returns data loading history for all tables within the last 365 days.

```sql
SELECT *
FROM SNOWFLAKE.ACCOUNT_USAGE.COPY_HISTORY
WHERE TABLE_NAME = 'MY_TABLE'
  AND LAST_LOAD_TIME >= DATEADD(days, -7, CURRENT_TIMESTAMP());
```

### Key COPY_HISTORY Columns

| Column | Description | Exam Relevance |
|--------|-------------|----------------|
| FILE_NAME | Name of the file loaded | Identify problematic files |
| STAGE_LOCATION | Stage where file resides | Debugging path issues |
| STATUS | Load status (Loaded/Partially Loaded/Load Failed) | Monitor load success |
| ROW_COUNT | Number of rows loaded | Verify completeness |
| ROW_PARSED | Number of rows parsed | Compare with ROW_COUNT |
| FIRST_ERROR_MESSAGE | First error encountered | Troubleshooting |
| FIRST_ERROR_LINE_NUM | Line number of first error | Locate issues |
| FIRST_ERROR_CHARACTER_POS | Character position of first error | Pinpoint problems |
| FIRST_ERROR_COLUMN_NAME | Column where first error occurred | Schema issues |
| ERROR_COUNT | Total number of errors | Assess data quality |
| ERROR_LIMIT | ON_ERROR threshold used | Understand behavior |
| LOAD_TIME | When data was loaded | Audit trail |
| PIPE_NAME | Pipe used (if Snowpipe) | Identify load method |

### STATUS Values in COPY_HISTORY

| Status | Meaning |
|--------|---------|
| **Loaded** | File loaded successfully with no errors |
| **Load in progress** | File currently being loaded |
| **Partially Loaded** | Some rows loaded, some had errors (ON_ERROR = CONTINUE) |
| **Load Failed** | File failed to load (errors exceeded threshold or ABORT_STATEMENT) |

### Latency Considerations

| View/Function | Latency | History Retention |
|---------------|---------|-------------------|
| COPY_HISTORY table function | Very low (near real-time) | 14 days |
| COPY_HISTORY Account Usage view | Up to 2 hours | 365 days |

---

## Section 4: Snowpipe Error Handling

### Snowpipe Error Notifications

Snowpipe can push error notifications to cloud messaging services when loading errors occur.

**Important Note:** Snowpipe error notifications only work when ON_ERROR = SKIP_FILE (the default). No notifications are sent when ON_ERROR = CONTINUE.

### Configuring Error Notifications by Cloud Platform

| Cloud | Notification Service | Configuration |
|-------|---------------------|---------------|
| AWS | Amazon SNS | SNS Topic ARN |
| Azure | Azure Event Grid | Event Grid Topic |
| GCP | Google Pub/Sub | Pub/Sub Topic |

### Error Notification Content

Error notifications include:
- Pipe name
- File name causing the error
- Error message details
- Line number and character position
- Table and stage information

### SYSTEM$PIPE_STATUS Function

Retrieves the current status of a pipe:

```sql
SELECT SYSTEM$PIPE_STATUS('my_database.my_schema.my_pipe');
```

**Key JSON Properties Returned:**

| Property | Description |
|----------|-------------|
| executionState | Current state (RUNNING, PAUSED, STOPPED_CLONING, etc.) |
| pendingFileCount | Number of files waiting to be processed |
| notificationChannelName | Associated notification channel |
| error | Error details if pipe has issues |

### Troubleshooting Snowpipe Loads

1. **Check pipe status:**
```sql
SELECT SYSTEM$PIPE_STATUS('my_pipe');
```

2. **View copy history:**
```sql
SELECT * FROM TABLE(INFORMATION_SCHEMA.COPY_HISTORY(
    TABLE_NAME => 'target_table',
    START_TIME => DATEADD(hours, -1, CURRENT_TIMESTAMP())
));
```

3. **Check for execution errors:**
```sql
SELECT FIRST_ERROR_MESSAGE, ERROR_COUNT, FILE_NAME
FROM TABLE(INFORMATION_SCHEMA.COPY_HISTORY(...))
WHERE STATUS != 'Loaded';
```

---

## Section 5: Common Data Loading Errors

### Data Type Errors

| Error Type | Cause | Solution |
|------------|-------|----------|
| Numeric conversion | Non-numeric data in numeric column | Cast or clean source data |
| Date/timestamp parsing | Invalid date format | Specify correct DATE_FORMAT |
| Boolean conversion | Invalid boolean representation | Use TRUE_VALUES/FALSE_VALUES options |
| Overflow | Value exceeds column precision | Increase column size or truncate |

### Format and Structure Errors

| Error Type | Cause | Solution |
|------------|-------|----------|
| Column count mismatch | File has different columns than table | Use ERROR_ON_COLUMN_COUNT_MISMATCH = FALSE |
| Field delimiter issues | Wrong delimiter specified | Match FIELD_DELIMITER to data |
| Record delimiter issues | Wrong line ending | Set RECORD_DELIMITER correctly |
| Encoding problems | Character encoding mismatch | Specify correct ENCODING |

### File Format Copy Options for Error Prevention

| Option | Purpose | Example |
|--------|---------|---------|
| SKIP_HEADER | Skip header rows | SKIP_HEADER = 1 |
| FIELD_OPTIONALLY_ENCLOSED_BY | Handle quoted fields | FIELD_OPTIONALLY_ENCLOSED_BY = '"' |
| NULL_IF | Define NULL representations | NULL_IF = ('NULL', 'null', '') |
| EMPTY_FIELD_AS_NULL | Treat empty fields as NULL | EMPTY_FIELD_AS_NULL = TRUE |
| TRUNCATECOLUMNS | Truncate oversized strings | TRUNCATECOLUMNS = TRUE |
| ERROR_ON_COLUMN_COUNT_MISMATCH | Allow column count differences | FALSE for flexible loading |

### Character Data Errors

| Error Type | Cause | Solution |
|------------|-------|----------|
| String too long | Data exceeds VARCHAR limit | Use TRUNCATECOLUMNS = TRUE |
| Invalid UTF-8 | Bad character encoding | Specify source ENCODING |
| Escape character issues | Unescaped special characters | Set ESCAPE_UNENCLOSED_FIELD |

---

## Section 6: Troubleshooting Workflow

### Step 1: Check COPY_HISTORY

```sql
-- Get recent load history
SELECT FILE_NAME, STATUS, FIRST_ERROR_MESSAGE,
       ERROR_COUNT, ROW_COUNT, ROW_PARSED
FROM TABLE(INFORMATION_SCHEMA.COPY_HISTORY(
    TABLE_NAME => 'my_table',
    START_TIME => DATEADD(hours, -24, CURRENT_TIMESTAMP())
))
ORDER BY LOAD_TIME DESC;
```

### Step 2: Validate Problematic Files

```sql
-- Dry run to see all errors
COPY INTO my_table
FROM @my_stage/problem_file.csv
VALIDATION_MODE = RETURN_ALL_ERRORS;
```

### Step 3: Review Rejected Records

```sql
-- Store query ID from validation
SET validation_query = last_query_id();

-- View rejected records
SELECT rejected_record
FROM TABLE(RESULT_SCAN($validation_query));
```

### Step 4: Fix and Reload

Options:
1. **Fix source data** - Correct errors in original files
2. **Adjust copy options** - Use TRUNCATECOLUMNS, NULL_IF, etc.
3. **Transform during load** - Use SELECT with COPY for data transformation
4. **Use ON_ERROR = CONTINUE** - Load valid rows, handle errors separately

### Decision Tree for ON_ERROR Selection

```
Need all data loaded correctly?
├─ Yes → Use ABORT_STATEMENT (default)
│        Re-run after fixing errors
│
└─ No → Can tolerate some missing rows?
         ├─ Yes → Use CONTINUE
         │        Review errors post-load
         │
         └─ No, but multiple files?
              ├─ Yes → Use SKIP_FILE or SKIP_FILE_<num>
              └─ No → Use ABORT_STATEMENT
```

---

## Section 7: Best Practices

### Pre-Load Validation

1. **Test with VALIDATION_MODE first:**
```sql
COPY INTO staging_table
FROM @stage/sample.csv
VALIDATION_MODE = RETURN_10_ROWS;
```

2. **Verify column mapping:**
```sql
SELECT $1, $2, $3 FROM @stage/sample.csv LIMIT 10;
```

3. **Check file format:**
```sql
SELECT * FROM @stage (FILE_FORMAT => 'my_format') LIMIT 10;
```

### Production Loading Best Practices

| Practice | Benefit |
|----------|---------|
| Use explicit file formats | Consistent parsing |
| Set appropriate ON_ERROR | Balance quality and completeness |
| Monitor COPY_HISTORY | Catch issues early |
| Configure error notifications | Proactive alerting |
| Use staging tables | Isolate errors from production |
| Implement retry logic | Handle transient failures |

### Error Recovery Strategy

1. **Load to staging table with ON_ERROR = CONTINUE**
2. **Review errors using VALIDATE function**
3. **Fix source data or apply transformations**
4. **Reload corrected records**
5. **Merge from staging to production**

---

## Section 8: Exam Tips and Common Question Patterns

### Key Facts to Memorize

1. **Default ON_ERROR values:**
   - COPY INTO (bulk): ABORT_STATEMENT
   - Snowpipe: SKIP_FILE

2. **VALIDATION_MODE does NOT load data** - it only validates

3. **COPY_HISTORY retention:**
   - Table function: 14 days
   - Account Usage view: 365 days

4. **Snowpipe error notifications require ON_ERROR = SKIP_FILE**

5. **FIRST_ERROR_MESSAGE shows only the first error** - use VALIDATION_MODE for all errors

### Common Exam Question Types

**Scenario Questions:**
- "What ON_ERROR option should be used when loading multiple files and some may have errors?"
  - Answer: SKIP_FILE or SKIP_FILE_<num>

- "How can you see all errors without loading data?"
  - Answer: VALIDATION_MODE = RETURN_ALL_ERRORS

- "What view provides 365 days of loading history?"
  - Answer: SNOWFLAKE.ACCOUNT_USAGE.COPY_HISTORY

**Troubleshooting Questions:**
- "A file partially loaded. How do you find what rows failed?"
  - Answer: Use VALIDATE function with the job_id

- "Snowpipe is not sending error notifications. What could be wrong?"
  - Answer: ON_ERROR might be set to CONTINUE instead of SKIP_FILE

### Remember These Distinctions

| If You Need To... | Use... |
|-------------------|--------|
| Stop on first error | ABORT_STATEMENT |
| Load valid rows, skip bad ones | CONTINUE |
| Skip files with any errors | SKIP_FILE |
| Preview data before loading | VALIDATION_MODE = RETURN_n_ROWS |
| Find all errors without loading | VALIDATION_MODE = RETURN_ALL_ERRORS |
| View errors after a load | VALIDATE function |
| Check recent load history | COPY_HISTORY table function |
| Check historical load data | Account Usage COPY_HISTORY view |
| Check Snowpipe status | SYSTEM$PIPE_STATUS |

---

## Practice Questions

**Question 1:** You need to load data from multiple files. If a file has more than 5 errors, it should be skipped entirely. Which ON_ERROR option should you use?

A) ABORT_STATEMENT
B) CONTINUE
C) SKIP_FILE
D) SKIP_FILE_5

<details>
<summary>Show Answer</summary>

**Answer:** D) SKIP_FILE_5
</details>

---

**Question 2:** What is the default retention period for the COPY_HISTORY Account Usage view?

A) 7 days
B) 14 days
C) 90 days
D) 365 days

<details>
<summary>Show Answer</summary>

**Answer:** D) 365 days
</details>

---

**Question 3:** A COPY INTO statement with ON_ERROR = CONTINUE completed. How can you retrieve information about the rows that failed to load?

A) Query COPY_HISTORY
B) Use VALIDATE function
C) Check QUERY_HISTORY
D) Use VALIDATION_MODE

<details>
<summary>Show Answer</summary>

**Answer:** B) Use VALIDATE function
</details>

---

**Question 4:** You want to validate a data file and see all potential errors without actually loading any data. Which option should you use?

A) ON_ERROR = CONTINUE
B) ON_ERROR = SKIP_FILE
C) VALIDATION_MODE = RETURN_ALL_ERRORS
D) VALIDATE function

<details>
<summary>Show Answer</summary>

**Answer:** C) VALIDATION_MODE = RETURN_ALL_ERRORS
</details>

---

**Question 5:** What is the default ON_ERROR setting for Snowpipe?

A) ABORT_STATEMENT
B) CONTINUE
C) SKIP_FILE
D) SKIP_FILE_10%

<details>
<summary>Show Answer</summary>

**Answer:** C) SKIP_FILE
</details>

---

## Summary

Error handling during data loading is a critical skill for Snowflake practitioners:

1. **ON_ERROR** controls behavior when errors occur - choose based on your data quality requirements
2. **VALIDATION_MODE** lets you dry-run loads to identify issues before committing
3. **COPY_HISTORY** provides audit trail and troubleshooting information
4. **VALIDATE function** retrieves detailed error information after loads
5. **Snowpipe error notifications** enable proactive monitoring for continuous loads

Master these concepts to ensure reliable, robust data pipelines and to answer exam questions confidently.
