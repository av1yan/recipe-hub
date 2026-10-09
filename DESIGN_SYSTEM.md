# recipHub Design System Redesign
## Based on Modern Card-Based Patterns

---

## Core Design Patterns

### 1. **Card Layout with Side Information**
```
┌─────────────────────────────────────┐
│  [Badge]   Title/Content    [Info]  │
│  [Left]         [Center]    [Right] │
└─────────────────────────────────────┘
```
- **Left:** Date/category badge (circle, number + label)
- **Center:** Primary content (title, description)
- **Right:** Metadata (time, status, count)

### 2. **Filter Tabs**
- Two-button toggle style
- Active/inactive states
- Icon + text optional

### 3. **Stats Grid**
- 3-column layout
- Large numbers + labels
- Highlights key metrics

### 4. **Info Tracker Box**
- Highlighted section
- Related stats grouped
- Visual call-out (border, background)

### 5. **Action Buttons**
- Icon + text
- Full-width or compact
- Clear, actionable

### 6. **Bottom Navigation**
- Icon-based tabs
- 5 primary sections
- Active state indicator

---

## Screen Redesigns

### HOME SCREEN
**Current:** Welcome message, recipe of day, today's meals
**New Layout:**
```
Header: "Good morning, [User]"

[Your Recipes Card]
├─ Circle badge: # of recipes
├─ "You've created X recipes"
└─ View all → 

[Stats Grid]
├─ Box 1: # Recipes
├─ Box 2: # Cookbooks  
└─ Box 3: # Meals Planned

[Next Meal Card]
├─ Date badge (left)
├─ Meal name + recipe (center)
└─ Time (right)

[Quick Actions]
├─ View Favorites
└─ Continue Planning
```

### DISCOVER SCREEN
**Current:** Search + recipe cards
**New Layout:**
```
Header: "Discover Recipes"

[Filter Tabs]
├─ Featured | Popular | New | Trending

[Recipe Cards - New Format]
┌──────────────────────────────┐
│ [Cuisine]  Recipe Name    45m│
│  Badge     Italian Pasta   🕐│
└──────────────────────────────┘
├─ Left: Cuisine circle badge
├─ Center: Recipe name, type
└─ Right: Cook time

[Search Bar with Filter Icon]
```

### MEAL PLAN SCREEN
**Current:** Calendar + add recipe dropdowns
**New Layout:**
```
Header: "Meal Plan"

[Month/Week Tabs]
├─ Week | Month

[Date Cards]
┌──────────────────────────────┐
│ [Sep]  Breakfast         09:00│
│  18    Thai Noodles       🕐 │
└──────────────────────────────┘

[Stats Tracker]
├─ # Meals planned
├─ # Recipes used
└─ Avg cook time

[Add Meal Button - Icon + Text]
```

### GROCERIES SCREEN
**Current:** Checklist
**New Layout:**
```
Header: "Grocery List"

[Stats Grid]
├─ Total items: 12
├─ Checked: 5
└─ Remaining: 7

[Items - Card Format]
┌──────────────────────────────┐
│ [✓]  Spinach        1.5 lbs  │
│  Vegetable         olive oil  │
└──────────────────────────────┘

[Tracker Info]
├─ Progress bar (5/12 checked)
├─ Budget tracker (if applicable)
└─ Last updated
```

### SETTINGS SCREEN
**Current:** Basic menu
**New Layout:**
```
[Profile Card - Top]
├─ User avatar
├─ Name: Demo User
├─ Stats: X recipes, X meals
└─ Edit profile →

[Account Stats Grid]
├─ Account age
├─ Total recipes
└─ Subscriptions

[Settings Sections]
├─ Preferences
├─ Notifications
├─ Account
└─ About

[Trial/Pro Tracker]
├─ Remaining trial days
├─ Features unlocked
└─ Upgrade button
```

---

## Color & Typography (Keep Existing)
- Keep current color scheme
- Keep existing typography
- Focus on **layout and spacing only**

## Implementation Priority
1. ✅ Home Screen
2. ✅ Discover Screen
3. ✅ Meal Plan Screen
4. ✅ Groceries Screen
5. ✅ Settings Screen

---

## Key CSS Changes
- **Card spacing:** 16px padding, 8px gap
- **Badge circles:** 40px diameter, centered number
- **Grid layout:** 3 columns for stats
- **Info tracker:** Border-left accent, subtle background
- **Bottom nav:** Icon-only, 24px icons

