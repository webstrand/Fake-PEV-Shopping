import fetch from 'node-fetch';
import { IPayByLinkMethod, IProductInOrder } from '../../types';
import getLogger from '../../../utils/logger';

const logger = getLogger(module.filename);

const EXCLUDED_METHODS: Partial<IPayByLinkMethod>[] = [
  {
    value: 'jp',
    name: 'Apple Pay',
  },
  {
    value: 'dp',
    name: 'Płacę później',
  },
  {
    value: 'ai',
    name: 'Raty PayU',
  },
  {
    value: 'blik',
    name: 'BLIK',
  },
  {
    value: 'c',
    name: 'Płatność online kartą płatniczą',
  },
];

function getTotalPrice(products: IProductInOrder[]) {
  return products.reduce((sum: number, { unitPrice, quantity }) => sum + unitPrice * quantity, 0);
}

export function getOrderBody(products: IProductInOrder[], payMethod: Partial<IPayByLinkMethod>) {
  const host: string = process.env.NODE_ENV === 'development' ? '127.0.0.1' : 'pev-demo.store';

  return {
    // notifyUrl: 'http://127.0.0.1:3000',
    customerIp: '127.0.0.1',
    continueUrl: `http://${host}:${process.env.PORT}/`,
    merchantPosId: process.env.PAYU_CLIENT_ID,
    description: 'PEV-Shop order',
    // TODO: pass it dynamically by User's chosen currency in shop
    currencyCode: 'PLN',
    totalAmount: getTotalPrice(products),
    payMethods: { payMethod },
    // TODO: pass User data from session
    buyer: {
      email: 'john.doe@example.com',
      phone: '654111654',
      firstName: 'John',
      lastName: 'Doe',
      language: 'pl',
    },
    products,
  };
}

export function getOrderHeaders(token: string) {
  return {
    Content: 'application/json',
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export function getMinAndMaxPrice(products: IProductInOrder[]): number[] {
  const sortedProducts: number[] = products
    .map(({ unitPrice, quantity }) => unitPrice * quantity)
    .sort((prev, next) => prev - next);
  const minPrice = sortedProducts.shift() as number;
  const maxPrice = (sortedProducts.pop() || minPrice) as number;

  return [minPrice, maxPrice];
}

export function getOrderPaymentMethod(
  token: string,
  minPrice: number,
  maxPrice: number
): Promise<Partial<IPayByLinkMethod>> {
  const PAYU_METHODS_URL = 'https://secure.snd.payu.com/api/v2_1/paymethods';

  return fetch(PAYU_METHODS_URL, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((response) => response.json())
    .then(getSinglePaymentMethod)
    .catch((error: Error): Partial<IPayByLinkMethod> => {
      logger.error('PayU order payment method error:', error);

      // fallback to default payment method
      return { type: 'PAYMENT_WALL' };
    });

  function getSinglePaymentMethod(paymentMethods: { payByLinks: IPayByLinkMethod[] }): IPayByLinkMethod {
    logger.log('getSinglePaymentMethod() paymentMethods:', paymentMethods);

    const filteredPaymentMethods: IPayByLinkMethod[] = filterPaymentMethods(paymentMethods.payByLinks)
      // add lacking 'type' field to payment method objects
      .map((method) => ({ ...method, type: 'PBL' } as IPayByLinkMethod));

    if (filteredPaymentMethods.length === 0) {
      throw { msg: 'Filtered payment methods are empty!', originalValue: paymentMethods };
    }

    logger.log('getSinglePaymentMethod() filteredPaymentMethods:', filteredPaymentMethods);

    return getRandomMethod(filteredPaymentMethods);
  }

  function filterPaymentMethods(methods: IPayByLinkMethod[]): IPayByLinkMethod[] {
    return methods.filter((method) => {
      return (
        method.status === 'ENABLED' &&
        method.minAmount <= minPrice &&
        method.maxAmount >= maxPrice &&
        !EXCLUDED_METHODS.find(
          (excludedMethod) => excludedMethod.value === method.value && excludedMethod.name === method.name
        )
      );
    });
  }

  function getRandomMethod(methods: IPayByLinkMethod[]): IPayByLinkMethod {
    const randomIndex: number = Math.floor(Math.random() * methods.length);
    return methods[randomIndex];
  }
}
