import { LoaderOptions, Instance } from './seal';
import { Exception } from './exception';
import { VectorConstructorOptions } from './vector';
import { ComprModeType } from './compr-mode-type';
export declare type ModulusDependencyOptions = {
    readonly Exception: Exception;
    readonly ComprModeType: ComprModeType;
    readonly Vector: VectorConstructorOptions;
};
export declare type ModulusDependencies = {
    ({ Exception, ComprModeType, Vector }: ModulusDependencyOptions): ModulusConstructorOptions;
};
export declare type ModulusConstructorOptions = {
    (value: BigInt): Modulus;
};
export declare type Modulus = {
    readonly instance: Instance;
    readonly inject: (instance: Instance) => void;
    readonly delete: () => void;
    readonly setValue: (value: BigInt) => void;
    readonly value: BigInt;
    readonly bitCount: number;
    readonly isZero: boolean;
    readonly isPrime: boolean;
    readonly save: (compression?: ComprModeType) => string;
    readonly saveArray: (compression?: ComprModeType) => Uint8Array;
    readonly load: (encoded: string) => void;
    readonly loadArray: (array: Uint8Array) => void;
};
export declare const ModulusInit: ({ loader }: LoaderOptions) => ModulusDependencies;
