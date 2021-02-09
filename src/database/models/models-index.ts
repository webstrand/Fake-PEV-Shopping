import { Model } from 'mongoose';
import { default as Product, IProduct } from './_product'
import { default as User, IUser } from './_user'
import { default as UserRole, IUserRole } from './_userRole'


const MODELS = {
  Product: Product, //require('./_product'),
  User: User, // require('./_user'),
  'User-Role': UserRole //require('./_userRole'),
};

export type IModel = IProduct | IUser | IUserRole;
export type TModelType = keyof typeof MODELS;
export type TGenericModel = Model<IModel>

export default (modelType: TModelType): TGenericModel /*| null*/ => {
  // TODO: improve validation
  // if (typeof modelType !== 'string') {
  //   return null;
  // }

  return MODELS[modelType]/* || null*/;
};
