# Domain 2: Account Access & Security - Part 5

## Multi-Factor Authentication (MFA)

### Overview

Multi-Factor Authentication (MFA) is a critical security feature that requires users to provide two or more verification factors when signing in to Snowflake. This significantly reduces the security risks associated with password-only authentication.

**Key Concept**: MFA is intended for **human users** who authenticate with a password. Service users must use alternative authentication methods such as OAuth or key-pair authentication.

---

## 1. Understanding MFA in Snowflake

### What is MFA?

MFA adds an additional layer of security beyond username and password by requiring a second factor of authentication. When enrolled in MFA, users must:

1. Enter their password (first factor - something you know)
2. Provide verification through a second factor (something you have)

### Available MFA Methods

Snowflake supports three types of second-factor authentication:

| MFA Method | Description | Key Characteristics |
|------------|-------------|---------------------|
| **Passkey** | WebAuthn-based authentication using public/private key cryptography | Recommended for security and usability; stored on device, hardware key, or password manager |
| **Authenticator App (TOTP)** | Time-based one-time passcode from apps like Google Authenticator, Microsoft Authenticator, or Authy | Widely supported; generates new codes every 30 seconds |
| **Duo** | Push notifications or passcodes via Duo Mobile application | Requires TCP port 443; not replicated like other MFA methods |

### Important Distinction: User Types

Snowflake distinguishes between user types, which affects MFA requirements:

| User Type | Description | MFA Requirement |
|-----------|-------------|-----------------|
| **PERSON** (or NULL) | Human users for interactive authentication | MFA enforced |
| **SERVICE** | Service-to-service authentication (programmatic) | MFA exempt; cannot use passwords |
| **LEGACY_SERVICE** | Temporary migration type for legacy applications | MFA exempt; being deprecated |

```sql
-- Setting user type
ALTER USER human_user SET TYPE = PERSON;
ALTER USER service_account SET TYPE = SERVICE;
```

---

## 2. MFA Configuration and Setup

### Enrolling Users in MFA

**For Individual Users (Self-Enrollment via Snowsight):**

1. Sign in to Snowsight
2. Select your name in the left navigation
3. Select **Settings** > **Authentication**
4. In the Multi-factor authentication section, select **Add new authentication method**
5. Follow the prompts to configure your chosen method

### Configuring Passkey Authentication

```
Step 1: When prompted, select "Passkey"
Step 2: Complete the storage setup (hardware key, biometric, password manager)
Step 3: Specify a name for identification
```

### Configuring Authenticator App (TOTP)

```
Step 1: When prompted, select "Authenticator"
Step 2: Scan QR code with your authenticator app
Step 3: Enter the verification code from the app
Step 4: Specify a name for the method
```

### Configuring Duo

**Prerequisites**: Firewall must allow TCP port 443 for `*.duosecurity.com`

```
Step 1: When prompted, select "DUO"
Step 2: Install Duo Mobile on your smartphone
Step 3: Complete the Duo enrollment process
Step 4: Configure push notifications or passcode preferences
```

---

## 3. Enforcing MFA with Authentication Policies

### Requiring MFA for All Human Users

```sql
-- Create authentication policy requiring MFA for password users
CREATE AUTHENTICATION POLICY enforce_mfa_policy
    AUTHENTICATION_METHODS = ('SAML', 'PASSWORD')
    SECURITY_INTEGRATIONS = ('my_saml_integration')
    MFA_ENROLLMENT = 'REQUIRED';

-- Apply at account level
ALTER ACCOUNT SET AUTHENTICATION POLICY = enforce_mfa_policy;
```

### MFA Enrollment Options

| Setting | Behavior |
|---------|----------|
| `MFA_ENROLLMENT = 'REQUIRED'` | All users must enroll in MFA |
| `MFA_ENROLLMENT = 'OPTIONAL'` | MFA enrollment is optional |
| `MFA_ENROLLMENT = 'REQUIRED_PASSWORD_ONLY'` | MFA required only for password authentication (SSO users rely on IdP) |

### Restricting Available MFA Methods

Administrators can control which MFA methods are available:

```sql
-- Allow only passkey and authenticator apps (not Duo)
CREATE AUTHENTICATION POLICY mfa_methods_policy
    MFA_ENROLLMENT = REQUIRED
    MFA_POLICY = (
        ALLOWED_METHODS = ('PASSKEY', 'TOTP')
    );
```

### Enforcing MFA for SSO Users

By default, Snowflake relies on the identity provider (IdP) to enforce MFA. To require Snowflake MFA **in addition** to IdP authentication:

```sql
-- Require MFA even for SSO users (double MFA)
CREATE AUTHENTICATION POLICY sso_with_mfa
    AUTHENTICATION_METHODS = ('PASSWORD', 'SAML')
    SECURITY_INTEGRATIONS = ('my_saml_integration')
    MFA_ENROLLMENT = 'REQUIRED'
    MFA_POLICY = (
        ENFORCE_MFA_ON_EXTERNAL_AUTHENTICATION = 'ALL'
    );
```

---

## 4. MFA Token Caching

### Overview

MFA token caching reduces the number of MFA prompts when making multiple connections within a short time interval.

**Key Facts:**
- Cached MFA token is valid for up to **4 hours**
- Token is stored in the client-side operating system keystore
- Users can delete cached tokens at any time

### Enabling MFA Token Caching

```sql
-- Enable MFA token caching at account level
ALTER ACCOUNT SET ALLOW_CLIENT_MFA_CACHING = TRUE;
```

**Client Configuration:**
- Set authenticator to `username_password_mfa` in connection string
- Install required packages (e.g., `snowflake-connector-python[secure-local-storage]` for Python)

### Token Invalidation Conditions

The cached MFA token becomes invalid when:

- `ALLOW_CLIENT_MFA_CACHING` is set to FALSE
- Authentication method changes
- Authentication credentials change
- Credentials are not valid
- Token expires or is cryptographically invalid
- Account name changes

### Supported Drivers/Connectors

| Driver/Connector | Minimum Version |
|------------------|-----------------|
| .NET Driver | 4.3.0 |
| ODBC Driver | 2.23.0 |
| JDBC Driver | 3.12.16 |
| Python Connector | 2.3.7 |
| Snowflake CLI | 3.0 |

### Querying MFA Token Usage

```sql
-- Find users who logged in using cached MFA tokens
SELECT
    EVENT_TIMESTAMP,
    USER_NAME,
    IS_SUCCESS
FROM SNOWFLAKE.ACCOUNT_USAGE.LOGIN_HISTORY
WHERE SECOND_AUTHENTICATION_FACTOR = 'MFA_TOKEN';
```

---

## 5. Bypassing MFA for Service Accounts and Recovery

### Service User Configuration

Service accounts should **NOT** use MFA. Instead, configure them properly:

```sql
-- Set user as SERVICE type (exempt from MFA, cannot use passwords)
ALTER USER service_account SET TYPE = SERVICE;

-- Create authentication policy for programmatic access
CREATE AUTHENTICATION POLICY programmatic_access_policy
    CLIENT_TYPES = ('DRIVERS', 'SNOWFLAKE_CLI', 'SNOWSQL')
    AUTHENTICATION_METHODS = ('OAUTH')
    SECURITY_INTEGRATIONS = ('my_oauth_integration');

-- Apply to service user
ALTER USER service_account SET AUTHENTICATION POLICY = programmatic_access_policy;
```

### Temporarily Bypassing MFA (User Recovery)

When a user loses access to their MFA device, administrators can temporarily disable MFA:

```sql
-- Allow user to bypass MFA for 30 minutes
ALTER USER locked_out_user SET MINS_TO_BYPASS_MFA = 30;
```

### Helping Users Set Up New MFA Method

```sql
-- Prompt user to enroll in new MFA method
ALTER USER locked_out_user ENROLL MFA;
```

- If user has a verified email: Snowflake sends enrollment email
- If no verified email: Snowflake returns a URL to provide to the user

### Removing MFA Methods

```sql
-- View user's MFA methods
SHOW MFA METHODS FOR USER joe;

-- Remove specific MFA method
ALTER USER joe REMOVE MFA METHOD TOTP-48A7;
```

---

## 6. One-Time Passcodes (OTP) for Break Glass Access

### Overview

One-time passcodes provide emergency access for administrators when normal authentication is unavailable (e.g., IdP outage).

### Generating OTPs

```sql
-- Generate 5 one-time passcodes for break glass user
ALTER USER breakglass_admin ADD MFA METHOD OTP COUNT = 5;
```

**Important Notes:**
- Each OTP can only be used **once**
- Store OTPs securely in a key vault with the user's password
- Always ensure backup MFA methods are available

### Invalidating OTPs

```sql
-- Invalidate a specific OTP for a user
ALTER USER joe REMOVE MFA METHOD OTP_2;

-- Generating new OTPs invalidates all previous OTPs
ALTER USER breakglass_admin ADD MFA METHOD OTP COUNT = 3;
```

---

## 7. MFA with Drivers and Connectors

### Duo Push (Default)

When enrolled in Duo MFA, the default behavior is **Duo Push** - no code changes required.

### Using Duo Passcodes

**JDBC Connection:**
```
// Using passcode parameter
jdbc:snowflake://xy12345.snowflakecomputing.com/?user=demo&passcode=123456

// Using passcode embedded in password
jdbc:snowflake://xy12345.snowflakecomputing.com/?user=demo&passcodeInPassword=on
```

**Python Connector:**
```python
# Using separate passcode
conn = snowflake.connector.connect(
    user='demo',
    password='abc123',
    passcode='987654',
    account='xy12345'
)

# Using passcode in password
conn = snowflake.connector.connect(
    user='demo',
    password='abc123987654',
    passcode_in_password=True,
    account='xy12345'
)
```

**SnowSQL:**
```bash
# Using passcode flag
snowsql -a xy12345 -u demo --mfa-passcode 123456

# Using passcode in password
snowsql -a xy12345 -u demo --mfa-passcode-in-password
```

**Node.js:**
```javascript
// Separate passcode
{
  authenticator: 'USERNAME_PASSWORD_MFA',
  password: "abc123",
  passcode: "987654"
}

// Passcode in password
{
  authenticator: 'USERNAME_PASSWORD_MFA',
  password: "abc123987654",
  passcodeInPassword: true
}
```

---

## 8. MFA Deprecation Timeline (Single-Factor Password Sign-ins)

Snowflake is implementing mandatory MFA in phases:

| Phase | Timeline | Impact |
|-------|----------|--------|
| **Phase 1** | Sep 2025 - Jan 2026 | Mandatory MFA for all Snowsight users |
| **Phase 2** | May 2026 - Jul 2026 | Strong authentication for NEW users; no new LEGACY_SERVICE users |
| **Phase 3** | Aug 2026 - Oct 2026 | Strong authentication for ALL users; LEGACY_SERVICE fully deprecated |

### Key Implications

1. **Human users (TYPE=PERSON)**: Must use MFA when authenticating with passwords
2. **Service users (TYPE=SERVICE)**: Cannot use passwords; must use OAuth or key-pair
3. **Legacy service users (TYPE=LEGACY_SERVICE)**: Being phased out; migrate to SERVICE type

---

## 9. Duo-Specific Error Codes

| Error Code | Name | Description |
|------------|------|-------------|
| 390120 | EXT_AUTHN_DENIED | Duo authentication denied |
| 390121 | EXT_AUTHN_PENDING | Duo authentication pending |
| 390122 | EXT_AUTHN_NOT_ENROLLED | User not enrolled in Duo |
| 390123 | EXT_AUTHN_LOCKED | User locked from Duo |
| 390124 | EXT_AUTHN_REQUESTED | Duo authentication required |
| 390125 | EXT_AUTHN_SMS_SENT | Passcode sent via SMS |
| 390126 | EXT_AUTHN_TIMEOUT | Duo approval timed out |
| 390127 | EXT_AUTHN_INVALID | Incorrect passcode |
| 390128 | EXT_AUTHN_SUCCEEDED | Duo authentication successful |
| 390129 | EXT_AUTHN_EXCEPTION | Communication problem with Duo |
| 390132 | EXT_AUTHN_DUO_PUSH_DISABLED | Duo Push not enabled |

---

## 10. Monitoring and Auditing MFA

### Viewing User MFA Methods

```sql
-- Show MFA methods for a specific user
SHOW MFA METHODS FOR USER joe;

-- Query credentials view for all users
SELECT * FROM SNOWFLAKE.ACCOUNT_USAGE.CREDENTIALS
WHERE CREDENTIAL_TYPE IN ('PASSKEY', 'TOTP');
```

### Auditing MFA Login Sessions

```sql
-- Join login history with credentials to see MFA method used
SELECT
    login.event_timestamp,
    login.user_name,
    cred.name AS mfa_method_name
FROM SNOWFLAKE.ACCOUNT_USAGE.LOGIN_HISTORY login
JOIN SNOWFLAKE.ACCOUNT_USAGE.CREDENTIALS cred
    ON login.second_authentication_factor_id = cred.credential_id
WHERE login.second_authentication_factor IN ('PASSKEY', 'TOTP');
```

### Trust Center for Risky Users

```sql
-- Find human users at risk (not using MFA)
SELECT * FROM SNOWFLAKE.TRUST_CENTER.FINDINGS
WHERE scanner_id = 'THREAT_INTELLIGENCE_NON_MFA_PERSON_USERS'
AND total_at_risk_count != 0;

-- Find service users using passwords
SELECT * FROM SNOWFLAKE.TRUST_CENTER.FINDINGS
WHERE scanner_id = 'THREAT_INTELLIGENCE_PASSWORD_SERVICE_USERS'
AND total_at_risk_count != 0;
```

---

## Exam Tips and Common Question Patterns

### High-Priority Topics

1. **User Types and MFA Requirements**
   - PERSON users: MFA required for password authentication
   - SERVICE users: Cannot use passwords; exempt from MFA
   - LEGACY_SERVICE: Temporary type being deprecated

2. **MFA Token Caching**
   - Valid for up to 4 hours
   - Requires `ALLOW_CLIENT_MFA_CACHING = TRUE`
   - Uses `username_password_mfa` authenticator

3. **Bypassing MFA**
   - Use `MINS_TO_BYPASS_MFA` for temporary bypass
   - Use `ALTER USER ... ENROLL MFA` to help users set up new method
   - One-time passcodes (OTP) for break glass scenarios

### Common Exam Question Patterns

**Q: What command temporarily disables MFA for a locked-out user?**
```sql
ALTER USER username SET MINS_TO_BYPASS_MFA = 30;
```

**Q: How do you require MFA for all human users?**
```sql
CREATE AUTHENTICATION POLICY require_mfa
    MFA_ENROLLMENT = 'REQUIRED';
ALTER ACCOUNT SET AUTHENTICATION POLICY = require_mfa;
```

**Q: Which user type should be used for service accounts?**
- **TYPE = SERVICE** (cannot use passwords, must use OAuth or key-pair)

**Q: What is the maximum duration for cached MFA tokens?**
- **4 hours**

**Q: Which port does Duo require?**
- **TCP port 443** for `*.duosecurity.com`

**Q: How do you view a user's MFA methods?**
```sql
SHOW MFA METHODS FOR USER username;
```

### Key Concepts to Remember

| Concept | Key Point |
|---------|-----------|
| MFA Target Audience | Human users with password authentication only |
| Recommended MFA Method | Passkeys (security and usability) |
| Duo Limitation | Not replicated like other MFA methods |
| Service Users | Cannot use passwords; use OAuth or key-pair |
| Token Caching Duration | Up to 4 hours |
| Break Glass Access | Use OTPs stored in secure vault |
| Phase 1 Enforcement | Snowsight mandatory MFA (Sep 2025 - Jan 2026) |
| Full Enforcement | All users (Aug 2026 - Oct 2026) |

### Security Best Practices

1. Set appropriate user TYPE for all users (PERSON vs SERVICE)
2. Use SSO with IdP-enforced MFA when possible
3. Enable network policies in conjunction with MFA
4. Implement break glass procedures with OTPs
5. Regularly audit users not enrolled in MFA using Trust Center
6. Rotate static credentials according to organizational policies
7. Plan migration from LEGACY_SERVICE before deprecation

---

## Summary

Multi-Factor Authentication is a foundational security control in Snowflake that:

- **Protects human users** with a second authentication factor
- **Exempts service users** who should use OAuth or key-pair authentication
- **Provides flexibility** through authentication policies
- **Supports recovery** through temporary bypass and OTP codes
- **Enables efficiency** through MFA token caching
- **Is becoming mandatory** through Snowflake's deprecation of single-factor passwords

Understanding MFA configuration, user types, and the deprecation timeline is essential for both the SnowPro Core exam and real-world Snowflake administration.
