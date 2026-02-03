# Domain 6: Data Protection & Sharing - Data Governance Overview

## Overview

Snowflake provides a comprehensive data governance framework that helps organizations discover, classify, protect, and monitor their sensitive data. This governance suite includes features for object tagging, tag-based policies, access history tracking, data lineage, sensitive data classification, and data quality monitoring. Together, these capabilities enable organizations to maintain regulatory compliance while empowering data-driven decision making.

---

## Lesson 1: Introduction to Snowflake Data Governance

### Learning Objectives
- Understand the components of Snowflake's data governance framework
- Learn the Enterprise Edition requirements for governance features
- Recognize how governance features work together
- Understand the role of the Trust Center in governance

### Key Concepts

**What is Data Governance?**

Data governance in Snowflake refers to a comprehensive set of capabilities that help organizations:
- **Discover** sensitive data across their data estate
- **Classify** data based on sensitivity and semantic meaning
- **Protect** data through masking policies and row access policies
- **Monitor** data access and usage patterns
- **Track** data lineage and dependencies
- **Measure** data quality

**Governance Feature Categories:**

| Category | Features | Primary Purpose |
|----------|----------|-----------------|
| Discovery & Classification | Sensitive Data Classification, System Tags | Find and categorize sensitive data |
| Data Protection | Masking Policies, Row Access Policies, Tag-based Policies | Control access to sensitive data |
| Monitoring & Auditing | Access History, Query History | Track who accessed what data and when |
| Lineage & Dependencies | Data Lineage, Object Dependencies | Understand data flow and impact |
| Quality Assurance | Data Metric Functions (DMFs) | Ensure data accuracy and freshness |
| Organization | Object Tags | Categorize and organize data assets |

**Governance User Interface: Trust Center**

Snowsight provides a centralized Trust Center for managing governance:
- **Location**: Data > Trust Center
- **Features**:
  - Set up sensitive data classification
  - View data governance posture
  - Monitor classification coverage
  - Review unprotected sensitive data
  - Access policy management dashboards

**The Governance Workflow:**

```
1. DISCOVER    -->  2. CLASSIFY    -->  3. PROTECT    -->  4. MONITOR
   (Find data)      (Categorize)       (Apply policies)   (Track access)
       |                 |                   |                  |
       v                 v                   v                  v
   Classification    System Tags        Masking/RAP       Access History
   Profiles          Custom Tags       Tag-based Policies  Data Lineage
```

### Edition Requirements

**Enterprise Edition or Higher Required:**

| Feature | Edition Required |
|---------|------------------|
| Sensitive Data Classification | Enterprise |
| Access History | Enterprise |
| Data Lineage | Enterprise |
| Tag-based Masking Policies | Enterprise |
| Tag Propagation | Enterprise |
| Data Metric Functions (DMFs) | Enterprise |
| Row Access Policies | All Editions |
| Dynamic Data Masking | All Editions |
| Object Tags (basic) | All Editions |

### Important Terms/Definitions

- **Data Governance**: The overall framework for managing data availability, usability, integrity, and security
- **Trust Center**: Snowsight interface for managing data governance and security
- **Classification Profile**: Configuration that defines how sensitive data is discovered and tagged
- **Semantic Category**: Type of personal attribute (NAME, EMAIL, SSN, etc.)
- **Privacy Category**: Sensitivity level (IDENTIFIER, QUASI_IDENTIFIER, SENSITIVE)
- **Tag-based Policy**: A masking or row access policy assigned to a tag rather than directly to columns
- **Data Lineage**: The path data takes from source to destination, including transformations
- **Access History**: Record of when and how data was accessed

### Exam Tips

- Enterprise Edition is required for most governance features
- Basic tagging and masking policies are available in all editions
- The Trust Center in Snowsight is the central governance dashboard
- Governance features work together (classification -> tagging -> masking)
- Access History requires Enterprise Edition

### Practice Questions

1. **Question**: Which Snowflake feature requires Enterprise Edition or higher?
   - A) Dynamic Data Masking
   - B) Row Access Policies
   - C) Access History
   - D) Object Tags

   <details>
   <summary>Show Answer</summary>

   **Answer**: C - Access History requires Enterprise Edition or higher. Dynamic Data Masking, Row Access Policies, and basic Object Tags are available in all editions.

   </details>

2. **Question**: Which component provides a centralized view of data governance in Snowsight?
   - A) Query History
   - B) Trust Center
   - C) Account Admin
   - D) Governance Dashboard

   <details>
   <summary>Show Answer</summary>

   **Answer**: B - The Trust Center in Snowsight provides a centralized view for managing data governance, including classification setup and governance posture monitoring.

   </details>

3. **Question**: What is the correct order of the data governance workflow?
   - A) Protect -> Classify -> Discover -> Monitor
   - B) Classify -> Discover -> Monitor -> Protect
   - C) Discover -> Classify -> Protect -> Monitor
   - D) Monitor -> Discover -> Classify -> Protect

   <details>
   <summary>Show Answer</summary>

   **Answer**: C - The governance workflow is: Discover (find sensitive data) -> Classify (categorize it) -> Protect (apply policies) -> Monitor (track access).

   </details>

---

## Lesson 2: Access History

### Learning Objectives
- Understand what Access History tracks
- Learn to query the ACCESS_HISTORY view
- Know the benefits for governance and compliance
- Understand column-level lineage in access history

### Key Concepts

**What is Access History?**

Access History tracks when users query data (reads) and when SQL statements perform data writes. This information is stored in the ACCESS_HISTORY view in the ACCOUNT_USAGE and ORGANIZATION_USAGE schemas.

**Enterprise Edition Feature**: Access History requires Enterprise Edition or higher.

**What Access History Records:**

| Information Type | Description |
|-----------------|-------------|
| Query User | Who executed the query |
| Query Time | When the query was executed |
| Direct Objects Accessed | Tables/views directly referenced in query |
| Base Objects Accessed | Underlying tables for views |
| Objects Modified | Tables written to or modified |
| Column Lineage | Source-to-target column mapping for writes |
| Policies Referenced | Masking/row access policies that were applied |

**ACCESS_HISTORY View Columns:**

| Column | Description |
|--------|-------------|
| query_id | Unique identifier for the query |
| query_start_time | When the query started |
| user_name | User who executed the query |
| direct_objects_accessed | Array of objects directly in the query |
| base_objects_accessed | Array of underlying objects (for views) |
| objects_modified | Array of objects written to |
| object_modified_by_ddl | Object changed by DDL statement |
| policies_referenced | Masking/row access policies evaluated |

**Read Operations Tracking:**

```sql
-- Example query
SELECT email, phone FROM customers WHERE region = 'US';

-- ACCESS_HISTORY records:
-- direct_objects_accessed: [customers table]
-- columns: [email, phone, region]
```

**Write Operations Tracking:**

```sql
-- Example CTAS
CREATE TABLE customer_backup AS SELECT * FROM customers;

-- ACCESS_HISTORY records:
-- direct_objects_accessed: [customers]
-- objects_modified: [customer_backup]
-- Column lineage shows mapping from source to target
```

**Column Lineage in ACCESS_HISTORY:**

The `objects_modified` column includes column lineage information showing how data flows from source columns to target columns:

```json
{
  "objectName": "DB1.SCHEMA1.TARGET_TABLE",
  "columns": [
    {
      "columnName": "EMAIL",
      "directSourceColumns": [
        {"columnName": "EMAIL", "objectName": "DB1.SCHEMA1.SOURCE_TABLE"}
      ]
    }
  ]
}
```

**Querying Access History:**

```sql
-- Get access history for a specific user
SELECT query_id, query_start_time, user_name, direct_objects_accessed
FROM snowflake.account_usage.access_history
WHERE user_name = 'ANALYST_USER'
ORDER BY query_start_time DESC
LIMIT 100;

-- Find all queries that accessed a specific table
SELECT query_id, user_name, query_start_time
FROM snowflake.account_usage.access_history,
     LATERAL FLATTEN(input => direct_objects_accessed) f
WHERE f.value:objectName = 'MY_DB.MY_SCHEMA.SENSITIVE_TABLE'
  AND query_start_time > DATEADD('day', -7, CURRENT_TIMESTAMP());

-- Track column-level access
SELECT query_id,
       f.value:objectName::STRING as table_name,
       c.value:columnName::STRING as column_name
FROM snowflake.account_usage.access_history,
     LATERAL FLATTEN(input => direct_objects_accessed) f,
     LATERAL FLATTEN(input => f.value:columns) c
WHERE query_start_time > DATEADD('day', -1, CURRENT_TIMESTAMP());
```

**Policies Referenced Column:**

Access History tracks when masking or row access policies are evaluated:

```sql
-- Find queries where masking policies were applied
SELECT query_id, user_name, policies_referenced
FROM snowflake.account_usage.access_history
WHERE ARRAY_SIZE(policies_referenced) > 0
  AND query_start_time > DATEADD('day', -7, CURRENT_TIMESTAMP());
```

**Account vs Organization Level:**

| Scope | View Location | Cost |
|-------|---------------|------|
| Account | ACCOUNT_USAGE.ACCESS_HISTORY | No additional cost |
| Organization | ORGANIZATION_USAGE.ACCESS_HISTORY | Premium view (compute + storage costs) |

Organization-level access history provides:
- Cross-account visibility
- Additional columns for listing governance
- Unified view of all accounts in organization

### Benefits of Access History

1. **Regulatory Compliance**: Demonstrate who accessed what data and when
2. **Security Auditing**: Identify unauthorized access patterns
3. **Data Governance**: Unified picture of data access across the organization
4. **Impact Analysis**: Understand which users/queries access sensitive data
5. **Troubleshooting**: Debug data pipeline issues with lineage information

### Exam Tips

- ACCESS_HISTORY requires Enterprise Edition
- The view is in ACCOUNT_USAGE schema (up to 2-hour latency)
- Column lineage is tracked in objects_modified column
- policies_referenced shows which masking/RAP policies were evaluated
- Use FLATTEN to query nested arrays in access history
- ORGANIZATION_USAGE.ACCESS_HISTORY incurs additional costs

### Practice Questions

1. **Question**: What information does the ACCESS_HISTORY view track?
   - A) Only SELECT queries
   - B) Only INSERT/UPDATE/DELETE operations
   - C) Both read operations (queries) and write operations (DML)
   - D) Only failed queries

   <details>
   <summary>Show Answer</summary>

   **Answer**: C - ACCESS_HISTORY tracks both read operations (SELECT queries) and write operations (INSERT, UPDATE, DELETE, MERGE, CTAS, etc.).

   </details>

2. **Question**: Which column in ACCESS_HISTORY contains information about column-level data lineage?
   - A) direct_objects_accessed
   - B) base_objects_accessed
   - C) objects_modified
   - D) column_lineage

   <details>
   <summary>Show Answer</summary>

   **Answer**: C - The objects_modified column contains column lineage information showing how data flows from source columns to target columns during write operations.

   </details>

3. **Question**: What is the typical latency for data appearing in ACCOUNT_USAGE.ACCESS_HISTORY?
   - A) Real-time
   - B) Up to 2 hours
   - C) Up to 24 hours
   - D) Up to 7 days

   <details>
   <summary>Show Answer</summary>

   **Answer**: B - ACCOUNT_USAGE views, including ACCESS_HISTORY, have a latency of up to 2 hours.

   </details>

---

## Lesson 3: Data Lineage

### Learning Objectives
- Understand what data lineage tracks in Snowflake
- Differentiate between object lineage and column lineage
- Use Snowsight to visualize lineage
- Query lineage programmatically

### Key Concepts

**What is Data Lineage?**

Data lineage tracks where data comes from (upstream) and where it goes (downstream). It captures two types of relationships:

1. **Object Dependencies**: When one object depends on another (e.g., view depends on table)
2. **Data Movement**: When data flows from one object to another (e.g., CTAS, INSERT)

**Enterprise Edition Feature**: Data Lineage requires Enterprise Edition or higher.

**Upstream vs Downstream:**

| Direction | Definition | Example |
|-----------|------------|---------|
| Upstream | Source objects where data originated | Source table for a view |
| Downstream | Target objects where data flows to | View created from a table |

```
[Source Table] --> [View] --> [Materialized View] --> [Target Table]
   upstream         current        downstream           downstream
```

**Types of Lineage:**

1. **Object Lineage**: Tracks dependencies between objects
   - View depends on table
   - Dynamic table depends on source table
   - Stored procedure modifies table

2. **Column Lineage**: Tracks data flow between specific columns
   - SELECT col1 FROM table1 creates relationship
   - Shows column-level transformation path

**Viewing Lineage in Snowsight:**

1. Navigate to Data > Databases
2. Select a table or view
3. Click the **Lineage** tab
4. View upstream and downstream objects

**Lineage Tab Features:**
- Visual graph showing object relationships
- Click objects to see details
- View column-level lineage
- See stored procedures/tasks that created lineage
- Identify masking policies on columns
- Find and fix missing tags

**Programmatic Lineage Access:**

```sql
-- Use GET_LINEAGE function
SELECT *
FROM TABLE(SNOWFLAKE.CORE.GET_LINEAGE(
  'my_db.my_schema.my_table',
  'table',
  'downstream'  -- or 'upstream'
));

-- Returns: object_name, object_type, distance, etc.
```

**Column Lineage:**

To view column lineage in Snowsight:
1. Open the Lineage tab for an object
2. Select the object in the graph
3. Hover over a column name
4. Click "View Lineage"
5. Choose "Upstream Lineage" or "Downstream Lineage"

The **Distance** column indicates how many steps away a column is in the lineage graph.

**Lineage for Stored Procedures and Tasks:**

When a stored procedure or task creates lineage between objects:
- The relationship appears in the lineage graph
- Click the arrow connecting objects to see details
- View the stored procedure or task name
- Not available for lineage created before feature introduction

**Supported Operations for Data Lineage:**

| Operation | Creates Lineage |
|-----------|-----------------|
| CREATE VIEW ... AS SELECT | Yes |
| CREATE TABLE ... AS SELECT | Yes |
| INSERT INTO ... SELECT | Yes |
| MERGE INTO | Yes |
| CREATE DYNAMIC TABLE | Yes |
| UPDATE ... SET (subquery) | Yes |
| Stored Procedure writes | Yes |

**Supported Objects:**

- Tables (standard, external, dynamic, Iceberg)
- Views (standard, secure, materialized)
- Stages
- ML objects (models, datasets, feature views)

**External Lineage:**

Snowflake can track lineage for data sources outside of Snowflake:
- Integrates with tools like dbt and Apache Airflow
- Uses OpenLineage specification
- Requires INGEST LINEAGE privilege
- Shows external sources in lineage graph

**Access Control for Lineage:**

| Privilege | Purpose |
|-----------|---------|
| VIEW LINEAGE | View lineage for objects you have access to |
| RESOLVE ALL | View full lineage even without object privileges |
| Any object privilege | Required to see object details in lineage |
| REFERENCES | View lineage without data access |

```sql
-- Grant lineage viewing to a role
GRANT VIEW LINEAGE ON ACCOUNT TO ROLE analyst_role;

-- Allow seeing full lineage graph
GRANT RESOLVE ALL ON ACCOUNT TO ROLE lineage_admin;
```

**Lineage History and Retention:**

- Object dependency lineage: Available historically
- Data movement lineage: Available from November 2024 onward
- Retention period: One year for both column and object lineage

### Exam Tips

- Data Lineage requires Enterprise Edition
- VIEW LINEAGE privilege controls who can see lineage
- RESOLVE ALL allows viewing lineage without object access
- Column lineage retention is one year
- External lineage uses OpenLineage specification
- Temporary tables are not shown in lineage
- Deleted tables are not shown, but renamed tables are

### Practice Questions

1. **Question**: What does "upstream lineage" refer to in Snowflake?
   - A) Objects that receive data from the current object
   - B) Objects that are the source of data for the current object
   - C) Objects created after the current object
   - D) Objects in a higher-level schema

   <details>
   <summary>Show Answer</summary>

   **Answer**: B - Upstream lineage refers to source objects where data originated. Downstream lineage refers to target objects where data flows to.

   </details>

2. **Question**: Which privilege allows a user to view the full lineage graph even without privileges on individual objects?
   - A) VIEW LINEAGE
   - B) OWNERSHIP
   - C) RESOLVE ALL
   - D) LINEAGE ADMIN

   <details>
   <summary>Show Answer</summary>

   **Answer**: C - The RESOLVE ALL privilege on the account allows viewing the complete lineage graph even without privileges on the individual objects in the graph.

   </details>

3. **Question**: What is the retention period for column lineage in Snowflake?
   - A) 30 days
   - B) 90 days
   - C) 6 months
   - D) 1 year

   <details>
   <summary>Show Answer</summary>

   **Answer**: D - Both column lineage and object lineage are retained for one year.

   </details>

---

## Lesson 4: Object Tagging for Governance

### Learning Objectives
- Understand how tags enable data governance
- Learn to use tags for data discovery and protection
- Implement tag-based masking policies
- Query tag assignments for governance reporting

### Key Concepts

**Tags as Governance Foundation:**

Object tags are schema-level objects that store metadata as key-value pairs. They are foundational for governance because they enable:
- Data classification and categorization
- Automated policy enforcement
- Cost attribution
- Compliance tracking

**Tag Characteristics:**

| Property | Description |
|----------|-------------|
| Data Type | Always string (up to 256 characters) |
| Location | Schema-level object |
| Limit | 50 tags per object; 50 different tags across columns |
| Allowed Values | Up to 5,000 per tag |

**How Tags Enable Governance:**

1. **Classification**: Mark columns containing PII, financial data, etc.
2. **Protection**: Attach masking policies to tags
3. **Discovery**: Query TAG_REFERENCES to find sensitive data
4. **Compliance**: Track data categories for regulatory requirements

**Tag Inheritance:**

Tags flow down the object hierarchy:
```
Account
  └── Database (inherits account tags)
        └── Schema (inherits database tags)
              └── Table (inherits schema tags)
                    └── Column (inherits table tags)
```

**Tag Application Methods:**

| Method | Edition | Description |
|--------|---------|-------------|
| Manual | All | Explicitly set via CREATE/ALTER |
| Inherited | All | Automatic from parent objects |
| Propagated | Enterprise | Automatic to dependent objects |
| Classification | Enterprise | Automatic via sensitive data classification |

**Tag-Based Masking Policies:**

Combine tags with masking policies for scalable data protection:

```sql
-- Create governance tag
CREATE TAG governance.tags.pii;

-- Create masking policy
CREATE MASKING POLICY mask_pii AS (val STRING)
RETURNS STRING ->
  CASE WHEN IS_ROLE_IN_SESSION('HR_ADMIN') THEN val
       ELSE '***MASKED***'
  END;

-- Attach policy to tag
ALTER TAG governance.tags.pii SET MASKING POLICY mask_pii;

-- Set tag on database (protects all string columns)
ALTER DATABASE hr_db SET TAG governance.tags.pii = 'true';
```

**Key Points:**
- One masking policy per data type per tag
- Policy directly on column overrides tag-based policy
- New columns automatically protected when tag is on database/schema

**Querying Tags for Governance:**

```sql
-- Find all objects with a specific tag
SELECT * FROM SNOWFLAKE.ACCOUNT_USAGE.TAG_REFERENCES
WHERE tag_name = 'GOVERNANCE.TAGS.PII';

-- Find objects with tags including inherited
SELECT * FROM TABLE(
  SNOWFLAKE.ACCOUNT_USAGE.TAG_REFERENCES_WITH_LINEAGE('GOVERNANCE.TAGS.PII')
);

-- Check how tag was applied
SELECT tag_name, tag_value, apply_method, level
FROM TABLE(my_db.INFORMATION_SCHEMA.TAG_REFERENCES('my_table', 'TABLE'));
```

**apply_method Values:**
- `MANUAL` - Explicitly set by user
- `INHERITED` - Received from parent object
- `PROPAGATED` - Automatically propagated (Enterprise)
- `CLASSIFICATION` - Set by sensitive data classification (Enterprise)

### Exam Tips

- Tags are schema-level objects with string values only
- Maximum 50 tags per object
- Tag-based masking requires Enterprise Edition
- Use TAG_REFERENCES_WITH_LINEAGE to see inherited tags
- apply_method column shows how tag was associated

### Practice Questions

1. **Question**: What is the maximum number of different tags that can be set on the columns of a single table?
   - A) 10
   - B) 25
   - C) 50
   - D) Unlimited

   <details>
   <summary>Show Answer</summary>

   **Answer**: C - You can set a maximum of 50 different tags on the columns of a single table (combined limit for all columns).

   </details>

2. **Question**: Which apply_method value indicates a tag was set by sensitive data classification?
   - A) MANUAL
   - B) INHERITED
   - C) PROPAGATED
   - D) CLASSIFICATION

   <details>
   <summary>Show Answer</summary>

   **Answer**: D - CLASSIFICATION indicates the tag was automatically set by the sensitive data classification feature.

   </details>

3. **Question**: What happens when you set a tag with an attached masking policy on a database?
   - A) Only the database object is protected
   - B) Only existing tables are protected
   - C) All columns with matching data types are protected, including future ones
   - D) An error occurs

   <details>
   <summary>Show Answer</summary>

   **Answer**: C - Setting a tag-based masking policy on a database protects all columns with matching data types in all existing and future tables and views.

   </details>

---

## Lesson 5: Sensitive Data Classification

### Learning Objectives
- Understand automatic sensitive data classification
- Learn about system-defined tags for classification
- Configure classification profiles
- Integrate classification with tag-based protection

### Key Concepts

**What is Sensitive Data Classification?**

Sensitive data classification automatically discovers columns containing sensitive data and assigns system-defined tags. This enables organizations to:
- Find PII and sensitive data at scale
- Apply consistent categorization
- Automate protection workflows

**Enterprise Edition Feature**: Sensitive Data Classification requires Enterprise Edition.

**System-Defined Classification Tags:**

| Tag | Purpose | Example Values |
|-----|---------|----------------|
| SNOWFLAKE.CORE.SEMANTIC_CATEGORY | Type of data | NAME, EMAIL, PHONE_NUMBER, SSN |
| SNOWFLAKE.CORE.PRIVACY_CATEGORY | Sensitivity level | IDENTIFIER, QUASI_IDENTIFIER, SENSITIVE |

**Semantic Categories (What the data is):**

- NAME - Personal names
- EMAIL - Email addresses
- PHONE_NUMBER - Phone numbers
- NATIONAL_IDENTIFIER - SSN, passport numbers
- DATE_OF_BIRTH - Birth dates
- AGE - Age values
- GENDER - Gender information
- LATITUDE/LONGITUDE - Location coordinates
- IP_ADDRESS - IP addresses
- Custom categories you define

**Privacy Categories (How sensitive):**

| Category | Description | Examples |
|----------|-------------|----------|
| IDENTIFIER | Directly identifies individuals | SSN, email, phone |
| QUASI_IDENTIFIER | Identifies when combined with other data | ZIP code, birth date, gender |
| SENSITIVE | Sensitive but not identifying | Salary, health conditions |

**Setting Up Classification:**

**Via Trust Center (Recommended):**
1. Navigate to Data > Trust Center
2. Select "Set up classification"
3. Configure classification profile
4. Select databases to monitor

**Via SQL:**

```sql
-- Create classification profile
CREATE SNOWFLAKE.DATA_PRIVACY.CLASSIFICATION_PROFILE my_profile (
  {
    'minimum_object_age_for_classification_days': 0,
    'maximum_classification_validity_days': 30,
    'auto_tag': true
  }
);

-- Apply to database
ALTER DATABASE my_db SET CLASSIFICATION_PROFILE = 'my_db.schema.my_profile';
```

**Classification Profile Settings:**

| Setting | Description | Default |
|---------|-------------|---------|
| minimum_object_age_for_classification_days | Days to wait before classifying new tables | 0 |
| maximum_classification_validity_days | Days before reclassification | 30 |
| auto_tag | Whether to automatically apply tags | true |
| classify_views | Whether to classify views (higher cost) | false |
| tag_map | Mapping of categories to custom tags | null |

**Tag Mapping:**

Map semantic categories to your organization's custom tags:

```sql
CREATE SNOWFLAKE.DATA_PRIVACY.CLASSIFICATION_PROFILE my_profile (
  {
    'auto_tag': true,
    'tag_map': {
      'column_tag_map': [
        {
          'tag_name': 'governance.tags.pii',
          'tag_value': 'highly_confidential',
          'semantic_categories': ['NAME', 'NATIONAL_IDENTIFIER']
        },
        {
          'tag_name': 'governance.tags.pii',
          'tag_value': 'confidential',
          'semantic_categories': ['EMAIL', 'PHONE_NUMBER']
        }
      ]
    }
  }
);
```

**Integration with Tag-Based Masking:**

Complete workflow for automated protection:

1. Create custom tags
2. Create masking policies
3. Attach masking policies to tags
4. Create classification profile with tag mapping
5. Apply profile to databases

Result: New sensitive data is automatically discovered, tagged, and protected.

**Manual Classification (Legacy):**

```sql
-- Extract semantic categories
SELECT EXTRACT_SEMANTIC_CATEGORIES('my_table');

-- Apply categories as tags
CALL ASSOCIATE_SEMANTIC_CATEGORY_TAGS(
  'my_db.my_schema.my_table',
  EXTRACT_SEMANTIC_CATEGORIES('my_db.my_schema.my_table')
);
```

**Monitoring Classification:**

```sql
-- Find databases being monitored
SELECT SYSTEM$SHOW_SENSITIVE_DATA_MONITORED_ENTITIES('DATABASE');

-- Check classification costs
SELECT service_type, SUM(credits_used)
FROM snowflake.account_usage.metering_history
WHERE service_type = 'SENSITIVE_DATA_CLASSIFICATION'
GROUP BY service_type;
```

**Classification Costs:**

- Uses serverless compute resources
- Cost appears as "Sensitive Data Classification" in billing
- Views cost more to classify than tables
- By default, views are excluded from classification

### Exam Tips

- Classification requires Enterprise Edition
- SEMANTIC_CATEGORY identifies data type (NAME, EMAIL, etc.)
- PRIVACY_CATEGORY identifies sensitivity (IDENTIFIER, QUASI_IDENTIFIER, SENSITIVE)
- Tag maps connect classification to custom tags
- Classification has a 1-hour delay after profile is set
- Views are excluded by default (cost more to classify)

### Practice Questions

1. **Question**: Which system tag identifies whether data can directly identify an individual?
   - A) SNOWFLAKE.CORE.SEMANTIC_CATEGORY
   - B) SNOWFLAKE.CORE.PRIVACY_CATEGORY
   - C) SNOWFLAKE.CORE.SENSITIVITY_LEVEL
   - D) SNOWFLAKE.CORE.DATA_TYPE

   <details>
   <summary>Show Answer</summary>

   **Answer**: B - PRIVACY_CATEGORY identifies the sensitivity level: IDENTIFIER (directly identifies), QUASI_IDENTIFIER (identifies when combined), or SENSITIVE (sensitive but not identifying).

   </details>

2. **Question**: What is the PRIVACY_CATEGORY value for data like ZIP code or birth date that can identify individuals when combined with other data?
   - A) IDENTIFIER
   - B) QUASI_IDENTIFIER
   - C) SENSITIVE
   - D) INDIRECT_IDENTIFIER

   <details>
   <summary>Show Answer</summary>

   **Answer**: B - QUASI_IDENTIFIER is for data that can identify individuals when combined with other quasi-identifiers (ZIP code + birth date + gender).

   </details>

3. **Question**: How can you automatically apply masking policies to columns classified as containing sensitive data?
   - A) Classification automatically applies masking
   - B) Use tag_map in classification profile combined with tag-based masking policies
   - C) Manually review and apply after classification
   - D) Use APPLY_MASKING_TO_CLASSIFIED procedure

   <details>
   <summary>Show Answer</summary>

   **Answer**: B - By mapping semantic categories to custom tags in the classification profile, and attaching masking policies to those tags (tag-based masking), newly classified columns are automatically protected.

   </details>

---

## Lesson 6: Row Access Policies

### Learning Objectives
- Understand row-level security concepts
- Create and apply row access policies
- Use mapping tables for policy logic
- Know the interaction with masking policies

### Key Concepts

**What is Row-Level Security?**

Row access policies (RAPs) determine which rows are visible in query results. Unlike masking policies (which transform data), RAPs filter entire rows based on conditions.

**Available in All Editions**: Row access policies are available in Standard Edition and above.

**How Row Access Policies Work:**

```sql
-- Create a row access policy
CREATE ROW ACCESS POLICY rap_region AS (region_col VARCHAR)
RETURNS BOOLEAN ->
  CASE
    WHEN CURRENT_ROLE() = 'ADMIN' THEN true
    WHEN CURRENT_ROLE() = 'SALES_NA' AND region_col = 'NA' THEN true
    WHEN CURRENT_ROLE() = 'SALES_EMEA' AND region_col = 'EMEA' THEN true
    ELSE false
  END;

-- Apply to table
ALTER TABLE sales ADD ROW ACCESS POLICY rap_region ON (region);
```

**Policy Evaluation:**
- Policy returns TRUE: Row is visible
- Policy returns FALSE: Row is hidden
- Applied at query runtime before results are returned

**Using Mapping Tables:**

For complex authorization, use mapping tables:

```sql
-- Mapping table
CREATE TABLE entitlements (
  role_name VARCHAR,
  allowed_region VARCHAR
);

-- Row access policy with mapping table
CREATE ROW ACCESS POLICY rap_mapping AS (region_col VARCHAR)
RETURNS BOOLEAN ->
  EXISTS (
    SELECT 1 FROM entitlements
    WHERE role_name = CURRENT_ROLE()
      AND allowed_region = region_col
  )
  OR IS_ROLE_IN_SESSION('ADMIN');
```

**Applying Row Access Policies:**

```sql
-- At table creation
CREATE TABLE sales (
  id INT,
  region VARCHAR,
  amount NUMBER
) WITH ROW ACCESS POLICY rap_region ON (region);

-- To existing table
ALTER TABLE sales ADD ROW ACCESS POLICY rap_region ON (region);

-- Remove policy
ALTER TABLE sales DROP ROW ACCESS POLICY rap_region;

-- Replace policy
ALTER TABLE sales DROP ALL ROW ACCESS POLICIES;
ALTER TABLE sales ADD ROW ACCESS POLICY new_rap ON (region);
```

**Row Access Policy vs Masking Policy:**

| Aspect | Row Access Policy | Masking Policy |
|--------|-------------------|----------------|
| Purpose | Filter rows | Transform column values |
| Returns | BOOLEAN | Same data type as column |
| Effect | Row visible or hidden | Value masked or shown |
| Evaluation Order | First | After row access |

**When Both Apply:**
1. Row access policy evaluated first (filters rows)
2. Masking policy evaluated second (transforms visible data)

**Nested Policies:**

When a view is based on a table with a row access policy:
1. Table's row access policy executes first
2. View's row access policy (if any) executes second
3. Result is intersection of both policies

### Important Limitations

- Cannot use external tables as mapping tables
- Cannot attach policy to stream object (but applies when stream accesses table)
- Future grants on row access policies are not supported
- SELECT COUNT(*) is slower with RAP (must scan to count visible rows)

### Exam Tips

- Row access policies return BOOLEAN (true = visible)
- Available in all editions (not just Enterprise)
- Evaluated before masking policies
- Cannot be set on the same column specified in a masking policy signature
- Mapping tables enable complex authorization logic

### Practice Questions

1. **Question**: What does a row access policy return to indicate a row should be visible?
   - A) 1
   - B) 'VISIBLE'
   - C) TRUE
   - D) The row data

   <details>
   <summary>Show Answer</summary>

   **Answer**: C - Row access policies return a BOOLEAN value. TRUE means the row is visible; FALSE means it is hidden.

   </details>

2. **Question**: When both a row access policy and masking policy are on a table, which is evaluated first?
   - A) Masking policy
   - B) Row access policy
   - C) They are evaluated simultaneously
   - D) Depends on policy creation order

   <details>
   <summary>Show Answer</summary>

   **Answer**: B - Row access policies are always evaluated first (to filter rows), then masking policies are applied to the visible data.

   </details>

3. **Question**: Which edition is required for row access policies?
   - A) Enterprise Edition only
   - B) Business Critical only
   - C) Standard Edition and above
   - D) Virtual Private Snowflake only

   <details>
   <summary>Show Answer</summary>

   **Answer**: C - Row access policies are available in all Snowflake editions, including Standard Edition.

   </details>

---

## Lesson 7: Data Quality with Data Metric Functions

### Learning Objectives
- Understand data quality monitoring in Snowflake
- Learn about system and custom data metric functions (DMFs)
- Schedule DMFs for continuous monitoring
- Set up alerts for data quality issues

### Key Concepts

**What are Data Metric Functions (DMFs)?**

Data Metric Functions measure data quality attributes like freshness, accuracy, completeness, and consistency. Snowflake provides system DMFs and allows you to create custom DMFs.

**Enterprise Edition Feature**: DMFs require Enterprise Edition or higher.

**System-Defined DMFs:**

| DMF | Measures | Returns |
|-----|----------|---------|
| NULL_COUNT | Null values | Count of NULLs |
| BLANK_COUNT | Empty strings | Count of blanks |
| DUPLICATE_COUNT | Duplicate rows | Count of duplicates |
| UNIQUE_COUNT | Unique values | Count of distinct values |
| FRESHNESS | Data age | Timestamp of most recent change |

**Using System DMFs:**

```sql
-- Check null count on a column
SELECT SNOWFLAKE.CORE.NULL_COUNT(
  SELECT email FROM customers
);

-- Check for duplicates
SELECT SNOWFLAKE.CORE.DUPLICATE_COUNT(
  SELECT customer_id FROM customers
);

-- Check data freshness
SELECT SNOWFLAKE.CORE.FRESHNESS(
  SELECT * FROM sales_data
);
```

**Creating Custom DMFs:**

```sql
-- Create custom DMF to check for invalid emails
CREATE DATA METRIC FUNCTION check_email_format(
  tbl TABLE (email STRING)
)
RETURNS NUMBER
AS
$$
  SELECT COUNT(*) FROM tbl
  WHERE email NOT LIKE '%@%.%'
$$;
```

**Scheduling DMFs:**

DMFs can be scheduled to run automatically:

```sql
-- Attach DMF to table with schedule
ALTER TABLE customers
  SET DATA_METRIC_SCHEDULE = 'TRIGGER_ON_CHANGES';

-- Other schedule options:
-- 'USING CRON 0 0 * * * America/New_York' (daily at midnight)
-- '60 MINUTES' (every 60 minutes)
-- 'TRIGGER_ON_CHANGES' (when data changes)

-- Add DMF to table
ALTER TABLE customers ADD DATA METRIC FUNCTION
  SNOWFLAKE.CORE.NULL_COUNT ON (email);
```

**Setting Up Alerts:**

Combine DMFs with alerts for proactive monitoring:

```sql
-- Create alert for null count threshold
CREATE ALERT null_count_alert
  WAREHOUSE = my_warehouse
  SCHEDULE = 'USING CRON 0 0 * * * America/New_York'
  IF (
    EXISTS (
      SELECT * FROM TABLE(DATA_METRIC_FUNCTION_REFERENCES(
        REF_ENTITY_NAME => 'MY_DB.MY_SCHEMA.CUSTOMERS',
        REF_ENTITY_DOMAIN => 'TABLE'
      ))
      WHERE metric_name = 'NULL_COUNT'
        AND value > 100
    )
  )
  THEN
    CALL SYSTEM$SEND_EMAIL(...);
```

**Data Quality Expectations:**

You can define pass/fail criteria for DMF values:

```sql
-- Set expectation that null count should be 0
ALTER TABLE customers MODIFY COLUMN email
  SET DATA_METRIC_EXPECTATION = 'NULL_COUNT = 0';

-- Check results
SELECT * FROM DATA_METRIC_FUNCTION_REFERENCES(
  REF_ENTITY_NAME => 'MY_DB.MY_SCHEMA.CUSTOMERS',
  REF_ENTITY_DOMAIN => 'TABLE'
);
```

**Monitoring DMF Results:**

```sql
-- Query DMF results
SELECT *
FROM SNOWFLAKE.LOCAL.DATA_QUALITY_MONITORING_RESULTS
WHERE table_name = 'CUSTOMERS'
  AND measurement_time > DATEADD('day', -7, CURRENT_TIMESTAMP());
```

**Benefits of DMFs:**

1. **Risk Management**: Early detection of data quality issues
2. **Consistency**: Automated, repeatable quality checks
3. **Efficiency**: Serverless execution, no manual intervention
4. **Governance**: Enhances overall data governance posture

### Exam Tips

- DMFs require Enterprise Edition
- System DMFs include NULL_COUNT, DUPLICATE_COUNT, FRESHNESS, etc.
- DMFs can be scheduled (cron, interval, or trigger on changes)
- Combine DMFs with alerts for proactive monitoring
- Custom DMFs can be created for domain-specific quality checks

### Practice Questions

1. **Question**: Which system DMF measures how recently data has been updated?
   - A) NULL_COUNT
   - B) DUPLICATE_COUNT
   - C) FRESHNESS
   - D) LAST_UPDATED

   <details>
   <summary>Show Answer</summary>

   **Answer**: C - FRESHNESS measures data age by returning the timestamp of the most recent change to the data.

   </details>

2. **Question**: Which schedule option triggers a DMF when data in the table changes?
   - A) 'ON_CHANGE'
   - B) 'TRIGGER_ON_CHANGES'
   - C) 'WHEN_MODIFIED'
   - D) 'AUTO_REFRESH'

   <details>
   <summary>Show Answer</summary>

   **Answer**: B - 'TRIGGER_ON_CHANGES' schedules the DMF to run whenever data in the table is modified.

   </details>

3. **Question**: What Snowflake edition is required for Data Metric Functions?
   - A) Standard Edition
   - B) Enterprise Edition
   - C) Business Critical
   - D) All editions

   <details>
   <summary>Show Answer</summary>

   **Answer**: B - Data Metric Functions (DMFs) require Enterprise Edition or higher.

   </details>

---

## Lesson 8: Governance Monitoring and Reporting

### Learning Objectives
- Use Account Usage views for governance reporting
- Monitor policy usage with POLICY_REFERENCES
- Track governance changes over time
- Build governance dashboards

### Key Concepts

**Key Governance Views:**

| View | Schema | Purpose |
|------|--------|---------|
| ACCESS_HISTORY | ACCOUNT_USAGE | Track data access |
| TAG_REFERENCES | ACCOUNT_USAGE | List tag assignments |
| POLICY_REFERENCES | Information Schema | Find policy assignments |
| MASKING_POLICIES | ACCOUNT_USAGE | Catalog of masking policies |
| ROW_ACCESS_POLICIES | ACCOUNT_USAGE | Catalog of row access policies |
| OBJECT_DEPENDENCIES | ACCOUNT_USAGE | Object dependency tracking |

**POLICY_REFERENCES Function:**

Find which objects are protected by policies:

```sql
-- Find all objects protected by a specific masking policy
SELECT * FROM TABLE(
  INFORMATION_SCHEMA.POLICY_REFERENCES(
    POLICY_NAME => 'my_db.my_schema.ssn_mask'
  )
);

-- Find all policies on a specific table
SELECT * FROM TABLE(
  INFORMATION_SCHEMA.POLICY_REFERENCES(
    REF_ENTITY_NAME => 'my_db.my_schema.my_table',
    REF_ENTITY_DOMAIN => 'TABLE'
  )
);
```

**Governance Coverage Reporting:**

```sql
-- Tables with/without masking policies
SELECT
  t.table_catalog,
  t.table_schema,
  t.table_name,
  CASE WHEN mp.table_name IS NOT NULL THEN 'Protected' ELSE 'Unprotected' END as status
FROM information_schema.tables t
LEFT JOIN (
  SELECT DISTINCT
    ref_database_name as table_catalog,
    ref_schema_name as table_schema,
    ref_entity_name as table_name
  FROM TABLE(information_schema.policy_references(policy_name => 'ANY'))
  WHERE policy_kind = 'MASKING_POLICY'
) mp
ON t.table_catalog = mp.table_catalog
  AND t.table_schema = mp.table_schema
  AND t.table_name = mp.table_name;
```

**Tag Coverage Reporting:**

```sql
-- Percentage of tables with governance tags
SELECT
  COUNT(DISTINCT CASE WHEN tag_name LIKE '%PII%' THEN object_name END) * 100.0 /
  COUNT(DISTINCT object_name) as pii_coverage_pct
FROM snowflake.account_usage.tag_references
WHERE domain = 'TABLE';
```

**Snowsight Governance Dashboard:**

Access: Data > Trust Center > Governance

**Dashboard Features:**
- Classification coverage percentage
- Policy coverage metrics
- Unprotected sensitive data alerts
- Tag prevalence charts
- Click-through to detailed views

**Required Privileges for Governance Views:**

| View/Dashboard | Required Role |
|----------------|---------------|
| ACCOUNT_USAGE views | ACCOUNTADMIN or imported privilege |
| Snowsight Trust Center | ACCOUNTADMIN, or GOVERNANCE_VIEWER + OBJECT_VIEWER |
| Information Schema functions | USAGE on database/schema |

**Building Governance Alerts:**

```sql
-- Alert for unprotected PII
CREATE ALERT unprotected_pii_alert
  WAREHOUSE = governance_wh
  SCHEDULE = 'USING CRON 0 8 * * * UTC'
  IF (
    EXISTS (
      SELECT 1 FROM snowflake.account_usage.tag_references tr
      LEFT JOIN (
        SELECT DISTINCT ref_entity_name, ref_schema_name, ref_database_name
        FROM TABLE(information_schema.policy_references(policy_name => 'pii_mask'))
      ) pr
      ON tr.object_name = pr.ref_entity_name
      WHERE tr.tag_name LIKE '%PII%'
        AND pr.ref_entity_name IS NULL
    )
  )
  THEN
    CALL SYSTEM$SEND_EMAIL(
      'governance-team@company.com',
      'Unprotected PII Detected',
      'Review the Trust Center for unprotected sensitive data.'
    );
```

### Exam Tips

- POLICY_REFERENCES is in Information Schema (database-level)
- TAG_REFERENCES is in ACCOUNT_USAGE (account-level)
- Use GOVERNANCE_VIEWER + OBJECT_VIEWER roles for Snowsight governance
- ACCOUNT_USAGE views have up to 2-hour latency
- Combine views for comprehensive governance reporting

### Practice Questions

1. **Question**: Which function returns all objects protected by a specific masking policy?
   - A) MASKING_POLICIES
   - B) POLICY_REFERENCES
   - C) TAG_REFERENCES
   - D) OBJECT_DEPENDENCIES

   <details>
   <summary>Show Answer</summary>

   **Answer**: B - POLICY_REFERENCES function returns all objects (tables, views, columns) that have a specific policy applied.

   </details>

2. **Question**: What is the typical latency for ACCOUNT_USAGE views?
   - A) Real-time
   - B) Up to 2 hours
   - C) Up to 24 hours
   - D) Up to 7 days

   <details>
   <summary>Show Answer</summary>

   **Answer**: B - ACCOUNT_USAGE views have a latency of up to 2 hours (sometimes up to 3 hours for some views).

   </details>

3. **Question**: Which database roles are required to access the Governance area in Snowsight?
   - A) SYSADMIN only
   - B) ACCOUNTADMIN only
   - C) GOVERNANCE_VIEWER and OBJECT_VIEWER
   - D) Either ACCOUNTADMIN or GOVERNANCE_VIEWER + OBJECT_VIEWER

   <details>
   <summary>Show Answer</summary>

   **Answer**: D - You can access the Governance area with ACCOUNTADMIN, or with a role that has both GOVERNANCE_VIEWER and OBJECT_VIEWER database roles from the SNOWFLAKE database.

   </details>

---

## Summary: Data Governance Key Concepts

### Key Takeaways for the Exam

**1. Edition Requirements:**
- Enterprise Edition: Access History, Data Lineage, Classification, DMFs, Tag-based Policies
- All Editions: Basic tags, Masking Policies, Row Access Policies

**2. Access History:**
- Tracks read and write operations
- Column lineage in objects_modified
- policies_referenced shows applied policies
- Up to 2-hour latency

**3. Data Lineage:**
- Upstream = source; Downstream = target
- VIEW LINEAGE privilege required
- RESOLVE ALL for full lineage without object access
- 1-year retention

**4. Classification:**
- SEMANTIC_CATEGORY = what (NAME, EMAIL, SSN)
- PRIVACY_CATEGORY = sensitivity (IDENTIFIER, QUASI_IDENTIFIER, SENSITIVE)
- Tag maps connect to custom tags
- 1-hour delay after profile setup

**5. Tags for Governance:**
- Schema-level objects, string values
- 50 tags per object, 50 for columns
- apply_method: MANUAL, INHERITED, PROPAGATED, CLASSIFICATION
- Tag-based masking for scalable protection

**6. Row Access Policies:**
- Return BOOLEAN (true = visible)
- All editions
- Evaluated before masking policies
- Use mapping tables for complex logic

**7. Data Quality (DMFs):**
- Enterprise Edition
- System DMFs: NULL_COUNT, DUPLICATE_COUNT, FRESHNESS, etc.
- Schedule with cron, interval, or TRIGGER_ON_CHANGES

### Common Exam Patterns

**Edition Questions:**
- "Which feature requires Enterprise Edition?" - Access History, Classification, DMFs, Tag-based masking
- "Which is available in Standard Edition?" - Basic tags, Masking, RAP

**Sequencing Questions:**
- "What order are policies evaluated?" - RAP first, then masking
- "What is the governance workflow?" - Discover, Classify, Protect, Monitor

**Purpose Questions:**
- "What does SEMANTIC_CATEGORY identify?" - Type of data (NAME, EMAIL)
- "What does PRIVACY_CATEGORY identify?" - Sensitivity level (IDENTIFIER, etc.)

**View/Function Questions:**
- "Which view shows access history?" - ACCOUNT_USAGE.ACCESS_HISTORY
- "Which function shows policy assignments?" - POLICY_REFERENCES
- "Which shows inherited tags?" - TAG_REFERENCES_WITH_LINEAGE

---

*Study Guide: Domain 6, Part 16 - Data Governance Overview*
*SnowPro Core Certification (COF-C02)*
