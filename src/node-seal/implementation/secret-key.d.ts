import { LoaderOptions, Instance } from './seal';
import { Exception } from './exception';
import { VectorConstructorOptions } from './vector';
import { ComprModeType } from './compr-mode-type';
import { Context } from './context';
export declare type SecretKeyDependencyOptions = {
    readonly Exception: Exception;
    readonly ComprModeType: ComprModeType;
    readonly Vector: VectorConstructorOptions;
};
export declare type SecretKeyDependencies = {
    ({ Exception, ComprModeType, Vector }: SecretKeyDependencyOptions): SecretKeyConstructorOptions;
};
export declare type SecretKeyConstructorOptions = {
    (): SecretKey;
};
export declare type SecretKey = {
    readonly instance: Instance;
    readonly inject: (instance: Instance) => void;
    readonly delete: () => void;
    readonly save: (compression?: ComprModeType) => string;
    readonly saveArray: (compression?: ComprModeType) => Uint8Array;
    readonly load: (context: Context, encoded: string) => void;
    readonly loadArray: (context: Context, array: Uint8Array) => void;
    readonly copy: (key: SecretKey) => void;
    readonly clone: () => SecretKey;
    readonly move: (key: SecretKey) => void;
};
export declare const SecretKeyInit: ({ loader }: LoaderOptions) => SecretKeyDependencies;
