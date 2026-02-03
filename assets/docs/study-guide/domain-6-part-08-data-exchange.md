# Domain 6: Data Protection and Sharing - Part 8

## Data Exchange

### Introduction

A Snowflake Data Exchange is a private, secure data hub that enables controlled data collaboration among an invited group of members. Unlike the public Snowflake Marketplace, a Data Exchange provides organizations with a way to share data exclusively with selected business partners, internal departments, vendors, suppliers, or customers. Understanding Data Exchange concepts, administration, and differences from the Marketplace is essential for the SnowPro Core exam.

---

## Key Concepts

### What is a Data Exchange?

A Data Exchange is a Snowflake-hosted data hub for securely collaborating around data with a selected group of members. Key characteristics include:

- **Private Access**: Only invited members can participate
- **Controlled Membership**: The Data Exchange Admin manages who joins
- **Secure Collaboration**: Uses Snowflake's Secure Data Sharing under the hood
- **Centralized Management**: Single point for auditing, access control, and security
- **Bidirectional Sharing**: Members can be providers, consumers, or both

### When to Use a Data Exchange

Data Exchange is ideal for:

- **Internal Data Sharing**: Sharing data between departments within an organization
- **Consistent Business Partners**: Regular data exchange with known suppliers, vendors, or partners
- **Controlled Distribution**: When you need to manage exactly who can access your data
- **Regulated Industries**: Where audit trails and access controls are mandatory
- **Cross-Region Collaboration**: Sharing data with partners in different cloud regions

---

## Data Exchange vs Snowflake Marketplace

Understanding the distinction between Data Exchange and Marketplace is crucial for the exam:

| Aspect | Data Exchange | Snowflake Marketplace |
|--------|--------------|----------------------|
| **Visibility** | Private - invitation only | Public - visible to all Snowflake accounts |
| **Membership** | Controlled by Data Exchange Admin | Open to all Snowflake customers |
| **Audience** | Specific, known business partners | Broad, unknown consumer base |
| **Setup** | Request from Snowflake Support | Available by default |
| **Administration** | Customer manages membership | Snowflake manages platform |
| **Pricing** | Free or personalized (custom terms) | Free, paid, or limited trial |
| **Discovery** | Within exchange only | Search across all marketplace listings |
| **Approval Process** | Admin approves members and listings | Snowflake reviews marketplace listings |
| **Use Case** | B2B partnerships, internal sharing | Public data monetization, marketing |

### When to Choose Each

**Choose Data Exchange when:**
- You have specific, known data consumers
- You need tight control over who accesses data
- Sharing with internal teams or established partners
- Regulatory requirements demand controlled access
- You want to manage the entire sharing ecosystem

**Choose Marketplace when:**
- You want maximum visibility for your data
- Monetizing data publicly
- Don't know your consumers in advance
- Want Snowflake to handle discovery and basic vetting

---

## Data Exchange Architecture

### Roles and Participants

```
+------------------------------------------+
|            DATA EXCHANGE                  |
|                                          |
|  +----------------+                      |
|  | Exchange Admin |-- Manages membership |
|  | (Host Account) |-- Approves listings  |
|  +----------------+-- Approves profiles  |
|         |                                |
|    +----+----+                           |
|    |         |                           |
|  +-v-+    +-v-+                          |
|  |Pro|    |Con|  Members can be both     |
|  |vid|    |sum|                          |
|  |ers|    |ers|                          |
|  +---+    +---+                          |
+------------------------------------------+
```

### Key Roles

| Role | Description | Responsibilities |
|------|-------------|------------------|
| **Data Exchange Admin** | Snowflake account hosting the exchange | Add/remove members, approve profiles, approve listings |
| **Provider** | Member who shares data | Create listings, publish data, manage requests |
| **Consumer** | Member who accesses data | Browse listings, request/get data |
| **Provider + Consumer** | Member with both roles | Can both share and consume data |

---

## Data Exchange Administration

### Admin Responsibilities

The Data Exchange Admin (the hosting account) is responsible for:

1. **Membership Management**
   - Add or remove member accounts
   - Designate members as providers, consumers, or both

2. **Profile Approval**
   - Review and approve provider profiles
   - Ensure profile information meets exchange standards

3. **Listing Governance**
   - Review and approve/deny listings
   - Ensure shared data meets exchange policies

4. **Access Control**
   - Grant privileges to other roles
   - Delegate administrative tasks

### Required Privileges

| Task | Required Role/Privilege |
|------|------------------------|
| Manage membership | ACCOUNTADMIN or IMPORTED PRIVILEGES on exchange |
| Approve listings | ACCOUNTADMIN or IMPORTED PRIVILEGES on exchange |
| Approve profiles | ACCOUNTADMIN or IMPORTED PRIVILEGES on exchange |
| Browse listings | Any role (as consumer) |
| Get/request data | ACCOUNTADMIN or IMPORT SHARE + CREATE DATABASE |
| Create listings | Global CREATE LISTING privilege |
| Create shares | CREATE SHARE privilege |

### Granting Administrator Privileges

To delegate Data Exchange admin tasks to other roles:

```sql
-- Grant admin privileges to a custom role
USE ROLE ACCOUNTADMIN;

GRANT IMPORTED PRIVILEGES ON DATA EXCHANGE mydataexchange TO ROLE myrole;
```

**Important Notes:**
- The WITH GRANT OPTION is not supported for IMPORTED PRIVILEGES
- Privileges are granted at the Data Exchange level (not global)
- Only ACCOUNTADMIN in the admin account can grant these privileges

---

## Setting Up a Data Exchange

### Requesting a New Data Exchange

Data Exchange is not enabled by default. To request one:

1. **Contact Snowflake Support** with the following information:
   - Business case description
   - Unique name for the exchange (SQL identifier format)
   - Display name (shown in UI)
   - Account URL of the hosting account

2. **Wait for Provisioning** (up to 2 business days)

3. **Access the Exchange** via Snowsight after provisioning

### Name Requirements

| Field | Requirements | Example |
|-------|-------------|---------|
| Exchange Name | No spaces, no special characters (underscore allowed), SQL identifier rules | `ACME_PARTNER_EXCHANGE` |
| Display Name | Human-readable, shown in UI | `ACME Partner Data Hub` |

---

## Membership Management

### Adding Members

1. Sign in to Snowsight as ACCOUNTADMIN
2. Navigate to **Data sharing > External sharing > Manage exchanges**
3. Select the exchange to manage
4. Select the **Members** tab
5. Click **Add Member**
6. Enter the member's Snowflake account name or URL
7. Assign role: **Provider**, **Consumer**, or both
8. Save changes

### Member Capabilities

**After joining as Provider:**
- Create listings with data products
- Define listing access (free or personalized)
- Publish listings to the exchange
- Manage requests from consumers

**After joining as Consumer:**
- Browse exchange listings
- Switch between Marketplace and Data Exchange views
- Request or get data from listings
- Access shared datasets

---

## Provider Profiles

### Profile Requirements

Before publishing listings, providers must create a provider profile:

| Field | Description | Required |
|-------|-------------|----------|
| Logo | High-resolution JPG/PNG, max 2MB, square recommended | Yes |
| Company Name | Brand name (not Snowflake account name) | Yes |
| Description | 2-3 sentence introduction | Yes |
| Contact Email | Sales contact for potential consumers | Yes |
| Support Link | Technical support contact | Yes |
| Privacy Policy Link | Link to provider's privacy policy | Required for personalized listings |
| Snowflake General Contact | Email for Snowflake inquiries | Yes |
| Snowflake Technical Contact | Email for technical questions | Yes |

### Creating a Provider Profile

1. Sign in to Snowsight
2. Navigate to **Data sharing > External sharing > Manage Exchanges**
3. Select the **Provider Profiles** tab
4. Click **Add Profile**
5. Complete all required fields
6. Save and submit for approval

**Note:** Reader accounts are NOT supported for providers or consumers in a Data Exchange.

---

## Managing Data Listings

### Listing Types

| Type | Access Model | Consumer Experience |
|------|-------------|---------------------|
| **Free** | Instant access | Consumer clicks "Get" to create database |
| **Personalized** | Request-based access | Consumer requests access; provider approves |

### Considerations for Creating Listings

1. **Identifier Requirements**
   - Object identifiers must be UPPERCASE
   - Use only alphanumeric characters
   - Ensures consumers can query without quoted identifiers

2. **Security**
   - Use secure views to protect sensitive data
   - Shares already shared directly can be added to listings
   - Only the role that created the share can attach it to a listing

3. **One Share Per Listing**
   - A share can only be attached to one listing
   - Once attached, cannot be attached to another (even if deleted)

4. **Sample Query Validation**
   - Free listings auto-validate sample queries before publishing
   - Ensures referenced objects exist in the share

5. **Legal Compliance**
   - Must own data or have rights to share
   - PHI requires BAA with Snowflake and consumer
   - Personal data requires applicable legal rights

### Creating and Publishing a Listing

1. Sign in to Snowsight
2. Navigate to **Data sharing > External sharing**
3. Select **Share Data** dropdown and choose your exchange
4. Enter listing title and select type (Free or Personalized)
5. Complete all listing sections:
   - Basic information (profile, title, subtitle)
   - Details (description, documentation link)
   - Data (select share or database objects)
   - Business needs (categorization)
   - Region availability
6. Click **Publish**

### Listing Fields Reference

| Section | Field | Description |
|---------|-------|-------------|
| Basic Info | Listing Type | Free or Personalized |
| Basic Info | Profile | Provider profile owning the listing |
| Basic Info | Title | 110 characters max |
| Basic Info | Subtitle | 110 characters max |
| Basic Info | Data Update Frequency | Near real-time, Daily, Weekly, etc. |
| Basic Info | Terms of Service | URL to listing terms (required for free) |
| Details | Description | Full dataset description |
| Details | Documentation Link | Link to detailed documentation |
| Data | Database Objects | Objects to include in share |
| Business Needs | Category | For discovery categorization |
| Regions | Availability | Where listing is visible |

---

## Cross-Region Data Sharing

### Key Concepts

- **Listings replicate automatically** to selected regions
- **Data does NOT replicate automatically** - provider must set up replication
- **Free listings**: Replicate data before publishing or on first request
- **Personalized listings**: Replicate data upon consumer request

### Cross-Region Requirements

1. **Account in Target Region**: Must have an account in each region
2. **Same Organization**: All accounts must belong to the same org
3. **Replication Setup**: Configure database replication to remote accounts
4. **Provider Designation**: Specify which accounts can fulfill requests

### Fulfilling Cross-Region Requests

1. Receive request notification
2. Sign in to remote account
3. Set up data replication if not done
4. Navigate to **Requests** tab
5. Select **Review**
6. Associate a share (new or existing)
7. Click **Fulfill Request**

---

## Accessing a Data Exchange

### As a Consumer

**Browsing and Getting Data:**

1. Sign in to Snowsight
2. Navigate to **Data sharing > External sharing > Shared with you**
3. Browse available listings
4. For free listings: Click **Get** to create database
5. For personalized listings: Click **Request** to submit access request
6. Enter database name and select roles for access
7. Accept terms (first time only)
8. Click **Create Database**

**Access Requirements:**

| Action | Required |
|--------|----------|
| Browse listings | Any role |
| Get/request data | ACCOUNTADMIN or IMPORT SHARE + CREATE DATABASE |
| Administrative tasks | ACCOUNTADMIN |

### As a Provider

1. Sign in to Snowsight
2. Navigate to **Data sharing > External sharing > Shared by your account**
3. View your listings and their status
4. Check **Requests** tab for incoming requests
5. Approve or deny personalized listing requests

---

## Privileges Reference

### Account-Level Privileges

| Privilege | Granted By | Enables |
|-----------|-----------|---------|
| CREATE LISTING | ACCOUNTADMIN | Create listings and provider profiles |
| CREATE SHARE | ACCOUNTADMIN | Create shares |
| IMPORT SHARE | ACCOUNTADMIN | View inbound shares, create databases from shares |
| PURCHASE DATA EXCHANGE LISTING | ACCOUNTADMIN | Purchase paid listings |

### Listing-Level Privileges

| Privilege | Granted By | Enables |
|-----------|-----------|---------|
| MODIFY | Listing owner | Modify listing properties, view, submit, publish |
| USAGE | Listing owner | View listing and incoming requests |
| OWNERSHIP | Listing owner | Full control; can be transferred |

### Provider Profile Privileges

| Privilege | Granted By | Enables |
|-----------|-----------|---------|
| MODIFY | Profile owner | View and modify profile properties |
| OWNERSHIP | Profile owner | Full control over profile |

### Granting CREATE LISTING Privilege

```sql
-- Grant ability to create listings
USE ROLE ACCOUNTADMIN;
GRANT CREATE LISTING ON ACCOUNT TO ROLE myrole;

-- With grant option
GRANT CREATE LISTING ON ACCOUNT TO ROLE myrole WITH GRANT OPTION;
```

---

## Exam Tips and Common Question Patterns

### High-Priority Topics

1. **Data Exchange vs Marketplace**
   - Exchange = private, controlled membership
   - Marketplace = public, open to all
   - Know when to recommend each

2. **Admin Role**
   - Data Exchange Admin = hosting account
   - Must use ACCOUNTADMIN or have IMPORTED PRIVILEGES
   - Manages membership, approves profiles and listings

3. **Membership Model**
   - Members can be providers, consumers, or both
   - Reader accounts NOT supported
   - Account added by admin before access

4. **Listing Types**
   - Free = instant access via "Get"
   - Personalized = request-based access

5. **Cross-Region Considerations**
   - Listings replicate automatically
   - Data requires manual replication setup
   - Same organization required for multiple accounts

6. **Privileges**
   - CREATE LISTING = create listings and profiles
   - IMPORT SHARE = view inbound shares
   - IMPORTED PRIVILEGES on exchange = admin delegation

### Common Question Patterns

**Pattern 1: Exchange vs Marketplace Selection**
> "A company wants to share data exclusively with its top 10 suppliers. What should they use?"
>
> Answer: Data Exchange - provides private, controlled access to specific partners

**Pattern 2: Admin Responsibilities**
> "Who can add members to a Data Exchange?"
>
> Answer: The Data Exchange Admin (ACCOUNTADMIN role or user with IMPORTED PRIVILEGES)

**Pattern 3: Listing Access**
> "What happens when a consumer clicks 'Get' on a free listing?"
>
> Answer: A database is created in the consumer's account from the shared data

**Pattern 4: Cross-Region Sharing**
> "A provider has a listing but a consumer in another region cannot access the data. What is needed?"
>
> Answer: The provider must set up data replication to an account in the consumer's region

**Pattern 5: Provider Profile Requirements**
> "What is required before a member can publish a listing in a Data Exchange?"
>
> Answer: A provider profile must be created and approved by the Data Exchange Admin

**Pattern 6: Privilege Requirements**
> "What privilege is needed to create a new listing in a Data Exchange?"
>
> Answer: Global CREATE LISTING privilege (granted by ACCOUNTADMIN)

**Pattern 7: Reader Account Support**
> "Can reader accounts participate in a Data Exchange?"
>
> Answer: No, reader accounts are not supported for Data Exchange membership

### Memory Aids

**Data Exchange = "Private Club"**
- Invitation required (admin adds members)
- Controlled access (know your partners)
- Managed environment (admin approves everything)

**Marketplace = "Public Store"**
- Open to everyone
- Browse and buy
- Platform managed by Snowflake

**Listing Types**
- **Free** = "F" for Fast/Free (instant access)
- **Personalized** = "P" for Permission required (request access)

**Admin Tasks (The 3 Ms)**
- **M**embership management
- **M**anage profiles
- **M**anage listings

---

## Practice Questions

1. **What is the primary difference between a Snowflake Data Exchange and the Snowflake Marketplace?**
   - A) Data Exchange requires Enterprise Edition
   - B) Data Exchange provides private, controlled membership while Marketplace is public
   - C) Marketplace supports cross-region sharing but Data Exchange does not
   - D) Data Exchange is free but Marketplace requires payment

<details>
<summary>Show Answer</summary>

**B** - Data Exchange is private with controlled membership; Marketplace is public and open to all Snowflake accounts
</details>

2. **Who is responsible for approving new members to a Data Exchange?**
   - A) Snowflake Support
   - B) Any provider in the exchange
   - C) The Data Exchange Admin
   - D) The consumer requesting access

<details>
<summary>Show Answer</summary>

**C** - The Data Exchange Admin manages membership, including approving new members
</details>

3. **What must a provider create before publishing listings in a Data Exchange?**
   - A) A reader account
   - B) A provider profile
   - C) A storage integration
   - D) A resource monitor

<details>
<summary>Show Answer</summary>

**B** - A provider profile must be created and approved before publishing listings
</details>

4. **A consumer wants to access a personalized listing in a Data Exchange. What is the process?**
   - A) Click "Get" to instantly create a database
   - B) Click "Request" and wait for provider approval
   - C) Contact Snowflake Support
   - D) Ask the Data Exchange Admin to grant access

<details>
<summary>Show Answer</summary>

**B** - Personalized listings require the consumer to request access and wait for provider approval
</details>

5. **What happens to data when a listing is published to a remote region?**
   - A) Data automatically replicates to all regions
   - B) The listing replicates but data must be manually replicated
   - C) Both listing and data replicate automatically
   - D) Neither listing nor data replicate

<details>
<summary>Show Answer</summary>

**B** - Listings replicate automatically, but data must be manually replicated by the provider
</details>

6. **Which privilege allows a role to create listings and provider profiles?**
   - A) CREATE SHARE
   - B) IMPORT SHARE
   - C) CREATE LISTING
   - D) IMPORTED PRIVILEGES

<details>
<summary>Show Answer</summary>

**C** - The global CREATE LISTING privilege enables creating listings and provider profiles
</details>

7. **Can reader accounts be members of a Data Exchange?**
   - A) Yes, as consumers only
   - B) Yes, as providers only
   - C) Yes, as both providers and consumers
   - D) No, reader accounts are not supported

<details>
<summary>Show Answer</summary>

**D** - Reader accounts are not supported for Data Exchange membership (full accounts required)
</details>

---

## Summary

Data Exchange provides a powerful mechanism for controlled, private data collaboration within Snowflake. Key takeaways for the exam:

1. **Private vs Public**: Data Exchange is for controlled, private sharing; Marketplace is for public distribution
2. **Admin Control**: The Data Exchange Admin manages all aspects of membership and governance
3. **Member Roles**: Members can be providers, consumers, or both - but NOT reader accounts
4. **Listing Types**: Free listings offer instant access; personalized listings require approval
5. **Cross-Region**: Listings replicate automatically; data requires manual replication
6. **Privileges**: CREATE LISTING enables listing creation; IMPORTED PRIVILEGES enables admin delegation
7. **Setup**: Data Exchange must be requested from Snowflake Support (not enabled by default)

Understanding these concepts ensures you can advise on the appropriate sharing mechanism and navigate Data Exchange administration effectively.
