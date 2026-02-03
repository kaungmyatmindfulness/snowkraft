# Domain 6: Data Protection & Sharing - External Tokenization

## Overview

External Tokenization is a Column-level Security feature that enables organizations to tokenize sensitive data before loading it into Snowflake and detokenize it at query runtime using external tokenization providers. This approach ensures that sensitive data is never exposed in its raw form within Snowflake.

**Exam Weight**: Domain 6 (Data Protection & Sharing) accounts for 5-10% of the SnowPro Core exam.

---

## 1. What is External Tokenization?

### Definition

**Tokenization** is the process of replacing sensitive data with an undecipherable token (a surrogate value) that has no exploitable meaning. Unlike encryption, tokens cannot be mathematically reversed to obtain the original value - they require a token vault lookup.

External Tokenization in Snowflake combines:
- **Masking Policies**: Schema-level objects that control data visibility
- **External Functions**: UDFs that call third-party tokenization providers
- **Tokenization Providers**: External systems that manage the token vault

### How It Works

```
+-------------------+     +-----------------+     +------------------+
|   DATA SOURCE     |     |    SNOWFLAKE    |     | TOKEN PROVIDER   |
|                   |     |                 |     |                  |
|  Raw: "John Doe"  | --> | Stored: "XK9F2" | --> | Lookup: XK9F2    |
|                   |     | (tokenized)     |     | Return: "John"   |
+-------------------+     +-----------------+     +------------------+
```

### Data Flow

1. **Pre-load Tokenization**: Data is tokenized by the provider BEFORE loading into Snowflake
2. **Storage**: Only tokenized values are stored in Snowflake tables
3. **Query Runtime**: Masking policy with external function calls the provider to detokenize
4. **Access Control**: Only authorized roles see the detokenized (original) values

---

## 2. External Tokenization vs Dynamic Data Masking

Understanding the differences between these two Column-level Security features is critical for the exam.

### Feature Comparison

| Aspect | Dynamic Data Masking | External Tokenization |
|--------|---------------------|----------------------|
| **Data Storage** | Plain-text data stored in Snowflake | Tokenized data stored in Snowflake |
| **Third-party Required** | No | Yes (tokenization provider) |
| **Native to Snowflake** | Yes | Requires external function |
| **Data Security** | Masked at query time | Never stored in plain text |
| **Performance** | Faster (no external calls) | Slower (external API calls) |
| **Use with Data Sharing** | Supported | Not supported |
| **Referential Integrity** | Not preserved | Preserved (consistent tokens) |
| **GROUP BY Operations** | Returns masked results | Works on tokenized values |

### When to Choose External Tokenization

| Use Case | Recommended Feature |
|----------|-------------------|
| Regulatory requirement to never store plain-text PII | External Tokenization |
| Need to GROUP BY or aggregate on sensitive data | External Tokenization |
| Need to share masked data with consumers | Dynamic Data Masking |
| Cost-sensitive environment | Dynamic Data Masking |
| Need referential integrity across tables | External Tokenization |
| Simple masking requirements | Dynamic Data Masking |

### Key Benefit: Referential Integrity

Since tokenization provides a **unique, consistent value** for a given input, you can:
- Join tables on tokenized columns
- Group records by tokenized values without revealing sensitive data
- Maintain referential integrity across the data warehouse

**Example**: A medical diagnosis code tokenized as `TK-7829` always maps to the same original code, allowing analysts to count patients by diagnosis without seeing the actual medical codes.

---

## 3. Architecture Overview

### Component Architecture

```
+===========================================================================+
|                    EXTERNAL TOKENIZATION ARCHITECTURE                      |
+===========================================================================+
|                                                                           |
|  SNOWFLAKE ACCOUNT                                                        |
|  +---------------------------------------------------------------------+  |
|  |                                                                     |  |
|  |  +-------------+     +------------------+     +------------------+  |  |
|  |  |   TABLE     |     |  MASKING POLICY  |     | EXTERNAL         |  |  |
|  |  | (tokenized  | --> | (calls external  | --> | FUNCTION         |  |
|  |  |   data)     |     |   function)      |     | (de_token())     |  |
|  |  +-------------+     +------------------+     +------------------+  |  |
|  |                                                      |              |  |
|  +------------------------------------------------------|-------------+  |
|                                                         |                 |
|  +------------------------------------------------------|-------------+  |
|  |  API INTEGRATION                                     |              |  |
|  |  (Connects Snowflake to cloud services)              |              |  |
|  +------------------------------------------------------|-------------+  |
|                                                         |                 |
+=========================================================|=================+
                                                          |
                                                          v
+===========================================================================+
|                         CLOUD PROVIDER                                     |
+===========================================================================+
|                                                                           |
|  +------------------------+          +---------------------------+        |
|  |    PROXY SERVICE       |          |   TOKENIZATION PROVIDER   |        |
|  |  (API Gateway/Lambda/  | -------> |   (Protegrity, ALTR,      |        |
|  |   Azure Function/      |          |    Thales, etc.)          |        |
|  |   Cloud Function)      |          +---------------------------+        |
|  +------------------------+                                               |
|                                                                           |
+===========================================================================+
```

### Key Components

| Component | Description |
|-----------|-------------|
| **Masking Policy** | Schema-level object containing the external function call |
| **External Function** | UDF that invokes the remote tokenization service |
| **API Integration** | Connects Snowflake to cloud API gateway services |
| **Proxy Service** | Cloud-hosted gateway (Lambda, Azure Function, Cloud Function) |
| **Token Provider** | Third-party service managing the token vault |

### Cloud Platform Support

| Cloud Provider | Proxy Service | Integration Method |
|----------------|---------------|-------------------|
| **AWS** | API Gateway + Lambda | API Integration |
| **Azure** | Azure API Management + Azure Functions | API Integration |
| **Google Cloud** | Cloud Endpoints + Cloud Functions | API Integration |

---

## 4. Partner Integrations

Snowflake supports numerous third-party tokenization providers that integrate with External Tokenization.

### Certified Partners

| Partner | Specialty |
|---------|-----------|
| **ALTR** | Data tokenization and access governance |
| **Baffle** | Data-centric protection and tokenization |
| **Comforte** | Data security and tokenization platform |
| **Fortanix** | Data Security Manager with tokenization |
| **MicroFocus CyberRes Voltage** | Format-preserving encryption and tokenization |
| **Protegrity** | Enterprise data protection platform |
| **Privacera** | Data governance and security |
| **Skyflow** | Data privacy vault |
| **Thales** | CipherTrust data protection |

### Partner vs Custom Integration

| Approach | Pros | Cons |
|----------|------|------|
| **Partner Integration** | Pre-built, tested, supported | Vendor lock-in, cost |
| **Custom Integration** | Full control, flexibility | Development effort, maintenance |

---

## 5. Implementation Steps

### Step 1: Create External Function

The external function connects to your tokenization provider through a proxy service.

```sql
-- Create API Integration (connects to cloud API gateway)
CREATE OR REPLACE API INTEGRATION tokenization_api
  API_PROVIDER = aws_api_gateway
  API_AWS_ROLE_ARN = 'arn:aws:iam::123456789012:role/snowflake-role'
  API_ALLOWED_PREFIXES = ('https://abc123.execute-api.us-east-1.amazonaws.com/')
  ENABLED = TRUE;

-- Create External Function for detokenization
CREATE OR REPLACE EXTERNAL FUNCTION de_email(token VARCHAR)
  RETURNS VARCHAR
  API_INTEGRATION = tokenization_api
  AS 'https://abc123.execute-api.us-east-1.amazonaws.com/prod/detokenize';
```

### Step 2: Grant Masking Policy Privileges

Create a custom role for managing tokenization policies.

```sql
-- Create masking admin role
USE ROLE USERADMIN;
CREATE ROLE masking_admin;

-- Grant necessary privileges
USE ROLE SECURITYADMIN;
GRANT USAGE ON DATABASE security_db TO ROLE masking_admin;
GRANT USAGE ON SCHEMA security_db.policies TO ROLE masking_admin;

-- Grant masking policy privileges
GRANT CREATE MASKING POLICY ON SCHEMA security_db.policies TO ROLE masking_admin;
GRANT APPLY MASKING POLICY ON ACCOUNT TO ROLE masking_admin;
```

### Step 3: Create the Masking Policy

The masking policy uses conditional logic to determine who sees detokenized data.

```sql
-- Create masking policy for tokenized email
CREATE OR REPLACE MASKING POLICY email_de_token
  AS (val STRING) RETURNS STRING ->
  CASE
    WHEN CURRENT_ROLE() IN ('ANALYST', 'DATA_SCIENTIST') THEN de_email(val)
    ELSE val  -- Returns tokenized value
  END;
```

### Step 4: Apply Policy to Column

Apply the masking policy to the column containing tokenized data.

```sql
-- Apply to table column
ALTER TABLE customer_data
  MODIFY COLUMN email
  SET MASKING POLICY email_de_token;

-- Apply to view column
ALTER VIEW customer_view
  MODIFY COLUMN email
  SET MASKING POLICY email_de_token;
```

### Step 5: Test the Implementation

```sql
-- Test with authorized role (sees detokenized data)
USE ROLE ANALYST;
SELECT email FROM customer_data LIMIT 5;
-- Result: john.doe@example.com, jane.smith@example.com, ...

-- Test with unauthorized role (sees tokenized data)
USE ROLE PUBLIC;
SELECT email FROM customer_data LIMIT 5;
-- Result: TK-8F2A9, TK-3B7C1, TK-9D4E6, ...
```

---

## 6. Privileges and Dependencies

### Required Privileges

| Role | Privilege | Object | Purpose |
|------|-----------|--------|---------|
| **Masking Admin** | CREATE MASKING POLICY | Schema | Create new policies |
| **Masking Admin** | APPLY MASKING POLICY | Account | Apply policies to columns |
| **Policy Owner** | USAGE | External Function | Use function in policy body |
| **Function Owner** | USAGE | API Integration | External function dependency |

### Privilege Flow

```
ACCOUNTADMIN
     |
     v
SECURITYADMIN  ---grants--->  MASKING_ADMIN
     |                              |
     | grants                       | owns
     v                              v
 APPLY MASKING               MASKING POLICY
 POLICY on ACCOUNT           (uses external function)
                                    |
                                    | requires
                                    v
                             EXTERNAL FUNCTION
                             (owned by function_admin)
                                    |
                                    | uses
                                    v
                             API INTEGRATION
```

### DDL Commands

| Command | Description |
|---------|-------------|
| `CREATE MASKING POLICY` | Create a new masking policy |
| `ALTER MASKING POLICY` | Modify an existing policy |
| `DROP MASKING POLICY` | Remove a masking policy |
| `DESCRIBE MASKING POLICY` | View policy definition |
| `SHOW MASKING POLICIES` | List all masking policies |

---

## 7. Key Considerations and Limitations

### Edition Requirements

| Feature | Required Edition |
|---------|-----------------|
| External Functions | Standard (or higher) |
| External Tokenization Integration | Enterprise (or higher) |

**Important**: While external functions work in Standard Edition, the full External Tokenization feature integration requires Enterprise Edition or higher.

### Limitations

| Limitation | Description |
|------------|-------------|
| **No Data Sharing** | External functions cannot be invoked in share context |
| **Performance Impact** | External API calls add latency to queries |
| **Cost** | External function calls incur compute and egress charges |
| **Availability** | Depends on tokenization provider uptime |
| **Materialized Views** | Cannot apply policy to materialized view columns |
| **Future Grants** | Not supported for masking policies |

### Best Practices

1. **System Synchronization**: Sync users/roles between IdP, Snowflake, and token provider
2. **Error Handling**: Implement robust error handling in external functions
3. **Monitoring**: Track external function usage and latency
4. **Caching**: Consider caching strategies to reduce API calls
5. **Security Review**: Regular audit of masking policy assignments

---

## 8. Auditing External Tokenization

### Monitoring Masking Policies

```sql
-- View all masking policies
SHOW MASKING POLICIES;

-- View objects with masking policies applied
SELECT *
FROM TABLE(INFORMATION_SCHEMA.POLICY_REFERENCES(
  POLICY_NAME => 'email_de_token'
));

-- View policy definition
DESCRIBE MASKING POLICY email_de_token;
```

### External Function Monitoring

```sql
-- Monitor external function calls
SELECT *
FROM TABLE(INFORMATION_SCHEMA.EXTERNAL_FUNCTIONS_USAGE(
  DATE_RANGE_START => DATEADD('day', -7, CURRENT_DATE()),
  DATE_RANGE_END => CURRENT_DATE()
));
```

---

## 9. Tag-Based External Tokenization

External tokenization policies can be assigned to tags for centralized management.

### Implementation

```sql
-- Create a classification tag
CREATE TAG pii_classification;

-- Create masking policy for PII
CREATE MASKING POLICY pii_detokenize
  AS (val STRING) RETURNS STRING ->
  CASE
    WHEN CURRENT_ROLE() IN ('ANALYST') THEN de_pii(val)
    ELSE val
  END;

-- Assign masking policy to tag
ALTER TAG pii_classification
  SET MASKING POLICY pii_detokenize;

-- Apply tag to columns (policy automatically applies)
ALTER TABLE employees
  MODIFY COLUMN ssn
  SET TAG pii_classification = 'SSN';
```

### Benefits of Tag-Based Approach

- Centralized policy management
- Consistent protection across multiple columns
- Easier compliance auditing
- Simplified policy updates

---

## 10. Exam Tips and Common Question Patterns

### Key Facts to Remember

1. **Data is tokenized BEFORE loading** into Snowflake (not at load time)
2. **External functions are required** in the masking policy body
3. **Enterprise Edition required** for full External Tokenization integration
4. **Cannot use with Data Sharing** - external functions do not work in share context
5. **Preserves referential integrity** - same input always produces same token
6. **API Integration required** - connects Snowflake to cloud proxy services
7. **Query-time detokenization** - external function called when authorized users query

### Common Exam Question Patterns

#### Pattern 1: Feature Comparison

**Q**: What is the primary advantage of External Tokenization over Dynamic Data Masking?
- A) Better query performance
- B) Sensitive data is never stored in plain text
- C) Works with Data Sharing
- D) No third-party requirements

**Answer**: B - External Tokenization ensures sensitive data is tokenized before loading, so plain-text values never exist in Snowflake.

#### Pattern 2: Edition Requirements

**Q**: Which Snowflake edition is required to integrate with a tokenization provider using External Tokenization?
- A) Standard
- B) Enterprise
- C) Business Critical
- D) Virtual Private Snowflake

**Answer**: B - Enterprise Edition is required for full External Tokenization integration, though external functions alone work in Standard.

#### Pattern 3: Architecture Components

**Q**: What is required in a masking policy body for External Tokenization?
- A) Encryption key reference
- B) External function call
- C) Token vault connection string
- D) Cloud provider credentials

**Answer**: B - Masking policies for External Tokenization must include an external function that calls the tokenization provider.

#### Pattern 4: Limitations

**Q**: Why can't External Tokenization be used with Secure Data Sharing?
- A) Tokenization providers don't support sharing
- B) External functions cannot be invoked in a share context
- C) Shared data must be encrypted, not tokenized
- D) Consumers would need access to the token vault

**Answer**: B - External functions cannot be invoked in the context of a share, making External Tokenization incompatible with Data Sharing.

#### Pattern 5: Use Cases

**Q**: A company needs to perform aggregate queries on patient diagnosis codes without exposing the actual codes. Which approach should they use?
- A) Dynamic Data Masking with SHA-256 hash
- B) External Tokenization
- C) Row Access Policies
- D) Secure Views

**Answer**: B - External Tokenization preserves referential integrity, allowing GROUP BY operations on tokenized values while keeping the actual data protected.

#### Pattern 6: Privileges

**Q**: Which privilege is required to apply a masking policy to a table column?
- A) OWNERSHIP on the table
- B) APPLY MASKING POLICY on ACCOUNT
- C) MODIFY on the column
- D) USAGE on the masking policy

**Answer**: B - The APPLY MASKING POLICY privilege at the account level (or APPLY ON MASKING POLICY for a specific policy) is required.

### Exam Traps to Avoid

| Trap | Reality |
|------|---------|
| "Tokenization happens at load time" | Data must be tokenized BEFORE loading into Snowflake |
| "External Tokenization works with Data Sharing" | External functions cannot run in share context |
| "Standard Edition supports External Tokenization" | Full integration requires Enterprise Edition |
| "Tokens can be reversed without the vault" | Tokens require vault lookup; they are not encrypted |
| "Masking policies can use any UDF" | External Tokenization specifically requires external functions |

### Quick Reference: External Tokenization vs Alternatives

| Feature | External Tokenization | Dynamic Data Masking | Secure Views |
|---------|----------------------|---------------------|--------------|
| Data stored as | Tokenized | Plain text | Plain text |
| Masking at | Query time | Query time | Query time |
| External dependency | Yes (provider) | No | No |
| Supports Data Sharing | No | Yes | Yes |
| Preserves referential integrity | Yes | No | N/A |
| Performance impact | Higher | Lower | Lower |
| Edition required | Enterprise | Standard | Standard |

---

## 11. Practice Questions

### Question 1

What is the fundamental difference between tokenization and encryption?

- A) Tokenization is faster than encryption
- B) Encryption uses keys; tokenization uses a vault lookup
- C) Tokenization only works with numeric data
- D) Encryption requires more storage space

<details>
<summary>Show Answer</summary>

**Answer**: B - Encryption uses mathematical algorithms with keys that can reverse the transformation. Tokenization replaces data with tokens that require a vault lookup to retrieve the original value - there is no mathematical relationship between the token and the original data.

</details>

### Question 2

In Snowflake's External Tokenization architecture, what connects the external function to the cloud-based tokenization service?

- A) Direct HTTPS connection
- B) API Integration
- C) Private Link
- D) JDBC driver

<details>
<summary>Show Answer</summary>

**Answer**: B - An API Integration object connects Snowflake external functions to cloud API gateway services (like AWS API Gateway, Azure API Management, or Cloud Endpoints), which then proxy requests to the tokenization provider.

</details>

### Question 3

A security team wants to ensure that even database administrators cannot see plain-text Social Security Numbers. Which approach should they recommend?

- A) Dynamic Data Masking with role-based conditions
- B) External Tokenization with pre-load tokenization
- C) Row Access Policies
- D) Column encryption with rotating keys

<details>
<summary>Show Answer</summary>

**Answer**: B - External Tokenization with pre-load tokenization ensures that SSNs are tokenized before entering Snowflake. Even users with ACCOUNTADMIN role would only see tokenized values unless explicitly authorized through the masking policy.

</details>

### Question 4

Which SQL command correctly creates a masking policy for External Tokenization?

- A) `CREATE MASKING POLICY ssn_mask AS (val STRING) RETURNS STRING -> ENCRYPT(val);`
- B) `CREATE MASKING POLICY ssn_mask AS (val STRING) RETURNS STRING -> TOKENIZE(val);`
- C) `CREATE MASKING POLICY ssn_mask AS (val STRING) RETURNS STRING -> CASE WHEN CURRENT_ROLE() = 'ANALYST' THEN detokenize_ssn(val) ELSE val END;`
- D) `CREATE TOKENIZATION POLICY ssn_mask USING EXTERNAL_FUNCTION detokenize_ssn;`

<details>
<summary>Show Answer</summary>

**Answer**: C - External Tokenization uses standard masking policy syntax with an external function (like `detokenize_ssn`) in the CASE expression. The external function calls the tokenization provider to return the original value for authorized roles.

</details>

### Question 5

Why is External Tokenization better suited for GROUP BY operations on sensitive data compared to Dynamic Data Masking?

- A) External Tokenization is faster for aggregations
- B) Tokenization produces consistent tokens for the same input value
- C) Dynamic Data Masking cannot be used with GROUP BY
- D) External providers optimize aggregate queries

<details>
<summary>Show Answer</summary>

**Answer**: B - Tokenization produces consistent, deterministic tokens for the same input value. This allows meaningful GROUP BY operations on tokenized data (e.g., counting records by tokenized diagnosis code) without revealing the underlying sensitive values.

</details>

### Question 6

Which of the following is NOT a certified External Tokenization partner for Snowflake?

- A) Protegrity
- B) ALTR
- C) HashiCorp Vault
- D) Thales

<details>
<summary>Show Answer</summary>

**Answer**: C - While HashiCorp Vault is a popular secrets management tool, it is not listed as a certified External Tokenization partner. The certified partners include Protegrity, ALTR, Thales, Baffle, Comforte, Fortanix, Privacera, Skyflow, and MicroFocus CyberRes Voltage.

</details>

### Question 7

What happens when an unauthorized user queries a column protected by External Tokenization?

- A) The query fails with an access error
- B) The user sees NULL values
- C) The user sees the tokenized values
- D) The user sees a default masked value like '***'

<details>
<summary>Show Answer</summary>

**Answer**: C - When unauthorized users query the column, the masking policy returns the tokenized value (the ELSE branch in the CASE expression). They see the actual tokens stored in the table, not the detokenized original values.

</details>

### Question 8

A data sharing provider wants to share tokenized data with consumers while allowing them to detokenize it. What is the recommended approach?

- A) Share the masking policy along with the data
- B) This is not possible - external functions do not work in share context
- C) Grant consumers access to the API integration
- D) Use format-preserving encryption instead

<details>
<summary>Show Answer</summary>

**Answer**: B - External functions cannot be invoked in the context of a share. If consumers need to detokenize shared data, they would need to set up their own integration with the tokenization provider or an alternative approach like Dynamic Data Masking should be used.

</details>

---

## 12. Summary

External Tokenization is a powerful Column-level Security feature that ensures sensitive data is never stored in plain text within Snowflake:

1. **Pre-load Tokenization**: Data is tokenized by third-party providers before loading
2. **Query-time Detokenization**: Masking policies with external functions detokenize for authorized users
3. **Enterprise Edition Required**: Full integration requires Enterprise Edition or higher
4. **Partner Ecosystem**: Supports major tokenization providers (Protegrity, ALTR, Thales, etc.)
5. **Preserves Referential Integrity**: Same input produces consistent tokens, enabling joins and aggregations
6. **Not Compatible with Data Sharing**: External functions cannot run in share context
7. **Architecture**: Requires API Integration, External Function, and Cloud Proxy Service

For the SnowPro Core exam, understand the differences between External Tokenization and Dynamic Data Masking, know the edition requirements, and be familiar with the component architecture and implementation steps.
