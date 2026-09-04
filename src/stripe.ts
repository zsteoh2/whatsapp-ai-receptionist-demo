import Stripe from "stripe";
import { PACKAGES } from "./clinic.js";
import { config } from "./config.js";
import type { Booking } from "./types.js";

export interface CheckoutGateway {
  createCheckout(booking: Booking): Promise<{ id: string; url: string }>;
}

export class StripeCheckoutGateway implements CheckoutGateway {
  readonly client: Stripe;

  constructor(secretKey = config.stripe.secretKey) {
    if (!secretKey?.startsWith("sk_test_")) throw new Error("A Stripe Test Mode secret key is required");
    this.client = new Stripe(secretKey);
  }

  async createCheckout(booking: Booking) {
    const pack = PACKAGES[booking.packageId];
    const session = await this.client.checkout.sessions.create({
      mode: "payment",
      success_url: `${config.appBaseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.appBaseUrl}/payment/cancelled`,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "gbp",
          unit_amount: booking.depositPence,
          product_data: {
            name: `Test deposit — ${pack.name}`,
            description: booking.packageId === "ora_demo"
              ? "ORA interactive demonstration; no real appointment."
              : "Demonstration only; no real booking or treatment.",
          },
        },
      }],
      metadata: { booking_id: booking.id, whatsapp_id: booking.waId, demo: "true" },
    });
    if (!session.url) throw new Error("Stripe did not return a Checkout URL");
    return { id: session.id, url: session.url };
  }
}
