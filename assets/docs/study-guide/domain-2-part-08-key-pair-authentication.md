# Domain 2: Account Access & Security

## Part 8: Key Pair Authentication

This section covers key pair authentication in Snowflake, a critical security mechanism for programmatic access, service accounts, and automation scenarios. Key pair authentication is frequently tested on the SnowPro Core exam as part of the Account Access & Security domain (20-25% of the exam).

---

## 1. Overview of Key Pair Authentication

### 1.1 What Is Key Pair Authentication?

Key pair authentication is an **enhanced authentication method** that uses public-key cryptography instead of traditional username/password combinations. It provides stronger security for programmatic access to Snowflake.

**Key Characteristics:**
- Uses RSA or ECDSA asymmetric cryptography
- Requires a minimum **2048-bit RSA key pair**
- Public key is stored in Snowflake (associated with a user)
- Private key remains secure on the client side
- Eliminates password exposure in scripts and connection strings

**How It Works:**
1. User generates a public/private key pair
2. Public key is assigned to the Snowflake user account
3. Client application uses the private key to create a signed JWT (JSON Web Token)
4. Snowflake verifies the JWT signature using the stored public key
5. If valid, authentication succeeds without transmitting passwords

### 1.2 Key Pair vs. Password Authentication

| Aspect | Password Authentication | Key Pair Authentication |
|--------|------------------------|------------------------|
| **Security Level** | Standard | Enhanced |
| **Credential Exposure** | Password transmitted | Private key never transmitted |
| **Rotation Complexity** | Simple password change | Requires key regeneration |
| **Automation Suitability** | Passwords in scripts (risky) | Private key files (more secure) |
| **MFA Compatibility** | Yes | No (key pair is the strong factor) |
| **Best For** | Interactive users | Service accounts, automation |

### 1.3 Supported Algorithms

Snowflake supports cryptographic keys generated using these algorithms:

**RSA Digital Signature Algorithms:**
- RS256 (RSA with SHA-256)
- RS384 (RSA with SHA-384)
- RS512 (RSA with SHA-512)

**Elliptic Curve Digital Signature Algorithms (ECDSA):**
- ES256 (P-256 curve)
- ES384 (P-384 curve)
- ES512 (P-512 curve)

> **Exam Tip:** The exam focuses primarily on RSA keys. Know that the minimum requirement is 2048-bit RSA, and keys are stored in PEM format using PKCS#8 encoding.

---

## 2. Supported Snowflake Clients

Key pair authentication is widely supported across Snowflake clients:

| Client | Key Pair Auth | Key Rotation | Unencrypted Keys | Encrypted Keys |
|--------|:-------------:|:------------:|:----------------:|:--------------:|
| Snowflake CLI | Yes | Yes | Yes | Yes |
| SnowSQL | Yes | Yes | Yes | Yes |
| Python Connector | Yes | Yes | Yes | Yes |
| Spark Connector | Yes | Yes | Yes | No |
| Kafka Connector | Yes | Yes | Yes | No |
| .NET Driver | Yes | Yes | Yes | Yes |
| Go Driver | Yes | Yes | Yes | No |
| JDBC Driver | Yes | Yes | Yes | Yes |
| ODBC Driver | Yes | Yes | Yes | Yes |
| Node.js Driver | Yes | Yes | Yes | Yes |

> **Exam Tip:** Not all connectors support encrypted private keys. If a question asks about using encrypted keys with a specific connector, check the compatibility. The Spark, Kafka, and Go drivers do NOT support encrypted private keys.

---

## 3. Generating Key Pairs

### 3.1 Generate Private Key (Unencrypted)

For development or systems where passphrase prompts are not feasible:

```bash
openssl genrsa 2048 | openssl pkcs8 -topk8 -inform PEM -out rsa_key.p8 -nocrypt
```

**Command Breakdown:**
- `openssl genrsa 2048` - Generates a 2048-bit RSA private key
- `openssl pkcs8 -topk8` - Converts to PKCS#8 format (required by Snowflake)
- `-inform PEM` - Input format is PEM
- `-out rsa_key.p8` - Output file name
- `-nocrypt` - No encryption (unencrypted key)

### 3.2 Generate Private Key (Encrypted - Recommended)

For production environments with passphrase protection:

```bash
openssl genrsa 2048 | openssl pkcs8 -topk8 -inform PEM -out rsa_key.p8
```

> **Note:** Omitting `-nocrypt` causes OpenSSL to prompt for a passphrase. The passphrase encrypts the private key file locally.

**Output format (encrypted):**
```
-----BEGIN ENCRYPTED PRIVATE KEY-----
MIIE6T...
-----END ENCRYPTED PRIVATE KEY-----
```

**Output format (unencrypted):**
```
-----BEGIN PRIVATE KEY-----
MIIE6T...
-----END PRIVATE KEY-----
```

### 3.3 Generate Public Key

Generate the public key from the private key:

```bash
openssl rsa -in rsa_key.p8 -pubout -out rsa_key.pub
```

**Command Breakdown:**
- `openssl rsa -in rsa_key.p8` - Read the private key file
- `-pubout` - Output the public key
- `-out rsa_key.pub` - Output file name

**Output format:**
```
-----BEGIN PUBLIC KEY-----
MIIBIj...
-----END PUBLIC KEY-----
```

### 3.4 Passphrase Best Practices

Snowflake recommends passphrases that comply with **PCI DSS standards**:
- Use a long, complex passphrase
- Store the passphrase in a secure location (secrets manager, vault)
- The passphrase protects the local private key file only
- The passphrase is **never** transmitted to Snowflake

> **Exam Tip:** The passphrase is used only for protecting the private key locally. It is not sent to Snowflake during authentication. The authentication process uses the private key to sign a JWT, not the passphrase.

---

## 4. Configuring Key Pair Authentication

### 4.1 Required Privileges

To assign a public key to a user, you need one of:

| Privilege/Role | Scope |
|----------------|-------|
| **SECURITYADMIN** | Built-in role with user management privileges |
| **OWNERSHIP** | On the target user |
| **MODIFY PROGRAMMATIC AUTHENTICATION METHODS** | Specific privilege on the user |

**Granting the specific privilege:**
```sql
-- Grant privilege to a custom role
GRANT MODIFY PROGRAMMATIC AUTHENTICATION METHODS
  ON USER my_service_user
  TO ROLE my_service_owner_role;
```

### 4.2 Assign Public Key to User

Extract the key content (without headers) and assign:

```sql
ALTER USER example_user SET RSA_PUBLIC_KEY='MIIBIjANBgkqh...';
```

**Important Notes:**
- Exclude the `-----BEGIN PUBLIC KEY-----` and `-----END PUBLIC KEY-----` headers
- Exclude any line breaks within the key
- The key should be one continuous string

### 4.3 Verify the Configuration

**Step 1: Retrieve the fingerprint from Snowflake:**
```sql
DESC USER example_user
  ->> SELECT SUBSTR(
        (SELECT "value" FROM $1
           WHERE "property" = 'RSA_PUBLIC_KEY_FP'),
        LEN('SHA256:') + 1) AS key_fingerprint;
```

**Step 2: Calculate the fingerprint locally:**
```bash
openssl rsa -in rsa_key.p8 -pubout -outform DER | openssl dgst -sha256 -binary | openssl enc -base64
```

**Step 3: Compare the fingerprints** - They must match exactly.

### 4.4 User Properties for Key Pair Authentication

| Property | Description |
|----------|-------------|
| `RSA_PUBLIC_KEY` | First public key slot |
| `RSA_PUBLIC_KEY_FP` | Fingerprint of first public key (read-only) |
| `RSA_PUBLIC_KEY_2` | Second public key slot (for rotation) |
| `RSA_PUBLIC_KEY_2_FP` | Fingerprint of second public key (read-only) |

---

## 5. Key Pair Rotation

### 5.1 Why Rotate Keys?

- Comply with security policies requiring periodic credential changes
- Respond to potential key compromise
- Meet regulatory requirements
- Follow security best practices

### 5.2 Snowflake's Rotation Approach

Snowflake supports **two active public keys** simultaneously, enabling seamless rotation without downtime:
- `RSA_PUBLIC_KEY` - Primary key slot
- `RSA_PUBLIC_KEY_2` - Secondary key slot (for rotation)

### 5.3 Key Rotation Process

**Step 1: Generate new key pair**
```bash
# Generate new private key
openssl genrsa 2048 | openssl pkcs8 -topk8 -inform PEM -out rsa_key_new.p8

# Generate new public key
openssl rsa -in rsa_key_new.p8 -pubout -out rsa_key_new.pub
```

**Step 2: Assign new public key to unused slot**
```sql
-- If RSA_PUBLIC_KEY is in use, assign to RSA_PUBLIC_KEY_2
ALTER USER example_user SET RSA_PUBLIC_KEY_2='JERUEHtcve...';
```

**Step 3: Update client applications** to use the new private key

**Step 4: Verify new key works** by testing authentication

**Step 5: Remove old public key**
```sql
-- Once all clients are updated, remove the old key
ALTER USER example_user UNSET RSA_PUBLIC_KEY;
```

### 5.4 How Snowflake Handles Dual Keys

- Client connects using a private key
- Snowflake checks the JWT signature against **both** public keys
- Authentication succeeds if **either** key validates the signature
- This allows gradual migration of clients without downtime

> **Exam Tip:** Snowflake automatically determines which public key corresponds to the private key used during connection. You don't need to specify which key slot to use.

---

## 6. Configuring Clients for Key Pair Authentication

### 6.1 SnowSQL Configuration

**In connection parameters:**
```bash
snowsql -a <account> -u <user> --private-key-path /path/to/rsa_key.p8
```

**In configuration file (~/.snowsql/config):**
```ini
[connections.my_connection]
accountname = myorg-myaccount
username = my_user
private_key_path = /path/to/rsa_key.p8
```

### 6.2 Python Connector

```python
import snowflake.connector
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization

# Load the private key
with open("/path/to/rsa_key.p8", "rb") as key_file:
    p_key = serialization.load_pem_private_key(
        key_file.read(),
        password=None,  # Or passphrase.encode() if encrypted
        backend=default_backend()
    )

# Create the connection
conn = snowflake.connector.connect(
    user='my_user',
    account='myorg-myaccount',
    private_key=p_key
)
```

### 6.3 JDBC Driver

**Connection properties:**
```properties
jdbc:snowflake://<account>.snowflakecomputing.com/?private_key_file=/path/to/rsa_key.p8&private_key_file_pwd=<passphrase>
```

### 6.4 Node.js Driver

```javascript
const snowflake = require('snowflake-sdk');
const fs = require('fs');

const connection = snowflake.createConnection({
    account: 'myorg-myaccount',
    username: 'my_user',
    privateKey: fs.readFileSync('/path/to/rsa_key.p8', 'utf-8'),
    privateKeyPass: 'passphrase'  // If encrypted
});
```

---

## 7. Use Cases for Key Pair Authentication

### 7.1 Service Accounts

Key pair authentication is ideal for service accounts that:
- Run automated ETL/ELT processes
- Execute scheduled tasks
- Power BI integrations
- Data pipeline orchestration

**Best Practice:**
```sql
-- Create service user
CREATE USER etl_service_user
  TYPE = SERVICE
  DEFAULT_ROLE = etl_role
  DEFAULT_WAREHOUSE = etl_wh;

-- Assign key pair (no password needed)
ALTER USER etl_service_user SET RSA_PUBLIC_KEY='MIIBIjANBgkqh...';
```

### 7.2 CI/CD Pipelines

- GitHub Actions, GitLab CI, Azure DevOps
- Private key stored as encrypted secret
- No password exposure in pipeline logs

### 7.3 Data Integration Tools

- Apache Airflow
- dbt Cloud
- Fivetran (programmatic access)
- Informatica

### 7.4 Application Authentication

- Backend services connecting to Snowflake
- Microservices architectures
- Serverless functions (AWS Lambda, Azure Functions)

---

## 8. Troubleshooting Key Pair Authentication

### 8.1 Common Error: JWT_TOKEN_INVALID

**Symptoms:** Authentication fails with "JWT token is invalid"

**Possible Causes and Solutions:**

| Solution | Description |
|----------|-------------|
| **#1: Malformed Token** | Verify the application is generating valid JWT tokens |
| **#2: Account Mismatch** | Ensure the account identifier in the client matches the Snowflake account |
| **#3: Claim Mismatch** | Verify `sub` and `iss` claims match in the JWT |
| **#4: Algorithm** | Ensure the `iss` claim specifies `SHA256` as the signing algorithm |

### 8.2 Common Error: JWT_TOKEN_INVALID_PUBLIC_KEY_FINGERPRINT_MISMATCH

**Symptoms:** Fingerprint mismatch error

**Solutions:**
1. Enable DEBUG logging to find the JWT token's fingerprint
2. Run `DESC USER <username>` to get `RSA_PUBLIC_KEY_FP` or `RSA_PUBLIC_KEY_2_FP`
3. Compare fingerprints - they must match
4. If missing, re-assign the public key with `ALTER USER ... SET RSA_PUBLIC_KEY=...`

### 8.3 Common Error: JWT_TOKEN_INVALID_USER_IN_ISSUER

**Symptoms:** User not found error

**Solution:** Ensure the username in the client configuration matches the user's `LOGIN_NAME`, not the `NAME`:
```sql
-- Check both properties
DESC USER example_user;
-- Look for LOGIN_NAME vs NAME - they may differ
```

### 8.4 Common Error: JWT_TOKEN_INVALID_ISSUE_TIME

**Symptoms:** Token received more than 60 seconds after issue time

**Solutions:**

| Solution | Description |
|----------|-------------|
| **#1: Clock Sync** | Synchronize the client machine with NTP servers (e.g., NIST time servers) |
| **#2: CPU/Disk Load** | Check for extreme resource usage that might delay token generation |
| **#3: Network Latency** | Measure and reduce network latency to Snowflake |

> **Exam Tip:** The JWT token must be received by Snowflake within **60 seconds** of the issue time. Clock skew on the client machine is a common cause of authentication failures.

### 8.5 Retrieving Error Details

Administrators can get detailed error information:

```sql
-- Get details about a failed login attempt using the UUID from the error
SELECT JSON_EXTRACT_PATH_TEXT(
  SYSTEM$GET_LOGIN_FAILURE_DETAILS('0ce9eb56-821d-4ca9-a774-04ae89a0cf5a'),
  'errorCode'
);
```

---

## 9. Authentication Policies and Key Pair Auth

### 9.1 How Authentication Policies Interact

Authentication policies can control:
- Which authentication methods are allowed
- Whether MFA is required for specific methods
- Which clients can connect

**Key pair authentication in policies:**
```sql
CREATE AUTHENTICATION POLICY keypair_only_policy
  AUTHENTICATION_METHODS = ('KEYPAIR')
  COMMENT = 'Allow only key pair authentication';

-- Assign to user
ALTER USER service_user SET AUTHENTICATION POLICY = keypair_only_policy;
```

### 9.2 Security Policy Precedence

When multiple security policies are active:

1. **Network Policies** - IP allow/block lists (evaluated first)
2. **Authentication Policies** - Methods, clients, integrations
3. **Password Policies** - Password requirements (for password auth only)
4. **Session Policies** - Session timeout, re-authentication

> **Exam Tip:** Network policies take precedence over authentication policies. A blocked IP address will fail before authentication policy evaluation.

---

## 10. Security Best Practices

### 10.1 Key Management

| Practice | Description |
|----------|-------------|
| **Use encrypted private keys** | Add passphrase protection for production keys |
| **Secure storage** | Store private keys in secrets managers (HashiCorp Vault, AWS Secrets Manager) |
| **Restrict file permissions** | `chmod 600 rsa_key.p8` on Unix systems |
| **Never commit keys to source control** | Add `*.p8` and `*.pem` to `.gitignore` |
| **Regular rotation** | Rotate keys according to security policy (e.g., every 90 days) |

### 10.2 User Configuration

```sql
-- Example secure service user setup
CREATE USER data_pipeline_user
  TYPE = SERVICE
  DEFAULT_ROLE = data_pipeline_role
  DEFAULT_WAREHOUSE = pipeline_wh
  MUST_CHANGE_PASSWORD = FALSE;  -- No password for key-pair only users

-- Assign public key
ALTER USER data_pipeline_user SET RSA_PUBLIC_KEY='MIIBIj...';

-- Optional: Set authentication policy to enforce key pair only
ALTER USER data_pipeline_user SET AUTHENTICATION POLICY = keypair_only_policy;
```

### 10.3 Monitoring Key Pair Usage

```sql
-- Monitor successful authentications
SELECT *
FROM SNOWFLAKE.ACCOUNT_USAGE.LOGIN_HISTORY
WHERE USER_NAME = 'DATA_PIPELINE_USER'
  AND FIRST_AUTHENTICATION_FACTOR = 'RSA_KEYPAIR'
ORDER BY EVENT_TIMESTAMP DESC;
```

---

## 11. Exam Tips and Common Question Patterns

### 11.1 Key Concepts to Memorize

| Topic | Key Fact |
|-------|----------|
| **Minimum key size** | 2048-bit RSA |
| **Key format** | PEM format, PKCS#8 encoding |
| **Key slots** | Two available: `RSA_PUBLIC_KEY` and `RSA_PUBLIC_KEY_2` |
| **JWT timeout** | Token must arrive within 60 seconds of issue time |
| **Fingerprint property** | `RSA_PUBLIC_KEY_FP` (read-only) |
| **Passphrase scope** | Protects local private key only, never sent to Snowflake |

### 11.2 Common Exam Question Types

**Type 1: Configuration Commands**
- "Which command assigns a public key to a user?"
- Answer: `ALTER USER ... SET RSA_PUBLIC_KEY='...'`

**Type 2: Key Rotation**
- "How many public keys can be active for a single user?"
- Answer: Two (`RSA_PUBLIC_KEY` and `RSA_PUBLIC_KEY_2`)

**Type 3: Use Cases**
- "What authentication method is recommended for service accounts?"
- Answer: Key pair authentication

**Type 4: Troubleshooting**
- "Authentication fails with clock-related JWT error. What should you check?"
- Answer: NTP synchronization on the client machine

**Type 5: Security Best Practices**
- "Where should the private key be stored?"
- Answer: Securely on the client side (never in Snowflake)

### 11.3 Key Differences to Know

**Private Key vs Public Key:**
- Private key: Kept secret, used to sign JWT tokens, stored on client
- Public key: Stored in Snowflake, used to verify signatures

**RSA_PUBLIC_KEY vs RSA_PUBLIC_KEY_2:**
- Both are valid key slots
- Used for seamless key rotation
- Only difference is the slot number

**Encrypted vs Unencrypted Private Keys:**
- Encrypted: Protected by passphrase, more secure
- Unencrypted: No passphrase, simpler but less secure
- Not all connectors support encrypted keys

### 11.4 Practice Questions

**Q1:** A company wants to set up a service account for their ETL pipeline. Which authentication method should they use?
- A) Username and password
- B) OAuth
- C) Key pair authentication
- D) SAML SSO

**Answer:** C - Key pair authentication is ideal for service accounts and automation scenarios.

**Q2:** What is the minimum RSA key size supported by Snowflake for key pair authentication?
- A) 1024 bits
- B) 2048 bits
- C) 4096 bits
- D) 512 bits

**Answer:** B - Snowflake requires a minimum of 2048-bit RSA keys.

**Q3:** During key rotation, how many public keys can be active for a single Snowflake user?
- A) One
- B) Two
- C) Three
- D) Unlimited

**Answer:** B - Snowflake supports two active public keys (`RSA_PUBLIC_KEY` and `RSA_PUBLIC_KEY_2`) to enable seamless rotation.

**Q4:** A JWT token authentication fails with error code 394302. What is the most likely cause?
- A) Invalid username
- B) Fingerprint mismatch
- C) Clock synchronization issue
- D) Incorrect account identifier

**Answer:** C - Error 394302 (JWT_TOKEN_INVALID_ISSUE_TIME) indicates the token was received more than 60 seconds after the issue time, typically caused by clock skew.

**Q5:** Which privilege is required to assign a public key to another user (besides SECURITYADMIN or OWNERSHIP)?
- A) MANAGE GRANTS
- B) MODIFY PROGRAMMATIC AUTHENTICATION METHODS
- C) CREATE USER
- D) ALTER USER

**Answer:** B - MODIFY PROGRAMMATIC AUTHENTICATION METHODS is the specific privilege for managing key pair authentication.

---

## 12. Quick Reference

### OpenSSL Commands Cheat Sheet

```bash
# Generate unencrypted private key
openssl genrsa 2048 | openssl pkcs8 -topk8 -inform PEM -out rsa_key.p8 -nocrypt

# Generate encrypted private key (prompts for passphrase)
openssl genrsa 2048 | openssl pkcs8 -topk8 -inform PEM -out rsa_key.p8

# Generate public key from private key
openssl rsa -in rsa_key.p8 -pubout -out rsa_key.pub

# Calculate public key fingerprint (to verify against Snowflake)
openssl rsa -in rsa_key.p8 -pubout -outform DER | openssl dgst -sha256 -binary | openssl enc -base64
```

### SQL Commands Cheat Sheet

```sql
-- Assign public key
ALTER USER <user> SET RSA_PUBLIC_KEY='<key_content>';

-- Assign second public key (for rotation)
ALTER USER <user> SET RSA_PUBLIC_KEY_2='<key_content>';

-- Remove public key
ALTER USER <user> UNSET RSA_PUBLIC_KEY;

-- View user key fingerprints
DESC USER <user>;
-- Look for RSA_PUBLIC_KEY_FP and RSA_PUBLIC_KEY_2_FP

-- Grant key assignment privilege
GRANT MODIFY PROGRAMMATIC AUTHENTICATION METHODS ON USER <user> TO ROLE <role>;

-- Get login failure details
SELECT SYSTEM$GET_LOGIN_FAILURE_DETAILS('<uuid>');
```

---

## Summary

Key pair authentication is a fundamental security mechanism in Snowflake for programmatic access:

1. **Uses asymmetric cryptography** (RSA 2048-bit minimum or ECDSA)
2. **Public key stored in Snowflake**, private key kept on client
3. **Supports seamless rotation** with two active key slots
4. **Ideal for service accounts** and automated processes
5. **JWT tokens must arrive within 60 seconds** of issue time
6. **Clock synchronization is critical** for successful authentication

Understanding key pair authentication is essential for the SnowPro Core exam and real-world Snowflake administration.
