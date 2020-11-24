import { Instance } from './seal';
import { Exception } from './exception';
import { VectorConstructorOptions } from './vector';
import { ComprModeType } from './compr-mode-type';
export declare type SerializableDependencyOptions = {
    readonly Exception: Exception;
    readonly Vector: VectorConstructorOptions;
    readonly ComprModeType: ComprModeType;
};
export declare type SerializableDependencies = {
    ({ Exception, Vector, ComprModeType }: SerializableDependencyOptions): SerializableConstructorOptions;
};
export declare type SerializableConstructorOptions = {
    (): Serializable;
};
export declare type Serializable = {
    readonly instance: Instance;
    readonly unsafeInject: (instance: Instance) => void;
    readonly delete: () => void;
    readonly save: (compression?: ComprModeType) => string;
    readonly saveArray: (compression?: ComprModeType) => Uint8Array;
};
export declare const SerializableInit: () => SerializableDependencies;
