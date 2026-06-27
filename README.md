# CityMind

A hyperlocal civic issue reporting and resolution platform powered by AI.

---

# Overview

* **What problem does this project solve?** Traditional municipal reporting systems are often fragmented, slow, and lack transparency. CityMind centralizes community reporting, automates triage using AI, and provides real-time visibility into civic issue resolution.
* **Why was it built?** To empower citizens to improve their neighborhoods and provide city officials with actionable, verified data and predictive insights to allocate resources more efficiently.
* **Who is it for?** Citizens who want to report and track local infrastructure issues, and municipal departments (Public Works, Transit, Utilities, etc.) responsible for dispatching and repairing them.

---

# Features

* **AI-Assisted Reporting:** Automatically classify issue category, department routing, and severity using AI analysis of user descriptions.
* **Interactive Live Map:** Geospatial visualization of all reported issues using interactive map markers and clustered heatmaps.
* **Community Verification System:** Crowdsourced verification allows users to confirm existing issues, increasing their credibility score and preventing duplicate reports.
* **Gamified Leaderboard:** Users earn points and badges for reporting and verifying issues, fostering community engagement.
* **Admin Analytics Dashboard:** Comprehensive real-time metrics, pipeline status charts, and predictive issue density insights for city officials.
* **Role-Based Access Control:** Distinct views and permissions for standard citizens and official authority responders.
* **Responsive Modern UI:** Built with Tailwind CSS, Framer Motion, and custom glassmorphism/3D aesthetic effects for an engaging user experience across devices.
* **Dark Mode Support:** Integrated light and dark themes based on user preference.

---

# Tech Stack

* **Frontend:** React 18, TypeScript, Vite
* **Routing:** React Router v6
* **Database & Authentication:** Google Firebase (Firestore, Firebase Authentication)
* **State Management:** React Context API
* **Styling:** Tailwind CSS (with custom glassmorphism and 3D utility classes)
* **Animations:** Framer Motion
* **Mapping:** Leaflet, React-Leaflet
* **Data Visualization:** Recharts
* **Icons:** Lucide React
* **Forms:** React Hook Form

---

# Architecture

The application follows a standard Single Page Application (SPA) architecture utilizing a client-serverless model backed by Firebase.

* **Folder Structure:** Organized by feature/view (`/views`) with shared components (`/components`) and contexts (`/context`).
* **Data Flow:** The React frontend subscribes to real-time updates from Firestore. User actions trigger localized state updates and optimistic UI changes while asynchronously writing to the database.
* **Routing:** Protected routes ensure only authenticated users can access reporting and profile features, while admin routes are restricted to authority accounts.



# Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd citymind
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables (see below).

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   ```

---

# Environment Variables

Variable | Description | Required
--- | --- | ---
`VITE_FIREBASE_API_KEY` | Firebase Web API Key | Yes
`VITE_FIREBASE_AUTH_DOMAIN` | Firebase Authentication Domain | Yes
`VITE_FIREBASE_PROJECT_ID` | Firebase Project ID | Yes
`VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket | Yes
`VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID | Yes
`VITE_FIREBASE_APP_ID` | Firebase App ID | Yes
`VITE_GEMINI_API_KEY` | Google Gemini API Key for AI Analysis | Yes

---

# Usage

1. **Citizen Workflow:** Sign up for an account, view the live map for existing issues. Click "Report Issue", upload a photo, and let the AI assist in categorizing the problem. Submit the report and track its status on your profile.
2. **Authority Workflow:** Log in with an authority account. Access the Admin dashboard to view incoming reports, update statuses (e.g., "Investigating", "Resolving", "Resolved"), and analyze resolution metrics.

---

# Folder Structure

```text
├── src/
│   ├── api.ts                 # API utility functions
│   ├── App.tsx                # Main application component
│   ├── components/            # Reusable UI components
│   │   ├── AnimatedPage.tsx   # Page transition wrapper
│   │   ├── AnimatedRoutes.tsx # Route transition definitions
│   │   ├── Layout.tsx         # Global application layout (Sidebar/Header)
│   │   └── ProtectedRoute.tsx # Authentication guard component
│   ├── context/               # React Context providers
│   │   └── AuthContext.tsx    # Firebase authentication state management
│   ├── firebaseConfig.ts      # Firebase initialization and exports
│   ├── index.css              # Global styles and Tailwind directives
│   ├── main.tsx               # React entry point
│   └── views/                 # Application pages
│       ├── Admin.tsx          # Authority dashboard
│       ├── Dashboard.tsx      # Analytics and insights
│       ├── Home.tsx           # Landing page
│       ├── IssueDetail.tsx    # Individual issue view
│       ├── Issues.tsx         # Live map and list view
│       ├── Leaderboard.tsx    # Gamification rankings
│       ├── Login.tsx          # Authentication
│       ├── Profile.tsx        # User activity and badges
│       ├── Report.tsx         # Issue submission form
│       └── Signup.tsx         # Account creation
```

---

# Scripts

* `npm run dev`: Starts the Vite development server.
* `npm run build`: Compiles TypeScript and builds the project for production.
* `npm run preview`: Locally previews the production build.
* `npm run lint`: Runs ESLint to identify and report on patterns in JavaScript/TypeScript.

---

# Future Improvements

* **Push Notifications:** Implement real-time push notifications when an issue in a user's zone changes status.
* **Mobile Application:** Develop a native mobile application using React Native for deeper hardware integration (camera, precise GPS).
* **Automated Dispatching Integration:** Connect the platform with existing city work order management systems via webhooks.
* **Advanced Analytics:** Implement machine learning models for predictive infrastructure failure analysis based on historical report data.


# Author

 Vivek Kumar


---

# Acknowledgements

* Icons provided by [Lucide React](https://lucide.dev/)
* Maps powered by [Leaflet](https://leafletjs.com/)
* Animations via [Framer Motion](https://www.framer.com/motion/)
* Charts by [Recharts](https://recharts.org/)
