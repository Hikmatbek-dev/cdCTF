import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import { LanguageProvider, useLang } from "@/lib/LanguageContext";
import { ThemeProvider } from "@/lib/ThemeContext";
import { SeoManager } from "@/lib/seo";
import { loginWithNext } from "@/lib/next-path";
import { Navbar } from "@/components/Navbar";

import HomePage from "@/pages/HomePage";
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/RegisterPage"));
const VerifyEmailPage = lazy(() => import("@/pages/VerifyEmailPage"));
const StartPage = lazy(() => import("@/pages/StartPage"));
const CtfListPage = lazy(() => import("@/pages/CtfListPage"));
const CtfDetailPage = lazy(() => import("@/pages/CtfDetailPage"));
const LearnPage = lazy(() => import("@/pages/LearnPage"));
const LessonDetailPage = lazy(() => import("@/pages/LessonDetailPage"));
const LessonTestPage = lazy(() => import("@/pages/LessonTestPage"));
const ModulesPage = lazy(() => import("@/pages/ModulesPage"));
const ModuleDetailPage = lazy(() => import("@/pages/ModuleDetailPage"));
const ModuleExamPage = lazy(() => import("@/pages/ModuleExamPage"));
const CertificatePage = lazy(() => import("@/pages/CertificatePage"));
const DiplomaPage = lazy(() => import("@/pages/DiplomaPage"));
const DiplomaVerifyPage = lazy(() => import("@/pages/DiplomaVerifyPage"));
const ScoreboardPage = lazy(() => import("@/pages/ScoreboardPage"));
const TalentPage = lazy(() => import("@/pages/TalentPage"));
const JobsPage = lazy(() => import("@/pages/JobsPage"));
const ImpactPage = lazy(() => import("@/pages/ImpactPage"));
const VerifyPage = lazy(() => import("@/pages/VerifyPage"));
const LabsPage = lazy(() => import("@/pages/LabsPage"));
const CompetitionsPage = lazy(() => import("@/pages/CompetitionsPage"));
const EventPage = lazy(() => import("@/pages/EventPage"));
const CompetitionDetailPage = lazy(() => import("@/pages/CompetitionDetailPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const ProfileEditPage = lazy(() => import("@/pages/ProfileEditPage"));
const SecurityPage = lazy(() => import("@/pages/SecurityPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const AdminDashboardPage = lazy(() => import("@/pages/admin/AdminDashboardPage"));
const AdminUsersPage = lazy(() => import("@/pages/admin/AdminUsersPage"));
const AdminCtfPage = lazy(() => import("@/pages/admin/AdminCtfPage"));
const AdminCompetitionsPage = lazy(() => import("@/pages/admin/AdminCompetitionsPage"));
const AdminLessonsPage = lazy(() => import("@/pages/admin/AdminLessonsPage"));
const AdminAnalyticsPage = lazy(() => import("@/pages/admin/AdminAnalyticsPage"));
const AdminBlockedPage = lazy(() => import("@/pages/admin/AdminBlockedPage"));
const AdminAuditPage = lazy(() => import("@/pages/admin/AdminAuditPage"));
const CompetitionCtfPage = lazy(() => import("@/pages/CompetitionCtfPage"));
const ResendVerificationPage = lazy(() => import("@/pages/ResendVerificationPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));
const NotFound = lazy(() => import("@/pages/not-found"));

/**
 * Every page except the home page is a lazy chunk.
 *
 * The build emitted one 1.47MB script (425KB gzipped) that every visitor had to
 * download before seeing anything — including recharts, which only the admin
 * dashboard uses, and the QR encoder, which only a certificate uses. On the
 * mobile connections these learners are on, that is the difference between
 * arriving and leaving. HomePage stays a static import: it is the most common
 * landing, and making it a chunk would only add a round trip.
 */

/**
 * Shown while the session check is in flight. Without it a guard would decide on
 * a half-known state and bounce a signed-in user to /login on every refresh.
 */
function AuthPending() {
  const { t } = useLang();
  return (
    <div className="min-h-screen flex items-center justify-center" role="status" aria-live="polite">
      {/* Announced to screen readers, so it has to be a language the
          reader chose. */}
      <span className="sr-only">{t("Loading", "Yuklanmoqda", "Загрузка")}</span>
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

/** Any staff role — the panel itself decides what each of them may touch. */
function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isStaff, isLoading } = useAuth();
  const [location] = useLocation();
  if (isLoading) return <AuthPending />;
  if (!isAuthenticated) return <Redirect to={loginWithNext(location)} />;
  if (!isStaff) return <Redirect to="/" />;
  return <Component />;
}

/** For pages only one specific permission should reach. */
function PermissionRoute({ component: Component, permission }: { component: React.ComponentType; permission: string }) {
  const { isAuthenticated, can, isLoading } = useAuth();
  const [location] = useLocation();
  if (isLoading) return <AuthPending />;
  if (!isAuthenticated) return <Redirect to={loginWithNext(location)} />;
  if (!can(permission)) return <Redirect to="/admin/dashboard" />;
  return <Component />;
}

/**
 * Sends an unauthenticated visitor to sign in — and remembers where they were
 * going. Redirecting to a bare "/login" threw the destination away, so anyone
 * who hit a sign-in wall was deposited on /ctf afterwards regardless of what
 * they had been trying to do.
 */
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();
  if (isLoading) return <AuthPending />;
  if (!isAuthenticated) return <Redirect to={loginWithNext(location)} />;
  return <Component />;
}

import { PageTransition } from "@/components/PageTransition";

function Router() {
  const [location] = useLocation();

  return (
    <>
      <SeoManager />
      <Navbar />
      {/*
        No AnimatePresence here, deliberately.

        It was wrapped in `<AnimatePresence mode="wait">` with `<Switch>` as its
        direct child. `mode="wait"` holds the outgoing child until its exit
        animation reports completion — and Switch is not a motion component, so
        it never reported. The router was wedged on whichever route loaded
        first: clicking any link changed the URL and the document title while
        the page stayed exactly as it was. Confirmed on production before this
        change, by clicking through the nav and reading the DOM — one <h1>, the
        original page, on every route.

        Nothing in the build catches that, and neither does a screenshot of a
        directly-loaded URL. Only navigating does.

        PageTransition still runs its enter animation on each route (the Switch
        is keyed by location, so the subtree remounts). The exit animation is
        gone, which nobody will miss; a working router is not a trade.
      */}
      <Suspense fallback={<AuthPending />}>
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
          {/* Public on purpose: someone who has registered but not yet clicked
              the verification email still needs somewhere to start. */}
          <Route path="/start">
            {() => <PageTransition><StartPage /></PageTransition>}
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
          <Route path="/impact">
            {() => <PageTransition><ImpactPage /></PageTransition>}
          </Route>
          <Route path="/labs">
            {() => <PageTransition><LabsPage /></PageTransition>}
          </Route>
          <Route path="/verify">
            {() => <PageTransition><VerifyPage /></PageTransition>}
          </Route>
          {/* Short, public, poster-shaped: the URL a sponsor posts. */}
          <Route path="/e/:id">
            <PageTransition><EventPage /></PageTransition>
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
      </Suspense>
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
