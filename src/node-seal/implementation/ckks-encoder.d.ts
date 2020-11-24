import { LoaderOptions, Instance } from './seal';
import { Exception } from './exception';
import { VectorConstructorOptions } from './vector';
import { MemoryPoolHandle } from './memory-pool-handle';
import { PlainText, PlainTextConstructorOptions } from './plain-text';
import { Context } from './context';
export declare type CKKSEncoderDependencyOptions = {
    readonly Exception: Exception;
    readonly MemoryPoolHandle: MemoryPoolHandle;
    readonly PlainText: PlainTextConstructorOptions;
    readonly Vector: VectorConstructorOptions;
};
export declare type CKKSEncoderDependencies = {
    ({ Exception, MemoryPoolHandle, PlainText, Vector }: CKKSEncoderDependencyOptions): CKKSEncoderConstructorOptions;
};
export declare type CKKSEncoderConstructorOptions = {
    (context: Context): CKKSEncoder;
};
export declare type CKKSEncoderTypes = Float64Array;
export declare type CKKSEncoder = {
    readonly instance: Instance;
    readonly unsafeInject: (instance: Instance) => void;
    readonly delete: () => void;
    readonly encode: (array: CKKSEncoderTypes, scale: number, plainText?: PlainText, pool?: MemoryPoolHandle) => PlainText | void;
    readonly decode: (plainText: PlainText, pool?: MemoryPoolHandle) => CKKSEncoderTypes;
    readonly slotCount: number;
};
export declare const CKKSEncoderInit: ({ loader }: LoaderOptions) => CKKSEncoderDependencies;
