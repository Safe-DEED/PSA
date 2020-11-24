import { ComprModeType } from './compr-mode-type';
import { Context } from './context';
import { LoaderOptions, Instance } from './seal';
import { Exception } from './exception';
import { MemoryPoolHandle } from './memory-pool-handle';
import { ParmsIdType, ParmsIdTypeConstructorOptions } from './parms-id-type';
import { VectorConstructorOptions } from './vector';
export declare type CipherTextDependencyOptions = {
    readonly Exception: Exception;
    readonly ComprModeType: ComprModeType;
    readonly ParmsIdType: ParmsIdTypeConstructorOptions;
    readonly MemoryPoolHandle: MemoryPoolHandle;
    readonly Vector: VectorConstructorOptions;
};
export declare type CipherTextDependencies = {
    ({ Exception, ComprModeType, ParmsIdType, MemoryPoolHandle, Vector }: CipherTextDependencyOptions): CipherTextConstructorOptions;
};
export declare type CipherTextConstructorOptions = {
    ({ context, parmsId, sizeCapacity, pool }?: {
        context?: Context;
        parmsId?: ParmsIdType;
        sizeCapacity?: number;
        pool?: MemoryPoolHandle;
    }): CipherText;
};
export declare type CipherText = {
    readonly instance: Instance;
    readonly unsafeInject: (instance: Instance) => void;
    readonly delete: () => void;
    readonly reserve: (context: Context, capacity: number) => void;
    readonly resize: (size: number) => void;
    readonly release: () => void;
    readonly coeffModulusSize: number;
    readonly polyModulusDegree: number;
    readonly size: number;
    readonly sizeCapacity: number;
    readonly isTransparent: boolean;
    readonly isNttForm: boolean;
    readonly parmsId: ParmsIdType;
    readonly scale: number;
    readonly setScale: (scale: number) => void;
    readonly pool: MemoryPoolHandle;
    readonly save: (compression?: ComprModeType) => string;
    readonly saveArray: (compression?: ComprModeType) => Uint8Array;
    readonly load: (context: Context, encoded: string) => void;
    readonly loadArray: (context: Context, array: Uint8Array) => void;
    readonly copy: (cipher: CipherText) => void;
    readonly clone: () => CipherText;
    readonly move: (cipher: CipherText) => void;
};
export declare const CipherTextInit: ({ loader }: LoaderOptions) => CipherTextDependencies;
