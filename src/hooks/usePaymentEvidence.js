import { useEffect, useState } from 'react';
import { api } from '../lib/api';

// The photographs of a customer's transfer(s), fetched when somebody actually
// opens the invoice.
//
// These used to travel with the invoice list as base64. Eighteen invoices came
// to 9.6 MB, the list is re-fetched on every change of view, and the result was
// an app that took half a minute to open — worst on the roles that never look
// at payment evidence at all.
//
// They stay behind the session rather than being served openly like a fabric
// picture, so each is fetched as a blob and handed to the browser as an object
// URL, which is revoked when the screen goes away.
export const usePaymentEvidence = (invoiceNumber, count = 0) => {
  const [urls, setUrls] = useState([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!invoiceNumber || !count) {
      setUrls([]);
      return undefined;
    }

    let objectUrls = [];
    let cancelled = false;
    setFailed(false);

    Promise.all(
      Array.from({ length: count }, (_, index) => (
        api.get(`/oms/invoices/${encodeURIComponent(invoiceNumber)}/payment-evidence/${index}`, { responseType: 'blob' })
          .then((response) => URL.createObjectURL(response.data))
          .catch(() => null)
      ))
    ).then((results) => {
      if (cancelled) return;
      objectUrls = results.filter(Boolean);
      setUrls(objectUrls);
      if (!objectUrls.length) setFailed(true);
    });

    return () => {
      cancelled = true;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [invoiceNumber, count]);

  return { urls, failed, loading: Boolean(count) && !urls.length && !failed };
};
