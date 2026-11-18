import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import AssignFabricPage from './AssignFabricPage';

// The Inventory Manager's own Assign Fabric tab: every order waiting for fabric,
// and the stock to take it from. It opens on a particular order when it is
// reached from a job in the Production tab (?invoice=).
export default function AssignFabricTab({ onNavigate }) {
  const [searchParams] = useSearchParams();
  const requested = searchParams.get('invoice') || '';
  const [invoices, setInvoices] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [invoiceResponse, fabricResponse] = await Promise.all([
        api.get('/oms/invoices/sent'),
        api.get('/oms/fabrics'),
      ]);
      setInvoices(invoiceResponse.data?.data?.invoices || []);
      setItems(fabricResponse.data?.data?.fabrics || []);
    } catch {
      setInvoices([]);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Stock and the orders are read again after every release, so what is shown
  // is what is now on the shelf and what is still waiting.
  return (
    <AssignFabricPage
      key={requested}
      invoices={invoices}
      inventory={items}
      loading={loading}
      initialInvoiceNumber={requested}
      onBack={() => onNavigate?.(requested ? 'Production' : 'Overview')}
      backLabel={requested ? 'Production' : 'Overview'}
      onChanged={load}
    />
  );
}
