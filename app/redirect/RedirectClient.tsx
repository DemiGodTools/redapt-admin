'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function RedirectClient() {
  const [status, setStatus] = useState<string>('Payment verify ho raha hai...');
  const searchParams = useSearchParams();

  // URL Query Parameters Extract karna
  const paymentId = searchParams.get('razorpay_payment_id');
  const paymentStatus = searchParams.get('razorpay_payment_link_status') || searchParams.get('razorpay_payment_status');
  const userId = searchParams.get('userId');
  const planId = searchParams.get('planId');

  console.log({ paymentId, paymentStatus, userId, planId });

  useEffect(() => {
    let isMounted = true;

    async function verifyAndRedirect() {
      // Agar paymentId exist nahi karti
      if (!paymentId) {
        if (isMounted) setStatus('Can not get the payment ID. Opening App...');
        setTimeout(() => {
          window.location.href = 'waves://app?status=failed';
        }, 1500);
        return;
      }

      try {
        const response = await fetch('/api/user/payment/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentId,
            paymentStatus,
            userId,
            planId,
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          if (isMounted) setStatus('Payment Confirmed! App open ho raha hai...');
        } else {
          if (isMounted) setStatus('Verification fail hua, par app open ho raha hai...');
        }
      } catch (error) {
        console.error('Error confirming payment:', error);
        if (isMounted) setStatus('Server error. Opening app...');
      } finally {
        const redirectUrl = `waves://app?paymentId=${paymentId}&status=${paymentStatus}&planId=${planId}`;
        window.location.href = redirectUrl;
      }
    }

    verifyAndRedirect();

    return () => {
      isMounted = false;
    };
  }, [paymentId, paymentStatus, userId, planId]);

  return (
    <main style={styles.container}>
      <div style={styles.card}>
        <div style={styles.spinner} />
        <h2 style={styles.title}>{status}</h2>
        {paymentId && (
          <p style={styles.paymentText}>Payment ID: <strong>{paymentId}</strong></p>
        )}
        <p style={styles.subtitle}>
          Agar app automatic open nahi hota, to niche click karein.
        </p>
        <a 
          href={`waves://app?paymentId=${paymentId}&status=${paymentStatus}&planId=${planId}`} 
          style={styles.button}
        >
          Open Readapt App
        </a>
      </div>
    </main>
  );
}

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#090314',
    fontFamily: 'sans-serif',
    color: '#ffffff',
  },
  card: {
    textAlign: 'center' as const,
    padding: '2rem',
    borderRadius: '16px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    maxWidth: '400px',
    width: '90%',
  },
  title: {
    fontSize: '1.2rem',
    fontWeight: 600,
    marginBottom: '0.5rem',
  },
  paymentText: {
    fontSize: '0.9rem',
    color: '#4ade80',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '0.85rem',
    color: '#9ca3af',
    marginBottom: '1.5rem',
  },
  button: {
    display: 'inline-block',
    padding: '0.75rem 1.5rem',
    backgroundColor: '#00A36C',
    color: '#ffffff',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: 600,
  },
  spinner: {
    width: '32px',
    height: '32px',
    margin: '0 auto 1rem',
    border: '3px solid rgba(255,255,255,0.1)',
    borderTopColor: '#00A36C',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
};