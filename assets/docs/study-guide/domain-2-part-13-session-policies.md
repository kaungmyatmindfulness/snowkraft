# Domain 2: Account Access & Security
## Part 13: Session Policies and Authentication Policies

---

## Overview

Session policies and authentication policies are two key security features in Snowflake that control how users connect to and maintain sessions within the platform:

- **Session Policies**: Control idle timeout periods and secondary role usage
- **Authentication Policies**: Control which authentication methods and clients can be used to access Snowflake

Both policy types can be applied at the **account level** or **user level**, with user-level policies taking precedence over account-level policies.

---

## Session Policies

### What is a Session Policy?

A **session policy** defines the idle session timeout period and provides options to control secondary role activation. Sessions begin when a user successfully authenticates to Snowflake using a programmatic client or Snowsight.

### Key Session Policy Properties

| Property | Description | Default | Min | Max |
|----------|-------------|---------|-----|-----|
| `SESSION_IDLE_TIMEOUT_MINS` | Idle timeout for programmatic clients (SnowSQL, drivers, connectors) | 240 minutes (4 hours) | 5 minutes | 240 minutes |
| `SESSION_UI_IDLE_TIMEOUT_MINS` | Idle timeout for Snowsight web interface | 240 minutes (4 hours) | 5 minutes | 240 minutes |
| `ALLOWED_SECONDARY_ROLES` | Controls which secondary roles a user can activate | ALL | - | - |

### Session Timeout Behavior

**When a session times out:**
- The user must re-authenticate to Snowflake
- The timeout period begins upon successful authentication
- If no session policy is set, Snowflake uses the default of 240 minutes (4 hours)

**Snowsight Session Behavior:**
- Sessions remain active as long as the user is interacting with the application
- Closing and reopening the browser typically ends the session
- Network connection loss may close the session and log the user out
- Some browsers may close sessions after extended periods regardless of idle timeout

### Client Session Keep-Alive

For programmatic clients, the `CLIENT_SESSION_KEEP_ALIVE` option can preserve sessions:

```sql
-- When CLIENT_SESSION_KEEP_ALIVE = TRUE:
-- The client preserves the Snowflake session indefinitely as long as
-- the connection remains active

-- Control heartbeat frequency with:
-- CLIENT_SESSION_KEEP_ALIVE_HEARTBEAT_FREQUENCY parameter
-- Specifies seconds between heartbeat messages
```

### Session Policy Precedence

**User-level session policies override account-level session policies**

```
Account Session Policy (applies to all users)
         |
         v
    User Session Policy (overrides account policy for specific user)
```

### Creating and Managing Session Policies

**Create a Session Policy:**
```sql
CREATE SESSION POLICY my_session_policy
  SESSION_IDLE_TIMEOUT_MINS = 60
  SESSION_UI_IDLE_TIMEOUT_MINS = 30
  COMMENT = 'Stricter timeout for sensitive operations';
```

**Modify a Session Policy:**
```sql
ALTER SESSION POLICY my_session_policy
  SET SESSION_IDLE_TIMEOUT_MINS = 45;
```

**Apply Session Policy to Account:**
```sql
ALTER ACCOUNT SET SESSION POLICY my_session_policy;
```

**Apply Session Policy to User:**
```sql
ALTER USER jsmith SET SESSION POLICY my_session_policy;
```

**Remove Session Policy:**
```sql
ALTER ACCOUNT UNSET SESSION POLICY;
ALTER USER jsmith UNSET SESSION POLICY;
```

### Secondary Roles in Session Policies

The `ALLOWED_SECONDARY_ROLES` property controls which secondary roles users can activate:

**Allow all secondary roles (default):**
```sql
CREATE OR REPLACE SESSION POLICY prod_env_session_policy
  ALLOWED_SECONDARY_ROLES = ('ALL')
  COMMENT = 'Allow all secondary roles';
```

**Disallow all secondary roles:**
```sql
ALTER SESSION POLICY prod_env_session_policy
  SET ALLOWED_SECONDARY_ROLES = ();
```

**Allow specific secondary roles only:**
```sql
CREATE OR REPLACE SESSION POLICY restricted_roles_policy
  ALLOWED_SECONDARY_ROLES = (DATA_SCIENTIST, ANALYST)
  COMMENT = 'Only allow DATA_SCIENTIST and ANALYST as secondary roles';
```

**If a user tries to use a disallowed secondary role:**
```
SQL execution error: USE SECONDARY ROLES '[ANALYST]' not allowed as per session policy.
```

### Session Policy Privileges

| Privilege | Object | Description |
|-----------|--------|-------------|
| CREATE SESSION POLICY | Schema | Create new session policies |
| APPLY SESSION POLICY | Account | Apply session policies at account level |
| APPLY SESSION POLICY ON USER | User | Apply session policies to specific users |
| OWNERSHIP | Session Policy | Full control over the session policy |

**Granting Session Policy Privileges:**
```sql
-- Grant ability to create session policies
GRANT CREATE SESSION POLICY ON SCHEMA my_db.my_schema TO ROLE policy_admin;

-- Grant ability to apply session policies at account level
GRANT APPLY SESSION POLICY ON ACCOUNT TO ROLE policy_admin;

-- Grant ability to apply session policy to specific user
GRANT APPLY SESSION POLICY ON USER jsmith TO ROLE policy_admin;
```

### Monitoring Session Policies

**View session policy assignments using POLICY_REFERENCES:**
```sql
SELECT *
FROM TABLE(
  my_db.INFORMATION_SCHEMA.POLICY_REFERENCES(
    POLICY_NAME => 'my_session_policy'
  )
);
```

**View active sessions in Snowsight:**
- Navigate to Admin > Security > Sessions

---

## Authentication Policies

### What is an Authentication Policy?

An **authentication policy** controls:
- Which **authentication methods** users can use (password, SAML, OAuth, key pair)
- Which **client types** can connect to Snowflake
- Which **security integrations** are allowed for federated authentication
- **MFA requirements** for users

### Key Authentication Policy Properties

| Property | Description | Valid Values |
|----------|-------------|--------------|
| `AUTHENTICATION_METHODS` | Allowed authentication methods | PASSWORD, SAML, OAUTH, KEYPAIR, ALL |
| `CLIENT_TYPES` | Allowed client types | SNOWFLAKE_UI, SNOWFLAKE_CLI, SNOWSQL, DRIVERS, ALL |
| `SECURITY_INTEGRATIONS` | Allowed SAML2 security integrations | Integration names or ALL |
| `MFA_ENROLLMENT` | MFA enrollment requirement | OPTIONAL, REQUIRED |

### Client Types

| Client Type | Description |
|-------------|-------------|
| `SNOWFLAKE_UI` | Snowsight web interface |
| `SNOWFLAKE_CLI` | Snowflake CLI |
| `SNOWSQL` | SnowSQL command-line client |
| `DRIVERS` | JDBC, ODBC, Python, Node.js, and other drivers/connectors |

**Important:** The `CLIENT_TYPES` property is a **best-effort** method to block user logins. It should not be used as the sole security control. It does not restrict access to Snowflake REST APIs.

### Authentication Methods

| Method | Description |
|--------|-------------|
| `PASSWORD` | Username and password authentication |
| `SAML` | Federated authentication via identity providers (Okta, Azure AD, etc.) |
| `OAUTH` | OAuth-based authentication |
| `KEYPAIR` | Key pair authentication for programmatic access |
| `ALL` | Allow all authentication methods |

### Creating Authentication Policies

**Basic Authentication Policy:**
```sql
CREATE AUTHENTICATION POLICY my_auth_policy
  CLIENT_TYPES = ('SNOWFLAKE_UI')
  AUTHENTICATION_METHODS = ('SAML', 'PASSWORD');
```

**Require MFA for Password Users:**
```sql
CREATE AUTHENTICATION POLICY require_mfa_password_users
  AUTHENTICATION_METHODS = ('PASSWORD')
  MFA_ENROLLMENT = 'REQUIRED';
```

**Require MFA for All Users (Password + SSO):**
```sql
CREATE AUTHENTICATION POLICY require_mfa_all_users
  AUTHENTICATION_METHODS = ('SAML', 'PASSWORD')
  MFA_ENROLLMENT = 'REQUIRED'
  ENFORCE_MFA_ON_EXTERNAL_AUTHENTICATION = 'ALL';
```

**Note:** When `MFA_ENROLLMENT` is set, `CLIENT_TYPES` must include `SNOWFLAKE_UI` because Snowsight is the only place users can enroll in MFA.

### Applying Authentication Policies

**Apply to Account (all users):**
```sql
ALTER ACCOUNT SET AUTHENTICATION POLICY my_auth_policy;
```

**Apply to Specific User:**
```sql
ALTER USER example_user SET AUTHENTICATION POLICY my_auth_policy;
```

**Apply to Specific User Type:**
```sql
-- Apply to all SERVICE users
ALTER ACCOUNT SET AUTHENTICATION POLICY my_auth_policy
  FOR ALL SERVICE USERS;
```

### Authentication Policy Precedence

**User-level authentication policies override account-level authentication policies**

This is important for creating backup access for administrators:

```sql
-- Strict policy for account
CREATE AUTHENTICATION POLICY strict_account_policy
  AUTHENTICATION_METHODS = ('SAML')
  CLIENT_TYPES = ('SNOWFLAKE_UI');

ALTER ACCOUNT SET AUTHENTICATION POLICY strict_account_policy;

-- Less restrictive policy for admin
CREATE AUTHENTICATION POLICY admin_auth_policy
  AUTHENTICATION_METHODS = ('SAML', 'PASSWORD')
  CLIENT_TYPES = ('SNOWFLAKE_UI', 'SNOWFLAKE_CLI', 'SNOWSQL', 'DRIVERS')
  SECURITY_INTEGRATIONS = ('EXAMPLE_OKTA_INTEGRATION');

ALTER USER admin_user SET AUTHENTICATION POLICY admin_auth_policy;
```

### Security Policy Evaluation Order

When a user attempts to connect, Snowflake evaluates security policies in this order:

1. **Network Policy** - If IP address is blocked, access is denied immediately
2. **Authentication Policy** - Checked only if network policy passes
3. **Session Policy** - Applied after successful authentication

**Key Point:** If an IP address matches the blocked list of a network policy, the authentication policy is not checked.

### Snowsight Login Behavior with Authentication Policies

| Authentication Policy Configuration | Login Behavior |
|-------------------------------------|----------------|
| AUTHENTICATION_METHODS = (PASSWORD) only | Username/password form |
| AUTHENTICATION_METHODS = (SAML) only, one SAML2 integration | Redirects to IdP login |
| AUTHENTICATION_METHODS = (PASSWORD, SAML), one SAML2 integration | SSO button + password option |
| AUTHENTICATION_METHODS = (SAML) only, multiple SAML2 integrations | Multiple SSO buttons |
| AUTHENTICATION_METHODS = (PASSWORD, SAML), multiple SAML2 integrations | Multiple SSO buttons + password option |

### Multiple Identity Providers Example

```sql
-- Create SAML2 integrations for multiple IdPs
CREATE SECURITY INTEGRATION example_okta_integration
  TYPE = SAML2
  SAML2_SSO_URL = 'https://okta.example.com';

CREATE SECURITY INTEGRATION example_entra_integration
  TYPE = SAML2
  SAML2_SSO_URL = 'https://entra-example_acme.com';

-- Create authentication policy allowing both IdPs
CREATE AUTHENTICATION POLICY multiple_idps_auth_policy
  AUTHENTICATION_METHODS = ('SAML')
  SECURITY_INTEGRATIONS = ('EXAMPLE_OKTA_INTEGRATION', 'EXAMPLE_ENTRA_INTEGRATION');

ALTER ACCOUNT SET AUTHENTICATION POLICY multiple_idps_auth_policy;
```

### Restricting Client Types Example

```sql
-- Only allow Snowsight access
CREATE AUTHENTICATION POLICY restrict_to_ui_policy
  CLIENT_TYPES = ('SNOWFLAKE_UI')
  AUTHENTICATION_METHODS = ('SAML', 'PASSWORD');

ALTER USER restricted_user SET AUTHENTICATION POLICY restrict_to_ui_policy;
```

### Authentication Policy Privileges

| Privilege | Object | Description |
|-----------|--------|-------------|
| CREATE AUTHENTICATION POLICY | Schema | Create new authentication policies |
| APPLY AUTHENTICATION POLICY | Account | Apply authentication policies at account level |
| APPLY AUTHENTICATION POLICY ON USER | User | Apply authentication policies to specific users |
| OWNERSHIP | Authentication Policy | Full control over the policy |

**Granting Authentication Policy Privileges:**
```sql
-- Grant ability to create authentication policies
GRANT CREATE AUTHENTICATION POLICY ON SCHEMA my_db.my_schema TO ROLE policy_admin;

-- Grant ability to apply at account level
GRANT APPLY AUTHENTICATION POLICY ON ACCOUNT TO ROLE policy_admin;

-- Grant ability to apply to specific user
GRANT APPLY AUTHENTICATION POLICY ON USER example_user TO ROLE policy_admin;
```

### Tracking Authentication Policy Usage

```sql
-- View all users with a specific authentication policy
SELECT *
FROM TABLE(
  SNOWFLAKE.INFORMATION_SCHEMA.POLICY_REFERENCES(
    POLICY_NAME => 'my_database.my_schema.my_auth_policy'
  )
);
```

---

## DDL Command Reference

### Session Policy Commands

| Command | Required Privilege |
|---------|-------------------|
| CREATE SESSION POLICY | CREATE SESSION POLICY on SCHEMA |
| ALTER SESSION POLICY | OWNERSHIP on SESSION POLICY |
| DROP SESSION POLICY | OWNERSHIP on SESSION POLICY |
| DESCRIBE SESSION POLICY | OWNERSHIP or APPLY on SESSION POLICY |
| SHOW SESSION POLICIES | OWNERSHIP or APPLY on SESSION POLICY |

### Authentication Policy Commands

| Command | Required Privilege |
|---------|-------------------|
| CREATE AUTHENTICATION POLICY | CREATE AUTHENTICATION POLICY on SCHEMA |
| ALTER AUTHENTICATION POLICY | OWNERSHIP on AUTHENTICATION POLICY |
| DROP AUTHENTICATION POLICY | OWNERSHIP on AUTHENTICATION POLICY |
| DESCRIBE AUTHENTICATION POLICY | OWNERSHIP on AUTHENTICATION POLICY |
| SHOW AUTHENTICATION POLICIES | USAGE on SCHEMA |

---

## Exam Tips and Common Question Patterns

### Session Policy Key Points

1. **Default timeout**: 240 minutes (4 hours) for both programmatic clients and Snowsight
2. **Minimum timeout**: 5 minutes
3. **Maximum timeout**: 240 minutes (4 hours)
4. **Two timeout properties**:
   - `SESSION_IDLE_TIMEOUT_MINS` - programmatic clients
   - `SESSION_UI_IDLE_TIMEOUT_MINS` - Snowsight
5. **Precedence**: User-level session policy overrides account-level session policy
6. **Secondary roles**: Can be controlled via `ALLOWED_SECONDARY_ROLES` property

### Authentication Policy Key Points

1. **CLIENT_TYPES is best-effort**: Does NOT provide complete security, does NOT restrict REST API access
2. **Precedence**: User-level authentication policy overrides account-level authentication policy
3. **MFA requirement**: If `MFA_ENROLLMENT = REQUIRED`, `CLIENT_TYPES` must include `SNOWFLAKE_UI`
4. **Evaluation order**: Network Policy > Authentication Policy > Session Policy
5. **Security integrations**: Can specify which SAML2 integrations are allowed

### Common Exam Questions

**Q: What is the default session idle timeout in Snowflake?**
A: 240 minutes (4 hours)

**Q: Which policy takes precedence - account-level or user-level?**
A: User-level policies always override account-level policies (for both session and authentication policies)

**Q: Can CLIENT_TYPES in an authentication policy completely block access via drivers?**
A: No, CLIENT_TYPES is a best-effort method and does not restrict REST API access

**Q: What happens if a user's IP is blocked by a network policy?**
A: Access is denied immediately; the authentication policy is not even checked

**Q: How do you require MFA for all users?**
A: Create an authentication policy with `MFA_ENROLLMENT = 'REQUIRED'` and apply it to the account

**Q: What is the minimum configurable session timeout?**
A: 5 minutes

**Q: How do you disable secondary roles for all users in an account?**
A: Create a session policy with `ALLOWED_SECONDARY_ROLES = ()` and apply it to the account

**Q: What privilege is needed to apply a session policy to a user?**
A: APPLY SESSION POLICY ON USER <username>

### Memory Aids

- **S**ession policies control **S**ession timeouts and **S**econdary roles
- **A**uthentication policies control **A**ccess methods (how users authenticate)
- **User beats Account**: User-level policies always override account-level
- **Network first**: Network policies are evaluated before authentication policies
- **5 to 240**: Session timeout range is 5 minutes (min) to 240 minutes (max)
- **4 hours default**: Both session timeout types default to 240 minutes

### Policy Comparison Table

| Feature | Session Policy | Authentication Policy |
|---------|---------------|----------------------|
| Controls | Idle timeouts, secondary roles | Auth methods, client types, MFA |
| Default timeout | 240 minutes | N/A |
| Account-level | Yes | Yes |
| User-level | Yes | Yes |
| User type level | No | Yes (FOR ALL SERVICE USERS) |
| User overrides account | Yes | Yes |
| Network policy evaluated first | N/A | Yes |

---

## Practice Scenarios

### Scenario 1: Stricter Timeout for Finance Team
```sql
-- Create policy with 30-minute timeout
CREATE SESSION POLICY finance_session_policy
  SESSION_IDLE_TIMEOUT_MINS = 30
  SESSION_UI_IDLE_TIMEOUT_MINS = 15;

-- Apply to finance users
ALTER USER finance_user1 SET SESSION POLICY finance_session_policy;
ALTER USER finance_user2 SET SESSION POLICY finance_session_policy;
```

### Scenario 2: SSO-Only Access for Regular Users
```sql
-- Create strict SSO policy
CREATE AUTHENTICATION POLICY sso_only_policy
  AUTHENTICATION_METHODS = ('SAML')
  CLIENT_TYPES = ('SNOWFLAKE_UI');

-- Apply to account
ALTER ACCOUNT SET AUTHENTICATION POLICY sso_only_policy;

-- Create backup policy for admins
CREATE AUTHENTICATION POLICY admin_backup_policy
  AUTHENTICATION_METHODS = ('PASSWORD', 'SAML')
  CLIENT_TYPES = ('SNOWFLAKE_UI', 'SNOWSQL', 'DRIVERS');

-- Apply to admin user (overrides account policy)
ALTER USER admin_user SET AUTHENTICATION POLICY admin_backup_policy;
```

### Scenario 3: Disable Secondary Roles for Production
```sql
CREATE SESSION POLICY prod_no_secondary_roles
  ALLOWED_SECONDARY_ROLES = ()
  COMMENT = 'No secondary roles allowed in production';

ALTER ACCOUNT SET SESSION POLICY prod_no_secondary_roles;
```
