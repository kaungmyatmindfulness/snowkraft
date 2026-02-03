# Domain 6: Snowflake Marketplace

**Exam Weight: Part of 5-10%** | **SnowPro Core (COF-C02)**

---

## Table of Contents

1. [Snowflake Marketplace Overview](#1-snowflake-marketplace-overview)
2. [Listings Fundamentals](#2-listings-fundamentals)
3. [Listing Types and Access Options](#3-listing-types-and-access-options)
4. [Provider Workflows](#4-provider-workflows)
5. [Consumer Workflows](#5-consumer-workflows)
6. [Pricing Plans and Offers](#6-pricing-plans-and-offers)
7. [Organizational Listings and Internal Marketplace](#7-organizational-listings-and-internal-marketplace)
8. [Data Exchanges](#8-data-exchanges)
9. [Cross-Region and Auto-Fulfillment](#9-cross-region-and-auto-fulfillment)
10. [Key Exam Patterns](#10-key-exam-patterns)
11. [Quick Reference](#11-quick-reference)

---

## 1. Snowflake Marketplace Overview

### 1.1 What is the Snowflake Marketplace?

The **Snowflake Marketplace** is a platform where data providers can publish data products and data consumers can discover, access, and use shared data - all within the Snowflake ecosystem.

**Key Characteristics:**

| Aspect | Description |
|--------|-------------|
| **Purpose** | Discover and share data products across the Snowflake Data Cloud |
| **Data Transfer** | No data is copied - uses Secure Data Sharing architecture |
| **Access** | Available through Snowsight interface |
| **Cost Model** | Consumers pay for compute (queries), not storage of shared data |

### 1.2 Marketplace vs Traditional Data Sharing

| Feature | Direct Sharing | Marketplace |
|---------|---------------|-------------|
| **Discovery** | Must know provider | Searchable catalog |
| **Audience** | Specific accounts | All Snowflake users (public) |
| **Metadata** | Limited | Rich descriptions, sample queries, documentation |
| **Monetization** | External agreements | Built-in pricing models |
| **Scalability** | Manual per-consumer setup | One listing, many consumers |

### 1.3 Key Terminology

| Term | Definition |
|------|------------|
| **Listing** | A published data product on the Marketplace |
| **Provider** | Account that creates and publishes listings |
| **Consumer** | Account that accesses data from listings |
| **Data Product** | The share or app attached to a listing |
| **Provider Profile** | Public information about a data provider |

### 1.4 How Data Flows in the Marketplace

```
Provider Account                    Consumer Account
     |                                    |
     v                                    |
[Create Share]                            |
     |                                    |
     v                                    |
[Create Listing]                          |
     |                                    |
     v                                    v
[Publish to Marketplace] -----> [Browse/Discover]
                                          |
                                          v
                                   [Get Listing]
                                          |
                                          v
                                [Create Database from Share]
                                          |
                                          v
                                   [Query Data]
```

**Important:** No actual data is copied. Consumers query the provider's data directly using their own compute (virtual warehouses).

---

## 2. Listings Fundamentals

### 2.1 What is a Listing?

A **listing** is an enhanced method of Secure Data Sharing that adds capabilities beyond basic sharing:

**Listing Capabilities:**
- Offer a share publicly on the Snowflake Marketplace
- Charge consumers for access to data
- Monitor interest in listings and usage of shared data
- Provide metadata (title, description, sample SQL queries, documentation)
- Display information about the data provider

### 2.2 Listing vs Share Comparison

**Key Distinction:** Shares are the **low-level mechanism** for data sharing (the underlying object that grants access). Listings are **enhanced sharing** -- they wrap a share with metadata, descriptions, sample queries, pricing, and discoverability.

| Aspect | Share (Direct) | Listing |
|--------|---------------|---------|
| **Visibility** | Private to named accounts | Public or private |
| **Metadata** | Minimal | Rich (title, description, samples) |
| **Monetization** | Not supported | Built-in pricing models |
| **Analytics** | Limited | Usage metrics and insights |
| **Discovery** | Not discoverable | Searchable in Marketplace |

### 2.3 What Can Be Shared in a Listing?

**Shareable Objects:**
- Databases
- Tables (including dynamic tables, external tables, Iceberg tables)
- Secure views and secure materialized views
- User-defined functions (UDFs)
- Snowflake Native Apps

**Key Constraint:** All shared objects are **read-only** for consumers.

### 2.4 Listing Availability Options

When creating a listing, providers choose **how** to make the data product available:

| Option | Description | Use Case |
|--------|-------------|----------|
| **Privately** | Available only to specific consumers | Existing business relationships |
| **Publicly** | Visible on Snowflake Marketplace | Broad distribution, new customers |

### 2.5 Legal Requirements

To use listings and the Snowflake Marketplace:
- Providers and consumers must agree to additional terms
- Legal agreements govern usage and liability
- Different requirements may apply for paid vs free listings

---

## 3. Listing Types and Access Options

### 3.1 Access Types Overview

Providers choose how consumers can **access** the data product:

| Access Type | Payment | Availability | Best For |
|-------------|---------|--------------|----------|
| **Free** | None | Instant | Generic/aggregated data |
| **Limited Trial** | None (initially) | Limited time (1-90 days) | Customer-specific data, sales qualification |
| **Paid** | Required | Per provider pricing model | Premium/proprietary data |
| **Private** | Varies | Only visible to specific accounts | Existing business relationships, negotiated terms |

### 3.2 Free Listings

**Characteristics:**
- Available privately or publicly
- Provides instant access to full data product
- No payment required

**Use Cases:**
- Generic, aggregated, non-customer-specific data (public)
- Existing business partners with negotiated terms (private)
- Open data initiatives

**Example:** A weather data provider offering historical weather data for free.

### 3.3 Limited Trial Listings

**Characteristics:**
- Available only on public Marketplace
- Provides instant but limited access
- Consumers can request full access

**Trial Options:**
- Subset of data (sample rows/columns)
- Time-limited access (1-90 days)
- Feature-limited access

**Workflow:**
1. Consumer discovers trial listing
2. Consumer accesses trial data
3. Consumer requests full access
4. Provider evaluates request
5. Provider offers free private listing or paid listing

**Use Cases:**
- Customer-specific data where provider wants to qualify buyers
- Data subject to licensing or regulatory requirements
- Premium data products requiring sales qualification

### 3.4 Paid Listings

**Characteristics:**
- Available privately or publicly
- Requires payment through Snowflake
- Uses Snowflake's pricing models

**Pricing Models:**

| Model | Description | Example |
|-------|-------------|---------|
| **Flat-Fee** | Fixed recurring charge | $1,000/month |
| **Usage-Based** | Pay per query/usage | $0.10 per GB scanned |
| **Hybrid** | Base fee + usage | $500/month + $0.05/GB |

**Regional Availability:**
- Paid listings are only available in specific regions
- Both provider and consumer must be in supported regions

**Use Cases:**
- Proprietary or industry-specific data
- Premium analytics and insights
- Commercial data products

### 3.5 V1 vs V2 Listings

Snowflake has two listing versions with different capabilities:

| Aspect | V1 Listings | V2 Listings |
|--------|-------------|-------------|
| **Format** | Original manifest format | New manifest format |
| **Targeting** | Account names only | Organizations, roles, locations, groups |
| **Pricing Plans** | Not supported | Supported |
| **Offers** | Not supported | Supported |
| **Compatibility** | All accounts | Accounts supporting V2 |

**V1 Targeting Example:**
```yaml
targets:
  accounts: ["Org1.Account1", "Org2.Account2"]
```

**V2 Targeting Example:**
```yaml
external_targets:
  access:
    - organization: OrgName2
      accounts: [acc1, acc2]
    - account: acc2
      roles: [role1, role2]
locations:
  access_regions:
    - name: "PUBLIC.AWS_US_WEST_2"
```

---

## 4. Provider Workflows

### 4.1 Becoming a Provider

**Requirements:**
- Full Snowflake account (reader accounts not supported)
- ACCOUNTADMIN role or delegated provider privileges
- Agree to provider terms

**Key Roles:**

| Role | Capability |
|------|------------|
| **ACCOUNTADMIN** | Full provider capabilities by default |
| **Custom Role** | Can be granted specific provider privileges |

### 4.2 Provider Profile

Before publishing listings, providers must create a **provider profile**:

**Required Fields:**

| Field | Description |
|-------|-------------|
| **Logo** | JPG/PNG, max 2MB, square recommended |
| **Company Name** | Brand name as displayed in listings |
| **Description** | 2-3 sentence introduction |
| **Contact Email** | Sales contact for potential consumers |
| **Support Link** | Technical support contact |
| **Privacy Policy Link** | Required for personalized shares |

**Creating a Profile (Snowsight):**
1. Navigate to **Data sharing > External sharing**
2. Select **Manage Exchanges** > **Provider Profiles**
3. Click **Add Profile**
4. Complete required fields
5. Save profile

### 4.3 Creating a Listing

**Step-by-Step Process:**

1. **Prepare Data Objects**
   - Create share containing database objects
   - Use secure views for filtered/controlled access
   - Grant appropriate privileges

2. **Create Listing**
   - Navigate to Provider Studio in Snowsight
   - Select data product (share or app)
   - Associate with provider profile

3. **Add Metadata**
   - Title and description
   - Sample SQL queries
   - Data dictionary/documentation
   - Categories and tags

4. **Configure Access**
   - Choose availability (private/public)
   - Set access type (free/trial/paid)
   - Configure pricing if applicable

5. **Publish**
   - Review listing preview
   - Submit for publication
   - Marketplace listings may require review

### 4.4 Managing Listings

**Provider Actions:**

| Action | Description |
|--------|-------------|
| **Update** | Modify listing metadata |
| **Add Objects** | Add tables/views to share |
| **Remove Objects** | Remove from share |
| **Unpublish** | Remove from Marketplace |
| **Monitor** | View usage analytics |

**Important:** Changes to shared objects are immediately visible to all consumers who have accessed the listing.

### 4.5 Monitoring Listing Usage

Providers can access metrics about:
- Number of consumers accessing the listing
- Query patterns and frequency
- Consumer account information
- Usage trends over time

---

## 5. Consumer Workflows

### 5.1 Discovering Listings

**In Snowsight:**
1. Navigate to **Marketplace** > **Snowflake Marketplace**
2. Browse categories or search
3. Filter by provider, category, or data type
4. View listing details

**Listing Details Include:**
- Description and documentation
- Sample queries
- Provider information
- Pricing (if applicable)
- Terms and conditions

### 5.2 Getting a Listing

**Free Listings:**
1. Click **Get** on the listing
2. Specify database name
3. Grant roles access
4. Database is created immediately

**Limited Trial Listings:**
1. Click **Get** to start trial
2. Access trial data
3. Request full access when ready
4. Wait for provider approval

**Paid Listings:**
1. Review pricing terms
2. Accept offer
3. Complete payment setup
4. Database is created upon payment

### 5.3 Creating a Database from a Share

When consumers "get" a listing, Snowflake creates an **imported database**:

```sql
-- This happens automatically via Snowsight
-- Manual equivalent:
CREATE DATABASE my_data_db FROM SHARE provider_org.provider_account.share_name;
```

**Database Characteristics:**
- Read-only (no INSERT, UPDATE, DELETE)
- No cloning supported
- No Time Travel
- Cannot be re-shared
- Cannot be replicated

### 5.4 Granting Access to Imported Data

By default, only the role that created the database can access it:

**Option 1: Grant IMPORTED PRIVILEGES**
```sql
GRANT IMPORTED PRIVILEGES ON DATABASE shared_db TO ROLE analyst_role;
```

**Option 2: Use Database Roles (if provider created them)**
```sql
GRANT DATABASE ROLE shared_db.reader_role TO ROLE analyst_role;
```

### 5.5 Querying Imported Data

Once access is granted, query data normally:

```sql
USE ROLE analyst_role;
USE DATABASE shared_db;

SELECT * FROM schema_name.table_name LIMIT 100;
```

**Cost Consideration:** Consumers pay for compute (warehouse usage) to query shared data, not for storage.

### 5.6 General Limitations for Imported Databases

| Limitation | Description |
|------------|-------------|
| **Read-Only** | Cannot modify data or create objects |
| **No Cloning** | Cannot clone database, schemas, or tables |
| **No Time Travel** | Historical queries not supported |
| **No Re-sharing** | Cannot share with other accounts |
| **No Replication** | Cannot replicate to other accounts |
| **No Lifecycle Policies** | Cannot attach storage lifecycle policies |

---

## 6. Pricing Plans and Offers

### 6.1 Understanding Pricing Plans

**Pricing plans** allow providers to define pricing structures for paid listings:

**Key Components:**
- Pricing model (flat-fee vs usage-based)
- Base price
- Billing frequency
- Multiple SKUs per listing

**Benefits:**
- One listing with multiple pricing options
- "Good-Better-Best" pricing tiers
- Self-serve purchasing for consumers

### 6.2 Self-Serve Pricing Plans

**Characteristics:**
- Price and terms visible on listing page
- Consumers can purchase without provider interaction
- Multiple plans per listing (e.g., Basic, Pro, Enterprise)

**Example Configuration:**
```
Listing: "Premium Weather Data"
  - Basic Plan: $99/month, historical data only
  - Pro Plan: $299/month, historical + real-time
  - Enterprise Plan: Custom pricing, full API access
```

### 6.3 Understanding Offers

**Offers** define specific purchase terms for individual consumers:

**Offer Components:**
- Pricing (can differ from published plans)
- Billing terms
- Payment schedule
- Contract start/end dates

**Offer Types:**

| Type | Description | Visibility |
|------|-------------|------------|
| **Standard** | Tied to public pricing plans | Visible on Marketplace |
| **Private** | Individualized terms | Not visible on Marketplace |

### 6.4 Private Offers

**Characteristics:**
- Extended directly to specific consumers
- Can include negotiated discounts
- Custom terms and conditions
- Not visible on public Marketplace

**Use Cases:**
- Volume discounts for large customers
- Annual contracts with special terms
- Proof-of-concept arrangements

### 6.5 Offer Workflow

**Provider Side:**
1. Create pricing plan (or use one-time pricing)
2. Create offer with specific terms
3. Extend offer to consumer account

**Consumer Side:**
1. Review offer in Snowsight (**Data sharing > External sharing**)
2. Accept or reject offer
3. Upon acceptance, access is granted

### 6.6 Limitations

- Cannot convert listing type (e.g., trial to paid)
- Pricing plans not available for organizational listings
- Regional restrictions may apply

---

## 7. Organizational Listings and Internal Marketplace

### 7.1 What is the Internal Marketplace?

The **Internal Marketplace** is a private, organization-only version of the Snowflake Marketplace:

**Key Differences from Public Marketplace:**

| Aspect | Public Marketplace | Internal Marketplace |
|--------|-------------------|---------------------|
| **Audience** | All Snowflake users | Organization members only |
| **Discovery** | Public search | Internal search |
| **Purpose** | External data commerce | Internal data sharing |
| **Pricing** | Supported | Not supported |

### 7.2 Organizational Listings

**Organizational listings** allow data sharing within an organization:

**Characteristics:**
- Available only to accounts in same organization
- Centralized data product discovery
- No pricing/monetization
- Supports Role-Based Access Control (RBAC)

**Benefits:**
- Reduce data silos within organization
- Consistent, vetted datasets
- Easier data governance
- Support data mesh architectures

### 7.3 Provider Capabilities

Internal data providers can:
- Create listings for internal consumption
- Manage access by account or role
- Publish to Internal Marketplace
- Monitor internal usage

### 7.4 Consumer Capabilities

Internal data consumers can:
- Browse Internal Marketplace
- Discover organization-approved data
- Access vetted data products
- Trust data provenance

### 7.5 Access Control

Organizational listings support multiple access controls:

| Control Type | Description |
|--------------|-------------|
| **Account Targeting** | Specify which accounts can access |
| **RBAC** | Control access by roles |
| **Organization Groups** | Define groups of accounts |

---

## 8. Data Exchanges

### 8.1 What is a Data Exchange?

A **Data Exchange** is a private, curated hub for data sharing among a defined group of accounts:

**Characteristics:**
- Invitation-only membership
- Curated listings
- Governed data sharing
- Administrator-managed

### 8.2 Data Exchange vs Marketplace

| Aspect | Snowflake Marketplace | Data Exchange |
|--------|----------------------|---------------|
| **Access** | Open to all | Invitation only |
| **Curation** | Self-service | Admin-managed |
| **Membership** | Any Snowflake user | Selected accounts |
| **Use Case** | Public data commerce | Industry consortia, partners |

### 8.3 Data Exchange Roles

| Role | Capabilities |
|------|--------------|
| **Admin** | Manage exchange, approve members, curate listings |
| **Provider** | Publish listings to exchange |
| **Consumer** | Access listings in exchange |

### 8.4 Creating and Managing a Data Exchange

**Process:**
1. Request Data Exchange from Snowflake
2. Configure exchange settings
3. Invite member accounts
4. Approve provider listings
5. Monitor exchange activity

### 8.5 Data Exchange Use Cases

- **Industry Consortia:** Financial services data sharing
- **Partner Networks:** Supplier/vendor data exchange
- **Research Collaborations:** Academic data sharing
- **Regulatory Compliance:** Standardized reporting data

---

## 9. Cross-Region and Auto-Fulfillment

### 9.1 Cross-Region Sharing Challenge

By default, Secure Data Sharing works within a single Snowflake region:
- Provider and consumer must be in same region
- Data is stored in provider's region

### 9.2 Cross-Cloud Auto-Fulfillment

**Auto-fulfillment** enables cross-region data sharing:

**How It Works:**
1. Provider enables auto-fulfillment on listing
2. Consumer in different region requests data
3. Snowflake automatically replicates data to consumer's region
4. Consumer accesses local copy

**Benefits:**
- Transparent to consumers
- Lower query latency
- Global data distribution
- Automatic data synchronization

### 9.3 Enabling Auto-Fulfillment

**For Account:**
```sql
-- Check if enabled
SELECT SYSTEM$IS_GLOBAL_DATA_SHARING_ENABLED_FOR_ACCOUNT('account_name');

-- Enable
CALL SYSTEM$ENABLE_GLOBAL_DATA_SHARING_FOR_ACCOUNT('account_name');

-- Disable
CALL SYSTEM$DISABLE_GLOBAL_DATA_SHARING_FOR_ACCOUNT('account_name');
```

### 9.4 Auto-Fulfillment for Organizational Listings

**Characteristics:**
- Automatic propagation across regions
- No manual replication required
- Triggered when consumer accesses listing

**Limitation:** In government regions, auto-fulfillment must be triggered through Snowsight (not SQL).

### 9.5 Cost Considerations

| Cost Component | Who Pays |
|----------------|----------|
| **Data Replication** | Provider |
| **Storage in Consumer Region** | Provider |
| **Query Compute** | Consumer |

---

## 10. Key Exam Patterns

### 10.1 Listing Type Questions

**Pattern:** Which listing type for a given scenario?

**Key Facts:**
- Free = generic/aggregated data, no payment
- Limited Trial = qualify buyers, time/feature limited
- Paid = premium data, built-in monetization

**Example Question:**
> A data provider wants to let potential customers try their product for 30 days before purchasing. Which listing type should they use?
> - A) Free listing
> - B) Limited trial listing [CORRECT]
> - C) Paid listing with discount
> - D) Private listing

### 10.2 No Data Copy Questions

**Pattern:** How does Marketplace data sharing work?

**Key Facts:**
- No data is copied to consumer account
- Consumers query provider's data directly
- Consumers pay for compute (warehouses)
- No storage cost for consumers

**Example Question:**
> When a consumer gets a free listing from the Snowflake Marketplace, what storage costs do they incur?
> - A) Full storage cost of the data
> - B) Partial storage cost based on usage
> - C) No storage cost [CORRECT]
> - D) Storage cost after 30 days

### 10.3 Imported Database Limitation Questions

**Pattern:** What can/cannot be done with imported databases?

**Key Facts:**
- Read-only (no modifications)
- No cloning
- No Time Travel
- Cannot be re-shared
- Cannot be replicated

**Example Question:**
> A user wants to create a clone of a table in an imported database from a Marketplace listing. What happens?
> - A) Clone is created successfully
> - B) Clone is created as read-only
> - C) Operation fails - cloning not supported [CORRECT]
> - D) Clone requires provider approval

### 10.4 Provider Profile Questions

**Pattern:** What is required to publish listings?

**Key Facts:**
- Provider profile required before publishing
- Includes company name, logo, contact info
- Privacy policy required for personalized shares

**Example Question:**
> What must a provider create before publishing their first listing on the Snowflake Marketplace?
> - A) A reader account
> - B) A provider profile [CORRECT]
> - C) A data exchange
> - D) A pricing plan

### 10.5 Access Privilege Questions

**Pattern:** How do consumers grant access to shared data?

**Key Facts:**
- IMPORTED PRIVILEGES grants access to all objects in imported database
- Database roles (if provided) can grant selective access
- Default: only creating role has access

**Example Question:**
> After getting a listing from the Marketplace, only the ACCOUNTADMIN role can query the data. How can the admin grant access to analysts?
> - A) CREATE USER for each analyst
> - B) GRANT SELECT on each table
> - C) GRANT IMPORTED PRIVILEGES on database [CORRECT]
> - D) ALTER DATABASE to add users

### 10.6 Pricing Plans and Offers Questions

**Pattern:** How do paid listings work?

**Key Facts:**
- Pricing plans define pricing structure
- Offers are extended to specific consumers
- Private offers allow negotiated terms
- V2 listings required for pricing plans

**Example Question:**
> A provider wants to offer volume discounts to a large enterprise customer. What should they use?
> - A) Free listing with external billing
> - B) Standard offer with public pricing
> - C) Private offer with negotiated terms [CORRECT]
> - D) Limited trial listing

### 10.7 Organizational Listing Questions

**Pattern:** Internal vs external sharing

**Key Facts:**
- Organizational listings = internal only
- No pricing/monetization for organizational listings
- Internal Marketplace = organization's private catalog

**Example Question:**
> A company wants to share data between their different Snowflake accounts within the same organization. What should they use?
> - A) Public Marketplace listing
> - B) Organizational listing [CORRECT]
> - C) Data exchange
> - D) Direct share only

### 10.8 Auto-Fulfillment Questions

**Pattern:** Cross-region sharing

**Key Facts:**
- Auto-fulfillment enables cross-region sharing
- Data automatically replicated to consumer's region
- Provider pays for replication and storage
- Consumer pays for compute

**Example Question:**
> A provider in AWS US-EAST-1 wants consumers in AWS EU-WEST-1 to access their listing. What enables this?
> - A) Manual data replication
> - B) Cross-cloud auto-fulfillment [CORRECT]
> - C) External stage
> - D) Database replication

---

## 11. Quick Reference

### 11.1 Listing Types Summary

| Type | Payment | Access | Best For |
|------|---------|--------|----------|
| Free | None | Instant, full | Generic data, partners |
| Limited Trial | None (trial) | Limited time (1-90 days) | Premium data qualification |
| Paid | Required | Per pricing model | Commercial data products |
| Private | Varies | Specific accounts only | Existing relationships, negotiated terms |

### 11.2 Provider vs Consumer Responsibilities

| Aspect | Provider | Consumer |
|--------|----------|----------|
| **Data Storage** | Pays | Free |
| **Query Compute** | N/A | Pays |
| **Cross-Region Replication** | Pays | Free |
| **Listing Setup** | Creates | Gets |
| **Access Grants** | Publishes | Configures internally |

### 11.3 Key SQL Commands

```sql
-- View available listings (as consumer)
SHOW AVAILABLE LISTINGS;

-- Describe a share
DESCRIBE SHARE provider_org.provider_account.share_name;

-- Create database from share
CREATE DATABASE my_db FROM SHARE provider_org.provider_account.share_name;

-- Grant access to imported database
GRANT IMPORTED PRIVILEGES ON DATABASE shared_db TO ROLE analyst;

-- Check auto-fulfillment status
SELECT SYSTEM$IS_GLOBAL_DATA_SHARING_ENABLED_FOR_ACCOUNT('account_name');

-- Enable auto-fulfillment
CALL SYSTEM$ENABLE_GLOBAL_DATA_SHARING_FOR_ACCOUNT('account_name');
```

### 11.4 Navigation in Snowsight

| Task | Path |
|------|------|
| **Browse Marketplace** | Marketplace > Snowflake Marketplace |
| **View Internal Marketplace** | Marketplace > Internal Marketplace |
| **Manage Listings (Provider)** | Data Products > Provider Studio |
| **View Shared Data** | Data sharing > External sharing |
| **Manage Offers** | Data sharing > External sharing > Offers |

### 11.5 Marketplace Sharing Architecture

```
PROVIDER ACCOUNT                        CONSUMER ACCOUNT
================                        ================

[Database]
    |
    v
[Share]
    |
    v
[Listing]
    |
    v
[Snowflake Marketplace] ------------>  [Get Listing]
                                            |
                                            v
                                       [Imported Database]
                                            |
                                            v
                                       [Query with Warehouse]
                                       (Consumer pays compute)
```

### 11.6 Exam Tips

1. **No data copy:** Marketplace uses Secure Data Sharing - no data is copied
2. **Consumer compute costs:** Consumers pay for warehouses to query shared data, not storage
3. **Imported database limitations:** Read-only, no cloning, no Time Travel, no re-sharing
4. **Provider profile required:** Must create profile before publishing listings
5. **IMPORTED PRIVILEGES:** Grants access to all objects in imported database
6. **Free vs Paid:** Free = no payment, Paid = Snowflake handles billing
7. **Limited trial:** Provider controls who gets full access after trial
8. **Auto-fulfillment:** Enables cross-region sharing, provider pays for replication
9. **Organizational listings:** Internal only, no pricing
10. **V2 listings:** Required for pricing plans and offers

### 11.7 Common Misconceptions

| Misconception | Reality |
|---------------|---------|
| "Data is copied to consumer" | No copy - consumers query provider's data |
| "Consumers pay for storage" | Consumers only pay for compute (warehouses) |
| "Anyone can create listings" | Requires provider profile and appropriate privileges |
| "Shared data can be modified" | All shared data is read-only |
| "Listings work across regions by default" | Cross-region requires auto-fulfillment |

---

## References

- [Snowflake Documentation: About Listings](https://docs.snowflake.com/en/user-guide/data-marketplace)
- [Snowflake Documentation: About Snowflake Marketplace](https://docs.snowflake.com/en/collaboration/collaboration-marketplace-about)
- [Snowflake Documentation: Use Listings as a Provider](https://docs.snowflake.com/en/collaboration/provider-becoming)
- [Snowflake Documentation: Use Listings as a Consumer](https://docs.snowflake.com/en/collaboration/consumer-becoming)
- [Snowflake Documentation: Pricing Plans and Offers](https://docs.snowflake.com/en/user-guide/collaboration/listings/pricing-plans-offers/pricing-plans-and-offers)
- [Snowflake Documentation: About Organizational Listings](https://docs.snowflake.com/en/user-guide/collaboration/listings/organizational/org-listing-about)
- [Snowflake Documentation: Secure Data Sharing](https://docs.snowflake.com/en/user-guide/data-sharing-intro)
