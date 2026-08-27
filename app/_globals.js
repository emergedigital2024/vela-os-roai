/* Publishes React + ReactDOM on `window`, exactly as the old UMD <script> tags did.
   The 11 component modules are IIFEs that reference a bare global `React` (e.g.
   `const { useState } = React`) and read/write `window.*`; esbuild leaves those
   bare/`window.*` references untouched, so they keep resolving against these globals.
   This module MUST evaluate before any component module — entry.js imports it first. */
import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";

window.React = React;
window.ReactDOM = { createRoot, hydrateRoot };
