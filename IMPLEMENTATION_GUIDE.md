# Screen Implementation Guide - Design Redesign

## Overview
This guide shows how to update each screen to use the new design patterns. The pattern is consistent across all screens.

---

## Pattern: Info Card with Badge

### Structure
```jsx
import { InfoCard, StatsGrid, FilterTabs, ActionButton } from '../components/DesignCards'

<InfoCard
  leftBadge={{ label: "Sep", value: 18 }}
  title="Recipe Name"
  subtitle="Italian cuisine • 45 min"
  rightInfo="45m"
  onClick={() => navigate('detail', recipe)}
/>
```

### CSS Classes Auto-Applied
- `.info-card` - Container with flexbox
- `.info-card-badge` - Circle badge (50px)
- `.info-card-content` - Title + subtitle
- `.info-card-right` - Right info text

---

## HomeScreen Updates

### Current Structure
```jsx
// Current: Simple list view
<div>Recipe of day</div>
<div>Today's meals</div>
```

### New Structure
```jsx
import { InfoCard, StatsGrid, TrackerBox } from '../components/DesignCards'

// Your Stats Section
<StatsGrid stats={[
  { value: recipes.length, label: "Recipes" },
  { value: cookbooks.length, label: "Cookbooks" },
  { value: plannedThisWeek, label: "This Week" }
]} />

// Upcoming Meals (use InfoCard for each)
{todayMeals.map(({ meal, cfg }) => (
  <InfoCard
    key={cfg.id}
    leftBadge={{ label: cfg.name.slice(0, 3).toUpperCase(), value: '🍽️' }}
    title={meal.recipe?.name || 'No recipe'}
    rightInfo={formatTime(meal.time)}
    onClick={() => onNavigate('detail', meal.recipe)}
  />
))}

// Tracker for upcoming
<TrackerBox title="This Week">
  <div className="tracker-item">
    <strong>{plannedThisWeek}</strong> meals planned
  </div>
  <div className="tracker-item">
    <strong>{recipes.length}</strong> recipes available
  </div>
</TrackerBox>
```

---

## BrowseScreen Updates

### Current Structure
```jsx
// Recipe list
recipes.map(recipe => (
  <div onClick={() => selectRecipe(recipe)}>
    {recipe.name} - {recipe.cuisine}
  </div>
))
```

### New Structure
```jsx
import { InfoCard, FilterTabs } from '../components/DesignCards'

// Filter tabs at top
<FilterTabs
  tabs={[
    { label: "Featured", value: "featured" },
    { label: "Popular", value: "popular" },
    { label: "New", value: "new" }
  ]}
  active={activeFilter}
  onChange={setActiveFilter}
/>

// Recipe cards
{filteredRecipes.map(recipe => (
  <InfoCard
    key={recipe.id}
    leftBadge={{ label: recipe.cuisine.slice(0, 3).toUpperCase(), value: '👨‍🍳' }}
    title={recipe.name}
    subtitle={`${recipe.difficulty} • ${recipe.prepTime}m prep`}
    rightInfo={`${recipe.cookTime}m`}
    onClick={() => onNavigate('detail', recipe)}
  />
))}
```

---

## MealPlanScreen Updates

### Current Structure
```jsx
// Date headers with meal sections
<h2>Friday, Oct 9</h2>
<div>Add breakfast recipe</div>
<div>Add lunch recipe</div>
```

### New Structure
```jsx
import { InfoCard, StatsGrid, FilterTabs } from '../components/DesignCards'

// Month/Week view toggle
<FilterTabs
  tabs={[
    { label: "Week", value: "week" },
    { label: "Month", value: "month" }
  ]}
  active={viewMode}
  onChange={setViewMode}
/>

// Stats tracker
<StatsGrid stats={[
  { value: todayMeals.length, label: "Today" },
  { value: weekMeals.length, label: "This Week" },
  { value: avgCookTime, label: "Avg Time" }
]} />

// Meal cards grouped by date
{groupedMeals.map(({ date, meals }) => (
  <div key={date}>
    <h3>{formatDate(date)}</h3>
    {meals.map(meal => (
      <InfoCard
        key={meal.id}
        leftBadge={{ 
          label: getDateNum(date), 
          value: getMonthShort(date)
        }}
        title={meal.recipe?.name || "No recipe"}
        subtitle={meal.mealType}
        rightInfo={meal.time}
        onClick={() => onNavigate('detail', meal.recipe)}
      />
    ))}
  </div>
))}
```

---

## GroceryListScreen Updates

### Current Structure
```jsx
// Simple checklist
{items.map(item => (
  <label>
    <input type="checkbox" />
    {item.name}
  </label>
))}
```

### New Structure
```jsx
import { InfoCard, StatsGrid, TrackerBox } from '../components/DesignCards'

// Stats at top
<StatsGrid stats={[
  { value: items.length, label: "Total" },
  { value: checkedItems.length, label: "Checked" },
  { value: items.length - checkedItems.length, label: "Remaining" }
]} />

// Tracker box
<TrackerBox title="Progress">
  <div className="tracker-item">
    <strong>{checkedItems.length}/{items.length}</strong> items checked
  </div>
  <div className="tracker-item">
    Estimated budget: <strong>${estimatedCost}</strong>
  </div>
</TrackerBox>

// Item cards
{items.map(item => (
  <div key={item.id} className="info-card">
    <input type="checkbox" checked={item.checked} onChange={() => toggleItem(item)} />
    <div className="info-card-content">
      <div className="info-card-title">{item.name}</div>
      <div className="info-card-subtitle">{item.category}</div>
    </div>
    <div className="info-card-right">{item.quantity} {item.unit}</div>
  </div>
))}
```

---

## SettingsScreen Updates

### Current Structure
```jsx
// Simple settings menu
<div>Account Settings</div>
<div>Preferences</div>
```

### New Structure
```jsx
import { InfoCard, StatsGrid, TrackerBox } from '../components/DesignCards'

// Profile card at top
<InfoCard
  title={user.name}
  subtitle={`Member since ${memberSinceDate}`}
  rightInfo="Edit >"
  onClick={() => onNavigate('profile')}
/>

// Account stats
<StatsGrid stats={[
  { value: recipes.length, label: "Recipes" },
  { value: cookbooks.length, label: "Cookbooks" },
  { value: daysMember, label: "Member" }
]} />

// Trial/Pro tracker
{!isPro && (
  <TrackerBox title="Try Pro Free">
    <div className="tracker-item">
      <strong>{trialDaysRemaining}</strong> days left in trial
    </div>
    <div className="tracker-item">
      Unlock all features and meal planning
    </div>
    <ActionButton 
      text="Start Trial" 
      icon="✨"
      onClick={startTrial}
    />
  </TrackerBox>
)}

// Settings sections
<section>
  <h3>Account</h3>
  <InfoCard title="Email" rightInfo={user.email} />
  <InfoCard title="Password" rightInfo="Change >" onClick={changePassword} />
</section>

<section>
  <h3>Preferences</h3>
  <InfoCard title="Theme" rightInfo={theme} onClick={toggleTheme} />
  <InfoCard title="Units" rightInfo={units} onClick={toggleUnits} />
</section>
```

---

## Implementation Checklist

- [ ] HomeScreen: Update with StatsGrid + InfoCard + TrackerBox
- [ ] BrowseScreen: Add FilterTabs + update recipe cards
- [ ] MealPlanScreen: Add FilterTabs + date cards
- [ ] GroceryListScreen: Add StatsGrid + TrackerBox
- [ ] SettingsScreen: Profile card + StatsGrid + TrackerBox
- [ ] Test all screens in browser
- [ ] Build iOS version
- [ ] Test in iOS simulator
- [ ] Commit changes
- [ ] Deploy

---

## Key Points

1. **Reusability**: Use `<InfoCard>`, `<StatsGrid>`, `<TrackerBox>`, `<FilterTabs>` everywhere
2. **Consistency**: Same patterns apply across all screens
3. **CSS**: All styling is in `design-cards.css` - no inline styles needed
4. **Responsiveness**: CSS is already mobile-responsive
5. **Navigation**: Keep existing navigation logic - only UI structure changes

---

## Component Import
```jsx
import { 
  InfoCard, 
  StatsGrid, 
  FilterTabs, 
  ActionButton, 
  TrackerBox 
} from '../components/DesignCards'
```

All components are in `src/components/DesignCards.tsx`
All styling is in `src/styles/design-cards.css`

