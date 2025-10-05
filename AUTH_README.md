# SoundBridge Authentication Pages

## Overview
Complete authentication system for SoundBridge with three pages that match the established glassmorphism design system.

## Pages Created

### 1. Login Page (`/login`)
**Features:**
- Email and password fields with icons
- Password visibility toggle
- Form validation and loading states
- Social login options (Google, Facebook, Apple)
- "Forgot password" link
- Link to signup page
- Back to home navigation

**Styling:**
- Glassmorphism card: `rgba(255, 255, 255, 0.05)` background with `backdrop-filter: blur(20px)`
- Gradient text headers using `linear-gradient(45deg, #DC2626, #EC4899)`
- Same button styling as homepage (`btn-primary` gradient)
- Responsive design with mobile-first approach

### 2. Signup Page (`/signup`)
**Features:**
- Full name, email, password, and confirm password fields
- **Role selection**: Creator vs Listener with visual cards
- Password visibility toggles for both password fields
- Form validation (password matching, role selection)
- Social login options
- Link to login page
- Back to home navigation

**Role Selection:**
- **Creator**: Music icon, "Upload music, create events"
- **Listener**: Headphones icon, "Discover music, attend events"
- Visual card selection with hover effects
- Required field validation

**Styling:**
- Same glassmorphism design as login
- Interactive role selection cards
- Consistent with homepage design system

### 3. Password Reset Page (`/reset-password`)
**Features:**
- Email input field
- Loading state during submission
- Success state with email confirmation
- Resend email functionality
- Back to login navigation
- Back to home navigation

**States:**
- **Form State**: Email input with submit button
- **Success State**: Check icon, email confirmation, resend option

**Styling:**
- Same glassmorphism design
- Success state with green check icon
- Email display in highlighted box

## Design System Compliance

### Glassmorphism Styling
- Background: `rgba(255, 255, 255, 0.05)`
- Backdrop filter: `blur(20px)`
- Border: `1px solid rgba(255, 255, 255, 0.1)`
- Border radius: `20px`
- Box shadow: `0 20px 40px rgba(0, 0, 0, 0.3)`

### Color Scheme
- Primary red: `#DC2626`
- Accent pink: `#EC4899`
- Gradient text: `linear-gradient(45deg, #DC2626, #EC4899)`
- Background: `linear-gradient(135deg, #1a1a1a 0%, #2d1b3d 100%)`

### Button Styling
- **Primary buttons**: Gradient background with hover effects
- **Secondary buttons**: Transparent with border
- **Social buttons**: Glassmorphism with hover states
- **Hover effects**: `translateY(-2px)` and shadow

### Form Elements
- Input fields with icons (Mail, Lock, User)
- Focus states with red border
- Password visibility toggles
- Consistent padding and border radius

## Responsive Design
- Mobile-first approach
- Centered cards on all screen sizes
- Flexible layouts that adapt to content
- Touch-friendly button sizes

## Navigation
- Back to home button (top-left)
- Cross-page navigation links
- Consistent positioning and styling

## Form Validation
- Required field validation
- Email format validation
- Password matching (signup)
- Role selection requirement (signup)
- Loading states during submission

## Social Login
- Google, Facebook, Apple options
- Consistent styling across all pages
- Hover effects matching design system

## Integration
- Updated main page auth buttons to link to new pages
- Consistent with existing homepage design
- Ready for backend integration

## File Structure
```
app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx
│   ├── signup/
│   │   └── page.tsx
│   └── reset-password/
│       └── page.tsx
└── page.tsx (updated with auth links)
```

## Usage
All pages are fully functional with simulated API calls and ready for backend integration. The design perfectly matches the homepage's glassmorphism aesthetic while providing a complete authentication experience. 