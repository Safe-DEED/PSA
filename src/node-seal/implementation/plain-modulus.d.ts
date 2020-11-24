import { LoaderOptions } from './seal';
import { Exception } from './exception';
import { Modulus, ModulusConstructorOptions } from './modulus';
import { Vector, VectorConstructorOptions } from './vector';
export declare type PlainModulusDependencyOptions = {
    readonly Exception: Exception;
    readonly Modulus: ModulusConstructorOptions;
    readonly Vector: VectorConstructorOptions;
};
export declare type PlainModulusDependencies = {
    ({ Exception, Modulus, Vector }: PlainModulusDependencyOptions): PlainModulusConstructorOptions;
};
export declare type PlainModulusConstructorOptions = {
    (): PlainModulus;
};
export declare type PlainModulus = {
    readonly Batching: (polyModulusDegree: number, bitSize: number) => Modulus;
    readonly BatchingVector: (polyModulusDegree: number, bitSizes: Int32Array) => Vector;
};
export declare const PlainModulusInit: ({ loader }: LoaderOptions) => PlainModulusDependencies;
