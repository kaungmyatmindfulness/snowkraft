# Domain 1: Snowflake AI Data Cloud Features & Architecture
## Part 14: Snowsight and User Interfaces

### Overview

Snowflake provides multiple interfaces for users to interact with the platform. Understanding these interfaces, their capabilities, and appropriate use cases is essential for the SnowPro Core certification exam.

---

## 1. Snowsight: The Snowflake Web Interface

### What is Snowsight?

Snowsight is Snowflake's modern, unified web interface that provides a comprehensive experience for working with Snowflake data using SQL or Python. It has replaced the Classic Console as the primary web interface.

**Key Characteristics:**
- Browser-based interface accessible at `https://app.snowflake.com`
- No installation required
- Supports the latest three major versions of Safari, Chrome, Edge, and Firefox
- Available via public internet or private connectivity

### Accessing Snowsight

**Public Internet Access:**
1. Navigate to `https://app.snowflake.com`
2. Provide account identifier or account URL
3. Sign in with Snowflake credentials

**Private Connectivity Access:**
- URL format: `https://app-orgname-account_name.privatelink.snowflakecomputing.com`
- Requires prior configuration of private connectivity for the Snowflake account
- Uses `SYSTEM$GET_PRIVATELINK_CONFIG` function to retrieve connection details

### Snowsight Navigation Menu

The navigation menu provides access to all major Snowsight features:

| Menu Section | Purpose |
|-------------|---------|
| **Home** | Dashboard with recent worksheets, search, and quick access |
| **Projects** | Worksheets, Dashboards, Notebooks |
| **Catalog** | Database Explorer for browsing database objects |
| **Monitoring** | Query History, Task History, Dynamic Tables |
| **Admin** | Account management, Users, Roles, Warehouses |
| **Marketplace** | Snowflake Marketplace listings |

### User Profile and Settings

**Profile Settings Include:**
- Profile picture, first name, last name, email
- Password management
- Multi-factor authentication (MFA) enrollment
- Display preferences (Light/Dark/System theme)
- Language settings
- Notification preferences

**Display Preferences:**
- **Light Mode**: White background
- **Dark Mode**: Dark background
- **System Mode**: Matches operating system settings

---

## 2. Worksheets in Snowsight

### What are Worksheets?

Worksheets are the primary interface for writing and executing SQL queries or Python code within Snowsight. They provide a powerful, interactive environment for data analysis and exploration.

### Worksheet Capabilities

**Core Features:**
- Write and execute SQL statements
- Write and run Snowpark Python code
- Visualize results with charts
- Save and organize worksheets in folders
- Share worksheets with other users
- Version history and revision tracking

### Worksheet Context

Each worksheet has a **session context** that includes:
- **Role**: The active primary role for the session
- **Warehouse**: The compute resource for query execution
- **Database**: The default database for queries
- **Schema**: The default schema for queries

**Important:** You can change the context at any time using the context selectors or SQL commands (`USE ROLE`, `USE WAREHOUSE`, `USE DATABASE`, `USE SCHEMA`).

### Working with Worksheets

**Creating Worksheets:**
1. Navigate to Projects > Worksheets
2. Select "+ Worksheet" or "+ SQL Worksheet"
3. Choose SQL or Python worksheet type

**Running Queries:**
- Run entire worksheet: Click "Run" or press Cmd/Ctrl+Enter
- Run selected statement: Highlight text and run
- Run all statements: Use "Run All" option

**Query Results:**
- Results display in a table format below the query
- Up to 10,000 rows displayed in the UI
- Download results as CSV
- View results as chart visualizations

### Organizing Worksheets

**Folders:**
- Create folders to organize worksheets
- Nest folders for hierarchical organization
- Move worksheets between folders

**Sharing Worksheets:**
- Share with specific Snowflake users
- Set permission levels: View, Edit
- Share via link (if enabled)
- Shared worksheets appear in "Shared With Me" section

### Worksheet Versioning

- Automatic version history maintained
- View and restore previous versions
- Compare versions side-by-side
- Track changes over time

---

## 3. Dashboards in Snowsight

### What are Dashboards?

Dashboards are flexible collections of charts and tables arranged as tiles, providing visual representations of query results for data communication and monitoring.

### Dashboard Components

**Tiles:**
- Individual visual elements on a dashboard
- Can display charts or tables
- Each tile is backed by a SQL query
- Hover over charts to view data point details

**Supported Visualizations:**
- Bar charts
- Line charts
- Scatterplots
- Heatgrids (heatmaps)
- Scorecards
- Tables

### Creating Dashboards

**Method 1: Create Empty Dashboard**
1. Navigate to Projects > Dashboards
2. Select "+ Dashboard"
3. Name the dashboard
4. Add tiles with queries

**Method 2: Create from Worksheet**
1. Open an existing worksheet with a query
2. Select "New dashboard" from options
3. Worksheet becomes a tile in the new dashboard

**Important:** When creating a dashboard from a worksheet, the worksheet is **removed** from the worksheets list and becomes part of the dashboard.

### Managing Dashboard Tiles

**Adding Tiles:**
- "New Tile from Worksheet" creates a new query
- Add existing worksheets as tiles
- Duplicate existing tiles

**Editing Tiles:**
- Edit the underlying query
- Modify chart type and settings
- Configure tile display (chart vs. table)
- Rearrange tiles by dragging

**Removing vs. Deleting Tiles:**
- **Unplace Tile**: Removes from display but preserves query
- **Delete Tile**: Permanently removes tile AND query

### Sharing Dashboards

- Share with specific users
- Set permission levels (View, Edit)
- Link sharing options
- Dashboards run with user's primary role only (secondary roles disabled)

---

## 4. Data Visualizations

### Chart Types in Snowsight

| Chart Type | Best Used For |
|------------|---------------|
| **Bar Chart** | Comparing categorical data |
| **Line Chart** | Showing trends over time |
| **Scatterplot** | Showing relationships between variables |
| **Heatgrid** | Displaying matrix data with color intensity |
| **Scorecard** | Displaying single metrics/KPIs |

### Creating Charts

1. Run a query in a worksheet
2. Select "Chart" above the results table
3. Snowsight auto-generates a chart based on data
4. Customize chart type, data mappings, and appearance

### Chart Configuration

**Data Section:**
- Select columns for axes
- Configure aggregation functions
- Set bucketing for dates/numbers

**Appearance Section:**
- Labels and titles
- Color schemes
- Axis configuration
- Legend positioning

### Aggregation Functions

Charts can aggregate data using:
- Count
- Sum
- Average (Mean)
- Min/Max
- Median

### Bucketing

**For Date Columns:**
- Day, Week, Month, Year

**For Numeric Columns:**
- Integer value buckets

---

## 5. Universal Search

### Overview

Universal Search allows you to quickly find objects in your account, Marketplace listings, relevant documentation, and Snowflake resources using natural language.

### Search Capabilities

**What You Can Search:**
- Database objects (tables, views, schemas, databases)
- Worksheets and dashboards
- Snowflake Marketplace listings
- Documentation

**Search Features:**
- Natural language queries ("find tables with customer data")
- Keyword searches
- Fuzzy matching (handles typos)
- Searches object metadata (names, comments, tags)

**Important:** Universal Search searches object metadata, NOT the actual data content within objects.

### Search Results

- Results based on active role privileges
- Secondary roles included if enabled
- New objects may take up to a few hours to appear
- Select results to view details or open in worksheets

---

## 6. Query History and Monitoring

### Query History Page

Located under Monitoring > Query History, this feature allows you to:
- View queries executed in the last 14 days
- Filter by user, status, duration, warehouse, and more
- Review query details and profiles
- Monitor account-wide query activity (with appropriate privileges)

### Viewing Privileges

| Role/Privilege | What You Can See |
|----------------|------------------|
| Your queries | Always visible |
| ACCOUNTADMIN | All queries in account |
| MONITOR on warehouse | Queries using that warehouse |
| GOVERNANCE_VIEWER | Query history views, grouped queries |
| MONITOR on users | Queries by those users |

### Grouped Query History

- Groups similar queries by parameterized query hash
- Useful for monitoring Unistore workloads
- Shows aggregate statistics across query groups
- Helps identify patterns in repeated queries

### Query Profile

The Query Profile provides detailed execution information:

**Profile Overview:**
- Execution time breakdown
- Processing time by operation type

**Query Insights:**
- Automatic identification of potential issues
- Performance recommendations

**Statistics:**
- Rows processed, bytes scanned
- Partitions scanned vs. pruned
- Cache utilization
- Spilling information

**Most Expensive Nodes:**
- Identifies costly operations
- Helps optimize query performance

### Common Query Problems Identified

1. **Exploding Joins**: Cartesian products causing row multiplication
2. **UNION without ALL**: Unnecessary duplicate elimination
3. **Memory Spillage**: Queries too large for memory
4. **Inefficient Pruning**: Poor partition elimination

---

## 7. Database Object Explorer

### Accessing the Explorer

Navigate to Catalog > Database Explorer to browse all database objects hierarchically.

### Explorer Hierarchy

```
Account
  |-- Databases
       |-- Schemas
            |-- Tables
            |-- Views
            |-- Dynamic Tables
            |-- Streams
            |-- Stages
            |-- Functions
            |-- Procedures
            |-- Tasks
            |-- Pipes
```

### Object Management

**For Databases:**
- View source (local, share, Marketplace)
- Edit name and comments
- Transfer ownership
- Manage privileges
- Create schemas

**For Schemas:**
- Clone schemas
- Drop schemas
- Transfer ownership
- Create objects within schema

**For Tables/Views:**
- Preview data (100 rows)
- View column definitions
- Review data lineage
- Manage privileges

---

## 8. Data Lineage

### What is Data Lineage?

Data lineage tracks where data comes from (upstream) and where it goes (downstream), showing relationships between database objects.

### Lineage Relationships

**Data Movement:**
- CTAS (CREATE TABLE AS SELECT)
- INSERT ... SELECT
- MERGE operations
- COPY INTO

**Object Dependency:**
- Views referencing tables
- Dynamic tables with source queries

### Using the Lineage Tab

1. Navigate to a supported object in Database Explorer
2. Select the "Lineage" tab
3. View upstream and downstream objects
4. Click arrows to explore further relationships

### Column Lineage

- Track individual column relationships
- View upstream/downstream column mappings
- Identify column origins across transformations

### Lineage Access Control

- Requires VIEW LINEAGE privilege on account
- Requires privileges on objects to see their lineage
- RESOLVE ALL privilege shows all lineage regardless of object access

---

## 9. Task Monitoring

### Viewing Tasks

Navigate to a schema in Database Explorer and select "Tasks" to:
- View task definitions
- See task schedules and states
- Monitor task run history
- View task graph relationships

### Task Graphs

- Visual representation of task dependencies
- Root tasks and child tasks displayed
- Execute and monitor task graphs
- Debug failed task runs

### Task Run History

- View execution history
- Filter by status (success, failed, cancelled)
- Retry failed tasks
- View run duration and timing

---

## 10. Filters in Worksheets and Dashboards

### System Filters

Pre-built filters available to all users:
- Date range filters
- Common value filters

### Custom Filters

**Creating Custom Filters:**
1. Requires CREATE SNOWSIGHT FILTER privilege
2. Define filter name and type
3. Specify filter values or query
4. Apply to worksheets/dashboards

**Filter Types:**
- Single select
- Multi-select
- Date range
- Text input

### Using Filters in Queries

Filters are referenced as special keywords in SQL that resolve to values or subqueries at execution time.

---

## 11. SnowSQL: Command-Line Interface

### What is SnowSQL?

SnowSQL is Snowflake's legacy command-line client for connecting to Snowflake and executing SQL queries. It supports both interactive and batch modes.

**Note:** Snowflake is transitioning users to the newer Snowflake CLI. See migration documentation for details.

### Key Characteristics

- Platform-specific installers (Windows, macOS, Linux)
- Built on Snowflake Connector for Python
- Supports interactive shell and batch mode
- Configuration file-based settings
- No auto-upgrade since version 1.3.0

### Installation

**Supported Platforms:**
- Windows (64-bit)
- macOS (Intel and Apple Silicon)
- Linux (x86_64)

**Installation Steps:**
1. Download from Snowflake Developers site
2. Verify installer integrity (optional but recommended)
3. Run installer
4. Configure connection parameters

### Configuration File

Located at `~/.snowsql/config` (Linux/macOS) or `%USERPROFILE%\.snowsql\config` (Windows):

```ini
[connections]
accountname = <account_identifier>
username = <username>
password = <password>

[connections.example]
accountname = <another_account>
username = <username>

[options]
auto_completion = True
log_file = ~/.snowsql/log
output_format = psql
```

### SnowSQL Commands

| Command | Description |
|---------|-------------|
| `!connect <name>` | Connect using named connection |
| `!exit` / `!disconnect` | End current connection |
| `!options` / `!opts` | Show all options |
| `!queries` | List recent queries |
| `!quit` / `!q` | Exit SnowSQL |
| `!set <option>=<value>` | Set option value |
| `!source <file>` / `!load` | Execute SQL from file |
| `!spool <file>` | Write output to file |
| `!system <command>` | Execute shell command |

### Connection Parameters

```bash
snowsql -a <account_identifier> -u <username> -d <database> -s <schema> -w <warehouse>
```

**Common Parameters:**
- `-a, --accountname`: Account identifier
- `-u, --username`: Login name
- `-d, --dbname`: Default database
- `-s, --schemaname`: Default schema
- `-w, --warehouse`: Default warehouse
- `-r, --rolename`: Default role

### Batch Mode

Execute SQL files non-interactively:

```bash
snowsql -a myaccount -u myuser -f script.sql
```

Or pipe SQL:

```bash
echo "SELECT CURRENT_VERSION();" | snowsql -a myaccount -u myuser
```

---

## 12. Classic Console (Deprecated)

### Status

The Classic Console has been fully deprecated and replaced by Snowsight. Users can no longer access the Classic Console.

### Migration

All Classic Console functionality has been migrated to Snowsight:
- Worksheets were automatically migrated
- Account management moved to Admin section
- Query history available in Monitoring

---

## 13. Interface Comparison

| Feature | Snowsight | SnowSQL |
|---------|-----------|---------|
| **Type** | Web-based GUI | Command-line |
| **Installation** | None required | Required |
| **Visualizations** | Charts, dashboards | None (text output) |
| **Collaboration** | Sharing, folders | None |
| **Scripting** | Limited | Excellent |
| **Automation** | API integration | Script/batch files |
| **Best For** | Ad-hoc analysis, visualization | Scripting, CI/CD, automation |

### When to Use Each Interface

**Use Snowsight When:**
- Exploring data interactively
- Creating visualizations and dashboards
- Collaborating with team members
- Managing account settings via GUI
- Learning Snowflake or prototyping queries

**Use SnowSQL When:**
- Automating SQL script execution
- Integrating with CI/CD pipelines
- Running scheduled batch jobs
- Working in environments without GUI access
- Scripting data loading operations

---

## Exam Tips and Common Question Patterns

### Key Concepts to Remember

1. **Snowsight is the PRIMARY interface** - Classic Console is deprecated
2. **Worksheets have session context** - Role, warehouse, database, schema
3. **Dashboards use PRIMARY role only** - Secondary roles are disabled
4. **Query History retention is 14 days** in the UI
5. **Universal Search searches metadata**, not data content
6. **SnowSQL is LEGACY** - Snowflake CLI is the modern replacement

### Common Exam Question Types

**Interface Capabilities:**
- "Which interface allows you to create visualizations?" (Snowsight)
- "What is the maximum query history retention in Snowsight?" (14 days)
- "How do you share a worksheet?" (Share button, specify users)

**Worksheet Questions:**
- "What determines which objects a user can see in a worksheet?" (Active role)
- "How can you run a specific statement in a worksheet?" (Highlight and run)
- "What happens when you create a dashboard from a worksheet?" (Worksheet is moved to dashboard)

**Dashboard Questions:**
- "Can dashboards use secondary roles?" (No, primary role only)
- "What is the difference between Unplace and Delete for tiles?" (Unplace preserves query)

**SnowSQL Questions:**
- "Where is the SnowSQL configuration file located?" (~/.snowsql/config)
- "How do you execute a SQL file in SnowSQL?" (snowsql -f filename.sql)
- "What command lists recent queries in SnowSQL?" (!queries)

**Query History Questions:**
- "Who can see all queries in an account?" (ACCOUNTADMIN)
- "What privilege is needed to see queries on a warehouse?" (MONITOR)

### Practice Scenarios

**Scenario 1:** A user needs to create a monthly report with charts showing sales trends.
- **Answer:** Use Snowsight worksheets to write queries, create visualizations, then build a dashboard with multiple tiles.

**Scenario 2:** A DevOps team needs to run SQL scripts as part of their deployment pipeline.
- **Answer:** Use SnowSQL in batch mode with -f flag to execute SQL files.

**Scenario 3:** An analyst cannot see certain tables in the database explorer.
- **Answer:** Check the active role - the user needs appropriate privileges on those objects.

**Scenario 4:** A dashboard shared with another user shows different results.
- **Answer:** The dashboard runs with the viewing user's primary role, so they may have different data access.

### Quick Facts for Exam

| Item | Value/Fact |
|------|------------|
| Query History Retention (UI) | 14 days |
| Supported Browsers | Safari, Chrome, Edge, Firefox (latest 3 versions) |
| Dashboard Roles | Primary role only (no secondary roles) |
| SnowSQL Config Location | ~/.snowsql/config |
| New Objects in Search | Up to few hours to appear |
| Worksheet Sharing | Users must have signed in to Snowsight previously |
| Snowsight URL | https://app.snowflake.com |

---

## Summary

Snowsight is Snowflake's modern, unified web interface providing comprehensive capabilities for data analysis, visualization, collaboration, and administration. Key features include worksheets for interactive querying, dashboards for data visualization, universal search for discovery, and integrated monitoring tools. SnowSQL remains available as a command-line option for scripting and automation scenarios, though Snowflake CLI is the recommended modern alternative.

For the SnowPro Core exam, focus on understanding:
- Snowsight navigation and core features
- Worksheet capabilities and session context
- Dashboard creation and sharing behavior
- Query history and monitoring features
- When to use Snowsight vs. SnowSQL
- Access control implications across interfaces
