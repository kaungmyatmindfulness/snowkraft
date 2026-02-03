# Domain 5: Data Transformations

## Part 07: String Functions

This section covers Snowflake's string manipulation functions, which are essential for data transformations, data cleansing, and text processing. String functions are frequently tested on the SnowPro Core exam, particularly in scenarios involving data loading transformations, masking policies, and semi-structured data extraction.

---

## 1. String Functions Overview

### 1.1 Categories of String Functions

Snowflake provides a comprehensive set of string functions organized into these categories:

| Category | Functions | Purpose |
|----------|-----------|---------|
| **Concatenation** | CONCAT, CONCAT_WS, \|\| | Combine strings together |
| **Case Conversion** | UPPER, LOWER, INITCAP | Change character casing |
| **Trimming** | TRIM, LTRIM, RTRIM | Remove whitespace or characters |
| **Substring Extraction** | SUBSTR, SUBSTRING, LEFT, RIGHT | Extract portions of strings |
| **Splitting** | SPLIT, SPLIT_PART, SPLIT_TO_TABLE | Divide strings into parts |
| **Search & Replace** | REPLACE, TRANSLATE | Find and substitute characters |
| **Regular Expressions** | REGEXP_*, RLIKE | Pattern matching and extraction |
| **Measurement** | LENGTH, LEN, CHAR_LENGTH | Determine string length |
| **Padding** | LPAD, RPAD | Add characters to reach a length |
| **Position** | POSITION, CHARINDEX, INSTR | Find character locations |

### 1.2 Key Characteristics

- All string functions are **scalar functions** (return one value per input row)
- Most string functions support **NULL** handling (return NULL if input is NULL)
- String indexing in Snowflake is **1-based** (first character is position 1)
- String comparisons are **case-sensitive** by default

---

## 2. Concatenation Functions

### 2.1 CONCAT Function

Concatenates one or more strings into a single string.

**Syntax:**
```sql
CONCAT(string1, string2 [, stringN ...])
```

**Key Points:**
- Accepts 2 or more arguments
- **NULL propagation:** If any input value is NULL, the function returns NULL
- Automatically converts non-string values to strings

**Examples:**
```sql
-- Basic concatenation
SELECT CONCAT('Snow', 'flake');
-- Result: 'Snowflake'

-- Multiple arguments
SELECT CONCAT('Hello', ' ', 'World', '!');
-- Result: 'Hello World!'

-- NULL handling (propagates NULL, just like ||)
SELECT CONCAT('Colorado ', 'River ', NULL);
-- Result: NULL

-- With column values (use COALESCE to handle NULLs)
SELECT CONCAT(first_name, ' ', COALESCE(last_name, '')) AS full_name
FROM employees;
```

### 2.2 Concatenation Operator (||)

Alternative syntax for string concatenation.

**Syntax:**
```sql
string1 || string2 [|| stringN ...]
```

**Key Behavior:**
- The `||` operator propagates NULL (if any operand is NULL, result is NULL)
- **This is identical to CONCAT** -- both propagate NULL

**Examples:**
```sql
-- Basic use
SELECT 'Snow' || 'flake';
-- Result: 'Snowflake'

-- NULL propagation (same behavior as CONCAT)
SELECT 'Hello' || NULL || 'World';
-- Result: NULL

-- Common pattern: handle NULLs with COALESCE
SELECT first_name || ' ' || COALESCE(middle_name, '') || ' ' || last_name
FROM employees;
```

**Exam Tip:** Both CONCAT and || have identical NULL behavior: if any input is NULL, the result is NULL. Use COALESCE to handle NULLs when concatenating. CONCAT_WS is different -- it skips NULL values entirely.

### 2.3 CONCAT_WS Function

Concatenates strings with a separator (WS = With Separator).

**Syntax:**
```sql
CONCAT_WS(separator, string1, string2 [, stringN ...])
```

**Key Points:**
- First argument is the separator
- NULL values are skipped entirely (separator not added for NULLs)
- Useful for building delimited strings

**Examples:**
```sql
-- Basic use with comma separator
SELECT CONCAT_WS(', ', 'Apple', 'Banana', 'Cherry');
-- Result: 'Apple, Banana, Cherry'

-- NULL values are skipped
SELECT CONCAT_WS('-', '2024', NULL, '01', '15');
-- Result: '2024-01-15'

-- Building a CSV row
SELECT CONCAT_WS(',', customer_id, name, email, phone)
FROM customers;
```

---

## 3. Case Conversion Functions

### 3.1 UPPER Function

Converts all characters in a string to uppercase.

**Syntax:**
```sql
UPPER(string)
```

**Examples:**
```sql
SELECT UPPER('snowflake');
-- Result: 'SNOWFLAKE'

SELECT UPPER('Hello World 123');
-- Result: 'HELLO WORLD 123'

-- Common use: case-insensitive comparison
SELECT * FROM products
WHERE UPPER(category) = 'ELECTRONICS';
```

### 3.2 LOWER Function

Converts all characters in a string to lowercase.

**Syntax:**
```sql
LOWER(string)
```

**Examples:**
```sql
SELECT LOWER('SNOWFLAKE');
-- Result: 'snowflake'

-- Normalizing email addresses
SELECT LOWER(email) AS normalized_email
FROM users;

-- Case-insensitive search
SELECT * FROM customers
WHERE LOWER(name) LIKE '%john%';
```

### 3.3 INITCAP Function

Converts the first character of each word to uppercase and the rest to lowercase.

**Syntax:**
```sql
INITCAP(string)
```

**Key Points:**
- Word boundaries are determined by non-alphanumeric characters
- Useful for formatting names and titles

**Examples:**
```sql
SELECT INITCAP('hello world');
-- Result: 'Hello World'

SELECT INITCAP('JOHN DOE');
-- Result: 'John Doe'

SELECT INITCAP('mARY-jANE o''BRIEN');
-- Result: 'Mary-Jane O'Brien'

-- Formatting customer names
SELECT INITCAP(customer_name) AS formatted_name
FROM orders;
```

**Exam Tip:** INITCAP handles hyphenated names and apostrophes correctly - each part after a non-alphanumeric character starts with uppercase.

---

## 4. Trimming Functions

### 4.1 TRIM Function

Removes leading and/or trailing characters from a string.

**Syntax:**
```sql
TRIM([LEADING | TRAILING | BOTH] [characters] FROM string)
-- Or simplified:
TRIM(string [, characters])
```

**Key Points:**
- Default removes whitespace from both ends
- Can specify custom characters to remove
- LEADING removes from start, TRAILING from end, BOTH from both

**Examples:**
```sql
-- Remove whitespace
SELECT TRIM('   Hello World   ');
-- Result: 'Hello World'

-- Remove specific characters
SELECT TRIM('xxxHelloxxx', 'x');
-- Result: 'Hello'

-- LEADING only
SELECT TRIM(LEADING ' ' FROM '   Hello');
-- Result: 'Hello'

-- TRAILING only
SELECT TRIM(TRAILING '0' FROM '12300');
-- Result: '123'

-- Remove multiple character types
SELECT TRIM('##**Hello**##', '#*');
-- Result: 'Hello'
```

### 4.2 LTRIM Function

Removes characters from the left (beginning) of a string.

**Syntax:**
```sql
LTRIM(string [, characters])
```

**Examples:**
```sql
-- Remove leading whitespace
SELECT LTRIM('   Hello');
-- Result: 'Hello'

-- Remove leading zeros
SELECT LTRIM('000123', '0');
-- Result: '123'

-- Common use: clean data during load
COPY INTO my_table
FROM (
    SELECT LTRIM($1, ' '), $2, $3
    FROM @my_stage
);
```

### 4.3 RTRIM Function

Removes characters from the right (end) of a string.

**Syntax:**
```sql
RTRIM(string [, characters])
```

**Examples:**
```sql
-- Remove trailing whitespace
SELECT RTRIM('Hello   ');
-- Result: 'Hello'

-- Remove trailing punctuation
SELECT RTRIM('Hello!!!', '!');
-- Result: 'Hello'

-- Clean file extensions
SELECT RTRIM(filename, '.csv');
-- Note: This removes individual characters, not the substring
```

**Exam Tip:** TRIM functions remove individual characters from the set, not the substring as a whole. To remove '.csv' as a unit, you'd need REGEXP_REPLACE or conditional logic.

---

## 5. Substring Extraction Functions

### 5.1 SUBSTR / SUBSTRING Function

Extracts a portion of a string based on position and length.

**Syntax:**
```sql
SUBSTR(string, start_position [, length])
SUBSTRING(string, start_position [, length])
-- SUBSTR and SUBSTRING are synonymous
```

**Key Points:**
- Position is 1-based (first character is position 1)
- If length is omitted, returns from start to end of string
- Negative start position counts from the end

**Examples:**
```sql
-- Basic extraction
SELECT SUBSTR('Snowflake', 1, 4);
-- Result: 'Snow'

SELECT SUBSTR('Snowflake', 5);
-- Result: 'flake'

-- Negative position (from end)
SELECT SUBSTR('Snowflake', -5);
-- Result: 'flake'

SELECT SUBSTR('Snowflake', -5, 3);
-- Result: 'fla'

-- Extract year from date string
SELECT SUBSTR('2024-01-15', 1, 4) AS year;
-- Result: '2024'

-- Common pattern in COPY transformations
COPY INTO my_table
FROM (
    SELECT
        SUBSTR($1, 1, 10) AS field1,
        SUBSTR($1, 11, 20) AS field2
    FROM @my_stage
);
```

### 5.2 LEFT Function

Returns the leftmost characters of a string.

**Syntax:**
```sql
LEFT(string, length)
```

**Examples:**
```sql
SELECT LEFT('Snowflake', 4);
-- Result: 'Snow'

-- Extract area code
SELECT LEFT(phone_number, 3) AS area_code
FROM contacts;
```

### 5.3 RIGHT Function

Returns the rightmost characters of a string.

**Syntax:**
```sql
RIGHT(string, length)
```

**Examples:**
```sql
SELECT RIGHT('Snowflake', 5);
-- Result: 'flake'

-- Get file extension
SELECT RIGHT(filename, 4) AS extension
FROM files
WHERE filename LIKE '%.csv';
```

---

## 6. String Length Functions

### 6.1 LENGTH / LEN Function

Returns the number of characters in a string.

**Syntax:**
```sql
LENGTH(string)
LEN(string)  -- Synonym
```

**Key Points:**
- LENGTH and LEN are synonymous
- Returns the number of characters (not bytes)
- For multi-byte characters, each character counts as 1

**Examples:**
```sql
SELECT LENGTH('Snowflake');
-- Result: 9

SELECT LENGTH('Hello World');
-- Result: 11

-- Validate data length
SELECT * FROM users
WHERE LENGTH(phone) <> 10;

-- Use in CASE expressions
SELECT
    name,
    CASE
        WHEN LENGTH(name) > 50 THEN SUBSTR(name, 1, 47) || '...'
        ELSE name
    END AS display_name
FROM products;
```

### 6.2 CHAR_LENGTH / CHARACTER_LENGTH Function

Synonyms for LENGTH - returns number of characters.

```sql
SELECT CHAR_LENGTH('Snowflake');
-- Result: 9
```

### 6.3 OCTET_LENGTH Function

Returns the number of bytes in a string (useful for multi-byte characters).

```sql
SELECT OCTET_LENGTH('Snowflake');
-- Result: 9 (for ASCII characters)

SELECT OCTET_LENGTH('Hello');  -- English: 1 byte per char
-- Result: 5
```

---

## 7. Split Functions

### 7.1 SPLIT Function

Splits a string into an ARRAY based on a delimiter.

**Syntax:**
```sql
SPLIT(string, delimiter)
```

**Key Points:**
- Returns an ARRAY of strings
- Delimiter can be a string (not just a single character)
- Empty strings between delimiters are preserved

**Examples:**
```sql
SELECT SPLIT('apple,banana,cherry', ',');
-- Result: ['apple', 'banana', 'cherry']

SELECT SPLIT('2024-01-15', '-');
-- Result: ['2024', '01', '15']

-- Access array elements (0-based indexing)
SELECT SPLIT('apple,banana,cherry', ',')[0];
-- Result: 'apple'

-- Count elements
SELECT ARRAY_SIZE(SPLIT('a,b,c,d,e', ','));
-- Result: 5
```

### 7.2 SPLIT_PART Function

Extracts a specific element from a delimited string.

**Syntax:**
```sql
SPLIT_PART(string, delimiter, part_number)
```

**Key Points:**
- Part number is 1-based (first part is 1)
- Returns empty string if part number is out of range
- Negative part numbers count from the end

**Examples:**
```sql
SELECT SPLIT_PART('apple,banana,cherry', ',', 2);
-- Result: 'banana'

SELECT SPLIT_PART('2024-01-15', '-', 1);
-- Result: '2024'

-- Negative index (from end)
SELECT SPLIT_PART('apple,banana,cherry', ',', -1);
-- Result: 'cherry'

-- Extract domain from email
SELECT SPLIT_PART(email, '@', 2) AS domain
FROM users;

-- Parse file path
SELECT
    SPLIT_PART(file_path, '/', -1) AS filename,
    SPLIT_PART(SPLIT_PART(file_path, '/', -1), '.', -1) AS extension
FROM files;
```

**Exam Tip:** SPLIT returns an ARRAY (0-based indexing), while SPLIT_PART returns a STRING with 1-based indexing. Don't confuse the indexing!

### 7.3 SPLIT_TO_TABLE Function

Splits a string and returns results as table rows (table function).

**Syntax:**
```sql
SPLIT_TO_TABLE(string, delimiter)
```

**Key Points:**
- Returns a table with SEQ, INDEX, and VALUE columns
- Used in FROM clause with TABLE() wrapper
- Useful for normalizing denormalized data

**Examples:**
```sql
-- Basic usage
SELECT VALUE
FROM TABLE(SPLIT_TO_TABLE('apple,banana,cherry', ','));
-- Returns 3 rows: 'apple', 'banana', 'cherry'

-- With full output columns
SELECT SEQ, INDEX, VALUE
FROM TABLE(SPLIT_TO_TABLE('a,b,c', ','));
-- SEQ: sequence number, INDEX: 0-based position, VALUE: the element

-- Normalize tags column
SELECT
    product_id,
    t.VALUE AS tag
FROM products,
    TABLE(SPLIT_TO_TABLE(tags, ',')) AS t;
```

---

## 8. Replace and Translate Functions

### 8.1 REPLACE Function

Replaces all occurrences of a substring with another substring.

**Syntax:**
```sql
REPLACE(string, pattern, replacement)
```

**Key Points:**
- Case-sensitive matching
- Replaces ALL occurrences (not just first)
- If replacement is omitted, pattern is removed

**Examples:**
```sql
SELECT REPLACE('Hello World', 'World', 'Snowflake');
-- Result: 'Hello Snowflake'

-- Remove characters (empty replacement)
SELECT REPLACE('Hello-World', '-', '');
-- Result: 'HelloWorld'

-- Replace multiple occurrences
SELECT REPLACE('banana', 'a', 'o');
-- Result: 'bonono'

-- Clean phone numbers
SELECT REPLACE(REPLACE(REPLACE(phone, '-', ''), '(', ''), ')', '')
FROM contacts;

-- Data cleansing
SELECT REPLACE(description, '\n', ' ') AS clean_description
FROM products;
```

### 8.2 TRANSLATE Function

Replaces characters in a string based on a character-by-character mapping.

**Syntax:**
```sql
TRANSLATE(string, source_characters, target_characters)
```

**Key Points:**
- Character-by-character replacement (not substring)
- First character in source replaced by first in target, etc.
- If target is shorter, extra source characters are deleted

**Examples:**
```sql
-- Character substitution
SELECT TRANSLATE('abcdef', 'abc', 'xyz');
-- Result: 'xyzdef'

-- Remove specific characters (empty target)
SELECT TRANSLATE('Hello123World456', '0123456789', '');
-- Result: 'HelloWorld'

-- Convert encoding
SELECT TRANSLATE(text, 'aeiou', 'AEIOU');
-- Converts vowels to uppercase

-- ROT13 cipher example
SELECT TRANSLATE(
    'Hello',
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
    'NOPQRSTUVWXYZABCDEFGHIJKLMnopqrstuvwxyzabcdefghijklm'
);
-- Result: 'Uryyb'
```

**Key Difference:**
- REPLACE: Finds and replaces a substring pattern
- TRANSLATE: Maps individual characters one-to-one

---

## 9. Regular Expression Functions

### 9.1 Overview of REGEXP Functions

Snowflake provides powerful regular expression functions for pattern matching.

| Function | Purpose |
|----------|---------|
| REGEXP / RLIKE | Test if pattern matches (returns boolean) |
| REGEXP_LIKE | Same as REGEXP (alias) |
| REGEXP_COUNT | Count occurrences of pattern |
| REGEXP_INSTR | Find position of pattern match |
| REGEXP_SUBSTR | Extract matching substring |
| REGEXP_REPLACE | Replace pattern matches |

### 9.2 REGEXP / RLIKE Function

Tests whether a string matches a regular expression pattern.

**Syntax:**
```sql
string REGEXP pattern
string RLIKE pattern
REGEXP_LIKE(string, pattern [, parameters])
```

**Examples:**
```sql
-- Check for valid email format
SELECT 'test@example.com' REGEXP '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$';
-- Result: TRUE

-- Filter rows with pattern
SELECT * FROM users
WHERE email RLIKE '@gmail\\.com$';

-- Case-insensitive match
SELECT REGEXP_LIKE('HELLO', 'hello', 'i');
-- Result: TRUE

-- Check for digits
SELECT '12345' REGEXP '^[0-9]+$';
-- Result: TRUE
```

### 9.3 REGEXP_COUNT Function

Counts the number of times a pattern matches in a string.

**Syntax:**
```sql
REGEXP_COUNT(string, pattern [, position [, parameters]])
```

**Examples:**
```sql
-- Count vowels
SELECT REGEXP_COUNT('Snowflake', '[aeiou]', 1, 'i');
-- Result: 3

-- Count words
SELECT REGEXP_COUNT('Hello World from Snowflake', '\\w+');
-- Result: 4

-- Count email addresses in text
SELECT REGEXP_COUNT(text_column, '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}')
FROM messages;
```

### 9.4 REGEXP_INSTR Function

Returns the position where a pattern first matches.

**Syntax:**
```sql
REGEXP_INSTR(string, pattern [, position [, occurrence [, option [, parameters [, group]]]]])
```

**Parameters:**
- position: Starting position (default 1)
- occurrence: Which match to find (default 1)
- option: 0 = start of match, 1 = end of match
- group: Capture group number

**Examples:**
```sql
-- Find position of first digit
SELECT REGEXP_INSTR('Hello123World', '[0-9]');
-- Result: 6

-- Find second occurrence
SELECT REGEXP_INSTR('abc123def456', '[0-9]+', 1, 2);
-- Result: 10

-- Find end of match
SELECT REGEXP_INSTR('Hello123World', '[0-9]+', 1, 1, 1);
-- Result: 9 (position after '123')
```

### 9.5 REGEXP_SUBSTR Function

Extracts a substring that matches a pattern.

**Syntax:**
```sql
REGEXP_SUBSTR(string, pattern [, position [, occurrence [, parameters [, group]]]])
```

**Examples:**
```sql
-- Extract first number
SELECT REGEXP_SUBSTR('Price: $123.45', '[0-9]+\\.[0-9]+');
-- Result: '123.45'

-- Extract email domain
SELECT REGEXP_SUBSTR('contact@example.com', '@(.+)', 1, 1, 'e', 1);
-- Result: 'example.com' (capture group 1)

-- Extract year from various date formats
SELECT REGEXP_SUBSTR('Date: 2024-01-15', '[0-9]{4}');
-- Result: '2024'

-- Extract all matches using lateral join
SELECT t.VALUE
FROM data_table,
    LATERAL FLATTEN(
        REGEXP_SUBSTR_ALL(text_column, '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}')
    ) t;
```

### 9.6 REGEXP_REPLACE Function

Replaces substrings matching a pattern.

**Syntax:**
```sql
REGEXP_REPLACE(string, pattern [, replacement [, position [, occurrence [, parameters]]]])
```

**Key Points:**
- Replacement can include backreferences (\1, \2, etc.)
- occurrence = 0 replaces all occurrences

**Examples:**
```sql
-- Remove all digits
SELECT REGEXP_REPLACE('Hello123World456', '[0-9]', '');
-- Result: 'HelloWorld'

-- Mask credit card numbers
SELECT REGEXP_REPLACE('Card: 1234-5678-9012-3456', '[0-9]{4}-[0-9]{4}-[0-9]{4}', '****-****-****');
-- Result: 'Card: ****-****-****-3456'

-- Format phone numbers with backreferences
SELECT REGEXP_REPLACE('5551234567', '([0-9]{3})([0-9]{3})([0-9]{4})', '(\\1) \\2-\\3');
-- Result: '(555) 123-4567'

-- Remove extra whitespace
SELECT REGEXP_REPLACE('Hello    World', '\\s+', ' ');
-- Result: 'Hello World'

-- Use in masking policies
CREATE MASKING POLICY email_mask AS (val STRING)
RETURNS STRING ->
    CASE
        WHEN IS_ROLE_IN_SESSION('ADMIN') THEN val
        ELSE REGEXP_REPLACE(val, '.+@', '****@')
    END;
```

### 9.7 Regular Expression Parameters

Common parameters that modify regex behavior:

| Parameter | Meaning |
|-----------|---------|
| c | Case-sensitive matching (default) |
| i | Case-insensitive matching |
| m | Multi-line mode (^ and $ match line boundaries) |
| s | Single-line mode (. matches newlines) |
| e | Extract subpattern (capture groups) |

**Example:**
```sql
-- Case-insensitive search
SELECT REGEXP_LIKE('HELLO', 'hello', 'i');
-- Result: TRUE

-- Multi-line mode
SELECT REGEXP_COUNT('line1\nline2\nline3', '^line', 1, 'm');
-- Result: 3
```

### 9.8 Common Regular Expression Patterns

| Pattern | Matches |
|---------|---------|
| `^` | Start of string |
| `$` | End of string |
| `.` | Any single character |
| `*` | Zero or more of previous |
| `+` | One or more of previous |
| `?` | Zero or one of previous |
| `[abc]` | Any character in set |
| `[^abc]` | Any character not in set |
| `[a-z]` | Character range |
| `\d` | Digit (0-9) |
| `\w` | Word character (a-z, A-Z, 0-9, _) |
| `\s` | Whitespace |
| `\b` | Word boundary |
| `(...)` | Capture group |
| `(?:...)` | Non-capturing group |
| `{n}` | Exactly n occurrences |
| `{n,m}` | Between n and m occurrences |

---

## 10. Other Useful String Functions

### 10.1 LPAD and RPAD Functions

Pad strings to a specified length.

**Syntax:**
```sql
LPAD(string, length [, pad_string])
RPAD(string, length [, pad_string])
```

**Examples:**
```sql
-- Left pad with zeros
SELECT LPAD('42', 5, '0');
-- Result: '00042'

-- Right pad with spaces
SELECT RPAD('Hello', 10, ' ');
-- Result: 'Hello     '

-- Format employee IDs
SELECT LPAD(CAST(emp_id AS VARCHAR), 6, '0') AS formatted_id
FROM employees;
```

### 10.2 REVERSE Function

Reverses the order of characters in a string.

**Syntax:**
```sql
REVERSE(string)
```

**Examples:**
```sql
SELECT REVERSE('Snowflake');
-- Result: 'ekalfwonS'

-- Check for palindromes
SELECT name, (name = REVERSE(name)) AS is_palindrome
FROM words;
```

### 10.3 REPEAT Function

Repeats a string a specified number of times.

**Syntax:**
```sql
REPEAT(string, count)
```

**Examples:**
```sql
SELECT REPEAT('ab', 3);
-- Result: 'ababab'

-- Create separator lines
SELECT REPEAT('-', 50) AS separator;
```

### 10.4 POSITION / CHARINDEX Functions

Find the position of a substring.

**Syntax:**
```sql
POSITION(substring IN string)
CHARINDEX(substring, string [, start_position])
```

**Examples:**
```sql
SELECT POSITION('flake' IN 'Snowflake');
-- Result: 5

SELECT CHARINDEX('@', 'user@example.com');
-- Result: 5

-- Check if substring exists
SELECT * FROM emails
WHERE POSITION('@' IN email) > 0;
```

### 10.5 STARTSWITH and ENDSWITH Functions

Check if a string starts or ends with a specific substring.

**Syntax:**
```sql
STARTSWITH(string, prefix)
ENDSWITH(string, suffix)
```

**Examples:**
```sql
SELECT STARTSWITH('Snowflake', 'Snow');
-- Result: TRUE

SELECT ENDSWITH('report.csv', '.csv');
-- Result: TRUE

-- Filter files by extension
SELECT * FROM files
WHERE ENDSWITH(filename, '.json');
```

---

## 11. String Functions in Data Loading

String functions are commonly used during data loading with COPY INTO to transform data.

### 11.1 Supported Functions in COPY Transformations

The following string functions can be used during data loading:

```sql
COPY INTO my_table (col1, col2, col3)
FROM (
    SELECT
        TRIM($1),                           -- Remove whitespace
        UPPER($2),                          -- Uppercase
        SUBSTR($3, 1, 10),                  -- Extract substring
        CONCAT($4, '-', $5),                -- Concatenate fields
        REPLACE($6, ',', ''),               -- Remove characters
        REGEXP_REPLACE($7, '[^0-9]', ''),   -- Extract digits only
        SPLIT_PART($8, '|', 1)              -- Parse delimited field
    FROM @my_stage
)
FILE_FORMAT = (TYPE = 'CSV');
```

### 11.2 Common Transformation Patterns

```sql
-- Clean phone numbers during load
COPY INTO customers
FROM (
    SELECT
        $1 AS customer_id,
        INITCAP($2) AS name,
        LOWER($3) AS email,
        REGEXP_REPLACE($4, '[^0-9]', '') AS phone
    FROM @customer_stage
);

-- Parse fixed-width files
COPY INTO transactions
FROM (
    SELECT
        SUBSTR($1, 1, 10) AS transaction_id,
        SUBSTR($1, 11, 8) AS date_field,
        TRIM(SUBSTR($1, 19, 50)) AS description,
        CAST(SUBSTR($1, 69, 12) AS DECIMAL(12,2)) AS amount
    FROM @fixed_width_stage
);
```

---

## 12. Key Exam Patterns and Traps

### 12.1 Common Exam Traps

| Trap | Reality |
|------|---------|
| CONCAT and \|\| differ in NULL handling | Both CONCAT and \|\| propagate NULL identically; CONCAT_WS is the one that skips NULLs |
| String indexing is 0-based | String indexing is **1-based** in SUBSTR, POSITION, etc. |
| SPLIT returns 1-based array | SPLIT returns an ARRAY with **0-based** indexing |
| SPLIT_PART uses 0-based index | SPLIT_PART uses **1-based** indexing |
| TRIM removes substrings | TRIM removes individual characters from the set |
| REPLACE is case-insensitive | REPLACE is **case-sensitive** |

### 12.2 Function Comparison Table

| Task | Function | Example |
|------|----------|---------|
| Combine strings | CONCAT or \|\| | `CONCAT('a', 'b')` |
| Combine with separator | CONCAT_WS | `CONCAT_WS(',', 'a', 'b')` |
| Extract substring | SUBSTR | `SUBSTR(str, 1, 5)` |
| Get part of delimited string | SPLIT_PART | `SPLIT_PART(str, ',', 2)` |
| Convert to array | SPLIT | `SPLIT(str, ',')` |
| Pattern matching | REGEXP/RLIKE | `str REGEXP '^[0-9]+$'` |
| Pattern extraction | REGEXP_SUBSTR | `REGEXP_SUBSTR(str, '[0-9]+')` |
| Pattern replacement | REGEXP_REPLACE | `REGEXP_REPLACE(str, '[0-9]', 'X')` |
| Simple replacement | REPLACE | `REPLACE(str, 'old', 'new')` |
| Character mapping | TRANSLATE | `TRANSLATE(str, 'abc', 'xyz')` |

### 12.3 NULL Handling Summary

| Function | NULL Input Behavior |
|----------|---------------------|
| CONCAT | Propagates NULL (result is NULL) |
| \|\| operator | Propagates NULL (result is NULL) |
| CONCAT_WS | Skips NULL values |
| UPPER/LOWER/INITCAP | Returns NULL |
| TRIM/LTRIM/RTRIM | Returns NULL |
| SUBSTR | Returns NULL |
| REPLACE | Returns NULL |
| REGEXP functions | Return NULL |

---

## 13. Quick Reference

### 13.1 Most Common Functions

| Function | Syntax | Purpose |
|----------|--------|---------|
| CONCAT | `CONCAT(s1, s2, ...)` | Combine strings |
| SUBSTR | `SUBSTR(str, pos, len)` | Extract substring |
| LENGTH | `LENGTH(str)` | Get string length |
| UPPER/LOWER | `UPPER(str)` | Case conversion |
| TRIM | `TRIM(str)` | Remove whitespace |
| REPLACE | `REPLACE(str, old, new)` | Substitute text |
| SPLIT_PART | `SPLIT_PART(str, delim, n)` | Get nth element |
| REGEXP_REPLACE | `REGEXP_REPLACE(str, pattern, repl)` | Pattern replacement |

### 13.2 Index Reference

| Context | Indexing |
|---------|----------|
| SUBSTR start position | 1-based |
| SPLIT_PART part number | 1-based |
| SPLIT array elements | 0-based |
| POSITION return value | 1-based (0 if not found) |
| REGEXP_INSTR return value | 1-based (0 if not found) |

---

## 14. Practice Questions

**Question 1:** What is the result of the following query?
```sql
SELECT CONCAT('Hello', NULL, 'World');
```
- A) NULL
- B) 'HelloWorld'
- C) 'Hello World'
- D) Error

<details>
<summary>Show Answer</summary>

**Answer:** A - Both CONCAT and || propagate NULL. If any input value is NULL, the result is NULL.
</details>

---

**Question 2:** What is the result of this query?
```sql
SELECT 'Hello' || NULL || 'World';
```
- A) 'HelloWorld'
- B) 'Hello World'
- C) NULL
- D) Error

<details>
<summary>Show Answer</summary>

**Answer:** C - The || operator propagates NULL. If any operand is NULL, the result is NULL.
</details>

---

**Question 3:** What does SPLIT_PART('a,b,c,d', ',', -1) return?
- A) 'a'
- B) 'd'
- C) Error
- D) NULL

<details>
<summary>Show Answer</summary>

**Answer:** B - Negative index in SPLIT_PART counts from the end, so -1 returns the last element 'd'.
</details>

---

**Question 4:** Which function would you use to mask all but the last 4 digits of a credit card number?
- A) REPLACE
- B) TRANSLATE
- C) REGEXP_REPLACE
- D) SUBSTR

<details>
<summary>Show Answer</summary>

**Answer:** C - REGEXP_REPLACE is best for pattern-based masking like `REGEXP_REPLACE(card, '[0-9]{4}-[0-9]{4}-[0-9]{4}', '****-****-****')`.
</details>

---

**Question 5:** What is the difference between TRIM('##Hello##', '#') and REPLACE('##Hello##', '##', '')?
- A) Both return 'Hello'
- B) TRIM returns 'Hello', REPLACE returns 'Hello'
- C) TRIM returns 'Hello', REPLACE returns 'Hello'
- D) TRIM removes '#' from ends, REPLACE removes '##' patterns

<details>
<summary>Show Answer</summary>

**Answer:** D - TRIM removes the character '#' from both ends (result: 'Hello'). REPLACE removes the substring '##' wherever it appears (result: 'Hello').
</details>

---

## 15. Study Checklist

- [ ] Know that CONCAT and || both propagate NULL; CONCAT_WS skips NULLs
- [ ] Remember string indexing is 1-based (SUBSTR, POSITION)
- [ ] Remember SPLIT returns array with 0-based indexing
- [ ] Remember SPLIT_PART uses 1-based part numbers
- [ ] Know TRIM removes individual characters, not substrings
- [ ] Understand REPLACE vs TRANSLATE (substring vs character mapping)
- [ ] Know common REGEXP patterns (^, $, [], \d, \w, etc.)
- [ ] Know REGEXP_REPLACE backreference syntax (\\1, \\2)
- [ ] Understand which string functions work in COPY transformations
- [ ] Know case sensitivity of string functions (most are case-sensitive)
- [ ] Remember INITCAP handles word boundaries at non-alphanumeric characters
- [ ] Know CONCAT_WS skips NULL values
