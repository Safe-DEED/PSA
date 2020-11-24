import { LoaderOptions } from './seal';
export declare type ComprModeTypeDependencies = {
    (): ComprModeTypeConstructorOptions;
};
export declare type ComprModeTypeConstructorOptions = {
    (): ComprModeType;
};
export declare type ComprModeType = {
    readonly none: any;
    readonly deflate: any;
};
export declare const ComprModeTypeInit: ({ loader }: LoaderOptions) => ComprModeTypeDependencies;
