# Screen Implementation Template - HomeScreen Example

## Complete HomeScreen Refactor Pattern

This template shows how to refactor HomeScreen to use the new design components. Apply the same pattern to other screens.

### Import Section (at the top)
```typescript
import { useState, useEffect, type CSSProperties } from 'react'
import { Plus, X, Crown, ChefHat, Lightbulb, Users } from 'lucide-react'
import type { Screen } from '../types'
import { recipeAPI, mealPlanAPI, cookbookAPI } from '../utils/api'
import { recipeImageSrc } from '../utils/image'
import { useApp } from '../context/AppContext'
import { useProPlan } from '../utils/proPlan'
import { DAY_NAMES, MEALS, sameWeek, getMeals, mondayOf } from './MealPlanScreen'
// ADD THIS LINE:
import { InfoCard, StatsGrid, TrackerBox, ActionButton } from '../components/DesignCards'
```

### Key Sections to Replace

#### SECTION 1: Stats Display (NEW)
**Replace this:**
```jsx
// Old way - just text
<div>You have X recipes</div>
<div>Created Y cookbooks</div>
```

**With this:**
```jsx
{!loading && recipes.length > 0 && (
  <StatsGrid stats={[
    { value: recipes.length, label: 'Recipes' },
    { value: cookbooks.length, label: 'Cookbooks' },
    { value: plannedThisWeek, label: 'This Week' }
  ]} />
)}
```

#### SECTION 2: Today's Meals (NEW CARD STYLE)
**Replace this:**
```jsx
// Old way - list view
{todayMeals.map(({ meal, cfg }) => (
  <div onClick={() => onNavigate('detail', meal.recipe)}>
    {meal.recipe?.name || 'No recipe'}
  </div>
))}
```

**With this:**
```jsx
{todayMeals.map(({ meal, cfg }) => (
  <InfoCard
    key={meal.mealId}
    leftBadge={{ label: cfg.name.slice(0, 3).toUpperCase(), value: '🍽️' }}
    title={meal.recipe?.name || 'Add recipe'}
    subtitle={cfg.name}
    rightInfo={meal.time || '—'}
    onClick={() => meal.recipe && onNavigate('detail', meal.recipe)}
  />
))}
```

#### SECTION 3: Meal Tracker (NEW)
**Add this new section:**
```jsx
{!loading && todayMeals.length > 0 && (
  <TrackerBox title="This Week">
    <div className="tracker-item">
      <strong>{plannedThisWeek}</strong> meals planned
    </div>
    <div className="tracker-item">
      <strong>{Math.round((plannedThisWeek / 21) * 100)}%</strong> of the week planned
    </div>
  </TrackerBox>
)}
```

#### SECTION 4: Favorite Recipes (NEW CARD STYLE)
**Replace this:**
```jsx
// Old way - list
{favorites.map(recipe => (
  <div onClick={() => onNavigate('detail', recipe)}>
    {recipe.name}
  </div>
))}
```

**With this:**
```jsx
{favorites.length > 0 && (
  <>
    <h3 style={{ padding: '16px 16px 8px', fontSize: '14px', fontWeight: '600' }}>
      Favorites
    </h3>
    {favorites.map(recipe => (
      <InfoCard
        key={recipe.id}
        leftBadge={{ label: recipe.cuisine?.slice(0, 3).toUpperCase() || '🍳', value: '❤️' }}
        title={recipe.name}
        subtitle={`${recipe.prepTime}m prep • ${recipe.cookTime}m cook`}
        rightInfo={recipe.difficulty}
        onClick={() => onNavigate('detail', recipe)}
      />
    ))}
  </>
)}
```

---

## How to Apply to Other Screens

### BrowseScreen
1. Add `<FilterTabs>` at top for Featured/Popular/New
2. Replace recipe list with `<InfoCard>` cards
3. Left badge: cuisine icon/text
4. Right info: cook time
5. Keep search bar styling

### MealPlanScreen
1. Add `<FilterTabs>` for Week/Month view
2. Add `<StatsGrid>` for today/week/avg stats
3. Replace meal rows with `<InfoCard>` cards
4. Date badge on left (day/month)
5. Time on right

### GroceryListScreen
1. Add `<StatsGrid>` at top (Total/Checked/Remaining)
2. Add `<TrackerBox>` for progress
3. Convert items to info-card style
4. Checkbox on left (use className override)
5. Quantity on right

### SettingsScreen
1. Add profile `<InfoCard>` at top
2. Add `<StatsGrid>` for account stats
3. Add `<TrackerBox>` for trial/pro info
4. Convert settings sections to `<InfoCard>` cards
5. Edit/Change actions on right

---

## CSS Class Overrides (if needed)

```css
/* For custom left elements */
.info-card.checkbox-card .info-card-badge {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

/* For profile card */
.info-card.profile-card {
  background: var(--accent-color);
  color: white;
  padding: 20px;
}

/* For section headers */
h3 {
  padding: 16px 16px 8px;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
```

---

## Testing Checklist

After refactoring each screen:
- [ ] Component renders without errors
- [ ] All data displays correctly
- [ ] Click/navigation works
- [ ] Responsive on mobile (test at 375px width)
- [ ] Dark mode works
- [ ] Badges display correctly
- [ ] Stats grid shows proper numbers

---

## Key Points

1. **Keep all logic the same** - only change the UI structure
2. **Import components at top** - don't add them to every file
3. **Use className for CSS** - all styling is in design-cards.css
4. **Test incrementally** - finish one screen before moving to next
5. **Follow the pattern** - same components used consistently

---

## Files to Modify

1. `src/screens/HomeScreen.tsx` - Use template above
2. `src/screens/BrowseScreen.tsx` - Add FilterTabs + InfoCard cards
3. `src/screens/MealPlanScreen.tsx` - Date badges + stats grid
4. `src/screens/GroceryListScreen.tsx` - Stats + tracker box
5. `src/screens/SettingsScreen.tsx` - Profile card + stats

---

## Next Step

Follow this template for HomeScreen first, test it in the browser, then apply the same pattern to the other 4 screens using the specific guidance in IMPLEMENTATION_GUIDE.md.

Build command:
```bash
npm run build
```

Preview:
```bash
# Terminal will show the local URL
npm run dev
```

