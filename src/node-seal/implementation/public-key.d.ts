import { LoaderOptions, Instance } from './seal';
import { Exception } from './exception';
import { VectorConstructorOptions } from './vector';
import { ComprModeType } from './compr-mode-type';
import { Context } from './context';
export declare type PublicKeyDependencyOptions = {
    readonly Exception: Exception;
    readonly ComprModeType: ComprModeType;
    readonly Vector: VectorConstructorOptions;
};
export declare type PublicKeyDependencies = {
    ({ Exception, ComprModeType, Vector }: PublicKeyDependencyOptions): PublicKeyConstructorOptions;
};
export declare type PublicKeyConstructorOptions = {
    (): PublicKey;
};
export declare type PublicKey = {
    readonly instance: Instance;
    readonly inject: (instance: Instance) => void;
    readonly delete: () => void;
    readonly save: (compression?: ComprModeType) => string;
    readonly saveArray: (compression?: ComprModeType) => Uint8Array;
    readonly load: (context: Context, encoded: string) => void;
    readonly loadArray: (context: Context, array: Uint8Array) => void;
    readonly copy: (key: PublicKey) => void;
    readonly clone: () => PublicKey;
    readonly move: (key: PublicKey) => void;
};
export declare const PublicKeyInit: ({ loader }: LoaderOptions) => PublicKeyDependencies;
