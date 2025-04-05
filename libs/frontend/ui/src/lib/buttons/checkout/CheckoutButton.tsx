import { useNavigate } from 'react-router';
import { useCart } from 'react-use-cart';
import { toast } from 'react-toastify';
import { v4 as uuidv4 } from 'uuid';

import Button from '../button/Button';

export function CheckoutButton() {
  const { isEmpty } = useCart();
  const navigate = useNavigate();
  const handleCheckout = () => {
    if (isEmpty) {
      toast.error(
        'Your cart is empty, please add items to your cart before proceeding to checkout.'
      );
      return;
    }
    // Use UUID to generate a new referenceId
    const referenceId = uuidv4();
    navigate(`/checkout/${referenceId}`);
  };

  return (
    <Button type="button" onClick={handleCheckout} className="btn btn-primary">
      Proceed to Checkout
    </Button>
  );
}

export default CheckoutButton;
