import axios from 'axios';
import { showAlert } from './alerts';

const stripe = Stripe(
  'pk_test_51OUwpVSIYzXWFPfnqbaYDiLtBudaeo2LnU6XmmOopE1b3iA0UsriTFbaRKf3oibqV5d5iGzLQYkfZMwocV5FxQVI00yazmMC2M',
);

export const bookTour = async (tourID) => {
  try {
    // 1. get the checkout session from the API
    const session = await axios(`/api/v1/bookings/checkout-session/${tourID}`);
    // console.log(session);

    // 2. use stripe object to automatically create the checkout form plus charge the credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};
