# Domain 2: Account Access & Security - SCIM Integration

## Overview

SCIM (System for Cross-domain Identity Management) is an open standard protocol that enables automated user provisioning between identity providers and service providers. Snowflake supports SCIM 2.0 for integrating with enterprise identity management systems, allowing organizations to automatically synchronize users and groups (roles) from their identity provider to Snowflake.

---

## Section 1: SCIM Fundamentals

### Learning Objectives
- Understand what SCIM is and why it matters for enterprise security
- Learn how SCIM fits into Snowflake's identity management architecture
- Recognize the relationship between identity providers and Snowflake as a service provider

### Key Concepts

**What is SCIM?**

SCIM (System for Cross-domain Identity Management) is an open standard (RFC 7644) designed to automate the exchange of user identity information between identity domains. In the context of Snowflake:

- **Identity Provider (IdP)**: The authoritative source for user identities (e.g., Okta, Microsoft Entra ID)
- **Service Provider (SP)**: Snowflake, which receives provisioned users and groups
- **SCIM Client**: Software that makes API requests to provision users
- **SCIM Server**: Snowflake's endpoint that processes provisioning requests

**Why Use SCIM with Snowflake?**

| Benefit | Description |
|---------|-------------|
| **Automated Provisioning** | Users created in IdP are automatically provisioned to Snowflake |
| **Centralized Management** | Single source of truth for user identities |
| **Reduced Manual Work** | No need to manually create users in Snowflake |
| **Improved Security** | Users are automatically deactivated when removed from IdP |
| **Compliance** | Consistent identity management across systems |
| **Role Synchronization** | Groups in IdP map to roles in Snowflake |

**SCIM Data Flow**

```
Identity Provider (Okta/Azure AD)
         |
         | SCIM API Requests (HTTPS)
         | (Bearer Token Authentication)
         v
Snowflake SCIM Server (/scim/v2/)
         |
         v
Users & Roles Created/Updated/Deleted
```

### Important Terms/Definitions

- **SCIM 2.0**: The version of SCIM protocol supported by Snowflake
- **Provisioning**: The process of creating and managing user accounts automatically
- **Deprovisioning**: Removing or disabling user access when they leave the organization
- **User Lifecycle Management**: Managing users from creation through deactivation
- **One-to-One Mapping**: IdP users/groups map directly to Snowflake users/roles

### Exam Tips

- SCIM is for **provisioning** users and groups, not for authentication (that is SSO/SAML)
- Snowflake functions as the **service provider** in SCIM integrations
- SCIM changes flow **one way**: from IdP to Snowflake (not bidirectional)
- Changes made directly in Snowflake do **not** sync back to the identity provider
- SCIM 2.0 is the supported version (not SCIM 1.1)

---

## Section 2: Supported Identity Providers

### Learning Objectives
- Identify the identity providers Snowflake supports for SCIM
- Understand the differences between Okta, Azure AD, and custom integrations
- Learn the specific SCIM roles for each identity provider

### Key Concepts

**Supported SCIM Identity Providers**

Snowflake supports three types of SCIM integrations:

| Provider | SCIM Client Value | SCIM Role | Notes |
|----------|------------------|-----------|-------|
| **Okta** | `'okta'` | `okta_provisioner` | Native integration with Okta application |
| **Microsoft Entra ID** (Azure AD) | `'azure'` | `aad_provisioner` | Native integration with Azure AD |
| **Custom** | `'generic'` | `generic_scim_provisioner` | For any other IdP (PingFederate, OneLogin, etc.) |

**Okta SCIM Integration Features**

- Push New Users to Snowflake
- Push Profile Updates
- Push User Deactivation (sets `DISABLED = TRUE`)
- Reactivate Users
- Push Password (optional, configurable)
- Push Groups (roles)

**Microsoft Entra ID SCIM Integration Features**

- Automatic User Provisioning
- Automatic Group Provisioning
- User and Group Synchronization
- Integration with SAML SSO (optional but recommended)

**Custom SCIM Integration**

- Build your own SCIM application
- Interface with any identity provider
- Full control over provisioning logic
- Requires more configuration effort

### Important Terms/Definitions

- **Okta**: A cloud-based identity management service
- **Microsoft Entra ID**: Microsoft's cloud identity service (formerly Azure Active Directory)
- **Custom SCIM**: Integration for identity providers other than Okta or Azure AD
- **SCIM Role**: The Snowflake role that owns provisioned users and groups

### Exam Tips

- Know the three SCIM client values: `'okta'`, `'azure'`, `'generic'`
- Remember the corresponding SCIM role names for each provider
- Microsoft Entra ID was formerly called Azure Active Directory (Azure AD)
- Custom SCIM is for identity providers that are **not** Okta or Microsoft Entra ID
- Each identity provider type has a dedicated SCIM role in Snowflake

---

## Section 3: SCIM Security Integration Configuration

### Learning Objectives
- Learn how to create SCIM security integrations in Snowflake
- Understand the configuration process for each identity provider
- Know how to generate and manage SCIM access tokens

### Key Concepts

**SCIM Security Integration**

A SCIM security integration is a Snowflake object that enables SCIM communication between an identity provider and Snowflake.

**Configuration Steps (Okta Example)**

```sql
-- Step 1: Use ACCOUNTADMIN role
USE ROLE ACCOUNTADMIN;

-- Step 2: Create the SCIM provisioner role
CREATE ROLE IF NOT EXISTS okta_provisioner;
GRANT CREATE USER ON ACCOUNT TO ROLE okta_provisioner;
GRANT CREATE ROLE ON ACCOUNT TO ROLE okta_provisioner;

-- Step 3: Grant the provisioner role to ACCOUNTADMIN
GRANT ROLE okta_provisioner TO ROLE accountadmin;

-- Step 4: Create the SCIM security integration
CREATE OR REPLACE SECURITY INTEGRATION okta_provisioning
    TYPE = SCIM
    SCIM_CLIENT = 'okta'
    RUN_AS_ROLE = 'OKTA_PROVISIONER';

-- Step 5: Generate the access token (valid for 6 months)
SELECT SYSTEM$GENERATE_SCIM_ACCESS_TOKEN('OKTA_PROVISIONING');
```

**Configuration Steps (Microsoft Entra ID Example)**

```sql
USE ROLE ACCOUNTADMIN;

CREATE ROLE IF NOT EXISTS aad_provisioner;
GRANT CREATE USER ON ACCOUNT TO ROLE aad_provisioner;
GRANT CREATE ROLE ON ACCOUNT TO ROLE aad_provisioner;
GRANT ROLE aad_provisioner TO ROLE accountadmin;

CREATE OR REPLACE SECURITY INTEGRATION aad_provisioning
    TYPE = SCIM
    SCIM_CLIENT = 'azure'
    RUN_AS_ROLE = 'AAD_PROVISIONER';

SELECT SYSTEM$GENERATE_SCIM_ACCESS_TOKEN('AAD_PROVISIONING');
```

**Configuration Steps (Custom SCIM Example)**

```sql
USE ROLE ACCOUNTADMIN;

CREATE ROLE IF NOT EXISTS generic_scim_provisioner;
GRANT CREATE USER ON ACCOUNT TO ROLE generic_scim_provisioner;
GRANT CREATE ROLE ON ACCOUNT TO ROLE generic_scim_provisioner;
GRANT ROLE generic_scim_provisioner TO ROLE accountadmin;

CREATE OR REPLACE SECURITY INTEGRATION generic_scim_provisioning
    TYPE = SCIM
    SCIM_CLIENT = 'generic'
    RUN_AS_ROLE = 'GENERIC_SCIM_PROVISIONER';

SELECT SYSTEM$GENERATE_SCIM_ACCESS_TOKEN('GENERIC_SCIM_PROVISIONING');
```

**Access Token Details**

| Property | Value |
|----------|-------|
| Token Type | OAuth Bearer Token |
| Validity Period | 6 months |
| Generation Function | `SYSTEM$GENERATE_SCIM_ACCESS_TOKEN()` |
| Token Invalidation | Drop the security integration |
| Regeneration | Call the function again |

**SCIM Endpoint URL Format**

```
https://<account_identifier>.snowflakecomputing.com/scim/v2/
```

Example: `https://myorg-myaccount.snowflakecomputing.com/scim/v2/`

### Important Terms/Definitions

- **Security Integration**: A Snowflake object that provides an interface between Snowflake and third-party services
- **RUN_AS_ROLE**: The role that will own all SCIM-provisioned users and groups
- **Access Token**: OAuth bearer token used to authenticate SCIM API requests
- **SCIM Endpoint**: The URL where SCIM requests are sent

### Exam Tips

- The `TYPE = SCIM` parameter is required for SCIM security integrations
- Access tokens expire after **6 months** and must be regenerated
- To invalidate a token, **drop the security integration**
- The SCIM role must be granted to ACCOUNTADMIN (or another role with sufficient privileges)
- The SCIM role needs `CREATE USER` and `CREATE ROLE` privileges on the account
- Use `SYSTEM$GENERATE_SCIM_ACCESS_TOKEN()` to generate tokens
- ACCOUNTADMIN or a role with MANAGE GRANTS privilege is recommended for SCIM configuration

---

## Section 4: User and Group Provisioning

### Learning Objectives
- Understand how users are provisioned from IdP to Snowflake
- Learn how groups map to Snowflake roles
- Know the user attributes supported by SCIM

### Key Concepts

**User Provisioning**

When a user is provisioned via SCIM:
1. IdP sends a SCIM API request to Snowflake
2. Snowflake creates the user with the specified attributes
3. The user is owned by the SCIM provisioner role
4. User can authenticate via SSO or password (depending on configuration)

**Supported User Attributes**

| SCIM Attribute | Snowflake Attribute | Description |
|---------------|---------------------|-------------|
| `id` | (GUID) | Immutable unique identifier |
| `userName` | `LOGIN_NAME` | Login identifier |
| `name.givenName` | `FIRST_NAME` | First name |
| `name.familyName` | `LAST_NAME` | Last name |
| `emails[].value` | `EMAIL` | Email address |
| `displayName` | `DISPLAY_NAME` | Display name in UI |
| `password` | `PASSWORD` | User password (optional) |
| `active` | `DISABLED` (inverse) | User active status |

**Custom User Attributes**

| SCIM Attribute | Snowflake Attribute | Description |
|---------------|---------------------|-------------|
| `defaultWarehouse` | `DEFAULT_WAREHOUSE` | Default warehouse |
| `defaultRole` | `DEFAULT_ROLE` | Default primary role |
| `defaultSecondaryRoles` | `DEFAULT_SECONDARY_ROLES` | Secondary roles (set to 'ALL') |
| `type` | `TYPE` | User type: person, service, legacy_service |

**Group to Role Mapping**

- Groups in the identity provider map **one-to-one** to Snowflake roles
- When a user is added to a group in IdP, they receive that role in Snowflake
- Group membership changes in IdP automatically update role assignments in Snowflake
- Nested groups are generally **not supported** by most IdPs

**User Lifecycle Operations**

| Operation | SCIM Action | Snowflake Result |
|-----------|------------|------------------|
| Create User | POST /scim/v2/Users | New user created |
| Update User | PATCH /scim/v2/Users/{id} | User attributes updated |
| Deactivate User | PATCH with `active: false` | `DISABLED = TRUE` |
| Reactivate User | PATCH with `active: true` | `DISABLED = FALSE` |
| Delete User | DELETE /scim/v2/Users/{id} | User deleted |

**Group Lifecycle Operations**

| Operation | SCIM Action | Snowflake Result |
|-----------|------------|------------------|
| Create Group | POST /scim/v2/Groups | New role created |
| Add Member | PATCH /scim/v2/Groups/{id} | User granted role |
| Remove Member | PATCH /scim/v2/Groups/{id} | Role revoked from user |
| Delete Group | DELETE /scim/v2/Groups/{id} | Role deleted |

### Important Terms/Definitions

- **User Deactivation**: Setting `DISABLED = TRUE` on a Snowflake user
- **Group Membership**: Assignment of users to groups (roles) in the IdP
- **Attribute Mapping**: Correspondence between IdP attributes and Snowflake properties
- **User Type**: Classification of users (person, service, legacy_service)

### Exam Tips

- Deactivating a user sets `DISABLED = TRUE` (does not delete the user)
- Groups in IdP map to **roles** in Snowflake
- The SCIM provisioner role **owns** all provisioned users and roles
- Existing Snowflake users can be brought under SCIM management by transferring ownership
- Existing Snowflake roles **cannot** be transferred to SCIM management (only new roles)
- Nested groups are generally not supported (check with your IdP)
- Password sync is optional and configurable (Okta only for `SYNC_PASSWORD` property)

---

## Section 5: SCIM Network Policies

### Learning Objectives
- Understand how to secure SCIM integrations with network policies
- Learn the difference between SCIM network policies and account-level policies
- Know how to configure SCIM-specific network access

### Key Concepts

**SCIM Network Policy**

A network policy can be applied specifically to a SCIM security integration, allowing:
- IdP IP addresses to access Snowflake for provisioning
- Separation of SCIM access from regular user network policies
- More granular security controls

**Applying SCIM Network Policy**

```sql
-- Create a network policy for SCIM
CREATE OR REPLACE NETWORK POLICY scim_network_policy
    ALLOWED_IP_LIST = ('198.51.100.0/24', '203.0.113.0/24');

-- Apply to SCIM integration
ALTER SECURITY INTEGRATION okta_provisioning
    SET NETWORK_POLICY = scim_network_policy;
```

**Removing SCIM Network Policy**

```sql
ALTER SECURITY INTEGRATION okta_provisioning
    UNSET NETWORK_POLICY;
```

**Network Policy Precedence**

```
SCIM Integration Network Policy (highest priority)
         |
         v
Account-Level Network Policy (lower priority)
```

A network policy applied to a SCIM integration **overrides** any account-level network policy for SCIM requests.

**IdP IP Address Requirements**

| Provider | IP Address Source |
|----------|------------------|
| Okta | [Okta IP addresses](https://help.okta.com/en-us/Content/Topics/Security/ip-address-allow-listing.htm) |
| Azure AD | [Azure Public Cloud](https://www.microsoft.com/en-us/download/details.aspx?id=56519) or [US Government Cloud](https://www.microsoft.com/en-us/download/details.aspx?id=57063) |
| Custom | Depends on your IdP |

### Important Terms/Definitions

- **Network Policy**: Snowflake object that controls which IP addresses can access Snowflake
- **ALLOWED_IP_LIST**: List of IP addresses/ranges permitted to connect
- **Policy Override**: SCIM network policy takes precedence over account policy

### Exam Tips

- SCIM network policy **overrides** account-level network policy
- Ensure IdP IP addresses are allowed in the network policy before enabling
- Azure AD requires **all** Azure IP addresses (from Microsoft's published list)
- Private Link URLs should **not** be used for SCIM endpoints
- Use the public endpoint for SCIM, even if using Private Link for regular access

---

## Section 6: SCIM API Overview

### Learning Objectives
- Understand the SCIM API endpoints available in Snowflake
- Learn the HTTP methods used for user and group operations
- Know how to audit SCIM API requests

### Key Concepts

**SCIM API Endpoints**

| Endpoint | Purpose |
|----------|---------|
| `/scim/v2/Users` | User management |
| `/scim/v2/Groups` | Group (role) management |

**User API Operations**

| HTTP Method | Endpoint | Operation |
|-------------|----------|-----------|
| GET | `/scim/v2/Users?filter=userName eq "user"` | Check if user exists |
| GET | `/scim/v2/Users/{id}` | Get user details |
| POST | `/scim/v2/Users` | Create user |
| PATCH | `/scim/v2/Users/{id}` | Update user attributes |
| PUT | `/scim/v2/Users/{id}` | Replace user (full update) |
| DELETE | `/scim/v2/Users/{id}` | Delete user |

**Group API Operations**

| HTTP Method | Endpoint | Operation |
|-------------|----------|-----------|
| GET | `/scim/v2/Groups?filter=displayName eq "group"` | Get group by name |
| GET | `/scim/v2/Groups/{id}` | Get group details |
| POST | `/scim/v2/Groups` | Create group |
| PATCH | `/scim/v2/Groups/{id}` | Update group/membership |
| DELETE | `/scim/v2/Groups/{id}` | Delete group |

**HTTP Headers Required**

```
Authorization: Bearer <access_token>
Content-Type: application/scim+json
Accept: application/scim+json
```

**Auditing SCIM API Requests**

Query SCIM API activity using `REST_EVENT_HISTORY`:

```sql
USE ROLE ACCOUNTADMIN;

-- View SCIM requests from last 5 minutes
SELECT * FROM TABLE(REST_EVENT_HISTORY(
    'scim',
    DATEADD('minutes', -5, CURRENT_TIMESTAMP()),
    CURRENT_TIMESTAMP(),
    200
));
```

### Important Terms/Definitions

- **REST API**: Representational State Transfer Application Programming Interface
- **Bearer Token**: Authentication token passed in the Authorization header
- **PATCH vs PUT**: PATCH updates specific attributes; PUT replaces the entire resource
- **REST_EVENT_HISTORY**: Table function to query REST API activity

### Exam Tips

- SCIM uses **RESTful API** calls with JSON payloads
- Authentication is via **OAuth Bearer token** in the Authorization header
- **PATCH** is more efficient than PUT (updates only specified attributes)
- Use `REST_EVENT_HISTORY` function to audit SCIM requests
- The `id` in SCIM API calls is the **GUID**, not the username

---

## Section 7: Integration with SSO

### Learning Objectives
- Understand the relationship between SCIM and SSO
- Learn how to enable SSO after SCIM provisioning
- Know the authentication options for SCIM-provisioned users

### Key Concepts

**SCIM vs SSO**

| Aspect | SCIM | SSO (SAML) |
|--------|------|------------|
| Purpose | User/group provisioning | User authentication |
| Protocol | SCIM 2.0 (REST API) | SAML 2.0 |
| Function | Creates users in Snowflake | Authenticates users |
| Timing | Before first login | During login |

**SCIM Does Not Enable SSO Automatically**

The SCIM provisioning process **does not** automatically enable single sign-on. After SCIM provisioning:
1. Users exist in Snowflake but may not have SSO enabled
2. SSO must be configured separately using SAML security integration
3. Users can authenticate via password if configured

**Authentication Options for SCIM Users**

| Configuration | Authentication Method |
|--------------|----------------------|
| SSO enabled | Users authenticate through IdP |
| Password sync enabled (Okta) | Users can use password |
| No password, no SSO | Users cannot authenticate |

**Enabling SSO After SCIM**

To use SSO after SCIM provisioning, create a SAML security integration:

```sql
CREATE SECURITY INTEGRATION my_saml_integration
    TYPE = SAML2
    ENABLED = TRUE
    SAML2_ISSUER = '<idp_issuer>'
    SAML2_SSO_URL = '<idp_sso_url>'
    SAML2_PROVIDER = '<provider_name>'
    SAML2_X509_CERT = '<certificate>';
```

### Important Terms/Definitions

- **SSO (Single Sign-On)**: Authentication mechanism allowing one login for multiple services
- **SAML**: Security Assertion Markup Language, protocol for SSO
- **SYNC_PASSWORD**: Property to enable/disable password synchronization from IdP
- **Snowflake-initiated SSO**: SSO flow initiated from Snowflake login page

### Exam Tips

- SCIM handles **provisioning**, SSO handles **authentication** - they are separate
- SCIM provisioning does **not** automatically enable SSO
- Configure SSO separately if needed after SCIM setup
- Azure AD users provisioned via SCIM do not get passwords by default (rely on SSO)
- Password sync (`SYNC_PASSWORD`) only works with **Okta** SCIM integrations
- Users without passwords and without SSO **cannot authenticate** to Snowflake

---

## Section 8: Replication and Best Practices

### Learning Objectives
- Understand SCIM security integration replication
- Learn best practices for SCIM implementation
- Know common troubleshooting scenarios

### Key Concepts

**SCIM Security Integration Replication**

Snowflake supports replication and failover/failback for SCIM security integrations:
- SCIM integrations can be replicated from source to target account
- Enables disaster recovery scenarios
- Maintains consistent identity management across accounts

**Best Practices**

| Practice | Rationale |
|----------|-----------|
| Use ACCOUNTADMIN for setup | Ensures sufficient privileges |
| Create dedicated SCIM role | Follows least privilege principle |
| Apply SCIM network policy | Restricts access to IdP IPs only |
| Regenerate tokens before expiry | Prevents provisioning failures |
| Monitor with REST_EVENT_HISTORY | Tracks provisioning activity |
| Test in non-production first | Validates configuration safely |

**Ownership Considerations**

- All SCIM-provisioned users and roles are **owned** by the SCIM role
- The SCIM role must own users/roles for updates to sync
- Existing users can be transferred to SCIM ownership:

```sql
GRANT OWNERSHIP ON USER <username> TO ROLE okta_provisioner;
```

- Existing roles **cannot** be transferred to SCIM (create new roles instead)

**Common Troubleshooting**

| Issue | Possible Cause | Solution |
|-------|---------------|----------|
| Users not syncing | Wrong ownership | Transfer ownership to SCIM role |
| Authentication errors | Expired token | Generate new access token |
| Network errors | IP not allowed | Update SCIM network policy |
| Underscore in URL | Okta limitation | Use hyphen instead of underscore |
| Updates not reflecting | UPN changed in Azure | Reprovision user |

**Limitations Summary**

| Provider | Key Limitations |
|----------|----------------|
| All | Nested groups not fully supported |
| All | Changes in Snowflake don't sync to IdP |
| Okta | Underscores in URLs not supported |
| Azure AD | Password sync not supported |
| Azure AD | Private Link (AWS/GCP) not supported |
| Custom | Password sync not supported |

### Important Terms/Definitions

- **Replication**: Copying objects to another Snowflake account
- **Failover**: Switching to a secondary account during outages
- **Ownership Transfer**: Changing the role that owns an object
- **UPN (User Principal Name)**: Unique identifier for Azure AD users

### Exam Tips

- SCIM security integrations can be **replicated** to target accounts
- The SCIM role must **own** users/roles for updates to sync
- Existing roles **cannot** be brought under SCIM management
- Token expiration is **6 months** - plan for regeneration
- URL underscores must be converted to **hyphens** for Okta
- Azure AD does **not** support the `SYNC_PASSWORD` property

---

## Practice Questions

### Question 1
Which Snowflake function is used to generate a SCIM access token?

- A) `GENERATE_SCIM_TOKEN()`
- B) `SYSTEM$GENERATE_SCIM_ACCESS_TOKEN()`
- C) `CREATE_SCIM_ACCESS_TOKEN()`
- D) `SCIM$CREATE_TOKEN()`

<details>
<summary>Show Answer</summary>

**Answer**: B - `SYSTEM$GENERATE_SCIM_ACCESS_TOKEN()` is the correct function to generate SCIM access tokens.

</details>

### Question 2
How long is a SCIM access token valid before it expires?

- A) 30 days
- B) 90 days
- C) 6 months
- D) 1 year

<details>
<summary>Show Answer</summary>

**Answer**: C - SCIM access tokens are valid for 6 months and must be regenerated before expiration.

</details>

### Question 3
What is the correct SCIM_CLIENT value for a Microsoft Entra ID integration?

- A) `'microsoft'`
- B) `'entra'`
- C) `'azure'`
- D) `'aad'`

<details>
<summary>Show Answer</summary>

**Answer**: C - The SCIM_CLIENT value for Microsoft Entra ID (formerly Azure AD) is `'azure'`.

</details>

### Question 4
When a user is deactivated via SCIM, what happens in Snowflake?

- A) The user is deleted
- B) The user's `DISABLED` property is set to `TRUE`
- C) The user's password is removed
- D) The user's roles are revoked

<details>
<summary>Show Answer</summary>

**Answer**: B - Deactivating a user via SCIM sets the `DISABLED` property to `TRUE`. The user is not deleted.

</details>

### Question 5
Which of the following is TRUE about SCIM and SSO?

- A) SCIM automatically enables SSO for provisioned users
- B) SSO must be configured separately after SCIM provisioning
- C) SCIM replaces the need for SSO
- D) SSO must be configured before SCIM can work

<details>
<summary>Show Answer</summary>

**Answer**: B - SCIM provisioning does not automatically enable SSO. SSO must be configured separately using a SAML security integration.

</details>

### Question 6
What happens when a network policy is applied to a SCIM security integration?

- A) It is combined with the account-level network policy
- B) It overrides the account-level network policy for SCIM requests
- C) It has no effect on SCIM requests
- D) It disables the account-level network policy entirely

<details>
<summary>Show Answer</summary>

**Answer**: B - A network policy applied to a SCIM integration overrides any account-level network policy specifically for SCIM requests.

</details>

### Question 7
Which role typically owns users and groups created through Okta SCIM provisioning?

- A) `ACCOUNTADMIN`
- B) `SECURITYADMIN`
- C) `okta_provisioner`
- D) `SYSADMIN`

<details>
<summary>Show Answer</summary>

**Answer**: C - The `okta_provisioner` role (or the role specified in `RUN_AS_ROLE`) owns all users and roles provisioned through Okta SCIM.

</details>

### Question 8
How do groups in an identity provider map to Snowflake?

- A) Groups map to warehouses
- B) Groups map to databases
- C) Groups map to roles
- D) Groups map to schemas

<details>
<summary>Show Answer</summary>

**Answer**: C - Groups in the identity provider map one-to-one to roles in Snowflake.

</details>

### Question 9
Which table function can be used to audit SCIM API requests in Snowflake?

- A) `SCIM_HISTORY()`
- B) `REST_EVENT_HISTORY()`
- C) `QUERY_HISTORY()`
- D) `LOGIN_HISTORY()`

<details>
<summary>Show Answer</summary>

**Answer**: B - `REST_EVENT_HISTORY('scim')` can be used to audit SCIM API requests.

</details>

### Question 10
What is a known limitation of Microsoft Entra ID SCIM integration?

- A) It cannot provision users
- B) It cannot provision groups
- C) Password synchronization is not supported
- D) It cannot deactivate users

<details>
<summary>Show Answer</summary>

**Answer**: C - Password synchronization from Microsoft Entra ID to Snowflake is not supported. The `SYNC_PASSWORD` property only works with Okta.

</details>

---

## Summary

### Key Points to Remember

1. **SCIM Purpose**: Automates user and group provisioning from identity providers to Snowflake

2. **Supported Providers**: Okta (`'okta'`), Microsoft Entra ID (`'azure'`), and Custom (`'generic'`)

3. **Configuration**: Create security integration with `TYPE = SCIM`, specify `SCIM_CLIENT` and `RUN_AS_ROLE`

4. **Access Tokens**: Generated with `SYSTEM$GENERATE_SCIM_ACCESS_TOKEN()`, expire after 6 months

5. **User Lifecycle**: Create, update, deactivate, reactivate, and delete users via SCIM API

6. **Group Mapping**: IdP groups map one-to-one to Snowflake roles

7. **Network Policies**: Can be applied specifically to SCIM integrations, override account-level policies

8. **SCIM vs SSO**: SCIM handles provisioning, SSO handles authentication - configure separately

9. **Ownership**: SCIM provisioner role owns all provisioned users and roles

10. **Auditing**: Use `REST_EVENT_HISTORY('scim')` to monitor SCIM activity

### Quick Reference Table

| Configuration | Okta | Azure AD | Custom |
|--------------|------|----------|--------|
| SCIM_CLIENT | `'okta'` | `'azure'` | `'generic'` |
| SCIM Role | `okta_provisioner` | `aad_provisioner` | `generic_scim_provisioner` |
| Password Sync | Supported | Not Supported | Not Supported |
| Private Link | Public endpoint only | Public endpoint only | Public endpoint only |
| Nested Groups | Not Supported | Not Supported | Check with IdP |
