# Domain 2: Network Policies

**Exam Weight: Part of 20-25%** | **SnowPro Core (COF-C02)**

---

## Table of Contents

1. [Network Policies Overview](#1-network-policies-overview)
2. [Network Rules](#2-network-rules)
3. [Creating and Managing Network Policies](#3-creating-and-managing-network-policies)
4. [Network Policy Activation](#4-network-policy-activation)
5. [Network Policy Precedence](#5-network-policy-precedence)
6. [Protecting Internal Stages](#6-protecting-internal-stages)
7. [Bypassing Network Policies](#7-bypassing-network-policies)
8. [Snowflake-Managed Network Rules](#8-snowflake-managed-network-rules)
9. [Replication and Network Policies](#9-replication-and-network-policies)
10. [Key Exam Patterns](#10-key-exam-patterns)
11. [Quick Reference](#11-quick-reference)

---

## 1. Network Policies Overview

### 1.1 What is a Network Policy?

A **network policy** is a security feature that controls **inbound** access to the Snowflake service and internal stages based on the origin of a request.

**Default Behavior:**
- By default, Snowflake allows users to connect from **any computer or device**
- Network policies restrict this by defining allowed and blocked network origins

**Key Concepts:**

| Term | Description |
|------|-------------|
| **Allowed List** | Network identifiers permitted to access Snowflake |
| **Blocked List** | Network identifiers explicitly denied access |
| **Network Rule** | Schema-level object grouping related network identifiers |

### 1.2 Network Policy Architecture

Network policies use **network rules** to organize restrictions:

```
Network Policy
    |
    +-- ALLOWED_NETWORK_RULE_LIST
    |       |
    |       +-- Network Rule 1 (IP addresses)
    |       +-- Network Rule 2 (VPCE IDs)
    |
    +-- BLOCKED_NETWORK_RULE_LIST
            |
            +-- Network Rule 3 (blocked IPs)
```

**Important:** A network policy does not directly specify network identifiers. Instead, it references network rules that contain the identifiers.

### 1.3 Legacy vs Modern Approach

| Approach | Parameters | Status |
|----------|-----------|--------|
| **Legacy** | `ALLOWED_IP_LIST`, `BLOCKED_IP_LIST` | Still works, but discouraged |
| **Modern (Recommended)** | `ALLOWED_NETWORK_RULE_LIST`, `BLOCKED_NETWORK_RULE_LIST` | Best practice |

**Best Practice:** Use network rules for all new network policies. Avoid mixing both approaches in the same policy.

### 1.4 Workflow for Implementing Network Policies

1. **Create network rules** based on purpose and identifier type
2. **Create network policies** that include the network rules
3. **Activate the network policy** for account, user, or security integration

**Critical:** A network policy does NOT restrict traffic until it is activated.

---

## 2. Network Rules

### 2.1 What is a Network Rule?

A **network rule** is a schema-level object that groups related network identifiers into a logical unit. Network rules are then added to network policies.

**Key Characteristics:**
- Schema-level object (stored in a database schema)
- Groups identifiers of the same type
- Does not specify allow/block - that's determined by the network policy
- Can be reused across multiple network policies

**Key Distinction: Network Rules vs Network Policies**

| Concept | Network Rules | Network Policies |
|---------|--------------|-----------------|
| Level | Schema-level object | Account-level object |
| Purpose | Group network identifiers (IP addresses, VPC endpoints, host names) | Reference rules in allowed/blocked lists to allow or block traffic |
| Allow/Block? | No -- rules themselves do NOT allow or block anything | Yes -- policies decide what is allowed or blocked |
| Reusable? | Yes -- the same rule can be referenced by multiple policies or external access integrations | No -- only one policy active per level (account/user/integration) |
| Used by | Network policies (inbound traffic), external access integrations (outbound traffic) | Account, user, or security integration activation |

### 2.2 Network Rule Properties

| Property | Description | Values |
|----------|-------------|--------|
| `TYPE` | Type of network identifier | `IPV4`, `AWSVPCEID`, `AZURELINKID`, `GCPPSCID`, `HOST_PORT`, `PRIVATE_HOST_PORT` |
| `MODE` | Direction of traffic restriction | `INGRESS`, `INTERNAL_STAGE`, `EGRESS` |
| `VALUE_LIST` | List of network identifiers | IP addresses, VPCE IDs, host names, etc. |

### 2.3 Supported Network Identifier Types

**For Incoming Requests (Ingress):**

| Type | Description | Example |
|------|-------------|---------|
| `IPV4` | IPv4 addresses or CIDR ranges | `192.168.1.0/24` |
| `AWSVPCEID` | AWS VPC Endpoint IDs | `vpce-0fa383eb170331202` |
| `AZURELINKID` | Azure Private Link IDs | Retrieved via `SYSTEM$GET_PRIVATELINK_AUTHORIZED_ENDPOINTS` |
| `GCPPSCID` | Google Cloud PSC Connection IDs | Retrieved via `gcloud compute forwarding-rules describe` |

**For Outgoing Requests (Egress):**

| Type | Description | Example |
|------|-------------|---------|
| `HOST_PORT` | Host names with optional port (public endpoints) | `example.com`, `example.com:443` |
| `PRIVATE_HOST_PORT` | Host names for private endpoints (e.g., AWS PrivateLink) | `my-s3-bucket.s3.us-west-2.vpce.amazonaws.com` |

### 2.4 Network Rule Modes

| Mode | Purpose | Used With |
|------|---------|-----------|
| `INGRESS` | Controls access to Snowflake service | Network policies |
| `INTERNAL_STAGE` | Controls access to AWS internal stages only | Network policies |
| `EGRESS` | Controls outbound traffic from Snowflake | External access integrations |

### 2.5 CIDR Notation

Snowflake uses CIDR (Classless Inter-Domain Routing) notation for IP address ranges:

```
192.168.1.0/24 = All IPs from 192.168.1.0 to 192.168.1.255 (256 addresses)
192.168.1.0/32 = Single IP address 192.168.1.0
10.0.0.0/8    = All IPs from 10.0.0.0 to 10.255.255.255 (16 million addresses)
0.0.0.0/0     = ALL public and private IPv4 addresses
```

### 2.6 Creating Network Rules

**Required Privilege:** `CREATE NETWORK RULE` on the schema

**Default Roles with Privilege:** ACCOUNTADMIN, SECURITYADMIN, schema owner

**Syntax:**
```sql
CREATE NETWORK RULE rule_name
  TYPE = IPV4
  MODE = INGRESS
  VALUE_LIST = ('192.168.1.0/24', '10.0.0.0/8');
```

**Examples:**

```sql
-- Allow specific IP range
CREATE NETWORK RULE corporate_ips
  TYPE = IPV4
  MODE = INGRESS
  VALUE_LIST = ('47.88.25.32/27');

-- Block all public access (for use with private connectivity)
CREATE NETWORK RULE block_public_access
  MODE = INGRESS
  TYPE = IPV4
  VALUE_LIST = ('0.0.0.0/0');

-- Allow specific AWS VPC endpoint
CREATE NETWORK RULE allow_vpc_endpoint
  MODE = INGRESS
  TYPE = AWSVPCEID
  VALUE_LIST = ('vpce-0fa383eb170331202');

-- Protect internal stage (AWS only)
CREATE NETWORK RULE internal_stage_access
  MODE = INTERNAL_STAGE
  TYPE = AWSVPCEID
  VALUE_LIST = ('vpce-0fa383eb170331202');
```

### 2.7 Modifying Network Rules

```sql
-- Update value list
ALTER NETWORK RULE corporate_ips
  SET VALUE_LIST = ('47.88.25.32/27', '192.168.1.0/24');

-- Add comment
ALTER NETWORK RULE corporate_ips
  SET COMMENT = 'Corporate office IP ranges';
```

### 2.8 Network Rule Limits

| Edition | IPv4 Addresses | VPCE IDs | Network Policies |
|---------|---------------|----------|-----------------|
| Standard/Enterprise | 10 per rule | 7 per policy | No explicit limit |
| Business Critical+ | ~250 per policy | ~200 per policy | 50 (can be increased) |

**Important:** Limits apply to the combined total across all network rules in a policy.

---

## 3. Creating and Managing Network Policies

### 3.1 Required Privileges

| Action | Required Role/Privilege |
|--------|------------------------|
| Create network policy | SECURITYADMIN or higher, or `CREATE NETWORK POLICY` privilege |
| Modify network policy | Ownership of the policy |
| Activate for account | SECURITYADMIN or higher, or `ATTACH POLICY` privilege |
| Activate for user | User ownership or appropriate privilege |

### 3.2 Creating Network Policies

**Snowsight:**
1. Navigate to **Governance & Security** > **Network Policies**
2. Select **+ Network Policy**
3. Add network rules to allowed/blocked lists
4. Create the policy

**SQL Syntax:**
```sql
CREATE NETWORK POLICY policy_name
  ALLOWED_NETWORK_RULE_LIST = ('rule1', 'rule2')
  BLOCKED_NETWORK_RULE_LIST = ('rule3')
  COMMENT = 'Description of policy purpose';
```

**Complete Example:**
```sql
-- Step 1: Create network rules
CREATE NETWORK RULE allow_corporate
  TYPE = IPV4
  MODE = INGRESS
  VALUE_LIST = ('192.168.1.0/24');

CREATE NETWORK RULE block_specific_ip
  TYPE = IPV4
  MODE = INGRESS
  VALUE_LIST = ('192.168.1.99');

-- Step 2: Create network policy
CREATE NETWORK POLICY corporate_access_policy
  ALLOWED_NETWORK_RULE_LIST = ('allow_corporate')
  BLOCKED_NETWORK_RULE_LIST = ('block_specific_ip')
  COMMENT = 'Allow corporate IPs except 192.168.1.99';
```

### 3.3 Modifying Network Policies

```sql
-- Add network rules to allowed list
ALTER NETWORK POLICY corporate_access_policy
  ADD ALLOWED_NETWORK_RULE_LIST = ('additional_rule');

-- Remove network rules
ALTER NETWORK POLICY corporate_access_policy
  REMOVE BLOCKED_NETWORK_RULE_LIST = ('old_rule');

-- Replace entire list
ALTER NETWORK POLICY corporate_access_policy
  SET ALLOWED_NETWORK_RULE_LIST = ('new_rule1', 'new_rule2');
```

### 3.4 Interaction Between Allowed and Blocked Lists

**Key Rules:**

1. **Implicit Blocking:** Adding identifiers to the allowed list implicitly blocks all other identifiers of the same type

2. **Blocked List Priority:** If the same identifier appears in both lists, the **blocked list takes precedence**

3. **Private Connectivity Priority:** Network rules of type `AWSVPCEID` or `AZURELINKID` take precedence over `IPV4` rules

**Example - Allow Range with Exception:**
```sql
-- Allow 192.168.1.0 - 192.168.1.255, except 192.168.1.99
CREATE NETWORK RULE allow_range
  TYPE = IPV4
  MODE = INGRESS
  VALUE_LIST = ('192.168.1.0/24');

CREATE NETWORK RULE block_exception
  TYPE = IPV4
  MODE = INGRESS
  VALUE_LIST = ('192.168.1.99');

CREATE NETWORK POLICY range_with_exception
  ALLOWED_NETWORK_RULE_LIST = ('allow_range')
  BLOCKED_NETWORK_RULE_LIST = ('block_exception');
```

### 3.5 Private Connectivity with Public Block

To allow only private connectivity while blocking all public access:

```sql
-- Block all public IPs
CREATE NETWORK RULE block_public
  MODE = INGRESS
  TYPE = IPV4
  VALUE_LIST = ('0.0.0.0/0');

-- Allow specific VPC endpoint
CREATE NETWORK RULE allow_vpc
  MODE = INGRESS
  TYPE = AWSVPCEID
  VALUE_LIST = ('vpce-0fa383eb170331202');

-- Create policy (private connectivity rules take precedence)
CREATE NETWORK POLICY private_only
  ALLOWED_NETWORK_RULE_LIST = ('allow_vpc')
  BLOCKED_NETWORK_RULE_LIST = ('block_public');
```

### 3.6 Caution: Avoiding Lockout

**Critical Warning:** Always ensure your current IP address is in the allowed list before activating a policy.

- If your current IP is not allowed, Snowflake returns an error when you try to activate
- Your current IP cannot be in the blocked list
- Test policies at the user level before applying to the entire account

---

## 4. Network Policy Activation

### 4.1 Activation Overview

A network policy must be **activated** to take effect. Activation levels:

| Level | Scope | Command |
|-------|-------|---------|
| **Account** | All users in the account | `ALTER ACCOUNT SET NETWORK_POLICY = 'policy_name'` |
| **User** | Specific user only | `ALTER USER user_name SET NETWORK_POLICY = 'policy_name'` |
| **Security Integration** | OAuth/SAML traffic | `ALTER SECURITY INTEGRATION ... SET NETWORK_POLICY = 'policy_name'` |

### 4.2 Activate for Account

```sql
-- Set account-level network policy
ALTER ACCOUNT SET NETWORK_POLICY = my_policy;

-- Remove account-level network policy
ALTER ACCOUNT UNSET NETWORK_POLICY;
```

**Effects:**
- Enforces policy for all users in the account
- Users from blocked IPs are denied login
- Already logged-in users from blocked IPs cannot execute queries
- Only ONE network policy can be active at account level

### 4.3 Activate for User

```sql
-- Set user-level network policy
ALTER USER john_doe SET NETWORK_POLICY = user_specific_policy;

-- Remove user-level network policy
ALTER USER john_doe UNSET NETWORK_POLICY;
```

**Effects:**
- Overrides account-level policy for this user
- Allows different restrictions for specific users (admins, service accounts)
- Only ONE network policy per user

### 4.4 Activate for Security Integration

```sql
-- Set network policy for OAuth integration
ALTER SECURITY INTEGRATION my_oauth_integration
  SET NETWORK_POLICY = oauth_policy;
```

**Effects:**
- Controls OAuth/SAML client traffic
- Most specific level of precedence
- Does NOT restrict access to internal stages

### 4.5 Identify Activated Network Policies

**Account Level:**
```sql
-- Using Snowsight: Governance & Security > Network Policies
-- Account-level policy shown at top

-- Using SQL
SHOW PARAMETERS LIKE 'NETWORK_POLICY' IN ACCOUNT;
```

**User Level:**
```sql
DESCRIBE USER john_doe;
-- Look for NETWORK_POLICY property
```

---

## 5. Network Policy Precedence

### 5.1 Precedence Hierarchy

When multiple network policies are applied, the **most specific** policy takes precedence:

```
Security Integration (most specific)
        |
        v
      User
        |
        v
    Account (least specific)
```

### 5.2 Precedence Rules

| Scenario | Active Policy |
|----------|--------------|
| Only account policy exists | Account policy |
| Account + User policies | User policy |
| Account + User + Integration policies | Integration policy |

### 5.3 OAuth-Specific Precedence

For Snowflake OAuth integrations:
- **Client-to-Snowflake traffic:** Integration policy takes precedence
- **User-to-authorization-server:** User policy takes precedence

### 5.4 Private Connectivity vs IPv4 Precedence

Within a single network policy:
- **Private connectivity rules** (AWSVPCEID, AZURELINKID) take precedence over IPV4 rules
- If a private connectivity rule exists in the allowed list, IPV4 rules are ignored for requests using private connectivity

---

## 6. Protecting Internal Stages

### 6.1 Overview

Network rules can protect both the Snowflake service and AWS internal stages.

**Limitation:** Internal stage protection via network rules is only available for **AWS accounts**.

### 6.2 Enabling Internal Stage Protection

**Required:** Enable the account parameter first:

```sql
USE ROLE ACCOUNTADMIN;
ALTER ACCOUNT SET ENFORCE_NETWORK_RULES_FOR_INTERNAL_STAGES = TRUE;
```

**Important:** Network rules do NOT protect internal stages until this parameter is enabled.

### 6.3 Modes for Internal Stage Protection

| Mode | Protects Service | Protects Internal Stage |
|------|-----------------|------------------------|
| `INGRESS` | Yes | Yes (if parameter enabled and TYPE=IPV4) |
| `INTERNAL_STAGE` | No | Yes (AWS only, requires AWSVPCEID) |

### 6.4 Strategy: Protect Internal Stage Only

To restrict internal stage access without affecting service access:

```sql
-- Requires TYPE = AWSVPCEID
CREATE NETWORK RULE stage_only_rule
  MODE = INTERNAL_STAGE
  TYPE = AWSVPCEID
  VALUE_LIST = ('vpce-0fa383eb170331202');
```

**Note:** You cannot restrict internal stage access by IP address without also restricting service access.

### 6.5 Strategy: Protect Both Service and Stage

**Private access to both:**
```sql
-- Rule for service (INGRESS)
CREATE NETWORK RULE service_vpc_rule
  MODE = INGRESS
  TYPE = AWSVPCEID
  VALUE_LIST = ('vpce-0fa383eb170331202');

-- Rule for internal stage (INTERNAL_STAGE)
CREATE NETWORK RULE stage_vpc_rule
  MODE = INTERNAL_STAGE
  TYPE = AWSVPCEID
  VALUE_LIST = ('vpce-0fa383eb170331202');

-- Policy using both rules
CREATE NETWORK POLICY private_access_policy
  ALLOWED_NETWORK_RULE_LIST = ('service_vpc_rule', 'stage_vpc_rule');
```

### 6.6 Limitations

- Security integration policies do NOT restrict internal stage access
- Azure internal stages cannot use network rules (use Azure Private Link block instead)
- GCP internal stages: Use GCP Private Service Connect

---

## 7. Bypassing Network Policies

### 7.1 MINS_TO_BYPASS_NETWORK_POLICY

In emergency situations, a network policy can be temporarily bypassed:

| Property | Description |
|----------|-------------|
| `MINS_TO_BYPASS_NETWORK_POLICY` | User object property that temporarily bypasses network policy |
| Duration | Set number of minutes |
| Who can set | **Only Snowflake Support** |

### 7.2 How to Request Bypass

1. Contact **Snowflake Support**
2. Request temporary bypass for a specific user
3. Support sets the `MINS_TO_BYPASS_NETWORK_POLICY` value
4. Bypass expires automatically after specified minutes

### 7.3 Viewing Bypass Status

```sql
DESCRIBE USER username;
-- Look for MINS_TO_BYPASS_NETWORK_POLICY property
```

**Important:** This is intended for emergency recovery scenarios, not routine access.

---

## 8. Snowflake-Managed Network Rules

### 8.1 Overview

Snowflake provides **built-in network rules** in the `SNOWFLAKE.NETWORK_SECURITY` schema for common third-party integrations.

**Benefits:**
- Automatically updated by Snowflake
- No maintenance required
- Secure, consistent configuration

### 8.2 Available Built-in Rules

| Partner | Rule Name | Description |
|---------|-----------|-------------|
| dbt Labs | `DBT_APAC_AWS`, `DBT_EMEA_AWS`, etc. | dbt Cloud IP addresses by region |
| Microsoft Power BI | Various rules | Power BI egress IP addresses |

### 8.3 Using Snowflake-Managed Rules

**View available rules:**
```sql
SHOW NETWORK RULES IN SNOWFLAKE.NETWORK_SECURITY;
```

**Query with IP addresses:**
```sql
SELECT *
FROM SNOWFLAKE.ACCOUNT_USAGE.NETWORK_RULES
WHERE DATABASE = 'SNOWFLAKE' AND SCHEMA = 'NETWORK_SECURITY';
```

**Use in network policy:**
```sql
CREATE OR REPLACE NETWORK POLICY partner_access
  ALLOWED_NETWORK_RULE_LIST = (
    'SNOWFLAKE.NETWORK_SECURITY.DBT_APAC_AWS',
    'SNOWFLAKE.NETWORK_SECURITY.DBT_EMEA_AWS'
  );
```

**Add to existing policy:**
```sql
ALTER NETWORK POLICY existing_policy
  ADD ALLOWED_NETWORK_RULE_LIST = (
    'SNOWFLAKE.NETWORK_SECURITY.DBT_APAC_AWS'
  );
```

### 8.4 Egress Network Rules

Snowflake also provides egress rules for outbound connections:

```sql
-- PyPI access for Container Runtime
SNOWFLAKE.EXTERNAL_ACCESS.PYPI_RULE
```

Used with external access integrations for UDFs and procedures.

---

## 9. Replication and Network Policies

### 9.1 Replication Support

Snowflake supports replication for:
- Network policies
- Network rules
- Network policy assignments

### 9.2 How Replication Works

- Network rules are schema-level objects - replicated with their database
- Network policies are account-level objects - replicated separately
- Policy assignments (account/user) can also be replicated

### 9.3 Failover Considerations

- Network policies replicate to secondary accounts
- During failover, policies remain enforced
- Ensure IP ranges include both primary and secondary access points

---

## 10. Key Exam Patterns

### 10.1 Network Policy Activation Questions

**Pattern:** When does a network policy take effect?

**Key Facts:**
- Must be activated for account, user, or security integration
- Creating a policy alone does NOT restrict traffic
- Only one policy can be active per level

**Example Question:**
> A security admin creates a network policy but users can still connect from any IP. What is missing?
> - A) The policy needs to be saved
> - B) The policy needs to be activated [CORRECT]
> - C) The policy needs network rules
> - D) The ACCOUNTADMIN role is required

### 10.2 Precedence Questions

**Pattern:** Which network policy applies?

**Key Facts:**
- Security Integration > User > Account
- Private connectivity rules > IPv4 rules
- Blocked list > Allowed list (for same IP)

**Example Question:**
> An account has a network policy allowing IPs 10.0.0.0/8. User "admin" has a policy allowing only 192.168.1.0/24. User "admin" connects from 10.0.0.5. What happens?
> - A) Connection allowed (account policy)
> - B) Connection denied (user policy overrides) [CORRECT]
> - C) Connection allowed (both policies permit)
> - D) Error due to conflicting policies

### 10.3 Network Rule Mode Questions

**Pattern:** What mode for what purpose?

**Key Facts:**
- `INGRESS`: Snowflake service access
- `INTERNAL_STAGE`: AWS internal stage access (requires AWSVPCEID)
- `EGRESS`: Outbound from Snowflake (external access integrations)

**Example Question:**
> Which mode should a network rule use to restrict access to an AWS internal stage without affecting service access?
> - A) INGRESS
> - B) EGRESS
> - C) INTERNAL_STAGE [CORRECT]
> - D) STAGE_ACCESS

### 10.4 CIDR Notation Questions

**Pattern:** What IPs are covered by CIDR range?

**Key Facts:**
- `0.0.0.0/0` = ALL public and private IPv4 addresses
- `/24` = 256 addresses (last octet varies)
- `/32` = single IP address

**Example Question:**
> A network policy has `0.0.0.0/0` in the blocked list. What does this block?
> - A) Only public IP addresses
> - B) Only private IP addresses
> - C) All public and private IPv4 addresses [CORRECT]
> - D) No addresses (invalid CIDR)

### 10.5 Required Role Questions

**Pattern:** Who can create/manage network policies?

**Key Facts:**
- Create policy: SECURITYADMIN or higher, or CREATE NETWORK POLICY privilege
- Create network rule: CREATE NETWORK RULE on schema (ACCOUNTADMIN, SECURITYADMIN, schema owner)
- Activate for account: SECURITYADMIN or higher, or ATTACH POLICY privilege

**Example Question:**
> Which role can create a network policy by default?
> - A) SYSADMIN
> - B) PUBLIC
> - C) SECURITYADMIN [CORRECT]
> - D) USERADMIN

### 10.6 Bypass Questions

**Pattern:** How to access when locked out by network policy?

**Key Facts:**
- `MINS_TO_BYPASS_NETWORK_POLICY` user property
- Only Snowflake Support can set this
- Temporary bypass (specified minutes)

**Example Question:**
> An admin is locked out due to a misconfigured network policy. How can they regain access?
> - A) Use ACCOUNTADMIN to override
> - B) Contact Snowflake Support for temporary bypass [CORRECT]
> - C) Delete the network policy from the database
> - D) Wait 24 hours for automatic reset

---

## 11. Quick Reference

### 11.1 Key SQL Commands

```sql
-- Create network rule
CREATE NETWORK RULE rule_name
  TYPE = IPV4
  MODE = INGRESS
  VALUE_LIST = ('192.168.1.0/24');

-- Create network policy
CREATE NETWORK POLICY policy_name
  ALLOWED_NETWORK_RULE_LIST = ('rule1', 'rule2')
  BLOCKED_NETWORK_RULE_LIST = ('rule3');

-- Activate for account
ALTER ACCOUNT SET NETWORK_POLICY = policy_name;

-- Activate for user
ALTER USER user_name SET NETWORK_POLICY = policy_name;

-- Activate for security integration
ALTER SECURITY INTEGRATION int_name SET NETWORK_POLICY = policy_name;

-- Deactivate
ALTER ACCOUNT UNSET NETWORK_POLICY;
ALTER USER user_name UNSET NETWORK_POLICY;

-- Modify policy
ALTER NETWORK POLICY policy_name
  ADD ALLOWED_NETWORK_RULE_LIST = ('new_rule');

ALTER NETWORK POLICY policy_name
  REMOVE BLOCKED_NETWORK_RULE_LIST = ('old_rule');

-- Enable internal stage protection
ALTER ACCOUNT SET ENFORCE_NETWORK_RULES_FOR_INTERNAL_STAGES = TRUE;

-- View network rules
SHOW NETWORK RULES;
SHOW NETWORK RULES IN SCHEMA db.schema;

-- View network policies
SHOW NETWORK POLICIES;
```

### 11.2 Network Rule Types Summary

| TYPE | MODE | Purpose |
|------|------|---------|
| IPV4 | INGRESS | Control service access by IP |
| IPV4 | INGRESS | Control service + stage access by IP (if enabled) |
| AWSVPCEID | INGRESS | Control service access by AWS VPC endpoint |
| AWSVPCEID | INTERNAL_STAGE | Control AWS internal stage access |
| AZURELINKID | INGRESS | Control service access by Azure Private Link |
| GCPPSCID | INGRESS | Control service access by GCP PSC |

### 11.3 Precedence Summary

```
Most Specific (Wins)
        |
Security Integration Policy
        |
    User Policy
        |
  Account Policy
        |
Least Specific (Overridden)
```

Within a policy:
```
Private Connectivity Rules (AWSVPCEID, AZURELINKID)
        |
    Blocked List
        |
    Allowed List
```

### 11.4 Required Privileges Summary

| Action | Minimum Required |
|--------|-----------------|
| Create network rule | CREATE NETWORK RULE on schema |
| Create network policy | SECURITYADMIN or CREATE NETWORK POLICY |
| Activate account policy | SECURITYADMIN or ATTACH POLICY |
| Modify network rule | OWNERSHIP on network rule |
| Modify network policy | OWNERSHIP on network policy |

### 11.5 Exam Tips

1. **Activation is required:** Creating a policy does not enforce it
2. **Precedence matters:** Security Integration > User > Account
3. **Blocked list wins:** Same IP in both lists = blocked
4. **Private connectivity overrides IPv4:** AWSVPCEID/AZURELINKID rules take precedence
5. **0.0.0.0/0 blocks everything:** Use to block all public access with private allowed
6. **Internal stage protection:** Requires ENFORCE_NETWORK_RULES_FOR_INTERNAL_STAGES = TRUE
7. **Only Snowflake Support can bypass:** MINS_TO_BYPASS_NETWORK_POLICY
8. **One policy per level:** Only one active policy per account/user/integration
9. **Network rules are schema objects:** Need database.schema.rule_name
10. **SECURITYADMIN minimum:** For creating and activating policies

---

## References

- [Snowflake Documentation: Controlling Network Traffic with Network Policies](https://docs.snowflake.com/en/user-guide/network-policies)
- [Snowflake Documentation: Network Rules](https://docs.snowflake.com/en/user-guide/network-rules)
- [Snowflake Documentation: CREATE NETWORK POLICY](https://docs.snowflake.com/en/sql-reference/sql/create-network-policy)
- [Snowflake Documentation: CREATE NETWORK RULE](https://docs.snowflake.com/en/sql-reference/sql/create-network-rule)
- [Snowflake Documentation: ALTER ACCOUNT](https://docs.snowflake.com/en/sql-reference/sql/alter-account)
