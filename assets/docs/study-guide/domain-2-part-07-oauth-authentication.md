# Domain 2: Account Access & Security
## Part 7: OAuth Authentication

---

## Table of Contents

1. [Introduction to OAuth in Snowflake](#introduction-to-oauth-in-snowflake)
2. [Key OAuth Concepts](#key-oauth-concepts)
3. [Snowflake OAuth vs External OAuth](#snowflake-oauth-vs-external-oauth)
4. [Snowflake OAuth Deep Dive](#snowflake-oauth-deep-dive)
5. [External OAuth Deep Dive](#external-oauth-deep-dive)
6. [OAuth Configuration Steps](#oauth-configuration-steps)
7. [Network Policies with OAuth](#network-policies-with-oauth)
8. [Managing User Consent](#managing-user-consent)
9. [OAuth for Local Applications](#oauth-for-local-applications)
10. [Troubleshooting OAuth](#troubleshooting-oauth)
11. [Exam Tips and Common Question Patterns](#exam-tips-and-common-question-patterns)

---

## Introduction to OAuth in Snowflake

OAuth (Open Authorization) is an industry-standard protocol that enables secure, delegated access to Snowflake without sharing passwords. Snowflake uses **security integrations** to configure OAuth, allowing clients to redirect users to an authorization page and generate access tokens for accessing Snowflake resources.

### Why OAuth Matters for the Exam

- OAuth is a key authentication mechanism in Snowflake's security model
- Understanding the difference between Snowflake OAuth and External OAuth is critical
- Security integrations are a fundamental concept tested on the exam
- OAuth configuration involves multiple components that examiners frequently test

### OAuth Protocol Support

Snowflake supports **OAuth 2.0** protocol for authentication and authorization with two main options:

1. **Snowflake OAuth** - Uses Snowflake's built-in OAuth service
2. **External OAuth** - Integrates with external authorization servers (IdPs)

---

## Key OAuth Concepts

### Security Integrations

A **security integration** is a Snowflake object that provides an interface between Snowflake and third-party services. For OAuth, it:

- Enables clients that support OAuth to redirect users to an authorization page
- Generates access tokens (and optionally, refresh tokens) for accessing Snowflake
- Establishes trust between Snowflake and the OAuth provider

### Token Types

| Token Type | Purpose | Lifetime |
|------------|---------|----------|
| **Access Token** | Grants access to Snowflake resources | Short-lived (typically minutes) |
| **Refresh Token** | Used to obtain new access tokens without re-authentication | Long-lived (configurable) |
| **Authorization Code** | Exchanged for access token during initial authorization | Very short-lived (single use) |

### OAuth Scopes

Scopes limit what operations and roles are permitted by the access token:

| Scope Value | Description |
|-------------|-------------|
| `refresh_token` | Request a refresh token to obtain new access tokens |
| `session:role:<role_name>` | Limit access token to a specific role |
| `SESSION:ROLE-ANY` | Allow any role the user has access to (External OAuth) |

### Connection Parameters

When connecting with OAuth, set these parameters:

```
authenticator = oauth
token = <oauth_access_token>
```

---

## Snowflake OAuth vs External OAuth

This comparison is **critical for the exam**:

| Feature | Snowflake OAuth | External OAuth |
|---------|-----------------|----------------|
| **Authorization Server** | Snowflake (built-in) | External IdP (Okta, Azure AD, etc.) |
| **Security Integration Syntax** | `CREATE SECURITY INTEGRATION type = oauth ...` | `CREATE SECURITY INTEGRATION type = external_oauth` |
| **OAuth Flow** | OAuth 2.0 authorization code grant flow | Any OAuth flow the client can initiate |
| **Token Issuer** | Snowflake | External authorization server |
| **Use Case** | Partner apps (Tableau, Looker), custom clients | Enterprise SSO, programmatic access |
| **Password Required** | User authenticates with Snowflake credentials | User authenticates with IdP credentials |

### When to Use Each

**Use Snowflake OAuth when:**
- Integrating with partner applications (Tableau, Looker)
- Building custom desktop or local applications
- Snowflake manages user authentication

**Use External OAuth when:**
- Enterprise requires centralized identity management
- Users authenticate through corporate SSO
- Programmatic access without browser interaction is needed
- Cloud-agnostic authorization server is required

---

## Snowflake OAuth Deep Dive

### Authorization Flow

1. **Authorization Request**: Application sends request to Snowflake authorization server
2. **User Authentication**: Snowflake displays authorization screen; user consents
3. **Authorization Code**: Snowflake returns authorization code to client
4. **Token Exchange**: Client exchanges authorization code for access token
5. **Resource Access**: Client uses access token to access Snowflake resources
6. **Token Refresh**: When access token expires, client uses refresh token to get new access token

### Supported Applications

| Application Type | Configuration |
|------------------|---------------|
| **Partner Applications** | Tableau Desktop, Tableau Cloud, Looker |
| **Custom Clients** | Any OAuth 2.0 compliant application |
| **Local Applications** | Desktop apps using built-in integration |

### Partner Application Configuration

**Tableau Desktop:**
```sql
CREATE SECURITY INTEGRATION td_oauth_int
    TYPE = OAUTH
    ENABLED = TRUE
    OAUTH_CLIENT = TABLEAU_DESKTOP;
```

**Tableau Cloud (Tableau Server):**
```sql
CREATE SECURITY INTEGRATION ts_oauth_int
    TYPE = OAUTH
    ENABLED = TRUE
    OAUTH_CLIENT = TABLEAU_SERVER;
```

**Looker:**
```sql
CREATE SECURITY INTEGRATION looker_oauth_int
    TYPE = OAUTH
    ENABLED = TRUE
    OAUTH_CLIENT = LOOKER;
```

### Custom Client Configuration

```sql
CREATE SECURITY INTEGRATION oauth_custom_int
    TYPE = OAUTH
    ENABLED = TRUE
    OAUTH_CLIENT = CUSTOM
    OAUTH_CLIENT_TYPE = 'CONFIDENTIAL'
    OAUTH_REDIRECT_URI = 'https://myapp.example.com/callback'
    OAUTH_ISSUE_REFRESH_TOKENS = TRUE
    OAUTH_REFRESH_TOKEN_VALIDITY = 86400;
```

### Key Parameters for Snowflake OAuth

| Parameter | Description | Default |
|-----------|-------------|---------|
| `OAUTH_CLIENT` | Type of client (TABLEAU_DESKTOP, TABLEAU_SERVER, LOOKER, CUSTOM) | Required |
| `OAUTH_REDIRECT_URI` | Redirect URL for authorization code (custom clients only) | Required for CUSTOM |
| `OAUTH_ISSUE_REFRESH_TOKENS` | Whether to issue refresh tokens | TRUE |
| `OAUTH_REFRESH_TOKEN_VALIDITY` | Refresh token lifetime in seconds | 7776000 (90 days) |
| `OAUTH_CLIENT_TYPE` | PUBLIC or CONFIDENTIAL (custom clients) | CONFIDENTIAL |

### Refresh Token Options

- **Standard refresh tokens**: Long-lived, can be reused
- **Single-use refresh tokens**: Mitigate token theft, each refresh generates new refresh token
- Configure with `OAUTH_USE_SECONDARY_ROLES` for additional role access

---

## External OAuth Deep Dive

### Supported External Authorization Servers

| Provider | Type Value | Key Parameters |
|----------|------------|----------------|
| **Okta** | `okta` | `external_oauth_jws_keys_url` |
| **Microsoft Azure AD** | `azure` | `external_oauth_jws_keys_url` |
| **PingFederate** | `ping_federate` | `external_oauth_rsa_public_key` |
| **Custom** | `custom` | Either JWS keys URL or RSA public key |

### Benefits of External OAuth

1. **Centralized Token Issuance**: Dedicated authorization server ensures proper authentication
2. **Custom Approval Workflows**: Integrate manager approval or other policies
3. **No Snowflake Password**: Users authenticate only through External OAuth
4. **Browser-less Authentication**: Programmatic clients can authenticate without browser
5. **Cloud Agnostic**: Works with cloud or on-premises authorization servers

### External OAuth Scopes

| Scope | Description |
|-------|-------------|
| `session:role:<role_name>` | Use a specific Snowflake role |
| `SESSION:ROLE-ANY` | Use any role user has access to (requires `external_oauth_any_role_mode`) |

### Configuration Example: Okta

```sql
CREATE SECURITY INTEGRATION external_oauth_okta
    TYPE = EXTERNAL_OAUTH
    ENABLED = TRUE
    EXTERNAL_OAUTH_TYPE = OKTA
    EXTERNAL_OAUTH_ISSUER = 'https://dev-123456.okta.com/oauth2/default'
    EXTERNAL_OAUTH_JWS_KEYS_URL = 'https://dev-123456.okta.com/oauth2/default/v1/keys'
    EXTERNAL_OAUTH_AUDIENCE_LIST = ('https://myaccount.snowflakecomputing.com')
    EXTERNAL_OAUTH_TOKEN_USER_MAPPING_CLAIM = 'sub'
    EXTERNAL_OAUTH_SNOWFLAKE_USER_MAPPING_ATTRIBUTE = 'login_name';
```

### Configuration Example: Azure AD

```sql
CREATE SECURITY INTEGRATION external_oauth_azure
    TYPE = EXTERNAL_OAUTH
    ENABLED = TRUE
    EXTERNAL_OAUTH_TYPE = AZURE
    EXTERNAL_OAUTH_ISSUER = 'https://sts.windows.net/<tenant_id>/'
    EXTERNAL_OAUTH_JWS_KEYS_URL = 'https://login.microsoftonline.com/<tenant_id>/discovery/v2.0/keys'
    EXTERNAL_OAUTH_AUDIENCE_LIST = ('<application_id_uri>')
    EXTERNAL_OAUTH_TOKEN_USER_MAPPING_CLAIM = 'upn'
    EXTERNAL_OAUTH_SNOWFLAKE_USER_MAPPING_ATTRIBUTE = 'login_name';
```

### Configuration Example: PingFederate

```sql
CREATE SECURITY INTEGRATION external_oauth_pingfed
    TYPE = EXTERNAL_OAUTH
    ENABLED = TRUE
    EXTERNAL_OAUTH_TYPE = PING_FEDERATE
    EXTERNAL_OAUTH_ISSUER = '<unique_issuer_id>'
    EXTERNAL_OAUTH_RSA_PUBLIC_KEY = '<base64_encoded_public_key>'
    EXTERNAL_OAUTH_TOKEN_USER_MAPPING_CLAIM = 'username'
    EXTERNAL_OAUTH_SNOWFLAKE_USER_MAPPING_ATTRIBUTE = 'login_name';
```

### Power BI SSO Configuration

Power BI uses External OAuth with Azure AD:

```sql
CREATE SECURITY INTEGRATION powerbi
    TYPE = EXTERNAL_OAUTH
    ENABLED = TRUE
    EXTERNAL_OAUTH_TYPE = AZURE
    EXTERNAL_OAUTH_ISSUER = 'https://sts.windows.net/<tenant_id>/'
    EXTERNAL_OAUTH_JWS_KEYS_URL = 'https://login.windows.net/common/discovery/keys'
    EXTERNAL_OAUTH_AUDIENCE_LIST = (
        'https://analysis.windows.net/powerbi/connector/Snowflake',
        'https://analysis.windows.net/powerbi/connector/snowflake'
    )
    EXTERNAL_OAUTH_TOKEN_USER_MAPPING_CLAIM = 'upn'
    EXTERNAL_OAUTH_SNOWFLAKE_USER_MAPPING_ATTRIBUTE = 'login_name';
```

### Key Parameters for External OAuth

| Parameter | Description |
|-----------|-------------|
| `EXTERNAL_OAUTH_TYPE` | Provider type (OKTA, AZURE, PING_FEDERATE, CUSTOM) |
| `EXTERNAL_OAUTH_ISSUER` | Token issuer URL |
| `EXTERNAL_OAUTH_JWS_KEYS_URL` | URL to JSON Web Key Set for token validation |
| `EXTERNAL_OAUTH_RSA_PUBLIC_KEY` | Alternative to JWS keys URL |
| `EXTERNAL_OAUTH_AUDIENCE_LIST` | Expected audience values in token |
| `EXTERNAL_OAUTH_TOKEN_USER_MAPPING_CLAIM` | Claim containing username (sub, upn, etc.) |
| `EXTERNAL_OAUTH_SNOWFLAKE_USER_MAPPING_ATTRIBUTE` | Snowflake user attribute to match (login_name, email_address) |
| `EXTERNAL_OAUTH_ANY_ROLE_MODE` | Enable SESSION:ROLE-ANY scope |
| `EXTERNAL_OAUTH_ALLOWED_ROLES` | List of allowed roles (blocks ACCOUNTADMIN by default) |

### ANY Role Configuration

To allow users to use any role they have access to:

```sql
CREATE SECURITY INTEGRATION external_oauth_1
    TYPE = EXTERNAL_OAUTH
    ...
    EXTERNAL_OAUTH_ANY_ROLE_MODE = 'ENABLE';
```

Values for `EXTERNAL_OAUTH_ANY_ROLE_MODE`:
- `DISABLE` - SESSION:ROLE-ANY scope not allowed (default)
- `ENABLE` - Any user can use any role
- `ENABLE_FOR_PRIVILEGE` - Only users/roles granted USE_ANY_ROLE can use any role

Grant USE_ANY_ROLE privilege:
```sql
GRANT USE_ANY_ROLE ON INTEGRATION external_oauth_1 TO ROLE analyst_role;
```

---

## OAuth Configuration Steps

### Step 1: Plan Your OAuth Strategy

1. Determine if you need Snowflake OAuth or External OAuth
2. Identify which applications need OAuth access
3. Plan network policies for OAuth traffic
4. Define role and scope requirements

### Step 2: Create Security Integration

**For Snowflake OAuth (Partner App):**
```sql
CREATE SECURITY INTEGRATION my_tableau_int
    TYPE = OAUTH
    ENABLED = TRUE
    OAUTH_CLIENT = TABLEAU_DESKTOP;
```

**For External OAuth:**
```sql
CREATE SECURITY INTEGRATION my_okta_int
    TYPE = EXTERNAL_OAUTH
    ENABLED = TRUE
    EXTERNAL_OAUTH_TYPE = OKTA
    EXTERNAL_OAUTH_ISSUER = '<issuer_url>'
    EXTERNAL_OAUTH_JWS_KEYS_URL = '<jws_keys_url>'
    EXTERNAL_OAUTH_TOKEN_USER_MAPPING_CLAIM = 'sub'
    EXTERNAL_OAUTH_SNOWFLAKE_USER_MAPPING_ATTRIBUTE = 'login_name';
```

### Step 3: Verify Integration

```sql
DESC SECURITY INTEGRATION my_oauth_int;

SHOW SECURITY INTEGRATIONS;
```

### Step 4: Configure Client Application

- Set `authenticator = oauth`
- Set `token = <access_token>`
- Configure redirect URIs if needed

### Step 5: Test Authentication

```python
# Python connector example
import snowflake.connector

conn = snowflake.connector.connect(
    account='myaccount',
    user='myuser',
    authenticator='oauth',
    token='<external_oauth_access_token>',
    warehouse='mywarehouse',
    database='mydb'
)
```

---

## Network Policies with OAuth

### Snowflake OAuth Network Policy

Associate a network policy with the security integration:

```sql
CREATE SECURITY INTEGRATION oauth_int_with_policy
    TYPE = OAUTH
    ENABLED = TRUE
    OAUTH_CLIENT = CUSTOM
    ...
    NETWORK_POLICY = my_oauth_network_policy;
```

Or update an existing integration:

```sql
ALTER SECURITY INTEGRATION oauth_int
    SET NETWORK_POLICY = my_oauth_network_policy;
```

**Important**: The network policy governs:
- Token requests from client to Snowflake
- Connection requests using the token

It does NOT govern:
- User authentication through browser (that uses user-level network policy)

### External OAuth Network Policy

```sql
CREATE SECURITY INTEGRATION external_oauth_int
    TYPE = EXTERNAL_OAUTH
    ...
    NETWORK_POLICY = my_external_oauth_policy;
```

### Partner Application Network Policies

- **Looker**: Supports network policies
- **Tableau**: Does NOT support integration-level network policies
- **Power BI**: Does NOT support integration-level network policies (use account-level)

---

## Managing User Consent

### Delegated Authorizations

Pre-authorize user consent to skip the consent screen:

```sql
ALTER USER jane.smith
    ADD DELEGATED AUTHORIZATION
    OF ROLE analyst
    TO SECURITY INTEGRATION my_oauth_int;
```

### View Delegated Authorizations

```sql
SHOW DELEGATED AUTHORIZATIONS;

SHOW DELEGATED AUTHORIZATIONS
    BY USER jane.smith;
```

### Revoke Delegated Authorizations

```sql
-- Revoke all authorizations for an integration
ALTER USER jane.smith
    REMOVE DELEGATED AUTHORIZATIONS
    FROM SECURITY INTEGRATION my_oauth_int;

-- Revoke authorization for specific role
ALTER USER jane.smith
    REMOVE DELEGATED AUTHORIZATION
    OF ROLE analyst
    FROM SECURITY INTEGRATION my_oauth_int;
```

---

## OAuth for Local Applications

### Built-in Integration

Snowflake provides a built-in security integration for local/desktop applications:

```
SNOWFLAKE$LOCAL_APPLICATION
```

### Advantages

1. **No configuration required**: Works out of the box
2. **MFA compatible**: Works with multi-factor authentication
3. **Browser-based flow**: Opens browser for secure authentication
4. **Automatic token management**: Handles refresh tokens automatically

### Usage

For Snowflake clients (Python, ODBC, JDBC, etc.):

```python
conn = snowflake.connector.connect(
    account='myaccount',
    user='myuser',
    authenticator='oauth:local',  # Uses built-in integration
    ...
)
```

### Configuration Options

Account administrators can control the built-in integration:

| Parameter | Description | Default |
|-----------|-------------|---------|
| `ENABLED` | Enable/disable the integration | TRUE |
| `OAUTH_USE_SECONDARY_ROLES` | Allow secondary roles | IMPLICIT |
| `OAUTH_REFRESH_TOKEN_VALIDITY` | Token lifetime | 7776000 (90 days) |

---

## Troubleshooting OAuth

### Common Error Codes

| Error Code | Description | Resolution |
|------------|-------------|------------|
| `390318` | Invalid OAuth access token | Verify token format and expiration |
| `390144` | User not found | Check user mapping configuration |
| `390302` | Security integration not found | Verify integration exists and is enabled |
| `391103` | Invalid issuer | Verify `external_oauth_issuer` value |

### Auditing OAuth Logins

Query login history to audit OAuth authentication:

```sql
SELECT *
FROM SNOWFLAKE.ACCOUNT_USAGE.LOGIN_HISTORY
WHERE FIRST_AUTHENTICATION_FACTOR = 'OAUTH_ACCESS_TOKEN'
ORDER BY EVENT_TIMESTAMP DESC;
```

### Verify External OAuth Token

Use the system function to validate tokens:

```sql
SELECT SYSTEM$VERIFY_EXTERNAL_OAUTH_TOKEN('<token>');
```

### Debugging Checklist

1. **Token Expired?** Check token lifetime and refresh mechanism
2. **User Mapping Correct?** Verify claim-to-attribute mapping
3. **Integration Enabled?** Run `DESC SECURITY INTEGRATION`
4. **Network Policy Blocking?** Check IP restrictions
5. **Role Allowed?** Verify role is in allowed list or ANY role is configured

---

## Exam Tips and Common Question Patterns

### Critical Distinctions to Remember

1. **Type Values**:
   - Snowflake OAuth: `TYPE = OAUTH`
   - External OAuth: `TYPE = EXTERNAL_OAUTH`

2. **Client Parameter**:
   - Partner apps: `OAUTH_CLIENT = TABLEAU_DESKTOP | TABLEAU_SERVER | LOOKER`
   - Custom: `OAUTH_CLIENT = CUSTOM`

3. **External OAuth Type**:
   - `EXTERNAL_OAUTH_TYPE = OKTA | AZURE | PING_FEDERATE | CUSTOM`

4. **Token Validation**:
   - Snowflake OAuth: Snowflake validates its own tokens
   - External OAuth: Snowflake validates using JWS keys or RSA public key

### Likely Exam Question Topics

1. **Compare and contrast** Snowflake OAuth vs External OAuth
2. **Identify** the correct security integration syntax
3. **Determine** which OAuth type to use for a given scenario
4. **Configure** External OAuth with specific identity providers
5. **Troubleshoot** OAuth authentication failures
6. **Apply** network policies to OAuth integrations
7. **Manage** delegated authorizations and user consent

### Sample Exam Questions

**Question 1**: A company wants to allow Tableau Desktop users to connect to Snowflake using their Snowflake credentials. What type of security integration should they create?

**Answer**: Snowflake OAuth with `OAUTH_CLIENT = TABLEAU_DESKTOP`

---

**Question 2**: An organization uses Okta as their identity provider and wants users to authenticate to Snowflake using their Okta credentials. What parameter must be set in the security integration?

**Answer**: `TYPE = EXTERNAL_OAUTH` and `EXTERNAL_OAUTH_TYPE = OKTA`

---

**Question 3**: Which parameter controls whether users can use any role they have access to when using External OAuth?

**Answer**: `EXTERNAL_OAUTH_ANY_ROLE_MODE`

---

**Question 4**: A security integration for External OAuth is created but users cannot authenticate. The error indicates the issuer is invalid. What should be verified?

**Answer**: The `EXTERNAL_OAUTH_ISSUER` parameter value must match the issuer claim in the JWT token from the authorization server

---

**Question 5**: Which system-defined roles are blocked by default when using Power BI SSO to Snowflake?

**Answer**: ACCOUNTADMIN, ORGADMIN, GLOBALORGADMIN, and SECURITYADMIN

---

### Key Syntax to Memorize

**Snowflake OAuth (Partner)**:
```sql
CREATE SECURITY INTEGRATION <name>
    TYPE = OAUTH
    ENABLED = TRUE
    OAUTH_CLIENT = TABLEAU_DESKTOP | TABLEAU_SERVER | LOOKER;
```

**Snowflake OAuth (Custom)**:
```sql
CREATE SECURITY INTEGRATION <name>
    TYPE = OAUTH
    ENABLED = TRUE
    OAUTH_CLIENT = CUSTOM
    OAUTH_CLIENT_TYPE = 'CONFIDENTIAL'
    OAUTH_REDIRECT_URI = '<url>';
```

**External OAuth**:
```sql
CREATE SECURITY INTEGRATION <name>
    TYPE = EXTERNAL_OAUTH
    ENABLED = TRUE
    EXTERNAL_OAUTH_TYPE = <provider>
    EXTERNAL_OAUTH_ISSUER = '<issuer_url>'
    EXTERNAL_OAUTH_JWS_KEYS_URL = '<keys_url>'
    EXTERNAL_OAUTH_TOKEN_USER_MAPPING_CLAIM = '<claim>'
    EXTERNAL_OAUTH_SNOWFLAKE_USER_MAPPING_ATTRIBUTE = 'login_name';
```

### Quick Reference Card

| Concept | Snowflake OAuth | External OAuth |
|---------|-----------------|----------------|
| Integration Type | `type = oauth` | `type = external_oauth` |
| Auth Server | Snowflake | Okta, Azure AD, PingFederate, Custom |
| User Auth | Snowflake credentials | IdP credentials |
| Token Issuer | Snowflake | External IdP |
| Typical Use | Tableau, Looker, local apps | Enterprise SSO, Power BI |
| Network Policy | Supported | Supported |
| Replication | Supported | Supported |

---

## Summary

OAuth in Snowflake provides secure, delegated access without sharing passwords. The two main approaches are:

1. **Snowflake OAuth**: Uses Snowflake's built-in authorization server, ideal for partner applications and custom clients that need Snowflake to manage authentication

2. **External OAuth**: Integrates with enterprise identity providers, enabling SSO and centralized authentication management

Key exam takeaways:
- Know the syntax differences between Snowflake OAuth and External OAuth
- Understand when to use each type based on requirements
- Be familiar with partner applications and their specific configurations
- Remember that network policies can be applied to OAuth security integrations
- Understand token types, scopes, and the authorization flow
