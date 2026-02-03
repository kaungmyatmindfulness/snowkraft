# Domain 5: Data Transformations - Part 9

## Numeric and Mathematical Functions

### Overview

Snowflake provides a comprehensive set of numeric and mathematical functions for performing calculations, rounding operations, and mathematical transformations on numeric data. These functions are scalar functions, meaning they return one value per input row.

**Key Concept**: All numeric functions in Snowflake are scalar functions that operate on numeric data types (NUMBER, FLOAT, INTEGER, etc.) and return numeric results.

---

## 1. Rounding Functions

Rounding functions modify numeric values by adjusting decimal precision. Understanding the differences between these functions is critical for the exam.

### ROUND

Rounds a numeric value to the specified number of decimal places.

**Syntax:**
```sql
ROUND(input_expr [, scale_expr [, rounding_mode]])
```

**Parameters:**
- `input_expr`: The numeric value to round
- `scale_expr`: Number of decimal places (default: 0)
- `rounding_mode`: 'HALF_AWAY_FROM_ZERO' (default) or 'HALF_TO_EVEN' (banker's rounding)

**Examples:**
```sql
-- Basic rounding (default: 0 decimal places)
SELECT ROUND(2.5);           -- Returns: 3
SELECT ROUND(2.4);           -- Returns: 2
SELECT ROUND(-2.5);          -- Returns: -3

-- Rounding to specific decimal places
SELECT ROUND(123.456, 2);    -- Returns: 123.46
SELECT ROUND(123.456, 1);    -- Returns: 123.5
SELECT ROUND(123.456, 0);    -- Returns: 123
SELECT ROUND(123.456, -1);   -- Returns: 120 (rounds to nearest 10)
SELECT ROUND(123.456, -2);   -- Returns: 100 (rounds to nearest 100)

-- Banker's rounding (HALF_TO_EVEN)
SELECT ROUND(2.5, 0, 'HALF_TO_EVEN');   -- Returns: 2 (rounds to even)
SELECT ROUND(3.5, 0, 'HALF_TO_EVEN');   -- Returns: 4 (rounds to even)
SELECT ROUND(4.5, 0, 'HALF_TO_EVEN');   -- Returns: 4 (rounds to even)
```

**Exam Tip**: HALF_AWAY_FROM_ZERO is the default rounding mode. Banker's rounding (HALF_TO_EVEN) rounds .5 values to the nearest even number to reduce cumulative rounding bias.

### TRUNCATE / TRUNC

Truncates a numeric value to the specified number of decimal places by removing digits without rounding.

**Syntax:**
```sql
TRUNCATE(input_expr [, scale_expr])
TRUNC(input_expr [, scale_expr])
```

**Examples:**
```sql
-- Basic truncation
SELECT TRUNC(2.9);           -- Returns: 2 (not 3!)
SELECT TRUNC(-2.9);          -- Returns: -2 (not -3!)
SELECT TRUNC(123.456, 2);    -- Returns: 123.45
SELECT TRUNC(123.456, 1);    -- Returns: 123.4
SELECT TRUNC(123.456, -1);   -- Returns: 120
SELECT TRUNC(123.456, -2);   -- Returns: 100
```

**Key Difference from ROUND**: TRUNCATE always moves toward zero; ROUND moves to the nearest value.

### FLOOR

Returns the largest integer less than or equal to the input value.

**Syntax:**
```sql
FLOOR(input_expr)
```

**Examples:**
```sql
SELECT FLOOR(2.9);           -- Returns: 2
SELECT FLOOR(2.1);           -- Returns: 2
SELECT FLOOR(-2.1);          -- Returns: -3 (not -2!)
SELECT FLOOR(-2.9);          -- Returns: -3
```

**Key Concept**: FLOOR always rounds DOWN (toward negative infinity), regardless of sign.

### CEIL / CEILING

Returns the smallest integer greater than or equal to the input value.

**Syntax:**
```sql
CEIL(input_expr)
CEILING(input_expr)  -- Alias for CEIL
```

**Examples:**
```sql
SELECT CEIL(2.1);            -- Returns: 3
SELECT CEIL(2.9);            -- Returns: 3
SELECT CEIL(-2.1);           -- Returns: -2 (not -3!)
SELECT CEIL(-2.9);           -- Returns: -2
```

**Key Concept**: CEIL always rounds UP (toward positive infinity), regardless of sign.

### Rounding Functions Comparison

| Value | ROUND | TRUNC | FLOOR | CEIL |
|-------|-------|-------|-------|------|
| 2.5   | 3     | 2     | 2     | 3    |
| 2.1   | 2     | 2     | 2     | 3    |
| -2.1  | -2    | -2    | -3    | -2   |
| -2.5  | -3    | -2    | -3    | -2   |
| -2.9  | -3    | -2    | -3    | -2   |

**Critical Insight**:
- FLOOR always goes toward negative infinity
- CEIL always goes toward positive infinity
- TRUNC always goes toward zero
- ROUND goes to the nearest integer

---

## 2. Sign and Absolute Value Functions

### ABS

Returns the absolute (positive) value of a numeric expression.

**Syntax:**
```sql
ABS(input_expr)
```

**Examples:**
```sql
SELECT ABS(-15);             -- Returns: 15
SELECT ABS(15);              -- Returns: 15
SELECT ABS(-3.14);           -- Returns: 3.14
SELECT ABS(0);               -- Returns: 0
```

**Use Cases:**
- Calculate distance differences regardless of direction
- Ensure positive values in calculations
- Find magnitude of deviation from a target

### SIGN

Returns the sign of a numeric value as -1, 0, or 1.

**Syntax:**
```sql
SIGN(input_expr)
```

**Return Values:**
- `-1` if the value is negative
- `0` if the value is zero
- `1` if the value is positive

**Examples:**
```sql
SELECT SIGN(-15);            -- Returns: -1
SELECT SIGN(0);              -- Returns: 0
SELECT SIGN(42);             -- Returns: 1
SELECT SIGN(-3.14);          -- Returns: -1
```

**Use Cases:**
- Determine if a value is positive, negative, or zero
- Categorize profit/loss in financial data
- Create conditional logic based on sign

```sql
-- Categorize transactions
SELECT
    amount,
    CASE SIGN(amount)
        WHEN 1 THEN 'Credit'
        WHEN -1 THEN 'Debit'
        ELSE 'Zero'
    END AS transaction_type
FROM transactions;
```

---

## 3. Division and Remainder Functions

### MOD

Returns the remainder after division (modulo operation).

**Syntax:**
```sql
MOD(dividend, divisor)
```

**Examples:**
```sql
SELECT MOD(10, 3);           -- Returns: 1 (10 = 3*3 + 1)
SELECT MOD(17, 5);           -- Returns: 2 (17 = 5*3 + 2)
SELECT MOD(15, 5);           -- Returns: 0 (evenly divisible)
SELECT MOD(-10, 3);          -- Returns: -1
SELECT MOD(10, -3);          -- Returns: 1
```

**Use Cases:**
- Check if a number is even or odd: `MOD(value, 2) = 0` means even
- Distribute items into groups
- Implement cyclic patterns

```sql
-- Check for even/odd
SELECT
    id,
    CASE WHEN MOD(id, 2) = 0 THEN 'Even' ELSE 'Odd' END AS parity
FROM items;

-- Distribute rows into 4 buckets
SELECT
    id,
    MOD(id, 4) AS bucket_number
FROM data_table;
```

### DIV0 and DIV0NULL

Special division functions that handle division by zero.

**DIV0**: Returns 0 when dividing by zero instead of an error.

```sql
SELECT DIV0(10, 0);          -- Returns: 0 (not an error)
SELECT DIV0(10, 2);          -- Returns: 5
SELECT 10 / 0;               -- Returns: Error!
```

**DIV0NULL**: Returns NULL when dividing by zero.

```sql
SELECT DIV0NULL(10, 0);      -- Returns: NULL
SELECT DIV0NULL(10, 2);      -- Returns: 5
```

**Exam Tip**: Use DIV0 or DIV0NULL to safely handle division operations where the divisor might be zero.

---

## 4. Exponential and Logarithmic Functions

### POWER / POW

Raises a number to a specified power.

**Syntax:**
```sql
POWER(base, exponent)
POW(base, exponent)  -- Alias
```

**Examples:**
```sql
SELECT POWER(2, 3);          -- Returns: 8 (2^3)
SELECT POWER(10, 2);         -- Returns: 100
SELECT POWER(4, 0.5);        -- Returns: 2 (square root of 4)
SELECT POWER(27, 1.0/3);     -- Returns: 3 (cube root of 27)
SELECT POWER(2, -1);         -- Returns: 0.5 (1/2)
```

### SQRT

Returns the square root of a non-negative number.

**Syntax:**
```sql
SQRT(input_expr)
```

**Examples:**
```sql
SELECT SQRT(16);             -- Returns: 4
SELECT SQRT(2);              -- Returns: 1.4142135...
SELECT SQRT(0);              -- Returns: 0
SELECT SQRT(-1);             -- Returns: NULL (or error)
```

**Note**: SQRT of a negative number returns NULL in Snowflake.

### CBRT

Returns the cube root of a number.

**Syntax:**
```sql
CBRT(input_expr)
```

**Examples:**
```sql
SELECT CBRT(27);             -- Returns: 3
SELECT CBRT(-27);            -- Returns: -3 (works with negatives)
SELECT CBRT(8);              -- Returns: 2
```

### SQUARE

Returns the square of a number (value raised to power of 2).

**Syntax:**
```sql
SQUARE(input_expr)
```

**Examples:**
```sql
SELECT SQUARE(5);            -- Returns: 25
SELECT SQUARE(-4);           -- Returns: 16
SELECT SQUARE(1.5);          -- Returns: 2.25
```

### EXP

Returns e (Euler's number, approximately 2.71828) raised to the specified power.

**Syntax:**
```sql
EXP(input_expr)
```

**Examples:**
```sql
SELECT EXP(1);               -- Returns: 2.71828... (e^1)
SELECT EXP(0);               -- Returns: 1 (e^0 = 1)
SELECT EXP(2);               -- Returns: 7.38905... (e^2)
```

### Logarithmic Functions

| Function | Description | Example |
|----------|-------------|---------|
| `LN(x)` | Natural logarithm (base e) | `LN(2.71828) = 1` |
| `LOG(base, x)` | Logarithm with specified base | `LOG(10, 100) = 2` |
| `LOG10(x)` | Common logarithm (base 10) | `LOG10(100) = 2` |

**Examples:**
```sql
SELECT LN(EXP(1));           -- Returns: 1
SELECT LN(10);               -- Returns: 2.302585...

SELECT LOG(10, 100);         -- Returns: 2 (10^2 = 100)
SELECT LOG(2, 8);            -- Returns: 3 (2^3 = 8)

SELECT LOG10(1000);          -- Returns: 3 (10^3 = 1000)
```

**Exam Tip**: Remember the relationship: `LOG(base, x) = LN(x) / LN(base)`

---

## 5. Trigonometric Functions

Snowflake provides a full set of trigonometric functions. All angle arguments and return values are in **radians**, not degrees.

### Basic Trigonometric Functions

| Function | Description |
|----------|-------------|
| `SIN(x)` | Sine of x (radians) |
| `COS(x)` | Cosine of x (radians) |
| `TAN(x)` | Tangent of x (radians) |
| `COT(x)` | Cotangent of x (radians) |

**Examples:**
```sql
SELECT SIN(0);               -- Returns: 0
SELECT COS(0);               -- Returns: 1
SELECT TAN(0);               -- Returns: 0
SELECT SIN(PI()/2);          -- Returns: 1 (sin of 90 degrees)
SELECT COS(PI());            -- Returns: -1 (cos of 180 degrees)
```

### Inverse Trigonometric Functions

| Function | Description | Return Range |
|----------|-------------|--------------|
| `ASIN(x)` | Arc sine | [-PI/2, PI/2] |
| `ACOS(x)` | Arc cosine | [0, PI] |
| `ATAN(x)` | Arc tangent | [-PI/2, PI/2] |
| `ATAN2(y, x)` | Arc tangent of y/x | [-PI, PI] |

**Examples:**
```sql
SELECT ASIN(1);              -- Returns: 1.5707... (PI/2)
SELECT ACOS(0);              -- Returns: 1.5707... (PI/2)
SELECT ATAN(1);              -- Returns: 0.7853... (PI/4)
SELECT ATAN2(1, 1);          -- Returns: 0.7853... (PI/4)
```

### Hyperbolic Functions

| Function | Description |
|----------|-------------|
| `SINH(x)` | Hyperbolic sine |
| `COSH(x)` | Hyperbolic cosine |
| `TANH(x)` | Hyperbolic tangent |

### Angle Conversion Functions

| Function | Description |
|----------|-------------|
| `RADIANS(degrees)` | Converts degrees to radians |
| `DEGREES(radians)` | Converts radians to degrees |
| `PI()` | Returns the value of Pi (~3.14159) |

**Examples:**
```sql
SELECT PI();                 -- Returns: 3.14159265...
SELECT RADIANS(180);         -- Returns: 3.14159... (PI)
SELECT DEGREES(PI());        -- Returns: 180

-- Calculate sine of 45 degrees
SELECT SIN(RADIANS(45));     -- Returns: 0.7071...
```

---

## 6. Random Number Generation

### RANDOM

Generates a random 64-bit integer.

**Syntax:**
```sql
RANDOM([seed])
```

**Examples:**
```sql
-- Generate random number (different each time)
SELECT RANDOM();             -- Returns: random 64-bit integer

-- Generate repeatable random number with seed
SELECT RANDOM(12345);        -- Returns: same value each time with same seed

-- Generate random number between 0 and 1
SELECT UNIFORM(0::FLOAT, 1::FLOAT, RANDOM());

-- Generate random integer between 1 and 100
SELECT UNIFORM(1, 100, RANDOM());
```

### UNIFORM

Generates uniformly distributed random values within a specified range.

**Syntax:**
```sql
UNIFORM(min, max, random_generator)
```

**Examples:**
```sql
-- Random float between 0 and 1
SELECT UNIFORM(0::FLOAT, 1::FLOAT, RANDOM());

-- Random integer between 1 and 100 (inclusive)
SELECT UNIFORM(1, 100, RANDOM());

-- Generate 10 random values
SELECT UNIFORM(1, 100, RANDOM()) AS random_value
FROM TABLE(GENERATOR(ROWCOUNT => 10));
```

### NORMAL

Generates normally distributed random values (Gaussian distribution).

**Syntax:**
```sql
NORMAL(mean, stddev, random_generator)
```

**Examples:**
```sql
-- Generate normally distributed values with mean=100, stddev=15
SELECT NORMAL(100, 15, RANDOM());
```

### Random Sampling vs Random Functions

| Use Case | Method |
|----------|--------|
| Generate random values | RANDOM(), UNIFORM(), NORMAL() |
| Select random rows | SAMPLE clause |
| Reproducible randomness | Use SEED parameter |

**Important**: Random functions like `RANDOM()` prevent result cache usage because they are non-deterministic.

---

## 7. Other Useful Numeric Functions

### GREATEST / LEAST

Returns the maximum or minimum value from a list of expressions.

**Syntax:**
```sql
GREATEST(expr1, expr2, ...)
LEAST(expr1, expr2, ...)
```

**Examples:**
```sql
SELECT GREATEST(5, 3, 9, 1);     -- Returns: 9
SELECT LEAST(5, 3, 9, 1);        -- Returns: 1
SELECT GREATEST(10, NULL, 5);   -- Returns: NULL (if any NULL)
```

**Exam Tip**: GREATEST and LEAST return NULL if any argument is NULL. Use COALESCE or IFNULL to handle NULLs.

### NULLIFZERO / ZEROIFNULL

Utility functions for handling zeros and nulls.

**Syntax:**
```sql
NULLIFZERO(input_expr)   -- Returns NULL if input is 0
ZEROIFNULL(input_expr)   -- Returns 0 if input is NULL
```

**Examples:**
```sql
SELECT NULLIFZERO(0);        -- Returns: NULL
SELECT NULLIFZERO(5);        -- Returns: 5
SELECT ZEROIFNULL(NULL);     -- Returns: 0
SELECT ZEROIFNULL(10);       -- Returns: 10

-- Useful for safe division
SELECT amount / NULLIFZERO(quantity);  -- Avoids divide by zero
```

### WIDTH_BUCKET

Assigns values to buckets (bins) for histogram-style analysis.

**Syntax:**
```sql
WIDTH_BUCKET(expr, min, max, num_buckets)
```

**Examples:**
```sql
-- Create 10 buckets for values 0-100
SELECT WIDTH_BUCKET(score, 0, 100, 10) AS bucket
FROM test_scores;

-- Values outside range: 0 (below min), num_buckets+1 (above max)
SELECT WIDTH_BUCKET(150, 0, 100, 10);  -- Returns: 11 (overflow bucket)
SELECT WIDTH_BUCKET(-5, 0, 100, 10);   -- Returns: 0 (underflow bucket)
```

### BITAND, BITOR, BITXOR, BITNOT

Bitwise operations on integer values.

```sql
SELECT BITAND(12, 10);       -- Returns: 8 (binary AND)
SELECT BITOR(12, 10);        -- Returns: 14 (binary OR)
SELECT BITXOR(12, 10);       -- Returns: 6 (binary XOR)
SELECT BITNOT(12);           -- Returns: -13 (binary NOT)
```

### BITSHIFTLEFT / BITSHIFTRIGHT

Shift bits left or right.

```sql
SELECT BITSHIFTLEFT(1, 3);   -- Returns: 8 (1 << 3)
SELECT BITSHIFTRIGHT(8, 2);  -- Returns: 2 (8 >> 2)
```

---

## 8. Common Calculation Patterns

### Percentage Calculations

```sql
-- Calculate percentage of total
SELECT
    category,
    sales,
    ROUND(100.0 * sales / SUM(sales) OVER(), 2) AS pct_of_total
FROM sales_data;

-- Calculate year-over-year change
SELECT
    year,
    revenue,
    ROUND(100.0 * (revenue - LAG(revenue) OVER (ORDER BY year))
          / NULLIFZERO(LAG(revenue) OVER (ORDER BY year)), 2) AS yoy_pct_change
FROM annual_revenue;
```

### Distance Calculations (Euclidean)

```sql
-- 2D distance between two points
SELECT SQRT(POWER(x2 - x1, 2) + POWER(y2 - y1, 2)) AS distance
FROM coordinates;

-- 3D distance
SELECT SQRT(POWER(x2 - x1, 2) + POWER(y2 - y1, 2) + POWER(z2 - z1, 2)) AS distance
FROM coordinates_3d;
```

### Compound Interest

```sql
-- Calculate compound interest
-- Principal * (1 + rate)^periods
SELECT principal * POWER(1 + annual_rate, years) AS future_value
FROM investments;
```

### Statistical Calculations

```sql
-- Calculate standard deviation manually
SELECT SQRT(AVG(POWER(value - avg_value, 2))) AS manual_stddev
FROM (
    SELECT value, AVG(value) OVER() AS avg_value
    FROM measurements
);

-- Or use built-in STDDEV function
SELECT STDDEV(value) AS stddev
FROM measurements;
```

### Binning/Bucketing Data

```sql
-- Create age groups
SELECT
    customer_id,
    age,
    CASE
        WHEN age < 18 THEN 'Minor'
        WHEN age < 30 THEN '18-29'
        WHEN age < 50 THEN '30-49'
        WHEN age < 65 THEN '50-64'
        ELSE '65+'
    END AS age_group
FROM customers;

-- Using WIDTH_BUCKET for equal-width bins
SELECT
    score,
    WIDTH_BUCKET(score, 0, 100, 10) AS score_decile
FROM test_results;
```

---

## 9. Numeric Data Types Quick Reference

| Type | Description | Range/Precision |
|------|-------------|-----------------|
| `NUMBER(p,s)` | Fixed-point decimal | Up to 38 digits precision |
| `DECIMAL(p,s)` | Alias for NUMBER | Same as NUMBER |
| `INT/INTEGER` | Whole numbers | Up to 38 digits |
| `FLOAT/DOUBLE` | Floating-point | ~15 significant digits |
| `REAL` | Alias for FLOAT | Same as FLOAT |

**Exam Tip**: NUMBER is the default and most precise numeric type. FLOAT is used for scientific calculations where exact precision is not required.

---

## Exam Tips and Common Question Patterns

### High-Priority Topics

1. **Rounding Function Differences**
   - Know exactly how ROUND, TRUNC, FLOOR, and CEIL behave with negative numbers
   - FLOOR goes toward negative infinity (-2.1 becomes -3)
   - CEIL goes toward positive infinity (-2.1 becomes -2)
   - TRUNC goes toward zero (-2.9 becomes -2)

2. **Division by Zero Handling**
   - Standard division (/) raises an error
   - DIV0 returns 0
   - DIV0NULL returns NULL
   - NULLIFZERO converts 0 to NULL for safe division

3. **Random Number Generation**
   - RANDOM() with a seed produces repeatable results
   - RANDOM() without seed is different each call
   - Non-deterministic functions prevent result cache hits

4. **Trigonometric Functions**
   - All angles are in RADIANS, not degrees
   - Use RADIANS() and DEGREES() for conversion

### Common Exam Question Patterns

**Q: What does FLOOR(-2.5) return?**
- **Answer: -3** (FLOOR always rounds toward negative infinity)

**Q: What is the difference between TRUNC(-2.5) and FLOOR(-2.5)?**
- TRUNC(-2.5) = -2 (rounds toward zero)
- FLOOR(-2.5) = -3 (rounds toward negative infinity)

**Q: How do you safely divide when the divisor might be zero?**
```sql
-- Use DIV0 to return 0
SELECT DIV0(numerator, denominator);

-- Use DIV0NULL to return NULL
SELECT DIV0NULL(numerator, denominator);

-- Use NULLIFZERO
SELECT numerator / NULLIFZERO(denominator);
```

**Q: What is the default rounding mode for ROUND()?**
- **Answer: HALF_AWAY_FROM_ZERO** (rounds .5 away from zero)

**Q: How do you generate a random integer between 1 and 100?**
```sql
SELECT UNIFORM(1, 100, RANDOM());
```

**Q: Why might a query not use result cache?**
- Contains non-deterministic functions like RANDOM(), CURRENT_TIMESTAMP()
- Underlying data has changed

### Key Concepts to Remember

| Concept | Key Point |
|---------|-----------|
| Rounding Default | HALF_AWAY_FROM_ZERO (2.5 rounds to 3) |
| FLOOR Direction | Always toward negative infinity |
| CEIL Direction | Always toward positive infinity |
| TRUNC Direction | Always toward zero |
| Trig Unit | Radians (not degrees) |
| MOD Sign | Result takes sign of dividend |
| DIV0 Purpose | Return 0 instead of error on divide-by-zero |
| RANDOM Seed | Makes random values reproducible |
| GREATEST/LEAST NULL | Returns NULL if any input is NULL |

### Practice Problems

1. Calculate the floor of -3.7:
   ```sql
   SELECT FLOOR(-3.7);  -- Returns: -4
   ```

2. Round 12.345 to 2 decimal places with banker's rounding:
   ```sql
   SELECT ROUND(12.345, 2, 'HALF_TO_EVEN');  -- Returns: 12.34
   ```

3. Check if a number is even:
   ```sql
   SELECT CASE WHEN MOD(value, 2) = 0 THEN 'Even' ELSE 'Odd' END;
   ```

4. Convert 45 degrees to radians:
   ```sql
   SELECT RADIANS(45);  -- Returns: 0.7853981...
   ```

5. Generate a random percentage (0-100):
   ```sql
   SELECT ROUND(UNIFORM(0::FLOAT, 100::FLOAT, RANDOM()), 2);
   ```

---

## Summary

Snowflake's numeric and mathematical functions provide comprehensive capabilities for:

- **Rounding**: ROUND, TRUNC, FLOOR, CEIL with different behaviors
- **Sign Operations**: ABS, SIGN for handling positive/negative values
- **Division**: MOD, DIV0, DIV0NULL for safe arithmetic
- **Powers/Roots**: POWER, SQRT, CBRT, EXP for exponential calculations
- **Logarithms**: LN, LOG, LOG10 for logarithmic transformations
- **Trigonometry**: Full suite of trig functions (angles in radians)
- **Random Values**: RANDOM, UNIFORM, NORMAL for random generation
- **Utilities**: GREATEST, LEAST, NULLIFZERO, WIDTH_BUCKET

Understanding the subtle differences between similar functions (especially ROUND vs TRUNC vs FLOOR vs CEIL) and how to handle edge cases (division by zero, negative numbers, NULLs) is essential for both the SnowPro Core exam and practical Snowflake development.
