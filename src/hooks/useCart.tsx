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
      //Variável criada para manipular o estado de cart sem quebrar a imutabilidade
      const updatedCart = [...cart];

      //Verifica se existe um produto com o productId informado
      const productExists = updatedCart.find(product => product.id === productId);

      //Consulta a api para obter a quantidade em estoque do produto informado
      const stock = await api.get(`/stock/${productId}`);

      //Valor de amount retornado pela consulta acima
      const stockAmount =  stock.data.amount;

      //Quantidade de produto atual, se o produto existir no carrinho,
      //o valor será o amount do produto existente, caso contrário será 0
      const currentAmount = productExists ? productExists.amount : 0;

      //amount retorna a soma de currentAmount + 1 que ocorre ao adicionarmos 1 produto
      //no carrinho
      const amount = currentAmount + 1;

      //Verifica se a quantidade que desejamos adicionar ao carrinho é maior que 
      // a quantidade no estoque, se for maior retorna um erro e sai da função
      if(amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      //Verifica se o produto existe, se existir, atribui o valor de amount;
      //Se não existir, busca o produto na api passando o productId e cria um novo
      //produto, que será adicionado ao array updatedCart
      if(productExists) {
        productExists.amount = amount;
      } else {
        const product = await api.get(`products/${productId}`);
        const newProduct = {
          ...product.data,
          amount: 1
        }
        updatedCart.push(newProduct);
      }

      //Se tudo der certo, seta um novo valor para o cart e salva no localStorage
      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
      
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productIndex = updatedCart.findIndex(product => product.id === productId);

      if(productIndex >= 0) {
        updatedCart.splice(productIndex, 1);
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
      
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0){
        return;
      }

      const stock = await api.get(`/stock/${productId}`);
      const stockAmount = stock.data.amount;

      if(amount > stockAmount){
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = [...cart];
      const productExists = updatedCart.find(product => product.id === productId);

      if(productExists){
        productExists.amount = amount;
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
      } else {
        throw Error();
      }
      
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
