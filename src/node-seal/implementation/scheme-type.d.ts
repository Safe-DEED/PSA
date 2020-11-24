import { LoaderOptions } from './seal';
export declare type SchemeTypeDependencies = {
    (): SchemeTypeConstructorOptions;
};
export declare type SchemeTypeConstructorOptions = {
    (): SchemeType;
};
export declare type SchemeType = {
    readonly none: any;
    readonly BFV: any;
    readonly CKKS: any;
};
export declare const SchemeTypeInit: ({ loader }: LoaderOptions) => SchemeTypeDependencies;
