import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
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
import ModulesPage from "@/pages/ModulesPage";
import ModuleDetailPage from "@/pages/ModuleDetailPage";
import ModuleExamPage from "@/pages/ModuleExamPage";
import CertificatePage from "@/pages/CertificatePage";
import DiplomaPage from "@/pages/DiplomaPage";
import DiplomaVerifyPage from "@/pages/DiplomaVerifyPage";
import ScoreboardPage from "@/pages/ScoreboardPage";
import TalentPage from "@/pages/TalentPage";
import JobsPage from "@/pages/JobsPage";
import CompetitionsPage from "@/pages/CompetitionsPage";
import CompetitionDetailPage from "@/pages/CompetitionDetailPage";
import ProfilePage from "@/pages/ProfilePage";
import ProfileEditPage from "@/pages/ProfileEditPage";
import SecurityPage from "@/pages/SecurityPage";
import DashboardPage from "@/pages/DashboardPage";
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";
import AdminUsersPage from "@/pages/admin/AdminUsersPage";
import AdminCtfPage from "@/pages/admin/AdminCtfPage";
import AdminCompetitionsPage from "@/pages/admin/AdminCompetitionsPage";
import AdminLessonsPage from "@/pages/admin/AdminLessonsPage";
import AdminAnalyticsPage from "@/pages/admin/AdminAnalyticsPage";
import AdminBlockedPage from "@/pages/admin/AdminBlockedPage";
import AdminAuditPage from "@/pages/admin/AdminAuditPage";
import CompetitionCtfPage from "@/pages/CompetitionCtfPage";
import ResendVerificationPage from "@/pages/ResendVerificationPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import NotFound from "@/pages/not-found";

/**
 * Shown while the session check is in flight. Without it a guard would decide on
 * a half-known state and bounce a signed-in user to /login on every refresh.
 */
function AuthPending() {
  return (
    <div className="min-h-screen flex items-center justify-center" role="status" aria-live="polite">
      <span className="sr-only">Loading</span>
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

/** Any staff role — the panel itself decides what each of them may touch. */
function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isStaff, isLoading } = useAuth();
  if (isLoading) return <AuthPending />;
  if (!isAuthenticated) return <Redirect to="/login" />;
  if (!isStaff) return <Redirect to="/" />;
  return <Component />;
}

/** For pages only one specific permission should reach. */
function PermissionRoute({ component: Component, permission }: { component: React.ComponentType; permission: string }) {
  const { isAuthenticated, can, isLoading } = useAuth();
  if (isLoading) return <AuthPending />;
  if (!isAuthenticated) return <Redirect to="/login" />;
  if (!can(permission)) return <Redirect to="/admin/dashboard" />;
  return <Component />;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <AuthPending />;
  if (!isAuthenticated) return <Redirect to="/login" />;
  return <Component />;
}

import { AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";

function Router() {
  const [location] = useLocation();

  return (
    <>
      <SeoManager />
      <Navbar />
      <AnimatePresence mode="wait">
        <Switch location={location} key={location}>
          <Route path="/">
            {() => <PageTransition><HomePage /></PageTransition>}
          </Route>
          <Route path="/login">
            {() => <PageTransition><LoginPage /></PageTransition>}
          </Route>
          <Route path="/register">
            {() => <PageTransition><RegisterPage /></PageTransition>}
          </Route>
          <Route path="/verify-email">
            {() => <PageTransition><VerifyEmailPage /></PageTransition>}
          </Route>
          <Route path="/forgot-password">
            {() => <PageTransition><ForgotPasswordPage /></PageTransition>}
          </Route>
          <Route path="/reset-password">
            {() => <PageTransition><ResetPasswordPage /></PageTransition>}
          </Route>
          <Route path="/resend-verification">
            {() => <PageTransition><ResendVerificationPage /></PageTransition>}
          </Route>
          <Route path="/ctf">
            {() => <PageTransition><CtfListPage /></PageTransition>}
          </Route>
          <Route path="/ctf/:id">
            <PageTransition><CtfDetailPage /></PageTransition>
          </Route>
          <Route path="/learn">
            {() => <PageTransition><LearnPage /></PageTransition>}
          </Route>
          <Route path="/learn/:id/test">
            <PageTransition><LessonTestPage /></PageTransition>
          </Route>
          <Route path="/learn/:id">
            <PageTransition><LessonDetailPage /></PageTransition>
          </Route>
          {/* The exam path must be registered before /modules/:id, or wouter
              matches the latter first and the exam page never renders. */}
          <Route path="/modules/:id/exam">
            <PageTransition><ProtectedRoute component={ModuleExamPage} /></PageTransition>
          </Route>
          <Route path="/modules/:id">
            <PageTransition><ModuleDetailPage /></PageTransition>
          </Route>
          <Route path="/modules">
            {() => <PageTransition><ModulesPage /></PageTransition>}
          </Route>
          {/* Public: a certificate has to be checkable by whoever it is shown to. */}
          <Route path="/certificate/:serial">
            <PageTransition><CertificatePage /></PageTransition>
          </Route>
          {/* The claim/status page requires auth; the /:serial verify page is
              public. Register the verify route before the bare one so wouter
              does not swallow the serial. */}
          <Route path="/diploma/:serial">
            <PageTransition><DiplomaVerifyPage /></PageTransition>
          </Route>
          <Route path="/diploma">
            {() => <PageTransition><ProtectedRoute component={DiplomaPage} /></PageTransition>}
          </Route>
          <Route path="/scoreboard">
            {() => <PageTransition><ScoreboardPage /></PageTransition>}
          </Route>
          <Route path="/talent">
            {() => <PageTransition><TalentPage /></PageTransition>}
          </Route>
          <Route path="/jobs">
            {() => <PageTransition><JobsPage /></PageTransition>}
          </Route>
          <Route path="/competitions">
            {() => <PageTransition><CompetitionsPage /></PageTransition>}
          </Route>
          <Route path="/competitions/:id">
            <PageTransition><CompetitionDetailPage /></PageTransition>
          </Route>
          <Route path="/competitions/:competitionId/ctf/:ctfId">
            <PageTransition>
              <ProtectedRoute component={CompetitionCtfPage} />
            </PageTransition>
          </Route>
          <Route path="/dashboard">
            {() => <PageTransition><ProtectedRoute component={DashboardPage} /></PageTransition>}
          </Route>
          <Route path="/settings/security">
            {() => <PageTransition><ProtectedRoute component={SecurityPage} /></PageTransition>}
          </Route>
          <Route path="/profile/edit">
            {() => <PageTransition><ProtectedRoute component={ProfileEditPage} /></PageTransition>}
          </Route>
          <Route path="/profile">
            {() => <PageTransition><ProtectedRoute component={ProfilePage} /></PageTransition>}
          </Route>
          <Route path="/profile/:id">
            <PageTransition><ProfilePage /></PageTransition>
          </Route>
          
          <Route path="/admin/dashboard">
            {() => <PageTransition><AdminRoute component={AdminDashboardPage} /></PageTransition>}
          </Route>
          <Route path="/admin/users">
            {() => <PageTransition><PermissionRoute component={AdminUsersPage} permission="users.read" /></PageTransition>}
          </Route>
          <Route path="/admin/ctf">
            {() => <PageTransition><PermissionRoute component={AdminCtfPage} permission="ctf.read.all" /></PageTransition>}
          </Route>
          <Route path="/admin/competitions">
            {() => <PageTransition><PermissionRoute component={AdminCompetitionsPage} permission="competitions.manage" /></PageTransition>}
          </Route>
          <Route path="/admin/analytics">
            {() => <PageTransition><PermissionRoute component={AdminAnalyticsPage} permission="lessons.read.all" /></PageTransition>}
          </Route>
          <Route path="/admin/lessons">
            {() => <PageTransition><PermissionRoute component={AdminLessonsPage} permission="lessons.read.all" /></PageTransition>}
          </Route>
          <Route path="/admin/blocked">
            {() => <PageTransition><PermissionRoute component={AdminBlockedPage} permission="blocks.manage" /></PageTransition>}
          </Route>
          <Route path="/admin/audit">
            {() => <PageTransition><PermissionRoute component={AdminAuditPage} permission="audit.read" /></PageTransition>}
          </Route>
          <Route component={NotFound} />
        </Switch>
      </AnimatePresence>
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
