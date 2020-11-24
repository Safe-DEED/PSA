import { LoaderOptions } from './seal';
import { Exception } from './exception';
import { SecurityLevel } from './security-level';
import { Vector, VectorConstructorOptions } from './vector';
export declare type CoeffModulusDependencyOptions = {
    readonly Exception: Exception;
    readonly SecurityLevel: SecurityLevel;
    readonly Vector: VectorConstructorOptions;
};
export declare type CoeffModulusDependencies = {
    ({ Exception, SecurityLevel, Vector }: CoeffModulusDependencyOptions): CoeffModulusConstructorOptions;
};
export declare type CoeffModulusConstructorOptions = {
    (): CoeffModulus;
};
export declare type CoeffModulus = {
    readonly MaxBitCount: (polyModulusDegree: number, securityLevel?: SecurityLevel) => number;
    readonly BFVDefault: (polyModulusDegree: number, securityLevel?: SecurityLevel) => Vector;
    readonly Create: (polyModulusDegree: number, bitSizes: Int32Array) => Vector;
};
export declare const CoeffModulusInit: ({ loader }: LoaderOptions) => CoeffModulusDependencies;
