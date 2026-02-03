# Domain 2: Account Access & Security
## Part 11: Private Connectivity (PrivateLink)

**Exam Weight:** This topic is part of Domain 2 (20-25% of exam)

---

## Overview

Private connectivity allows organizations to establish secure, private network connections between their cloud infrastructure and Snowflake without traversing the public internet. This is a **Business Critical Edition (or higher)** feature that enhances security posture by using cloud-native private link technologies.

---

## Section 1: Private Connectivity Fundamentals

### What is Private Connectivity?

Private connectivity enables secure network connections between customer cloud environments and Snowflake using cloud-provider private networking services. Instead of traffic flowing over the public internet, data travels through dedicated private network paths within the cloud provider's backbone infrastructure.

### Types of Private Connectivity

| Direction | Description | Use Cases |
|-----------|-------------|-----------|
| **Inbound** | Customer to Snowflake service | Snowsight access, client connections, internal stages |
| **Outbound** | Snowflake to external services | External functions, external stages, Iceberg tables |

### Cloud Provider Technologies

| Cloud Provider | Technology Name | Key Component |
|----------------|-----------------|---------------|
| **AWS** | AWS PrivateLink | VPC Endpoint (VPCE) |
| **Azure** | Azure Private Link | Private Endpoint |
| **Google Cloud** | Private Service Connect (PSC) | PSC Endpoint |

### Edition Requirement

**Important:** Private connectivity requires **Business Critical Edition** or higher. Standard and Enterprise editions do not support private connectivity features.

---

## Section 2: Inbound Private Connectivity

### Supported Features for Inbound Traffic

Private connectivity supports inbound access to:

1. **Snowflake Service** - Core query execution and management
2. **Snowsight** - Web interface access
3. **Streamlit in Snowflake** - Application access
4. **Internal Stages** - Secure data loading/unloading
5. **Snowpark Container Services** - Container workloads
6. **Snowflake Intelligence** - AI/ML features

### Benefits of Inbound Private Connectivity

- Traffic does not traverse the public internet
- Enhanced security compliance (HIPAA, PCI-DSS, etc.)
- Reduced network attack surface
- No need to expose Snowflake endpoints publicly
- Consistent security monitoring and auditing

---

## Section 3: AWS PrivateLink Configuration

### AWS PrivateLink Overview

AWS PrivateLink creates VPC interface endpoints that connect your AWS VPC to the Snowflake VPC without using public IPs or an internet gateway.

### Configuration Steps (High-Level)

1. **Enable PrivateLink in Snowflake**
   ```sql
   -- Generate federation token using AWS CLI first
   -- aws sts get-federation-token --name snowflake --policy '...'

   -- Then authorize PrivateLink in Snowflake
   SELECT SYSTEM$AUTHORIZE_PRIVATELINK('<aws_id>', '<federated_token>');
   ```

2. **Verify Authorization**
   ```sql
   SELECT SYSTEM$GET_PRIVATELINK();
   -- Returns: "Account is authorized for PrivateLink."
   ```

3. **Get Configuration Details**
   ```sql
   SELECT SYSTEM$GET_PRIVATELINK_CONFIG();
   -- Returns JSON with privatelink-vpce-id and other config values
   ```

4. **Create VPC Endpoint in AWS**
   - Use the `privatelink-vpce-id` value
   - Configure in same or different AWS region (cross-region supported)

5. **Configure DNS (CNAME Records)**
   - Map Snowflake URLs to VPC endpoint DNS names

### Key AWS PrivateLink Values from SYSTEM$GET_PRIVATELINK_CONFIG

| Key | Purpose |
|-----|---------|
| `privatelink-vpce-id` | VPC endpoint service ID for endpoint creation |
| `privatelink-account-url` | Account URL with privatelink segment |
| `privatelink-ocsp-url` | OCSP certificate validation URL |
| `snowsight-privatelink-url` | Snowsight access URL |
| `regionless-snowsight-privatelink-url` | Regionless Snowsight URL |

### Port Requirements

| Port | Purpose |
|------|---------|
| **443** | HTTPS traffic (queries, Snowsight) |
| **80** | OCSP cache server |

### Hostname Format

Privatelink URLs include a `.privatelink.` segment:
- US West: `xy12345.us-west-2.privatelink.snowflakecomputing.com`
- EU Frankfurt: `xy12345.eu-central-1.privatelink.snowflakecomputing.com`

---

## Section 4: Azure Private Link Configuration

### Azure Private Link Overview

Azure Private Link connects your Azure VNet to Snowflake's VNet through private endpoints, keeping traffic on the Microsoft backbone network.

### Configuration Steps (High-Level)

1. **Create Private Endpoint in Azure**
   - Navigate to Private Link Center in Azure Portal
   - Create private endpoint with Snowflake's `privatelink-pls-id`

2. **Get Configuration from Snowflake**
   ```sql
   SELECT SYSTEM$GET_PRIVATELINK_CONFIG();
   -- Get privatelink-pls-id for endpoint creation
   ```

3. **Authorize Private Endpoint**
   ```sql
   -- Get private endpoint resource ID from Azure
   SELECT SYSTEM$AUTHORIZE_PRIVATELINK('<private_endpoint_resource_id>');
   ```

4. **Configure DNS**
   - Update DNS to resolve privatelink URLs to private endpoint IP

### Key Differences from AWS

| Aspect | AWS | Azure |
|--------|-----|-------|
| **Endpoint Creation** | Use VPCE ID | Use PLS (Private Link Service) ID |
| **Authorization** | Federated token | Private endpoint resource ID |
| **DNS Format** | `.privatelink.snowflakecomputing.com` | `.privatelink.snowflakecomputing.com` |

### Azure-Specific Considerations

- Each Snowflake account has a dedicated storage account for internal stages
- Register Azure subscription with Storage resource provider before connecting to internal stages
- Managed private endpoints from Azure Data Factory require special configuration

---

## Section 5: Google Cloud Private Service Connect

### PSC Overview

Google Cloud Private Service Connect (PSC) provides private connectivity from your Google Cloud VPC to Snowflake using service attachments and forwarding rules.

### Configuration Steps (High-Level)

1. **Get Google Cloud Project ID**
   ```bash
   gcloud config get-value project
   ```

2. **Authorize PSC in Snowflake**
   ```sql
   SELECT SYSTEM$AUTHORIZE_PRIVATELINK('<gcp_project_id>', '<access_token>');
   ```

3. **Verify Authorization**
   ```sql
   SELECT SYSTEM$GET_PRIVATELINK();
   -- Returns: "Account is authorized for PrivateLink"
   ```

4. **Create PSC Endpoint**
   - Create IP address reservation
   - Create forwarding rule pointing to Snowflake's service attachment

5. **Configure DNS**
   - Create private DNS zone
   - Add A record for Snowflake URLs

### PSC Architecture Components

| Component | Purpose |
|-----------|---------|
| **Service Attachment** | Snowflake's published service |
| **Forwarding Rule** | Routes traffic to service attachment |
| **IP Address** | Static internal IP for the endpoint |
| **Private DNS Zone** | Resolves Snowflake URLs to private IP |

### PSC Limitations

- Endpoints are regional resources
- Maximum 10 VPC networks can be allowlisted per account
- Cross-region support requires additional configuration

---

## Section 6: Private Connectivity to Internal Stages

### Overview

Internal stages (user stages, table stages, named stages) can be accessed through private connectivity to ensure data loading and unloading operations do not traverse the public internet.

### AWS: VPC Interface Endpoints for S3

**Requirement:** ENABLE_INTERNAL_STAGES_PRIVATELINK parameter must be set

```sql
USE ROLE ACCOUNTADMIN;
ALTER ACCOUNT SET ENABLE_INTERNAL_STAGES_PRIVATELINK = true;
```

**Benefits:**
- No proxy farm required
- Traffic stays on AWS internal network
- Works with AWS PrivateLink for Amazon S3

**URL Format:**
- Public: `<bucket_name>.s3.<region>.amazonaws.com/prefix`
- Private: `<bucket_name>.<vpceID>.s3.<region>.vpce.amazonaws.com/prefix`

### Azure: Private Endpoints for Blob Storage

**Key Point:** Each Snowflake account has a dedicated Azure storage account

```sql
-- Enable internal stages private connectivity
ALTER ACCOUNT SET ENABLE_INTERNAL_STAGES_PRIVATELINK = true;

-- Get internal stage configuration
SELECT SYSTEM$GET_PRIVATELINK_CONFIG();
-- Look for privatelink_internal_stage key

-- Authorize the private endpoint
SELECT SYSTEM$AUTHORIZE_STAGE_PRIVATELINK_ACCESS('<privateEndpointResourceID>');
```

**URL Format:**
- Public: `<storage_account>.blob.core.windows.net`
- Private: `<storage_account>.privatelink.blob.core.windows.net`

### Google Cloud: PSC Endpoints for GCS

```sql
-- Enable internal stages private connectivity
ALTER ACCOUNT SET ENABLE_INTERNAL_STAGES_PRIVATELINK = true;

-- Authorize VPC network access
SELECT SYSTEM$AUTHORIZE_STAGE_PRIVATELINK_ACCESS('<google_cloud_vpc_network_name>');
```

**Limitation:** Maximum 10 VPC networks can be allowlisted per account

### Block Public Access to Internal Stages

After configuring private connectivity, block public access:

```sql
-- Block public access
SELECT SYSTEM$BLOCK_INTERNAL_STAGES_PUBLIC_ACCESS();

-- Check status
SELECT SYSTEM$INTERNAL_STAGES_PUBLIC_ACCESS_STATUS();
-- Returns: "Public Access to internal stages is blocked"

-- Unblock if needed
SELECT SYSTEM$UNBLOCK_INTERNAL_STAGES_PUBLIC_ACCESS();
```

---

## Section 7: Outbound Private Connectivity

### Overview

Outbound private connectivity allows Snowflake to access external cloud services through private network paths instead of the public internet.

### Supported Features

| Feature | Description |
|---------|-------------|
| **External Functions** | API Gateway/Function access |
| **External Stages** | S3, Blob Storage, GCS access |
| **External Tables** | Query external data sources |
| **Iceberg Tables** | External volumes and catalog integrations |
| **Snowpipe Automation** | Event-driven data loading |

### Cost Considerations

Outbound private connectivity incurs costs for:
- **OUTBOUND_PRIVATELINK_ENDPOINT** - Per endpoint charge
- **OUTBOUND_PRIVATELINK_DATA_PROCESSED** - Data transfer charge

### Scaling Limitations

| Limitation | Detail |
|------------|--------|
| **Max Endpoints** | 5 per Snowflake account |
| **AWS Services** | One endpoint per service type |
| **Azure Subresources** | One endpoint per subresource |
| **Deprovisioned Endpoints** | Count toward limit for 7 days |

---

## Section 8: Enforcing PrivateLink-Only Access

### Disable Public Access

After configuring private connectivity, you can enforce privatelink-only access:

```sql
-- Disable public access (requires prior privatelink login)
SELECT SYSTEM$ENFORCE_PRIVATELINK_ACCESS_ONLY();

-- Restore public access if needed
SELECT SYSTEM$DISABLE_PRIVATELINK_ACCESS_ONLY();
```

### What This Affects

| Affected | Not Affected |
|----------|--------------|
| Snowflake service endpoints | Internal stage buckets |
| Snowsight access | Existing active connections |
| Client connections | |

### Security Behavior

When public access is disabled:
- Public URL requests return `HTTP - 404 account not found`
- No indication that the account exists
- All access must come through private endpoints

### Granular Network Access

Use network rules to restrict access to specific private endpoint IDs:

```sql
-- Create network rule for specific private endpoint
CREATE NETWORK RULE private_only_rule
  MODE = INGRESS
  TYPE = PRIVATE_HOST_PORT
  VALUE_LIST = ('vpce-0abc123...');
```

---

## Section 9: Pinning Private Endpoints

### What is Endpoint Pinning?

Endpoint pinning registers and maps specific private endpoints to your Snowflake account, ensuring that traffic from pinned endpoints only reaches the intended account.

### How Pinning Works

| Scenario | Result |
|----------|--------|
| PE1 pinned to A1, request targets A1 | ALLOW |
| PE1 pinned to A1, request targets A2 | DENY |
| PE2 pinned to A2, request targets A1 | DENY |

### Register a Private Endpoint

```sql
-- AWS example
SELECT SYSTEM$REGISTER_PRIVATELINK_ENDPOINT(
  '<vpce_id>',
  '<aws_account_id>',
  '<federated_token_json>',
  <delay_time_minutes>  -- Optional, default 60, max 1440
);

-- Azure example
SELECT SYSTEM$REGISTER_PRIVATELINK_ENDPOINT(
  '<private_endpoint_resource_id>',
  '<access_token>',
  <delay_time_minutes>
);
```

### Delay Time Argument

- **Purpose:** Prevents accidental lockout when registering endpoints across multiple accounts
- **Default:** 60 minutes
- **Maximum:** 1440 minutes (24 hours)
- **Behavior:** Enforcement begins after delay from FIRST registration

### Important Considerations

1. Use different token for pinning than authorization (SYSTEM$AUTHORIZE_PRIVATELINK)
2. Limit token scope to the specific private endpoint
3. Use regionless Snowsight URL when configuring Snowsight access

---

## Section 10: System Functions Reference

### Authorization Functions

| Function | Purpose |
|----------|---------|
| `SYSTEM$AUTHORIZE_PRIVATELINK` | Enable private connectivity for account |
| `SYSTEM$REVOKE_PRIVATELINK` | Disable private connectivity |
| `SYSTEM$GET_PRIVATELINK` | Check authorization status |
| `SYSTEM$GET_PRIVATELINK_CONFIG` | Get configuration values (VPCE ID, URLs) |

### Internal Stage Functions

| Function | Purpose |
|----------|---------|
| `SYSTEM$AUTHORIZE_STAGE_PRIVATELINK_ACCESS` | Authorize stage private endpoint |
| `SYSTEM$REVOKE_STAGE_PRIVATELINK_ACCESS` | Revoke stage private endpoint access |
| `SYSTEM$BLOCK_INTERNAL_STAGES_PUBLIC_ACCESS` | Block public access to internal stages |
| `SYSTEM$UNBLOCK_INTERNAL_STAGES_PUBLIC_ACCESS` | Allow public access to internal stages |
| `SYSTEM$INTERNAL_STAGES_PUBLIC_ACCESS_STATUS` | Check public access status |

### Endpoint Pinning Functions

| Function | Purpose |
|----------|---------|
| `SYSTEM$REGISTER_PRIVATELINK_ENDPOINT` | Pin endpoint to account |
| `SYSTEM$ALLOWLIST_PRIVATELINK` | Get allowlist for SnowCD connectivity testing |

### Public Access Control Functions

| Function | Purpose |
|----------|---------|
| `SYSTEM$ENFORCE_PRIVATELINK_ACCESS_ONLY` | Disable public access to Snowflake |
| `SYSTEM$DISABLE_PRIVATELINK_ACCESS_ONLY` | Re-enable public access |

---

## Section 11: SSO and Client Redirect with Private Connectivity

### SSO Integration

Private connectivity supports SSO (SAML, OAuth) with special considerations:
- IdP must be able to reach Snowflake's private endpoint
- Configure IdP to use privatelink URLs
- May require IdP network configuration updates

### Client Redirect

Client Redirect works with private connectivity for:
- Connection failover scenarios
- Account migration
- Disaster recovery

Ensure redirect targets use appropriate privatelink URLs.

---

## Section 12: Exam Tips and Common Question Patterns

### Key Concepts to Remember

1. **Edition Requirement**
   - Private connectivity requires **Business Critical** or higher
   - Not available on Standard or Enterprise editions

2. **URL Format**
   - Private URLs always contain `.privatelink.` in the hostname
   - Example: `account.region.privatelink.snowflakecomputing.com`

3. **Port Requirements**
   - Port 443: Main HTTPS traffic
   - Port 80: OCSP certificate validation

4. **DNS Configuration**
   - Required for all cloud providers
   - CNAME records map Snowflake URLs to private endpoints

5. **ENABLE_INTERNAL_STAGES_PRIVATELINK**
   - Account parameter required for internal stage private connectivity
   - Must be TRUE before configuring stage access

### Common Exam Question Topics

| Topic | What to Know |
|-------|--------------|
| **Cloud Provider Names** | AWS PrivateLink, Azure Private Link, Google Cloud PSC |
| **System Functions** | Know the purpose of each SYSTEM$ function |
| **Edition Requirements** | Business Critical or higher |
| **Two Traffic Directions** | Inbound (client to Snowflake) vs Outbound (Snowflake to external) |
| **Internal Stages** | Separate configuration from main service |

### Potential Exam Questions

1. **Q: Which Snowflake edition is required for AWS PrivateLink?**
   - A: Business Critical (or higher)

2. **Q: What system function verifies PrivateLink authorization?**
   - A: SYSTEM$GET_PRIVATELINK

3. **Q: Which parameter enables private connectivity to internal stages?**
   - A: ENABLE_INTERNAL_STAGES_PRIVATELINK

4. **Q: What does the privatelink URL format include?**
   - A: `.privatelink.` segment (e.g., `.privatelink.snowflakecomputing.com`)

5. **Q: What ports must be open for AWS PrivateLink?**
   - A: 443 (HTTPS) and 80 (OCSP)

6. **Q: What happens when public access is disabled and someone uses a public URL?**
   - A: HTTP 404 "account not found" response

7. **Q: What is the maximum delay time for endpoint pinning?**
   - A: 1440 minutes (24 hours)

8. **Q: Which function blocks public access to internal stages?**
   - A: SYSTEM$BLOCK_INTERNAL_STAGES_PUBLIC_ACCESS

### Study Checklist

- [ ] Understand the difference between inbound and outbound private connectivity
- [ ] Know the cloud provider technology names (PrivateLink, Private Link, PSC)
- [ ] Memorize key system functions and their purposes
- [ ] Understand the URL format with `.privatelink.` segment
- [ ] Know the edition requirement (Business Critical)
- [ ] Understand endpoint pinning purpose and delay time behavior
- [ ] Know how to block public access (to service and to internal stages separately)

---

## Section 13: Quick Reference Card

### Configuration Flow

```
1. Authorize PrivateLink     --> SYSTEM$AUTHORIZE_PRIVATELINK
2. Get Configuration         --> SYSTEM$GET_PRIVATELINK_CONFIG
3. Create Endpoint in Cloud  --> AWS/Azure/GCP Console
4. Configure DNS             --> CNAME records
5. Test Connection           --> SnowCD
6. Block Public Access       --> SYSTEM$ENFORCE_PRIVATELINK_ACCESS_ONLY
```

### Cloud Provider Comparison

| Aspect | AWS | Azure | Google Cloud |
|--------|-----|-------|--------------|
| Technology | PrivateLink | Private Link | PSC |
| Endpoint Type | VPC Endpoint | Private Endpoint | PSC Endpoint |
| Key ID | privatelink-vpce-id | privatelink-pls-id | Service Attachment |
| Authorization Input | Federated Token | Resource ID | Access Token + Project ID |

### Critical Parameters

| Parameter | Purpose | Default |
|-----------|---------|---------|
| `ENABLE_INTERNAL_STAGES_PRIVATELINK` | Enable stage private access | FALSE |

### Essential URLs

| URL Type | Contains |
|----------|----------|
| Account URL | `.privatelink.snowflakecomputing.com` |
| OCSP URL | `ocsp.*.privatelink.snowflakecomputing.com` |
| Snowsight URL | `app-<region>.privatelink.snowflakecomputing.com` |

---

*Last Updated: January 2026*
*Source: Snowflake Official Documentation*
