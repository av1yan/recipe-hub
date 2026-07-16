# recipHub 🍳

A modern recipe and meal planning application that helps you discover, save, and organize recipes while planning your weekly meals.

## Features

- 📖 **Recipe Browser** - Discover recipes with live search by name and cuisine
- 📅 **Meal Planning** - Plan your weekly meals with an interactive calendar interface
- 🛒 **Grocery Lists** - Automatically generate shopping lists from your meal plans
- 📚 **Cookbooks** - Organize recipes into personal cookbook collections
- 🔐 **User Authentication** - Secure account management with JWT tokens
- 💾 **Recipe Management** - Create, save, and manage your personal recipe collection
- ✨ **Beautiful UI** - Modern, responsive design with smooth animations

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Icons**: Lucide React
- **State Management**: React Context API
- **Styling**: CSS-in-JS with inline styles
- **API Client**: Fetch API with custom wrapper

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Backend API running (see backend setup)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/av1yan/recipe-hub.git
cd recipe-hub
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (optional, for custom API URL):
```env
VITE_API_URL=http://localhost:5001
```

4. Start the development server:
```bash
npm run dev
```

5. Open your browser to `http://localhost:5173`

### Build for Production

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
├── screens/              # Main application screens
│   ├── SplashScreen.tsx
│   ├── SignInScreen.tsx
│   ├── HomeScreen.tsx
│   ├── BrowseScreen.tsx
│   ├── MealPlanScreen.tsx
│   ├── GroceryListScreen.tsx
│   ├── CookbooksScreen.tsx
│   └── ...
├── components/           # Reusable UI components
│   └── BottomNavigation.tsx
├── utils/
│   ├── api.ts           # API client and endpoints
│   └── ...
├── context/             # React Context for state
│   └── AppContext.tsx
├── types/               # TypeScript type definitions
│   └── index.ts
└── App.tsx              # Main app component
```

## Usage

### Authentication

1. Sign up or log in with your email and password
2. Your authentication token is automatically stored locally
3. You'll be logged in automatically on next visit

### Adding Recipes

1. Click the **"+ Add Recipe"** button on the home screen
2. Fill in recipe details (name, cuisine, prep/cook time, ingredients, instructions)
3. Save your recipe

### Planning Meals

1. Go to the **Meal Plan** tab
2. Click the **"Generate Meal Plan"** button to create a new meal plan
3. Click the **"+"** button on any day/meal type to add a recipe
4. Select a recipe from the modal
5. View your completed meal plan

### Managing Grocery Lists

1. Go to the **Grocery List** tab
2. View items generated from your meal plans
3. Check off items as you shop
4. Add custom items as needed

### Creating Cookbooks

1. Go to the **Cookbooks** tab
2. Click **"+"** to create a new cookbook
3. Add recipes to your cookbooks for organization

## API Endpoints

The app communicates with the backend API at `http://localhost:5001`. Key endpoints:

- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Sign in
- `GET /api/recipes` - Fetch recipes
- `POST /api/meal-plans` - Create meal plan
- `POST /api/meal-plans/:id/meals` - Add meal to plan
- `GET /api/grocery-lists` - Fetch grocery lists
- `GET /api/cookbooks` - Fetch cookbooks

See the backend README for complete API documentation.

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run type-check` - Run TypeScript type checking

### Architecture Notes

- **Authentication**: JWT tokens stored in localStorage
- **State Management**: React Context for global app state
- **API Integration**: Centralized API client in `utils/api.ts`
- **Responsive Design**: Mobile-first approach with CSS flexbox/grid

## Browser Support

- Chrome (latest)
- Safari (latest)
- Firefox (latest)
- Edge (latest)

## Performance

- Optimized with Vite for fast dev server startup
- Lazy loading of screens
- Minimal re-renders with Context API
- CSS animations for smooth user interactions

## License

MIT

## Support

For issues or questions, please open an issue on GitHub at [av1yan/recipe-hub](https://github.com/av1yan/recipe-hub/issues)
