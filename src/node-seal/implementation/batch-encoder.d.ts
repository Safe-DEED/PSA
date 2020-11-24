import { LoaderOptions, Instance } from './seal';
import { Exception } from './exception';
import { VectorConstructorOptions } from './vector';
import { MemoryPoolHandle } from './memory-pool-handle';
import { PlainText, PlainTextConstructorOptions } from './plain-text';
import { Context } from './context';
export declare type BatchEncoderDependencyOptions = {
    readonly Exception: Exception;
    readonly MemoryPoolHandle: MemoryPoolHandle;
    readonly PlainText: PlainTextConstructorOptions;
    readonly Vector: VectorConstructorOptions;
};
export declare type BatchEncoderDependencies = {
    ({ Exception, MemoryPoolHandle, PlainText, Vector }: BatchEncoderDependencyOptions): BatchEncoderConstructorOptions;
};
export declare type BatchEncoderConstructorOptions = {
    (context: Context): BatchEncoder;
};
export declare type BatchEncoderTypes = Int32Array | Uint32Array | BigInt64Array | BigUint64Array;
export declare type BatchEncoder = {
    readonly instance: Instance;
    readonly unsafeInject: (instance: Instance) => void;
    readonly delete: () => void;
    readonly encode: (array: BatchEncoderTypes, plainText?: PlainText) => PlainText | void;
    readonly decode: (plainText: PlainText, signed?: boolean, pool?: MemoryPoolHandle) => Int32Array | Uint32Array;
    readonly decodeBigInt: (plainText: PlainText, signed?: boolean, pool?: MemoryPoolHandle) => BigInt64Array | BigUint64Array;
    readonly slotCount: number;
};
export declare const BatchEncoderInit: ({ loader }: LoaderOptions) => BatchEncoderDependencies;
