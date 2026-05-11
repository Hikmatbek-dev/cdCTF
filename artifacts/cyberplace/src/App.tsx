import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import { LanguageProvider } from "@/lib/LanguageContext";
import { ThemeProvider } from "@/lib/ThemeContext";
import { SeoManager } from "@/lib/seo";
import { Navbar } from "@/components/Navbar";

import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import VerifyEmailPage from "@/pages/VerifyEmailPage";
import CtfListPage from "@/pages/CtfListPage";
import CtfDetailPage from "@/pages/CtfDetailPage";
import LearnPage from "@/pages/LearnPage";
import LessonDetailPage from "@/pages/LessonDetailPage";
import LessonTestPage from "@/pages/LessonTestPage";
import ScoreboardPage from "@/pages/ScoreboardPage";
import CompetitionsPage from "@/pages/CompetitionsPage";
import CompetitionDetailPage from "@/pages/CompetitionDetailPage";
import ProfilePage from "@/pages/ProfilePage";
import ProfileEditPage from "@/pages/ProfileEditPage";
import DashboardPage from "@/pages/DashboardPage";
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";
import AdminUsersPage from "@/pages/admin/AdminUsersPage";
import AdminCtfPage from "@/pages/admin/AdminCtfPage";
import AdminCompetitionsPage from "@/pages/admin/AdminCompetitionsPage";
import AdminLessonsPage from "@/pages/admin/AdminLessonsPage";
import AdminBlockedPage from "@/pages/admin/AdminBlockedPage";
import AdminAuditPage from "@/pages/admin/AdminAuditPage";
import CompetitionCtfPage from "@/pages/CompetitionCtfPage";
import NotFound from "@/pages/not-found";

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isAdmin } = useAuth();
  if (!isAuthenticated) return <Redirect to="/login" />;
  if (!isAdmin) return <Redirect to="/" />;
  return <Component />;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Redirect to="/login" />;
  return <Component />;
}

function Router() {
  return (
    <>
      <SeoManager />
      <Navbar />
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/register" component={RegisterPage} />
        <Route path="/verify-email" component={VerifyEmailPage} />
        <Route path="/ctf" component={CtfListPage} />
        <Route path="/ctf/:id" component={CtfDetailPage} />
        <Route path="/learn" component={LearnPage} />
        <Route path="/learn/:id/test" component={LessonTestPage} />
        <Route path="/learn/:id" component={LessonDetailPage} />
        <Route path="/scoreboard" component={ScoreboardPage} />
        <Route path="/competitions" component={CompetitionsPage} />
        <Route path="/competitions/:id" component={CompetitionDetailPage} />
        <Route path="/competitions/:competitionId/ctf/:ctfId">
          {() => <ProtectedRoute component={CompetitionCtfPage} />}
        </Route>
        <Route path="/dashboard">
          {() => <ProtectedRoute component={DashboardPage} />}
        </Route>
        <Route path="/profile/edit">
          {() => <ProtectedRoute component={ProfileEditPage} />}
        </Route>
        <Route path="/profile/:id" component={ProfilePage} />
        <Route path="/admin/dashboard">
          {() => <AdminRoute component={AdminDashboardPage} />}
        </Route>
        <Route path="/admin/users">
          {() => <AdminRoute component={AdminUsersPage} />}
        </Route>
        <Route path="/admin/ctf">
          {() => <AdminRoute component={AdminCtfPage} />}
        </Route>
        <Route path="/admin/competitions">
          {() => <AdminRoute component={AdminCompetitionsPage} />}
        </Route>
        <Route path="/admin/lessons">
          {() => <AdminRoute component={AdminLessonsPage} />}
        </Route>
        <Route path="/admin/blocked">
          {() => <AdminRoute component={AdminBlockedPage} />}
        </Route>
        <Route path="/admin/audit">
          {() => <AdminRoute component={AdminAuditPage} />}
        </Route>
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
            <Toaster />
          </WouterRouter>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
