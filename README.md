# 🗺️ Digital Treasure Hunt

A modern, location-based treasure hunt application built with React and Firebase, designed for educational institutions and team-building events. Players navigate through picture-based challenges and riddles while physically visiting campus locations.

[![React](https://img.shields.io/badge/React-19-blue)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF)](https://vitejs.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-10.14-orange)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![PWA](https://img.shields.io/badge/PWA-Ready-purple)](https://web.dev/progressive-web-apps/)

## 🌟 Features

### 🎮 Core Gameplay
- **40 Interactive Challenges**: 20 picture identification challenges and 20 location-based riddles
- **Real-time Location Verification**: GPS-based validation with customizable accuracy margins
- **Smart Skip System**: 3-skip allowance with penalty scoring to maintain game balance
- **Time-limited Sessions**: Configurable game duration with pause/resume functionality
- **Progressive Difficulty**: Dynamically shuffled challenges unique to each team

### 👥 Team Management
- **4-Member Teams**: Team leader registration with member details
- **Single Device Policy**: Prevents cheating with one-login-per-team enforcement
- **Real-time Progress Tracking**: Live updates on team advancement and scoring
- **Comprehensive Team Profiles**: Department-wise organization and contact information

### 📊 Admin Dashboard
- **Game Control Center**: Start/pause/stop game sessions with real-time monitoring
- **Dynamic Challenge Management**: Switch between challenge datasets (Set A/B)
- **Live Leaderboards**: Real-time ranking with detailed statistics
- **Team Analytics**: Progress tracking, completion rates, and performance metrics
- **Notification System**: Broadcast messages to all participants
- **Data Export**: CSV export for attendance and performance reports

### 📱 Mobile-First Design
- **Responsive Interface**: Optimized for smartphones, tablets, and desktop
- **Progressive Web App**: Offline-capable with smooth performance
- **Touch-Optimized**: Native mobile interactions and gestures
- **Safe Area Support**: Modern device compatibility (iPhone notch, etc.)

## 🛠️ Technology Stack

### Frontend
- **React 19** - Modern UI library with latest features
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first styling framework
- **React Router DOM** - Client-side routing
- **Lucide React** - Modern icon library

### Backend & Database
- **Firebase Authentication** - Secure user management
- **Cloud Firestore** - Real-time NoSQL database
- **Firebase Hosting** - Scalable web hosting

### Key Libraries
- **Geolocation API** - Browser-based location services
- **React Hooks** - State management and lifecycle handling
- **Custom Game Engine** - Location verification and challenge logic

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ and npm/yarn
- Firebase account with project setup
- Modern web browser with geolocation support

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/treasure-hunt.git
   cd treasure-hunt
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure Firebase**
   
   Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   
   Update `src/firebase.js` with your configuration:
   ```javascript
   const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     // ... other config
   };
   ```

4. **Set up Firestore Database**
   
   Enable Firestore and create these collections:
   - `teams` - Team registration data
   - `gameState` - Real-time game progress
   - `gameSettings` - Admin configuration
   - `notifications` - System messages

5. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your admin credentials
   VITE_ADMIN_PASSWORD=your-admin-password
   ```

6. **Start development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

Visit `http://localhost:5173` to access the application.

## 🎯 Usage Guide

### For Teams
1. **Registration**: Team leader creates account with 4-member team details
2. **Game Access**: Login and access the command center dashboard
3. **Challenge Navigation**: View current challenge and navigate to target location
4. **Location Verification**: Use GPS verification when at the correct location
5. **Progress Tracking**: Monitor team progress and leaderboard position

### For Administrators
1. **Admin Access**: Login with admin credentials (`vivaan.hooda@gmail.com`)
2. **Game Management**: Configure start time, duration, and active status
3. **Challenge Control**: Switch between different challenge datasets
4. **Monitoring**: View real-time team progress and system status
5. **Communication**: Send notifications to all participants

## 🏗️ Project Structure

```
src/
├── components/           # React components
│   ├── admin/           # Admin dashboard components
│   ├── auth/            # Authentication components
│   ├── common/          # Shared UI components
│   ├── game/            # Game interface components
│   └── leaderboard/     # Ranking and statistics
├── data/                # Challenge datasets and game data
├── firebase/            # Firebase configuration and services
├── hooks/               # Custom React hooks
├── utils/               # Utility functions and helpers
└── styles/              # Global styles and themes
```

## 🎲 Game Mechanics

### Challenge System
- **Picture Challenges**: Identify locations from photographs
- **Riddle Challenges**: Solve clues to find target destinations
- **Location Verification**: GPS-based validation with 50m accuracy margin
- **Scoring System**: 10 points per challenge, -5 points per skip

### Location Verification
Location verification uses the Haversine formula for accurate distance calculation:

```javascript
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c; // Distance in meters
};
```

*Credit to [RaghottamNadgoudar](https://github.com/RaghottamNadgoudar) for inspiration on the location verification feature logic.*

### Game Flow
1. Teams register and await game start
2. Navigate through 40 challenges sequentially
3. Visit physical locations for verification
4. Complete challenges within time limit
5. Final scores determine leaderboard rankings

## ⚙️ Configuration

### Admin Settings
- **Game Duration**: Configurable session length (default: 2 hours)
- **Start Time**: Scheduled game commencement
- **Challenge Sets**: Switch between different challenge datasets
- **Team Size**: Enforce exactly 4 members per team

### Security Features
- **Single Device Login**: Prevents multiple simultaneous sessions
- **Location Verification**: GPS-based anti-cheating measures
- **Admin Authentication**: Secure admin panel access
- **Rate Limiting**: Cooldown periods between attempts

## 🚀 Deployment

### Production Build
```bash
npm run build
# or
yarn build
```

### Firebase Hosting
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login and initialize
firebase login
firebase init hosting

# Deploy
firebase deploy
```

### Environment Setup
- Configure Firebase Security Rules
- Set up proper database indexes
- Enable authentication methods
- Configure hosting domain

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines
- Follow React best practices and hooks patterns
- Maintain mobile-first responsive design
- Write clear, documented code
- Test thoroughly on multiple devices
- Ensure Firebase security compliance

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Location Verification Logic**: Inspired by [RaghottamNadgoudar](https://github.com/RaghottamNadgoudar)'s implementation
- **Contributors**: All developers who helped improve this project : [Raghottam](https://github.com/RaghottamNadgoudar), [Snehal](https://github.com/A5CENSION-SRT), [Sumukha](https://github.com/overclocked-2124), [Vidisha](https://github.com/Vidisha231106)
- - **Coding Club RVCE** - Project initiative and support

## 📞 Support

For support and questions:
- Open an issue on GitHub
- Contact [Vivaan Hooda](https://github.com/VivaanHooda) - [LinkedIn](https://www.linkedin.com/in/vivaanhooda/)

---
<p align="center">
<strong> Built with ❤️ for educational institutions and team-building events </strong>
</p>
