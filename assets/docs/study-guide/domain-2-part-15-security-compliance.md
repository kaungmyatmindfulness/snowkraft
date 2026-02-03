# Domain 2: Account Access and Security - Part 15

## Security Certifications and Compliance

### Introduction

Snowflake is committed to meeting industry-standard regulatory compliance requirements to provide customers the highest levels of assurance for data integrity, security, and governance. Understanding these certifications is essential for the SnowPro Core exam, particularly when advising on edition selection and compliance requirements.

---

## Key Concepts

### What is Compliance in Cloud Computing?

Compliance refers to adherence to laws, regulations, standards, and contractual obligations that govern how data is stored, processed, and protected. For cloud data platforms like Snowflake, compliance ensures:

- **Data Protection**: Sensitive information is adequately secured
- **Regulatory Adherence**: Industry and government regulations are met
- **Audit Readiness**: Organizations can demonstrate compliance to auditors
- **Trust**: Customers can confidently store sensitive data

### Snowflake's Compliance Approach

Snowflake maintains certifications and attestations across multiple frameworks to support various customer requirements:

1. **Global certifications** - Available to all Snowflake accounts
2. **Industry-specific certifications** - Healthcare, financial services, etc.
3. **Government certifications** - FedRAMP, ITAR, CJIS, etc.
4. **Regional certifications** - Country-specific requirements

---

## Compliance Certifications Reference Table

### Global Certifications (All Editions)

| Certification | Full Name | Description | Governing Body |
|--------------|-----------|-------------|----------------|
| **SOC 1 Type II** | System and Organization Controls 1 | Attestation of internal controls over financial reporting | AICPA |
| **SOC 2 Type II** | System and Organization Controls 2 | Attestation of security, availability, and confidentiality controls based on Trust Service Principles | AICPA |
| **ISO 27001** | ISO/IEC 27001:2013 | Information Security Management System (ISMS) requirements | ISO |
| **ISO 27017** | ISO/IEC 27017:2015 | Cloud-specific security controls | ISO |
| **ISO 27018** | ISO/IEC 27018:2019 | Protection of personally identifiable information (PII) in public clouds | ISO |
| **ISO 9001:2015** | ISO 9001:2015 | Quality Management System requirements | ISO |
| **CSA STAR Level 1** | Cloud Security Alliance STAR | Self-assessment documenting compliance with CSA best practices | CSA |

### U.S. Government Certifications

| Certification | Full Name | Description | Required Edition |
|--------------|-----------|-------------|------------------|
| **FedRAMP** | Federal Risk and Authorization Management Program | Cloud services authorization for federal government (Moderate and High) | Business Critical+ (SnowGov regions) |
| **ITAR** | International Traffic in Arms Regulations | Export control for military and defense articles | Business Critical+ (SnowGov regions) |
| **CJIS** | Criminal Justice Information Services | Protection of Criminal Justice Information (CJI) | Business Critical+ (SnowGov regions) |
| **NIST SP 800-171** | NIST Special Publication 800-171 | Protection of Controlled Unclassified Information (CUI) | Business Critical+ (SnowGov regions) |
| **DoD IL5** | Department of Defense Impact Level 5 | DoD cloud computing for controlled unclassified information | Business Critical+ (SnowGov regions) |
| **GovRAMP** | Government Risk and Authorization Management Program | State and local government cloud authorization | Business Critical+ (SnowGov regions) |
| **IRS Pub 1075** | IRS Publication 1075 | Safeguarding Federal Tax Information | Business Critical+ (SnowGov regions) |
| **TX-RAMP** | Texas Risk and Authorization Management Program | Texas state agency cloud services | Business Critical+ (SnowGov regions) |

### Industry-Specific Certifications

| Certification | Industry | Description | Required Edition |
|--------------|----------|-------------|------------------|
| **HITRUST CSF** | Healthcare | Unified security framework based on HIPAA, HITECH, and other standards | Business Critical |
| **PCI DSS** | Financial | Payment Card Industry Data Security Standards for cardholder data | Standard+ |

### Regional Certifications

| Certification | Region | Description | Required Edition |
|--------------|--------|-------------|------------------|
| **C5** | Germany | Cloud Computing Compliance Controls Catalog (BSI) | Standard+ |
| **TISAX AL3** | Germany | Trusted Information Security Assessment Exchange (Automotive) | Business Critical |
| **IRAP** | Australia | Information Security Registered Assessors Program (Protected level) | Business Critical |
| **CE+** | United Kingdom | Cyber Essentials Plus | Standard+ |
| **K-FSI with RSEFT** | Korea | Korean Financial Security Institute compliance | Business Critical |

---

## Detailed Certification Explanations

### SOC 1 Type II

**Purpose**: Evaluates controls relevant to financial reporting

**Key Points**:
- Independent auditor attestation of design and operating effectiveness
- Covers internal controls over financial reporting
- Framework created by AICPA (American Institute of Certified Public Accountants)
- Reports available through Snowflake Compliance Center (trust.snowflake.com)
- Performed on annual basis

**Exam Relevance**: Know that SOC 1 focuses on financial reporting controls, not security controls.

### SOC 2 Type II

**Purpose**: Evaluates security, availability, and confidentiality controls

**Key Points**:
- Based on AICPA Trust Service Principles
- Covers security, availability, and confidentiality
- Independent attestation of operating effectiveness over a coverage period
- Most commonly requested compliance report by enterprise customers
- Available for all Snowflake editions

**Trust Service Criteria**:
1. Security
2. Availability
3. Processing Integrity
4. Confidentiality
5. Privacy

**Exam Relevance**: SOC 2 is the most commonly referenced compliance framework for cloud services. Remember the five Trust Service Criteria.

### ISO 27001

**Purpose**: Information Security Management System (ISMS)

**Key Points**:
- International standard for establishing, implementing, and maintaining ISMS
- Snowflake's certificate available from Snowflake Compliance Center
- Statement of Applicability includes ISO 27017 and ISO 27018 controls
- Requires assessment and treatment of information security risks
- Continuous improvement process

**Exam Relevance**: ISO 27001 is the foundational information security standard that other ISO standards build upon.

### ISO 27017 and ISO 27018

**ISO 27017**: Cloud-specific security controls extending ISO 27001
**ISO 27018**: Protection of PII in public cloud environments

**Key Points**:
- Both are included in Snowflake's ISO compliance scope
- 27017 addresses cloud provider and customer responsibilities
- 27018 focuses on privacy controls for cloud processors
- Both build on the ISO 27001 foundation

### PCI DSS

**Purpose**: Protect cardholder data for payment card processing

**Key Points**:
- Snowflake is a Level 1 Service Provider (highest level)
- Compliant under PCI DSS version 3.2.1
- Third-party assessment by QSA (Qualified Security Assessor) annually
- AoC (Attestation of Compliance) available upon request
- Customers can store, process, or transmit cardholder data
- **Shared Responsibility**: Customers have PCI compliance responsibilities outside of Snowflake's scope

**Exam Relevance**: Know that PCI DSS uses a shared responsibility model - Snowflake provides the compliant platform, but customers must implement their own controls.

### FedRAMP

**Purpose**: Standardized approach for federal agencies to use cloud services

**Key Points**:
- Snowflake supports both Moderate and High impact levels
- Requires SnowGov regions (U.S. government regions)
- Listed in the FedRAMP Marketplace
- Enables government agencies to leverage cloud while meeting security requirements
- Cross-region disclaimers required for Marketplace access from government regions

**Exam Relevance**: FedRAMP is required for U.S. federal government workloads and requires specific SnowGov regions.

### ITAR (International Traffic in Arms Regulations)

**Purpose**: Control export of military and defense articles, services, and technologies

**Key Points**:
- **Requires Business Critical Edition or higher**
- Only available in SnowGov regions
- Controlled by U.S. State Department
- Applies to companies on United States Munitions List (USML)
- Snowflake limits region access to vetted employees eligible for ITAR
- **Cannot store classified information** (confidential, secret, top secret)
- Each government region belongs to its own region group (isolation)
- Replication limited to region group boundaries by default

**Important Considerations**:
- Be cautious of export-controlled data in metadata fields
- Cross-region features require contacting Snowflake Support
- Data sharing only within same government region by default

**Exam Relevance**: ITAR requires Business Critical and SnowGov regions. Know the restrictions on cross-region operations.

### CJIS (Criminal Justice Information Services)

**Purpose**: Protect Criminal Justice Information (CJI)

**Key Points**:
- Supported in U.S. regions supporting public sector workloads
- FBI's unified set of standards for CJI protection
- Snowflake collaborates with customers to satisfy requirements
- Requires SnowGov regions

### HITRUST CSF

**Purpose**: Unified healthcare security framework

**Key Points**:
- Health Information Trust Alliance Common Security Framework
- Combines HIPAA, HITECH, and industry-standard compliance frameworks
- Specifically built for healthcare needs
- Snowflake participates in HITRUST Shared Responsibility and Inheritance Program
- Customers can inherit Snowflake's certification by applying required controls
- Custom Shared Responsibility Matrix available from HITRUST website

**Exam Relevance**: HITRUST is the healthcare compliance framework that unifies multiple standards including HIPAA.

### CSA STAR Level 1

**Purpose**: Cloud Security Alliance security self-assessment

**Key Points**:
- Voluntary self-assessment program
- Documents compliance with CSA-published best practices
- Completed CAIQ (Consensus Assessments Initiative Questionnaire)
- Available on Cloud Security Alliance website
- Not a third-party certification, but demonstrates commitment to cloud security

### C5 (Cloud Computing Compliance Controls Catalog)

**Purpose**: German government cloud security baseline

**Key Points**:
- Audited standard for mandatory cloud security baselines
- Created by German Federal Office for Information Security (BSI)
- Based on ISO 27001, CSA, and BSI's IT-Grundschutz catalogs
- Two levels: Basic and Basic + Additional Criteria
- Snowflake's scope includes Basic requirements
- Used by German government agencies and private sector

### NIST SP 800-171

**Purpose**: Protect Controlled Unclassified Information (CUI)

**Key Points**:
- National Institute of Standards and Technology special publication
- Security requirements for CUI in nonfederal systems
- Applicable to defense contractors and others handling CUI
- Requires SnowGov regions

---

## Edition Requirements for Compliance

### Standard Edition
All editions include:
- SOC 1 and SOC 2 Type II
- ISO 27001, 27017, 27018
- ISO 9001:2015
- CSA STAR Level 1
- PCI DSS
- Basic encryption and security features

### Enterprise Edition
Everything in Standard, plus:
- Extended Time Travel (up to 90 days)
- Periodic rekeying of encrypted data
- Column-level and row-level security
- Additional governance features

### Business Critical Edition
Everything in Enterprise, plus:
- HIPAA/HITRUST support (requires BAA)
- Tri-Secret Secure (customer-managed keys)
- Private connectivity support (PrivateLink, Private Service Connect)
- Account failover/failback for disaster recovery
- Enhanced security and data protection
- Required for PHI data

### Business Critical in SnowGov Regions
Everything in Business Critical, plus:
- FedRAMP (Moderate and High)
- ITAR support
- CJIS support
- DoD IL5
- NIST SP 800-171
- IRS Publication 1075
- GovRAMP/StateRAMP/TX-RAMP

### Virtual Private Snowflake (VPS)
Everything in Business Critical, plus:
- Completely isolated Snowflake environment
- No shared hardware with other accounts
- Highest level of security for most sensitive data

---

## Compliance Resources

### Snowflake Compliance Center
- URL: https://trust.snowflake.com
- Access compliance reports and certifications
- Request SOC reports and AoC documents
- Download ISO certificates

### Key Resources by Certification
| Certification | Resource Location |
|--------------|-------------------|
| SOC 1/2 Reports | Snowflake Compliance Center (request) |
| ISO Certificates | Snowflake Compliance Center (download) |
| PCI DSS AoC | Available upon request |
| FedRAMP | FedRAMP Marketplace |
| HITRUST SRM | HITRUST Alliance website |
| CSA CAIQ | Cloud Security Alliance website |

---

## Exam Tips and Common Question Patterns

### High-Priority Topics

1. **SOC 2 vs SOC 1**: SOC 1 focuses on financial reporting controls; SOC 2 focuses on security, availability, and confidentiality

2. **Edition Requirements**: Know which compliance frameworks require specific editions:
   - Business Critical for HIPAA/HITRUST (with BAA)
   - Business Critical in SnowGov for FedRAMP, ITAR, CJIS

3. **HIPAA Requirements**: Business Critical + signed BAA (Business Associate Agreement) before storing PHI

4. **ITAR Restrictions**:
   - Cannot store classified information
   - Region isolation (own region group)
   - Cross-region features require Snowflake Support

5. **Shared Responsibility**: Both PCI DSS and HITRUST use shared responsibility models

### Common Question Patterns

**Pattern 1: Edition Selection for Compliance**
> "A healthcare company needs to store PHI data. What is required?"
>
> Answer: Business Critical Edition + signed BAA

**Pattern 2: Government Compliance Requirements**
> "A defense contractor needs ITAR compliance. What must they use?"
>
> Answer: Business Critical Edition in a SnowGov region

**Pattern 3: Certification Identification**
> "Which certification evaluates security, availability, and confidentiality based on Trust Service Principles?"
>
> Answer: SOC 2 Type II

**Pattern 4: Global vs Regional Certifications**
> "Which certifications are available to all Snowflake accounts globally?"
>
> Answer: SOC 1, SOC 2, ISO 27001/27017/27018, CSA STAR Level 1

**Pattern 5: Cross-Region Limitations**
> "Can an ITAR account replicate data to a commercial region by default?"
>
> Answer: No, each government region belongs to its own region group. Contact Snowflake Support to enable cross-region features.

### Memory Aids

**SOC Reports**:
- SOC 1 = "1" for Financial (think: balance sheet, one bottom line)
- SOC 2 = "2" for Two more: Security + Availability + Confidentiality

**ISO Standards**:
- 27001 = Base ISMS (the "foundation")
- 27017 = Cloud-specific ("17" sounds like "cloud")
- 27018 = Privacy/PII ("18" - PI contains 1 and 8)

**Edition Requirements**:
- "BC" (Business Critical) = "Be Careful" with sensitive data (HIPAA, ITAR)
- "Standard" = Standard certifications (SOC, ISO, PCI)

**ITAR Key Points**: "ITAR = Isolation + Traffic Arms Regulations"
- Isolated region groups
- Traffic (data) restrictions
- Arms/defense related

---

## Practice Questions

1. **Which SOC report evaluates controls relevant to a service organization's system that affects user entities' internal control over financial reporting?**
   - A) SOC 2 Type I
   - B) SOC 2 Type II
   - C) SOC 1 Type II
   - D) SOC 3

<details>
<summary>Show Answer</summary>

C - SOC 1 Type II focuses on financial reporting controls
</details>

2. **A company needs to store cardholder data in Snowflake. Which certification ensures Snowflake meets payment card industry requirements?**
   - A) HITRUST CSF
   - B) SOC 2 Type II
   - C) PCI DSS
   - D) ISO 27001

<details>
<summary>Show Answer</summary>

C - PCI DSS is the Payment Card Industry standard
</details>

3. **What is required before storing PHI data in Snowflake?**
   - A) Standard Edition and HIPAA certification
   - B) Enterprise Edition and SOC 2 report
   - C) Business Critical Edition and signed BAA
   - D) VPS and signed NDA

<details>
<summary>Show Answer</summary>

C - HIPAA requires Business Critical and a Business Associate Agreement
</details>

4. **Which compliance framework is specifically designed for U.S. federal government cloud adoption?**
   - A) StateRAMP
   - B) HITRUST CSF
   - C) FedRAMP
   - D) SOC 2

<details>
<summary>Show Answer</summary>

C - FedRAMP is the Federal Risk and Authorization Management Program
</details>

5. **An organization subject to ITAR wants to replicate data to a commercial region. What must they do?**
   - A) Enable cross-region replication in account settings
   - B) Contact Snowflake Support to connect different region groups
   - C) Upgrade to VPS edition
   - D) This is not possible under any circumstances

<details>
<summary>Show Answer</summary>

B - ITAR accounts must contact Snowflake Support for cross-region features
</details>

---

## Summary

Understanding Snowflake's compliance certifications is crucial for:
- Selecting the appropriate edition for customer requirements
- Advising on regulatory compliance needs
- Understanding shared responsibility models
- Knowing geographic and industry-specific requirements

**Key Takeaways**:
1. SOC 2 is the most commonly requested compliance report for general security assurance
2. Business Critical Edition is required for HIPAA/HITRUST and government compliance (in SnowGov regions)
3. A signed BAA is required before storing PHI
4. ITAR requires region isolation with limited cross-region capabilities
5. Compliance is often a shared responsibility between Snowflake and customers
6. The Snowflake Compliance Center (trust.snowflake.com) is the primary resource for compliance documentation
