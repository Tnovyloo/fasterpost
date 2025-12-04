"use client";

import { useState } from "react";
import {
  PaymentElement,
  useStripe,
  useElements
} from "@stripe/react-stripe-js";

export default function PaymentForm({ onSuccess, packageId }) {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-success?package_id=${packageId}`,
      },
      redirect: "if_required",
    });

    if (error) {
      setMessage(error.message);
      setIsLoading(false);
    } else {
      // Payment succeeded
      onSuccess();
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      
      {message && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl">
          {message}
        </div>
      )}
      
      <button
        disabled={isLoading || !stripe || !elements}
        className="w-full bg-green-600 hover:bg-green-700 text-white p-3 rounded-xl font-semibold shadow disabled:opacity-50"
      >
        {isLoading ? "Processing..." : "Pay Now"}
      </button>
      
      <p className="text-xs text-gray-500 text-center">
        Powered by Stripe • Your payment is secure
      </p>
    </form>
  );
}