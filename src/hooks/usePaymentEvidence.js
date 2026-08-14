import { useEffect, useState } from 'react';
import { api } from '../lib/api';

// The photograph of a customer's transfer, fetched when somebody actually opens
// the invoice.
//
// These used to travel with the invoice list as base64. Eighteen invoices came
// to 9.6 MB, the list is re-fetched on every change of view, and the result was
// an app that took half a minute to open — worst on the roles that never look
// at payment evidence at all.
//
// It stays behind the session rather than being served openly like a fabric
// picture, so it is fetched as a blob and handed to the browser as an object
// URL, which is revoked when the screen goes away.
export const usePaymentEvidence = (invoiceNumber, hasEvidence) => {
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!invoiceNumber || !hasEvidence) return undefined;

    let objectUrl = '';
    let cancelled = false;

    api.get(`/oms/invoices/${encodeURIComponent(invoiceNumber)}/payment-evidence`, { responseType: 'blob' })
      .then((response) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(response.data);
        setUrl(objectUrl);
      })
      .catch(() => { if (!cancelled) setFailed(true); });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [invoiceNumber, hasEvidence]);

  return { url, failed, loading: Boolean(hasEvidence) && !url && !failed };
};
