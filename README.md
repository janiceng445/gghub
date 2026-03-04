# GGTools - GG.Tools

A modern, dark-themed toolkit application with three main features:
- **Tip Calculator** - Calculate tips and bill splits with rounding options
- **Gas Calculator** - Estimate gas costs for your vehicle
- **Recipe Book** - Manage your recipes with scaling, photos, and AI generation

## Project Structure

```
├── index.html              # Main HTML entry point
├── css/                    # Stylesheets
│   ├── variables.css      # CSS variables & theme colors
│   ├── base.css           # Base layout & typography
│   ├── navigation.css     # Top nav & sidebar styles
│   ├── forms.css          # Form elements & buttons
│   ├── modal.css          # Modal dialogs
│   ├── tip-calculator.css # Tip calculator styles
│   ├── gas-calculator.css # Gas calculator styles
│   └── recipe-book.css    # Recipe book styles
├── js/                     # JavaScript modules
│   ├── main.js            # Navigation, modals, utilities
│   ├── tip-calculator.js  # Tip calculator logic
│   ├── gas-calculator.js  # Gas calculator & vehicle data
│   └── recipe-book.js     # Recipe management & AI integration
├── README.md              # This file
└── .gitignore             # Git ignore rules
```

## Features

### Tip Calculator
- Enter bill amount and select tip percentage
- Quick preset buttons (10%, 15%, 18%, 20%, 25%)
- Custom tip percentage option
- View rounding up/down options
- Clean, responsive interface

### Gas Calculator
- Select vehicle make and model
- Auto-populated tank sizes for most vehicles
- Save favorite vehicles to "My Garage"
- Set default vehicle
- Calculate fill-up costs based on current gas price
- Track gas level percentage

### Recipe Book
- Create recipes manually or with AI
- Scale ingredients based on servings
- Convert between US and metric units
- Add photos with dates
- Ingredient checklist with strikethrough
- Step-by-step instructions tracker
- Share recipes in formatted text
- Export/import recipes as JSON
- AI-powered recipe generation (requires Claude API)
- Demo recipe included

## Technologies

- **HTML5** - Semantic markup
- **CSS3** - Custom properties, Grid, Flexbox
- **Vanilla JavaScript** - No frameworks or dependencies
- **LocalStorage** - Browser data persistence
- **Claude API** - Optional AI recipe generation

## Getting Started

1. Open `index.html` in a web browser
2. All data is saved locally in your browser

### For AI Recipe Generation

To enable AI recipe generation:
1. Get an API key from [Anthropic](https://console.anthropic.com)
2. The app will prompt for authentication when needed
3. Or modify the `generateAIRecipe()` function to include your API key

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Android)

## Data Storage

All recipes, saved vehicles, and preferences are stored in browser LocalStorage:
- `recipes` - Recipe database
- `savedCars` - Saved vehicles
- `defaultCar` - Default vehicle ID

## Responsive Design

Fully responsive layout:
- Desktop: Top navigation bar
- Mobile: Hamburger menu with sidebar
- Tablet: Optimized grid layouts

## Credits

Built with modern web standards. No external dependencies required (except optional Claude API).
