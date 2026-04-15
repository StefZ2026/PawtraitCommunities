import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { CookieConsent } from "@/components/cookie-consent";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Login from "@/pages/login";
import JoinCommunity from "@/pages/join-community";
import ResidentDashboard from "@/pages/resident-dashboard";
import Gallery from "@/pages/gallery";
import Admin from "@/pages/admin";
import AdminOrder from "@/pages/admin-order";
import Styles from "@/pages/styles";
import OrderMerch from "@/pages/order-merch";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import GetStarted from "@/pages/get-started";
import PlanPage from "@/pages/plan-page";
import CommunityDashboard from "@/pages/community-dashboard";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/join" component={JoinCommunity} />
      <Route path="/community/:orgId" component={CommunityDashboard} />
      <Route path="/community" component={CommunityDashboard} />
      <Route path="/dashboard" component={ResidentDashboard} />
      <Route path="/admin/order" component={AdminOrder} />
      <Route path="/admin" component={Admin} />
      <Route path="/get-started/plan" component={PlanPage} />
      <Route path="/get-started" component={GetStarted} />
      <Route path="/styles" component={Styles} />
      <Route path="/order/:portraitId" component={OrderMerch} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/:slug" component={Gallery} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="pawtrait-communities-theme">
        <TooltipProvider>
          <Toaster />
          <Navbar />
          <Router />
          <Footer />
          <CookieConsent />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
