import { ComprModeType } from './compr-mode-type';
import { Context } from './context';
import { LoaderOptions, Instance } from './seal';
import { Exception } from './exception';
import { MemoryPoolHandle } from './memory-pool-handle';
import { ParmsIdType, ParmsIdTypeConstructorOptions } from './parms-id-type';
import { VectorConstructorOptions } from './vector';
export declare type PlainTextDependencyOptions = {
    readonly Exception: Exception;
    readonly ComprModeType: ComprModeType;
    readonly ParmsIdType: ParmsIdTypeConstructorOptions;
    readonly MemoryPoolHandle: MemoryPoolHandle;
    readonly Vector: VectorConstructorOptions;
};
export declare type PlainTextDependencies = {
    ({ Exception, ComprModeType, ParmsIdType, MemoryPoolHandle, Vector }: PlainTextDependencyOptions): PlainTextConstructorOptions;
};
export declare type PlainTextConstructorOptions = {
    ({ capacity, coeffCount, pool }?: {
        capacity?: number;
        coeffCount?: number;
        pool?: MemoryPoolHandle;
    }): PlainText;
};
export declare type PlainText = {
    readonly instance: Instance;
    readonly unsafeInject: (instance: Instance) => void;
    readonly delete: () => void;
    readonly reserve: (capacity: number) => void;
    readonly shrinkToFit: () => void;
    readonly release: () => void;
    readonly resize: (coeffCount: number) => void;
    readonly setZero: () => void;
    readonly isZero: boolean;
    readonly capacity: number;
    readonly coeffCount: number;
    readonly significantCoeffCount: number;
    readonly nonzeroCoeffCount: number;
    readonly toPolynomial: () => string;
    readonly isNttForm: boolean;
    readonly parmsId: ParmsIdType;
    readonly scale: number;
    readonly setScale: (scale: number) => void;
    readonly pool: MemoryPoolHandle;
    readonly save: (compression?: ComprModeType) => string;
    readonly saveArray: (compression?: ComprModeType) => Uint8Array;
    readonly load: (context: Context, encoded: string) => void;
    readonly loadArray: (context: Context, array: Uint8Array) => void;
    readonly copy: (plain: PlainText) => void;
    readonly clone: () => PlainText;
    readonly move: (plain: PlainText) => void;
};
export declare const PlainTextInit: ({ loader }: LoaderOptions) => PlainTextDependencies;
