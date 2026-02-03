# Domain 1: Snowflake AI Data Cloud Features & Architecture

## Part 01: Snowflake Architecture Overview

This section covers the foundational architecture of Snowflake, including its unique hybrid design, the three distinct layers (storage, compute, cloud services), and how it differs from traditional data warehouse architectures. Understanding Snowflake's architecture is essential for the SnowPro Core exam as it forms the basis for comprehending all other Snowflake features and capabilities.

---

## 1. Snowflake as a Cloud Data Platform

### 1.1 What is Snowflake?

Snowflake is a **cloud-native data platform** delivered as a fully managed **Software-as-a-Service (SaaS)**. It combines a completely new SQL query engine with an innovative architecture natively designed for the cloud.

**Key Characteristics:**
- Runs entirely on cloud infrastructure (AWS, Azure, GCP)
- No hardware or software to install, configure, or manage
- Near-zero administration
- Cannot be run on-premises or on private cloud infrastructure
- Snowflake manages all software updates and infrastructure maintenance

**What "Self-Managed Service" Means:**
- Users don't manage physical infrastructure
- No need for hardware provisioning
- Automatic updates and patches
- Snowflake handles capacity planning and scaling

### 1.2 Supported Cloud Platforms

Snowflake accounts can be hosted on any of the following cloud platforms:

| Cloud Platform | Provider |
|----------------|----------|
| **Amazon Web Services (AWS)** | Amazon |
| **Google Cloud Platform (GCP)** | Google |
| **Microsoft Azure** | Microsoft |

**Important Points:**
- All three architectural layers run on the chosen cloud platform
- Each Snowflake account exists on ONE cloud platform
- Different accounts can be on different platforms
- Cloud platform choice is independent per account
- Cross-cloud data sharing is supported through Snowflake's data sharing features

---

## 2. Snowflake's Hybrid Architecture

### 2.1 Understanding Traditional Architectures

Before understanding Snowflake's hybrid approach, it's essential to know the two traditional database architectures:

| Architecture | Description | Characteristics |
|--------------|-------------|-----------------|
| **Shared-Disk** | Multiple compute nodes share centralized storage | Simple data management; storage is a bottleneck; limited scalability |
| **Shared-Nothing** | Each node has its own storage; data is partitioned | High performance; complex data redistribution; storage and compute coupled |

**Shared-Disk Architecture:**
- Centralized storage accessible by all compute nodes
- Pro: Simple data management (single source of truth)
- Con: Storage I/O becomes a bottleneck as compute scales

**Shared-Nothing Architecture:**
- Each compute node stores a portion of data locally
- Pro: High performance through massively parallel processing (MPP)
- Con: Data redistribution needed when scaling; storage and compute tightly coupled

### 2.2 Snowflake's Hybrid Approach

Snowflake combines the **best of both architectures**:

| Feature | Inherited From | Benefit |
|---------|----------------|---------|
| Central data repository | Shared-Disk | Data management simplicity; single source of truth |
| MPP compute clusters | Shared-Nothing | Performance and horizontal scalability |
| Independent scaling | Unique to Snowflake | Scale storage and compute independently |
| Local caching | Shared-Nothing | Fast data access through warehouse caching |

**How It Works:**
1. Data is stored centrally in cloud object storage (like shared-disk)
2. Queries are processed by independent compute clusters using MPP (like shared-nothing)
3. Each compute node caches data locally for performance
4. Storage and compute scale independently

**Key Exam Point:** Snowflake's architecture combines the **data management simplicity of shared-disk** with the **performance and scale-out benefits of shared-nothing** architectures.

---

## 3. The Three-Layer Architecture

Snowflake's architecture consists of three distinct, independently scalable layers:

```
+------------------------------------------+
|         Cloud Services Layer             |
|  (Authentication, Metadata, Optimization)|
+------------------------------------------+
                    |
+------------------------------------------+
|           Compute Layer                  |
|       (Virtual Warehouses)               |
+------------------------------------------+
                    |
+------------------------------------------+
|           Storage Layer                  |
|    (Centralized Cloud Storage)           |
+------------------------------------------+
```

### 3.1 Database Storage Layer

The storage layer handles all data persistence in Snowflake.

**Key Characteristics:**
- Data is stored in cloud object storage (S3, Azure Blob, GCS)
- Data is automatically organized into **micro-partitions**
- Data is stored in a **compressed, columnar format**
- Snowflake manages all aspects of storage (compression, file size, organization)
- Users cannot directly access the underlying storage files

**What Snowflake Manages:**
- Organization of data files
- File size optimization
- Structure and format
- Compression algorithms
- Metadata and statistics

**Data Storage Types:**

| Table Type | Description | Use Case |
|------------|-------------|----------|
| **Snowflake Tables** | Standard tables with automatic columnar storage | Data warehousing workloads |
| **Apache Iceberg Tables** | Open table format with external storage | Data lakes and lakehouses |
| **Hybrid Tables** | Optimized for low-latency transactional workloads | OLTP + OLAP (Unistore) |

**Important Exam Points:**
- Data is ALWAYS stored compressed
- Users do NOT choose compression algorithms (Snowflake auto-selects)
- Storage is completely managed and abstracted from users

### 3.2 Compute Layer (Virtual Warehouses)

The compute layer consists of **virtual warehouses** that process queries.

**What is a Virtual Warehouse?**
- A cluster of compute resources provisioned from the cloud provider
- Processes SQL queries and DML operations
- Can run Snowpark code (Python, Java, Scala)
- Each warehouse is independent and isolated from others

**Key Characteristics:**

| Feature | Description |
|---------|-------------|
| **Independence** | Each warehouse is a separate compute cluster |
| **Isolation** | Warehouses don't share resources; no performance impact between warehouses |
| **Elasticity** | Can be started, stopped, and resized at any time |
| **On-demand** | Billed only when running (per-second billing with 60-second minimum) |

**Virtual Warehouse Sizes:**

| Size | Credits/Hour (Gen1) | Notes |
|------|---------------------|-------|
| X-Small | 1 | Default for CREATE WAREHOUSE |
| Small | 2 | |
| Medium | 4 | |
| Large | 8 | |
| X-Large | 16 | Default in Snowsight |
| 2X-Large | 32 | |
| 3X-Large | 64 | |
| 4X-Large | 128 | |
| 5X-Large | 256 | |
| 6X-Large | 512 | |

**Scaling Pattern:** Each size **doubles** the compute resources (and credits) of the previous size.

**Auto-Suspend and Auto-Resume:**
- **Auto-Suspend**: Warehouse automatically suspends after a period of inactivity
- **Auto-Resume**: Warehouse automatically starts when a query is submitted
- Both are enabled by default

**Important Exam Points:**
- Warehouses do NOT affect each other's performance
- Larger warehouses are NOT always faster (depends on query complexity)
- Data loading performance depends more on file count/size than warehouse size

### 3.3 Cloud Services Layer

The cloud services layer coordinates all Snowflake activities and runs on compute instances provisioned by Snowflake.

**Services Managed in This Layer:**

| Service | Description |
|---------|-------------|
| **Authentication** | User login and identity verification |
| **Access Control** | RBAC, privileges, and security |
| **Infrastructure Management** | Resource allocation and management |
| **Metadata Management** | Schema information, table statistics, micro-partition metadata |
| **Query Parsing** | SQL parsing and validation |
| **Query Optimization** | Query plan generation and optimization |
| **Transaction Management** | ACID compliance and concurrency |

**Cloud Services Billing:**
- First 10% of daily compute credits are free for cloud services
- Only charged if cloud services usage exceeds 10% of warehouse usage
- Most customers never pay extra for cloud services

**Important Exam Points:**
- Cloud services layer is ALWAYS running (no suspension)
- Metadata queries can run without a warehouse
- Query optimization happens in this layer BEFORE warehouse executes

---

## 4. Micro-Partitions and Columnar Storage

### 4.1 What Are Micro-Partitions?

Micro-partitions are Snowflake's approach to data organization, providing advantages over traditional static partitioning.

**Key Characteristics:**

| Attribute | Value |
|-----------|-------|
| Size (uncompressed) | 50 MB to 500 MB |
| Size (compressed) | Smaller due to automatic compression |
| Structure | Columnar storage within each micro-partition |
| Management | Fully automatic (no user maintenance) |

**How Data Is Organized:**
- Rows are grouped into micro-partitions based on insertion order
- Within each micro-partition, data is stored column by column
- Each column is compressed independently using the optimal algorithm

**Metadata Stored for Each Micro-Partition:**
- Range of values for each column (min/max)
- Number of distinct values
- Additional properties for optimization

### 4.2 Benefits of Micro-Partitioning

| Benefit | Description |
|---------|-------------|
| **No Manual Maintenance** | Partitions are created and managed automatically |
| **Efficient DML** | Small partition size enables granular operations |
| **Fine-Grained Pruning** | Queries skip irrelevant micro-partitions |
| **No Data Skew** | Overlapping ranges prevent imbalanced partitions |
| **Columnar Efficiency** | Only required columns are scanned |
| **Optimal Compression** | Each column uses the best compression algorithm |

### 4.3 Query Pruning

Snowflake uses micro-partition metadata to eliminate unnecessary data scanning.

**How Pruning Works:**
1. Query filter predicates are analyzed
2. Micro-partition metadata (min/max ranges) is checked
3. Partitions that cannot contain matching data are skipped
4. Only relevant columns within remaining partitions are scanned

**Example:**
If a query filters on `WHERE date = '2024-01-15'`:
- Snowflake checks the date range in each micro-partition's metadata
- Partitions where the date range doesn't include '2024-01-15' are skipped entirely

**Pruning Efficiency Metric:**
- Ideal: Percentage of partitions scanned equals percentage of data selected
- Example: Query selecting 10% of data should scan ~10% of partitions

**Important Exam Point:** Pruning is automatic and requires no user configuration. However, data clustering affects pruning efficiency.

---

## 5. Caching Layers

Snowflake implements multiple caching layers to improve query performance.

### 5.1 Result Cache (Query Result Cache)

**Characteristics:**
- Stores the results of previously executed queries
- Managed by the Cloud Services layer
- Available across all warehouses
- Cache duration: **24 hours** (resets each time result is reused, up to 31 days max)

**When Result Cache Is Used:**
- Same exact query text (case-sensitive, including whitespace)
- No changes to underlying data
- No use of non-deterministic functions (RANDOM, UUID_STRING, etc.)
- No external functions
- User has required privileges
- Configuration options haven't changed

**What Invalidates Result Cache:**
- Different query text (even just lowercase vs uppercase)
- Table data has changed
- Underlying micro-partitions changed (reclustering)
- Cache has expired

**Important Exam Points:**
- Result cache hits do NOT consume warehouse credits
- Query must match EXACTLY (including case and aliases)
- USE_CACHED_RESULT parameter can disable result caching

### 5.2 Warehouse Cache (Local Disk Cache)

**Characteristics:**
- Caches table data read from storage
- Stored on local SSD storage of warehouse nodes
- Specific to each warehouse (not shared)
- Cleared when warehouse is suspended

**Impact of Auto-Suspend on Cache:**
- Suspending a warehouse clears its local cache
- Short auto-suspend timeout = cache cleared frequently
- For repetitive queries, longer auto-suspend preserves cache

**Recommended Auto-Suspend Settings:**

| Use Case | Recommended Setting |
|----------|---------------------|
| Tasks | Immediate suspension |
| DevOps/Ad-hoc queries | ~5 minutes |
| BI/SELECT workloads | 10+ minutes |

### 5.3 Metadata Cache

**Characteristics:**
- Caches metadata about tables and micro-partitions
- Managed by Cloud Services layer
- Always available (no warehouse needed)
- Enables metadata-only queries

**Metadata-Only Operations:**
- COUNT(*) on tables (uses partition metadata)
- MIN/MAX on clustered columns
- Certain SHOW commands

---

## 6. Snowflake Editions

Snowflake offers multiple editions with increasing features and security:

| Edition | Target Users | Key Features |
|---------|-------------|--------------|
| **Standard** | Small to medium organizations | Full core functionality, Time Travel (1 day), basic security |
| **Enterprise** | Large organizations | Multi-cluster warehouses, 90-day Time Travel, materialized views, data masking |
| **Business Critical** | Highly regulated industries | Enhanced security, HIPAA/PCI compliance, failover/failback |
| **Virtual Private Snowflake (VPS)** | Most security-conscious organizations | Dedicated, isolated environment |

**Key Edition-Specific Features:**

| Feature | Standard | Enterprise | Business Critical | VPS |
|---------|----------|------------|-------------------|-----|
| Time Travel | 1 day | Up to 90 days | Up to 90 days | Up to 90 days |
| Multi-cluster Warehouses | No | Yes | Yes | Yes |
| Materialized Views | No | Yes | Yes | Yes |
| Column-level Security | No | Yes | Yes | Yes |
| Database Failover | No | No | Yes | Yes |
| Tri-Secret Secure | No | No | Yes | Yes |
| Customer-managed Keys | No | No | Yes | Yes |

**Important Exam Point:** Multi-cluster warehouses and extended Time Travel (>1 day) require Enterprise Edition or higher.

---

## 7. Key Exam Topics and Common Questions

### 7.1 Architecture Comparison Questions

**Q: How does Snowflake differ from shared-disk architecture?**
A: Snowflake uses MPP compute clusters where each node processes data in parallel, unlike traditional shared-disk where compute nodes compete for I/O bandwidth.

**Q: How does Snowflake differ from shared-nothing architecture?**
A: Snowflake separates storage from compute, allowing independent scaling. Traditional shared-nothing requires data redistribution when adding nodes.

**Q: What makes Snowflake's architecture "hybrid"?**
A: It combines centralized storage (shared-disk concept) with independent MPP compute clusters (shared-nothing concept).

### 7.2 Layer Identification Questions

**Q: Which layer handles query optimization?**
A: Cloud Services Layer

**Q: Which layer handles query execution?**
A: Compute Layer (Virtual Warehouses)

**Q: Which layer stores the actual data?**
A: Storage Layer

**Q: Where is metadata stored?**
A: Cloud Services Layer

### 7.3 Micro-Partition Questions

**Q: What is the size of a micro-partition?**
A: 50 MB to 500 MB of uncompressed data

**Q: Do users define micro-partitions?**
A: No, they are created automatically during data loading

**Q: How does Snowflake decide partition boundaries?**
A: Based on the natural ordering of data as it is inserted/loaded

### 7.4 Virtual Warehouse Questions

**Q: Do warehouses share compute resources?**
A: No, each warehouse is completely independent

**Q: What happens when a warehouse is suspended?**
A: The warehouse stops consuming credits, and its local cache is cleared

**Q: Does increasing warehouse size improve data loading speed?**
A: Not necessarily; data loading depends more on file count/size than warehouse size

### 7.5 Caching Questions

**Q: How long does the result cache last?**
A: 24 hours, extended up to 31 days with repeated use

**Q: What clears the warehouse cache?**
A: Suspending the warehouse

**Q: Do result cache hits consume credits?**
A: No, result cache is served from Cloud Services at no additional cost

---

## 8. Quick Reference Tables

### 8.1 Three Layers Summary

| Layer | Components | Key Function | Scaling |
|-------|------------|--------------|---------|
| **Storage** | Cloud object storage, micro-partitions | Data persistence | Automatic, pay for usage |
| **Compute** | Virtual warehouses | Query processing | Manual resize, auto-scale with multi-cluster |
| **Cloud Services** | Metadata, optimizer, authentication | Coordination | Automatic, managed by Snowflake |

### 8.2 Architecture Comparison

| Aspect | Shared-Disk | Shared-Nothing | Snowflake (Hybrid) |
|--------|-------------|----------------|-------------------|
| Storage | Centralized | Distributed | Centralized (cloud storage) |
| Compute | Shared | Independent | Independent warehouses |
| Scaling | Limited by I/O | Complex redistribution | Independent & elastic |
| Management | Simple | Complex | Simple |
| Performance | I/O bottleneck | High (local data) | High (caching + MPP) |

### 8.3 Warehouse Size Quick Reference

| Size | Credits/Hour | Good For |
|------|--------------|----------|
| X-Small | 1 | Small queries, development |
| Small | 2 | Light workloads |
| Medium | 4 | Standard analytics |
| Large | 8 | Complex queries |
| X-Large+ | 16+ | Heavy ETL, large scans |

---

## 9. Exam Tips

1. **Memorize the three layers** and what each one does
2. **Understand the hybrid architecture** - this is frequently tested
3. **Know micro-partition characteristics** (size, automatic management, columnar storage)
4. **Remember cache behaviors** (result cache duration, warehouse cache clearing)
5. **Know edition differences** (especially Enterprise-only features)
6. **Understand that storage and compute scale independently** - key differentiator
7. **Warehouses are isolated** - no resource sharing, no performance impact
8. **Result cache requires exact query match** - case and syntax matter
9. **Cloud services are always running** - no suspension for this layer
10. **Metadata operations may not need a warehouse** - COUNT(*), MIN/MAX on clustered columns

---

## 10. Practice Questions

**Question 1:** Which architectural layers can be scaled independently in Snowflake?
- A) Storage only
- B) Compute only
- C) Cloud Services only
- D) Storage, Compute, and Cloud Services

<details>
<summary>Show Answer</summary>

**Answer:** D - All three layers scale independently. Storage scales automatically with data volume. Compute scales by resizing warehouses or adding clusters. Cloud Services scales automatically based on demand.
</details>

**Question 2:** A query runs in 5 minutes the first time. The same query runs again with no data changes. How long will it take?
- A) 5 minutes
- B) Near-instantaneous
- C) 2.5 minutes
- D) Depends on warehouse size

<details>
<summary>Show Answer</summary>

**Answer:** B - The result cache will return the cached result almost instantly, as long as the query text matches exactly and data hasn't changed.
</details>

**Question 3:** Which Snowflake component is responsible for query optimization?
- A) Virtual Warehouse
- B) Storage Layer
- C) Cloud Services Layer
- D) Micro-partition Manager

<details>
<summary>Show Answer</summary>

**Answer:** C - Query parsing and optimization occur in the Cloud Services Layer before queries are sent to warehouses for execution.
</details>

**Question 4:** What happens to a virtual warehouse's local cache when the warehouse is suspended?
- A) The cache is preserved for 24 hours
- B) The cache is cleared immediately
- C) The cache is moved to Cloud Services
- D) The cache persists until the next query

<details>
<summary>Show Answer</summary>

**Answer:** B - When a warehouse suspends, its local cache (stored on the compute nodes' SSDs) is cleared immediately.
</details>

**Question 5:** Which of the following is NOT stored in the Cloud Services Layer?
- A) Authentication data
- B) Query results
- C) Metadata and statistics
- D) Table data files

<details>
<summary>Show Answer</summary>

**Answer:** D - Table data files are stored in the Storage Layer (cloud object storage). Cloud Services stores metadata, query results cache, authentication data, and query history.
</details>
