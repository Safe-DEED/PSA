import { LoaderOptions, Instance } from './seal';
import { Exception } from './exception';
import { VectorConstructorOptions } from './vector';
import { ComprModeType } from './compr-mode-type';
import { Context } from './context';
export declare type RelinKeysDependencyOptions = {
    readonly Exception: Exception;
    readonly ComprModeType: ComprModeType;
    readonly Vector: VectorConstructorOptions;
};
export declare type RelinKeysDependencies = {
    ({ Exception, ComprModeType, Vector }: RelinKeysDependencyOptions): RelinKeysConstructorOptions;
};
export declare type RelinKeysConstructorOptions = {
    (): RelinKeys;
};
export declare type RelinKeys = {
    readonly instance: Instance;
    readonly inject: (instance: Instance) => void;
    readonly delete: () => void;
    readonly size: number;
    readonly getIndex: (keyPower: number) => number;
    readonly hasKey: (keyPower: number) => boolean;
    readonly save: (compression?: ComprModeType) => string;
    readonly saveArray: (compression?: ComprModeType) => Uint8Array;
    readonly load: (context: Context, encoded: string) => void;
    readonly loadArray: (context: Context, array: Uint8Array) => void;
    readonly copy: (key: RelinKeys) => void;
    readonly clone: () => RelinKeys;
    readonly move: (key: RelinKeys) => void;
};
export declare const RelinKeysInit: ({ loader }: LoaderOptions) => RelinKeysDependencies;
