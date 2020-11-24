import { LoaderOptions, Instance } from './seal';
import { Exception } from './exception';
import { VectorConstructorOptions } from './vector';
import { ComprModeType } from './compr-mode-type';
import { Context } from './context';
export declare type GaloisKeysDependencyOptions = {
    readonly Exception: Exception;
    readonly ComprModeType: ComprModeType;
    readonly Vector: VectorConstructorOptions;
};
export declare type GaloisKeysDependencies = {
    ({ Exception, ComprModeType, Vector }: GaloisKeysDependencyOptions): GaloisKeysConstructorOptions;
};
export declare type GaloisKeysConstructorOptions = {
    (): GaloisKeys;
};
export declare type GaloisKeys = {
    readonly instance: Instance;
    readonly inject: (instance: Instance) => void;
    readonly delete: () => void;
    readonly size: number;
    readonly getIndex: (galoisElt: number) => number;
    readonly hasKey: (galoisElt: number) => boolean;
    readonly save: (compression?: ComprModeType) => string;
    readonly saveArray: (compression?: ComprModeType) => Uint8Array;
    readonly load: (context: Context, encoded: string) => void;
    readonly loadArray: (context: Context, array: Uint8Array) => void;
    readonly copy: (key: GaloisKeys) => void;
    readonly clone: () => GaloisKeys;
    readonly move: (key: GaloisKeys) => void;
};
export declare const GaloisKeysInit: ({ loader }: LoaderOptions) => GaloisKeysDependencies;
