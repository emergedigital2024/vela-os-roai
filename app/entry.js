/* Build entry point. esbuild bundles + minifies this (and everything it imports)
   into a single content-hashed asset, public/assets/vela-<hash>.js, replacing the
   former @babel/standalone in-browser transpile of 11 type="text/babel" scripts.

   LOAD ORDER IS LOAD-BEARING. Each component file is an IIFE that, at evaluation
   time, reads the window.* globals published by the files before it and publishes
   its own (see each file's tail: window.Icon, window.UI, window.AGENCY, ...). This
   list mirrors the exact <script> order the old index.html used:
     _globals  → window.React / window.ReactDOM   (must be first)
     data      → window.AGENCY, window.FMT
     icons     → window.Icon
     ui        → window.UI            (needs Icon, FMT)
     store     → window.Store         (needs AGENCY)
     billing   → window.Billing
     billingscreens → window.BillingScreens (needs Store, Billing, UI)
     clientviews    → window.ClientViews
     overview  → window.Overview
     deepdive  → window.DeepDive
     portal    → window.Portal
     app       → window.App
     _bootstrap → mounts <App/>        (must be last) */
import "./_globals.js";
import "./data.jsx";
import "./icons.jsx";
import "./ui.jsx";
import "./store.jsx";
import "./billing.jsx";
import "./billingscreens.jsx";
import "./clientviews.jsx";
import "./overview.jsx";
import "./deepdive.jsx";
import "./portal.jsx";
import "./app.jsx";
import "./_bootstrap.js";
