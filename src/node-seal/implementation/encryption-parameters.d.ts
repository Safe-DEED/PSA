import { LoaderOptions, Instance } from './seal';
import { Vector, VectorConstructorOptions } from './vector';
import { ComprModeType } from './compr-mode-type';
import { SchemeType } from './scheme-type';
import { Exception } from './exception';
import { Modulus, ModulusConstructorOptions } from './modulus';
export declare type EncryptionParametersDependencyOptions = {
    readonly Exception: Exception;
    readonly ComprModeType: ComprModeType;
    readonly Modulus: ModulusConstructorOptions;
    readonly SchemeType: SchemeType;
    readonly Vector: VectorConstructorOptions;
};
export declare type EncryptionParametersDependencies = {
    ({ Exception, ComprModeType, Modulus, SchemeType, Vector }: EncryptionParametersDependencyOptions): EncryptionParametersConstructorOptions;
};
export declare type EncryptionParametersConstructorOptions = {
    (schemeType?: SchemeType): EncryptionParameters;
};
export declare type EncryptionParameters = {
    readonly instance: Instance;
    readonly unsafeInject: (instance: Instance) => void;
    readonly delete: () => void;
    readonly setPolyModulusDegree: (polyModulusDegree: number) => void;
    readonly setCoeffModulus: (coeffModulus: Vector) => void;
    readonly setPlainModulus: (plainModulus: Modulus) => void;
    readonly scheme: SchemeType;
    readonly polyModulusDegree: number;
    readonly coeffModulus: BigUint64Array;
    readonly plainModulus: Modulus;
    readonly save: (compression?: ComprModeType) => string;
    readonly saveArray: (compression?: ComprModeType) => Uint8Array;
    readonly load: (encoded: string) => void;
    readonly loadArray: (array: Uint8Array) => void;
};
export declare const EncryptionParametersInit: ({ loader }: LoaderOptions) => EncryptionParametersDependencies;
