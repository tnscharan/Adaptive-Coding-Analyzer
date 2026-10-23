# Sample Programs

## 1. Add Two Numbers (Python)

`add_numbers.py`

```python
def add(a, b):
    return a + b

num1 = 15
num2 = 25
result = add(num1, num2)

print(f"The sum of {num1} and {num2} is: {result}")
```

---

## 2. Even or Odd Checker (Python)

`even_odd.py`

```python
def check_even_odd(number):
    if number % 2 == 0:
        return "Even"
    else:
        return "Odd"

val = 7
print(f"{val} is {check_even_odd(val)}")
```

---

## 3. Sum Numbers 1 to 5 (Python)

`sum_loop.py`

```python
total = 0

for i in range(1, 6):
    total += i
    print(f"Adding {i}, Current Total = {total}")

print("Final Total:", total)
```

---

## 4. Multiplication Table (C)

`table.c`

```c
#include <stdio.h>

int main() {
    int number = 5;

    for (int i = 1; i <= 5; i++) {
        printf("%d x %d = %d\n", number, i, number * i);
    }

    return 0;
}
```

---

## 5. Find Greater Number (C++)

`max_number.cpp`

```cpp
#include <iostream>

int find_max(int a, int b) {
    if (a > b) {
        return a;
    }
    return b;
}

int main() {
    int x = 20;
    int y = 45;
    std::cout << "The greater number is: " << find_max(x, y) << std::endl;
    return 0;
}
```

---

## 6. Array Sum (Java)

`Main.java`

```java
public class Main {
    public static void main(String[] args) {
        int[] numbers = {10, 20, 30};
        int sum = 0;

        for (int num : numbers) {
            sum += num;
        }

        System.out.println("Total Sum: " + sum);
    }
}
```
