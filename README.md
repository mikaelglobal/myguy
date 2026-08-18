# My Guy — Sell on WhatsApp

**Version 1.0**

A modern, feature-rich platform for selling products directly through WhatsApp. My Guy enables sellers to manage inventory, process transactions, run ads, and track sales—all integrated with WhatsApp messaging.

## Features

### Core Functionality
- **Product Management** — Create and manage your product catalog
- **Transaction Tracking** — Monitor all sales and payment records
- **User Dashboard** — Centralized overview of your business metrics
- **Dark/Light Theme** — Seamless theme switching with system preference detection
- **Admin Panel** — Manage platform settings and seller accounts
- **Brand Management** — Customize your seller profile and branding

### Sales & Marketing
- **Advertising System** — Run targeted ad campaigns
- **Ad Frequency Management** — Control how often ads are shown
- **Performance Analytics** — Track impressions and sales metrics

### Technical Features
- **Responsive Design** — Works on desktop, tablet, and mobile devices
- **Real-time Updates** — Live transaction and product status updates
- **Secure Authentication** — User login and session management
- **Toast Notifications** — User-friendly feedback messages
- **Image Lightbox** — Product image preview functionality

## Project Structure

```
myguy_frontend/
├── index.html              # Main application entry point
├── _redirects              # Routing configuration
├── static/
│   ├── app.js             # Main application logic
│   ├── style.css          # Global styles
│   ├── logo.png           # Brand logo
│   ├── admin/             # Admin dashboard
│   │   ├── index.html
│   │   ├── app.js
│   │   └── style.css
│   └── brand/             # Brand management page
│       ├── index.html
│       ├── app.js
│       └── style.css
```

## Getting Started

### Installation

1. Clone the repository:
```bash
git clone https://github.com/mikaelglobal/myguy.git
cd myguy
```

2. Navigate to the frontend directory:
```bash
cd myguy_frontend
```

3. Serve the application locally using your preferred web server:
```bash
# Using Python 3
python -m http.server 8000

# Or using Node.js with http-server
npx http-server
```

4. Open your browser and navigate to:
```
http://localhost:8000
```

## Configuration

### API Endpoint

The application connects to the backend API at:
```
https://myguy.pythonanywhere.com
```

To change the API endpoint, modify the API_BASE URL in `/static/app.js`:
```javascript
const API_BASE = window.API_BASE || 'https://myguy.pythonanywhere.com';
```

### Theme Settings

The application automatically detects your system theme preference. Users can toggle between light and dark modes:
- **Light Mode** — "☀️ Day market"
- **Dark Mode** — "🌙 Night market"

Theme preference is saved to browser localStorage.

## Usage

### Main Dashboard
The main application provides an overview of:
- **Transactions** — View and filter sales history
- **Products** — Manage your product catalog
- **Ads** — Monitor active advertising campaigns
- **Plans** — View pricing and subscription options

### Admin Panel
Access the admin panel at `/static/admin/` to:
- Manage seller accounts
- Configure platform settings
- Monitor platform analytics

### Brand Management
Customize your seller profile at `/static/brand/` to:
- Update brand information
- Configure store settings
- Manage branding assets

## Browser Compatibility

- Chrome/Chromium (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Key Dependencies

- **Google Fonts** — Fraunces, Inter, IBM Plex Mono
- **Vanilla JavaScript** — No external frameworks required

## Deployment

The application is configured for deployment with the `_redirects` file for proper routing on modern hosting platforms.

### Recommended Hosting Platforms
- Netlify
- Vercel
- GitHub Pages
- Any static hosting service

## API Integration

The frontend communicates with the backend API for:
- User authentication
- Product data
- Transaction records
- Ad management
- Plan information

Ensure the backend API is accessible and properly configured before deploying.

## Performance

- Lightweight (~200KB JS + CSS)
- No external dependencies
- Fast load times
- Optimized for mobile networks

## Support & Feedback

For issues, feature requests, or feedback, please contact the development team or open an issue on the repository.

## Version History

### v1.0 (Initial Release)
- Complete core functionality
- User authentication and dashboard
- Product and transaction management
- Ad campaign system
- Admin and brand management panels
- Light/dark theme support
- Mobile-responsive design

## License

[Add appropriate license information]

---

**Ready to sell on WhatsApp?** Get started with My Guy today! 🛍️
