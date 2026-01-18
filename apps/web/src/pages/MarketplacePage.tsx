import type { ProductDto } from "@projectx/models";
import { Button } from "@projectx/ui";
import { motion } from "framer-motion";
import type React from "react";
import { useCart } from "react-use-cart";

export type MarketplacePageProps = {
  products: ProductDto[];
};

export const MarketplacePage: React.FC<MarketplacePageProps> = ({
  products,
}) => {
  const { addItem } = useCart();

  const handleAddToCart = (product: ProductDto) => {
    addItem({
      id: String(product.id),
      name: product.name,
      price: product.estimatedPrice,
      currency: "USD",
      image: product.imageUrl,
      quantity: 1,
      // You can add more properties if needed
    });
  };

  return (
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <motion.div
            key={product.id}
            className="card bg-base-100 shadow-xl"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <figure>
              <img
                src={product.imageUrl}
                alt={product.name}
                className="h-48 w-full object-cover"
                style={{
                  viewTransitionName: `product-${product.id}`,
                }}
              />
            </figure>
            <div className="card-body">
              <h2 className="card-title font-semibold">
                ${product.estimatedPrice.toFixed(2)}
              </h2>
              <p className="text-lg">{product.name}</p>
              <div className="card-actions justify-end">
                <Button
                  className="btn btn-sm"
                  variant="primary"
                  onClick={() => handleAddToCart(product)}
                >
                  Add to Cart
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
