/* Mounts the app — the bundled equivalent of the old inline bootstrap <script>.
   Runs last (entry.js imports it after every component module), so window.App is set. */
const App = window.App;
const root = window.ReactDOM.createRoot(document.getElementById("root"));
root.render(window.React.createElement(App));
