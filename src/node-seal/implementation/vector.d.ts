import { LoaderOptions, Instance } from './seal';
import { Exception } from './exception';
export declare type VectorDependencyOptions = {
    readonly Exception: Exception;
};
export declare type VectorDependencies = {
    ({ Exception }: VectorDependencyOptions): VectorConstructorOptions;
};
export declare type VectorConstructorOptions = {
    (): Vector;
};
export declare type Vector = {
    readonly instance: Instance;
    readonly unsafeInject: (instance: Instance) => void;
    readonly delete: () => void;
    readonly from: (array: VectorTypes, type?: StringTypes) => Instance;
    readonly type: string;
    readonly setType: (type: StringTypes) => void;
    readonly size: number;
    readonly getValue: (index: number) => number;
    readonly resize: (size: number, fill: number) => void;
    readonly toArray: () => VectorTypes;
};
export declare type VectorTypes = Uint8Array | Int32Array | Uint32Array | Float64Array | BigInt64Array | BigUint64Array;
export declare type StringTypes = 'Uint8Array' | 'Int32Array' | 'Uint32Array' | 'Float64Array' | 'BigInt64Array' | 'BigUint64Array' | 'Modulus';
export declare const VectorInit: ({ loader }: LoaderOptions) => VectorDependencies;
