/* Shared billing state (React Context) — keeps invoice status, launched agents,
   added payment methods, generated invoices, and top-ups consistent across the
   Agency and Client views and across navigation. Exposed as window.Store. */
(function () {
  const { createContext, useContext, useState } = React;
  const { CLIENTS, INVOICES } = window.AGENCY;

  const Ctx = createContext(null);

  function BillingProvider({ children }) {
    const [statusMap, setStatusMap] = useState({});          // invId -> status override
    const [launched, setLaunched] = useState(() => new Set()); // launched service ids
    const [methodsByClient, setMethodsByClient] = useState({}); // clientId -> [extra methods]
    const [genInvoices, setGenInvoices] = useState([]);       // generated-from-usage invoices
    const [topupByClient, setTopupByClient] = useState({});   // clientId -> extra credits added

    const value = {
      effStatus: (inv) => statusMap[inv.id] || inv.status,
      setStatus: (id, status) => setStatusMap((m) => ({ ...m, [id]: status })),
      isLaunched: (id) => launched.has(id),
      launch: (id) => setLaunched((s) => { const n = new Set(s); n.add(id); return n; }),
      methodsFor: (client) => [...client.acct.methods, ...(methodsByClient[client.id] || [])],
      addMethod: (clientId, m) => setMethodsByClient((x) => ({ ...x, [clientId]: [...(x[clientId] || []), m] })),
      invoicesFor: (clientId) => [...CLIENTS.find((c) => c.id === clientId).invoices, ...genInvoices.filter((i) => i.clientId === clientId)],
      allInvoices: () => [...genInvoices, ...INVOICES],
      addGenInvoice: (inv) => setGenInvoices((g) => [inv, ...g]),
      topupFor: (clientId) => topupByClient[clientId] || 0,
      addTopup: (clientId, credits) => setTopupByClient((x) => ({ ...x, [clientId]: (x[clientId] || 0) + credits })),
    };
    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
  }

  function useBilling() { return useContext(Ctx); }

  window.Store = { BillingProvider, useBilling };
})();
