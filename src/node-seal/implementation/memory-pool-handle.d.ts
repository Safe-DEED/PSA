import { LoaderOptions } from './seal';
export declare type MemoryPoolHandleDependencies = {
    (): MemoryPoolHandleConstructorOptions;
};
export declare type MemoryPoolHandleConstructorOptions = {
    (): MemoryPoolHandle;
};
export declare type MemoryPoolHandle = {
    readonly global: any;
    readonly threadLocal: any;
};
export declare const MemoryPoolHandleInit: ({ loader }: LoaderOptions) => MemoryPoolHandleDependencies;
