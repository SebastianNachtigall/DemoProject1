import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

interface PropImage {
  id: number;
  image_url: string;
  order: number;
}

interface Prop {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  images: PropImage[];
  print_cost?: number;
}

interface CartItem {
  id: string;
  prop: Prop;
  quantity: number;
  printedVersion: boolean;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (prop: Prop, quantity: number, printedVersion: boolean) => Promise<void>;
  removeFromCart: (itemId: string) => void;
  updateCartItem: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  isLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'movieProps_cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (savedCart) {
      setItems(JSON.parse(savedCart));
    }
    setIsLoading(false);
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addToCart = async (prop: Prop, quantity: number = 1, printedVersion: boolean = false) => {
    try {
      const newItem: CartItem = {
        id: uuidv4(),
        prop,
        quantity,
        printedVersion
      };

      setItems(currentItems => [...currentItems, newItem]);
    } catch (error) {
      console.error('Error adding item to cart:', error);
    }
  };

  const removeFromCart = (itemId: string) => {
    setItems(currentItems => currentItems.filter(item => item.id !== itemId));
  };

  const updateCartItem = (itemId: string, quantity: number) => {
    if (quantity < 1) {
      removeFromCart(itemId);
      return;
    }

    setItems(currentItems =>
      currentItems.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const value = {
    items,
    addToCart,
    removeFromCart,
    updateCartItem,
    clearCart,
    isLoading
  };

  return (
    <CartContext.Provider value={value}>
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
