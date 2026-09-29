# Glitches & Design Issues Found

## Summary
Found **5 confirmed issues** across the app affecting UX, data display, and layout.

---

## 🔴 Critical Issues (High Priority)

### 1. **Recipe Picker Dropdown Cut Off at Bottom**
**Location:** MealPlanScreen.tsx (Meal Plan tab)  
**Severity:** Medium  
**Issue:** When clicking "Add a breakfast/lunch/dinner recipe", the dropdown menu appears but is cut off at the bottom of the screen. Users can't see all recipe options without scrolling, and the last visible item is partially hidden.

**Example:**
- Opened Breakfast recipe picker
- "Shakshuka" was cut off at the bottom
- Had to scroll to see the full list

**Fix Needed:** The dropdown should either:
- Scroll up to fit within viewport
- Use a modal/overlay that takes full screen
- Implement virtualization for long lists
- Add max-height with internal scrolling

---

### 2. **Data Formatting Error: "399.999 g" in Groceries**
**Location:** GroceriesScreen.tsx  
**Severity:** Low  
**Issue:** Ingredient quantities displayed with excessive decimal places. "Rice noodles" shows "399.999 g" instead of "400 g" or similar clean value.

**Root Cause:** Likely:
- Float rounding issue in calculations
- Missing number formatting/rounding in display
- Data import error that didn't clean up values

**Fix Needed:** Implement quantity formatting that:
- Rounds to 2 decimal places max
- Removes trailing zeros
- Formats numbers appropriately for the unit (e.g., "g", "tbsp", etc.)

**Example Fix:**
```typescript
const formatQuantity = (quantity: number, unit: string) => {
  const rounded = Math.round(quantity * 100) / 100;
  return `${rounded} ${unit}`;
};
```

---

## 🟡 Medium Priority Issues

### 3. **Inconsistent Capitalization in Grocery List**
**Location:** GroceriesScreen.tsx  
**Severity:** Low/UX Polish  
**Issue:** Grocery item names have inconsistent capitalization:
- "Soy sauce" ✓ (capitalized)
- "Rice noodles" ✓ (capitalized)
- "Garlic" ✓ (capitalized)
- **"spinach"** ✗ (lowercase)
- **"olive oil"** ✗ (lowercase)

**Fix Needed:** Capitalize first letter of all ingredient names
```typescript
const capitalizeFirstLetter = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};
```

---

### 4. **Recipe with Zero Time Display**
**Location:** MealPlanScreen.tsx (Recipe Picker)  
**Severity:** Low/Data Quality  
**Issue:** "Baked chicken beast" recipe shows "0 min" for cooking time, which looks like:
- Missing data
- Incomplete recipe entry
- Data error during import

**Fix Needed:**
- Validate that all recipes have prepTime + cookTime > 0
- Hide "0 min" display or show "N/A" instead
- Add backend validation to prevent recipes with zero time from being saved

---

## 🟢 Lower Priority / Polish Issues

### 5. **Recipe Name Typo: "Baked chicken beast"**
**Location:** Database/Recipe seed data  
**Severity:** Very Low/Data Quality  
**Issue:** Recipe appears to be misnamed - "beast" is unusual for a recipe name. Likely should be:
- "Baked chicken breast" (most likely)
- "Baked chicken" (simplified)

**Fix Needed:** Check seed data and correct recipe name

---

## Summary Table

| Issue | Location | Severity | Type | Fix Complexity |
|-------|----------|----------|------|-----------------|
| Dropdown cut off | MealPlanScreen | Medium | Layout | Medium |
| "399.999 g" display | GroceriesScreen | Low | Data Format | Low |
| Lowercase names | GroceriesScreen | Low | UX Polish | Low |
| "0 min" display | Recipe data | Low | Data Quality | Low |
| "beast" typo | Recipe data | Very Low | Data Quality | Very Low |

---

## Recommended Fix Order

1. **First:** Fix dropdown cut-off (Medium severity, affects UX)
2. **Second:** Fix quantity formatting "399.999 g" (Low but visible)
3. **Third:** Fix capitalization inconsistency (UX polish)
4. **Fourth:** Fix zero-time recipe display (Data quality)
5. **Fifth:** Fix recipe name typo (Cosmetic)

---

## Testing Performed

✅ HomeScreen - Layout and content display  
✅ Browse/Discover - Search and categories  
✅ Meal Plan - Calendar and recipe picker dropdown  
✅ Groceries - List display and formatting  
✅ Settings/Subscription - Trial banner display  
✅ Navigation - Tab switching between screens  

---

## Notes

- Most issues are cosmetic or data-quality related
- The dropdown cut-off is the most impactful UX issue
- Data formatting issues suggest need for better number handling utility
- No major functional breaks found, but small polish needed before production
