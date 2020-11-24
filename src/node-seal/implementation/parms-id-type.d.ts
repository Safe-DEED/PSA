import { LoaderOptions, Instance } from './seal';
import { Exception } from './exception';
export declare type ParmsIdTypeDependencyOptions = {
    readonly Exception: Exception;
};
export declare type ParmsIdTypeDependencies = {
    ({ Exception }: ParmsIdTypeDependencyOptions): ParmsIdTypeConstructorOptions;
};
export declare type ParmsIdTypeConstructorOptions = {
    (): ParmsIdType;
};
export declare type ParmsIdType = {
    readonly instance: Instance;
    readonly inject: (instance: Instance) => void;
    readonly delete: () => void;
    readonly values: BigUint64Array;
};
export declare const ParmsIdTypeInit: ({ loader }: LoaderOptions) => ParmsIdTypeDependencies;
