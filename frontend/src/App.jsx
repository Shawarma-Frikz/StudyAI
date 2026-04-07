import { useState, useRef, useEffect } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import Particles from "./components/Particles";
import Navbar from "./components/Navbar";
import AuthOverlay from "./components/AuthOverlay";
import HeroSection from "./components/HeroSection";
import FeaturesSection from "./components/FeaturesSection";
import DocsSection from "./components/DocsSection";
import ChatSection from "./components/ChatSection";
import DashboardSection from "./components/DashboardSection";
import AdminDashboard from "./components/AdminDashboard";
import Footer from "./components/Footer";
import Toast from "./components/Toast";
import StudyRoomsSection from "./components/StudyRoomsSection";
import NotificationsSection from "./components/NotificationsSection";
function BootLoader() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", background: "#0a0e1a",
      color: "rgba(255,255,255,0.55)", gap: 20,
    }}>
      <div style={{ fontSize: 40 }}>📚</div>
      <div style={{
        fontSize: 20, fontWeight: 700, background: "linear-gradient(135deg,#667eea,#a78bfa)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
      }}>StudyAI</div>
      <div style={{
        width: 36, height: 36, border: "3px solid rgba(167,139,250,0.2)",
        borderTop: "3px solid #a78bfa", borderRadius: "50%", animation: "spin 0.8s linear infinite"
      }} />
    </div>
  );
}
function AppShell() {
  const { currentSection, currentUser, authLoading, navigateTo } = useApp();
  const [chatInitialMessage, setChatInitialMessage] = useState(null);
  const chatKeyRef = useRef(0);
  useEffect(() => {
    if (currentUser?.role === "admin" && currentSection !== "admin") {
      navigateTo("admin");
    }
  }, [currentUser]); 
  if (authLoading) return <BootLoader />;
  if (currentSection === "admin") {
    if (!currentUser || currentUser.role !== "admin") {
      navigateTo("hero");
      return null;
    }
    return (
      <>
        <AdminDashboard />
        <Toast />
      </>
    );
  }
  function handleQuickSummary(docName) {
    chatKeyRef.current += 1;
    setChatInitialMessage(`Summarize @${docName}`);
    navigateTo("chat");
  }
  const isHero = currentSection === "hero";
  return (
    <>
      <Particles />
      <Navbar />
      <AuthOverlay />
      <div style={{ display: isHero ? "block" : "none" }}>
        <HeroSection />
        <FeaturesSection />
        <Footer />
      </div>
      {currentSection === "docs" && <DocsSection onQuickSummary={handleQuickSummary} />}
      {currentSection === "chat" && <ChatSection key={chatKeyRef.current} initialMessage={chatInitialMessage} />}
      {currentSection === "dashboard" && <DashboardSection />}
      {currentSection === "rooms" && <StudyRoomsSection />}
      {currentSection === "notifications" && <NotificationsSection />}
      <Toast />
    </>
  );
}
export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
