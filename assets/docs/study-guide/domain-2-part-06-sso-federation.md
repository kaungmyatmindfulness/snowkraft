# Domain 2: Account Access & Security
## Part 6: Single Sign-On (SSO) and Federated Authentication

**Exam Weight:** This topic is part of Domain 2 (20-25% of exam)

---

## Overview

Federated authentication enables organizations to use their existing Identity Provider (IdP) to authenticate users accessing Snowflake. This eliminates the need for separate Snowflake credentials and provides centralized user management through Single Sign-On (SSO). Understanding SAML 2.0, security integrations, and IdP configuration is essential for the SnowPro Core exam.

---

## Section 1: Federated Authentication Fundamentals

### Key Terminology

| Term | Definition |
|------|------------|
| **Identity Provider (IdP)** | External entity responsible for storing user identities and authenticating users for SSO |
| **Service Provider (SP)** | The service users want to access (Snowflake in this context) |
| **SAML 2.0** | Security Assertion Markup Language - the industry standard protocol for exchanging authentication data |
| **Federation** | Trust relationship between IdP and SP enabling SSO |
| **Assertion** | XML document containing user authentication information sent from IdP to SP |

### How Federated Authentication Works

In a federated environment:

1. **Identity Provider (IdP)** - Manages user identities, provides user creation/management, and authenticates users for SSO access
2. **Service Provider (SP)** - Snowflake receives authentication assertions from the IdP and grants access based on them

The IdP handles ALL authentication - Snowflake trusts the IdP's assertion that a user is who they claim to be.

---

## Section 2: SSO Authentication Flows

Snowflake supports two SSO workflows:

### IdP-Initiated SSO Flow

```
+--------+      +--------+      +-----------+
|  User  | ---> |  IdP   | ---> | Snowflake |
+--------+      +--------+      +-----------+
    |               |                |
    | 1. Login      |                |
    | to IdP portal |                |
    |-------------->|                |
    |               |                |
    |  2. Select    |                |
    |  Snowflake app|                |
    |-------------->|                |
    |               |                |
    |               | 3. SAML        |
    |               | Response       |
    |               |--------------->|
    |               |                |
    |               |   4. Session   |
    |<--------------------------------|
    |               |   created      |
```

**Steps:**
1. User navigates to the IdP's login portal (e.g., Okta dashboard)
2. User enters credentials and is authenticated by the IdP
3. User clicks on the Snowflake application in the IdP portal
4. IdP sends a SAML response to Snowflake to initiate a session
5. Snowflake web interface displays to the user

### SP-Initiated (Snowflake-Initiated) SSO Flow

```
+--------+      +-----------+      +--------+      +-----------+
|  User  | ---> | Snowflake | ---> |  IdP   | ---> | Snowflake |
+--------+      +-----------+      +--------+      +-----------+
    |               |                  |                |
    | 1. Access     |                  |                |
    | Snowflake URL |                  |                |
    |-------------->|                  |                |
    |               |                  |                |
    |               | 2. Redirect      |                |
    |               | to IdP           |                |
    |               |----------------->|                |
    |               |                  |                |
    |   3. Login    |                  |                |
    |   at IdP      |                  |                |
    |------------------------------- ->|                |
    |               |                  |                |
    |               |  4. SAML Response|                |
    |               |<-----------------|                |
    |               |                  |                |
    |               |      5. Session created           |
    |<----------------------------------------------- --|
```

**Steps:**
1. User navigates to the Snowflake login page
2. User enters their email/username (identifier-first login)
3. Snowflake redirects the user to the IdP for authentication
4. User authenticates with the IdP
5. IdP sends SAML response back to Snowflake
6. Snowflake creates a session and displays the web interface

---

## Section 3: Supported Identity Providers

### Native Snowflake Support

These vendors provide **native** Snowflake integration:

| IdP | Key Feature |
|-----|-------------|
| **Okta** | Pre-built Snowflake application, native SSO support |
| **Microsoft AD FS** | Active Directory Federation Services integration |

### SAML 2.0 Compatible Providers

Snowflake supports **most** SAML 2.0-compliant vendors:

| Provider | Notes |
|----------|-------|
| **Microsoft Entra ID** (Azure AD) | Enterprise identity management |
| **OneLogin** | Cloud-based identity provider |
| **PingOne / PingFederate** | Enterprise SSO platform |
| **Google Workspace** | SAML support for Google accounts |
| **Custom SAML 2.0** | Any SAML 2.0 compliant service |

---

## Section 4: SAML2 Security Integration

### Creating a Security Integration

The SAML2 security integration is the **primary method** for configuring federated authentication in Snowflake. It replaces the deprecated `SAML_IDENTITY_PROVIDER` account parameter.

```sql
CREATE SECURITY INTEGRATION my_idp
  TYPE = SAML2
  SAML2_ISSUER = 'https://example.com'
  SAML2_SSO_URL = 'http://myssoprovider.com'
  SAML2_PROVIDER = 'ADFS'
  SAML2_X509_CERT = 'MIICr...'
  SAML2_SNOWFLAKE_ISSUER_URL = 'https://<orgname>-<account_name>.snowflakecomputing.com'
  SAML2_SNOWFLAKE_ACS_URL = 'https://<orgname>-<account_name>.snowflakecomputing.com/fed/login';
```

### Required Security Integration Properties

| Property | Description |
|----------|-------------|
| **TYPE** | Must be `SAML2` |
| **SAML2_ISSUER** | The IdP's entity ID / issuer URL |
| **SAML2_SSO_URL** | The IdP's single sign-on endpoint URL |
| **SAML2_PROVIDER** | IdP type: `OKTA`, `ADFS`, `CUSTOM` |
| **SAML2_X509_CERT** | The IdP's X.509 certificate (public key) for signature verification |

### Important URL Properties

| Property | Description |
|----------|-------------|
| **SAML2_SNOWFLAKE_ISSUER_URL** | Snowflake's entity ID sent to IdP |
| **SAML2_SNOWFLAKE_ACS_URL** | Snowflake's Assertion Consumer Service URL (must end with `/fed/login`) |

### Enabling SP-Initiated SSO

By default, only IdP-initiated SSO is enabled. To enable Snowflake-initiated SSO:

```sql
-- Enable SP-initiated SSO
ALTER SECURITY INTEGRATION my_idp SET SAML2_ENABLE_SP_INITIATED = true;

-- Set the label shown on the login page
ALTER SECURITY INTEGRATION my_idp SET SAML2_SP_INITIATED_LOGIN_PAGE_LABEL = 'My IdP';
```

### Optional Security Properties

| Property | Default | Description |
|----------|---------|-------------|
| **SAML2_ENABLE_SP_INITIATED** | FALSE | Enable Snowflake-initiated SSO |
| **SAML2_SP_INITIATED_LOGIN_PAGE_LABEL** | - | Button label on Snowflake login page |
| **SAML2_SIGN_REQUEST** | FALSE | Sign SAML requests sent to IdP |
| **SAML2_FORCE_AUTHN** | FALSE | Force re-authentication at IdP |
| **SAML2_REQUESTED_NAMEID_FORMAT** | - | Format for user identifier in SAML assertion |
| **SAML2_POST_LOGOUT_REDIRECT_URL** | - | URL to redirect after logout |
| **SAML2_SNOWFLAKE_X509_CERT** | - | Snowflake's certificate for encryption |

### Viewing Security Integration Properties

```sql
-- View all properties of a security integration
DESCRIBE SECURITY INTEGRATION my_idp;
```

Output includes:
- SAML2_X509_CERT
- SAML2_PROVIDER
- SAML2_SSO_URL
- SAML2_ISSUER
- SAML2_SNOWFLAKE_ACS_URL
- SAML2_SNOWFLAKE_ISSUER_URL
- SAML2_SNOWFLAKE_METADATA (full XML metadata)

---

## Section 5: Configuring Identity Providers

### Okta Configuration

1. **Create an Okta account** for your organization
2. **Create users** in Okta with email addresses matching Snowflake `LOGIN_NAME` values
3. **Add Snowflake application** in Okta:
   - Browse App Integration Catalog
   - Search for "Snowflake"
   - Enter your account name (replace underscores with hyphens)
4. **Assign users** to the Snowflake application
5. **Obtain from Okta:**
   - SSO URL
   - X.509 Certificate
   - Issuer URL

### Microsoft AD FS Configuration

**Prerequisites:**
- AD FS 3.0 on Windows Server 2012 R2 or later
- Users with email addresses in AD FS

**Steps:**
1. **Add Relying Party Trust:**
   - Use the Add Relying Party Trust Wizard
   - Select "Enter data about the relying party manually"
   - Select "AD FS profile"
   - Enter Snowflake display name

2. **Define Claim Rules:**
   - Add rule to send LDAP attributes
   - Map E-Mail-Addresses to Name ID

3. **Enable Global Logout (Optional):**
   - Configure in Relying Party Trust properties

4. **Obtain SSO URL and Certificate:**
   - SSO URL: Your AD FS server + `/adfs/ls`
   - Certificate: Download from AD FS Management console

### Custom IdP Configuration

For any SAML 2.0 compliant IdP:

1. Create a SAML application in your IdP
2. Configure the following in your IdP:
   - **SP Entity ID / Issuer:** Your Snowflake account URL
   - **ACS URL:** `https://<account>.snowflakecomputing.com/fed/login`
   - **Name ID Format:** `emailAddress` (recommended)
3. Map user attributes (email to Name ID)
4. Export the IdP metadata or manually collect:
   - Issuer URL
   - SSO URL
   - X.509 Certificate

---

## Section 6: User Mapping and Configuration

### User Matching Between IdP and Snowflake

The IdP sends a **Name ID** (typically email address) in the SAML assertion. Snowflake matches this to a user's `LOGIN_NAME` property.

```sql
-- Create user with LOGIN_NAME matching IdP email
CREATE USER john_doe
  LOGIN_NAME = 'john.doe@company.com'
  EMAIL = 'john.doe@company.com'
  DISPLAY_NAME = 'John Doe';
```

### Name ID Format Options

| Format | URN | Use Case |
|--------|-----|----------|
| Email Address | `urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress` | Most common |
| Unspecified | `urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified` | Flexible matching |
| Persistent | `urn:oasis:names:tc:SAML:2.0:nameid-format:persistent` | Stable identifier |

Set the format in your security integration:

```sql
ALTER SECURITY INTEGRATION my_idp
  SET SAML2_REQUESTED_NAMEID_FORMAT = 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress';
```

---

## Section 7: Using Multiple Identity Providers

Snowflake supports configuring **multiple IdPs** for different users.

### Requirements

1. **Identifier-first login** must be enabled:
```sql
ALTER ACCOUNT SET ENABLE_IDENTIFIER_FIRST_LOGIN = true;
```

2. **Supported drivers only:** JDBC, ODBC, and Python connectors

### Associating Users with IdPs

**Option 1: Security Integration Assignment**

Set the default security integration for a user:
```sql
ALTER USER example_user SET DEFAULT_SECONDARY_ROLES = ('ALL');
```

**Option 2: Authentication Policy (Recommended)**

Create an authentication policy specifying allowed security integrations:

```sql
-- Create security integrations for each IdP
CREATE SECURITY INTEGRATION example_okta_integration
  TYPE = SAML2
  SAML2_SSO_URL = 'https://okta.example.com'
  ...;

CREATE SECURITY INTEGRATION example_entra_integration
  TYPE = SAML2
  SAML2_SSO_URL = 'https://entra-example.com'
  ...;

-- Create authentication policy with multiple IdPs
CREATE AUTHENTICATION POLICY multiple_idps_policy
  AUTHENTICATION_METHODS = ('SAML')
  SECURITY_INTEGRATIONS = ('EXAMPLE_OKTA_INTEGRATION', 'EXAMPLE_ENTRA_INTEGRATION');

-- Apply to account or specific users
ALTER ACCOUNT SET AUTHENTICATION POLICY multiple_idps_policy;
```

---

## Section 8: Authentication Policies with SSO

### Authentication Policy Overview

Authentication policies control:
- Allowed authentication methods (SAML, PASSWORD, etc.)
- Allowed security integrations
- Client type restrictions

### Creating an SSO-Only Policy

```sql
-- Allow only SAML authentication
CREATE AUTHENTICATION POLICY saml_only_policy
  AUTHENTICATION_METHODS = ('SAML')
  SECURITY_INTEGRATIONS = ('MY_IDP');

-- Apply to account
ALTER ACCOUNT SET AUTHENTICATION POLICY saml_only_policy;
```

### Mixed Authentication Policy

```sql
-- Allow both SAML and password
CREATE AUTHENTICATION POLICY mixed_auth_policy
  AUTHENTICATION_METHODS = ('SAML', 'PASSWORD')
  SECURITY_INTEGRATIONS = ('MY_OKTA_INTEGRATION');

-- Apply to specific user
ALTER USER example_user SET AUTHENTICATION POLICY mixed_auth_policy;
```

### Login Behavior Based on Policy

| Policy Configuration | Login Behavior |
|---------------------|----------------|
| Only PASSWORD | Username/password form displayed |
| Only SAML (single IdP) | Redirect to IdP login |
| Only SAML (multiple IdPs) | Multiple SSO buttons displayed |
| SAML + PASSWORD | SSO button and password option shown |

---

## Section 9: Browser-Based vs Native SSO

### Browser-Based SSO

**How it works:**
1. Application launches default web browser
2. Browser displays IdP authentication page
3. User authenticates with IdP
4. Browser shows success message
5. Application receives authentication token

**Configuration:**
```python
# Python connector example
conn = snowflake.connector.connect(
    account='myaccount',
    user='myuser',
    authenticator='externalbrowser'
)
```

| Client | Configuration |
|--------|--------------|
| JDBC | `authenticator=externalbrowser` in connection string |
| ODBC | `authenticator=externalbrowser` in odbc.ini |
| Python | `authenticator='externalbrowser'` parameter |
| SnowSQL | `--authenticator externalbrowser` flag |

### Native SSO (Okta Only)

**Requirements:**
- Okta as the IdP
- Snowflake driver v1.6.1 or higher

**Configuration:**
```python
# Python connector with native Okta SSO
conn = snowflake.connector.connect(
    account='myaccount',
    user='myuser',
    authenticator='https://mycompany.okta.com'
)
```

**Limitation:** MFA is NOT supported with native Okta SSO - use browser-based SSO for MFA.

---

## Section 10: SSO with Private Connectivity

### Overview

SSO can be configured for accounts using private connectivity (AWS PrivateLink, Azure Private Link, Google Cloud Private Service Connect).

### Configuration Requirements

1. **Configure private connectivity FIRST** before setting up SSO
2. **Use the privatelink URL** in security integration properties:

```sql
CREATE SECURITY INTEGRATION my_private_idp
  TYPE = SAML2
  SAML2_ISSUER = 'https://example.com'
  SAML2_SSO_URL = 'http://myssoprovider.com'
  SAML2_PROVIDER = 'OKTA'
  SAML2_X509_CERT = 'MIICr...'
  SAML2_SNOWFLAKE_ISSUER_URL = 'https://<orgname>-<account_name>.privatelink.snowflakecomputing.com'
  SAML2_SNOWFLAKE_ACS_URL = 'https://<orgname>-<account_name>.privatelink.snowflakecomputing.com/fed/login';
```

**Important:** SSO works with only ONE account URL at a time - either public OR private connectivity URL.

---

## Section 11: Session Behavior and Timeouts

### Session Timeout Behavior

| Scenario | Behavior |
|----------|----------|
| **Snowflake session timeout** | Web interface disabled, prompt to re-authenticate via IdP |
| **IdP session timeout** | User prompted to re-enter credentials at IdP |

### Force Re-authentication

To require users to re-authenticate at IdP even if they have an active IdP session:

```sql
ALTER SECURITY INTEGRATION my_idp SET SAML2_FORCE_AUTHN = true;
```

### Connection Caching (Browser-Based SSO)

To minimize authentication prompts:
- Snowflake can cache browser-based SSO connections
- Reduces frequency of browser redirects for repeat connections

---

## Section 12: Certificate Management

### IdP Certificate (SAML2_X509_CERT)

The IdP's public certificate used by Snowflake to verify SAML assertions.

**Updating the certificate:**
```sql
ALTER SECURITY INTEGRATION my_idp SET SAML2_X509_CERT = 'NEW_CERT_VALUE...';
```

### Snowflake Certificate (SAML2_SNOWFLAKE_X509_CERT)

Used to encrypt SAML assertions from IdP to Snowflake.

**Viewing the certificate:**
```sql
SELECT "property_value" FROM TABLE(RESULT_SCAN(LAST_QUERY_ID()))
  WHERE "property" = 'SAML2_SNOWFLAKE_X509_CERT';
```

**Refreshing Snowflake's private key:**
```sql
ALTER SECURITY INTEGRATION my_idp REFRESH SAML2_SNOWFLAKE_PRIVATE_KEY;
```

### Signed Requests (SAML2_SIGN_REQUEST)

Enable signing of SAML requests sent to IdP:

```sql
ALTER SECURITY INTEGRATION my_idp SET SAML2_SIGN_REQUEST = true;
```

When enabled, you must provide Snowflake's certificate to the IdP for verification.

---

## Section 13: Troubleshooting SSO

### Common Error Scenarios

| Error | Likely Cause | Solution |
|-------|--------------|----------|
| User not found | LOGIN_NAME doesn't match IdP Name ID | Verify user LOGIN_NAME matches IdP email |
| Certificate validation failed | IdP certificate expired/changed | Update SAML2_X509_CERT |
| Invalid assertion | Time sync issue | Check clock synchronization |
| ACS URL mismatch | Incorrect SAML2_SNOWFLAKE_ACS_URL | Ensure URL ends with `/fed/login` |

### Error Code Investigation

For errors with a UUID:
1. Note the UUID from the error message
2. Administrator can query login history for details:
```sql
SELECT * FROM SNOWFLAKE.ACCOUNT_USAGE.LOGIN_HISTORY
  WHERE ERROR_MESSAGE LIKE '%<UUID>%';
```

### Validation Checklist

1. **User exists** in both IdP AND Snowflake
2. **LOGIN_NAME** in Snowflake matches Name ID from IdP
3. **Certificate** is current and correctly formatted
4. **URLs** match exactly (including protocol, domain, path)
5. **Security integration** is enabled
6. **Time synchronization** between IdP and Snowflake servers

---

## Section 14: SSO Replication

### Replicating SSO Configuration

You can replicate SAML2 security integrations from source to target accounts:

```sql
-- Ensure the security integration allows replication
ALTER SECURITY INTEGRATION my_idp SET ALLOWED_ACCOUNTS = org1.account1, org1.account2;
```

**Use case:** Disaster recovery, multi-region deployments

---

## Summary Table: Key Properties

| Property | Purpose | Required |
|----------|---------|----------|
| SAML2_ISSUER | IdP entity ID | Yes |
| SAML2_SSO_URL | IdP login endpoint | Yes |
| SAML2_PROVIDER | IdP type (OKTA, ADFS, CUSTOM) | Yes |
| SAML2_X509_CERT | IdP public certificate | Yes |
| SAML2_SNOWFLAKE_ISSUER_URL | Snowflake entity ID | Yes (for private connectivity) |
| SAML2_SNOWFLAKE_ACS_URL | Assertion Consumer Service URL | Yes (for private connectivity) |
| SAML2_ENABLE_SP_INITIATED | Enable Snowflake-initiated SSO | No (default: FALSE) |
| SAML2_SIGN_REQUEST | Sign outgoing SAML requests | No (default: FALSE) |
| SAML2_FORCE_AUTHN | Force IdP re-authentication | No (default: FALSE) |

---

## Exam Tips and Common Question Patterns

### High-Priority Topics

1. **Security Integration vs Account Parameter**
   - SAML2 security integration is the CURRENT method
   - SAML_IDENTITY_PROVIDER parameter is DEPRECATED

2. **IdP-Initiated vs SP-Initiated SSO**
   - Know the difference in flow
   - SAML2_ENABLE_SP_INITIATED must be TRUE for Snowflake-initiated

3. **User Matching**
   - Name ID from IdP must match LOGIN_NAME in Snowflake
   - Email address format is most common

4. **Native vs Browser-Based SSO**
   - Native SSO: Only Okta, no MFA support
   - Browser-based: Any SAML 2.0 IdP, supports MFA

5. **Private Connectivity**
   - Configure private connectivity BEFORE SSO
   - URLs must use privatelink domain

### Common Exam Questions

**Q: What is required to enable Snowflake-initiated (SP-initiated) SSO?**
A: Set `SAML2_ENABLE_SP_INITIATED = true` on the security integration

**Q: Which property contains the IdP's certificate?**
A: `SAML2_X509_CERT`

**Q: What URL path must the ACS URL end with?**
A: `/fed/login`

**Q: Which IdPs have native Snowflake support?**
A: Okta and Microsoft AD FS

**Q: How do you configure browser-based SSO in a Python connector?**
A: `authenticator='externalbrowser'`

**Q: Can you use multiple IdPs for different users?**
A: Yes, using authentication policies and SECURITY_INTEGRATIONS property

**Q: What happens when SAML2_FORCE_AUTHN is TRUE?**
A: Users must re-authenticate at IdP even with active IdP session

---

## Practice Scenario

**Scenario:** Your organization uses Okta for identity management. You need to configure SSO for Snowflake with the following requirements:
- Users should be able to initiate login from the Snowflake login page
- Encryption should be enabled for SAML assertions
- Users from only the "company.com" domain should be able to authenticate

**Solution:**

```sql
-- Create the SAML2 security integration
CREATE SECURITY INTEGRATION okta_sso
  TYPE = SAML2
  SAML2_ISSUER = 'https://mycompany.okta.com/app/snowflake/abc123'
  SAML2_SSO_URL = 'https://mycompany.okta.com/app/snowflake/abc123/sso/saml'
  SAML2_PROVIDER = 'OKTA'
  SAML2_X509_CERT = 'MIICnTCCAYUC...'
  SAML2_ENABLE_SP_INITIATED = TRUE
  SAML2_SP_INITIATED_LOGIN_PAGE_LABEL = 'Okta SSO';

-- Create authentication policy with domain restriction
CREATE AUTHENTICATION POLICY okta_policy
  AUTHENTICATION_METHODS = ('SAML')
  SECURITY_INTEGRATIONS = ('OKTA_SSO')
  ALLOWED_USER_DOMAINS = ('company.com');

-- Apply policy to account
ALTER ACCOUNT SET AUTHENTICATION POLICY okta_policy;
```

---

## Quick Reference Card

### Creating Basic SSO

```sql
CREATE SECURITY INTEGRATION my_sso
  TYPE = SAML2
  SAML2_ISSUER = '<idp_issuer>'
  SAML2_SSO_URL = '<idp_sso_url>'
  SAML2_PROVIDER = 'OKTA' | 'ADFS' | 'CUSTOM'
  SAML2_X509_CERT = '<certificate>';
```

### Enabling SP-Initiated

```sql
ALTER SECURITY INTEGRATION my_sso
  SET SAML2_ENABLE_SP_INITIATED = true
      SAML2_SP_INITIATED_LOGIN_PAGE_LABEL = 'Company SSO';
```

### Authenticator Values for Clients

| Authenticator | SSO Type |
|---------------|----------|
| `externalbrowser` | Browser-based SSO (any IdP) |
| `https://<okta>.okta.com` | Native Okta SSO |

### Required Privileges

| Privilege | Required For |
|-----------|--------------|
| CREATE INTEGRATION | Creating security integrations |
| OWNERSHIP | Modifying security integrations |
| APPLY AUTHENTICATION POLICY | Setting auth policies |
| ACCOUNTADMIN | Account-level SSO configuration |
