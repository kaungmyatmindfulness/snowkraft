# Domain 6: Data Protection & Sharing - Data Classification

## Overview

Data classification is an Enterprise Edition feature in Snowflake that automatically discovers and categorizes sensitive data across your data estate. It helps organizations understand where sensitive data resides and whether it is adequately protected. This is critical for regulatory compliance (GDPR, HIPAA, CCPA) and implementing proper data governance controls. Classification identifies personal data attributes and assigns semantic and privacy categories, enabling automatic application of tags and masking policies.

---

## Lesson 1: Introduction to Data Classification

### Learning Objectives
- Understand what sensitive data classification is and why it matters
- Learn the core concepts: categories, tags, and profiles
- Recognize the supported data types and limitations
- Understand credit consumption for classification

### Key Concepts

**What is Sensitive Data Classification?**

Sensitive data classification is a feature that:
- Automatically discovers columns containing sensitive data (PII, PHI, etc.)
- Assigns classification categories to identified columns
- Applies system-defined and user-defined tags for governance
- Integrates with masking policies for automatic data protection
- Provides visibility into your data governance posture

**Why Classification Matters:**

1. **Regulatory Compliance**: GDPR, HIPAA, CCPA, and other regulations require organizations to know where personal data resides
2. **Data Protection**: Cannot protect what you do not know exists
3. **Risk Management**: Identify and prioritize sensitive data for protection
4. **Automated Governance**: Enable tag-based masking policies for scalable protection

**Core Concepts:**

| Concept | Description |
|---------|-------------|
| **Semantic Category** | Identifies the *type* of personal attribute (e.g., NAME, EMAIL, SSN) |
| **Privacy Category** | Identifies the *sensitivity* level (IDENTIFIER, QUASI_IDENTIFIER, SENSITIVE) |
| **Classification Profile** | Configuration that controls how data is classified |
| **System Tags** | SNOWFLAKE.CORE.SEMANTIC_CATEGORY and SNOWFLAKE.CORE.PRIVACY_CATEGORY |

**Privacy Categories Explained:**

1. **IDENTIFIER**: Data that directly identifies an individual
   - Examples: SSN, email address, passport number, phone number
   - Highest risk if exposed

2. **QUASI_IDENTIFIER**: Data that can indirectly identify when combined with other data
   - Examples: Age, gender, zip code, birth date
   - Risk when combined with other attributes

3. **SENSITIVE**: Personal but non-identifying information
   - Examples: Salary, race, religion
   - Confidential but does not directly identify

### Supported Data Types

Classification supports the following column data types:
- VARCHAR (TEXT, STRING)
- NUMBER (INT, FLOAT, etc.)
- DATE
- TIMESTAMP

**Not Supported:**
- VARIANT (semi-structured data)
- BINARY
- GEOGRAPHY
- OBJECT
- ARRAY

### Credit Consumption

- Classification uses **serverless compute resources** and incurs credit charges
- Views (non-materialized) may incur additional costs as the underlying query is executed
- By default, views are excluded from classification to control costs
- Materialized views do not incur these additional costs

**Monitoring Credits:**
```sql
-- Hourly classification costs
SELECT *
FROM SNOWFLAKE.ACCOUNT_USAGE.METERING_HISTORY
WHERE service_type = 'SENSITIVE_DATA_CLASSIFICATION';

-- Daily classification costs
SELECT *
FROM SNOWFLAKE.ACCOUNT_USAGE.METERING_DAILY_HISTORY
WHERE service_type = 'SENSITIVE_DATA_CLASSIFICATION';
```

### Limitations

| Limitation | Value |
|------------|-------|
| Classification profiles per database | 1,000 max |
| Schemas directly associated with a profile | 10,000 max |
| Shared tables (consumer side) | Not supported |
| Reader accounts | Classification profiles cannot be set |

### Important Terms/Definitions

- **Sensitive Data Classification**: Feature that discovers and categorizes personal data
- **Semantic Category**: Classification of *what type* of data (NAME, EMAIL, etc.)
- **Privacy Category**: Classification of *sensitivity level* (IDENTIFIER, QUASI_IDENTIFIER, SENSITIVE)
- **Classification Profile**: Configuration object controlling classification behavior
- **Trust Center**: Web interface in Snowsight for managing classification

### Exam Tips

- Data classification requires **Enterprise Edition or higher**
- Two types of categories: semantic (what it is) and privacy (how sensitive)
- Three privacy categories: IDENTIFIER, QUASI_IDENTIFIER, SENSITIVE
- Classification uses serverless compute (incurs credits)
- Views are excluded from classification by default
- Classification does NOT work on shared tables from the consumer side
- Cannot set classification profiles on reader accounts

### Practice Questions

1. **Question**: What Snowflake edition is required for sensitive data classification?
   - A) Standard Edition
   - B) Enterprise Edition
   - C) Business Critical Edition
   - D) Virtual Private Snowflake

   <details>
   <summary>Show Answer</summary>

   **Answer**: B - Sensitive data classification requires Enterprise Edition or higher.

   </details>

2. **Question**: Which privacy category represents data that can indirectly identify a person when combined with other data?
   - A) IDENTIFIER
   - B) QUASI_IDENTIFIER
   - C) SENSITIVE
   - D) PARTIAL_IDENTIFIER

   <details>
   <summary>Show Answer</summary>

   **Answer**: B - QUASI_IDENTIFIER represents data like age, gender, or zip code that can identify individuals when combined with other attributes.

   </details>

3. **Question**: What type of compute does sensitive data classification use?
   - A) Virtual warehouse compute
   - B) Cloud services compute only
   - C) Serverless compute
   - D) No compute required

   <details>
   <summary>Show Answer</summary>

   **Answer**: C - Classification uses serverless compute resources and incurs credit charges accordingly.

   </details>

---

## Lesson 2: Native Semantic Categories

### Learning Objectives
- Learn the built-in semantic categories provided by Snowflake
- Understand semantic subcategories for locale-specific data
- Recognize examples of each privacy category
- Identify common data types and their classifications

### Key Concepts

**About Semantic Subcategories**

When Snowflake identifies sensitive data specific to a locale, it assigns a semantic subcategory. Subcategories are prefixed with the two-letter ISO 3166-1 alpha-2 country code.

Example: A US Social Security Number is classified as:
- Semantic category: `NATIONAL_IDENTIFIER`
- Semantic subcategory: `US_SSN`

**Identifier Categories (Direct Identifiers)**

| Semantic Category | Description | Example Subcategories |
|-------------------|-------------|----------------------|
| EMAIL | Email address | - |
| NAME | Personal name | - |
| PHONE_NUMBER | Phone number | US_PHONE_NUMBER, UK_PHONE_NUMBER, CA_PHONE_NUMBER |
| NATIONAL_IDENTIFIER | National ID (SSN, etc.) | US_SSN, UK_NHS_NUMBER, CA_SIN |
| PASSPORT | Passport number | US_PASSPORT, CA_PASSPORT, DE_PASSPORT |
| IP_ADDRESS | IP address | - |
| STREET_ADDRESS | Physical address | US_STREET_ADDRESS, CA_STREET_ADDRESS |
| TAX_IDENTIFIER | Tax ID (individual) | US_TAX_IDENTIFIER (ITIN) |
| ORGANIZATION_IDENTIFIER | Organization IDs | - |

**Quasi-Identifier Categories (Indirect Identifiers)**

| Semantic Category | Description | Notes |
|-------------------|-------------|-------|
| AGE | Age in years | - |
| GENDER | Gender | - |
| DATE_OF_BIRTH | Birth date | - |
| ETHNICITY | Ethnicity/race | - |
| MARITAL_STATUS | Marital status | - |
| GEOGRAPHIC_REGION | Geographic area | - |
| TAX_IDENTIFIER | EIN (company) | EMPLOYER_IDENTIFICATION_NUMBER subcategory |

**Important**: The same semantic category (TAX_IDENTIFIER) can be either an IDENTIFIER or QUASI_IDENTIFIER based on the subcategory:
- US_TAX_IDENTIFIER (ITIN) = IDENTIFIER (individual)
- EMPLOYER_IDENTIFICATION_NUMBER = QUASI_IDENTIFIER (company)

**Sensitive Categories (Non-Identifying Personal Data)**

| Semantic Category | Description |
|-------------------|-------------|
| SALARY | Salary/compensation information |
| OTHER | Other sensitive data not fitting other categories |

### Compliance Category Mappings

The Trust Center dashboard maps semantic categories to compliance categories:

| Compliance Category | Examples of Semantic Categories |
|--------------------|--------------------------------|
| PII (Personally Identifiable Information) | NAME, EMAIL, PHONE_NUMBER, STREET_ADDRESS |
| PHI (Protected Health Information) | Health-related identifiers, medical codes |
| Financial Data | TAX_IDENTIFIER, SALARY |
| Sensitive Personal Data | ETHNICITY, GENDER, AGE |

### Important Terms/Definitions

- **Semantic Category**: The type of sensitive data (NAME, EMAIL, etc.)
- **Semantic Subcategory**: Locale-specific variation (US_SSN, UK_NHS_NUMBER)
- **Native Category**: Built-in categories provided by Snowflake
- **Custom Category**: User-defined categories for organization-specific data

### Exam Tips

- Semantic subcategories use ISO country codes (US_, UK_, CA_, etc.)
- Same semantic category can have different privacy levels based on subcategory
- TAX_IDENTIFIER is IDENTIFIER for individuals (ITIN) but QUASI_IDENTIFIER for companies (EIN)
- EMAIL, NAME, and PHONE_NUMBER are common IDENTIFIER categories
- AGE, GENDER, and DATE_OF_BIRTH are QUASI_IDENTIFIER categories
- SALARY is a SENSITIVE category (not IDENTIFIER or QUASI_IDENTIFIER)

### Practice Questions

1. **Question**: A column containing US Social Security Numbers would be classified with which semantic category and subcategory?
   - A) SSN / US_SSN
   - B) NATIONAL_IDENTIFIER / US_SSN
   - C) TAX_IDENTIFIER / US_SSN
   - D) IDENTIFIER / SSN

   <details>
   <summary>Show Answer</summary>

   **Answer**: B - Social Security Numbers are classified under the NATIONAL_IDENTIFIER semantic category with the US_SSN subcategory.

   </details>

2. **Question**: Which of the following is classified as a QUASI_IDENTIFIER?
   - A) Email address
   - B) Phone number
   - C) Age
   - D) Passport number

   <details>
   <summary>Show Answer</summary>

   **Answer**: C - Age is a QUASI_IDENTIFIER because it can indirectly identify a person when combined with other data. Email, phone number, and passport number are direct IDENTIFIERS.

   </details>

3. **Question**: What privacy category is SALARY classified under?
   - A) IDENTIFIER
   - B) QUASI_IDENTIFIER
   - C) SENSITIVE
   - D) CONFIDENTIAL

   <details>
   <summary>Show Answer</summary>

   **Answer**: C - SALARY is classified as SENSITIVE because it is personal but non-identifying information.

   </details>

---

## Lesson 3: Classification Tags and Profiles

### Learning Objectives
- Understand system-defined classification tags
- Learn how to create and configure classification profiles
- Master tag mapping between system and user-defined tags
- Understand the automatic classification workflow

### Key Concepts

**System-Defined Classification Tags**

Snowflake provides two system tags for classification:

| System Tag | Purpose | Example Value |
|------------|---------|---------------|
| SNOWFLAKE.CORE.SEMANTIC_CATEGORY | Identifies the type of data | 'NAME', 'EMAIL', 'PHONE_NUMBER' |
| SNOWFLAKE.CORE.PRIVACY_CATEGORY | Identifies the sensitivity | 'IDENTIFIER', 'QUASI_IDENTIFIER', 'SENSITIVE' |

**Classification Profiles**

A classification profile defines:
- How long a table should exist before classification (minimum_object_age_for_classification_days)
- How often to reclassify data (maximum_classification_validity_days)
- Whether to auto-apply tags or just recommend them (auto_tag)
- Whether to classify views (classify_views)
- Tag mappings between system and user-defined tags
- Custom classifiers to use

**Creating a Classification Profile:**
```sql
CREATE OR REPLACE SNOWFLAKE.DATA_PRIVACY.CLASSIFICATION_PROFILE
  my_classification_profile(
    OPTIONS => '{
      "minimum_object_age_for_classification_days": 0,
      "maximum_classification_validity_days": 30,
      "auto_tag": true,
      "classify_views": true
    }'
  );
```

**Profile Options Explained:**

| Option | Description | Default |
|--------|-------------|---------|
| minimum_object_age_for_classification_days | Days to wait before classifying new tables | - |
| maximum_classification_validity_days | Days before reclassification | - |
| auto_tag | Automatically apply tags vs recommend | false |
| classify_views | Include views in classification | false |
| enable_tag_based_sensitive_data_exclusion | Honor SKIP_SENSITIVE_DATA_CLASSIFICATION tag | false |

**Tag Mapping**

Map system classification tags to user-defined tags for automatic application:

```sql
-- Add tag mapping to existing profile
CALL my_classification_profile!SET_TAG_MAP(
  '[
    {"semantic_category": "EMAIL", "tag_name": "governance_db.tags.pii", "tag_value": "CONFIDENTIAL"},
    {"semantic_category": "NAME", "tag_name": "governance_db.tags.pii", "tag_value": "CONFIDENTIAL"}
  ]'
);
```

When a column is classified as EMAIL, both:
1. SNOWFLAKE.CORE.SEMANTIC_CATEGORY = 'EMAIL' (system tag)
2. governance_db.tags.pii = 'CONFIDENTIAL' (user-defined tag via mapping)

**Setting a Profile on a Database:**
```sql
ALTER DATABASE my_db
  SET CLASSIFICATION_PROFILE = 'governance_db.classify_sch.my_profile';
```

**Setting a Profile on a Schema (Overrides Database):**
```sql
ALTER SCHEMA my_db.my_schema
  SET CLASSIFICATION_PROFILE = 'governance_db.classify_sch.different_profile';
```

### Access Control Requirements

| Action | Required Privilege/Role |
|--------|------------------------|
| Create classification profile | SNOWFLAKE.CLASSIFICATION_ADMIN database role + CREATE SNOWFLAKE.DATA_PRIVACY.CLASSIFICATION_PROFILE on schema |
| Set profile on database/schema | EXECUTE AUTO CLASSIFICATION on database/schema |
| Call profile methods | <profile>!PRIVACY_USER instance role |
| Drop classification profile | OWNERSHIP on profile instance |

**Granting Privileges:**
```sql
-- Grant ability to auto-classify database
GRANT EXECUTE AUTO CLASSIFICATION ON DATABASE mydb TO ROLE data_engineer;

-- Grant classification admin role
GRANT DATABASE ROLE SNOWFLAKE.CLASSIFICATION_ADMIN TO ROLE data_engineer;

-- Grant ability to create profile in schema
GRANT CREATE SNOWFLAKE.DATA_PRIVACY.CLASSIFICATION_PROFILE ON SCHEMA mydb.sch TO ROLE data_engineer;
```

### Important Terms/Definitions

- **Classification Profile**: Configuration controlling how and when data is classified
- **Tag Mapping**: Association between system classification tags and user-defined tags
- **auto_tag**: Profile option that enables automatic tag application (vs. recommendations)
- **EXECUTE AUTO CLASSIFICATION**: Privilege required to enable classification on database/schema

### Exam Tips

- There is a **one-hour delay** between setting a profile and classification starting
- Schema-level profiles **override** database-level profiles
- System tags are SNOWFLAKE.CORE.SEMANTIC_CATEGORY and SNOWFLAKE.CORE.PRIVACY_CATEGORY
- Tag mappings allow automatic application of user-defined tags based on classification results
- EXECUTE AUTO CLASSIFICATION privilege is required to set a profile
- The database owner has EXECUTE AUTO CLASSIFICATION by default

### Practice Questions

1. **Question**: What is the delay between setting a classification profile on a database and Snowflake beginning classification?
   - A) Immediate
   - B) 15 minutes
   - C) 1 hour
   - D) 24 hours

   <details>
   <summary>Show Answer</summary>

   **Answer**: C - There is a one-hour delay between setting the classification profile and Snowflake beginning to classify the database.

   </details>

2. **Question**: If a classification profile is set on both a database and a schema within that database, which profile is used for tables in that schema?
   - A) The database profile
   - B) The schema profile
   - C) Both profiles are merged
   - D) Neither profile is used

   <details>
   <summary>Show Answer</summary>

   **Answer**: B - The schema-level profile overrides the database-level profile for tables within that schema.

   </details>

3. **Question**: Which system tag stores the semantic category value after classification?
   - A) SNOWFLAKE.CORE.CLASSIFICATION_CATEGORY
   - B) SNOWFLAKE.CORE.SEMANTIC_CATEGORY
   - C) SNOWFLAKE.CORE.DATA_CATEGORY
   - D) SNOWFLAKE.CORE.SENSITIVE_CATEGORY

   <details>
   <summary>Show Answer</summary>

   **Answer**: B - SNOWFLAKE.CORE.SEMANTIC_CATEGORY is the system tag that stores the semantic category value (e.g., 'NAME', 'EMAIL').

   </details>

---

## Lesson 4: Custom Classifiers

### Learning Objectives
- Learn how to create custom classifiers for organization-specific data
- Understand the CUSTOM_CLASSIFIER class and methods
- Master regular expression-based classification
- Understand threshold and scoring for custom categories

### Key Concepts

**What are Custom Classifiers?**

Custom classifiers extend classification to identify sensitive data specific to your organization that is not covered by native categories. Examples:
- Employee IDs
- Medical codes (ICD-10, CPT)
- Internal account numbers
- Product codes with PII implications

**Creating a Custom Classifier:**
```sql
-- Create the custom classifier instance
CREATE OR REPLACE SNOWFLAKE.DATA_PRIVACY.CUSTOM_CLASSIFIER medical_codes();

-- Verify creation
SHOW SNOWFLAKE.DATA_PRIVACY.CUSTOM_CLASSIFIER;
```

**Adding Categories with Regular Expressions:**
```sql
CALL medical_codes!ADD_REGEX(
  'ICD_CODE',                    -- Custom semantic category name
  'IDENTIFIER',                   -- Privacy category
  '[A-TV-Z][0-9][0-9AB]\\.[0-9A-TV-Z]{0,4}',  -- Regex pattern
  'ICD-10 medical diagnostic code',           -- Description
  0.8                             -- Threshold (optional, default 0.8)
);
```

**Parameters for ADD_REGEX:**

| Parameter | Description |
|-----------|-------------|
| semantic_category | Name for your custom category |
| privacy_category | IDENTIFIER, QUASI_IDENTIFIER, or SENSITIVE |
| regex | Regular expression to match data |
| description | Human-readable description |
| threshold | Match percentage required (default 0.8 = 80%) |

**How the Scoring Algorithm Works:**

1. Snowflake samples data from the column
2. Each sample value is tested against the regex
3. Match percentage is calculated
4. If match percentage >= threshold, category is assigned
5. If multiple classifiers match, ties are resolved by:
   - Higher match percentage
   - Alphabetical order of category names

**Listing Custom Categories:**
```sql
-- List categories in a custom classifier
SELECT medical_codes!LIST();
```

**Removing Categories:**
```sql
-- Delete a specific category
CALL medical_codes!DELETE_CATEGORY('ICD_CODE');

-- Drop the entire custom classifier
DROP SNOWFLAKE.DATA_PRIVACY.CUSTOM_CLASSIFIER data.classifiers.medical_codes;
```

**Adding Custom Classifiers to a Profile:**
```sql
-- Add custom classifiers to classification profile
CALL my_classification_profile!SET_CUSTOM_CLASSIFIERS(
  '["mydb.myschema.medical_codes", "mydb.myschema.employee_ids"]'
);
```

### Access Control for Custom Classifiers

| Action | Required |
|--------|----------|
| Create custom classifier | CREATE SNOWFLAKE.DATA_PRIVACY.CUSTOM_CLASSIFIER on schema |
| Call ADD_REGEX, LIST | <custom_classifier>!PRIVACY_USER instance role |
| Drop custom classifier | OWNERSHIP on instance |

**Granting Instance Role:**
```sql
GRANT SNOWFLAKE.DATA_PRIVACY.CUSTOM_CLASSIFIER ROLE
  mydb.myschema.medical_codes!PRIVACY_USER
  TO ROLE data_engineer;
```

### Replication and Cloning

- Custom classifier instances are **replicated** when you replicate a database
- Custom classifier instances are **cloned** when you clone the schema containing them
- Classification profiles store the **definition** of custom classifiers, not a reference
- If you modify a custom classifier, you must call SET_CUSTOM_CLASSIFIERS again to update the profile

### Important Terms/Definitions

- **CUSTOM_CLASSIFIER**: Class for creating custom classification categories
- **ADD_REGEX**: Method to add a regex-based category to a custom classifier
- **Threshold**: Minimum percentage of data that must match the regex (default 80%)
- **Instance Role**: Role for managing a specific custom classifier instance

### Exam Tips

- Custom classifiers use **regular expressions** to identify data patterns
- Default threshold is **80%** (0.8) - 80% of sampled data must match
- Changes to custom classifiers require calling SET_CUSTOM_CLASSIFIERS to update profiles
- Custom classifiers are **cloned** with schema and **replicated** with database
- Three privacy categories available: IDENTIFIER, QUASI_IDENTIFIER, SENSITIVE
- Use the !PRIVACY_USER instance role to manage custom classifiers

### Practice Questions

1. **Question**: What is the default threshold for a custom classifier to classify a column?
   - A) 50%
   - B) 70%
   - C) 80%
   - D) 90%

   <details>
   <summary>Show Answer</summary>

   **Answer**: C - The default threshold is 80% (0.8), meaning 80% of the sampled data must match the regex pattern for the category to be assigned.

   </details>

2. **Question**: After modifying a custom classifier, what must you do to update a classification profile that uses it?
   - A) Nothing, changes are automatic
   - B) Drop and recreate the profile
   - C) Call SET_CUSTOM_CLASSIFIERS again
   - D) Restart the classification service

   <details>
   <summary>Show Answer</summary>

   **Answer**: C - Classification profiles store the definition of custom classifiers, not a reference. You must call SET_CUSTOM_CLASSIFIERS to update the profile with the new definition.

   </details>

3. **Question**: Which method adds a category to a custom classifier?
   - A) CREATE_CATEGORY
   - B) ADD_CATEGORY
   - C) ADD_REGEX
   - D) INSERT_PATTERN

   <details>
   <summary>Show Answer</summary>

   **Answer**: C - The ADD_REGEX method adds a category with its regex pattern to a custom classifier instance.

   </details>

---

## Lesson 5: Using Classification Results

### Learning Objectives
- Learn how to view classification results using Trust Center and SQL
- Understand how to track sensitive data with tags
- Master protecting sensitive data with masking policies
- Learn to troubleshoot classification issues

### Key Concepts

**Viewing Results in Trust Center**

The Trust Center provides a dashboard showing:
- Objects by compliance category (PII, PHI, Financial, etc.)
- Sensitive data masking status (fully masked, partially masked, not masked)
- Classification coverage across databases

Access: Snowsight > Governance & Security > Trust Center > Data Security tab

**Viewing Results with SQL:**
```sql
-- Get classification results for a table
CALL SYSTEM$GET_CLASSIFICATION_RESULT('mydb.sch.t1');

-- Query the Account Usage views (up to 3 hours latency)
SELECT *
FROM SNOWFLAKE.ACCOUNT_USAGE.TAG_REFERENCES
WHERE TAG_NAME = 'SEMANTIC_CATEGORY'
  AND TAG_DATABASE = 'SNOWFLAKE'
  AND TAG_SCHEMA = 'CORE';
```

**Getting Tag Values:**
```sql
-- Get semantic category for a specific column
SELECT SYSTEM$GET_TAG(
  'SNOWFLAKE.CORE.SEMANTIC_CATEGORY',
  'mydb.myschema.mytable.email_column',
  'COLUMN'
);
```

**Masking Status Categories:**

| Status | Definition |
|--------|------------|
| Fully Masked | Every sensitive column has a masking policy |
| Partially Masked | Some but not all sensitive columns have masking policies |
| Not Masked | No sensitive columns have masking policies |

**Protecting Sensitive Data**

Combine classification with masking policies:

1. **Direct Masking**: Manually apply masking policies to classified columns
2. **Tag-Based Masking**: Attach masking policy to a tag for automatic application

```sql
-- Create tag-based masking policy (Enterprise Edition)
ALTER TAG governance_db.tags.pii SET MASKING POLICY mask_pii_policy;
```

When classification applies the pii tag (via tag mapping), the masking policy is automatically applied.

**Excluding Data from Classification**

Use the SKIP_SENSITIVE_DATA_CLASSIFICATION system tag:

```sql
-- Exclude a schema
ALTER SCHEMA my_schema SET TAG SNOWFLAKE.CORE.SKIP_SENSITIVE_DATA_CLASSIFICATION = 'TRUE';

-- Exclude a table
ALTER TABLE my_table SET TAG SNOWFLAKE.CORE.SKIP_SENSITIVE_DATA_CLASSIFICATION = 'TRUE';

-- Exclude a column
ALTER TABLE my_table ALTER COLUMN my_column
  SET TAG SNOWFLAKE.CORE.SKIP_SENSITIVE_DATA_CLASSIFICATION = 'TRUE';
```

**Important**: The exclusion tag only works if `enable_tag_based_sensitive_data_exclusion` is enabled in the classification profile.

### Troubleshooting Classification

Common errors and their meanings:

| Error | Meaning |
|-------|---------|
| NO_TAGGING_PRIVILEGE | Role lacks privilege to apply tags |
| MANUALLY_APPLIED_VALUE_PRESENT | Conflict with manually applied tag |
| TAG_NOT_ACCESSIBLE_OR_AUTHORIZED | Tag not accessible or role unauthorized |

**Querying Errors:**
```sql
-- List general classification errors
SELECT
  parse_json(value) error_message
FROM SNOWFLAKE.ACCOUNT_USAGE.EVENT_TABLE,
  LATERAL FLATTEN(INPUT => record_content)
WHERE RECORD_ATTRIBUTES:"event_type" = 'CLASSIFICATION_ERROR';

-- List errors for a specific table
SELECT
  parse_json(value):"error_message" error_message,
  parse_json(value):"object_name" object_name
FROM SNOWFLAKE.ACCOUNT_USAGE.EVENT_TABLE,
  LATERAL FLATTEN(INPUT => record_content)
WHERE RECORD_ATTRIBUTES:"event_type" = 'CLASSIFICATION_ERROR'
  AND parse_json(value):"object_name" = 'mydb.myschema.mytable';
```

### Important Terms/Definitions

- **SYSTEM$GET_CLASSIFICATION_RESULT**: Function to retrieve classification results for a table
- **SYSTEM$GET_TAG**: Function to get tag value for a specific object
- **SKIP_SENSITIVE_DATA_CLASSIFICATION**: System tag to exclude objects from classification
- **Tag-based Masking**: Masking policy attached to a tag (automatically protects tagged columns)

### Exam Tips

- Results may not appear until **3 hours** after classification completes
- Use SYSTEM$GET_CLASSIFICATION_RESULT to view results immediately (no 3-hour delay)
- Tag-based masking policies require **Enterprise Edition**
- SKIP_SENSITIVE_DATA_CLASSIFICATION tag value must be **'TRUE'** (string)
- Must enable `enable_tag_based_sensitive_data_exclusion` in profile for skip tag to work
- Query TAG_REFERENCES view to see all classified columns across the account

### Practice Questions

1. **Question**: How long after classification completes might results take to appear in Account Usage views?
   - A) Immediately
   - B) 1 hour
   - C) Up to 3 hours
   - D) 24 hours

   <details>
   <summary>Show Answer</summary>

   **Answer**: C - Results might not appear in Account Usage views until up to 3 hours after classification completes. Use SYSTEM$GET_CLASSIFICATION_RESULT for immediate results.

   </details>

2. **Question**: What value must the SKIP_SENSITIVE_DATA_CLASSIFICATION tag have to exclude an object?
   - A) 1
   - B) TRUE (boolean)
   - C) 'TRUE' (string)
   - D) 'SKIP'

   <details>
   <summary>Show Answer</summary>

   **Answer**: C - The tag value must be the string 'TRUE' to exclude the object from classification.

   </details>

3. **Question**: How can you automatically protect all columns classified as EMAIL with a masking policy?
   - A) Create a row access policy
   - B) Use tag-based masking by attaching a masking policy to the semantic category tag
   - C) Manually apply masking policies to each column
   - D) Create a projection policy

   <details>
   <summary>Show Answer</summary>

   **Answer**: B - Use tag mapping to apply a user-defined tag when EMAIL is detected, then attach a masking policy to that tag. All columns classified as EMAIL will automatically be masked.

   </details>

---

## Lesson 6: Setting Up Classification with Trust Center

### Learning Objectives
- Learn to configure classification using the Snowsight web interface
- Understand the step-by-step setup process
- Master advanced classification settings
- Know the access control requirements for Trust Center

### Key Concepts

**Trust Center Overview**

The Trust Center is accessed via: Snowsight > Governance & Security > Trust Center > Data Security tab

It provides a web interface to:
- Set up and configure classification
- View classification results and governance posture
- Monitor masking coverage
- Manage classification profiles

**Basic Setup Process:**

1. Sign in to Snowsight with required privileges
2. Navigate to Governance & Security > Trust Center
3. Select the Data Security tab
4. Select "Get started"
5. In the dialog:
   - Select databases to monitor
   - Choose whether to auto-apply tags or just recommend
6. Select Enable

**Advanced Settings:**

For more granular control:
1. Go to Trust Center > Data Security > Settings
2. Edit existing profile or Create New profile
3. Configure:
   - Databases to monitor
   - Whether to classify views
   - Auto-apply tags setting
   - Tag mappings (system to user-defined tags)
   - Custom classifiers to include
   - Exclusion criteria
4. Select Enable

**Access Control Requirements for Trust Center:**

| Action | Required |
|--------|----------|
| Set up classification | SNOWFLAKE.TRUST_CENTER_ADMIN application role OR ACCOUNTADMIN OR DATA_SECURITY_ADMIN |
| View results | SNOWFLAKE.TRUST_CENTER_VIEWER application role OR DATA_SECURITY_VIEWER |
| Set profile on database | At least one privilege on the database |

**Example: Grant View-Only Access:**
```sql
-- Allow joe to view classification findings only
GRANT APPLICATION ROLE SNOWFLAKE.TRUST_CENTER_VIEWER TO USER joe;
```

**Monitoring Which Databases Are Classified:**

In Trust Center:
1. Go to Governance & Security > Trust Center
2. Find the "Databases monitored by classification" tile
3. Select "Monitored" or "Not monitored" to view lists

**Partially Monitored Databases:**
A database is partially monitored if:
- SQL was used to set a classification profile directly on a schema
- Instead of setting the profile at the database level

### Important Terms/Definitions

- **Trust Center**: Snowsight interface for governance including classification
- **Data Security tab**: Section of Trust Center for classification management
- **TRUST_CENTER_ADMIN**: Application role for managing Trust Center settings
- **TRUST_CENTER_VIEWER**: Application role for viewing Trust Center data
- **DATA_SECURITY_ADMIN/VIEWER**: Alternative roles for classification access

### Exam Tips

- Trust Center is accessed via Snowsight (not Classic Console)
- Path: Governance & Security > Trust Center > Data Security
- Default setup creates a profile and applies it to selected databases
- Use "Settings" for advanced configuration (custom classifiers, tag mappings)
- TRUST_CENTER_ADMIN or ACCOUNTADMIN required to set up classification
- TRUST_CENTER_VIEWER allows viewing results without setup privileges

### Practice Questions

1. **Question**: Where in Snowsight is the Trust Center located?
   - A) Admin > Security > Trust Center
   - B) Governance & Security > Trust Center
   - C) Data > Classifications > Trust Center
   - D) Account > Trust Center

   <details>
   <summary>Show Answer</summary>

   **Answer**: B - The Trust Center is located under Governance & Security > Trust Center in the Snowsight navigation menu.

   </details>

2. **Question**: Which role provides view-only access to classification results in Trust Center?
   - A) SECURITYADMIN
   - B) DATA_SECURITY_ADMIN
   - C) TRUST_CENTER_VIEWER
   - D) SYSADMIN

   <details>
   <summary>Show Answer</summary>

   **Answer**: C - TRUST_CENTER_VIEWER application role provides view-only access to Trust Center including classification results.

   </details>

3. **Question**: What does it mean when a database is "partially monitored" for classification?
   - A) Only some tables in the database are being classified
   - B) Classification was set at the schema level instead of database level
   - C) Classification is paused for the database
   - D) Only some columns are being classified

   <details>
   <summary>Show Answer</summary>

   **Answer**: B - A database is partially monitored when SQL was used to set a classification profile directly on schemas within the database rather than on the database itself.

   </details>

---

## Summary: Key Concepts for the Exam

### Classification Overview
- Enterprise Edition or higher required
- Discovers sensitive data automatically
- Two categories: semantic (type) and privacy (sensitivity)
- Uses serverless compute (credit consumption)

### Privacy Categories
| Category | Description | Examples |
|----------|-------------|----------|
| IDENTIFIER | Directly identifies | SSN, Email, Phone |
| QUASI_IDENTIFIER | Indirectly identifies when combined | Age, Gender, Zip |
| SENSITIVE | Personal but non-identifying | Salary |

### System Tags
- SNOWFLAKE.CORE.SEMANTIC_CATEGORY - stores data type
- SNOWFLAKE.CORE.PRIVACY_CATEGORY - stores sensitivity level

### Classification Profiles
- Control classification behavior
- Set on database or schema (schema overrides database)
- One-hour delay before classification starts
- Support tag mapping and custom classifiers

### Custom Classifiers
- Use regex patterns to identify organization-specific data
- 80% threshold by default
- Must call SET_CUSTOM_CLASSIFIERS after modifications

### Viewing Results
- Trust Center (web interface)
- SYSTEM$GET_CLASSIFICATION_RESULT (immediate)
- Account Usage views (up to 3 hours latency)

### Protection
- Tag-based masking policies for automatic protection
- SKIP_SENSITIVE_DATA_CLASSIFICATION tag to exclude objects

### Common Exam Traps
1. Classification requires Enterprise Edition (not Standard)
2. One-hour delay before classification starts (not immediate)
3. Results may take 3 hours in Account Usage views
4. Tag value for exclusion is string 'TRUE' not boolean
5. Changes to custom classifiers require re-applying to profiles
6. TAX_IDENTIFIER can be IDENTIFIER or QUASI_IDENTIFIER depending on subcategory
