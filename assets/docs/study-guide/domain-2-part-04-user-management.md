# Domain 2: Account Access & Security
## Part 4: User Management

This study guide covers user management in Snowflake, including user types, creation, properties, authentication options, password policies, and lifecycle management for the SnowPro Core (COF-C02) certification exam.

---

## Table of Contents

1. [Overview of User Management](#overview-of-user-management)
2. [Types of Users](#types-of-users)
3. [Privileges Required for User Management](#privileges-required-for-user-management)
4. [Creating Users](#creating-users)
5. [User Properties Reference](#user-properties-reference)
6. [Default Role and Warehouse](#default-role-and-warehouse)
7. [User Authentication Options](#user-authentication-options)
8. [Password Policies](#password-policies)
9. [User Lifecycle Management](#user-lifecycle-management)
10. [SCIM Integration for User Provisioning](#scim-integration-for-user-provisioning)
11. [Viewing and Querying Users](#viewing-and-querying-users)
12. [Exam Tips and Common Question Patterns](#exam-tips-and-common-question-patterns)

---

## Overview of User Management

User management in Snowflake encompasses creating, modifying, and managing user accounts that access the Snowflake platform. Key aspects include:

- **User Objects**: Represent individuals or services that connect to Snowflake
- **Authentication**: Methods by which users prove their identity
- **Authorization**: Controlled through roles and privileges granted to users
- **User Types**: Distinction between human users and service accounts

### Key Concept: User vs. Role

| Concept | Description |
|---------|-------------|
| **User** | An identity (person or service) that can connect to Snowflake |
| **Role** | A collection of privileges that can be assigned to users |
| **Active Role** | The role currently in use during a session (determines what actions are allowed) |

---

## Types of Users

Snowflake distinguishes between different user types based on their interaction pattern with the platform. This distinction is critical because human users should enroll in **Multi-Factor Authentication (MFA)**, while services should not.

### User Type Property Values

| User Type | Description | Key Characteristics |
|-----------|-------------|---------------------|
| **PERSON** | Human user for interactive authentication | MFA required (enforced for accounts created after Aug 2024; will become universal); full access to Snowsight and all features |
| **NULL** | Same behavior as PERSON | Legacy default; functions identically to PERSON |
| **SERVICE** | Service or application (non-interactive) | Cannot use passwords; cannot log in via SAML SSO; cannot enroll in MFA; restricted commands |
| **LEGACY_SERVICE** | Temporary migration type | Can use password/SAML; MFA exempt; being deprecated |
| **SNOWFLAKE_SERVICE** | Created by Snowflake for Snowpark Container Services | Cannot be created or modified by administrators |

### MFA Enforcement for PERSON Users

Snowflake is progressively enforcing MFA for all human users who authenticate with a password:

- **Accounts created after the BCR 2024_08 bundle**: MFA is enforced for all human users authenticating with a password. These accounts cannot opt out.
- **Older accounts**: MFA enrollment is strongly recommended. Snowflake is rolling out mandatory MFA to all accounts over time.
- **Opt-out is temporary**: The ability for older accounts to defer MFA enforcement will be deprecated. Plan for MFA as a universal requirement.
- **A user with TYPE = NULL functions the same as PERSON** and is subject to the same MFA requirements.

### SERVICE User Restrictions

Users with TYPE = SERVICE have the following restrictions:

- Cannot log in using SAML SSO
- Cannot enroll in MFA
- Not subject to authentication policy MFA enforcement
- Cannot use the following properties:
  - `FIRST_NAME`
  - `MIDDLE_NAME`
  - `LAST_NAME`
  - `PASSWORD`
  - `MUST_CHANGE_PASSWORD`
  - `MINS_TO_BYPASS_MFA`
- Cannot execute:
  - `ALTER USER RESET PASSWORD`
  - `ALTER USER SET DISABLE_MFA = TRUE`

### Setting User Type

```sql
-- Set a user as a human user (interactive)
ALTER USER john_smith SET TYPE = PERSON;

-- Set a user as a service account (non-interactive)
ALTER USER etl_service SET TYPE = SERVICE;

-- For legacy applications during migration
ALTER USER legacy_app SET TYPE = LEGACY_SERVICE;
```

### Best Practice: User Type Selection

```
+---------------------+          +---------------------+
|    Human Users      |          |   Service Accounts  |
|                     |          |                     |
|  TYPE = PERSON      |          |  TYPE = SERVICE     |
|  - MFA enforced*    |          |  - Key-pair auth    |
|  - Password OK      |          |  - OAuth            |
|  - SSO supported    |          |  - No passwords     |
+---------------------+          +---------------------+
```

*MFA is enforced for accounts created after the BCR 2024_08 bundle. For older accounts, enforcement is being rolled out and will become universal.

---

## Privileges Required for User Management

### Creating Users

| Method | Role/Privilege Required |
|--------|------------------------|
| **USERADMIN role** | System role with CREATE USER privilege on account |
| **Custom role** | Must be granted CREATE USER privilege on account |

```sql
-- Grant CREATE USER to a custom role
GRANT CREATE USER ON ACCOUNT TO ROLE hr_admin;
```

### Modifying Users

| Action | Privilege Required |
|--------|-------------------|
| **Modify most properties** | OWNERSHIP privilege on the user |
| **Reset timer (unlock)** | OWNERSHIP privilege on the user |
| **View user details** | OWNERSHIP, or global APPLY privileges |

### Key Insight: Role Hierarchy

```
ACCOUNTADMIN
    |
    +-- SECURITYADMIN  (MANAGE GRANTS - can modify grants)
            |
            +-- USERADMIN  (CREATE USER, CREATE ROLE)
```

**Important**: Users created by USERADMIN are owned by USERADMIN by default. SECURITYADMIN inherits USERADMIN privileges and can also manage grants globally.

---

## Creating Users

### Using Snowsight (UI)

1. Navigate to **Admin** > **Users & Roles**
2. Select **+ User**
3. Enter required information:
   - Username (required)
   - Password (required in Snowsight)
   - Optional: First name, Last name, Email
4. Configure optional settings:
   - Default Role
   - Default Warehouse
   - Default Namespace
5. Select **Create User**

### Using SQL (CREATE USER)

```sql
-- Basic syntax
CREATE USER username
    PASSWORD = 'password_string'
    [ LOGIN_NAME = 'login_name' ]
    [ DISPLAY_NAME = 'display_name' ]
    [ FIRST_NAME = 'first_name' ]
    [ LAST_NAME = 'last_name' ]
    [ EMAIL = 'email_address' ]
    [ MUST_CHANGE_PASSWORD = TRUE | FALSE ]
    [ DISABLED = TRUE | FALSE ]
    [ DEFAULT_WAREHOUSE = warehouse_name ]
    [ DEFAULT_NAMESPACE = database.schema | database ]
    [ DEFAULT_ROLE = role_name ]
    [ DEFAULT_SECONDARY_ROLES = ( 'ALL' ) | ( ) ]
    [ MINS_TO_UNLOCK = integer ]
    [ DAYS_TO_EXPIRY = integer ]
    [ COMMENT = 'comment_string' ]
    [ TYPE = PERSON | SERVICE | LEGACY_SERVICE ];
```

### Complete Example

```sql
-- Create a human user with common settings
CREATE USER jane_doe
    PASSWORD = 'TempPassword123!'
    LOGIN_NAME = 'jane.doe@company.com'
    DISPLAY_NAME = 'Jane Doe'
    FIRST_NAME = 'Jane'
    LAST_NAME = 'Doe'
    EMAIL = 'jane.doe@company.com'
    MUST_CHANGE_PASSWORD = TRUE
    DEFAULT_ROLE = analyst_role
    DEFAULT_WAREHOUSE = compute_wh
    DEFAULT_NAMESPACE = analytics_db.public
    DEFAULT_SECONDARY_ROLES = ('ALL')
    TYPE = PERSON
    COMMENT = 'Analytics team member';
```

### Creating a Service User

```sql
-- Create a service account (no password allowed for TYPE = SERVICE)
CREATE USER etl_service_user
    TYPE = SERVICE
    DEFAULT_ROLE = etl_role
    DEFAULT_WAREHOUSE = etl_wh
    RSA_PUBLIC_KEY = 'MIIBIjANBgkqh...'
    COMMENT = 'ETL pipeline service account';
```

### Key Points for CREATE USER

| Aspect | Detail |
|--------|--------|
| **Password in Snowsight** | Required when creating users via UI |
| **Password in SQL** | Not required (can create user without password) |
| **Initial password** | Can be weak; enforced on first change |
| **Username case** | Case-insensitive by default |
| **Login name** | If not specified, defaults to username |

---

## User Properties Reference

### Identity Properties

| Property | Description | Default |
|----------|-------------|---------|
| `NAME` | Unique identifier for the user (username) | Required |
| `LOGIN_NAME` | Name used for login; can differ from NAME | Same as NAME |
| `DISPLAY_NAME` | Name shown in Snowsight | Same as NAME |
| `FIRST_NAME` | User's first name | NULL |
| `MIDDLE_NAME` | User's middle name | NULL |
| `LAST_NAME` | User's last name | NULL |
| `EMAIL` | User's email address | NULL |
| `TYPE` | User type (PERSON, SERVICE, etc.) | NULL (acts as PERSON) |

### Authentication Properties

| Property | Description | Default |
|----------|-------------|---------|
| `PASSWORD` | User's password (hashed internally) | NULL |
| `MUST_CHANGE_PASSWORD` | Force password change on next login | FALSE |
| `RSA_PUBLIC_KEY` | Public key for key-pair authentication | NULL |
| `RSA_PUBLIC_KEY_2` | Secondary public key for key rotation | NULL |
| `MINS_TO_BYPASS_MFA` | Minutes to bypass MFA (0-5 recommended) | 0 |
| `DISABLE_MFA` | Disable MFA for the user | FALSE |

### Session Default Properties

| Property | Description | Default |
|----------|-------------|---------|
| `DEFAULT_ROLE` | Role activated on session start | NULL (uses PUBLIC) |
| `DEFAULT_SECONDARY_ROLES` | Secondary roles activated | NULL |
| `DEFAULT_WAREHOUSE` | Warehouse for session queries | NULL |
| `DEFAULT_NAMESPACE` | Default database.schema context | NULL |

### Account Status Properties

| Property | Description | Default |
|----------|-------------|---------|
| `DISABLED` | Prevents user login when TRUE | FALSE |
| `DAYS_TO_EXPIRY` | Days until user account expires | NULL (never) |
| `MINS_TO_UNLOCK` | Minutes remaining until unlock | 0 |
| `LOCKED_UNTIL_TIME` | Timestamp when user will unlock | NULL |

---

## Default Role and Warehouse

### DEFAULT_ROLE Behavior

The `DEFAULT_ROLE` property specifies which role is activated when a user connects to Snowflake.

```sql
-- Set default role for a user
ALTER USER jane_doe SET DEFAULT_ROLE = analyst_role;
```

**Important Rules:**

| Scenario | Behavior |
|----------|----------|
| Default role is set and user has that role | Role is activated |
| Default role is set but user doesn't have that role | PUBLIC role is used |
| No default role set | PUBLIC role is used |
| Role specified in connection | Overrides default role |

### DEFAULT_SECONDARY_ROLES

Secondary roles allow users to have multiple roles active simultaneously.

```sql
-- Enable all granted roles as secondary
ALTER USER jane_doe SET DEFAULT_SECONDARY_ROLES = ('ALL');

-- Disable secondary roles
ALTER USER jane_doe SET DEFAULT_SECONDARY_ROLES = ();
```

| Setting | Behavior |
|---------|----------|
| `('ALL')` | All granted roles are active as secondary |
| `()` | No secondary roles (only primary role active) |

### DEFAULT_WAREHOUSE

```sql
-- Set default warehouse
ALTER USER jane_doe SET DEFAULT_WAREHOUSE = compute_wh;
```

**Important**: If no default warehouse is set and none is specified in the connection:
- User can still connect
- Queries requiring compute will fail until a warehouse is selected
- `USE WAREHOUSE` command required to run queries

### DEFAULT_NAMESPACE

```sql
-- Set default database and schema
ALTER USER jane_doe SET DEFAULT_NAMESPACE = analytics_db.public;

-- Set default database only
ALTER USER jane_doe SET DEFAULT_NAMESPACE = analytics_db;
```

---

## User Authentication Options

Snowflake supports multiple authentication methods for users. The appropriate method depends on whether the user is a human (interactive) or service (non-interactive).

### Authentication Methods Summary

| Method | Interactive Users | Service Users | Description |
|--------|:-----------------:|:-------------:|-------------|
| **Password + MFA** | Recommended | Not allowed | Username/password with multi-factor |
| **SSO (SAML)** | Supported | Not allowed | Single sign-on via identity provider |
| **Key-Pair** | Supported | Recommended | RSA key-pair authentication |
| **OAuth** | Supported | Supported | OAuth 2.0 tokens |
| **Programmatic Access Tokens** | Supported | Supported | Time-limited credentials |

### Key-Pair Authentication Setup

```sql
-- Assign public key to user
ALTER USER etl_service SET RSA_PUBLIC_KEY = 'MIIBIjANBgkqh...';

-- Assign secondary key for rotation
ALTER USER etl_service SET RSA_PUBLIC_KEY_2 = 'MIIBIjANBgkqh...';

-- Remove a key
ALTER USER etl_service UNSET RSA_PUBLIC_KEY_2;
```

### Authentication Decision Flow

```
Is the user human or service?
        |
        +-- Human User (TYPE = PERSON)
        |       |
        |       +-- Use Password + MFA
        |       |   OR
        |       +-- Use SSO (SAML)
        |       |   OR
        |       +-- Use Snowflake OAuth
        |
        +-- Service Account (TYPE = SERVICE)
                |
                +-- Use Key-Pair Authentication (Recommended)
                |   OR
                +-- Use OAuth
                |   OR
                +-- Use Programmatic Access Tokens
```

---

## Password Policies

Snowflake provides both a built-in password policy and the ability to create custom password policies.

### Snowflake Default Password Policy

When using ALTER USER or resetting passwords, Snowflake enforces these minimum requirements:

| Requirement | Value |
|-------------|-------|
| Minimum length | 14 characters |
| Maximum length | 256 characters |
| Character types | Must include mixed-case letters, numbers, special characters |

**Note**: During **initial user creation**, weak passwords can be set. The policy is enforced when the password is changed.

### Custom Password Policy Object

Password policies are **schema-level objects** that can be set at:
- Account level (applies to all users)
- User level (overrides account-level policy)

### Password Policy Properties

| Property | Description | Range |
|----------|-------------|-------|
| `PASSWORD_MIN_LENGTH` | Minimum password length | 8-256 |
| `PASSWORD_MAX_LENGTH` | Maximum password length | 8-256 |
| `PASSWORD_MIN_UPPER_CASE_CHARS` | Minimum uppercase letters | 0-256 |
| `PASSWORD_MIN_LOWER_CASE_CHARS` | Minimum lowercase letters | 0-256 |
| `PASSWORD_MIN_NUMERIC_CHARS` | Minimum numeric characters | 0-256 |
| `PASSWORD_MIN_SPECIAL_CHARS` | Minimum special characters | 0-256 |
| `PASSWORD_MAX_AGE_DAYS` | Days before password expires | 0-999 |
| `PASSWORD_MAX_RETRIES` | Failed attempts before lockout | 1-10 |
| `PASSWORD_LOCKOUT_TIME_MINS` | Lockout duration in minutes | 1-999999 |
| `PASSWORD_HISTORY` | Number of previous passwords to remember | 0-24 |

### Creating a Custom Password Policy

```sql
-- Step 1: Create storage location
CREATE DATABASE security;
CREATE SCHEMA security.policies;

-- Step 2: Grant privileges to policy admin
GRANT USAGE ON DATABASE security TO ROLE policy_admin;
GRANT USAGE ON SCHEMA security.policies TO ROLE policy_admin;
GRANT CREATE PASSWORD POLICY ON SCHEMA security.policies TO ROLE policy_admin;
GRANT APPLY PASSWORD POLICY ON ACCOUNT TO ROLE policy_admin;

-- Step 3: Create the password policy
USE ROLE policy_admin;

CREATE PASSWORD POLICY security.policies.strict_password_policy
    PASSWORD_MIN_LENGTH = 14
    PASSWORD_MAX_LENGTH = 24
    PASSWORD_MIN_UPPER_CASE_CHARS = 2
    PASSWORD_MIN_LOWER_CASE_CHARS = 2
    PASSWORD_MIN_NUMERIC_CHARS = 2
    PASSWORD_MIN_SPECIAL_CHARS = 2
    PASSWORD_MAX_AGE_DAYS = 90
    PASSWORD_MAX_RETRIES = 3
    PASSWORD_LOCKOUT_TIME_MINS = 30
    PASSWORD_HISTORY = 5
    COMMENT = 'Enterprise password policy';

-- Step 4: Apply to account
ALTER ACCOUNT SET PASSWORD POLICY security.policies.strict_password_policy;

-- Or apply to specific user
ALTER USER sensitive_user SET PASSWORD POLICY security.policies.strict_password_policy;
```

### Password Policy Privileges

| Privilege | Scope | Description |
|-----------|-------|-------------|
| `CREATE PASSWORD POLICY` | Schema | Create new password policies |
| `APPLY PASSWORD POLICY` | Account or User | Apply policies to account/users |
| `OWNERSHIP` | Password Policy | Full control over the policy |

### Key Points for Password Policies

1. **User-level overrides account-level**: If both exist, user policy takes precedence
2. **Immediate vs. next login**: Some properties (MAX_AGE_DAYS) take effect on next login
3. **Password history**: Prevents reuse of recent passwords
4. **Lockout recovery**: Users can be unlocked by administrator or wait for timeout

---

## User Lifecycle Management

### Disabling a User

Prevents user from logging in without deleting the user object.

```sql
-- Disable a user
ALTER USER jane_doe SET DISABLED = TRUE;

-- Re-enable a user
ALTER USER jane_doe SET DISABLED = FALSE;
```

### Unlocking a User

Users are locked after exceeding failed login attempts. To unlock:

```sql
-- Immediately unlock by resetting timer to 0
ALTER USER jane_doe SET MINS_TO_UNLOCK = 0;
```

**Best Practice**: Ensure at least two users have OWNERSHIP on user objects to prevent lockout scenarios.

### Requiring Password Change

```sql
-- Force user to change password on next login
ALTER USER jane_doe SET MUST_CHANGE_PASSWORD = TRUE;
```

### Setting Account Expiry

```sql
-- User account expires in 30 days
ALTER USER temporary_user SET DAYS_TO_EXPIRY = 30;

-- Remove expiry
ALTER USER temporary_user UNSET DAYS_TO_EXPIRY;
```

### Modifying User Properties

```sql
-- Change display name
ALTER USER jane_doe SET DISPLAY_NAME = 'Jane Smith';

-- Change email
ALTER USER jane_doe SET EMAIL = 'jane.smith@company.com';

-- Change default settings
ALTER USER jane_doe SET
    DEFAULT_ROLE = senior_analyst
    DEFAULT_WAREHOUSE = large_wh;
```

### Dropping a User

```sql
-- Drop a user (cannot be undone)
DROP USER jane_doe;
```

**Important Considerations:**
- Objects owned by the dropped user become "orphaned" (ownership transfers to the role that dropped the user)
- Best practice: Transfer ownership of objects before dropping a user
- Dropped users lose all role grants

---

## SCIM Integration for User Provisioning

SCIM (System for Cross-domain Identity Management) enables automated user and group provisioning from identity providers.

### Supported Identity Providers

| Provider | Integration Type |
|----------|------------------|
| **Okta** | Native integration |
| **Microsoft Azure AD** | Native integration |
| **Custom IdP** | Custom SCIM integration |

### SCIM User Attributes Mapping

| SCIM Attribute | Snowflake Property |
|----------------|-------------------|
| `userName` | LOGIN_NAME |
| `name.givenName` | FIRST_NAME |
| `name.familyName` | LAST_NAME |
| `emails[0].value` | EMAIL |
| `displayName` | DISPLAY_NAME |
| `active` | DISABLED (inverse) |

### SCIM Custom Attributes

| Custom Attribute | Snowflake Property |
|-----------------|-------------------|
| `defaultRole` | DEFAULT_ROLE |
| `defaultWarehouse` | DEFAULT_WAREHOUSE |
| `defaultSecondaryRoles` | DEFAULT_SECONDARY_ROLES |
| `snowflakeUserName` | NAME |
| `type` | TYPE |

### Key SCIM Concepts

1. **Security Integration**: Required to enable SCIM provisioning
2. **Sync Password**: Option to sync passwords from IdP (SYNC_PASSWORD property)
3. **User groups**: Can be synchronized as Snowflake roles

---

## Viewing and Querying Users

### Using SQL Commands

```sql
-- List all users
SHOW USERS;

-- List users with filter
SHOW USERS LIKE '%admin%';

-- Describe specific user properties
DESCRIBE USER jane_doe;

-- View user session parameters
SHOW PARAMETERS FOR USER jane_doe;
```

### Using Snowsight

1. Navigate to **Admin** > **Users & Roles**
2. View user list with:
   - Display name
   - Status (enabled/disabled)
   - Last login time
   - Owning role
   - MFA enrollment status

### Querying User Information

```sql
-- Find users who haven't logged in recently
SELECT
    NAME,
    DISPLAY_NAME,
    LAST_SUCCESS_LOGIN,
    DISABLED
FROM SNOWFLAKE.ACCOUNT_USAGE.USERS
WHERE LAST_SUCCESS_LOGIN < DATEADD('day', -90, CURRENT_TIMESTAMP())
   OR LAST_SUCCESS_LOGIN IS NULL;

-- Count users by type
SELECT
    TYPE,
    COUNT(*) AS user_count
FROM SNOWFLAKE.ACCOUNT_USAGE.USERS
WHERE DELETED_ON IS NULL
GROUP BY TYPE;
```

---

## Exam Tips and Common Question Patterns

### High-Priority Topics

1. **User Types**: Understand the difference between PERSON, SERVICE, and LEGACY_SERVICE
2. **Default Role Behavior**: What happens when default role is not granted to user
3. **Password Policy Scope**: Account-level vs. user-level (user takes precedence)
4. **Privileges for User Management**: USERADMIN role and CREATE USER privilege
5. **Authentication Methods**: Which methods are appropriate for service accounts

### Common Exam Scenarios

| Scenario | Answer |
|----------|--------|
| "User cannot log in, account shows locked" | Check MINS_TO_UNLOCK or use ALTER USER to reset |
| "Service account should not use password" | Set TYPE = SERVICE and use key-pair auth |
| "User logs in but default role not active" | User must be granted the default role |
| "Need to enforce password complexity" | Create and apply PASSWORD POLICY object |
| "Who can create users?" | USERADMIN or role with CREATE USER privilege |

### Key SQL Commands to Remember

```sql
-- Creating users
CREATE USER username PASSWORD = 'password';

-- Modifying users
ALTER USER username SET property = value;

-- Disabling users
ALTER USER username SET DISABLED = TRUE;

-- Unlocking users
ALTER USER username SET MINS_TO_UNLOCK = 0;

-- Viewing users
SHOW USERS;
DESCRIBE USER username;

-- Password policies
CREATE PASSWORD POLICY policy_name ...;
ALTER ACCOUNT SET PASSWORD POLICY policy_name;
ALTER USER username SET PASSWORD POLICY policy_name;

-- Dropping users
DROP USER username;
```

### True/False Quick Reference

| Statement | True/False |
|-----------|------------|
| USERADMIN can create users by default | TRUE |
| SERVICE users can use passwords | FALSE |
| Default role must be granted to user to be activated | TRUE |
| Password policies can only be set at account level | FALSE |
| Snowsight requires password when creating users | TRUE |
| CREATE USER SQL requires password | FALSE |
| SECURITYADMIN can modify any user's grants | TRUE |
| User-level password policy overrides account-level | TRUE |

### Remember These Key Points

1. **User Types Matter**: SERVICE users cannot use passwords or MFA
2. **Role Must Be Granted**: Default role only works if user has that role
3. **Password Policy Hierarchy**: User-level > Account-level
4. **Lockout Recovery**: Set MINS_TO_UNLOCK = 0 to immediately unlock
5. **OWNERSHIP Required**: To modify most user properties, need OWNERSHIP privilege
6. **SCIM for Automation**: Use SCIM to sync users from identity providers
7. **Two ACCOUNTADMINs**: Best practice to have at least two users with ACCOUNTADMIN

---

## Practice Questions

1. **A user is created with DEFAULT_ROLE = 'ANALYST' but the user was never granted the ANALYST role. What happens when the user logs in?**

<details>
<summary>Show Answer</summary>

Answer: The PUBLIC role is activated instead.
</details>

2. **What is the minimum privilege required to create a new user in Snowflake?**

<details>
<summary>Show Answer</summary>

Answer: CREATE USER privilege on the account (or USERADMIN role).
</details>

3. **A service account needs to authenticate without human interaction. Which user TYPE should be set?**

<details>
<summary>Show Answer</summary>

Answer: TYPE = SERVICE (with key-pair or OAuth authentication).
</details>

4. **How do you immediately unlock a user who has been locked due to failed login attempts?**

<details>
<summary>Show Answer</summary>

Answer: `ALTER USER username SET MINS_TO_UNLOCK = 0;`
</details>

5. **If a password policy is set on both the account and a specific user, which one takes precedence?**

<details>
<summary>Show Answer</summary>

Answer: The user-level password policy takes precedence.
</details>

---

*Study Guide Version: 1.0*
*Last Updated: January 2025*
*Covers: Snowflake SnowPro Core (COF-C02) Certification*
