'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface PreparedProduct {
  id: string;
  nombre: string;
  precio: number;
  foto?: string;
  categoria_id?: number;
}

export interface CustomDishComponents {
  arroz: { nombre: string; precio_adicional: number };
  proteina: { nombre: string; precio_adicional: number };
  acompanamiento: { nombre: string; precio_adicional: number };
  bebida: { nombre: string; precio_adicional: number };
  ensalada?: { nombre: string; precio_adicional: number } | null;
  sopa?: { nombre: string; precio_adicional: number } | null;

}

export interface CartItem {
  cartId: string; // Unique identifier in cart (since the same dish can be custom-made differently)
  productId?: string; // Empty if custom dish
  type: 'prepared' | 'custom';
  nombre: string;
  precio: number;
  cantidad: number;
  observaciones: string;
  componentes?: CustomDishComponents;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, 'cartId'>) => void;
  removeFromCart: (cartId: string) => void;
  updateQuantity: (cartId: string, cantidad: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const storedCart = localStorage.getItem('superin_cart');
      if (storedCart) {
        setCart(JSON.parse(storedCart));
      }
    } catch (e) {
      console.error('Failed to load cart', e);
    }
    setIsLoaded(true);
  }, []);

  // Sync cart to localStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('superin_cart', JSON.stringify(cart));
    }
  }, [cart, isLoaded]);

  const addToCart = (newItem: Omit<CartItem, 'cartId'>) => {
    setCart((prevCart) => {
      // For prepared dishes, check if item already exists with same observations
      if (newItem.type === 'prepared') {
        const existingIndex = prevCart.findIndex(
          (item) =>
            item.productId === newItem.productId &&
            item.observaciones === newItem.observaciones
        );
        if (existingIndex > -1) {
          const updatedCart = [...prevCart];
          updatedCart[existingIndex].cantidad += newItem.cantidad;
          return updatedCart;
        }
      }

      // Generate unique cartId
      const cartId = `${newItem.type}-${newItem.productId || 'custom'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      return [...prevCart, { ...newItem, cartId }];
    });
  };

  const removeFromCart = (cartId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.cartId !== cartId));
  };

  const updateQuantity = (cartId: string, cantidad: number) => {
    if (cantidad <= 0) {
      removeFromCart(cartId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.cartId === cartId ? { ...item, cantidad } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartCount = cart.reduce((count, item) => count + item.cantidad, 0);
  const cartTotal = cart.reduce((total, item) => total + item.precio * item.cantidad, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        cartTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
