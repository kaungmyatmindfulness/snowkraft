# Domain 5: Data Transformations

## Part 8: Date and Time Functions

This section provides comprehensive coverage of Snowflake's date and time functions, which are essential for data transformations and frequently tested on the SnowPro Core exam. Understanding these functions is critical for temporal data analysis, reporting, and ETL operations.

---

## 1. Date and Time Data Types Overview

Before diving into functions, it is essential to understand Snowflake's date/time data types:

| Data Type | Description | Storage | Range |
|-----------|-------------|---------|-------|
| **DATE** | Calendar date (no time) | 4 bytes | 0001-01-01 to 9999-12-31 |
| **TIME** | Time of day (no date) | 8 bytes | 00:00:00 to 23:59:59.999999999 |
| **TIMESTAMP_NTZ** | Timestamp without time zone | 8 bytes | Wall clock time, no TZ conversion |
| **TIMESTAMP_LTZ** | Timestamp with local time zone | 8 bytes | Stored as UTC, displayed in session TZ |
| **TIMESTAMP_TZ** | Timestamp with time zone | 16 bytes | Stored with explicit TZ offset |

**Default TIMESTAMP Type:**
- Controlled by `TIMESTAMP_TYPE_MAPPING` session parameter
- Default is `TIMESTAMP_NTZ`
- Can be set to `TIMESTAMP_LTZ` or `TIMESTAMP_TZ`

```sql
-- Check current default
SHOW PARAMETERS LIKE 'TIMESTAMP_TYPE_MAPPING';

-- Change default for session
ALTER SESSION SET TIMESTAMP_TYPE_MAPPING = 'TIMESTAMP_LTZ';
```

---

## 2. Current Date and Time Functions

These functions return the current date/time values and are frequently used in data pipelines and auditing.

### CURRENT_DATE

Returns the current date in the session's time zone.

```sql
-- Basic usage
SELECT CURRENT_DATE;
-- Result: 2024-01-15

-- In table operations
INSERT INTO audit_log (event_date, event_type)
VALUES (CURRENT_DATE, 'LOGIN');

-- Alternative syntax (parentheses optional)
SELECT CURRENT_DATE();
```

**Key Points:**
- Returns DATE data type
- No parentheses required (but allowed)
- Session time zone affects the result
- Non-deterministic function (different result each execution)

### CURRENT_TIMESTAMP

Returns the current timestamp with time zone information based on the session's TIMESTAMP_TYPE_MAPPING.

```sql
-- Basic usage
SELECT CURRENT_TIMESTAMP;
-- Result depends on TIMESTAMP_TYPE_MAPPING setting

-- With explicit type
SELECT CURRENT_TIMESTAMP()::TIMESTAMP_NTZ AS ntz_time,
       CURRENT_TIMESTAMP()::TIMESTAMP_LTZ AS ltz_time,
       CURRENT_TIMESTAMP()::TIMESTAMP_TZ AS tz_time;
```

**Related Functions:**

| Function | Returns | Description |
|----------|---------|-------------|
| `CURRENT_TIMESTAMP` | Session default TIMESTAMP | Current timestamp |
| `LOCALTIMESTAMP` | TIMESTAMP_NTZ | Current timestamp without TZ |
| `SYSDATE()` | TIMESTAMP_LTZ | System timestamp (UTC displayed in session TZ) |
| `SYSTIMESTAMP()` | TIMESTAMP_TZ | System timestamp with TZ offset |
| `GETDATE()` | TIMESTAMP_NTZ | Alias for CURRENT_TIMESTAMP |

```sql
-- Compare all current timestamp functions
SELECT
    CURRENT_TIMESTAMP AS current_ts,
    LOCALTIMESTAMP AS local_ts,
    SYSDATE() AS sys_date,
    SYSTIMESTAMP() AS sys_ts;
```

### CURRENT_TIME

Returns the current time without date component.

```sql
SELECT CURRENT_TIME;
-- Result: 14:30:45.123456789
```

---

## 3. Date Arithmetic Functions

### DATEADD

Adds a specified number of date/time parts to a date, time, or timestamp.

**Syntax:**
```sql
DATEADD( <date_or_time_part>, <value>, <date_or_time_expr> )
```

**Date/Time Parts Supported:**

| Part | Aliases | Description |
|------|---------|-------------|
| year | y, yy, yyy, yyyy | Years |
| month | mm, mon | Months |
| day | d, dd | Days |
| week | w, wk | Weeks |
| quarter | q, qtr | Quarters |
| hour | hh | Hours |
| minute | mi, min | Minutes |
| second | s, ss, sec | Seconds |
| millisecond | ms | Milliseconds |
| microsecond | us | Microseconds |
| nanosecond | ns | Nanoseconds |

**Examples:**
```sql
-- Add 7 days to a date
SELECT DATEADD(day, 7, '2024-01-15'::DATE);
-- Result: 2024-01-22

-- Subtract 3 months (use negative value)
SELECT DATEADD(month, -3, CURRENT_DATE);

-- Add hours to timestamp
SELECT DATEADD(hour, 12, CURRENT_TIMESTAMP);

-- Multiple operations
SELECT DATEADD(day, 30, DATEADD(month, 1, '2024-01-15'::DATE));

-- In WHERE clause for filtering recent data
SELECT * FROM events
WHERE event_date >= DATEADD(day, -7, CURRENT_DATE);

-- Generate date for weekly report
SELECT DATEADD(week, -1, CURRENT_DATE) AS last_week;
```

**Important Behavior:**
- Adding months to end-of-month dates truncates to valid dates
- DATEADD(month, 1, '2024-01-31') returns '2024-02-29' (in leap year) or '2024-02-28'
- Works with DATE, TIME, TIMESTAMP_NTZ, TIMESTAMP_LTZ, and TIMESTAMP_TZ

### DATEDIFF

Calculates the difference between two dates in specified units.

**Syntax:**
```sql
DATEDIFF( <date_or_time_part>, <date_or_time_expr1>, <date_or_time_expr2> )
```

**Examples:**
```sql
-- Days between two dates
SELECT DATEDIFF(day, '2024-01-01', '2024-01-15');
-- Result: 14

-- Months between dates
SELECT DATEDIFF(month, '2023-06-15', '2024-01-15');
-- Result: 7

-- Calculate age in years
SELECT DATEDIFF(year, '1990-05-15', CURRENT_DATE) AS age_years;

-- Hours between timestamps
SELECT DATEDIFF(hour,
    '2024-01-15 08:00:00'::TIMESTAMP,
    '2024-01-15 17:30:00'::TIMESTAMP);
-- Result: 9

-- Calculate days since last order
SELECT
    customer_id,
    MAX(order_date) AS last_order,
    DATEDIFF(day, MAX(order_date), CURRENT_DATE) AS days_since_order
FROM orders
GROUP BY customer_id;

-- Identify records older than 90 days
SELECT * FROM audit_log
WHERE DATEDIFF(day, created_at, CURRENT_TIMESTAMP) > 90;
```

**Important Notes:**
- Result is always an INTEGER
- Second date minus first date (date2 - date1)
- Negative result if date1 > date2
- Does not account for partial periods (DATEDIFF(year, '2024-12-31', '2025-01-01') = 1)

### TIMESTAMPDIFF

Alias for DATEDIFF that works identically with timestamps.

```sql
SELECT TIMESTAMPDIFF(minute, start_time, end_time) AS duration_minutes
FROM sessions;
```

---

## 4. Date Truncation and Extraction

### DATE_TRUNC

Truncates a date/timestamp to the specified precision.

**Syntax:**
```sql
DATE_TRUNC( <date_or_time_part>, <date_or_time_expr> )
```

**Examples:**
```sql
-- Truncate to month (first day of month)
SELECT DATE_TRUNC('month', '2024-01-15'::DATE);
-- Result: 2024-01-01

-- Truncate to year
SELECT DATE_TRUNC('year', '2024-07-20'::DATE);
-- Result: 2024-01-01

-- Truncate to week (Monday)
SELECT DATE_TRUNC('week', '2024-01-15'::DATE);
-- Result: 2024-01-15 (if Monday) or previous Monday

-- Truncate timestamp to hour
SELECT DATE_TRUNC('hour', '2024-01-15 14:35:22'::TIMESTAMP);
-- Result: 2024-01-15 14:00:00

-- Monthly aggregation
SELECT
    DATE_TRUNC('month', order_date) AS month,
    SUM(amount) AS monthly_total
FROM orders
GROUP BY DATE_TRUNC('month', order_date)
ORDER BY month;

-- Weekly report start dates
SELECT DATE_TRUNC('week', CURRENT_DATE) AS week_start;
```

**Supported Truncation Parts:**
- year, quarter, month, week, day
- hour, minute, second
- millisecond, microsecond, nanosecond

### DATE_PART / EXTRACT

Extracts a specific component from a date/timestamp.

**Syntax:**
```sql
DATE_PART( <date_or_time_part>, <date_or_time_expr> )
EXTRACT( <date_or_time_part> FROM <date_or_time_expr> )
```

**Examples:**
```sql
-- Extract year
SELECT DATE_PART(year, '2024-01-15'::DATE);
-- Result: 2024

-- Extract month
SELECT DATE_PART(month, '2024-01-15'::DATE);
-- Result: 1

-- Using EXTRACT (SQL standard syntax)
SELECT EXTRACT(day FROM '2024-01-15'::DATE);
-- Result: 15

-- Extract hour from timestamp
SELECT DATE_PART(hour, '2024-01-15 14:35:22'::TIMESTAMP);
-- Result: 14

-- Day of week (0=Sunday, 6=Saturday)
SELECT DATE_PART(dayofweek, '2024-01-15'::DATE);

-- Day of year
SELECT DATE_PART(dayofyear, '2024-01-15'::DATE);
-- Result: 15

-- Week of year
SELECT DATE_PART(weekofyear, '2024-01-15'::DATE);

-- Complex analysis
SELECT
    order_date,
    DATE_PART(year, order_date) AS year,
    DATE_PART(quarter, order_date) AS quarter,
    DATE_PART(month, order_date) AS month,
    DATE_PART(dayofweek, order_date) AS dow
FROM orders;
```

**Available Parts for Extraction:**

| Part | Description | Value Range |
|------|-------------|-------------|
| year | Year number | 0001-9999 |
| quarter | Quarter of year | 1-4 |
| month | Month number | 1-12 |
| week / weekofyear | Week of year | 1-54 |
| day / dayofmonth | Day of month | 1-31 |
| dayofweek | Day of week | 0-6 (Sun-Sat) |
| dayofweekiso | ISO day of week | 1-7 (Mon-Sun) |
| dayofyear | Day of year | 1-366 |
| hour | Hour | 0-23 |
| minute | Minute | 0-59 |
| second | Second | 0-59 |
| epoch_second | Seconds since 1970-01-01 | Integer |
| epoch_millisecond | Milliseconds since epoch | Integer |
| timezone_hour | TZ offset hours | -12 to +14 |
| timezone_minute | TZ offset minutes | -59 to +59 |

### Convenience Extraction Functions

Snowflake provides shorthand functions for common extractions:

```sql
-- Year functions
SELECT YEAR('2024-01-15'::DATE);         -- 2024
SELECT YEAROFWEEK('2024-01-01'::DATE);   -- 2024 (ISO year)
SELECT YEAROFWEEKISO('2024-01-01'::DATE);

-- Month functions
SELECT MONTH('2024-01-15'::DATE);        -- 1
SELECT MONTHNAME('2024-01-15'::DATE);    -- January

-- Day functions
SELECT DAY('2024-01-15'::DATE);          -- 15
SELECT DAYOFMONTH('2024-01-15'::DATE);   -- 15
SELECT DAYOFWEEK('2024-01-15'::DATE);    -- 1 (Monday)
SELECT DAYOFWEEKISO('2024-01-15'::DATE); -- 1 (Monday, ISO)
SELECT DAYOFYEAR('2024-01-15'::DATE);    -- 15
SELECT DAYNAME('2024-01-15'::DATE);      -- Monday

-- Week functions
SELECT WEEK('2024-01-15'::DATE);         -- 3
SELECT WEEKOFYEAR('2024-01-15'::DATE);   -- 3
SELECT WEEKISO('2024-01-15'::DATE);      -- ISO week number

-- Quarter function
SELECT QUARTER('2024-01-15'::DATE);      -- 1

-- Time functions
SELECT HOUR('14:35:22'::TIME);           -- 14
SELECT MINUTE('14:35:22'::TIME);         -- 35
SELECT SECOND('14:35:22'::TIME);         -- 22
```

---

## 5. Date Conversion Functions

### TO_DATE / DATE

Converts a string or numeric value to a DATE.

**Syntax:**
```sql
TO_DATE( <string_expr> [, <format> ] )
TO_DATE( <integer_expr> )
DATE( <expr> )
```

**Examples:**
```sql
-- String to date with default format (YYYY-MM-DD)
SELECT TO_DATE('2024-01-15');
-- Result: 2024-01-15

-- String with custom format
SELECT TO_DATE('15/01/2024', 'DD/MM/YYYY');
SELECT TO_DATE('January 15, 2024', 'MMMM DD, YYYY');
SELECT TO_DATE('20240115', 'YYYYMMDD');

-- From epoch seconds
SELECT TO_DATE(1705276800);  -- Seconds since 1970-01-01
-- Result: 2024-01-15

-- Using DATE function (alias)
SELECT DATE('2024-01-15');

-- Auto date from timestamp
SELECT TO_DATE('2024-01-15 14:30:00'::TIMESTAMP);
-- Result: 2024-01-15 (time portion dropped)
```

**Common Format Elements:**

| Element | Description | Example |
|---------|-------------|---------|
| YYYY | 4-digit year | 2024 |
| YY | 2-digit year | 24 |
| MM | Month (01-12) | 01 |
| MON | Abbreviated month | Jan |
| MMMM | Full month name | January |
| DD | Day of month (01-31) | 15 |
| DY | Abbreviated day | Mon |
| DAY | Full day name | Monday |
| HH24 | Hour (00-23) | 14 |
| HH12 | Hour (01-12) | 02 |
| MI | Minute (00-59) | 30 |
| SS | Second (00-59) | 45 |
| FF | Fractional seconds | 123456 |
| AM/PM | Meridian indicator | PM |
| TZH:TZM | Time zone offset | -05:00 |

### TO_TIMESTAMP / TIMESTAMP

Converts a string or numeric value to a TIMESTAMP.

**Syntax:**
```sql
TO_TIMESTAMP( <string_expr> [, <format> ] )
TO_TIMESTAMP( <numeric_expr> [, <scale> ] )
TO_TIMESTAMP_NTZ( ... )
TO_TIMESTAMP_LTZ( ... )
TO_TIMESTAMP_TZ( ... )
```

**Examples:**
```sql
-- String to timestamp
SELECT TO_TIMESTAMP('2024-01-15 14:30:45');

-- With custom format
SELECT TO_TIMESTAMP('01/15/2024 02:30:45 PM', 'MM/DD/YYYY HH12:MI:SS AM');

-- From epoch (seconds)
SELECT TO_TIMESTAMP(1705330245);

-- From epoch with scale (milliseconds = 3)
SELECT TO_TIMESTAMP(1705330245123, 3);

-- Specific timestamp types
SELECT TO_TIMESTAMP_NTZ('2024-01-15 14:30:45');
SELECT TO_TIMESTAMP_LTZ('2024-01-15 14:30:45');
SELECT TO_TIMESTAMP_TZ('2024-01-15 14:30:45 -05:00');

-- From date to timestamp (adds midnight)
SELECT TO_TIMESTAMP('2024-01-15'::DATE);
-- Result: 2024-01-15 00:00:00.000
```

### TO_TIME / TIME

Converts a string to a TIME value.

```sql
-- String to time
SELECT TO_TIME('14:30:45');
-- Result: 14:30:45

-- With format
SELECT TO_TIME('2:30 PM', 'HH12:MI AM');

-- Extract time from timestamp
SELECT TO_TIME('2024-01-15 14:30:45'::TIMESTAMP);
-- Result: 14:30:45
```

### TRY_ Variants for Safe Conversion

Use TRY_ variants to avoid errors with invalid data:

```sql
-- Returns NULL instead of error for invalid input
SELECT TRY_TO_DATE('invalid');           -- NULL
SELECT TRY_TO_TIMESTAMP('not a date');   -- NULL
SELECT TRY_TO_TIME('bad time');          -- NULL

-- Useful for data quality checks
SELECT
    raw_date,
    TRY_TO_DATE(raw_date, 'YYYY-MM-DD') AS parsed_date,
    CASE WHEN TRY_TO_DATE(raw_date, 'YYYY-MM-DD') IS NULL
         THEN 'Invalid' ELSE 'Valid' END AS status
FROM raw_data;
```

---

## 6. Timezone Handling

### Understanding Time Zone Storage

| Type | Stored As | Display Behavior |
|------|-----------|------------------|
| TIMESTAMP_NTZ | Wall clock time | No conversion, shown as-is |
| TIMESTAMP_LTZ | UTC internally | Converted to session time zone for display |
| TIMESTAMP_TZ | UTC + offset | Shown with original offset |

### Session Time Zone

```sql
-- View current session time zone
SHOW PARAMETERS LIKE 'TIMEZONE';

-- Change session time zone
ALTER SESSION SET TIMEZONE = 'America/New_York';
ALTER SESSION SET TIMEZONE = 'UTC';
ALTER SESSION SET TIMEZONE = 'Europe/London';

-- See effect on TIMESTAMP_LTZ
ALTER SESSION SET TIMEZONE = 'America/Los_Angeles';
SELECT CURRENT_TIMESTAMP;  -- Shows Pacific time
ALTER SESSION SET TIMEZONE = 'America/New_York';
SELECT CURRENT_TIMESTAMP;  -- Shows Eastern time (same moment)
```

### CONVERT_TIMEZONE

Converts a timestamp between time zones.

**Syntax:**
```sql
CONVERT_TIMEZONE( <source_tz>, <target_tz>, <source_timestamp> )
CONVERT_TIMEZONE( <target_tz>, <source_timestamp> )  -- source_tz from session
```

**Examples:**
```sql
-- Convert from UTC to Eastern
SELECT CONVERT_TIMEZONE('UTC', 'America/New_York', '2024-01-15 14:00:00'::TIMESTAMP_NTZ);
-- Result: 2024-01-15 09:00:00 (5 hours earlier due to EST)

-- Convert from Pacific to Eastern
SELECT CONVERT_TIMEZONE(
    'America/Los_Angeles',
    'America/New_York',
    '2024-01-15 10:00:00'::TIMESTAMP_NTZ
);
-- Result: 2024-01-15 13:00:00 (3 hours later)

-- Using session time zone as source
ALTER SESSION SET TIMEZONE = 'America/New_York';
SELECT CONVERT_TIMEZONE('Europe/London', CURRENT_TIMESTAMP);

-- Store all timestamps in UTC
INSERT INTO events (event_time_utc)
SELECT CONVERT_TIMEZONE('UTC', CURRENT_TIMESTAMP);

-- Convert TIMESTAMP_LTZ (uses its stored UTC value)
SELECT CONVERT_TIMEZONE('America/New_York', event_time_ltz)
FROM events;
```

**Common Time Zone Names:**

| Region | Time Zone Name | UTC Offset |
|--------|----------------|------------|
| US Eastern | America/New_York | -05:00 / -04:00 (DST) |
| US Pacific | America/Los_Angeles | -08:00 / -07:00 (DST) |
| UTC | UTC | +00:00 |
| UK | Europe/London | +00:00 / +01:00 (DST) |
| Central Europe | Europe/Paris | +01:00 / +02:00 (DST) |
| India | Asia/Kolkata | +05:30 |
| Japan | Asia/Tokyo | +09:00 |
| Australia Eastern | Australia/Sydney | +10:00 / +11:00 (DST) |

### Best Practices for Timezone Handling

1. **Store in UTC:** Use TIMESTAMP_LTZ or convert to UTC before storing
2. **Convert for Display:** Use CONVERT_TIMEZONE when presenting to users
3. **Be Explicit:** Use TIMESTAMP_TZ when timezone info must be preserved
4. **Document Assumptions:** Note what timezone data represents

```sql
-- Best practice: Store UTC, display local
CREATE TABLE events (
    event_id INT,
    event_time_utc TIMESTAMP_LTZ,  -- Always UTC internally
    event_name VARCHAR
);

-- Insert with automatic UTC conversion
INSERT INTO events VALUES (1, CURRENT_TIMESTAMP, 'User Login');

-- Query with user's timezone
ALTER SESSION SET TIMEZONE = 'America/New_York';
SELECT event_id, event_time_utc, event_name FROM events;
-- event_time_utc displays in Eastern time
```

---

## 7. Date Formatting Functions

### TO_CHAR / TO_VARCHAR for Dates

Formats date/time values as strings.

```sql
-- Basic date formatting
SELECT TO_CHAR('2024-01-15'::DATE, 'YYYY-MM-DD');
-- Result: 2024-01-15

-- Custom formats
SELECT TO_CHAR('2024-01-15'::DATE, 'Month DD, YYYY');
-- Result: January 15, 2024

SELECT TO_CHAR('2024-01-15'::DATE, 'DY, MON DD');
-- Result: Mon, Jan 15

-- Timestamp formatting
SELECT TO_CHAR(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS');
-- Result: 2024-01-15 14:30:45

SELECT TO_CHAR(CURRENT_TIMESTAMP, 'MM/DD/YYYY HH12:MI AM TZH:TZM');
-- Result: 01/15/2024 02:30 PM -05:00

-- ISO 8601 format
SELECT TO_CHAR(CURRENT_TIMESTAMP, 'YYYY-MM-DD"T"HH24:MI:SSTZH:TZM');
-- Result: 2024-01-15T14:30:45-05:00
```

---

## 8. Date Construction Functions

### DATE_FROM_PARTS

Constructs a DATE from year, month, and day.

```sql
SELECT DATE_FROM_PARTS(2024, 1, 15);
-- Result: 2024-01-15

-- Build dates dynamically
SELECT DATE_FROM_PARTS(
    DATE_PART(year, CURRENT_DATE),
    1,  -- January
    1   -- First day
) AS year_start;
```

### TIME_FROM_PARTS

Constructs a TIME from hour, minute, second, and nanoseconds.

```sql
SELECT TIME_FROM_PARTS(14, 30, 45);
-- Result: 14:30:45

SELECT TIME_FROM_PARTS(14, 30, 45, 123456789);
-- Result: 14:30:45.123456789
```

### TIMESTAMP_FROM_PARTS

Constructs a TIMESTAMP from components.

```sql
-- From date and time
SELECT TIMESTAMP_FROM_PARTS('2024-01-15'::DATE, '14:30:45'::TIME);

-- From individual components
SELECT TIMESTAMP_FROM_PARTS(2024, 1, 15, 14, 30, 45);

-- With nanoseconds
SELECT TIMESTAMP_FROM_PARTS(2024, 1, 15, 14, 30, 45, 123456789);

-- Specific timestamp types
SELECT TIMESTAMP_NTZ_FROM_PARTS(2024, 1, 15, 14, 30, 45);
SELECT TIMESTAMP_LTZ_FROM_PARTS(2024, 1, 15, 14, 30, 45);
SELECT TIMESTAMP_TZ_FROM_PARTS(2024, 1, 15, 14, 30, 45, 0, 'America/New_York');
```

---

## 9. Additional Date Functions

### LAST_DAY

Returns the last day of the specified period.

```sql
-- Last day of month
SELECT LAST_DAY('2024-01-15'::DATE);
-- Result: 2024-01-31

-- Last day of year
SELECT LAST_DAY('2024-01-15'::DATE, 'year');
-- Result: 2024-12-31

-- Last day of week
SELECT LAST_DAY('2024-01-15'::DATE, 'week');
-- Result: 2024-01-21 (Sunday)

-- Last day of quarter
SELECT LAST_DAY('2024-01-15'::DATE, 'quarter');
-- Result: 2024-03-31
```

### NEXT_DAY

Returns the date of the next specified weekday.

```sql
-- Next Monday after given date
SELECT NEXT_DAY('2024-01-15'::DATE, 'Monday');
-- Result: 2024-01-22 (if Jan 15 is Monday, returns next Monday)

-- Next Friday
SELECT NEXT_DAY(CURRENT_DATE, 'fr');

-- Abbreviations: SU, MO, TU, WE, TH, FR, SA
```

### PREVIOUS_DAY

Returns the date of the previous specified weekday.

```sql
SELECT PREVIOUS_DAY('2024-01-15'::DATE, 'Friday');
-- Returns previous Friday
```

### ADD_MONTHS

Adds months to a date (similar to DATEADD with month).

```sql
SELECT ADD_MONTHS('2024-01-15'::DATE, 3);
-- Result: 2024-04-15

-- Handles end-of-month
SELECT ADD_MONTHS('2024-01-31'::DATE, 1);
-- Result: 2024-02-29 (leap year) or 2024-02-28
```

### MONTHS_BETWEEN

Calculates the number of months between two dates (with decimals).

```sql
SELECT MONTHS_BETWEEN('2024-03-15', '2024-01-15');
-- Result: 2.0

SELECT MONTHS_BETWEEN('2024-03-20', '2024-01-15');
-- Result: 2.16... (accounts for partial months)
```

---

## 10. Date/Time in Queries and Filters

### Filtering by Date Range

```sql
-- Exact date match
SELECT * FROM orders WHERE order_date = '2024-01-15';

-- Date range (inclusive)
SELECT * FROM orders
WHERE order_date BETWEEN '2024-01-01' AND '2024-01-31';

-- Last 7 days
SELECT * FROM events
WHERE event_date >= DATEADD(day, -7, CURRENT_DATE);

-- Current month
SELECT * FROM sales
WHERE order_date >= DATE_TRUNC('month', CURRENT_DATE);

-- Previous month
SELECT * FROM sales
WHERE order_date >= DATE_TRUNC('month', DATEADD(month, -1, CURRENT_DATE))
  AND order_date < DATE_TRUNC('month', CURRENT_DATE);
```

### Date-Based Aggregation

```sql
-- Daily totals
SELECT
    order_date,
    COUNT(*) AS order_count,
    SUM(amount) AS daily_total
FROM orders
GROUP BY order_date
ORDER BY order_date;

-- Monthly totals
SELECT
    DATE_TRUNC('month', order_date) AS month,
    COUNT(*) AS order_count,
    SUM(amount) AS monthly_total
FROM orders
GROUP BY DATE_TRUNC('month', order_date);

-- Year-over-year comparison
SELECT
    YEAR(order_date) AS year,
    MONTH(order_date) AS month,
    SUM(amount) AS total
FROM orders
GROUP BY YEAR(order_date), MONTH(order_date)
ORDER BY year, month;
```

### Time-Based Window Functions

```sql
-- Running total by date
SELECT
    order_date,
    amount,
    SUM(amount) OVER (ORDER BY order_date) AS running_total
FROM orders;

-- Moving average (7-day)
SELECT
    order_date,
    amount,
    AVG(amount) OVER (
        ORDER BY order_date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS moving_avg_7d
FROM orders;

-- Days since previous order
SELECT
    customer_id,
    order_date,
    LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date) AS prev_order,
    DATEDIFF(day,
        LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date),
        order_date
    ) AS days_between_orders
FROM orders;
```

---

## 11. Exam Tips and Common Patterns

### Key Concepts to Remember

1. **Default TIMESTAMP Type:** TIMESTAMP_NTZ is the default unless changed via session parameter

2. **DATEADD vs DATEDIFF Argument Order:**
   - DATEADD: (part, value, date) - adds value to date
   - DATEDIFF: (part, date1, date2) - calculates date2 - date1

3. **DATE_TRUNC Returns:** Always returns the first moment of the specified period

4. **Time Zone Storage:**
   - TIMESTAMP_NTZ: No TZ, stores literal value
   - TIMESTAMP_LTZ: Stores UTC, displays in session TZ
   - TIMESTAMP_TZ: Stores UTC + offset

5. **Non-Deterministic Functions:** CURRENT_DATE, CURRENT_TIMESTAMP cannot use result cache

6. **TRY_ Variants:** Use for safe conversions that return NULL instead of errors

### Common Exam Question Types

**1. Date Arithmetic:**
```sql
-- Question: What date is 90 days from January 1, 2024?
SELECT DATEADD(day, 90, '2024-01-01'::DATE);
-- Answer: 2024-03-31
```

**2. Date Difference:**
```sql
-- Question: How many months between dates?
SELECT DATEDIFF(month, '2023-06-15', '2024-01-15');
-- Answer: 7
```

**3. Truncation:**
```sql
-- Question: What is the first day of the quarter for 2024-05-20?
SELECT DATE_TRUNC('quarter', '2024-05-20'::DATE);
-- Answer: 2024-04-01
```

**4. Timezone Conversion:**
```sql
-- Question: Convert 2PM UTC to Eastern time on Jan 15
SELECT CONVERT_TIMEZONE('UTC', 'America/New_York',
    '2024-01-15 14:00:00'::TIMESTAMP_NTZ);
-- Answer: 2024-01-15 09:00:00 (EST is UTC-5)
```

**5. Format Conversion:**
```sql
-- Question: Parse date string '15-JAN-2024'
SELECT TO_DATE('15-JAN-2024', 'DD-MON-YYYY');
-- Answer: 2024-01-15
```

### Practice Questions

1. **What is the result of `DATEDIFF(day, '2024-01-01', '2024-01-31')`?**

<details>
<summary>Show Answer</summary>

Answer: 30
</details>

2. **Which TIMESTAMP type stores the time zone offset with the value?**

<details>
<summary>Show Answer</summary>

Answer: TIMESTAMP_TZ
</details>

3. **What does `DATE_TRUNC('week', '2024-01-17')` return?**

<details>
<summary>Show Answer</summary>

Answer: 2024-01-15 (Monday of that week)
</details>

4. **How do you get the last day of the current month?**

<details>
<summary>Show Answer</summary>

Answer: `LAST_DAY(CURRENT_DATE)` or `LAST_DAY(CURRENT_DATE, 'month')`
</details>

5. **What happens when you add 1 month to '2024-01-31'?**

<details>
<summary>Show Answer</summary>

Answer: Returns '2024-02-29' (leap year) - adjusts to valid date
</details>

6. **Which function safely converts a string to date, returning NULL on failure?**

<details>
<summary>Show Answer</summary>

Answer: TRY_TO_DATE()
</details>

7. **How do you extract the day of week from a date?**

<details>
<summary>Show Answer</summary>

Answer: `DAYOFWEEK(date)` or `DATE_PART(dayofweek, date)`
</details>

8. **What is the default time zone for TIMESTAMP_LTZ storage?**

<details>
<summary>Show Answer</summary>

Answer: UTC (Universal Coordinated Time)
</details>

---

## 12. Quick Reference

### Date/Time Function Summary

| Category | Functions |
|----------|-----------|
| **Current** | CURRENT_DATE, CURRENT_TIME, CURRENT_TIMESTAMP, SYSDATE(), LOCALTIMESTAMP |
| **Arithmetic** | DATEADD, DATEDIFF, TIMESTAMPDIFF, ADD_MONTHS, MONTHS_BETWEEN |
| **Truncation** | DATE_TRUNC |
| **Extraction** | DATE_PART, EXTRACT, YEAR, MONTH, DAY, HOUR, MINUTE, SECOND, DAYNAME, MONTHNAME |
| **Conversion** | TO_DATE, TO_TIME, TO_TIMESTAMP, TO_TIMESTAMP_NTZ/LTZ/TZ, TO_CHAR |
| **Construction** | DATE_FROM_PARTS, TIME_FROM_PARTS, TIMESTAMP_FROM_PARTS |
| **Navigation** | LAST_DAY, NEXT_DAY, PREVIOUS_DAY |
| **Timezone** | CONVERT_TIMEZONE |
| **Safe Conversion** | TRY_TO_DATE, TRY_TO_TIME, TRY_TO_TIMESTAMP |

### Format String Quick Reference

| Element | Meaning | Example Output |
|---------|---------|----------------|
| YYYY | 4-digit year | 2024 |
| MM | Month number | 01-12 |
| DD | Day of month | 01-31 |
| HH24 | 24-hour hour | 00-23 |
| HH12 | 12-hour hour | 01-12 |
| MI | Minutes | 00-59 |
| SS | Seconds | 00-59 |
| FF | Fractional seconds | Variable |
| AM/PM | Meridian | AM or PM |
| MON | Month abbreviation | Jan |
| DAY | Day name | Monday |
| TZH:TZM | Timezone offset | -05:00 |

---

## Summary

Date and time functions are fundamental to data transformation in Snowflake. Key takeaways:

1. **Choose the right TIMESTAMP type** based on time zone requirements
2. **Use DATEADD and DATEDIFF** for date arithmetic
3. **Use DATE_TRUNC** for period-based aggregations
4. **Use CONVERT_TIMEZONE** for cross-timezone operations
5. **Store in UTC** and convert for display as a best practice
6. **Use TRY_ variants** for robust data processing

Mastering these functions enables efficient temporal analysis, reporting, and ETL pipeline development in Snowflake.
