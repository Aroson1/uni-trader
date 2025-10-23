'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, CreditCard, Loader2 } from 'lucide-react';

// Initialize Stripe (you'll need to add your publishable key to environment variables)
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const cardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
  },
};

interface PaymentFormProps {
  onSuccess: () => void;
  onClose: () => void;
}

function PaymentForm({ onSuccess, onClose }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [kfcAmount, setKfcAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const KFC_TO_INR_RATE = 1.2; // 1 KFC = 1.2 INR

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      return;
    }

    const amount = parseFloat(kfcAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid KFC amount');
      return;
    }

    setLoading(true);

    try {
      // Create payment intent
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount }),
      });

      const { clientSecret, paymentIntentId, error } = await response.json();

      if (error) {
        throw new Error(error);
      }

      // Confirm payment
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      // If payment succeeded, call our confirmation endpoint to credit the wallet
      if (paymentIntent && paymentIntent.status === 'succeeded') {
        const confirmResponse = await fetch('/api/payments/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
        });

        const confirmResult = await confirmResponse.json();

        if (!confirmResponse.ok) {
          throw new Error(confirmResult.error || 'Failed to confirm payment');
        }

        toast.success(`Payment successful! ${confirmResult.kfcAmount} KFC added to your wallet.`);
      } else {
        throw new Error('Payment was not completed successfully');
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  const inrAmount = parseFloat(kfcAmount) * KFC_TO_INR_RATE;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="kfc-amount">KFC Amount</Label>
        <Input
          id="kfc-amount"
          type="number"
          step="0.1"
          placeholder="10"
          value={kfcAmount}
          onChange={(e) => setKfcAmount(e.target.value)}
          required
        />
        {kfcAmount && !isNaN(parseFloat(kfcAmount)) && (
          <p className="text-sm text-muted-foreground">
            ≈ ₹{inrAmount.toFixed(2)} INR
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Card Details</Label>
        <div className="p-3 border rounded-md">
          <CardElement options={cardElementOptions} />
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={!stripe || loading || !kfcAmount} 
          className="flex-1"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Pay ₹{inrAmount.toFixed(2)}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

interface WalletTopUpProps {
  onSuccess?: () => void;
}

export function WalletTopUp({ onSuccess }: WalletTopUpProps) {
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    onSuccess?.();
    // Refresh the page to update wallet balance
    window.location.reload();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add KFC
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add KFC to Wallet</DialogTitle>
        </DialogHeader>
        <Elements stripe={stripePromise}>
          <PaymentForm onSuccess={handleSuccess} onClose={() => setOpen(false)} />
        </Elements>
      </DialogContent>
    </Dialog>
  );
}