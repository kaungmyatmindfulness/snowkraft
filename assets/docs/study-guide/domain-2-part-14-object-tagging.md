# Domain 2: Account Access & Security - Object Tagging for Security

## Overview

Object tagging is a powerful governance feature in Snowflake that enables organizations to classify, track, and protect data across their data estate. Tags are schema-level objects that can be assigned to Snowflake objects with associated string values, stored as key-value pairs. This functionality is foundational for data governance, cost attribution, and implementing tag-based security policies.

---

## Lesson 1: Introduction to Object Tagging

### Learning Objectives
- Understand what tags are and how they function in Snowflake
- Learn the characteristics and use cases for object tagging
- Recognize the supported objects for tagging
- Understand tag quotas and limitations

### Key Concepts

**What is a Tag?**
A tag is a schema-level object that can be assigned to another Snowflake object. When assigning a tag to an object, users associate it with an arbitrary string value, creating a key-value pair. The tag must be unique within its schema, and the tag value is always a string (up to 256 characters).

**General Characteristics:**
- An object can have multiple tags simultaneously (up to 50 tags per object)
- A single tag can be assigned to different object types at the same time
- Tag string values can be duplicated or unique across assignments
- Tags support inheritance based on the securable object hierarchy
- Tags can be configured to automatically propagate to dependent objects

**Use Cases for Tags:**

1. **Data Protection & Discovery**
   - Identify tables, views, and columns containing sensitive information
   - Enable data stewards to apply appropriate protection (masking policies, row access policies)
   - Combine tagging with masking policies for automated data protection

2. **Resource Usage Monitoring**
   - Assign tags to warehouses for accurate cost attribution
   - Group resources by cost center or organizational unit
   - Analyze business activities and project-specific resource consumption

3. **Compliance & Auditing**
   - Track data lineage and governance
   - Support regulatory requirements
   - Enable centralized or decentralized tag management approaches

### Tag Quotas

| Quota Type | Limit |
|------------|-------|
| Tags per object (tables, views, etc.) | 50 |
| Tags per table's columns (combined) | 50 different tags |
| Tag-entity associations per CREATE/ALTER TABLE | 100 |
| Allowed values per tag | 5,000 |
| Characters per tag value | 256 |

**Note:** The column limit is separate from the table limit. If you have 50 tags on a table, you can still have 50 different tags on its columns.

### Supported Objects

Tags can be set on objects throughout the Snowflake securable object hierarchy:

**Organization Level:**
- Account

**Account Level:**
- Application, Application Package, Compute Pool
- Database, Failover Group, Integration (all types)
- Network Policy, Replication Group, Role
- Share, User, Warehouse

**Database Level:**
- Database Role, Schema

**Schema Level:**
- Aggregation Policy, Alert, Budget Instance
- Classification Instance, Dynamic Table, Event Table
- External Function/UDF, External Table, Git Repository
- Iceberg Table, Image Repository, Join Policy
- Materialized View, Notebook, Password Policy
- Pipe, Policy (masking, row access, session, etc.)
- Procedure, Projection Policy, Session Policy
- Snapshot, Stage, Stream, Streamlit
- Table, Task, View

**Table/View Level:**
- Columns (including event table columns)

### Important Terms/Definitions

- **Tag**: A schema-level object that stores metadata as a key-value pair
- **Tag Value**: The string value (up to 256 characters) associated with a tag assignment
- **ALLOWED_VALUES**: Parameter that restricts tag values to a predefined list
- **Tag Inheritance**: Automatic application of tags from parent to child objects in the hierarchy
- **Tag Propagation**: Automatic assignment of tags from source to target objects (Enterprise Edition)
- **Tag-based Masking Policy**: A masking policy assigned to a tag that automatically protects columns

### Exam Tips

- Tags are schema-level objects with string values only
- Maximum 50 tags per object; separate 50-tag limit for columns
- Future grants on tags are NOT supported (use APPLY TAG privilege instead)
- Tag propagation and tag-based masking policies require Enterprise Edition or higher
- A tag's value is always a string, even if representing numbers
- Creating and setting basic tags is available to all editions

### Practice Questions

1. **Question**: What is the maximum number of tags that can be set on a single table in Snowflake?
   - A) 25
   - B) 50
   - C) 100
   - D) Unlimited

   <details>
   <summary>Show Answer</summary>

   **Answer**: B - You can set a maximum of 50 tags on a single object, including tables and views.

   </details>

2. **Question**: Which statement about Snowflake tags is TRUE?
   - A) Tags can only store numeric values
   - B) A tag can only be assigned to one object type
   - C) Tags are account-level objects
   - D) Tag values are always strings

   <details>
   <summary>Show Answer</summary>

   **Answer**: D - Tag values are always strings, up to 256 characters. Tags are schema-level objects and can be assigned to different object types simultaneously.

   </details>

3. **Question**: Which feature requires Enterprise Edition or higher?
   - A) Creating tags
   - B) Setting tags on tables
   - C) Tag-based masking policies
   - D) Querying tag assignments

   <details>
   <summary>Show Answer</summary>

   **Answer**: C - Tag-based masking policies and tag propagation require Enterprise Edition. Basic tag creation and assignment is available to all editions.

   </details>

---

## Lesson 2: Creating and Managing Tags

### Learning Objectives
- Learn the syntax for creating, modifying, and dropping tags
- Understand how to set allowed values for tags
- Master tag assignment using CREATE and ALTER commands
- Learn access control privileges for tag management

### Key Concepts

**Creating Tags**

Basic tag creation:
```sql
CREATE TAG cost_center;
```

Tag with allowed values:
```sql
CREATE TAG cost_center ALLOWED_VALUES 'finance', 'engineering', 'marketing';
```

Tag with propagation (Enterprise Edition):
```sql
CREATE TAG data_sensitivity
  PROPAGATE = ON_DEPENDENCY_AND_DATA_MOVEMENT
  ON_CONFLICT = 'HIGHLY CONFIDENTIAL';
```

**Setting Allowed Values**

The ALLOWED_VALUES parameter restricts which values can be assigned:
- Maximum 5,000 allowed values per tag
- Each value can be up to 256 characters
- Can be set at creation or modified later

```sql
-- Add allowed value
ALTER TAG cost_center ADD ALLOWED_VALUES 'sales';

-- Remove allowed value
ALTER TAG cost_center DROP ALLOWED_VALUES 'engineering';

-- Check allowed values
SELECT SYSTEM$GET_TAG_ALLOWED_VALUES('governance.tags.cost_center');
```

**Setting Tags on Objects**

When creating a new object:
```sql
CREATE WAREHOUSE mywarehouse WITH TAG (cost_center = 'sales');

CREATE TABLE t1 (
  col1 INT WITH TAG (pii = 'sensitive'),
  col2 STRING
) WITH TAG (cost_center = 'finance');
```

On existing objects:
```sql
-- Set tag on warehouse
ALTER WAREHOUSE wh1 SET TAG cost_center = 'sales';

-- Set tag on table
ALTER TABLE hr.employees SET TAG cost_center = 'hr';

-- Set tag on column
ALTER TABLE hr.employees MODIFY COLUMN salary SET TAG pii = 'sensitive';

-- Unset a tag
ALTER WAREHOUSE wh1 UNSET TAG cost_center;
```

**Deleting Tags**

```sql
-- Drop a tag (24-hour grace period)
DROP TAG cost_center;

-- Restore within grace period
UNDROP TAG cost_center;
```

### Access Control Privileges

| Privilege | Description |
|-----------|-------------|
| CREATE TAG | Create new tags in a schema |
| APPLY | Set and unset the specific tag on objects |
| APPLY TAG ON ACCOUNT | Set and unset any tag on any object (global) |
| OWNERSHIP | Full control over the tag; required to alter most properties |

**Centralized Management Approach:**
```sql
USE ROLE USERADMIN;
CREATE ROLE tag_admin;

USE ROLE ACCOUNTADMIN;
GRANT CREATE TAG ON SCHEMA mydb.mysch TO ROLE tag_admin;
GRANT APPLY TAG ON ACCOUNT TO ROLE tag_admin;
```

**Hybrid Management Approach:**
```sql
-- Central role creates tags
GRANT CREATE TAG ON SCHEMA governance.tags TO ROLE tag_admin;

-- Individual teams can apply specific tags
GRANT APPLY ON TAG cost_center TO ROLE finance_role;
```

### Summary of DDL Operations and Required Privileges

| Operation | Required Privilege |
|-----------|-------------------|
| Create tag | CREATE TAG on schema |
| Create tag that propagates | APPLY TAG ON ACCOUNT + OWNERSHIP on tag |
| Alter tag | OWNERSHIP on tag |
| Drop/Undrop tag | OWNERSHIP on tag + USAGE on database/schema |
| Show tags | USAGE on schema OR APPLY TAG ON ACCOUNT |
| Set/unset tag on object | APPLY TAG ON ACCOUNT, OR APPLY on tag + OWNERSHIP on object |

### Exam Tips

- ALLOWED_VALUES can restrict which tag values are valid
- Use SYSTEM$GET_TAG_ALLOWED_VALUES to check allowed values
- DROP TAG has a 24-hour grace period before permanent deletion
- UNDROP TAG restores the tag AND all its assignments
- Future grants on tags are NOT supported
- The APPLY privilege is for a specific tag; APPLY TAG ON ACCOUNT is global

### Practice Questions

1. **Question**: What is the maximum number of allowed values that can be defined for a single tag?
   - A) 100
   - B) 1,000
   - C) 5,000
   - D) 10,000

   <details>
   <summary>Show Answer</summary>

   **Answer**: C - A single tag can have up to 5,000 allowed values defined.

   </details>

2. **Question**: Which privilege allows a role to set any tag on any object in the account?
   - A) APPLY ON TAG
   - B) CREATE TAG
   - C) APPLY TAG ON ACCOUNT
   - D) OWNERSHIP ON TAG

   <details>
   <summary>Show Answer</summary>

   **Answer**: C - APPLY TAG ON ACCOUNT grants global permission to set and unset any tag on any object. APPLY ON TAG is specific to a particular tag.

   </details>

3. **Question**: What happens when you execute UNDROP TAG within the 24-hour grace period?
   - A) Only the tag object is restored
   - B) The tag is restored but all assignments are lost
   - C) The tag and all its assignments (references) are restored
   - D) A new tag with the same name is created

   <details>
   <summary>Show Answer</summary>

   **Answer**: C - UNDROP TAG restores both the tag object and all of its assignments (references) to other objects.

   </details>

---

## Lesson 3: Tag Inheritance

### Learning Objectives
- Understand how tag inheritance works in Snowflake
- Learn the securable object hierarchy for tag inheritance
- Know how to override inherited tag values
- Differentiate between inheritance and propagation

### Key Concepts

**Tag Inheritance**

Tags are inherited based on the Snowflake securable object hierarchy. A descendant object automatically inherits tags from its ancestors.

**Inheritance Hierarchy:**
```
Account
  └── Database
        └── Schema
              └── Table/View
                    └── Column
```

**Example:** If a tag is set on an account, all databases, schemas, tables, views, and columns in that account inherit the tag.

**Key Points:**
- Inheritance flows DOWN the hierarchy only
- Child objects automatically receive tags from parent objects
- Setting a tag on a table means all columns inherit that tag
- Inheritance is automatic and immediate

**Tag Inheritance Does NOT Include:**
- Nested objects (views based on tables, materialized views based on views)
- Objects created from queries (CTAS results don't inherit from source)

```sql
-- Example: Setting a tag on a database
ALTER DATABASE hr_db SET TAG environment = 'production';
-- All schemas, tables, views, columns in hr_db now inherit this tag
```

**Overriding Inherited Tags**

You can override an inherited tag value by manually setting the tag on a descendant object:

```sql
-- Database has cost_center = 'corporate'
ALTER DATABASE mydb SET TAG cost_center = 'corporate';

-- Override for specific schema
ALTER SCHEMA mydb.sales SET TAG cost_center = 'sales_na';

-- The schema now has cost_center = 'sales_na' instead of 'corporate'
```

**Override Priority:**
1. Tag directly set on the object (highest priority)
2. Tag propagated to the object
3. Tag inherited from parent objects (lowest priority)

**Inheritance vs Propagation:**

| Aspect | Inheritance | Propagation |
|--------|-------------|-------------|
| Direction | Parent to child in hierarchy | Source to dependent/derived objects |
| Edition | All editions | Enterprise Edition only |
| Automatic | Always automatic | Requires PROPAGATE property |
| Objects | Hierarchy-based (database > schema > table > column) | Dependency-based (table > view, CTAS results) |
| Continuous Updates | Yes | Yes (for dependencies), No (for data movement) |

### Determining How a Tag Was Associated

Use the `apply_method` column in tag reference views/functions:

```sql
SELECT tag_name, tag_value, apply_method, level, domain
FROM TABLE(my_db.INFORMATION_SCHEMA.TAG_REFERENCES('my_table', 'TABLE'));
```

**apply_method values:**
- `MANUAL` - Tag was explicitly set on the object
- `INHERITED` - Tag came from a parent object
- `PROPAGATED` - Tag was automatically propagated
- `CLASSIFICATION` - Tag was set by sensitive data classification

### Exam Tips

- Inheritance flows DOWN the hierarchy (account > database > schema > table > column)
- Inheritance does NOT cross to nested objects (table > view)
- Manually set tags override inherited tags
- Propagated tags override inherited tags
- Classification tags override inherited tags
- Use TAG_REFERENCES views to see how a tag was applied (apply_method column)

### Practice Questions

1. **Question**: If a tag is set on a database, which objects will inherit that tag?
   - A) Only schemas in the database
   - B) Schemas, tables, and views in the database
   - C) Schemas, tables, views, and columns in the database
   - D) All objects in the account

   <details>
   <summary>Show Answer</summary>

   **Answer**: C - Tag inheritance follows the securable object hierarchy: database > schema > table/view > column. All descendant objects inherit the tag.

   </details>

2. **Question**: A table has an inherited tag cost_center = 'corporate'. What happens when you execute ALTER TABLE SET TAG cost_center = 'sales'?
   - A) An error occurs because the tag already exists
   - B) The table now has cost_center = 'sales', overriding the inherited value
   - C) The table has both values
   - D) The database tag is also updated

   <details>
   <summary>Show Answer</summary>

   **Answer**: B - You can override an inherited tag value by manually setting the tag on the object. The manually set value takes precedence.

   </details>

3. **Question**: Which of the following does NOT benefit from tag inheritance?
   - A) Columns in a tagged table
   - B) Tables in a tagged schema
   - C) Views created from a tagged table
   - D) Schemas in a tagged database

   <details>
   <summary>Show Answer</summary>

   **Answer**: C - Tag inheritance does not include nested objects like views based on tables. Views are separate objects that don't inherit from their source tables. This requires tag propagation (Enterprise Edition).

   </details>

---

## Lesson 4: Automatic Tag Propagation

### Learning Objectives
- Understand tag propagation types (dependency vs data movement)
- Learn how to configure tags for automatic propagation
- Handle tag propagation conflicts
- Monitor propagation using event tables

### Key Concepts

**Enterprise Edition Feature**

Tag propagation automatically assigns object tags to target objects from source objects. This is critical for maintaining governance across derived objects.

**Types of Propagation:**

1. **Object Dependencies (ON_DEPENDENCY)**
   - Propagates when target objects are created based on source objects
   - Examples: Views, secure views, materialized views, dynamic tables
   - Continuous updates when source tags change

2. **Data Movement (ON_DATA_MOVEMENT)**
   - Propagates when data moves from source to target
   - Examples: CTAS, INSERT, MERGE, UPDATE, COPY INTO
   - NOT continuously updated (one-time propagation)

3. **Both (ON_DEPENDENCY_AND_DATA_MOVEMENT)**
   - Combines both behaviors

**Configuring Propagation:**

```sql
-- Create tag with propagation enabled
CREATE TAG data_sensitivity
  PROPAGATE = ON_DEPENDENCY;

-- Enable propagation on existing tag
ALTER TAG data_sensitivity
  SET PROPAGATE = ON_DEPENDENCY_AND_DATA_MOVEMENT;

-- Disable propagation
ALTER TAG data_sensitivity UNSET PROPAGATE;
```

**Tag Propagation Conflicts**

Conflicts occur when a tag propagates from multiple sources with different values.

**Conflict Resolution Options:**

| Option | Configuration | Behavior |
|--------|---------------|----------|
| Default | No ON_CONFLICT set | Value becomes 'CONFLICT' |
| Custom String | ON_CONFLICT = 'value' | Value becomes the specified string |
| Sequence | ON_CONFLICT = ALLOWED_VALUES_SEQUENCE | First value in ALLOWED_VALUES list wins |

```sql
-- Use custom conflict value
CREATE TAG data_sensitivity
  PROPAGATE = ON_DEPENDENCY_AND_DATA_MOVEMENT
  ON_CONFLICT = 'HIGHLY CONFIDENTIAL';

-- Use allowed values sequence
CREATE TAG data_sensitivity
  ALLOWED_VALUES 'confidential', 'internal', 'public'
  PROPAGATE = ON_DEPENDENCY
  ON_CONFLICT = ALLOWED_VALUES_SEQUENCE;
-- 'confidential' wins over 'internal' which wins over 'public'
```

**Priority of Tag Values:**

1. Manually set tag (highest priority)
2. Propagated tag
3. Inherited tag (lowest priority)

**Monitoring with Event Tables:**

Enable logging:
```sql
ALTER ACCOUNT SET ENABLE_TAG_PROPAGATION_EVENT_LOGGING = TRUE;
```

Query events:
```sql
-- Find all propagation events for a tag
SELECT TIMESTAMP as time,
       RECORD_ATTRIBUTES['event_type'] as event_type,
       VALUE as event_details
FROM tagging_db.tagging_schema.my_event_table
WHERE SCOPE['name'] = 'snow.automatic_tag_propagation'
  AND RECORD_ATTRIBUTES['tag_name'] = 'TAGGING_DB.TAGGING_SCHEMA.TAG1';

-- Find conflicts
SELECT DISTINCT
       RECORD_ATTRIBUTES['tag_name'] as tags,
       VALUE['conflict_values'] as conflicting_tag_values,
       VALUE['resolution_type'] as resolution_type
FROM tagging_db.tagging_schema.my_event_table
WHERE SCOPE['name'] = 'snow.automatic_tag_propagation'
  AND RECORD_ATTRIBUTES['event_type'] = 'CONFLICT';
```

### Propagation Limitations

- System tags are NOT propagated
- Inherited tags are NOT propagated
- Tags are NOT propagated from shares to local objects
- Maximum 10,000 target objects per propagation
- Cannot exceed 50 tags per object limit

### Exam Tips

- Tag propagation requires Enterprise Edition
- ON_DEPENDENCY provides continuous updates; ON_DATA_MOVEMENT does not
- Manually set tags always take precedence over propagated tags
- CLONE and LIKE statements always propagate tags (don't require PROPAGATE property)
- Use event tables to monitor propagation conflicts
- ON_CONFLICT = ALLOWED_VALUES_SEQUENCE uses order of values in the list

### Practice Questions

1. **Question**: Which PROPAGATE setting should be used if you want tags to flow to views created from a table?
   - A) ON_DATA_MOVEMENT
   - B) ON_DEPENDENCY
   - C) ON_TABLE_CREATE
   - D) ON_VIEW_CREATE

   <details>
   <summary>Show Answer</summary>

   **Answer**: B - ON_DEPENDENCY propagates tags when target objects (like views) are created based on source objects (like tables).

   </details>

2. **Question**: What is the default conflict resolution behavior when tags propagate from multiple sources with different values?
   - A) The first source value is used
   - B) An error is thrown
   - C) The tag value becomes 'CONFLICT'
   - D) The tag is not assigned

   <details>
   <summary>Show Answer</summary>

   **Answer**: C - By default, if there's a conflict during tag propagation, the tag value is set to the string 'CONFLICT'.

   </details>

3. **Question**: Which statement about tag propagation is FALSE?
   - A) Propagation requires Enterprise Edition
   - B) ON_DATA_MOVEMENT continuously updates target tags when source changes
   - C) Manually set tags take precedence over propagated tags
   - D) CREATE TABLE ... CLONE always propagates tags

   <details>
   <summary>Show Answer</summary>

   **Answer**: B - ON_DATA_MOVEMENT does NOT continuously update tags. Only ON_DEPENDENCY provides continuous updates when source tags change.

   </details>

---

## Lesson 5: Tag-Based Masking Policies

### Learning Objectives
- Understand how tag-based masking policies work
- Learn to assign masking policies to tags
- Know the benefits and considerations of tag-based masking
- Implement tag-based masking at different levels (database, schema, table)

### Key Concepts

**Enterprise Edition Feature**

Tag-based masking policies combine object tagging and masking policies. When a masking policy is assigned to a tag and that tag is set on a column (directly or via inheritance), the column is automatically protected.

**How It Works:**
1. Create a tag
2. Create a masking policy
3. Assign the masking policy to the tag
4. Set the tag on database, schema, table, or column
5. Columns with matching data types are automatically protected

**Key Benefits:**
- **Ease of Use**: Assign policies to tags once, not to every column
- **Scalable**: One policy can protect many columns
- **Future Protection**: New columns are automatically protected
- **Flexibility**: Can apply at database, schema, or table level

**Setting Up Tag-Based Masking:**

```sql
-- Step 1: Create tag
CREATE TAG pii_tag;

-- Step 2: Create masking policies for different data types
CREATE MASKING POLICY mask_string AS (val STRING)
RETURNS STRING ->
  CASE WHEN CURRENT_ROLE() IN ('HR_ADMIN') THEN val
       ELSE '***MASKED***'
  END;

CREATE MASKING POLICY mask_number AS (val NUMBER)
RETURNS NUMBER ->
  CASE WHEN CURRENT_ROLE() IN ('HR_ADMIN') THEN val
       ELSE -1
  END;

-- Step 3: Assign masking policies to tag
ALTER TAG pii_tag SET
  MASKING POLICY mask_string,
  MASKING POLICY mask_number;

-- Step 4: Set tag on database, schema, or table
ALTER DATABASE hr_db SET TAG pii_tag = 'protected';
-- OR
ALTER SCHEMA hr_db.employees SET TAG pii_tag = 'protected';
-- OR
ALTER TABLE hr_db.employees.info SET TAG pii_tag = 'protected';
```

**Policy Application at Different Levels:**

| Level | Behavior |
|-------|----------|
| Database | All columns in all tables/views are protected (if data type matches) |
| Schema | All columns in schema's tables/views are protected |
| Table | All columns in the table are protected |
| Column | Only that specific column is protected |

**Policy Precedence:**
1. Masking policy directly assigned to column (highest)
2. Tag-based masking policy
3. No masking (lowest)

**Replacing Masking Policy on Tag:**

```sql
-- Option 1: Two-step (may expose data briefly)
ALTER TAG pii_tag UNSET MASKING POLICY mask_string;
ALTER TAG pii_tag SET MASKING POLICY mask_string_v2;

-- Option 2: Atomic replacement with FORCE
ALTER TAG pii_tag SET MASKING POLICY mask_string_v2 FORCE;
```

### Required Privileges

| Task | Required Privileges |
|------|---------------------|
| Assign masking policy to tag | APPLY MASKING POLICY ON ACCOUNT |
| Set tag with masking policy on database/schema | APPLY MASKING POLICY ON ACCOUNT + APPLY TAG ON ACCOUNT (or APPLY on tag + OWNERSHIP on object) |
| Set tag with masking policy on table/view | APPLY MASKING POLICY ON ACCOUNT (or APPLY on tag + OWNERSHIP on table) |

### Limitations

- A tag can have only ONE masking policy per data type
- Masking policy and tag cannot be dropped if assigned to each other
- Cannot create materialized view on table protected by tag-based masking
- Conditional columns cannot be protected by tag-based masking
- System tags cannot have masking policies assigned

### Exam Tips

- One masking policy per data type per tag
- Policy directly on column overrides tag-based policy
- Cannot drop tag or policy while they're assigned to each other
- Setting tag on database/schema automatically protects future columns
- Materialized views cannot be created on tables with tag-based masking
- Use FORCE keyword to atomically replace a policy on a tag

### Practice Questions

1. **Question**: How many masking policies can be assigned to a single tag?
   - A) Only one total
   - B) One per data type
   - C) Unlimited
   - D) One per schema

   <details>
   <summary>Show Answer</summary>

   **Answer**: B - A tag can have one masking policy per data type (e.g., one for STRING, one for NUMBER, one for TIMESTAMP, etc.).

   </details>

2. **Question**: If a column has both a directly assigned masking policy and a tag-based masking policy, which takes precedence?
   - A) Tag-based masking policy
   - B) The policy with stricter rules
   - C) The directly assigned masking policy
   - D) An error occurs due to conflict

   <details>
   <summary>Show Answer</summary>

   **Answer**: C - The masking policy directly assigned to the column takes precedence over any tag-based masking policy.

   </details>

3. **Question**: What happens when you set a tag with a masking policy on a database?
   - A) Only existing tables are protected
   - B) Only new tables created after the tag is set are protected
   - C) All columns in all tables/views (with matching data types) are protected, including future ones
   - D) Only the database object itself is protected

   <details>
   <summary>Show Answer</summary>

   **Answer**: C - Setting a tag-based masking policy on a database protects all columns with matching data types in all existing and future tables and views in that database.

   </details>

---

## Lesson 6: Sensitive Data Classification Tags

### Learning Objectives
- Understand how sensitive data classification uses tags
- Learn about system-defined classification tags
- Know how to map custom tags to classification results
- Integrate classification with tag-based masking

### Key Concepts

**Enterprise Edition Feature**

Sensitive data classification automatically identifies columns containing sensitive data and assigns system-defined tags. This integrates seamlessly with object tagging for comprehensive data governance.

**System-Defined Classification Tags:**

| Tag | Purpose | Example Values |
|-----|---------|----------------|
| SNOWFLAKE.CORE.SEMANTIC_CATEGORY | Type of personal attribute | NAME, EMAIL, PHONE_NUMBER, NATIONAL_IDENTIFIER |
| SNOWFLAKE.CORE.PRIVACY_CATEGORY | Sensitivity level | IDENTIFIER, QUASI_IDENTIFIER, SENSITIVE |

**Classification Categories:**

**Semantic Categories (what the data is):**
- NAME, EMAIL, PHONE_NUMBER
- NATIONAL_IDENTIFIER (SSN, etc.)
- ADDRESS, DATE_OF_BIRTH
- Custom categories you define

**Privacy Categories (how sensitive):**
- IDENTIFIER: Directly identifies individuals
- QUASI_IDENTIFIER: Can identify when combined with other data
- SENSITIVE: Sensitive but not identifying (e.g., salary)

**Setting Up Classification with Tag Mapping:**

```sql
-- Create custom tag for your organization
CREATE TAG tag_db.sch.pii;

-- Create classification profile with tag mapping
CREATE SNOWFLAKE.DATA_PRIVACY.CLASSIFICATION_PROFILE my_profile (
  {
    'minimum_object_age_for_classification_days': 0,
    'maximum_classification_validity_days': 30,
    'auto_tag': true,
    'tag_map': {
      'column_tag_map': [
        {
          'tag_name': 'tag_db.sch.pii',
          'tag_value': 'Highly Confidential',
          'semantic_categories': ['NAME', 'NATIONAL_IDENTIFIER']
        },
        {
          'tag_name': 'tag_db.sch.pii',
          'tag_value': 'Confidential',
          'semantic_categories': ['EMAIL', 'PHONE_NUMBER']
        }
      ]
    }
  }
);

-- Enable classification on database
ALTER DATABASE my_db SET CLASSIFICATION_PROFILE = 'my_db.sch.my_profile';
```

**Integrating Classification with Tag-Based Masking:**

```sql
-- Attach masking policy to custom tag
ALTER TAG tag_db.sch.pii SET MASKING POLICY pii_mask;

-- Now columns classified as NAME or NATIONAL_IDENTIFIER are automatically:
-- 1. Tagged with SNOWFLAKE.CORE.SEMANTIC_CATEGORY
-- 2. Tagged with tag_db.sch.pii = 'Highly Confidential'
-- 3. Protected by pii_mask masking policy
```

**Classification Profile Properties:**

| Property | Description |
|----------|-------------|
| minimum_object_age_for_classification_days | Wait time before classifying new tables |
| maximum_classification_validity_days | Days before reclassification |
| auto_tag | Whether to automatically apply tags |
| classify_views | Whether to classify views (costs more) |
| tag_map | Mapping of semantic categories to custom tags |
| custom_classifiers | Custom classifiers for domain-specific data |

### Workflow for Automated Data Protection

1. **Create custom tags** for your governance needs
2. **Create masking policies** for each data type you want to protect
3. **Assign masking policies to tags** (tag-based masking)
4. **Create classification profile** with tag mapping
5. **Set classification profile on database**
6. **Result**: New sensitive data is automatically discovered, tagged, and protected

### Exam Tips

- Classification requires Enterprise Edition
- SEMANTIC_CATEGORY identifies what the data is
- PRIVACY_CATEGORY identifies how sensitive it is
- Tag maps let you apply custom tags based on classification
- Classification tags can trigger tag-based masking policies
- Classification has costs based on serverless compute usage
- There's a 1-hour delay between setting profile and classification starting

### Practice Questions

1. **Question**: Which system tag identifies the type of sensitive data (e.g., NAME, EMAIL)?
   - A) SNOWFLAKE.CORE.PRIVACY_CATEGORY
   - B) SNOWFLAKE.CORE.SEMANTIC_CATEGORY
   - C) SNOWFLAKE.CORE.DATA_TYPE
   - D) SNOWFLAKE.CORE.SENSITIVITY_LEVEL

   <details>
   <summary>Show Answer</summary>

   **Answer**: B - SNOWFLAKE.CORE.SEMANTIC_CATEGORY identifies the type of personal attribute (NAME, EMAIL, etc.). PRIVACY_CATEGORY identifies the sensitivity level.

   </details>

2. **Question**: What is the PRIVACY_CATEGORY for data that can identify a person when combined with other data?
   - A) IDENTIFIER
   - B) QUASI_IDENTIFIER
   - C) SENSITIVE
   - D) INDIRECT

   <details>
   <summary>Show Answer</summary>

   **Answer**: B - QUASI_IDENTIFIER is for data that can identify individuals when combined with other data (e.g., birth date, zip code).

   </details>

3. **Question**: How can you automatically apply masking policies to newly classified sensitive data?
   - A) Manually assign masking policies after classification
   - B) Use tag maps in classification profiles combined with tag-based masking
   - C) Classification automatically applies masking
   - D) Create triggers on classification events

   <details>
   <summary>Show Answer</summary>

   **Answer**: B - By mapping semantic categories to custom tags in the classification profile, and attaching masking policies to those tags, newly classified columns are automatically protected.

   </details>

---

## Lesson 7: Monitoring and Querying Tags

### Learning Objectives
- Use views and functions to discover tags and their assignments
- Monitor tag usage with Snowsight
- Understand tag lineage tracking
- Query tag references at account and database levels

### Key Concepts

**Discovering Tags**

| Method | Scope | Description |
|--------|-------|-------------|
| SNOWFLAKE.ACCOUNT_USAGE.TAGS | Account | Catalog of all tags (current and deleted) |
| SYSTEM$GET_TAG | Object | Get tag value for specific object |
| SHOW TAGS | Schema | List tags in current/specified schema |

```sql
-- List all tags in account
SELECT * FROM SNOWFLAKE.ACCOUNT_USAGE.TAGS ORDER BY tag_name;

-- Get tag value for specific object
SELECT SYSTEM$GET_TAG('cost_center', 'my_table', 'table');

-- Show tags in schema
SHOW TAGS IN SCHEMA governance.tags;
```

**Identifying Tag Assignments**

| Method | Scope | Includes Lineage |
|--------|-------|------------------|
| ACCOUNT_USAGE.TAG_REFERENCES | Account | No |
| ACCOUNT_USAGE.TAG_REFERENCES_WITH_LINEAGE | Account | Yes |
| INFORMATION_SCHEMA.TAG_REFERENCES | Database | Yes |
| INFORMATION_SCHEMA.TAG_REFERENCES_ALL_COLUMNS | Table/View | Yes |

```sql
-- Account-level query without lineage
SELECT * FROM SNOWFLAKE.ACCOUNT_USAGE.TAG_REFERENCES
ORDER BY tag_name, domain, object_id;

-- Account-level query with lineage (shows inheritance)
SELECT * FROM TABLE(
  SNOWFLAKE.ACCOUNT_USAGE.TAG_REFERENCES_WITH_LINEAGE('my_db.my_schema.cost_center')
);

-- Database-level query with lineage
SELECT * FROM TABLE(
  my_db.INFORMATION_SCHEMA.TAG_REFERENCES('my_table', 'table')
);

-- All tags on all columns of a table
SELECT * FROM TABLE(
  INFORMATION_SCHEMA.TAG_REFERENCES_ALL_COLUMNS('my_table', 'table')
);
```

**Key Columns in TAG_REFERENCES:**

| Column | Description |
|--------|-------------|
| tag_name | Fully qualified tag name |
| tag_value | String value assigned |
| domain | Object type (TABLE, COLUMN, WAREHOUSE, etc.) |
| object_id | Unique identifier of tagged object |
| apply_method | How tag was associated (MANUAL, INHERITED, PROPAGATED, CLASSIFICATION) |
| level | Where tag was set in hierarchy |

**Monitoring Tags with Snowsight**

Access: Governance & security > Tags & policies

**Required Roles:**
- ACCOUNTADMIN, OR
- Role with GOVERNANCE_VIEWER and OBJECT_VIEWER database roles

**Dashboard Features:**
- Coverage: Percentage of tables/columns with tags
- Prevalence: Most frequently used tags
- Click-through to Tagged Objects tab

**Tagged Objects Tab:**
- Filter by tables or columns
- Filter by with/without tags
- Filter by specific tag
- Navigate to object details

### Exam Tips

- TAG_REFERENCES view shows direct assignments only
- TAG_REFERENCES_WITH_LINEAGE includes inherited tags
- Use TAG_REFERENCES_ALL_COLUMNS for all columns in a table
- apply_method column shows MANUAL, INHERITED, PROPAGATED, or CLASSIFICATION
- Snowsight dashboard updates every 12 hours; Tagged Objects up to 2 hours latency
- GOVERNANCE_VIEWER and OBJECT_VIEWER database roles needed for Snowsight governance area

### Practice Questions

1. **Question**: Which view should you use to find all objects with a specific tag, including those that inherited the tag?
   - A) ACCOUNT_USAGE.TAG_REFERENCES
   - B) ACCOUNT_USAGE.TAG_REFERENCES_WITH_LINEAGE
   - C) INFORMATION_SCHEMA.TAGS
   - D) ACCOUNT_USAGE.COLUMNS

   <details>
   <summary>Show Answer</summary>

   **Answer**: B - TAG_REFERENCES_WITH_LINEAGE is an account-level function that includes objects where the tag was inherited, not just directly set.

   </details>

2. **Question**: What does the apply_method column indicate when its value is 'PROPAGATED'?
   - A) The tag was manually set by a user
   - B) The tag was inherited from a parent object
   - C) The tag was automatically propagated from a source object
   - D) The tag was set by sensitive data classification

   <details>
   <summary>Show Answer</summary>

   **Answer**: C - PROPAGATED indicates the tag was automatically assigned via tag propagation from a source object (e.g., from a table to a view).

   </details>

3. **Question**: Which database roles are required to access the Governance area in Snowsight (besides ACCOUNTADMIN)?
   - A) DATA_ENGINEER and SECURITY_ADMIN
   - B) GOVERNANCE_VIEWER and OBJECT_VIEWER
   - C) TAG_ADMIN and POLICY_ADMIN
   - D) USAGE_VIEWER and GOVERNANCE_ADMIN

   <details>
   <summary>Show Answer</summary>

   **Answer**: B - The GOVERNANCE_VIEWER and OBJECT_VIEWER database roles (from SNOWFLAKE database) are required to access the Governance & security > Tags & policies area.

   </details>

---

## Lesson 8: Tags with Replication, Cloning, and Data Sharing

### Learning Objectives
- Understand how tags behave during replication
- Know tag handling for cloned objects
- Learn tag considerations for data sharing

### Key Concepts

**Replication**

Tags and their assignments can be replicated from source to target accounts.

**Key Points:**
- Tag assignments cannot be modified in the target (secondary) account
- Modifications must be made in source account and replicated
- Replication fails if Enterprise features are used in non-Enterprise target

**Avoiding Dangling References:**
```sql
-- Use replication/failover groups for complete replication
CREATE REPLICATION GROUP my_group
  ALLOWED_DATABASES = (db_with_tags, other_db)
  OBJECT_TYPES = (ROLES, WAREHOUSES, DATABASES)
  ALLOWED_ACCOUNTS = (org.target_account);
```

**Requirements for Successful Replication:**
- Include database containing tags in ALLOWED_DATABASES
- Include tagged account-level objects in OBJECT_TYPES
- Use IGNORE EDITION CHECK if replicating to lower edition

**Cloning**

Tag associations are maintained when cloning objects.

**Behavior:**
- Tags stored in cloned database/schema are also cloned
- Cloned objects reference the cloned tags (not source tags)
- Tag values are preserved

```sql
-- Clone a database with tags
CREATE DATABASE hr_db_clone CLONE hr_db;
-- Tags in hr_db are cloned to hr_db_clone
-- Tables reference cloned tags, not original tags
```

**Data Sharing**

**Provider Side:**
- Tags can be set on shared objects
- Tags on shares are not visible to consumers
- Provider can grant READ privilege on tags to share

**Consumer Side:**
- If provider grants READ on tag, consumer can see tag assignments
- Consumer cannot call SYSTEM$GET_TAG on provider's tags
- Consumer cannot use TAG_REFERENCES function on provider's tags
- Tags from consumer account are NOT enforced on shared objects

**Cross-Database Sharing:**
```sql
-- Grant REFERENCE_USAGE when tag is in different database than shared view
GRANT REFERENCE_USAGE ON DATABASE tag_db TO SHARE my_share;
```

**Tag-Based Masking with Sharing:**
- Tag-based masking policies set on shared schema/database ARE enforced in consumer account
- Tag inheritance is preserved in consumer account
- Consumer-side tags/policies are NOT enforced on shared objects

### Exam Tips

- Replicated tags cannot be modified in target account
- Use replication groups to avoid dangling tag references
- Cloned objects reference cloned tags, not original tags
- Consumers cannot query provider's tag assignments directly
- Tag-based masking policies ARE enforced when data is shared
- SHOW TAGS returns shared tags if consumer has USAGE on schema

### Practice Questions

1. **Question**: When cloning a database that contains tags, what happens to the tag references on tables?
   - A) Tables in the clone reference the original database's tags
   - B) Tables in the clone reference cloned tags in the cloned database
   - C) Tag references are not preserved during cloning
   - D) Cloning fails if tags exist

   <details>
   <summary>Show Answer</summary>

   **Answer**: B - When cloning a database or schema, tags are also cloned, and objects in the clone reference the cloned tags (not the original tags).

   </details>

2. **Question**: In a data sharing scenario, can a consumer modify tag assignments on shared objects?
   - A) Yes, consumers have full control over shared objects
   - B) No, tag assignments are controlled by the provider
   - C) Yes, but only with APPLY TAG privilege
   - D) Consumers can add tags but not remove them

   <details>
   <summary>Show Answer</summary>

   **Answer**: B - Consumers cannot modify tag assignments on shared objects. Tags and their assignments are controlled by the data provider.

   </details>

3. **Question**: What happens to tag-based masking policies when data is shared to a consumer?
   - A) They are not enforced in the consumer account
   - B) They are enforced in the consumer account
   - C) The consumer must recreate the masking policies
   - D) Masking policies are converted to row access policies

   <details>
   <summary>Show Answer</summary>

   **Answer**: B - Tag-based masking policies set on shared schema or database in the provider account ARE enforced in the consumer account, ensuring protected data stays protected.

   </details>

---

## Summary: Object Tagging Best Practices

### Key Takeaways for the Exam

1. **Tag Basics**
   - Tags are schema-level objects with string values
   - Maximum 50 tags per object; separate 50-tag limit for columns
   - ALLOWED_VALUES can restrict valid tag values

2. **Tag Application Methods**
   - Manual: CREATE/ALTER with TAG clause
   - Inheritance: Automatic from parent objects in hierarchy
   - Propagation: Automatic to dependent objects (Enterprise)
   - Classification: Automatic via sensitive data classification (Enterprise)

3. **Enterprise Edition Features**
   - Tag propagation (ON_DEPENDENCY, ON_DATA_MOVEMENT)
   - Tag-based masking policies
   - Sensitive data classification

4. **Tag-Based Masking**
   - One masking policy per data type per tag
   - Direct policy on column overrides tag-based policy
   - Set at database/schema level for comprehensive protection

5. **Monitoring**
   - TAG_REFERENCES: Direct assignments
   - TAG_REFERENCES_WITH_LINEAGE: Includes inherited
   - apply_method shows how tag was associated

6. **Privileges**
   - CREATE TAG: Create tags in schema
   - APPLY ON TAG: Set specific tag on objects
   - APPLY TAG ON ACCOUNT: Set any tag anywhere

### Common Exam Patterns

- Questions about tag quotas (50 per object, 50 for columns)
- Enterprise vs Standard edition feature availability
- Precedence: Direct policy > Tag-based policy > Inherited
- Propagation: ON_DEPENDENCY updates continuously; ON_DATA_MOVEMENT does not
- Classification system tags: SEMANTIC_CATEGORY and PRIVACY_CATEGORY
- Replication: Tags cannot be modified in secondary account

---

*Study Guide: Domain 2, Part 14 - Object Tagging for Security*
*SnowPro Core Certification (COF-C02)*
