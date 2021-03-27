import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productInCart = cart.find(product => product.id === productId);
      const { data: stock } = await api.get<Stock>(`stock/${productId}`);

      if(!productInCart) {
        const { data: product } = await api.get<Product>(`products/${productId}`);

        if(stock.amount > 0) {
          setCart([ ...cart, { ...product, amount: 1 } ]);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify([ ...cart, { ...product, amount: 1 } ]));

          toast('Produto adicionado com sucesso');

          return;
        } else {
          toast.error('Erro na adição do produto');
        }
      } else {
        if(stock.amount > productInCart.amount) {
          const updateCart = cart.map(item => item.id === productId ? {
            ...item,
            amount: Number(item.amount) + 1
          } : item);

          setCart(updateCart);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart));

          toast('Produto adicionado com sucesso');

          return;
        } else{
          toast.error('Quantidade solicitada fora de estoque');
        }

      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productExists = cart.some(product => product.id === productId);

      if(!productExists) {
        toast.error('Erro na remoção do produto');

        return;
      }

      const updateCart = cart.filter(item => item.id !== productId);

      setCart(updateCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount < 1) {
        toast.error('Erro na alteração de quantidade do produto');

        return;
      }

      const response = await api.get(`/stock/${productId}`);
      const productAmount = response.data.amount;
      const isNotStockAvailable = amount > productAmount;

      if(isNotStockAvailable) {
        toast.error('Quantidade solicitada fora de estoque');

        return;
      }

      const productExists = cart.some(product => product.id === productId);

      if(!productExists) {
        toast.error('Erro na alteração de quantidade do produto');

        return;
      }

      const updateCart = cart.map(product => product.id === productId ? {
        ...product,
        amount: amount
      } : product); 

      setCart(updateCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
